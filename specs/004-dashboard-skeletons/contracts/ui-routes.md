# UI Route Contract: Dashboard Skeletons, Sign-in Routing, Catalog Page

The pages this feature ships, their access rules, and their redirect behavior.
Data contracts are not duplicated here: the catalog page consumes
`GET /api/lms/catalog` exactly as specified in
[003 `contracts/lms-api.md`](../../003-lyceum-course-integration/contracts/lms-api.md);
auth uses Payload's existing REST endpoints (`/api/users/login`, `/api/users/logout`)
unchanged.

## Page inventory

| URL | File (under `src/app/(frontend)/`) | Access | Renders |
|---|---|---|---|
| `/` | `page.tsx` | public | nothing — redirects to `/catalog` |
| `/catalog` | `catalog/page.tsx` (+ `catalog/CatalogList.tsx`, client) | public | published-course summaries newest-first from `GET /api/lms/catalog`; loading, empty ("no courses yet", non-error), and error states |
| `/dashboard` | `dashboard/page.tsx` | any (dispatcher) | nothing — redirects per `landingFor(role)`; anonymous → `/signin` |
| `/signin` | `signin/page.tsx` + `SigninForm.tsx` | public | unified sign-in for all roles; already-signed-in visitors are redirected to `/dashboard` |
| `/signup` | existing 002 pages | public | unchanged (students only, verification rules intact) |
| `/verify-email` | existing 002 page | public | unchanged |
| `/student` | `student/page.tsx` under `student/layout.tsx` | signed-in (any role) | student shell, **My learning** placeholder section |
| `/student/account` | `student/account/page.tsx` | signed-in (any role) | **Account**: identity (email, role) + sign-out |
| `/instructor` | `instructor/page.tsx` under `instructor/layout.tsx` | Instructor or Admin | instructor shell, **My courses** placeholder section |
| `/instructor/account` | `instructor/account/page.tsx` | Instructor or Admin | **Account**: identity + sign-out |
| `/admin/**` | Payload-generated (untouched) | Admin, Instructor (002 `access.admin`) | admin panel — the Admin landing |

The 002 post-login placeholder UI at `/dashboard` is removed; the URL survives as
the dispatcher only.

## Navigation contract (spec FR-003/FR-004)

- **Student shell**: My learning → `/student` · Course catalog → `/catalog` ·
  Account → `/student/account`. Plus identity display and sign-out. Nothing else.
- **Instructor shell**: My courses → `/instructor` · Account →
  `/instructor/account`. Plus identity display and sign-out. Nothing else (lean
  instructor UX is a delivery requirement).
- Placeholder sections render as labeled empty frames (`PlaceholderSection`) — no
  live data inside either dashboard.

## Redirect rules

1. **Sign-in success** (`POST /api/users/login` ok): navigate to `safeNext(next)`
   if the `next` query param is a safe internal path, else `/dashboard`.
2. **Dispatcher** (`/dashboard`): `student` → `/student`, `instructor` →
   `/instructor`, `admin` → `/admin`, anonymous → `/signin`.
3. **Guard, anonymous** (any dashboard URL): redirect to `/signin?next=<requested
   path>`; after sign-in, rule 1 continues to the requested path.
4. **Guard, wrong role** (Student on `/instructor/**`): redirect to `/student`
   without rendering any instructor content.
5. **Signed-in visitor on `/signin`**: redirect to `/dashboard` (rule 2 lands them).
6. **Sign-out** (`SignOutButton`: `POST /api/users/logout`, then navigate to `/`):
   session ended; every dashboard URL then behaves per rule 3.
7. **Unknown section under a shell** (e.g. `/student/nope`): the route group's
   not-found rendering inside the shell — never a blank or broken page.

OAuth (when enabled) keeps its existing `successRedirect: '/dashboard'` — rule 2
takes over from there; no plugin change.

## Enforcement note

Every rule above is server-rendered enforcement (`payload.auth` in route-group
layouts/pages — research R4); client-side navigation offers no path around it, and
API-level protection remains Payload access control, independent of these pages
(spec FR-007).
