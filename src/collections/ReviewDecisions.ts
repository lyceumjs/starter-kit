import type { Access, CollectionConfig } from 'payload'

import { isAdmin } from '../access'

// Immutable per-decision record: the course's review history (FR-016). Created only by
// the system (recordReviewDecision, via overrideAccess) when an Admin resolves a pending
// review; no caller may create, update, or delete one. Read is Admin-only for now — no
// UI consumes it this phase.
const deny: Access = () => false

export const ReviewDecisions: CollectionConfig = {
  slug: 'review-decisions',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['course', 'decision', 'decidedBy', 'createdAt'],
    group: 'System',
  },
  access: {
    read: isAdmin,
    create: deny,
    update: deny,
    delete: deny,
  },
  fields: [
    {
      name: 'course',
      type: 'relationship',
      relationTo: 'courses',
      required: true,
    },
    {
      name: 'decision',
      type: 'select',
      required: true,
      options: [
        { label: 'Approve', value: 'approve' },
        { label: 'Reject', value: 'reject' },
      ],
    },
    {
      name: 'decidedBy',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
  ],
}
