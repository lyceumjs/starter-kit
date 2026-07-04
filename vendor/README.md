# vendor/

`lyceumjs-lms-0.0.0.tgz` is a **built snapshot of the Lyceum engine** (`@lyceumjs/lms`),
vendored here because the engine is not yet published to a registry. This host consumes it
as a `file:` dependency (`package.json`).

- **Boundary:** Lyceum owns the learning domain + content; this host owns auth, user
  management, the dashboards, and the glue. See `CLAUDE.md` → "Lyceum engine vs. this host"
  and Lyceum's `specs/adr/0001-integration-architecture.md`.
- **Refresh** after pulling engine changes: `make sync-engine` (re-builds + re-packs from
  the local `../lyceum-lms` checkout), then `make build`.
- **Temporary:** when `@lyceumjs/lms` is published, replace the `file:` dependency with a
  semver range and delete this folder.
