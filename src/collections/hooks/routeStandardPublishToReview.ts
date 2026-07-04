import type { CollectionBeforeOperationHook } from 'payload'

import { canPublishDirectly, type Actor } from '../../domain/course-workflow'

// A standard-level Instructor's publish must become a *pending draft* that leaves any
// prior published version live for readers (FR-008/FR-009). The only way to keep the
// published version live while storing the incoming changes is to run the write in
// draft mode — and `draft` is an operation argument, so it has to be set here at the
// beforeOperation layer (a beforeChange hook is too late; forcing `_status: 'draft'`
// there instead unpublishes the live version). We flag the request on `req.context` so
// applyPublicationWorkflow marks it `reviewState: 'pending'`.
export const routeStandardPublishToReview: CollectionBeforeOperationHook = ({
  args,
  operation,
  req,
}) => {
  if (operation !== 'create' && operation !== 'update') return args

  const user = req.user as { role?: Actor['role']; accessLevel?: Actor['accessLevel'] } | null
  if (!user?.role) return args

  const actor: Actor = { role: user.role, accessLevel: user.accessLevel }
  const data = args.data as Record<string, unknown> | undefined
  const incomingStatus = data?._status === 'published' ? 'published' : 'draft'

  if (!canPublishDirectly(actor) && incomingStatus === 'published' && data) {
    // Route the write to draft mode AND flip the incoming `_status` to draft *here*, at
    // the operation's start — Payload's version logic reads `data._status` before
    // beforeChange runs, so flipping it later (in beforeChange) still unpublishes the
    // live version. Both together = a draft save that leaves any published version live.
    args.draft = true
    data._status = 'draft'
    ;(req.context as Record<string, unknown>).submitForReview = true
  }
  return args
}
