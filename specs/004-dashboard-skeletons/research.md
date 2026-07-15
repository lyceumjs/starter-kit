# Phase 0 Research: Student & Instructor Dashboard Skeletons

Decisions resolving the plan's technical unknowns. All build on what 001/002 shipped
and what the 003 plan fixed; none change spec-level rules.

## R1 — Role-aware landing: a `/dashboard` dispatcher, not per-flow logic

**Decision**: Keep `/dashboard` as the single post-login destination, but replace the
002 placeholder page with a UI-less server-side dispatcher: it resolves the session
(`payload.auth`) and redirects by role — `student` → `/student`, `instructor` →
`/instructor`, `admin` → `/admin`; no session → `/signin`. The sign-in form keeps
redirecting to `/dashboard` (unless a `next` param applies, R3).

**Rationale**: Every entry path already funnels to `/dashboard` — the sign-in form,
the Google OAuth plugin's `successRedirect`, and `/`. One dispatcher gives all of
them role-aware landing without touching the OAuth plugin config, and the role →
destination mapping lives in exactly one place (`landingFor(role)`, unit-testable).

**Alternatives considered**: (a) client reads `user.role` from the login response and
picks the destination — duplicates the mapping in every entry path and does nothing
for OAuth/deep links; (b) Next.js middleware — rejected, see R4.

## R2 — URL structure: role-named prefixes + public `/catalog`

**Decision**:
- Student dashboard: `/student` (My learning) and `/student/account`.
- Instructor dashboard: `/instructor` (My courses) and `/instructor/account`.
- Public catalog page: `/catalog` — outside both dashboards; the student nav's
  "Course catalog" entry links to it.
- `/dashboard`: dispatcher only (R1), renders nothing.
- `/`: redirects to `/catalog` (was `/dashboard`) — anonymous visitors hitting the
  root now get a real public page instead of a bounce to sign-in, matching the
  accepted access shape ("everyone sees courses").

**Rationale**: Prefixes named after the `terms.md` roles are self-documenting for a
starter kit, map 1:1 onto the access rules (one guard per prefix, applied in that
prefix's layout), and give later features an obvious home (`/student/…` learning
surfaces, `/instructor/…` authoring surfaces). The catalog is one shared public page
(spec Q2 answer), so it lives under neither prefix.

**Alternatives considered**: `/learn` + `/teach` (nicer words, but not the project's
canonical terms); keeping `/dashboard` as the student home with `/instructor` beside
it (asymmetric, and overloads one word with two meanings).

## R3 — Deep-link continuation: `next` param on `/signin`

**Decision**: Guards redirect anonymous visitors to `/signin?next=<original path>`.
After successful sign-in the form navigates to `next` when it is a safe internal path
(must start with `/`, not `//`, no scheme — `safeNext()`, unit-testable), else to
`/dashboard`. If the signed-in role may not view `next`, that page's own guard
redirects to the role's landing — no error loop (spec FR-008).

**Rationale**: Standard, minimal continuation mechanism; validation prevents open
redirects; the wrong-role case needs no special handling because every dashboard
layout already enforces its own guard.

**Alternatives considered**: storing the intended URL in a cookie (state where a
query param suffices); no continuation (fails FR-008).

## R4 — Access guards: server-side helpers in layouts, no middleware

**Decision**: A small auth library (`src/lib/auth.ts`) wrapping `payload.auth({
headers })` in React `cache()` (one lookup per request): `getAuthUser()`,
`requireUser(next)` (any signed-in account — student dashboard), `requireRole(
['instructor','admin'], next)` (instructor dashboard). Called in each dashboard
route-group **layout** and in any page that renders identity. No `middleware.ts`.

**Rationale**: This is the 002 pattern (the placeholder page already does
`payload.auth` server-side) and satisfies FR-007's server-side enforcement: guarded
HTML is only ever rendered after the check passes, and the check reads the httpOnly
Payload session cookie against the DB — something edge middleware cannot do without
reimplementing Payload auth. Data access stays independently protected by Payload's
collection access control, so pages are never the only line of defense.

**Alternatives considered**: Next middleware for path gating (cannot run
`payload.auth`; cookie-presence checks alone would be decorative, not enforcement);
per-page checks only (repetitive; a forgotten page would leak — layout-level guard
covers every child route).

## R5 — Catalog page: client fetch of `GET /api/lms/catalog`

**Decision**: `/catalog` is a server-rendered shell with a client list component that
fetches `GET /api/lms/catalog` (the 003 public endpoint) and renders course summaries
newest-first as the API returns them, with loading, empty ("no courses yet" — a
normal state), and error states. No auth, same page for everyone.

**Rationale**: Valery's Q2 answer fixes the shape: "a public page that fetches the
courses list from the API". A client fetch exercises the public endpoint exactly as
any external consumer would, needs no `APP_URL` self-fetch plumbing during SSR, and
matches how 002's forms already talk to the API. Per-student enrichment later can
add to this page without relocating data access.

**Alternatives considered**: RSC calling the catalog engine directly via the Local
API (faster first paint, but bypasses the public API the author explicitly wants this
page to consume); RSC self-fetch over HTTP (absolute-URL plumbing for no gain).

**Open detail for implementation**: the `CourseSummary` field list (title,
description, cover image, unit/lesson counts, creation date per Lyceum 003) is typed
in `@lyceumjs/lms`; take the exact type from the package when building the list item
— do not re-declare it in the host.

## R6 — Sequencing and seed: 004 starts after 003; credentials are fixed dev constants

**Decision**: This feature assumes 003 is implemented (catalog route live, demo
seeder present). 004's seed work is then incremental: verify/extend the demo seed so
that every role and both instructor access levels have **sign-in-ready** (verified)
accounts with fixed, documented dev-only credentials, printed by the seeder, and that
published courses exist for the catalog page. If any of that slipped out of 003's
implementation, it becomes 004 tasks — FR-012 makes it this feature's gate either
way. No new env vars: credentials are constants in `src/seed/` (the seeder is already
hard-off when `APP_ENV=prod`, and `SEED_DEMO_DATA` already gates demo data), so
`.env.example` is unchanged.

**Rationale**: Zero-setup click-testing is the point of the seeder (Valery is the
technical tester); fixed printed credentials beat per-credential env vars for that.

**Alternatives considered**: per-role credential env vars (setup friction, no dev
benefit); seeding via HTTP (the Local API pattern in `src/seed/` already exists).

## R7 — Shared UI: `(frontend)/components/` + theme.css extensions

**Decision**: Introduce `src/app/(frontend)/components/` for the shared chrome:
`DashboardShell` (nav sidebar/header + content frame), `NavLink`, `SignOutButton`
(client: `POST /api/users/logout`, then `window.location.href = '/'`), and
`PlaceholderSection` (the empty labeled frame every skeleton section renders).
`CatalogList` stays colocated under `catalog/`. Styling continues the existing
system: BEM-ish utility classes in `theme.css`, extended with shell/nav classes — no
new styling technology.

**Rationale**: First feature with cross-page UI; a components directory next to the
pages that use it keeps the host thin and follows the colocation already in place
(`DevVerifyLink.tsx`). Replacing the 002 sign-out form (`<form action=
"/api/users/logout">` landing on a JSON response) with `SignOutButton` gives FR-009 a
clean return to the public side.

**Alternatives considered**: `src/components/` at the repo root (nothing outside
`(frontend)` consumes UI); adopting Tailwind/CSS modules (unjustified churn,
constitution V — no gold-plating).

## R8 — Unified sign-in vs the admin panel's built-in login

**Decision**: `/signin` is the platform's single sign-in surface for all roles;
Admins land on `/admin` via the dispatcher. Payload's own `/admin/login` screen
remains reachable as a framework built-in — it authenticates against the same
`users` collection (same accounts, same cookie) and is not a per-role sign-in page;
we neither extend nor hide it. `/signin` additionally redirects already-signed-in
visitors to `/dashboard` (spec US4-4).

**Rationale**: FR-001's "one account system, one sign-in flow" is about the account
model and the platform surface we ship, which stay singular. Suppressing the Payload
login screen would customize framework internals for no user-facing gain (constitution
IV — track upstream).

**Alternatives considered**: redirecting `/admin/login` to `/signin` (breaks
Payload's own logout/re-login flows inside the panel for zero benefit).
