# Contributing

This guide covers local development for Multica.

## Development Model

Local development uses one shared PostgreSQL service and one database per checkout.

- Main checkout uses `.env` and usually `POSTGRES_DB=multica`.
- Git worktrees use `.env.worktree`.
- Worktrees get unique database names and ports.
- Do not copy `.env` into a worktree.

The default compose command is `podman compose`. Use `COMPOSE="docker compose"` when you need Docker Compose.

## Prerequisites

- Node.js 22
- pnpm 10.28+
- Go 1.26.1
- Podman or Docker Compose

## Quick Start

```bash
make dev
```

This creates the env file when missing, installs JS dependencies, starts PostgreSQL, creates the database, runs migrations, and starts backend/frontend.

## Main Checkout

```bash
cp .env.example .env
make setup-main
make start-main
make stop-main
make check-main
```

## Worktree

```bash
git worktree add ../multica-feature -b feat/my-change main
cd ../multica-feature
make worktree-env
make setup-worktree
make start-worktree
make stop-worktree
make check-worktree
```

## Common Commands

```bash
pnpm typecheck
pnpm test
pnpm lint
pnpm build

make test
make check
make sqlc
make migrate-up
make migrate-down
make build
```

## CLI and Daemon from Source

```bash
make build
./server/bin/multica setup self-host --server-url http://localhost:8080 --app-url http://localhost:3000
./server/bin/multica daemon start --foreground
```

There is no auth setup step. The local server injects the solo local user.

## Database

```bash
make db-up
make db-down
```

List local databases:

```bash
podman compose exec -T postgres psql -U multica -d postgres \
  -At -c "select datname from pg_database order by datname;"
```

Docker equivalent:

```bash
docker compose exec -T postgres psql -U multica -d postgres \
  -At -c "select datname from pg_database order by datname;"
```

## Destructive Reset

Stop PostgreSQL while preserving data:

```bash
make db-down
```

Wipe all local PostgreSQL data only when you intentionally want a clean slate:

```bash
podman compose down -v
```

This deletes the shared database volume.
