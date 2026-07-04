import { postgresAdapter } from '@payloadcms/db-postgres'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Courses } from './collections/Courses'
import { ReviewDecisions } from './collections/ReviewDecisions'
import { Users } from './collections/Users'
import { googleOAuthPlugin } from './plugins/google-oauth'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// Fail fast on missing required configuration rather than booting broken
// (spec 001-foundation-skeleton, edge case + FR-004).
const requireEnv = (name: string): string => {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. ` +
        `Copy .env.example to .env and set it before starting.`,
    )
  }
  return value
}

// Public base URL — Payload serverURL, the verification-link builder, and the Google
// OAuth callback base all derive from it (research D7).
const APP_URL = process.env.APP_URL || 'http://localhost:3021'

// Email delivery for verification (SC-006): real SMTP when configured, otherwise an
// offline dev fallback (research D2, plan R2). The fallback uses nodemailer's
// `jsonTransport`, which needs no network and no secrets and still produces the full
// message — the verification link is captured rather than dropped. (The bare
// no-adapter fallback is avoided because it drops the link; the argless Ethereal
// fallback is avoided because it reaches api.nodemailer.com at boot, which fails in a
// no-outbound-network dev container.)
const emailAdapter = process.env.SMTP_HOST
  ? nodemailerAdapter({
      defaultFromAddress: process.env.EMAIL_FROM || 'no-reply@example.com',
      defaultFromName: 'LMS',
      transportOptions: {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      },
    })
  : nodemailerAdapter({
      defaultFromAddress: process.env.EMAIL_FROM || 'no-reply@example.com',
      defaultFromName: 'LMS',
      transportOptions: { jsonTransport: true },
    })

export default buildConfig({
  serverURL: APP_URL,
  admin: {
    user: Users.slug,
    // Tells Payload to render `<html suppressHydrationWarning>` so React ignores
    // attribute mismatches on the root element injected by browser extensions
    // (e.g. LanguageTool's `data-lt-installed`, Grammarly) before hydration.
    suppressHydrationWarning: true,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Courses, ReviewDecisions],
  editor: lexicalEditor(),
  email: emailAdapter,
  // Registered always; a clean no-op when Google credentials are unset (FR-004a).
  plugins: [googleOAuthPlugin()],
  secret: requireEnv('PAYLOAD_SECRET'),
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: requireEnv('DATABASE_URI'),
    },
  }),
  sharp,
})
