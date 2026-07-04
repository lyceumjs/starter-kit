import config from '@payload-config'
import { getPayload, type Payload } from 'payload'

// Integration-test bootstrap (research D6). A single memoized Payload instance is shared
// across the serially-run suites; every matrix assertion calls operations with
// `overrideAccess: false` + a `user` so access is exercised exactly as a REST caller
// experiences it. The factory below is the one place that uses `overrideAccess: true`.

let cached: Payload | null = null

export const getTestPayload = async (): Promise<Payload> => {
  if (!cached) cached = await getPayload({ config })
  return cached
}

const matchAll = { id: { exists: true } } as const

/** Wipe all feature data. Called in each suite's beforeAll so suites are order-independent. */
export const resetDb = async (payload: Payload): Promise<void> => {
  await payload.delete({ collection: 'review-decisions', where: matchAll, overrideAccess: true })
  await payload.delete({ collection: 'courses', where: matchAll, overrideAccess: true })
  await payload.delete({ collection: 'users', where: matchAll, overrideAccess: true })
}

export type Role = 'admin' | 'instructor' | 'student'
export type AccessLevel = 'editor' | 'standard'

export interface NewUser {
  email: string
  password?: string
  role?: Role
  accessLevel?: AccessLevel
  _verified?: boolean
}

/**
 * Create an account of any role/accessLevel via the Local API (overrideAccess bypasses
 * the field/collection access, and the trusted context lets the role-forcing hook keep
 * the requested role). Users default to `_verified: true` so they can log in.
 */
export const createUser = async (payload: Payload, data: NewUser) => {
  return payload.create({
    collection: 'users',
    data: {
      password: 'test-password-123',
      _verified: true,
      role: 'student',
      ...data,
    },
    overrideAccess: true,
    context: { trustedRoleAssignment: true },
  })
}

// Payload's Local API types for a drafts-enabled collection make it awkward to pass
// `data._status` alongside `draft` (the create/update options become a discriminated
// union keyed on `draft`). Tests deliberately drive publication state, so these thin
// wrappers narrow the options in one place instead of at every call site. Results are
// intentionally loosely typed — tests assert on `.title`/`._status`/`.author` directly.
type WriteArgs = Record<string, unknown>

/* eslint-disable @typescript-eslint/no-explicit-any */
export const write = {
  create: (payload: Payload, args: WriteArgs): Promise<any> =>
    payload.create(args as Parameters<Payload['create']>[0]),
  update: (payload: Payload, args: WriteArgs): Promise<any> =>
    payload.update(args as Parameters<Payload['update']>[0]),
}
/* eslint-enable @typescript-eslint/no-explicit-any */
