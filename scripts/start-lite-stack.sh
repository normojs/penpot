#!/usr/bin/env bash
# One-shot start helpers for lightweight / full fork stacks.
#
# Usage (repo root):
#   ./scripts/start-lite-stack.sh              # core only (build if needed)
#   ./scripts/start-lite-stack.sh --with-mcp   # core + MCP
#   ./scripts/start-lite-stack.sh --no-build   # assume images already exist
#   ./scripts/start-lite-stack.sh --full       # full compose (exporter/mcp/mailcatch)
#
# Env:
#   FORK_IMAGE_TAG=dev
#   SKIP_BUILD=1   same as --no-build

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

WITH_MCP=0
NO_BUILD=${SKIP_BUILD:-0}
FULL=0

for arg in "$@"; do
  case "$arg" in
    --with-mcp) WITH_MCP=1 ;;
    --no-build) NO_BUILD=1 ;;
    --full) FULL=1 ;;
    -h|--help)
      sed -n '1,20p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown arg: $arg" >&2
      exit 2
      ;;
  esac
done

log() { printf '[start-lite-stack] %s\n' "$*"; }

TAG="${FORK_IMAGE_TAG:-dev}"
ENV_FILE="docker/images/.env.fork"

if [ ! -f "$ENV_FILE" ]; then
  log "creating $ENV_FILE from example (edit secrets!)"
  cp docker/images/.env.fork.example "$ENV_FILE"
fi

if [ "$NO_BUILD" != "1" ]; then
  if [ "$FULL" = "1" ]; then
    log "building backend frontend mcp..."
    ./scripts/build-fork-images.sh backend frontend mcp
  elif [ "$WITH_MCP" = "1" ]; then
    log "building backend frontend mcp..."
    ./scripts/build-fork-images.sh backend frontend mcp
  else
    log "building backend frontend..."
    ./scripts/build-fork-images.sh backend frontend
  fi
else
  log "skipping image build"
fi

cd docker/images
if [ "$FULL" = "1" ]; then
  log "starting FULL stack"
  docker compose --env-file .env.fork \
    -f docker-compose.yaml -f docker-compose.fork.yaml up -d
elif [ "$WITH_MCP" = "1" ]; then
  log "starting LITE + MCP stack"
  docker compose --env-file .env.fork \
    -f docker-compose.lite.yaml \
    -f docker-compose.lite.fork.yaml \
    -f docker-compose.lite.mcp.yaml \
    up -d
else
  log "starting LITE core stack"
  docker compose --env-file .env.fork \
    -f docker-compose.lite.yaml \
    -f docker-compose.lite.fork.yaml \
    up -d
fi

log "compose ps:"
docker compose --env-file .env.fork \
  -f docker-compose.lite.yaml \
  -f docker-compose.lite.fork.yaml \
  $([ "$WITH_MCP" = "1" ] && echo -f docker-compose.lite.mcp.yaml || true) \
  ps 2>/dev/null || true

log "UI: ${PENPOT_PUBLIC_URI:-http://localhost:9001}"
log "Default admin: see docker/images/.env.fork (PENPOT_DEFAULT_ADMIN_*)"
if [ "$WITH_MCP" = "1" ] || [ "$FULL" = "1" ]; then
  log "MCP: http://127.0.0.1:${PENPOT_MCP_PORT:-4401}/status (if port published)"
fi
