# Research: Lyceum Course Authoring & Catalog Integration

**Date**: 2026-07-15 | **Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

Inputs: the Lyceum 003 engine surface (ports/operations/errors/packaging, read from
`~/oss/lyceum-lms` — `src/core/ports/course-store.ts`, `src/core/usecases/`,
`src/runtime/index.ts`, `specs/003-course-authoring-catalog/contracts/`) and the host
inventory after 002 (collections, hooks, access helpers, tests, seed, Makefile).
All NEEDS CLARIFICATION items from Technical Context: none remained — the spec's
clarification session resolved scope; the items below are design decisions.

## R1 — Course structure storage: nested arrays on `courses`

- **Decision**: model the aggregate as nested `array` fields on the existing `courses`
  collection: `units[] → lessons[] → contents[]`, each row carrying an `engineId`
  (engine-minted UUID) and `title` (+ `h5pContentId` on contents). New info fields:
  `description`, `slug`, `coverImage` (opaque text ref), `engineCreatedAt` (text,
  ISO-8601, engine-owned).
- **Rationale**: Payload versions/drafts snapshot the whole document — exactly matching
  the engine's whole-aggregate `save()` and the 002 whole-course publication workflow
  (FR-001). One document = one aggregate = one version history.
- **Alternatives considered**: separate `units`/`lessons` collections with
  relationships — rejected: children would fall outside the course's version history
  (published courses could leak draft structure), ordering and atomicity become manual,
  and it contradicts the aggregate semantics the engine's contract suite asserts.

## R2 — Engine identity: `engineId` field, not the Payload id

- **Decision**: the engine's UUID course id is stored in a new indexed `engineId` text
  field; Payload's serial integer id stays internal (admin, `review-decisions` FK).
  All `/api/lms/*` routes and adapter lookups address courses by `engineId`.
- **Rationale**: the engine mints `crypto.randomUUID()` ids and the contract suite
  requires round-trip fidelity; Payload's Postgres adapter uses serial ids that cannot
  carry them. Additive field → no 002 breakage, no FK migration.
- **Alternatives considered**: custom text `id` on the collection (payload id ==
  engine id) — rejected: breaking change to 002 data and the `review-decisions`
  relationship for zero functional gain. Mapping table — rejected: a field suffices.

## R3 — Two store-adapter variants (authoring vs catalog)

- **Decision**: one `PayloadCourseStore` class with two configurations, each backing
  its own engine instance:
  - **Authoring store** (read/write): `save()` writes DRAFT versions only
    (`draft: true`); `getById`/`getBySlug` read the latest version (draft included) —
    slug uniqueness stays store-wide as the engine requires; `deleteById` deletes the
    document; used by all authenticated authoring routes.
  - **Catalog store** (read-only): `list`/`getById`/`getBySlug` read PUBLISHED
    versions only and exclude archived courses (R5); `save`/`deleteById` throw —
    they must never be reached; backs `listCatalog()` and public reads.
- **Rationale**: Lyceum has no visibility state — "availability is the adapter's
  rule". The host's draft/published dimension maps onto two stores instead of implicit
  mode flags; drafts cannot leak into the catalog by construction.
- **Alternatives considered**: single adapter with a per-call mode option — rejected:
  every call site must remember the flag; one forgotten flag = draft leak. Request-
  scoped adapter — rejected: engine instances are cheap singletons, no per-request
  state needed.

## R4 — Write-path integrity: engine-owned fields locked

- **Decision**: all engine-owned fields (`title`, `description`, `slug`, `coverImage`,
  `engineCreatedAt`, `engineId`, `units`) get field-level access
  `create/update: () => false` and `admin.readOnly: true`. Only the adapter writes
  them (Local API, `overrideAccess: true`), and only after the route has authorized
  the actor. Workflow fields (`_status`, `reviewState`) keep their 002 mechanics.
- **Rationale**: satisfies "no path may store a course the engine would reject"
  (spec Edge Cases) by making the engine the only writer — Payload REST/admin writes
  to those fields are silently stripped by field access, so 002's publish/approve
  flows on the same document keep working unchanged.
- **Consequence (accepted)**: the admin panel becomes read + workflow-only for
  courses (title editing moves to `PATCH /api/lms/courses/:id/info`); fine, since the
  authoring UI arrives in 004+ and 003 is UI-less by decision.
- **Alternatives considered**: re-validating direct writes through engine invariants
  in a `beforeValidate` hook — rejected: duplicates domain logic in the host
  (violates thin-host/ADR 0001) and drifts the moment Lyceum evolves.

## R5 — Lifecycle state in a system collection, not versioned fields

- **Decision**: new system collection `course-lifecycle` (one row per course, keyed by
  course relationship + `engineId`): `firstPublishedAt`, `archivedAt`,
  `archivedFrom` (`published` | `draft` | `pending`). Written only by system paths
  (hooks + lifecycle routes, `overrideAccess: true`), read-only in admin, like
  `review-decisions`. Rules it powers: delete allowed only when `firstPublishedAt` is
  unset; archive permission (ever-published ⇒ Admin/editor-level-own); catalog
  exclusion of archived courses; restore = clear `archivedAt` (version data untouched
  ⇒ the course returns exactly to its pre-archive state, spec FR-012).
- **Rationale**: fields on `courses` are versioned — an `archivedAt` stamped on a
  draft is invisible to the published snapshot the catalog reads, and publishing the
  field directly would also publish any pending draft content (unacceptable). An
  unversioned sibling record avoids the whole class of draft/published divergence and
  gives restore-to-prior-state for free.
- **Archive voids review**: the archive route also resets a pending draft's
  `reviewState` to `none` with a context flag (`lifecycleArchive: true`) so
  `recordReviewDecision` records nothing (spec: voided, no decision).
- **Alternatives considered**: versioned `archivedAt` on `courses` — rejected (above);
  deriving `firstPublishedAt` from the versions table — rejected: fragile internal
  queries vs one explicit stamp in an `afterChange` hook (`recordFirstPublish`).

## R6 — Operation surface: thin Next.js route handlers under `/api/lms/*`

- **Decision**: custom route handlers in `src/app/(frontend)/api/lms/…` (static
  segments take precedence over Payload's `(payload)/api/[...slug]` catch-all — same
  pattern as the existing `dev/verify-link` custom route). Each handler:
  authenticate via `payload.auth({ headers })` → authorize with 002 rules
  (`ownCoursesOnly` semantics via a shared `authorizeCourseWrite` guard) → call the
  engine operation → map `LyceumDomainError` `VALIDATION→400`, `NOT_FOUND→404`,
  `CONFLICT→409` (the mapping Lyceum's contract doc suggests); auth failures are
  401/403 before the engine is reached (FR-007). Publish / submit-for-review /
  approve stay on the existing 002 Payload flows — the engine never publishes.
- **Rationale**: Lyceum ships engine methods, not HTTP handlers; the host owns
  mounting (ADR 0001). Explicit handlers keep the surface independent of Payload REST
  internals and are directly invokable in Vitest as plain functions.
- **Alternatives considered**: Payload `endpoints` config (mounted through the
  catch-all) — rejected: couples the LMS surface to Payload's REST layer and its
  request type for no gain. Exposing structure editing through Payload REST on the
  collection — rejected by R4.

## R7 — Vendored engine refresh & the React-18 dependency

- **Decision**: refresh via the existing `make sync-engine` (builds `../lyceum-lms`,
  packs into `vendor/`); because the tarball name stays `lyceumjs-lms-0.0.0.tgz`,
  follow with a forced install so pnpm re-hashes the file (extend `sync-engine` to run
  `pnpm install --force` in the app container and restart). Verify post-install that
  `CourseStorePort` exposes the five 003 methods (guards against a stale pack).
- **Risk flagged upstream (no host action)**: the engine declares `react ^18.3.1` as a
  regular dependency while the host runs React 19. Feature 003 imports only `.` (core)
  and `./testing` — no React in any import path — so no runtime impact; moving React to
  peer/optional deps is a Lyceum change to propose separately (decision rule: engine
  concern → change Lyceum, flag don't guess).

## R8 — Testing strategy

- **Decision**:
  1. **Adapter conformance**: `runCourseStoreContract` (from `@lyceumjs/lms/testing`)
     runs against the authoring `PayloadCourseStore` in `tests/int/` (real Postgres,
     existing `resetDb` helper) — the engine's own suite proves FR-008 round-trip
     fidelity.
  2. **Route integration**: invoke handlers directly with constructed `Request`s +
     real auth (login → cookie/Authorization header) covering the access matrix
     (owner/other-instructor/student/anonymous), error mapping, catalog filtering,
     and content gating (FR-013).
  3. **Lifecycle integration**: delete-only-never-published, archive/restore round
     trip, review-voiding, no-unpublish guard.
  4. **Unit**: new pure functions in `src/domain/course-workflow.ts`
     (`canDeleteCourse`, `canArchiveCourse`, `canRestoreCourse`, unpublish
     prohibition) — extending the existing unit suite; 002 tests updated only where
     T6 (unpublish) was asserted as allowed.
  5. **Live verification** (CLAUDE.md): curl the running app (`make up`) through the
     quickstart flows — backend/API feature, so curl + `make test`; no browser
     smoke needed (no UI).
- **Rationale**: matches the existing harness exactly (Vitest, `make test`, Local API
  helpers with `overrideAccess: false` + explicit users); the engine contract suite is
  free correctness coverage the plan would be negligent to skip.

## R9 — Slug: required at the host boundary; transform module in the host

- **Decision** (post-analysis, author): the slug is REQUIRED on
  `POST /api/lms/courses` and `PATCH …/info` (missing/empty ⇒ 400 before the engine is
  called). The engine keeps slug optional internally — no engine change; the host
  enforces requiredness as boundary policy. A small pure module `src/domain/slug.ts`
  (`suggestSlug(name): string`) holds the name→slug transformation — the author's
  custom rules live in this one place; a baseline (lowercase, transliterate,
  non-alphanumeric → hyphen, collapse/trim hyphens) ships now and always emits
  engine-format-valid output (`^[a-z0-9]+(-[a-z0-9]+)*$`). In this feature nothing
  calls it at runtime — the FE creation flow (next feature) prefills the suggestion and
  lets the user edit it; the module ships tested and ready.
- **Rationale**: requiredness closes the analysis finding G1 (a slugless published
  course would be publicly unreachable, violating FR-011) without any extra endpoint —
  every published course is slug-addressable. Isolating the transform keeps the custom
  rules editable in one file. **Flag, not guessed**: the exact custom rules beyond the
  baseline are the author's to specify before the 004 FE wiring.
- **Alternatives considered**: making the engine require slug — rejected: engine spec
  change for a host policy; public read-by-id endpoint — rejected: superseded by
  requiredness (author's call); putting the transform in Lyceum core — deferred: can
  move upstream later if the engine ever needs it, trivial relocation.

## R10 — Demo seeder deferred (was: seeder shape)

- **Decision** (post-analysis, author): the full demo seeder leaves this feature and
  moves to the next specs — still part of the overall MVP. This feature keeps only the
  existing Admin bootstrap seed; test fixtures and live validation create actors and
  courses through the API/adapter. `SEED_DEMO_DATA` was removed from `.env.example`
  and returns with the seeder spec.
- **Rationale**: the feature is pure integration; its validation doesn't need demo
  data, and the seeder's natural home is alongside the dashboard-skeleton work that
  will click through it. When it lands, it should still build courses **through the
  engine** (fails loudly if the integration breaks) rather than raw Local API inserts.
