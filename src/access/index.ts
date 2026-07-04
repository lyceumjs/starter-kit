import type { Access, FieldAccess } from 'payload'

// Shared access helpers (FR-014 — every rule is server-side). Written defensively:
// during the admin permissions probe an access function may run with `data`/`id`
// undefined, so these depend only on `req.user` and return query constraints for
// row-level visibility (research D4).

type Role = 'admin' | 'instructor' | 'student'

const roleOf = (user: { role?: Role } | null | undefined): Role | undefined => user?.role ?? undefined

/** Collection access: Admin only. */
export const isAdmin: Access = ({ req }) => roleOf(req.user) === 'admin'

/** Collection access: Admin or Instructor (any level). */
export const isAdminOrInstructor: Access = ({ req }) => {
  const role = roleOf(req.user)
  return role === 'admin' || role === 'instructor'
}

/** Field access: only an Admin may write this field (role, accessLevel, author, reviewState). */
export const adminOnlyFieldAccess: FieldAccess = ({ req }) => roleOf(req.user) === 'admin'

/**
 * Collection update access: Admin unrestricted; an Instructor is constrained to their
 * own courses (own-content model); everyone else denied.
 */
export const ownCoursesOnly: Access = ({ req }) => {
  const role = roleOf(req.user)
  if (role === 'admin') return true
  if (role === 'instructor' && req.user) return { author: { equals: req.user.id } }
  return false
}

/**
 * Collection read access for courses: Admin and Instructors may read drafts; Students
 * and anonymous visitors are constrained to published courses only (FR-012, SC-003) —
 * applied by Payload to lists and by-id reads alike, so drafts/pending are unreachable.
 */
export const publishedOnlyForReaders: Access = ({ req }) => {
  const role = roleOf(req.user)
  if (role === 'admin' || role === 'instructor') return true
  return { _status: { equals: 'published' } }
}
