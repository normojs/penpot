# First-Class MCP Architecture Plan

Status: draft
Target fork: `penpot-cli` based on Penpot `2.15.4`
Scope: MCP, built-in MCP plugin, Penpot automation, future CLI integration

## Execution Tracking

Implementation progress is tracked in the repository root `todo.md`.

AI coding agents should follow the fork-specific rules in the repository root
`AI_CODE_RULES.md`.

The current compact architecture and delivery baseline is
[`penpot-cli-overall-blueprint.md`](penpot-cli-overall-blueprint.md). This
document keeps the historical design notes, implementation decisions, and phase
details that led to that baseline.

Every implementation step should update the tracking files as follows:

1. Mark the active task in `todo.md` before starting work.
2. Mark the task `done` or `blocked` when the step finishes.
3. Update this architecture document when the implementation changes the plan.
4. Update `CHANGES.md` for user-visible behavior, docs, or project structure.

## 1. Goal

Make MCP a first-class Penpot capability instead of a feature that only works
after the user opens a file and manually connects a plugin.

The intended product shape is:

```text
Penpot starts / user logs in
  -> MCP can be enabled or disabled by the user
  -> MCP can use built-in defaults or manual configuration
  -> the built-in MCP plugin can run in the background
  -> global MCP tools work without an active design file
  -> file-level MCP tools become available when a file context is bound
```

The MCP plugin remains a default bundled system plugin. The key change is its
lifecycle: it becomes a global background agent, with a file agent layered on
top when a design file is open or explicitly selected.

## 2. Design Principles

1. **Built in, but user controlled.**
   MCP ships with Penpot and can start automatically, but users must be able to
   turn it on or off and override connection settings.

2. **One public MCP surface.**
   Users and MCP clients should see one stable MCP URL. Internal ports such as
   `4401`, `4402`, `4403`, and plugin asset hosting should be hidden behind
   Penpot routing, reverse proxying, or `penpot-cli` orchestration.

3. **Global before file-specific.**
   MCP should be able to answer account, team, project, file, token, and status
   questions before a workspace tab is active.

4. **Structured tools before arbitrary code.**
   Keep `execute_code` as an explicitly enabled advanced/debug tool, but move
   normal workflows to typed tools and a shared command runtime.

5. **CLI and MCP should converge.**
   `penpot-cli` and MCP tools should call the same automation command layer
   wherever possible. CLI is the shell entry point; MCP is the AI entry point.

6. **Headless is a destination, not the first milestone.**
   Existing plugin-backed operations can be reused first. Gradually move
   stable operations down into backend/common/exporter so they work without an
   open browser.

## 3. Current State in Penpot 2.15.4

The current implementation already contains useful building blocks:

- `mcp/` is a TypeScript workspace with MCP server, plugin, and shared types.
- MCP server exposes Streamable HTTP and SSE endpoints.
- MCP server also runs a WebSocket server for plugin connections.
- The built-in plugin executes tasks inside the Penpot Plugin API context.
- Frontend settings already manage an MCP access token and server URL.
- Docker/nginx can expose `/mcp/stream`, `/mcp/sse`, and `/mcp/ws` when
  `enable-mcp` is active.
- Frontend build copies the MCP plugin bundle into `plugins/mcp/`.

Important limitations:

- The real design-editing power is still workspace/file-bound.
- The server normally needs a connected plugin instance before design tools can
  do useful work.
- The main general-purpose tool is `execute_code`, which forwards JavaScript to
  the plugin context.
- Local development exposes several ports:

```text
Backend HTTP:       6060
Exporter HTTP:      6061
Frontend shadow:    3448 / 3447 / 8888
MCP plugin preview: 4400
MCP HTTP/SSE:       4401
MCP WebSocket:      4402
MCP REPL:           4403
```

The first-class MCP plan should keep the useful parts and remove the user-facing
complexity.

### 3.1 MCP Routing Audit (2026-06-11)

Current MCP routing already has a mostly stable public shape in production and
devenv. The main gap is that standalone development and plugin lifecycle still
expose several internal ports and require manual wiring.

Public paths:

| Public path | Current target | Used by | Notes |
| --- | --- | --- | --- |
| `/mcp/stream` | MCP server `/mcp` | MCP clients and generated settings config | Main Streamable HTTP transport |
| `/mcp/sse` | MCP server `/sse` | Legacy MCP clients | Keep until no supported clients need SSE |
| `/mcp/ws` | MCP WebSocket server | Built-in MCP plugin | Plugin-side channel, not the MCP client transport |
| `/plugins/mcp/manifest.json` | Bundled plugin dist | Frontend workspace MCP startup | Loaded by current workspace lifecycle |
| `/mcp/status` | MCP server `/status` | UI, CLI, MCP diagnostics | Token-safe server/session/plugin counts |

Internal ports:

| Port | Component | Default source | Intended visibility |
| --- | --- | --- | --- |
| `4400` | MCP plugin preview server | `mcp/packages/plugin/vite.config.ts` | Local plugin development only |
| `4401` | MCP HTTP/SSE server | `PENPOT_MCP_SERVER_PORT`, default `4401` | Internal behind `/mcp/stream` and `/mcp/sse` |
| `4402` | MCP plugin WebSocket server | `PENPOT_MCP_WEBSOCKET_PORT`, default `4402` | Internal behind `/mcp/ws` |
| `4403` | MCP REPL server | `PENPOT_MCP_REPL_PORT`, default `4403` | Developer/debug only, never user-facing |

Production Docker routing:

| Area | Current behavior | Source |
| --- | --- | --- |
| Feature flag | MCP nginx locations are installed only when `PENPOT_FLAGS` contains `enable-mcp` | `docker/images/files/nginx-entrypoint.sh` |
| Public frontend base | Optional `PENPOT_MCP_PUBLIC_URI` writes `globalThis.penpotMcpPublicURI` into `config.js` | `docker/images/files/nginx-entrypoint.sh` |
| Public stream override | Optional `PENPOT_MCP_STREAM_URI` writes `globalThis.penpotMcpStreamURI` into `config.js` | `docker/images/files/nginx-entrypoint.sh` |
| Public SSE override | Optional `PENPOT_MCP_SSE_URI` writes `globalThis.penpotMcpSseURI` into `config.js` | `docker/images/files/nginx-entrypoint.sh` |
| Public WebSocket override | Optional `PENPOT_MCP_WEBSOCKET_URI` writes `globalThis.penpotMcpWebSocketURI` into `config.js` | `docker/images/files/nginx-entrypoint.sh` |
| Public status override | Optional `PENPOT_MCP_STATUS_URI` writes `globalThis.penpotMcpStatusURI` into `config.js` | `docker/images/files/nginx-entrypoint.sh` |
| MCP service URI | Defaults to `http://penpot-mcp:4401` | `docker/images/files/nginx-entrypoint.sh` |
| MCP WebSocket URI | Defaults to `http://penpot-mcp:4402` | `docker/images/files/nginx-entrypoint.sh` |
| Stream route | `/mcp/stream` proxies to `$PENPOT_MCP_URI/mcp` | `docker/images/files/nginx-mcp-locations.conf.template` |
| SSE route | `/mcp/sse` proxies to `$PENPOT_MCP_URI/sse` | `docker/images/files/nginx-mcp-locations.conf.template` |
| WebSocket route | `/mcp/ws` proxies to `$PENPOT_MCP_URI_WS` with upgrade headers | `docker/images/files/nginx-mcp-locations.conf.template` |
| Status route | `/mcp/status` proxies to `$PENPOT_MCP_URI/status` | `docker/images/files/nginx-mcp-locations.conf.template` |
| Container host | MCP image binds `PENPOT_MCP_SERVER_HOST=0.0.0.0` | `docker/images/Dockerfile.mcp` |

Devenv routing:

| Area | Current behavior | Source |
| --- | --- | --- |
| Plugin assets | `/plugins/mcp` aliases `mcp/packages/plugin/dist` | `docker/devenv/files/nginx.conf` |
| Stream route | `/mcp/stream` proxies to `127.0.0.1:4401/mcp` | `docker/devenv/files/nginx.conf` |
| SSE route | `/mcp/sse` proxies to `127.0.0.1:4401/sse` | `docker/devenv/files/nginx.conf` |
| WebSocket route | `/mcp/ws` proxies to `127.0.0.1:4402` | `docker/devenv/files/nginx.conf` |
| Status route | `/mcp/status` proxies to `127.0.0.1:4401/status` | `docker/devenv/files/nginx.conf` |
| Exposed ports | `4400`, `4401`, `4402`, and `4403` are exposed | `docker/devenv/docker-compose.yaml` |
| Bind hosts | MCP server and plugin preview host are set to `0.0.0.0` | `docker/devenv/files/bashrc` |

Frontend URL sources:

| Consumer | Current URL source | Notes |
| --- | --- | --- |
| MCP public base | `cf/mcp-public-uri`, from `globalThis.penpotMcpPublicURI` or `public-uri` | First Phase 1 slice establishes one frontend base for public MCP routes |
| Settings generated MCP config | `cf/mcp-server-url`, from `globalThis.penpotMcpStreamURI` or `mcp-public-url "stream"` | User-facing URL is public-path based |
| Token-created modal | Same `cf/mcp-server-url` plus `?userToken=...` | Matches settings copy action |
| Workspace plugin startup | `plugins/mcp/manifest.json` and `plugins/mcp/` under `public-uri` | Still workspace scoped |
| Plugin WebSocket URL | `cf/mcp-ws-uri`, from `globalThis.penpotMcpWebSocketURI`, legacy `globalThis.penpotMcpServerURI`, or `mcp-public-url "ws"` | Default stream and WebSocket URLs now derive from the same base |
| Production plugin bundle | `frontend/scripts/build` builds plugin with `WS_URI="/mcp/ws"` and copies dist into `target/dist/plugins/mcp/` | Keeps production plugin on public path |
| Plugin standalone build | `mcp/packages/plugin/vite.config.ts` accepts `PENPOT_MCP_WEBSOCKET_URI`, legacy `WS_URI`, or derives `/mcp/ws` from `PENPOT_MCP_PUBLIC_URI` | Falls back to `http://localhost:4402` only for standalone local mode |

Standalone local MCP routing:

| Area | Current behavior | Source |
| --- | --- | --- |
| Plugin loading | User manually loads `http://localhost:4400/manifest.json` | `mcp/README.md` |
| MCP client URL | Docs point clients to `http://localhost:4401/mcp` | `mcp/README.md` |
| Legacy SSE URL | Docs point clients to `http://localhost:4401/sse` | `mcp/README.md` |
| Status URL | Docs point local diagnostics to `http://localhost:4401/status` | `mcp/README.md` |
| Plugin WebSocket | Plugin preview uses `PENPOT_MCP_WEBSOCKET_URI`, `WS_URI`, `PENPOT_MCP_PUBLIC_URI + /mcp/ws`, or fallback `http://localhost:4402` | `mcp/packages/plugin/vite.config.ts` |
| REPL | Local debug port remains `4403` | `mcp/README.md` |

Routing divergences to fix next:

- Built-in/gateway mode now derives default stream and WebSocket URLs from the
  same MCP public base. Standalone docs keep direct ports only for local package
  execution outside the Penpot gateway.
- Manual profile settings still need to adopt the same `builtin | custom |
  local` model in a user-visible settings form.
- The MCP plugin is bundled in production, but startup is still owned by
  workspace code instead of a global app lifecycle.
- Devenv exposes all MCP ports directly. That is useful for debugging, but
  `penpot-cli dev up --mcp` should make `/mcp/stream`, `/mcp/sse`, and
  `/mcp/ws` the default mental model.
- `/mcp/status` now exists as an HTTP diagnostic endpoint. Future CLI commands
  can call it directly, and Phase 3 can add an MCP `mcp.get_status` tool with
  user/session context.
- The REPL port should remain disabled or tightly local in production-facing
  modes, especially after MCP becomes easier to enable.

Phase 1 decisions:

- Public MCP traffic uses `/mcp/stream`, `/mcp/sse`, `/mcp/ws`, and
  `/mcp/status`.
- Internal ports `4401`, `4402`, and `4403` remain configurable but are not the
  normal user-facing model.
- Frontend stream, SSE, WebSocket, and status defaults derive from
  `penpotMcpPublicURI` or `public-uri`; explicit endpoint overrides remain
  available for custom deployments.
- Docker can inject `PENPOT_MCP_PUBLIC_URI`, `PENPOT_MCP_STREAM_URI`,
  `PENPOT_MCP_SSE_URI`, `PENPOT_MCP_WEBSOCKET_URI`, and
  `PENPOT_MCP_STATUS_URI` into frontend runtime config.
- The MCP plugin build can derive `/mcp/ws` from `PENPOT_MCP_PUBLIC_URI`, use
  explicit `PENPOT_MCP_WEBSOCKET_URI`, or fall back to local standalone
  `http://localhost:4402`.
- `/mcp/status` is the first diagnostics surface and should be reused by
  `penpot-cli mcp status`.
- `penpot-cli dev up --mcp` should initially wrap existing devenv behavior
  instead of replacing the tmux workflow.

### 3.2 Self-Hosted Gateway Documentation (2026-06-16)

P13.3 added [`self-hosted-mcp-gateway.md`](self-hosted-mcp-gateway.md) as the
operator-facing setup guide for first-class MCP deployments.

Documented deployment decisions:

- Built-in gateway mode is the recommended self-hosted shape.
- `enable-mcp` in `PENPOT_FLAGS` controls whether frontend nginx installs
  `/mcp/stream`, `/mcp/sse`, `/mcp/ws`, and `/mcp/status` routes.
- `penpot-frontend` should proxy to internal `penpot-mcp` upstreams through
  `PENPOT_MCP_URI` and `PENPOT_MCP_URI_WS`; raw ports `4401` and `4402` stay
  internal in normal deployments.
- `PENPOT_PUBLIC_URI` and optional `PENPOT_MCP_PUBLIC_URI` define the public
  base used by frontend settings, the bundled plugin, and CLI diagnostics.
- `custom` mode is reserved for explicit endpoint overrides or external MCP
  gateway experiments.
- `local` mode remains a developer/package-debugging shape, not the default
  self-hosted operator path.
- Operators can verify the gateway with `/mcp/status`,
  `/plugins/mcp/manifest.json`, `/plugins/mcp/mcp-plugin.json`, and
  `penpot-cli mcp status --url <public>/mcp/status`.

### 3.3 Existing MCP User Migration Notes (2026-06-16)

P13.4 added
[`existing-mcp-user-migration.md`](existing-mcp-user-migration.md) to explain
the compatibility path for existing MCP users.

Documented migration decisions:

- Profiles with only `:mcp-enabled` need no data migration; missing
  `:mcp-config` means built-in defaults.
- `:mcp-enabled` remains the compatibility on/off switch, while
  `:mcp-config` stores optional connection preferences only.
- MCP tokens stay in access-token rows and must not be copied into
  `:mcp-config` or shared project-local client config.
- Existing project-local MCP client URLs should move to the public
  `/mcp/stream?userToken=...` endpoint, or `/mcp/sse?userToken=...` for
  SSE-only clients.
- Environment-only self-hosted deployments remain supported, but raw `4401`
  and `4402` ports are local/debug details in built-in gateway mode.
- Manual plugin loading from `localhost:4400` remains a package development
  path; normal deployments use bundled `/plugins/mcp` assets.
- Legacy `execute_code` workflows should migrate to typed tools where possible
  and require `PENPOT_MCP_ENABLE_EXECUTE_CODE=true` when still needed.

### 3.4 Config And Global Connection Smoke Flow (2026-06-16)

P14.1 added
[`config-global-connection-smoke-flow.md`](config-global-connection-smoke-flow.md)
as the focused release-verification path for first-class MCP configuration and
global connection behavior.

Documented verification decisions:

- The flow treats MCP as a global Penpot capability, so it does not require a
  workspace file to be open.
- Static CLI checks cover built-in, custom, and local effective URL derivation
  plus token-safe `mcp status` output.
- Running-stack checks verify the public `/mcp/status` route and bundled plugin
  assets under `/plugins/mcp`.
- Manual UI checks cover enablement, token availability, endpoint previews,
  reset-to-built-in, auto-connect off/on, manual connect/disconnect, and
  disable.
- Missing local Clojure or frontend browser-test tooling is recorded as a local
  tooling limitation when the CLI/static and manual evidence are still
  collected.

### 3.5 Headless Edit And Export Smoke Flow (2026-06-16)

P14.2 added
[`headless-edit-export-smoke-flow.md`](headless-edit-export-smoke-flow.md)
as the focused release-verification path for explicit-id authoring and
exporter-backed artifact output without a live workspace context.

Documented verification decisions:

- The flow treats file/page/object ids as the source of truth and does not use
  `file.open`, `file.bind_context`, workspace MCP controls, selection state, or
  plugin-live execution.
- CLI checks create a file, create a page, create frame/rectangle/text shapes,
  update a shape, dry-run preview/export requests, and write at least one
  artifact to disk.
- MCP checks mirror the same command sequence through `file.create`,
  `page.create`, `shape.create_*`, `shape.update`, `render.preview`, and
  `export.page` where available.
- Page and shape writes must report `backend-command` adapter diagnostics, and
  preview/export calls must report `exporter` adapter diagnostics.
- Completion evidence includes JSON command responses, adapter-selection
  snapshots, exporter dry-run payloads, artifact paths, byte-size checks, and a
  note confirming no workspace was opened or bound.

### 3.6 Live Bind Smoke Flow (2026-06-16)

P14.3 added
[`live-bind-smoke-flow.md`](live-bind-smoke-flow.md) as the focused
release-verification path for moving from headless/global MCP operation into a
live workspace plugin context.

Documented verification decisions:

- `file.open` returns a browser URL and handoff actions, but never claims a
  bound context.
- `file.get_context`, `file.bind_context`, and `file.release_context` are the
  required inspect, bind, and cleanup steps around plugin-live work.
- `page.set_current` is the canonical smoke command because page current and
  selection semantics remain live workspace state.
- Releasing or staling the bound context must make the same live-only command
  return structured `file_context_required` recovery guidance.
- Multi-tab verification must preserve a single write-capable MCP owner and
  make ownership switches observable through context state or UI diagnostics.

### 3.7 CI-Friendly Check Commands (2026-06-16)

P14.4 added
[`ci-friendly-check-commands.md`](ci-friendly-check-commands.md) as the
normalized command matrix for release verification across TypeScript, Clojure,
ClojureScript, packaging, and smoke-flow tiers.

Documented verification decisions:

- Every change starts with `git diff --check`; docs changes that add release
  links also run a focused `rg` discovery check.
- MCP TypeScript checks are split into format, package-level type checks,
  server tests, plugin asset package/check commands, and full workspace build
  commands.
- `penpot-cli` checks cover typecheck, tests, help smoke, build, and private
  checkout install verification.
- Backend and frontend commands are documented with their required working
  directories, including focused backend Kaocha tests and frontend CLJS, JS,
  and SCSS lint/format tiers.
- Missing local tools, dependencies, browser automation, or unavailable running
  services are classified separately from product failures until product code
  actually executes and fails.
- The matrix defines suggested CI profiles for docs-only, TypeScript
  no-service, frontend CLJS, backend JVM, packaging, and running-stack smoke
  jobs.

### 3.8 Roadmap Reconciliation (2026-06-16)

P15.1 reconciled the delivery tracker and the compact blueprint after the
manual configuration, command runtime, headless authoring, handoff, packaging,
and release-verification waves completed.

Documented planning decisions:

- P14 release verification is complete, including config/global connection,
  headless edit/export, live bind, and CI-friendly check-command flows.
- `todo.md` keeps one active phase task, and completed capabilities are not
  marked active in the Feature Roadmap.
- Wave B, Wave D, and Wave F blueprint language now describes completed work
  instead of older transition tasks.
- Remaining gaps are grouped for P15.2 as configuration convergence,
  local orchestration and distribution hardening, live-only authoring
  semantics, command coverage, and planned descriptors that should not be
  exposed as executable commands until implemented.

### 3.9 Next Implementation Wave (2026-06-16)

P15.2 selected Wave H / Phase 16: CLI configuration convergence and
distribution hardening.

Planning decisions:

- The next implementation wave starts with CLI profile-config convergence
  because `penpot-cli mcp config` should be able to report the same saved MCP
  settings that Penpot uses when an authenticated backend/profile source is
  available.
- CLI flags and environment variables must remain valid for scripts,
  env-only self-hosted deployments, and offline/no-network diagnostics.
- Frontend and CLI URL derivation should be aligned by canonical contract
  fixtures. A single runtime helper is not required across ClojureScript and
  TypeScript, but the tested cases must agree.
- Host/hybrid `dev up --mcp` work should stay in planning/dry-run mode until
  dependency, port ownership, and service-boundary diagnostics are explicit.
- Portable CLI packaging remains behind a documented release archive or
  compatible command-runtime package boundary. The private checkout link flow
  stays supported during fork development.

### 3.10 CLI Profile Config Read Path (2026-06-16)

P16.1 audited the read path for making `penpot-cli mcp config` aware of saved
Penpot MCP settings. The contract is documented in
`mcp/docs/cli-profile-config-read-path.md`.

Architecture decisions:

- Profile reads remain opt-in for P16.2 so existing scripts keep the current
  local flag/env/default behavior without surprise backend calls.
- The CLI should use existing backend `get-profile` with the same token and
  backend URI options already used by file/export commands.
- Effective config precedence is field-level: CLI flags, environment variables,
  authenticated profile props, runtime defaults, then offline fallback.
- Missing auth, backend failures, anonymous profiles, and malformed legacy
  config have explicit `auto` fallback versus `backend` failure behavior.
- P16.2 should preserve current JSON fields and add source metadata instead of
  changing public output shape.

## 4. Target Architecture

```text
MCP clients
  Cursor, Claude, Codex, other agents
        |
        v
MCP Gateway
  /mcp/stream
  /mcp/sse
  /mcp/ws
  /mcp/status
        |
        v
MCP Server
  tool registry
  session routing
  auth and permissions
  command runtime adapter
        |
        +------------------------------+
        |                              |
        v                              v
Global MCP Agent                 File MCP Agent
  system plugin                    workspace/file context
  background lifecycle             selection/page/shape ops
  account/project/file tools       prototype/edit/export tools
        |                              |
        +---------------+--------------+
                        |
                        v
Automation Command Runtime
  typed command schemas
  capability checks
  backend/RPC dispatch
  plugin dispatch
  exporter/render dispatch
                        |
                        v
Penpot core
  backend
  common data model
  exporter
  render-wasm
  plugin API
```

## 5. Components

### 5.1 MCP Gateway

The gateway is the only MCP entry point users should need to understand.

Public paths:

```text
/mcp/stream  -> Streamable HTTP transport
/mcp/sse     -> legacy SSE transport
/mcp/ws      -> plugin WebSocket channel
/mcp/status  -> optional status/debug endpoint
```

Responsibilities:

- Hide internal ports in production and development.
- Route MCP client traffic to the MCP server.
- Route plugin WebSocket traffic to the MCP server.
- Support remote deployments and local development.
- Provide consistent URLs for settings, docs, and generated client configs.

Development target:

```bash
penpot-cli dev up --mcp
penpot-cli mcp status
penpot-cli mcp config
```

The CLI can orchestrate ports internally, but the user-facing URL should remain
stable.

#### 5.1.1 Local Dev Orchestration Contract

`penpot-cli dev up --mcp` should be the friendly entry point for local
development. In Phase 1 this is a design contract; the concrete CLI package is
planned for Phase 6.

Default command:

```bash
penpot-cli dev up --mcp
```

Equivalent first implementation:

```bash
penpot-cli dev up --mode devenv --mcp --public-uri http://localhost:3449
```

Supported modes:

| Mode | Purpose | First implementation behavior |
| --- | --- | --- |
| `devenv` | Reuse the existing Docker devenv and tmux workflow | Ensure `./manage.sh start-devenv` has run, then enter or instruct `./manage.sh run-devenv` |
| `host` | Run services directly on the host | Later option once local dependency checks are reliable |
| `hybrid` | Use Docker dependencies, run selected app services on host | Later option for faster frontend/MCP iteration |

`--mcp` should ensure the following development surface:

| Surface | Public URL | Internal/default process |
| --- | --- | --- |
| Frontend app | `http://localhost:3449` | frontend shadow/watch process |
| Backend API | `http://localhost:6060` through nginx | backend `./scripts/start-dev` |
| Exporter | `http://localhost:6061` through nginx | exporter watch and wait/start scripts |
| MCP stream | `http://localhost:3449/mcp/stream` | MCP server `:4401/mcp` |
| MCP SSE | `http://localhost:3449/mcp/sse` | MCP server `:4401/sse` |
| MCP WebSocket | `http://localhost:3449/mcp/ws` | MCP WebSocket server `:4402` |
| MCP status | `http://localhost:3449/mcp/status` | MCP server `:4401/status` |
| MCP plugin assets | `http://localhost:3449/plugins/mcp/manifest.json` | `mcp/packages/plugin/dist` |

Release and Docker frontend bundles carry the same plugin under
`/plugins/mcp/manifest.json`. The frontend production build packages the MCP
plugin with `mcp/scripts/package-plugin-assets.mjs`, which writes
`mcp-plugin.json` metadata and verifies `manifest.json`, `plugin.js`,
`index.html`, and `icon.jpg` before copying assets into the bundle.

Responsibilities:

- Check required tools before starting: Docker for `devenv`, Node/pnpm and
  Clojure only for host/hybrid modes.
- Ensure frontend and backend flags include `enable-mcp`.
- Build or watch MCP plugin assets when `mcp/packages/plugin/dist` is missing
  or stale.
- Start the MCP server in multi-user mode when using normal Penpot login and
  token flow.
- Export or print the public MCP config:

```text
PENPOT_MCP_PUBLIC_URI=http://localhost:3449
stream=http://localhost:3449/mcp/stream
websocket=http://localhost:3449/mcp/ws
status=http://localhost:3449/mcp/status
```

- Run readiness checks:
  - `GET /api/health` or equivalent backend health path when available
  - `GET /mcp/status`
  - plugin manifest exists at `/plugins/mcp/manifest.json`
- On failure, print the exact process or dependency that is missing instead of
  hiding the error.

P13.2 implementation note: root commands `pnpm mcp:plugin:package` and
`pnpm mcp:plugin:check` package and verify the bundled plugin outside the full
frontend build. The metadata captures MCP package version, plugin package
version, protocol version, manifest version, code entry point, and icon so
version/protocol mismatches are visible before shipping the frontend bundle.

Follow-up commands:

```bash
penpot-cli dev down
penpot-cli mcp status
penpot-cli mcp config --format json
penpot-cli mcp logs --follow
```

The first Phase 6 implementation can wrap existing devenv commands and status
URLs. It does not need to replace tmux immediately.

#### 5.1.2 CLI Package Location Decision

P6.1 decision: `penpot-cli` lives as a top-level package at
`penpot-cli/` in this monorepo.

Rationale:

- The CLI needs to orchestrate multiple Penpot modules: backend, frontend,
  exporter, MCP server, MCP plugin assets, and future shared command runtime.
  Placing it under `mcp/packages` would make MCP appear to own the whole
  orchestration layer.
- Keeping it in this monorepo lets the fork evolve CLI commands, MCP tools,
  schemas, docs, and local development scripts together while the work is still
  changing quickly.
- A top-level package can expose the user-facing `penpot-cli` binary without
  changing the existing `@penpot/mcp` / `penpot-mcp` package contract.
- The CLI can start by calling stable process and HTTP surfaces, then gradually
  share typed command schemas with MCP as Phase 7 introduces a neutral command
  runtime.

Rejected placements:

| Option | Reason rejected for this phase |
| --- | --- |
| `mcp/packages/cli` | Too narrow; the CLI coordinates more than MCP internals and should not force backend/frontend orchestration through the MCP workspace. |
| Separate repository/package | Too early; it would make rapid schema, docs, and development-script changes harder while the fork is still defining the command runtime. |
| Root `package.json` bin only | Too small; the CLI needs its own source tree, tests, build output, and future module-specific rules. |

P6.2 should scaffold `penpot-cli/` as a TypeScript package with a
`penpot-cli` bin and add it to the root pnpm workspace. Initial commands should
depend on stable boundaries first: process spawning, local config files, and
MCP HTTP status/config endpoints.

P6.2 implementation note:

- `penpot-cli/` is scaffolded as a TypeScript package in the root pnpm
  workspace with a `penpot-cli` bin that builds to `dist/index.js`.
- The initial CLI supports `--help` and `--version`; planned Phase 6 commands
  return a clear not-yet-implemented message until their dedicated tasks land.
- Root scripts provide `cli`, `cli:build`, and `cli:help` shortcuts.
- `penpot-cli/AGENTS.md` defines module-specific rules for future CLI work.

P6.3 implementation note:

- `penpot-cli mcp status` reads the existing MCP status endpoint and supports
  `--url`, `--status-uri`, `PENPOT_MCP_STATUS_URI`, and the default public
  `/mcp/status` route.
- `penpot-cli mcp config` prints the derived public stream, SSE, WebSocket,
  status, and log-directory settings in text or JSON.
- `penpot-cli mcp logs` reads `PENPOT_MCP_LOG_DIR` or `--dir`, lists local log
  files, supports JSON output, and can follow the latest file with `--follow`.
- CLI errors use structured JSON when `--format json` is requested so scripts
  can distinguish unreachable status endpoints from configuration problems.

P6.4 implementation note:

- `penpot-cli dev up --mcp --dry-run` prints the local MCP development plan in
  text or JSON without starting processes.
- The default `devenv` mode derives the same public MCP URLs as
  `penpot-cli mcp config` and lists expected readiness checks.
- Real `penpot-cli dev up --mcp --mode devenv` checks `./manage.sh` and
  `docker` before delegating dependency startup to `./manage.sh start-devenv`.
- `host` and `hybrid` remain planned modes; the CLI reports them explicitly
  instead of pretending to start unsupported flows.

P6.5 implementation note:

- `penpot-cli file list` and `penpot-cli file create` call the same backend RPC
  commands used by first-class MCP global tools: `get-project-files` and
  `create-file`.
- File commands use `PENPOT_BACKEND_URI`, then `PENPOT_PUBLIC_URI`, then
  `http://localhost:6060`; access tokens can be supplied through `--token`,
  `PENPOT_CLI_TOKEN`, `PENPOT_MCP_USER_TOKEN`, or `PENPOT_ACCESS_TOKEN`.
- `penpot-cli file open` prints a browser workspace URL and explicitly reports
  that it does not bind an MCP file context.
- `penpot-cli export page` parses an explicit exporter-backed request with
  `--file`, `--page`, and `--object`, reports the exporter URI, planned
  `export-shapes` payload, Transit JSON requirement, auth cookie name, and
  missing runtime fields in `--dry-run` output. When `--dry-run` is omitted it
  posts the Transit request to exporter, resolves `profileId` from backend
  `get-profile` when needed, returns exporter resource metadata, and downloads
  bytes when `--output` is supplied.
- `penpot-cli render preview` reuses the exporter-backed output path for PNG
  previews of explicit file/page/object targets, reports `artifact.kind:
  "preview"` metadata, and writes returned resource bytes when `--output` is
  supplied.
- P7.5 adds the first shared `@penpot/command-runtime` adapter-selection helper
  and wires it into `penpot-cli` page/export commands plus MCP page tools.
  Responses keep the legacy `adapter` field and add `adapterSelection` with
  requested, selected, candidate, and fallback details. Full command
  descriptors and centralized execution dispatch remain future runtime work.

P6.6 implementation note:

- `penpot-cli/README.md` is the local developer entry point for CLI usage while
  the package remains private.
- The README documents build/run workflows, root pnpm shortcuts, MCP
  diagnostics, log inspection, `dev up --mcp`, file list/create/open examples,
  export dry-run examples, and the token/backend/public URI environment
  variables required by current commands.
- The documented limitations match the implementation: `dev up --mcp` only
  delegates Docker dependency startup in `devenv` mode, `file open` only emits a
  browser URL, and real CLI export execution waits for Phase 7.

### 5.2 Global MCP Agent

The Global MCP Agent is a built-in system plugin that can run in the background
after login. It is not a marketplace plugin and should not require manual
manifest installation.

Responsibilities:

- Start and stop according to user MCP settings.
- Connect to `/mcp/ws` or a user-configured WebSocket URL.
- Maintain connection status and reconnect behavior.
- Provide a stable user/session identity to the MCP server.
- Expose global Penpot context:
  - current user
  - enabled/disabled status
  - teams
  - projects
  - files
  - recently opened files
  - available file contexts
- Broker file context activation when a file-level tool is requested.

Lifecycle:

```text
user authenticated
  -> load MCP profile settings
  -> if enabled and configured, start Global MCP Agent
  -> connect WebSocket
  -> register global capabilities
  -> watch profile/settings changes
  -> reconnect or stop as needed
```

Current code to evolve:

- Move lifecycle ownership out of `frontend/src/app/main/data/workspace/mcp.cljs`.
- Introduce a global namespace such as:

```text
frontend/src/app/main/data/mcp.cljs
frontend/src/app/main/data/mcp/global.cljs
frontend/src/app/main/data/mcp/file.cljs
```

Workspace code should bind file context, not own MCP startup.

#### 5.2.1 Current Lifecycle Audit

Current frontend lifecycle:

| Step | Current code | Behavior |
| --- | --- | --- |
| Fetch MCP token | `frontend/src/app/main/data/workspace.cljs` calls `du/fetch-access-tokens` during workspace initialization when `:mcp` flag is active | Token data is loaded only as part of opening a workspace |
| Start MCP flow | `workspace-initialized` emits `mcp/init` | MCP startup is file/workspace-bound |
| Load MCP plugin | `mcp/init-mcp` calls `dp/start-plugin!` with `plugins/mcp/manifest.json` and `allow-background true` | Plugin is bundled and can run hidden, but only after workspace init |
| Inject MCP extension | `dp/start-plugin!` receives `#js {:mcp ...}` | Plugin gets token, WebSocket URL, status callback, and connect/disconnect event subscriptions |
| Auto-connect plugin | `mcp/packages/plugin/src/plugin.ts` sends `start-server` to hidden UI after `ui-initialized` when `mcp` extension exists | Built-in plugin connects without manual UI action |
| WebSocket connect | `mcp/packages/plugin/src/main.ts` opens `baseUrl || PENPOT_MCP_WEBSOCKET_URL`, appending `userToken` | Plugin bridge gets a user-bound WebSocket connection |
| Status update | Plugin UI posts `update-connection-status`; `plugin.ts` calls `mcp.setMcpStatus` | Frontend stores `[:mcp :connection-status]` |
| Reconnect | `start-reconnect-watcher!` emits `::connect` every 10 seconds unless status is `connecting` or `connected` | Reconnect only starts after a successful connection status path |
| Multi-tab ownership | Broadcast events `:mcp/ping`, `:mcp/pong`, and `:mcp/force-disconect` coordinate `[:mcp :connected-tab]` | Only one tab should own active MCP work |
| Manual workspace menu | `frontend/src/app/main/ui/workspace/main_menu.cljs` calls `mcp/connect-mcp` or `mcp/user-disconnect-mcp` | User controls MCP from an open file |
| Workspace finalize | `finalize-workspace` emits `mcp/notify-other-tabs-disconnect` | Closing a file can tear down MCP ownership |

Important current state keys:

```clojure
{:mcp {:active true|false
       :connection-status "connecting|connected|disconnected|error"
       :connected-tab <session-id>}}
```

Current broadcast protocol:

| Event | Purpose |
| --- | --- |
| `:mcp/enable` | Settings enabled MCP; workspace handler updates profile props and starts init |
| `:mcp/disable` | Settings disabled MCP; workspace handler disconnects and stops reconnect watcher |
| `:mcp/ping` | Newly opened workspace asks other tabs for MCP ownership |
| `:mcp/pong` | A tab reports its connection status |
| `:mcp/force-disconect` | The current tab asks other tabs to disconnect before it connects |

Lifecycle changes needed for first-class MCP:

- Move token loading and plugin startup to a global authenticated app flow, not
  workspace initialization.
- Keep the existing hidden plugin auto-connect behavior; it is already the
  right shape for a background system plugin.
- Preserve broadcast ownership, but rename the model from `connected-tab` to an
  explicit global owner/file-context owner.
- Split state into global connection status and file context status.
- Keep workspace menu actions as file-context bind/unbind controls instead of
  owning server startup.
- Stop tying reconnect watcher lifetime to workspace finalization.

#### 5.2.2 Global MCP State Design

Proposed frontend namespaces:

```text
frontend/src/app/main/data/mcp.cljs          ;; public events and compatibility exports
frontend/src/app/main/data/mcp/config.cljs   ;; profile/config/token derivation
frontend/src/app/main/data/mcp/plugin.cljs   ;; system plugin startup and status bridge
frontend/src/app/main/data/mcp/context.cljs  ;; file context bind/release
```

Proposed state shape:

```clojure
{:mcp
 {:enabled? false
  :configured? false
  :mode :builtin               ;; :builtin | :custom | :local
  :auto-connect? true

  :config
  {:stream-url "https://penpot.example.com/mcp/stream"
   :ws-url "https://penpot.example.com/mcp/ws"
   :status-url "https://penpot.example.com/mcp/status"
   :allow-execute-code? false
   :allow-local-files? false}

  :token
  {:present? false
   :expires-at nil}

  :plugin
  {:started? false
   :starting? false
   :manifest-url "https://penpot.example.com/plugins/mcp/manifest.json"
   :version nil
   :last-error nil}

  :connection
  {:status :disabled           ;; see status model below
   :owner-tab nil
   :connected-at nil
   :last-error nil
   :server-status nil}

  :file-context
  {:status :none               ;; :none | :available | :bound | :required | :error
   :owner-tab nil
   :team-id nil
   :project-id nil
   :file-id nil
   :page-id nil
   :selection-ids #{}
   :bound-at nil
   :last-error nil}

  ;; Short-term compatibility aliases for existing UI.
  :active false
  :connection-status "disconnected"
  :connected-tab nil}}
```

Connection status model:

| Status | Meaning |
| --- | --- |
| `:disabled` | User or admin has MCP turned off |
| `:missing-token` | MCP is enabled but no valid MCP token exists |
| `:configured` | Required settings and token exist, but plugin is not connected |
| `:starting-plugin` | Built-in system plugin is being loaded |
| `:connecting` | Plugin is opening the WebSocket |
| `:connected-global` | MCP is connected without an active file context |
| `:connected-file` | MCP is connected and bound to a file context |
| `:disconnected` | Previously connected, now intentionally disconnected |
| `:error` | Last startup, connection, or plugin bridge operation failed |

Primary events:

| Event | Scope | Responsibility |
| --- | --- | --- |
| `mcp/initialize` | global | Derive config from profile/runtime config, fetch token summary, optionally start plugin |
| `mcp/finalize` | global | Stop watchers and plugin connection on logout/app shutdown |
| `mcp/config-updated` | global | Recompute mode, URLs, security toggles, and configured state |
| `mcp/token-updated` | global | Update token summary and reconnect if auto-connect is enabled |
| `mcp/start` | global | Start hidden bundled plugin if enabled/configured |
| `mcp/stop` | global | Ask plugin to disconnect and stop reconnect watcher |
| `mcp/plugin-status-updated` | plugin bridge | Convert plugin UI statuses into global status states |
| `mcp/owner-ping` / `mcp/owner-pong` | tab ownership | Preserve single write-capable owner tab |
| `mcp/bind-file-context` | file | Attach current workspace file/page/selection |
| `mcp/release-file-context` | file | Return to `:connected-global` |
| `mcp/file-context-updated` | file | Refresh page and selection metadata while a file is open |

Migration notes:

- Phase 2 should add the new namespace and state shape first, then keep
  compatibility aliases updated for existing `refs/mcp` consumers.
- Existing `workspace.mcp` functions can become wrappers that call global
  events while file-context code is extracted.
- Settings toggles should emit global `mcp/config-updated` or `mcp/start` /
  `mcp/stop` events directly, not rely on workspace broadcast handlers.
- Workspace initialization should emit `mcp/bind-file-context` only after the
  file bundle is loaded and permissions are known.
- Workspace finalization should emit `mcp/release-file-context`, not global
  disconnect.

Phase 2 implementation note:

- `frontend/src/app/main/data/mcp.cljs` is now the lifecycle owner.
- `frontend/src/app/main.cljs` starts MCP after an authenticated profile is
  fetched when the `:mcp` feature flag is active.
- `frontend/src/app/main/data/workspace/mcp.cljs` is a compatibility wrapper
  around the global MCP namespace for existing workspace menu callers.
- `frontend/src/app/main/data/workspace.cljs` no longer starts MCP on
  `workspace-initialized` and no longer broadcasts MCP disconnect on workspace
  finalization.
- Focused lifecycle tests live in `frontend/test/frontend_tests/data/mcp_test.cljs`.

### 5.3 File MCP Agent

The File MCP Agent handles design operations that require a current file,
page, selection, or canvas context.

Responsibilities:

- Register the active file/page/selection with the Global MCP Agent.
- Execute file-scoped tools through the plugin API while the file is open.
- Return structured errors when no file context is available.
- Support explicit context switching:

```text
open_file
bind_file_context
get_current_file_context
release_file_context
```

When a file-level tool is called without a bound context, the server should
return:

```json
{
  "code": "file_context_required",
  "message": "A Penpot file must be opened or bound before this tool can run.",
  "actions": ["list_files", "open_file", "bind_file_context"]
}
```

#### 5.3.1 File Context Registry Design

The file context registry is the bridge between global MCP tools and
file-scoped design tools. It should exist in two layers:

| Layer | Owner | Responsibility |
| --- | --- | --- |
| Frontend registry | Global MCP agent in `frontend/src/app/main/data/mcp.cljs` | Know which browser tabs/workspaces are open, which tab owns MCP work, and what file/page/selection is current |
| Server registry | MCP server | Know which user session has an available or bound file context, without trusting client-provided permissions blindly |

Registry entry shape:

```json
{
  "contextId": "tab-uuid:file-uuid",
  "status": "available",
  "ownerTabId": "tab-uuid",
  "teamId": "team-uuid",
  "projectId": "project-uuid",
  "fileId": "file-uuid",
  "fileName": "Mobile checkout",
  "pageId": "page-uuid",
  "pageName": "Flow",
  "selectionIds": ["shape-uuid"],
  "capabilities": ["page.read", "shape.write", "export.read"],
  "updatedAt": "2026-06-11T00:00:00.000Z"
}
```

Status model:

| Status | Meaning |
| --- | --- |
| `available` | A workspace tab is open and can be bound by MCP |
| `bound` | MCP has selected this context for file-scoped tools |
| `stale` | The tab stopped reporting or the file was closed |
| `released` | MCP/user explicitly detached the context |
| `error` | Last registry update failed |

Registration flow:

```text
workspace opens file
  -> frontend emits mcp/register-file-context
  -> global MCP agent stores available context
  -> plugin/server bridge publishes token-scoped context summary
  -> MCP server verifies access with backend RPC before binding
  -> file.bind_context marks one context as bound
```

Update flow:

- Workspace selection/page changes update the frontend registry.
- The active owner tab publishes context deltas to the MCP server.
- The MCP server stores only token-scoped context summaries and timestamps.
- If the owner tab disconnects or misses heartbeats, the server marks bound
  context `stale` and file tools return `file_context_required`.

Multi-tab rules:

- A user token may have multiple available contexts.
- Only one context per user token can be `bound` for write-capable file tools
  at a time.
- Binding a context in one tab should force-release the previously bound
  context for that same token.
- Read-only inspection may later support multiple contexts, but Phase 4 should
  keep a single bound context to avoid ambiguous edits.

Planned tools:

| Tool | Scope | Behavior |
| --- | --- | --- |
| `file.get_context` | global/file | Return current bound context and available contexts |
| `file.bind_context` | global/file | Bind by `contextId` or by `fileId` when exactly one matching available context exists |
| `file.release_context` | file | Release current bound context and return to `connected-global` |

Phase 4.2 implementation note:

- The plugin now reports `file-context-update` WebSocket messages containing
  `currentFile`, `currentPage`, selection ids, owner id, capabilities, and
  timestamps.
- The MCP server stores token-scoped file context summaries in
  `FileContextRegistry`.
- `mcp.get_status` now reads the registry for current session file context
  state instead of returning a placeholder.
- `file.get_context` returns the bound context, available contexts, stale
  contexts, and next actions for the current MCP token.
- `file.bind_context` can bind by `contextId`, by `fileId` when exactly one
  matching context exists, or by no selector when exactly one active context
  exists.
- Binding verifies current-user file access through the existing
  `get-file-summary` backend RPC before marking the context bound.
- Plugin-reported `teamId` and `projectId` remain optional because the Penpot
  plugin API does not always expose them directly; backend authorization is the
  source of truth.
- WebSocket disconnects mark contexts stale and clear the bound context for the
  session.

Phase 4.3 implementation note:

- `file.release_context` clears the current token-scoped bound context.
- Releasing keeps the open plugin-reported context available for future
  `file.bind_context` calls because the user still has the file open.
- Calling `file.release_context` without a bound context is idempotent and
  returns the current context summary with `released: false`.

Phase 4.4 implementation note:

- File-scoped plugin-backed tools use a shared file context guard before
  executing plugin tasks.
- `export_shape` and `import_image` now return structured
  `file_context_required` errors with `file.get_context`,
  `file.bind_context`, `file.list`, and `file.get_recent` recovery actions
  when no context is bound.
- The guard runs before local file reads or writes in `import_image` and before
  optional export file writes in `export_shape`.
- `execute_code` is intentionally not gated here because it remains an
  advanced/debug escape hatch until P5.6 defines the explicit user setting.

Phase 4.5 implementation note:

- The workspace MCP menu (`frontend/src/app/main/ui/workspace/main_menu.cljs`)
  now shows a bind/unbind control while MCP is connected.
- The control emits `mcp/bind-current-file-context` or
  `mcp/release-current-file-context`, which optimistically set the frontend
  `:mcp :file-context` status to `binding`/`releasing` and forward
  `bind-context` / `release-context` plugin events.
- The plugin sends `file-context-bind-request` / `file-context-release-request`
  WebSocket messages; the server verifies access through `get-file-summary`,
  updates the registry, and replies with `file-context-control-result`.
- The plugin then calls `setFileContextStatus`, so the menu label reflects
  `binding`, `releasing`, `bound` (Unbind), or `unbound`/`available` (Bind).
- Frontend lint/test runs are blocked locally because `clojure` and frontend
  `node_modules` are not installed.

Phase 4.6 implementation note:

- Frontend lifecycle tests in `frontend/test/frontend_tests/data/mcp_test.cljs`
  cover file-context initialization, bind/release optimistic status updates, and
  plugin status persistence.
- MCP server lifecycle tests in
  `mcp/packages/server/test/FileContextRegistry.test.ts` cover
  bind-release-rebind, idempotent release, reconnect upsert after stale
  disconnect, and bound-context refresh updates.
- `mcp/packages/server/test/FileContextGuard.test.ts` now verifies that file
  tools are blocked again after release or plugin disconnect.
- `mcp-server test` passed with 18 focused unit tests after these additions.

Structured errors:

| Error code | Trigger |
| --- | --- |
| `file_context_required` | A file-scoped tool needs a bound context and none exists |
| `file_context_ambiguous` | A bind request matches multiple available contexts |
| `file_context_not_found` | Requested `contextId`/`fileId` is not available to the session |
| `file_context_stale` | Bound tab closed or stopped reporting |

### 5.4 Automation Command Runtime

The command runtime is the long-term shared layer for MCP and `penpot-cli`.
The detailed P7.1 contract is captured in
[`headless-command-runtime.md`](headless-command-runtime.md).

It should define typed commands with:

- command name
- input schema
- output schema
- required auth
- required capabilities
- scope (`global`, `file`, `local`)
- implementation adapter

Example:

```text
command: file.create
scope: global
adapter: backend-rpc

command: shape.create
scope: file
adapter: plugin-api first, backend/common later

command: export.shape
scope: file or headless
adapter: plugin-api/exporter first, exporter later
```

Adapters:

```text
backend-rpc    calls backend RPC commands
plugin-api     executes inside the system plugin context
exporter       calls exporter/render services
local-fs       allowed only in local mode with explicit permission
```

MCP tools and CLI commands become thin adapters over this runtime.

P7.1 implementation note:

- The runtime is designed as a transport-neutral package. The first shared
  package now exists at `command-runtime/` with package name
  `@penpot/command-runtime`.
- MCP server and `penpot-cli` should depend on the runtime package instead of
  importing each other's internals.
- Backend/common remain Clojure-owned for persisted file data validation and
  headless command handlers; the TypeScript runtime calls backend surfaces
  through adapters.
- The contract defines command descriptors, request/result envelopes,
  capability hints, adapter selection, structured errors, and the initial
  command migration set for file, page, shape, export, and render commands.

P7.2 implementation note:

- The first backend/common headless slice adds `app.common.files.headless`
  helpers for page summaries and add-page command changes.
- The backend now exposes `get-file-pages` and `create-file-page` RPC commands.
  They reuse existing read/edit permission checks, feature validation, file
  locking, and the normal `update-file` persistence/notification pipeline.
- MCP `page.list` and `page.create` now use these backend-command RPCs when a
  `fileId` is supplied, while preserving the plugin-live path for callers that
  rely on the bound workspace context.
- `penpot-cli page list/create --file <file-id>` exposes the same headless page
  operations to scripts and reports `adapter: "backend-command"` in JSON
  output.
- This is a transitional adapter slice. `command-runtime/` now centralizes the
  first adapter-selection helper, while descriptors, request envelopes, and
  execution dispatch still need to move out of MCP and CLI entry adapters.

P7.3 implementation note:

- The first backend/common shape slice adds `create-shape-request` and
  `shape-summary` helpers in `app.common.files.headless`.
- The backend exposes `create-file-shape` for headless frame, rectangle, and
  text creation on a target page. It validates page/parent frame targets,
  creates canonical shape data through common shape constructors, and persists
  the result through the normal `update-file` path.
- The first shape slice intentionally omitted image upload, layout setup, shape
  update, and delete. P7.7 adds backend/common coverage for simple shape
  update/delete, P11.2 adds backend-safe frame layout `none`/`flex` updates,
  and P11.3 adds `create-file-image-shape` for image-backed rectangles using
  the existing media upload/storage path. Grid/full layout editing still stays
  on plugin-live tools until dedicated backend coverage is added.
- MCP `shape.create_frame`, `shape.create_rect`, `shape.create_text`, and
  `shape.create_image` now choose backend-command when callers provide
  explicit `fileId` and `pageId`. Calls without explicit file/page targets keep
  using the plugin-live bound workspace path.
- `penpot-cli shape create-frame`, `shape create-rect`, `shape create-text`,
  and `shape create-image` call backend commands directly and report
  `adapterSelection` in JSON output.
- The backend now also exposes `update-file-shape` and `delete-file-shape` for
  simple frame, rectangle, and text targets.
- MCP `shape.update` and `shape.delete` now choose backend-command when callers
  provide explicit `fileId` and `shapeId`. Calls without explicit file/page
  targets keep using the plugin-live bound workspace path.
- `penpot-cli shape update` and `shape delete` call `update-file-shape` and
  `delete-file-shape` directly and report `adapterSelection` in JSON output.
- P11.2 expands backend-command `shape.update` with `fills`, `strokes`,
  independent `r1` through `r4` corner radii, and `parentId`/`index` movement
  through the existing `:mov-objects` change path.
- P11.2 also adds a backend-safe layout subset for frame targets:
  `layout.type` can be `none` or `flex`, and flex updates support direction,
  wrap, align-items, justify-content, row/column gaps, and uniform padding.
  Grid layout remains plugin-live until the backend command owns tracks/cells.
- These richer style, hierarchy, and supported layout fields require explicit
  `fileId`; plugin-live continues to handle grid layout edits and
  bound-workspace updates.
- `penpot-cli export page` now executes the exporter adapter without a live
  workspace tab for explicit file/page/object targets, returning resource
  metadata or writing the downloaded output bytes to `--output`.

P11.1 implementation note:

- The backend exposes `rename-file-page` for headless page metadata updates.
  It persists a standard `:mod-page` change through the normal file update
  pipeline and shares the existing MCP/headless write limit bucket.

P11.2 implementation note:

- `update-file-shape` now supports richer backend-command style and hierarchy
  fields for generated frame, rectangle, and text shapes: fill stacks, stroke
  stacks, independent corner radii, and parent frame/root movement.
- `update-file-shape` now supports backend-safe frame layout metadata for
  `layout.type = none | flex`; flex supports direction, wrap, alignment,
  row/column gap, and uniform padding. Grid remains plugin-live.
- MCP `shape.update` maps those fields to backend-command when `fileId` is
  supplied and returns a shared adapter error if callers try to use
  backend-only fields without an explicit file target or request grid layout on
  the backend-command path.
- `penpot-cli shape update` exposes the same fields with repeatable `--fill`
  and `--stroke` flags, `--r1` through `--r4`, `--parent`, `--index`, and
  `--layout none|flex` with flex direction, wrap, alignment, gap, and padding
  flags.
- MCP `page.rename` now selects backend-command when callers provide an
  explicit `fileId`, and keeps the plugin-live path for bound workspace
  renames.
- `penpot-cli page rename --file <file-id> --page <page-id> --name <name>`
  calls `rename-file-page` directly and reports `adapterSelection` in JSON
  output.

P11.4 implementation note:

- Common/backend now expose `create-prototype-flow-request`,
  `create-prototype-interaction-request`, `create-file-prototype-flow`, and
  `create-file-prototype-interaction` for the backend-safe prototype subset.
- The backend-command prototype subset persists page `:flows` through
  `:set-flow` and shape navigate interactions through `:mod-obj` updates to
  `:interactions`. It supports explicit flow ids, source/destination ids,
  click/mouse-enter/mouse-leave/after-delay triggers, preserve-scroll, and
  dissolve/slide/push animation metadata.
- MCP `prototype.create_flow` and `prototype.create_interaction` now select
  backend-command when callers provide `fileId`; calls without explicit
  file/page targets keep using the plugin-live bound workspace path.
- `penpot-cli prototype create-flow` and `prototype create-interaction` call
  the new backend commands directly and report `adapterSelection` in JSON
  output.
- Overlay creation, interaction listing, interaction deletion, current page
  state, selection state, and other live workspace semantics remain
  plugin-live until dedicated backend-safe contracts are defined.

P11.5 implementation note:

- `render.preview` now advertises both `exporter` and `plugin-live` adapters in
  the shared command runtime catalog, with `render preview` as the matching
  CLI command name.
- MCP `render.preview` selects the exporter adapter when callers provide
  explicit `fileId`, `pageId`, and `objectId` targets, posts the existing
  exporter `export-shapes` Transit request, and returns resource metadata plus
  consistent preview artifact metadata.
- MCP `render.preview` keeps the plugin-live path for bound workspace page,
  shape, or selection previews, returning the plugin-provided base64 PNG data
  and adapter-selection metadata.
- `penpot-cli render preview` uses the same exporter request and output
  download path as `export page`, fixes format to PNG, and supports dry-run
  request inspection plus real `--output` writes.

P12.1 handoff contract:

- `mcp/docs/file-open-bind-handoff.md` defines the user and agent flow for
  moving from headless commands into a live workspace context.
- All open/bind surfaces should use the same workspace URL shape:
  `/#/workspace?file-id=<id>[&team-id=<id>][&page-id=<id>]`.
- `file.open` and `penpot-cli file open` return URLs and handoff next actions;
  they must not claim a bound context.
- `file_context_required` responses should guide agents through `file.open`,
  `file.get_context`, `file.bind_context`, and retrying the original tool when
  enough target data is known.

P12.2 implementation note:

- The shared command runtime now owns workspace URL generation and
  `file.open` handoff payload construction.
- MCP `file.open` returns a browser URL, `workspaceUrl`, `boundContext: false`,
  adapter-selection metadata, and open/inspect/bind/retry handoff actions.
- `penpot-cli file open` uses the same URL and handoff helpers while preserving
  the existing `url` field for script compatibility.

P12.3 implementation note:

- Frontend MCP state now exposes a reusable file-context summary for
  dashboard/settings surfaces, normalizing local plugin status, diagnostics
  counts, target file/page labels, stale states, and expired-token overrides.
- The dashboard sidebar shows the current MCP context outside the workspace
  when MCP is enabled or a context exists.
- Integrations diagnostics reuse the same summary so unbound, available, bound,
  stale, and expired-token states are visible without opening the workspace
  menu.

P12.4 implementation note:

- `file_context_required` errors now include target-aware open, inspect, bind,
  and retry guidance for live-only MCP tools.
- When the server can identify a target from an explicit option or the current
  token-scoped file-context summary, the error includes the same
  `workspaceUrl` and `handoff` shape used by `file.open`, with
  `status: "context_required"`.
- When no target is known, the error keeps `handoff: null` and guides agents
  through `file.list`, `file.get_recent`, `file.open`, `file.get_context`,
  `file.bind_context`, and `retry_original_tool`.

P13.1 build/install decision:

- `penpot-cli` remains a private top-level workspace package with package name
  `penpot-cli` and binary name `penpot-cli`.
- The supported install path is a private fork checkout: run `pnpm install`
  and `pnpm cli:install-check`, or build and link the workspace package with
  `pnpm --dir penpot-cli link --global` for repeated local use.
- The CLI package version stays independent from the Penpot product version;
  fork releases tie product and CLI behavior together through git tags and
  changelog entries.
- Standalone tarballs or npm publishing are deferred until
  `@penpot/command-runtime` is bundled, published with compatible versions, or
  shipped in a documented release archive layout.

## 6. User Configuration

MCP settings should stay explicit and user-visible. P9.1 captured the current
frontend/backend persistence paths and the proposed config model in
`mcp/docs/manual-mcp-configuration-audit.md`.

Planned profile props:

```clojure
{:mcp-enabled false
 :mcp-config {:mode "builtin"       ;; builtin | custom | local
              :auto-connect true
              :public-uri nil       ;; optional base for derived URLs
              :stream-uri nil       ;; optional client stream override
              :sse-uri nil          ;; optional legacy SSE override
              :websocket-uri nil    ;; optional bundled plugin override
              :status-uri nil}}     ;; optional diagnostics override
```

Existing storage to reuse:

- `profile.props.mcp-enabled`
- `profile.props.mcp-config`
- `access-token` rows with `type = "mcp"`
- frontend config values for MCP stream and WebSocket URLs

P9.2 keeps `:mcp-enabled` as the compatibility switch while consolidating the
other MCP connection settings into a nested `:mcp-config` profile prop. Missing
config means built-in gateway defaults; `{:mcp-config nil}` resets the user to
built-in defaults.

Settings page controls:

```text
MCP Server
  [toggle] Enable MCP
  [toggle] Auto-connect after login

Connection mode
  - Built-in service
  - Custom MCP server
  - Local development

MCP stream URL
  [input/copy]

MCP WebSocket URL
  [input/copy]

Security
  [toggle] Allow advanced execute_code tool
  [toggle] Allow local file access

Actions
  Generate/regenerate MCP key
  Copy client config
  Test connection
  Disconnect current session
  View logs/status
```

Workspace menu controls:

```text
MCP: Disabled | Connecting | Connected globally | Connected to this file | Error
Connect MCP
Disconnect MCP
Bind this file
Manage MCP settings
```

## 7. State Machine

Frontend and server should share the same conceptual states.

```text
disabled
  MCP is off for the user.

unconfigured
  MCP is enabled but missing token or connection URL.

configured
  MCP has enough settings to start.

connecting
  Global MCP Agent is connecting to the server.

connected-global
  MCP is connected, but no file context is active.

connected-file
  MCP is connected and has an active file context.

needs-file-context
  A file-level tool was requested without an active file context.

reconnecting
  Connection dropped and auto-connect is enabled.

error
  Startup, auth, WebSocket, version, or permission failure.
```

Common transitions:

```text
disabled -> configured
configured -> connecting
connecting -> connected-global
connected-global -> connected-file
connected-file -> connected-global
connected-global -> needs-file-context
connected-* -> reconnecting
reconnecting -> connected-global
any -> error
any -> disabled
```

## 8. Tool Model

New first-class tools use dotted names:

```text
domain.verb
domain.verb_noun
```

Examples:

```text
mcp.get_status
file.create
shape.create_frame
prototype.create_interaction
```

Naming rules:

- The part before the dot is the capability domain: `mcp`, `account`, `team`,
  `project`, `file`, `page`, `selection`, `shape`, `prototype`, `export`,
  `render`, `tokens`, `component`, or `debug`.
- The part after the dot is a verb or verb phrase using snake case.
- Global tools must not require an open workspace tab.
- File tools must report a structured `file_context_required` error when they
  need a bound file and none is available.
- Destructive tools should use verbs such as `delete`, `release`, or
  `remove`, and later pass through confirmation/audit policy.
- Legacy underscore tools such as `execute_code`, `export_shape`, and
  `import_image` remain registered for compatibility until typed first-class
  replacements cover the same workflows.

Server code stores the shared registry in
`mcp/packages/server/src/ToolNames.ts`. New tools should use those constants
instead of hand-written string names.

Tool schemas use Zod raw shapes at the `Tool` boundary. The default response
format for structured tools is JSON text with stable top-level keys:

```json
{
  "status": "ok",
  "data": {},
  "warnings": []
}
```

Errors that agents can recover from should include a stable `code`, a human
message, and optional `actions`:

```json
{
  "code": "file_context_required",
  "message": "A Penpot file must be opened or bound before this tool can run.",
  "actions": [
    "file.list",
    "file.get_recent",
    "file.open",
    "file.get_context",
    "file.bind_context",
    "retry_original_tool"
  ]
}
```

Global RPC-backed tools use the same structure for backend and permission
failures:

| Error code | Meaning | Typical next action |
| --- | --- | --- |
| `authentication_required` | No MCP user token is attached to the current session, or the backend returned 401 | Reconnect MCP with a valid `userToken` |
| `penpot_backend_config_invalid` | `PENPOT_BACKEND_URI` or `PENPOT_PUBLIC_URI` is not a valid URL | Fix server configuration |
| `penpot_backend_unavailable` | The MCP server could not reach backend RPC | Start/check the Penpot backend |
| `permission_denied` | Backend returned 403 | Pick a resource available to the user |
| `object_not_found_or_forbidden` | Backend returned `object-not-found`, which Penpot also uses to hide inaccessible objects | List teams/projects/files again and choose an accessible target |
| backend code with underscores | Backend returned a validation/domain error | Inspect `error.data.response` for backend details |

`error.data` may include the backend HTTP status, backend error code/type, and
the original backend response. It must not include raw access tokens.

### 8.1 Global Tools

Available without an open file:

```text
mcp.get_status
account.get_current_user
team.list
project.list
file.list
file.search
file.create
file.duplicate
file.open
file.get_recent
token.get_mcp_status
```

`mcp.get_status` is the first implemented dotted global tool. It returns JSON
text with these top-level fields:

```text
status
data.server
data.transports
data.session
data.plugin
data.fileContext
warnings
```

The tool reuses the same token-safe status model as `/mcp/status`, then adds
current MCP session information. It never returns the raw user token. Until the
Phase 4 file context broker exists, `data.fileContext.status` is reported as
`unbound`.

The first global read tools are implemented through existing Penpot RPC
endpoints and do not require a workspace tab:

| MCP tool | Penpot RPC command | Required input |
| --- | --- | --- |
| `account.get_current_user` | `get-profile` | Current MCP `userToken` |
| `team.list` | `get-teams` | Current MCP `userToken` |
| `project.list` | `get-projects` | Optional `teamId`; without it, projects are fetched for all available teams |
| `file.list` | `get-project-files` | `projectId` |
| `file.get_recent` | `get-team-recent-files` | `teamId`; optional response `limit` |
| `file.create` | `create-file` | `projectId`; optional `name` and `isShared` |

These tools call the backend through `PENPOT_BACKEND_URI`, falling back to
`PENPOT_PUBLIC_URI` and then `http://localhost:6060`. They send the MCP
`userToken` as `Authorization: Token <token>` so normal Penpot access-token
authentication and permissions apply.

`file.create` is the first global write tool. It returns a file summary and
does not bind the new file as the active file context. Until Phase 4 adds
`file.open` and `file.bind_context`, the user or agent should open the new file
in Penpot before calling file-scoped editing tools.

### 8.2 File Context Tools

Require a bound file:

```text
file.get_context
file.bind_context
file.release_context
page.list
page.create
page.rename
page.set_current
selection.get
selection.set
```

### 8.3 Design Editing Tools

Require a bound file and page:

```text
shape.create_frame
shape.create_rect
shape.create_text
shape.create_image
shape.update
shape.delete
shape.group
shape.ungroup
shape.set_layout
shape.set_style
component.create
component.instantiate
tokens.list
tokens.apply
```

### 8.4 Prototype Tools

Require a bound file:

```text
prototype.create_flow
prototype.create_interaction
prototype.create_overlay
prototype.list_interactions
prototype.delete_interaction
```

### 8.5 Export and Render Tools

May start file-bound and later move to headless:

```text
export.shape
export.page
export.file
render.preview
render.thumbnail
```

### 8.6 Advanced Tools

Available only when explicitly enabled:

```text
execute_code
debug.get_plugin_state
debug.get_agent_logs
```

`execute_code` remains useful for development and emergency fallback, but the
MCP server only runs it when `PENPOT_MCP_ENABLE_EXECUTE_CODE=true` is set.
Normal agent workflows should prefer typed tools.

## 9. Development Order

### Phase 0: Baseline and Documentation

Goal: document the target and avoid accidental architecture drift.

Work:

- Keep this plan in `mcp/docs/`.
- Add a short architecture decision record if ADRs are introduced later.
- Record current code entry points and ports.
- Define naming conventions for global tools and file tools.

Definition of done:

- Architecture plan exists.
- The team can agree on the first implementation phase.

### Phase 1: Gateway and Configuration Cleanup

Goal: one MCP URL from the user's point of view.

Work:

- Ensure `/mcp/stream`, `/mcp/sse`, and `/mcp/ws` work consistently in dev and
  production.
- Keep internal ports configurable, but hide them from normal users.
- Add `penpot-cli mcp status` or equivalent dev script once `penpot-cli` exists.
- Make generated client config always point to the stable stream URL.
- Make WebSocket URL derivation deterministic for built-in mode.

Definition of done:

- Users do not need to know ports `4401`, `4402`, or `4403`.
- Settings page and generated MCP config use the same URL source.
- Local dev can start all MCP dependencies with one command.

### Phase 2: Global Background System Plugin

Goal: MCP can run after login without opening a design file first.

Work:

- Move MCP lifecycle from workspace data flow to global app data flow.
- Start the bundled MCP plugin as a background system plugin.
- Keep manual enable/disable behavior.
- Respect `mcp-auto-connect`.
- Register global connection status in frontend state.
- Preserve multi-tab coordination so only the intended tab owns active MCP work.

Definition of done:

- A logged-in user can enable MCP from settings and see global connection status.
- The plugin can connect in the background.
- Disconnect and reconnect work without reloading the app.

### Phase 3: Global MCP Tools

Goal: MCP provides useful capabilities before file context exists.

Work:

- Add typed global tools for status, teams, projects, files, and file creation.
- Implement these through backend RPC or existing frontend data access where
  appropriate.
- Add structured errors for missing permissions and missing configuration.
- Add tests around tool schemas and permission checks.

Implementation notes:

- `mcp/packages/server/src/ToolNames.ts` is the shared tool-name registry for
  dotted first-class tools and legacy compatibility tools.
- `mcp.get_status` is implemented by
  `mcp/packages/server/src/tools/McpStatusTool.ts` and registered before legacy
  plugin-backed tools.
- The first status tool includes server, transport, plugin, session, and
  placeholder file-context fields. File-context discovery and binding remain
  Phase 4 work.
- `mcp/packages/server/src/PenpotRpcClient.ts` is the first backend RPC bridge
  for global tools.
- `account.get_current_user`, `team.list`, `project.list`, `file.list`, and
  `file.get_recent` are implemented in
  `mcp/packages/server/src/tools/GlobalReadTools.ts`.
- `file.create` is implemented in
  `mcp/packages/server/src/tools/FileCreateTool.ts` using the existing
  `create-file` RPC command and backend project edit permissions.
- `mcp/packages/server/src/tools/PenpotRpcTool.ts` centralizes structured
  global-tool responses and recoverable error actions.
- `mcp/packages/server/test/PenpotRpcClient.test.ts` covers RPC request shape,
  JSON POST bodies, backend configuration/unavailable errors, and auth,
  permission, not-found, and validation error normalization.

Definition of done:

- An MCP client can list projects/files and create a file without a workspace
  being open.
- File-level tools return `file_context_required` instead of generic plugin
  connection failures.

Phase 3 implementation note:

- Global status/read/create tools are implemented and covered by MCP server
  type, format, and focused unit checks.
- `file_context_required` remains Phase 4 because it needs the file context
  registry and file-bound tool classification.

### Phase 4: File Context Broker

Goal: make file context explicit and manageable.

Work:

- Add a context registry in the Global MCP Agent.
- Register opened workspace tabs as available file contexts.
- Add `file.bind_context`, `file.open`, and `file.release_context`.
- If a file is not open, `file.open` should navigate Penpot to it or return a
  user-action-required response.
- Track active page and selection for the bound context.

Definition of done:

- MCP can distinguish global connection from file connection.
- Users can manually bind the current file from the workspace menu.
- Agents can request a file context and receive clear next steps.

### Phase 5: Structured File Tools

Goal: reduce dependence on arbitrary JavaScript execution.

Work:

- Wrap common Plugin API operations in typed MCP tools.
- Start with safe, common primitives:
  - list pages
  - create page
  - create frame
  - create text
  - create rectangle
  - update shape properties
  - export selected shape/page
- Keep implementation plugin-backed at first.
- Add a capability registry so tools can report when they are available.

Phase 5.1 implementation note:

- `page.list`, `page.create`, `page.rename`, and `page.set_current` are
  implemented as first-class typed MCP tools.
- The tools require a bound file context through the shared file context guard.
- Server tools send a typed `page` plugin task instead of arbitrary
  `execute_code`.
- The bundled MCP plugin handles page operations through the Penpot Plugin API:
  `currentFile.pages`, `createPage`, `openPage`, and page `name` updates.
- Tool responses return the changed page when applicable, the full page list,
  and the current page summary.

Phase 5.2 implementation note:

- `shape.create_frame`, `shape.create_rect`, `shape.create_text`, and
  `shape.create_image` are implemented as first-class typed MCP tools.
- The tools require a bound file context through the shared file context guard
  and send a typed `shape` plugin task instead of arbitrary `execute_code`.
- The bundled MCP plugin handles shape creation through the Penpot Plugin API:
  `createBoard`, `createRectangle`, `createText`, and `uploadMediaData`.
- Shape creation accepts typed geometry, optional parent container ids, solid
  fill, stroke, and corner radius where applicable. When `parentId` is
  provided, `x` and `y` are interpreted relative to that parent; otherwise
  they are page coordinates.
- Tool responses return a `ShapeSummary` with ids, page info, parent id,
  absolute coordinates, parent-relative coordinates when available, and size so
  later page, prototype, and export tools can chain from the created shape.

Phase 5.3 implementation note:

- `shape.update` and `shape.delete` are implemented as first-class typed MCP
  tools backed by the same typed `shape` plugin task.
- The tools require a bound file context through the shared file context guard.
- `shape.update` accepts explicit `shapeId` plus typed geometry, name, solid
  fill, stroke, corner radius, text content/font size for text shapes, and
  basic board layout settings (`none`, `flex`, or `grid`).
- `shape.delete` deletes one explicitly identified shape and returns the
  deleted shape summary with `deleted: true`.
- Update/delete responses keep the `ShapeSummary` shape so prototype/export
  tools can chain from the edited or removed layer without invoking
  `execute_code`.

Phase 5.4 implementation note:

- `prototype.create_flow` and `prototype.create_interaction` are implemented as
  first-class typed MCP tools backed by a typed `prototype` plugin task.
- In the original typed-tool slice, the tools required a bound file context
  through the shared file context guard. P11.4 adds backend-command routing for
  explicit `fileId` targets while preserving that plugin-live path.
- `prototype.create_flow` creates a page flow from an explicit starting
  board/frame id.
- `prototype.create_interaction` creates a navigate-to interaction from an
  explicit source shape id to an explicit destination board/frame id, with
  typed trigger, optional delay, preserve-scroll, and transition animation.
- Tool responses return typed flow and interaction summaries so generated
  prototype screens can be chained into export and preview tools.

Phase 5.5 implementation note:

- `export.shape`, `export.page`, and `render.preview` are implemented as
  first-class typed MCP tools backed by a typed `export` plugin task.
- The tools require a bound file context through the shared file context guard.
- `export.shape` exports an explicit shape id or the current selection.
- `export.page` exports an explicit page id or the current page.
- `render.preview` returns a PNG preview for a page, shape, or selection.
- Tool responses return format, MIME type, byte length, target metadata, and
  base64 data so agents and the future CLI can consume the result without
  falling back to `execute_code`.

Phase 5.6 implementation note:

- The public legacy `execute_code` tool is registered for compatibility but is
  disabled unless the MCP server starts with
  `PENPOT_MCP_ENABLE_EXECUTE_CODE=true`.
- When disabled, `execute_code` returns a structured
  `execute_code_disabled` response with typed-tool recovery actions and the
  required environment variable.
- `mcp.get_status` and `/status` expose `server.executeCodeEnabled` so clients
  can explain the current advanced-tool mode.
- Legacy `export_shape` and `import_image` remain registered for compatibility;
  they continue to use bound file-context checks and local-mode file access
  rules while normal creation/export workflows move to typed tools.

Definition of done:

- Common prototype generation can be done through typed tools.
- `execute_code` is no longer the normal path for basic creation and export.

### Phase 6: `penpot-cli` Entry Point

Goal: give developers one command-line surface for MCP and automation.

P6.1 package decision:

- Directory: `penpot-cli/` at the repository root.
- Package/bin: TypeScript package exposing `penpot-cli`.
- Workspace: root pnpm workspace, separate from the existing nested
  `mcp/` workspace.
- First dependency direction: call stable process, filesystem config, and MCP
  HTTP surfaces before importing MCP server internals.

Work:

- Add CLI commands for orchestration:

```bash
penpot-cli dev up --mcp
penpot-cli mcp status
penpot-cli mcp config
penpot-cli mcp logs
```

- Add CLI commands that call the same command runtime:

```bash
penpot-cli file list
penpot-cli file create --name "Demo"
penpot-cli file open <file-id>
penpot-cli export page --file <file-id> --page <page-id> --object <object-id>
```

Definition of done:

- Local developers can start and inspect the MCP stack through CLI.
- CLI and MCP share command names, schemas, and results where possible.

### Phase 7: Headless Command Runtime

Goal: move stable operations out of the browser/plugin dependency.

Work:

- Move file/page/shape operations into backend/common command handlers where
  safe.
- Reuse common schemas and file data validation.
- Reuse exporter/render-wasm for output.
- Keep plugin-backed operations only for features that truly need live UI or
  selection context.

Definition of done:

- A subset of prototype generation works without an open browser tab.
- `penpot-cli` can create and export simple designs in headless mode.
- MCP can choose the best adapter: backend, exporter, plugin, or local.

### Phase 8: Hardening and Observability

Goal: make MCP safe enough to be on by default in real deployments.

Work:

- Add audit events for MCP write operations.
- Add rate limits and concurrency limits per user/session/file.
- Add version/capability negotiation between server, plugin, and Penpot.
- Add structured logs and status diagnostics.
- Add explicit permissions for local file access and `execute_code`.
- Add configurable confirmations for destructive typed tools.
- Add automated tests for connection lifecycle, multi-tab ownership, and
  permission failures.

Definition of done:

- MCP failures are diagnosable from UI and logs.
- Sensitive tools are gated.
- Destructive tools can require explicit confirmation before mutation.
- Concurrent sessions cannot silently edit the wrong file.

P8.1 implementation note (2026-06-13):

- Backend-command MCP writes now send an audit context envelope on backend RPC
  requests.
- The envelope includes MCP tool name, adapter, MCP session id, and available
  project/file/page/shape target ids.
- The backend audit logger merges these headers into the normal RPC audit
  context, so existing audit events keep their current names and props while
  gaining MCP traceability.
- MCP session ids are also sent as `x-external-session-id`, reusing the
  existing backend request context field.

P8.2 implementation note (2026-06-13):

- The MCP server now has an in-memory write limiter for backend-command writes.
- Limits are applied per user, session, and target file, with immediate
  structured errors for rate or concurrency rejection.
- Defaults can be tuned with `PENPOT_MCP_WRITE_RATE_LIMIT_PER_USER`,
  `PENPOT_MCP_WRITE_RATE_LIMIT_PER_SESSION`,
  `PENPOT_MCP_WRITE_RATE_LIMIT_PER_FILE`,
  `PENPOT_MCP_WRITE_CONCURRENCY_PER_USER`,
  `PENPOT_MCP_WRITE_CONCURRENCY_PER_SESSION`,
  `PENPOT_MCP_WRITE_CONCURRENCY_PER_FILE`, and
  `PENPOT_MCP_WRITE_RATE_WINDOW_MS`.
- The backend `create-file` command now uses a dedicated `create-file`
  concurrency limit, and default backend rate-limit configuration includes
  headless file/page/shape write buckets.
- `mcp.get_status` exposes token-safe write-limit configuration and current
  limiter scope counts for diagnostics.

P8.3 implementation note (2026-06-13):

- Shared MCP types now define protocol version `1.0`, server capabilities, and
  the minimum plugin capabilities required for first-class file operations.
- The bundled MCP plugin sends a `plugin-hello` message after WebSocket open
  with plugin, Penpot, frontend, owner-tab, capability, and file-context
  metadata.
- The server replies with `plugin-compatibility`, records token-safe plugin
  metadata in WebSocket status, and blocks task dispatch until negotiation
  succeeds.
- Protocol major-version mismatches or missing required plugin capabilities are
  rejected with a structured error and WebSocket close code `1008`.
- `mcp.get_status` now reports compatible, incompatible, and pending plugin
  negotiation counts plus per-connection compatibility summaries.

P8.4 implementation note (2026-06-13):

- MCP server status now includes a token-safe logging summary: log level,
  console logging, optional file log path, and Loki enabled state.
- `mcp.get_status` exposes the same logging summary available from
  `/mcp/status`.
- The global frontend MCP state now records connection detail, last error, and
  `/mcp/status` diagnostics snapshots.
- The Integrations MCP section shows a compact diagnostics block for connection
  state, plugin compatibility, active file context, logs, last error, and last
  refresh time, with a manual refresh control.

P8.5 implementation note (2026-06-13):

- The MCP server now exposes `destructiveConfirmationRequired` in `/status` and
  `mcp.get_status`.
- The policy is configured by
  `PENPOT_MCP_REQUIRE_DESTRUCTIVE_CONFIRMATION=true|false`; when unset, local
  single-user mode does not require confirmations and remote/multi-user mode
  does.
- `shape.delete` accepts an optional `confirm` boolean. When confirmations are
  required and `confirm` is not `true`, the tool returns
  `destructive_action_confirmation_required` before dispatching backend-command
  or plugin-live mutations.
- The structured error includes the tool name, destructive action, target ids,
  selected adapter, and the exact confirmation field/value to retry with.
- Frontend approval UI is not required for this slice because the first-class
  MCP protocol can carry explicit confirmation in the tool arguments; future
  destructive tools should reuse the same policy before mutation.

P8.6 implementation note (2026-06-13):

- Added a no-service `penpot-cli` smoke test suite that runs against the real
  CLI entry point after build.
- The suite covers command discovery, MCP config URL derivation, dev dry-run
  planning, file-open URL generation, exporter dry-run payloads, structured
  adapter errors, and shape-update validation before RPC.
- Added `mcp/docs/regression-smoke-flows.md` as the shared smoke matrix for
  automated TypeScript checks, manual running-stack checks, and locally blocked
  Clojure/frontend checks.

P9.1 implementation note (2026-06-13):

- Audited MCP URL derivation in frontend runtime config, Docker runtime
  injection, `penpot-cli mcp config`, and gateway routing.
- Audited profile-prop persistence and confirmed only `:mcp-enabled` is
  currently accepted by the backend schema.
- Documented the proposed optional `:mcp-config` profile prop, effective config
  derivation rules, and follow-up development order in
  `mcp/docs/manual-mcp-configuration-audit.md`.

P9.2 implementation note (2026-06-13):

- Backend profile props now accept optional `:mcp-config` with `builtin`,
  `custom`, and `local` modes plus auto-connect, public, stream, SSE,
  WebSocket, and status URLs.
- Frontend runtime config now includes SSE and status URI overrides alongside
  existing public, stream, and WebSocket overrides.
- Frontend MCP diagnostics, plugin WebSocket startup, and Integrations copied
  client URLs now read from a shared effective config helper.
- Focused backend/frontend tests cover persistence, reset-to-built-in, and
  effective URL derivation for built-in, local, and custom modes.

P9.3 implementation note (2026-06-14):

- Integrations settings now expose MCP connection controls for `builtin`,
  `custom`, and `local` modes.
- The form persists `:mcp-config` through profile props, trims empty URL
  overrides, and resets to built-in defaults by sending `{:mcp-config nil}`.
- Settings previews the effective stream, SSE, WebSocket, and status endpoints
  from the same helper used by diagnostics, plugin startup, and copied client
  URLs.
- Focused frontend tests cover editable config defaults and profile-prop
  serialization for built-in, custom, and local modes.

P9.4 implementation note (2026-06-14):

- Global MCP initialization now separates the persisted enable switch from the
  saved `auto-connect` preference.
- When MCP is enabled with `auto-connect=false`, Penpot loads the hidden MCP
  plugin and keeps manual connect/disconnect plus bind/release controls
  available, but it does not claim tab ownership or start the MCP WebSocket
  automatically.
- Saving or resetting MCP connection settings emits a lifecycle reconfigure
  broadcast so the current tab disconnects old endpoints and reinitializes with
  the latest effective config.
- The bundled MCP plugin exposes `getAutoConnect()` through its host bridge and
  skips its initial `start-server` message when the preference is disabled.

P10.1 planning note (2026-06-14):

- Added `mcp/docs/penpot-cli-overall-blueprint.md` as the compact current
  architecture baseline for `penpot-cli`.
- The blueprint restates the target module boundaries, runtime modes,
  configuration/connection/file-context/command flows, delivery waves, and
  near-term priority queue.
- This document remains the long-form historical architecture record.

P13.2 implementation note (2026-06-16):

- The bundled MCP plugin is now packaged through
  `mcp/scripts/package-plugin-assets.mjs` instead of ad hoc frontend `rsync`
  steps.
- `mcp-plugin.json` is generated beside `manifest.json` and records package,
  manifest, and protocol metadata for release verification.
- The MCP plugin Vite build reads `MCP_PROTOCOL_VERSION` from
  `packages/common/src/types.ts` and injects it into both plugin entry points.
- Frontend release builds call the same packaging helper with
  `--target target/dist/plugins/mcp`, so Docker/static frontend bundles expose
  checked assets at `/plugins/mcp/manifest.json`.

## 10. Feature Backlog

| Priority | Feature | Main modules | Notes |
| --- | --- | --- | --- |
| P0 | Stable MCP gateway URLs | docker, frontend, mcp, CLI | Hide internal ports from users |
| P0 | Manual MCP enable/disable | frontend, backend | Reuse `profile.props.mcp-enabled` |
| P0 | Manual MCP URL configuration | frontend, backend | Support built-in, custom, local |
| P0 | Background Global MCP Agent | frontend, mcp plugin | Start after login, not workspace-only |
| P0 | Connection status model | frontend, mcp server | Shared states: connected-global, connected-file, error |
| P1 | Global tool group | mcp server, backend | user/team/project/file actions |
| P1 | File context broker | frontend, mcp server | Explicit binding and missing-context errors |
| P1 | Structured page/shape tools | mcp server, mcp plugin | Reduce `execute_code` dependency |
| P1 | CLI MCP orchestration | penpot-cli | Start/status/config/logs |
| P2 | CLI command runtime | penpot-cli, mcp server | Shared schemas with MCP tools |
| P2 | Headless file operations | backend, common | Direct file/page/shape mutation |
| P2 | Headless export path | exporter, render-wasm | Export without open workspace |
| P2 | Audit and rate limiting | backend, mcp server | Required before broad default enablement |

## 11. Security Model

MCP can modify user data, so every layer needs explicit permission boundaries.

Rules:

- MCP token authenticates a Penpot user, not a machine with global privileges.
- Every command must check normal Penpot permissions.
- File tools must check access to the bound file.
- Local file system access is disabled unless local mode and user setting allow
  it.
- `execute_code` is disabled by default in first-class mode, or at minimum
  clearly marked as advanced.
- Write operations should be auditable.
- MCP server should reject unknown or incompatible plugin versions.
- Multi-tab ownership must be explicit to avoid editing the wrong file.

Suggested sensitive settings:

```text
mcp-allow-execute-code
mcp-allow-local-files
mcp-allow-background-writes
mcp-require-confirmation-for-destructive-actions
```

## 12. Open Questions

1. Should MCP be enabled by default for all users, or visible but disabled until
   the user turns it on?
2. Should `execute_code` be available in hosted/remote mode at all?
3. Should global file creation go directly through backend RPC from MCP server,
   or through the Global MCP Agent first?
4. How should a headless command choose a target team/project when the prompt is
   ambiguous?
5. What is the minimum typed tool set needed to create a useful prototype
   without arbitrary JavaScript?

Resolved decisions:

- P6.1: `penpot-cli` lives in this monorepo as a top-level `penpot-cli/`
  package, not inside `mcp/packages` and not in a separate repository.

## 13. Recommended First Implementation Slice

Build the smallest version that proves MCP can be global:

1. Add user-visible MCP mode/config fields.
2. Move MCP lifecycle from workspace scope to app/global scope.
3. Start the bundled plugin as a background system plugin after login.
4. Keep existing file editing through the current plugin bridge.
5. Add a global `mcp.get_status` tool.
6. Add clear `file_context_required` errors for file tools.
7. Add CLI/dev script support to start and inspect the MCP stack.

This keeps the existing working MCP bridge intact while changing the product
model from "open a file, then connect a plugin" to "MCP is part of Penpot, and
file context is attached when needed."
