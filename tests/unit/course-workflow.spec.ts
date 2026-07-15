import { describe, expect, it } from 'vitest'

// Purity guard (constitution III): this file imports ONLY the domain module — no
// Payload/Next. Every T1–T7 transition and capability predicate is a plain function call.
import {
  canApprove,
  canArchiveCourse,
  canDeleteCourse,
  canPublishDirectly,
  canRestoreCourse,
  classifyReviewResolution,
  isForbiddenUnpublish,
  resolveArchiveReview,
  resolvePublicationWrite,
  type Actor,
  type CourseLifecycleFacts,
} from '../../src/domain/course-workflow'

const admin: Actor = { role: 'admin' }
const editor: Actor = { role: 'instructor', accessLevel: 'editor' }
const standard: Actor = { role: 'instructor', accessLevel: 'standard' }
const student: Actor = { role: 'student' }

describe('capability predicates', () => {
  it('canPublishDirectly: Admin and editor Instructor only', () => {
    expect(canPublishDirectly(admin)).toBe(true)
    expect(canPublishDirectly(editor)).toBe(true)
    expect(canPublishDirectly(standard)).toBe(false)
    expect(canPublishDirectly(student)).toBe(false)
  })

  it('canApprove: Admin only (T7)', () => {
    expect(canApprove(admin)).toBe(true)
    expect(canApprove(editor)).toBe(false)
    expect(canApprove(standard)).toBe(false)
    expect(canApprove(student)).toBe(false)
  })
})

describe('resolvePublicationWrite', () => {
  it('T2: editor Instructor publish → published immediately, no review', () => {
    expect(
      resolvePublicationWrite(editor, { incomingStatus: 'published', currentReviewState: 'none' }),
    ).toEqual({ status: 'published', reviewState: 'none', submittedForReview: false })
  })

  it('T2: Admin publish → published immediately (never subject to review, FR-005)', () => {
    expect(
      resolvePublicationWrite(admin, { incomingStatus: 'published', currentReviewState: 'pending' }),
    ).toEqual({ status: 'published', reviewState: 'none', submittedForReview: false })
  })

  it('T3: standard Instructor publish → pending draft (prior published stays live)', () => {
    expect(
      resolvePublicationWrite(standard, { incomingStatus: 'published', currentReviewState: 'none' }),
    ).toEqual({ status: 'draft', reviewState: 'pending', submittedForReview: true })
  })

  it('standard Instructor draft-save preserves an existing pending resubmission', () => {
    expect(
      resolvePublicationWrite(standard, { incomingStatus: 'draft', currentReviewState: 'pending' }),
    ).toEqual({ status: 'draft', reviewState: 'pending', submittedForReview: false })
  })

  it('standard Instructor draft-save on a fresh course stays none', () => {
    expect(
      resolvePublicationWrite(standard, { incomingStatus: 'draft', currentReviewState: 'none' }),
    ).toEqual({ status: 'draft', reviewState: 'none', submittedForReview: false })
  })
})

describe('classifyReviewResolution', () => {
  const approveOutcome = resolvePublicationWrite(admin, {
    incomingStatus: 'published',
    currentReviewState: 'pending',
  })
  const rejectOutcome = resolvePublicationWrite(admin, {
    incomingStatus: 'draft',
    currentReviewState: 'pending',
  })

  it('T4: Admin publishing a pending course is an approval', () => {
    expect(classifyReviewResolution(admin, true, approveOutcome)).toBe('approve')
  })

  it('T5: Admin draft-saving a pending course (clearing pending) is a rejection', () => {
    expect(classifyReviewResolution(admin, true, rejectOutcome)).toBe('reject')
  })

  it('not a decision when the course was not pending', () => {
    expect(classifyReviewResolution(admin, false, approveOutcome)).toBeNull()
  })

  it('T7: a non-Admin never records a review decision', () => {
    const standardOutcome = resolvePublicationWrite(standard, {
      incomingStatus: 'published',
      currentReviewState: 'pending',
    })
    expect(classifyReviewResolution(standard, true, standardOutcome)).toBeNull()
  })
})

// Lifecycle actors carry a user id so ownership rules can compare against `authorId`.
const AUTHOR = 7
const OTHER = 9

const lifecycleActors: Record<string, Actor> = {
  admin: { role: 'admin' },
  'owner (editor)': { role: 'instructor', accessLevel: 'editor', id: AUTHOR },
  'owner (standard)': { role: 'instructor', accessLevel: 'standard', id: AUTHOR },
  'other (editor)': { role: 'instructor', accessLevel: 'editor', id: OTHER },
  'other (standard)': { role: 'instructor', accessLevel: 'standard', id: OTHER },
  student: { role: 'student', id: 99 },
}

const neverPublishedFacts: CourseLifecycleFacts = { authorId: AUTHOR, everPublished: false }
const everPublishedFacts: CourseLifecycleFacts = { authorId: AUTHOR, everPublished: true }

describe('canDeleteCourse (T8 — never-published only, author or Admin)', () => {
  it.each<[string, boolean]>([
    ['admin', true],
    ['owner (editor)', true],
    ['owner (standard)', true],
    ['other (editor)', false],
    ['other (standard)', false],
    ['student', false],
  ])('never-published: %s → %s', (label, allowed) => {
    expect(canDeleteCourse(lifecycleActors[label], neverPublishedFacts)).toBe(allowed)
  })

  it.each(Object.keys(lifecycleActors))('ever-published: %s → false (permanent)', (label) => {
    expect(canDeleteCourse(lifecycleActors[label], everPublishedFacts)).toBe(false)
  })
})

// label, allowed-when-ever-published, allowed-when-never-published
const archiveTable: Array<[string, boolean, boolean]> = [
  ['admin', true, true],
  ['owner (editor)', true, true],
  ['owner (standard)', false, true],
  ['other (editor)', false, false],
  ['other (standard)', false, false],
  ['student', false, false],
]

for (const [fn, name] of [
  [canArchiveCourse, 'canArchiveCourse (T9)'],
  [canRestoreCourse, 'canRestoreCourse (T10)'],
] as const) {
  describe(name, () => {
    it.each(archiveTable)('ever-published: %s → %s', (label, everPub) => {
      expect(fn(lifecycleActors[label], everPublishedFacts)).toBe(everPub)
    })

    it.each(archiveTable)('never-published: %s (never → %s)', (label, _everPub, neverPub) => {
      expect(fn(lifecycleActors[label], neverPublishedFacts)).toBe(neverPub)
    })
  })
}

describe('canRestoreCourse mirrors canArchiveCourse', () => {
  it('is the same rule (T10 uses the T9 actor set)', () => {
    expect(canRestoreCourse).toBe(canArchiveCourse)
  })
})

describe('isForbiddenUnpublish (T6 removed — publishing is one-way)', () => {
  it('flags published → draft as forbidden', () => {
    expect(isForbiddenUnpublish('published', 'draft')).toBe(true)
  })

  it('allows publishing and same-status writes', () => {
    expect(isForbiddenUnpublish('draft', 'published')).toBe(false)
    expect(isForbiddenUnpublish('published', 'published')).toBe(false)
    expect(isForbiddenUnpublish('draft', 'draft')).toBe(false)
  })

  it('has no per-actor exception — every actor incl. Admin is blocked', () => {
    // The guard takes no actor by design; unpublishing is forbidden for admin,
    // editor, standard and student alike.
    for (const label of Object.keys(lifecycleActors)) {
      void label
      expect(isForbiddenUnpublish('published', 'draft')).toBe(true)
    }
  })
})

describe('resolveArchiveReview (T9 — archive voids review, records no decision)', () => {
  it('voids a pending review: state cleared, voided flagged', () => {
    expect(resolveArchiveReview('pending')).toEqual({ reviewState: 'none', reviewVoided: true })
  })

  it('clears an already-none review without voiding anything', () => {
    expect(resolveArchiveReview('none')).toEqual({ reviewState: 'none', reviewVoided: false })
  })
})
