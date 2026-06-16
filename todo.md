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
`--output` writes. Grid/full layout editing remains plugin-live. D3/P12.3 is
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
the remaining product gaps. Current active work moves to P15.2 to define the
next implementation wave before product behavior expands again. P15.2 selected
Wave H / Phase 16 for CLI configuration convergence and distribution hardening.
Current active work moves to P16.1 to audit the authenticated CLI profile-config
read path before implementation.

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
| F23 | todo | CLI configuration convergence and distribution hardening | Phase 16 | `penpot-cli` can inspect the same saved MCP config that Penpot uses and has a clearer path toward portable local use | P16.1 is the active task for auditing the authenticated profile-config read path and precedence contract |

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
| B2 | Move status/config/file/page descriptors into command runtime | `mcp/packages/command-runtime`, `mcp/packages/server`, `penpot-cli` | Shared descriptors define names, input metadata, adapter hints, and transport labels for low-risk commands | MCP and CLI keep existing public names; descriptor tests pass |
| B3 | Add shared request/result envelopes | `command-runtime`, `mcp`, `penpot-cli` | Completed 2026-06-15; MCP tools and CLI commands use the same internal envelope for adapter, target, auth, and diagnostics metadata | Existing CLI JSON output and MCP tool responses remain backward compatible |
| B4 | Centralize adapter errors and selection reasons | `command-runtime`, `mcp`, `penpot-cli` | Completed 2026-06-15; backend unavailable, auth missing, file context required, unsupported adapter, and destructive confirmation errors use shared codes | MCP server tests and CLI no-service smoke tests pass |
| B5 | Move shape/export descriptors after envelope migration | `command-runtime`, `mcp`, `penpot-cli`, `exporter` | Completed 2026-06-15; higher-risk write/export commands use shared descriptors without changing behavior | Shape/create/update/delete and export dry-run tests pass |
| B6 | Add command runtime descriptor tests | `command-runtime`, `mcp`, `penpot-cli` | Completed 2026-06-15; descriptor snapshots and adapter-selection tests protect the migrated command catalog | Runtime, CLI, and MCP no-service smoke coverage pass |

### Wave C: Expand Headless Authoring (Complete)

| Order | Task | Modules | Output | Verification |
| --- | --- | --- | --- | --- |
| C1 | Add headless page rename metadata path | `backend`, `common`, `mcp`, `penpot-cli` | Completed 2026-06-15; page rename works through backend-command for explicit file/page targets | Backend/common tests plus MCP/CLI command tests cover success and permission errors |
| C2 | Expand headless shape styling and hierarchy | `backend`, `common`, `mcp`, `penpot-cli` | Completed 2026-06-15; backend-command `shape.update` covers fill/stroke stacks, independent radius, parent/frame placement, and frame layout `none|flex`; grid remains plugin-live | Common/backend plus MCP/CLI tests cover style, hierarchy, supported layout mapping, and unsupported grid adapter errors |
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
| H1 | Audit CLI profile config read path and precedence | `penpot-cli`, `backend`, `frontend`, `mcp/docs` | Active via P16.1; contract identifies how CLI can read authenticated profile props, how env/flags override saved values, and how offline/no-token fallback behaves | Audit doc or architecture section maps RPC/status/token surfaces, precedence, errors, and test fixtures before code changes |
| H2 | Add authenticated `penpot-cli mcp config` profile source | `penpot-cli`, `backend`, `mcp/docs` | CLI can optionally read saved `profile.props.mcp-config` from Penpot when a token/backend URI is supplied, while preserving current env-derived output | CLI JSON/text tests cover profile source, env/flag precedence, missing auth, network failure, and legacy env-only mode |
| H3 | Add canonical MCP URL derivation contract fixtures | `frontend`, `penpot-cli`, `mcp/docs` | Frontend and CLI derivation stay aligned through shared cases for built-in, custom, local, partial, invalid, and reset configs | Frontend and CLI tests consume the same fixture expectations or equivalent golden cases |
| H4 | Harden `dev up --mcp` host/hybrid planning | `penpot-cli`, `mcp/docs` | Host and hybrid modes report actionable dependency checks, service plan, port ownership, and unsupported startup boundaries instead of placeholder guidance | CLI smoke tests cover host/hybrid dry-runs and missing dependency diagnostics |
| H5 | Define portable CLI release archive path | `penpot-cli`, `mcp/packages/command-runtime`, root scripts, `mcp/docs` | Release archive strategy includes CLI plus command-runtime dependency layout, install verification, and version compatibility notes | Packaging check verifies archive contents or explicitly documented release layout without relying on global workspace links |

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
| P11.2 | done | Expand headless shape styling and hierarchy | `backend`, `common`, `mcp`, `penpot-cli` | Completed 2026-06-15; generated frames/rect/text support fill/stroke stacks, independent corner radii, parent changes, and frame layout `none|flex` through backend-command | Grid/full layout remains plugin-live until a dedicated backend track/cell contract exists |
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
| P16.1 | in_progress | Audit CLI profile config read path and precedence | `penpot-cli`, `backend`, `frontend`, `mcp/docs` | Contract maps authenticated profile reads, env/flag precedence, offline fallback, and test fixtures before code changes | Start by checking existing profile RPC surfaces, CLI token/backend config, frontend derivation rules, and current `mcp config` JSON shape |
| P16.2 | todo | Add authenticated `mcp config` profile source | `penpot-cli`, `backend`, `mcp/docs` | CLI tests cover profile-source success, env/flag overrides, missing auth, network failure, and legacy env-only mode | Preserve current no-network behavior unless the user asks CLI to read from Penpot |
| P16.3 | todo | Add canonical MCP URL derivation contract fixtures | `frontend`, `penpot-cli`, `mcp/docs` | Frontend and CLI tests share or mirror golden cases for built-in, custom, local, partial, invalid, and reset configs | Prefer fixture-backed cross-language parity over forcing one runtime helper across TS and CLJS |
| P16.4 | todo | Harden `dev up --mcp` host/hybrid planning | `penpot-cli`, `mcp/docs` | CLI smoke tests cover host/hybrid dry-runs, dependency diagnostics, service surfaces, and unsupported startup boundaries | Do not start host/hybrid services until dependency and port checks are explicit |
| P16.5 | todo | Define portable CLI release archive path | `penpot-cli`, `mcp/packages/command-runtime`, root scripts, `mcp/docs` | Packaging check verifies archive contents or documented install layout without relying on global workspace links | Keep private checkout install path supported during fork development |

## Next Recommended Sprint

Use `mcp/docs/penpot-cli-overall-blueprint.md` as the current architecture
baseline and the Detailed Upcoming Task Queue as the execution order. Continue
with P16.1:

1. Audit the existing profile-prop read surfaces, CLI backend/token options,
   frontend effective-config derivation, and `mcp config` JSON/text output.
2. Define the exact precedence order for CLI flags, environment variables,
   authenticated profile values, runtime defaults, and offline fallback.
3. Record the command contract and fixture cases needed before implementing
   authenticated profile-backed `penpot-cli mcp config`.
