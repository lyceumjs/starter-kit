# Implementation Plan: Lyceum Course Authoring & Catalog Integration

**Branch**: `develop` | **Date**: 2026-07-15 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-lyceum-course-integration/spec.md`

## Summary

Integrate the Lyceum engine's course authoring & catalog domain (`@lyceumjs/lms`,
Lyceum feature 003) into this host, with **no UI**: refresh the stale vendored engine
package, extend the 002 `courses` collection into the full course aggregate
(info + units → lessons → content placeholders), implement the engine's
`CourseStorePort` as Payload/Postgres adapters (an authoring variant over draft
versions and a catalog variant over published, non-archived versions), expose the
engine's operations as thin Next.js route handlers under `/api/lms/*` gated by the 002
access rules (slug required at this boundary; name→slug module supplied for the future
UI), and apply the new lifecycle rules (publishing one-way — unpublish removed;
never-published courses deletable; archive/restore with review-voiding). Demo seeding
is deferred to the next specs (post-analysis decision). Engine computes; host stores
and gates (ADR 0001).

## Technical Context

**Language/Version**: TypeScript 5.7, Node.js ≥ 20.9 (ESM)

**Primary Dependencies**: Payload CMS 3.85 (+ `@payloadcms/db-postgres`,
`@payloadcms/next`), Next.js 15.4 (App Router), `@lyceumjs/lms` (vendored tarball,
refreshed via `make sync-engine`), pnpm 9. React: **newest stable, always** (author
rule 2026-07-15) — 19.2.7 as of task generation; the engine's `react ^18` regular
dependency is corrected upstream to a peer dependency (tasks T002–T004)

**Storage**: PostgreSQL 17 (Dockerized; Payload versions/drafts on `courses`)

**Testing**: Vitest 4 — `tests/unit/` (pure domain) + `tests/int/` (real Postgres via
`make test`, `lms_test` DB); engine conformance via `runCourseStoreContract` from
`@lyceumjs/lms/testing`; endpoint verification by curl against the running app
(CLAUDE.md rule — backend change)

**Target Platform**: Dockerized Linux dev (compose: `app` + `db`), app on
`http://localhost:${APP_PORT}` (default 3021)

**Project Type**: Web service (Payload host app) — single project

**Performance Goals**: none beyond interactive dev use; single-instructor scale
(constitution); catalog unpaginated by spec

**Constraints**: engine rules authoritative on every write path (no write may bypass
the engine); thin host — no domain logic outside Lyceum + the host's own
workflow/lifecycle module; no UI in this feature; publishing one-way; dev parity only

**Scale/Scope**: 1 extended collection + 1 new system collection, ~15 route handlers,
2 store-adapter variants, 1 slug module, ~6 test suites; no data migration (dev DBs
recreated); demo seeder deferred to the next specs

## Constitution Check

*GATE: evaluated pre-Phase 0 and re-checked post-Phase 1 — PASS, no violations.*

- **I. Spec-Driven Development**: spec + clarifications complete and accepted before
  this plan; all decisions recorded in `spec.md`/`research.md`. PASS.
- **II. Open-Source First, Private Downstream**: engine is MIT, vendored tarball only
  until registry release; no licensing change. PASS.
- **III. Pure Domain Core**: the course domain lives in Lyceum (zero framework
  imports); the host's own publication/lifecycle rules stay pure in
  `src/domain/course-workflow.ts` (extended, still no Payload imports); Payload adapts
  via hooks + Local API adapters and owns persistence. PASS.
- **IV. Track Upstream, Don't Fork**: Payload and Lyceum consumed as npm deps; engine
  React-18 dependency flagged upstream (research R7) instead of patching. PASS.
- **V. Dockerized Dev Parity**: adapter/route tests run through compose; nothing
  production-grade added. PASS.

## Project Structure

### Documentation (this feature)

```text
specs/003-lyceum-course-integration/
├── plan.md              # This file
├── research.md          # Phase 0 — decisions R1–R9
├── data-model.md        # Phase 1 — fields, lifecycle states, engine mapping
├── quickstart.md        # Phase 1 — end-to-end validation guide (curl flows)
├── contracts/
│   ├── lms-api.md              # /api/lms/* endpoint contract + error mapping
│   └── course-store-adapter.md # CourseStorePort ↔ Payload mapping (both variants)
└── tasks.md             # Phase 2 (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
src/
├── adapters/lyceum/
│   ├── course-store.ts        # PayloadCourseStore: authoring + catalog variants
│   └── engine.ts              # createEngine() factories (authoring/catalog singletons)
├── app/(frontend)/api/lms/    # route handlers (static paths win over Payload's
│   ├── catalog/route.ts       #   /api/[...slug] catch-all)
│   ├── catalog/[slug]/route.ts
│   └── courses/...            # create/info/read, units, lessons, contents,
│                              #   delete, archive, restore (see contracts/lms-api.md)
├── collections/
│   ├── Courses.ts             # extended: description/slug/cover/engine fields + structure arrays
│   ├── CourseLifecycle.ts     # NEW system collection: firstPublishedAt/archivedAt/archivedFrom
│   └── hooks/                 # applyPublicationWorkflow (kept), preventUnpublish (new),
│                              #   recordFirstPublish (new), recordReviewDecision (kept)
├── domain/
│   ├── course-workflow.ts     # + lifecycle rules: canDelete/canArchive/canRestore,
│   │                          #   unpublish prohibition, archive-voids-review
│   └── slug.ts                # NEW name→slug transform (custom rules isolated, FR-016)
├── seed/admin.ts              # existing admin bootstrap (unchanged; demo seeder → next specs)
└── access/index.ts            # + lms route guards (authorizeCourseWrite helper)

tests/
├── unit/course-workflow.spec.ts     # extended: lifecycle rules, T6 removal
├── unit/slug.spec.ts                # NEW slug transform rules
└── int/
    ├── course-store-contract.int.spec.ts  # runCourseStoreContract vs Payload adapter
    ├── lms-routes.int.spec.ts             # route handlers with real auth + Postgres
    ├── course-lifecycle.int.spec.ts       # delete/archive/restore/review-void
    └── (existing 002 suites — must stay green, SC-005)

vendor/lyceumjs-lms-0.0.0.tgz    # refreshed via make sync-engine (+ pnpm install --force)
```

**Structure Decision**: single project, extending the existing Payload host layout.
New code concentrates in `src/adapters/lyceum/` (persistence glue),
`src/app/(frontend)/api/lms/` (operation surface), and one new system collection;
everything else extends files 002 created. No UI directories are touched.

## Complexity Tracking

No constitution violations — table intentionally empty.
