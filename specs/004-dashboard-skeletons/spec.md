# Feature Specification: Student & Instructor Dashboard Skeletons

**Feature Branch**: `004-dashboard-skeletons`

**Created**: 2026-07-15

**Status**: Draft

**Input**: User description: "004 - let's make the skeletons for student and instructor
dashboards, the basic functional with auth and stuff. i think on BE we can have a unified
auth for all roles, only on fe the page is different"

This is the dashboard-skeleton feature the 003 roadmap reserved: after the pure engine
integration (no UI), this feature builds the frame the course functional will live in —
the student dashboard and the instructor dashboard as authenticated, navigable shells,
delivered together per the parity rule. Authentication is unified on the backend: one
account system and one sign-in flow for every role; only the destination differs by
role. No course functional ships here — authoring and learning arrive in later
features, inside these skeletons. The feature's one public surface is the course
catalog page, rendering the published-course list the 003 integration exposes.

## Clarifications

### Session 2026-07-15

- Q: What do the dashboard skeleton sections show at launch? → A: Pure placeholders —
  empty labeled frames; no live data inside the dashboards.
- Q: Does 004 include a public anonymous surface? → A: Yes — a public course catalog
  page that fetches the published-course list from the platform's catalog read. The
  catalog is public anyway and equally useful to signed-in students; later features
  may enrich it with per-student data, saved filters, or customized search. At this
  stage it is just the public list page.
- Q: Which navigation sections form each skeleton? → A: Student: My learning · Course
  catalog · Account (identity + sign-out). Instructor: My courses · Account.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - One sign-in for every role, role-aware landing (Priority: P1)

Any account holder — Student, Instructor, or Admin — signs in through the platform's
single sign-in surface, with the same flow for everyone. The platform recognizes the
account's role and lands each user where they belong: Students on the student
dashboard, Instructors on the instructor dashboard, Admins on the admin panel. There
are no per-role sign-in pages. Signing out returns to the public side.

**Why this priority**: the unified entry is the feature's backbone — neither skeleton
is reachable without role-aware sign-in, and it retires 002's post-login placeholder.

**Independent Test**: sign in as each seeded role through the same sign-in surface and
observe three different, correct destinations; sign out and verify the session ends.

**Acceptance Scenarios**:

1. **Given** a seeded Student, **When** they sign in through the unified sign-in,
   **Then** they land on the student dashboard.
2. **Given** a seeded Instructor (either access level), **When** they sign in through
   the same surface, **Then** they land on the instructor dashboard.
3. **Given** the seeded Admin, **When** they sign in through the same surface, **Then**
   they land on the admin panel.
4. **Given** wrong credentials, **When** sign-in is attempted, **Then** corrective
   feedback is shown and no session is created.
5. **Given** an email/password account with unverified email, **When** sign-in is
   attempted, **Then** it stays blocked until verification (002 rule intact).
6. **Given** any signed-in user, **When** they sign out, **Then** they are back on the
   public side and no dashboard is reachable until they sign in again.

---

### User Story 2 - Student dashboard skeleton (Priority: P2)

A signed-in Student lands on the student dashboard: a persistent shell with
navigation, a clear indication of who is signed in, and sign-out. Its sections are the
frame that later features fill with the learning experience; in this feature they are
placeholders, and the Course catalog entry opens the public catalog page (User
Story 5).

**Why this priority**: the student shell is the destination that makes US1 meaningful
for the platform's largest audience, and the surface every student-facing feature
after this one builds into.

**Independent Test**: sign in as a seeded Student, walk every navigation entry, verify
each section renders its defined skeleton state, sign out.

**Acceptance Scenarios**:

1. **Given** a signed-in Student, **When** the dashboard loads, **Then** navigation,
   the signed-in identity, and sign-out are present.
2. **Given** the dashboard, **When** each navigation entry is opened, **Then** its
   section renders in its defined skeleton state — no dead links, no errors.
3. **Given** a Student signing in, **When** they land, **Then** the destination is the
   student dashboard — the 002 placeholder page no longer exists as a destination.

---

### User Story 3 - Instructor dashboard skeleton (Priority: P2)

A signed-in Instructor lands on the instructor dashboard: a lean shell (per the
accepted instructor-UX rule) with navigation, signed-in identity, and sign-out. Its
sections are the frame the course-creation functional will fill next.

**Why this priority**: equal in rank to US2 — the parity rule makes the two shells one
unit of work; neither ships without the other.

**Independent Test**: sign in as a seeded Instructor, walk every navigation entry,
verify each section renders its defined skeleton state, sign out.

**Acceptance Scenarios**:

1. **Given** a signed-in Instructor, **When** the dashboard loads, **Then** navigation,
   the signed-in identity, and sign-out are present.
2. **Given** the dashboard, **When** each navigation entry is opened, **Then** its
   section renders in its defined skeleton state — no dead links, no errors.
3. **Given** the dashboard, **When** its surface is inspected, **Then** it carries only
   the agreed sections — no extra buttons, tabs, or on-screen information (lean
   instructor UX).

---

### User Story 4 - Dashboard access boundaries (Priority: P3)

The dashboards respect the 002 access model. Anonymous visitors deep-linking a
dashboard address are sent to sign-in and, after signing in, continue to where they
were headed when their role permits it. Students cannot open the instructor dashboard.
Admins and Instructors remain unrestricted on the student-facing side.

**Why this priority**: extends already-enforced 002 rules to the new surfaces; the
rules themselves are the prior feature's work.

**Independent Test**: request dashboard addresses anonymously and cross-role, and
verify each is admitted or turned away exactly per the access rules.

**Acceptance Scenarios**:

1. **Given** an anonymous visitor, **When** they request any dashboard address,
   **Then** they are sent to sign-in, and after signing in with a permitted role they
   arrive at the originally requested destination.
2. **Given** a signed-in Student, **When** they request an instructor dashboard
   address, **Then** it is denied without exposing any of its content, and they are
   taken to their own dashboard.
3. **Given** a signed-in Instructor or Admin, **When** they visit the student-facing
   side, **Then** they are not restricted (002 continuity).
4. **Given** any signed-in user, **When** they open the sign-in page, **Then** they are
   taken to their role's landing instead of being asked to sign in again.

---

### User Story 5 - Public course catalog page (Priority: P3)

Anyone — an anonymous visitor or any signed-in user — opens the public catalog page
and sees the published courses as summaries, newest first, fetched live from the
platform's catalog. At this stage it is one and the same page for everyone; enriching
it with per-student data, saved filters, or customized search is a later feature.

**Why this priority**: the feature's one live-data surface, giving the accepted access
shape ("everyone sees courses") its first real page; small next to the shells.

**Independent Test**: on a freshly seeded environment, open the catalog page
anonymously and verify exactly the seeded published courses appear, newest first; open
it from a Student's dashboard and verify it is the same page.

**Acceptance Scenarios**:

1. **Given** seeded courses in every state, **When** the catalog page is opened —
   anonymously or signed in — **Then** only published, non-archived courses appear as
   summaries, newest first (003 rules rendered faithfully).
2. **Given** a platform with no published courses, **When** the catalog page is
   opened, **Then** a normal empty state is shown, not an error.
3. **Given** a signed-in Student, **When** they open the Course catalog entry on their
   dashboard, **Then** they reach this same public catalog page.

---

### Edge Cases

- An Admin changes an account's role (or instructor access level) while that user has
  an active session → the new role governs from the next request/navigation on; no
  live-session migration is promised, but server-side checks never honor the old role
  on a new request.
- A deep link to a dashboard section that doesn't exist → a normal not-found state
  inside the shell, not a blank or broken page.
- Google sign-in still unconfigured (002) → the option stays unavailable on the unified
  sign-in; email/password is unaffected.
- A user whose sign-in was interrupted (e.g. verification pending) retries → the same
  corrective feedback every time; no half-signed-in state reaches any dashboard.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: One account system MUST serve all roles with a single sign-in flow — the
  same surface and the same credential handling for every role; no separate per-role
  sign-in. Roles differ only in what they reach after signing in.
- **FR-002**: The system MUST land each signed-in account by role: Student → student
  dashboard, Instructor → instructor dashboard, Admin → admin panel. One role per
  account (002) keeps the destination unambiguous.
- **FR-003**: The student dashboard and the instructor dashboard MUST exist as
  authenticated shells: persistent navigation, signed-in identity display, and
  sign-out. Navigation sections: Student dashboard — My learning, Course catalog,
  Account; Instructor dashboard — My courses, Account. Account carries the signed-in
  identity and sign-out only (no account-management screens).
- **FR-004**: The instructor dashboard MUST stay lean (accepted instructor-UX rule):
  only the agreed sections, with no additional buttons, tabs, or on-screen information
  beyond them.
- **FR-005**: Skeleton sections MUST render as placeholders — empty labeled frames
  with no live data inside the dashboards. The Course catalog entry differs only by
  destination: it leads to the public catalog page (FR-006) rather than holding data
  itself.
- **FR-006**: The feature MUST include a public course catalog page rendering the
  published-course list from the platform's existing catalog read (003) — summaries,
  newest first — reachable by anyone, anonymous or signed in; the student dashboard's
  Course catalog entry leads to it. It is a plain list page: no per-student data,
  saved filters, search, or navigable course pages yet.
- **FR-007**: Dashboard access MUST be enforced server-side (002 continuity): the
  instructor dashboard is reachable by Instructors and Admins only; the student
  dashboard requires a signed-in account; Admins and Instructors remain unrestricted
  on the student-facing side.
- **FR-008**: An anonymous request for any dashboard address MUST redirect to sign-in
  and, after successful sign-in, continue to the originally requested destination when
  the role permits it — otherwise to the role's own landing.
- **FR-009**: Sign-out MUST be available from both dashboards and MUST end the session;
  afterwards no dashboard address is reachable without signing in again.
- **FR-010**: Student self-registration and verification rules (002) continue
  unchanged; a newly verified Student's first sign-in lands on the student dashboard.
  The 002 post-login placeholder page is retired in favor of the student dashboard.
- **FR-011**: This feature MUST NOT ship any course functional: no authoring
  operations and no enrollment/progress/learning actions on either dashboard. The
  course-creation functional is the next feature and lands inside these skeletons —
  instructor and student sides together (parity rule).
- **FR-012**: The dev seeder MUST make both dashboards click-testable on a fresh
  environment: sign-in-ready accounts for every role (including both instructor access
  levels) with known dev credentials, plus the published courses the catalog page
  renders (reusing the 003 seed).
- **FR-013**: Every 002 access/workflow rule and every 003 behavior MUST hold
  unchanged after this feature — the skeletons add surfaces, not rule changes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Each seeded role, using the same sign-in surface, reaches its correct
  landing on the first attempt — three roles, three destinations, zero cross-role
  mix-ups.
- **SC-002**: 100% of dashboard requests outside a role's boundary (anonymous or
  wrong-role) are denied or redirected without exposing any dashboard content.
- **SC-003**: On a freshly seeded environment, a full click-through of both
  dashboards — sign in, visit every navigation section, sign out — completes with zero
  errors, dead links, or manual data setup.
- **SC-004**: A visitor who self-registers as a Student reaches the student dashboard
  on their first sign-in in under 2 minutes excluding inbox wait (002 continuity, new
  destination).
- **SC-005**: Zero regressions: every 002 and 003 success criterion still passes after
  this feature.
- **SC-006**: On a freshly seeded environment, the catalog page opened anonymously
  lists 100% of the seeded published courses and nothing else, newest first.

## Assumptions

- Feature 003 (engine integration, operation surface, seeder) is in place before this
  feature starts; the skeletons consume its surface and never re-implement it.
- "Unified auth on the BE" confirms what 001/002 already established — one account
  system for all roles. This feature unifies the entry experience (one sign-in surface
  with role-aware landing); it does not rebuild authentication.
- The Admin's working home remains the existing admin panel; no admin dashboard
  skeleton is built. The admin panel is the unified sign-in's Admin destination.
- Google sign-in remains as 002 left it: available only once credentials are
  configured; the unified sign-in offers it only when available.
- Account-management screens (profile editing, password change/reset) are not part of
  the skeletons; the shells carry identity display and sign-out only.
- A skeleton is a navigable structure, not final visual design; styling and branding
  iterate with later features.
- No new stored data is introduced; the dashboards render existing account and course
  data only.
- The catalog page consumes the 003 catalog read as-is — summaries, newest first;
  pagination, search, and filtering stay deferred (003), at single-instructor volumes.

## Out of Scope

- The course-creation functional and any authoring operations in the UI — the next
  feature, instructor and student sides together (parity rule).
- Enrollment, the learning experience/player, progress, certificates.
- Per-student catalog enrichment — personal data, saved filters, customized search
  (recorded as the catalog page's future direction).
- Course detail / outline pages: the catalog page lists summaries; navigable course
  pages arrive with the course functional.
- Review-queue / approval UI (still deferred from 002).
- Account-management screens (profile edit, password change/reset).
- Paid vs free course tiers (separate later feature).
- Any change to roles, the approval flow, sign-up rules, or 003 engine behavior.
- Visual design polish and branding beyond a clean, navigable skeleton.
