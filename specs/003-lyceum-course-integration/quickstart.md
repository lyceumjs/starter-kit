# Quickstart: validating the Lyceum course integration

**Date**: 2026-07-15 (updated post-analysis: demo seeder deferred to next specs) |
Proves the feature end-to-end on the local Docker env. Shapes and rules:
[contracts/lms-api.md](contracts/lms-api.md), [data-model.md](data-model.md).
App: `http://localhost:3021` (or `${APP_PORT}`).

## Prerequisites

- Docker Desktop running; sibling checkout of `lyceum-lms` at `../lyceum-lms`.
- `.env` from `.env.example` (dev defaults suffice).

## Setup

```bash
make sync-engine        # rebuild ../lyceum-lms, pack into vendor/, force reinstall
make build              # compose up -d --build (entrypoint runs the Admin bootstrap seed)
```

Sanity: the refreshed engine must expose the 003 surface —
`docker compose exec app node -e "import('@lyceumjs/lms').then(m => console.log(Object.keys(m)))"`
should list the course use-cases (not just `createCourse`/`getCourse`).

## Actors (created via the API — no demo seeder in this feature)

Log in as the bootstrap Admin (`ADMIN_EMAIL`/`ADMIN_PASSWORD` from `.env`), then create
the test actors through Payload REST (`context.trustedRoleAssignment` is not needed —
Admin requests may set roles directly):

```bash
curl -s -c /tmp/admin.txt -X POST localhost:3021/api/users/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"change-me-in-dev"}'
# instructor (editor), instructor (standard), student — one POST /api/users each, e.g.:
curl -s -b /tmp/admin.txt -X POST localhost:3021/api/users \
  -H 'Content-Type: application/json' \
  -d '{"email":"editor@example.com","password":"pw","role":"instructor","accessLevel":"editor","_verified":true}'
```

Then log each actor in the same way to get their own cookie jar.

## Validation scenarios

1. **Authoring round trip (SC-001)** — as an instructor: `POST /api/lms/courses`
   (title + required slug), add 3 units / lessons / a placeholder, reorder units, then
   `GET /api/lms/courses/:id` and confirm the structure is byte-identical to what was
   sent (order included).
2. **Engine + boundary rules (SC-002)** — create without a slug → `400` (host
   boundary); empty title on `PATCH …/info` → `400`; reuse another course's slug →
   `409`; `PUT …/units/order` with a stale/incomplete id list → `400`; after each,
   re-read and confirm nothing changed.
3. **Access gates (FR-007)** — repeat an authoring call as: anonymous (`401`), the
   student (`403`), the other instructor (`403`), the admin (`200`).
4. **Catalog & gating (SC-003/SC-004, FR-013)** — anonymous
   `GET /api/lms/catalog`: only published, non-archived courses, newest first;
   `GET /api/lms/catalog/:slug` anonymous → lessons have no `contents`; same call
   with any signed-in cookie → placeholders present; draft course by id/slug → `404`.
5. **Review continuity (FR-006)** — as the standard-level instructor, edit a published
   course's structure and publish (002 flow) → catalog still serves the previously
   approved version; approve as admin → catalog updates on next read.
6. **Lifecycle (SC-006, T8–T10)** — delete an own never-published draft → `204`, gone,
   slug reusable; delete an ever-published course → `409`; unpublish attempt via
   Payload REST → denied (`preventUnpublish`); archive a published course → out of
   catalog on next read, pending review (if any) voided with no new
   `review-decisions` row; restore → back in catalog unchanged, no re-approval
   (a course archived while pending restores to draft — resubmit for review).

## Test suites (SC-005 regression included)

```bash
make test                      # full integration suite on lms_test (002 suites must stay green)
make test f=course-store      # engine conformance suite only
docker compose exec app pnpm vitest run tests/unit   # domain rules + slug module
```

Feature is "done" when scenarios 1–6 pass by hand against the running app AND
`make test` is green — per the CLAUDE.md verification rule for backend/API changes
(curl + tests; no UI in this feature, so no browser smoke).
