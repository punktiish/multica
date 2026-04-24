# Advanced Local Hosting

This document covers optional configuration for running Multica locally or on private infrastructure.

## Environment Variables

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `8080` | Backend HTTP port |
| `DATABASE_URL` | from `.env` | PostgreSQL connection string |
| `FRONTEND_ORIGIN` | `http://localhost:3000` | Allowed frontend origin |
| `APP_ENV` | `development` | Runtime environment label |
| `MULTICA_APP_URL` | `http://localhost:3000` | Frontend URL stored by CLI setup |
| `MULTICA_SERVER_URL` | `http://localhost:8080` | Backend URL stored by CLI setup |

Authentication-related variables from earlier versions are obsolete in solo local mode.

## Compose Runner

The repository defaults to Podman:

```bash
make selfhost
```

Use Docker Compose explicitly:

```bash
COMPOSE="docker compose" make selfhost
```

Run compose manually:

```bash
podman compose -f docker-compose.selfhost.yml up -d --build
podman compose -f docker-compose.selfhost.yml logs -f
```

## Manual Server Run

```bash
make build
DATABASE_URL="postgres://multica:multica@localhost:5432/multica?sslmode=disable" \
  PORT=8080 \
  ./server/bin/server
```

In another shell:

```bash
pnpm dev:web
multica setup self-host
multica daemon start --foreground
```

## Reverse Proxy

If exposing Multica on a private network, proxy both HTTP and WebSocket traffic to the backend:

- API: `http://localhost:8080`
- WebSocket: `ws://localhost:8080/ws/{workspaceSlug}`
- Frontend: `http://localhost:3000`

Set:

```bash
FRONTEND_ORIGIN=https://multica.example.internal
MULTICA_APP_URL=https://multica.example.internal
MULTICA_SERVER_URL=https://multica-api.example.internal
```

## Database Maintenance

```bash
make migrate-up
make migrate-down
make sqlc
```

`make sqlc` requires the `sqlc` binary to be installed locally.
