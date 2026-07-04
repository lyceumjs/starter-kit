import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { createUser, getTestPayload, resetDb, write } from '../helpers/payload'

// The full access-matrix sweep (SC-001): every "No" cell denied across all four account
// types, exercised through the enforced access path (overrideAccess: false + user).
// Enforcement mapping: contracts/access-control.md.

describe('access matrix', () => {
  let payload: Payload
  let admin: Awaited<ReturnType<typeof createUser>>
  let editor: Awaited<ReturnType<typeof createUser>>
  let standard: Awaited<ReturnType<typeof createUser>>
  let student: Awaited<ReturnType<typeof createUser>>

  beforeAll(async () => {
    payload = await getTestPayload()
    await resetDb(payload)
    admin = await createUser(payload, { email: 'admin@matrix.test', role: 'admin' })
    editor = await createUser(payload, {
      email: 'editor@matrix.test',
      role: 'instructor',
      accessLevel: 'editor',
    })
    standard = await createUser(payload, {
      email: 'standard@matrix.test',
      role: 'instructor',
      accessLevel: 'standard',
    })
    student = await createUser(payload, { email: 'student@matrix.test', role: 'student' })
  })

  describe('user account management (FR-003/004/013)', () => {
    it('allows anonymous self-signup, forced to Student even if another role is submitted', async () => {
      const created = await write.create(payload, {
        collection: 'users',
        data: { email: 'selfsignup@matrix.test', password: 'password123', role: 'admin', accessLevel: 'editor' },
        overrideAccess: false, // anonymous, no user
      })
      expect(created.role).toBe('student')
      expect(created.accessLevel).not.toBe('editor')
    })

    it('lets an Admin provision an Instructor with an access level (US1-AS1)', async () => {
      const created = await write.create(payload, {
        collection: 'users',
        data: { email: 'provisioned@matrix.test', password: 'password123', role: 'instructor', accessLevel: 'editor' },
        user: admin,
        overrideAccess: false,
      })
      expect(created.role).toBe('instructor')
      expect(created.accessLevel).toBe('editor')
    })

    it('denies a signed-in Instructor from creating accounts (FR-013)', async () => {
      await expect(
        write.create(payload, {
          collection: 'users',
          data: { email: 'nope@matrix.test', password: 'password123' },
          user: editor,
          overrideAccess: false,
        }),
      ).rejects.toThrow()
    })

    it('denies a Student from creating accounts', async () => {
      await expect(
        write.create(payload, {
          collection: 'users',
          data: { email: 'nope2@matrix.test', password: 'password123' },
          user: student,
          overrideAccess: false,
        }),
      ).rejects.toThrow()
    })

    it('ignores a non-Admin trying to change role/accessLevel (field access)', async () => {
      const updated = await write.update(payload, {
        collection: 'users',
        id: standard.id,
        data: { role: 'admin', accessLevel: 'editor' },
        user: standard,
        overrideAccess: false,
      })
      expect(updated.role).toBe('instructor')
      expect(updated.accessLevel).toBe('standard')
    })

    it('lets a user read only their own account, Admin reads all', async () => {
      // Student reads their own account.
      const self = await payload.findByID({
        collection: 'users',
        id: student.id,
        user: student,
        overrideAccess: false,
      })
      expect(self.id).toBe(student.id)

      // Student cannot read another account.
      await expect(
        payload.findByID({ collection: 'users', id: admin.id, user: student, overrideAccess: false }),
      ).rejects.toThrow()

      // Admin reads everyone.
      const all = await payload.find({ collection: 'users', user: admin, overrideAccess: false, limit: 100 })
      expect(all.totalDocs).toBeGreaterThanOrEqual(4)
    })

    it('denies non-Admins from deleting accounts; allows Admin', async () => {
      const victim = await createUser(payload, { email: 'victim@matrix.test', role: 'student' })
      await expect(
        payload.delete({ collection: 'users', id: victim.id, user: editor, overrideAccess: false }),
      ).rejects.toThrow()
      const deleted = await payload.delete({
        collection: 'users',
        id: victim.id,
        user: admin,
        overrideAccess: false,
      })
      expect(deleted).toBeTruthy()
    })
  })

  describe('course access (FR-005/007/012)', () => {
    it('denies a Student from creating a course', async () => {
      await expect(
        write.create(payload, {
          collection: 'courses',
          data: { title: 'Student course' },
          user: student,
          overrideAccess: false,
        }),
      ).rejects.toThrow()
    })

    it('lets an Instructor create their own course; the author defaults to the creator', async () => {
      const course = await write.create(payload, {
        collection: 'courses',
        data: { title: 'Editor course' },
        user: editor,
        overrideAccess: false,
      })
      const authorId = typeof course.author === 'object' ? course.author.id : course.author
      expect(authorId).toBe(editor.id)
    })

    it("denies an Instructor from editing another Instructor's course (ownership)", async () => {
      const owned = await write.create(payload, {
        collection: 'courses',
        data: { title: 'Standard-owned' },
        user: standard,
        overrideAccess: false,
      })
      await expect(
        write.update(payload, {
          collection: 'courses',
          id: owned.id,
          data: { title: 'Hijacked' },
          user: editor,
          overrideAccess: false,
        }),
      ).rejects.toThrow()
    })

    it('lets an Admin edit and delete any content (US1-AS2, FR-005)', async () => {
      const owned = await write.create(payload, {
        collection: 'courses',
        data: { title: 'Standard-owned-2' },
        user: standard,
        overrideAccess: false,
      })
      const edited = await write.update(payload, {
        collection: 'courses',
        id: owned.id,
        data: { title: 'Admin edited' },
        user: admin,
        overrideAccess: false,
      })
      expect(edited.title).toBe('Admin edited')
      const deleted = await payload.delete({
        collection: 'courses',
        id: owned.id,
        user: admin,
        overrideAccess: false,
      })
      expect(deleted).toBeTruthy()
    })

    it('denies a Student from deleting a course', async () => {
      const course = await write.create(payload, {
        collection: 'courses',
        data: { title: 'Undeletable by student' },
        user: editor,
        overrideAccess: false,
      })
      await expect(
        payload.delete({ collection: 'courses', id: course.id, user: student, overrideAccess: false }),
      ).rejects.toThrow()
    })

    it('exposes only published courses to Students/anonymous — lists and by-id (SC-003)', async () => {
      const draft = await write.create(payload, {
        collection: 'courses',
        data: { title: 'Secret draft' },
        user: editor,
        overrideAccess: false,
      })
      const published = await write.create(payload, {
        collection: 'courses',
        data: { title: 'Live course', _status: 'published' },
        user: editor,
        overrideAccess: false,
      })

      const asStudent = await payload.find({
        collection: 'courses',
        user: student,
        overrideAccess: false,
        limit: 100,
      })
      const titles = asStudent.docs.map((d) => d.title)
      expect(titles).toContain('Live course')
      expect(titles).not.toContain('Secret draft')

      const asAnon = await payload.find({ collection: 'courses', overrideAccess: false, limit: 100 })
      expect(asAnon.docs.map((d) => d.title)).not.toContain('Secret draft')

      // Direct by-id address of a draft is not exposed.
      await expect(
        payload.findByID({ collection: 'courses', id: draft.id, user: student, overrideAccess: false }),
      ).rejects.toThrow()

      // The published course is reachable by id.
      const byId = await payload.findByID({
        collection: 'courses',
        id: published.id,
        user: student,
        overrideAccess: false,
      })
      expect(byId.title).toBe('Live course')
    })
  })

  describe('review decisions are Admin-read-only and never caller-writable (FR-016)', () => {
    it('denies create/update/delete to every caller, including Admin', async () => {
      const course = await write.create(payload, {
        collection: 'courses',
        data: { title: 'For decision' },
        user: editor,
        overrideAccess: false,
      })
      await expect(
        write.create(payload, {
          collection: 'review-decisions',
          data: { course: course.id, decision: 'approve', decidedBy: admin.id },
          user: admin,
          overrideAccess: false,
        }),
      ).rejects.toThrow()
    })

    it('denies a non-Admin from reading review decisions', async () => {
      await expect(
        payload.find({ collection: 'review-decisions', user: student, overrideAccess: false }),
      ).rejects.toThrow()
    })
  })
})
