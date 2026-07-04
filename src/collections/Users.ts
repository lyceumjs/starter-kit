import type { CollectionConfig } from 'payload'

import { adminOnlyFieldAccess, isAdmin } from '../access'

// Public base URL — feeds the verification link built into the email below.
const APP_URL = process.env.APP_URL || 'http://localhost:3021'

// Payload's built-in auth provides identity, password hashing, sessions and the admin
// login. This feature adds the role/accessLevel model, public Student self-signup with
// email verification, and the server-side access rules (FR-001..FR-004c, FR-011/013/017).
export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  access: {
    // Admin/authoring panel: Admin + Instructor only; Students never reach it (FR-011).
    admin: ({ req }) => req.user?.role === 'admin' || req.user?.role === 'instructor',
    // Anonymous self-signup, or Admin provisioning. Instructors/Students cannot create
    // accounts (FR-013). Anonymous creates are forced to Student (field access + hook).
    create: ({ req }) => !req.user || req.user.role === 'admin',
    // Admin reads every account; any signed-in user may read only their own.
    read: ({ req }) => {
      if (!req.user) return false
      if (req.user.role === 'admin') return true
      return { id: { equals: req.user.id } }
    },
    // Admin updates any account; a user may update their own (role/accessLevel remain
    // Admin-only via field access below, so there is no self-escalation).
    update: ({ req }) => {
      if (!req.user) return false
      if (req.user.role === 'admin') return true
      return { id: { equals: req.user.id } }
    },
    delete: isAdmin,
  },
  auth: {
    // Email/password self-registrations must verify before the account is usable;
    // login of an unverified user fails 403 (FR-004c). Google sign-ups are created
    // `_verified: true` and skip this (see plugins/google-oauth.ts).
    verify: {
      generateEmailSubject: () => 'Verify your email',
      generateEmailHTML: ({ req, token }) => {
        // The link points at the frontend verify page, which calls the Payload verify
        // endpoint with the token (research D1).
        const url = `${APP_URL}/verify-email?token=${token}`
        // In dev (no SMTP configured) the message goes to a no-op transport, so surface
        // the link in the app logs to keep the verification flow reachable with zero
        // secrets (research D2 intent).
        if (!process.env.SMTP_HOST) {
          req?.payload?.logger?.info(`[dev] Email verification link: ${url}`)
        }
        return `<p>Welcome! Confirm your email address to activate your account.</p>
<p><a href="${url}">Verify my email</a></p>
<p>Or paste this link into your browser:<br/>${url}</p>`
      },
    },
  },
  hooks: {
    beforeValidate: [
      ({ data, req, operation }) => {
        if (operation !== 'create' || !data) return data

        const creatorIsAdmin = req.user?.role === 'admin'
        const trusted = creatorIsAdmin || req.context?.trustedRoleAssignment === true

        if (!trusted) {
          // Defense in depth (FR-004): a self-registration is always a Student and
          // never carries an access level, regardless of what was submitted. Field
          // access already strips these, but this holds even if that ever changes.
          data.role = 'student'
          data.accessLevel = null
          return data
        }

        if (creatorIsAdmin) {
          // Admin-provisioned accounts are vouched for — skip email verification so a
          // new Instructor can sign in immediately (SC-005).
          data._verified = true
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'student',
      // Admin-only: public signup cannot submit a role, so it defaults to Student (FR-004).
      access: {
        create: adminOnlyFieldAccess,
        update: adminOnlyFieldAccess,
      },
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Instructor', value: 'instructor' },
        { label: 'Student', value: 'student' },
      ],
    },
    {
      name: 'accessLevel',
      type: 'select',
      defaultValue: 'standard',
      // Instructor-only attribute (FR-002); Admin-only to write.
      access: {
        create: adminOnlyFieldAccess,
        update: adminOnlyFieldAccess,
      },
      admin: {
        condition: (data) => data?.role === 'instructor',
        description: 'Publishing access level for Instructors.',
      },
      options: [
        { label: 'Editor (publishes without approval)', value: 'editor' },
        { label: 'Standard (requires Admin approval)', value: 'standard' },
      ],
    },
  ],
  versions: false,
}
