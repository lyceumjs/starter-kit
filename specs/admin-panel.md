# Admin Panel & Core Stack

Status: **Accepted**
Date: 2026-06-09

## Context

The LMS starter kit needs an open-source admin panel that will dictate our
backend and frontend framework choices. Requirements:

- Well-maintained and battle-tested.
- Full control / customizability — we don't want to build from scratch, but we want
  to own the UX (especially a bespoke course-builder).
- **Upstream-trackable**: consume as an npm dependency so framework-version updates can
  be fetched and merged quickly. Forking is acceptable only if customization demands it.
- **Commercially unrestricted** — this is the OSS base for a later private product, so
  the license must allow a private/closed commercial product with no revenue caps.
- Starts as a single-instructor platform with heavy automation (see [terms.md](terms.md)).

We also intend to build a separate, **database-agnostic LMS domain library**
(courses, enrollment, progress) that can integrate into any project. How that library
coexists with the admin panel is part of this decision.

## Options considered

| Option | Verdict | Why |
|---|---|---|
| **Payload CMS v3** | **Recommended** | MIT, Figma-backed, Next.js-native; bundles backend/auth/media/access-control/versions; Blocks field gives a course-builder nearly free. |
| **Refine** | Strong runner-up | MIT, headless React, max UI freedom, cleanest fit for the db-agnostic library — but you build backend/auth/media/API yourself (high from-scratch effort). |
| react-admin | Rejected | Solid, MIT core, 10yr agency-backed — but MUI-default (more to peel away) and same "bring your own backend" cost as Refine without the headless edge. |
| Strapi v5 | Rejected | MIT core but it's a CMS, not an app framework; owns your backend; granular RBAC/SSO/audit are EE-paywalled; friction modeling real LMS domain logic. |
| Directus | Rejected | **License**: as of v12 (May 2026) source-available (Monospace Sustainable Core License) — free only under $5M revenue / 50 employees, GPLv3 after 4 years. Commercial liability. Vue admin clashes with React. |
| AdminJS | Rejected | MIT and clean, but visibly stagnating (last release Jul 2025, nothing in 2026); CRUD-only, no course-builder paradigm. |
| Appsmith / ToolJet / Budibase | Rejected | Low-code internal-tool builders. Fine as an ops dashboard beside the LMS, wrong as the foundation of a code-first, long-lived, customizable product. |

## Decision

Build on **Payload CMS v3**. Resulting stack:

- **FE/Admin**: Next.js (App Router) + React — the Payload admin *is* our own `/app`.
- **BE**: Node.js, configured via TypeScript `payload.config`.
- **DB**: PostgreSQL — relational fits LMS data (courses/enrollments/progress/grades).
- **Consumed as an npm dependency** (not forked) → upstream updates pull cleanly.

### Rationale

- **Next.js-native** and RSC-first, matching our framework preference.
- **MIT + Figma-backed** — commercially unrestricted and sustainably maintained.
- **Course-builder nearly free** via the **Blocks field**: per-lesson heterogeneous,
  drag-reorderable content blocks (video / rich text / quiz / embed). Array fields
  handle ordered homogeneous lists (modules).
- **Roles** (student / instructor / admin) via collection-, document-, and field-level
  access functions.
- **Course publishing** via drafts + versions + autosave + scheduled publish
  (scheduled publish requires a running Jobs Queue / worker).
- **Extension seams**: the server-side **Local API** (direct DB access from RSC/route
  handlers) and fully custom admin views/routes for a bespoke course-builder screen.

## How the db-agnostic core library coexists

Accept up front: **Payload owns schema and persistence, non-negotiably.** A strict
ports-and-adapters design where "Payload is just one swappable adapter" fights the grain.

The workable, community-blessed pattern:

- The **library is a pure domain core** — entities, rules, calculations
  (`calculateProgress`, `canEnroll`, certificate eligibility) as pure TypeScript with
  **zero Payload imports**, fully unit-testable. Persistence is expressed as repository
  **ports** (interfaces).
- **Payload is a host that adapts to the core**: collections mirror the domain; hooks
  and a services layer are thin orchestrators that map Payload docs ↔ domain types and
  call the pure functions via the Local API.
- The core stays portable to any project; this starter is one host implementing the ports.

**Cost accepted**: double-modeling — domain entities defined once in the library and
again as Payload collections, mapped at the boundary; ongoing sync work, not free.

## Consequences

- (+) Fast, batteries-included, Next.js, MIT; course-builder via Blocks.
- (+) The reusable db-agnostic library survives as a pure core.
- (−) Lock-in to the Next.js / React / Node / Payload stack.
- (−) **No battle-tested LMS on Payload** — no official template or marquee case study;
  only two immature reference repos (`superwebpros/payload-lms-plugin` ~9★;
  `guillermoscript/lms`). We are trailblazing (which is the point of this starter).
- (−) Scheduled publish needs a Jobs Queue/worker wired up.
- (−) Double-modeling cost between domain entities and Payload collections.

## Open questions

- Where the core library lives — monorepo package alongside the Payload app? — and its
  first API surface.
- **H5P** integration approach (xAPI / LRS) — separate spec.
- Whether to vendor/learn from `payload-lms-plugin` or model collections from scratch.

## References

- Payload Blocks: https://payloadcms.com/docs/fields/blocks
- Payload access control: https://payloadcms.com/docs/access-control/overview
- Payload versions/drafts: https://payloadcms.com/docs/versions/overview
- Payload Local API: https://payloadcms.com/docs/local-api/overview
- Payload custom views: https://payloadcms.com/docs/custom-components/custom-views
- Payload joins Figma (MIT continuity): https://www.figma.com/blog/payload-joins-figma/
- Refine: https://github.com/refinedev/refine
- Directus v12 license change: https://directus.com/resources/directus-v12-license-change
