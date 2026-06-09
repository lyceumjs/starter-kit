# LMS starter kit — dev commands (Dockerized local dev, constitution principle V).
# `make up` is the documented one-command start (spec 001-foundation-skeleton, FR-001).

.PHONY: up down build test

# Light, cached start — no rebuild.
up:
	docker compose up -d

# Stop and remove containers.
down:
	docker compose down

# Rebuild images, then start.
build:
	docker compose up -d --build

# Run tests. Optional filter: `make test f="<pattern>"`.
# TODO(plan): wire the real test runner + service here once chosen in /speckit-plan.
test:
	@echo "test target not wired yet — finalized during /speckit-plan (filter: f=$(f))"
