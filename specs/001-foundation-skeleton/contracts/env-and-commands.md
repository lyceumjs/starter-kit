# Contract: Environment & Command Surface

The skeleton's external interfaces. The authoritative env file is [`.env.example`](../../../.env.example);
this records the contract the boot relies on. Keep the two in sync (CLAUDE.md → Configuration & env).

## Environment variables

| Var | Required | Default (dev) | Purpose / behavior |
|---|---|---|---|
| `APP_ENV` | yes | `dev` | `dev` runs the Admin bootstrap; `prod` skips it (FR-006). |
| `APP_PORT` | yes | `3021` | Host port the admin binds to (defaulted off 3000 to avoid clashes). Port conflict → `docker compose up` fails fast (edge case). |
| `ADMIN_EMAIL` | no | `admin@example.com` | Seeded Admin login. Unset → dev default + warning. |
| `ADMIN_PASSWORD` | no | `change-me-in-dev` | Seeded Admin password. Unset → dev default + warning to set a real one. Never a real secret in the repo (FR-004). |
| `DATABASE_URI` | yes | `postgres://postgres:postgres@db:5432/lms` | Payload→Postgres connection. `db` is the compose service host. |
| `PAYLOAD_SECRET` | yes | placeholder | Signs tokens/cookies. Must be a long random value; placeholder only in the repo (FR-004). |

Missing a required value → fail fast with a clear message rather than booting broken (edge case).

## Command surface (`Makefile`)

| Command | Contract |
|---|---|
| `make up` | The one documented start (FR-001). Boots app + Postgres detached; admin reachable at `http://localhost:${APP_PORT}/admin`. |
| `make down` | Stops and removes containers. |
| `make build` | Rebuilds images, then starts (use after dependency/Dockerfile changes). |
| `make test` | Stub this feature (plan R3); prints a not-wired notice. |

## HTTP surface (provided by Payload, not built here)

| Path | Expectation |
|---|---|
| `GET /admin` | Payload admin UI loads (FR-002); unauthenticated → login screen. |
| Admin login | Seeded Admin authenticates via Payload built-in auth and reaches the dashboard (FR-003). |

Payload also exposes REST/GraphQL under `/api` by default; not part of this skeleton's
acceptance, just inherited from the framework.
