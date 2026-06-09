#!/bin/sh
# Dev entrypoint (spec 001-foundation-skeleton). Order: wait for DB → install deps →
# idempotent Admin bootstrap (skipped when APP_ENV=prod, FR-006) → start Next.js dev.
set -e

echo "[entrypoint] Waiting for Postgres at db:5432..."
until node -e "require('net').connect(5432,'db').on('connect',()=>process.exit(0)).on('error',()=>process.exit(1))" 2>/dev/null; do
  echo "[entrypoint] Postgres not ready — retrying in 2s..."
  sleep 2
done
echo "[entrypoint] Postgres is up."

echo "[entrypoint] Installing dependencies (pnpm install)..."
pnpm install

if [ "$APP_ENV" = "prod" ]; then
  echo "[entrypoint] APP_ENV=prod — skipping Admin bootstrap (FR-006)."
else
  echo "[entrypoint] Seeding initial Admin (idempotent)..."
  pnpm seed
fi

echo "[entrypoint] Starting Next.js dev server on :3000..."
exec pnpm dev
