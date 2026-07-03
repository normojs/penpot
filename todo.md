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
into the shared command runtime. P10.7 added focused command-runtime descriptor
and adapter-selection tests, completing Wave B command runtime consolidation.
C1/P11.1 added backend-command page rename metadata through common/backend,
MCP, and `penpot-cli`. C2/P11.2 is complete: backend-command `shape.update`
supports fill/stroke stacks, independent corner radii, parent frame movement,
and backend-safe frame layout updates for `none` and `flex` through
common/backend, MCP, and `penpot-cli`. C3/P11.3 is complete: image-backed
rectangles can be created through backend-command media upload/storage paths
from MCP and `penpot-cli`. C4/P11.4 is complete: backend-command can create
prototype flows and navigate interactions from MCP and `penpot-cli` while
plugin-live remains available for live-only prototype operations. C5/P11.5 is
complete: exporter-backed previews now work for explicit file/page/object
targets from MCP and `penpot-cli`, with shared artifact metadata and CLI
`--output` writes. Backend-command now supports the grid container track subset;
full grid cell placement remains plugin-live/future contract work. D3/P12.3 is
complete: dashboard/settings now expose the current MCP file-context state
outside the workspace menu. D4/P12.4 is complete: live-only
`file_context_required` errors now include target-aware open, inspect, bind,
and retry guidance. Phase 12 file open/bind handoff is complete. Phase 13
packaging and distribution is complete: P13.1 defined the private-checkout
`penpot-cli` build/install path, P13.2 packages MCP plugin assets with metadata
for frontend release bundles, P13.3 documented the self-hosted MCP gateway
setup, and P13.4 documented migration notes for existing MCP users. P14.1
documents the config/global connection smoke flow for release verification,
P14.2 documents the headless edit/export smoke flow for file/page/shape edits
and exporter artifact output without a live workspace, and P14.3 documents the
live bind smoke flow for file open handoff, plugin-live execution, release,
stale recovery, and multi-tab owner behavior. P14.4 documents CI-friendly
check commands for TypeScript, Clojure, ClojureScript, packaging, and smoke
tiers while separating missing local tools from product failures. P15.1
reconciled roadmap status, removed stale active blueprint language, and grouped
the remaining product gaps. P15.2 selected Wave H / Phase 16 for CLI
configuration convergence and distribution hardening. P16.1 documented the
authenticated CLI profile-config read path, precedence, fallback behavior, and
fixture matrix. P16.2 added the opt-in authenticated profile source to
`penpot-cli mcp config`. P16.3 added canonical MCP URL derivation fixtures for
frontend and CLI parity, and P16.4 hardened `dev up --mcp` host/hybrid dry-run
planning. Current active work moves to P16.5 to define the portable CLI release
archive path. P16.5 is complete: the repository can build and verify a private
portable `penpot-cli` release archive containing the CLI and
`@penpot/command-runtime`. Wave I / Phase 17 is now selected for headless
live-gap closure. P17.1 is complete: `mcp/docs/headless-live-gap-audit.md`
classifies current-page/selection state, grid layout, prototype list/delete and
overlay gaps, exporter boundaries, and descriptor-only tool names. P17.2 is
complete: shared command-runtime descriptors now expose the selected live-gap
boundaries before runtime behavior changes. P17.3 is complete: persisted
prototype flow/interaction listing now works through backend-command from MCP
and `penpot-cli`. P17.4 is complete: backend-command now supports the grid
container track subset for explicit file targets while cell/child placement
remains out of scope. P17.5 is complete: live-only current-page/selection
guidance now includes plugin-live recovery metadata, target-aware
`page.set_current` handoff URLs, aligned CLI reason text, and smoke evidence.
P18.1, P18.2, and P18.3 are complete: `selection.get` and `selection.set` now run
through plugin-live for bound MCP workspaces, returning selected ids plus
lightweight shape summaries while allowing explicit selection mutation and
clearing, and the live-bind smoke flow plus CLI descriptor guidance now cover
selection read/write evidence. P19.1 is complete: prototype interaction delete
identity is explicit `fileId`, `pageId`, `sourceShapeId`, and zero-based
`interactionIndex`; P22.2 exposes read-side `interactionId`/`identity`
metadata, and P22.3 adds `interactionId` delete targeting for persisted ids
while preserving the P19 source/index fallback. P19.2 is
complete: backend-command
`prototype.delete_interaction` now works through common/backend helpers, MCP,
and `penpot-cli prototype delete-interaction`. P19.3, P20.1, P20.2, and P20.3
are complete: overlay summaries are readable, the create-overlay payload
contract is documented, and backend-command `prototype.create_overlay` now
works through common/backend helpers, MCP, and
`penpot-cli prototype create-overlay`. Phase 20 is complete. Phase 21 is
complete: `shape.set_layout` and `shape.set_style` are aliases over
`shape.update`, they are registered MCP tools, and
`penpot-cli shape set-layout` / `shape set-style` provide script-friendly CLI
aliases that forward to the same backend-command update path while preserving
alias audit metadata. Phase 22 prototype interaction identity and mutation
hardening is complete. P22.1 is complete: the
prototype interaction identity audit selects future persisted interaction UUIDs
as the canonical stable identity while keeping source-shape/index targeting as
the compatibility fallback. P22.2 is complete: prototype interaction read
summaries now include optional `interactionId` plus explicit `identity.kind`
metadata for stable-id and source-index fallback results. P22.3 is complete:
`prototype.delete_interaction` now accepts stable `interactionId` targets while
preserving source-shape/index deletion and stale guard validation. P22.4 is
complete: update/reorder/duplicate interaction helpers now have descriptor-only
contracts with no executable adapters. P23.1 is complete: backend-command
create-time id generation is selected as the next safe runtime change, while
legacy backfill and copy/remap duplicate-id handling stay separate. P23.2 is
complete: backend-command prototype create helpers now persist fresh stable ids
for new navigate and overlay interactions. P23.3 is complete: common file-data
migration `0018-assign-prototype-interaction-ids` backfills legacy missing ids
and repairs later duplicate ids while preserving order, payload fields, and
first existing unique ids. P23.4 is complete: copy/remap distinct-copy id
regeneration now covers common shape duplicate/remap and frontend page
duplicate paths, and `prototype.update_interaction`,
`prototype.reorder_interaction`, and `prototype.duplicate_interaction` are
executable through backend-command, MCP, and `penpot-cli`. P24.1 is complete:
file-level duplicate/import interaction id semantics are now documented as
file-bound, and common migration fixtures prove cloned/imported file data
preserves first unique ids while repairing missing or later duplicate ids
inside the new file. P25.1 is complete: planned `export.file` and
`render.thumbnail` now have descriptor-only command-runtime entries and
regression tests while remaining non-executable in MCP, CLI, and exporter
adapters.
P25.2 is complete: `export.file` now has a fixture-backed binary archive
contract around the existing backend `export-binfile` RPC/SSE semantics while
remaining MCP-unregistered.
P25.3 is complete: `penpot-cli export file` now executes backend-rpc
`export-binfile`, parses the SSE resource URI, returns resource metadata, and
downloads the `.penpot` archive when `--output` is supplied. P25.4 is
complete: `render.thumbnail` now has a fixture-backed descriptor-only contract
for dashboard file thumbnails and tagged frame thumbnails, including target,
cache, artifact, renderer, and backend persistence metadata. P25.5 is
complete: MCP `export.file` now executes backend-rpc `export-binfile`, parses
the SSE `end` resource URI, and returns `.penpot` resource metadata plus a
resolved `downloadUri` without writing files on the MCP server filesystem.
P25.6 is complete: executable `render.thumbnail` should use a future dedicated
thumbnail renderer service boundary; MCP, CLI, and command-runtime adapters
remain unregistered until that service API and resource normalization are
defined. P25.7 is complete: thumbnail renderer-service API fixtures now define
future file refresh, file reuse, tagged frame refresh, auth forwarding,
resource URI normalization, and MCP/CLI test expectations. P25.8 is complete:
`penpot-cli render thumbnail --dry-run` now prints the future renderer-service
request shape and execution returns `renderer_service_unavailable` until the
renderer exists. P25.9 is complete: MCP `render.thumbnail` is registered as a
planning-only dry-run tool that returns the same renderer-service request
metadata, reports `renderer_service_unavailable` for execution, and never
contacts renderer, backend, exporter, or plugin runtimes. P25.10 is complete:
renderer-service planning responses now include client configuration,
health-endpoint, timeout, and metadata-only availability probe diagnostics
without contacting the renderer. P25.11 is complete: renderer-service
successful response normalization and error payload contracts now cover cache,
resource/download URI, renderer metadata, retryability, and service data
without enabling network execution. P25.12 is complete: renderer-service
client request scaffold now defines future POST dispatch metadata, audit
headers, caller-session auth forwarding names, timeout, and request body while
keeping `dispatch:false`. P25.13 is complete: renderer-service execution now
has a closed explicit opt-in gate, required env/config metadata, failure modes,
and integration-test plan while still keeping dispatch disabled. P25.14 is
complete: renderer-service health preflight and executable client harness plans
now define future GET `/health`, sequence ordering, failure modes, and test
matrix while keeping network probes and render dispatch disabled. P25.15 is
complete: renderer-service dispatch adapter boundary now defines config
precedence, gate/preflight consumption, result/error mapping, and no-dispatch
defaults while runtime dispatch stays disabled. P25.16 is complete:
renderer-service opt-in configuration surfaces now define CLI flag, MCP arg,
environment, profile/backend keys, precedence diagnostics, invalid value
diagnostics, and no-dispatch defaults. P25.17 is complete: renderer-service
unavailable error taxonomy now defines stable configuration, gate, preflight,
dispatch, response, and resource codes with retryability and MCP/CLI payload
fields while dispatch stays disabled. P25.18 is complete: renderer-service
integration fixture harness now defines closed-gate, missing-endpoint, health
failure, render-success, service-error, MCP metadata, CLI output, and
token-safe auth cases while dispatch stays disabled. P25.19 is complete:
renderer-service dispatch registration preflight now defines final readiness
checks for opt-in, endpoint config, service implementation, fixtures, health,
dispatch adapter, runtime registration, and target/cache capabilities while
dispatch stays disabled. P25.20 is complete: renderer-service executable
adapter registration scaffold now exposes the future no-op MCP/CLI
registration surface while keeping dispatch, network dispatch, runtime
registration, and local file writes disabled. P25.21 is complete: the
renderer-service adapter registry manifest now records the future registry key
and MCP/CLI entrypoint wiring while keeping runtime registration disabled.
P25.22 is complete: the final disabled renderer-service enablement checklist
now summarizes opt-in, health, integration, adapter registration, registry, and
target/cache gates while runtime execution remains disabled. P25.23 is complete:
the concrete renderer-service implementation slice audit now selects the
health/no-op contract fixture as the first safe implementation slice while
runtime execution remains disabled. P25.24 is complete: the health/no-op
contract fixtures now define `/health` OK/unavailable and no-op
`thumbnail.render` responses while renderer-service dispatch remains disabled.
P25.25 is complete: the no-op service host scaffold now defines future host
package, routes, config, lifecycle, and observability metadata without starting
a process or registering command-runtime execution. P25.26 is complete: host
lifecycle test fixtures now cover start, stop, readiness, supervision, logs,
and errors without spawning a process, binding ports, or probing health.
P25.27 is complete: package manifest scaffold metadata now defines the future
`@penpot/renderer-service` package shape, planned scripts, exports,
dependencies, files, and workspace integration without creating the package,
mutating workspace files, or making scripts runnable. P25.28 is complete:
package creation guardrails now define required checks, blocked package files,
blocked workspace/runtime mutations, allowed planning work, denied actions, and
runtime-dispatch prerequisites while keeping package creation, workspace
mutation, scripts, process startup, and dispatch disabled. P25.29 is complete:
package file templates now define metadata-only planned
`package.json`, `tsconfig.json`, source, no-op host, and test file shapes
without materializing files, emitting build output, creating the package,
mutating workspace files, or making scripts runnable. P25.30 is complete:
workspace wiring metadata now defines planned `pnpm-workspace.yaml` entry, root
package scripts, lockfile touchpoints, workspace filter, and non-target files
without editing manifests, mutating lockfiles, creating package files, or
making scripts runnable. P25.31 is complete: package build verification
metadata now defines planned filtered build, type-check, and test commands plus
expected dist artifacts while keeping command execution, process spawn, build
output, package scripts, package creation, workspace mutation, and runtime
dispatch disabled. P25.32 is the next task: plan renderer-service package
materialization checklist.

## Feature Roadmap

This roadmap groups the work by user-visible capability. The phase tables below
remain the execution plan.

| ID | Status | Capability | Target phases | User outcome | First acceptance check |
| --- | --- | --- | --- | --- | --- |
| F1 | done | Built-in MCP gateway | Phase 1 | Users see one MCP URL instead of several internal ports | Settings and generated client config point to `/mcp/stream` |
| F2 | done | Manual MCP configuration | Phase 1, Phase 2, Phase 9 | Users can choose built-in, custom, or local MCP settings | Completed 2026-06-15; settings persist built-in/custom/local mode, stream/SSE/WebSocket/status URLs, reset-to-built-in, auto-connect, fallback, and token separation |
| F3 | done | Global background MCP agent | Phase 2 | MCP can connect after login without opening a file | Completed 2026-06-16; global lifecycle/manual connect are implemented and P14.1 documents connected-global status verification without opening a file |
| F4 | done | MCP status and diagnostics | Phase 2, Phase 8 | Users and agents can inspect connection health | Completed 2026-06-13; `mcp.get_status` and Integrations settings now report server, plugin compatibility, session/file context, write limits, logs, and last-error state |
| F5 | done | Global resource tools | Phase 3 | Agents can list teams, projects, and files before a workspace opens | Completed 2026-06-11; MCP can list teams, projects, project files, and recent files through backend permissions |
| F6 | done | File creation and opening | Phase 3, Phase 4, Phase 12 | Agents can create a file and ask Penpot to open or bind it | Completed 2026-06-16; `file.create`, `file.open`, context inspection, bind, release, and live-only guidance are implemented |
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
| F17 | done | Shared command descriptors | Phase 10 | MCP and CLI expose the same command catalog and internal result envelope from one runtime layer | Completed 2026-06-15; descriptors, envelopes, centralized adapter errors, and runtime tests cover status/config/file/page plus shape/export/render commands |
| F18 | done | Expanded headless authoring | Phase 11 | Scripts and agents can create richer prototypes without a live workspace | Completed 2026-06-15; P11.1 page rename, P11.2 style/hierarchy/layout updates, P11.3 image/media insertion, P11.4 prototype helpers, and P11.5 exporter-backed previews are complete for explicit supported targets |
| F19 | done | File open and bind handoff | Phase 12 | Agents can move cleanly between headless edits and visual workspace binding | Completed 2026-06-16; D1/P12.1 defined the UX and command contract, D2/P12.2 added shared CLI/MCP `file.open` handoff responses, D3/P12.3 added dashboard/settings context visibility, and D4/P12.4 added live-only bind guidance |
| F20 | done | Packaging and distribution | Phase 13 | Developers and self-hosted operators have one documented install/setup path | Completed 2026-06-16; P13.1 documented private-checkout `penpot-cli` build/install, P13.2 packages MCP plugin assets, P13.3 documents self-hosted gateway setup, and P13.4 documents existing-user migration |
| F21 | done | Release verification matrix | Phase 14 | Critical MCP/CLI flows have repeatable checks | Completed 2026-06-16; P14.1-P14.4 document config/global connection, headless edit/export, live bind, and CI-friendly command checks |
| F22 | done | Roadmap reconciliation and next-wave planning | Phase 15 | The fork has one accurate active task and a clean next development wave | Completed 2026-06-16; P15.1 reconciled roadmap status and P15.2 defined Wave H / Phase 16 as the next implementation wave |
| F23 | done | CLI configuration convergence and distribution hardening | Phase 16 | `penpot-cli` can inspect the same saved MCP config that Penpot uses and has a clearer path toward portable local use | Completed 2026-06-17; P16.1 completed the read-path contract; P16.2 completed opt-in authenticated profile-source support; P16.3 completed URL derivation fixtures; P16.4 completed host/hybrid planning; P16.5 added a verified private portable CLI release archive |
| F24 | done | Headless live-gap closure | Phase 17 | More authoring operations can run without a live workspace, while truly live-only state stays explicit | Completed 2026-06-17; P17.1-P17.5 audited live gaps, added descriptors, implemented persisted prototype reads, added backend-safe grid tracks, and tightened live-only binding guidance |
| F25 | done | Live workspace state commands | Phase 18 | Agents can intentionally read or change editor-local selection state through bound MCP plugin-live commands | Completed 2026-06-17; P18.1-P18.3 implemented `selection.get`, `selection.set`, clearing, and live-bind/CLI descriptor smoke evidence |
| F26 | done | Prototype mutation contracts | Phase 19 | Agents can safely mutate persisted prototype interactions only after target identity semantics are explicit | Completed 2026-06-18; P19.1/P19.2 delivered source-shape/index delete and P19.3 kept overlay creation descriptor-only until fixtures define action and positioning semantics |
| F27 | done | Prototype overlay read and creation contract | Phase 20 | Agents can inspect persisted overlay interactions and create open/toggle/close overlays without a live workspace | Completed 2026-06-18; P20.1/P20.2/P20.3 delivered read summaries, payload contract fixtures, backend-command creation, MCP routing, and `penpot-cli prototype create-overlay` |
| F28 | done | Design editing alias contracts | Phase 21 | Agents can discover and use specialized layout/style aliases without creating a second shape-update contract | Completed 2026-06-28; P21.1 defined alias contracts, P21.2 registered MCP aliases, and P21.3 added CLI aliases with scoped validation |
| F29 | done | Prototype interaction identity and mutation hardening | Phase 22 | Agents can target prototype interactions more robustly than source-shape/index order alone | Completed 2026-06-29; P22.1-P22.4 delivered the stable identity audit, read metadata, stable-id deletion, and descriptor-only update/reorder/duplicate contracts |
| F30 | done | Prototype interaction UUID generation and migration | Phase 23 | New and existing prototype interactions can safely receive stable ids before richer mutations become executable | Completed 2026-06-29; P23.1-P23.4 delivered UUID generation, legacy id migration, copy/remap distinct-copy regeneration, and executable update/reorder/duplicate helpers |
| F31 | done | Prototype file copy/import identity guardrails | Phase 24 | File-level duplicate/import paths keep stable interaction ids predictable without colliding inside the new file | Completed 2026-06-29; P24.1 documented file-bound identity semantics and added pure migration fixtures for cloned/imported file data |
| F32 | done | Export/render descriptor boundary planning | Phase 25 | Agents can discover planned file-export and thumbnail-render command names without mistaking them for executable tools | Completed 2026-06-29; P25.1 added descriptor-only `export.file` and `render.thumbnail` command-runtime entries with no adapters, and P25.2 defined the fixture-backed `export.file` backend binary archive contract |
| F33 | done | Thumbnail render contract | Phase 25 | Agents can request thumbnail rendering only after target/cache/artifact semantics are explicit | Completed 2026-06-29; P25.4 defines descriptor-only `render.thumbnail` target, cache, artifact, renderer, and backend persistence contracts |
| F34 | done | MCP file export resource return | Phase 25 | Agents can export a `.penpot` archive through MCP once backend-rpc resource handling is explicit | Completed 2026-06-29; P25.5 registers MCP `export.file` around the existing backend `export-binfile` SSE/resource contract and returns resource metadata plus `downloadUri` |
| F35 | done | Thumbnail runtime execution boundary | Phase 25 | Agents can render thumbnails only after the renderer owner and resource return semantics are explicit | Completed 2026-07-04; P25.6 selects a future dedicated thumbnail renderer service, P25.7 defines service API fixtures, P25.8 adds the CLI dry-run/client boundary, P25.9 registers MCP planning-only dry-run, P25.10 adds metadata-only availability probes, P25.11 defines response/error normalization, P25.12 adds disabled client request scaffolding, P25.13 adds a closed execution gate plus integration-test plan, P25.14 adds disabled health preflight and executable client harness plans, P25.15 adds a disabled dispatch adapter boundary, P25.16 adds opt-in configuration surfaces, P25.17 adds unavailable error taxonomy, P25.18 adds integration fixture harness, P25.19 adds dispatch registration preflight, P25.20 adds disabled executable adapter registration scaffold, P25.21 adds disabled adapter registry manifest, P25.22 adds final disabled enablement checklist, P25.23 audits the concrete implementation slice, P25.24 adds health/no-op contract fixtures, P25.25 adds a no-op service host scaffold, P25.26 adds host lifecycle test fixtures, P25.27 adds package manifest scaffold metadata, P25.28 adds package creation guardrails, P25.29 adds package file templates, P25.30 adds package workspace wiring, and P25.31 adds package build verification while runtime execution remains blocked |

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

### Wave B: Consolidate MCP And CLI Command Runtime (Complete)

B1/P10.2 completed on 2026-06-15 in
`mcp/docs/command-runtime-inventory.md`. B2/P10.3 added the first descriptor
catalog in `command-runtime`, and B3/P10.4 added shared request/result
envelopes. B4/P10.5 centralized adapter errors and selection reasons, and
B5/P10.6 completed the shape/export descriptor migration. Continue with
B6/P10.7 completed descriptor and adapter-selection test hardening. Wave B is
complete as of 2026-06-15.

| Order | Task | Modules | Output | Verification |
| --- | --- | --- | --- | --- |
| B1 | Audit existing MCP tools and CLI commands | `mcp/packages/server`, `penpot-cli`, `mcp/docs` | Inventory maps each command/tool to name, input schema, adapter, response shape, and test coverage | Audit document identifies duplicate metadata and first migration slice |
| B2 | Move status/config/file/page descriptors into command runtime | `command-runtime`, `mcp/packages/server`, `penpot-cli` | Shared descriptors define names, input metadata, adapter hints, and transport labels for low-risk commands | MCP and CLI keep existing public names; descriptor tests pass |
| B3 | Add shared request/result envelopes | `command-runtime`, `mcp`, `penpot-cli` | Completed 2026-06-15; MCP tools and CLI commands use the same internal envelope for adapter, target, auth, and diagnostics metadata | Existing CLI JSON output and MCP tool responses remain backward compatible |
| B4 | Centralize adapter errors and selection reasons | `command-runtime`, `mcp`, `penpot-cli` | Completed 2026-06-15; backend unavailable, auth missing, file context required, unsupported adapter, and destructive confirmation errors use shared codes | MCP server tests and CLI no-service smoke tests pass |
| B5 | Move shape/export descriptors after envelope migration | `command-runtime`, `mcp`, `penpot-cli`, `exporter` | Completed 2026-06-15; higher-risk write/export commands use shared descriptors without changing behavior | Shape/create/update/delete and export dry-run tests pass |
| B6 | Add command runtime descriptor tests | `command-runtime`, `mcp`, `penpot-cli` | Completed 2026-06-15; descriptor snapshots and adapter-selection tests protect the migrated command catalog | Runtime, CLI, and MCP no-service smoke coverage pass |

### Wave C: Expand Headless Authoring (Complete)

| Order | Task | Modules | Output | Verification |
| --- | --- | --- | --- | --- |
| C1 | Add headless page rename metadata path | `backend`, `common`, `mcp`, `penpot-cli` | Completed 2026-06-15; page rename works through backend-command for explicit file/page targets | Backend/common tests plus MCP/CLI command tests cover success and permission errors |
| C2 | Expand headless shape styling and hierarchy | `backend`, `common`, `mcp`, `penpot-cli` | Completed 2026-06-15 and expanded 2026-06-17; backend-command `shape.update` covers fill/stroke stacks, independent radius, parent/frame placement, frame layout `none|flex`, and the grid container track subset | Common/backend plus MCP/CLI tests cover style, hierarchy, supported layout mapping, and backend-safe grid track payloads |
| C3 | Add headless image/media insertion path | `backend`, `common`, `mcp`, `penpot-cli` | Completed 2026-06-15; image-backed rectangles are creatable without a live plugin context using existing media upload/storage paths | Common/backend plus MCP/CLI tests cover media validation, permission errors, adapter selection, and persisted preview metadata |
| C4 | Add backend-supported prototype helpers | `backend`, `common`, `mcp`, `penpot-cli` | Completed 2026-06-15; backend-command creates prototype flows and navigate interactions for explicit targets while plugin-live remains available for live-only prototype tools | Common/backend plus MCP/CLI tests cover flow persistence, navigate interaction mapping, and adapter selection |
| C5 | Expand exporter-backed preview commands | `exporter`, `mcp`, `penpot-cli` | Completed 2026-06-15; explicit file/page/object previews return consistent artifact metadata in MCP and CLI | CLI output write path plus MCP exporter resource metadata and plugin-live base64 metadata are covered |

### Wave D: Improve File Open, Bind, And User Handoff

| Order | Task | Modules | Output | Verification |
| --- | --- | --- | --- | --- |
| D1 | Define handoff UX and command contract | `mcp/docs`, `frontend`, `penpot-cli` | Completed 2026-06-16; user-facing flow covers create/find file, open URL, bind context, live-only tool guidance, and release | `mcp/docs/file-open-bind-handoff.md` links dashboard/settings/workspace/CLI/MCP states and defines URL, response, and error contracts |
| D2 | Add reliable CLI/MCP file open handoff | `penpot-cli`, `mcp`, `frontend` | Completed 2026-06-16; CLI/MCP return browser URLs plus handoff actions for target file/page and guide users to bind if needed | Shared URL helper plus command-runtime, MCP, and CLI tests cover URL generation and handoff payloads |
| D3 | Show file context outside workspace | `frontend` | Completed 2026-06-16; dashboard/settings show current available/bound/stale/expired-token context enough for agents and users to orient | Frontend state tests cover unbound, available, bound, stale, and expired token states |
| D4 | Add live-only bind guidance | `mcp`, `mcp/docs` | Completed 2026-06-16; live-only tool errors include precise open/bind/retry actions | Structured `file_context_required` responses include target-aware `file.open`, handoff, bind, and retry metadata; unknown targets guide discovery through `file.list` and `file.get_recent` |

### Wave E: Package And Distribute

| Order | Task | Modules | Output | Verification |
| --- | --- | --- | --- | --- |
| E1 | Define CLI build/install strategy | `penpot-cli`, root docs | Completed 2026-06-16; private checkout/workspace-link usage, package name, binary name, versioning, and install commands are documented | `pnpm cli:install-check` builds and runs the CLI help entry point |
| E2 | Package MCP plugin assets with frontend builds | `frontend`, `mcp/packages/plugin`, `docker` | Completed 2026-06-16; frontend builds package matching MCP plugin assets and `mcp-plugin.json` metadata | Plugin build, frontend asset package/check commands, and release bundle path checks pass |
| E3 | Document self-hosted MCP gateway setup | `docker`, `mcp/docs`, `penpot-cli` | Completed 2026-06-16; operators can enable built-in/custom/local MCP with one documented path | Docs cover env vars, ports, reverse proxy paths, tokens, diagnostics, and common failures |
| E4 | Add migration notes for existing MCP users | docs, `CHANGES.md` | Completed 2026-06-16; existing token/profile/env behavior and new settings are explained | Added migration notes for users with only `:mcp-enabled`, project-local MCP configs, environment-only deployments, direct-port URLs, existing tokens, bundled plugin behavior, and `execute_code` changes |

### Wave F: Release Verification

| Order | Task | Modules | Output | Verification |
| --- | --- | --- | --- | --- |
| F1 | Add config/global connection smoke flow | `frontend`, `mcp`, `penpot-cli` | Completed 2026-06-16; repeatable flow covers enable, mode change, auto-connect off/on, manual connect, status, and disable | Documented automated/static checks, running-stack checks, manual UI fallback, completion evidence, and common failure recovery |
| F2 | Add headless edit/export smoke flow | `backend`, `mcp`, `penpot-cli`, `exporter` | Completed 2026-06-16; one flow creates file/page/shapes, updates a shape, dry-runs exporter requests, and writes artifact output without live workspace context | CLI/MCP commands return expected backend-command/exporter adapter diagnostics and artifact evidence |
| F3 | Add live bind smoke flow | `frontend`, `mcp` | Completed 2026-06-16; flow opens file, binds context, runs plugin-live `page.set_current`, releases context, checks stale recovery, and verifies multi-tab owner behavior | Smoke docs preserve single write-capable owner tab rules |
| F4 | Normalize CI-friendly check commands | root, `frontend`, `backend`, `mcp`, `penpot-cli` | Completed 2026-06-16; exact commands for TS, CLJ, CLJS, backend, frontend, MCP, CLI, packaging, and smoke flows are documented | `mcp/docs/ci-friendly-check-commands.md` separates local missing-tool failures from product failures |

### Wave G: Roadmap Reconciliation And Next-Wave Planning

Wave G keeps the development tracker honest before starting another product
expansion wave. It should not change runtime behavior unless the audit reveals
a broken doc or command reference that blocks planning.

P15.1 audit findings:

- Completed capabilities are no longer listed as active in the Feature Roadmap
  or phase tables.
- The blueprint now marks Wave B, Wave D, Wave F, and Near-Term Priority from
  the current completed state instead of older transition language.
- Remaining gaps are grouped as persisted CLI profile config access, shared URL
  derivation, local `host` and `hybrid` orchestration modes, packaging/release
  archive strategy, live-only page/selection/grid/prototype operations, command
  coverage gaps, and planned descriptors that are not executable yet.

| Order | Task | Modules | Output | Verification |
| --- | --- | --- | --- | --- |
| G1 | Reconcile roadmap status and remaining gaps | root docs, `mcp/docs` | Completed 2026-06-16; stale roadmap states are corrected and remaining real gaps are grouped for planning | `todo.md` has exactly one `in_progress` task and no completed capabilities marked active |
| G2 | Define next implementation wave from audited gaps | root docs, `mcp/docs`, affected future modules | Completed 2026-06-16; Wave H / Phase 16 is ordered from audited gaps and opens with CLI profile-config access | New phase table lists modules, verification, and first task |

### Wave H: CLI Configuration Convergence And Distribution Hardening

Wave H makes `penpot-cli` a better first-class companion to global MCP by
closing the largest remaining gap between Penpot's saved MCP settings and CLI
diagnostics, then hardening the local orchestration and portable packaging path.

Order rationale:

- Start with authenticated profile-config reads because every later CLI
  diagnostic and setup command should report the same effective MCP config the
  user sees in Penpot settings.
- Add a shared URL-derivation contract before expanding host/hybrid startup so
  local plans, settings previews, and CLI output stay aligned.
- Keep release archive work last because the packaging boundary depends on the
  stable CLI/runtime package shape.

| Order | Task | Modules | Output | Verification |
| --- | --- | --- | --- | --- |
| H1 | Audit CLI profile config read path and precedence | `penpot-cli`, `backend`, `frontend`, `mcp/docs` | Completed 2026-06-16; `mcp/docs/cli-profile-config-read-path.md` maps authenticated profile reads, env/flag precedence, offline fallback, errors, and test fixtures | Audit doc or architecture section maps RPC/status/token surfaces, precedence, errors, and test fixtures before code changes |
| H2 | Add authenticated `penpot-cli mcp config` profile source | `penpot-cli`, `backend`, `mcp/docs` | Completed 2026-06-17; CLI can optionally read saved `profile.props.mcp-config` from Penpot when a token/backend URI is supplied, while preserving current env-derived output | CLI JSON tests cover profile source, env/flag precedence, missing auth, network failure, and legacy env-only mode |
| H3 | Add canonical MCP URL derivation contract fixtures | `frontend`, `penpot-cli`, `mcp/docs` | Completed 2026-06-17; frontend and CLI derivation stay aligned through canonical cases for built-in, custom, local, partial, invalid, and reset configs | CLI tests consume `mcp/docs/mcp-url-derivation-fixtures.json`; frontend tests mirror the same golden cases |
| H4 | Harden `dev up --mcp` host/hybrid planning | `penpot-cli`, `mcp/docs` | Completed 2026-06-17; host and hybrid dry-runs report dependency checks, service plans, port ownership diagnostics, public/internal MCP surfaces, and unsupported startup boundaries | CLI smoke tests cover host/hybrid dry-runs, dependency diagnostics, service surfaces, port checks, and non-dry-run unsupported boundaries |
| H5 | Define portable CLI release archive path | `penpot-cli`, `command-runtime`, root scripts, `mcp/docs` | Completed 2026-06-17; release archive includes CLI plus command-runtime dependency layout, install verification, and version compatibility notes | `pnpm cli:package-check` verifies archive contents and extracted execution without relying on global workspace links |

### Wave I: Headless Live-Gap Closure

Wave I turns the remaining plugin-live-only authoring gaps into explicit
contracts, then moves the backend-safe subset into headless MCP/CLI operations.
It should keep live workspace selection and current-page state honest instead
of pretending those are ordinary persisted document mutations.

Order rationale:

- Start with an audit because page current state, selection, grid layout, and
  prototype overlay/list/delete touch different ownership models.
- Add read-only descriptors before write paths so CLI/MCP output can expose
  capability and adapter boundaries consistently.
- Move only backend-safe persisted data first; keep ephemeral live workspace
  state behind plugin-live with better guidance and tests.

| Order | Task | Modules | Output | Verification |
| --- | --- | --- | --- | --- |
| I1 | Audit remaining live-only command semantics | `mcp/docs`, `command-runtime`, `mcp`, `penpot-cli`, `backend`, `common` | Completed 2026-06-17; `mcp/docs/headless-live-gap-audit.md` maps page current/selection, grid/full layout, prototype overlay/list/delete, diagnostic/read commands, and legacy tools to backend-safe, exporter, plugin-live, or unsupported adapters | Audit document identifies command names, persisted data shape, adapter candidates, permission model, and first implementation slice |
| I2 | Add read-only command descriptors for live-gap commands | `command-runtime`, `mcp`, `penpot-cli` | Completed 2026-06-17; command catalog exposes descriptor metadata for selected page/selection reads, prototype reads, and layout capability checks without changing behavior | Descriptor tests and CLI/MCP smoke tests keep transport output stable |
| I3 | Add headless prototype read/list support | `backend`, `common`, `mcp`, `penpot-cli` | Completed 2026-06-17; MCP and CLI can list prototype flows/interactions for explicit file/page targets through backend-command | Backend/common focused tests plus MCP/CLI adapter tests cover persisted flow/interaction summaries and adapter selection |
| I4 | Define and implement backend-safe grid layout subset | `backend`, `common`, `mcp`, `penpot-cli`, `mcp/docs` | Completed 2026-06-17; grid container tracks, gaps, padding, and alignment work through backend-command while cells/child placement remain out of scope | Common/backend plus MCP/CLI tests cover supported grid payloads; docs explain when plugin-live remains required |
| I5 | Tighten selection/current-page live-only guidance | `mcp`, `penpot-cli`, `mcp/docs` | Completed 2026-06-17; live-only errors include plugin-live recovery metadata, target-aware `page.set_current` handoff URLs, retry tool data, and aligned CLI text | MCP server tests and live-bind smoke docs cover unbound, stale, and bound workspace cases |

### Wave J: Live Workspace State Commands

Wave J turns descriptor-only live workspace state into explicit plugin-live MCP
commands. It keeps selection and current-page behavior bound to an open
workspace tab, while making result payloads predictable enough for agents.

Order rationale:

- Start with `selection.get` because it is read-only and can validate result
  shape without mutating editor state.
- Add `selection.set` only after shape id validation and ownership behavior are
  clear.
- Keep CLI descriptor-only for these commands; editor-local state belongs to
  MCP with a bound live context.

| Order | Task | Modules | Output | Verification |
| --- | --- | --- | --- | --- |
| J1 | Implement plugin-live `selection.get` | `mcp`, `mcp/docs` | Completed 2026-06-17; MCP returns selected shape ids and lightweight summaries from the bound workspace context | Plugin task serialization plus MCP tool tests cover plugin-live execution and unbound recovery |
| J2 | Implement plugin-live `selection.set` | `mcp`, `mcp/docs` | Completed 2026-06-17; MCP can set or clear editor selection for explicit shape ids in the bound workspace | Plugin validates shape ids; tests cover empty selection, stale context recovery, and plugin task payloads |
| J3 | Add selection smoke evidence | `mcp/docs`, `penpot-cli` | Completed 2026-06-17; live-bind smoke includes concrete selection read/write and empty-clear evidence, and CLI descriptor guidance stays explicit | Docs plus CLI/runtime descriptor tests |

### Wave K: Prototype Mutation Contracts

Wave K turns planned prototype mutation descriptors into executable behavior
only after the persisted interaction target contract is explicit. It starts
with delete semantics because interaction listing is already backend-safe, while
overlay creation remains contract-first.

Order rationale:

- Define identity before mutation so agents can address interactions
  predictably across backend-command, plugin-live, and future CLI surfaces.
- Implement delete only after source-shape/index behavior is documented and
  testable.
- Keep overlay creation planned until delete proves the shared prototype
  mutation envelope and error shape.

| Order | Task | Modules | Output | Verification |
| --- | --- | --- | --- | --- |
| K1 | Define prototype interaction mutation identity contract | `mcp/docs`, `command-runtime`, `mcp`, `penpot-cli` | Completed 2026-06-17; contract chose explicit `fileId`, `pageId`, `sourceShapeId`, and zero-based `interactionIndex` for `prototype.delete_interaction`; P22.3 later added stable `interactionId` targeting | Docs plus descriptor/runtime tests |
| K2 | Implement backend-command `prototype.delete_interaction` | `backend`, `common`, `mcp`, `penpot-cli`, `mcp/docs` | Completed 2026-06-17; persisted interaction delete works for explicit file/page/source-shape/index targets without a live workspace | Backend/common plus MCP/CLI tests cover success, not-found, and stale target errors |
| K3 | Reassess prototype overlay creation contract | `mcp/docs`, `command-runtime`, `mcp` | Completed 2026-06-18 in P19.3/P20.2; overlay creation stayed descriptor-only until read summaries and payload fixtures stabilized | Audit docs and descriptors stay aligned |

### Wave L: Design Editing Alias Contracts

Wave L resolves the remaining design-editing alias gap before adding more shape
tools. It keeps `shape.update` as the source of truth unless a specialized
command has genuinely different semantics.

| Order | Task | Modules | Output | Verification |
| --- | --- | --- | --- | --- |
| L1 | Define layout/style alias contracts | `command-runtime`, `mcp/docs`, `penpot-cli`, `todo.md` | Completed 2026-06-28; descriptor behavior identifies `shape.set_layout` and `shape.set_style` as aliases over `shape.update` instead of separate mutation contracts | Descriptor/runtime tests and docs agree on alias status |
| L2 | Register MCP alias tools if contract is stable | `mcp`, `mcp/docs` | Completed 2026-06-28; MCP tools forward to the same shape update backend/plugin paths while preserving tool names and audit context | MCP tests prove payload mapping and adapter selection match `shape.update` |
| L3 | Add CLI alias commands if useful for scripts | `penpot-cli`, `mcp/docs` | Completed 2026-06-28; `shape set-layout` and `shape set-style` map to `shape update` without duplicate mutation semantics | CLI smoke tests prove request bodies match equivalent `shape update` calls and reject fields outside each alias contract |

### Wave M: Prototype Interaction Identity And Mutation Hardening

Wave M keeps prototype mutations predictable after source-shape/index delete
and overlay creation are working. It starts with persisted data analysis before
changing runtime behavior so existing source-shape/index commands remain
compatible.

| Order | Task | Modules | Output | Verification |
| --- | --- | --- | --- | --- |
| M1 | Define prototype interaction stable identity strategy | `common`, `backend`, `mcp/docs`, `command-runtime`, `penpot-cli` | Completed 2026-06-28; `prototype-interaction-identity.md` selects future persisted interaction UUIDs, rejects generated hashes as delete identities, and preserves source-shape/index compatibility | Contract doc and JSON fixtures cover id-present, id-missing, duplicate-id, and legacy fallback expectations |
| M2 | Add stable identity metadata to interaction reads if contract is stable | `common`, `backend`, `mcp`, `penpot-cli` | Completed 2026-06-28; `prototype.list_interactions` reports optional `interactionId` plus stable-id or source-index identity metadata without breaking existing summaries | Common/backend plus MCP/CLI tests cover stable-id and legacy fallback interaction summaries |
| M3 | Support stable-id prototype deletion if contract is stable | `common`, `backend`, `mcp`, `penpot-cli` | Completed 2026-06-28; `prototype.delete_interaction` accepts stable `interactionId` targets while preserving source-shape/index deletion and stale guard checks | Common/backend plus MCP/CLI tests cover stable id, stale guard, duplicate id, missing id, and source-shape/index compatibility |
| M4 | Plan richer prototype mutation helpers | `mcp/docs`, `command-runtime` | Completed 2026-06-29; contracts for update/reorder/duplicate interaction helpers are explicit before implementation | Descriptor docs and tests distinguish planned, unsupported, and executable helpers |

### Wave N: Prototype Interaction UUID Generation And Migration

Wave N turns Phase 22's stable identity contract into durable data behavior.
It should not make update/reorder/duplicate executable until new interactions,
legacy interactions, duplicated interactions, and id-conflict files have a
documented and tested UUID policy.

Order rationale:

- Audit all creation and persistence touchpoints first because prototype
  interactions can be created through backend-command helpers and existing file
  data can already contain id-missing or duplicate-id interactions.
- Add new-id generation before any migration so newly authored data stops
  increasing the legacy/id-missing population.
- Keep migration separate from richer mutation execution so rollback and
  compatibility behavior stay reviewable.

| Order | Task | Modules | Output | Verification |
| --- | --- | --- | --- | --- |
| N1 | Audit interaction UUID generation and migration plan | `common`, `backend`, `mcp/docs`, `command-runtime`, `penpot-cli` | Completed 2026-06-29; `prototype-interaction-uuid-generation-migration.md` maps create/copy/import paths, migration candidates, conflict policy, and test fixtures needed before runtime changes | Audit selected backend-command create-time id generation for P23.2 and kept legacy backfill/copy-remap duplicate-id handling separate |
| N2 | Generate UUIDs for new prototype interactions if safe | `common`, `backend`, `mcp`, `penpot-cli` | Completed 2026-06-29; new backend-command-created navigate and overlay interactions persist a fresh stable `interactionId` without changing legacy reads | Common/backend plus MCP/CLI tests cover generated ids and response metadata |
| N3 | Add legacy interaction id backfill or migration if safe | `common`, `backend`, `mcp/docs` | Completed 2026-06-29; common migration `0018-assign-prototype-interaction-ids` assigns ids to legacy id-missing interactions and repairs later duplicates | Focused migration tests cover id-missing, duplicate-id, first-unique-id preservation, page/component containers, order, and payload preservation |
| N4 | Implement executable update/reorder/duplicate helpers after UUID policy | `common`, `backend`, `mcp`, `penpot-cli`, `mcp/docs` | Completed 2026-06-29; Phase 22 descriptors now execute through backend-command, MCP tools, and `penpot-cli` commands | Tests cover stable-id targets, stale guards, action-compatible updates, same-source reorder, fresh-id duplicate, copy/remap regeneration, and legacy fallback |

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
| P10.7 | done | Add command runtime descriptor tests | `command-runtime`, `mcp`, `penpot-cli` | Descriptor snapshots and adapter-selection tests pass | Completed 2026-06-15; added command-runtime `node:test` coverage for descriptor groups, lookup, adapter selection, adapter errors, and token-safe envelopes |

## Phase 11: Headless Authoring Expansion

Goal: let scripts and agents create richer prototypes without a live workspace
for supported operations.

| ID | Status | Task | Modules | Verification | Notes |
| --- | --- | --- | --- | --- | --- |
| P11.1 | done | Expand headless page operations | `backend`, `common`, `mcp`, `penpot-cli` | Completed 2026-06-15; page rename works headlessly through backend-command and live fallback remains available in MCP | Added `rename-page-request`, `rename-file-page`, shared `page.rename` descriptor, MCP/CLI adapters, limit config, docs, and regression tests; page current/selection semantics remain plugin-live |
| P11.2 | done | Expand headless shape styling and hierarchy | `backend`, `common`, `mcp`, `penpot-cli` | Completed 2026-06-15 and expanded 2026-06-17; generated frames/rect/text support fill/stroke stacks, independent corner radii, parent changes, frame layout `none|flex`, and the grid container track subset through backend-command | Grid cells and child placement remain plugin-live/future contract work |
| P11.3 | done | Add headless image/media insertion path | `backend`, `common`, `mcp`, `penpot-cli` | Completed 2026-06-15; image-backed rectangles can be created without plugin-live context through backend media upload/storage paths | Added common `create-image-shape-request`, backend `create-file-image-shape`, MCP backend-command routing, `penpot-cli shape create-image`, docs, and focused tests |
| P11.4 | done | Add backend-supported prototype helpers | `backend`, `common`, `mcp`, `penpot-cli` | Completed 2026-06-15; basic flows and navigate interactions work headlessly through backend-command | Added common prototype requests, backend `create-file-prototype-flow` / `create-file-prototype-interaction`, MCP backend-command routing, `penpot-cli prototype create-*`, docs, and focused tests; overlay/list/delete remain plugin-live |
| P11.5 | done | Expand exporter-backed preview commands | `exporter`, `mcp`, `penpot-cli` | Completed 2026-06-15; explicit file/page/object previews return useful artifacts | `render.preview` now selects exporter for explicit MCP targets, keeps plugin-live base64 previews for bound workspace context, and `penpot-cli render preview` supports dry-run metadata plus `--output` writes |

## Phase 12: File Open, Bind, And User Handoff

Goal: close the loop between headless automation and the visual editor.

| ID | Status | Task | Modules | Verification | Notes |
| --- | --- | --- | --- | --- | --- |
| P12.1 | done | Define file open/bind handoff UX | `mcp/docs`, `frontend`, `penpot-cli` | Completed 2026-06-16; plan covers dashboard, settings, workspace, CLI, and MCP actions | Added `mcp/docs/file-open-bind-handoff.md` with state machine, URL contract, MCP/CLI response shapes, live-only error contract, and verification targets |
| P12.2 | done | Add reliable CLI/MCP file open actions | `penpot-cli`, `mcp`, `frontend` | Completed 2026-06-16; users receive a URL and handoff actions for opening the target file | Added shared URL/handoff helpers, MCP `file.open`, CLI `workspaceUrl`/`handoff` output, docs, and focused tests; browser URL fallback remains the supported local/remote path |
| P12.3 | done | Show file context state outside workspace | `frontend` | Completed 2026-06-16; dashboard/settings can show available/bound/stale/expired-token context | Added shared frontend context summary, dashboard sidebar context status, settings diagnostics reuse, translations, and focused state tests; no workspace menu required to understand state |
| P12.4 | done | Add bind guidance for live-only tools | `mcp`, `mcp/docs` | Completed 2026-06-16; live-only tool errors include exact open/bind next actions | Added target-aware `file_context_required` handoff payloads, inferred context targets, unknown-target discovery guidance, docs, and focused server tests |

## Phase 13: Packaging And Distribution

Goal: make the fork usable outside a developer checkout.

| ID | Status | Task | Modules | Verification | Notes |
| --- | --- | --- | --- | --- | --- |
| P13.1 | done | Define CLI build/install strategy | `penpot-cli`, docs | Completed 2026-06-16; install path and versioning decision are documented | Added private-checkout build/install strategy, root install check script, workspace-link guidance, and publishable-package prerequisites |
| P13.2 | done | Package MCP plugin assets reliably | `frontend`, `mcp`, `docker` | Completed 2026-06-16; frontend build always contains matching plugin assets | Added checked plugin packaging helper, `mcp-plugin.json` metadata, root/package check commands, and frontend release bundle integration |
| P13.3 | done | Document self-hosted MCP gateway setup | `docker`, `mcp/docs`, `penpot-cli` | Completed 2026-06-16; operators can enable MCP with one documented path | Added `mcp/docs/self-hosted-mcp-gateway.md` covering built-in/custom/local modes, env vars, reverse proxy paths, tokens, diagnostics, and common failures |
| P13.4 | done | Add migration notes for existing MCP users | docs, `CHANGES.md` | Completed 2026-06-16; existing token/profile/env behavior is explained | Added `mcp/docs/existing-mcp-user-migration.md` covering users with only `:mcp-enabled`, project-local configs, env-only deployments, direct ports, tokens, bundled plugin behavior, and `execute_code` changes |

## Phase 14: Verification And Release Readiness

Goal: make critical MCP/CLI flows repeatable and safe to change.

| ID | Status | Task | Modules | Verification | Notes |
| --- | --- | --- | --- | --- | --- |
| P14.1 | done | Add config/global connection smoke flow | `frontend`, `mcp`, `penpot-cli` | Manual or automated flow covers enable, connect, status, disable | Completed 2026-06-16 in `mcp/docs/config-global-connection-smoke-flow.md`; accounts for local Clojure tooling gaps |
| P14.2 | done | Add headless edit/export smoke flow | `backend`, `mcp`, `penpot-cli`, `exporter` | Completed 2026-06-16; create file/page/shapes, update a shape, dry-run exporter requests, and export artifact in one flow | Added `mcp/docs/headless-edit-export-smoke-flow.md`; uses explicit ids and requires no live workspace |
| P14.3 | done | Add live bind smoke flow | `frontend`, `mcp` | Completed 2026-06-16 in `mcp/docs/live-bind-smoke-flow.md`; opens file, binds context, runs plugin-live command, releases, and checks stale recovery | Preserves multi-tab owner behavior |
| P14.4 | done | Normalize CI-friendly check commands | root, `frontend`, `backend`, `mcp`, `penpot-cli` | Completed 2026-06-16; exact commands for TS, CLJ, CLJS, packaging, and smoke checks are documented | Added `mcp/docs/ci-friendly-check-commands.md`; separates missing local tools from product failures |

## Phase 15: Roadmap Reconciliation And Next-Wave Planning

Goal: turn the completed first-class MCP/CLI foundation into an accurate next
implementation plan without carrying stale active states forward.

| ID | Status | Task | Modules | Verification | Notes |
| --- | --- | --- | --- | --- | --- |
| P15.1 | done | Reconcile roadmap status and remaining gaps | root docs, `mcp/docs` | Completed 2026-06-16; `todo.md` has exactly one `in_progress` task and completed capabilities are not marked active | Audited Feature Roadmap, Detailed Upcoming Task Queue, phase tables, and blueprint near-term priority; grouped remaining gaps for P15.2 |
| P15.2 | done | Define the next implementation wave | root docs, `mcp/docs`, affected future modules | Completed 2026-06-16; Wave H / Phase 16 has ordered tasks, modules, verification, and first acceptance checks | Selected CLI configuration convergence and distribution hardening as the next product-development slice |

## Phase 16: CLI Configuration Convergence And Distribution Hardening

Goal: make `penpot-cli` report and use the same effective MCP configuration as
Penpot, then harden local orchestration and portable packaging around that
stable configuration model.

| ID | Status | Task | Modules | Verification | Notes |
| --- | --- | --- | --- | --- | --- |
| P16.1 | done | Audit CLI profile config read path and precedence | `penpot-cli`, `backend`, `frontend`, `mcp/docs` | Completed 2026-06-16; `mcp/docs/cli-profile-config-read-path.md` maps authenticated profile reads, env/flag precedence, offline fallback, errors, and test fixtures before code changes | Confirmed existing `get-profile`/profile-prop surfaces, CLI token/backend config, frontend derivation rules, and current `mcp config` JSON shape |
| P16.2 | done | Add authenticated `mcp config` profile source | `penpot-cli`, `backend`, `mcp/docs` | Completed 2026-06-17; CLI tests cover profile-source success, env/flag overrides, missing auth, network failure, and legacy env-only mode | Preserved current no-network behavior unless the user asks CLI to read from Penpot |
| P16.3 | done | Add canonical MCP URL derivation contract fixtures | `frontend`, `penpot-cli`, `mcp/docs` | Completed 2026-06-17; frontend and CLI tests share or mirror golden cases for built-in, custom, local, partial, invalid, and reset configs | Added `mcp/docs/mcp-url-derivation-fixtures.json`, direct CLI smoke consumption, mirrored frontend effective-config cases, and parity rules for built-in/local URL overrides |
| P16.4 | done | Harden `dev up --mcp` host/hybrid planning | `penpot-cli`, `mcp/docs` | Completed 2026-06-17; CLI smoke tests cover host/hybrid dry-runs, dependency diagnostics, service surfaces, port checks, and unsupported startup boundaries | Host/hybrid real startup remains disabled and returns structured plan details in JSON errors |
| P16.5 | done | Define portable CLI release archive path | `penpot-cli`, `command-runtime`, root scripts, `mcp/docs` | Completed 2026-06-17; `pnpm cli:package-check` builds, archives, extracts, and smoke-checks the portable CLI release without relying on global workspace links | Keeps private checkout and workspace-link install paths supported during fork development |

## Phase 17: Headless Live-Gap Closure

Goal: convert the remaining plugin-live-only authoring gaps into explicit
contracts and implement the backend-safe subset without blurring live workspace
state with persisted document data.

| ID | Status | Task | Modules | Verification | Notes |
| --- | --- | --- | --- | --- | --- |
| P17.1 | done | Audit remaining live-only command semantics | `mcp/docs`, `command-runtime`, `mcp`, `penpot-cli`, `backend`, `common` | Completed 2026-06-17; `mcp/docs/headless-live-gap-audit.md` maps each candidate command to persisted data, live workspace state, adapter candidates, permissions, errors, and first implementation slice | Classified page current/selection as plugin-live, prototype list as backend-safe read, grid as backend-contract pending, and overlay/delete/descriptor-only names as planned or unsupported |
| P17.2 | done | Add read-only descriptors for live-gap commands | `command-runtime`, `mcp`, `penpot-cli` | Completed 2026-06-17; command-runtime and CLI smoke tests cover the live-gap descriptor group, reason text, and stable MCP `page.set_current` metadata | Added descriptors and adapter reason text for `page.set_current`, `selection.get`, `selection.set`, `prototype.list_interactions`, prototype planned/unsupported gaps, and layout boundary metadata |
| P17.3 | done | Add headless prototype read/list support | `backend`, `common`, `mcp`, `penpot-cli` | Completed 2026-06-17; backend/common focused tests plus MCP/CLI adapter tests cover explicit file/page targets | Added persisted flow/interaction summaries through `get-file-prototype-interactions`, MCP `prototype.list_interactions`, and `penpot-cli prototype list-interactions`; overlay mutation and live selection remain out of scope |
| P17.4 | done | Define backend-safe grid layout subset | `backend`, `common`, `mcp`, `penpot-cli`, `mcp/docs` | Completed 2026-06-17; common/backend plus MCP/CLI tests cover grid container direction, rows/columns tracks, gaps, padding, and alignment | Cell placement, spans, and moving children into grid tracks remain out of scope until a stable cell payload contract exists |
| P17.5 | done | Tighten selection/current-page live-only guidance | `mcp`, `penpot-cli`, `mcp/docs` | Completed 2026-06-17; MCP guard/tool tests and live-bind smoke docs cover unbound, stale, and target-aware recovery cases | Added plugin-live/editor-local recovery metadata, target-aware `page.set_current` handoff URLs, retry tool data, and aligned CLI reason text |

## Phase 18: Live Workspace State Commands

Goal: implement explicit plugin-live commands for editor-local workspace state
without converting current page or selection into backend-command document
mutations.

| ID | Status | Task | Modules | Verification | Notes |
| --- | --- | --- | --- | --- | --- |
| P18.1 | done | Implement plugin-live `selection.get` | `mcp`, `mcp/docs` | Completed 2026-06-17; plugin task serialization and MCP tool tests cover bound plugin-live execution, unbound recovery, and unsupported adapters | Returns selected shape ids and lightweight summaries from the bound workspace; CLI remains descriptor-only |
| P18.2 | done | Implement plugin-live `selection.set` | `mcp`, `mcp/docs` | Completed 2026-06-17; plugin task serialization and MCP tool tests cover bound plugin-live execution, clearing selection, stale/unbound recovery, and unsupported adapters | Mutates only editor-local selection in the bound workspace; plugin validates requested shape ids before assignment |
| P18.3 | done | Add selection live-bind smoke evidence | `mcp/docs`, `penpot-cli` | Completed 2026-06-17; smoke docs cover concrete selection read/write after `page.set_current`, empty selection clearing, and stale/unbound recovery; CLI/runtime descriptor tests stay aligned | Recovery guidance remains identical to `page.set_current`; CLI remains descriptor-only for editor-local selection |

## Phase 19: Prototype Mutation Contracts

Goal: turn planned prototype mutation descriptors into executable behavior only
after target identity and error semantics are stable.

| ID | Status | Task | Modules | Verification | Notes |
| --- | --- | --- | --- | --- | --- |
| P19.1 | done | Define prototype interaction mutation identity contract | `mcp/docs`, `command-runtime`, `mcp`, `penpot-cli` | Completed 2026-06-17; docs plus descriptor/runtime tests define source-shape/index identity for `prototype.delete_interaction` | Delete required explicit `fileId`, `pageId`, `sourceShapeId`, and zero-based `interactionIndex`; P22.3 later added stable `interactionId` targeting |
| P19.2 | done | Implement backend-command `prototype.delete_interaction` | `backend`, `common`, `mcp`, `penpot-cli`, `mcp/docs` | Completed 2026-06-17; backend/common plus MCP/CLI tests cover persisted delete success, missing source, stale index, and descriptor alignment | Implemented backend-command-only source-shape/index delete; plugin-live remains unnecessary for this persisted mutation |
| P19.3 | done | Reassess prototype overlay creation contract | `mcp/docs`, `command-runtime`, `mcp` | Completed 2026-06-18; command-runtime tests and docs kept `prototype.create_overlay` descriptor-only at the Phase 19 boundary | Overlay creation needed read-only overlay summaries plus validation fixtures before the P20.3 executable payload contract |

## Phase 20: Prototype Overlay Read And Creation Contract

Goal: make persisted overlay interactions inspectable, fixture-backed, and
creatable through a backend-command path without requiring a live workspace.

| ID | Status | Task | Modules | Verification | Notes |
| --- | --- | --- | --- | --- | --- |
| P20.1 | done | Add read-only overlay interaction summaries | `common`, `backend`, `mcp`, `penpot-cli`, `mcp/docs` | Completed 2026-06-18; command-runtime/MCP/CLI tests pass, common focused test shows only existing text-content failures, backend focused test is blocked by local Postgres SSL before assertions | `prototype.list_interactions` now reports persisted open/toggle/close overlay summaries without enabling create-overlay |
| P20.2 | done | Define `prototype.create_overlay` payload contract | `mcp/docs`, `command-runtime`, `common` | Completed 2026-06-18; command-runtime/CLI tests pass and common focused test shows only existing text-content failures | Descriptor, common contract fixture, and `prototype-create-overlay-contract.md` define the payload while keeping no executable adapter |
| P20.3 | done | Implement backend-command overlay creation if contract is stable | `common`, `backend`, `mcp`, `penpot-cli` | Completed 2026-06-18; command-runtime, MCP server, CLI type/lint/help/test pass; common focused test reaches only existing text-content failures; backend focused test is blocked by local Postgres SSL/read timeout before assertions | `prototype.create_overlay` now creates persisted open/toggle/close overlays through common/backend helpers, MCP routing, and `penpot-cli prototype create-overlay`; delete/list interoperate with overlay summaries |

## Next Recommended Sprint

Use `mcp/docs/penpot-cli-overall-blueprint.md` and
`mcp/docs/headless-live-gap-audit.md` as the current architecture baseline and
continue within Phase 25:

1. Done in P23.4: settle copy/remap distinct-copy interaction id regeneration
   for common shape duplicate/remap and frontend page duplicate paths so copied
   shapes/pages do not reuse source interaction ids.
2. Done in P23.4: enable `prototype.update_interaction`,
   `prototype.reorder_interaction`, and `prototype.duplicate_interaction`
   through common/backend, MCP, and `penpot-cli`.
3. Keep frontend workspace generation and import/file-duplicate id semantics
   explicit in docs and tests. Done in P24.1 for file-level duplicate/import
   semantics; frontend workspace generation remains source-index compatible
   until a later live-editor task is selected.
4. Export/file, thumbnail, component, token, or debug tool waves can supersede
   Phase 23 if they become higher priority. P25.1 starts the export/render
   wave with descriptor boundaries, P25.2 selects the backend
   `export-binfile` contract for `export.file`, and P25.3 implements
   `penpot-cli export file` backend-rpc/SSE execution plus `--output`
   downloads, and P25.4 defines the `render.thumbnail` descriptor-only target,
   cache, renderer, and artifact contract. P25.5 registers MCP `export.file`
   through backend-rpc SSE resource returns. P25.6 selects a future dedicated
   thumbnail renderer service boundary, and P25.7 defines renderer-service API
   fixtures. P25.8 adds a CLI dry-run/client boundary, P25.9 registers the
   MCP planning-only dry-run tool, and P25.10 adds renderer-service client
   configuration and metadata-only availability probes while keeping execution
   unavailable. P25.11 defines renderer-service response/resource metadata and
   error normalization. P25.12 adds a disabled renderer-service client request
   scaffold with audit headers and caller-session auth forwarding names. P25.13
   adds a closed execution gate with explicit opt-in, required config,
   integration-test plan, and failure modes. P25.14 adds disabled health
   preflight and executable client harness plans. P25.15 adds a disabled
   dispatch adapter boundary with config precedence, gate/preflight
   consumption, result/error mapping, and no-dispatch defaults. P25.16 adds
   opt-in configuration surfaces and diagnostics. P25.17 adds unavailable
   error taxonomy, P25.18 adds integration fixture harness metadata, P25.19
   adds dispatch registration preflight metadata, and P25.20 adds disabled
   executable adapter registration scaffold metadata. P25.21 adds disabled
   adapter registry manifest metadata, P25.22 adds final disabled enablement
   checklist metadata, P25.23 audits the concrete renderer-service
   implementation slice, P25.24 adds health/no-op contract fixtures, and
   P25.25 adds a no-op service host scaffold, and P25.26 adds host lifecycle
   test fixtures. Remaining work: plan the renderer-service package manifest
   scaffold before implementing executable `render.thumbnail`.

## Phase 21: Design Editing Alias Contracts

Goal: decide whether `shape.set_layout` and `shape.set_style` should become
registered commands or remain discoverable aliases over `shape.update`, without
forking a second shape-update contract.

| ID | Status | Task | Modules | Verification | Notes |
| --- | --- | --- | --- | --- | --- |
| P21.1 | done | Define `shape.set_layout` and `shape.set_style` alias contracts | `command-runtime`, `mcp/docs`, `penpot-cli`, `todo.md` | Completed 2026-06-28; runtime and CLI descriptor tests document alias status and docs identify the future registration path | Later P21.2/P21.3 registered the executable MCP and CLI alias surfaces |
| P21.2 | done | Register MCP alias tools if contract is stable | `mcp`, `mcp/docs` | Completed 2026-06-28; MCP tests prove `shape.set_layout` and `shape.set_style` map to the same backend/plugin update paths with alias audit context | CLI aliases landed separately in P21.3 |
| P21.3 | done | Add CLI alias commands if useful for scripts | `penpot-cli`, `mcp/docs` | Completed 2026-06-28; CLI smoke tests prove `shape set-layout` and `shape set-style` request bodies match equivalent `shape update` calls | Alias commands reject fields outside their layout-only or style/text-only contracts |

## Phase 22: Prototype Interaction Identity And Mutation Hardening

Goal: make prototype interaction targeting more stable than source-shape/index
order alone, while preserving the Phase 19/20 commands that already work.

| ID | Status | Task | Modules | Verification | Notes |
| --- | --- | --- | --- | --- | --- |
| P22.1 | done | Audit prototype interaction identity options | `common`, `backend`, `mcp/docs`, `command-runtime`, `penpot-cli` | Completed 2026-06-28; `prototype-interaction-identity.md` documents current vector storage, migration options, generated-reference risks, compatibility rules, and descriptor expectations | No runtime behavior changed; `prototype-interaction-identity-fixtures.json` captures id-present, id-missing, duplicate-id, and legacy fallback expectations |
| P22.2 | done | Add stable identity metadata to read summaries if feasible | `common`, `backend`, `mcp`, `penpot-cli` | Completed 2026-06-28; `prototype.list_interactions` returns stable identity metadata or explicit fallback reference metadata | Existing source-shape/index summaries remain backward compatible; P22.3 later adds stable-id delete targeting |
| P22.3 | done | Add stable-id delete targeting if contract is stable | `common`, `backend`, `mcp`, `penpot-cli` | Completed 2026-06-28; `prototype.delete_interaction` supports stable-id targeting plus current source-shape/index targeting | Stale guards, missing ids, duplicate ids, and legacy indexes produce structured validation outcomes |
| P22.4 | done | Define richer prototype mutation helper contracts | `mcp/docs`, `command-runtime` | Completed 2026-06-29; planned update/reorder/duplicate helpers have clear payload and adapter boundaries | Kept descriptor-only with empty adapters until UUID generation and migration semantics are stable |

## Phase 23: Prototype Interaction UUID Generation And Migration

Goal: make persisted prototype interaction ids durable for newly authored and
legacy file data before enabling richer update/reorder/duplicate mutations.

| ID | Status | Task | Modules | Verification | Notes |
| --- | --- | --- | --- | --- | --- |
| P23.1 | done | Audit UUID generation and migration prerequisites | `common`, `backend`, `mcp/docs`, `command-runtime`, `penpot-cli` | Completed 2026-06-29; audit identifies create/copy/import touchpoints, id conflict policy, migration/backfill options, fixture needs, and first safe runtime change | Selected common headless/backend-command create-time id generation for P23.2; no runtime behavior changed |
| P23.2 | done | Generate persisted ids for new interactions if safe | `common`, `backend`, `mcp`, `penpot-cli` | Completed 2026-06-29; new backend-command navigate/overlay interactions include fresh stable `interactionId` values and read summaries expose them | Generated ids in common headless helpers; create does not accept caller-provided ids; legacy backfill was handled separately in P23.3 |
| P23.3 | done | Add legacy id backfill or migration if safe | `common`, `backend`, `mcp/docs` | Completed 2026-06-29; existing id-missing interactions gain stable ids through common migration `0018-assign-prototype-interaction-ids`, and later duplicate ids are repaired | Preserves source-shape/index fallback for old clients, existing first unique ids, vector order, and payload fields |
| P23.4 | done | Enable update/reorder/duplicate helpers after UUID policy | `common`, `backend`, `mcp`, `penpot-cli`, `mcp/docs` | Completed 2026-06-29; helper commands execute with stable ids, source/index fallback, stale guards, action-specific update validation, same-source reorder, and fresh-id duplicate | Common shape duplicate/remap and frontend page duplicate regenerate copied interaction ids; backend-command/MCP/CLI tests cover executable helper payloads |

## Phase 24: Prototype File Copy And Import Identity Guardrails

Goal: make file-level duplicate/import semantics explicit after stable
interaction ids become executable targets, without confusing whole-file copies
with in-file shape/page copies.

| ID | Status | Task | Modules | Verification | Notes |
| --- | --- | --- | --- | --- | --- |
| P24.1 | done | Document and fixture file-level duplicate/import id semantics | `common`, `mcp/docs`, `todo.md` | Completed 2026-06-29; pure migration tests prove cloned/imported file data preserves first unique ids and repairs only missing/later duplicate ids inside the new file | Backend duplicate/import paths already pass through `bfc/process-file` and common file migrations; this locks the contract before selecting export/file or component/token waves |

## Phase 25: Export And Render Descriptor Boundaries

Goal: make planned export/render tool names visible in the shared command
catalog before adding executable MCP, CLI, or exporter behavior.

| ID | Status | Task | Modules | Verification | Notes |
| --- | --- | --- | --- | --- | --- |
| P25.1 | done | Add descriptor-only export.file and render.thumbnail boundaries | `command-runtime`, `penpot-cli`, `mcp/docs`, `todo.md` | Completed 2026-06-29; command-runtime and CLI smoke descriptor tests proved both names resolved as initial descriptor-only boundaries | No runtime tool registration changed in P25.1; future work had to define file archive/export and thumbnail target/cache/artifact contracts before enabling adapters |
| P25.2 | done | Define export.file binary archive contract | `command-runtime`, `mcp/docs`, `todo.md` | Completed 2026-06-29; command-runtime tests consume `export-file-contract-fixtures.json` and prove `libraryMode` maps to backend `include-libraries` / `embed-assets` request fields | Contract maps `export.file` to backend `export-binfile` RPC/SSE semantics, not exporter `export-shapes`; P25.5 later registers the MCP resource-return path |
| P25.3 | done | Implement CLI export.file backend-rpc stream/resource path | `penpot-cli`, `command-runtime`, `mcp/docs`, `todo.md` | Completed 2026-06-29; command-runtime tests, CLI smoke tests, and typecheck pass for dry-run, backend SSE resource return, `--output` download, adapter rejection, and missing-token errors | `penpot-cli export file` calls backend `export-binfile`, parses the SSE `end` resource URI, returns metadata, and writes the `.penpot` archive when requested; P25.5 later registers the MCP resource-return path |
| P25.4 | done | Define render.thumbnail target/cache/artifact contract | `command-runtime`, `mcp/docs`, `todo.md` | Completed 2026-06-29; command-runtime tests consume `render-thumbnail-contract-fixtures.json` and prove file/frame targets, cache keys, PNG dimensions, backend data/persist commands, and validation errors | Contract maps thumbnails to dashboard thumbnail data/render/cache semantics, not exporter `export-shapes`; P25.8 later adds the renderer-service planning adapter without enabling runtime execution |
| P25.5 | done | Register MCP export.file backend-rpc resource return | `mcp`, `command-runtime`, `mcp/docs`, `todo.md` | Completed 2026-06-29; `ExportFileTool` tests cover backend-rpc SSE resource return, string resource normalization, auth, adapter, incomplete stream, and missing resource errors; `PenpotRpcClient` tests cover SSE/Transit parsing and stream errors | MCP `export.file` calls backend `export-binfile`, parses SSE `end`, returns resource metadata plus `downloadUri`, and keeps local archive writes in CLI `--output` |
| P25.6 | done | Audit render.thumbnail executable runtime boundary | `mcp`, `frontend`, `render-wasm`, `exporter`, `mcp/docs`, `todo.md` | Completed 2026-07-01; command-runtime tests consumed `render-thumbnail-runtime-boundary-fixtures.json` and proved the descriptor was not executable while a renderer-service boundary was selected | Dedicated thumbnail renderer service is the future owner; MCP Node direct rendering is rejected, frontend worker/exporter paths are deferred, backend cache wrapper is insufficient, and tagged-frame resource URI normalization blocks execution |
| P25.7 | done | Define thumbnail renderer service API fixtures | `command-runtime`, `mcp/docs`, `todo.md` | Completed 2026-07-01; command-runtime tests consume `render-thumbnail-renderer-service-fixtures.json` and prove future renderer-service request/response fixtures align with the existing descriptor-only thumbnail contract | API fixtures cover file refresh, file cache reuse, tagged frame refresh, missing frame target errors, auth forwarding, resource URI normalization, and future MCP/CLI test contracts without registering execution |
| P25.8 | done | Add thumbnail renderer-service dry-run/client boundary | `command-runtime`, `penpot-cli`, `mcp/docs`, `todo.md` | Completed 2026-07-02; command-runtime tests cover `createRenderThumbnailRendererServicePlan`, and CLI smoke tests cover dry-run planning, unavailable execution, and unsupported adapter errors | `render.thumbnail` now exposes the `renderer-service` planning adapter and `penpot-cli render thumbnail --dry-run`; execution still returns `renderer_service_unavailable`, and no PNG rendering occurs |
| P25.9 | done | Add MCP render.thumbnail dry-run tool boundary | `mcp`, `command-runtime`, `mcp/docs`, `todo.md` | Completed 2026-07-02; MCP `RenderThumbnailTool` tests cover dry-run planning, unavailable execution, unsupported adapters, missing frame targets, and no network/backend calls | MCP `render.thumbnail` is now registered as planning-only and returns the shared renderer-service request metadata; `dryRun:false` reports `renderer_service_unavailable` and runtime rendering remains disabled |
| P25.10 | done | Add renderer-service availability and client configuration probes | `mcp`, `penpot-cli`, `command-runtime`, `mcp/docs`, `todo.md` | Completed 2026-07-02; command-runtime, MCP, and CLI tests cover endpoint, health endpoint, timeout, metadata-only probe status, unavailable execution payloads, and no runtime calls | `render.thumbnail` planning now reports renderer-service client configuration and availability as `configured-unverified` or `not-configured` without contacting the service or rendering PNG bytes |
| P25.11 | done | Define renderer-service execution response and resource metadata handling | `command-runtime`, `mcp`, `penpot-cli`, `mcp/docs`, `todo.md` | Completed 2026-07-02; command-runtime tests cover successful response normalization, media/resource/download URI derivation, local-file-write exclusion, and retryable service error payloads; MCP/CLI dry-run tests assert the response/error contracts are exposed | `thumbnail.render` response contracts are now defined, but MCP/CLI still do not contact renderer-service or enable PNG rendering |
| P25.12 | done | Add renderer-service execution client scaffold behind unavailable gate | `mcp`, `penpot-cli`, `command-runtime`, `mcp/docs`, `todo.md` | Completed 2026-07-02; command-runtime tests cover disabled client request scaffolding, POST metadata, MCP/CLI audit headers, caller-session auth forwarding names, body mapping to `serviceRequest`, and `dispatch:false`; MCP/CLI tests assert the scaffold is visible without network calls | Future renderer-service calls now have a shared request scaffold, but runtime execution remains unavailable and no HTTP dispatch occurs |
| P25.13 | done | Add renderer-service execution gate configuration and integration-test plan | `mcp`, `penpot-cli`, `command-runtime`, `mcp/docs`, `todo.md` | Completed 2026-07-02; command-runtime tests cover the closed execution gate, explicit opt-in env, endpoint/config readiness, integration-test blocker, failure modes, and `dispatch:false`; MCP/CLI tests assert dry-run and unavailable execution expose the gate without network calls | Future renderer-service dispatch now has an explicit closed gate and fixture-backed integration-test plan; no HTTP dispatch or renderer execution is enabled |
| P25.14 | done | Plan renderer-service health preflight and executable client harness | `mcp`, `penpot-cli`, `command-runtime`, `mcp/docs`, `todo.md` | Completed 2026-07-03; command-runtime tests cover disabled health preflight GET metadata, expected health response shape, failure modes, harness sequence ordering, integration-test plan, and `dispatch:false`; MCP/CLI tests assert dry-run and unavailable execution expose preflight/harness metadata without network calls | Future renderer-service execution now has a planned health preflight and executable client harness sequence, but metadata-only availability, preflight, and render dispatch all remain disabled |
| P25.15 | done | Design renderer-service executable dispatch adapter boundary | `mcp`, `penpot-cli`, `command-runtime`, `mcp/docs`, `todo.md` | Completed 2026-07-03; command-runtime tests cover disabled dispatch adapter boundary metadata, config precedence, gate/preflight consumption, result/error helper mapping, no-dispatch defaults, and `dispatch:false`; MCP/CLI tests assert dry-run and unavailable execution expose boundary metadata without network calls | Future renderer-service execution now has a dispatch adapter boundary contract, but metadata-only availability, health preflight, render POST, and local writes remain disabled |
| P25.16 | done | Plan renderer-service opt-in configuration surfaces | `mcp`, `penpot-cli`, `command-runtime`, `mcp/docs`, `todo.md` | Completed 2026-07-03; command-runtime tests cover opt-in source precedence, CLI/MCP/env/profile/backend surfaces, invalid value diagnostics, no-dispatch defaults, and gate integration; MCP/CLI tests assert dry-run and unavailable execution expose opt-in metadata without network calls | Future renderer-service execution now has documented opt-in config surfaces, but configuration alone cannot open the gate or enable dispatch |
| P25.17 | done | Plan renderer-service unavailable error taxonomy | `mcp`, `penpot-cli`, `command-runtime`, `mcp/docs`, `todo.md` | Completed 2026-07-03; command-runtime tests cover stable taxonomy codes, stages, retryability, payload fields, and `dispatch:false`; MCP/CLI tests assert dry-run and unavailable execution expose taxonomy metadata without network calls | Future renderer-service execution now has stable unavailable/preflight/dispatch/response/resource error taxonomy, but no renderer-service, backend, exporter, plugin, or local file dispatch is enabled |
| P25.18 | done | Plan renderer-service integration fixture harness | `mcp`, `penpot-cli`, `command-runtime`, `mcp/docs`, `todo.md` | Completed 2026-07-03; command-runtime tests cover no-dispatch harness cases, sequence, entrypoint expectations, fixture inputs, and `networkDispatch:false`; MCP/CLI tests assert dry-run and unavailable execution expose harness metadata without network calls | Future renderer-service execution now has a fixture harness contract for closed gate, health failure, render success, service failure, MCP metadata, CLI output, and token-safe auth before executable dispatch exists |
| P25.19 | done | Plan renderer-service executable dispatch registration preflight | `mcp`, `penpot-cli`, `command-runtime`, `mcp/docs`, `todo.md` | Completed 2026-07-03; command-runtime tests cover final readiness checks, blockers, registration plan, and hard-disabled `dispatch:false`/`networkDispatch:false`/`runtimeRegistration:false`; MCP/CLI tests assert dry-run and unavailable execution expose preflight metadata without network calls | Future renderer-service execution now has a final registration preflight checklist, but runtime dispatch remains disabled |
| P25.20 | done | Add disabled renderer-service executable adapter registration scaffold | `mcp`, `penpot-cli`, `command-runtime`, `mcp/docs`, `todo.md` | Completed 2026-07-03; command-runtime tests cover the no-op scaffold, consumed preflight/boundary/request metadata, service mirror, diagnostics, and hard-disabled `dispatch:false`/`networkDispatch:false`/`runtimeRegistration:false`/`localFileWrites:false`; MCP/CLI tests assert dry-run and unavailable execution expose scaffold metadata without network calls | Future renderer-service execution now has a disabled executable adapter registration scaffold, but runtime dispatch remains disabled |
| P25.21 | done | Plan disabled renderer-service adapter registry manifest | `mcp`, `penpot-cli`, `command-runtime`, `mcp/docs`, `todo.md` | Completed 2026-07-03; command-runtime tests cover metadata-only registry key, MCP/CLI entrypoint wiring, consumed scaffold/preflight/boundary metadata, and hard-disabled `dispatch:false`/`networkDispatch:false`/`runtimeRegistration:false`/`localFileWrites:false`; MCP/CLI tests assert dry-run and unavailable execution expose manifest metadata without network calls | Future renderer-service execution now has a disabled adapter registry manifest, but runtime dispatch remains disabled |
| P25.22 | done | Plan final disabled renderer-service enablement checklist | `mcp`, `penpot-cli`, `command-runtime`, `mcp/docs`, `todo.md` | Completed 2026-07-03; command-runtime tests cover final blocked gates, P25.17-P25.21 version linkage, required capabilities, readiness flags, and hard-disabled `dispatch:false`/`networkDispatch:false`/`runtimeRegistration:false`/`localFileWrites:false`; MCP/CLI tests assert dry-run and unavailable execution expose checklist metadata without network calls | Future renderer-service execution now has a final disabled enablement checklist, but runtime dispatch remains disabled |
| P25.23 | done | Audit concrete renderer-service implementation slice | `mcp`, `penpot-cli`, `command-runtime`, `mcp/docs`, `todo.md` | Completed 2026-07-03; command-runtime tests cover `implementationSliceAudit`, selected health/no-op contract slice, consumed P25.19-P25.22 metadata, audited surfaces, and hard-disabled `dispatch:false`/`networkDispatch:false`/`runtimeRegistration:false`/`localFileWrites:false`; MCP/CLI tests assert dry-run and unavailable execution expose audit metadata without network calls | Future renderer-service execution now has a concrete first implementation slice selected, but runtime dispatch remains disabled |
| P25.24 | done | Plan renderer-service health/no-op contract fixtures | `mcp`, `penpot-cli`, `command-runtime`, `mcp/docs`, `todo.md` | Completed 2026-07-04; command-runtime tests cover `healthNoopContractFixtures`, health OK/unavailable fixtures, no-op `thumbnail.render` response, consumed P25.23 metadata, service mirror, diagnostics, and hard-disabled `dispatch:false`/`networkDispatch:false`/`runtimeRegistration:false`/`localFileWrites:false`; MCP/CLI tests assert dry-run and unavailable execution expose fixture metadata without network calls | Future renderer-service execution now has health/no-op contract fixtures, but runtime dispatch remains disabled |
| P25.25 | done | Plan renderer-service no-op service host scaffold | `mcp`, `penpot-cli`, `command-runtime`, `mcp/docs`, `todo.md` | Completed 2026-07-04; command-runtime tests cover `noopServiceHostScaffold`, host package metadata, planned routes, config, lifecycle, observability, no-op guarantees, service mirror, diagnostics, and hard-disabled `hostStartup:false`/`dispatch:false`/`networkDispatch:false`/`runtimeRegistration:false`/`localFileWrites:false`; MCP/CLI tests assert dry-run and unavailable execution expose scaffold metadata without starting a process | Future renderer-service execution now has a no-op host scaffold, but runtime dispatch and host startup remain disabled |
| P25.26 | done | Plan renderer-service host lifecycle tests | `mcp`, `penpot-cli`, `command-runtime`, `mcp/docs`, `todo.md` | Completed 2026-07-04; command-runtime tests cover `hostLifecycleTestFixtures`, start/stop/readiness/supervision/log/error fixtures, consumed P25.24-P25.25 metadata, service mirror, diagnostics, and hard-disabled `processSpawn:false`/`hostStartup:false`/`networkDispatch:false`/`runtimeRegistration:false`/`localFileWrites:false`; MCP/CLI tests assert dry-run and unavailable execution expose lifecycle fixture metadata without starting a process | Future renderer-service execution now has host lifecycle test fixtures, but runtime dispatch and host startup remain disabled |
| P25.27 | done | Plan renderer-service package manifest scaffold | `mcp`, `penpot-cli`, `command-runtime`, `mcp/docs`, `todo.md` | Completed 2026-07-04; command-runtime tests cover `packageManifestScaffold`, future package metadata, planned scripts/exports/files, workspace integration flags, service mirror, diagnostics, and hard-disabled `packageCreated:false`/`workspaceMutation:false`/`scriptRunnable:false`/`dispatch:false`/`networkDispatch:false`/`runtimeRegistration:false`/`localFileWrites:false`; MCP/CLI tests assert dry-run and unavailable execution expose scaffold metadata without creating a package or runnable scripts | Future renderer-service execution now has package manifest scaffold metadata, but no package files, workspace manifests, lockfiles, or runnable scripts are created |
| P25.28 | done | Plan renderer-service package creation guardrails | `mcp`, `penpot-cli`, `command-runtime`, `mcp/docs`, `todo.md` | Completed 2026-07-04; command-runtime tests cover `packageCreationGuardrails`, required package creation checks, blocked package/workspace/runtime mutations, allowed/denied step lists, service mirror, diagnostics, and hard-disabled `packageCreated:false`/`workspaceMutation:false`/`scriptRunnable:false`/`hostStartup:false`/`processSpawn:false`/`dispatch:false`/`networkDispatch:false`/`runtimeRegistration:false`/`localFileWrites:false`; MCP/CLI tests assert dry-run and unavailable execution expose guardrails without creating package files or mutating workspace state | Future renderer-service execution now has package creation guardrails, but no package files, workspace manifests, lockfiles, runnable scripts, process startup, or runtime dispatch are created |
| P25.29 | done | Plan renderer-service package file templates | `mcp`, `penpot-cli`, `command-runtime`, `mcp/docs`, `todo.md` | Completed 2026-07-04; command-runtime tests cover `packageFileTemplates`, planned `package.json`, `tsconfig.json`, source, no-op host, test file template shapes, template matrix, service mirror, diagnostics, and hard-disabled `fileMaterialization:false`/`packageCreated:false`/`workspaceMutation:false`/`scriptRunnable:false`/`hostStartup:false`/`processSpawn:false`/`dispatch:false`/`networkDispatch:false`/`runtimeRegistration:false`/`localFileWrites:false`; MCP/CLI tests assert dry-run and unavailable execution expose templates without creating package files | Future renderer-service execution now has package file templates, but no package directory, workspace wiring, lockfile update, build output, process startup, or runtime dispatch is created |
| P25.30 | done | Plan renderer-service package workspace wiring | `mcp`, `penpot-cli`, `command-runtime`, `mcp/docs`, `todo.md` | Completed 2026-07-04; command-runtime tests cover `packageWorkspaceWiring`, planned workspace entry, root scripts, lockfile plan, workspace dependency filter, non-target files, service mirror, diagnostics, and hard-disabled `pnpmWorkspaceMutation:false`/`rootPackageJsonMutation:false`/`lockfileMutation:false`/`workspaceMutation:false`/`packageCreated:false`/`scriptRunnable:false`/`fileMaterialization:false`/`dispatch:false`/`networkDispatch:false`/`runtimeRegistration:false`/`localFileWrites:false`; MCP/CLI tests assert dry-run and unavailable execution expose wiring without editing manifests or lockfiles | Future renderer-service execution now has package workspace wiring metadata, but no workspace entry, root script, lockfile update, package files, build output, process startup, or runtime dispatch is created |
| P25.31 | done | Plan renderer-service package build verification | `mcp`, `penpot-cli`, `command-runtime`, `mcp/docs`, `todo.md` | Completed 2026-07-04; command-runtime tests cover `packageBuildVerification`, planned filtered build/type-check/test commands, expected dist artifacts, blocked readiness, service mirror, diagnostics, and hard-disabled `commandExecution:false`/`buildOutput:false`/`packageScriptsRunnable:false`/`processSpawn:false`/`packageCreated:false`/`workspaceMutation:false`/`scriptRunnable:false`/`fileMaterialization:false`/`dispatch:false`/`networkDispatch:false`/`runtimeRegistration:false`/`localFileWrites:false`; MCP/CLI tests assert dry-run and unavailable execution expose verification metadata without running package scripts or emitting build output | Future renderer-service execution now has package build verification metadata, but no package files, filtered commands, dist output, process startup, workspace mutation, or runtime dispatch is created |
| P25.32 | pending | Plan renderer-service package materialization checklist | `mcp`, `penpot-cli`, `command-runtime`, `mcp/docs`, `todo.md` | Not started | Define the final metadata-only checklist before creating renderer-service package files |
