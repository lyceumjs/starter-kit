<!--
Sync Impact Report
- Version: (none) → 1.0.0  (initial ratification)
- Version: 1.0.0 → 1.1.0  (added Admin role to Tech Stack & Scope)
- Principles: I. Spec-Driven Development · II. Open-Source First, Private Downstream ·
  III. Pure Domain Core · IV. Track Upstream, Don't Fork · V. Dockerized Dev Parity
- Added sections: Tech Stack & Scope; Governance
- Templates: plan-template.md / spec-template.md / tasks-template.md reference the
  constitution generically (no hardcoded principles) → no edits required
- Deferred/TODO: none (constitution encodes only accepted material)
-->

# LMS Starter Kit Constitution

Authorship and how the agent works here are defined in `CLAUDE.md` and are not
restated below. This constitution captures only decisions the author has accepted.

## Core Principles

### I. Spec-Driven Development
Specs and ADRs precede implementation; decisions are recorded in `specs/` before code.
Only stated or explicitly accepted material is persisted — never assumed or unconfirmed
content. Specs and `CLAUDE.md` MUST stay thin and non-repeating to avoid context bloat.

### II. Open-Source First, Private Downstream
This is the public OSS base for a later private product. It is maintained open source and
merged into the private repo when things are released. The license MUST stay commercially
unrestricted (MIT-class) so the private product carries no licensing constraint.

### III. Pure Domain Core
LMS domain logic (courses, enrollment, progress) lives in a database-agnostic TypeScript
core library — entities, rules, and calculations with zero framework or persistence
imports. Payload is a host that adapts to the core via hooks/services over its Local API;
Payload owns persistence, and that ownership is accepted.

### IV. Track Upstream, Don't Fork
Payload and other dependencies are consumed as npm dependencies, not forked, so upstream
framework-version updates pull and merge cleanly. Forking is a last resort, only when
customization genuinely demands it.

### V. Dockerized Dev Parity
The OSS kit ships Dockerized local development (multi-stage Dockerfile + docker-compose
for the Payload app + Postgres), with no secrets — `.env.example` only. This setup is
dev-parity only and MUST NOT be gold-plated; production/deployment Dockerization lives in
the private repo.

## Tech Stack & Scope

- Stack: Payload CMS v3 on Next.js (App Router) + React + Node.js, PostgreSQL.
- Product (current): single-instructor platform with heavy automation for scalability;
  roles are Admin, Instructor, and Student (see `specs/terms.md`).

## Governance

This constitution supersedes other practices where they conflict. Amendments are made by
the author as accepted specs/ADRs, following the authorship rules in `CLAUDE.md`.
Versioning: MAJOR for incompatible principle changes, MINOR for added/expanded guidance,
PATCH for clarifications.

**Version**: 1.1.0 | **Ratified**: 2026-06-09 | **Last Amended**: 2026-06-09
