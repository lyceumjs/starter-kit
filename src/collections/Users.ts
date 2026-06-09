import type { CollectionConfig } from 'payload'

// Payload's built-in auth provides identity, password hashing, sessions and the
// admin login (spec Assumption). We add a `role` per terms.md / data-model.md.
// Only Admin authentication is exercised by this skeleton; instructor/student
// exist as forward-compatible enum values (an Admin creates Instructors later).
export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  fields: [
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'student',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Instructor', value: 'instructor' },
        { label: 'Student', value: 'student' },
      ],
    },
  ],
  versions: false,
}
