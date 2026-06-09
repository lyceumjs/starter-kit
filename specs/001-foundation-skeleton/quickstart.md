# Quickstart: Foundation Skeleton

Runnable validation for spec 001 — proves an adopter can boot the kit and reach a signed-in
Admin (User Story 1 + 2). Run from the repository root.

## Prerequisites

- Docker installed and the daemon running.
- No local process already bound to `APP_PORT` (default `3021`).

## Setup

```bash
cp .env.example .env          # then edit values; set a real ADMIN_PASSWORD and PAYLOAD_SECRET
make up                       # builds images on first run, starts app + Postgres (FR-001)
```

First boot pulls/builds images (no time target — SC-003 removed). Watch logs with
`docker compose logs -f app` until the app reports ready.

## Validate

| # | Step | Expected | Proves |
|---|---|---|---|
| 1 | Open `http://localhost:${APP_PORT}/admin` | Payload admin loads; login screen shown | FR-002, SC-001 |
| 2 | Sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Reach the admin dashboard | FR-003, US1 |
| 3 | `grep -r` for secrets / check `git status` | Only `.env.example` tracked; `.env` gitignored | FR-004, SC-002 |
| 4 | Set `APP_PORT` to a busy port, `make up` | Fails fast with a port-bind error | edge case |
| 5 | Set `APP_ENV=prod`, fresh DB, `make up` | Admin bootstrap is skipped (no seeded Admin) | FR-006 |

## Smoke test (this task's definition of "starts without errors")

```bash
make up
docker compose ps            # app + db both Up (db healthy)
docker compose logs app      # no stack traces; Payload reports listening
curl -fsS http://localhost:${APP_PORT:-3021}/admin > /dev/null && echo "admin reachable"
make down                    # clean teardown
```

## Teardown

```bash
make down                     # stop & remove containers
docker compose down -v        # also drop the Postgres volume (wipes the seeded Admin)
```

See [contracts/env-and-commands.md](contracts/env-and-commands.md) for the full env/command
contract and [data-model.md](data-model.md) for the User/Admin model.
