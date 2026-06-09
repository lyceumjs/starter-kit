# Implementation Plan: Foundation Skeleton

**Branch**: `develop` (feature pinned via `.specify/feature.json`) | **Date**: 2026-06-09 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-foundation-skeleton/spec.md`

## Summary

Stand up a bootable, Dockerized Payload CMS v3 skeleton so an adopter can run one command
(`make up`) and reach a working Payload admin signed in as the seeded **Admin**. The stack
(Payload v3 on Next.js + Postgres) and Dockerized-dev decisions are already accepted in
[research.md](research.md); this plan turns them into a concrete buildable layout: a
multi-stage `Dockerfile`, a `docker-compose.yml` (Payload app + Postgres), an auth-enabled
`Users` collection with a `role` field, and an idempotent **Admin bootstrap** gated on
`APP_ENV` (FR-006). No course/domain logic — that is later features.

## Technical Context

**Language/Version**: TypeScript on Node.js **24 LTS** (Krypton); Payload requires ≥20.9, 24 is current Active LTS → Docker base image `node:24`.

**Primary Dependencies**: Payload CMS **3.85.0** (latest v3), Next.js (App Router; Payload-compatible 15.2+/16.2+ — exact pin taken from `create-payload-app` scaffold), React, `@payloadcms/db-postgres` (Drizzle), `@payloadcms/next`.

**Storage**: PostgreSQL (pinned major via the compose image, e.g. `postgres:17`).

**Testing**: None wired in this skeleton beyond the smoke test (boot + reach admin + sign in). The `Makefile` `test` target is left as a documented stub; the runner (recommend **Vitest**, used by Payload's own templates) is chosen in a later feature when there is logic to test. *(Recommendation R3 — see below.)*

**Target Platform**: Linux containers (Docker Desktop / WSL2 for local dev).

**Project Type**: Web application — a single Next.js app where the Payload admin *is* the app (`/app`). Single project at repo root; no monorepo yet (the db-agnostic Core Library is a separate later feature).

**Performance Goals**: None — SC-003 (time-to-running) was explicitly removed; cold boot is bounded by image pull/build.

**Constraints**: No secrets in the repo (`.env.example` only); dev-parity only — do not gold-plate toward prod (constitution V). Fail fast on missing required env / port conflict (spec edge cases).

**Scale/Scope**: One adopter, one machine, one Admin account. Skeleton only.

## Constitution Check

*GATE: must pass before Phase 0; re-checked after Phase 1.*

| Principle | Status | Notes |
|---|---|---|
| I. Spec-Driven Development | PASS | Plan derives only from accepted spec + research; open implementation choices are flagged as recommendations (R1–R3) pending acceptance, not silently persisted. |
| II. Open-Source First, Private Downstream | PASS | All deps MIT-class (Payload MIT, Next.js MIT, Postgres PostgreSQL-license). No source-available/copyleft dep introduced. |
| III. Pure Domain Core | PASS (deferred) | No LMS domain logic in this skeleton; nothing to keep pure yet. The Core Library is a later feature. |
| IV. Track Upstream, Don't Fork | PASS | Payload consumed as an npm dependency via `create-payload-app`; not forked. |
| V. Dockerized Dev Parity | PASS | Multi-stage `Dockerfile` + `docker-compose.yml` for app + Postgres, dev-only, no secrets. Scope guard honored — no registry/CD/scaling. |

No violations → Complexity Tracking left empty.

## Implementation choices

Map to research.md "Open questions". R1 is **accepted** by Valery (2026-06-09); R2/R3 stand
as accepted recommendations (defaults).

- **R1 — Admin bootstrap mechanism — ACCEPTED (2026-06-09).** Payload's Postgres adapter
  uses **push mode** in dev by default (Drizzle auto-syncs schema) and the docs warn against
  mixing *push* and *migrations* on the same dev DB. So FR-006 ("seeded via a database
  migration") is satisfied by its **intent**, not its literal mechanism: keep push mode for
  schema, and implement the Admin bootstrap as an **idempotent seed** the container
  entrypoint runs after Payload is ready — create the first Admin from
  `ADMIN_EMAIL`/`ADMIN_PASSWORD`, **no-op if an Admin already exists**, warn on the dev-default
  password, and **skip entirely when `APP_ENV=prod`**. (Rejected alternative: disable push
  and run `payload migrate` on boot — more literal, but forces a migration on every
  collection change, slowing dev iteration.)
- **R2 — Hot-reload — accepted (default).** Bind-mount the source into the app container with
  named volumes masking `node_modules` and `.next`, so Next.js/Payload HMR works without
  rebuilds. Standard dev-parity setup.
- **R3 — Test runner — accepted (default).** Leave `make test` a stub this feature; wire
  **Vitest** later, when there is logic to cover. Avoids gold-plating the skeleton.

## Project Structure

### Documentation (this feature)

```text
specs/001-foundation-skeleton/
├── plan.md          # this file
├── spec.md          # feature spec
├── research.md      # Phase 0 (already accepted)
├── data-model.md    # Phase 1 (this command)
├── quickstart.md    # Phase 1 (this command)
├── contracts/       # Phase 1 (this command)
└── tasks.md         # Phase 2 (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
Dockerfile             # multi-stage: deps → dev runner (node:24)
docker-compose.yml     # services: app (Payload/Next.js) + db (postgres:17)
docker-entrypoint.sh   # waits for db, runs Admin bootstrap (R1), starts the app
Makefile               # up / down / build / test (exists)
.env.example           # config contract (exists)
package.json
src/
├── app/
│   └── (payload)/     # Payload admin UI + REST/GraphQL routes (scaffolded)
├── payload.config.ts  # Postgres adapter, collections, admin config
├── collections/
│   └── Users.ts       # auth-enabled; role: admin | instructor | student
└── seed/
    └── admin.ts       # idempotent Admin bootstrap (R1), APP_ENV-gated
```

**Structure Decision**: Single Next.js app at repo root (Payload-as-app), generated from the
official `create-payload-app` blank template so we track upstream cleanly (principle IV). A
monorepo is deliberately *not* introduced yet — the Core Library that would justify it is a
separate later feature.

## Complexity Tracking

No constitution violations — none.
