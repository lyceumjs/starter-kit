# Contract: HTTP surface

**Feature**: 002-roles-access-control | **Date**: 2026-07-02

The feature exposes no bespoke API — everything rides Payload's standard REST endpoints
plus the endpoints the `payload-oauth2` plugin mounts. This contract fixes the expected
behavior per caller; entity shapes are in [../data-model.md](../data-model.md).

## Auth & signup (`/api/users/*`)

| Endpoint | Caller | Contract |
|---|---|---|
| `POST /api/users` | anonymous (public signup) | 201; created account always `role: student` (role/accessLevel submissions by non-Admins are ignored — field-level access); `_verified: false`; verification email dispatched automatically. Duplicate email → 400 (unique constraint). |
| `POST /api/users` | Admin | 201; may set any `role` and `accessLevel` (Instructor provisioning, US1). |
| `POST /api/users/login` | anyone | 200 + Payload auth cookie on valid credentials; **403 `UnverifiedEmail`** while an email/password account is unverified (FR-004c). |
| `POST /api/users/verify/{token}` | anonymous (from emailed link via the frontend verify page) | 200; sets `_verified: true`; invalid/consumed token → 4xx error. |
| `POST /api/users/logout` | signed-in | 200; clears the auth cookie. |
| `GET /api/users/oauth/google` | anonymous | Redirects to Google consent (only mounted when Google credentials are configured; otherwise 404 — FR-004a degraded mode). |
| `GET /api/users/oauth/google/callback` | Google redirect | Creates or email-links the account (`role: student` on create, `_verified: true`), sets the Payload auth cookie, redirects to the placeholder page. |

## Courses (`/api/courses/*`, standard Payload REST)

| Operation | Contract |
|---|---|
| `GET /api/courses` (list) / `GET /api/courses/{id}` | Student or anonymous: only `_status: published` documents are returned; drafts/pending are absent from lists and 404/denied by direct address (FR-012, SC-003). Admin/Instructor: may read drafts (`draft=true` per Payload versions API). |
| `POST /api/courses` | Admin/Instructor only (Students denied). `author` defaults to the creator. Creating directly with `_status: published` follows the same publish gating as update (T2/T3). |
| `PATCH /api/courses/{id}` with `_status: published` | Admin or editor-level Instructor (own course): published immediately (T2). Standard-level Instructor (own course): transformed server-side to draft + `reviewState: pending` (T3) — the response reflects the transformed state. Instructor on another's course: denied. |
| `PATCH /api/courses/{id}?draft=true` | Author saves draft changes; on a published course the published version stays live (FR-009). |
| Approve (Admin) | Publishing the pending draft — admin-panel Publish button or `PATCH` with `_status: published` (T4). System records an `approve` review decision. |
| Reject (Admin) | Draft save resetting `reviewState` to `none` without publishing (T5). System records a `reject` review decision. |
| `DELETE /api/courses/{id}` | Admin: any course (FR-005). Others: denied. |

No dedicated review-queue endpoints or UI are added (FR-010) — approval is driven through
these standard operations, which is what SC-004 exercises.

## Review decisions (`/api/review-decisions`)

| Operation | Contract |
|---|---|
| `GET` | Admin only. |
| `POST` / `PATCH` / `DELETE` | Denied for every caller — records are system-written and immutable (FR-016). |

## Admin panel

| Route | Contract |
|---|---|
| `/admin/*` | Admin and Instructor roles only (`access.admin`); a signed-in Student is rejected from the panel (FR-011). |

## Frontend pages (FR-015)

| Route | Contract |
|---|---|
| `/signup` | Email/password signup form; Google button rendered only when Google sign-in is configured. |
| `/signin` | Sign-in form; surfaces the unverified-email error distinctly. |
| `/verify-email` | Consumes `?token=…` from the emailed link, calls the verify endpoint, reports success/failure. |
| `/dashboard` | Signed-in placeholder page (the SC-006 destination). Reachable by any authenticated role (FR-017); anonymous visitors are redirected to `/signin`. |
