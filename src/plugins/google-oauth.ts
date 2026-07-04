import type { PayloadRequest, Plugin } from 'payload'
import { OAuth2Plugin } from 'payload-oauth2'

// Google sign-in for Students via the MIT `payload-oauth2` plugin, producing a native
// Payload session (research D3). `useEmailAsIdentity` gives one account per email
// (FR-004b). When credentials are absent the plugin is a clean no-op — no endpoints are
// mounted, so `/api/users/oauth/google` 404s and email/password signup works alone
// (FR-004a degraded mode).
const APP_URL = process.env.APP_URL || 'http://localhost:3021'

const googleConfigured =
  typeof process.env.GOOGLE_CLIENT_ID === 'string' &&
  process.env.GOOGLE_CLIENT_ID.length > 0 &&
  typeof process.env.GOOGLE_CLIENT_SECRET === 'string' &&
  process.env.GOOGLE_CLIENT_SECRET.length > 0

/** Whether Google sign-in is available — drives the frontend button too. */
export const isGoogleSignInEnabled = (): boolean => googleConfigured

export const googleOAuthPlugin = (): Plugin =>
  OAuth2Plugin({
    enabled: googleConfigured,
    strategyName: 'google',
    useEmailAsIdentity: true,
    serverURL: APP_URL,
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    authorizePath: '/oauth/google',
    callbackPath: '/oauth/google/callback',
    authCollection: 'users',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
    scopes: [
      'openid',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ],
    providerAuthorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    getUserInfo: async (accessToken: string, req: PayloadRequest) => {
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const profile = (await response.json()) as { email?: string; sub?: string }
      const email = profile.email
      if (!email) throw new Error('Google did not return an email address')

      // One account per email (FR-004b): the plugin updates an existing account on
      // every login, so never return `role` for an existing user — an Admin who signs
      // in with Google must stay an Admin. Google has verified the email, so keep the
      // linked account verified.
      const existing = await req.payload.find({
        collection: 'users',
        where: { email: { equals: email } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      if (existing.docs.length > 0) {
        return { email, _verified: true }
      }

      // New account: always a verified Student (FR-004/FR-004c Google exemption). The
      // Users beforeValidate hook independently forces `role: student` here too.
      return { email, role: 'student', _verified: true }
    },
    successRedirect: () => '/dashboard',
    failureRedirect: () => '/signin?error=oauth',
  })
