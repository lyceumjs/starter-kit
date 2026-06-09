# Feature Specification: Foundation Skeleton

**Feature Branch**: `develop` (pinned via `.specify/feature.json`; feature branches not in use yet)

**Created**: 2026-06-09

**Status**: Draft

**Input**: A bootable Dockerized LMS skeleton: an adopter can start the kit with one
command and reach a working Payload admin signed in as the instructor. Captures the
already-accepted stack and dev-environment decisions as the first feature. Ready for
`/speckit-plan`.

## Clarifications

### Session 2026-06-09

- Q: How is the initial privileged account created on first boot? → A: An **Admin** role (newly added to `terms.md`) is seeded by an idempotent bootstrap on startup — no public self-signup. Authentication itself is provided by Payload's built-in auth; the bootstrap just inserts the first Admin user. Instructor accounts are created later by an Admin.
- Q: Where do the seeded Admin's credentials come from, and when does the seed run? → A: The bootstrap always runs in dev and uses `ADMIN_EMAIL` / `ADMIN_PASSWORD` from env when set; if unset it falls back to documented dev-only defaults (e.g. `admin@example.com`) and warns to set a real password via `.env`. The bootstrap does **not** run when `APP_ENV=prod`.
- Note (mechanism refined during `/speckit-plan`, accepted 2026-06-09): the bootstrap is an **idempotent startup seed via Payload's Local API**, not a Drizzle/database migration. Payload's Postgres adapter uses schema **push** in dev and discourages mixing push with migrations on the same dev DB, so a literal migration would fight the framework. The seed preserves the original intent (no self-signup, env-driven, no-op if an Admin exists, skipped in prod). See plan.md → R1.
- Q: Time-to-running target (SC-003)? → A: None — no wall-clock target; SC-003 removed. Cold first boot is bounded by image pull/build. (Low-downtime build-then-swap is a production CD concern, out of scope — private repo.)
- Q: Behavior when the admin port is already in use? → A: `docker compose up` fails fast with its port-bind error; the host port is configurable via `APP_PORT` in `.env`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Boot the kit and reach the admin (Priority: P1)

As someone adopting the starter kit, I can clone it and start it with a single documented
command, then open the admin panel and sign in as the admin (the account seeded by an
idempotent startup bootstrap) — a working LMS admin with no manual setup beyond providing
environment values.

**Why this priority**: Nothing else in the kit is usable until it boots. A one-command,
reproducible "it runs" is the core promise of a starter kit.

**Independent Test**: From a clean checkout with environment configured, run the documented
start command; the admin loads in a browser and the instructor can authenticate.

**Acceptance Scenarios**:

1. **Given** a clean checkout with environment values set, **When** I run the documented
   start command, **Then** the application and its database start and the admin is reachable.
2. **Given** the running admin panel, **When** the admin signs in, **Then** they reach the
   admin dashboard.

---

### User Story 2 - Configure without guessing, no secrets in the repo (Priority: P2)

As an adopter, I get a documented `.env.example` so I can configure the app without
guessing, and the repository commits no secrets.

**Why this priority**: Reproducibility and safe-by-default configuration; required for the
P1 boot to be repeatable across machines.

**Independent Test**: Copy `.env.example` to `.env`, fill values, and the app starts with
that configuration; no secret values are tracked in git.

**Acceptance Scenarios**:

1. **Given** the repository, **When** I copy `.env.example` to `.env` and fill the values,
   **Then** the app starts with my configuration.

---

### Edge Cases

- What happens when a required environment value is missing? The system SHOULD fail fast
  with a clear message rather than starting in a broken state.
- What happens when the admin port is already in use? `docker compose up` fails fast with
  its port-bind error; the host port is configurable via `APP_PORT` in `.env` so the
  adopter can change it.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The kit MUST start the application and its database with a single documented command (`make up`).
- **FR-002**: The running system MUST expose an admin interface reachable in a browser.
- **FR-003**: The admin MUST be able to authenticate (via Payload's built-in auth) and reach the admin panel.
- **FR-004**: The repository MUST provide a `.env.example` and MUST NOT commit secrets.
- **FR-005**: Local development MUST run in containers (constitution principle V — Dockerized Dev Parity).
- **FR-006**: The initial **Admin** account MUST be created by an **idempotent bootstrap
  seed** run on startup (no public self-signup), not by public sign-up. The seed uses
  `ADMIN_EMAIL` / `ADMIN_PASSWORD` from the environment when set; when they are unset it
  falls back to documented **dev-only** defaults (e.g. `admin@example.com`) and MUST warn
  the adopter to set a real password via `.env`. The seed MUST be a no-op when an Admin
  already exists, and MUST NOT run when `APP_ENV=prod`. Only a dev-only placeholder may be
  committed — never a real secret (see FR-004). Instructor accounts are subsequently created
  by an Admin (out of scope for this skeleton).

### Key Entities

- **Admin**, **Instructor**, **Student** — as defined in [terms.md](../terms.md). Only
  **Admin** authentication is in scope for this skeleton.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From a clean checkout, an adopter reaches a working, signed-in admin using
  only the documented command(s) and environment values — no code changes required.
- **SC-002**: No secrets are present in the repository.

## Assumptions

- The tech stack is fixed by the constitution and is **not** re-decided here: Payload CMS v3
  on Next.js (App Router) + React + Node.js, PostgreSQL. Decision detail in
  [research.md](research.md).
- Authentication is provided by Payload's built-in auth (an auth-enabled `users`
  collection); the kit configures roles and access, it does not build auth itself.
- Local dev is Dockerized per [research.md](research.md); production/deployment
  Dockerization is out of scope (private repo).
- Docker is installed on the adopter's machine.

## Non-goals

- Course authoring UI, student-facing learning experience, and the database-agnostic core
  library — separate later features.
- Production deployment / orchestration — including the low-downtime CD strategy
  (build everything first, restart containers only on a successful build). Lives in the
  private repo.
