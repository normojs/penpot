# Standalone Install Guide

How to install and run **penpot-cli** and the **MCP server** from this private
fork without guessing. This is the Phase 30.2 operator entry point.

| Audience | Path |
| --- | --- |
| Want CLI only on a machine | [A. Portable CLI archive](#a-portable-cli-archive) |
| Developing or running full MCP | [B. Fork checkout (MCP + CLI)](#b-fork-checkout-mcp--cli) |
| Already self-hosting Penpot | [C. Wire MCP into a deploy](#c-wire-mcp-into-a-deploy) |

Related:

- [`private-release-0.1.0.md`](./private-release-0.1.0.md) — known limits  
- [`distribution-and-versioning.md`](./distribution-and-versioning.md) — archive vs npm decision  
- [`penpot-cli-build-install-strategy.md`](./penpot-cli-build-install-strategy.md) — packaging  
- [`self-hosted-mcp-gateway.md`](./self-hosted-mcp-gateway.md) — gateway notes  
- [`multi-user-mode.md`](./multi-user-mode.md) — multi-user mode  
- [`production-multi-user-hardening.md`](./production-multi-user-hardening.md) — production defaults  
- [`product-positioning.md`](./product-positioning.md) — capability matrix & support boundary  
- [`thumbnail-and-preview-experience.md`](./thumbnail-and-preview-experience.md) — visuals policy  

## Prerequisites

| Requirement | Notes |
| --- | --- |
| **Node.js ≥ 18** | Required for CLI archive and MCP TypeScript packages |
| **pnpm** (checkout path) | Monorepo uses pnpm workspaces |
| **Running Penpot backend** (for most RPC commands) | Default local backend `http://localhost:6060` |
| **Browser + plugin** (for live-only tools) | selection / current page / some exports |

## A. Portable CLI Archive

No monorepo required for the CLI binary.

### 1. Obtain the archive

On a packaging machine with this repo:

```bash
git checkout cli-v0.1.0   # or current packaging tip
pnpm install
pnpm cli:package-check
# → tmp/penpot-cli-release/penpot-cli-0.1.0.tar.gz
```

Copy **only** the tarball to the target machine.

### 2. Extract and smoke

```bash
tar -xzf penpot-cli-0.1.0.tar.gz
cd penpot-cli-0.1.0

./bin/penpot-cli --version
./bin/penpot-cli --help
./bin/penpot-cli debug --help
./bin/penpot-cli mcp config --format text
```

### 3. Configure endpoints

```bash
export PENPOT_PUBLIC_URI=http://localhost:3449
export PENPOT_BACKEND_URI=http://localhost:6060
export PENPOT_MCP_STATUS_URI=http://localhost:3449/mcp/status   # if MCP is up
export PENPOT_CLI_TOKEN=...                                     # Penpot access token for RPC
```

Common commands:

```bash
./bin/penpot-cli mcp status --format json
./bin/penpot-cli token status --format json
./bin/penpot-cli account me --format json
./bin/penpot-cli team list --format json
./bin/penpot-cli file list --project-id <uuid> --format json
```

### What the archive does **not** include

- MCP server process  
- Penpot frontend/backend  
- renderer-service  
- Browser plugin  

For those, use path B or C.

## B. Fork Checkout (MCP + CLI)

### 1. Clone and install

```bash
git clone https://github.com/normojs/penpot.git
cd penpot
git checkout cli-v0.1.0   # or main
pnpm install
```

### 2. Build CLI

```bash
pnpm --filter penpot-cli build
pnpm cli:install-check
# or
node penpot-cli/dist/index.js --help
```

Optional global link (dev machine only):

```bash
pnpm --filter penpot-cli build
pnpm --dir penpot-cli link --global
penpot-cli --help
```

### 3. Build / run MCP server package

```bash
cd mcp/packages/server
pnpm run build
# development:
pnpm run start:dev
# multi-user:
pnpm run start:dev:multi-user
```

Default local expectations (builtin mode):

| Endpoint | Typical local URL |
| --- | --- |
| Public Penpot | `http://localhost:3449` |
| MCP stream | `http://localhost:3449/mcp/stream` |
| MCP status | `http://localhost:3449/mcp/status` |
| MCP WebSocket (plugin) | `http://localhost:3449/mcp/ws` |
| Backend RPC | `http://localhost:6060` |

Exact ports depend on your devenv/docker layout; override with env vars below.

### 4. Token setup

1. In Penpot: **Settings → Integrations** (or your fork’s MCP token UI).  
2. Create/regenerate an MCP access token.  
3. Configure the MCP client with `userToken` on the stream URL as documented for
   your agent (Claude/Cursor/etc.).  
4. For CLI RPC:

```bash
export PENPOT_CLI_TOKEN=<session-or-access-token>
penpot-cli token status --format json
```

`token status` returns **presence/expiry only** — never the raw token value.

### 5. First agent checklist

1. MCP client connects → call `mcp.get_status`.  
2. Plugin browser session authenticated and compatible.  
3. `file.get_context` / `file.bind_context` before file-scoped tools.  
4. Prefer typed tools; leave `execute_code` and debug tools disabled unless needed.

## C. Wire MCP Into A Deploy

High level (details in gateway / multi-user docs):

1. Deploy this **fork** (or cherry-pick MCP packages onto your self-hosted image).  
2. Expose MCP stream/status/ws through your edge (TLS, auth as required).  
3. Ensure plugin can reach the WebSocket endpoint.  
4. Set multi-user/remote flags intentionally:

| Env | Effect |
| --- | --- |
| Multi-user / remote mode | Session scoping; FS access typically off when remote |
| `PENPOT_MCP_REQUIRE_DESTRUCTIVE_CONFIRMATION` | Force confirm for destructive tools |
| `PENPOT_MCP_ENABLE_EXECUTE_CODE=true` | Enable legacy JS execution (**off by default**) |
| `PENPOT_MCP_ENABLE_DEBUG_TOOLS=true` | Enable `debug.get_plugin_state` (**off by default**) |

Do not enable execute_code or debug tools on shared production hosts without a
policy.

## Environment Reference (CLI + MCP)

### CLI

| Variable | Purpose |
| --- | --- |
| `PENPOT_CLI_TOKEN` | Preferred CLI auth token |
| `PENPOT_MCP_USER_TOKEN` | Alternate token name |
| `PENPOT_ACCESS_TOKEN` | Alternate token name |
| `PENPOT_BACKEND_URI` | Backend RPC base (default `http://localhost:6060`) |
| `PENPOT_PUBLIC_URI` | Public web base (default `http://localhost:3449`) |
| `PENPOT_MCP_STATUS_URI` | Override status URL |
| `PENPOT_MCP_STREAM_URI` | Override stream URL |
| `PENPOT_MCP_WEBSOCKET_URI` | Override plugin WS URL |
| `PENPOT_MCP_MODE` | `builtin` / `custom` / `local` config mode |
| `PENPOT_MCP_LOG_DIR` | Log directory for `mcp logs` |

### MCP server (selected)

| Variable | Purpose |
| --- | --- |
| `PENPOT_MCP_ENABLE_EXECUTE_CODE` | Gate `execute_code` |
| `PENPOT_MCP_ENABLE_DEBUG_TOOLS` | Gate `debug.get_plugin_state` |
| `PENPOT_MCP_REQUIRE_DESTRUCTIVE_CONFIRMATION` | `true` / `false` override |
| `PENPOT_MCP_LOG_DIR` | File logging |

Renderer-service variables are separate; thumbnail is **not** a default-GA path
in 0.1.0 — see render-thumbnail docs and Phase 31.

## Verification Commands

```bash
# CLI archive or checkout
penpot-cli --version
penpot-cli mcp config --format json
penpot-cli mcp status --format json          # needs status URL up
penpot-cli token status --format json        # needs token + backend

# From monorepo packaging tip
pnpm --filter penpot-cli types:check
pnpm --filter penpot-cli test
pnpm cli:package-check
```

## Troubleshooting

| Symptom | What to try |
| --- | --- |
| `authentication_required` | Set `PENPOT_CLI_TOKEN`; check backend URI |
| `mcp_status_unreachable` | Start MCP; set `PENPOT_MCP_STATUS_URI` |
| `file_context_required` | Open file in browser plugin session; `file.bind_context` |
| `execute_code_disabled` / `debug_tools_disabled` | Set the matching enable env on **MCP server**, restart |
| `renderer_service_unavailable` | Expected without operator renderer setup; use dry-run or docs |
| Archive command not found | Use `./bin/penpot-cli` from extracted dir; Node ≥ 18 on PATH |

## Support Boundary (short)

This fork is a **private product surface**. Issues should include:

- CLI version / git tag or SHA  
- Node version  
- Single-user vs multi-user  
- Exact command + redacted env  
- Whether MCP server and plugin were connected  

See Phase 34 in `todo.md` for full support-boundary work.
