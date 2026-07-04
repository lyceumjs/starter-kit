import type { CollectionBeforeChangeHook } from 'payload'

import {
  canPublishDirectly,
  classifyReviewResolution,
  type Actor,
  type ReviewState,
} from '../../domain/course-workflow'

// Adapts the pure publication state machine to Payload's write pipeline, and stashes an
// Admin's approve/reject resolution on `req.context` for the afterChange recorder
// (FR-016). The standard-Instructor "publish → pending draft" routing itself happens in
// routeStandardPublishToReview (beforeOperation), which flags `submitForReview`; this
// hook only stamps the resulting `reviewState`.
export const applyPublicationWorkflow: CollectionBeforeChangeHook = ({
  data,
  req,
  originalDoc,
  context,
}) => {
  const user = req.user as { role?: Actor['role']; accessLevel?: Actor['accessLevel'] } | null
  if (!user?.role) {
    // System write with no user (e.g. tests seeding state via overrideAccess) — leave as-is.
    return data
  }

  const actor: Actor = { role: user.role, accessLevel: user.accessLevel }
  const ctx = context as Record<string, unknown>
  const incomingStatus = data._status === 'published' ? 'published' : 'draft'
  const currentReviewState: ReviewState = originalDoc?.reviewState === 'pending' ? 'pending' : 'none'
  const wasPending = currentReviewState === 'pending'

  if (canPublishDirectly(actor)) {
    // Admin / editor Instructor: publish or edit applies immediately (T2/T6); clear any
    // pending flag. Record how an Admin resolved a course that was pending (T4/T5).
    ctx.reviewResolution = classifyReviewResolution(actor, wasPending, {
      status: incomingStatus,
      reviewState: 'none',
      submittedForReview: false,
    })
    data.reviewState = 'none'
    return data
  }

  // Standard-level Instructor. Their publish was already rerouted to a pending draft
  // write by routeStandardPublishToReview (draft mode + `_status: draft`), which keeps
  // any prior published version live (FR-009); here we only stamp it pending (T3).
  // `reviewState` is set on `data` directly, bypassing its Admin-only field access. A
  // plain draft save leaves `reviewState` as stored (a pending resubmission keeps
  // waiting). Non-Admins never resolve reviews (T7).
  if (ctx.submitForReview) {
    data.reviewState = 'pending'
  }
  ctx.reviewResolution = null
  return data
}
