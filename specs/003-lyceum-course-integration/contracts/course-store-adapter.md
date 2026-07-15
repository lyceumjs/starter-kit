# Contract: `CourseStorePort` ↔ Payload adapter

**Date**: 2026-07-15 | Backs FR-001, FR-003, FR-008. Implements Lyceum's
`CourseStorePort` (5 methods) over the `courses` collection via the Local API.
One class, two variants (research R3); both address courses by `engineId`
(research R2) and use `overrideAccess: true` — authorization happens in routes
before any engine call.

## Authoring store (read/write — backs all `/api/lms/courses*` operations)

| Port method | Payload mapping | Notes |
|---|---|---|
| `save(course)` | upsert by `engineId` with `draft: true`: `create` when absent (status draft), else `update` writing a new draft version | Whole-aggregate replace of all engine-owned fields; never touches `_status`, `reviewState`, `author`; creates the `course-lifecycle` row on first save |
| `getById(id)` | `find` by `engineId`, `draft: true`, limit 1 → map latest version (draft included) to `Course` | `undefined` when absent |
| `getBySlug(slug)` | `find` by `slug`, `draft: true` — across ALL courses, archived included | Store-wide, catalog-unfiltered: this backs the engine's slug-uniqueness CONFLICT check; an archived course's slug stays reserved (spec edge case) |
| `list()` | `find` all, `draft: true`, no filter | Only the catalog engine's `listCatalog()` consumes `list()`; the authoring variant implements it for port completeness/contract runs |
| `deleteById(id)` | `delete` by `engineId`; resolve silently when absent | Idempotent per port contract; routes guard never-published before calling (T8) |

## Catalog store (read-only — backs `listCatalog()` and public reads)

| Port method | Payload mapping | Notes |
|---|---|---|
| `list()` | `find` with `draft: false`, `where _status == published`, minus archived (`course-lifecycle.archivedAt` non-null — resolved via a lifecycle query, acceptable at single-instructor scale) | The engine computes `CourseSummary[]` + newest-first ordering from this |
| `getById(id)` / `getBySlug(slug)` | same filters, single doc → published snapshot | Draft/pending/archived ⇒ `undefined` ⇒ engine `NOT_FOUND` (FR-006) |
| `save` / `deleteById` | **throw** (`Error('catalog store is read-only')`) | Must be unreachable; a throw here is an integration bug surfaced loudly |

## Mapping invariants

- **Round-trip fidelity (FR-008)**: every field of `Course` — including
  `createdAt` (verbatim via `engineCreatedAt` text) and nested order — survives
  save→read byte-identically. Proven by the conformance suite (below).
- **Draft-only writes**: `save()` can never change what the catalog serves; only the
  002 publication flows move content to published.
- **Validate-then-save**: the engine only calls `save()` after invariants pass; the
  adapter performs no domain validation of its own (thin host).
- **Version dimension = visibility**: authoring reads latest, catalog reads published
  + non-archived. No other filtering exists in the adapter.

## Conformance

`tests/int/course-store-contract.int.spec.ts` runs the engine's own suite against the
authoring variant on real Postgres:

```ts
import { runCourseStoreContract } from '@lyceumjs/lms/testing'
runCourseStoreContract('PayloadCourseStore', () => makeAuthoringStore(testPayload))
```

with the existing `resetDb` helper between cases. The catalog variant is covered by
`lms-routes.int.spec.ts` (filtering, gating) and `course-lifecycle.int.spec.ts`
(archive exclusion, restore reappearance).
