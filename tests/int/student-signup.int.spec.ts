import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { isGoogleSignInEnabled } from '../../src/plugins/google-oauth'
import { createUser, getTestPayload, resetDb, write } from '../helpers/payload'

// Student self-signup, email verification, one-account-per-email, the student visibility
// boundary, and the admin-area gate (US3, FR-004/004a/004b/004c, FR-011/012). The full
// Google round-trip needs live credentials and stays manual (quickstart 3.6); here we
// assert the degraded-mode config facts.

describe('student signup & confinement', () => {
  let payload: Payload

  beforeAll(async () => {
    payload = await getTestPayload()
    await resetDb(payload)
  })

  it('anonymous signup always yields a Student, ignoring a submitted role (US3-AS1)', async () => {
    const created = await write.create(payload, {
      collection: 'users',
      data: { email: 'newstudent@signup.test', password: 'password123', role: 'instructor', accessLevel: 'editor' },
      overrideAccess: false,
    })
    expect(created.role).toBe('student')
  })

  it('blocks login until the email is verified, then succeeds (US3-AS2, FR-004c)', async () => {
    const email = 'verifyme@signup.test'
    const password = 'password123'
    await write.create(payload, { collection: 'users', data: { email, password }, overrideAccess: false })

    // Unverified login is rejected.
    await expect(
      payload.login({ collection: 'users', data: { email, password } }),
    ).rejects.toThrow()

    // Consume the emailed verification token.
    const found = await payload.find({
      collection: 'users',
      where: { email: { equals: email } },
      overrideAccess: true,
      showHiddenFields: true,
      limit: 1,
    })
    const token = (found.docs[0] as unknown as { _verificationToken?: string })._verificationToken
    expect(token).toBeTruthy()
    await payload.verifyEmail({ collection: 'users', token: token as string })

    // Now login succeeds.
    const result = await payload.login({ collection: 'users', data: { email, password } })
    expect(result.user?.email).toBe(email)
  })

  it('rejects a duplicate email — one account per email (FR-004b)', async () => {
    const email = 'dupe@signup.test'
    await createUser(payload, { email, role: 'student' })
    await expect(
      write.create(payload, {
        collection: 'users',
        data: { email, password: 'password123' },
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('denies a Student from the admin/authoring area, allows Admin & Instructor (US3-AS3, FR-011)', async () => {
    const student = await createUser(payload, { email: 'confined@signup.test', role: 'student' })
    const admin = await createUser(payload, { email: 'gate-admin@signup.test', role: 'admin' })
    const instructor = await createUser(payload, {
      email: 'gate-instructor@signup.test',
      role: 'instructor',
      accessLevel: 'standard',
    })

    const adminAccess = payload.collections.users.config.access.admin
    expect(adminAccess).toBeTypeOf('function')
    // @ts-expect-error narrow admin access signature for the test call
    expect(await adminAccess({ req: { user: student } })).toBe(false)
    // @ts-expect-error narrow admin access signature for the test call
    expect(await adminAccess({ req: { user: admin } })).toBe(true)
    // @ts-expect-error narrow admin access signature for the test call
    expect(await adminAccess({ req: { user: instructor } })).toBe(true)
    // @ts-expect-error anonymous visitor
    expect(await adminAccess({ req: { user: null } })).toBeFalsy()
  })

  it('exposes only published courses to a Student and to anonymous (US3-AS4/AS5, SC-003)', async () => {
    const instructor = await createUser(payload, {
      email: 'author@signup.test',
      role: 'instructor',
      accessLevel: 'editor',
    })
    const student = await createUser(payload, { email: 'viewer@signup.test', role: 'student' })

    const draft = await write.create(payload, {
      collection: 'courses',
      data: { title: 'Hidden draft' },
      user: instructor,
      overrideAccess: false,
    })
    await write.create(payload, {
      collection: 'courses',
      data: { title: 'Public course', _status: 'published' },
      user: instructor,
      overrideAccess: false,
    })

    const asStudent = await payload.find({ collection: 'courses', user: student, overrideAccess: false, limit: 100 })
    expect(asStudent.docs.map((d) => d.title)).toEqual(['Public course'])

    const asAnon = await payload.find({ collection: 'courses', overrideAccess: false, limit: 100 })
    expect(asAnon.docs.map((d) => d.title)).toEqual(['Public course'])

    await expect(
      payload.findByID({ collection: 'courses', id: draft.id, user: student, overrideAccess: false }),
    ).rejects.toThrow()
  })

  it('leaves Google sign-in absent when credentials are unset (FR-004a degraded mode)', () => {
    // In the test environment GOOGLE_CLIENT_ID/SECRET are empty.
    expect(isGoogleSignInEnabled()).toBe(false)

    const endpoints = payload.collections.users.config.endpoints || []
    const hasGoogleEndpoint = endpoints.some(
      (e) => typeof e.path === 'string' && e.path.includes('oauth/google'),
    )
    expect(hasGoogleEndpoint).toBe(false)
  })
})
