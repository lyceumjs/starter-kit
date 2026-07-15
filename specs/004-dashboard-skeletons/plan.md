# Implementation Plan: Student & Instructor Dashboard Skeletons

**Branch**: `develop` | **Date**: 2026-07-15 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/004-dashboard-skeletons/spec.md`

## Summary

Build the two authenticated dashboard shells and the unified role-aware entry on top
of what 002 shipped: `/signin` stays the single sign-in surface for all roles
(unified auth is already one `users` collection — nothing is rebuilt), the 002
placeholder at `/dashboard` becomes a UI-less role dispatcher (`student` →
`/student`, `instructor` → `/instructor`, `admin` → `/admin`), and route-group
layouts enforce access server-side via `payload.auth` guards with `?next=`
deep-link continuation. The skeletons render placeholder sections only (Student: My
learning · Course catalog · Account; Instructor: My courses · Account — lean), plus
one live public page: `/catalog`, a client fetch of 003's public `GET
/api/lms/catalog`, replacing `/` as the anonymous landing. Seed work guarantees
sign-in-ready accounts for every role/level and published courses, so the whole
feature is click-testable on a fresh env.

## Technical Context

**Language/Version**: TypeScript 5.7, Node.js ≥ 20.9 (ESM)

**Primary Dependencies**: Payload CMS 3.85 (+ `@payloadcms/db-postgres`,
`@payloadcms/next`), Next.js 15.4 (App Router), React (newest stable — author rule
2026-07-15). Consumes 003's `/api/lms/catalog`; no new dependencies, no engine
changes (`@lyceumjs/lms` untouched)

**Storage**: PostgreSQL 17 (Dockerized) — **no schema changes** in this feature (no
new collections/fields/migrations)

**Testing**: Vitest 4 — `tests/unit/` for the pure routing helpers
(`landingFor`, `safeNext`), `tests/int/` (Local API pattern, real Postgres via `make
test`) for seed guarantees; frontend flows verified in a real browser via Playwright
MCP against the running app (CLAUDE.md rule — frontend change), per quickstart.md

**Target Platform**: Dockerized Linux dev (compose: `app` + `db`), app on
`http://localhost:${APP_PORT}` (default 3021)

**Project Type**: Web app (Payload host, Next.js App Router) — single project

**Performance Goals**: interactive dev use only; single-instructor scale; catalog
unpaginated (003)

**Constraints**: UI/auth glue only — no domain logic (thin host, ADR 0001); no
course functional on either dashboard (spec FR-011); server-side access enforcement
(FR-007); depends on 003 being implemented first (catalog route + demo seed); dev
parity only, no gold-plating

**Scale/Scope**: ~9 pages/routes touched or added, 2 route-group layouts, ~5 shared
components, 1 small auth/routing lib, seed verification/extension, theme.css
additions; zero API endpoints added

## Constitution Check

*GATE: evaluated pre-Phase 0 and re-checked post-Phase 1 — PASS, no violations.*

- **I. Spec-Driven Development**: spec with resolved clarifications (session
  2026-07-15) accepted before this plan; all decisions recorded in spec.md /
  research.md. PASS.
- **II. Open-Source First, Private Downstream**: UI skeletons in the OSS kit; no
  licensing impact. PASS.
- **III. Pure Domain Core**: no domain logic added anywhere — dashboards render
  placeholders, the catalog page consumes the engine's public read surface, and
  auth/routing helpers are host glue (the host owns auth and dashboards per ADR
  0001 / Lyceum boundary). PASS.
- **IV. Track Upstream, Don't Fork**: Payload auth endpoints, OAuth plugin config,
  and the generated admin panel are used as-is (research R1/R8); no framework
  customization. PASS.
- **V. Dockerized Dev Parity**: everything runs and is verified through compose;
  seeder remains dev-only (`APP_ENV` gate). PASS.

## Project Structure

### Documentation (this feature)

```text
specs/004-dashboard-skeletons/
├── plan.md              # This file
├── research.md          # Phase 0 — decisions R1–R8
├── data-model.md        # Phase 1 — no new data; projections + guard matrix
├── quickstart.md        # Phase 1 — browser + curl validation guide
├── contracts/
│   └── ui-routes.md     # page inventory, nav contract, redirect rules
└── tasks.md             # Phase 2 (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
src/
├── app/(frontend)/
│   ├── page.tsx                   # CHANGED: `/` now redirects to /catalog
│   ├── dashboard/page.tsx         # REPLACED: role dispatcher, no UI (was 002 placeholder)
│   ├── signin/page.tsx            # CHANGED: signed-in visitors → /dashboard
│   ├── signin/SigninForm.tsx      # CHANGED: honors safeNext(?next=…) after login
│   ├── catalog/
│   │   ├── page.tsx               # NEW: public catalog page (server shell)
│   │   └── CatalogList.tsx        # NEW: client fetch of GET /api/lms/catalog
│   ├── student/
│   │   ├── layout.tsx             # NEW: requireUser guard + student shell/nav
│   │   ├── page.tsx               # NEW: My learning placeholder
│   │   └── account/page.tsx       # NEW: identity + sign-out
│   ├── instructor/
│   │   ├── layout.tsx             # NEW: requireRole(instructor|admin) + shell/nav
│   │   ├── page.tsx               # NEW: My courses placeholder
│   │   └── account/page.tsx       # NEW: identity + sign-out
│   ├── components/                # NEW: DashboardShell, NavLink, SignOutButton,
│   │   └── …                      #      PlaceholderSection
│   └── theme.css                  # EXTENDED: shell/nav classes (same token system)
├── lib/
│   ├── auth.ts                    # NEW: getAuthUser (cached), requireUser, requireRole
│   └── routes.ts                  # NEW: landingFor(role), safeNext(value) — pure
└── seed/                          # VERIFIED/EXTENDED: sign-in-ready accounts for every
                                   #   role + level, published courses (003 demo seed)

tests/
├── unit/routes.spec.ts            # NEW: landingFor, safeNext
└── int/
    ├── seed-accounts.int.spec.ts  # NEW: seeded roles/levels exist, verified, can log in
    └── (existing 002/003 suites — must stay green, SC-005)
```

**Structure Decision**: single project, extending the existing `(frontend)` route
group. New UI concentrates in two role-prefixed route groups (guards live in their
layouts), one public `catalog/` page, and a first shared `components/` directory;
`src/lib/` holds the request-auth and routing helpers. No `(payload)` files, no
collections, and no API routes are touched.

## Complexity Tracking

No constitution violations — table intentionally empty.
