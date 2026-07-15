# Feature Specification: Lyceum Course Authoring & Catalog Integration

**Feature Branch**: `003-lyceum-course-integration`

**Created**: 2026-07-15

**Status**: Draft

**Input**: User description: "Integrate the Lyceum engine's course authoring & catalog
domain (lyceum-lms feature 003) into this host: consume the new @lyceumjs/lms version,
implement its storage ports as Payload/Postgres adapters, mount its framework-agnostic
handlers on Next.js routes, and expose course authoring and catalog through the host UI
under the existing 002 roles/access rules."

This feature is the "later course-management feature" that 002's data model reserved:
the minimal course record grows into the full Lyceum course structure, and the catalog
becomes readable. Per ADR 0001 (Lyceum) and Principle III, the engine owns the course
domain rules; this host persists the data, supplies identity/permissions, and exposes
the operations. The engine has no notion of drafts, publication, roles, or ownership —
all visibility and access decisions remain this host's (feature 002) responsibility.

**This feature ships no UI.** Its deliverable is the correct integration of the engine:
package consumption, persistence, operation surface (API), and access gating. The
roadmap after it: the next feature creates the student and instructor
dashboard skeletons, and only after that does course-creation work begin — always with
both sides shipped together, per the instructor/student parity rule (`CLAUDE.md`).

## Clarifications

### Session 2026-07-15

- Q: What does the signed-in student experience include in this feature? → A: None —
  no student experience for now.
- Q: With the student experience out, what remains in scope? → A: Pure integration, no
  UI: package consumption, storage adapter, engine wiring, API routes gated by 002
  rules, extended seeder, tests. Instructor and student UI arrive together in a later
  feature (parity rule). This supersedes the earlier authoring-surface decision — the
  dedicated instructor dashboard moves to that later UI feature.
- Author roadmap note: the next spec (004) creates the skeletons for the student and
  instructor dashboards; course-creation work starts only after that.
- Q: What happens when a course with a pending review is archived? → A: (lifecycle
  changed) A never-published course — draft or pending review — can be deleted; a
  published course can never be deleted, only archived.
- Q: Does "published can never be deleted" mean ever-published or currently published?
  → A: Ever-published is permanent. Moreover, unpublishing is removed entirely —
  students who learned a course would lose their track/statistics — so publishing is
  one-way and archive is the only withdrawal. This supersedes 002's unpublish
  transition (T6).
- Q: Archiving a published course that has a pending review? → A: Archive voids the
  review — no decision recorded, the draft edits stay saved; after restore the author
  resubmits normally.
- Author note on archive semantics: archiving only removes a course from the public
  page (catalog) so no new students can enroll; students already enrolled keep access
  to it forever. Enrollment is a later feature — the rule is recorded here as binding
  for it; in this feature (no enrollment yet) archiving removes all student-level
  access.
- Q (post-analysis): Is the slug optional? → A: No — the slug is required. It is
  suggested from the course name by a small transformation module (there are custom
  rules, so the transform is isolated in its own module); the suggestion lives on the
  FE during creation (next feature) and the user can edit it freely. Requiredness also
  guarantees every published course is publicly addressable by slug.
- Q (post-analysis): Does this feature ship the demo seeder? → A: No — demo seeding
  moves to the next specs; it remains part of the overall MVP, just not of this spec.
  Only the existing Admin bootstrap seed stays.
- Q (post-analysis): What does restoring an archived-while-pending course return to?
  → A: The previous state — published restores to published, draft to draft, pending
  to draft (draft = approval not requested yet, pending = in review; the voided review
  is not reinstated, the author resubmits).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Instructor assembles a full course (Priority: P1)

An Instructor, through the host's authenticated course operations, creates a course
with its descriptive information (title, description, web address slug, cover image)
and builds its structure: units, lessons inside units, and content placeholders inside
lessons. They can rename, reorder, and remove any of these parts. Everything happens on
their own courses only, and the 002 publication workflow is untouched: the structure
they build is draft content until published, and a standard-level Instructor's publish
still goes through Admin review.

**Why this priority**: Course structure is the entire point of the integration — without
authoring there is nothing to catalog. It also proves the engine/host contract
end-to-end (engine rules, host persistence, host access gates).

**Independent Test**: As an authenticated Instructor, create a course, add units/
lessons/content placeholders, rename and reorder them, and re-read the course to see
the exact structure preserved. Deliverable value: a fully structured draft course.

**Acceptance Scenarios**:

1. **Given** an authenticated Instructor, **When** they create a course with a title,
   slug, and description, **Then** the course exists as their own draft with an empty
   structure; **When** they create one without a slug, **Then** it is rejected as
   invalid input.
2. **Given** their course, **When** they add units and lessons and reorder them,
   **Then** re-reading the course shows the identical structure and order.
3. **Given** a lesson, **When** they attach a content placeholder (title plus optional
   external content id), **Then** it appears in the lesson; removing it removes only
   that placeholder.
4. **Given** a course with an empty title edit, a duplicate slug, or a reorder list
   that doesn't match the existing items, **When** the operation is submitted, **Then**
   it is rejected with corrective feedback and nothing is saved.
5. **Given** another Instructor's course, **When** an Instructor attempts any authoring
   operation on it, **Then** the operation is denied (own-content model, 002).
6. **Given** a standard-level Instructor's published course, **When** they edit its
   structure and publish, **Then** the changes enter pending review and readers keep
   seeing the previously approved version (002 workflow, now covering structure).

---

### User Story 2 - Catalog and published course reads (Priority: P2)

Anyone — anonymous or authenticated — can read the catalog: published, non-archived
courses as summaries (title, description, cover image, unit/lesson counts), newest
first. The outline of a published course (its unit and lesson titles) is likewise
publicly readable; the content entries inside lessons require a signed-in account.
Draft, pending-review, and archived content is never exposed, no matter how it is
addressed.

**Why this priority**: The catalog is the read-side proof of the integration and the
data source for the upcoming student-facing UI; it depends on US1 existing but is
independently verifiable.

**Independent Test**: Create courses via the API and leave them in published, draft,
pending, and archived states; read the catalog anonymously and verify only the
published ones appear, newest first; verify a draft course is not retrievable by id or
slug; verify lesson content entries require authentication while the outline does not.

**Acceptance Scenarios**:

1. **Given** published, draft, pending-review, and archived courses, **When** the
   catalog is read — authenticated or not — **Then** only the published, non-archived
   courses appear, ordered newest first.
2. **Given** an empty platform, **When** the catalog is read, **Then** an empty catalog
   is returned without error.
3. **Given** a published course, **When** it is read anonymously, **Then** its summary
   and outline (unit and lesson titles) are returned, and its lesson content entries
   are not; **When** it is read by any signed-in account, **Then** the content entries
   (titled placeholders) are included exactly as authored.
4. **Given** a draft, pending-review, or archived course, **When** it is requested
   directly by id or slug, by an anonymous visitor or a Student, **Then** it is not
   exposed (002 rule, now including slug lookups).
5. **Given** a course pending review on top of a published version, **When** the
   catalog or the course is read, **Then** the previously approved content is what is
   returned.

---

### User Story 3 - Course lifecycle: delete drafts, archive published (Priority: P3)

A never-published course (draft or pending review) can be deleted by its author or an
Admin. Once a course has been published, its record is permanent: it can never be
deleted, and it cannot be unpublished — publishing is one-way, because students who
learned it must not lose their track. The only withdrawal for an ever-published course
is archiving: it leaves the catalog so no new students can find or start it, all data
is retained, and any pending review is voided (no decision recorded; the draft edits
stay saved). Students already enrolled keep access to an archived course forever — a
rule that activates with the future enrollment feature; in this feature, with no
enrollment yet, archiving removes all student-level access. Restoring an archived
course returns it to the state it was archived from. (Parts of a course — units,
lessons, content placeholders — remain freely removable by their author as ordinary
authoring, per User Story 1.)

**Why this priority**: Completes the course lifecycle; low volume compared to creation
and reading.

**Independent Test**: Delete an own never-published draft and verify it is gone;
archive a published course and verify it leaves the catalog with its data intact;
restore it and verify it is published again without any re-approval.

**Acceptance Scenarios**:

1. **Given** a published course, **When** an authorized actor archives it, **Then** it
   disappears from the catalog and all student-level access, and all of its data is
   retained.
2. **Given** a published course with a pending review, **When** it is archived,
   **Then** the review is voided with no decision recorded and the draft edits remain
   saved; after restore, the author may resubmit normally.
3. **Given** an archived course, **When** it is restored, **Then** it returns to the
   state it was archived from — a published course is published (and in the catalog)
   again, a never-published one is a draft again.
4. **Given** a course, **When** an actor without archive permission attempts to archive
   or restore it, **Then** the operation is denied and the course is unchanged.
5. **Given** their own never-published course (draft or pending review), **When** the
   author (or an Admin) deletes it, **Then** it is removed entirely and its slug
   becomes available again.
6. **Given** an ever-published course and any actor including an Admin, **When**
   deletion or unpublishing is attempted, **Then** no such operation exists on any
   surface.

---

### Edge Cases

- Slug uniqueness is platform-wide: a slug conflict on create or edit is rejected as a
  conflict, and nothing is saved.
- Two authors (or two sessions) edit the same course concurrently: last write wins —
  no locking or merge is promised; a reorder based on a stale structure is rejected
  because it no longer matches the existing items.
- A course with no units, or units with no lessons, is valid and is returned as such.
- Cover image is an opaque reference supplied by the host; a course without one is
  valid everywhere course data is returned.
- An archived course keeps its slug (course records are permanent), so the slug stays
  reserved platform-wide; a new course cannot claim it.
- Content placeholders reference interactive content by an opaque external id; no
  validation or playback of that content happens in this feature.
- Every write path that touches course data (including the admin area) honors the same
  engine rules — no path may store a course the engine would reject.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The course record MUST carry full course information (title and web
  slug, required; description and cover image, optional; creation date) and the full
  structure: ordered units, each with ordered lessons, each with ordered content
  placeholders — while preserving the 002 publication workflow (draft / pending review /
  published with Admin approval) over the whole course, structure included.
- **FR-002**: Authors MUST be able to perform every structural authoring operation
  through the host's authenticated operation surface: create a course, update its
  information, add/rename/reorder/remove units and lessons, and attach/remove content
  placeholders. Deleting a course exists only while it has never been published
  (FR-012).
- **FR-003**: The engine's domain rules MUST be authoritative and enforced on every
  write path: titles non-empty at every level, slugs well-formed and unique
  platform-wide, reorder lists an exact permutation of what exists, targeted items must
  exist, and a failed operation MUST leave stored data unchanged.
- **FR-004**: Rejected operations MUST yield distinguishable outcomes callers can act
  on: invalid input (correctable feedback), missing target (not found), duplicate slug
  (conflict).
- **FR-005**: The host MUST expose a catalog read listing only published, non-archived
  courses, as summaries (title, description, cover image, unit and lesson counts,
  creation date), ordered newest first; an empty catalog is a normal, non-error state.
- **FR-006**: Draft, pending-review, and archived course content MUST never be exposed
  to Students or anonymous visitors by any access path — listing, direct id, or slug
  lookup — and a pending edit MUST leave the previously approved version live (002
  continuity, FR-009 there).
- **FR-007**: All 002 access rules MUST apply unchanged to every course operation:
  Instructors author their own courses only, Admins everything; approval remains
  Admin-only; the engine itself makes no access decisions, so no operation may reach it
  without the host's authorization having passed.
- **FR-008**: Course data written through authoring MUST read back identically —
  structure, order, and every information field survive a save/reload round trip.
- **FR-009**: The host MUST consume the current Lyceum engine release (the one
  containing the course authoring & catalog domain); the stale pre-003 engine package
  MUST be replaced as part of this feature.
- **FR-010**: This feature ships NO user interface. Authoring, catalog, and lifecycle
  operations are exposed only as host routes (authenticated where required, public for
  the catalog and published outlines). UI follows in later features: dashboard
  skeletons first, then the course-creation functional — instructor and student sides
  always together, per the parity rule.
- **FR-011**: The catalog read and the outline of published courses MUST be publicly
  readable — anonymous visitors and signed-in users of any role.
- **FR-012**: Once a course has ever been published, its record is permanent: neither
  deletion nor unpublishing exists for it, for any role — publishing is one-way. Its
  only withdrawal is archiving: the course leaves the catalog (no new students can
  find or start it) and — in this feature, where enrollment does not exist yet — all
  student-level access; all data is retained; any pending review is voided with no
  decision recorded and the draft edits kept. Restoring returns the course to the
  state it was archived from, with no re-approval. Binding rule for later features:
  students already enrolled in a course keep access to it forever, archived or not.
  Never-published courses (draft or pending review) MAY be deleted by their author or
  an Admin; deletion frees the slug.
- **FR-013**: Content inside a course beyond the public outline MUST require a
  signed-in account (Student-level access): anonymous reads of a published course
  receive its summary and outline but not its lesson content entries. Finer gating
  (enrollment, paid vs free) is a later feature.
- **FR-014**: Demo seeding is DEFERRED out of this feature (author decision
  2026-07-15, post-analysis): the full demo seeder moves to the next specs and remains
  part of the overall MVP there; this feature keeps only the existing Admin bootstrap
  seed unchanged. Validation actors/data are created through the API itself.
- **FR-015**: As the parity-rule guard, this feature MUST NOT introduce any
  instructor-facing UI capability: UI for authoring and for student consumption lands
  together in the dedicated UI feature, never one side alone.
- **FR-016**: The host MUST provide a small, isolated name→slug transformation module
  (the custom rules live in one place; output always satisfies the engine's slug
  format) — consumed by the creation UI in the next feature, where the suggestion is
  prefilled from the course name and freely editable by the user.

### Key Entities

- **Course**: the 002 course record extended with descriptive information (description,
  required slug, cover image reference, creation date), the structural aggregate below, and an
  archived flag. Still owned by its author, still versioned draft/published, still
  subject to review state; permanent once ever published, deletable only before.
- **Unit**: an ordered, titled section of a course; contains lessons.
- **Lesson**: an ordered, titled step inside a unit; contains content placeholders.
- **Content placeholder**: a titled reference inside a lesson pointing to future
  interactive content by an opaque external id; no content behavior in this feature.
- **Catalog entry (course summary)**: the derived public shape of a published course —
  title, description, cover image, unit/lesson counts, creation date. Never stored,
  always derived.
- **Review decision**: unchanged from 002.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An Instructor can, through the host's authenticated operations, create a
  course and assemble a structure of at least 3 units and 9 lessons, and re-reading it
  returns 100% of that structure intact.
- **SC-002**: 100% of invalid authoring operations (empty title, malformed or duplicate
  slug, stale reorder, missing target) are rejected with feedback that names the
  problem, and stored course data is byte-for-byte unchanged afterwards.
- **SC-003**: Zero draft, pending-review, or archived course content is reachable by
  Students or anonymous visitors across all access paths (catalog, direct id, slug),
  and zero lesson content entries are reachable anonymously.
- **SC-004**: A course approved for publication appears in the catalog on the next
  catalog read, in newest-first position, with correct summary fields.
- **SC-005**: Every 002 access and workflow rule still holds after this feature — no
  regression in any previously specified behavior.
- **SC-006**: Archiving a published course removes it from the catalog on the next
  read with 100% of its data retained; restoring brings it back to the catalog
  unchanged, with no re-approval.

## Assumptions

- The existing 002 course record is extended in place to carry the full structure (the
  accepted double-modeling of ADR 0001); no second course store is introduced.
- The 002 publication workflow versions the course as a whole, so structural edits ride
  the same draft/pending/published lifecycle with no new workflow states.
- The engine deliberately has no draft/publish/visibility state; what the catalog may
  see is decided entirely by this host before data reaches the engine (Lyceum 003).
- Concurrent edits resolve last-write-wins; locking and merge are out of scope (engine
  semantics).
- Cover images reuse the host's existing media handling and reach the engine only as an
  opaque reference.
- Content placeholders are not validated against any interactive-content store in this
  feature (Lyceum 003 keeps them opaque).
- The catalog needs no pagination, search, or filtering yet (deferred by Lyceum 003 as
  well); volumes are single-instructor scale (constitution).
- The engine package is consumed as a vendored build of the sibling repository until a
  registry release exists.
- The engine's course-delete operation is exposed only for never-published courses
  (FR-012); no engine change is needed.
- This feature removes 002's unpublish transition (T6) — publishing is one-way per the
  clarifications; 002's other transitions and the approval flow are untouched.
- Archiving an ever-published course takes the actor set 002 gave unpublish: Admins
  and editor-level Instructors on their own courses, with no approval step. A
  never-published course may be archived — or deleted — by its author at any level, or
  an Admin. Restore follows the same permission as archive.
- Archived courses stay readable by their author and Admins through authoring reads
  (marked as archived), just not via the catalog or any student-level access.
- The slug is required at the host's operation surface; the engine keeps it optional
  internally (no engine change — the host enforces requiredness at its boundary). The
  name→slug transformation module (FR-016) ships here; the FE prefill/edit experience
  arrives with the creation UI in the next feature.
- The lesson-content gate is "any signed-in account" (all roles); enrollment-based and
  paid/free gating arrive in a later feature (author decision 2026-07-15).
- Content placeholders are returned as titled entries — nothing playable yet.
- The next feature (004) creates the student and instructor dashboard skeletons;
  course-creation UI work starts only after that. This feature's operation surface and
  seed data are designed to serve both.

## Out of Scope

- ALL user interface: the instructor dashboard, the student dashboard, catalog and
  course pages — the dashboard skeletons come in the next feature, course-creation UI
  after that, always both sides together (instructor/student parity rule).
- The full demo seeder — moved to the next specs (still part of the overall MVP;
  the project-wide seeder rule in `CLAUDE.md` resumes there). Only the existing Admin
  bootstrap seed ships here.
- Lesson playback and any interactive-content (H5P) authoring, validation, or runtime
  behavior — content placeholders only.
- Enrollment, progress, completion, certificates, assessments — later features.
- Review-queue / approval UI (still deferred from 002; approval continues to work as it
  does today).
- Catalog pagination, search, filtering, and categories.
- Co-authoring, ownership transfer, per-course permissions (002 out-of-scope carries
  over).
- Any change to sign-in, roles, or the approval flow. (The lifecycle changes recorded
  in Clarifications — unpublish removed, deletion restricted to never-published
  courses — are in scope; the approval mechanics themselves are not touched.)
- Permanent (hard) deletion of ever-published course records, for any role — archive
  is their only end-of-life state.
- Enforcing "enrolled students keep access to archived courses forever" — recorded as
  binding (FR-012) but enforceable only once the enrollment feature exists.
- Paid vs free course tiers, purchase flows, and enrollment-based content gating — a
  separate later feature (author decision 2026-07-15).
