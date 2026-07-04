# Tasks: Roles & Access Control

**Input**: Design documents from `specs/002-roles-access-control/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: included — the integration suite is part of the feature itself (plan R4;
SC-001 demands systematic denial coverage and US4 has deliberately no UI, so tests are
its only executable surface). Transition/entity references (T1–T7, field rules) point at
[data-model.md](data-model.md); endpoint behavior at [contracts/http-api.md](contracts/http-api.md).

**Organization**: grouped by user story. Note: the publication state machine is one
coherent unit built in Foundational — US2 and US4 are thin phases that *prove* their
slice of it, which keeps stories independently testable without same-file conflicts.

## Phase 1: Setup

**Purpose**: dependencies and test plumbing (plan R4, research D2/D3/D6)

- [X] T001 Add dependencies to `package.json`: `@payloadcms/email-nodemailer` pinned exactly `3.85.0` (version-locked to Payload), `payload-oauth2` `^1.0.21`; devDependencies `vitest` `^4`, `vite-tsconfig-paths`, `dotenv`; add script `"test:int": "cross-env NODE_OPTIONS=--no-deprecation vitest run --config ./vitest.config.mts"`; install via `make build`
- [X] T002 [P] Create `vitest.config.mts` (tsconfigPaths plugin, `environment: 'node'`, include `tests/**/*.spec.ts`, setupFiles `./vitest.setup.ts`) and `vitest.setup.ts` (`import 'dotenv/config'`) per the official Payload template convention (research D6)
- [X] T003 [P] Wire the `Makefile` `test` target (replace the 001 stub): idempotently create the `lms_test` database (`docker compose exec db psql -U postgres -tc "…" || createdb`), then run `test:int` inside the app container with `DATABASE_URI` overridden to `lms_test`; keep the `f=` filter passing through to vitest

**Checkpoint**: `make test` runs an (empty) green Vitest suite against `lms_test`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: the role model, the pure state machine, and both collections — every story
depends on these

**⚠️ CRITICAL**: no user story work can begin until this phase is complete

- [X] T004 Create pure domain module `src/domain/course-workflow.ts` — publication state machine and role capability rules: actor shape (role + accessLevel), transition function implementing T1–T7 from data-model.md (publish pass-through for Admin/editor, publish→pending transform for standard, approve/reject resolution Admin-only, admin review-exemption), plus capability predicates (canPublishDirectly, canApprove). **Zero Payload/Next imports** (constitution III)
- [X] T005 [P] Create shared access helpers in `src/access/index.ts`: `isAdmin`, `isAdminOrInstructor`, `adminOnlyFieldAccess`, `ownCoursesOnly` (query constraint on `author`), `publishedOnlyForReaders` (query constraint `{ _status: { equals: 'published' } }` for Students/anonymous) — written defensively (`data`/`id` may be undefined in the admin access probe, research D4)
- [X] T006 Extend `src/collections/Users.ts` (foundational slice only): add `accessLevel` select (`editor`/`standard`, default `standard`, admin-condition visible when `role = instructor`); field-level create/update access **Admin only** on both `role` and `accessLevel`; collection `access.admin` allowing `admin` and `instructor` roles only (FR-011/FR-017 gate); collection access per contracts/access-control.md (account management Admin-only; self may read own doc)
- [X] T007 Create `src/collections/Courses.ts`: fields `title` (required), `author` (relationship→users, defaults to creating user, Admin-only change), `reviewState` (select `none`/`pending`, default `none`, system-managed); `versions: { drafts: true }` with autosave off; access — create: Admin/Instructor, update: Admin or own-course Instructor, delete: Admin only, read: `publishedOnlyForReaders` for Students/anonymous, unrestricted for Admin/Instructor; `beforeChange` hook adapting `src/domain/course-workflow.ts` — gate on **incoming** `data._status === 'published'` (never the stored-status recipe, research D4 sharp edge), Admin writes exempt from the transform (FR-005)
- [X] T008 Register `Courses` in `src/payload.config.ts`, set `serverURL` from `APP_URL` env, and regenerate types (`pnpm generate:types`) so `src/payload-types.ts` picks up the new schema
- [X] T009 [P] Create integration-test bootstrap in `tests/helpers/payload.ts`: memoized `getPayload({ config })`, per-suite database cleanup, and a user factory (creates accounts of any role/accessLevel via Local API with `overrideAccess: true`); all matrix assertions will call operations with `overrideAccess: false` + `user` (research D6)
- [X] T010 [P] Unit tests for the pure module in `tests/unit/course-workflow.spec.ts`: every T1–T7 transition and capability predicate as plain function calls (no DB); doubles as the constitution-III purity guard (the file imports only `src/domain/course-workflow.ts`)

**Checkpoint**: foundation ready — user story phases can begin

---

## Phase 3: User Story 1 - Admin has full platform control (Priority: P1) 🎯 MVP

**Goal**: Admin provisions accounts (incl. Instructor access levels), has unrestricted
content access, approves/rejects reviews, and every decision is recorded (FR-003/005/006/016)

**Independent Test**: sign in as the seeded Admin, create an Instructor with an access
level, verify that Instructor can sign in; edit/delete others' content; approve and reject
a pending course and see the decisions recorded

- [X] T011 [US1] Create `src/collections/ReviewDecisions.ts` (slug `review-decisions`): fields `course` (relationship→courses, required), `decision` (select `approve`/`reject`, required), `decidedBy` (relationship→users, required); access — read: Admin only, create/update/delete: denied for all callers (system-written, immutable); register in `src/payload.config.ts` and regenerate types
- [X] T012 [US1] Create `src/collections/hooks/recordReviewDecision.ts` — `afterChange` hook on Courses: when an Admin resolves a `pending` review (publishes the pending draft → `approve`; draft-saves `reviewState` back to `none` without publishing → `reject`), create the review-decision record via Local API (system action, `overrideAccess: true`); fires on any path — admin panel, REST, Local (FR-016); wire into `src/collections/Courses.ts`
- [X] T013 [P] [US1] Integration test `tests/int/access-matrix.int.spec.ts`: the full access-matrix sweep — every cell for all four account types (Admin, editor Instructor, standard Instructor, Student) per contracts/access-control.md, incl. Admin provisioning with access level (US1-AS1), unrestricted edit/delete of others' content (US1-AS2), Students denied the admin area, non-Admins denied user management, self-signup role/accessLevel submissions ignored (SC-001: every "No" cell denied)
- [X] T014 [US1] Integration test scenarios in `tests/int/course-workflow.int.spec.ts` (create file): Admin approve → pending draft becomes published + `approve` decision recorded; Admin reject → stays draft, `reviewState` reset + `reject` decision recorded; decisions immutable (update/delete denied even for Admin); Admin direct edits never enter review (US1-AS3, FR-005/006/016, T4/T5) — pending state seeded via Local API

**Checkpoint**: US1 fully functional — Admin control provable end-to-end via `make test` + quickstart Scenario 1

---

## Phase 4: User Story 2 - Editor-level Instructor self-publishes (Priority: P1) 🎯 MVP

**Goal**: the MVP Instructor publishes and edits live content with zero Admin involvement
(FR-007, SC-002)

**Independent Test**: as an editor-level Instructor, publish a course — immediately
published, no pending step; edit it — change applies directly

> Implementation is delivered by Foundational T004/T007 (editor pass-through is a branch
> of the same state machine); this phase proves it independently.

- [X] T015 [US2] Extend `tests/int/course-workflow.int.spec.ts` with editor-level scenarios: publish → immediately `published`, `reviewState: none`, no decision recorded (US2-AS1, T2); edit published course → live immediately (US2-AS2); unpublish → back to draft (T6); attempt user management → denied (US2-AS3); attempt to edit another Instructor's course → denied

**Checkpoint**: both P1 stories done — the MVP operating model works

---

## Phase 5: User Story 3 - Student signs up and is confined to the learning platform (Priority: P2)

**Goal**: public self-signup (email/password with verification, optional Google) always
yielding Student accounts, the signup/signin/verify/placeholder pages, and the student
visibility boundary (FR-004/004a/004b/004c, FR-011/012/015, SC-003/006)

**Independent Test**: self-register, verify email, sign in to the placeholder page;
admin area denied; only published courses exposed at system level

- [X] T016 [US3] Extend `src/collections/Users.ts` with the signup slice: `auth.verify` with `generateEmailHTML`/`generateEmailSubject` building the link `{APP_URL}/verify-email?token=…` (research D1); `access.create` allowing anonymous self-signup; defense-in-depth `beforeValidate` hook forcing `role: 'student'` (and stripping `accessLevel`) when the creator is not an Admin (FR-004)
- [X] T017 [US3] Wire the email adapter in `src/payload.config.ts`: `nodemailerAdapter` with SMTP `transportOptions` from `SMTP_HOST/PORT/USER/PASS` + `EMAIL_FROM` when `SMTP_HOST` is set; argless `nodemailerAdapter()` (Ethereal test inbox) otherwise in dev — never the bare no-adapter fallback, which drops the link (research D2, plan R2)
- [X] T018 [US3] Create `src/plugins/google-oauth.ts` and register it conditionally in `src/payload.config.ts`: `payload-oauth2` with `useEmailAsIdentity: true` (one account per email, FR-004b), created/linked users get `role: 'student'` and `_verified: true` (FR-004c Google exemption, research D3), `successRedirect` → `/dashboard`; plugin omitted entirely when `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are unset (FR-004a degraded mode)
- [X] T019 [P] [US3] Create the frontend route-group shell `src/app/(frontend)/layout.tsx` (minimal — placeholder-grade styling only, FR-015)
- [X] T020 [P] [US3] Create signup page `src/app/(frontend)/signup/page.tsx`: email/password form posting `POST /api/users`; "Sign in with Google" link to `/api/users/oauth/google` rendered only when Google sign-in is configured; success state pointing the user at their inbox
- [X] T021 [P] [US3] Create signin page `src/app/(frontend)/signin/page.tsx`: form posting `POST /api/users/login`; surfaces the 403 unverified-email error distinctly from bad credentials; redirects to `/dashboard` on success
- [X] T022 [P] [US3] Create verify page `src/app/(frontend)/verify-email/page.tsx`: consumes `?token=…`, calls `POST /api/users/verify/{token}`, shows success (link to `/signin`) or failure
- [X] T023 [P] [US3] Create placeholder page `src/app/(frontend)/dashboard/page.tsx`: requires an authenticated user of any role (FR-017 — no role gate), anonymous visitors redirected to `/signin`; this is the SC-006 destination
- [X] T024 [US3] Integration test `tests/int/student-signup.int.spec.ts`: anonymous signup → account is `student` regardless of submitted role (US3-AS1); unverified login rejected 403 → verify token → login succeeds (US3-AS2, FR-004c); duplicate email rejected (FR-004b); Student denied admin area (US3-AS3); course reads as Student/anonymous return only published — lists and direct-by-id (US3-AS4/AS5, SC-003); Google endpoints absent (404) when credentials unset; OAuth user-creation config yields `_verified: true` + `student` (as far as testable without live Google — full round-trip stays manual, quickstart Scenario 3.6)

**Checkpoint**: a visitor can register, verify, sign in, and is fully confined — quickstart Scenario 3 passes

---

## Phase 6: User Story 4 - Standard Instructor publishes via Admin approval (Priority: P3)

**Goal**: the approval flow exists and is enforced in code with no UI (FR-008/009/010)

**Independent Test**: exercisable without UI — drive a standard-level Instructor's course
through pending → approved/rejected via the system's automated interface and verify
student invisibility throughout

> Implementation is delivered by Foundational T004/T007 + US1 T012 (standard-path branch
> of the same state machine); this phase proves it independently.

- [X] T025 [US4] Extend `tests/int/course-workflow.int.spec.ts` with standard-level scenarios: publish → transformed to draft + `reviewState: pending`, invisible to Students (US4-AS1, T3); approve → published / reject → draft, revise and resubmit cycle (US4-AS2); edit a published course → prior published version stays live for Students until Admin approval (US4-AS3, FR-009 — pin the drafts `originalDoc`/version semantics flagged in research D4); standard Instructor cannot approve own or others' pending courses (US4-AS4, T7); access-level change editor↔standard governs subsequent actions, already-published content stays published (edge case)

**Checkpoint**: all four stories independently proven

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T026 Run the full [quickstart.md](quickstart.md) manual validation (Scenarios 1–4) against a fresh boot; fix any drift between quickstart, contracts, and actual behavior
- [X] T027 Clean-environment gate: `make down` (with volumes) → `make build` → `make test` green from scratch — proves the suite carries no state assumptions (SC-001 evidence)
- [X] T028 [P] Config-contract sweep: every env key read by the implementation (`APP_URL`, `SMTP_*`, `EMAIL_FROM`, `GOOGLE_CLIENT_*`) exists in `.env.example` with accurate comments, and nothing in `.env.example` is dead (CLAUDE.md configuration rule)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: none — start immediately
- **Foundational (Phase 2)**: needs T001 (deps installed); **blocks all stories**
- **US1 (Phase 3)**: needs Phase 2; T012 (recording hook) is also a dependency of US4's approve/reject assertions
- **US2 (Phase 4)**: needs Phase 2 only — independent of US1
- **US3 (Phase 5)**: needs Phase 2 only — independent of US1/US2
- **US4 (Phase 6)**: needs Phase 2 + T012 (decision recording)
- **Polish (Phase 7)**: needs all desired stories complete

### Same-file chains (sequential, never [P])

- `tests/int/course-workflow.int.spec.ts`: T014 → T015 → T025
- `src/payload.config.ts`: T008 → T011 → T017 → T018
- `src/collections/Users.ts`: T006 → T016
- `src/collections/Courses.ts`: T007 → T012

### Parallel Opportunities

- Phase 1: T002, T003 together (after/alongside T001)
- Phase 2: T005, T009, T010 in parallel with each other; T004 first (T007 depends on T004/T005)
- Phase 3: T013 in parallel with T011/T012 (different files)
- Phase 5: T019–T023 (five frontend pages/files) all in parallel; T016–T018 sequential on shared files
- After Phase 2, US2 (T015-only) and US3 (T016–T024) can proceed in parallel with US1 apart from the course-workflow test-file chain

## Implementation Strategy

**MVP first**: Phases 1–4 (Setup, Foundational, US1, US2 — both P1 stories). That is the
platform's operating model: Admin in control, the single editor-level Instructor
publishing freely. Stop, validate via quickstart Scenarios 1–2, demo.

**Incremental delivery**: add US3 (student side + verification + optional Google) →
validate Scenario 3 → add US4 (approval flow proof, tests-only phase) → validate
Scenario 4 → Polish. Each increment leaves `make test` green and earlier stories intact.
