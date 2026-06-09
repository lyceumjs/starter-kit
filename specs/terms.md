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

- **Instructor** — the platform owner. Creates and delivers courses, and checks
  students. Has full access and does everything; the platform starts as a single-
  instructor system with heavy automation. *(aka teacher)*
- **Student** — a user who consumes content and is enrolled in courses. *(aka learner)*

> The instructor may grant another person full access to help maintain the platform.
> There are no finer-grained roles for now.

## Content Structure

- **Course** — the top-level unit of learning a student enrolls in.
- **Module** — a major section of a course. *(aka unit, chapter)*
- **Lesson** — a single teachable item inside a module. *(aka topic)*
- **Content Item / Activity** — an atomic piece of content within a lesson
  (video, text, quiz, H5P interaction, file, assignment).
- **Resource** — a supplementary downloadable/linkable asset attached to content.
- **Curriculum** — the ordered structure of modules/lessons within a course.
- **Catalog** — the browsable listing of available courses.

## Interactive Content

- **H5P Content** — interactive content authored with H5P (quizzes, interactive video,
  branching scenarios, etc.). See [H5P](https://h5p.org/).
- **Content Type** — an H5P interaction template (e.g. Interactive Video, Course Presentation).
- **xAPI Statement** — a learning-record event ("actor verb object") emitted by an
  activity, e.g. H5P interactions. *(aka Experience API, Tin Can)*
- **LRS** — Learning Record Store; the system that stores xAPI statements.

## Enrollment & Progress

- **Enrollment** — the link between a student and a course they have access to.
- **Cohort** — a group of students moving through a course together. *(aka group, class)*
- **Progress** — a student's completion state across a course's content.
- **Completion** — a content item or course meeting its defined completion criteria.
- **Certificate** — proof of course completion issued to a student.

## Assessment

- **Assessment** — any graded activity (quiz, assignment, exam).
- **Quiz** — an auto-gradable assessment composed of questions.
- **Question** — a single gradable prompt within a quiz/question bank.
- **Question Bank** — a reusable pool of questions.
- **Assignment** — a student-submitted deliverable, typically manually graded.
- **Submission** — a student's attempt/response to an assessment.
- **Attempt** — one instance of a student taking an assessment.
- **Grade / Score** — the result of evaluating a submission.
- **Gradebook** — the aggregate view of grades for a course/cohort.
- **Rubric** — structured grading criteria.

## Platform & Architecture

- **Starter Kit** — this repository: the open-source baseline others fork/integrate.
- **Core Library** — the database-agnostic LMS management library (courses, enrollment,
  progress) intended to be embeddable in any project.
- **Admin Panel / Dashboard** — the back-office UI for managing the platform and
  authoring courses.
- **BE** — backend framework/service.
- **FE** — frontend framework/application.
