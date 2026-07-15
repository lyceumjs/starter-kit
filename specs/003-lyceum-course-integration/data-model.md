# Data Model: Lyceum Course Authoring & Catalog Integration

**Date**: 2026-07-15 | **Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

Two entities change: `courses` (extended in place — the accepted ADR 0001
double-modeling) and the new `course-lifecycle` system collection. `users` and
`review-decisions` are untouched. Engine-side shapes are Lyceum's
(`Course`/`Unit`/`Lesson`/`ContentRef`/`CourseSummary`); this file maps them to
storage. Field mechanics follow [research.md](research.md) R1–R5.

## Course (`courses` — extended)

| Field | Type | Rules |
|---|---|---|
| `engineId` | text, indexed | Engine-minted UUID; public identity on `/api/lms/*`. System-written once (R2). |
| `title` | text, required | Engine-owned (locked, R4): non-empty enforced by engine. |
| `description` | textarea | Engine-owned (locked). Optional. |
| `slug` | text, indexed | Engine-owned (locked). REQUIRED at the host operation surface (400 before the engine when missing — R9); optional inside the engine. Format `^[a-z0-9]+(-[a-z0-9]+)*$` and store-wide uniqueness enforced by the engine via the authoring store (no DB unique flag — R1; last-write-wins races accepted at this scale). Suggested from the name by `src/domain/slug.ts` in the future creation UI. |
| `coverImage` | text | Engine-owned (locked). Opaque reference; media handling arrives with the UI feature. |
| `engineCreatedAt` | text | Engine-owned (locked). ISO-8601 string stored verbatim for round-trip fidelity (Payload's own `createdAt` stays infra metadata). |
| `units` | array | Engine-owned (locked). Rows: `{ engineId: text, title: text, lessons: array }`; `lessons` rows: `{ engineId, title, contents: array }`; `contents` rows: `{ engineId, title, h5pContentId?: text }`. Order of rows = engine order. |
| `author` | relationship → users | Unchanged from 002 (required, default creator, Admin-only reassignment, own-content model). |
| `reviewState` | select `none` \| `pending` | Unchanged from 002 (system-managed). Additionally reset to `none` by the archive path with `context.lifecycleArchive` so no decision is recorded (R5). |
| `_status` | versions/drafts | Unchanged mechanics (`versions: { drafts: true }`); see transitions below. |

- All engine-owned fields: field access `create/update: () => false`,
  `admin.readOnly: true`; written only by the adapter (`overrideAccess: true`) after
  route authorization (R4).
- Whole-aggregate writes: the adapter's `save()` replaces info + structure in one
  draft update — matching the engine's validate-then-save contract (failed operations
  never reach `save()`).

## Course lifecycle (`course-lifecycle` — new, system-managed)

One row per course, created on first engine `save()` (or first lifecycle event).

| Field | Type | Rules |
|---|---|---|
| `course` | relationship → courses, required, unique | Anchor. |
| `engineId` | text, indexed | Denormalized for adapter/route lookups without joins. |
| `firstPublishedAt` | date | Set once by `recordFirstPublish` (afterChange on first `_status: published`). Non-null ⇒ course is permanent (no delete, FR-012). |
| `archivedAt` | date | Non-null ⇒ archived: excluded from catalog store reads; restore clears it. |
| `archivedFrom` | select `published` \| `draft` \| `pending` | Stamped at archive time; documents the state restore returns to (version data itself is untouched, so restore is just clearing `archivedAt`). |

- Access mirrors `review-decisions`: `read` Admin-only, `create/update/delete` denied
  (system writes via `overrideAccess: true` only). Admin group "System".

## Publication & lifecycle state transitions (supersedes 002's table)

| # | Actor | Action | Result | Source |
|---|---|---|---|---|
| T1 | Instructor (any level) / Admin | create course (`POST /api/lms/courses`) | draft, `reviewState: none`, lifecycle row created | 002 |
| T2 | Admin or editor-level Instructor (own) | publish / edit-and-publish (002 Payload flow) | published immediately; `firstPublishedAt` stamped if first time | 002 |
| T3 | Standard-level Instructor (own) | publish attempt | transformed to draft + `reviewState: pending`; prior published version (if any) stays live | 002 |
| T4 | Admin | approve pending review | pending draft becomes published; decision recorded | 002 |
| T5 | Admin | reject pending review | stays draft, `reviewState: none`; decision recorded | 002 |
| ~~T6~~ | ~~unpublish~~ | **REMOVED** — `preventUnpublish` hook denies published→draft status changes for every actor; publishing is one-way | 003 clarification |
| T7 | Standard-level Instructor | approve/reject anything | denied (Admin-only) | 002 |
| T8 | Author (own) / Admin | **delete** (`DELETE /api/lms/courses/:id`) | allowed only while `firstPublishedAt` is null; document + lifecycle row removed; slug freed. Ever-published ⇒ 409, operation refused | 003 |
| T9 | Ever-published: Admin or editor-level (own); never-published: author (any level) or Admin | **archive** (`POST …/archive`) | `archivedAt` + `archivedFrom` stamped; catalog excludes it immediately; a pending review is voided (`reviewState → none`, draft edits kept, NO decision recorded) | 003 |
| T10 | Same actor set as T9 | **restore** (`POST …/restore`) | `archivedAt` cleared; course returns to its previous state: published → published (in catalog again, no re-approval), draft → draft, pending → draft (the voided review is NOT reinstated — the author resubmits; draft = approval not requested yet, pending = in review) | 003 |

- Structural authoring (engine operations through the adapter) always lands as draft
  saves — the engine never publishes; T2–T5 remain the only publication paths.
- Recorded for later features (not enforceable yet): enrolled students keep access to
  archived courses forever; archive only stops new enrollment (spec FR-012).

## Engine ↔ storage mapping summary

| Engine shape | Storage |
|---|---|
| `Course.id` | `courses.engineId` |
| `Course.title/description/slug/coverImage` | same-named locked fields |
| `Course.createdAt` | `courses.engineCreatedAt` (verbatim text) |
| `Course.units[*]` (+ nested) | `courses.units` array rows (`engineId` per row) |
| `CourseSummary` | never stored — computed by the engine from the catalog store's `list()` |
| draft vs published visibility | version dimension: authoring store reads latest/draft, catalog store reads published and non-archived (R3, R5) |
