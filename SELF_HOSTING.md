# Local Hosting Guide

Multica is intended to run on your own machine or private infrastructure. The default setup is local-first: no hosted account, email service, OAuth app, JWT secret, or invitation system is required.

## Components

| Component | Description |
| --- | --- |
| Backend | Go REST API and WebSocket server |
| Frontend | Next.js web app |
| Database | PostgreSQL 17 with pgvector |
| Daemon | Local process that executes agent tasks through installed CLIs |

## Quick Start

```bash
git clone https://github.com/multica-ai/multica.git
cd multica
make selfhost
multica setup self-host
```

Open:

- Web app: http://localhost:3000
- API: http://localhost:8080

`make selfhost` uses `podman compose` by default. To use Docker Compose:

```bash
COMPOSE="docker compose" make selfhost
```

## Manual Compose Setup

```bash
cp .env.example .env
podman compose -f docker-compose.selfhost.yml up -d --build
```

Or with Docker:

```bash
docker compose -f docker-compose.selfhost.yml up -d --build
```

Run migrations through the normal app startup or with:

```bash
make migrate-up
```

## CLI and Daemon

After the server is running:

```bash
multica setup self-host
multica daemon status
```

`multica setup self-host` configures the CLI for the local server and starts the daemon. It does not open a browser or authenticate.

Install at least one supported agent CLI on your PATH: `claude`, `codex`, `opencode`, `openclaw`, `hermes`, `gemini`, `pi`, or `cursor-agent`.

## Local Repositories

Configure repositories in workspace settings using local filesystem paths. Remote URLs such as `https://...`, `ssh://...`, or `git@...` are rejected by the server.

## Stopping Services

```bash
make selfhost-stop
multica daemon stop
```

If you used Docker Compose directly:

```bash
docker compose -f docker-compose.selfhost.yml down
```

## Updating

```bash
git pull
make selfhost
multica daemon restart
```

For additional environment and reverse-proxy notes, see [SELF_HOSTING_ADVANCED.md](SELF_HOSTING_ADVANCED.md).
