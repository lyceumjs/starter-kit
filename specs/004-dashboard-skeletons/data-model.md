# Data Model: Student & Instructor Dashboard Skeletons

**No new stored data.** This feature adds no collections, no fields, no migrations
(spec assumption; FR-013 keeps 002/003 models untouched). It only *consumes* existing
data through two read-side projections and one pure mapping.

## Consumed projections

### AuthUser (per-request, from `payload.auth`)

The slice of the 002 `users` document the UI layer reads. Resolved once per request
(`src/lib/auth.ts`, React `cache()`), never stored client-side.

| Field | Source (`users`) | Used for |
|---|---|---|
| `id` | `id` | request identity |
| `email` | `email` | identity display in Account / shell |
| `role` | `role`: `admin` \| `instructor` \| `student` | guards + landing dispatch |
| `accessLevel` | `accessLevel`: `editor` \| `standard` \| null | display only (no 004 behavior differs by level) |

### CourseSummary (from `GET /api/lms/catalog`)

The engine-computed catalog projection defined by Lyceum/003 (title, description,
cover image, unit and lesson counts, creation date). The exact TypeScript type comes
from `@lyceumjs/lms` — the host re-declares nothing (see research R5, contract in
003's `contracts/lms-api.md`). Rendered read-only by the catalog page.

## Pure mappings (unit-tested, `src/lib/routes.ts`)

### `landingFor(role)` — role → landing destination

| `role` | Landing |
|---|---|
| `student` | `/student` |
| `instructor` | `/instructor` |
| `admin` | `/admin` |
| (no session) | `/signin` |

One role per account (002 FR-001) keeps the mapping total and unambiguous.

### `safeNext(value)` — deep-link continuation validation

Accepts only internal paths: must start with `/`, must not start with `//`, no
scheme/host. Anything else falls back to `/dashboard`. Prevents open redirects
(research R3).

## Access states per surface (guard matrix)

Derived from spec FR-007/FR-008; enforcement is layout-level server guards
(research R4) — no data changes.

| Surface | Anonymous | Student | Instructor | Admin |
|---|---|---|---|---|
| `/catalog` (public) | view | view | view | view |
| `/student`, `/student/account` | → `/signin?next=…` | view | view (002 FR-017) | view (002 FR-017) |
| `/instructor`, `/instructor/account` | → `/signin?next=…` | → `/student` (denied, no content) | view | view |
| `/dashboard` (dispatcher) | → `/signin` | → `/student` | → `/instructor` | → `/admin` |
| `/signin` | view | → landing | → landing | → landing |
