# MCP And CLI Command Runtime Inventory

This inventory is the P10.2/B1 audit before moving command descriptors into the
shared command runtime.

## Sources Audited

- MCP registered tools: `mcp/packages/server/src/PenpotMcpServer.ts`
- MCP tool names and future names: `mcp/packages/server/src/ToolNames.ts`
- MCP tool schemas/adapter paths: `mcp/packages/server/src/tools/*.ts`
- CLI commands: `penpot-cli/src/index.ts`
- Shared runtime package: `command-runtime/index.js` and `index.d.ts`
- Coverage signals: `mcp/packages/server/test/*.test.ts` and
  `penpot-cli/test/cli-smoke.test.mjs`

## Current Shared Runtime State

`@penpot/command-runtime` currently exposes only adapter-selection helpers:

- adapter kinds: `backend-rpc`, `backend-command`, `plugin-live`, `exporter`,
  `browser-url`, `local-fs`
- requested adapter normalization: explicit adapter or `auto`
- selection result metadata: `command`, `requested`, `selected`, `status`,
  `candidates`, and `fallbacks`

It does not yet own command names, input schemas, response envelopes, CLI help
metadata, transport labels, RPC method names, or coverage snapshots. Those
fields are duplicated between MCP server tool classes and `penpot-cli`.

## MCP Registered Tool Inventory

| Tool | Input schema owner | Adapter path | Response shape | Coverage |
| --- | --- | --- | --- | --- |
| `mcp.get_status` | `EmptyToolArgs` | local MCP server status | JSON `{status,data.server,transports,session,plugin,writeLimits,logging,fileContext}` | gap: no focused tool test |
| `account.get_current_user` | `EmptyToolArgs` | backend RPC `get-profile` | JSON `{profile}` | gap: no focused tool test |
| `team.list` | `EmptyToolArgs` | backend RPC `get-teams` | JSON `{teams}` | gap: no focused tool test |
| `project.list` | `ProjectListArgs` | backend RPC `get-projects`, optionally after `get-teams` | JSON `{teamId,projects}` or `{teams:[{team,projects}]}` | gap: no focused tool test |
| `file.list` | `FileListArgs` | backend RPC `get-project-files` | JSON `{projectId,files}` | gap: no focused tool test |
| `file.get_recent` | `FileGetRecentArgs` | backend RPC `get-team-recent-files` | JSON `{teamId,files}` | gap: no focused tool test |
| `file.create` | `FileCreateArgs` | backend-command write RPC `create-file` | JSON `{file,nextActions}` plus warnings | `FileCreateTool.test.ts` |
| `file.get_context` | `EmptyToolArgs` | server file-context registry | JSON `{fileContext,nextActions}` | registry coverage only |
| `file.bind_context` | `FileBindContextArgs` | registry lookup plus backend RPC `get-file-summary` | JSON `{boundContext,verifiedFile,nextActions}` | registry coverage only |
| `file.release_context` | `EmptyToolArgs` | server file-context registry | JSON `{released,releasedContext,fileContext,nextActions}` | registry coverage only |
| `page.list` | `PageListArgs` | backend-command RPC `get-file-pages` when `fileId`; otherwise plugin-live task | JSON `{adapter,adapterSelection,fileId,pages}` or plugin task data | `PageTools.test.ts`, `PagePluginTask.test.ts` |
| `page.create` | `PageCreateArgs` | backend-command RPC `create-file-page` when `fileId`; otherwise plugin-live task | JSON `{adapter,adapterSelection,fileId,page,revn,vern}` or plugin task data | `PageTools.test.ts`, `PagePluginTask.test.ts` |
| `page.rename` | `PageRenameArgs` | plugin-live task | JSON plugin task data plus adapter metadata | `PagePluginTask.test.ts` serialization only |
| `page.set_current` | `PageSetCurrentArgs` | plugin-live task | JSON plugin task data plus adapter metadata | `PagePluginTask.test.ts` serialization only |
| `shape.create_frame` | `ShapeCreateFrameArgs` | backend-command RPC `create-file-shape` when `fileId`/`pageId`; otherwise plugin-live task | JSON `{adapter,adapterSelection,fileId,shape,revn,vern}` or plugin task data | `ShapeCreateTools.test.ts`, `ShapePluginTask.test.ts` |
| `shape.create_rect` | `ShapeCreateRectArgs` | backend-command RPC `create-file-shape` when `fileId`/`pageId`; otherwise plugin-live task | JSON `{adapter,adapterSelection,fileId,shape,revn,vern}` or plugin task data | `ShapeCreateTools.test.ts`, `ShapePluginTask.test.ts` |
| `shape.create_text` | `ShapeCreateTextArgs` | backend-command RPC `create-file-shape` when `fileId`/`pageId`; otherwise plugin-live task | JSON `{adapter,adapterSelection,fileId,shape,revn,vern}` or plugin task data | `ShapeCreateTools.test.ts`, `ShapePluginTask.test.ts` |
| `shape.create_image` | `ShapeCreateImageArgs` | plugin-live task | JSON plugin task data | `ShapePluginTask.test.ts` serialization only |
| `shape.update` | `ShapeUpdateArgs` | backend-command RPC `update-file-shape` when `fileId`; otherwise plugin-live task | JSON `{adapter,adapterSelection,fileId,shape,revn,vern}` or plugin task data | `ShapeCreateTools.test.ts`, `ShapePluginTask.test.ts` |
| `shape.delete` | `ShapeDeleteArgs` | backend-command RPC `delete-file-shape` when `fileId`; otherwise plugin-live task | JSON `{adapter,adapterSelection,fileId,shape,revn,vern,deleted}` or confirmation error | `ShapeCreateTools.test.ts`, `ShapePluginTask.test.ts` |
| `prototype.create_flow` | `PrototypeCreateFlowArgs` | plugin-live task | JSON plugin task data | `PrototypePluginTask.test.ts` |
| `prototype.create_interaction` | `PrototypeCreateInteractionArgs` | plugin-live task | JSON plugin task data | `PrototypePluginTask.test.ts` |
| `export.shape` | `ExportShapeArgs` | plugin-live task | JSON/base64 export task data | `ExportPluginTask.test.ts` serialization only |
| `export.page` | `ExportPageArgs` | plugin-live task | JSON/base64 export task data | `ExportPluginTask.test.ts` serialization only |
| `render.preview` | `RenderPreviewArgs` | plugin-live task | JSON/base64 render task data | `ExportPluginTask.test.ts` serialization only |
| `execute_code` | `ExecuteCodeArgs` | plugin-live task, disabled unless `PENPOT_MCP_ENABLE_EXECUTE_CODE=true` | JSON disabled error or text execution result | `ExecuteCodeTool.test.ts` |
| `high_level_overview` | `EmptyToolArgs` | local static overview | text overview | gap: no focused test |
| `penpot_api_info` | `PenpotApiInfoArgs` | local API docs index | text/JSON API info | gap: no focused test |
| `export_shape` | `ExportShapeArgs` | legacy plugin-live export task | base64/text export data | gap: covered indirectly by legacy flow only |
| `import_image` | `ImportImageArgs` | optional local-fs plus plugin-live task, gated by file-system access | text/JSON import result | gap: no focused test in default run |

## MCP Tool Names Declared But Not Registered

`ToolNames.ts` already names several planned tools that `PenpotMcpServer` does
not register yet:

- global/file: `file.search`, `file.duplicate`, `file.open`,
  `token.get_mcp_status`
- file context: `selection.get`, `selection.set`
- design editing: `shape.group`, `shape.ungroup`, `shape.set_layout`,
  `shape.set_style`, `component.create`, `component.instantiate`,
  `tokens.list`, `tokens.apply`
- prototype/export: `prototype.create_overlay`,
  `prototype.list_interactions`, `prototype.delete_interaction`,
  `export.file`, `render.thumbnail`
- debug: `debug.get_plugin_state`, `debug.get_agent_logs`

Do not migrate these as executable descriptors until their implementation is
registered or the descriptor explicitly marks them as planned/unavailable.

## CLI Command Inventory

| CLI command | Internal command name | Adapter path | Response shape | Coverage |
| --- | --- | --- | --- | --- |
| `mcp status` | `mcp.status` | HTTP GET status URL | JSON/text MCP status snapshot | gap: no smoke test |
| `mcp config` | `mcp.config` | local env/runtime derivation | JSON/text mode, endpoints, log dir, profile-prop preview | `cli-smoke.test.mjs` |
| `mcp logs` | `mcp.logs` | local filesystem log directory | JSON/text log file summaries or follow stream | gap: no smoke test |
| `dev up --mcp` | `dev.up` | local process orchestration | JSON/text dry-run plan or `manage.sh start-devenv` result | dry-run smoke test |
| `file list` | `file.list` | backend-rpc `get-project-files` | JSON/text `{projectId,files,adapter}` | gap: auth/path only implicit |
| `file create` | `file.create` | backend-rpc `create-file` | JSON/text `{file,url,adapter,nextActions}` | gap: no smoke test |
| `file open` | `file.open` | browser-url generation | JSON/text `{fileId,url,adapter,boundContext:false}` | smoke test |
| `page list` | `page.list` | backend-command RPC `get-file-pages` | JSON/text `{fileId,pages,adapter,adapterSelection}` | gap: no smoke test |
| `page create` | `page.create` | backend-command RPC `create-file-page` | JSON/text `{fileId,page,revn,vern,adapter,adapterSelection}` | gap: no smoke test |
| `shape create-frame` | `shape.create_frame` | backend-command RPC `create-file-shape` | JSON/text `{fileId,shape,revn,vern,adapter,adapterSelection}` | gap: no smoke test |
| `shape create-rect` | `shape.create_rect` | backend-command RPC `create-file-shape` | JSON/text `{fileId,shape,revn,vern,adapter,adapterSelection}` | gap: no smoke test |
| `shape create-text` | `shape.create_text` | backend-command RPC `create-file-shape` | JSON/text `{fileId,shape,revn,vern,adapter,adapterSelection}` | gap: no smoke test |
| `shape update` | `shape.update` | backend-command RPC `update-file-shape` | JSON/text `{fileId,shape,revn,vern,adapter,adapterSelection}` | validation smoke test only |
| `shape delete` | `shape.delete` | backend-command RPC `delete-file-shape` | JSON/text `{fileId,shape,revn,vern,deleted,adapter,adapterSelection}` | gap: no smoke test |
| `export page` | `export.page` | exporter HTTP service | JSON/text dry-run plan or exporter resource metadata/output path | dry-run and adapter-error smoke tests |

## Duplicated Metadata To Move

- Command/tool names are split across `ToolNames.ts`, CLI help strings, CLI
  handler switch statements, and ad hoc `command` fields in JSON payloads.
- Input metadata is duplicated between Zod tool schemas and CLI option parsing.
- Adapter candidates are repeated in MCP page/shape tools and CLI page/shape
  handlers, with only selection mechanics shared.
- Response envelopes all use `status: "ok" | "error"` but construct
  `data`, `error`, `warnings`, `nextActions`, and `adapterSelection` locally.
- Backend RPC method names live inside each command implementation instead of
  descriptor metadata.
- Test coverage is command-specific and not descriptor-driven; there is no
  descriptor snapshot that proves MCP and CLI expose the same command catalog.

## Recommended First Migration Slice

Start B2/P10.3 with low-risk descriptors that have stable names and simple
adapters:

1. `mcp.get_status` and CLI `mcp status`
2. CLI-only `mcp.config` as a local descriptor with no MCP tool registration
3. `file.list`, `file.create`, and CLI `file open`
4. `page.list` and `page.create`

Keep shape, export, prototype, file-context, and legacy tools out of the first
descriptor migration because they carry plugin-live fallback, binary/base64
payloads, destructive confirmation, or live context semantics.

## P10.3 Acceptance Targets

- Add descriptor metadata without changing public MCP tool names or CLI command
  names.
- Keep current JSON/text response shapes backward compatible.
- Add descriptor snapshot tests before moving behavior.
- Preserve `selectCommandAdapter` output fields exactly.
