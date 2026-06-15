# penpot-cli MCP Development TODO

This file is the execution tracker for the `penpot-cli` fork based on Penpot
`2.15.4`.

## Tracking Rules

- Update this file every time a task starts, completes, or becomes blocked.
- Keep exactly one task marked as `in_progress` unless tasks are truly
  independent.
- When a task is completed, add the completion date and a short result note.
- If implementation changes the architecture, update
  `mcp/docs/first-class-mcp-architecture.md` in the same change.
- If behavior, docs, or user-visible project structure changes, update
  `CHANGES.md`.
- Use `AI_CODE_RULES.md` as the AI coding rules for this fork.

## Status Legend

- `todo`: not started
- `in_progress`: actively being worked on
- `done`: completed and verified for its scope
- `blocked`: cannot proceed without a decision or external dependency

## Current Focus

Phase 1 gateway/configuration cleanup, Phase 2 global background lifecycle,
Phase 3 typed global MCP tools, and Phase 4 context inspect/bind/release plus
required-context errors are complete. P4.5 workspace bind/unbind controls and
P4.6 lifecycle coverage, P5.1 typed page tools, and P5.2 typed basic shape
creation tools are complete. P5.3 typed shape update/delete tools are
complete. P5.4 typed prototype flow/interaction tools are complete. The
P5.5 typed export/render tools and P5.6 `execute_code` setting gate are
complete. P6.1 selected `penpot-cli/` as a top-level package, P6.2
scaffolded the CLI package, P6.3 added MCP status/config/log commands, P6.4
added `dev up --mcp` orchestration, and P6.5 added initial file/export CLI
commands. P6.6 added local CLI documentation, P7.1 designed the shared
headless command runtime interface, P7.2 moved page list/create onto the
backend-command path for MCP and CLI while keeping plugin-live fallback for
bound workspace usage, P7.3 added backend/common headless frame, rectangle,
and text creation, P7.4 added exporter-backed dry-run plan metadata for
explicit file/page/object exports, P7.5 added a shared adapter-selection
helper with CLI/MCP adapter reporting, P7.6 wired backend-command shape
creation into MCP and `penpot-cli`, and P7.7 added backend/common support for
simple headless shape updates and deletes. P7.8 wired shape update/delete entry
adapters into MCP and `penpot-cli`, and P7.9 added real exporter-backed CLI
output execution. P8.1 added backend audit context for first-class MCP writes,
and P8.2 added rate and concurrency limits for MCP/backend-command writes. P8.3
added version and capability negotiation between MCP server, plugin, and
frontend. P8.4 added diagnostics UI and logging status for MCP connection,
compatibility, file context, last error, and server log paths. P8.5 added
configurable destructive action confirmations for `shape.delete`, and P8.6
added CLI smoke regression tests plus MCP/CLI smoke-flow documentation. P9.1
audited the manual MCP configuration settings and persistence path, and P9.2
defined the persisted MCP config model plus frontend effective URL derivation.
P9.3 added Integrations settings controls for saving, previewing, and resetting
manual MCP connection configuration, and P9.4 wired the global lifecycle to the
saved auto-connect preference while preserving manual connect/disconnect.
P9.5 aligned `penpot-cli mcp config` terminology and JSON output with the
persisted MCP config model while preserving environment-derived URL
compatibility. P9.6 added config and lifecycle regression coverage, P9.7
polished migration and fallback behavior for legacy, invalid, partial, and
token-bearing profile configs, and P9.8 closed Wave A manual configuration
docs. P10.1 refreshed the overall architecture baseline in
`mcp/docs/penpot-cli-overall-blueprint.md`, P10.2 audited the MCP/CLI command
inventory for the first descriptor migration slice, and P10.3 added low-risk
shared descriptors for status/config/file/page metadata. P10.4 added shared
request/result envelopes for low-risk MCP and CLI paths while preserving public
output shapes. P10.5 centralized common command error codes, adapter selection
errors, and adapter reason text. P10.6 moved shape/export/render descriptors
into the shared command runtime. The current implementation focus is B6/P10.7:
hardening command runtime descriptor and adapter-selection tests.

## Feature Roadmap

This roadmap groups the work by user-visible capability. The phase tables below
remain the execution plan.

| ID | Status | Capability | Target phases | User outcome | First acceptance check |
| --- | --- | --- | --- | --- | --- |
| F1 | done | Built-in MCP gateway | Phase 1 | Users see one MCP URL instead of several internal ports | Settings and generated client config point to `/mcp/stream` |
| F2 | done | Manual MCP configuration | Phase 1, Phase 2, Phase 9 | Users can choose built-in, custom, or local MCP settings | Completed 2026-06-15; settings persist built-in/custom/local mode, stream/SSE/WebSocket/status URLs, reset-to-built-in, auto-connect, fallback, and token separation |
| F3 | in_progress | Global background MCP agent | Phase 2 | MCP can connect after login without opening a file | Global lifecycle and manual connect are implemented; remaining work is a normalized connected-global status/smoke flow in Phase 14 |
| F4 | done | MCP status and diagnostics | Phase 2, Phase 8 | Users and agents can inspect connection health | Completed 2026-06-13; `mcp.get_status` and Integrations settings now report server, plugin compatibility, session/file context, write limits, logs, and last-error state |
| F5 | done | Global resource tools | Phase 3 | Agents can list teams, projects, and files before a workspace opens | Completed 2026-06-11; MCP can list teams, projects, project files, and recent files through backend permissions |
| F6 | in_progress | File creation and opening | Phase 3, Phase 4 | Agents can create a file and ask Penpot to open or bind it | `file.create` returns a file summary; open/bind remains Phase 4 |
| F7 | done | File context broker | Phase 4 | Users and agents know which file MCP is editing | Completed 2026-06-11; context reporting, inspect, bind, release, required-context errors, workspace bind/unbind UI, and lifecycle tests are implemented |
| F8 | done | Typed page and shape creation | Phase 5 | Agents can draw basic screens without arbitrary JS | Completed 2026-06-11; typed page tools and frame/rect/text/image creation tools are implemented |
| F9 | done | Prototype authoring tools | Phase 5 | Agents can create flows and interactions | Completed 2026-06-11; MCP can create flows and navigate-to interactions through typed tools |
| F10 | done | Export and preview tools | Phase 5, Phase 7 | Agents and CLI can export useful visual output | Completed 2026-06-12; MCP can export shape/page data and render PNG previews through typed tools |
| F11 | done | Advanced execution controls | Phase 5, Phase 8 | Admins/users can control whether `execute_code` is available | Completed 2026-06-12; `execute_code` is disabled unless `PENPOT_MCP_ENABLE_EXECUTE_CODE=true` |
| F12 | done | `penpot-cli` MCP operations | Phase 6 | Developers can inspect and operate MCP from terminal | Completed 2026-06-12; `penpot-cli mcp status`, `mcp config`, and `mcp logs` are available |
| F13 | done | `penpot-cli` file/page/export operations | Phase 6, Phase 7 | Scripts can create files, create pages, export pages, and edit simple shapes through the same automation layer | Completed 2026-06-13; `file list/create/open`, `page list/create`, `shape create/update/delete`, and real `export page` execution report adapter-selection metadata |
| F14 | done | Headless automation runtime | Phase 7 | Selected operations work without an open browser tab | Completed 2026-06-13; page list/create, simple shape create/update/delete, adapter selection, and exporter-backed CLI output execute without a live workspace tab |
| F15 | done | Audit, limits, and confirmations | Phase 8 | MCP is safer for real deployments | Completed 2026-06-13; write operations are auditable and limited, plugin compatibility is negotiated, diagnostics are exposed, and `shape.delete` can require explicit confirmation |
| F16 | done | MCP/CLI smoke coverage | Phase 8 | Developers can catch first-class MCP regressions quickly | Completed 2026-06-13; MCP server tests, CLI no-service smoke tests, and documented running-stack smoke flows cover the critical regression paths |
| F17 | in_progress | Shared command descriptors | Phase 10 | MCP and CLI expose the same command catalog and internal result envelope from one runtime layer | Completed descriptors, envelopes, and centralized adapter errors for status/config/file/page plus shape/export/render commands; remaining work hardens descriptor snapshots |
| F18 | todo | Expanded headless authoring | Phase 11 | Scripts and agents can create richer prototypes without a live workspace | Multi-screen prototype creation works headlessly for supported shapes and interactions |
| F19 | todo | File open and bind handoff | Phase 12 | Agents can move cleanly between headless edits and visual workspace binding | CLI/MCP can open a file URL and guide binding when live context is required |
| F20 | todo | Packaging and distribution | Phase 13 | Developers and self-hosted operators have one documented install/setup path | `penpot-cli` build/install and MCP gateway setup are documented and repeatable |
| F21 | todo | Release verification matrix | Phase 14 | Critical MCP/CLI flows have repeatable checks | Config, global connect, bind, headless edit, and export smoke flows run or have documented manual fallback |

## Detailed Upcoming Task Queue

Use this queue when continuing development. Complete the first unchecked item
before moving to the next, update this section and the phase tables after each
task, and commit each completed step with `git commit -s`.

### Wave A: Finish Manual MCP Configuration (Complete)

Wave A is complete as of 2026-06-15. Remaining configuration limitations are
tracked after Wave A: CLI config still derives from environment/runtime inputs
instead of reading persisted profile props, and frontend/CLI URL derivation is
aligned by terminology but not yet shared as one implementation.

| Order | Task | Modules | Output | Verification |
| --- | --- | --- | --- | --- |
| A1 | Complete P9.5 CLI config terminology alignment | `penpot-cli`, `mcp/docs`, `todo.md` | `penpot-cli mcp config` and docs describe built-in/custom/local modes using the same field names as `profile.props.mcp-config` while preserving env var compatibility | CLI config text/JSON smoke output matches documented fields |
| A2 | Complete P9.6 config and lifecycle regression coverage | `frontend`, `mcp/packages/plugin`, `penpot-cli` | Tests cover default built-in config, custom/local URL derivation, reset, save-triggered reconfigure, auto-connect false, and manual connect fallback | Frontend tests are added even if local `clojure` remains unavailable; MCP/CLI TypeScript tests pass |
| A3 | Complete P9.7 migration and fallback polish | `frontend`, `backend`, `mcp/docs` | Invalid/partial `:mcp-config` values fall back safely, existing users with only `:mcp-enabled` keep built-in defaults, and token values remain out of profile props | Focused tests cover missing mode, unknown mode, blank URLs, nil reset, and legacy profile props |
| A4 | Close Wave A docs | `todo.md`, `CHANGES.md`, `mcp/docs` | Manual MCP configuration is marked complete, current limitations are explicit, and next focus moves to command runtime consolidation | `rg` shows no stale "not yet applied" auto-connect/config notes |

### Wave B: Consolidate MCP And CLI Command Runtime

B1/P10.2 completed on 2026-06-15 in
`mcp/docs/command-runtime-inventory.md`. B2/P10.3 added the first descriptor
catalog in `command-runtime`, and B3/P10.4 added shared request/result
envelopes. B4/P10.5 centralized adapter errors and selection reasons, and
B5/P10.6 completed the shape/export descriptor migration. Continue with
B6/P10.7.

| Order | Task | Modules | Output | Verification |
| --- | --- | --- | --- | --- |
| B1 | Audit existing MCP tools and CLI commands | `mcp/packages/server`, `penpot-cli`, `mcp/docs` | Inventory maps each command/tool to name, input schema, adapter, response shape, and test coverage | Audit document identifies duplicate metadata and first migration slice |
| B2 | Move status/config/file/page descriptors into command runtime | `mcp/packages/command-runtime`, `mcp/packages/server`, `penpot-cli` | Shared descriptors define names, input metadata, adapter hints, and transport labels for low-risk commands | MCP and CLI keep existing public names; descriptor tests pass |
| B3 | Add shared request/result envelopes | `command-runtime`, `mcp`, `penpot-cli` | Completed 2026-06-15; MCP tools and CLI commands use the same internal envelope for adapter, target, auth, and diagnostics metadata | Existing CLI JSON output and MCP tool responses remain backward compatible |
| B4 | Centralize adapter errors and selection reasons | `command-runtime`, `mcp`, `penpot-cli` | Completed 2026-06-15; backend unavailable, auth missing, file context required, unsupported adapter, and destructive confirmation errors use shared codes | MCP server tests and CLI no-service smoke tests pass |
| B5 | Move shape/export descriptors after envelope migration | `command-runtime`, `mcp`, `penpot-cli`, `exporter` | Completed 2026-06-15; higher-risk write/export commands use shared descriptors without changing behavior | Shape/create/update/delete and export dry-run tests pass |
| B6 | Add command runtime descriptor tests | `command-runtime`, `mcp`, `penpot-cli` | Descriptor snapshots and adapter-selection tests protect the migrated command catalog | Include CLI and MCP no-service smoke coverage |

### Wave C: Expand Headless Authoring

| Order | Task | Modules | Output | Verification |
| --- | --- | --- | --- | --- |
| C1 | Add headless page rename metadata path | `backend`, `common`, `mcp`, `penpot-cli` | Page rename works through backend-command for explicit file/page targets | Backend/common tests plus MCP/CLI command tests cover success and permission errors |
| C2 | Expand headless shape styling and hierarchy | `backend`, `common`, `mcp`, `penpot-cli` | Frame/rect/text updates cover richer fills, strokes, radius, parent/frame placement, and selected layout metadata | Common helper tests and MCP/CLI adapter tests pass |
| C3 | Add headless image/media insertion path | `backend`, `common`, `mcp`, `penpot-cli` | Image-backed rectangles can be created without a live plugin context using existing media upload/storage paths | Tests cover media validation, permission errors, and exported preview metadata |
| C4 | Add backend-supported prototype helpers | `backend`, `common`, `mcp`, `penpot-cli` | Basic flows and navigate interactions work headlessly where Penpot data structures allow it | Multi-screen prototype smoke flow creates pages, shapes, and interactions |
| C5 | Expand exporter-backed preview commands | `exporter`, `mcp`, `penpot-cli` | Explicit file/page/object previews return consistent artifact metadata in MCP and CLI | CLI output write path and MCP base64/resource metadata are covered |

### Wave D: Improve File Open, Bind, And User Handoff

| Order | Task | Modules | Output | Verification |
| --- | --- | --- | --- | --- |
| D1 | Define handoff UX and command contract | `mcp/docs`, `frontend`, `penpot-cli` | User-facing flow covers create/find file, open URL, bind context, live-only tool guidance, and release | Design doc links dashboard/settings/workspace/CLI/MCP states |
| D2 | Add reliable CLI/MCP file open handoff | `penpot-cli`, `mcp`, `frontend` | CLI/MCP can return or open a browser URL for target file/page and guide users to bind if needed | URL generation tests cover team/project/file/page variants |
| D3 | Show file context outside workspace | `frontend` | Dashboard/settings show current available/bound/stale context enough for agents and users to orient | Frontend state tests cover unbound, available, bound, stale, and expired token states |
| D4 | Add live-only bind guidance | `mcp`, `penpot-cli`, `frontend` | Live-only tool errors include precise open/bind/retry actions | Structured `file_context_required` responses include actionable next steps |

### Wave E: Package And Distribute

| Order | Task | Modules | Output | Verification |
| --- | --- | --- | --- | --- |
| E1 | Define CLI build/install strategy | `penpot-cli`, root docs | Decision covers private fork usage, package naming, binary name, versioning, and install commands | Fresh checkout can build and run `penpot-cli --help` |
| E2 | Package MCP plugin assets with frontend builds | `frontend`, `mcp/packages/plugin`, `docker` | Frontend build includes matching MCP plugin assets and version metadata | Plugin build, frontend asset path check, and Docker gateway docs pass |
| E3 | Document self-hosted MCP gateway setup | `docker`, `mcp/docs`, `penpot-cli` | Operators can enable built-in/custom/local MCP with one documented path | Docs cover env vars, ports, reverse proxy paths, tokens, and diagnostics |
| E4 | Add migration notes for existing MCP users | docs, `CHANGES.md` | Existing token/profile/env behavior and new settings are explained | Release notes cover users with only `:mcp-enabled` and no `:mcp-config` |

### Wave F: Release Verification

| Order | Task | Modules | Output | Verification |
| --- | --- | --- | --- | --- |
| F1 | Add config/global connection smoke flow | `frontend`, `mcp`, `penpot-cli` | Repeatable flow covers enable, mode change, auto-connect off/on, manual connect, status, and disable | Automated where possible, manual fallback documented for missing Clojure tooling |
| F2 | Add headless edit/export smoke flow | `backend`, `mcp`, `penpot-cli`, `exporter` | One flow creates file/page/shapes and exports a useful artifact without live workspace context | CLI/MCP commands return expected adapter diagnostics and artifact output |
| F3 | Add live bind smoke flow | `frontend`, `mcp` | Flow opens file, binds context, runs plugin-live command, releases context, and checks multi-tab behavior | Smoke docs preserve single write-capable owner tab rules |
| F4 | Normalize CI-friendly check commands | root, `frontend`, `backend`, `mcp`, `penpot-cli` | Exact commands for TS, CLJ, CLJS, backend, frontend, MCP, CLI, and smoke flows are documented | Local missing-tool failures are separated from product failures |

## Phase 0: Baseline, Planning, And Rules

Goal: make the development direction explicit before changing runtime behavior.

| ID | Status | Task | Modules | Verification | Notes |
| --- | --- | --- | --- | --- | --- |
| P0.1 | done | Create first-class MCP architecture plan | `mcp/docs` | Document exists and covers architecture, phases, tools, security | Completed 2026-06-11 in `mcp/docs/first-class-mcp-architecture.md` |
| P0.2 | done | Create implementation task tracker | root docs | `todo.md` exists and defines update protocol | Completed 2026-06-11 in this file |
| P0.3 | done | Add AI coding rules for the fork | root docs | `AI_CODE_RULES.md` exists and is referenced by docs | Completed 2026-06-11 in `AI_CODE_RULES.md` |
| P0.4 | done | Link tracker and rules from architecture doc | `mcp/docs` | Architecture doc references `todo.md` and `AI_CODE_RULES.md` | Completed 2026-06-11 |
| P0.5 | done | Review baseline docs for consistency | root docs, `mcp/docs` | No trailing whitespace; statuses are accurate | Completed 2026-06-11; docs are visible to git and whitespace check passed |
| P0.6 | done | Plan user-facing feature roadmap | root docs | `todo.md` maps capabilities to phases and acceptance checks | Completed 2026-06-11 in Feature Roadmap |

## Phase 1: MCP Gateway And Configuration Cleanup

Goal: expose one stable MCP surface and hide internal ports from normal users.

| ID | Status | Task | Modules | Verification | Notes |
| --- | --- | --- | --- | --- | --- |
| P1.1 | done | Audit dev/prod MCP routing | `docker`, `frontend`, `mcp` | Map `/mcp/stream`, `/mcp/sse`, `/mcp/ws`, plugin assets, and local ports | Completed 2026-06-11; added routing audit and divergence list to `mcp/docs/first-class-mcp-architecture.md` |
| P1.2 | done | Normalize MCP URL sources | `frontend`, `docker`, `mcp` | Settings, plugin, and generated client config use the same source of truth | Completed 2026-06-11; frontend, Docker config injection, plugin build, and MCP README now share public MCP URL terminology; cljs tests blocked locally because `clojure` is missing |
| P1.3 | done | Add MCP status endpoint or command surface | `mcp`, future `penpot-cli` | A local developer can inspect server, ws, plugin, and auth status | Completed 2026-06-11; added MCP server `/status` and gateway `/mcp/status` with token-safe server/session/plugin counts; TS build blocked locally because MCP dependencies are not installed |
| P1.4 | done | Add local orchestration design for `penpot-cli dev up --mcp` | future `penpot-cli`, docs | Command design covers backend, frontend, exporter, mcp server, plugin assets | Completed 2026-06-11; architecture doc defines CLI modes, public URLs, internal processes, readiness checks, and follow-up commands |
| P1.5 | done | Update docs after gateway decisions | `mcp/docs`, `todo.md` | Architecture doc and TODO reflect chosen URLs and commands | Completed 2026-06-11; Phase 1 decisions and next sprint focus are documented |

## Phase 2: Global Background System Plugin

Goal: start MCP after login without requiring the user to open a design file
first.

| ID | Status | Task | Modules | Verification | Notes |
| --- | --- | --- | --- | --- | --- |
| P2.1 | done | Read frontend and plugin lifecycle code deeply | `frontend`, `mcp/packages/plugin` | Notes identify current workspace-only lifecycle and startup hooks | Completed 2026-06-11; architecture doc captures current workspace startup, plugin auto-connect, reconnect watcher, menu controls, and multi-tab broadcast behavior |
| P2.2 | done | Design global MCP state namespace | `frontend` | Proposed state keys cover enabled, configured, connecting, connected-global, connected-file, error | Completed 2026-06-11; architecture doc defines proposed namespaces, state shape, statuses, events, and migration compatibility aliases |
| P2.3 | done | Move MCP lifecycle ownership to global app flow | `frontend` | Login/settings can start/stop MCP without entering workspace | Completed 2026-06-11; authenticated app initialization now starts global MCP and workspace no longer owns MCP startup/shutdown |
| P2.4 | done | Start bundled MCP plugin as background system plugin | `frontend`, `mcp/packages/plugin` | Plugin connects in background and remains invisible unless status UI is opened | Completed 2026-06-11; global MCP startup reuses hidden bundled plugin with injected token and WebSocket URL |
| P2.5 | done | Preserve multi-tab ownership behavior | `frontend` | Only one active tab can own write-capable MCP work | Completed 2026-06-11; existing ping/pong/force-disconnect ownership flow moved to global MCP namespace |
| P2.6 | done | Add frontend tests for global lifecycle | `frontend` | Focused tests cover enable, disable, reconnect, and tab ownership | Completed 2026-06-11; added focused `frontend-tests.data.mcp-test`; execution blocked locally because `clojure` and frontend `node_modules` are missing |

## Phase 3: Global MCP Tools

Goal: make MCP useful before a file context is active.

| ID | Status | Task | Modules | Verification | Notes |
| --- | --- | --- | --- | --- | --- |
| P3.1 | done | Define shared tool naming and schemas | `mcp/packages/server` | Tool names match architecture doc and inputs are typed | Completed 2026-06-11; added `ToolNames.ts`, documented dotted first-class naming, schema/response rules, and legacy compatibility |
| P3.2 | done | Add `mcp.get_status` tool | `mcp/packages/server`, `frontend` | MCP client can see server, plugin, user, and file-context status | Completed 2026-06-11; added `McpStatusTool` with server, transport, plugin, session, and placeholder file-context status; MCP server TS check passed after installing/building MCP deps during P3.3 |
| P3.3 | done | Add account/team/project/file read tools | `mcp/packages/server`, `backend` or `frontend` | MCP can list teams, projects, and files without a workspace | Completed 2026-06-11; added backend RPC client and `account.get_current_user`, `team.list`, `project.list`, `file.list`, `file.get_recent`; uses existing backend permissions; `mcp-server types:check` and `mcp fmt:check` passed |
| P3.4 | done | Add `file.create` global tool | `mcp/packages/server`, `backend` | MCP can create a file in a selected project/team | Completed 2026-06-11; added `FileCreateTool` using existing `create-file` RPC, `projectId` target validation, and backend project edit permissions; `mcp-server types:check` and `mcp fmt:check` passed |
| P3.5 | done | Add structured global-tool errors | `mcp/packages/server` | Missing auth, missing config, and missing permissions are machine-readable | Completed 2026-06-11; added shared `PenpotRpcTool`, backend config/unavailable/permission error codes, and recovery actions; `mcp-server types:check` and `mcp fmt:check` passed |
| P3.6 | done | Add tests for global tools | `mcp/packages/server`, `backend` if touched | Schema and permission behavior are covered | Completed 2026-06-11; added Node tests for RPC request shape, JSON POST body, backend config/unavailable errors, and auth/permission/error-code normalization; `mcp-server test`, `mcp-server types:check`, and `mcp fmt:check` passed |

## Phase 4: File Context Broker

Goal: make file context explicit, inspectable, and safe.

| ID | Status | Task | Modules | Verification | Notes |
| --- | --- | --- | --- | --- | --- |
| P4.1 | done | Design file context registry | `frontend`, `mcp/packages/server` | Registry tracks open files, active page, selection, tab owner | Completed 2026-06-11; documented frontend/server registry layers, context shape, status model, register/update/bind flows, multi-tab rules, planned tools, and structured errors |
| P4.2 | done | Add `file.get_context` and `file.bind_context` | `mcp/packages/server`, `frontend` | MCP can inspect and bind an available file context | Completed 2026-06-11; plugin reports file/page/selection contexts, server stores token-scoped registry state, `mcp.get_status` reads the registry, and `file.bind_context` verifies access through backend RPC before binding |
| P4.3 | done | Add `file.release_context` | `mcp/packages/server`, `frontend` | MCP can detach from the current file context | Completed 2026-06-11; added idempotent `file.release_context`, registry release state, and unit coverage that returns the open context to available |
| P4.4 | done | Add `file_context_required` error path | `mcp/packages/server` | File tools return clear next actions when no context is bound | Completed 2026-06-11; added shared file-context guard, protected `export_shape` and `import_image`, and covered structured error behavior in server tests |
| P4.5 | done | Add workspace menu bind/unbind controls | `frontend` | User can manually bind current file and see status | Completed 2026-06-11; workspace MCP menu now shows a bind/unbind control wired to `bind-current-file-context` / `release-current-file-context` and reflects binding/releasing/bound states; frontend lint/test blocked locally because `clojure` and frontend `node_modules` are missing |
| P4.6 | done | Add lifecycle tests | `frontend`, `mcp/packages/server` | Bind, release, close tab, and reconnect are covered | Completed 2026-06-11; added frontend MCP file-context lifecycle tests, registry bind-release-rebind/reconnect coverage, and guard tests for release/disconnect; `mcp-server test` passed (18/18); frontend tests blocked locally because `clojure` and frontend `node_modules` are missing |

## Phase 5: Structured File Tools

Goal: reduce normal workflow dependence on arbitrary JavaScript execution.

| ID | Status | Task | Modules | Verification | Notes |
| --- | --- | --- | --- | --- | --- |
| P5.1 | done | Add page tools | `mcp/packages/server`, `mcp/packages/plugin` | `page.list`, `page.create`, `page.rename`, `page.set_current` work | Completed 2026-06-11; added plugin-backed typed page tasks, registered four page tools, guarded them with the bound file context, and covered task serialization in server tests |
| P5.2 | done | Add basic shape creation tools | `mcp/packages/server`, `mcp/packages/plugin` | Frame, rect, text, image creation work with typed args | Completed 2026-06-11; added plugin-backed `shape.create_frame`, `shape.create_rect`, `shape.create_text`, and `shape.create_image` guarded by the bound file context |
| P5.3 | done | Add shape update/delete tools | `mcp/packages/server`, `mcp/packages/plugin` | Position, size, style, layout, delete actions work | Completed 2026-06-11; added plugin-backed `shape.update` and `shape.delete` with explicit shape ids, typed geometry/style/text updates, and basic board layout edits |
| P5.4 | done | Add prototype tools | `mcp/packages/server`, `mcp/packages/plugin` | Basic flows and interactions can be created | Completed 2026-06-11; added plugin-backed `prototype.create_flow` and `prototype.create_interaction` with explicit board/shape ids |
| P5.5 | done | Add export/render tools | `mcp/packages/server`, `mcp/packages/plugin`, `exporter` | Selection/page export works through typed tools | Completed 2026-06-12; added plugin-backed `export.shape`, `export.page`, and `render.preview` returning base64 data and export metadata |
| P5.6 | done | Gate `execute_code` behind setting | `mcp/packages/server` | Advanced code execution respects user setting | Completed 2026-06-12; `execute_code` returns `execute_code_disabled` unless `PENPOT_MCP_ENABLE_EXECUTE_CODE=true`, and status reports `executeCodeEnabled` |

## Phase 6: `penpot-cli` Entry Point

Goal: provide a command-line surface that shares automation concepts with MCP.

| ID | Status | Task | Modules | Verification | Notes |
| --- | --- | --- | --- | --- | --- |
| P6.1 | done | Decide CLI package location | root, future `penpot-cli` | Decision captured in docs | Completed 2026-06-12; CLI will live at top-level `penpot-cli/`, separate from the nested `mcp/` workspace |
| P6.2 | done | Scaffold CLI package | `penpot-cli` | CLI has package metadata, build, lint, help output | Completed 2026-06-12; added top-level TypeScript package, root workspace scripts, module AGENTS, and `--help` smoke verification |
| P6.3 | done | Add MCP orchestration commands | `penpot-cli`, `mcp` | `mcp status`, `mcp config`, `mcp logs` work locally | Completed 2026-06-12; status fetches `/mcp/status`, config prints derived MCP URLs, and logs inspects `PENPOT_MCP_LOG_DIR` or `--dir` |
| P6.4 | done | Add dev orchestration command | `penpot-cli` | `dev up --mcp` starts required services or prints missing deps | Completed 2026-06-12; added dry-run text/JSON plan, `manage.sh`/Docker checks, and conservative `devenv` startup delegation |
| P6.5 | done | Add file/export CLI commands | `penpot-cli`, `mcp`, `backend`, `exporter` | CLI can list/create/open/export through shared command runtime | Completed 2026-06-12; added backend-RPC `file list/create`, browser URL `file open`, and `export page --dry-run` adapter plan |
| P6.6 | done | Add CLI docs | docs, `penpot-cli` | Users can install/run the CLI in local dev | Completed 2026-06-12; added `penpot-cli/README.md` with build/run commands, MCP/dev/file/export examples, current limitations, and required env vars |

## Phase 7: Headless Command Runtime

Goal: move stable automation out of browser/plugin dependency.

| ID | Status | Task | Modules | Verification | Notes |
| --- | --- | --- | --- | --- | --- |
| P7.1 | done | Design command runtime interface | `mcp`, `penpot-cli`, `backend`, `common` | Interface covers schemas, auth, capabilities, adapters | Completed 2026-06-12; added `mcp/docs/headless-command-runtime.md` with neutral package boundaries, command descriptors, execution envelopes, adapter selection, structured errors, and migration order |
| P7.2 | done | Move safe file/page commands to backend/common | `backend`, `common`, `mcp`, `penpot-cli` | Commands work without open workspace | Completed 2026-06-12; added common page helpers, backend `get-file-pages` / `create-file-page` RPC commands, MCP `page.list` / `page.create` backend-command mode by `fileId`, and CLI `page list/create --file`; MCP/CLI TS checks passed; JVM tests/check-fmt/lint remained blocked locally because `clojure`, `cljfmt`, and `clj-kondo` are missing |
| P7.3 | done | Move simple shape operations to backend/common | `backend`, `common` | Simple prototype can be created headlessly | Completed 2026-06-12; added common headless shape helpers and backend `create-file-shape` for frame, rectangle, and text creation; MCP/CLI entry adapter wiring remains part of P7.6 |
| P7.4 | done | Add exporter-backed headless output | `exporter`, `render-wasm` if needed | CLI/MCP can export without a UI tab for supported cases | Completed 2026-06-12; CLI `export page --dry-run` now plans the exporter adapter for explicit `fileId`/`pageId`/`objectId` targets, reports the `export-shapes` payload, and documents exporter resource metadata separately from plugin-live base64 output |
| P7.5 | done | Add adapter selection | `mcp`, future `penpot-cli` | Commands choose backend, exporter, plugin, or local adapter | Completed 2026-06-13; added `@penpot/command-runtime` with shared adapter selection, wired CLI page/export and MCP page tools to report `adapterSelection`, and covered unsupported explicit adapter requests in MCP tests |
| P7.6 | done | Wire headless shape entry adapters | `mcp`, `penpot-cli`, `backend`, `common` | MCP and CLI can create simple shapes without a live workspace | Completed 2026-06-13; MCP `shape.create_frame` / `shape.create_rect` / `shape.create_text` use backend-command when `fileId` and `pageId` are supplied, CLI has matching `shape create-*` commands, and plugin-live fallback remains for bound workspace calls |
| P7.7 | done | Add backend/common simple headless shape update/delete | `backend`, `common` | Backend/common can revise or remove simple generated shapes without a live workspace | Completed 2026-06-13; added common update/delete request helpers, backend `update-file-shape` / `delete-file-shape` RPCs, geometry/style/text coverage, and delete persistence checks; MCP/CLI entry adapter wiring moved to P7.8 |
| P7.8 | done | Wire headless shape update/delete entry adapters | `mcp`, `penpot-cli`, `backend`, `common` | Scripts and MCP can revise or remove simple generated shapes without a live workspace | Completed 2026-06-13; MCP `shape.update` / `shape.delete` use backend-command with explicit `fileId` / `shapeId`, CLI adds `shape update/delete`, and plugin-live fallback remains for bound workspace calls |
| P7.9 | done | Execute exporter-backed page output | `penpot-cli`, `exporter`, `mcp` | CLI can produce a real exported file from explicit file/page/object targets | Completed 2026-06-13; `export page` now posts the Transit request to exporter when `--dry-run` is omitted, resolves `profileId` from the user token when needed, returns resource metadata, and writes bytes to `--output` |

## Phase 8: Hardening And Observability

Goal: make first-class MCP safe and diagnosable.

| ID | Status | Task | Modules | Verification | Notes |
| --- | --- | --- | --- | --- | --- |
| P8.1 | done | Add audit events for MCP writes | `backend`, `mcp` | File writes are traceable to MCP user/session/tool | Completed 2026-06-13; backend-command MCP file/page/shape writes now attach tool, adapter, MCP session, and target metadata to backend audit context without changing tool schemas; MCP types/tests/format passed, backend focused test blocked locally because `clojure` is missing |
| P8.2 | done | Add rate and concurrency limits | `mcp`, `backend` | Per-user/session/file limits prevent runaway edits | Completed 2026-06-13; MCP backend-command writes now use configurable per-user/session/file rate and concurrency limits, backend `create-file` has a dedicated concurrency limit, and default backend rate-limit config covers headless file/page/shape writes; MCP types/tests/format passed, backend focused test blocked locally because `clojure` is missing |
| P8.3 | done | Add version/capability negotiation | `mcp/packages/server`, `mcp/packages/plugin`, `frontend` | Server and plugin reject incompatible versions clearly | Completed 2026-06-13; plugin now sends protocol/version/capability hello, server replies with compatibility, rejects incompatible protocol or missing capabilities, and status reports token-safe negotiation summaries |
| P8.4 | done | Add diagnostics UI/logs | `frontend`, `mcp` | Users can see connection, last error, active context, and logs | Completed 2026-06-13; server status and `mcp.get_status` expose logging metadata, frontend stores diagnostics snapshots and last errors, and Integrations settings show connection, compatibility, file context, logs, and refresh state |
| P8.5 | done | Add destructive action confirmations | `mcp` | High-risk write/delete tools can require confirmation | Completed 2026-06-13; `shape.delete` accepts `confirm: true`, returns `destructive_action_confirmation_required` before mutation when required, defaults to requiring confirmation in remote/multi-user mode, and exposes the policy in MCP status |
| P8.6 | done | Add regression tests and smoke flows | `mcp`, `penpot-cli` | Core MCP startup, global tools, file binding, and export are covered | Completed 2026-06-13; added `penpot-cli` no-service smoke tests, documented automated and running-stack MCP/CLI smoke flows, and recorded locally blocked Clojure/frontend checks |

## Phase 9: Manual MCP Configuration And Global Agent Polish

Goal: finish the user-facing configuration path so MCP can be manually enabled,
disabled, and pointed at built-in or custom endpoints without project-specific
setup.

| ID | Status | Task | Modules | Verification | Notes |
| --- | --- | --- | --- | --- | --- |
| P9.1 | done | Audit existing MCP settings and persistence path | `frontend`, `backend`, `mcp` | Document current profile props, settings UI, env injection, and gaps | Completed 2026-06-13; documented current runtime URL sources, `:mcp-enabled` persistence, token separation, lifecycle usage, gaps, and proposed `:mcp-config` model in `mcp/docs/manual-mcp-configuration-audit.md` |
| P9.2 | done | Define persistent manual MCP config model | `frontend`, `backend`, `mcp` | Config model covers mode, enabled, auto-connect, stream URL, WebSocket URL, status URL, and reset-to-built-in | Completed 2026-06-13; backend profile props accept optional `:mcp-config`, frontend computes effective built-in/custom/local URLs, diagnostics/plugin/client URLs consume it, and focused tests cover persistence and derivation |
| P9.3 | done | Add Integrations settings controls for MCP config | `frontend` | Users can toggle MCP and edit/reset endpoint settings | Completed 2026-06-14; Integrations now saves built-in/custom/local mode, auto-connect, and endpoint overrides, previews effective endpoints, resets with `{:mcp-config nil}`, and covers pure config transforms with frontend tests |
| P9.4 | done | Wire global MCP lifecycle to manual config | `frontend`, `mcp` | Global plugin connects/disconnects according to saved config | Completed 2026-06-14; enabled MCP now loads the hidden plugin for manual controls, honors `:auto-connect false` by avoiding automatic tab ownership/WebSocket startup, and reconfigures live settings after save/reset |
| P9.5 | done | Align CLI config terminology with persisted model | `penpot-cli`, `mcp/docs` | CLI config output and docs use built-in/custom/local terminology | Completed 2026-06-14; `mcp config` now reports mode, auto-connect, local-mode defaults, and a `profileProps.mcp-config` view while preserving legacy camelCase URL fields and env overrides |
| P9.6 | done | Add config and lifecycle tests | `frontend`, `backend`, `penpot-cli` | Settings persistence, derived URLs, reset, and auto-connect are covered | Completed 2026-06-14; added frontend regression tests for config save/reset reconfigure events, CLI custom/local config coverage, and retained existing backend profile-prop persistence/reset tests; frontend/backend focused checks remain blocked locally because `clojure` is unavailable |
| P9.7 | done | Polish config migration and fallback behavior | `frontend`, `backend`, `mcp/docs` | Existing users without `:mcp-config` keep built-in defaults | Completed 2026-06-15; frontend fallback tests cover unknown modes and partial custom URLs, backend profile-prop reads/writes trim/drop empty URL values and ignore nested token fields, and docs explain migration behavior |
| P9.8 | done | Close Wave A manual configuration docs | `todo.md`, `CHANGES.md`, `mcp/docs` | Manual MCP configuration is marked complete and Wave B becomes the next active focus | Completed 2026-06-15; Wave A is marked complete, F2 is done, F3 keeps its connected-global smoke/status follow-up, current limitations are explicit, and Wave B/P10.2 is the next focus |

## Phase 10: Command Runtime Consolidation

Goal: make MCP and `penpot-cli` share command descriptors, request envelopes,
adapter selection, and structured results.

| ID | Status | Task | Modules | Verification | Notes |
| --- | --- | --- | --- | --- | --- |
| P10.1 | done | Refresh overall architecture baseline | `mcp/docs`, `todo.md` | Compact blueprint documents architecture, delivery waves, and task queue | Completed 2026-06-14 in `mcp/docs/penpot-cli-overall-blueprint.md` |
| P10.2 | done | Audit existing MCP tools and CLI commands | `mcp/packages/server`, `penpot-cli`, `mcp/docs` | Inventory maps each command/tool to name, input schema, adapter, response shape, and test coverage | Completed 2026-06-15 in `mcp/docs/command-runtime-inventory.md`; identified duplicated metadata, coverage gaps, unregistered named tools, and the first low-risk descriptor migration slice |
| P10.3 | done | Move status/config/file/page descriptors into command runtime | `command-runtime`, `mcp`, `penpot-cli` | Low-risk command descriptors live in one package | Completed 2026-06-15; added `CommandDescriptors`, descriptor lookup, CLI descriptor smoke coverage, and MCP/CLI wiring for status/config/file/page metadata while preserving public names and output shapes |
| P10.4 | done | Introduce shared request/result envelopes | `command-runtime`, `mcp`, `penpot-cli` | MCP and CLI return the same adapter/result diagnostics internally | Completed 2026-06-15; added token-safe `createCommandRequestEnvelope` / `createCommandResultEnvelope`, wired low-risk status/config/file/page paths, and kept transport-specific formatting at the edges |
| P10.5 | done | Centralize adapter errors and selection reasons | `command-runtime`, `mcp`, `penpot-cli` | Unsupported/unavailable/auth/context errors are consistent | Completed 2026-06-15; added shared command error codes, adapter reason codes, adapter-selection error payloads, and wired MCP/CLI adapter/auth/context/destructive codes to the shared runtime |
| P10.6 | done | Move shape/export descriptors after envelope migration | `command-runtime`, `mcp`, `penpot-cli`, `exporter` | Higher-risk write/export descriptors use the shared catalog without changing behavior | Completed 2026-06-15; added shape/create/update/delete, export.shape, export.page, and render.preview descriptors plus MCP/CLI descriptor wiring while preserving behavior |
| P10.7 | in_progress | Add command runtime descriptor tests | `command-runtime`, `mcp`, `penpot-cli` | Descriptor snapshots and adapter-selection tests pass | Started 2026-06-15; include CLI and MCP no-service smoke coverage |

## Phase 11: Headless Authoring Expansion

Goal: let scripts and agents create richer prototypes without a live workspace
for supported operations.

| ID | Status | Task | Modules | Verification | Notes |
| --- | --- | --- | --- | --- | --- |
| P11.1 | todo | Expand headless page operations | `backend`, `common`, `mcp`, `penpot-cli` | Page rename and supported metadata updates work headlessly | Keep page current/selection semantics out of backend unless meaningful |
| P11.2 | todo | Expand headless shape styling and hierarchy | `backend`, `common`, `mcp`, `penpot-cli` | Generated frames/rect/text support richer style and parent changes | Preserve common data constructors and backend permissions |
| P11.3 | todo | Add headless image/media insertion path | `backend`, `common`, `mcp`, `penpot-cli` | Image-backed shapes can be created without plugin-live context | Reuse existing media upload/storage paths |
| P11.4 | todo | Add backend-supported prototype helpers | `backend`, `common`, `mcp`, `penpot-cli` | Basic flows and navigate interactions work headlessly | Keep plugin-live fallback for unsupported interactions |
| P11.5 | todo | Expand exporter-backed preview commands | `exporter`, `mcp`, `penpot-cli` | Explicit file/page/object previews return useful artifacts | Align output metadata between CLI and MCP |

## Phase 12: File Open, Bind, And User Handoff

Goal: close the loop between headless automation and the visual editor.

| ID | Status | Task | Modules | Verification | Notes |
| --- | --- | --- | --- | --- | --- |
| P12.1 | todo | Define file open/bind handoff UX | `mcp/docs`, `frontend`, `penpot-cli` | Plan covers dashboard, settings, workspace, CLI, and MCP actions | Use existing file context broker as the base |
| P12.2 | todo | Add reliable CLI/MCP file open actions | `penpot-cli`, `mcp`, `frontend` | Users receive a URL or app action that opens the target file | Keep browser URL fallback for local development |
| P12.3 | todo | Show file context state outside workspace | `frontend` | Dashboard/settings can show available/bound/stale context | Do not require opening the workspace menu to understand state |
| P12.4 | todo | Add bind guidance for live-only tools | `mcp`, `frontend`, `penpot-cli` | Live-only tool errors include exact open/bind next actions | Preserve structured `file_context_required` responses |

## Phase 13: Packaging And Distribution

Goal: make the fork usable outside a developer checkout.

| ID | Status | Task | Modules | Verification | Notes |
| --- | --- | --- | --- | --- | --- |
| P13.1 | todo | Define CLI build/install strategy | `penpot-cli`, docs | Install path and versioning decision are documented | Decide private fork package vs publishable package boundary |
| P13.2 | todo | Package MCP plugin assets reliably | `frontend`, `mcp`, `docker` | Frontend build always contains matching plugin assets | Preserve protocol/version compatibility checks |
| P13.3 | todo | Document self-hosted MCP gateway setup | `docker`, `mcp/docs`, `penpot-cli` | Operators can enable MCP with one documented path | Include built-in/custom/local mode guidance |
| P13.4 | todo | Add migration notes for existing MCP users | docs, `CHANGES.md` | Existing token/profile/env behavior is explained | Cover users with only `:mcp-enabled` and no `:mcp-config` |

## Phase 14: Verification And Release Readiness

Goal: make critical MCP/CLI flows repeatable and safe to change.

| ID | Status | Task | Modules | Verification | Notes |
| --- | --- | --- | --- | --- | --- |
| P14.1 | todo | Add config/global connection smoke flow | `frontend`, `mcp`, `penpot-cli` | Manual or automated flow covers enable, connect, status, disable | Account for local Clojure tooling gaps |
| P14.2 | todo | Add headless edit/export smoke flow | `backend`, `mcp`, `penpot-cli`, `exporter` | Create file/page/shape and export artifact in one flow | Prefer commands that can run without a live workspace |
| P14.3 | todo | Add live bind smoke flow | `frontend`, `mcp` | Open file, bind context, run live-only command, release | Preserve multi-tab owner behavior |
| P14.4 | todo | Normalize CI-friendly check commands | root, `frontend`, `backend`, `mcp`, `penpot-cli` | Document exact commands for TS, CLJ, CLJS, and smoke checks | Separate missing local tools from product failures |

## Next Recommended Sprint

Use `mcp/docs/penpot-cli-overall-blueprint.md` as the current architecture
baseline and the Detailed Upcoming Task Queue as the execution order. Continue
with Wave B:

1. Complete B3/P10.4: introduce shared request/result envelopes once descriptor
   metadata is stable. Completed 2026-06-15.
2. Complete B4/P10.5: centralize adapter errors and selection reasons.
   Completed 2026-06-15.
3. Complete B5/P10.6: move shape/export descriptors after the envelope and
   error migration. Completed 2026-06-15.
4. Continue B6/P10.7: harden descriptor snapshots and adapter-selection tests.
