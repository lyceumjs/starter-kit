# Quickstart: Validating Roles & Access Control

**Feature**: 002-roles-access-control | **Date**: 2026-07-02

Runnable scenarios proving the feature end-to-end. Endpoint behavior:
[contracts/http-api.md](contracts/http-api.md); entities/transitions:
[data-model.md](data-model.md). Implementation steps belong to `tasks.md`, not here.

## Prerequisites

- Docker (Desktop/WSL2) and `make`.
- `cp .env.example .env`. Optional: real `SMTP_*` values (otherwise dev uses an Ethereal
  test inbox — the verification-link preview URL appears in the app logs) and
  `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` (otherwise Google sign-in is simply absent,
  which is itself expected behavior).

```sh
make up          # or: make build (first run / after dependency changes)
```

App at `http://localhost:3021` (`APP_PORT`); admin panel at `/admin`, student surface at
`/signup`, `/signin`, `/dashboard`.

## Scenario 1 — Admin full control (US1)

1. Sign in at `/admin` as the seeded Admin (`ADMIN_EMAIL`/`ADMIN_PASSWORD`).
2. Create a user with role Instructor, access level **editor** → the Instructor can sign
   in to `/admin`. **Expected**: provisioning takes under 2 minutes (SC-005).
3. Edit and delete a course authored by that Instructor. **Expected**: no ownership or
   review restriction (FR-005).

## Scenario 2 — Editor-level Instructor self-publishes (US2, SC-002)

1. Sign in to `/admin` as the editor-level Instructor; create a course and hit
   **Publish**. **Expected**: immediately published — no pending-review step.
2. Edit the published course and publish again. **Expected**: change live immediately.
3. Try to open user management. **Expected**: denied (FR-013).

## Scenario 3 — Student signup and confinement (US3, SC-006)

1. Visit `/signup`, register with email + password. **Expected**: account created as
   Student; verification email dispatched within 1 minute (Ethereal preview URL in
   `docker compose logs app` when SMTP is unset).
2. Try `/signin` before verifying. **Expected**: rejected with the unverified-email error
   (403 behind the scenes).
3. Open the emailed link (`/verify-email?token=…`), then sign in. **Expected**: lands on
   the `/dashboard` placeholder page.
4. Browse to `/admin` as the Student. **Expected**: denied (FR-011).
5. `GET /api/courses` as the Student (or anonymous). **Expected**: only published courses;
   a draft/pending course fetched by ID is not exposed (FR-012, SC-003).
6. With Google credentials configured: "Sign in with Google" on `/signup` using the same
   email as an existing account. **Expected**: attaches to that account (no duplicate),
   signed in without any verification step (FR-004b/c).

## Scenario 4 — Standard Instructor approval flow, no UI (US4, SC-004)

Driven through the API/tests — this flow deliberately has no dedicated UI (FR-010).

1. As Admin, create a second Instructor with access level **standard**.
2. As that Instructor, create a course and publish it (admin panel or
   `PATCH /api/courses/{id}` with `_status: published`). **Expected**: course lands in
   pending review — not visible to Students.
3. As Admin, publish the pending draft (approve). **Expected**: course becomes published;
   an `approve` record appears in `review-decisions` (FR-016).
4. Repeat an edit on the now-published course as the standard Instructor and publish.
   **Expected**: prior version stays live for Students until the Admin approves (FR-009).
5. As Admin, reject instead (draft save resetting the review state). **Expected**: stays
   draft, `reject` recorded, Instructor can revise and resubmit.
6. As the standard Instructor, attempt the approve action. **Expected**: denied (T7).

## Automated validation

```sh
make test        # runs the Vitest integration suite against a dedicated test database
```

**Expected**: green suite covering every access-matrix cell (SC-001 — all "No" cells
denied for all four account types), the T1–T7 transitions, and the signup/verification
rules, per [contracts/access-control.md](contracts/access-control.md).

## Teardown

```sh
make down
```
