import {
  addLesson,
  addUnit,
  attachContent,
  createCourse,
  deleteCourse,
  getCourse,
  listCatalog,
  removeContent,
  removeLesson,
  removeUnit,
  renameLesson,
  renameUnit,
  reorderLessons,
  reorderUnits,
  updateCourseInfo,
  type ContentRef,
  type Course,
  type CourseInfo,
  type CourseStorePort,
  type CourseSummary,
  type Lesson,
  type Unit,
} from '@lyceumjs/lms'
import type { Payload } from 'payload'

import { makeAuthoringStore, makeCatalogStore } from './course-store'

// Course-scoped engine facade for the `/api/lms/*` route handlers. Feature 003 exposes
// only the course-authoring + catalog operations (contracts/lms-api.md) — no H5P, no
// example/learning-record ports — so binding Lyceum's use-cases directly to a
// `CourseStorePort` is the minimal correct wiring (research R6). The full
// `createEngine` (runtime) additionally requires an H5P storage + those other ports,
// which this feature never touches; it is the right seam when the H5P player lands.

export interface CourseEngine {
  createCourse(info: CourseInfo): Promise<Course>
  updateCourseInfo(courseId: string, info: CourseInfo): Promise<Course>
  getCourse(id: string): Promise<Course | undefined>
  deleteCourse(courseId: string): Promise<void>
  listCatalog(): Promise<CourseSummary[]>
  addUnit(courseId: string, input: { title: string }): Promise<Unit>
  renameUnit(courseId: string, unitId: string, title: string): Promise<void>
  reorderUnits(courseId: string, orderedUnitIds: string[]): Promise<void>
  removeUnit(courseId: string, unitId: string): Promise<void>
  addLesson(courseId: string, unitId: string, input: { title: string }): Promise<Lesson>
  renameLesson(courseId: string, unitId: string, lessonId: string, title: string): Promise<void>
  reorderLessons(courseId: string, unitId: string, orderedLessonIds: string[]): Promise<void>
  removeLesson(courseId: string, unitId: string, lessonId: string): Promise<void>
  attachContent(
    courseId: string,
    unitId: string,
    lessonId: string,
    input: { title: string; h5pContentId?: string },
  ): Promise<ContentRef>
  removeContent(courseId: string, unitId: string, lessonId: string, contentId: string): Promise<void>
}

const bindCourseEngine = (store: CourseStorePort): CourseEngine => ({
  createCourse: (info) => createCourse(store, info),
  updateCourseInfo: (courseId, info) => updateCourseInfo(store, courseId, info),
  getCourse: (id) => getCourse(store, id),
  deleteCourse: (courseId) => deleteCourse(store, courseId),
  listCatalog: () => listCatalog(store),
  addUnit: (courseId, input) => addUnit(store, courseId, input),
  renameUnit: (courseId, unitId, title) => renameUnit(store, courseId, unitId, title),
  reorderUnits: (courseId, ids) => reorderUnits(store, courseId, ids),
  removeUnit: (courseId, unitId) => removeUnit(store, courseId, unitId),
  addLesson: (courseId, unitId, input) => addLesson(store, courseId, unitId, input),
  renameLesson: (courseId, unitId, lessonId, title) =>
    renameLesson(store, courseId, unitId, lessonId, title),
  reorderLessons: (courseId, unitId, ids) => reorderLessons(store, courseId, unitId, ids),
  removeLesson: (courseId, unitId, lessonId) => removeLesson(store, courseId, unitId, lessonId),
  attachContent: (courseId, unitId, lessonId, input) =>
    attachContent(store, courseId, unitId, lessonId, input),
  removeContent: (courseId, unitId, lessonId, contentId) =>
    removeContent(store, courseId, unitId, lessonId, contentId),
})

/** Authoring engine bound to the acting user — cheap per-request construction (authorId varies). */
export const getAuthoringEngine = (
  payload: Payload,
  options: { authorId: number },
): CourseEngine => bindCourseEngine(makeAuthoringStore(payload, options))

// The catalog store carries no per-request state (research R3), so its engine is memoized
// per Payload instance.
let catalogEngine: CourseEngine | null = null
let catalogPayload: Payload | null = null

/** Read-only catalog engine (published, non-archived); memoized per Payload instance. */
export const getCatalogEngine = (payload: Payload): CourseEngine => {
  if (catalogEngine && catalogPayload === payload) return catalogEngine
  catalogEngine = bindCourseEngine(makeCatalogStore(payload))
  catalogPayload = payload
  return catalogEngine
}
