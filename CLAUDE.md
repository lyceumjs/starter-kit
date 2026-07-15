See [specs/terms.md](specs/terms.md) for shared terminology.

## Authorship & how the agent works here

- Valery is the decision-maker and sole author of all specs and decisions: business,
  domain logic, tech stack, and architecture. The agent does web research, coding
  support, and clearly-labelled recommendations — it does not decide.
- Persist to specs only what Valery has stated or explicitly accepted. Never save
  unclear, assumed, or unconfirmed content; propose in chat and wait for acceptance.
- Terms are Valery's; add one only when he states or accepts it.
- Keep specs and this file thin and non-repeating — avoid context bloat.

## Lyceum engine vs. this host (ownership boundary)

This project (`lms-starter-kit`) is a **host/wrapper** around the Lyceum LMS engine
(`@lyceumjs/lms`, repo `~/oss/lyceum-lms`, org `lyceumjs`). Lyceum is the open-source,
database-agnostic, H5P-based LMS engine; this kit is the thin wrapper that runs the
**teacher/student dashboards + admin shell**, owns **auth and user management**, and
supplies the **glue**. The boundary is fixed by Lyceum's **ADR 0001** (accepted 2026-06-09)
and Principle III of the constitution.

- **Lyceum owns the entire learning domain and content**, top to bottom: courses as
  content (course → units → lessons → interactive H5P content), catalog, assessments &
  grading, enrollment, progress/completion, certificates, learning history (xAPI/LRS), the
  H5P runtime, and the FE content components.
- **This host owns only** the non-content layer: authentication, account management and
  roles/access control, the dashboard/admin UI, Dockerized dev parity, and the integration
  glue — implementing Lyceum's storage **ports as Payload/Postgres adapters**, supplying
  **identity**, and **mounting** Lyceum's framework-agnostic handlers onto Next.js routes.
  Lyceum computes; this host stores (persistence owner via adapters).

**Decision rule — where does a change go?**
- Learning content, course/lesson structure, H5P, catalog, enrollment, progress, grading,
  certificates, or learning records → **change Lyceum**, then consume the new version here.
- Sign-in / roles / permissions, account management, the dashboards/navigation, or the
  Payload adapter and route-mounting that connect the two → **change this host**.
- Default to Lyceum when unsure — the host stays thin (ADR 0001). Flag it, don't guess.

Note: the host may still hold Payload collections that **mirror** Lyceum's domain for
persistence (the accepted double-modeling in ADR 0001) — e.g. the 002 `courses` collection.
Mirroring for storage/access is host work; the domain rules themselves live in Lyceum.

## Configuration & env

- Maintain `.env.example` alongside the specs as decisions land. Every config parameter
  decided in a spec MUST appear in `.env.example` (documented, with a safe placeholder or
  dev-only default — never a real secret). Update it in the same pass that records the
  decision.

## Verifying changes on the local env

The app runs Dockerized on `http://localhost:${APP_PORT}` (default `3021`). A change is
not "done" until it has been exercised against that running app — not just tests/typecheck.

- **Frontend change** (anything under `src/app/(frontend)/` — pages, components, styles):
  smoke-test it in a real browser (Playwright MCP), driving the actual flow and checking
  the rendered result + console. HTTP-status curls do not count — they run no JS, so they
  never exercise client components, forms, or styling.
- **Backend/API change** (collections, access, hooks, endpoints, `payload.config.ts`):
  curl the affected endpoint(s) against the running app to confirm status codes and
  payloads, in addition to `make test`.
- Restart the app first when the change touches Payload config or collections
  (`docker compose restart app`); pages/styles hot-reload on their own.

## Course functional: parity, seeding, instructor UX (accepted 2026-07-15)

- **Instructor/Student parity**: the instructor side and the student side of the same
  course functional are one unit of work — BE and UI together, never developed
  separately. Nothing ships on the instructor side without its student-side counterpart
  working (e.g. a new exercise type lands only together with its student player and its
  UI/UX, drag-and-drop or whatever is decided). An authoring capability students can't
  consume is the critical failure mode this rule exists to prevent. Both dashboards get
  click-through tested (Playwright) as part of "done".
- **Dev seeder**: local/dev always carries a full course seeder (`src/seed/`) covering
  the entire functional surface — every role, course state, structure level, and content
  type — so the whole FE can be clicked through end to end on a fresh environment.
  Extending the seeder is part of the same change that adds functionality. Valery is the
  technical tester and click-tests the instructor and student dashboards himself.
- **Instructor UX**: the authoring dashboard stays lean — do not overload instructors
  with buttons, tabs, or on-screen information. Making the instructor's life easier is a
  delivery requirement, not a polish item.
- **Access shape**: everyone sees courses (public catalog and outline); the content
  inside a course is Student-level (signed-in) access. Paid vs free course tiers are a
  separate later feature.

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
at specs/004-dashboard-skeletons/plan.md
<!-- SPECKIT END -->
