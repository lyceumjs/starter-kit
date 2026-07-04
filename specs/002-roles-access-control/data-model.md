# Data Model: Roles & Access Control

**Date**: 2026-07-02 | **Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

Three entities (spec → Key Entities). Field-level mechanics follow the decisions in
[research.md](research.md); enforcement mapping lives in
[contracts/access-control.md](contracts/access-control.md).

## User account (`users` — existing collection, extended)

| Field | Type | Rules |
|---|---|---|
| `email` | text (auth) | Unique account identity — one account per email (FR-004b); Payload enforces uniqueness. |
| password credentials | managed by Payload auth | Absent-in-practice for Google-only users (plugin sets a random password). |
| `role` | select: `admin` \| `instructor` \| `student` | Required; default `student`. Field-level create/update access: **Admin only** — public signup cannot submit it, so self-registration always yields `student` (FR-004). |
| `accessLevel` | select: `editor` \| `standard` | Instructor-only attribute (FR-002); shown/required when `role = instructor`; default `standard`. Field-level create/update access: **Admin only**. Ignored for non-instructors. |
| `_verified` | checkbox (managed by `auth.verify`) | Email/password signups start `false` — login blocked (403) until the emailed token is consumed (FR-004c). Google-created/linked users are set `true` (Google already verified the email). |

- **Identity & linking**: a Google sign-in whose email matches an existing account
  attaches to that account (`useEmailAsIdentity`, research D3); duplicate accounts for one
  email cannot exist (FR-004b).
- **Admin panel gate**: collection `access.admin` allows `admin` and `instructor` roles
  only — Students never reach the admin/authoring area (FR-011); the student-facing side
  is ungated for all roles (FR-017).
- No versions on `users`.

## Course (`courses` — new, deliberately minimal)

Bare-bones record carrying the publication workflow end-to-end (spec: minimal Course in
scope); the later course-management feature extends it with real content.

| Field | Type | Rules |
|---|---|---|
| `title` | text | Required. |
| `author` | relationship → `users` | Required; defaults to the creating user; only an Admin may change it. Instructors operate on own courses only (own-content model). |
| `reviewState` | select: `none` \| `pending` | System-managed (hooks only, from the domain module); default `none`. `pending` lives on the draft version awaiting Admin review. |
| `_status` | managed by versions/drafts: `draft` \| `published` | `versions: { drafts: true }`, autosave off. |

### Publication states (spec) → storage mapping

| Spec state | Representation |
|---|---|
| Draft | latest version `_status = draft`, `reviewState = none`, never published |
| Pending review | latest draft version has `reviewState = pending` (a previously published version, if any, stays live underneath — FR-009) |
| Published | published version served to readers; a newer pending draft may exist on top |

### State transitions (enforced server-side on every API — FR-014)

| # | Actor | Action | Result | FR |
|---|---|---|---|---|
| T1 | Instructor (any level) / Admin | create course | draft (`reviewState: none`) | — |
| T2 | Admin or editor-level Instructor (own course) | publish / edit-and-publish | published immediately, `reviewState: none`; no review step | FR-005, FR-007 |
| T3 | Standard-level Instructor (own course) | publish | transformed to draft + `reviewState: pending`; not visible to Students; prior published version (if any) stays live | FR-008, FR-009 |
| T4 | Admin | approve pending review | pending draft becomes published, `reviewState: none`; **Review decision (approve)** recorded | FR-006, FR-016 |
| T5 | Admin | reject pending review | stays draft, `reviewState: none`; prior published version (if any) still live; **Review decision (reject)** recorded; author may revise and resubmit (T3) | FR-006, FR-016 |
| T6 | Admin or editor-level Instructor (own course) | unpublish | back to draft | FR-007 |
| T7 | Standard-level Instructor | approve/reject anything (incl. own) | denied — approval is Admin-only | US4-AS4 |

- Transitions are pure functions in `src/domain/course-workflow.ts` (constitution III);
  Payload hooks adapt them. Publish gating checks the **incoming** `data._status`
  (research D4 sharp edge), so standard Instructors can still draft-edit their published
  courses.
- Reader visibility (FR-012): Students and anonymous requests see only
  `_status = published` — enforced as a read query constraint, so drafts/pending versions
  are never exposed by listing or direct address.
- Admin edits are never subject to review (FR-005) — Admin writes skip T3's transform.

## Review decision (`review-decisions` — new, immutable)

Minimal record per spec clarification (FR-016).

| Field | Type | Rules |
|---|---|---|
| `course` | relationship → `courses` | Required. |
| `decision` | select: `approve` \| `reject` | Required. |
| `decidedBy` | relationship → `users` | Required; the Admin who resolved the review. |
| `createdAt` | timestamp (Payload-managed) | The decision timestamp. |

- **Immutability**: no update, no delete (access denies both); created only by the system
  when an Admin resolves a pending review — on any path (admin panel publish, REST,
  Local API). Read access: Admin only for now (no UI consumes it this phase).
- A course's review history = its `review-decisions` ordered by `createdAt`.
