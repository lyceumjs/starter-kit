---
description: "Task list for Foundation Skeleton implementation"
---

# Tasks: Foundation Skeleton

**Input**: Design documents from `specs/001-foundation-skeleton/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/env-and-commands.md, quickstart.md

**Tests**: No automated-test tasks — the spec does not request TDD and plan R3 defers the test
runner. Validation is the manual smoke test in [quickstart.md](quickstart.md).

**Organization**: Grouped by user story (US1 = P1 boot-and-reach-admin, US2 = P2
config-without-secrets) so each is independently testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- Paths are repo-root relative; this is a single Next.js app (Payload-as-app) per plan.md.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Scaffold the Payload v3 app and project skeleton.

- [X] T001 Scaffold the Payload v3 **blank template** with the Postgres adapter into the repo root using `pnpm create payload-app@latest` (Payload 3.85.0, Node 24), selecting `@payloadcms/db-postgres`; reconcile the generated files with the existing `Makefile` and `.env.example` (do not overwrite them).
- [X] T002 [P] Pin Node 24 in `package.json` `engines` and add `.nvmrc` (`24`); confirm `@payloadcms/db-postgres` and `@payloadcms/next` are in `package.json`.
- [X] T003 [P] Add `.dockerignore` excluding `node_modules`, `.next`, `.git`, `.env`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Dockerized dev infrastructure + Payload/Postgres wiring. **Blocks all user stories.**

**⚠️ CRITICAL**: No user story work begins until this phase is complete.

- [X] T004 Configure `src/payload.config.ts`: `postgresAdapter` reading `DATABASE_URI`, **push mode** left at the dev default (plan R1), `secret` from `PAYLOAD_SECRET`, and register the `Users` collection as `admin.user`.
- [X] T005 Create a multi-stage `Dockerfile` (base `node:24`): a `deps` stage (`pnpm install`) and a `dev` runner stage that runs `pnpm dev`. Dev-parity only — no prod target (constitution V).
- [X] T006 Create `docker-compose.yml`: service `app` (built from `Dockerfile`, `env_file: .env`, port `${APP_PORT}:3000`, source bind-mount with named volumes masking `node_modules` and `.next` per plan R2, `depends_on` db healthy) and service `db` (`postgres:17`, `POSTGRES_*` from env, healthcheck, named volume for data).
- [X] T007 Create `docker-entrypoint.sh`: wait for the `db` to be reachable, run the Admin bootstrap (T010), then `exec` the app start command.
- [X] T008 Verify `Makefile` `up`/`down`/`build` work against the new compose file; leave `test` as the documented stub (plan R3).

**Checkpoint**: `make up` builds and starts app + Postgres (admin not yet seeded).

---

## Phase 3: User Story 1 - Boot the kit and reach the admin (Priority: P1) 🎯 MVP

**Goal**: One command boots the kit and the seeded Admin can sign in to the Payload admin.

**Independent Test**: From a clean checkout with `.env` set, `make up` → open `/admin` → sign in as the seeded Admin → reach the dashboard.

- [X] T009 [US1] In `src/collections/Users.ts`, keep `auth: true` and add a `role` select field (`admin` | `instructor` | `student`, required, default `student`) per [data-model.md](data-model.md).
- [X] T010 [US1] Implement the idempotent Admin bootstrap in `src/seed/admin.ts`: no-op if any `admin` user exists; otherwise create one from `ADMIN_EMAIL`/`ADMIN_PASSWORD`, falling back to dev-only defaults with a warning to set a real password; **skip entirely when `APP_ENV=prod`** (FR-006, plan R1).
- [X] T011 [US1] Wire `docker-entrypoint.sh` to invoke the bootstrap on boot (depends on T007, T010).
- [X] T012 [US1] Validate per quickstart steps 1–2: `/admin` loads and the seeded Admin signs in to the dashboard.

**Checkpoint**: MVP — the kit boots and an Admin is signed in.

---

## Phase 4: User Story 2 - Configure without guessing, no secrets in repo (Priority: P2)

**Goal**: A documented `.env.example` configures the app; the repo commits no secrets.

**Independent Test**: Copy `.env.example` → `.env`, fill values, app starts; `git` tracks no secret values.

- [X] T013 [P] [US2] Reconcile `.env.example` with [contracts/env-and-commands.md](contracts/env-and-commands.md): every required var present, dev-only placeholders only, no real secrets (FR-004).
- [X] T014 [P] [US2] Confirm `.gitignore` excludes `.env` (but not `.env.example`) and that no secret is tracked (quickstart step 3).
- [X] T015 [US2] Add fail-fast validation for missing required env (`DATABASE_URI`, `PAYLOAD_SECRET`) with a clear message rather than a broken boot (spec edge case).

**Checkpoint**: Reproducible, secret-free configuration.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T016 [P] Add a `README.md` Quickstart: `cp .env.example .env` → `make up` → `http://localhost:${APP_PORT}/admin`.
- [X] T017 Run the full [quickstart.md](quickstart.md) smoke test end-to-end: `make up`, `docker compose ps`/`logs` clean, `curl /admin` reachable, port-conflict fails fast, `APP_ENV=prod` skips the seed, `make down`.

---

## Dependencies & Execution Order

- **Setup (P1)**: T001 first (scaffold); T002, T003 [P] after.
- **Foundational (P2)**: T004–T008 after Setup. T004 before T005–T007. Blocks all stories.
- **US1 (P3)**: T009, T010 [P] after Foundational; T011 after T007+T010; T012 last (needs T011).
- **US2 (P4)**: T013, T014 [P] independent of US1; T015 after T004. Independently testable.
- **Polish (P5)**: T016 [P] anytime after Setup; T017 last (needs US1 + US2 done).

### Parallel Opportunities

- T002 + T003 together (after T001).
- T009 + T010 together; T013 + T014 together.

---

## Implementation Strategy

### MVP First (US1 only)

1. Phase 1 Setup → 2. Phase 2 Foundational → 3. Phase 3 US1 → **STOP & VALIDATE** the boot
(quickstart steps 1–2). This is the core "it runs" promise.

### Incremental Delivery

Setup + Foundational → US1 (MVP, demo the signed-in admin) → US2 (config hardening) →
Polish (README + full smoke test).

---

## Notes

- [P] = different files, no dependency on an incomplete task.
- Keep everything dev-parity only — no prod/CD/registry (constitution V; spec Non-goals).
- Commit after each task or logical group; stop at any checkpoint to validate.
