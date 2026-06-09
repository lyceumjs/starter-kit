# Research: Foundation Skeleton

Phase 0 decision record for the foundation skeleton. Consolidates the two accepted
decisions that the skeleton stands up: the admin-panel/stack choice and the dev
environment. All decisions are accepted (2026-06-09).

## Decision 1 — Admin panel & core stack: Payload CMS v3

**Decision**: Build on **Payload CMS v3**. Resulting stack:

- **FE/Admin**: Next.js (App Router) + React — the Payload admin *is* our own `/app`.
- **BE**: Node.js, configured via TypeScript `payload.config`.
- **DB**: PostgreSQL — relational fits LMS data (courses/enrollments/progress/grades).
- **Consumed as an npm dependency** (not forked) → upstream updates pull cleanly.

**Requirements that drove it**: well-maintained/battle-tested; full control & a bespoke
course-builder; upstream-trackable as an npm dep; commercially unrestricted license (OSS
base for a later private product); single-instructor + heavy automation.

**Rationale**:

- **Next.js-native** and RSC-first, matching our framework preference.
- **MIT + Figma-backed** — commercially unrestricted and sustainably maintained.
- **Course-builder nearly free** via the **Blocks field**: per-lesson heterogeneous,
  drag-reorderable content blocks (video / rich text / quiz / embed). Array fields handle
  ordered homogeneous lists (modules).
- **Roles** (student / instructor / admin) via collection-, document-, and field-level
  access functions.
- **Course publishing** via drafts + versions + autosave + scheduled publish (scheduled
  publish requires a running Jobs Queue / worker).
- **Extension seams**: the server-side **Local API** (direct DB access from RSC/route
  handlers) and fully custom admin views/routes for a bespoke course-builder screen.

**Alternatives considered**:

| Option | Verdict | Why |
|---|---|---|
| **Refine** | Strong runner-up | MIT, headless React, max UI freedom, cleanest fit for the db-agnostic library — but you build backend/auth/media/API yourself (high from-scratch effort). |
| react-admin | Rejected | Solid, MIT core, 10yr agency-backed — but MUI-default (more to peel away) and same "bring your own backend" cost as Refine without the headless edge. |
| Strapi v5 | Rejected | MIT core but it's a CMS, not an app framework; owns your backend; granular RBAC/SSO/audit are EE-paywalled; friction modeling real LMS domain logic. |
| Directus | Rejected | **License**: as of v12 (May 2026) source-available (Monospace Sustainable Core License) — free only under $5M revenue / 50 employees, GPLv3 after 4 years. Commercial liability. Vue admin clashes with React. |
| AdminJS | Rejected | MIT and clean, but visibly stagnating (last release Jul 2025, nothing in 2026); CRUD-only, no course-builder paradigm. |
| Appsmith / ToolJet / Budibase | Rejected | Low-code internal-tool builders. Fine as an ops dashboard beside the LMS, wrong as the foundation of a code-first, long-lived, customizable product. |

**Consequences**:

- (+) Fast, batteries-included, Next.js, MIT; course-builder via Blocks.
- (+) The reusable db-agnostic library survives as a pure core (see below).
- (−) Lock-in to the Next.js / React / Node / Payload stack.
- (−) **No battle-tested LMS on Payload** — no official template or marquee case study;
  only two immature reference repos (`superwebpros/payload-lms-plugin` ~9★;
  `guillermoscript/lms`). We are trailblazing (which is the point of this starter).
- (−) Scheduled publish needs a Jobs Queue/worker wired up.
- (−) Double-modeling cost between domain entities and Payload collections.

### How the db-agnostic core library coexists *(forward-looking — informs a later core-library feature)*

Accept up front: **Payload owns schema and persistence, non-negotiably.** A strict
ports-and-adapters design where "Payload is just one swappable adapter" fights the grain.

The workable, community-blessed pattern:

- The **library is a pure domain core** — entities, rules, calculations
  (`calculateProgress`, `canEnroll`, certificate eligibility) as pure TypeScript with
  **zero Payload imports**, fully unit-testable. Persistence is expressed as repository
  **ports** (interfaces).
- **Payload is a host that adapts to the core**: collections mirror the domain; hooks and a
  services layer are thin orchestrators that map Payload docs ↔ domain types and call the
  pure functions via the Local API.
- The core stays portable to any project; this starter is one host implementing the ports.

**Cost accepted**: double-modeling — domain entities defined once in the library and again
as Payload collections, mapped at the boundary; ongoing sync work, not free.

## Decision 2 — Dev environment: Dockerized local development

**Decision**: **Dockerize local development now, in the open kit.** Production/deployment
Dockerization stays in the private repo.

- **OSS kit ships**: a multi-stage `Dockerfile` + `docker-compose.yml` for local dev
  (Payload app + Postgres, hot-reload, optional seed). Generic, no secrets — `.env.example`
  only.
- **Dev command surface (`Makefile`)**: a thin Makefile keeps the workflow to a limited,
  memorable set — `up` (light cached start), `down`, `build` (rebuild), `test` (optional
  filter). `make up` is the FR-001 one-command start. The `test` target's runner is
  finalized during planning.
- **Private repo adds later**: production compose/orchestration, real secrets, registry,
  CI/CD deploy, scaling.

**Rationale**:

- A `docker compose up` that boots app + DB in one command is the single biggest
  "it just runs" win for a starter kit — that's the kit's job.
- Reproducibility: pins the Postgres version, kills "works on my machine," no local Postgres
  install required.
- It's the expected baseline for serious JS/Payload starters.

**Consequences**:

- (+) One-command onboarding; version-pinned, reproducible dev.
- (−) Contributors need Docker installed.
- Scope guard: keep the OSS Docker setup **dev-parity only** — do not gold-plate it into a
  prod-grade deploy; that belongs in the private repo.

## Sequencing note (tentative)

A **learning content management system (LCMS)** — content management plus learning history —
may be built as a **separate open-source project** and integrated into this starter kit
afterwards. Valery may switch to build it first, but only **after the admin panel is
decided and tested here** (feature `001-foundation-skeleton`). Not yet a committed
decision; this gates how/when the core library work begins.

**Ownership boundary** (decided 2026-06-09 — revised; supersedes the earlier split): the **LCMS
(the `lyceum` engine) owns the entire learning-management domain and content, top-to-bottom** —
courses as content (course → units → lessons → interactive H5P content), the catalog, assessments
and grading, enrollment, progress, completion, certificates, and learning history (xAPI / LRS).
**This kit owns only the non-learning top layer**: authentication, user management, and the glue
that wires everything together — the admin shell, Docker dev parity, and mounting Lyceum's handlers.
The kit remains the **persistence owner via adapters** (it implements Lyceum's storage ports against
Payload/Postgres and supplies user identity), but the learning domain and its rules live in Lyceum,
not here — a thin "wired system of open sources, ready for quick customization and deployment."
See `lyceum/specs/adr/0001-integration-architecture.md` for the full integration architecture.

## Open questions (carried forward)

- ~~Where the core library lives — monorepo package alongside the Payload app?~~ **Resolved:**
  the core library is the separate `lyceum` engine (its own repo under the org), consumed as a
  dependency — not a package inside this kit. See `lyceum/specs/adr/0001-integration-architecture.md`.
- The **entire learning-management domain** (courses/content, catalog, assessments, enrollment,
  progress, completion, certificates) and learning records (xAPI / LRS) are **owned by Lyceum**, not
  this kit. This kit integrates Lyceum and provides auth, user management, persistence adapters, and
  the glue. Those terms enter this repo only as the host wiring that consumes Lyceum.
- Whether to vendor/learn from `payload-lms-plugin` or model collections from scratch.
- Hot-reload approach for the Payload/Next.js container (bind-mount vs watch).
- Whether to include a seed step / seed data in the compose flow.

## References

- Payload Blocks: https://payloadcms.com/docs/fields/blocks
- Payload access control: https://payloadcms.com/docs/access-control/overview
- Payload versions/drafts: https://payloadcms.com/docs/versions/overview
- Payload Local API: https://payloadcms.com/docs/local-api/overview
- Payload custom views: https://payloadcms.com/docs/custom-components/custom-views
- Payload joins Figma (MIT continuity): https://www.figma.com/blog/payload-joins-figma/
- Refine: https://github.com/refinedev/refine
- Directus v12 license change: https://directus.com/resources/directus-v12-license-change
