# Contract: `/api/lms/*` operation surface

**Date**: 2026-07-15 | Backs FR-002…FR-007, FR-010…FR-013. Handlers live in
`src/app/(frontend)/api/lms/…` (static paths win over Payload's `/api/[...slug]`
catch-all). Every handler: `payload.auth({ headers })` → host authorization (002
rules) → engine operation → error mapping. The engine is never reached without
authorization having passed (FR-007).

**Identity**: `:id` below is always the course `engineId` (UUID); unit/lesson/content
ids are engine-minted UUIDs from the aggregate.

**Error envelope**: `{ "error": { "code": string, "message": string } }`.
`LyceumDomainError` mapping: `VALIDATION → 400`, `NOT_FOUND → 404`, `CONFLICT → 409`.
Host-level: `401` unauthenticated (where auth required), `403` authenticated but not
permitted, `409 PUBLISHED_PERMANENT` for refused delete of an ever-published course.

## Public reads (no auth)

| Method & path | Engine op / source | Response |
|---|---|---|
| `GET /api/lms/catalog` | `catalogEngine.listCatalog()` | `200` `CourseSummary[]` — published, non-archived, newest-first; `[]` when empty |
| `GET /api/lms/catalog/:slug` | catalog store `getBySlug` | `200` published course; **anonymous**: outline only — `contents` stripped from every lesson (FR-013); **any signed-in account**: full placeholders. `404` for draft/pending/archived/unknown. Since the slug is required at the host boundary, every published course is addressable here — no read-by-id endpoint needed |

## Authoring (auth: course author or Admin; `create` additionally allows any Instructor)

| Method & path | Body | Engine op |
|---|---|---|
| `POST /api/lms/courses` | `{ title, slug, description?, coverImage? }` — **slug required**: missing/empty ⇒ `400` at the host boundary before the engine (research R9) | `createCourse(info)` → `201` Course (draft) |
| `GET /api/lms/courses/:id` | — | authoring read, latest version incl. draft → `200` Course |
| `PATCH /api/lms/courses/:id/info` | `{ title, slug, description?, coverImage? }` (whole-info update; slug required, same boundary rule) | `updateCourseInfo` → `200` |
| `POST /api/lms/courses/:id/units` | `{ title }` | `addUnit` → `201` |
| `PATCH /api/lms/courses/:id/units/:unitId` | `{ title }` | `renameUnit` → `200` |
| `PUT /api/lms/courses/:id/units/order` | `{ unitIds: string[] }` (exact permutation) | `reorderUnits` → `200` |
| `DELETE /api/lms/courses/:id/units/:unitId` | — | `removeUnit` → `200` |
| `POST /api/lms/courses/:id/units/:unitId/lessons` | `{ title }` | `addLesson` → `201` |
| `PATCH /api/lms/courses/:id/units/:unitId/lessons/:lessonId` | `{ title }` | `renameLesson` → `200` |
| `PUT /api/lms/courses/:id/units/:unitId/lessons/order` | `{ lessonIds: string[] }` | `reorderLessons` → `200` |
| `DELETE /api/lms/courses/:id/units/:unitId/lessons/:lessonId` | — | `removeLesson` → `200` |
| `POST …/lessons/:lessonId/contents` | `{ title, h5pContentId? }` | `attachContent` → `201` |
| `DELETE …/lessons/:lessonId/contents/:contentId` | — | `removeContent` → `200` |

Mutating responses return the updated `Course` aggregate (round-trip visibility,
SC-001). All writes land as draft versions; publication stays on the 002 flows.

## Lifecycle (auth per data-model T8–T10)

| Method & path | Rule | Response |
|---|---|---|
| `DELETE /api/lms/courses/:id` | only while never published (lifecycle `firstPublishedAt` null); author (own) or Admin | `204`; ever-published → `409 PUBLISHED_PERMANENT`; idempotent for unknown id → `204` |
| `POST /api/lms/courses/:id/archive` | ever-published: Admin or editor-level own; never-published: author or Admin | `200 { archivedAt, archivedFrom }`; voids pending review (no decision) |
| `POST /api/lms/courses/:id/restore` | same actor set as archive | `200`; course returns to `archivedFrom` state |

## Out of this surface (unchanged 002 Payload flows)

Publish, submit-for-review (standard-level transform), approve/reject — existing
`courses` REST/admin operations with the 002 hooks; 003 adds only the
`preventUnpublish` guard (published→draft denied for everyone) and
`recordFirstPublish`. See `specs/002-roles-access-control/contracts/access-control.md`.

## Access matrix (integration-test checklist)

| Actor | create | author own | author others' | delete never-pub own | archive published own | catalog | course contents |
|---|---|---|---|---|---|---|---|
| Anonymous | 401 | 401 | 401 | 401 | 401 | 200 | outline only |
| Student | 403 | 403 | 403 | 403 | 403 | 200 | 200 (signed-in) |
| Instructor (standard) | 201 | 200 | 403 | 204 | 403 | 200 | 200 |
| Instructor (editor) | 201 | 200 | 403 | 204 | 200 | 200 | 200 |
| Admin | 201 | 200 | 200 | 204 (any) | 200 (any) | 200 | 200 |
