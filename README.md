# Multica

Multica is a local-first task board for running coding agents against your own repositories.

It gives you issues, projects, comments, agent profiles, runtime monitoring, and reusable skills without a cloud account, team workspace, telemetry, or hosted repository integration. The server runs locally, the daemon runs on your machine, and agents work from local repository paths you configure.

## Features

- **Local repositories** - attach local paths to a workspace; remote Git repository URLs are intentionally not part of the product flow.
- **Solo local user** - the app bootstraps a local user and does not require login, email verification, OAuth, JWTs, personal access tokens, or invitations.
- **Agent task execution** - assign issues to agents and let the daemon claim, execute, stream progress, and report completion.
- **Local runtimes** - auto-detects supported CLIs on your PATH and registers them as local runtimes.
- **Reusable skills** - store repeatable workflows for deployments, migrations, reviews, and project-specific operations.
- **Web and desktop apps** - shared business UI with Next.js for web and Electron for desktop.

Supported agent CLIs include Claude Code, Codex, OpenClaw, OpenCode, Hermes, Gemini, Pi, and Cursor Agent.

## Quick Start

### One-command development setup

```bash
make dev
```

`make dev` creates the local environment, starts PostgreSQL through the configured compose runner, runs migrations, installs frontend dependencies, and starts the backend and frontend.

The default compose command is `podman compose`. Override it if needed:

```bash
COMPOSE="docker compose" make dev
```

### Local self-host setup

```bash
make selfhost
multica setup self-host
```

`multica setup self-host` writes the CLI config for the local server, discovers the local workspace, and starts the daemon. It does not perform authentication.

Open:

- Web app: http://localhost:3000
- API: http://localhost:8080

## CLI

```bash
multica setup self-host
multica daemon status
multica workspace list
multica issue list
multica issue create --title "Fix flaky test"
```

See [CLI_AND_DAEMON.md](CLI_AND_DAEMON.md) for the full command reference.

## Architecture

| Layer | Stack |
| --- | --- |
| Backend | Go, Chi, sqlc, gorilla/websocket |
| Frontend | Next.js 16 App Router |
| Desktop | Electron + electron-vite |
| Shared UI | pnpm workspaces, Turborepo, shared `core`, `ui`, and `views` packages |
| Database | PostgreSQL 17 with pgvector |
| Agent runtime | Local daemon executing installed agent CLIs |

## Development

Prerequisites:

- Node.js 22
- pnpm 10.28+
- Go 1.26.1
- Podman with `podman compose` or Docker Compose

Common commands:

```bash
make dev
pnpm typecheck
pnpm test
make test
make check
make sqlc
```

For contributor workflow and project rules, read [CLAUDE.md](CLAUDE.md). `AGENTS.md` is a compact pointer to the same source of truth.
