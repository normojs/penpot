# penpot-cli Overall Blueprint

Status: current planning baseline
Target fork: Penpot `2.15.4` reworked as `penpot-cli`
Updated: 2026-06-16

This document is the compact architecture and delivery plan for the fork. The
larger historical notes remain in `first-class-mcp-architecture.md`,
`headless-command-runtime.md`, `manual-mcp-configuration-audit.md`, and
`command-runtime-inventory.md`. The P16.1 authenticated CLI profile-config
contract lives in `cli-profile-config-read-path.md`.

## Product Goal

Make MCP and CLI first-class Penpot automation surfaces:

- MCP is built in, globally available after login, and user controlled.
- `penpot-cli` is the terminal entry point for local orchestration, diagnostics,
  scripted file/page/shape/export operations, and future offline workflows.
- MCP and CLI share the same command model instead of growing separate
  automation paths.
- Browser/plugin execution remains available for live workspace context, while
  stable commands move toward backend/common/exporter headless adapters.

## Architecture Shape

```text
Users and agents
  |
  +-- Penpot UI settings
  |     -> profile.props.mcp-enabled
  |     -> profile.props.mcp-config
  |
  +-- MCP clients
  |     -> /mcp/stream or /mcp/sse
  |
  +-- penpot-cli
        -> local dev orchestration
        -> command runtime entry adapter

MCP Gateway
  /mcp/stream
  /mcp/sse
  /mcp/ws
  /mcp/status
  /plugins/mcp/manifest.json

MCP Server
  tool registry
  token/session context
  diagnostics and negotiation
  command runtime adapter
  file context registry

Frontend Global MCP Agent
  bundled system plugin
  connection lifecycle
  profile config resolution
  diagnostics UI bridge
  tab ownership

File MCP Agent
  live workspace context
  page/selection updates
  plugin-live operations
  bind/release controls

Command Runtime
  command descriptors
  request/result envelopes
  adapter selection
  structured errors

Adapters
  backend-rpc
  backend-command
  plugin-live
  exporter
  browser-url
  local-fs, later and local-mode gated only

Penpot Core
  backend permission checks
  common file data helpers
  exporter/render services
  plugin API
```

## Runtime Modes

| Mode | User story | Default endpoints | Notes |
| --- | --- | --- | --- |
| `builtin` | Normal self-hosted or hosted Penpot instance | `/mcp/stream`, `/mcp/sse`, `/mcp/ws`, `/mcp/status` under the Penpot public URL | This is the default and should hide internal ports. |
| `custom` | User points Penpot at an external MCP deployment | Stored profile URLs or URLs derived from a custom public base | Used by advanced deployments and reverse-proxy experiments. |
| `local` | Developer runs MCP services directly | `http://localhost:4401/mcp`, `http://localhost:4401/sse`, `ws://localhost:4402`, `http://localhost:4401/status` | Useful for package development and debugging. |

`profile.props.mcp-enabled` remains the compatibility on/off switch. Optional
`profile.props.mcp-config` stores mode, auto-connect, public, stream, SSE,
WebSocket, and status preferences. Tokens stay in access-token rows, and
profile-prop reads and writes keep only the public connection fields.

## Core Data Flows

### Configuration Flow

```text
Docker/runtime env
  -> frontend cf/mcp-* defaults
  -> profile.props.mcp-config
  -> frontend effective MCP config
  -> settings copy URL, diagnostics URL, plugin WebSocket URL
```

Missing `mcp-config` means built-in defaults. Unknown modes fall back to
built-in behavior in the frontend, partial custom URLs derive from the public
base or runtime defaults, and `{:mcp-config nil}` resets the user to built-in
defaults.

### Connection Flow

```text
User logs in
  -> fetch profile and MCP token summary
  -> evaluate enabled/configured/auto-connect
  -> start bundled system plugin
  -> plugin connects to effective websocket-uri
  -> server negotiates protocol/capabilities
  -> frontend stores connected-global or error diagnostics
```

### File Context Flow

```text
Workspace opens file
  -> frontend publishes available context
  -> server stores token-scoped context summary
  -> user or agent binds context
  -> file tools can use plugin-live adapter
  -> release or tab close returns to connected-global
```

### Command Flow

```text
MCP tool or CLI command
  -> command descriptor
  -> input validation
  -> adapter selection
  -> backend-command, backend-rpc, plugin-live, exporter, or browser-url
  -> shared response envelope with adapter diagnostics
```

## Module Responsibilities

| Module | Owns | Should not own |
| --- | --- | --- |
| `frontend` | Settings UI, effective profile config, global MCP lifecycle, diagnostics, tab ownership, live file context | Backend authorization, command business logic, CLI behavior |
| `mcp/packages/server` | MCP protocol binding, tool registry, session/token routing, file context registry, plugin bridge | CLI argv parsing, persisted file mutation internals |
| `mcp/packages/plugin` | Hidden system plugin bridge and live workspace tasks | Global product config persistence |
| `penpot-cli` | Terminal UX, local orchestration, command entry adapter, script-friendly output | A separate command implementation fork |
| `command-runtime` | Shared descriptors, envelopes, adapter selection, common TypeScript helpers | Penpot backend data mutation |
| `backend` | Authenticated RPC/headless command handlers, permissions, audit metadata, persistence | UI state and local process orchestration |
| `common` | Canonical data helpers and validation for file/page/shape edits | Entry adapter concerns |
| `exporter` | Headless render/export adapter | MCP sessions or profile settings |
| `docker` | Public gateway routing and runtime frontend env injection | User-level profile preferences |

## Delivery Waves

### Wave A: Manual MCP Configuration And Lifecycle Polish

Purpose: make MCP easy to enable, configure, inspect, and run globally.

Status: complete as of 2026-06-15. The remaining configuration limitations are
post-Wave-A work: `penpot-cli mcp config` still derives from environment/runtime
inputs instead of persisted profile props, and frontend/CLI URL derivation is
aligned by terminology but not shared as one implementation.

Tasks:

- Done: build Integrations settings controls for built-in/custom/local config.
- Done: persist settings through `update-profile-props`.
- Done: apply `auto-connect` to startup, reconnect, and manual disconnect
  behavior.
- Done: show effective stream/WebSocket/status endpoints in diagnostics.
- Done: align `penpot-cli mcp config` output and docs with persisted product
  terminology while preserving environment-derived URL compatibility.
- Done: add focused frontend/backend/CLI tests for config, lifecycle, fallback,
  reset, and token separation.

Acceptance:

- A user can enable MCP, choose a mode, save settings, reset to built-in, and
  see the actual endpoint URLs being used.
- Global MCP can remain connected without opening a file.

### Wave B: Command Runtime Consolidation

Purpose: make MCP and CLI share command descriptors and result envelopes.

Tasks:

- Move command descriptors for file/page/shape/export/status into
  `command-runtime`.
- Introduce a shared `CommandRequest` and `CommandResponse` envelope in CLI and
  MCP tools.
- Centralize adapter selection reasons and unsupported/unavailable errors.
- Keep plugin-live fallback for live workspace operations.
- Add snapshot tests for descriptor shape and adapter selection.

Acceptance:

- Adding a command descriptor once makes the command available to both MCP and
  CLI entry adapters, subject to transport-specific formatting.

Current state:

- Done: low-risk status/config/file/page descriptors live in
  `@penpot/command-runtime`.
- Done: low-risk MCP and CLI paths use shared request/result envelopes for
  command, transport, adapter, target, auth-present, diagnostics, payload data,
  and warnings metadata.
- Done: common command error codes, adapter-selection failure payloads, and
  adapter reason text are centralized in `@penpot/command-runtime`.
- Done: shape/create/update/delete, export.shape, export.page, and
  render.preview descriptors are part of the migrated command catalog.
- Done: initial descriptor-only `export.file` and `render.thumbnail` entries
  reserved planned export/render names before executable adapters were enabled.
- Done: `export.file` has a fixture-backed backend `export-binfile` binary
  archive contract in command-runtime.
- Done: `penpot-cli export file` executes the backend-rpc `export-binfile`
  stream, returns resource metadata, and writes the `.penpot` archive with
  `--output`.
- Done: MCP `export.file` executes the same backend-rpc `export-binfile`
  stream and returns resource metadata plus a resolved `downloadUri` without
  writing files on the MCP server filesystem.
- Done: `render.thumbnail` has a fixture-backed dashboard thumbnail contract
  for file and tagged frame targets, cache policy, PNG artifact metadata, and
  backend data/persist boundaries.
- Done: `render.thumbnail` runtime execution is assigned to a future thumbnail
  renderer service boundary; registration remains blocked until service API
  fixtures define resource returns and cache/auth behavior.
- Done: `render.thumbnail` renderer-service API fixtures define future file
  refresh, file reuse, tagged frame refresh, auth forwarding, resource URI
  normalization, and MCP/CLI test expectations.
- Done: `penpot-cli render thumbnail --dry-run` prints the future
  renderer-service request shape while execution returns
  `renderer_service_unavailable` until the renderer exists.
- Done: MCP `render.thumbnail` is registered as a planning-only dry-run tool
  that returns the shared renderer-service request metadata while execution
  remains unavailable.
- Done: renderer-service planning responses include client configuration,
  derived health endpoint, timeout, and metadata-only availability status
  without probing the network.
- Done: renderer-service response normalization and error payload contracts are
  defined without enabling network execution.
- Done: disabled renderer-service client request scaffolding is defined with
  audit headers and caller-session auth forwarding names.
- Done: a closed renderer-service execution gate records explicit opt-in,
  required config, failure modes, and integration-test plan while keeping
  dispatch disabled.
- Done: disabled renderer-service health preflight and executable client
  harness plans define future GET `/health`, execution ordering, and failure
  modes while keeping dispatch disabled.
- Done: disabled renderer-service dispatch adapter boundary records config
  precedence, gate/preflight/request consumption, result/error mapping, and
  no-dispatch defaults.
- Done: focused command-runtime tests cover descriptor groups, lookup,
  adapter-selection priority/error cases, and token-safe envelopes.
- Status: complete. Later command coverage gaps were tracked by the P15.1
  audit findings and ordered into Wave H by P15.2.

### Wave C: Headless Authoring Expansion

Purpose: reduce dependency on a live browser tab for normal prototype creation.

Tasks:

- Done: add backend/common, MCP, and CLI support for page rename through the
  backend-command adapter.
- Done: expand backend-command `shape.update` style and hierarchy fields with
  fill/stroke stacks, independent corner radii, and parent frame movement.
- Done: add backend-safe frame layout updates for `shape.update`, covering
  `layout none` and flex direction, wrap, alignment, gap, and padding.
- Done: add backend-safe grid container layout updates for frames, covering
  grid direction, rows/columns tracks, gaps, padding, and alignment.
- Done: add headless image/media insertion for image-backed rectangles through
  existing backend media upload/storage paths.
- Done: add backend-supported prototype flow and navigate interaction helpers
  for explicit file/page targets, with MCP and CLI adapter routing.
- Done: expand exporter-backed preview/render commands for explicit
  file/page/object targets, with shared artifact metadata for MCP and CLI.
- Keep set-current as a live workspace operation unless a future backend
  metadata use case becomes meaningful.
- Keep grid cells, child placement, and full layout-engine mutations in
  plugin-live until backend-command owns a stable cell payload contract.

Acceptance:

- A script or MCP client can create a simple multi-screen prototype and export
  a preview without a live workspace tab for supported shape types.

### Wave D: File Opening, Binding, And User Handoff

Purpose: close the loop between headless automation and the visual editor.

Tasks:

- Done: define the file open/bind handoff UX and command contract in
  `mcp/docs/file-open-bind-handoff.md`.
- Done: add reliable `file.open` handoff from CLI/MCP to browser URL with
  shared `workspaceUrl` and `handoff` payloads.
- Done: show file context state in dashboard/settings, not only workspace menu.
- Done in P12.4: add explicit bind/open actions that guide the user when a
  live context is required.
- Preserve a single write-capable owner tab while allowing clear release.

Acceptance:

- An agent can create or find a file, ask Penpot to open it, and guide the user
  to bind the file context when plugin-live tools are needed.

### Wave E: Packaging And Distribution

Purpose: make the fork usable outside a developer checkout.

Tasks:

- Done in P13.1: define how `penpot-cli` is built, versioned, and installed
  from a private fork checkout while workspace dependencies remain internal.
- Done in P13.2: package MCP plugin assets reliably with frontend builds,
  generate `mcp-plugin.json` metadata, and expose root package/check commands.
- Done in P13.3: document Docker/self-hosted MCP gateway setup for built-in,
  custom, and local modes, including proxy requirements and diagnostics.
- Done in P13.4: add migration notes for existing MCP users with legacy
  profile props, project-local client configs, environment-only deployments,
  direct-port URLs, existing tokens, bundled plugin behavior, and
  `execute_code` changes.
- Keep the CLI private during fork development until `@penpot/command-runtime`
  is bundled, published with compatible versions, or shipped in a documented
  release archive layout.

Acceptance:

- A local developer and a self-hosted operator can follow one documented path
  to enable MCP and use `penpot-cli`.

### Wave F: Verification And Release Readiness

Purpose: make the new architecture safe to change.

Tasks:

- Done in P14.1: add a focused config and global connection smoke flow covering
  enable, built-in/custom/local mode changes, auto-connect off/on, manual
  connect/disconnect, status evidence, and disable.
- Done in P14.2: add a focused headless edit/export smoke flow covering
  file/page/shape creation, shape update, adapter diagnostics, exporter
  dry-runs, and artifact output without a live workspace.
- Done in P14.3: add a focused live bind smoke flow covering file open
  handoff, context inspection, context binding, plugin-live page switching,
  release, stale recovery, and multi-tab owner behavior.
- Done in P14.4: add
  [`ci-friendly-check-commands.md`](ci-friendly-check-commands.md) with
  CI-friendly TypeScript, Clojure, ClojureScript, packaging, and smoke command
  tiers.
- Done in P14.4: track missing local tools, dependencies, browser automation,
  and unavailable running services separately from product failures.
- Done by P9.7, P13.4, and P14 smoke docs: preserve compatibility behavior for
  old profile props, environment-derived configuration, direct-port local
  users, and legacy SSE clients. Any new compatibility automation should be
  planned as part of the next wave instead of being carried as active Wave F
  work.

Acceptance:

- The critical MCP/CLI flows have repeatable checks and documented manual
  fallback steps when full local tooling is unavailable.

## P15.1 Roadmap Audit Findings

P15.1 reconciled the tracker and this blueprint after Waves A-F completed.
The Feature Roadmap and phase tables now keep only one active task, and
completed capabilities are no longer described as active work.

P15.2 selected Wave H from these then-remaining gaps:

- `penpot-cli mcp config` still derives from environment/runtime inputs instead
  of reading persisted profile props.
- Frontend and CLI URL derivation use aligned terminology but are not yet a
  shared implementation.
- `penpot-cli dev up --mcp` still has planned `host` and `hybrid` local modes.
- The CLI remains private until command-runtime packaging, publishing, or a
  documented release archive layout exists.
- `local-fs` remains a later, local-mode-gated adapter.
- Page current/selection semantics, grid/full layout editing, and prototype
  overlay/list/delete behavior remain plugin-live until backend-safe data
  representations are defined.
- The command-runtime inventory still has coverage gaps for diagnostics,
  account/team/project/file recents, file context, legacy tools, and planned
  tool names that are not executable descriptors yet.

Wave H closed the first four items by adding authenticated CLI profile reads,
canonical URL fixtures, hardened host/hybrid dry-run plans, and a verified
private release archive. The next planning slice narrows the remaining work to
live-only authoring semantics and command coverage gaps.

### Wave G: Roadmap Reconciliation And Next-Wave Planning

Purpose: keep the delivery tracker accurate before expanding behavior again.

Tasks:

- Done in P15.1: reconcile `todo.md`, this blueprint, and architecture notes
  so completed capabilities are not described as active work.
- Done in P15.2: define Wave H / Phase 16 from the audited gaps, with ordered
  tasks, affected modules, verification targets, and P16.1 as the first active
  implementation task.

Acceptance:

- `todo.md` has one active phase task and the next implementation wave is
  explicit enough to start without another planning pass.

### Wave H: CLI Configuration Convergence And Distribution Hardening

Purpose: make `penpot-cli` report the same effective MCP configuration that
Penpot uses, then harden local development and portable packaging around that
stable configuration model.

Tasks:

- Done in P16.1: audit the authenticated CLI profile-config read path and
  precedence contract before code changes. See
  `cli-profile-config-read-path.md`.
- Done in P16.2: add an optional authenticated profile source to
  `penpot-cli mcp config`, preserving current env-derived/no-network behavior.
- Done in P16.3: add canonical MCP URL derivation contract fixtures for
  frontend and CLI parity across built-in, custom, local, partial, invalid, and
  reset cases.
- Done in P16.4: harden `dev up --mcp` host/hybrid dry-run planning with
  dependency, port, service-surface, and unsupported-startup diagnostics.
- Done in P16.5: define and verify a portable CLI release archive path that
  includes the built CLI and command-runtime dependency boundary without
  relying on global workspace links.

Acceptance:

- A developer can ask the CLI for MCP config and understand whether the values
  came from flags, environment, authenticated Penpot profile props, or defaults.
- Local orchestration and packaging docs/checks build on that stable config
  contract instead of duplicating endpoint assumptions.

### Wave I: Headless Live-Gap Closure

Purpose: turn the remaining plugin-live-only authoring gaps into explicit
contracts, then move the backend-safe subset into headless MCP/CLI operations
without pretending ephemeral workspace state is persisted document data.

Tasks:

- P17.1: completed 2026-06-17 in
  `headless-live-gap-audit.md`; page current/selection remain live workspace
  state, prototype list/read is backend-safe persisted data, grid needs a
  scoped backend container contract, and overlay/delete/descriptor-only gaps stay
  planned or unsupported until contracts exist.
- P17.2: completed 2026-06-17; `LiveGapCommandDescriptors` now expose the
  selected live-only, read-only, and unsupported capability boundaries
  consistently for CLI/MCP metadata.
- P17.3: completed 2026-06-17; backend-command prototype read/list support now
  works for explicit file/page targets through common/backend, MCP, and
  `penpot-cli`.
- P17.4: completed 2026-06-17; backend-command now supports the grid container
  track subset for explicit file targets while cell/child placement stays out
  of scope.
- P17.5: completed 2026-06-17; live-only current-page/selection guidance now
  includes plugin-live recovery metadata, target-aware `page.set_current`
  handoff URLs, aligned CLI reason text, and smoke evidence.

Acceptance:

- `todo.md` has Phase 19 as the next implementation wave.
- The Wave I audit documents the adapter boundary before runtime behavior
  changes.
- Operations that remain live-only explain why and point agents through
  `file.open`, `file.get_context`, `file.bind_context`, and retry steps.

## Near-Term Priority

Wave D, Wave E, Wave F, Wave G, Wave H, Wave I / Phase 17, Phase 18, and P19.1
are complete. Prototype delete now has an explicit target identity contract:
stable `interactionId` when present, or `fileId`, `pageId`, `sourceShapeId`,
and zero-based `interactionIndex` as the legacy fallback. P22.1 selects
persisted interaction UUIDs as the stable identity path, P22.2 exposes optional
`interactionId` plus explicit `identity.kind` metadata on interaction reads,
P22.3 implements stable-id deletion with source/index stale guards, and P22.4
defines descriptor-only update/reorder/duplicate helper contracts.

P19.2 is complete:

1. Common/backend expose source-shape/index prototype interaction deletion
   through `delete-file-prototype-interaction`.
2. MCP and `penpot-cli prototype delete-interaction` route the same
   backend-command mutation and return deleted interaction summaries.
3. Missing source shapes and stale indexes have focused test coverage.

P19.3 is complete and closes Phase 19:

1. `prototype.create_overlay` remained descriptor-only and explicitly
   unsupported at the Phase 19 boundary.
2. Overlay creation needed a stable contract for action type
   (`open-overlay`, `toggle-overlay`, `close-overlay`), destination board,
   relative target, preset/manual positioning, close-on-click-outside,
   background overlay, animation, and persisted response summaries.
3. The next safe slice was read-only overlay interaction summaries and fixtures
   before any backend-command mutation implementation.

Phase 20 is complete:

1. Done in P20.1: extend prototype interaction summaries to include persisted
   overlay actions without creating or mutating them.
2. Done in P20.2: define the `prototype.create_overlay` payload and validation
   model in `prototype-create-overlay-contract.md` while keeping the descriptor
   adapterless at the contract stage.
3. Done in P20.3: implement backend-command overlay creation through
   common/backend helpers, MCP `prototype.create_overlay`, and
   `penpot-cli prototype create-overlay` with validation and smoke coverage.

P22.1 is complete:

1. `prototype-interaction-identity.md` audits the current persisted interaction
   vector shape and the source-shape/index runtime contract.
2. The selected future stable identity is a persisted interaction UUID, not a
   generated content fingerprint.
3. `prototype-interaction-identity-fixtures.json` captures id-present,
   id-missing, duplicate-id, and legacy fallback expectations for the next read
   metadata slice.

P22.2 is complete:

1. Common/backend prototype interaction summaries expose optional
   `interactionId` when stored interactions carry ids.
2. Every summary includes `identity.kind`, using `stable-id` for persisted ids
   and `source-index` with `unstable: true` for legacy/id-missing data.
3. MCP and `penpot-cli prototype list-interactions` preserve the identity
   metadata in JSON output.

P22.3 is complete:

1. Common/backend `prototype.delete_interaction` can delete by persisted
   `interactionId` while preserving source-shape/index deletion.
2. Optional source/index guards with `interactionId` reject stale targets
   before deleting.
3. MCP and `penpot-cli prototype delete-interaction` expose
   `interactionId` targeting and keep legacy `--source --index` scripts
   working.

P22.4 is complete:

1. `prototype.update_interaction`, `prototype.reorder_interaction`, and
   `prototype.duplicate_interaction` have command-runtime descriptors and
   planned MCP tool names.
2. `prototype-mutation-helper-contracts.md` defines payload boundaries,
   stale guard behavior, action-specific update rules, same-source reorder,
   and same-source duplicate behavior.
3. The helpers intentionally expose no executable adapters until interaction
   UUID generation and legacy migration semantics are stable.

P23.1 through P23.4 are complete:

1. `prototype-interaction-uuid-generation-migration.md` audits current
   headless, backend, frontend workspace, copy/remap, import, and migration
   touchpoints.
2. Backend-command-created navigate and overlay interactions now receive
   backend-owned ids without accepting caller-provided ids.
3. Common file-data migration `0018-assign-prototype-interaction-ids` now
   backfills missing legacy ids and repairs later duplicate ids while
   preserving order, payload fields, and first existing unique ids.
4. In-file shape/page copy paths regenerate ids for distinct copied
   interactions.
5. `prototype.update_interaction`, `prototype.reorder_interaction`, and
   `prototype.duplicate_interaction` now execute through backend-command, MCP,
   and `penpot-cli`.

P24.1 is complete:

1. File-level duplicate/import semantics are explicitly file-bound: first
   unique interaction ids can be preserved across the new file boundary.
2. Backend duplicate/import paths run through common migrations, so missing or
   later duplicate ids are still repaired inside the copied/imported file.
3. Common migration fixtures cover cloned/imported file data without requiring
   a PostgreSQL-backed backend integration test.

P25.2 is complete:

1. `export.file` maps to backend `export-binfile` RPC/SSE semantics, not
   exporter `export-shapes`.
2. `libraryMode` owns the user-facing archive behavior: `all`, `merge`, or
   `detach`.
3. The shared command-runtime helper and JSON fixtures lock the request
   mapping.

P25.3 is complete:

1. `penpot-cli export file` selects backend-rpc and calls backend
   `export-binfile`.
2. The CLI parses the SSE resource URI and reports resource metadata.
3. `--output` downloads the returned `.penpot` resource.

P25.4 is complete:

1. `render.thumbnail` maps to dashboard thumbnail data/render/cache semantics,
   not exporter `export-shapes`.
2. File thumbnail and tagged frame thumbnail targets have explicit cache keys,
   PNG artifact dimensions, renderer plan, and backend persist commands.
3. At P25.4 the descriptor remained adapterless until a future runtime owned
   worker or renderer-service execution; P25.8 later adds only a planning
   adapter.

P25.5 is complete:

1. MCP `export.file` is registered as a backend-rpc tool.
2. The MCP tool calls backend `export-binfile`, parses the SSE `end` event,
   and returns `.penpot` resource metadata plus `downloadUri`.
3. MCP keeps file writing out of scope; CLI `--output` remains the local
   archive download path.

P25.6 is complete:

1. `render.thumbnail` future execution is assigned to a dedicated thumbnail
   renderer service boundary, not direct MCP Node rendering.
2. Frontend worker and exporter-compatible routes remain deferred until they can
   satisfy global MCP/CLI execution plus dashboard thumbnail cache persistence.
3. MCP and CLI thumbnail registration remain blocked until renderer-service API
   fixtures define resource returns, tagged-frame URI normalization, cache
   reuse/refresh, auth, and tests.

P25.7 is complete:

1. The future `thumbnail.render` renderer-service request/response API is
   documented and fixture-backed.
2. Fixtures cover file refresh, file cache reuse, tagged frame refresh, missing
   frame target errors, caller auth forwarding, and resource URI normalization.
3. At the P25.7 boundary, `render.thumbnail` remained adapterless until a
   renderer-service implementation and dry-run/client boundary existed.

P25.8 is complete:

1. `@penpot/command-runtime` exposes the renderer-service plan helper and marks
   `render.thumbnail` with the `renderer-service` planning adapter.
2. `penpot-cli render thumbnail --dry-run` prints the future service request
   without contacting a renderer or backend service.
3. Runtime execution remains blocked with `renderer_service_unavailable`.

P25.9 is complete:

1. MCP `render.thumbnail` is registered as a planning-only dry-run tool.
2. It returns the shared renderer-service request metadata for file and tagged
   frame targets without contacting renderer, backend, exporter, or plugin
   runtimes.
3. `dryRun:false`, unsupported adapters, and incomplete frame targets return
   structured errors before runtime dispatch.

P25.10 is complete:

1. Shared renderer-service plans include `client` and `availability` metadata.
2. CLI accepts `--renderer-timeout-ms` and
   `PENPOT_RENDERER_SERVICE_TIMEOUT_MS`; MCP accepts equivalent tool input and
   environment configuration.
3. Availability remains metadata-only, so dry-run and unavailable execution do
   not contact renderer-service, backend, exporter, plugin, or local files.

P25.11 is complete:

1. Shared helpers normalize future renderer-service success responses into
   cache, resource/download URI, renderer, and service-response metadata.
2. Shared error payloads include renderer-service status, endpoint,
   retryability, and service data.
3. MCP and CLI planning expose the response/error contracts while execution
   remains unavailable.

P25.12 is complete:

1. Shared plans include a disabled renderer-service `clientRequest` scaffold.
2. MCP and CLI add audit headers for their entrypoints while keeping token
   values out of the plan.
3. `dispatch:false` remains part of dry-run and unavailable execution payloads.

P25.13 is complete:

1. Shared plans include closed `executionGate` metadata for future
   renderer-service dispatch.
2. The gate names `PENPOT_RENDER_THUMBNAIL_EXECUTION=renderer-service`,
   required endpoint config, blockers, and failure modes.
3. MCP and CLI expose the gate in dry-run and unavailable execution responses
   without contacting renderer-service.

P25.14 is complete:

1. Shared plans include disabled `healthPreflight` metadata for the future
   renderer-service GET `/health` check.
2. Shared plans include disabled `executionClientHarness` metadata for the
   future gate/preflight/request/normalization sequence.
3. MCP and CLI expose both plans in dry-run and unavailable execution responses
   without network probes or render dispatch.

P25.15 is complete:

1. Shared plans include disabled `dispatchAdapterBoundary` metadata for the
   future renderer-service executable adapter.
2. The boundary records config precedence, gate/preflight/request consumption,
   result/error helper mapping, and no-dispatch defaults.
3. MCP and CLI expose the boundary in dry-run and unavailable execution
   responses without registering runtime dispatch.

Keep manual configuration behavior stable while moving command metadata and
envelopes; transport-specific formatting should stay at the MCP/CLI edges.

## Decisions To Keep Stable

- MCP is a built-in system capability, not a project-local setup step.
- MCP and CLI share command concepts; neither should become the only source of
  command truth.
- Headless operations should move into backend/common/exporter only when they
  can reuse normal Penpot permission and persistence paths.
- The bundled plugin remains the live workspace adapter for operations that
  need current canvas state, selection, or plugin-only APIs.
- User-facing URLs should default to the Penpot gateway, not raw internal ports.
