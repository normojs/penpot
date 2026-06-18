# Headless Live-Gap Audit

Date: 2026-06-17

This audit closes P17.1 for Wave I / Phase 17. It classifies the remaining
commands that look live-only, partially implemented, or descriptor-only before
adding new backend/CLI behavior.

## Scope

The audit covers:

- Current page and selection semantics.
- Grid and broader layout/style authoring.
- Prototype overlay, interaction list, and interaction delete semantics.
- Export/render behavior that can use live workspace state or explicit
  exporter targets.
- Tool names that exist in `ToolNames.ts` but are not registered MCP tools or
  command-runtime descriptors.

It does not change runtime behavior.

## Classification Model

Use four buckets for command planning:

| Bucket | Meaning | Adapter direction |
| --- | --- | --- |
| Backend-safe persisted data | The operation reads or writes file data through existing backend permissions and file update pipelines. | Prefer `backend-command` for explicit `fileId` targets; keep `plugin-live` only for bound workspace convenience. |
| Exporter/read-only data | The operation renders explicit persisted targets through exporter without relying on editor state. | Use `exporter` when `fileId`, `pageId`, and object target ids are supplied. |
| Plugin-live workspace state | The operation depends on editor-local state, plugin APIs, current page, selection, or open tab ownership. | Keep `plugin-live`; improve file open/bind/retry guidance. |
| Unsupported or descriptor-only | The name exists or is desired, but no safe contract or implementation exists yet. | Add descriptors/errors before behavior; do not fake support. |

## Evidence Summary

### Backend Headless Surface

`backend/src/app/rpc/commands/files_update.clj` already exposes backend
headless writes for:

- `create-file-page`
- `rename-file-page`
- `create-file-shape`
- `create-file-image-shape`
- `update-file-shape`
- `delete-file-shape`
- `create-file-prototype-flow`
- `create-file-prototype-interaction`

Those commands run through edition permissions, transaction locking, headless
request builders, and the normal file update pipeline. This is the safe model
for future persisted operations.

`common/src/app/common/files/headless.cljc` confirms the current backend shape
subset:

- Supported shape types are frame, rect, and text.
- Layout updates support `none`, `flex`, and a backend-safe grid container
  subset.
- Grid layout support covers container direction, rows/columns track arrays,
  gaps, padding, and alignment fields; `layout-grid-cells` and child placement
  remain outside the backend-command contract.
- Prototype helpers persist page flows and navigate interactions through
  `:set-flow` and `:mod-obj` changes.

### Plugin-Live Surface

`mcp/packages/plugin/src/plugin.ts` reports live file context with:

- `fileId`, `fileName`, and `revn`
- `pageId` and `pageName`
- `selectionIds`
- updates for `pagechange`, `selectionchange`, `filechange`, and
  `contentsave`

The plugin task handlers provide live operations:

- `PageTaskHandler` supports page list/create/rename/set-current.
- `ShapeTaskHandler` supports basic shape create/update/delete and can create
  grid layout through `board.addGridLayout()`.
- `PrototypeTaskHandler` supports only `createFlow` and `createInteraction`.
- `ExportTaskHandler` can export current page, explicit live page, explicit
  live shape, or the first selected shape.

This confirms that current page, selection, and grid API access are live editor
state until separate backend contracts exist.

### Frontend Workspace State

Frontend workspace state keeps current page and selection outside persisted file
data:

- `refs/current-page-id` reads `:current-page-id` from app state.
- `refs/workspace-local` stores workspace-local state.
- Selection state is stored under `[:workspace-local :selected]`, plus
  `:last-selected`, `:selrect`, and related local editor keys.
- Page switching sets `:current-page-id` and replaces `:workspace-local` with
  page-local cached state.

So `page.set_current`, `selection.get`, and `selection.set` should stay
plugin-live unless a future product decision creates persisted user/session
state for them.

## Candidate Operation Matrix

| Command or candidate | Current implementation | Classification | Reason | Recommended next step |
| --- | --- | --- | --- | --- |
| `page.list` | Registered MCP tool and command descriptor; backend-command when `fileId` is supplied, plugin-live otherwise. | Backend-safe persisted data plus plugin-live convenience. | Page list is file data; current marker is live only. | Keep behavior. Descriptor already exists. |
| `page.create` | Registered MCP tool and descriptor; backend-command with `fileId`, plugin-live without it. | Backend-safe persisted data plus plugin-live convenience. | Page creation persists file data. `makeCurrent` is live-only. | Keep warning that backend-command does not switch UI state. |
| `page.rename` | Registered MCP tool and descriptor; backend-command with `fileId`, plugin-live without it. | Backend-safe persisted data plus plugin-live convenience. | Page metadata persists in file data. | Keep behavior. |
| `page.set_current` | Registered MCP tool, no command-runtime descriptor; always plugin-live. | Plugin-live workspace state. | It calls `penpot.openPage` and changes editor state, not file data. | Add plugin-live-only descriptor and live-only reason text in P17.2/P17.5. |
| `selection.get` | Registered MCP tool backed by a plugin-live selection task. | Plugin-live workspace state. | Selection lives in `workspace-local` and plugin context snapshots. | Returns selected ids and lightweight shape summaries only when a file context is bound. |
| `selection.set` | Registered MCP tool backed by a plugin-live selection task. | Plugin-live workspace state. | Selection mutation is editor-local state. | Sets selected shape ids only when a file context is bound; `shapeIds: []` clears selection. |
| `shape.create_frame`, `shape.create_rect`, `shape.create_text`, `shape.create_image` | Registered MCP tools and descriptors; backend-command with explicit targets, plugin-live otherwise. | Backend-safe persisted data plus plugin-live convenience. | Supported persisted shape creation already exists. | Keep behavior. |
| `shape.update` with geometry/style/text/hierarchy | Registered MCP tool and descriptor; backend-command with explicit targets, plugin-live otherwise. | Backend-safe persisted data plus plugin-live convenience. | Supported shape fields persist through file changes. | Keep behavior. |
| `shape.update` with `layout.type = none|flex` | Registered MCP tool and descriptor. | Backend-safe persisted data. | Common/backend explicitly support this subset. | Keep behavior. |
| `shape.update` with `layout.type = grid` | Registered MCP tool and descriptor; backend-command supports the container track subset with explicit `fileId`, plugin-live remains available for live workspace convenience. | Backend-safe persisted data for container direction/tracks/gaps/padding/alignment; plugin-live or future contract for cell/child placement. | Persisted grid container fields are stable enough for headless updates, while `layout-grid-cells` needs a separate payload contract. | Keep backend-command subset; do not add cell placement until the contract is defined. |
| `shape.set_layout` | Name exists in `ToolNames.ts`, not registered. | Unsupported or descriptor-only. | Behavior overlaps with `shape.update.layout`; no separate runtime surface. | Descriptor should clarify planned alias or future specialized command before implementation. |
| `shape.set_style` | Name exists in `ToolNames.ts`, not registered. | Unsupported or descriptor-only. | Behavior overlaps with `shape.update` style fields. | Descriptor should clarify planned alias or future specialized command before implementation. |
| `shape.group`, `shape.ungroup` | Names exist in `ToolNames.ts`, not registered. | Unsupported or descriptor-only. | No backend/common or plugin task implementation found. | Leave out of P17.2 unless a separate grouping wave is selected. |
| `prototype.create_flow` | Registered MCP tool and descriptor; backend-command with `fileId`, plugin-live otherwise. | Backend-safe persisted data plus plugin-live convenience. | Flow data persists on the page. | Keep behavior. |
| `prototype.create_interaction` | Registered MCP tool and descriptor; backend-command with `fileId`, plugin-live otherwise. | Backend-safe persisted data plus plugin-live convenience. | Navigate interaction data persists on source shape. | Keep behavior. |
| `prototype.list_interactions` | Registered MCP tool, backend/common read helper, and CLI command. | Backend-safe persisted read. | Flows and interactions are persisted in file data. | Keep as the discovery/read path for source-shape/index delete targets. |
| `prototype.delete_interaction` | Registered MCP tool, backend/common delete helper, and CLI command. | Backend-safe persisted mutation with explicit source-shape/index identity. | Interaction arrays are persisted on source shapes and interactions do not carry stable ids. | P19.2 implements backend-command delete for `fileId`, optional `pageId`, `sourceShapeId`, and zero-based `interactionIndex`; stale indexes return structured validation errors. |
| `prototype.create_overlay` | Name exists in `ToolNames.ts`, not registered. Command-runtime descriptor has no executable adapters. | Unsupported until contract. | Persisted overlays are interactions with `:open-overlay`, `:toggle-overlay`, or `:close-overlay` actions. The plugin API maps those to `destination`, `relativeTo`, `position`, `manualPositionLocation`, `closeWhenClickOutside`, `addBackgroundOverlay`, and `animation`, while backend/common headless helpers currently create only navigate-to interactions. | Keep descriptor-only. First add read-only overlay summaries and fixtures for persisted `open/toggle/close` interactions, then define a create payload before any backend-command mutation. |
| `export.shape` | Registered descriptor and MCP tool through plugin-live. | Plugin-live workspace/export state. | It can use explicit live shape or current selection and returns plugin base64 data. | Keep plugin-live. Explicit exporter shape/page preview is covered by `render.preview`. |
| `export.page` | Registered descriptor and MCP tool. | Exporter/read-only plus plugin-live. | Exporter path requires explicit ids; plugin-live can use bound workspace page. | Keep behavior. |
| `render.preview` | Registered descriptor and MCP tool. | Exporter/read-only plus plugin-live. | Exporter path requires explicit file/page/object ids; plugin-live can preview page/shape/selection. | Keep behavior. |
| `export.file`, `render.thumbnail` | Names exist in `ToolNames.ts`, not registered. | Unsupported or descriptor-only. | No registered MCP tools or command-runtime descriptors. | Leave for a future export wave. |
| `component.create`, `component.instantiate`, `tokens.list`, `tokens.apply` | Names exist in `ToolNames.ts`, not registered. | Unsupported or descriptor-only. | No runtime task or backend helper found. | Leave for a future components/tokens wave. |
| `debug.get_plugin_state`, `debug.get_agent_logs` | Names exist in `ToolNames.ts`, not registered. | Unsupported or descriptor-only. | Diagnostics exist through status/log paths, not these tools. | Keep out of P17.2 unless diagnostics naming is explicitly selected. |
| Legacy `execute_code`, `export_shape`, `import_image` | Registered legacy tools. | Legacy live/plugin or local filesystem behavior. | They are compatibility surfaces, not the typed headless path. | Do not expand; keep gated/legacy behavior. |

## P17.2 Descriptor Slice

The first descriptor slice should be read-only or metadata-only. It should not
add new writes.

Recommended P17.2 commands:

1. `page.set_current`
   - Adapter: `plugin-live` only.
   - Reason: current page is editor state.
   - Error guidance: open file, inspect context, bind context, retry.

2. `selection.get`
   - Adapter: `plugin-live` only.
   - Reason: selection is editor-local state.
   - Current runtime: registered MCP plugin-live task for bound workspaces.

3. `selection.set`
   - Adapter: `plugin-live` only.
   - Reason: selection mutation is editor-local state.
   - Current runtime: registered MCP plugin-live task for bound workspaces,
     with shape id validation and empty-array clearing.

4. `prototype.list_interactions`
   - Adapter: `backend-command` for explicit `fileId`/`pageId`; optional
     plugin-live later.
   - Reason: flows and interactions are persisted in file data.
   - Follow-up: implement in P17.3.

5. `prototype.delete_interaction`
   - Adapter: planned `backend-command`, but unsupported until delete target
     semantics are defined.
   - Reason: persisted mutation is possible but needs stable index/id contract.

6. `prototype.create_overlay`
   - Adapter: unsupported/planned.
   - Reason: neither backend nor plugin task handlers currently expose overlay
     creation, and overlay actions need stable semantics for `open-overlay`,
     `toggle-overlay`, `close-overlay`, destination board identity,
     `relativeTo`, preset/manual positioning, click-outside close behavior,
     background overlay, animation, and persisted response summaries.

7. `shape.set_layout`
   - Adapter: descriptor-only alias/planned command.
   - Reason: current behavior lives under `shape.update.layout`; grid backend
     support is still unresolved.

P17.2 implementation note:

- Added `LiveGapCommandDescriptors` to `@penpot/command-runtime` for the seven
  commands above.
- Kept `page.set_current`, `selection.get`, and `selection.set` as
  plugin-live/live workspace metadata. All three are now registered MCP tools
  for bound workspace contexts.
- Kept `prototype.list_interactions` as the planned backend-command read that
  starts P17.3. Prototype delete, overlay creation, and layout alias behavior
  remain descriptor-only or unsupported until stable contracts exist.

## P17.3 Backend-Safe Read Slice

Implement prototype read/list before delete:

- Add common helpers that summarize page flows and shape interactions from file
  data.
- Add backend RPC for explicit file/page target reads with permission checks.
- Add MCP `prototype.list_interactions` backend-command path.
- Add `penpot-cli prototype list-interactions`.
- Preserve plugin-live behavior as optional future work rather than a blocker.

This gives agents a stable way to inspect existing prototype data before any
mutation command such as delete.

P17.3 implementation note:

- Common now exposes `prototype-interactions-summary`, which summarizes page
  `:flows` and supported navigate-to shape `:interactions` from persisted file
  data with optional page, flow, and source-shape filters.
- Backend adds the read-only `get-file-prototype-interactions` RPC with file
  read-permission checks and feature validation.
- MCP registers `prototype.list_interactions` as a backend-command-only tool for
  explicit `fileId` targets and returns stable adapter selection metadata.
- `penpot-cli prototype list-interactions` calls the same read RPC through GET
  and reports flow/interaction summaries in text or JSON.
- Overlay creation, selection, and current-page state remain outside this
  slice. Interaction deletion is now covered by P19.2 as a backend-command
  source-shape/index mutation.

## P19.3 Overlay Contract Reassessment

`prototype.create_overlay` remains descriptor-only and unsupported after the
Phase 19 reassessment.

Source findings:

- Common stores overlay behavior as prototype interactions with action types
  `:open-overlay`, `:toggle-overlay`, and `:close-overlay`.
- `:open-overlay` and `:toggle-overlay` require `:overlay-position` and
  `:overlay-pos-type`; they may also carry `:destination`,
  `:position-relative-to`, `:close-click-outside`, `:background-overlay`, and
  `:animation`.
- Plugin API parsing/formatting exposes similar fields as `destination`,
  `relativeTo`, `position`, `manualPositionLocation`,
  `closeWhenClickOutside`, `addBackgroundOverlay`, and `animation`.
- The existing MCP plugin prototype task handler creates flows and navigate-to
  interactions only. The backend/common headless helper also creates only
  navigate-to interactions.
- Overlay position calculation depends on source shape, destination board,
  relative target, page objects, and viewer/editor geometry conventions, so a
  headless write needs fixtures before execution.

Decision:

- Keep the command-runtime descriptor with `adapters: []`.
- Do not register an executable MCP tool or CLI command for overlay creation
  yet.
- Do not reuse `prototype.create_interaction` for overlay actions until the
  input payload and response summary include overlay-specific fields.
- Make the next implementation slice read-only: extend prototype interaction
  summaries to report existing persisted overlay interactions, then use those
  fixtures to define the create payload.

## P17.4 Grid Contract Decision

P17.4 defines a minimal backend-safe grid container subset instead of copying
plugin API calls or attempting full grid editing.

Supported backend-command payload:

- `layout.type = grid`.
- Grid auto-flow direction: `row` or `column`.
- `rows` and `columns` track arrays with `percent`, `flex`, `auto`, or `fixed`
  track types and optional numeric values.
- Container row/column gap, uniform padding, align/justify items, and
  align/justify content.

Explicitly unsupported in this slice:

- `layout-grid-cells`.
- Child cell placement, spans, and moving children into tracks/cells.
- Any payload that implies a full layout-engine placement mutation.

This keeps backend-command useful for generated frame scaffolds while leaving
cell/child placement to plugin-live or a later stable cell payload contract.

## P17.5 Live-Only Guidance

Selection and current page commands now explain:

- The state is editor-local and requires a live bound workspace tab.
- Backend-command can still edit the file if the caller supplies explicit ids.
- The recovery path is `file.open`, `file.get_context`, `file.bind_context`,
  then retry the live-only tool.
- CLI commands do not execute plugin-live tasks; CLI output should report the
  command as live-only instead of implying it can switch an editor tab.
- `file_context_required` responses include `liveOnly.adapter:
  "plugin-live"`, `liveOnly.state: "editor-local"`, `retryTool`, and a
  target-aware handoff when the file target can be inferred.
- `page.set_current` passes its requested `pageId` into binding guidance, so an
  available or stale context can provide the file id without losing the target
  page.

`selection.get` and `selection.set` now have plugin-live task contracts and
registered MCP tools for bound workspaces. `selection.set` validates requested
shape ids in the plugin before mutating editor-local selection, and
`shapeIds: []` clears selection. Their shared command-runtime reason text still
points CLI users back to MCP `file.open`, `file.get_context`,
`file.bind_context`, and retry rather than suggesting a headless CLI path.

## Open Decisions

- Whether `shape.set_layout` and `shape.set_style` should become real commands
  or remain documented aliases for `shape.update`.
- Whether `prototype.delete_interaction` should later gain persistent
  interaction ids. P19.2 currently implements explicit `fileId`, optional
  `pageId`, `sourceShapeId`, and zero-based `interactionIndex` for the current
  data model.
- Whether plugin-live `prototype.list_interactions` is needed, or whether
  backend-command reads are enough for agents.
- Whether exporter-backed `export.shape` should get an explicit file/page/shape
  mode or remain covered by `render.preview` plus `export.page`.
