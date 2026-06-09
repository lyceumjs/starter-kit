# Data Model: Foundation Skeleton

Only the entities this skeleton actually stands up. Course/enrollment/progress entities are
out of scope (later features); they are named in [terms.md](../terms.md) but not modeled here.

## User (Payload auth collection `users`)

Payload's built-in auth provides identity, password hashing, sessions, and the admin login —
we do not build auth (Assumption in spec; principle IV). We add a `role` to it.

| Field | Type | Rules |
|---|---|---|
| `id` | auto (Postgres) | Payload-managed primary key. |
| `email` | email | Required, unique. Provided by Payload auth. Login identity. |
| `password` | hashed | Managed by Payload auth (never stored or committed in plaintext). |
| `role` | select | One of `admin` \| `instructor` \| `student` (see [terms.md](../terms.md)). Required. Defaults to `student`. |

**Roles in scope**: only **Admin** authentication is exercised by this skeleton (spec Key
Entities). `instructor` and `student` exist as enum values so the collection is
forward-compatible, but no flows create them here — an Admin creates Instructors later.

**Access (skeleton-level)**: admin-panel access restricted to authenticated users; finer
role-based access control is a later feature, not built here (avoid gold-plating, V).

### Seeded Admin (bootstrap)

The first `User` with `role: admin`, created by the idempotent bootstrap (plan R1), not by
self-signup.

- **Source of credentials**: `ADMIN_EMAIL` / `ADMIN_PASSWORD` from env; when unset, falls
  back to documented dev-only defaults (`admin@example.com`) and warns to set a real
  password (FR-006).
- **Idempotency**: bootstrap is a no-op if any `admin` user already exists.
- **Environment gate**: bootstrap does **not** run when `APP_ENV=prod` (FR-006).

## Non-entities (explicitly out of scope here)

Course, Unit, Lesson, Curriculum, Catalog, Enrollment, Cohort, Progress, Completion,
Certificate — defined in [terms.md](../terms.md), modeled in later features.
