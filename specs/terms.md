# LMS Terms

Conventional terminology for this LMS starter kit. The goal is a shared vocabulary
so that humans and AI agents (e.g. Claude Code) mean the same thing by the same word.
When in doubt, use the term defined here rather than a synonym.

## Conventions

- One canonical term per concept. Synonyms are listed under **aka** but should be
  avoided in code, specs, and commits.
- Terms are grouped by domain area. Keep this file alphabetical within each group.
- When introducing a new domain concept, add it here first.

## People & Roles

- **Admin** — the platform maintainer / superuser. Bootstrapped via an idempotent startup
  seed (no public self-signup) and can create and manage users, including Instructors.
  *(currently the only way an Instructor account is created)*
- **Instructor** — the platform owner. Creates and delivers courses, and checks
  students. Created by an Admin; the platform starts as a single-instructor system with
  heavy automation. *(aka teacher)*
- **Student** — a user who consumes content and is enrolled in courses. *(aka learner)*

> Roles are Admin, Instructor, and Student. No finer-grained roles for now.

## Content Structure

- **Course** — the top-level unit of learning a student enrolls in.
- **Unit** — a major section of a course. *(aka module, chapter)*
- **Lesson** — a single teachable item inside a module. *(aka topic)*
- **Resource** — a supplementary downloadable/linkable asset attached to content.
- **Curriculum** — the ordered structure of modules/lessons within a course.
- **Catalog** — the browsable listing of available courses.

## Enrollment & Progress

- **Enrollment** — the link between a student and a course they have access to.
- **Cohort** — a group of students moving through a course together. *(aka group, class)*
- **Progress** — a student's completion state across a course's content.
- **Completion** — a lesson or course meeting its defined completion criteria.
- **Certificate** — proof of course completion issued to a student.

## Platform & Architecture

- **Starter Kit** — this repository: the open-source baseline others fork/integrate.
- **Core Library** — the database-agnostic LMS management library (courses, enrollment,
  progress) intended to be embeddable in any project.
- **Admin Panel / Dashboard** — the back-office UI for managing the platform and course
  structure (content authoring lives in the LCMS).
- **BE** — backend framework/service.
- **FE** — frontend framework/application.
