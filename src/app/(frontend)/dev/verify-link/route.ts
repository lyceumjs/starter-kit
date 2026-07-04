import config from '@payload-config'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

// DEV-ONLY helper. With no SMTP configured, verification emails aren't sent — the link
// is only logged. This returns that link for a given email so the UI can offer a
// one-click "verify" in local dev without digging through logs.
//
// Hard-disabled in production AND whenever SMTP is configured, so a real deployment
// never exposes verification tokens over HTTP.
export const dynamic = 'force-dynamic'

const devEnabled = () => process.env.APP_ENV !== 'prod' && !process.env.SMTP_HOST
const APP_URL = process.env.APP_URL || 'http://localhost:3021'

export async function GET(req: Request): Promise<Response> {
  if (!devEnabled()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const email = new URL(req.url).searchParams.get('email')?.trim()
  if (!email) {
    return NextResponse.json({ error: 'email query param required' }, { status: 400 })
  }

  const payload = await getPayload({ config })
  const found = await payload.find({
    collection: 'users',
    where: { or: [{ email: { equals: email } }, { email: { equals: email.toLowerCase() } }] },
    limit: 1,
    overrideAccess: true,
    showHiddenFields: true,
  })

  const user = found.docs[0] as
    | (typeof found.docs)[0] & { _verified?: boolean; _verificationToken?: string }
    | undefined

  if (!user) return NextResponse.json({ found: false }, { status: 404 })
  if (user._verified || !user._verificationToken) {
    return NextResponse.json({ found: true, verified: true })
  }

  return NextResponse.json({
    found: true,
    verified: false,
    link: `${APP_URL}/verify-email?token=${user._verificationToken}`,
  })
}
