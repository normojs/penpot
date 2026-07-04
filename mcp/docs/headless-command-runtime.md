# Headless Command Runtime

Status: P7.5 shared adapter selection helper implemented for CLI page/export
commands and MCP page tools.

This document defines the transport-neutral command runtime that will let MCP
tools and `penpot-cli` share command names, schemas, adapter selection, and
structured results without making either entry point own the implementation.

## Goals

- Keep MCP tools and CLI commands as thin entry adapters.
- Move stable operations toward headless execution when a browser tab is not
  required.
- Preserve the live plugin path for operations that need current UI state,
  selection, or plugin-only APIs.
- Make adapter availability explicit in command responses.
- Share command names with the first-class MCP tool names already defined in
  `mcp/packages/server/src/ToolNames.ts`.

## Non-Goals

- Do not replace the backend RPC API in the first slice.
- Do not make backend or common depend on TypeScript packages.
- Do not remove plugin-backed tools while headless coverage is incomplete.
- Do not implement Phase 8 audit, limits, or confirmation policy here.

## Package Boundary

The runtime should live outside both MCP server internals and `penpot-cli`.

Package:

```text
command-runtime/
  package.json             # package name: @penpot/command-runtime
  index.js                 # first shared adapter-selection helper
  index.d.ts               # shared adapter-selection types
```

Workspace wiring:

- `./command-runtime` is included in the root `pnpm-workspace.yaml`.
- `../command-runtime` is included in `mcp/pnpm-workspace.yaml` so the MCP
  server can consume the same package during this fork's development.
- Keep `penpot-cli` depending on `@penpot/command-runtime`, not on
  `mcp/packages/server`.
- Keep backend/common implementation in Clojure and expose it through backend
  command/RPC adapters; TypeScript runtime code should call those surfaces
  instead of importing Clojure code.
- Keep future renderer-service package wiring as command-runtime planning
  metadata until an explicit implementation task materializes it. P25.30 plans
  the eventual `renderer-service` workspace entry, root scripts, lockfile
  touchpoints, and `@penpot/renderer-service` workspace filter, and P25.31
  plans filtered build, type-check, and test verification while keeping
  `pnpmWorkspaceMutation:false`, `rootPackageJsonMutation:false`,
  `lockfileMutation:false`, `workspaceMutation:false`, `packageCreated:false`,
  `scriptRunnable:false`, `fileMaterialization:false`, `commandExecution:false`,
  `buildOutput:false`, `processSpawn:false`, `materializationApproved:false`,
  `dispatch:false`,
  `networkDispatch:false`, `runtimeRegistration:false`, and
  `localFileWrites:false`; no workspace manifests, lockfiles, root
  `package.json`, package files, package scripts, or `dist` outputs are edited
  or produced in those planning steps.

Ownership by module:

| Module | Responsibility |
| --- | --- |
| `command-runtime/` | Command descriptors, request/result envelopes, adapter registry, shared TypeScript helpers |
| `mcp/packages/server` | MCP protocol binding, session context mapping, plugin-live adapter wiring |
| `penpot-cli` | argv parsing, environment config, text/JSON formatting, process exit codes |
| `backend` | authenticated headless commands and backend RPC compatibility |
| `common` | canonical file data validation and shape/page data helpers |
| `exporter` | headless export/render adapter |
| `mcp/packages/plugin` | live workspace adapter for UI-bound commands |

## Command Descriptor

Each command is described with a JSON-serializable descriptor. Runtime
descriptors should not import MCP protocol types or CLI parser types.

```ts
type CommandScope = "global" | "file" | "selection" | "local";
type CommandMutation = "read" | "write" | "export" | "process";
type CommandStability = "stable" | "experimental" | "planned";

type CommandAdapterKind =
  | "backend-rpc"
  | "backend-command"
  | "plugin-live"
  | "exporter"
  | "renderer-service"
  | "browser-url"
  | "local-fs";

interface CommandDescriptor {
  name: string;
  version: number;
  title: string;
  description: string;
  scope: CommandScope;
  mutation: CommandMutation;
  stability: CommandStability;
  inputSchemaId: string;
  outputSchemaId: string;
  auth: {
    userToken: "required" | "optional" | "none";
  };
  context: {
    file: "required" | "optional" | "none";
    selection: "required" | "optional" | "none";
    liveWorkspace: "required" | "optional" | "none";
  };
  capabilities: string[];
  adapters: CommandAdapterDescriptor[];
}

interface CommandAdapterDescriptor {
  kind: CommandAdapterKind;
  status: "available" | "planned" | "disabled";
  priority: number;
  requires: string[];
  notes?: string[];
}
```

Capability strings are runtime routing hints, not a standalone authorization
system. Normal Penpot permissions still come from backend RPC/command handlers
or the authenticated live workspace session.

Suggested capability names:

```text
account:read
team:read
project:read
file:read
file:create
file:open-url
file:live-context
page:read
page:write
shape:write-basic
prototype:write-basic
export:page
export:shape
render:preview
local:read-file
local:write-file
```

## Execution Envelope

Every MCP tool and CLI command should eventually normalize to a
`CommandRequest`.

```ts
interface CommandRequest<TInput = unknown> {
  requestId: string;
  command: string;
  input: TInput;
  context: CommandExecutionContext;
  options?: CommandExecutionOptions;
}

interface CommandExecutionContext {
  actor?: {
    userId?: string;
    userToken?: string;
    source: "mcp" | "cli" | "system";
  };
  target?: {
    teamId?: string;
    projectId?: string;
    fileId?: string;
    pageId?: string;
    selectionIds?: string[];
  };
  liveContext?: {
    contextId?: string;
    ownerTabId?: string;
    capabilities?: string[];
  };
  services?: {
    backendUri?: string;
    publicUri?: string;
    exporterUri?: string;
  };
}

interface CommandExecutionOptions {
  adapter?: CommandAdapterKind | "auto";
  dryRun?: boolean;
  outputPath?: string;
  timeoutMs?: number;
}
```

Runtime responses use one envelope for success and failure. Entry adapters can
format the same object as MCP JSON content, CLI JSON, or CLI text.

```ts
type CommandResponse<TOutput = unknown> =
  | CommandSuccess<TOutput>
  | CommandFailure;

interface CommandSuccess<TOutput> {
  status: "ok";
  command: string;
  requestId: string;
  adapter: CommandAdapterKind;
  data: TOutput;
  warnings?: string[];
  nextActions?: string[];
  diagnostics?: Record<string, unknown>;
}

interface CommandFailure {
  status: "error";
  command: string;
  requestId: string;
  adapter?: CommandAdapterKind;
  error: {
    code: string;
    message: string;
    actions: string[];
    data?: unknown;
  };
  diagnostics?: Record<string, unknown>;
}
```

Baseline error codes:

| Code | Meaning |
| --- | --- |
| `command_not_found` | No descriptor exists for the requested command |
| `command_input_invalid` | Input failed schema validation |
| `authentication_required` | The selected command requires a user token |
| `file_context_required` | The command needs a bound live file context |
| `adapter_not_available` | No enabled adapter can execute this command now |
| `adapter_not_supported` | The requested adapter does not support this command |
| `penpot_backend_unavailable` | Backend adapter could not reach Penpot backend |
| `penpot_rpc_error` | Backend RPC returned an unclassified error |
| `exporter_unavailable` | Exporter adapter could not reach exporter/rendering service |

## Adapter Selection

Adapter selection is deterministic:

1. Validate the command name and input schema.
2. Build available adapter candidates from the descriptor.
3. If `options.adapter` is explicit, use only that adapter and return
   `adapter_not_supported` or `adapter_not_available` when it cannot run.
4. If `options.dryRun` is true, return the selected plan without mutating data.
5. Filter candidates by auth, required context, service configuration, and
   live workspace availability.
6. Sort candidates by priority and execute the first available adapter.
7. Include the chosen adapter and relevant diagnostics in the response.

The P7.5 selection object is:

```ts
interface CommandAdapterSelection {
  command: string;
  requested: CommandAdapterKind | "auto";
  selected: CommandAdapterKind | null;
  status: "selected" | "unsupported" | "unavailable";
  candidates: Array<{
    kind: CommandAdapterKind;
    available: boolean;
    priority: number;
    reason: string | null;
  }>;
  fallbacks: Array<{
    kind: CommandAdapterKind;
    available: boolean;
    reason: string | null;
  }>;
}
```

Entry adapters keep the legacy `adapter` field for compatibility and add
`adapterSelection` for scripts and MCP clients that need requested/selected
adapter and fallback details.

Initial priority guidance:

| Command family | Preferred adapter | Fallback |
| --- | --- | --- |
| Account/team/project/file reads | `backend-rpc` | none |
| File create | `backend-rpc` now, `backend-command` later | none |
| File open URL | `browser-url` | none |
| Page reads/writes | `backend-command` when available | `plugin-live` |
| Basic shape writes | `backend-command` when available | `plugin-live` |
| Prototype writes | `backend-command` when available | `plugin-live` |
| Page/file export | `exporter` when available | `plugin-live` |
| Selection export | `plugin-live` | none until selection can be represented headlessly |

## Initial Command Set

These commands should be the first descriptors moved into the runtime because
they already exist in MCP, CLI, or both.

| Command | Scope | Current path | P7 target adapter |
| --- | --- | --- | --- |
| `account.get_current_user` | global | MCP backend RPC | `backend-rpc` |
| `team.list` | global | MCP backend RPC | `backend-rpc` |
| `project.list` | global | MCP backend RPC | `backend-rpc` |
| `file.list` | global | MCP and CLI backend RPC | `backend-rpc` |
| `file.create` | global | MCP and CLI backend RPC | `backend-rpc`, then `backend-command` |
| `file.open` | global | CLI browser URL | `browser-url` |
| `page.list` | file | MCP plugin task, backend `get-file-pages` RPC | `backend-command`, fallback `plugin-live` |
| `page.create` | file | MCP plugin task, backend `create-file-page` RPC | `backend-command`, fallback `plugin-live` |
| `shape.create_frame` | file | MCP plugin task, backend `create-file-shape` RPC | `backend-command`, fallback `plugin-live` |
| `shape.create_rect` | file | MCP plugin task, backend `create-file-shape` RPC | `backend-command`, fallback `plugin-live` |
| `shape.create_text` | file | MCP plugin task, backend `create-file-shape` RPC | `backend-command`, fallback `plugin-live` |
| `shape.update` | file | MCP plugin task, backend `update-file-shape` RPC | `backend-command`, fallback `plugin-live` |
| `shape.set_layout` | file | MCP/CLI alias over `shape.update.layout`, backend `update-file-shape` RPC | `backend-command`, fallback `plugin-live` |
| `shape.set_style` | file | MCP/CLI alias over `shape.update` style/text fields, backend `update-file-shape` RPC | `backend-command`, fallback `plugin-live` |
| `shape.delete` | file | MCP plugin task, backend `delete-file-shape` RPC | `backend-command`, fallback `plugin-live` |
| `export.page` | file | MCP plugin task, CLI exporter execution | `exporter`, fallback `plugin-live` |
| `export.file` | file | MCP and CLI backend `export-binfile` RPC/SSE execution | `backend-rpc`; MCP returns resource metadata, CLI can write the archive with `--output` |
| `render.preview` | file | MCP plugin task, MCP/CLI exporter preview execution | `exporter`, fallback `plugin-live` |
| `render.thumbnail` | file | Dashboard thumbnail data/render/cache contract plus renderer-service API fixtures and MCP/CLI dry-run/client boundaries | `renderer-service` planning adapter only; runtime execution unavailable until a renderer-service implementation, file cache probe, and tagged-frame source/resource capabilities exist |

## Schema Strategy

The runtime package should own TypeScript input/output types for entry adapters.
The backend/common code should continue to own Malli validation for persisted
Penpot file data.

Practical approach:

1. Start with runtime TypeScript descriptors and schemas for MCP/CLI inputs.
2. Keep backend RPC adapter mapping explicit: runtime input names are camelCase,
   backend RPC parameters remain the existing kebab-case names.
3. When P7.2 adds backend/common headless handlers, define Malli schemas at the
   backend boundary and return the same JSON result envelope shape.
4. Add schema ids to descriptors so docs, MCP tool schemas, and CLI validation
   can refer to the same logical contract even when TS and Malli implementations
   are separate.

Example schema ids:

```text
penpot.command.file.create.input.v1
penpot.command.file.summary.v1
penpot.command.export.page.input.v1
penpot.command.export.summary.v1
```

## Entry Adapter Mapping

MCP tool execution:

```text
MCP request
  -> Tool input validation
  -> CommandRequest(context.source = "mcp")
  -> CommandRuntime.execute()
  -> ToolResponse JSON envelope
```

CLI execution:

```text
argv/env
  -> CLI parser
  -> CommandRequest(context.source = "cli")
  -> CommandRuntime.execute()
  -> text or JSON formatter
  -> process exit code
```

Backend headless execution:

```text
CommandRuntime backend-command adapter
  -> authenticated backend endpoint/RPC
  -> common file data validation
  -> JSON CommandResponse-compatible result
```

Plugin-live execution:

```text
CommandRuntime plugin-live adapter
  -> bound FileContextRegistry context
  -> PluginBridge task
  -> PluginTaskResult mapped into CommandSuccess
```

Exporter execution:

```text
CommandRuntime exporter adapter
  -> exporter/render request
  -> file/page/shape target resolution
  -> export summary and output bytes/path/base64
```

## P7 Implementation Order

1. Add `command-runtime/` with descriptors, request/result types, adapter
   registry, and dry-run planner.
2. Move `file.list`, `file.create`, and `file.open` wrappers to call the
   runtime from both MCP and CLI while keeping the existing backend RPC calls.
3. Add `page.list` and `page.create` descriptors with `plugin-live` execution
   first, then introduce backend/common handlers in P7.2.
4. Add basic shape descriptors for frame, rectangle, text, and image creation.
5. Add exporter adapter descriptors for `export.page` and `render.preview`.
6. Add adapter selection reporting to MCP status and CLI JSON results.

## P7.2 Backend/Common Slice

The P7.2 implementation slice adds the backend/common page command surface and
wires the first entry adapters to it:

- `app.common.files.headless/page-summaries`
- `app.common.files.headless/create-page-request`
- backend RPC `get-file-pages`
- backend RPC `create-file-page`
- MCP `page.list` / `page.create` with optional `fileId`
- CLI `penpot-cli page list/create --file <file-id>`

`create-file-page` deliberately reuses the existing backend `update-file`
pipeline instead of mutating file data directly. That keeps permission checks,
file locks, feature validation, revision changes, file-change rows, cache
invalidation, and notifications aligned with normal workspace edits.

MCP `page.list` and `page.create` now choose the backend-command path when
`fileId` is supplied and keep the plugin-live path when callers rely on the
currently bound workspace context. CLI page commands always require `--file`
and call the same backend RPC commands. This is an incremental adapter slice:
responses disclose `backend-command` or `plugin-live`, while the future
`command-runtime/` package still needs to centralize descriptors and selection.

## P11.1 Headless Page Rename Slice

P11.1 extends the page command surface with headless page rename metadata:

- `app.common.files.headless/rename-page-request`
- backend RPC `rename-file-page`
- MCP `page.rename` selects `backend-command` when callers provide `fileId`
  and keeps `plugin-live` for the currently bound workspace context.
- CLI `penpot-cli page rename --file <file-id> --page <page-id> --name <name>`
  calls backend `rename-file-page` directly.

The common helper trims the requested name, rejects blank names with
`:page-name-required`, validates the target page, and emits a standard
`:mod-page` change. The backend command reuses the normal update pipeline, so
permission checks, file locks, feature validation, revision changes,
file-change rows, notifications, and audit context stay aligned with other
headless writes.

## Acceptance Checks

P7.1 is complete when:

- The runtime contract is documented.
- The package boundary avoids MCP-server and CLI ownership.
- Request/result envelopes cover auth, context, capabilities, adapter choice,
  dry-run, structured success, and structured error.
- The first command migration list is explicit enough for P7.2 and P7.4 work.

P7.2 is complete when:

- Backend/common expose page list/create commands that work without an open
  workspace tab.
- MCP `page.list` and `page.create` can use `backend-command` by file id and
  still fall back to `plugin-live` for the bound workspace flow.
- `penpot-cli page list/create --file <file-id>` returns text or JSON output
  through the backend-command path.

## P7.3 Backend/Common Shape Slice

The P7.3 backend/common slice adds the first headless shape write command:

- `app.common.files.headless/create-shape-request`
- `app.common.files.headless/shape-summary`
- backend RPC `create-file-shape`

`create-file-shape` supports `frame`, `rect`, and `text` creation on an
explicit page. It validates the target page and parent frame, creates canonical
Penpot shape data through `app.common.types.shape/setup-shape`, and persists the
result through the normal `update-file` pipeline with a single `:add-obj`
change. The first slice deliberately excluded image upload, layout setup,
shape updates, and deletes. P7.7 adds simple backend/common update/delete
coverage; P11.2 adds the backend-safe frame layout subset (`none` and `flex`);
P11.3 adds `create-file-image-shape`, which decodes base64 image bytes, reuses
the existing media upload/storage path, persists `:add-media` plus `:add-obj`,
and returns both shape and media metadata. Grid/full layout editing remains
plugin-live until dedicated backend coverage exists.

P7.3 is complete when:

- Backend/common can create top-level frames and child rectangles/text shapes
  without an open workspace tab.
- The backend command returns a stable shape summary plus revision metadata.
- Common and backend tests cover generated changes and persistence through
  `get-file`.

## P7.4 Exporter Plan Slice

The first exporter-backed slice keeps real execution disabled but makes the
headless export contract explicit for CLI callers. `penpot-cli export page`
now plans the `exporter` adapter instead of a generic live MCP adapter and
requires the smallest target that the current exporter can render without
workspace state:

```text
fileId + pageId + objectId
```

The object id should be the page root frame, a board, or another exportable
shape on the page. The exporter HTTP handler does not know about current
selection, current page, or bound workspace context, so those values must not
be inferred by the headless path.

The planned direct exporter request maps to the existing exporter command:

```clojure
{:cmd :export-shapes
 :wait true
 :profile-id <profile-id>
 :exports [{:file-id <file-id>
            :page-id <page-id>
            :object-id <object-id>
            :type :png
            :suffix ""
            :scale 1
            :name "page"}]}
```

CLI dry-run output reports the exporter URI, HTTP method, required
`application/transit+json` request/response format, `auth-token` cookie name,
the planned payload, and missing runtime fields such as `profileId`.

Important behavior differences from the plugin-live export path:

- Exporter-backed output uploads a rendered temporary file through backend
  management APIs and returns resource metadata.
- Plugin-live MCP export currently returns base64 data from the live Plugin API
  context.
- Selection export remains plugin-live because no stable headless selection
  representation exists yet.

P7.4 is complete when:

- CLI dry-runs disclose `adapter: "exporter"` and the planned direct exporter
  request.
- CLI requires explicit file, page, and object ids for exporter planning.
- Docs describe exporter resource metadata separately from plugin-live base64
  output.

## P7.5 Shared Adapter Selection Slice

P7.5 adds the first concrete `@penpot/command-runtime` package. The initial
package is deliberately small: it exports `selectCommandAdapter` plus shared
adapter-selection types. It does not yet own full command descriptors,
request/result envelopes, or execution dispatch.

Implemented entry adapters:

- `penpot-cli page list/create` select `backend-command` and report
  `plugin-live` as an unavailable CLI fallback.
- `penpot-cli export page --dry-run` selects `exporter` and reports
  `plugin-live` as an unavailable CLI fallback.
- MCP `page.list` and `page.create` select `backend-command` when `fileId` is
  supplied and `plugin-live` when callers rely on the bound workspace context.
- MCP page tools accept optional `adapter` requests and return
  `adapter_not_supported` or `adapter_not_available` before execution when the
  request cannot be satisfied.

P7.5 is complete when:

- Both root and MCP pnpm workspaces can resolve `@penpot/command-runtime`.
- CLI page/export JSON output includes `adapterSelection`.
- MCP page tool responses include `adapterSelection`.
- MCP tests cover backend-command selection and unsupported explicit adapters.

## P7.6 Headless Shape Entry Adapter Slice

P7.6 wires the existing backend `create-file-shape` command into the TypeScript
entry adapters:

- MCP `shape.create_frame`, `shape.create_rect`, and `shape.create_text` choose
  `backend-command` when `fileId` and `pageId` are supplied.
- The same MCP tools keep `plugin-live` fallback when callers omit explicit
  file/page targets and rely on the bound workspace context.
- `penpot-cli shape create-frame`, `shape create-rect`, and
  `shape create-text` call backend `create-file-shape` directly and report
  `adapterSelection` in JSON output.

The backend-command shape contract is:

```text
fileId + pageId + type + x + y + width + height
```

`shapeId`, `parentId`, `name`, `fill`, `stroke`, `borderRadius`, `content`, and
`fontSize` are optional depending on shape type. Text creation requires
`content`. Rectangles and text layers can use `parentId` to target an existing
frame. Top-level frames should omit `parentId`.

P7.6 is complete when:

- MCP shape create tools can use backend-command for explicit file/page
  targets and still preserve plugin-live behavior for bound workspace calls.
- CLI can create frame, rectangle, and text shapes through backend-command.
- MCP tests cover backend request mapping and incomplete backend targets.

## P7.7 Backend/Common Shape Update/Delete Slice

P7.7 adds backend/common support for revising or removing simple generated
shapes without a live workspace tab:

- `app.common.files.headless/update-shape-request`
- `app.common.files.headless/delete-shape-request`
- backend RPC `update-file-shape`
- backend RPC `delete-file-shape`

`update-file-shape` supports `frame`, `rect`, and `text` targets. It accepts a
file id, a shape id, an optional page id, and patch fields for `name`, `x`, `y`,
`width`, `height`, `fill`, `stroke`, `borderRadius`, `content`, and `fontSize`.
P11.2 expands the same command with `fills`, `strokes`, `r1`, `r2`, `r3`,
`r4`, `parentId`, and `index` for backend-command style stacks, independent
corner radii, and parent frame movement. It also supports backend-safe frame
layout updates for `layout.type = none | flex`, including flex direction, wrap,
align-items, justify-content, row/column gap, and uniform padding. Grid layout
metadata remains plugin-live because it requires track and cell structures that
need a dedicated backend contract. The common helper resolves a missing page id
by scanning the file's page order, rejects unsupported/root shapes, recalculates
`selrect` and `points` for geometry patches, persists style/text/layout updates
through the normal `:mod-obj` change path, and emits `:mov-objects` for parent
changes. Text `content`, `fontSize`, `fill`, and `fills` updates rewrite the
text content tree while preserving existing text when only style fields are
passed.

`delete-file-shape` resolves the same target shape and persists a standard
`:del-obj` change, allowing the existing file-change processor to remove the
shape from its parent children list.

P7.7 is complete when:

- Common tests cover geometry/style updates, text updates, and delete changes.
- Backend tests cover persisted rectangle updates, text updates, and deletion
  through RPC.
- MCP and `penpot-cli` entry adapters remain plugin-live for update/delete until
  the next adapter wiring slice.

## P7.8 Shape Update/Delete Entry Adapter Slice

P7.8 wires the P7.7 backend commands into the TypeScript entry adapters:

- MCP `shape.update` selects `backend-command` when callers provide `fileId`
  and `shapeId`. `pageId` is optional because the backend can resolve the shape
  by scanning file pages.
- MCP `shape.delete` uses the same explicit backend target contract.
- MCP update/delete calls without explicit `fileId` / `pageId` continue to use
  plugin-live and the currently bound workspace context.
- `penpot-cli shape update` calls backend `update-file-shape` directly.
- `penpot-cli shape delete` calls backend `delete-file-shape` directly.

The backend-command update contract is:

```text
fileId + shapeId + optional pageId + at least one simple update field
```

Supported update fields are `name`, `x`, `y`, `width`, `height`, `fill`,
`fills`, `stroke`, `strokes`, `borderRadius`, `r1`, `r2`, `r3`, `r4`,
`parentId`, `index`, `content`, and `fontSize`. Layout updates remain
plugin-live because the backend/common headless path still deliberately avoids
partial flex/grid writes.

When `fills` or `strokes` are supplied, they override the legacy single `fill`
or `stroke` value. `borderRadius` sets all four corners first, and explicit
`r1` through `r4` values override individual corners. `parentId` moves a shape
to another frame/root through `:mov-objects`; `index` is only meaningful
together with `parentId`. Headless frame updates remain top-level only.

P7.8 is complete when:

- MCP update/delete tools report backend-command adapter metadata for explicit
  file targets.
- CLI shape update/delete commands return script-friendly text/JSON output with
  `adapterSelection`.
- MCP and CLI checks cover backend request mapping and help output.

Later P17/P21 slices expanded this surface: backend-command `shape.update` now
supports the frame layout container subset for `none`, `flex`, and `grid`, and
`penpot-cli shape set-layout` / `shape set-style` are thin aliases over the
same update request builder for layout-only and style/text-only scripts.

## P7.9 Exporter Execution Slice

P7.9 turns the exporter dry-run plan into the first real CLI execution path.
`penpot-cli export page` still requires explicit `fileId`, `pageId`, and
`objectId`, but omitting `--dry-run` now posts the planned Transit JSON payload
directly to the exporter HTTP service.

Execution behavior:

- The CLI encodes the fixed exporter request as `application/transit+json`,
  including keyword fields for `cmd` and `exports[].type` and UUID-tagged file,
  page, object, and profile ids.
- The exporter request uses `Cookie: auth-token=<token>` so the renderer can
  load the file through the normal Penpot session path.
- If `--profile-id` or `PENPOT_PROFILE_ID` is not supplied, the CLI resolves it
  through backend `get-profile` with the same token before calling exporter.
- The exporter response is decoded from Transit JSON into script-friendly JSON.
- Without `--output`, the CLI returns exporter resource metadata such as
  `id`, `uri`, `mtype`, and `filename`.
- With `--output`, the CLI downloads the returned resource URI and writes the
  rendered bytes to the requested path, while still reporting the metadata.

Important limitations:

- The command still does not infer live selection or current page state.
- Local byte downloads rely on the public Penpot gateway serving
  `/assets/by-id/<id>`; direct backend-only asset responses may return
  `x-accel-redirect` metadata instead of bytes.
- Exporter execution is session-token oriented because the renderer opens the
  frontend with an `auth-token` cookie.

P7.9 is complete when:

- `penpot-cli export page --dry-run` continues to report the exporter plan.
- `penpot-cli export page` posts to exporter when `--dry-run` is omitted.
- JSON/text output reports adapter metadata and exporter resource metadata.
- `--output` downloads the returned resource bytes when the public asset route
  serves them.

P11.5 extends the exporter adapter to previews:

- `render.preview` selects exporter for explicit MCP `fileId`/`pageId`/`objectId`
  targets and keeps plugin-live for bound workspace page, shape, or selection
  previews.
- `penpot-cli render preview` uses exporter `export-shapes` with PNG output,
  reports `artifact.kind: "preview"`, and writes bytes with `--output`.
- MCP tests cover exporter resource metadata, plugin-live base64 metadata, and
  partial-target adapter errors.

P25.3 defines and executes the CLI `export.file` archive contract:

- The command maps to backend `export-binfile` RPC/SSE, not exporter
  `export-shapes`.
- `libraryMode` normalizes to backend `include-libraries` and `embed-assets`
  booleans: `all` = include libraries, `merge` = embed assets, `detach` =
  neither.
- `@penpot/command-runtime` exposes `createExportFileContract` and consumes
  `export-file-contract-fixtures.json` in tests.
- `penpot-cli export file` selects `backend-rpc`, reads the backend SSE `end`
  resource URI, and writes the returned `.penpot` resource when `--output` is
  supplied.

P25.4 defines the descriptor-only `render.thumbnail` contract:

- The command maps to dashboard thumbnail data/render/cache semantics, not
  exporter `export-shapes`.
- File thumbnails use backend `get-file-data-for-thumbnail` plus
  `create-file-thumbnail`; tagged frame thumbnails use
  `create-file-object-thumbnail` with `fileId/pageId/objectId/tag`.
- PNG artifact metadata is fixed in the shared contract: default width `252`,
  derived height `168`, and `3:2` aspect ratio.
- Cache policy is explicit as `reuse` or `refresh`.
- At P25.4 the descriptor kept `adapters: []`; MCP and CLI execution still
  needed a later worker/rasterizer or renderer-service boundary. P25.8 later
  adds only the renderer-service planning adapter.

P25.5 registers MCP `export.file`:

- The MCP tool selects `backend-rpc`, calls backend `export-binfile`, parses
  the SSE `end` event, and returns `.penpot` resource metadata plus an absolute
  `downloadUri`.
- MCP does not write files to the MCP server filesystem. Local artifact writes
  remain the `penpot-cli export file --output` responsibility.
- `PenpotRpcClient.postSse` owns SSE/Transit parsing and stream error
  normalization for backend-rpc streaming calls.

P25.6 audits the executable `render.thumbnail` boundary:

- Future execution should live behind a dedicated thumbnail renderer service,
  not inside the MCP Node process.
- Frontend worker rendering and exporter-compatible Playwright rendering remain
  deferred options because neither currently provides global MCP/CLI thumbnail
  cache persistence semantics.
- Backend thumbnail RPCs remain the auth, data, and persistence authority, but
  the backend does not render PNG bytes.
- MCP and CLI registration remain blocked until renderer-service fixtures define
  file and tagged-frame resource returns, cache reuse/refresh behavior, auth
  propagation, and tests.

P25.7 defines the future renderer-service API fixtures:

- `render-thumbnail-renderer-service-api.md` specifies the service request and
  response shape for `thumbnail.render`.
- `render-thumbnail-renderer-service-fixtures.json` covers file refresh, file
  cache reuse, tagged frame refresh, missing frame target errors, auth
  forwarding, resource URI normalization, and future MCP/CLI test expectations.
- P25.7 did not enable execution; the fixtures prepared the future service and
  entry-adapter implementation. P25.8 later adds only the planning adapter.

P25.8 adds the renderer-service dry-run/client boundary:

- `@penpot/command-runtime` exposes
  `createRenderThumbnailRendererServicePlan`, which wraps the existing
  thumbnail contract in a future `thumbnail.render` service request.
- `penpot-cli render thumbnail --dry-run` prints that request shape without
  contacting a renderer or backend service.
- `penpot-cli render thumbnail` without `--dry-run` returns
  `renderer_service_unavailable` with required capabilities and the planned
  service request.
- The descriptor now advertises `cliCommand: "render thumbnail"` and the
  `renderer-service` planning adapter. MCP also registers `render.thumbnail`
  as planning-only, but no PNG rendering execution exists yet.

P25.9 adds the MCP planning-only dry-run boundary:

- MCP `render.thumbnail` returns the same `thumbnail.render` renderer-service
  request metadata as CLI dry-run without contacting renderer, backend,
  exporter, or plugin runtimes.
- `dryRun:false` reports `renderer_service_unavailable` with required
  capabilities and the planned service request.
- Unsupported adapters and incomplete frame targets fail before any runtime
  dispatch.

P25.10 adds renderer-service client configuration and availability probes:

- `createRenderThumbnailRendererServicePlan` now includes `client` and
  `availability` blocks with endpoint, derived `/health` endpoint, probe
  timeout, and `metadata-only` probe status.
- MCP and CLI planning responses report `configured-unverified` when an
  endpoint is configured and `not-configured` when it is absent.
- The probe is descriptive only: it does not perform HTTP requests, render PNG
  bytes, persist thumbnails, or make runtime execution available.

P25.11 defines renderer-service response and error normalization:

- Successful `thumbnail.render` responses normalize cache outcome,
  resource/download URI, content type, renderer runtime, and fallback metadata.
- If a response contains only `mediaId`, the shared helper derives
  `/assets/by-id/{mediaId}` and resolves a download URI from the entry adapter
  public/backend URI.
- Renderer-service errors normalize into shared error payloads with status,
  retryability, endpoint, and service data. No MCP/CLI network execution is
  enabled by this contract.

P25.12 adds the disabled renderer-service client request scaffold:

- Plans include a future POST request shape with JSON content headers,
  `serviceRequest` body, timeout, MCP/CLI audit headers, and caller-session
  auth forwarding header names.
- `clientRequest.dispatch` is always `false`; the scaffold is visible in MCP
  and CLI dry-run/unavailable responses but cannot send network traffic.
- Runtime execution still requires an explicit gate, service implementation,
  and integration tests.

P25.13 adds the closed renderer-service execution gate:

- Plans include `executionGate` with the required opt-in env
  `PENPOT_RENDER_THUMBNAIL_EXECUTION=renderer-service`, endpoint/config
  readiness, failure modes, blockers, and integration-test plan.
- `executionGate.dispatch` is always `false`; dry-run and unavailable
  execution responses expose the gate without contacting renderer-service.
- Future executable work must open this gate only after service implementation,
  health/preflight coverage, target/cache capabilities, and integration tests
  are in place.

P25.14 adds disabled health preflight and executable client harness plans:

- Plans include `healthPreflight` for the future renderer-service GET
  `/health` check, expected JSON health fields, and preflight failure modes.
- Plans include `executionClientHarness` with the future execution sequence:
  execution gate, health preflight, render POST request, and result
  normalization.
- `healthPreflight.dispatch`, `healthPreflight.networkProbe`, and
  `executionClientHarness.dispatch` are always `false`; no network checks or
  render POSTs are enabled by this step.

P25.15 adds the disabled renderer-service dispatch adapter boundary:

- Plans include `dispatchAdapterBoundary` with config precedence, consumption
  of execution gate / health preflight / client request states, result/error
  helper mapping, and no-dispatch defaults.
- `dispatchAdapterBoundary.dispatch` is always `false`; this step does not
  register executable runtime behavior or replace metadata-only availability.

P25.16 adds renderer-service opt-in configuration surfaces:

- Plans include `optInConfiguration` with CLI flag, MCP arg, environment,
  profile, and backend config sources plus source precedence diagnostics.
- Valid opt-in values are recorded as diagnostics only; invalid values are
  reported without enabling execution.
- `optInConfiguration.dispatch` is always `false`, and configuration alone
  cannot open the execution gate.

P25.17 adds renderer-service unavailable error taxonomy:

- Plans include `unavailableErrorTaxonomy` with stable configuration,
  execution-gate, health-preflight, dispatch-adapter, response-normalization,
  and resource-normalization codes.
- `renderer_service_health_unavailable` is the only planned retryable code;
  pre-implementation gate/config/dispatch failures are non-retryable.
- MCP/CLI dry-run and unavailable responses expose the taxonomy while
  `unavailableErrorTaxonomy.dispatch` remains `false`.

P25.18 adds renderer-service integration fixture harness:

- Plans include `integrationFixtureHarness` with fixture cases for closed gate,
  missing endpoint, health failure, render success, service error, MCP resource
  metadata, CLI output gating, and token-safe auth.
- The harness records the future suite required before executable dispatch,
  while `dispatch`, `networkDispatch`, and `localFileWrites` remain `false`.

P25.19 adds renderer-service dispatch registration preflight:

- Plans include `dispatchRegistrationPreflight` with final readiness checks
  for opt-in, endpoint config, service implementation, integration fixtures,
  health preflight, dispatch adapter, runtime registration, and target/cache
  capabilities.
- The preflight remains hard-disabled: `dispatch`, `networkDispatch`,
  `runtimeRegistration`, and `localFileWrites` are all `false`.

P25.20 adds renderer-service executable adapter registration scaffold:

- Plans include `executableAdapterRegistrationScaffold` with the no-op future
  registration surface for MCP and CLI.
- The scaffold consumes the P25.19 preflight, dispatch adapter boundary, and
  client request metadata, but keeps `dispatch`, `networkDispatch`,
  `runtimeRegistration`, and `localFileWrites` all `false`.

P25.21 adds renderer-service adapter registry manifest:

- Plans include `adapterRegistryManifest` with the future `renderer-service`
  registry key plus MCP and CLI entrypoint wiring.
- The manifest is metadata-only: it does not mutate the command-runtime
  adapter registry, register executable MCP/CLI handlers, call network
  endpoints, or write local files.

P25.22 adds renderer-service enablement checklist:

- Plans include `enablementChecklist` with the final opt-in, health,
  integration, adapter registration, registry, and target/cache capability
  gates required before executable dispatch can be selected.
- The checklist remains hard-disabled with `dispatch`, `networkDispatch`,
  `runtimeRegistration`, and `localFileWrites` all `false`.

P25.23 adds renderer-service implementation slice audit:

- Plans include `implementationSliceAudit`, selecting the health/no-op
  contract fixture as the first concrete implementation slice.
- The audit remains planning-only with `dispatch`, `networkDispatch`,
  `runtimeRegistration`, and `localFileWrites` all `false`.

P25.24 adds renderer-service health/no-op contract fixtures:

- Plans include `healthNoopContractFixtures`, defining `/health` OK/unavailable
  fixtures and a no-op `thumbnail.render` response contract.
- The fixtures remain planning-only with `dispatch`, `networkDispatch`,
  `runtimeRegistration`, and `localFileWrites` all `false`.

P25.25 adds renderer-service no-op service host scaffold:

- Plans include `noopServiceHostScaffold`, defining the future no-op host
  package, routes, config, lifecycle, and observability metadata.
- The scaffold remains planning-only with `hostStartup`, `dispatch`,
  `networkDispatch`, `runtimeRegistration`, and `localFileWrites` all `false`.

P25.26 adds renderer-service host lifecycle test fixtures:

- Plans include `hostLifecycleTestFixtures`, defining start, stop, readiness,
  supervision, logs, and error fixture expectations.
- The fixtures remain planning-only with `processSpawn`, `hostStartup`,
  `networkDispatch`, `runtimeRegistration`, and `localFileWrites` all `false`.

P25.27 adds renderer-service package manifest scaffold:

- Plans include `packageManifestScaffold`, defining the future
  `@penpot/renderer-service` package metadata, planned scripts, exports,
  dependencies, files, and workspace integration flags.
- The scaffold remains planning-only with `packageCreated`,
  `workspaceMutation`, `scriptRunnable`, `dispatch`, `networkDispatch`,
  `runtimeRegistration`, and `localFileWrites` all `false`.

P25.28 adds renderer-service package creation guardrails:

- Plans include `packageCreationGuardrails`, defining required creation checks,
  blocked package/workspace/runtime mutations, allowed planning work, denied
  actions, and runtime-dispatch prerequisites.
- The guardrails remain planning-only with `packageCreated`,
  `workspaceMutation`, `scriptRunnable`, `hostStartup`, `processSpawn`,
  `dispatch`, `networkDispatch`, `runtimeRegistration`, and `localFileWrites`
  all `false`.

P25.29 adds renderer-service package file templates:

- Plans include `packageFileTemplates`, defining metadata-only planned
  `package.json`, `tsconfig.json`, source entrypoint, no-op host, and no-op
  host test shapes.
- The templates remain planning-only with `fileMaterialization`,
  `packageCreated`, `workspaceMutation`, `scriptRunnable`, `hostStartup`,
  `processSpawn`, `dispatch`, `networkDispatch`, `runtimeRegistration`, and
  `localFileWrites` all `false`.

P25.30 adds renderer-service package workspace wiring:

- Plans include `packageWorkspaceWiring`, defining the planned
  `pnpm-workspace.yaml` entry, root package scripts, lockfile touchpoints,
  workspace dependency filter, and non-target files.
- The wiring remains planning-only with `pnpmWorkspaceMutation`,
  `rootPackageJsonMutation`, `lockfileMutation`, `workspaceMutation`,
  `packageCreated`, `scriptRunnable`, `fileMaterialization`, `dispatch`,
  `networkDispatch`, `runtimeRegistration`, and `localFileWrites` all `false`.

P25.31 adds renderer-service package build verification:

- Plans include `packageBuildVerification`, defining future filtered build,
  type-check, and test commands plus expected `dist` artifacts.
- The verification remains planning-only with `commandExecution`,
  `buildOutput`, `packageScriptsRunnable`, `processSpawn`, `workspaceMutation`,
  `packageCreated`, `scriptRunnable`, `fileMaterialization`, `dispatch`,
  `networkDispatch`, `runtimeRegistration`, and `localFileWrites` all `false`.

P25.32 adds renderer-service package materialization checklist:

- Plans include `packageMaterializationChecklist`, defining future
  package/workspace/output batches, readiness checks, commit boundary, and
  rollback plan.
- The checklist remains planning-only with `materializationApproved`,
  `fileMaterialization`, `workspaceMutation`, `lockfileMutation`,
  `rootPackageJsonMutation`, `pnpmWorkspaceMutation`, `commandExecution`,
  `buildOutput`, `processSpawn`, `dispatch`, `networkDispatch`,
  `runtimeRegistration`, and `localFileWrites` all `false`.

P25.33 adds renderer-service package creation dry-run summary:

- Plans include `packageCreationDryRunSummary`, defining future would-create,
  would-modify, would-generate, and would-run sections plus blocked-until
  reasons.
- The summary remains planning-only with `dryRunOnly:true`, `filesWritten`,
  `fileMaterialization`, `workspaceMutation`, `lockfileMutation`,
  `commandExecution`, `buildOutput`, `materializationApproved`, `dispatch`,
  `networkDispatch`, `runtimeRegistration`, and `localFileWrites` all `false`
  except the explicit dry-run marker.

P25.34 adds renderer-service package creation file manifest:

- Plans include `packageCreationFileManifest`, defining the exact future
  package directory, package files, generated files, workspace files, readiness
  blockers, and no-op guarantees before filesystem materialization.
- The manifest remains planning-only with `dryRunOnly:true`, `filesWritten`,
  `fileMaterialization`, `workspaceMutation`, `lockfileMutation`,
  `commandExecution`, `buildOutput`, `materializationApproved`,
  `processSpawn`, `packageCreated`, `dispatch`, `networkDispatch`,
  `runtimeRegistration`, and `localFileWrites` all `false`.

P25.35 adds renderer-service package materialization approval gate:

- Plans include `packageMaterializationApprovalGate`, defining explicit
  approval inputs, approval scope, blocked decision state, post-approval
  sequence, and no-op guarantees before any filesystem materialization.
- The gate remains planning-only with `approvalRequired:true`,
  `approved:false`, `dryRunOnly:true`, `filesWritten`,
  `fileMaterialization`, `workspaceMutation`, `lockfileMutation`,
  `commandExecution`, `buildOutput`, `materializationApproved`,
  `processSpawn`, `packageCreated`, `dispatch`, `networkDispatch`,
  `runtimeRegistration`, and `localFileWrites` all `false`.

P25.36 adds renderer-service package materialization execution dry-run:

- Plans include `packageMaterializationExecutionDryRun`, defining future
  directory creation, package file write, workspace mutation, and verification
  command steps plus blocked reasons and execution output flags.
- The dry-run remains planning-only with `executeNow:false`,
  `approvalRequired:true`, `approved:false`, `dryRunOnly:true`,
  `filesWritten`, `fileMaterialization`, `workspaceMutation`,
  `lockfileMutation`, `commandExecution`, `buildOutput`,
  `materializationApproved`, `processSpawn`, `packageCreated`, `dispatch`,
  `networkDispatch`, `runtimeRegistration`, and `localFileWrites` all
  `false`.

P25.37 adds renderer-service package materialization write contract:

- Plans include `packageMaterializationWriteContract`, defining the exact
  future package directory, package files, workspace files, integrity checks,
  atomic write expectations, and rollback contract for approved
  materialization.
- The write contract remains planning-only with `executeNow:false`,
  `approvalRequired:true`, `approved:false`, `dryRunOnly:true`,
  `filesWritten`, `fileMaterialization`, `workspaceMutation`,
  `lockfileMutation`, `commandExecution`, `buildOutput`,
  `materializationApproved`, `processSpawn`, `packageCreated`, `dispatch`,
  `networkDispatch`, `runtimeRegistration`, and `localFileWrites` all
  `false`.

P25.38 adds renderer-service package materialization rollback contract:

- Plans include `packageMaterializationRollbackContract`, defining pre-write
  snapshots, rollback phases, failure recovery, and rollback verification for
  future approved materialization.
- The rollback contract remains planning-only with `executeNow:false`,
  `rollbackNow:false`, `approvalRequired:true`, `approved:false`,
  `dryRunOnly:true`, `filesWritten`, `rollbackExecuted`,
  `fileMaterialization`, `workspaceMutation`, `lockfileMutation`,
  `commandExecution`, `buildOutput`, `materializationApproved`,
  `processSpawn`, `packageCreated`, `dispatch`, `networkDispatch`,
  `runtimeRegistration`, and `localFileWrites` all `false`.

P25.39 adds renderer-service package materialization verification manifest:

- Plans include `packageMaterializationVerificationManifest`, defining future
  post-materialization package file, workspace file, generated output,
  verification command, and runtime-disabled assertions.
- The verification manifest remains planning-only with `executeNow:false`,
  `verifyNow:false`, `approvalRequired:true`, `approved:false`,
  `dryRunOnly:true`, `filesWritten`, `verificationExecuted`,
  `fileMaterialization`, `workspaceMutation`, `lockfileMutation`,
  `commandExecution`, `buildOutput`, `materializationApproved`,
  `processSpawn`, `packageCreated`, `dispatch`, `networkDispatch`,
  `runtimeRegistration`, and `localFileWrites` all `false`.

P25.40 adds renderer-service package materialization final approval checklist:

- Plans include `packageMaterializationFinalApprovalChecklist`, defining
  required explicit approval items, approval scope, blocked decision state, and
  post-approval sequence before any future materialization.
- The final approval checklist remains planning-only with
  `finalApprovalGranted:false`, `executeNow:false`, `verifyNow:false`,
  `approvalRequired:true`, `approved:false`, `dryRunOnly:true`,
  `filesWritten`, `verificationExecuted`, `fileMaterialization`,
  `workspaceMutation`, `lockfileMutation`, `commandExecution`, `buildOutput`,
  `materializationApproved`, `processSpawn`, `packageCreated`, `dispatch`,
  `networkDispatch`, `runtimeRegistration`, and `localFileWrites` all
  `false`.

P25.41 adds renderer-service package materialization explicit approval token:

- Plans include `packageMaterializationExplicitApprovalToken`, defining the
  future opaque one-time approval token contract, required scope, validation
  plan, audit plan, blocked decision state, and no-op guarantees.
- The token plan remains planning-only with `tokenProvided:false`,
  `tokenAccepted:false`, `tokenStored:false`, `tokenValidated:false`,
  `approved:false`, `finalApprovalGranted:false`, `executeNow:false`,
  `verifyNow:false`, `filesWritten:false`, `fileMaterialization:false`,
  `workspaceMutation:false`, `lockfileMutation:false`,
  `commandExecution:false`, `buildOutput:false`, `materializationApproved:false`,
  `processSpawn:false`, `packageCreated:false`, `dispatch:false`,
  `networkDispatch:false`, `runtimeRegistration:false`, and
  `localFileWrites:false`.

P25.42 adds renderer-service package materialization approval audit trail:

- Plans include `packageMaterializationApprovalAuditTrail`, defining the future
  append-only approval audit record contract, required audit events, retention
  plan, blocked decision state, and no-op guarantees.
- The audit trail remains planning-only with `auditRecordWritten:false`,
  `auditRecordPersisted:false`, `auditRecordValidated:false`,
  `auditRecordExported:false`, `writeAuditNow:false`, `tokenAccepted:false`,
  `approved:false`, `finalApprovalGranted:false`, `executeNow:false`,
  `verifyNow:false`, `filesWritten:false`, `fileMaterialization:false`,
  `workspaceMutation:false`, `lockfileMutation:false`,
  `commandExecution:false`, `buildOutput:false`, `materializationApproved:false`,
  `processSpawn:false`, `packageCreated:false`, `dispatch:false`,
  `networkDispatch:false`, `runtimeRegistration:false`, and
  `localFileWrites:false`.

P25.43 adds renderer-service package materialization approval replay guard:

- Plans include `packageMaterializationApprovalReplayGuard`, defining the
  future one-time token replay-prevention contract, nonce and scope-hash
  checks, blocked replay decision, and no-op guarantees.
- The replay guard remains planning-only with `replayCheckExecuted:false`,
  `replayDetected:false`, `replayRejected:false`, `nonceStored:false`,
  `scopeHashStored:false`, `tokenAccepted:false`, `tokenConsumed:false`,
  `tokenRevoked:false`, `approved:false`, `finalApprovalGranted:false`,
  `executeNow:false`, `verifyNow:false`, `filesWritten:false`,
  `fileMaterialization:false`, `workspaceMutation:false`,
  `lockfileMutation:false`, `commandExecution:false`, `buildOutput:false`,
  `materializationApproved:false`, `processSpawn:false`,
  `packageCreated:false`, `dispatch:false`, `networkDispatch:false`,
  `runtimeRegistration:false`, and `localFileWrites:false`.
