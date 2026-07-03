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

As of P11.1, `@penpot/command-runtime` exposes adapter-selection helpers, a
low-risk command descriptor catalog, shared request/result envelope helpers,
and centralized command error/reason metadata for status/config/file/page
migration plus headless page rename and shape/export/render descriptor
metadata.

Adapter-selection helpers:

- adapter kinds: `backend-rpc`, `backend-command`, `plugin-live`, `exporter`,
  `browser-url`, `local-fs`
- requested adapter normalization: explicit adapter or `auto`
- selection result metadata: `command`, `requested`, `selected`, `status`,
  `candidates`, and `fallbacks`

Descriptor catalog:

- descriptors: `mcp.status`, `mcp.config`, `file.list`, `file.create`,
  `file.open`, `page.list`, `page.create`
- headless authoring descriptors: `page.rename`
- shape/export descriptors: `shape.create_frame`, `shape.create_rect`,
  `shape.create_text`, `shape.create_image`, `shape.update`, `shape.delete`,
  `export.shape`, `export.page`, `export.file`, `render.preview`,
  `render.thumbnail`
- lookup helper: `getCommandDescriptor(id)` by internal id, MCP tool name, or
  CLI command string
- descriptor groups: `LowRiskCommandDescriptors`,
  `HeadlessAuthoringCommandDescriptors`,
  `ShapeExportCommandDescriptors`, and `MigratedCommandDescriptors`

Envelope helpers:

- request helper: `createCommandRequestEnvelope(command, options)` records the
  command descriptor summary, transport, input, target, token-safe auth
  presence, adapter, adapter selection, and diagnostics metadata
- result helper: `createCommandResultEnvelope(requestEnvelope, data, options)`
  carries status, command, descriptor, transport, adapter, target, auth,
  diagnostics, adapter selection, payload data, and warnings
- token handling: auth metadata intentionally records presence/source/mode only
  and does not copy token values

Error and reason helpers:

- error codes: `CommandErrorCodes` covers auth, backend config/unavailable,
  permission/not-found, rate limits, adapter unsupported/unavailable, file
  context required, write limits, and destructive confirmation
- adapter reasons: `AdapterSelectionReasonCodes` plus
  `getAdapterSelectionReason(code)` centralizes backend target requirements,
  plugin-live fallback conflicts, and CLI plugin-live unsupported reasons
- adapter failure payloads:
  `createAdapterSelectionError(selection, {actions,data})` returns the same
  `code`, `message`, `actions`, and `data.adapterSelection` shape used by MCP
  tools and CLI JSON output

Runtime tests:

- package script: `pnpm --filter @penpot/command-runtime test`
- coverage: descriptor groups, descriptor lookup by internal/MCP/CLI names,
  adapter selection priority, unsupported/unavailable adapter error payloads,
  adapter reason text, and token-safe request/result envelopes

It still does not own executable input schemas, CLI help metadata, transport
edge formatting, or RPC method names. Those fields remain duplicated between
MCP server tool classes and `penpot-cli`.

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
| `file.open` | `FileOpenArgs` | browser-url generation | JSON `{fileId,workspaceUrl,handoff,adapter,boundContext:false}` | `FileOpenTool.test.ts` |
| `file.get_context` | `EmptyToolArgs` | server file-context registry | JSON `{fileContext,nextActions}` | registry coverage only |
| `file.bind_context` | `FileBindContextArgs` | registry lookup plus backend RPC `get-file-summary` | JSON `{boundContext,verifiedFile,nextActions}` | registry coverage only |
| `file.release_context` | `EmptyToolArgs` | server file-context registry | JSON `{released,releasedContext,fileContext,nextActions}` | registry coverage only |
| `page.list` | `PageListArgs` | backend-command RPC `get-file-pages` when `fileId`; otherwise plugin-live task | JSON `{adapter,adapterSelection,fileId,pages}` or plugin task data | `PageTools.test.ts`, `PagePluginTask.test.ts` |
| `page.create` | `PageCreateArgs` | backend-command RPC `create-file-page` when `fileId`; otherwise plugin-live task | JSON `{adapter,adapterSelection,fileId,page,revn,vern}` or plugin task data | `PageTools.test.ts`, `PagePluginTask.test.ts` |
| `page.rename` | `PageRenameArgs` | backend-command RPC `rename-file-page` when `fileId`; otherwise plugin-live task | JSON `{adapter,adapterSelection,fileId,page,revn,vern}` or plugin task data | `PageTools.test.ts`, `PagePluginTask.test.ts` |
| `page.set_current` | `PageSetCurrentArgs` | plugin-live task | JSON plugin task data plus adapter metadata; unbound errors include live-only recovery metadata and target-aware handoff when a context can identify the file | `PagePluginTask.test.ts`, `PageTools.test.ts`, `FileContextGuard.test.ts` |
| `shape.create_frame` | `ShapeCreateFrameArgs` | backend-command RPC `create-file-shape` when `fileId`/`pageId`; otherwise plugin-live task | JSON `{adapter,adapterSelection,fileId,shape,revn,vern}` or plugin task data | `ShapeCreateTools.test.ts`, `ShapePluginTask.test.ts` |
| `shape.create_rect` | `ShapeCreateRectArgs` | backend-command RPC `create-file-shape` when `fileId`/`pageId`; otherwise plugin-live task | JSON `{adapter,adapterSelection,fileId,shape,revn,vern}` or plugin task data | `ShapeCreateTools.test.ts`, `ShapePluginTask.test.ts` |
| `shape.create_text` | `ShapeCreateTextArgs` | backend-command RPC `create-file-shape` when `fileId`/`pageId`; otherwise plugin-live task | JSON `{adapter,adapterSelection,fileId,shape,revn,vern}` or plugin task data | `ShapeCreateTools.test.ts`, `ShapePluginTask.test.ts` |
| `shape.create_image` | `ShapeCreateImageArgs` | backend-command RPC `create-file-image-shape` when `fileId`/`pageId`; otherwise plugin-live task | JSON `{adapter,adapterSelection,fileId,shape,media,revn,vern}` or plugin task data | `ShapeCreateTools.test.ts`, `ShapePluginTask.test.ts` |
| `shape.update` | `ShapeUpdateArgs` | backend-command RPC `update-file-shape` when `fileId`; otherwise plugin-live task; backend-only rich style/hierarchy fields and frame `layout none|flex|grid` require `fileId`; backend grid support is limited to container direction, rows/columns tracks, gaps, padding, and alignment | JSON `{adapter,adapterSelection,fileId,shape,revn,vern}` or plugin task data | `ShapeCreateTools.test.ts`, `ShapePluginTask.test.ts` |
| `shape.set_layout` | `ShapeSetLayoutArgs` | MCP/CLI alias over `shape.update.layout`; backend-command RPC `update-file-shape` when `fileId`; otherwise plugin-live `shape` update task | `shape.update`-compatible JSON with alias command/tool audit metadata | `ShapeCreateTools.test.ts`, `cli-smoke.test.mjs` |
| `shape.set_style` | `ShapeSetStyleArgs` | MCP/CLI alias over `shape.update` style/text fields; backend-command RPC `update-file-shape` when `fileId`; otherwise plugin-live `shape` update task for supported fields | `shape.update`-compatible JSON with alias command/tool audit metadata | `ShapeCreateTools.test.ts`, `cli-smoke.test.mjs` |
| `shape.delete` | `ShapeDeleteArgs` | backend-command RPC `delete-file-shape` when `fileId`; otherwise plugin-live task | JSON `{adapter,adapterSelection,fileId,shape,revn,vern,deleted}` or confirmation error | `ShapeCreateTools.test.ts`, `ShapePluginTask.test.ts` |
| `prototype.create_flow` | `PrototypeCreateFlowArgs` | plugin-live task | JSON plugin task data | `PrototypePluginTask.test.ts` |
| `prototype.create_interaction` | `PrototypeCreateInteractionArgs` | plugin-live task | JSON plugin task data | `PrototypePluginTask.test.ts` |
| `export.shape` | `ExportShapeArgs` | plugin-live task | JSON/base64 export task data | `ExportPluginTask.test.ts` serialization only |
| `export.page` | `ExportPageArgs` | plugin-live task | JSON/base64 export task data | `ExportPluginTask.test.ts` serialization only |
| `export.file` | `ExportFileArgs`; CLI contract implemented | MCP and CLI backend-rpc `export-binfile` RPC/SSE execution | `.penpot` artifact metadata plus backend resource URI; CLI can additionally write the archive with `--output` | `ExportTools.test.ts` covers MCP SSE resource return; `PenpotRpcClient.test.ts` covers SSE parsing/errors; `command-runtime.test.mjs` consumes `export-file-contract-fixtures.json`; `cli-smoke.test.mjs` covers dry-run, SSE, output write, adapter error, and auth error |
| `render.preview` | `RenderPreviewArgs` | exporter HTTP service for explicit targets; plugin-live task for bound workspace context | JSON exporter resource metadata or JSON/base64 render task data | `ExportTools.test.ts` covers exporter/plugin-live/adapter errors; `ExportPluginTask.test.ts` covers serialization |
| `render.thumbnail` | `RenderThumbnailArgs`; MCP and CLI dry-run/client boundaries | dashboard thumbnail data/render/cache contract with `renderer-service` planning adapter, metadata-only availability probe, response/error normalization, disabled client request scaffold, closed execution gate, disabled health preflight, executable client harness plan, disabled dispatch adapter boundary, opt-in configuration surfaces, unavailable error taxonomy, integration fixture harness, dispatch registration preflight, executable adapter registration scaffold, adapter registry manifest, enablement checklist, implementation slice audit, health/no-op contract fixtures, no-op service host scaffold, host lifecycle test fixtures, package manifest scaffold, package creation guardrails, package file templates, and package workspace wiring; runtime execution remains unavailable | MCP/CLI dry-run plan with PNG thumbnail artifact metadata, renderer-service request shape, client config, availability status, response/error contracts, `clientRequest.dispatch:false`, `executionGate.dispatch:false`, `healthPreflight.dispatch:false`, `executionClientHarness.dispatch:false`, `dispatchAdapterBoundary.dispatch:false`, `optInConfiguration.dispatch:false`, `unavailableErrorTaxonomy.dispatch:false`, `integrationFixtureHarness.dispatch:false`, `dispatchRegistrationPreflight.runtimeRegistration:false`, `executableAdapterRegistrationScaffold.runtimeRegistration:false`, `adapterRegistryManifest.runtimeRegistration:false`, `enablementChecklist.runtimeRegistration:false`, `implementationSliceAudit.runtimeRegistration:false`, `healthNoopContractFixtures.runtimeRegistration:false`, `noopServiceHostScaffold.hostStartup:false`, `hostLifecycleTestFixtures.processSpawn:false`, `packageManifestScaffold.packageCreated:false`/`workspaceMutation:false`/`scriptRunnable:false`, `packageCreationGuardrails.packageCreated:false`/`workspaceMutation:false`/`scriptRunnable:false`/`hostStartup:false`/`processSpawn:false`, `packageFileTemplates.fileMaterialization:false`/`packageCreated:false`/`workspaceMutation:false`/`scriptRunnable:false`, and `packageWorkspaceWiring.pnpmWorkspaceMutation:false`/`rootPackageJsonMutation:false`/`lockfileMutation:false`/`workspaceMutation:false`/`packageCreated:false`/`scriptRunnable:false`/`fileMaterialization:false`; `dryRun:false`/execution reports `renderer_service_unavailable` and no runtime rendering | `command-runtime.test.mjs` consumes `render-thumbnail-contract-fixtures.json`, `render-thumbnail-runtime-boundary-fixtures.json`, and `render-thumbnail-renderer-service-fixtures.json`; MCP `ExportTools.test.ts` and CLI smoke tests cover dry-run, unavailable execution, client availability, response contract exposure, disabled client scaffold, closed execution gate, disabled preflight/harness metadata, disabled dispatch adapter boundary, opt-in configuration surfaces, unavailable error taxonomy, integration fixture harness, dispatch registration preflight, executable adapter registration scaffold, adapter registry manifest, enablement checklist, implementation slice audit, health/no-op contract fixtures, no-op service host scaffold, host lifecycle test fixtures, package manifest scaffold, package creation guardrails, package file templates, package workspace wiring, and adapter errors |
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
- file context: `page.set_current`, `selection.get`, and `selection.set` are implemented but remain plugin-live and now share live-only recovery metadata with the same binding flow
- design editing: `shape.group`, `shape.ungroup`, `component.create`,
  `component.instantiate`, `tokens.list`, `tokens.apply`; `shape.set_layout`
  and `shape.set_style` are registered MCP aliases over `shape.update` with
  matching `shape set-layout` and `shape set-style` CLI aliases
- prototype/export: `prototype.create_overlay` and
  `prototype.delete_interaction` are registered backend-command mutations for
  explicit persisted prototype targets. P22.2 adds optional `interactionId`
  and `identity.kind` metadata to prototype reads, and P22.3 allows
  `prototype.delete_interaction` to target that stable id while preserving
  source-shape/index deletion as the legacy fallback. P22.4 adds
  descriptor-only planned `prototype.update_interaction`,
  `prototype.reorder_interaction`, and `prototype.duplicate_interaction`
  contracts with empty adapter lists; `export.file` is registered in MCP and
  CLI through backend-rpc; `render.thumbnail` has a fixture-backed
  target/cache/artifact contract, a P25.6 renderer-service boundary audit,
  P25.7 renderer-service API fixtures, a P25.8 CLI dry-run/client boundary,
  a P25.9 MCP planning-only dry-run tool, P25.10 metadata-only client
  availability probes, P25.11 response/error normalization contracts, P25.12
  disabled client request scaffolding, P25.13 closed execution gate metadata,
  P25.14 disabled health preflight plus execution harness metadata, P25.15
  disabled dispatch adapter boundary metadata, P25.16 opt-in configuration
  surfaces, P25.17 unavailable error taxonomy, P25.18 integration fixture
  harness, P25.19 dispatch registration preflight, P25.20 disabled executable
  adapter registration scaffold, P25.21 adapter registry manifest, P25.22
  enablement checklist, P25.23 implementation slice audit, and P25.24
  health/no-op contract fixtures, P25.25 no-op service host scaffold,
  P25.26 host lifecycle test fixtures, P25.27 package manifest scaffold
  metadata, P25.28 package creation guardrails, P25.29 package file
  templates, and P25.30 package workspace wiring while runtime execution remains
  unavailable
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
| `file open` | `file.open` | browser-url generation | JSON/text `{fileId,url,workspaceUrl,handoff,adapter,boundContext:false}` | smoke test |
| `page list` | `page.list` | backend-command RPC `get-file-pages` | JSON/text `{fileId,pages,adapter,adapterSelection}` | gap: no smoke test |
| `page create` | `page.create` | backend-command RPC `create-file-page` | JSON/text `{fileId,page,revn,vern,adapter,adapterSelection}` | gap: no smoke test |
| `page rename` | `page.rename` | backend-command RPC `rename-file-page` | JSON/text `{fileId,page,revn,vern,adapter,adapterSelection}` | RPC smoke test |
| `shape create-frame` | `shape.create_frame` | backend-command RPC `create-file-shape` | JSON/text `{fileId,shape,revn,vern,adapter,adapterSelection}` | gap: no smoke test |
| `shape create-rect` | `shape.create_rect` | backend-command RPC `create-file-shape` | JSON/text `{fileId,shape,revn,vern,adapter,adapterSelection}` | gap: no smoke test |
| `shape create-text` | `shape.create_text` | backend-command RPC `create-file-shape` | JSON/text `{fileId,shape,revn,vern,adapter,adapterSelection}` | gap: no smoke test |
| `shape update` | `shape.update` | backend-command RPC `update-file-shape` | JSON/text `{fileId,shape,revn,vern,adapter,adapterSelection}` | validation and rich field RPC smoke tests |
| `shape set-layout` | `shape.set_layout` | backend-command RPC `update-file-shape`, layout-only alias over `shape update` | JSON/text `{fileId,shape,revn,vern,adapter,adapterSelection}` | alias RPC smoke tests |
| `shape set-style` | `shape.set_style` | backend-command RPC `update-file-shape`, style/text-only alias over `shape update` | JSON/text `{fileId,shape,revn,vern,adapter,adapterSelection}` | alias RPC smoke tests |
| `shape delete` | `shape.delete` | backend-command RPC `delete-file-shape` | JSON/text `{fileId,shape,revn,vern,deleted,adapter,adapterSelection}` | gap: no smoke test |
| `export page` | `export.page` | exporter HTTP service | JSON/text dry-run plan or exporter resource metadata/output path | dry-run and adapter-error smoke tests |
| `export file` | `export.file` | backend-rpc `export-binfile` SSE | JSON/text dry-run plan or backend resource metadata/output path | dry-run, SSE resource, output-write, adapter-error, and auth smoke tests |
| `render preview` | `render.preview` | exporter HTTP service | JSON/text dry-run plan or exporter preview resource metadata/output path | dry-run and output-write smoke tests |

## Duplicated Metadata To Move

- Command/tool names are split across `ToolNames.ts`, CLI help strings, CLI
  handler switch statements, and some ad hoc `command` fields in JSON payloads;
  status/config/file/page/shape/export/render migrated paths now use shared
  descriptors for command ids and tool descriptions.
- Input metadata is duplicated between Zod tool schemas and CLI option parsing.
- Adapter candidates are repeated in MCP page/shape tools and CLI page/shape
  handlers, but candidate failure codes, common reason text, and selection
  failure payloads now come from `command-runtime`.
- Response envelopes now share internal request/result metadata for the
  low-risk slice, but public `data`, `error`, `warnings`, `nextActions`, and
  `adapterSelection` formatting is still constructed at the MCP/CLI edges.
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

## P10.4 Acceptance Targets

- Add token-safe request/result envelope helpers without changing public MCP or
  CLI output shapes.
- Wire low-risk `mcp.status`, `mcp.config`, `file.list`, `file.create`,
  `file.open`, `page.list`, and `page.create` paths through the shared
  internal envelope.
- Keep transport-specific formatting at the MCP/CLI edges so existing clients
  continue to parse the same JSON/text payloads.
- Add smoke coverage for descriptor lookup, adapter selection, token-safe auth
  metadata, and result payload preservation.

## P10.5 Acceptance Targets

- Add shared command error codes for adapter, auth, backend, file-context,
  rate-limit, write-limit, and destructive confirmation cases.
- Add shared adapter-selection reason codes and reason text for backend target
  requirements, plugin-live conflicts, and CLI plugin-live unsupported paths.
- Route MCP page/shape adapter failures and CLI adapter failures through the
  same `createAdapterSelectionError` helper while preserving existing public
  error payload shape.
- Align MCP backend/auth/context/destructive error code constants with
  `CommandErrorCodes`.

## P10.6 Acceptance Targets

- Add descriptors for implemented typed shape tools:
  `shape.create_frame`, `shape.create_rect`, `shape.create_text`,
  `shape.create_image`, `shape.update`, and `shape.delete`.
- Add descriptors for implemented export/render tools: `export.shape`,
  `export.page`, and `render.preview`.
- Keep `LowRiskCommandDescriptors` stable while adding
  `ShapeExportCommandDescriptors` and `MigratedCommandDescriptors`.
- Wire MCP shape/export tool names and descriptions plus CLI shape/export
  command ids to `CommandDescriptors` without changing execution behavior or
  public output shapes.

## P10.7 Acceptance Targets

- Add focused command-runtime tests for descriptor groups and lookup.
- Cover adapter-selection priority, explicit unsupported adapters, explicit
  unavailable adapters, shared reason text, and adapter error payload shape.
- Cover token-safe request/result envelope behavior outside the CLI smoke
  tests.
- Preserve CLI and MCP no-service smoke coverage for migrated commands.
