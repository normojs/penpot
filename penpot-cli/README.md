# penpot-cli

`penpot-cli` is the command-line entry point for this fork's first-class MCP
and automation work. It lives at the top level of the Penpot monorepo because it
coordinates frontend, backend, exporter, MCP, and future shared command runtime
surfaces.

The current package is private and intended for private fork checkout usage.
It is not published to npm yet, but the workspace can generate a private
portable release archive that includes the built CLI and the
`@penpot/command-runtime` runtime files.

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
pnpm cli:install-check
pnpm cli:package-check
pnpm --filter penpot-cli types:check
pnpm --filter penpot-cli lint
```

During development, rebuild before using `node penpot-cli/dist/index.js` if
`penpot-cli/src/index.ts` has changed.

## Build And Install Strategy

Current packaging decisions:

| Topic | Decision |
| --- | --- |
| Package name | `penpot-cli` |
| Binary name | `penpot-cli` |
| Package visibility | Private workspace package; no npm publish yet |
| Versioning | CLI package semver is independent from the Penpot product version; fork releases are tied together by git tag and changelog |
| Supported install path | Private checkout build, workspace global link, or private portable archive |

Fresh checkout verification:

```bash
pnpm install
pnpm cli:install-check
```

Portable archive verification:

```bash
pnpm cli:package-check
```

The check builds the CLI, writes
`tmp/penpot-cli-release/penpot-cli-<version>.tar.gz`, extracts it, and verifies
that both direct execution and the packaged `bin/penpot-cli` wrapper run
without a global workspace link.

The archive layout is:

```text
penpot-cli-<version>/
  README.md
  RELEASE.md
  package.json
  bin/penpot-cli
  dist/index.js
  node_modules/@penpot/command-runtime/
```

Local workspace link for repeated terminal use:

```bash
pnpm --filter penpot-cli build
pnpm --dir penpot-cli link --global
penpot-cli --help
```

Do not treat `pnpm pack`, `npm publish`, or a copied `dist/` directory as a
supported artifact yet. The supported portable artifact is the generated
release archive because it carries the CLI build and the private
`@penpot/command-runtime` dependency boundary together.

The full packaging decision is tracked in
`mcp/docs/penpot-cli-build-install-strategy.md`.

## MCP Diagnostics

Inspect the public MCP status endpoint:

```bash
node penpot-cli/dist/index.js mcp status
node penpot-cli/dist/index.js mcp status --format json
node penpot-cli/dist/index.js mcp status --url http://localhost:3449/mcp/status
```

Print the effective MCP connection config used by local clients. The JSON
output keeps the legacy camelCase URL fields for scripts and also includes a
`profileProps.mcp-config` view whose field names match the persisted
`profile.props.mcp-config` model.

```bash
node penpot-cli/dist/index.js mcp config
node penpot-cli/dist/index.js mcp config --mode local
node penpot-cli/dist/index.js mcp config --format json
```

By default `mcp config` does not contact the backend. Use an explicit
profile source when the CLI should merge saved Penpot profile settings into
the effective output:

```bash
node penpot-cli/dist/index.js mcp config \
  --profile-source auto \
  --backend-uri http://localhost:6060 \
  --token <auth-token> \
  --format json

node penpot-cli/dist/index.js mcp config \
  --profile-source backend \
  --backend-uri http://localhost:6060 \
  --token <auth-token>
```

Profile source modes:

| Source | Behavior |
| --- | --- |
| `off` | Default. Use flags, environment variables, and runtime defaults only; no network request. |
| `auto` | Read `profile.props.mcp-config` only when a token is present; fall back to local config with warning metadata on missing auth or backend failure. |
| `backend` | Require a token, call backend `get-profile`, and fail clearly if auth, network, backend, or anonymous-profile resolution fails. |

Field precedence is `flag > env > profile > default/derived`.
`logDir` remains local-only through `--dir`, `--log-dir`, or
`PENPOT_MCP_LOG_DIR`. JSON output includes `configSource` and `fieldSources`
metadata and never prints token values.

Inspect local MCP log files:

```bash
PENPOT_MCP_LOG_DIR=/tmp/penpot-mcp \
  node penpot-cli/dist/index.js mcp logs

node penpot-cli/dist/index.js mcp logs --dir /tmp/penpot-mcp --follow
```

MCP URL environment variables:

| Variable | Purpose | Default |
| --- | --- | --- |
| `PENPOT_MCP_MODE` | MCP config mode: `builtin`, `custom`, or `local` | `builtin` |
| `PENPOT_MCP_AUTO_CONNECT` | Persisted-model auto-connect value shown by config output | `true` |
| `PENPOT_MCP_PUBLIC_URI` | Public Penpot base URL for MCP routes | `http://localhost:3449` |
| `PENPOT_MCP_STREAM_URI` | Explicit streamable HTTP URL | `<public>/mcp/stream` |
| `PENPOT_MCP_SSE_URI` | Explicit SSE URL | `<public>/mcp/sse` |
| `PENPOT_MCP_WEBSOCKET_URI` | Explicit WebSocket URL | `<public>/mcp/ws` |
| `PENPOT_MCP_STATUS_URI` | Explicit status URL | `<public>/mcp/status` |
| `PENPOT_MCP_LOG_DIR` | Directory containing MCP `.log` files | Not configured |
| `PENPOT_MCP_PROFILE_SOURCE` | Config profile source: `off`, `auto`, or `backend` | `off` |
| `PENPOT_BACKEND_URI` | Backend RPC URI for profile-source `auto`/`backend` | `http://localhost:6060` |
| `PENPOT_CLI_TOKEN` | Penpot auth-token/session token for authenticated profile reads | Not configured |

Mode defaults:

| Mode | Default endpoints |
| --- | --- |
| `builtin` | `<public>/mcp/stream`, `<public>/mcp/sse`, `<public>/mcp/ws`, `<public>/mcp/status` |
| `custom` | Same derivation as `builtin`, usually with explicit `PENPOT_MCP_*_URI` overrides |
| `local` | `http://localhost:4401/mcp`, `http://localhost:4401/sse`, `ws://localhost:4402`, `http://localhost:4401/status` |

For Docker and reverse-proxy setup details, see
`mcp/docs/self-hosted-mcp-gateway.md`.

For release verification of headless CLI/MCP editing and exporter artifacts,
see `mcp/docs/headless-edit-export-smoke-flow.md`. It walks through a complete
explicit-id flow that creates a file, page, frame, rectangle, and text shape,
updates a shape, dry-runs preview/export requests, and writes output files
without opening or binding a workspace.

For release verification of the handoff from CLI/headless edits into a live
workspace MCP context, see `mcp/docs/live-bind-smoke-flow.md`. It opens the
workspace URL, binds the plugin-reported context, runs a plugin-live command,
releases the context, and checks multi-tab ownership.

For CI-friendly checks before committing CLI, MCP, frontend, backend, packaging,
or smoke-flow changes, see `mcp/docs/ci-friendly-check-commands.md`. It lists
the exact commands and how to classify missing local tools separately from
product failures.

## Development Orchestration

Preview the MCP-enabled local development plan:

```bash
node penpot-cli/dist/index.js dev up --mcp --dry-run
node penpot-cli/dist/index.js dev up --mcp --dry-run --format json
node penpot-cli/dist/index.js dev up --mcp --mode host --dry-run --format json
node penpot-cli/dist/index.js dev up --mcp --mode hybrid --dry-run --format json
```

Start the current Docker-based development dependencies:

```bash
node penpot-cli/dist/index.js dev up --mcp --mode devenv
```

The first implementation is intentionally conservative: `devenv` mode checks
`./manage.sh` and Docker, then delegates dependency startup to
`./manage.sh start-devenv`. It does not yet replace the normal
`./manage.sh run-devenv` workflow. `host` and `hybrid` modes are planning-only
for startup, but their dry-run JSON includes dependency checks, port checks,
planned services, public/internal MCP surfaces, and unsupported-startup
boundaries.

## Renderer-Service Lifecycle

Inspect the local renderer-service no-op host plan without starting or probing
it:

```bash
node penpot-cli/dist/index.js renderer-service status --format json
node penpot-cli/dist/index.js renderer-service status --host 127.0.0.1 --port 6072
```

`renderer-service status` reports the build cache, `/health`, and `/thumbnail`
endpoints plus the exact manual command to run. It also shows whether
`PENPOT_RENDERER_SERVICE_BACKEND_URI` or `PENPOT_BACKEND_URI` will be used for
disabled backend RPC endpoint planning, and whether
`PENPOT_RENDERER_SERVICE_RUNTIME_MODULE` is configured for a local runtime
adapter module. It also reports the optional browser fixture runtime
configuration from `PENPOT_RENDERER_SERVICE_BROWSER_FIXTURE_RUNTIME=enabled`,
including invalid-mode and runtime-module conflict diagnostics. It does not
create a process, make an HTTP request, import the module, start a browser, or
execute backend RPCs. `renderer-service start` deliberately returns the same
command as a structured manual-start boundary; it does not spawn a child
process:

```bash
pnpm --filter @penpot/renderer-service start:noop
```

After starting the host, stop it with `Ctrl-C` or `SIGTERM`. The host returns a
validated fixture PNG resource for explicitly opted-in `render thumbnail`
requests. When the host reports a bundled runtime asset preflight execution,
`render thumbnail --format json` includes a redacted
`healthPreflight.runtimeAssetPreflight` summary with ready/degraded asset and
cache-output diagnostics, omitting local paths, hashes, source data, media
values, and token values. Degraded summaries include stable `diagnosticCodes`,
redacted `diagnostics`, and `nextActions` for missing public assets, missing
cache assets, unavailable cache outputs, hash failures, or invalid operator
configuration. The same JSON result also includes
`healthPreflight.browserFixtureRuntime`, a redacted P26.31 lifecycle summary
when the host reports the browser fixture adapter. It reports configuration,
startup, render counts, page reuse, non-empty PNG validation, close state, and
side-effect flags while omitting browser paths, runtime module paths,
workspace/cache roots, source/page data, artifact/media bytes, and token
values. It also includes
`healthPreflight.runtimeAssetMaterializationDryRun`, a metadata-only copy/cache
plan with approval-required state and false write/browser/runtime side-effect
flags, plus `healthPreflight.runtimeAssetMaterializationApproval`, a disabled
approval token/config/audit scaffold with token acceptance, audit writes, and
cache writes all false. If the future approval mode, token, or audit env vars
are present, status/health output reports redacted P26.28 unsupported
configuration diagnostics with configured booleans only; token and audit values
are not read or included. The approval summary also includes
`readinessVerdict`, a P26.29 computed metadata-only verdict with blocked
checks, blocker codes, next actions, and false token/audit/write/dispatch
side-effect flags; it never trusts approvals or enables materialization. Enable
the read-only host preflight with
`PENPOT_RENDERER_SERVICE_RUNTIME_ASSET_PREFLIGHT=read-only`,
`PENPOT_RENDERER_SERVICE_RUNTIME_ASSET_PREFLIGHT_WORKSPACE_ROOT=<absolute>`,
and optionally
`PENPOT_RENDERER_SERVICE_RUNTIME_ASSET_PREFLIGHT_CACHE_ROOT=<absolute>`;
`renderer-service status/start` shows these settings plus configuration
diagnostics, the approval-required materialization dry-run boundary, and the
future approval env names without probing, reading files, reading tokens,
writing audit records, or enabling cache writes. Backend RPC execution and real
scene rendering remain disabled.

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

`file open` prints a browser URL plus handoff next actions in JSON output. It
does not bind an MCP file context; open the URL, wait for `file.get_context` to
show an available workspace context, then use the Penpot workspace MCP controls
or MCP `file.bind_context` for binding.

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

Shape create, update, delete, and alias commands call backend headless shape
commands. They work without an open Penpot workspace tab when a valid file id,
target ids, and token are provided.

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

node penpot-cli/dist/index.js shape set-layout \
  --file <file-id> \
  --shape <frame-id> \
  --page <page-id> \
  --layout flex \
  --layout-direction column \
  --layout-gap 12 \
  --layout-padding 16 \
  --format json

node penpot-cli/dist/index.js shape set-style \
  --file <file-id> \
  --shape <shape-id> \
  --page <page-id> \
  --fill "#111111" \
  --stroke "#333333" \
  --border-radius 8 \
  --content "Welcome" \
  --font-size 24 \
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
`shape set-layout` and `shape set-style` are script-friendly aliases over
`shape update`; they use the same backend RPC but reject options outside their
layout-only or style/text-only scopes.

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

`render preview` uses the same exporter adapter but fixes the output format to
PNG and reports `artifact.kind: "preview"` in JSON output.

```bash
node penpot-cli/dist/index.js render preview \
  --file <file-id> \
  --page <page-id> \
  --object <frame-or-shape-id> \
  --scale 2 \
  --output ./out/preview.png \
  --token "$PENPOT_CLI_TOKEN" \
  --format json
```

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
pnpm --filter penpot-cli test
pnpm --filter penpot-cli smoke:help
pnpm cli:install-check
```
