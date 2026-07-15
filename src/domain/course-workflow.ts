// Publication state machine + role capability rules for courses.
//
// This is the first real domain logic in the repo and deliberately has ZERO
// Payload/Next imports (constitution III). Payload access functions and hooks
// only *adapt* these pure functions, so the module can move into the future Core
// Library unmodified. Transition numbers (T1–T10) map to data-model.md.

export type Role = 'admin' | 'instructor' | 'student'
export type AccessLevel = 'editor' | 'standard'
export type CourseStatus = 'draft' | 'published'
export type ReviewState = 'none' | 'pending'

/** The person performing a write, reduced to what the rules actually depend on. */
export interface Actor {
  role: Role
  accessLevel?: AccessLevel | null
  /** The actor's user id — only the ownership rules (delete/archive/restore) read it. */
  id?: number | null
}

/**
 * An Admin, or an Instructor holding the **editor** access level, may publish with
 * no approval step (access matrix: "Publish own course with no approval").
 */
export const canPublishDirectly = (actor: Actor): boolean =>
  actor.role === 'admin' || (actor.role === 'instructor' && actor.accessLevel === 'editor')

/** Only an Admin may resolve a pending review — approve or reject (T4/T5/T7). */
export const canApprove = (actor: Actor): boolean => actor.role === 'admin'

/** The publication fields as they arrive on a write. */
export interface PublicationWrite {
  /** The `_status` the caller is trying to write ('published' means a publish action). */
  incomingStatus: CourseStatus
  /** The `reviewState` currently stored on the course (before this write). */
  currentReviewState: ReviewState
}

export interface PublicationOutcome {
  status: CourseStatus
  reviewState: ReviewState
  /** True when this write pushes the course into pending review (T3). */
  submittedForReview: boolean
}

/**
 * Compute the stored publication fields for a course write (T1–T3, T6).
 *
 * - Admin / editor Instructor: pass-through — publishing takes effect immediately and
 *   a write never leaves the course pending (T2/T6). Admin writes are thereby never
 *   subject to review (FR-005).
 * - Standard Instructor publishing: transformed into a pending draft (T3); the prior
 *   published version stays live because a draft is saved rather than published (FR-009).
 * - Standard Instructor draft-saving: stays a draft and the existing review state is
 *   preserved (a pending resubmission keeps waiting).
 */
export const resolvePublicationWrite = (
  actor: Actor,
  write: PublicationWrite,
): PublicationOutcome => {
  const wantsToPublish = write.incomingStatus === 'published'

  if (canPublishDirectly(actor)) {
    return { status: write.incomingStatus, reviewState: 'none', submittedForReview: false }
  }

  if (wantsToPublish) {
    return { status: 'draft', reviewState: 'pending', submittedForReview: true }
  }

  return { status: 'draft', reviewState: write.currentReviewState, submittedForReview: false }
}

/** How an Admin's write resolves a course that was pending review (T4/T5), else null. */
export type ReviewResolution = 'approve' | 'reject' | null

/**
 * Classify an Admin write against a course that was pending review, for the immutable
 * review-decision record (FR-016). Publishing the pending draft is an approval (T4); a
 * draft-save that clears the pending state without publishing is a rejection (T5).
 * Non-Admins never resolve reviews (T7); a write to a course that was not pending is
 * not a review decision.
 */
export const classifyReviewResolution = (
  actor: Actor,
  wasPending: boolean,
  outcome: PublicationOutcome,
): ReviewResolution => {
  if (!canApprove(actor) || !wasPending) return null
  if (outcome.status === 'published') return 'approve'
  if (outcome.reviewState === 'none') return 'reject'
  return null
}

/** The lifecycle facts a delete/archive/restore decision depends on (from `course-lifecycle`). */
export interface CourseLifecycleFacts {
  /** The course author's user id. */
  authorId: number
  /** Whether the course has ever been published (`firstPublishedAt` is set). */
  everPublished: boolean
}

/** Whether the actor owns the course (ownership is by user id, any access level). */
const isAuthor = (actor: Actor, authorId: number): boolean =>
  actor.id != null && actor.id === authorId

/**
 * Delete is allowed only while the course has NEVER been published (T8, FR-012): an Admin,
 * or the author at any instructor level, may delete a never-published course. Once ever
 * published a course is permanent — no actor may delete it.
 */
export const canDeleteCourse = (actor: Actor, facts: CourseLifecycleFacts): boolean =>
  !facts.everPublished && (actor.role === 'admin' || isAuthor(actor, facts.authorId))

/**
 * Archive permission (T9): an ever-published course may be archived only by an Admin or an
 * editor-level Instructor who owns it; a never-published course may also be archived by its
 * author at any instructor level.
 */
export const canArchiveCourse = (actor: Actor, facts: CourseLifecycleFacts): boolean => {
  if (actor.role === 'admin') return true
  if (facts.everPublished) {
    return (
      actor.role === 'instructor' &&
      actor.accessLevel === 'editor' &&
      isAuthor(actor, facts.authorId)
    )
  }
  return isAuthor(actor, facts.authorId)
}

/** Restore (T10) uses the same actor set as archive. */
export const canRestoreCourse = canArchiveCourse

/**
 * Publishing is one-way (T6 removed): a published → draft regression on the same version
 * stream is forbidden for EVERY actor, Admin included — the guard takes no actor, so there
 * is no exception path. Saving a NEW draft on top of a published version is not an unpublish
 * (the published version stays live); callers must not pass that here as published → draft.
 */
export const isForbiddenUnpublish = (
  previousStatus: CourseStatus,
  incomingStatus: CourseStatus,
): boolean => previousStatus === 'published' && incomingStatus === 'draft'

/** The review outcome of archiving a course (T9): the pending review is voided, not decided. */
export interface ArchiveReviewOutcome {
  /** Review state after archive — always cleared to `none`. */
  reviewState: ReviewState
  /** True when a pending review was voided, so `recordReviewDecision` records nothing. */
  reviewVoided: boolean
}

/**
 * Archiving voids any in-flight review (T9): `reviewState` is reset to `none` and a pending
 * review is reported as voided so the archive path records no review decision (R5).
 */
export const resolveArchiveReview = (reviewState: ReviewState): ArchiveReviewOutcome => ({
  reviewState: 'none',
  reviewVoided: reviewState === 'pending',
})
