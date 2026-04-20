#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.selfhost.yml"
ENV_FILE="$ROOT_DIR/.env"

usage() {
  cat <<'EOF'
Usage: scripts/selfhost-podman.sh <command>

Commands:
  up       Start Podman machine (if needed) and run multica self-host stack
  down     Stop the self-host stack
  logs     Follow compose logs
  ps       Show compose service status
  config   Render merged compose config
EOF
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

ensure_env() {
  if [[ ! -f "$ENV_FILE" ]]; then
    echo "Missing $ENV_FILE. Create it first (for example by copying .env.example)." >&2
    exit 1
  fi
}

ensure_machine() {
  if ! podman info >/dev/null 2>&1; then
    echo "Starting podman machine..."
    podman machine start
  fi
}

compose() {
  (cd "$ROOT_DIR" && podman compose -f "$COMPOSE_FILE" "$@")
}

need_cmd podman

cmd="${1:-}"
case "$cmd" in
  up)
    ensure_env
    ensure_machine
    compose up -d --build
    ;;
  down)
    ensure_machine
    compose down
    ;;
  logs)
    ensure_machine
    compose logs -f
    ;;
  ps)
    ensure_machine
    compose ps
    ;;
  config)
    ensure_env
    ensure_machine
    compose config
    ;;
  *)
    usage
    exit 1
    ;;
esac
