import { LyceumDomainError, type LyceumErrorCode } from '@lyceumjs/lms'
import { NextResponse } from 'next/server'
import type { Payload } from 'payload'

import type { Course, User } from '../../../../payload-types'

// Thin, shared plumbing for the `/api/lms/*` route handlers (contracts/lms-api.md):
// authenticate → authorize with the 002 rules → (handler runs the engine) → map errors.
// The engine is never reached without authorization having passed (FR-007). No business
// logic lives here — domain validation stays in Lyceum.

/** Uniform JSON response helper. */
export const json = (data: unknown, status = 200): Response => NextResponse.json(data, { status })

/** Error envelope shared by every failure: `{ error: { code, message } }`. */
const errorBody = (code: string, message: string) => ({ error: { code, message } })

const unauthorized = (): Response =>
  json(errorBody('UNAUTHORIZED', 'Authentication required'), 401)

const forbidden = (): Response =>
  json(errorBody('FORBIDDEN', 'You do not have permission to perform this action'), 403)

const notFound = (): Response => json(errorBody('NOT_FOUND', 'Course not found'), 404)

/** Resolve the caller from the request cookies/Authorization header, or `null`. */
export const authenticate = async (req: Request, payload: Payload): Promise<User | null> => {
  const { user } = await payload.auth({ headers: req.headers })
  return user ?? null
}

/** Guard: a 401 envelope when unauthenticated, otherwise `null` (proceed). */
export const requireUser = (user: User | null): Response | null =>
  user ? null : unauthorized()

/** Presence-only slug guard (boundary rule R9): format/uniqueness stay engine-enforced. */
export const requireSlug = (body: unknown): Response | null => {
  const slug = (body as { slug?: unknown } | null | undefined)?.slug
  if (typeof slug !== 'string' || slug.trim() === '') {
    return json(errorBody('VALIDATION', 'slug is required'), 400)
  }
  return null
}

export type CourseWriteAuth =
  | { ok: true; course: Course }
  | { ok: false; response: Response }

/**
 * Authorize a write to the course identified by `engineId` (002 own-content rules):
 * Admin → ok; Instructor → ok only for their own course; Student/anonymous → 403;
 * unknown course → 404. Returns the found course doc so the route avoids a second query.
 */
export const authorizeCourseWrite = async (
  payload: Payload,
  user: User | null,
  engineId: string,
): Promise<CourseWriteAuth> => {
  if (!user || (user.role !== 'admin' && user.role !== 'instructor')) {
    return { ok: false, response: forbidden() }
  }
  const found = await payload.find({
    collection: 'courses',
    where: { engineId: { equals: engineId } },
    draft: true,
    limit: 1,
    overrideAccess: true,
    depth: 0,
  })
  const course = found.docs[0]
  if (!course) return { ok: false, response: notFound() }
  if (user.role === 'instructor') {
    const authorId = typeof course.author === 'object' ? course.author.id : course.author
    if (authorId !== user.id) return { ok: false, response: forbidden() }
  }
  return { ok: true, course }
}

const DOMAIN_STATUS: Record<LyceumErrorCode, number> = {
  VALIDATION: 400,
  NOT_FOUND: 404,
  CONFLICT: 409,
}

/** Map a thrown error to a response: LyceumDomainError by code, anything else a generic 500. */
export const toErrorResponse = (err: unknown): Response => {
  if (err instanceof LyceumDomainError) {
    return json(errorBody(err.code, err.message), DOMAIN_STATUS[err.code])
  }
  // Never leak internals for an unexpected failure.
  return json(errorBody('INTERNAL', 'Internal server error'), 500)
}
