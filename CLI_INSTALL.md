# CLI Install

Install the `multica` CLI, point it at your local server, and start the daemon.

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

## Configure

For the local self-host server:

```bash
multica setup self-host
```

For custom ports:

```bash
multica setup self-host --server-url http://localhost:8080 --app-url http://localhost:3000
```

This does not open a browser or require authentication.

## Verify

```bash
multica daemon status
multica workspace list
```

If no runtimes are detected, install at least one supported agent CLI on PATH: `claude`, `codex`, `opencode`, `openclaw`, `hermes`, `gemini`, `pi`, or `cursor-agent`, then restart the daemon.
