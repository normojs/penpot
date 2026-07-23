#!/usr/bin/env bash
# Start a full local Penpot client stack in devenv:
#   frontend (:3450) + backend (:6060) + MCP (:4401/:4402) + plugin (:4400)
#
# Designed for the private fork (normojs/penpot) after Docker Desktop restarts.
# Idempotent: free conflicting host ports, ensure containers, then (re)start
# services inside penpot-devenv-main via a detached tmux session.
#
# Usage (repo root):
#   ./scripts/start-full-client-devenv.sh
#   ./scripts/start-full-client-devenv.sh --status
#   ./scripts/start-full-client-devenv.sh --no-frontend-watch   # serve existing assets only

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

CONTAINER="${PENPOT_DEVENV_CONTAINER:-penpot-devenv-main}"
SESSION="${PENPOT_DEVENV_TMUX_SESSION:-penpot-full}"
STATUS_ONLY=0
NO_FRONTEND_WATCH=0
SKIP_PORT_KILL=0

for arg in "$@"; do
  case "$arg" in
    --status) STATUS_ONLY=1 ;;
    --no-frontend-watch) NO_FRONTEND_WATCH=1 ;;
    --skip-port-kill) SKIP_PORT_KILL=1 ;;
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

log() { printf '[full-client] %s\n' "$*"; }

http_code() {
  local url="$1"
  # Capture curl exit separately so we never print "000" twice (was "000000").
  local code
  code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 3 "$url" 2>/dev/null)" || true
  if [[ "$code" =~ ^[0-9]{3}$ ]]; then
    printf '%s' "$code"
  else
    printf '000'
  fi
}

print_status() {
  local ui be mcp plug wasm
  ui=$(http_code "http://127.0.0.1:3450/")
  be=$(http_code "http://127.0.0.1:6060/api/rpc/command/get-profile")
  mcp=$(http_code "http://127.0.0.1:4401/status")
  plug=$(http_code "http://127.0.0.1:4400/manifest.json")
  wasm=$(http_code "http://127.0.0.1:3450/js/render-wasm.wasm")
  printf 'ui:%s backend:%s mcp:%s plugin:%s wasm:%s\n' "$ui" "$be" "$mcp" "$plug" "$wasm"
  if [ "$mcp" = "200" ]; then
    curl -sS --max-time 3 "http://127.0.0.1:4401/status" \
      | python3 -c 'import sys,json;d=json.load(sys.stdin);print("mcp_detail",d.get("status"),"tools",d.get("server",{}).get("registeredTools"),"host",d.get("server",{}).get("host"))' \
      2>/dev/null || true
  fi
}

if [ "$STATUS_ONLY" = "1" ]; then
  print_status
  exit 0
fi

if ! docker info >/dev/null 2>&1; then
  log "Docker daemon not ready. On macOS: open -a Docker, then re-run."
  exit 1
fi

free_host_mcp_ports() {
  local pids
  pids="$(lsof -t -nP -iTCP:4400-4403 -sTCP:LISTEN 2>/dev/null || true)"
  if [ -z "$pids" ]; then
    log "ports 4400-4403 free"
    return 0
  fi
  log "killing host listeners on 4400-4403: $pids"
  # shellcheck disable=SC2086
  kill $pids 2>/dev/null || true
  sleep 1
  pids="$(lsof -t -nP -iTCP:4400-4403 -sTCP:LISTEN 2>/dev/null || true)"
  if [ -n "$pids" ]; then
    log "force-killing: $pids"
    # shellcheck disable=SC2086
    kill -9 $pids 2>/dev/null || true
    sleep 1
  fi
  if lsof -nP -iTCP:4400-4403 -sTCP:LISTEN >/dev/null 2>&1; then
    log "ERROR: still cannot free 4400-4403"
    lsof -nP -iTCP:4400-4403 -sTCP:LISTEN || true
    exit 1
  fi
  log "ports 4400-4403 free"
}

if [ "$SKIP_PORT_KILL" != "1" ]; then
  free_host_mcp_ports
fi

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  log "starting devenv containers via ./manage.sh start-devenv"
  ./manage.sh start-devenv
  # wait until container is running
  for i in $(seq 1 30); do
    if docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
      break
    fi
    sleep 2
  done
  if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
    log "ERROR: $CONTAINER did not start"
    exit 1
  fi
  sleep 3
else
  log "container $CONTAINER already running"
fi

# Prefer local builtin templates when host cannot reach GitHub raw (common).
# Place files at /tmp/penpot-builtin-templates/<id> or backend/builtin-templates/<id>.
seed_builtin_templates() {
  local host_dir=""
  if [ -d /tmp/penpot-builtin-templates ] && [ "$(ls -A /tmp/penpot-builtin-templates 2>/dev/null | head -1)" ]; then
    host_dir=/tmp/penpot-builtin-templates
  elif [ -d "$ROOT/backend/builtin-templates" ] && [ "$(ls -A "$ROOT/backend/builtin-templates" 2>/dev/null | head -1)" ]; then
    host_dir="$ROOT/backend/builtin-templates"
  fi
  if [ -z "$host_dir" ]; then
    log "no local builtin-templates cache (optional)"
    return 0
  fi
  log "seeding builtin-templates from $host_dir"
  docker exec "$CONTAINER" mkdir -p /home/penpot/penpot/backend/builtin-templates
  docker cp "$host_dir/." "$CONTAINER:/home/penpot/penpot/backend/builtin-templates/"
  docker exec "$CONTAINER" bash -lc 'chown -R penpot:ubuntu /home/penpot/penpot/backend/builtin-templates 2>/dev/null || true'
}

seed_builtin_templates

# Ensure wasm artifact exists (previous successful build). Rebuild only if missing.
HAS_WASM=0
if docker exec "$CONTAINER" test -f /home/penpot/penpot/frontend/resources/public/js/render-wasm.wasm; then
  HAS_WASM=1
  log "render-wasm artifact present"
else
  log "render-wasm missing — will attempt build with Rust 1.91.0"
fi

log "starting services in tmux session '$SESSION' inside $CONTAINER"

docker exec -u penpot -e HAS_WASM="$HAS_WASM" -e NO_FRONTEND_WATCH="$NO_FRONTEND_WATCH" -e SESSION="$SESSION" \
  "$CONTAINER" bash -lc '
set -euo pipefail
export HOME=/home/penpot
export EMSDK_QUIET=1
# Prefer image-pinned Rust for wasm; keep PATH usable for node/pnpm/clojure
export RUSTUP_HOME=/opt/rustup
export RUSTUP_TOOLCHAIN="${RUSTUP_TOOLCHAIN:-1.91.0}"
export CARGO_HOME=/home/penpot/.cache/cargo
export CARGO_TARGET_DIR=/home/penpot/.cache/cargo/target
export XDG_CACHE_HOME=/home/penpot/.cache
export PATH="/opt/cargo/bin:/opt/node/bin:/opt/jdk/bin:/opt/clojure/bin:$PATH"
export PENPOT_MCP_SERVER_HOST=0.0.0.0
export PENPOT_MCP_PLUGIN_SERVER_HOST=0.0.0.0
export CI=true

source /opt/emsdk/emsdk_env.sh 2>/dev/null || true
mkdir -p "$CARGO_HOME" "$CARGO_TARGET_DIR"

if [ "${HAS_WASM}" != "1" ]; then
  echo "[full-client] building render-wasm..."
  cd /home/penpot/penpot/render-wasm
  . ./_build_env
  export CARGO_TARGET_DIR=/home/penpot/.cache/cargo/target
  export CARGO_HOME=/home/penpot/.cache/cargo
  rustup target add wasm32-unknown-emscripten --toolchain 1.91.0 >/dev/null
  cargo +1.91.0 build
  copy_artifacts "../frontend/resources/public/js"
  copy_shared_artifact || true
fi

tmux kill-session -t "$SESSION" 2>/dev/null || true
tmux -2 new-session -d -s "$SESSION" -n backend
tmux send-keys -t "$SESSION":backend "cd ~/penpot/backend && ./scripts/start-dev" Enter

if [ "${NO_FRONTEND_WATCH}" = "1" ]; then
  tmux new-window -t "$SESSION" -n frontend
  tmux send-keys -t "$SESSION":frontend "echo frontend watch skipped; ls -la ~/penpot/frontend/resources/public/js/main.js ~/penpot/frontend/resources/public/js/render-wasm.wasm" Enter
else
  tmux new-window -t "$SESSION" -n frontend
  tmux send-keys -t "$SESSION":frontend "cd ~/penpot/frontend && pnpm exec concurrently --kill-others-on-fail \"pnpm run watch:app:assets\" \"pnpm run watch:app:main\" \"pnpm run watch:app:libs\"" Enter
fi

# MCP must run from packages/server so data/initial_instructions.md resolves.
# Build dist when missing (mirrors plugin fallback).
tmux new-window -t "$SESSION" -n mcp
tmux send-keys -t "$SESSION":mcp "cd ~/penpot/mcp/packages/server && export PENPOT_MCP_SERVER_HOST=0.0.0.0 && if [ ! -f dist/index.js ]; then echo '[full-client] building MCP server dist...'; (cd ~/penpot/mcp && pnpm install && pnpm --filter @penpot/mcp-server build) || pnpm run build; fi && test -f dist/index.js || { echo '[full-client] ERROR: packages/server/dist/index.js missing after build'; sleep infinity; } && node dist/index.js" Enter

tmux new-window -t "$SESSION" -n plugin
tmux send-keys -t "$SESSION":plugin "cd ~/penpot/mcp/packages/plugin && (test -f dist/manifest.json || pnpm build) && pnpm exec vite preview --host 0.0.0.0 --port 4400 --strictPort" Enter

tmux ls
'

log "waiting for endpoints..."
ready=0
for i in $(seq 1 60); do
  ui=$(http_code "http://127.0.0.1:3450/")
  be=$(http_code "http://127.0.0.1:6060/api/rpc/command/get-profile")
  mcp=$(http_code "http://127.0.0.1:4401/status")
  plug=$(http_code "http://127.0.0.1:4400/manifest.json")
  log "t=$i ui=$ui be=$be mcp=$mcp plug=$plug"
  if [ "$ui" = "200" ] && [ "$be" = "200" ] && [ "$mcp" = "200" ] && [ "$plug" = "200" ]; then
    ready=1
    break
  fi
  sleep 5
done

print_status | tee /tmp/penpot-full-client-status-live.txt

if [ "$ready" != "1" ]; then
  log "WARN: stack not fully ready yet. Inspect tmux inside container:"
  log "  docker exec -it $CONTAINER sudo -u penpot -H tmux attach -t $SESSION"
  exit 1
fi

log "full client ready"
log "  UI:      http://localhost:3450/"
log "  Backend: http://127.0.0.1:6060"
log "  MCP:     http://127.0.0.1:4401/status"
log "  Plugin:  http://127.0.0.1:4400/manifest.json"
log "tmux: docker exec -it $CONTAINER sudo -u penpot -H tmux attach -t $SESSION"
