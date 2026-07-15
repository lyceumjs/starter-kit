# Tasks: Lyceum Course Authoring & Catalog Integration

**Input**: Design documents from `/specs/003-lyceum-course-integration/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: included — the plan's testing strategy (R8) and SC-005 regression demand them;
tests are written first and must fail before the implementation task that makes them pass.

**Author constraints (2026-07-15)**: newest stable React must be used — verified against
the npm registry: **react 19.2.7** (host was 19.1.0; engine's `react ^18.3.1` regular
dependency is fixed upstream in Phase 1). Post-analysis: slug required + name→slug
module (R9); demo seeder deferred to next specs (R10). **Agreed MVP scope: Phases 1–3.**

**Organization**: grouped by user story (US1 authoring, US2 catalog reads, US3
lifecycle) so each is independently implementable and testable.

## Phase 1: Setup (engine refresh + React policy)

**Purpose**: current engine build consumable, single newest-stable React everywhere.

- [X] T001 Extend `sync-engine` target in `Makefile`: after packing, run
      `docker compose exec -T app pnpm install --force` and `docker compose restart app`
      (same-name tarball `vendor/lyceumjs-lms-0.0.0.tgz` must be re-hashed by pnpm — research R7)
- [X] T002 [P] Upstream (owned sibling repo): in `../lyceum-lms/package.json` move
      `react` and `react-dom` from `dependencies` to `peerDependencies` with range
      `>=18 <20` (newest stable 19.2.7 must satisfy it); `pnpm build` green there
- [X] T003 Bump `react` and `react-dom` to `19.2.7` in `package.json` (host), run
      `pnpm install`, app boots (`make up`)
- [X] T004 Run `make sync-engine`; verify the refreshed engine exposes the 003 surface
      (5-method `CourseStorePort`, course use-cases — quickstart "Sanity" check) and
      `docker compose exec -T app pnpm ls react` shows only 19.2.7

**Checkpoint**: current engine importable; one React, newest stable.

---

## Phase 2: Foundational (blocking all user stories)

**Purpose**: schema, domain rules, slug module, adapter, engine wiring, route plumbing.

- [X] T005 [P] Extend `tests/unit/course-workflow.spec.ts` with failing tests for the
      new lifecycle rules: `canDeleteCourse` (never-published only, author/Admin),
      `canArchiveCourse`/`canRestoreCourse` (ever-published ⇒ Admin or editor-level
      own; never-published ⇒ author any level or Admin), unpublish prohibition for
      every actor, archive-voids-review outcome (data-model T6/T8–T10)
- [X] T006 Implement those pure rules + types in `src/domain/course-workflow.ts`
      (zero Payload imports — constitution III); T005 green
- [X] T007 [P] Slug module (FR-016, research R9): `src/domain/slug.ts` —
      `suggestSlug(name)` with the custom rules isolated (baseline: lowercase,
      transliterate, non-alphanumeric → hyphen, collapse/trim), output always matching
      `^[a-z0-9]+(-[a-z0-9]+)*$`; unit tests in `tests/unit/slug.spec.ts`. Runtime
      consumer arrives with the 004 creation UI — ships tested and ready
- [X] T008 Extend `src/collections/Courses.ts` per data-model: `engineId` (indexed),
      `description`, `slug` (indexed), `coverImage`, `engineCreatedAt`, nested
      `units[]→lessons[]→contents[]` arrays with per-row `engineId`; all engine-owned
      fields locked (`create/update: () => false`, `admin.readOnly: true` — research R4)
- [X] T009 [P] Create `src/collections/CourseLifecycle.ts` (fields/access per
      data-model: `course` unique rel, `engineId`, `firstPublishedAt`, `archivedAt`,
      `archivedFrom`; system-only writes, Admin read, group "System") and register it
      in `src/payload.config.ts`
- [X] T010 Regenerate types (`docker compose exec -T app pnpm generate:types`) and
      restart the app; admin panel shows courses with read-only engine fields
- [ ] T011 [P] Add failing conformance suite
      `tests/int/course-store-contract.int.spec.ts`: `runCourseStoreContract` from
      `@lyceumjs/lms/testing` against `makeAuthoringStore(testPayload)` with `resetDb`
      (contracts/course-store-adapter.md)
- [ ] T012 Implement `PayloadCourseStore` (authoring + read-only catalog variants) in
      `src/adapters/lyceum/course-store.ts` per contracts/course-store-adapter.md:
      draft-only `save` upsert by `engineId` (+ lifecycle row on first save), latest-
      version reads, store-wide `getBySlug`, published+non-archived catalog reads,
      catalog `save`/`deleteById` throw
- [ ] T013 [P] Engine factories (authoring/catalog `createEngine` singletons) in
      `src/adapters/lyceum/engine.ts`
- [ ] T014 [P] Route plumbing in `src/app/(frontend)/api/lms/lib.ts`:
      `payload.auth({ headers })` helper, `authorizeCourseWrite` (002 own-content
      rules via `engineId` lookup), slug-required boundary check (400 before the
      engine — R9), `LyceumDomainError` → 400/404/409 mapper + error envelope
      (contracts/lms-api.md)
- [ ] T015 Conformance green: `make test f=course-store` passes (FR-008 proven)

**Checkpoint**: adapter proven by the engine's own suite — user stories can start.

---

## Phase 3: User Story 1 — Instructor assembles a full course (P1) 🎯 MVP

**Goal**: every structural authoring operation available through `/api/lms/*`, gated
by 002 rules, engine rules authoritative (FR-002/003/004/007, SC-001/002).

**Independent Test**: quickstart scenarios 1–3 — authenticated instructor builds a
3-unit/9-lesson course by curl, re-reads it byte-identical; invalid ops rejected with
nothing saved; anonymous/student/other-instructor denied. Actors are created via the
Admin bootstrap + Payload REST (quickstart "Actors") — no demo seeder in this feature.

- [ ] T016 [P] [US1] Failing integration tests `tests/int/lms-routes.int.spec.ts`:
      create→structure→re-read round trip (SC-001), boundary + engine rejections
      (missing slug 400, empty title 400, duplicate slug 409, stale reorder 400,
      missing target 404 — SC-002), access matrix rows for authoring
      (contracts/lms-api.md), all writes land as drafts
- [ ] T017 [US1] `POST /api/lms/courses` + `GET /api/lms/courses/[id]` handlers in
      `src/app/(frontend)/api/lms/courses/route.ts` and `courses/[id]/route.ts`
      (GET = authoring read, owner/Admin, latest version incl. draft)
- [ ] T018 [P] [US1] `PATCH …/info` handler in
      `src/app/(frontend)/api/lms/courses/[id]/info/route.ts` (whole-info update,
      slug required)
- [ ] T019 [P] [US1] Unit handlers in `…/courses/[id]/units/route.ts` (POST),
      `units/order/route.ts` (PUT), `units/[unitId]/route.ts` (PATCH/DELETE)
- [ ] T020 [P] [US1] Lesson handlers in `…/units/[unitId]/lessons/route.ts` (POST),
      `lessons/order/route.ts` (PUT), `lessons/[lessonId]/route.ts` (PATCH/DELETE)
- [ ] T021 [P] [US1] Content handlers in `…/lessons/[lessonId]/contents/route.ts`
      (POST) and `contents/[contentId]/route.ts` (DELETE)
- [ ] T022 [US1] T016 green: `make test f=lms-routes`
- [ ] T023 [US1] Live verification (CLAUDE.md backend rule): curl quickstart
      scenarios 1–3 against the running app (`make up`), actors created per
      quickstart "Actors" section

**Checkpoint**: 🎯 **agreed MVP complete** — a fully structured draft course can be
built and re-read; STOP and validate before continuing.

---

## Phase 4: User Story 2 — Catalog and published course reads (P2)

**Goal**: public catalog + gated published reads (FR-005/006/011/013, SC-003/004).

**Independent Test**: quickstart scenarios 4–5 — anonymous catalog lists only
published non-archived courses newest-first; slug read gives outline-only anonymously,
placeholders when signed in; drafts/pending unreachable; pending edits leave the
approved version live.

- [ ] T024 [P] [US2] Failing integration tests `tests/int/lms-catalog.int.spec.ts`:
      filtering + newest-first + empty catalog, outline stripping vs signed-in
      contents (FR-013), draft/pending/archived 404 by id and slug (FR-006/SC-003),
      published-version-served-while-pending (FR-006), approved course appears on next
      read (SC-004). Fixtures: build courses via the authoring adapter and seed
      `course-lifecycle` rows directly (Local API) — never via other stories'
      endpoints, preserving story independence
- [ ] T025 [US2] `GET /api/lms/catalog` handler in
      `src/app/(frontend)/api/lms/catalog/route.ts` (catalog engine `listCatalog()`,
      public)
- [ ] T026 [US2] `GET /api/lms/catalog/[slug]` handler in
      `src/app/(frontend)/api/lms/catalog/[slug]/route.ts` (published read; strip
      lesson `contents` for anonymous, full for any signed-in account; slug is
      required at the boundary, so every published course is addressable here)
- [ ] T027 [US2] T024 green (`make test f=lms-catalog`) + curl quickstart 4–5

**Checkpoint**: read side proven; US1+US2 independently functional.

---

## Phase 5: User Story 3 — Course lifecycle: delete drafts, archive published (P3)

**Goal**: one-way publishing, never-published deletion, archive/restore with
review-voiding (FR-012, SC-006, data-model T6/T8–T10).

**Independent Test**: quickstart scenario 6 — delete own draft (204, slug freed);
delete ever-published (409); unpublish denied; archive → out of catalog + review
voided without decision; restore → previous state (pending → draft), no re-approval.

- [ ] T028 [P] [US3] Failing integration tests
      `tests/int/course-lifecycle.int.spec.ts` (delete guards incl. idempotency and
      slug freeing; archive/restore round trip for each `archivedFrom` state incl.
      pending→draft on restore; review-void with NO new `review-decisions` row;
      `preventUnpublish` for every actor incl. Admin) and update the 002 suites that
      asserted unpublish as allowed (`tests/int/course-workflow.int.spec.ts`,
      `tests/int/access-matrix.int.spec.ts`)
- [ ] T029 [US3] Hooks `recordFirstPublish` (afterChange, stamps lifecycle row) and
      `preventUnpublish` (denies published→draft status transitions) in
      `src/collections/hooks/`, wired into `src/collections/Courses.ts`; add the
      `context.lifecycleArchive` skip to
      `src/collections/hooks/recordReviewDecision.ts`
- [ ] T030 [US3] `DELETE /api/lms/courses/[id]` in the existing
      `src/app/(frontend)/api/lms/courses/[id]/route.ts` (never-published guard via
      lifecycle row; 409 `PUBLISHED_PERMANENT` otherwise; idempotent 204)
- [ ] T031 [US3] Archive/restore handlers in
      `src/app/(frontend)/api/lms/courses/[id]/archive/route.ts` and
      `…/restore/route.ts` (T9/T10 actor rules from `src/domain/course-workflow.ts`;
      archive voids pending review via `lifecycleArchive` context)
- [ ] T032 [US3] T028 green (`make test f=course-lifecycle`) + curl quickstart 6

**Checkpoint**: full lifecycle enforced; all three stories independently functional.

---

## Phase 6: Polish & Cross-Cutting

- [ ] T033 Full regression (SC-005): `make test` all green (002 suites included) and
      `docker compose exec -T app pnpm vitest run tests/unit`
- [ ] T034 [P] Refresh `vendor/README.md` (peer-deps change, forced-reinstall step in
      the sync workflow)

---

## Dependencies & Execution Order

- **Phase 1 → Phase 2 → user stories**: T004 (engine surface) blocks T011/T012;
  T005→T006; T008+T009→T010; T012 needs T008/T009/T010; T015 gates all stories; T007
  (slug module) blocks nothing in this feature (no runtime consumer) but belongs to
  the foundation.
- **US1 (Phase 3)**: only Foundational. **US2 (Phase 4)**: only Foundational
  (fixtures via adapter + direct lifecycle rows, see T024 — not via US1/US3 routes).
  **US3 (Phase 5)**: only Foundational.
- **Polish**: T033 needs all implemented stories; T034 anytime after T002.
- Story order for a solo developer: US1 → US2 → US3 (priority order).

## Parallel Example: after T015 (foundation checkpoint)

```bash
# US1 handler tasks fan out once T016/T017 exist:
Task: "PATCH info handler in src/app/(frontend)/api/lms/courses/[id]/info/route.ts"
Task: "Unit handlers in src/app/(frontend)/api/lms/courses/[id]/units/..."
Task: "Lesson handlers in .../units/[unitId]/lessons/..."
Task: "Content handlers in .../lessons/[lessonId]/contents/..."
# Or run whole stories in parallel: US1 (T016–T023) ∥ US2 (T024–T027) ∥ US3 (T028–T032)
```

## Implementation Strategy

**Agreed MVP = Phases 1–3** (author decision at analysis, 2026-07-15): engine refresh +
foundation + US1 authoring, validated by curl (quickstart 1–3) with API-created actors —
that alone proves the engine/host contract end to end. Then US2 (read side), then US3
(lifecycle), then the regression pass. The demo seeder is NOT in this feature (next
specs). Each checkpoint leaves `develop` in a demonstrable state; commit per task or
logical group.
