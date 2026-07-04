# Contract: Access-matrix enforcement

**Feature**: 002-roles-access-control | **Date**: 2026-07-02

Maps every row of the spec's access matrix to its server-side enforcement point (FR-014)
and the integration test that proves it (SC-001: every "No" cell denied, verified across
all four account types). Test files live in `tests/int/`.

| Matrix row | Enforcement point | Verified by |
|---|---|---|
| Sign in to the admin/authoring area | `users` `access.admin` → roles `admin`, `instructor` only | `access-matrix` |
| Create / manage user accounts | `users` `access.create/update/delete` → Admin (plus anonymous self-signup path); field-level access on `role`/`accessLevel` → Admin only | `access-matrix`, `student-signup` |
| Create and edit own courses | `courses` `access.create` → Admin/Instructor; `access.update` → Admin or own-course Instructor (ownership query constraint) | `access-matrix` |
| Edit / delete any content (any author) | `courses` `access.update/delete` → unrestricted for Admin only | `access-matrix` |
| Publish own course with no approval | publish gating on incoming `data._status` (domain rule, hook-enforced): Admin + editor-level Instructor pass through | `course-workflow` |
| Submit own course for review | standard-level Instructor's publish transformed to draft + `reviewState: pending` (T3) | `course-workflow` |
| Approve / reject submitted courses | resolving a pending review restricted to Admin (T4/T5, T7); decision recorded in `review-decisions` | `course-workflow` |
| View the student-facing side | no role gate on `(frontend)` routes; Students/anonymous read only published courses via `read` query constraint | `access-matrix`, `student-signup` |

## Enforcement rules of record

1. **Server-side only** (FR-014): every rule above is a Payload access function, a
   field-level access function, or a collection hook adapting `src/domain/course-workflow.ts`.
   Nothing relies on UI hiding (the admin panel's button-hiding is a cosmetic bonus).
2. **Two distinct layers**:
   - *Access functions* answer "may this actor perform this operation on this document?"
     (ownership, roles, read visibility).
   - *Hooks* apply the publication state machine to the **incoming** data
     (publish → pending transform for standard Instructors; review-decision recording;
     defense-in-depth `role: student` on self-signup).
3. **Read visibility** (FR-012): Students and anonymous get the query constraint
   `{ _status: { equals: 'published' } }` — applied by Payload to lists and by-ID reads
   alike, so draft/pending documents are unlistable and unreachable by direct address
   (SC-003).
4. **Local API**: production code paths using the Local API run with its default
   `overrideAccess: true` only where they are system actions (seed, decision recording);
   integration tests always pass `overrideAccess: false` + `user` so the matrix is
   exercised exactly as REST callers experience it.
5. **Admin exemption** (FR-005): Admin writes bypass the review transform (never subject
   to review) — asserted in `course-workflow`.
