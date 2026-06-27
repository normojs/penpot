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
| `shape.set_layout` | file | MCP alias over `shape.update.layout`, backend `update-file-shape` RPC | `backend-command`, fallback `plugin-live` |
| `shape.set_style` | file | MCP alias over `shape.update` style/text fields, backend `update-file-shape` RPC | `backend-command`, fallback `plugin-live` |
| `shape.delete` | file | MCP plugin task, backend `delete-file-shape` RPC | `backend-command`, fallback `plugin-live` |
| `export.page` | file | MCP plugin task, CLI exporter execution | `exporter`, fallback `plugin-live` |
| `render.preview` | file | MCP plugin task, MCP/CLI exporter preview execution | `exporter`, fallback `plugin-live` |

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
