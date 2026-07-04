# Implementation Plan: Roles & Access Control

**Branch**: `develop` (feature pinned via `.specify/feature.json`) | **Date**: 2026-07-02 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-roles-access-control/spec.md`

## Summary

Enforce the three-role access model (Admin, Instructor with an editor/standard publishing
access level, Student) on the 001 skeleton, entirely server-side. Concretely: extend
`Users` with `accessLevel`, email verification (`auth.verify` + SMTP adapter), public
Student self-signup (role forced to `student`), and optional Google sign-in via the
`payload-oauth2` plugin (one account per email); add a minimal `Courses` collection on
Payload **versions + drafts** so a standard Instructor's publish lands in *pending review*
while any previously published version stays live; record every Admin approve/reject in an
immutable `review-decisions` collection; ship the student-facing sign-up/sign-in/verify
pages plus a signed-in placeholder page; and wire Vitest integration tests that drive the
full access matrix (SC-001). No review UI (FR-010). All choices are grounded in
[research.md](research.md).

## Technical Context

**Language/Version**: TypeScript on Node.js 24 LTS (unchanged from 001; Docker base `node:24`).

**Primary Dependencies**: existing — Payload CMS 3.85.0, Next.js 15.4.11 (App Router),
React 19.1, `@payloadcms/db-postgres`. New — `@payloadcms/email-nodemailer` **3.85.0**
(exact pin, version-locked to Payload; MIT) and `payload-oauth2` **^1.0.21** (MIT),
registered only when Google credentials are configured. Dev — `vitest` **^4**.

**Storage**: PostgreSQL 17 (existing compose service). Drafts add Payload-managed
`_courses_v` version tables; dev schema sync stays in push mode (001 R1).

**Testing**: Vitest ^4 integration tests per the official Payload template convention —
`tests/int/*.int.spec.ts`, `getPayload({ config })`, Local API with
`overrideAccess: false` + `user` to exercise every access-matrix cell; run against a
dedicated test database (`DATABASE_URI` override), wired into the existing `make test`
stub. Fulfils 001 R3's "when there is logic to test".

**Target Platform**: Linux containers (Docker Desktop / WSL2), unchanged.

**Project Type**: Web application — single Next.js app at repo root (Payload-as-app, fixed
by 001). This feature adds a `(frontend)` route group beside the existing `(payload)` one.

**Performance Goals**: SC-006 — verification email dispatched within 1 minute of signup
(nodemailer sends synchronously on create; no queue needed at this scale).

**Constraints**: all role/level checks server-side (FR-014 — access functions + hooks, no
UI-only gating); approval flow in code with no UI (FR-010); no secrets in repo —
SMTP/Google env stay placeholders, dev falls back to an Ethereal test inbox (D2); Google
sign-in must degrade cleanly to unavailable when credentials are absent (FR-004a).

**Scale/Scope**: MVP — one Admin, one editor-level Instructor, self-registering Students.
Two new collections (`courses` minimal, `review-decisions`), one extended (`users`), four
frontend pages, one pure domain module, one int-test suite. No enrollment/payments/catalog.

## Constitution Check

*GATE: must pass before Phase 0; re-checked after Phase 1 design — both passes below.*

| Principle | Status | Notes |
|---|---|---|
| I. Spec-Driven Development | PASS | Plan derives only from the accepted 002 spec + research; open implementation choices are labelled recommendations R1–R4 pending acceptance, not silently persisted. |
| II. Open-Source First, Private Downstream | PASS | All new deps MIT (`payload-oauth2`, `@payloadcms/email-nodemailer`, Vitest). Payload's enterprise SSO and Publishing Workflows were evaluated and **rejected** as sales-gated (research D3/D4). |
| III. Pure Domain Core | PASS | First real domain logic in the repo: the publication state machine + role capability rules live in `src/domain/` with zero Payload/Next imports; Payload hooks and access functions only adapt it. Kept pure so it can move into the future Core Library unmodified. |
| IV. Track Upstream, Don't Fork | PASS | Everything consumed as npm dependencies; the review workflow is modeled on Payload's own versions/drafts primitives rather than patching Payload. |
| V. Dockerized Dev Parity | PASS | No new services; email works in dev with zero secrets (Ethereal fallback); SMTP/Google are env-only. Nothing gold-plated toward prod. |

No violations → Complexity Tracking left empty.

## Implementation choices

Map to [research.md](research.md) decisions. These stand as the agent's recommended
defaults **pending Valery's acceptance** (same convention as 001's R1–R3).

- **R1 — Google sign-in via `payload-oauth2`** (research D3): thin MIT plugin producing a
  native Payload session; `useEmailAsIdentity: true` implements one-account-per-email
  (FR-004b); plugin registered only when `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are set.
  OAuth users are created/linked `_verified: true` (FR-004c's Google exemption).
- **R2 — Email via nodemailer SMTP, Ethereal in dev** (research D1/D2): built-in
  `auth.verify` + `@payloadcms/email-nodemailer`; when `SMTP_HOST` is unset in dev the
  adapter falls back to an Ethereal test inbox so verification links stay reachable
  without secrets.
- **R3 — Approval workflow on versions + drafts** (research D4): `versions: { drafts: true }`
  on Courses gives "prior published version stays live" (FR-009) natively; a `reviewState`
  field carries *pending review*; transitions are computed by the pure domain module and
  enforced in hooks, with publish gating on the **incoming** `data._status` (the docs'
  stored-status recipe is knowingly avoided — it would block standard Instructors from
  draft-editing published courses).
- **R4 — Wire Vitest now** (research D6): the access matrix and state machine are the
  logic 001 R3 was waiting for; int tests are the only way to validate FR-010/FR-014
  (no UI exists to test through).

## Project Structure

### Documentation (this feature)

```text
specs/002-roles-access-control/
├── plan.md              # this file
├── spec.md              # feature spec
├── research.md          # Phase 0 (this command)
├── data-model.md        # Phase 1 (this command)
├── quickstart.md        # Phase 1 (this command)
├── contracts/           # Phase 1 (this command)
│   ├── http-api.md
│   └── access-control.md
└── tasks.md             # Phase 2 (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── (frontend)/            # NEW student-facing surface (FR-015)
│   │   ├── signup/            #   email/password signup (+ Google button when enabled)
│   │   ├── signin/            #   sign-in
│   │   ├── verify-email/      #   consumes the emailed verification token
│   │   └── dashboard/         #   signed-in placeholder page
│   └── (payload)/             # existing admin UI + REST/GraphQL (unchanged layout)
├── collections/
│   ├── Users.ts               # EXTENDED: accessLevel, auth.verify, access rules, hooks
│   ├── Courses.ts             # NEW: minimal course, versions+drafts, reviewState
│   └── ReviewDecisions.ts     # NEW: immutable approve/reject history
├── domain/                    # NEW pure domain core (no Payload/Next imports — III)
│   └── course-workflow.ts     # publication state machine + role capability rules
├── access/                    # NEW shared access helpers (isAdmin, isOwn, …)
├── payload.config.ts          # + email adapter, serverURL (APP_URL), conditional oauth plugin
└── seed/admin.ts              # existing (unchanged)

tests/
└── int/                       # NEW Vitest integration tests
    ├── access-matrix.int.spec.ts
    ├── course-workflow.int.spec.ts
    └── student-signup.int.spec.ts

vitest.config.mts              # NEW (official template convention)
```

**Structure Decision**: stay inside the single Next.js app fixed by 001 — the student
surface is a `(frontend)` route group, not a second app. Domain rules go into
`src/domain/` as a pure module rather than spinning up the Core Library monorepo now;
extraction remains a later feature and the module is written to move unmodified.

## Complexity Tracking

No constitution violations — none.
