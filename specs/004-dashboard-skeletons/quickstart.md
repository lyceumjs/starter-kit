# Quickstart Validation: Student & Instructor Dashboard Skeletons

End-to-end proof of the feature on the seeded local env. Frontend flows are verified
in a real browser (Playwright MCP — CLAUDE.md rule; HTTP-status curls don't exercise
client components); the one API surface consumed is spot-checked with curl.

## Prerequisites

- Feature 003 implemented: `GET /api/lms/catalog` live, demo seeder present.
- `make up` — app on `http://localhost:${APP_PORT:-3021}`, fresh seed applied on
  boot (`APP_ENV=dev`, `SEED_DEMO_DATA=true`). Seeded credentials are printed by the
  seeder and documented in `src/seed/` (accounts for admin, editor-level instructor,
  standard-level instructor, student — all verified; published courses present).
- `make test` green before starting (002/003 suites are the regression floor,
  SC-005).

## 1. Public catalog page (US5, SC-006)

- curl `GET /api/lms/catalog` → `200`, array of published course summaries.
- Browser, signed out: open `/` → lands on `/catalog`. The page lists exactly the
  seeded published courses, newest first — no draft/pending/archived titles visible,
  no console errors.
- Empty-state check (optional, fresh DB with seeder's published courses absent):
  page shows a normal "no courses yet" state, not an error.

## 2. Unified sign-in, role-aware landing (US1, SC-001)

Same `/signin` page, three roles, three destinations:

| Sign in as | Expected landing |
|---|---|
| seeded Student | `/student` — My learning placeholder |
| seeded Instructor (either level) | `/instructor` — My courses placeholder |
| seeded Admin | `/admin` — admin panel, already signed in |

Also: wrong password → corrective error, no session; unverified email/password
account → blocked with the 002 unverified message.

## 3. Skeleton click-through (US2/US3, SC-003)

As the seeded Student: walk My learning → Course catalog (→ `/catalog`) → Account
(identity shows email + role; sign-out button present). Every entry renders its
labeled placeholder or the catalog — no dead links, no errors, no extra nav items.

As the seeded Instructor: walk My courses → Account. The shell carries only these
sections (lean UX check).

## 4. Access boundaries (US4, SC-002)

- Signed out, open `/student` directly → redirected to `/signin?next=/student`;
  sign in as Student → arrive back on `/student`.
- Signed out, open `/instructor` → `/signin?next=/instructor`; sign in as
  Instructor → arrive on `/instructor`.
- As Student, open `/instructor` directly → redirected to `/student`; no instructor
  content flashes or renders.
- As Instructor or Admin, open `/student` and `/catalog` → permitted (002 FR-017).
- Signed in (any role), open `/signin` → bounced to own landing.

## 5. Sign-out (US1-6, FR-009)

From each dashboard's Account section: sign out → back on the public side (`/` →
`/catalog`); then `/student` and `/instructor` both redirect to sign-in.

## 6. Regression + automated gates (SC-005)

- `make test` — all 002/003 integration suites still green, plus new unit tests for
  `landingFor` / `safeNext` and any new seed assertions.
- `docker compose restart app` needed only if Payload config/collections changed
  (this feature shouldn't touch them); pages hot-reload.

Full pass = SC-001…SC-006 satisfied; the feature is then ready for Valery's own
click-test on the seeded env (the definition of done for dashboards).
