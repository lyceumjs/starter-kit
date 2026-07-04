import { describe, expect, it } from 'vitest'

// Purity guard (constitution III): this file imports ONLY the domain module — no
// Payload/Next. Every T1–T7 transition and capability predicate is a plain function call.
import {
  canApprove,
  canPublishDirectly,
  classifyReviewResolution,
  resolvePublicationWrite,
  type Actor,
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
