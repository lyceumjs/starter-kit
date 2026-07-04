# Phase 0 Research: Roles & Access Control

**Date**: 2026-07-02 | **Spec**: [spec.md](spec.md)

All library facts below were verified live on 2026-07-02 against payloadcms.com docs, the
payload GitHub source at tag `v3.85.0`, and the npm registry — not from memory. Decisions
are the agent's recommendations, labelled R1–R4 in [plan.md](plan.md), standing as defaults
pending Valery's acceptance.

## D1 — Email verification (FR-004c)

- **Decision**: Payload's built-in `auth.verify` on the `users` collection, with
  `generateEmailHTML`/`generateEmailSubject` building a link to the frontend verify page.
- **Rationale**: first-party, zero extra dependencies. Enabling `verify` adds a managed
  `_verified` field; a verification email is sent automatically on any create (public REST
  signup included); the verify endpoint is `POST /api/users/verify/{token}`; login of an
  unverified user fails with **403** (`UnverifiedEmail`) — exactly the spec's "account is
  not usable until verified".
- **Alternatives considered**: custom token flow (reinvents a built-in); delegating auth to
  an external identity service (new SaaS dependency, against OSS-first minimalism).
- **Noted gaps**: Payload has no built-in *resend verification* operation (open upstream
  request); deferred until a real need — a custom endpoint can read `_verificationToken`
  via the Local API. OAuth-created users must end up `_verified: true` (Google skips
  verification) — pinned by an integration test (see D3).

## D2 — Email delivery (SC-006, `.env.example` SMTP block)

- **Decision**: `@payloadcms/email-nodemailer@3.85.0` (exact pin — adapters are
  version-locked to Payload core; MIT) with SMTP `transportOptions` from
  `SMTP_HOST/PORT/USER/PASS` and `EMAIL_FROM`. In dev, when `SMTP_HOST` is unset, fall back
  to `nodemailerAdapter()` with no arguments — an Ethereal test inbox with preview URLs,
  so the verification flow stays exercisable with zero secrets.
- **Rationale**: SMTP is provider-neutral (works with any provider or a local relay),
  matching the placeholders already in `.env.example`. The bare no-adapter fallback is
  unusable here: it logs only To/Subject — the verification link would be lost.
- **Alternatives considered**: `@payloadcms/email-resend` (MIT, but couples the kit to one
  SaaS provider); no adapter (breaks verification in dev).

## D3 — Google sign-in (FR-004a, FR-004b)

- **Decision**: `payload-oauth2` `^1.0.21` (MIT, published 2026-05, Google flow CI-tested,
  Payload `^3` peer dep) with `useEmailAsIdentity: true`. Registered only when
  `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are set; otherwise the plugin is left out and
  email/password signup works alone — exactly FR-004a's degraded mode.
- **Rationale**: it is the only maintained option that ends in a **native Payload
  session** (real Payload JWT + auth cookie on the `users` collection, running the
  collection's own `beforeLogin`/`afterLogin` hooks), and `useEmailAsIdentity` implements
  FR-004b's one-account-per-email linking (finds the existing user by email and attaches).
  Login button is a plain link to `GET /api/users/oauth/google`; `successRedirect` points
  at the student placeholder page.
- **Alternatives considered**:
  - `payload-authjs` (MIT, active) — sessions are Auth.js sessions, not Payload's, and it
    pins the perpetually-beta Auth.js v5 whose team moved to Better Auth; long-term risk.
  - Better Auth integrations (`payload-auth` et al., MIT) — heavier stack, sessions live
    outside Payload's native auth.
  - Payload enterprise SSO — sales-gated proprietary product; fails constitution II.
  - Hand-rolled flow over `auth.strategies` — supported extension point, but minting the
    Payload cookie relies on undocumented (though exported) internals and we own all the
    OAuth security; not justified while a thin MIT plugin exists.
- **Integration note**: OAuth-created/linked users must be `_verified: true` so the D1
  login gate never blocks a Google sign-in — verified by integration test.

## D4 — Modeling the approval workflow (FR-006..FR-010)

- **Decision**: Payload **versions + drafts** (`versions: { drafts: true }`, autosave off —
  the default) plus a small `reviewState` field (`none | pending`) and hook-enforced
  transitions computed by a **pure domain module** (`src/domain/`, zero Payload imports —
  constitution III). No dedicated review UI (FR-010).
- **Rationale**: drafts give FR-009 for free — confirmed in docs: saving a draft on a
  published document leaves the published document served to readers until the draft is
  published. Reader visibility (FR-012) is the documented access pattern: `read` returns
  `{ _status: { equals: 'published' } }` for Students/anonymous. "Pending review" is the
  one state Payload lacks; `reviewState` carries it on the draft version.
- **Enforcement facts (verified)**:
  - There is **no `publish` access-control key** in Payload 3.x (keys are create/read/
    update/delete/admin/unlock/readVersions). Publish gating is done in `update`/`create`
    access or hooks.
  - **Sharp edge**: the docs' "controlling who can publish" recipe (query constraint
    `_status: { equals: 'draft' }` in `update` access) would block standard Instructors
    from even draft-editing their published courses (known upstream issue). Instead, gate
    on the **incoming** `data._status === 'published'` (deny/transform for non-privileged
    actors) and keep `update` access to ownership only.
  - Access functions can run from the admin permissions probe with `data` undefined —
    write them defensively (`data?._status`).
  - Hooks run on every API (REST, GraphQL, Local); Local API skips *access* by default
    (`overrideAccess: true`) but never hooks — so the transition rules live in hooks, and
    integration tests pass `overrideAccess: false` + `user` to exercise access itself.
- **Alternatives considered**: single custom status enum without versions (would need
  hand-rolled copy-on-write to keep the prior version live — reimplements drafts);
  Payload enterprise "Publishing Workflows" (paid, fails constitution II).

## D5 — Review history (FR-016)

- **Decision**: a `review-decisions` collection — decision (`approve | reject`), the
  deciding Admin (relationship), timestamp (`createdAt`). Immutable (no update/delete);
  written by the system whenever an Admin resolves a pending review, on any path (admin
  panel publish, REST, Local API); read access Admin-only for now.
- **Alternatives considered**: an array field on Course (bloats versioned data, unbounded
  growth inside the doc); external audit log (overkill for the minimal record decided).

## D6 — Test wiring (SC-001, FR-014)

- **Decision**: wire **Vitest ^4** integration tests now, following the official Payload
  3.x template convention: `tests/int/*.int.spec.ts`, `vitest.config.mts`,
  `beforeAll: payload = await getPayload({ config })`, assertions through the Local API
  with `overrideAccess: false` and a `user` to drive the full access matrix. Tests run
  against a dedicated database (override `DATABASE_URI` at invocation), not the dev data.
- **Rationale**: 001's R3 deferred the test runner "until there is logic to test" — the
  access matrix and the publication state machine are that logic; SC-001 demands
  systematic denial coverage and there is deliberately no UI to test through.
- **Alternatives considered**: Jest (Payload's own repos and templates are on Vitest);
  Playwright e2e only (no review UI exists this phase; int tests hit the enforcement
  layer FR-014 actually lives in).

## D7 — Student-facing surface & base URL (FR-015)

- **Decision**: a Next.js `(frontend)` route group in the existing single app — sign-up,
  sign-in, email-verify, and a signed-in placeholder page — talking to Payload's REST
  endpoints. New env `APP_URL` (public base URL) feeds Payload's `serverURL`, the
  verification-link builder, and defines the Google OAuth callback
  (`{APP_URL}/api/users/oauth/google/callback`).
- **Alternatives considered**: separate frontend app (rejected — 001 fixed the
  single-app, Payload-as-app structure; a placeholder page does not justify a second app).

## Resolved unknowns

All Technical Context unknowns are resolved above; none remain NEEDS CLARIFICATION.
Explicitly deferred (per spec, not blockers): exact review logic details, author
deactivation handling, resend-verification endpoint.
