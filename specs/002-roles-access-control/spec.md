# Feature Specification: Roles & Access Control

**Feature Branch**: `002-roles-access-control`

**Created**: 2026-07-02

**Status**: Draft

**Input**: User description (condensed): "Three roles: Admin, Instructor (teacher), Student.
MVP runs with one Instructor holding editor-level permissions — publishes courses and edits
everything without approval. Admin has overall access over the platform: all content, edit,
delete, approve courses. Future standard Instructors create a course, hit publish, and wait
for Admin approval; any subsequent course edit also requires Admin review (first phase, until
the exact review logic is decided). The approval flow must be there in the code, but the UI
isn't necessary. Students only access the student dashboard (learning platform): choose a
course from the list (free or paid), enroll, and complete it step by step — watch a video,
pass a quiz, read an article and mark completed."

## Clarifications

### Session 2026-07-02

- Q: How do Students get accounts in this feature? → A: Public self-signup on the
  student-facing platform now, plus sign-in with a Google account ("log in with Gmail").
  Google credentials will be provided by Valery later; until configured, Google sign-in
  stays unavailable while email/password signup works.
- Q: What happens while a standard-level Instructor's edit to a published course awaits
  review? → A: The previously approved version stays live for students; the pending
  changes become visible only upon Admin approval.
- Q: Does 002 include a minimal Course record? → A: Yes — a bare-bones course carrying
  the publication states (draft / pending review / published) so the approval flow is
  enforceable in code end-to-end within this feature; the later course-management
  feature extends it.
- Q: If someone uses Google sign-in with an email that already has an email/password
  account (or vice versa), what happens? → A: One account per email — email is the unique
  identity; Google sign-in with a matching email attaches to the existing account, usable
  via either method afterwards.
- Q: Must Students verify their email before their self-registered account becomes
  usable? → A: Yes for email/password sign-ups (verification required now); Google
  sign-ups skip verification since Google has already verified the email.
- Q: Does 002 ship a minimal student-facing UI? → A: Signup pages only — sign-up/sign-in
  pages plus a placeholder page after login. No course list/catalog UI until the
  learning-platform feature; course-visibility rules are still enforced and tested at the
  system level.
- Q: Should the system record approval decisions? → A: Minimal record — each
  approve/reject stores the decision, the deciding Admin, and a timestamp as the course's
  review history.
- Q: Can Admins and Instructors access the student-facing side? → A: Not restricted —
  access control gates only the admin/authoring area; Admins and Instructors may view the
  student-facing side (e.g., to preview courses as students see them).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin has full platform control (Priority: P1)

The Admin (seeded in feature 001) signs in to the admin panel, creates and manages user
accounts — Instructors (including their publishing access level) and Students — and has
unrestricted access to all content: view, edit, delete anything regardless of author, and
approve or reject courses submitted for review.

**Why this priority**: every other role's account is created by the Admin, and Admin
oversight is the safety net for the whole access model. Nothing else works without it.

**Independent Test**: sign in as the seeded Admin, create an Instructor account with an
access level, verify the Instructor can sign in; edit and delete content authored by others.

**Acceptance Scenarios**:

1. **Given** a signed-in Admin, **When** they create an Instructor account and set its
   publishing access level, **Then** that Instructor can sign in and holds exactly that role
   and level.
2. **Given** content authored by any Instructor, **When** the Admin edits or deletes it,
   **Then** the change applies with no ownership or review restriction.
3. **Given** a course pending review, **When** the Admin approves it, **Then** it becomes
   published; **When** the Admin rejects it, **Then** it returns to draft for revision.

---

### User Story 2 - Editor-level Instructor self-publishes (Priority: P1)

The MVP's single Instructor holds the **editor** access level: they create a course, hit
publish, and it is immediately live — no Admin approval. Edits to their already-published
courses also go live without review.

**Why this priority**: this is the MVP operating model — a single trusted instructor running
the platform day to day without Admin friction.

**Independent Test**: sign in as an editor-level Instructor, publish a course, verify it is
published with no pending-review step; edit it and verify the change applies directly.

**Acceptance Scenarios**:

1. **Given** a signed-in editor-level Instructor, **When** they publish a course, **Then**
   the course is immediately published with no approval step.
2. **Given** their published course, **When** they edit it, **Then** the changes apply
   without any review.
3. **Given** a signed-in editor-level Instructor, **When** they attempt to manage user
   accounts or platform settings, **Then** access is denied.

---

### User Story 3 - Student signs up and is confined to the learning platform (Priority: P2)

A visitor signs up on the student-facing side — with email/password or their Google
account — and becomes a Student. In this feature the student-facing surface is
sign-up/sign-in pages plus a placeholder page after login; the admin/authoring area is
off-limits, and only published courses are ever visible to a Student. (The catalog UI,
enrolling, and completing courses — video, quiz, article — are delivered by later
features; this feature fixes the access boundary they will live inside.)

**Why this priority**: the access boundary must exist before any student-facing feature
ships; it is the security floor of the platform's two-sided model.

**Independent Test**: self-register a Student account, verify the admin/authoring area is
denied, the placeholder page is reachable after login, and only published courses are
exposed to the Student at the system level.

**Acceptance Scenarios**:

1. **Given** a visitor, **When** they self-register on the student-facing platform, **Then**
   they get an account with the Student role — never any other role.
2. **Given** an email/password self-registration, **When** the email is not yet verified,
   **Then** the account is not usable; **Given** a Google sign-up, **Then** it is usable
   immediately with no verification step.
3. **Given** a signed-in Student, **When** they attempt to open the admin/authoring area,
   **Then** access is denied.
4. **Given** courses in draft, pending-review, and published states, **When** course data
   is requested on behalf of a Student (no catalog UI yet — system-level check), **Then**
   only published courses are returned.
5. **Given** a draft or pending-review course, **When** a Student (or anonymous visitor)
   requests it directly by address, **Then** it is not exposed (denied or not found).

---

### User Story 4 - Standard Instructor publishes via Admin approval (Priority: P3)

A future standard-level Instructor creates a course and hits publish: the course enters
pending review and waits for Admin approval before students can see it. Any later edit to
a published course likewise requires Admin review before the changes reach students. This
flow is enforced in the system's rules from day one, but gets **no dedicated UI** in this
phase — the MVP's only Instructor is editor-level and bypasses it.

**Why this priority**: no additional instructors are expected in the near future; the flow
is future-proofing that must exist in code so the rules are already enforced when a second
instructor arrives.

**Independent Test**: exercisable without UI — create a standard-level Instructor, publish
a course through the system's interface for automated access (no review-queue screens), and
verify the pending → approved/rejected transitions and student invisibility.

**Acceptance Scenarios**:

1. **Given** a signed-in standard-level Instructor, **When** they publish a course, **Then**
   it enters pending review and is not visible to students.
2. **Given** their course pending review, **When** an Admin approves it, **Then** it becomes
   published; **When** an Admin rejects it, **Then** it returns to draft and the Instructor
   can revise and resubmit.
3. **Given** their published course, **When** they edit it, **Then** the changes do not
   become visible to students until an Admin approves them.
4. **Given** a standard-level Instructor, **When** they attempt to approve their own (or any)
   pending course, **Then** access is denied — approval is Admin-only.

---

### Edge Cases

- A standard-level Instructor attempts to approve or self-publish a pending course → denied;
  approval is an Admin-only capability.
- A Student or anonymous visitor requests a draft/pending course directly by its address →
  never exposed (denied or not found).
- Any Instructor attempts user management or platform administration → denied.
- The Admin edits a pending or published course directly → applies immediately; Admin
  actions are never subject to review.
- An Instructor's access level is changed (editor ↔ standard) → the new level governs
  subsequent publish/edit actions; already-published content stays published.
- An email/password Student attempts to sign in before verifying their email → the account
  stays unusable until verification completes.
- What happens to pending submissions when their author is deactivated → to be settled
  together with the detailed review logic (explicitly deferred to a later phase).

## Requirements *(mandatory)*

### Access matrix

| Capability | Admin | Instructor (editor) | Instructor (standard) | Student |
|------------|-------|---------------------|----------------------|---------|
| Sign in to the admin/authoring area | Yes | Yes | Yes | No |
| Create / manage user accounts | Yes | No | No | No |
| Create and edit own courses | Yes | Yes | Yes | No |
| Edit / delete any content (any author) | Yes | No | No | No |
| Publish own course with no approval | Yes | Yes | No | No |
| Submit own course for review | — | — (not needed) | Yes | No |
| Approve / reject submitted courses | Yes | No | No | No |
| View the student-facing side | Yes | Yes | Yes | Yes |

### Functional Requirements

- **FR-001**: The system MUST support exactly the three roles from `terms.md` — Admin,
  Instructor, Student — with every account holding exactly one role.
- **FR-002**: Instructor accounts MUST carry a publishing access level: **editor** (publish
  without approval) or **standard** (publishing requires Admin approval). The MVP's single
  Instructor is editor-level. This is an attribute of the Instructor role, not a fourth role.
- **FR-003**: Admins MUST be able to create and manage all user accounts — Instructors
  (including assigning/changing their access level) and Students.
- **FR-004**: Visitors MUST be able to self-register as Students on the student-facing
  platform with email and password. Self-registration MUST always create an account with
  the Student role; only an Admin can change an account's role or access level.
- **FR-004a**: Students MUST additionally be able to sign up / sign in with their Google
  account. Until the Google credentials are configured (provided by Valery later), the
  Google option stays unavailable while email/password signup keeps working.
- **FR-004b**: Email is the unique account identity — one account per email. A Google
  sign-in whose email matches an existing account MUST attach to that account (and vice
  versa); the account is then usable via either method. Duplicate accounts for the same
  email MUST NOT exist.
- **FR-004c**: Email/password self-registrations MUST verify the email address (via an
  emailed verification link) before the account becomes usable. Google sign-ups MUST skip
  verification — Google has already verified the email.
- **FR-005**: Admins MUST have unrestricted access to all platform content — view, edit,
  and delete anything regardless of author — and their actions are never subject to review.
- **FR-006**: Admins MUST be able to approve or reject a course pending review; approval
  publishes it, rejection returns it to draft for revision and resubmission.
- **FR-007**: An editor-level Instructor MUST be able to create, edit, publish, and
  unpublish their courses with no approval step, including edits to published courses.
- **FR-008**: A standard-level Instructor's publish action MUST place the course in pending
  review — not visible to students — until an Admin approves it.
- **FR-009**: Any edit by a standard-level Instructor to a published course MUST require
  Admin review before the changes become visible to students. While changes await review,
  the previously approved version MUST stay live for students; the pending changes replace
  it only upon approval.
- **FR-010**: The publication/approval workflow MUST be enforced by the system's rules
  regardless of any UI; no dedicated review-queue UI is built in this phase.
- **FR-011**: Students MUST NOT access the admin/authoring area; their access is limited to
  the student-facing learning platform.
- **FR-012**: Only published courses MUST be visible or listable to Students; draft and
  pending-review content MUST never be exposed to them.
- **FR-013**: Instructors MUST NOT manage user accounts or platform-level settings.
- **FR-014**: All role and access-level checks MUST be enforced by the platform itself
  (server-side); hiding options in a UI is not sufficient.
- **FR-015**: The student-facing surface of this feature is limited to sign-up/sign-in
  pages and a placeholder page after login. Catalog browsing and the learning experience
  arrive with later features; course-visibility rules (FR-012) apply regardless of UI.
- **FR-016**: Every approve/reject decision MUST be recorded — the decision, the deciding
  Admin, and a timestamp — forming the course's review history.
- **FR-017**: Access control gates only the admin/authoring area. Admins and Instructors
  MUST NOT be restricted from viewing the student-facing side (e.g., previewing courses
  as students see them).

### Key Entities

- **User account**: a person on the platform; holds exactly one role (Admin, Instructor,
  Student). Instructor accounts additionally carry a publishing access level
  (editor | standard).
- **Course** (minimal record, in scope for this feature): authored by an Instructor;
  carries a publication state — draft, pending review, published — whose transitions are
  governed by the author's access level and Admin decisions. Deliberately bare-bones
  (enough to carry the publication workflow end-to-end); the later course-management
  feature extends it with real course content and structure.
- **Review decision**: a record of an Admin's approve/reject on a course — the decision,
  the deciding Admin, and a timestamp; together they form the course's review history.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of access attempts outside a role's permitted boundary (every "No" cell
  of the access matrix) are denied, verified across all four account types.
- **SC-002**: The MVP Instructor takes a course from creation to student-visible — and an
  edit to a live course into effect — in a single action with zero Admin involvement.
- **SC-003**: Draft and pending-review content is never exposed to Students or anonymous
  visitors: zero leaks across catalog listing and direct-address access in testing.
- **SC-004**: A standard-level Instructor's submission can be driven to published (approve)
  or back to draft (reject) purely by an Admin decision, with no code or configuration
  change and no dedicated review UI.
- **SC-005**: An Admin can provision a working Instructor account, including its access
  level, in under 2 minutes; the new Instructor can sign in and start authoring immediately.
- **SC-006**: A visitor completes Student self-registration and reaches the signed-in
  placeholder page in under 2 minutes — for email/password sign-ups, counted excluding
  inbox wait, with the verification email sent within 1 minute of registering — and 100%
  of self-registered accounts hold the Student role.

## Assumptions

- Authentication and the seeded Admin from feature 001 are reused as-is; this feature adds
  roles and access rules on top — it does not build authentication.
- Roles stay exactly three, per `terms.md` ("no finer-grained roles for now"); "editor" is
  a publishing access level on an Instructor account, not a new role (defined in
  `terms.md`, accepted 2026-07-02).
- One role per account; no role combinations.
- Instructors author and manage their own courses (with the single MVP instructor this is
  equivalent to all courses); ownership rules across multiple instructors follow the
  own-content model unless decided otherwise.
- The exact review logic (partial approvals, review comments, versioning details) is
  explicitly deferred; phase 1 encodes only the coarse rules stated here.
- Google sign-in credentials are provided by Valery later; their absence never blocks the
  rest of the feature — email/password signup works regardless.
- Email verification requires an email delivery mechanism; the exact provider/config is
  finalized during planning — placeholders live in `.env.example`.

### Out of Scope

- Review-queue / approval UI of any kind.
- Enrollment, progress tracking, quizzes, payments, certificates — the student learning
  experience arrives in later features; this feature only fixes its access boundary.
- Student catalog UI and learning dashboard beyond the signed-in placeholder page.
- Public self-signup for Admin or Instructor accounts (unchanged from feature 001: Admin is
  seeded, Instructors are Admin-created).
- Fine-grained per-course permissions, co-authoring, cohorts.
