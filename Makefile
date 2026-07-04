# LMS starter kit — dev commands (Dockerized local dev, constitution principle V).
# `make up` is the documented one-command start (spec 001-foundation-skeleton, FR-001).

.PHONY: up down build test verify sync-engine

# Public base URL for the printed link; override if you changed APP_PORT.
APP_URL ?= http://localhost:3021

# Path to the local Lyceum engine checkout (sibling by default).
ENGINE_DIR ?= ../lyceum-lms

# Light, cached start — no rebuild.
up:
	docker compose up -d

# Stop and remove containers.
down:
	docker compose down

# Rebuild images, then start.
build:
	docker compose up -d --build

# Run the Vitest integration suite inside the app container against a dedicated
# `lms_test` database (never the dev data). Optional filter: `make test f="<pattern>"`.
test:
	docker compose up -d db app
	@echo "[test] waiting for Postgres..."
	@docker compose exec -T db sh -c 'until pg_isready -U postgres -d lms >/dev/null 2>&1; do sleep 1; done'
	@echo "[test] ensuring lms_test database exists..."
	@docker compose exec -T db psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname='lms_test'" | grep -q 1 \
		|| docker compose exec -T db createdb -U postgres lms_test
	docker compose exec -T -e DATABASE_URI=postgres://postgres:postgres@db:5432/lms_test app pnpm test:int $(f)

# Print the email-verification link for a signed-up account — local dev sends no email,
# so the link is otherwise only logged. Usage: make verify email=you@example.com
verify:
	@test -n "$(email)" || { echo 'usage: make verify email=you@example.com'; exit 1; }
	@docker compose exec -T db psql -U postgres -d lms -tAc \
		"select case when _verified then '[already verified — just sign in]' \
			when _verificationtoken is null then '[no pending verification]' \
			else '$(APP_URL)/verify-email?token=' || _verificationtoken end \
		from users where email = '$(email)'" \
		| grep . || echo "[no account found for $(email)]"

# Refresh the vendored Lyceum engine tarball from the local engine checkout.
# Lyceum (@lyceumjs/lms) is unpublished; this host consumes a built snapshot of it
# (see vendor/README.md). Run after pulling engine changes, then `make build`.
sync-engine:
	cd $(ENGINE_DIR) && pnpm build && pnpm pack --pack-destination $(CURDIR)/vendor
	@echo "[sync-engine] vendored $(ENGINE_DIR) → vendor/ — run 'make build' to install."
