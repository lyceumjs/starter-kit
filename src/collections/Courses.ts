import type { CollectionConfig } from 'payload'

import {
  adminOnlyFieldAccess,
  isAdmin,
  isAdminOrInstructor,
  ownCoursesOnly,
  publishedOnlyForReaders,
} from '../access'
import { applyPublicationWorkflow } from './hooks/applyPublicationWorkflow'
import { recordReviewDecision } from './hooks/recordReviewDecision'
import { routeStandardPublishToReview } from './hooks/routeStandardPublishToReview'

// A deliberately minimal course record that carries the publication workflow end-to-end
// (draft / pending review / published). The later course-management feature extends it
// with real content. Publication states ride Payload versions + drafts; "pending review"
// is the one state Payload lacks and is carried by `reviewState` (research D4).
export const Courses: CollectionConfig = {
  slug: 'courses',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'author', '_status', 'reviewState'],
  },
  access: {
    create: isAdminOrInstructor,
    read: publishedOnlyForReaders,
    update: ownCoursesOnly,
    delete: isAdmin,
  },
  // Drafts give FR-009 for free: saving a draft on a published course leaves the
  // published version served to readers until the draft is published. Autosave off.
  versions: {
    drafts: true,
  },
  hooks: {
    beforeOperation: [routeStandardPublishToReview],
    beforeChange: [applyPublicationWorkflow],
    afterChange: [recordReviewDecision],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      // Defaults to the creating user; only an Admin may reassign it (field access
      // strips a non-Admin's submitted author, then this default fills the creator).
      defaultValue: ({ req }) => req?.user?.id,
      access: {
        create: adminOnlyFieldAccess,
        update: adminOnlyFieldAccess,
      },
      admin: { position: 'sidebar' },
    },
    {
      name: 'reviewState',
      type: 'select',
      required: true,
      defaultValue: 'none',
      // System-managed by applyPublicationWorkflow; Admin-writable as an escape hatch,
      // never settable by a standard Instructor directly.
      access: {
        create: adminOnlyFieldAccess,
        update: adminOnlyFieldAccess,
      },
      admin: { position: 'sidebar', readOnly: true },
      options: [
        { label: 'None', value: 'none' },
        { label: 'Pending review', value: 'pending' },
      ],
    },
  ],
}
