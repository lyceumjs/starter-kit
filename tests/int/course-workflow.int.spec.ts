import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { createUser, getTestPayload, resetDb, write } from '../helpers/payload'

// The publication state machine proven end-to-end through Payload (T1–T7, FR-005..FR-009,
// FR-016). Grouped by story: US1 (Admin resolution + immutable history), US2 (editor
// self-publish), US4 (standard approval flow). State is inspected with `draft: true` to
// read the latest version; student visibility uses the enforced read path.

describe('course workflow', () => {
  let payload: Payload
  let admin: Awaited<ReturnType<typeof createUser>>
  let editor: Awaited<ReturnType<typeof createUser>>
  let standard: Awaited<ReturnType<typeof createUser>>
  let student: Awaited<ReturnType<typeof createUser>>

  // Latest version (draft or published) for state assertions.
  const latest = (id: number | string) =>
    payload.findByID({ collection: 'courses', id, draft: true, overrideAccess: true })

  const decisionsFor = async (id: number | string) =>
    payload.find({
      collection: 'review-decisions',
      where: { course: { equals: id } },
      overrideAccess: true,
      sort: 'createdAt',
    })

  beforeAll(async () => {
    payload = await getTestPayload()
    await resetDb(payload)
    admin = await createUser(payload, { email: 'admin@wf.test', role: 'admin' })
    editor = await createUser(payload, { email: 'editor@wf.test', role: 'instructor', accessLevel: 'editor' })
    standard = await createUser(payload, { email: 'standard@wf.test', role: 'instructor', accessLevel: 'standard' })
    student = await createUser(payload, { email: 'student@wf.test', role: 'student' })
  })

  // ─── US2: editor-level Instructor self-publishes (FR-007, SC-002) ─────────────
  describe('US2 — editor-level Instructor', () => {
    it('publishes immediately with no review step and records no decision (US2-AS1, T2)', async () => {
      const course = await write.create(payload, {
        collection: 'courses',
        data: { title: 'Editor publishes', _status: 'published' },
        user: editor,
        overrideAccess: false,
      })
      const state = await latest(course.id)
      expect(state._status).toBe('published')
      expect(state.reviewState).toBe('none')
      expect((await decisionsFor(course.id)).totalDocs).toBe(0)
    })

    it('edits a published course and it stays live immediately (US2-AS2)', async () => {
      const course = await write.create(payload, {
        collection: 'courses',
        data: { title: 'Editor v1', _status: 'published' },
        user: editor,
        overrideAccess: false,
      })
      await write.update(payload, {
        collection: 'courses',
        id: course.id,
        data: { title: 'Editor v2', _status: 'published' },
        user: editor,
        overrideAccess: false,
      })
      const visible = await payload.findByID({
        collection: 'courses',
        id: course.id,
        user: student,
        overrideAccess: false,
      })
      expect(visible.title).toBe('Editor v2')
    })

    it('unpublishes back to draft (T6)', async () => {
      const course = await write.create(payload, {
        collection: 'courses',
        data: { title: 'To unpublish', _status: 'published' },
        user: editor,
        overrideAccess: false,
      })
      // Unpublish is a `_status: draft` write (not a draft-save, which would keep the
      // published version live) — it takes the live version down.
      await write.update(payload, {
        collection: 'courses',
        id: course.id,
        data: { _status: 'draft' },
        user: editor,
        overrideAccess: false,
      })
      const state = await latest(course.id)
      expect(state._status).toBe('draft')
      // No longer visible to students.
      await expect(
        payload.findByID({ collection: 'courses', id: course.id, user: student, overrideAccess: false }),
      ).rejects.toThrow()
    })
  })

  // ─── US4: standard-level Instructor via Admin approval (FR-008/009/010) ────────
  describe('US4 — standard-level Instructor', () => {
    it('publish is transformed into a pending draft, invisible to students (US4-AS1, T3)', async () => {
      const course = await write.create(payload, {
        collection: 'courses',
        data: { title: 'Standard submits', _status: 'published' },
        user: standard,
        overrideAccess: false,
      })
      const state = await latest(course.id)
      expect(state._status).toBe('draft')
      expect(state.reviewState).toBe('pending')
      await expect(
        payload.findByID({ collection: 'courses', id: course.id, user: student, overrideAccess: false }),
      ).rejects.toThrow()
    })

    it('Admin approve publishes it and records an approve decision (T4, FR-016)', async () => {
      const course = await write.create(payload, {
        collection: 'courses',
        data: { title: 'Await approval', _status: 'published' },
        user: standard,
        overrideAccess: false,
      })
      // Approve = Admin publishes the pending draft.
      await write.update(payload, {
        collection: 'courses',
        id: course.id,
        data: { _status: 'published' },
        user: admin,
        overrideAccess: false,
      })
      const state = await latest(course.id)
      expect(state._status).toBe('published')
      expect(state.reviewState).toBe('none')

      const decisions = await decisionsFor(course.id)
      expect(decisions.totalDocs).toBe(1)
      expect(decisions.docs[0].decision).toBe('approve')
      const decidedBy = typeof decisions.docs[0].decidedBy === 'object'
        ? decisions.docs[0].decidedBy.id
        : decisions.docs[0].decidedBy
      expect(decidedBy).toBe(admin.id)

      // Now visible to students.
      const visible = await payload.findByID({
        collection: 'courses',
        id: course.id,
        user: student,
        overrideAccess: false,
      })
      expect(visible.title).toBe('Await approval')
    })

    it('Admin reject returns it to draft, records a reject, author can resubmit (T5, US4-AS2)', async () => {
      const course = await write.create(payload, {
        collection: 'courses',
        data: { title: 'To reject', _status: 'published' },
        user: standard,
        overrideAccess: false,
      })
      // Reject = Admin draft-saves, clearing the pending state without publishing.
      await write.update(payload, {
        collection: 'courses',
        id: course.id,
        data: { _status: 'draft' },
        user: admin,
        overrideAccess: false,
        draft: true,
      })
      const state = await latest(course.id)
      expect(state._status).toBe('draft')
      expect(state.reviewState).toBe('none')

      const decisions = await decisionsFor(course.id)
      expect(decisions.totalDocs).toBe(1)
      expect(decisions.docs[0].decision).toBe('reject')

      // Author revises and resubmits → pending again.
      await write.update(payload, {
        collection: 'courses',
        id: course.id,
        data: { title: 'Revised', _status: 'published' },
        user: standard,
        overrideAccess: false,
      })
      const resubmitted = await latest(course.id)
      expect(resubmitted.reviewState).toBe('pending')
      expect(resubmitted._status).toBe('draft')
    })

    it('keeps the prior published version live while an edit awaits review (US4-AS3, FR-009)', async () => {
      const course = await write.create(payload, {
        collection: 'courses',
        data: { title: 'Live v1', _status: 'published' },
        user: standard,
        overrideAccess: false,
      })
      // Approve v1 so a published version exists.
      await write.update(payload, {
        collection: 'courses',
        id: course.id,
        data: { _status: 'published' },
        user: admin,
        overrideAccess: false,
      })
      // Standard edits and publishes → becomes a pending draft; v1 must stay live.
      await write.update(payload, {
        collection: 'courses',
        id: course.id,
        data: { title: 'Pending v2', _status: 'published' },
        user: standard,
        overrideAccess: false,
      })
      const pending = await latest(course.id)
      expect(pending.reviewState).toBe('pending')

      // Students still see v1.
      const visibleBefore = await payload.findByID({
        collection: 'courses',
        id: course.id,
        user: student,
        overrideAccess: false,
      })
      expect(visibleBefore.title).toBe('Live v1')

      // Admin approves → students now see v2.
      await write.update(payload, {
        collection: 'courses',
        id: course.id,
        data: { _status: 'published' },
        user: admin,
        overrideAccess: false,
      })
      const visibleAfter = await payload.findByID({
        collection: 'courses',
        id: course.id,
        user: student,
        overrideAccess: false,
      })
      expect(visibleAfter.title).toBe('Pending v2')
    })

    it('a standard Instructor cannot approve their own pending course (T7)', async () => {
      const course = await write.create(payload, {
        collection: 'courses',
        data: { title: 'Self approve attempt', _status: 'published' },
        user: standard,
        overrideAccess: false,
      })
      // Their "publish" (approve attempt) just re-pends — it never publishes.
      await write.update(payload, {
        collection: 'courses',
        id: course.id,
        data: { _status: 'published' },
        user: standard,
        overrideAccess: false,
      })
      const state = await latest(course.id)
      expect(state._status).toBe('draft')
      expect(state.reviewState).toBe('pending')
      // No review decision is recorded by a non-Admin.
      expect((await decisionsFor(course.id)).totalDocs).toBe(0)
    })
  })

  // ─── US1: Admin control + immutable review history ────────────────────────────
  describe('US1 — Admin control', () => {
    it('Admin direct edits never enter review (US1-AS3, FR-005)', async () => {
      const course = await write.create(payload, {
        collection: 'courses',
        data: { title: 'Admin course', _status: 'published' },
        user: admin,
        overrideAccess: false,
      })
      const state = await latest(course.id)
      expect(state._status).toBe('published')
      expect(state.reviewState).toBe('none')
      expect((await decisionsFor(course.id)).totalDocs).toBe(0)
    })

    it('review decisions are immutable even for an Admin', async () => {
      // Produce a decision via an approval.
      const course = await write.create(payload, {
        collection: 'courses',
        data: { title: 'Immutable history', _status: 'published' },
        user: standard,
        overrideAccess: false,
      })
      await write.update(payload, {
        collection: 'courses',
        id: course.id,
        data: { _status: 'published' },
        user: admin,
        overrideAccess: false,
      })
      const decisions = await decisionsFor(course.id)
      expect(decisions.totalDocs).toBe(1)
      const decisionId = decisions.docs[0].id

      await expect(
        write.update(payload, {
          collection: 'review-decisions',
          id: decisionId,
          data: { decision: 'reject' },
          user: admin,
          overrideAccess: false,
        }),
      ).rejects.toThrow()
      await expect(
        payload.delete({ collection: 'review-decisions', id: decisionId, user: admin, overrideAccess: false }),
      ).rejects.toThrow()
    })
  })
})
