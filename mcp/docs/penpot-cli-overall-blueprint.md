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
- Done: renderer-service opt-in configuration surfaces record CLI flag, MCP
  arg, environment, profile/backend keys, precedence diagnostics, and
  invalid-value diagnostics without enabling dispatch.
- Done: renderer-service unavailable error taxonomy records stable
  configuration, execution-gate, health-preflight, dispatch, response, and
  resource error codes with retryability and MCP/CLI payload fields.
- Done: renderer-service integration fixture harness records future closed
  gate, health failure, render success, service failure, MCP metadata, CLI
  output, and token-safe auth cases without enabling dispatch.
- Done: renderer-service dispatch registration preflight records the final
  readiness checklist for future executable dispatch without enabling runtime
  registration.
- Done: renderer-service executable adapter registration scaffold records the
  future no-op MCP/CLI registration surface without enabling dispatch,
  runtime registration, or local file writes.
- Done: renderer-service adapter registry manifest records future
  `renderer-service` registry key and MCP/CLI entrypoint wiring without
  mutating the runtime registry or enabling dispatch.
- Done: renderer-service enablement checklist records final opt-in, health,
  integration, adapter registration, registry, and target/cache gates without
  enabling runtime dispatch.
- Done: renderer-service implementation slice audit selects the health/no-op
  contract fixture as the first safe implementation step without enabling
  runtime dispatch.
- Done: renderer-service health/no-op contract fixtures define `/health` and
  no-op `thumbnail.render` responses without enabling runtime dispatch.
- Done: renderer-service no-op service host scaffold defines future host
  package, routes, lifecycle, and observability without starting a process.
- Done: renderer-service host lifecycle test fixtures define start, stop,
  readiness, supervision, logs, and error expectations without spawning a
  process.
- Done: renderer-service package manifest scaffold defines the future
  `@penpot/renderer-service` package metadata, planned scripts, exports,
  dependencies, files, and workspace integration flags without creating a
  package, mutating workspace files, or making scripts runnable.
- Done: renderer-service package creation guardrails define required checks,
  blocked package/workspace/runtime mutations, allowed planning work, denied
  actions, and runtime prerequisites without creating package files or
  mutating workspace state.
- Done: renderer-service package file templates define metadata-only planned
  `package.json`, `tsconfig.json`, source, no-op host, and test shapes without
  materializing files, emitting build output, creating a package, or mutating
  workspace state.
- Done: renderer-service package workspace wiring defines metadata-only planned
  `pnpm-workspace.yaml` entry, root scripts, lockfile touchpoints, workspace
  filter, and non-target files without editing manifests, mutating lockfiles,
  creating package files, or making scripts runnable.
- Done: renderer-service package build verification defines metadata-only
  filtered build, type-check, and test commands plus expected `dist` artifacts
  without running package scripts, spawning processes, emitting build output,
  creating package files, or mutating workspace state.
- Done: renderer-service package materialization checklist defines
  metadata-only package/workspace/output batches, readiness checks, commit
  boundary, and rollback plan without approving materialization, creating
  files, mutating workspace state, or registering runtime dispatch.
- Done: renderer-service package creation dry-run summary defines
  metadata-only would-create, would-modify, would-generate, and would-run
  sections without writing files, mutating workspace state, running commands,
  or registering runtime dispatch.
- Done: renderer-service package creation file manifest defines metadata-only
  future package directory, package file, generated file, workspace file,
  readiness blocker, and no-op guarantee entries without materializing files,
  mutating workspace state, running commands, or registering runtime dispatch.
- Done: renderer-service package materialization approval gate defines
  metadata-only approval inputs, approval scope, blocked decision state,
  post-approval sequence, and no-op guarantees without granting approval,
  materializing files, mutating workspace state, running commands, or
  registering runtime dispatch.
- Done: renderer-service package materialization execution dry-run defines
  metadata-only future directory creation, package file write, workspace
  mutation, and verification command steps without granting approval,
  creating directories, writing files, mutating workspace state, running
  commands, or registering runtime dispatch.
- Done: renderer-service package materialization write contract defines
  metadata-only future package directory, package file, workspace file,
  integrity, atomic write, and rollback expectations without granting
  approval, creating directories, writing files, mutating workspace state,
  running commands, or registering runtime dispatch.
- Done: renderer-service package materialization rollback contract defines
  metadata-only pre-write snapshots, rollback phases, failure recovery, and
  rollback verification without granting approval, executing rollback,
  creating or removing directories, restoring files, mutating workspace state,
  running commands, or registering runtime dispatch.
- Done: renderer-service package materialization verification manifest defines
  metadata-only package file checks, workspace file checks, generated output
  checks, verification commands, and runtime-disabled assertions without
  granting approval, writing files, mutating workspace state, running commands,
  emitting build output, or registering runtime dispatch.
- Done: renderer-service package materialization final approval checklist
  defines metadata-only explicit approval items, approval scope, blocked
  decision state, and post-approval sequence without granting approval, writing
  files, mutating workspace state, running commands, emitting build output, or
  registering runtime dispatch.
- Done: renderer-service package materialization explicit approval token
  defines metadata-only one-time token contract, validation plan, audit plan,
  blocked decision state, and no-op guarantees without accepting or validating
  a token, granting approval, writing files, mutating workspace state, running
  commands, emitting build output, or registering runtime dispatch.
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

P25.16 is complete:

1. Shared plans include `optInConfiguration` metadata for future renderer
   execution opt-in surfaces.
2. CLI exposes `--render-thumbnail-execution renderer-service`; MCP exposes
   `rendererServiceExecution`; env/profile/backend config sources are recorded
   as future surfaces.
3. Valid and invalid values are diagnostic only; configuration alone cannot
   open the gate or enable dispatch.

P25.17 is complete:

1. Shared plans include `unavailableErrorTaxonomy` metadata for stable
   renderer-service unavailable/preflight/dispatch/resource error codes.
2. MCP and CLI dry-run plus unavailable execution payloads expose the taxonomy
   without enabling renderer-service network dispatch.
3. `renderer_service_health_unavailable` is the only planned retryable code;
   pre-implementation config/gate/dispatch errors remain non-retryable.

P25.18 is complete:

1. Shared plans include `integrationFixtureHarness` metadata for the future
   renderer-service integration suite.
2. MCP and CLI dry-run plus unavailable execution payloads expose the harness
   without enabling renderer-service network dispatch.
3. Harness fixtures define the required cases before executable dispatch:
   closed gate, missing endpoint, health failure, render success, service
   error, MCP resource metadata, CLI output gating, and token-safe auth.

P25.19 is complete:

1. Shared plans include `dispatchRegistrationPreflight` metadata for final
   renderer-service dispatch readiness checks.
2. MCP and CLI dry-run plus unavailable execution payloads expose the
   preflight without enabling runtime registration.
3. `dispatchRegistrationPreflight.dispatch`, `networkDispatch`,
   `runtimeRegistration`, and `localFileWrites` remain false.

P25.20 is complete:

1. Shared plans include `executableAdapterRegistrationScaffold` metadata for
   the future no-op renderer-service adapter registration surface.
2. MCP and CLI dry-run plus unavailable execution payloads expose the scaffold
   without registering runtime dispatch.
3. `executableAdapterRegistrationScaffold.dispatch`, `networkDispatch`,
   `runtimeRegistration`, and `localFileWrites` remain false.

P25.21 is complete:

1. Shared plans include `adapterRegistryManifest` metadata for the future
   `renderer-service` adapter registry key and MCP/CLI entrypoint wiring.
2. MCP and CLI dry-run plus unavailable execution payloads expose the manifest
   without mutating the runtime registry or registering executable handlers.
3. `adapterRegistryManifest.dispatch`, `networkDispatch`,
   `runtimeRegistration`, and `localFileWrites` remain false.

P25.22 is complete:

1. Shared plans include `enablementChecklist` metadata for the final
   renderer-service runtime enablement gates.
2. MCP and CLI dry-run plus unavailable execution payloads expose the
   checklist without enabling runtime registration, network dispatch, or local
   writes.
3. `enablementChecklist.dispatch`, `networkDispatch`, `runtimeRegistration`,
   and `localFileWrites` remain false.

P25.23 is complete:

1. Shared plans include `implementationSliceAudit` metadata for the first
   concrete renderer-service implementation slice.
2. The selected next slice is the renderer-service health/no-op contract
   fixture, not PNG rendering.
3. `implementationSliceAudit.dispatch`, `networkDispatch`,
   `runtimeRegistration`, and `localFileWrites` remain false.

P25.24 is complete:

1. Shared plans include `healthNoopContractFixtures` metadata for `/health`
   OK/unavailable and no-op `thumbnail.render` fixture responses.
2. MCP and CLI expose these fixtures in dry-run and unavailable execution
   payloads without health fetches or renderer-service calls.
3. `healthNoopContractFixtures.dispatch`, `networkDispatch`,
   `runtimeRegistration`, and `localFileWrites` remain false.

P25.25 is complete:

1. Shared plans include `noopServiceHostScaffold` metadata for the future
   renderer-service no-op host package, routes, config, lifecycle, and
   observability.
2. MCP and CLI expose this scaffold in dry-run and unavailable execution
   payloads without starting a process or registering runtime dispatch.
3. `noopServiceHostScaffold.hostStartup`, `dispatch`, `networkDispatch`,
   `runtimeRegistration`, and `localFileWrites` remain false.

P25.26 is complete:

1. Shared plans include `hostLifecycleTestFixtures` metadata for start, stop,
   readiness, supervision, logs, and errors.
2. MCP and CLI expose these fixtures in dry-run and unavailable execution
   payloads without spawning a process, binding ports, or probing health.
3. `hostLifecycleTestFixtures.processSpawn`, `hostStartup`,
   `networkDispatch`, `runtimeRegistration`, and `localFileWrites` remain
   false.

P25.27 is complete:

1. Shared plans include `packageManifestScaffold` metadata for the future
   `@penpot/renderer-service` package manifest, planned scripts, exports,
   dependencies, files, and workspace integration flags.
2. MCP and CLI expose this scaffold in dry-run and unavailable execution
   payloads without creating package files, mutating workspace manifests,
   updating lockfiles, or making scripts runnable.
3. `packageManifestScaffold.packageCreated`, `workspaceMutation`,
   `scriptRunnable`, `dispatch`, `networkDispatch`, `runtimeRegistration`, and
   `localFileWrites` remain false.

P25.28 is complete:

1. Shared plans include `packageCreationGuardrails` metadata for required
   package creation checks, blocked package/workspace/runtime mutations,
   allowed planning work, denied actions, and runtime-dispatch prerequisites.
2. MCP and CLI expose these guardrails in dry-run and unavailable execution
   payloads without creating the package directory, mutating workspace
   manifests, updating lockfiles, making scripts runnable, or starting
   processes.
3. `packageCreationGuardrails.packageCreated`, `workspaceMutation`,
   `scriptRunnable`, `hostStartup`, `processSpawn`, `dispatch`,
   `networkDispatch`, `runtimeRegistration`, and `localFileWrites` remain
   false.

P25.29 is complete:

1. Shared plans include `packageFileTemplates` metadata for planned
   `package.json`, `tsconfig.json`, source entrypoint, no-op host, and no-op
   host test shapes.
2. MCP and CLI expose these templates in dry-run and unavailable execution
   payloads without materializing files, creating the package directory,
   emitting build output, mutating workspace manifests, or making scripts
   runnable.
3. `packageFileTemplates.fileMaterialization`, `packageCreated`,
   `workspaceMutation`, `scriptRunnable`, `hostStartup`, `processSpawn`,
   `dispatch`, `networkDispatch`, `runtimeRegistration`, and
   `localFileWrites` remain false.

P25.30 is complete:

1. Shared plans include `packageWorkspaceWiring` metadata for the planned
   `pnpm-workspace.yaml` entry, root scripts, lockfile touchpoints, workspace
   dependency filter, and non-target files.
2. MCP and CLI expose this wiring in dry-run and unavailable execution payloads
   without editing workspace manifests, mutating lockfiles, editing root
   `package.json`, creating package files, emitting build output, or making
   scripts runnable.
3. `packageWorkspaceWiring.pnpmWorkspaceMutation`,
   `rootPackageJsonMutation`, `lockfileMutation`, `workspaceMutation`,
   `packageCreated`, `scriptRunnable`, `fileMaterialization`, `dispatch`,
   `networkDispatch`, `runtimeRegistration`, and `localFileWrites` remain
   false.

P25.31 is complete:

1. Shared plans include `packageBuildVerification` metadata for future filtered
   build, type-check, and test commands plus expected `dist` artifacts.
2. MCP and CLI expose this verification in dry-run and unavailable execution
   payloads without running package scripts, spawning processes, emitting build
   output, creating package files, mutating workspace manifests, or registering
   runtime dispatch.
3. `packageBuildVerification.commandExecution`, `buildOutput`,
   `packageScriptsRunnable`, `processSpawn`, `workspaceMutation`,
   `packageCreated`, `scriptRunnable`, `fileMaterialization`, `dispatch`,
   `networkDispatch`, `runtimeRegistration`, and `localFileWrites` remain
   false.

P25.32 is complete:

1. Shared plans include `packageMaterializationChecklist` metadata for
   package/workspace/output batches, readiness checks, commit boundary, and
   rollback plan.
2. MCP and CLI expose this checklist in dry-run and unavailable execution
   payloads without approving materialization, creating package files,
   mutating workspace manifests, mutating lockfiles, running commands,
   emitting build output, or registering runtime dispatch.
3. `packageMaterializationChecklist.materializationApproved`,
   `fileMaterialization`, `workspaceMutation`, `lockfileMutation`,
   `rootPackageJsonMutation`, `pnpmWorkspaceMutation`, `commandExecution`,
   `buildOutput`, `processSpawn`, `dispatch`, `networkDispatch`,
   `runtimeRegistration`, and `localFileWrites` remain false.

P25.33 is complete:

1. Shared plans include `packageCreationDryRunSummary` metadata for
   would-create, would-modify, would-generate, and would-run sections plus
   blocked-until reasons.
2. MCP and CLI expose this summary in dry-run and unavailable execution
   payloads without writing package files, mutating workspace manifests,
   mutating lockfiles, running commands, emitting build output, or registering
   runtime dispatch.
3. `packageCreationDryRunSummary.dryRunOnly` remains true, while
   `filesWritten`, `fileMaterialization`, `workspaceMutation`,
   `lockfileMutation`, `commandExecution`, `buildOutput`,
   `materializationApproved`, `dispatch`, `networkDispatch`,
   `runtimeRegistration`, and `localFileWrites` remain false.

P25.34 is complete:

1. Shared plans include `packageCreationFileManifest` metadata for the future
   package directory, package files, generated files, workspace files,
   readiness blockers, and no-op guarantees.
2. MCP and CLI expose this manifest in dry-run and unavailable execution
   payloads without creating package directories, writing files, mutating
   workspace manifests, mutating lockfiles, running commands, emitting build
   output, starting processes, or registering runtime dispatch.
3. `packageCreationFileManifest.dryRunOnly` remains true, while
   `filesWritten`, `fileMaterialization`, `workspaceMutation`,
   `lockfileMutation`, `commandExecution`, `buildOutput`,
   `materializationApproved`, `processSpawn`, `packageCreated`, `dispatch`,
   `networkDispatch`, `runtimeRegistration`, and `localFileWrites` remain
   false.

P25.35 is complete:

1. Shared plans include `packageMaterializationApprovalGate` metadata for
   explicit approval inputs, approval scope, blocked decision state,
   post-approval sequence, and no-op guarantees.
2. MCP and CLI expose this gate in dry-run and unavailable execution payloads
   without granting approval, creating package directories, writing files,
   mutating workspace manifests, mutating lockfiles, running commands, emitting
   build output, starting processes, or registering runtime dispatch.
3. `packageMaterializationApprovalGate.approvalRequired` remains true, while
   `approved`, `filesWritten`, `fileMaterialization`, `workspaceMutation`,
   `lockfileMutation`, `commandExecution`, `buildOutput`,
   `materializationApproved`, `processSpawn`, `packageCreated`, `dispatch`,
   `networkDispatch`, `runtimeRegistration`, and `localFileWrites` remain
   false.

P25.36 is complete:

1. Shared plans include `packageMaterializationExecutionDryRun` metadata for
   future directory creation, package file write, workspace mutation, and
   verification command steps plus blocked reasons and execution output flags.
2. MCP and CLI expose this dry-run in dry-run and unavailable execution
   payloads without granting approval, creating package directories, writing
   files, mutating workspace manifests, mutating lockfiles, running commands,
   emitting build output, starting processes, or registering runtime dispatch.
3. `packageMaterializationExecutionDryRun.executeNow` remains false, while
   `approved`, `filesWritten`, `fileMaterialization`, `workspaceMutation`,
   `lockfileMutation`, `commandExecution`, `buildOutput`,
   `materializationApproved`, `processSpawn`, `packageCreated`, `dispatch`,
   `networkDispatch`, `runtimeRegistration`, and `localFileWrites` remain
   false.

P25.37 is complete:

1. Shared plans include `packageMaterializationWriteContract` metadata for the
   future package directory, package files, workspace files, integrity checks,
   atomic writes, and rollback contract.
2. MCP and CLI expose this write contract in dry-run and unavailable execution
   payloads without granting approval, creating package directories, writing
   files, mutating workspace manifests, mutating lockfiles, running commands,
   emitting build output, starting processes, or registering runtime dispatch.
3. `packageMaterializationWriteContract.executeNow` remains false, while
   `approved`, `filesWritten`, `fileMaterialization`, `workspaceMutation`,
   `lockfileMutation`, `commandExecution`, `buildOutput`,
   `materializationApproved`, `processSpawn`, `packageCreated`, `dispatch`,
   `networkDispatch`, `runtimeRegistration`, and `localFileWrites` remain
   false.

P25.38 is complete:

1. Shared plans include `packageMaterializationRollbackContract` metadata for
   pre-write snapshots, rollback phases, failure recovery, and rollback
   verification.
2. MCP and CLI expose this rollback contract in dry-run and unavailable
   execution payloads without granting approval, executing rollback, creating
   or removing package directories, writing files, restoring workspace
   manifests, mutating lockfiles, running commands, emitting build output,
   starting processes, or registering runtime dispatch.
3. `packageMaterializationRollbackContract.executeNow` and `rollbackNow`
   remain false, while `approved`, `filesWritten`, `rollbackExecuted`,
   `fileMaterialization`, `workspaceMutation`, `lockfileMutation`,
   `commandExecution`, `buildOutput`, `materializationApproved`,
   `processSpawn`, `packageCreated`, `dispatch`, `networkDispatch`,
   `runtimeRegistration`, and `localFileWrites` remain false.

P25.39 is complete:

1. Shared plans include `packageMaterializationVerificationManifest` metadata
   for future package file checks, workspace file checks, generated output
   checks, verification commands, and runtime-disabled assertions.
2. MCP and CLI expose this verification manifest in dry-run and unavailable
   execution payloads without granting approval, creating package directories,
   writing files, mutating workspace manifests, mutating lockfiles, running
   commands, emitting build output, starting processes, or registering runtime
   dispatch.
3. `packageMaterializationVerificationManifest.executeNow` and `verifyNow`
   remain false, while `approved`, `filesWritten`, `verificationExecuted`,
   `fileMaterialization`, `workspaceMutation`, `lockfileMutation`,
   `commandExecution`, `buildOutput`, `materializationApproved`,
   `processSpawn`, `packageCreated`, `dispatch`, `networkDispatch`,
   `runtimeRegistration`, and `localFileWrites` remain false.

P25.40 is complete:

1. Shared plans include `packageMaterializationFinalApprovalChecklist`
   metadata for explicit approval items, approval scope, blocked decision
   state, and post-approval sequence.
2. MCP and CLI expose this final approval checklist in dry-run and unavailable
   execution payloads without granting approval, creating package directories,
   writing files, mutating workspace manifests, mutating lockfiles, running
   commands, emitting build output, starting processes, or registering runtime
   dispatch.
3. `packageMaterializationFinalApprovalChecklist.finalApprovalGranted`,
   `executeNow`, and `verifyNow` remain false, while `approved`,
   `filesWritten`, `verificationExecuted`, `fileMaterialization`,
   `workspaceMutation`, `lockfileMutation`, `commandExecution`, `buildOutput`,
   `materializationApproved`, `processSpawn`, `packageCreated`, `dispatch`,
   `networkDispatch`, `runtimeRegistration`, and `localFileWrites` remain
   false.

P25.41 is complete:

1. Shared plans include `packageMaterializationExplicitApprovalToken`
   metadata for the future opaque one-time approval token format, approval
   scope, validation requirements, audit fields, blocked decision state, and
   no-op guarantees.
2. MCP and CLI expose this token plan in dry-run and unavailable execution
   payloads without accepting, storing, validating, or consuming a token, and
   without granting approval, creating package directories, writing files,
   mutating workspace manifests, mutating lockfiles, running commands, emitting
   build output, starting processes, or registering runtime dispatch.
3. `tokenProvided`, `tokenAccepted`, `tokenStored`, `tokenValidated`,
   `approved`, `finalApprovalGranted`, `executeNow`, and `verifyNow` remain
   false, while `filesWritten`, `verificationExecuted`,
   `fileMaterialization`, `workspaceMutation`, `lockfileMutation`,
   `commandExecution`, `buildOutput`, `materializationApproved`,
   `processSpawn`, `packageCreated`, `dispatch`, `networkDispatch`,
   `runtimeRegistration`, and `localFileWrites` remain false.

P25.42 is complete:

1. Shared plans include `packageMaterializationApprovalAuditTrail` metadata for
   the future append-only approval audit record format, required audit events,
   retention plan, blocked decision state, and no-op guarantees.
2. MCP and CLI expose this audit trail plan in dry-run and unavailable
   execution payloads without writing, persisting, validating, or exporting
   audit records, and without accepting tokens, granting approval, creating
   package directories, writing files, mutating workspace manifests, mutating
   lockfiles, running commands, emitting build output, starting processes, or
   registering runtime dispatch.
3. `auditRecordWritten`, `auditRecordPersisted`, `auditRecordValidated`,
   `auditRecordExported`, `writeAuditNow`, `tokenAccepted`, `approved`,
   `finalApprovalGranted`, `executeNow`, and `verifyNow` remain false, while
   `filesWritten`, `verificationExecuted`, `fileMaterialization`,
   `workspaceMutation`, `lockfileMutation`, `commandExecution`, `buildOutput`,
   `materializationApproved`, `processSpawn`, `packageCreated`, `dispatch`,
   `networkDispatch`, `runtimeRegistration`, and `localFileWrites` remain
   false.

P25.43 is complete:

1. Shared plans include `packageMaterializationApprovalReplayGuard` metadata
   for future one-time token replay prevention, nonce and scope-hash checks,
   blocked replay decision, and no-op guarantees.
2. MCP and CLI expose this replay guard plan in dry-run and unavailable
   execution payloads without executing replay checks, storing nonce/scope hash
   state, consuming or revoking tokens, accepting tokens, granting approval,
   creating package directories, writing files, mutating workspace manifests,
   mutating lockfiles, running commands, emitting build output, starting
   processes, or registering runtime dispatch.
3. `replayCheckExecuted`, `replayDetected`, `replayRejected`, `nonceStored`,
   `scopeHashStored`, `tokenAccepted`, `tokenConsumed`, `tokenRevoked`,
   `approved`, `finalApprovalGranted`, `executeNow`, and `verifyNow` remain
   false, while `filesWritten`, `verificationExecuted`,
   `fileMaterialization`, `workspaceMutation`, `lockfileMutation`,
   `commandExecution`, `buildOutput`, `materializationApproved`,
   `processSpawn`, `packageCreated`, `dispatch`, `networkDispatch`,
   `runtimeRegistration`, and `localFileWrites` remain false.

P25.44 is complete:

1. Shared plans include `packageMaterializationApprovalExpiryPolicy` metadata
   for future short-lived approval token expiry rules, required
   `issuedAt`/`notBefore`/`expiresAt` claims, max-age and clock-skew checks,
   blocked expiry decision, and no-op guarantees.
2. MCP and CLI expose this expiry policy plan in dry-run and unavailable
   execution payloads without executing expiry checks, reading or trusting
   wall-clock time, validating or accepting tokens, consuming or revoking
   tokens, granting approval, creating package directories, writing files,
   mutating workspace manifests, mutating lockfiles, running commands,
   emitting build output, starting processes, or registering runtime dispatch.
3. `expiryCheckExecuted`, `tokenExpired`, `tokenNotBeforeChecked`,
   `tokenExpiresAtChecked`, `clockSkewChecked`, `tokenAccepted`,
   `tokenValidated`, `tokenConsumed`, `tokenRevoked`, `approved`,
   `finalApprovalGranted`, `executeNow`, and `verifyNow` remain false, while
   `filesWritten`, `verificationExecuted`, `fileMaterialization`,
   `workspaceMutation`, `lockfileMutation`, `commandExecution`, `buildOutput`,
   `materializationApproved`, `processSpawn`, `packageCreated`, `dispatch`,
   `networkDispatch`, `runtimeRegistration`, and `localFileWrites` remain
   false.

P25.45 is complete:

1. Shared plans include `packageMaterializationApprovalRevocationPolicy`
   metadata for future revoked-token denial rules, revocation registry sources,
   revocation epoch checks, audit linkage, blocked revocation decision, and
   no-op guarantees.
2. MCP and CLI expose this revocation policy plan in dry-run and unavailable
   execution payloads without executing revocation checks, fetching revocation
   registries, reading or trusting revocation state, validating or accepting
   tokens, consuming tokens, granting approval, creating package directories,
   writing files, mutating workspace manifests, mutating lockfiles, running
   commands, emitting build output, starting processes, or registering runtime
   dispatch.
3. `revocationCheckExecuted`, `revocationRegistryFetched`,
   `revocationStatusFetched`, `revocationStatusTrusted`,
   `tokenRevocationChecked`, `tokenRevoked`, `revokedTokenRejected`,
   `tokenAccepted`, `tokenValidated`, `tokenConsumed`, `approved`,
   `finalApprovalGranted`, `executeNow`, and `verifyNow` remain false, while
   `filesWritten`, `verificationExecuted`, `fileMaterialization`,
   `workspaceMutation`, `lockfileMutation`, `commandExecution`, `buildOutput`,
   `materializationApproved`, `processSpawn`, `packageCreated`, `dispatch`,
   `networkDispatch`, `runtimeRegistration`, and `localFileWrites` remain
   false.

P25.46 is complete:

1. Shared plans include `packageMaterializationApprovalScopeBindingPolicy`
   metadata for future canonical approval scope serialization, approval scope
   hash planning, target/command/workspace/package binding, token scope match,
   blocked scope-binding decision, and no-op guarantees.
2. MCP and CLI expose this scope binding policy plan in dry-run and unavailable
   execution payloads without computing approval scope hashes, reading file
   snapshots, hashing workspace/package files, validating or accepting tokens,
   consuming or revoking tokens, granting approval, creating package
   directories, writing files, mutating workspace manifests, mutating lockfiles,
   running commands, emitting build output, starting processes, or registering
   runtime dispatch.
3. `scopeBindingExecuted`, `approvalScopeHashComputed`,
   `approvalScopeHashValidated`, `approvalScopeHashStored`,
   `targetScopeBound`, `commandScopeBound`, `workspaceScopeBound`,
   `packageScopeBound`, `fileSnapshotRead`, `workspaceHashComputed`,
   `packageManifestHashComputed`, `tokenScopeMatched`, `tokenAccepted`,
   `tokenValidated`, `tokenConsumed`, `tokenRevoked`, `approved`,
   `finalApprovalGranted`, `executeNow`, and `verifyNow` remain false, while
   `filesWritten`, `verificationExecuted`, `fileMaterialization`,
   `workspaceMutation`, `lockfileMutation`, `commandExecution`, `buildOutput`,
   `materializationApproved`, `processSpawn`, `packageCreated`, `dispatch`,
   `networkDispatch`, `runtimeRegistration`, and `localFileWrites` remain
   false.

P25.47 is complete:

1. Shared plans include
   `packageMaterializationApprovalOperatorConfirmationPolicy` metadata for
   future explicit operator confirmation, required operator identity and intent
   inputs, visible approval scope, confirmation phrase, audit linkage, blocked
   confirmation decision, and no-op guarantees.
2. MCP and CLI expose this operator confirmation policy plan in dry-run and
   unavailable execution payloads without prompting operators, accepting
   confirmations, storing confirmation records, validating operator identity,
   issuing confirmation tokens, accepting or validating tokens, consuming or
   revoking tokens, granting approval, creating package directories, writing
   files, mutating workspace manifests, mutating lockfiles, running commands,
   emitting build output, starting processes, or registering runtime dispatch.
3. `operatorConfirmationPrompted`, `operatorConfirmationReceived`,
   `operatorConfirmationStored`, `operatorConfirmationValidated`,
   `operatorIdentityVerified`, `operatorIntentCaptured`,
   `confirmationAuditLinked`, `confirmationTokenIssued`, `tokenAccepted`,
   `tokenValidated`, `tokenConsumed`, `tokenRevoked`, `approved`,
   `finalApprovalGranted`, `executeNow`, and `verifyNow` remain false, while
   `filesWritten`, `verificationExecuted`, `fileMaterialization`,
   `workspaceMutation`, `lockfileMutation`, `commandExecution`, `buildOutput`,
   `materializationApproved`, `processSpawn`, `packageCreated`, `dispatch`,
   `networkDispatch`, `runtimeRegistration`, and `localFileWrites` remain
   false.

P25.48 is complete:

1. Shared plans include
   `packageMaterializationApprovalEmergencyStopPolicy` metadata for future
   trusted stop source, stop scope inputs, stop registry state, blocked
   emergency-stop decision, and no-op guarantees.
2. MCP and CLI expose this emergency stop policy plan in dry-run and
   unavailable execution payloads without configuring stop registries, fetching
   stop registries, reading or trusting stop state, accepting stop overrides,
   accepting or validating tokens, consuming or revoking tokens, granting
   approval, creating package directories, writing files, mutating workspace
   manifests, mutating lockfiles, running commands, emitting build output,
   starting processes, or registering runtime dispatch.
3. `emergencyStopConfigured`, `emergencyStopChecked`,
   `emergencyStopFetched`, `emergencyStopStateRead`,
   `emergencyStopStateTrusted`, `emergencyStopBypassAllowed`,
   `stopRegistryConfigured`, `stopRegistryFetched`, `stopStatusFetched`,
   `stopStatusTrusted`, `stopSignalReceived`, `stopOverrideAccepted`,
   `tokenAccepted`, `tokenValidated`, `tokenConsumed`, `tokenRevoked`,
   `approved`, `finalApprovalGranted`, `executeNow`, and `verifyNow` remain
   false, while `filesWritten`, `verificationExecuted`,
   `fileMaterialization`, `workspaceMutation`, `lockfileMutation`,
   `commandExecution`, `buildOutput`, `materializationApproved`,
   `processSpawn`, `packageCreated`, `dispatch`, `networkDispatch`,
   `runtimeRegistration`, and `localFileWrites` remain false.

P25.49 is complete:

1. Shared plans include
   `packageMaterializationApprovalReadinessVerdictPolicy` metadata for future
   final readiness inputs, blocker evaluation, trusted verdict, audit linkage,
   blocked readiness decision, and no-op guarantees.
2. MCP and CLI expose this readiness verdict policy plan in dry-run and
   unavailable execution payloads without computing readiness verdicts,
   validating inputs, evaluating blockers, trusting verdicts, accepting or
   validating tokens, consuming or revoking tokens, granting approval, creating
   package directories, writing files, mutating workspace manifests, mutating
   lockfiles, running commands, emitting build output, starting processes, or
   registering runtime dispatch.
3. `readinessVerdictComputed`, `readinessVerdictStored`,
   `readinessVerdictTrusted`, `readinessVerdictApproved`,
   `readinessInputsValidated`, `readinessBlockersEvaluated`,
   `emergencyStopCleared`, `operatorConfirmationSatisfied`,
   `finalChecklistSatisfied`, `materializationReady`, `tokenAccepted`,
   `tokenValidated`, `tokenConsumed`, `tokenRevoked`, `approved`,
   `finalApprovalGranted`, `executeNow`, and `verifyNow` remain false, while
   `filesWritten`, `verificationExecuted`, `fileMaterialization`,
   `workspaceMutation`, `lockfileMutation`, `commandExecution`, `buildOutput`,
   `materializationApproved`, `processSpawn`, `packageCreated`, `dispatch`,
   `networkDispatch`, `runtimeRegistration`, and `localFileWrites` remain
   false.

P25.50 is complete:

1. Shared plans include
   `packageMaterializationApprovalExecutionHandoffPolicy` metadata for future
   post-approval handoff targets, required handoff inputs, handoff checks,
   blocked execution-job decisions, and no-op guarantees.
2. MCP and CLI expose this execution handoff policy plan in dry-run and
   unavailable execution payloads without preparing handoffs, validating
   handoffs, storing handoff records, queuing handoffs, creating or dispatching
   execution jobs, selecting execution owners, accepting or validating tokens,
   consuming or revoking tokens, granting approval, creating package
   directories, writing files, mutating workspace manifests, mutating
   lockfiles, running commands, emitting build output, starting processes, or
   registering runtime dispatch.
3. `handoffPrepared`, `handoffQueued`, `handoffAccepted`, `handoffStored`,
   `handoffValidated`, `executionJobCreated`, `executionJobQueued`,
   `executionJobDispatched`, `executionOwnerSelected`,
   `executionOwnerNotified`, `materializationReady`,
   `materializationApproved`, `tokenAccepted`, `tokenValidated`,
   `tokenConsumed`, `tokenRevoked`, `approved`, `finalApprovalGranted`,
   `executeNow`, and `verifyNow` remain false, while `filesWritten`,
   `verificationExecuted`, `fileMaterialization`, `workspaceMutation`,
   `lockfileMutation`, `commandExecution`, `buildOutput`, `processSpawn`,
   `packageCreated`, `dispatch`, `networkDispatch`, `runtimeRegistration`,
   and `localFileWrites` remain false.

P25.51 is complete:

1. Shared plans include
   `packageMaterializationApprovalPostHandoffAuditPolicy` metadata for future
   audit sinks, required audit inputs, post-handoff audit checks, blocked audit
   decisions, and no-op guarantees.
2. MCP and CLI expose this post-handoff audit policy plan in dry-run and
   unavailable execution payloads without preparing audit records, validating
   audit records, storing audit records, publishing audit records, exporting
   audit records, writing audit records, capturing handoff or execution job
   snapshots, selecting audit sinks, accepting or validating tokens, consuming
   or revoking tokens, granting approval, creating package directories, writing
   files, mutating workspace manifests, mutating lockfiles, running commands,
   emitting build output, starting processes, or registering runtime dispatch.
3. `auditRecordPrepared`, `auditRecordValidated`, `auditRecordStored`,
   `auditRecordPublished`, `auditRecordExported`, `auditRecordWritten`,
   `auditTrailLinked`, `handoffSnapshotCaptured`,
   `executionJobSnapshotCaptured`, `auditSinkSelected`, `auditSinkNotified`,
   `materializationReady`, `materializationApproved`, `tokenAccepted`,
   `tokenValidated`, `tokenConsumed`, `tokenRevoked`, `approved`,
   `finalApprovalGranted`, `executeNow`, and `verifyNow` remain false, while
   `filesWritten`, `verificationExecuted`, `fileMaterialization`,
   `workspaceMutation`, `lockfileMutation`, `commandExecution`, `buildOutput`,
   `processSpawn`, `packageCreated`, `dispatch`, `networkDispatch`,
   `runtimeRegistration`, and `localFileWrites` remain false.

P25.52 is complete:

1. Shared plans include
   `packageMaterializationApprovalAuditRetentionPolicy` metadata for future
   retention policies, required retention inputs, retention checks, blocked
   retention decisions, and no-op guarantees.
2. MCP and CLI expose this audit retention policy plan in dry-run and
   unavailable execution payloads without selecting retention policies,
   computing retention windows, trusting clocks, storing retention records,
   updating indexes, preparing or storing archives, scheduling or executing
   purges, preparing or writing exports, writing audit records, granting
   approval, creating package directories, writing files, mutating workspace
   manifests, mutating lockfiles, running commands, emitting build output,
   starting processes, or registering runtime dispatch.
3. `retentionPolicySelected`, `retentionWindowComputed`,
   `retentionClockTrusted`, `retentionRecordStored`, `retentionIndexUpdated`,
   `archivePrepared`, `archiveStored`, `purgeScheduled`, `purgeExecuted`,
   `exportPrepared`, `exportWritten`, `auditRecordWritten`,
   `auditRecordStored`, `auditRecordExported`, `materializationApproved`,
   `approved`, and `finalApprovalGranted` remain false, while `filesWritten`,
   `fileMaterialization`, `workspaceMutation`, `lockfileMutation`,
   `commandExecution`, `buildOutput`, `processSpawn`, `packageCreated`,
   `dispatch`, `networkDispatch`, `runtimeRegistration`, and
   `localFileWrites` remain false.

P25.53 is complete:

1. Shared plans include `packageMaterializationApprovalAuditAccessPolicy`
   metadata for future audit access policies, required access inputs, access
   checks, blocked access decisions, and no-op guarantees.
2. MCP and CLI expose this audit access policy plan in dry-run and unavailable
   execution payloads without selecting access policies, identifying subjects,
   computing or validating scopes, computing or storing access decisions,
   granting or denying access, reading or querying audit records, exporting,
   downloading, redacting, signing, or sharing audit records, issuing access
   tokens, granting approval, creating package directories, writing files,
   mutating workspace manifests, mutating lockfiles, running commands, emitting
   build output, starting processes, or registering runtime dispatch.
3. `accessPolicySelected`, `accessSubjectIdentified`,
   `accessScopeComputed`, `accessScopeValidated`, `accessDecisionComputed`,
   `accessDecisionStored`, `accessGranted`, `accessDenied`,
   `auditRecordRead`, `auditRecordQueried`, `auditRecordExported`,
   `auditRecordDownloaded`, `auditRecordRedacted`, `auditRecordSigned`,
   `auditRecordShared`, `accessTokenIssued`, `accessTokenAccepted`,
   `accessTokenValidated`, `accessTokenConsumed`, `materializationApproved`,
   `approved`, and `finalApprovalGranted` remain false, while `filesWritten`,
   `fileMaterialization`, `workspaceMutation`, `lockfileMutation`,
   `commandExecution`, `buildOutput`, `processSpawn`, `packageCreated`,
   `dispatch`, `networkDispatch`, `runtimeRegistration`, and
   `localFileWrites` remain false.

P25.54 is complete:

1. Shared plans include `packageMaterializationApprovalAuditIntegrityPolicy`
   metadata for future audit integrity policies, required integrity inputs,
   integrity checks, blocked integrity decisions, and no-op guarantees.
2. MCP and CLI expose this audit integrity policy plan in dry-run and
   unavailable execution payloads without selecting integrity policies,
   identifying subjects, computing scopes, computing/storing/verifying hashes,
   creating or verifying signatures, linking or verifying integrity chains,
   reading, hashing, verifying, signing, sealing, or tamper-checking audit
   records, storing integrity records, granting approval, creating package
   directories, writing files, mutating workspace manifests, mutating lockfiles,
   running commands, emitting build output, starting processes, or registering
   runtime dispatch.
3. `integrityPolicySelected`, `integritySubjectIdentified`,
   `integrityScopeComputed`, `integrityHashComputed`, `integrityHashStored`,
   `integrityHashVerified`, `integritySignatureCreated`,
   `integritySignatureVerified`, `integrityChainLinked`,
   `integrityChainVerified`, `auditRecordRead`, `auditRecordHashed`,
   `auditRecordVerified`, `auditRecordSigned`, `auditRecordSealed`,
   `auditRecordTamperChecked`, `auditRecordIntegrityStored`,
   `materializationApproved`, `approved`, and `finalApprovalGranted` remain
   false, while `filesWritten`, `fileMaterialization`, `workspaceMutation`,
   `lockfileMutation`, `commandExecution`, `buildOutput`, `processSpawn`,
   `packageCreated`, `dispatch`, `networkDispatch`, `runtimeRegistration`, and
   `localFileWrites` remain false.

P25.55 is complete:

1. Shared plans include `packageMaterializationApprovalAuditProvenancePolicy`
   metadata for future audit provenance policies, required provenance inputs,
   provenance checks, blocked provenance decisions, and no-op guarantees.
2. MCP and CLI expose this audit provenance policy plan in dry-run and
   unavailable execution payloads without selecting provenance policies,
   identifying subjects, collecting or validating sources, computing or storing
   graphs, linking or verifying chains, creating/storing/publishing provenance
   records, reading or querying audit records, linking/verifying/signing/hashing
   provenance, granting approval, creating package directories, writing files,
   mutating workspace manifests, mutating lockfiles, running commands, emitting
   build output, starting processes, or registering runtime dispatch.
3. `provenancePolicySelected`, `provenanceSubjectIdentified`,
   `provenanceSourceCollected`, `provenanceSourceValidated`,
   `provenanceGraphComputed`, `provenanceGraphStored`,
   `provenanceChainLinked`, `provenanceChainVerified`,
   `provenanceRecordCreated`, `provenanceRecordStored`,
   `provenanceRecordPublished`, `auditRecordRead`, `auditRecordQueried`,
   `auditRecordProvenanceLinked`, `auditRecordProvenanceVerified`,
   `provenanceSignatureCreated`, `provenanceSignatureVerified`,
   `provenanceHashComputed`, `provenanceHashStored`,
   `materializationApproved`, `approved`, and `finalApprovalGranted` remain
   false, while `filesWritten`, `fileMaterialization`, `workspaceMutation`,
   `lockfileMutation`, `commandExecution`, `buildOutput`, `processSpawn`,
   `packageCreated`, `dispatch`, `networkDispatch`, `runtimeRegistration`, and
   `localFileWrites` remain false.

P25.56 is complete:

1. Shared plans include `packageMaterializationApprovalAuditCustodyPolicy`
   metadata for future audit custody policies, required custody inputs, custody
   checks, blocked custody decisions, and no-op guarantees.
2. MCP and CLI expose this audit custody policy plan in dry-run and unavailable
   execution payloads without selecting custody policies, identifying subjects
   or holders, preparing or executing custody transfers, taking/releasing/
   transferring custody, linking or verifying custody chains, creating/storing/
   publishing custody records, reading or querying audit records,
   linking/verifying/signing/hashing custody, granting approval, creating
   package directories, writing files, mutating workspace manifests, mutating
   lockfiles, running commands, emitting build output, starting processes, or
   registering runtime dispatch.
3. `custodyPolicySelected`, `custodySubjectIdentified`,
   `custodyHolderIdentified`, `custodyTransferPrepared`,
   `custodyTransferExecuted`, `custodyTransferred`, `custodyTaken`,
   `custodyReleased`, `custodyChainLinked`, `custodyChainVerified`,
   `custodyRecordCreated`, `custodyRecordStored`, `custodyRecordPublished`,
   `auditRecordRead`, `auditRecordQueried`, `auditRecordCustodyLinked`,
   `auditRecordCustodyVerified`, `custodySignatureCreated`,
   `custodySignatureVerified`, `custodyHashComputed`, `custodyHashStored`,
   `materializationApproved`, `approved`, and `finalApprovalGranted` remain
   false, while `filesWritten`, `fileMaterialization`, `workspaceMutation`,
   `lockfileMutation`, `commandExecution`, `buildOutput`, `processSpawn`,
   `packageCreated`, `dispatch`, `networkDispatch`, `runtimeRegistration`, and
   `localFileWrites` remain false.

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
