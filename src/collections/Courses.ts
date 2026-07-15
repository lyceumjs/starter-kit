import type { CollectionConfig, FieldAccess } from 'payload'

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

// Engine-owned fields (R4): written only by the Lyceum adapter via the Local API
// (overrideAccess: true) after the route has authorized the actor. Locking create/update
// makes field access strip any REST/admin write to them, so the engine stays the sole
// writer and 002's publish/approve flows on the same document keep working unchanged.
const engineOwned: FieldAccess = () => false

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
    // Engine identity (R2): the engine-minted UUID; Payload's serial id stays internal.
    // All /api/lms/* routes and adapter lookups address courses by this field.
    {
      name: 'engineId',
      type: 'text',
      index: true,
      access: { create: engineOwned, update: engineOwned },
      admin: { readOnly: true },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      access: { create: engineOwned, update: engineOwned },
      admin: { readOnly: true },
    },
    {
      name: 'description',
      type: 'textarea',
      access: { create: engineOwned, update: engineOwned },
      admin: { readOnly: true },
    },
    // No DB unique flag: the engine enforces store-wide slug uniqueness via the
    // authoring store (R1); last-write-wins races are accepted at this scale.
    {
      name: 'slug',
      type: 'text',
      index: true,
      access: { create: engineOwned, update: engineOwned },
      admin: { readOnly: true },
    },
    {
      name: 'coverImage',
      type: 'text',
      access: { create: engineOwned, update: engineOwned },
      admin: { readOnly: true },
    },
    // ISO-8601 string stored verbatim for round-trip fidelity — Payload's own createdAt
    // stays infra metadata (data-model).
    {
      name: 'engineCreatedAt',
      type: 'text',
      access: { create: engineOwned, update: engineOwned },
      admin: { readOnly: true },
    },
    // Course structure as nested arrays (R1): units → lessons → contents, each row
    // carrying the engine's UUID. Order of rows = engine order. Locking the top-level
    // array strips any REST/admin write to the whole structure.
    {
      name: 'units',
      type: 'array',
      access: { create: engineOwned, update: engineOwned },
      admin: { readOnly: true },
      fields: [
        { name: 'engineId', type: 'text' },
        { name: 'title', type: 'text' },
        {
          name: 'lessons',
          type: 'array',
          fields: [
            { name: 'engineId', type: 'text' },
            { name: 'title', type: 'text' },
            {
              name: 'contents',
              type: 'array',
              fields: [
                { name: 'engineId', type: 'text' },
                { name: 'title', type: 'text' },
                { name: 'h5pContentId', type: 'text' },
              ],
            },
          ],
        },
      ],
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
