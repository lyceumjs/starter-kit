import { getPayload } from 'payload'
import config from '@payload-config'

// Idempotent Admin bootstrap (spec 001-foundation-skeleton, FR-006; plan R1).
// - No public self-signup: the first Admin is created here.
// - Credentials come from ADMIN_EMAIL / ADMIN_PASSWORD; unset → dev-only defaults + warning.
// - No-op if an Admin already exists.
// - Never runs when APP_ENV=prod.
// Run via `pnpm seed` (→ `payload run src/seed/admin.ts`), invoked by the container entrypoint.

const DEFAULT_EMAIL = 'admin@example.com'
const DEFAULT_PASSWORD = 'change-me-in-dev'

const seedAdmin = async (): Promise<void> => {
  if (process.env.APP_ENV === 'prod') {
    // FR-006: the seed migration MUST NOT run in prod.
    console.log('[seed] APP_ENV=prod — skipping Admin bootstrap.')
    return
  }

  const payload = await getPayload({ config })

  const existing = await payload.find({
    collection: 'users',
    where: { role: { equals: 'admin' } },
    limit: 1,
    depth: 0,
  })

  if (existing.totalDocs > 0) {
    payload.logger.info('[seed] An Admin already exists — nothing to do.')
    return
  }

  const email = process.env.ADMIN_EMAIL || DEFAULT_EMAIL
  const password = process.env.ADMIN_PASSWORD || DEFAULT_PASSWORD

  if (!process.env.ADMIN_PASSWORD) {
    payload.logger.warn(
      '[seed] ADMIN_PASSWORD is unset — using a dev-only default. ' +
        'Set ADMIN_PASSWORD in .env before using this anywhere real.',
    )
  }

  await payload.create({
    collection: 'users',
    data: { email, password, role: 'admin' },
  })

  payload.logger.info(`[seed] Created initial Admin: ${email}`)
}

await seedAdmin()
process.exit(0)
