# CLI and Agent Daemon

The `multica` CLI configures the local server connection, manages workspaces and issues, and runs the daemon that executes agent tasks on this machine.

There is no login command, browser auth flow, OAuth callback, personal access token, or stored bearer token in solo local mode.

## Install

```bash
brew install multica-ai/tap/multica
```

Build from source:

```bash
git clone https://github.com/multica-ai/multica.git
cd multica
make build
cp server/bin/multica /usr/local/bin/multica
```

## Quick Start

```bash
multica setup self-host
multica daemon status
```

`multica setup self-host`:

1. Writes `~/.multica/config.json` for the configured server.
2. Discovers local workspaces from the server.
3. Stores a default workspace ID when available.
4. Starts the daemon in the background.

For custom local ports:

```bash
multica setup self-host --server-url http://localhost:8080 --app-url http://localhost:3000
```

## Configuration

```bash
multica config show
multica config set server_url http://localhost:8080
multica config set app_url http://localhost:3000
multica config set workspace_id <workspace-id>
```

Profiles isolate config, daemon state, and workspace roots:

```bash
multica setup self-host --profile dev --server-url http://localhost:8080
multica daemon start --profile dev
```

## Daemon Commands

```bash
multica daemon start
multica daemon start --foreground
multica daemon stop
multica daemon status
multica daemon logs -f
```

The daemon detects installed agent CLIs, registers local runtimes, polls for tasks, creates isolated work directories, and streams progress back to the server.

Supported CLIs:

| CLI | Command |
| --- | --- |
| Claude Code | `claude` |
| Codex | `codex` |
| OpenCode | `opencode` |
| OpenClaw | `openclaw` |
| Hermes | `hermes` |
| Gemini | `gemini` |
| Pi | `pi` |
| Cursor Agent | `cursor-agent` |

## Workspace Commands

```bash
multica workspace list
multica workspace get <workspace-id>
multica workspace members <workspace-id>
```

Membership is retained internally for workspace isolation, but the product is configured as a solo local tool. There are no invitation or team-management CLI flows.

## Issue Commands

```bash
multica issue list
multica issue get <issue-id>
multica issue create --title "Fix flaky test"
multica issue update <issue-id> --status in_progress
multica issue comment <issue-id> "Current status..."
```

Use `multica <command> --help` for command-specific flags.
