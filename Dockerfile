# Dev-parity image only (constitution V) — NOT a production build.
# Dependencies are installed into a mounted volume at runtime by the entrypoint so
# hot-reload works against the bind-mounted source (plan R2). Production/CD imaging
# lives in the private repo.
FROM node:24-bookworm-slim AS dev

# corepack ships with the node image; it pins pnpm from package.json "packageManager".
RUN corepack enable

WORKDIR /app

# The entrypoint waits for Postgres, installs deps, runs the idempotent Admin seed
# (skipped when APP_ENV=prod), then starts the Next.js dev server.
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["docker-entrypoint.sh"]
