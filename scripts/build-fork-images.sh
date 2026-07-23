#!/usr/bin/env bash
# Build Docker images for this private fork and tag them for docker-compose.fork.yaml.
#
# Usage (repo root):
#   ./scripts/build-fork-images.sh              # backend frontend mcp
#   ./scripts/build-fork-images.sh backend      # only backend
#   ./scripts/build-fork-images.sh backend mcp
#
# Requires: docker, rsync, clojure/node toolchain used by ./manage.sh build-*
# Output tags: local/penpot-{backend,frontend,mcp}:dev  (override with FORK_IMAGE_TAG)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

TAG="${FORK_IMAGE_TAG:-dev}"
if [ "$#" -eq 0 ]; then
  TARGETS=(backend frontend mcp)
else
  TARGETS=("$@")
fi

log() { printf '[build-fork-images] %s\n' "$*"; }

build_one() {
  local name="$1"
  case "$name" in
    backend)
      log "bundle backend..."
      ./manage.sh build-backend-bundle
      log "docker build backend -> local/penpot-backend:${TAG}"
      rsync -a --delete ./bundles/backend/ ./docker/images/bundle-backend/
      docker build \
        -t "local/penpot-backend:${TAG}" \
        --build-arg BUNDLE_PATH="./bundle-backend/" \
        -f docker/images/Dockerfile.backend \
        docker/images
      ;;
    frontend)
      log "bundle frontend..."
      ./manage.sh build-frontend-bundle
      log "docker build frontend -> local/penpot-frontend:${TAG}"
      rsync -a --delete ./bundles/frontend/ ./docker/images/bundle-frontend/
      docker build \
        -t "local/penpot-frontend:${TAG}" \
        --build-arg BUNDLE_PATH="./bundle-frontend/" \
        -f docker/images/Dockerfile.frontend \
        docker/images
      ;;
    mcp)
      log "bundle mcp..."
      ./manage.sh build-mcp-bundle
      log "docker build mcp -> local/penpot-mcp:${TAG}"
      rsync -a --delete ./bundles/mcp/ ./docker/images/bundle-mcp/
      docker build \
        -t "local/penpot-mcp:${TAG}" \
        --build-arg BUNDLE_PATH="./bundle-mcp/" \
        -f docker/images/Dockerfile.mcp \
        docker/images
      ;;
    exporter)
      log "bundle exporter..."
      ./manage.sh build-exporter-bundle
      log "docker build exporter -> local/penpot-exporter:${TAG}"
      rsync -a --delete ./bundles/exporter/ ./docker/images/bundle-exporter/
      docker build \
        -t "local/penpot-exporter:${TAG}" \
        --build-arg BUNDLE_PATH="./bundle-exporter/" \
        -f docker/images/Dockerfile.exporter \
        docker/images
      ;;
    *)
      log "unknown target: $name (backend|frontend|mcp|exporter)"
      exit 2
      ;;
  esac
}

for t in "${TARGETS[@]}"; do
  build_one "$t"
done

log "done. Start options:"
log "  # lite (core only):"
log "  cd docker/images && cp -n .env.fork.example .env.fork"
log "  docker compose --env-file .env.fork -f docker-compose.lite.yaml -f docker-compose.lite.fork.yaml up -d"
log "  # lite + mcp:"
log "  docker compose --env-file .env.fork -f docker-compose.lite.yaml -f docker-compose.lite.fork.yaml -f docker-compose.lite.mcp.yaml up -d"
log "  # full (+ exporter/mcp/mailcatch):"
log "  docker compose --env-file .env.fork -f docker-compose.yaml -f docker-compose.fork.yaml up -d"
log "Images:"
docker images "local/penpot-*" --format '  {{.Repository}}:{{.Tag}}  {{.ID}}  {{.Size}}' 2>/dev/null || true