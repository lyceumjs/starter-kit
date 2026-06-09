# Dev Environment

Status: **Accepted**
Date: 2026-06-09

## Context

The starter kit runs Payload (Node) + PostgreSQL (see [admin-panel.md](admin-panel.md)) —
inherently multi-service. Contributors and adopters need a one-command, reproducible
local setup. Question: Dockerize now in the OSS kit, or defer to the private product?

## Decision

**Dockerize local development now, in the open kit.** Production/deployment
Dockerization stays in the private repo.

- **OSS kit ships:** a multi-stage `Dockerfile` + `docker-compose.yml` for local dev
  (Payload app + Postgres, hot-reload, optional seed). Generic, no secrets —
  `.env.example` only.
- **Private repo adds later:** production compose/orchestration, real secrets, registry,
  CI/CD deploy, scaling.

## Rationale

- A `docker compose up` that boots app + DB in one command is the single biggest
  "it just runs" win for a starter kit — that's the kit's job.
- Reproducibility: pins the Postgres version, kills "works on my machine," no local
  Postgres install required.
- It's the expected baseline for serious JS/Payload starters.

## Consequences

- (+) One-command onboarding; version-pinned, reproducible dev.
- (−) Contributors need Docker installed.
- Scope guard: keep the OSS Docker setup **dev-parity only** — do not gold-plate it into
  a prod-grade deploy; that belongs in the private repo.

## Open questions

- Hot-reload approach for the Payload/Next.js container (bind-mount vs watch).
- Whether to include a seed step / seed data in the compose flow.
