# LMS Starter Kit

A Dockerized **Payload CMS v3** (Next.js App Router + PostgreSQL) starter — the open-source
baseline for a single-instructor learning platform. This is the **foundation skeleton**: boot
it with one command and reach a Payload admin signed in as the seeded **Admin**.

See [`specs/`](specs/) for the spec-driven design (terms, constitution, feature specs).

## Quickstart

Requires Docker (and the daemon running).

```bash
cp .env.example .env     # then set a real ADMIN_PASSWORD and PAYLOAD_SECRET
make up                  # build images + start app and Postgres (first run pulls/builds)
```

Open **http://localhost:3021/admin** (or your `APP_PORT`) and sign in with `ADMIN_EMAIL` /
`ADMIN_PASSWORD` from your `.env`.

## Commands

| Command | What it does |
|---|---|
| `make up` | Start app + Postgres (the one documented start). |
| `make down` | Stop and remove containers. |
| `make build` | Rebuild images, then start. |
| `make test` | Stub — test runner is wired in a later feature. |

## How the Admin is created

The first **Admin** is bootstrapped by an idempotent seed the container runs on boot
(`src/seed/admin.ts`): it reads `ADMIN_EMAIL` / `ADMIN_PASSWORD` (falling back to dev-only
defaults with a warning), is a no-op if an Admin already exists, and is **skipped when
`APP_ENV=prod`**. There is no public self-signup; an Admin creates Instructors later.

## Configuration

All config lives in [`.env.example`](.env.example) — copy it to `.env`. The repo commits no
secrets; `.env` is gitignored.

## License

MIT.
