import type { CollectionAfterChangeHook } from 'payload'

import type { ReviewResolution } from '../../domain/course-workflow'

// Writes the immutable review-decision record whenever an Admin resolves a pending
// review (FR-016). The resolution is computed by applyPublicationWorkflow and stashed
// on `req.context`; recording here means it fires on every path — admin panel, REST,
// Local API. The record collection denies create to all callers, so this system
// action uses overrideAccess.
export const recordReviewDecision: CollectionAfterChangeHook = async ({ doc, req, context }) => {
  const ctx = context as Record<string, unknown>
  const resolution = ctx.reviewResolution as ReviewResolution | undefined
  const decidedBy = req.user?.id

  if (!resolution || !decidedBy) return doc

  // Guard against a second record if afterChange runs more than once per request.
  ctx.reviewResolution = null

  await req.payload.create({
    collection: 'review-decisions',
    data: {
      course: doc.id,
      decision: resolution,
      decidedBy,
    },
    req,
    overrideAccess: true,
  })

  return doc
}
