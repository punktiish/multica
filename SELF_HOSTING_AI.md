# Local Hosting Notes for AI Agents

Use this file when an agent needs the shortest path to run Multica locally.

## Setup

```bash
git clone https://github.com/multica-ai/multica.git
cd multica
make selfhost
multica setup self-host
```

Default compose runner:

```bash
podman compose
```

Docker fallback:

```bash
COMPOSE="docker compose" make selfhost
```

## Verify

```bash
multica daemon status
pnpm typecheck
pnpm test
make test
```

## Useful Logs

```bash
podman compose -f docker-compose.selfhost.yml logs -f backend
podman compose -f docker-compose.selfhost.yml logs -f frontend
multica daemon logs -f
```

There is no login, auth token, invitation, or cloud setup step in the current local-first product.
