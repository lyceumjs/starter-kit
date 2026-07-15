import type { ContentRef, Course, CourseStorePort, Lesson, Unit } from '@lyceumjs/lms'
import type { Payload, Where } from 'payload'

import type { Course as CourseDoc } from '../../payload-types'

// The Payload adapter for Lyceum's `CourseStorePort` (contract:
// course-store-adapter.md). One class, two variants (research R3): the AUTHORING store
// reads the latest version (draft included) and writes DRAFT versions only; the CATALOG
// store reads published, non-archived snapshots and rejects writes. Both address courses
// by `engineId` (research R2), never Payload's serial id, and always use
// `overrideAccess: true` — route handlers authorize the actor before any engine call.

type StoreMode = 'authoring' | 'catalog'

type UnitRow = NonNullable<CourseDoc['units']>[number]
type LessonRow = NonNullable<UnitRow['lessons']>[number]
type ContentRow = NonNullable<LessonRow['contents']>[number]

// --- engine aggregate → Payload rows (whole-aggregate replace) ----------------
// Absent optional fields are written as `null` so a re-save that drops a field clears
// it (the engine's `applyInfo` deletes absent optionals). Order of array rows = engine
// order, which Payload preserves.

const contentToRow = (content: ContentRef) => ({
  engineId: content.id,
  title: content.title,
  h5pContentId: content.h5pContentId ?? null,
})

const lessonToRow = (lesson: Lesson) => ({
  engineId: lesson.id,
  title: lesson.title,
  contents: lesson.contents.map(contentToRow),
})

const unitToRow = (unit: Unit) => ({
  engineId: unit.id,
  title: unit.title,
  lessons: unit.lessons.map(lessonToRow),
})

/** Engine-owned fields only — never `author`, `_status`, or `reviewState`. */
const engineFields = (course: Course) => ({
  engineId: course.id,
  title: course.title,
  description: course.description ?? null,
  slug: course.slug ?? null,
  coverImage: course.coverImage ?? null,
  // Course.createdAt is stored verbatim as text so it round-trips byte-identically.
  engineCreatedAt: course.createdAt,
  units: course.units.map(unitToRow),
})

// --- Payload rows → engine aggregate ------------------------------------------
// Payload null → engine `undefined`/omitted: optional fields are only emitted when set,
// so the round-trip matches the engine's shape (no extra keys).

const rowToContent = (row: ContentRow): ContentRef => {
  const ref: ContentRef = { id: row.engineId ?? '', title: row.title ?? '' }
  if (row.h5pContentId != null) ref.h5pContentId = row.h5pContentId
  return ref
}

const rowToLesson = (row: LessonRow): Lesson => ({
  id: row.engineId ?? '',
  title: row.title ?? '',
  contents: (row.contents ?? []).map(rowToContent),
})

const rowToUnit = (row: UnitRow): Unit => ({
  id: row.engineId ?? '',
  title: row.title ?? '',
  lessons: (row.lessons ?? []).map(rowToLesson),
})

const rowToCourse = (doc: CourseDoc): Course => {
  const course: Course = {
    id: doc.engineId ?? '',
    title: doc.title,
    createdAt: doc.engineCreatedAt ?? '',
    units: (doc.units ?? []).map(rowToUnit),
  }
  if (doc.description != null) course.description = doc.description
  if (doc.slug != null) course.slug = doc.slug
  if (doc.coverImage != null) course.coverImage = doc.coverImage
  return course
}

class PayloadCourseStore implements CourseStorePort {
  constructor(
    private readonly payload: Payload,
    private readonly mode: StoreMode,
    private readonly authorId?: number,
  ) {}

  async save(course: Course): Promise<void> {
    this.assertWritable()
    const data = engineFields(course)
    const current = await this.findDoc({ engineId: { equals: course.id } })
    let courseDocId: number
    if (current) {
      const updated = await this.payload.update({
        collection: 'courses',
        id: current.id,
        data,
        draft: true,
        overrideAccess: true,
        depth: 0,
      })
      courseDocId = updated.id
    } else {
      const created = await this.payload.create({
        collection: 'courses',
        data: { ...data, author: this.requireAuthorId() },
        draft: true,
        overrideAccess: true,
        depth: 0,
      })
      courseDocId = created.id
    }
    await this.ensureLifecycle(courseDocId, course.id)
  }

  async getById(id: string): Promise<Course | undefined> {
    const doc = await this.readDoc({ engineId: { equals: id } })
    return doc ? rowToCourse(doc) : undefined
  }

  async getBySlug(slug: string): Promise<Course | undefined> {
    const doc = await this.readDoc({ slug: { equals: slug } })
    return doc ? rowToCourse(doc) : undefined
  }

  async list(): Promise<Course[]> {
    if (this.mode === 'authoring') {
      const res = await this.payload.find({
        collection: 'courses',
        draft: true,
        pagination: false,
        overrideAccess: true,
        depth: 0,
      })
      return res.docs.map(rowToCourse)
    }
    const res = await this.payload.find({
      collection: 'courses',
      where: { _status: { equals: 'published' } },
      draft: false,
      pagination: false,
      overrideAccess: true,
      depth: 0,
    })
    const archived = await this.archivedEngineIds()
    return res.docs
      .filter((doc) => !(doc.engineId != null && archived.has(doc.engineId)))
      .map(rowToCourse)
  }

  async deleteById(id: string): Promise<void> {
    this.assertWritable()
    // Idempotent (port contract): resolve silently when the course is absent.
    const current = await this.findDoc({ engineId: { equals: id } })
    if (!current) return
    // Delete the lifecycle row first — it holds an FK to `courses`.
    await this.payload.delete({
      collection: 'course-lifecycle',
      where: { engineId: { equals: id } },
      overrideAccess: true,
    })
    await this.payload.delete({ collection: 'courses', id: current.id, overrideAccess: true })
  }

  // --- internals --------------------------------------------------------------

  private assertWritable(): void {
    if (this.mode === 'catalog') throw new Error('catalog store is read-only')
  }

  private requireAuthorId(): number {
    if (this.authorId == null) {
      throw new Error('authoring store requires an authorId to create courses')
    }
    return this.authorId
  }

  /** Authoring lookup: the latest version (draft included), unfiltered. */
  private async findDoc(where: Where): Promise<CourseDoc | undefined> {
    const res = await this.payload.find({
      collection: 'courses',
      where,
      draft: true,
      limit: 1,
      overrideAccess: true,
      depth: 0,
    })
    return res.docs[0]
  }

  /**
   * Mode-aware read of a single course. Authoring reads the latest version; catalog
   * reads the published snapshot and excludes archived courses (research R5).
   */
  private async readDoc(where: Where): Promise<CourseDoc | undefined> {
    if (this.mode === 'authoring') return this.findDoc(where)
    const res = await this.payload.find({
      collection: 'courses',
      where: { and: [where, { _status: { equals: 'published' } }] },
      draft: false,
      limit: 1,
      overrideAccess: true,
      depth: 0,
    })
    const doc = res.docs[0]
    if (!doc) return undefined
    return (await this.isArchived(doc.engineId)) ? undefined : doc
  }

  private async isArchived(engineId: string | null | undefined): Promise<boolean> {
    if (engineId == null) return false
    const res = await this.payload.find({
      collection: 'course-lifecycle',
      where: { and: [{ engineId: { equals: engineId } }, { archivedAt: { exists: true } }] },
      limit: 1,
      overrideAccess: true,
      depth: 0,
    })
    return res.docs.length > 0
  }

  private async archivedEngineIds(): Promise<Set<string>> {
    const res = await this.payload.find({
      collection: 'course-lifecycle',
      where: { archivedAt: { exists: true } },
      pagination: false,
      overrideAccess: true,
      depth: 0,
    })
    const ids = new Set<string>()
    for (const row of res.docs) if (row.engineId) ids.add(row.engineId)
    return ids
  }

  /** Create the per-course lifecycle row on first save; idempotent thereafter. */
  private async ensureLifecycle(courseDocId: number, engineId: string): Promise<void> {
    const existing = await this.payload.find({
      collection: 'course-lifecycle',
      where: { engineId: { equals: engineId } },
      limit: 1,
      overrideAccess: true,
      depth: 0,
    })
    if (existing.docs.length > 0) return
    await this.payload.create({
      collection: 'course-lifecycle',
      data: { course: courseDocId, engineId },
      overrideAccess: true,
    })
  }
}

export interface AuthoringStoreOptions {
  /** The acting user's id — the required 002 `author` set on newly created courses. */
  authorId: number
}

/** Read/write store bound to an author; backs all authenticated authoring routes. */
export const makeAuthoringStore = (
  payload: Payload,
  options: AuthoringStoreOptions,
): CourseStorePort => new PayloadCourseStore(payload, 'authoring', options.authorId)

/** Read-only store over published, non-archived courses; backs the catalog + public reads. */
export const makeCatalogStore = (payload: Payload): CourseStorePort =>
  new PayloadCourseStore(payload, 'catalog')
