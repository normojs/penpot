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
output execution. P8.1 added backend audit context for first-class MCP writes.
The current implementation focus is P8.2: adding rate and concurrency limits
for MCP/backend write paths.

## Feature Roadmap

This roadmap groups the work by user-visible capability. The phase tables below
remain the execution plan.

| ID | Status | Capability | Target phases | User outcome | First acceptance check |
| --- | --- | --- | --- | --- | --- |
| F1 | done | Built-in MCP gateway | Phase 1 | Users see one MCP URL instead of several internal ports | Settings and generated client config point to `/mcp/stream` |
| F2 | todo | Manual MCP configuration | Phase 1, Phase 2 | Users can choose built-in, custom, or local MCP settings | Settings persist mode, stream URL, WebSocket URL, and auto-connect |
| F3 | in_progress | Global background MCP agent | Phase 2 | MCP can connect after login without opening a file | Connection reaches `connected-global` from dashboard/settings |
| F4 | in_progress | MCP status and diagnostics | Phase 2, Phase 8 | Users and agents can inspect connection health | `mcp.get_status` now reports server, plugin, session, and real registry-backed file context; richer diagnostics remain for Phase 8 |
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
| F15 | in_progress | Audit, limits, and confirmations | Phase 8 | MCP is safer for real deployments | Write operations are auditable; limits and destructive action gates remain |

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
| P8.2 | in_progress | Add rate and concurrency limits | `mcp`, `backend` | Per-user/session/file limits prevent runaway edits | Started 2026-06-13; inspect existing backend command limit patterns and MCP request concurrency hooks before implementation |
| P8.3 | todo | Add version/capability negotiation | `mcp/packages/server`, `mcp/packages/plugin`, `frontend` | Server and plugin reject incompatible versions clearly | Include supported capability list |
| P8.4 | todo | Add diagnostics UI/logs | `frontend`, `mcp` | Users can see connection, last error, active context, and logs | Keep UI operational, not decorative |
| P8.5 | todo | Add destructive action confirmations | `mcp`, `frontend` | High-risk write/delete tools can require confirmation | Policy should be configurable |
| P8.6 | todo | Add regression tests and smoke flows | all touched modules | Core MCP startup, global tools, file binding, and export are covered | Include CLI smoke when available |

## Next Recommended Sprint

Continue with P8.2 MCP/backend limits:

1. Inspect existing backend command limit helpers and any MCP request
   concurrency primitives.
2. Define initial per-user/session/file limits for backend-command writes
   without changing public tool schemas.
3. Wire focused checks around first-class MCP write paths, then add tests for
   limit responses and concurrency release behavior.
