# penpot-cli

`penpot-cli` is the command-line entry point for this fork's first-class MCP
and automation work. It lives at the top level of the Penpot monorepo because it
coordinates frontend, backend, exporter, MCP, and future shared command runtime
surfaces.

The current package is private and intended for local development.

## Quick Start

Run commands from the repository root.

```bash
pnpm install
pnpm --filter penpot-cli build
node penpot-cli/dist/index.js --help
```

Useful root shortcuts:

```bash
pnpm cli:build
pnpm cli:help
pnpm --filter penpot-cli types:check
pnpm --filter penpot-cli lint
```

During development, rebuild before using `node penpot-cli/dist/index.js` if
`penpot-cli/src/index.ts` has changed.

## MCP Diagnostics

Inspect the public MCP status endpoint:

```bash
node penpot-cli/dist/index.js mcp status
node penpot-cli/dist/index.js mcp status --format json
node penpot-cli/dist/index.js mcp status --url http://localhost:3449/mcp/status
```

Print the derived MCP URLs used by local clients:

```bash
node penpot-cli/dist/index.js mcp config
node penpot-cli/dist/index.js mcp config --format json
```

Inspect local MCP log files:

```bash
PENPOT_MCP_LOG_DIR=/tmp/penpot-mcp \
  node penpot-cli/dist/index.js mcp logs

node penpot-cli/dist/index.js mcp logs --dir /tmp/penpot-mcp --follow
```

MCP URL environment variables:

| Variable | Purpose | Default |
| --- | --- | --- |
| `PENPOT_MCP_PUBLIC_URI` | Public Penpot base URL for MCP routes | `http://localhost:3449` |
| `PENPOT_MCP_STREAM_URI` | Explicit streamable HTTP URL | `<public>/mcp/stream` |
| `PENPOT_MCP_SSE_URI` | Explicit SSE URL | `<public>/mcp/sse` |
| `PENPOT_MCP_WEBSOCKET_URI` | Explicit WebSocket URL | `<public>/mcp/ws` |
| `PENPOT_MCP_STATUS_URI` | Explicit status URL | `<public>/mcp/status` |
| `PENPOT_MCP_LOG_DIR` | Directory containing MCP `.log` files | Not configured |

## Development Orchestration

Preview the MCP-enabled local development plan:

```bash
node penpot-cli/dist/index.js dev up --mcp --dry-run
node penpot-cli/dist/index.js dev up --mcp --dry-run --format json
```

Start the current Docker-based development dependencies:

```bash
node penpot-cli/dist/index.js dev up --mcp --mode devenv
```

The first implementation is intentionally conservative: `devenv` mode checks
`./manage.sh` and Docker, then delegates dependency startup to
`./manage.sh start-devenv`. It does not yet replace the normal
`./manage.sh run-devenv` workflow. `host` and `hybrid` modes are planned.

## File Commands

File list and create commands call Penpot backend RPC directly. They require a
Penpot token with normal access to the target project.

```bash
export PENPOT_BACKEND_URI=http://localhost:6060
export PENPOT_CLI_TOKEN=<token>

node penpot-cli/dist/index.js file list --project-id <project-id>
node penpot-cli/dist/index.js file list --project-id <project-id> --format json

node penpot-cli/dist/index.js file create \
  --project-id <project-id> \
  --name "CLI prototype"

node penpot-cli/dist/index.js file create \
  --project-id <project-id> \
  --name "Shared CLI prototype" \
  --shared \
  --format json
```

Open a workspace URL for a file:

```bash
node penpot-cli/dist/index.js file open <file-id>
node penpot-cli/dist/index.js file open <file-id> --team-id <team-id> --page-id <page-id>
```

`file open` only prints a browser URL. It does not bind an MCP file context;
use the Penpot workspace MCP controls or MCP `file.bind_context` for binding.

File command environment variables:

| Variable | Purpose | Default |
| --- | --- | --- |
| `PENPOT_BACKEND_URI` | Backend RPC base URI for file list/create | `http://localhost:6060` |
| `PENPOT_PUBLIC_URI` | Backend fallback and browser URL base | Command-specific fallback |
| `PENPOT_CLI_TOKEN` | Preferred CLI token for backend RPC | Required for list/create |
| `PENPOT_MCP_USER_TOKEN` | MCP user token fallback | Used when CLI token is absent |
| `PENPOT_ACCESS_TOKEN` | Generic token fallback | Used when other tokens are absent |

`file open` resolves its browser URL from `--public-uri`, then
`PENPOT_PUBLIC_URI`, then `PENPOT_MCP_PUBLIC_URI`, then
`http://localhost:3449`.

## Page Commands

Page list and create commands call the backend headless page RPC commands. They
work without an open Penpot workspace tab when a valid file id and token are
provided.

```bash
export PENPOT_BACKEND_URI=http://localhost:6060
export PENPOT_CLI_TOKEN=<token>

node penpot-cli/dist/index.js page list --file <file-id>
node penpot-cli/dist/index.js page list --file <file-id> --format json

node penpot-cli/dist/index.js page create \
  --file <file-id> \
  --name "Mobile flow"

node penpot-cli/dist/index.js page create \
  --file <file-id> \
  --page-id <page-id> \
  --name "Generated prototype" \
  --format json
```

JSON output reports `adapter: "backend-command"` so scripts can distinguish the
headless path from live plugin-backed MCP operations. The matching MCP
`page.list` and `page.create` tools use the same backend-command path when
`fileId` is supplied, while calls without `fileId` keep using the bound live
workspace context. Page command JSON also includes `adapterSelection` with the
requested adapter, selected adapter, candidates, and fallback reasons.

## Shape Commands

Shape create, update, and delete commands call backend headless shape commands.
They work without an open Penpot workspace tab when a valid file id, target ids,
and token are provided.

```bash
node penpot-cli/dist/index.js shape create-frame \
  --file <file-id> \
  --page <page-id> \
  --name "Mobile" \
  --x 0 \
  --y 0 \
  --width 390 \
  --height 844 \
  --fill "#ffffff"

node penpot-cli/dist/index.js shape create-rect \
  --file <file-id> \
  --page <page-id> \
  --parent <frame-id> \
  --name "CTA" \
  --x 24 \
  --y 32 \
  --width 180 \
  --height 48 \
  --fill "#3366ff" \
  --border-radius 8 \
  --format json

node penpot-cli/dist/index.js shape create-text \
  --file <file-id> \
  --page <page-id> \
  --parent <frame-id> \
  --x 24 \
  --y 96 \
  --width 240 \
  --height 40 \
  --content "Welcome" \
  --font-size 24

node penpot-cli/dist/index.js shape update \
  --file <file-id> \
  --shape <shape-id> \
  --page <page-id> \
  --x 32 \
  --y 112 \
  --width 260 \
  --fill "#445566" \
  --border-radius 12 \
  --format json

node penpot-cli/dist/index.js shape delete \
  --file <file-id> \
  --shape <shape-id> \
  --format json
```

JSON output reports `adapter: "backend-command"` and includes
`adapterSelection`. MCP `shape.create_frame`, `shape.create_rect`, and
`shape.create_text` use the same backend-command path when `fileId` and
`pageId` are supplied. MCP `shape.update` and `shape.delete` use
backend-command when `fileId` and `shapeId` are supplied; calls without
explicit file/page targets continue to use the bound live workspace context.

## Export Commands

The CLI can execute exporter-backed page export requests. The headless path
requires explicit file, page, and object ids because the exporter cannot infer
the current workspace selection.

```bash
node penpot-cli/dist/index.js export page \
  --file <file-id> \
  --page <page-id> \
  --object <frame-or-shape-id> \
  --adapter auto \
  --export-format pdf \
  --dry-run

node penpot-cli/dist/index.js export page \
  --file <file-id> \
  --page <page-id> \
  --object <frame-or-shape-id> \
  --export-format png \
  --scale 2 \
  --output ./out/page.png \
  --exporter-uri http://localhost:6061 \
  --token "$PENPOT_CLI_TOKEN" \
  --format json
```

Dry-run output includes the exporter URI, the planned `export-shapes` request,
the required Transit JSON content type, and the fields that still need runtime
resolution before execution, such as `profileId` when it is not supplied by
`--profile-id` or `PENPOT_PROFILE_ID`. JSON output includes
`adapterSelection` so scripts can see the requested adapter, selected adapter,
and plugin-live fallback status.

When `--dry-run` is omitted, the CLI posts the Transit request to the exporter
service using `Cookie: auth-token=<token>`. If `profileId` is not provided, it
resolves the current profile through backend `get-profile` using the same token.
Without `--output`, the command returns the uploaded exporter resource
metadata. With `--output`, it downloads the returned resource URI and writes the
bytes to the requested path.

Exporter execution needs the normal Penpot frontend, backend, and exporter
services running. For local development, use an auth-token/session token in
`--token`, `PENPOT_CLI_TOKEN`, or `PENPOT_MCP_USER_TOKEN`; pass `--profile-id`
or set `PENPOT_PROFILE_ID` if profile resolution is not available.

## Verification

Run the focused CLI checks before committing CLI changes:

```bash
pnpm --filter penpot-cli types:check
pnpm --filter penpot-cli lint
pnpm --filter penpot-cli build
pnpm --filter penpot-cli smoke:help
```
