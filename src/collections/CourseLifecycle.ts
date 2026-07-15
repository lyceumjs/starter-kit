import type { Access, CollectionConfig } from 'payload'

import { isAdmin } from '../access'

// Per-course lifecycle record (R5): an unversioned sibling to `courses` that anchors the
// permanence/archive rules a versioned field can't carry. `firstPublishedAt` gates delete
// (non-null ⇒ permanent, FR-012); `archivedAt` excludes a course from catalog reads;
// `archivedFrom` documents the state restore returns to. One row per course, created on
// first engine save (or first lifecycle event). Written only by system paths (hooks +
// lifecycle routes, via overrideAccess); read is Admin-only for now, like review-decisions.
const deny: Access = () => false

export const CourseLifecycle: CollectionConfig = {
  slug: 'course-lifecycle',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['course', 'firstPublishedAt', 'archivedAt', 'archivedFrom'],
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
      unique: true,
    },
    {
      name: 'engineId',
      type: 'text',
      index: true,
    },
    {
      name: 'firstPublishedAt',
      type: 'date',
    },
    {
      name: 'archivedAt',
      type: 'date',
    },
    {
      name: 'archivedFrom',
      type: 'select',
      options: [
        { label: 'Published', value: 'published' },
        { label: 'Draft', value: 'draft' },
        { label: 'Pending', value: 'pending' },
      ],
    },
  ],
}
