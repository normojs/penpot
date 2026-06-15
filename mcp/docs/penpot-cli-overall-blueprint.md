# penpot-cli Overall Blueprint

Status: current planning baseline
Target fork: Penpot `2.15.4` reworked as `penpot-cli`
Updated: 2026-06-15

This document is the compact architecture and delivery plan for the fork. The
larger historical notes remain in `first-class-mcp-architecture.md`,
`headless-command-runtime.md`, `manual-mcp-configuration-audit.md`, and
`command-runtime-inventory.md`.

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
- Done: focused command-runtime tests cover descriptor groups, lookup,
  adapter-selection priority/error cases, and token-safe envelopes.
- Next: move into Wave C headless authoring expansion.

### Wave C: Headless Authoring Expansion

Purpose: reduce dependency on a live browser tab for normal prototype creation.

Tasks:

- Done: add backend/common, MCP, and CLI support for page rename through the
  backend-command adapter.
- Done: expand backend-command `shape.update` style and hierarchy fields with
  fill/stroke stacks, independent corner radii, and parent frame movement.
- Done: add backend-safe frame layout updates for `shape.update`, covering
  `layout none` and flex direction, wrap, alignment, gap, and padding.
- Keep set-current as a live workspace operation unless a future backend
  metadata use case becomes meaningful.
- Keep grid/full layout metadata in plugin-live until backend-command owns
  tracks, cells, and related layout structures.
- Add image/media upload path for headless shape creation.
- Add backend-supported prototype flow and interaction helpers.
- Expand exporter-backed preview/render commands for explicit targets.

Acceptance:

- A script or MCP client can create a simple multi-screen prototype and export
  a preview without a live workspace tab for supported shape types.

### Wave D: File Opening, Binding, And User Handoff

Purpose: close the loop between headless automation and the visual editor.

Tasks:

- Add reliable `file.open` handoff from CLI/MCP to browser URL.
- Add explicit bind/open actions that guide the user when a live context is
  required.
- Show file context state in dashboard/settings, not only workspace menu.
- Preserve a single write-capable owner tab while allowing clear release.

Acceptance:

- An agent can create or find a file, ask Penpot to open it, and guide the user
  to bind the file context when plugin-live tools are needed.

### Wave E: Packaging And Distribution

Purpose: make the fork usable outside a developer checkout.

Tasks:

- Define how `penpot-cli` is built, versioned, and installed.
- Package MCP plugin assets reliably with frontend builds.
- Document Docker/self-hosted MCP gateway setup.
- Add release notes and migration guidance for existing MCP users.
- Decide whether CLI remains private during fork development or gets a
  publishable package boundary.

Acceptance:

- A local developer and a self-hosted operator can follow one documented path
  to enable MCP and use `penpot-cli`.

### Wave F: Verification And Release Readiness

Purpose: make the new architecture safe to change.

Tasks:

- Add end-to-end smoke flows for MCP config, global connection, file binding,
  CLI headless creation, and export.
- Add CI-friendly TypeScript, Clojure, ClojureScript, and smoke commands.
- Track locally blocked Clojure tooling separately from product failures.
- Add compatibility checks for old MCP clients and existing profile props.

Acceptance:

- The critical MCP/CLI flows have repeatable checks and documented manual
  fallback steps when full local tooling is unavailable.

## Near-Term Priority

The next implementation slice should continue Wave C:

1. Add headless image/media insertion for generated rectangles using existing
   media upload/storage paths.
2. Keep page current/selection semantics in plugin-live until a backend-safe
   representation is defined.
3. Add focused tests for media validation, permission, adapter selection, and
   export-preview behavior.

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
