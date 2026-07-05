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
| `render.thumbnail` | `RenderThumbnailArgs`; MCP and CLI dry-run/client boundaries | dashboard thumbnail data/render/cache contract with `renderer-service` planning adapter, metadata-only availability probe, response/error normalization, disabled client request scaffold, closed execution gate, disabled health preflight, executable client harness plan, disabled dispatch adapter boundary, opt-in configuration surfaces, unavailable error taxonomy, integration fixture harness, dispatch registration preflight, executable adapter registration scaffold, adapter registry manifest, enablement checklist, implementation slice audit, health/no-op contract fixtures, no-op service host scaffold, host lifecycle test fixtures, package manifest scaffold, package creation guardrails, package file templates, package workspace wiring, package build verification, package materialization checklist, package creation dry-run summary, package creation file manifest, package materialization approval gate, package materialization execution dry-run, package materialization write contract, package materialization rollback contract, package materialization verification manifest, package materialization final approval checklist, package materialization explicit approval token, package materialization approval audit trail, package materialization approval replay guard, package materialization approval expiry policy, package materialization approval revocation policy, package materialization approval scope binding policy, package materialization approval operator confirmation policy, package materialization approval emergency stop policy, package materialization approval readiness verdict policy, package materialization approval execution handoff policy, package materialization approval post-handoff audit policy, package materialization approval audit retention policy, package materialization approval audit access policy, package materialization approval audit integrity policy, package materialization approval audit provenance policy, package materialization approval audit custody policy, package materialization approval audit evidence policy, package materialization approval audit attestation policy, package materialization approval audit notarization policy, package materialization approval audit certification policy, package materialization approval audit endorsement policy, package materialization approval audit countersignature policy, package materialization approval audit countersignature verification policy, package materialization approval audit countersignature revocation policy, package materialization approval audit countersignature revocation appeal policy, package materialization approval audit countersignature revocation appeal resolution policy, package materialization approval audit countersignature revocation appeal resolution enforcement policy, package materialization approval audit countersignature revocation appeal resolution enforcement evidence policy, package materialization approval audit countersignature revocation appeal resolution enforcement evidence attestation policy, package materialization approval audit countersignature revocation appeal resolution enforcement evidence attestation notarization policy, package materialization approval audit countersignature revocation appeal resolution enforcement evidence attestation notarization certification policy, package materialization approval audit countersignature revocation appeal resolution enforcement evidence attestation notarization certification endorsement policy, and package materialization approval audit countersignature revocation appeal resolution enforcement evidence attestation notarization certification endorsement countersignature policy, and package materialization approval audit countersignature revocation appeal resolution enforcement evidence attestation notarization certification endorsement countersignature verification policy; runtime execution remains unavailable | MCP/CLI dry-run plan with PNG thumbnail artifact metadata, renderer-service request shape, client config, availability status, response/error contracts, `clientRequest.dispatch:false`, `executionGate.dispatch:false`, `healthPreflight.dispatch:false`, `executionClientHarness.dispatch:false`, `dispatchAdapterBoundary.dispatch:false`, `optInConfiguration.dispatch:false`, `unavailableErrorTaxonomy.dispatch:false`, `integrationFixtureHarness.dispatch:false`, `dispatchRegistrationPreflight.runtimeRegistration:false`, `executableAdapterRegistrationScaffold.runtimeRegistration:false`, `adapterRegistryManifest.runtimeRegistration:false`, `enablementChecklist.runtimeRegistration:false`, `implementationSliceAudit.runtimeRegistration:false`, `healthNoopContractFixtures.runtimeRegistration:false`, `noopServiceHostScaffold.hostStartup:false`, `hostLifecycleTestFixtures.processSpawn:false`, `packageManifestScaffold.packageCreated:false`/`workspaceMutation:false`/`scriptRunnable:false`, `packageCreationGuardrails.packageCreated:false`/`workspaceMutation:false`/`scriptRunnable:false`/`hostStartup:false`/`processSpawn:false`, `packageFileTemplates.fileMaterialization:false`/`packageCreated:false`/`workspaceMutation:false`/`scriptRunnable:false`, and `packageWorkspaceWiring.pnpmWorkspaceMutation:false`/`rootPackageJsonMutation:false`/`lockfileMutation:false`/`workspaceMutation:false`/`packageCreated:false`/`scriptRunnable:false`/`fileMaterialization:false`, and `packageBuildVerification.commandExecution:false`/`buildOutput:false`/`packageScriptsRunnable:false`/`processSpawn:false`, and `packageMaterializationChecklist.materializationApproved:false`/`fileMaterialization:false`/`workspaceMutation:false`/`lockfileMutation:false`, and `packageCreationDryRunSummary.dryRunOnly:true`/`filesWritten:false`/`fileMaterialization:false`/`workspaceMutation:false`, and `packageCreationFileManifest.dryRunOnly:true`/`filesWritten:false`/`fileMaterialization:false`/`workspaceMutation:false`, and `packageMaterializationApprovalGate.approvalRequired:true`/`approved:false`/`filesWritten:false`/`fileMaterialization:false`/`workspaceMutation:false`, and `packageMaterializationExecutionDryRun.executeNow:false`/`approved:false`/`filesWritten:false`/`fileMaterialization:false`/`workspaceMutation:false`, and `packageMaterializationWriteContract.executeNow:false`/`approved:false`/`filesWritten:false`/`fileMaterialization:false`/`workspaceMutation:false`, and `packageMaterializationRollbackContract.executeNow:false`/`rollbackNow:false`/`approved:false`/`filesWritten:false`/`rollbackExecuted:false`/`fileMaterialization:false`/`workspaceMutation:false`, and `packageMaterializationVerificationManifest.executeNow:false`/`verifyNow:false`/`approved:false`/`filesWritten:false`/`verificationExecuted:false`/`commandExecution:false`/`buildOutput:false`, and `packageMaterializationFinalApprovalChecklist.finalApprovalGranted:false`/`executeNow:false`/`approved:false`/`filesWritten:false`/`commandExecution:false`/`buildOutput:false`, and `packageMaterializationExplicitApprovalToken.tokenAccepted:false`/`tokenStored:false`/`tokenValidated:false`/`approved:false`/`finalApprovalGranted:false`/`filesWritten:false`/`commandExecution:false`/`buildOutput:false`, and `packageMaterializationApprovalAuditTrail.auditRecordWritten:false`/`writeAuditNow:false`/`approved:false`/`finalApprovalGranted:false`/`filesWritten:false`/`commandExecution:false`/`buildOutput:false`, and `packageMaterializationApprovalReplayGuard.replayCheckExecuted:false`/`tokenConsumed:false`/`approved:false`/`finalApprovalGranted:false`/`filesWritten:false`/`commandExecution:false`/`buildOutput:false`, and `packageMaterializationApprovalExpiryPolicy.expiryCheckExecuted:false`/`tokenAccepted:false`/`tokenValidated:false`/`tokenConsumed:false`/`approved:false`/`finalApprovalGranted:false`/`filesWritten:false`/`commandExecution:false`/`buildOutput:false`, and `packageMaterializationApprovalRevocationPolicy.revocationCheckExecuted:false`/`revocationRegistryFetched:false`/`revocationStatusTrusted:false`/`tokenAccepted:false`/`tokenValidated:false`/`approved:false`/`finalApprovalGranted:false`/`filesWritten:false`/`commandExecution:false`/`buildOutput:false`, and `packageMaterializationApprovalScopeBindingPolicy.scopeBindingExecuted:false`/`approvalScopeHashComputed:false`/`fileSnapshotRead:false`/`workspaceHashComputed:false`/`tokenAccepted:false`/`tokenValidated:false`/`approved:false`/`finalApprovalGranted:false`/`filesWritten:false`/`commandExecution:false`/`buildOutput:false`, and `packageMaterializationApprovalExecutionHandoffPolicy.handoffPrepared:false`/`handoffQueued:false`/`handoffStored:false`/`executionJobCreated:false`/`executionJobQueued:false`/`executionJobDispatched:false`/`materializationReady:false`/`materializationApproved:false`/`filesWritten:false`/`commandExecution:false`/`buildOutput:false`, and `packageMaterializationApprovalPostHandoffAuditPolicy.auditRecordPrepared:false`/`auditRecordStored:false`/`auditRecordWritten:false`/`handoffSnapshotCaptured:false`/`executionJobSnapshotCaptured:false`/`materializationReady:false`/`materializationApproved:false`/`filesWritten:false`/`commandExecution:false`/`buildOutput:false`, and `packageMaterializationApprovalAuditRetentionPolicy.retentionPolicySelected:false`/`retentionWindowComputed:false`/`retentionClockTrusted:false`/`retentionRecordStored:false`/`purgeScheduled:false`/`purgeExecuted:false`/`exportWritten:false`/`auditRecordWritten:false`/`filesWritten:false`/`commandExecution:false`/`buildOutput:false`, and `packageMaterializationApprovalAuditAccessPolicy.accessPolicySelected:false`/`accessSubjectIdentified:false`/`accessScopeComputed:false`/`accessGranted:false`/`auditRecordRead:false`/`auditRecordQueried:false`/`auditRecordExported:false`/`accessTokenIssued:false`/`filesWritten:false`/`commandExecution:false`/`buildOutput:false`, and `packageMaterializationApprovalAuditProvenancePolicy.provenancePolicySelected:false`/`provenanceSourceCollected:false`/`provenanceGraphComputed:false`/`provenanceRecordCreated:false`/`auditRecordRead:false`/`auditRecordQueried:false`/`provenanceHashComputed:false`/`filesWritten:false`/`commandExecution:false`/`buildOutput:false`, and `packageMaterializationApprovalAuditCustodyPolicy.custodyPolicySelected:false`/`custodyTransferPrepared:false`/`custodyTransferExecuted:false`/`custodyTaken:false`/`custodyReleased:false`/`custodyRecordCreated:false`/`auditRecordRead:false`/`auditRecordQueried:false`/`custodyHashComputed:false`/`filesWritten:false`/`commandExecution:false`/`buildOutput:false`, and `packageMaterializationApprovalAuditEvidencePolicy.evidencePolicySelected:false`/`evidenceCollected:false`/`evidenceValidated:false`/`evidenceNormalized:false`/`evidenceRecordCreated:false`/`evidenceBundleCreated:false`/`auditRecordRead:false`/`auditRecordQueried:false`/`evidenceHashComputed:false`/`filesWritten:false`/`commandExecution:false`/`buildOutput:false`, and `packageMaterializationApprovalAuditCountersignaturePolicy.countersignatureCreated:false`/`countersignatureRecordStored:false`/`endorsementCountersigned:false`/`auditRecordRead:false`/`countersignatureHashComputed:false`/`filesWritten:false`/`commandExecution:false`/`buildOutput:false`, and `packageMaterializationApprovalAuditCountersignatureVerificationPolicy.countersignatureRead:false`/`countersignatureSignatureVerified:false`/`countersignatureHashComputed:false`/`countersignatureVerificationExecuted:false`/`auditRecordRead:false`/`filesWritten:false`/`commandExecution:false`/`buildOutput:false`, and `packageMaterializationApprovalAuditCountersignatureRevocationPolicy.countersignatureRevoked:false`/`countersignatureRevocationRecordStored:false`/`countersignatureVerificationRead:false`/`auditRecordRead:false`/`countersignatureRevocationHashComputed:false`/`filesWritten:false`/`commandExecution:false`/`buildOutput:false`, and `packageMaterializationApprovalAuditCountersignatureRevocationAppealPolicy.countersignatureRevocationAppealed:false`/`countersignatureRevocationAppealRecordStored:false`/`countersignatureRevocationRead:false`/`auditRecordRead:false`/`countersignatureRevocationAppealHashComputed:false`/`filesWritten:false`/`commandExecution:false`/`buildOutput:false`, and `packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionPolicy.countersignatureRevocationAppealResolved:false`/`countersignatureRevocationAppealResolutionRecordStored:false`/`countersignatureRevocationAppealRead:false`/`auditRecordRead:false`/`countersignatureRevocationAppealResolutionHashComputed:false`/`filesWritten:false`/`commandExecution:false`/`buildOutput:false`, and `packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementPolicy.countersignatureRevocationAppealResolutionEnforced:false`/`countersignatureRevocationAppealResolutionEnforcementRecordStored:false`/`countersignatureRevocationAppealResolutionRead:false`/`auditRecordRead:false`/`countersignatureRevocationAppealResolutionEnforcementHashComputed:false`/`filesWritten:false`/`commandExecution:false`/`buildOutput:false`, and `packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidencePolicy.countersignatureRevocationAppealResolutionEnforcementEvidenceCollected:false`/`countersignatureRevocationAppealResolutionEnforcementEvidenceRecordStored:false`/`countersignatureRevocationAppealResolutionEnforcementRead:false`/`auditRecordRead:false`/`countersignatureRevocationAppealResolutionEnforcementEvidenceHashComputed:false`/`filesWritten:false`/`commandExecution:false`/`buildOutput:false`, and `packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationPolicy.countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationCreated:false`/`countersignatureRevocationAppealResolutionEnforcementEvidenceRecordRead:false`/`auditRecordRead:false`/`countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationHashComputed:false`/`filesWritten:false`/`commandExecution:false`/`buildOutput:false`, and `packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationPolicy.countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCreated:false`/`countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationRead:false`/`auditRecordRead:false`/`countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationHashComputed:false`/`filesWritten:false`/`commandExecution:false`/`buildOutput:false`, and `packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationPolicy.countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationCreated:false`/`countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationRead:false`/`auditRecordRead:false`/`countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationHashComputed:false`/`filesWritten:false`/`commandExecution:false`/`buildOutput:false`, and `packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementPolicy.countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCreated:false`/`countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementRecordStored:false`/`countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationRead:false`/`auditRecordRead:false`/`countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementHashComputed:false`/`filesWritten:false`/`commandExecution:false`/`buildOutput:false`, and `packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignaturePolicy.countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureCreated:false`/`countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureRecordStored:false`/`countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementRead:false`/`auditRecordRead:false`/`countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureHashComputed:false`/`filesWritten:false`/`commandExecution:false`/`buildOutput:false`, and `packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationPolicy.countersignatureRead:false`/`countersignaturePayloadParsed:false`/`countersignatureSignatureVerified:false`/`countersignatureHashMatched:false`/`countersignatureChainVerified:false`/`countersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationExecuted:false`/`auditRecordRead:false`/`filesWritten:false`/`commandExecution:false`/`buildOutput:false`; `dryRun:false`/execution reports `renderer_service_unavailable` and no runtime rendering | `command-runtime.test.mjs` consumes `render-thumbnail-contract-fixtures.json`, `render-thumbnail-runtime-boundary-fixtures.json`, and `render-thumbnail-renderer-service-fixtures.json`; MCP `ExportTools.test.ts` and CLI smoke tests cover dry-run, unavailable execution, client availability, response contract exposure, disabled client scaffold, closed execution gate, disabled preflight/harness metadata, disabled dispatch adapter boundary, opt-in configuration surfaces, unavailable error taxonomy, integration fixture harness, dispatch registration preflight, executable adapter registration scaffold, adapter registry manifest, enablement checklist, implementation slice audit, health/no-op contract fixtures, no-op service host scaffold, host lifecycle test fixtures, package manifest scaffold, package creation guardrails, package file templates, package workspace wiring, package build verification, package materialization checklist, package creation dry-run summary, package creation file manifest, package materialization approval gate, package materialization execution dry-run, package materialization write contract, package materialization rollback contract, package materialization verification manifest, package materialization final approval checklist, package materialization explicit approval token, package materialization approval audit trail, package materialization approval replay guard, package materialization approval expiry policy, package materialization approval revocation policy, package materialization approval scope binding policy, package materialization approval operator confirmation policy, package materialization approval emergency stop policy, package materialization approval readiness verdict policy, package materialization approval execution handoff policy, package materialization approval post-handoff audit policy, package materialization approval audit retention policy, package materialization approval audit access policy, package materialization approval audit integrity policy, package materialization approval audit provenance policy, package materialization approval audit custody policy, package materialization approval audit evidence policy, package materialization approval audit attestation policy, package materialization approval audit notarization policy, package materialization approval audit certification policy, package materialization approval audit endorsement policy, package materialization approval audit countersignature policy, package materialization approval audit countersignature verification policy, package materialization approval audit countersignature revocation policy, package materialization approval audit countersignature revocation appeal policy, package materialization approval audit countersignature revocation appeal resolution policy, package materialization approval audit countersignature revocation appeal resolution enforcement policy, package materialization approval audit countersignature revocation appeal resolution enforcement evidence policy, package materialization approval audit countersignature revocation appeal resolution enforcement evidence attestation policy, package materialization approval audit countersignature revocation appeal resolution enforcement evidence attestation notarization policy, package materialization approval audit countersignature revocation appeal resolution enforcement evidence attestation notarization certification policy, package materialization approval audit countersignature revocation appeal resolution enforcement evidence attestation notarization certification endorsement policy, package materialization approval audit countersignature revocation appeal resolution enforcement evidence attestation notarization certification endorsement countersignature policy, package materialization approval audit countersignature revocation appeal resolution enforcement evidence attestation notarization certification endorsement countersignature verification policy, and adapter errors |
| `execute_code` | `ExecuteCodeArgs` | plugin-live task, disabled unless `PENPOT_MCP_ENABLE_EXECUTE_CODE=true` | JSON disabled error or text execution result | `ExecuteCodeTool.test.ts` |
| `high_level_overview` | `EmptyToolArgs` | local static overview | text overview | gap: no focused test |
| `penpot_api_info` | `PenpotApiInfoArgs` | local API docs index | text/JSON API info | gap: no focused test |
| `export_shape` | `ExportShapeArgs` | legacy plugin-live export task | base64/text export data | gap: covered indirectly by legacy flow only |
| `import_image` | `ImportImageArgs` | optional local-fs plus plugin-live task, gated by file-system access | text/JSON import result | gap: no focused test in default run |

P25.47 extends the `render.thumbnail` renderer-service planning payload with
`packageMaterializationApprovalOperatorConfirmationPolicy`. MCP and CLI dry-run
and unavailable execution payloads expose future explicit operator confirmation
metadata while keeping `operatorConfirmationPrompted:false`,
`operatorConfirmationReceived:false`, `operatorConfirmationStored:false`,
`operatorConfirmationValidated:false`, `operatorIdentityVerified:false`,
`confirmationTokenIssued:false`, `tokenAccepted:false`,
`tokenValidated:false`, `approved:false`, `finalApprovalGranted:false`,
`filesWritten:false`, `commandExecution:false`, and `buildOutput:false`.

P25.48 extends the `render.thumbnail` renderer-service planning payload with
`packageMaterializationApprovalEmergencyStopPolicy`. MCP and CLI dry-run and
unavailable execution payloads expose future emergency stop metadata while
keeping `emergencyStopChecked:false`, `emergencyStopFetched:false`,
`emergencyStopStateRead:false`, `emergencyStopStateTrusted:false`,
`stopRegistryFetched:false`, `stopStatusTrusted:false`, `tokenAccepted:false`,
`tokenValidated:false`, `approved:false`, `finalApprovalGranted:false`,
`filesWritten:false`, `commandExecution:false`, and `buildOutput:false`.

P25.49 extends the `render.thumbnail` renderer-service planning payload with
`packageMaterializationApprovalReadinessVerdictPolicy`. MCP and CLI dry-run and
unavailable execution payloads expose future readiness verdict metadata while
keeping `readinessVerdictComputed:false`, `readinessVerdictTrusted:false`,
`readinessInputsValidated:false`, `readinessBlockersEvaluated:false`,
`materializationReady:false`, `tokenAccepted:false`, `tokenValidated:false`,
`approved:false`, `finalApprovalGranted:false`, `filesWritten:false`,
`commandExecution:false`, and `buildOutput:false`.

P25.50 extends the `render.thumbnail` renderer-service planning payload with
`packageMaterializationApprovalExecutionHandoffPolicy`. MCP and CLI dry-run
and unavailable execution payloads expose future execution handoff metadata
while keeping `handoffPrepared:false`, `handoffQueued:false`,
`handoffStored:false`, `handoffValidated:false`,
`executionJobCreated:false`, `executionJobQueued:false`,
`executionJobDispatched:false`, `materializationReady:false`,
`materializationApproved:false`, `tokenAccepted:false`,
`tokenValidated:false`, `approved:false`, `finalApprovalGranted:false`,
`filesWritten:false`, `commandExecution:false`, and `buildOutput:false`.

P25.51 extends the `render.thumbnail` renderer-service planning payload with
`packageMaterializationApprovalPostHandoffAuditPolicy`. MCP and CLI dry-run
and unavailable execution payloads expose future post-handoff audit metadata
while keeping `auditRecordPrepared:false`,
`auditRecordValidated:false`, `auditRecordStored:false`,
`auditRecordWritten:false`, `handoffSnapshotCaptured:false`,
`executionJobSnapshotCaptured:false`, `materializationReady:false`,
`materializationApproved:false`, `tokenAccepted:false`,
`tokenValidated:false`, `approved:false`, `finalApprovalGranted:false`,
`filesWritten:false`, `commandExecution:false`, and `buildOutput:false`.

P25.52 extends the `render.thumbnail` renderer-service planning payload with
`packageMaterializationApprovalAuditRetentionPolicy`. MCP and CLI dry-run and
unavailable execution payloads expose future audit retention metadata while
keeping `retentionPolicySelected:false`, `retentionWindowComputed:false`,
`retentionClockTrusted:false`, `retentionRecordStored:false`,
`retentionIndexUpdated:false`, `archiveStored:false`, `purgeScheduled:false`,
`purgeExecuted:false`, `exportWritten:false`, `auditRecordWritten:false`,
`materializationApproved:false`, `approved:false`,
`finalApprovalGranted:false`, `filesWritten:false`,
`commandExecution:false`, and `buildOutput:false`.

P25.53 extends the `render.thumbnail` renderer-service planning payload with
`packageMaterializationApprovalAuditAccessPolicy`. MCP and CLI dry-run and
unavailable execution payloads expose future audit access metadata while
keeping `accessPolicySelected:false`, `accessSubjectIdentified:false`,
`accessScopeComputed:false`, `accessScopeValidated:false`,
`accessDecisionStored:false`, `accessGranted:false`, `accessDenied:false`,
`auditRecordRead:false`, `auditRecordQueried:false`,
`auditRecordExported:false`, `accessTokenIssued:false`,
`materializationApproved:false`, `approved:false`,
`finalApprovalGranted:false`, `filesWritten:false`,
`commandExecution:false`, and `buildOutput:false`.

P25.54 extends the `render.thumbnail` renderer-service planning payload with
`packageMaterializationApprovalAuditIntegrityPolicy`. MCP and CLI dry-run and
unavailable execution payloads expose future audit integrity metadata while
keeping `integrityPolicySelected:false`, `integrityScopeComputed:false`,
`integrityHashComputed:false`, `integrityHashStored:false`,
`integrityHashVerified:false`, `integritySignatureCreated:false`,
`integritySignatureVerified:false`, `integrityChainLinked:false`,
`integrityChainVerified:false`, `auditRecordRead:false`,
`auditRecordHashed:false`, `auditRecordVerified:false`,
`auditRecordTamperChecked:false`, `materializationApproved:false`,
`approved:false`, `finalApprovalGranted:false`, `filesWritten:false`,
`commandExecution:false`, and `buildOutput:false`.

P25.55 extends the `render.thumbnail` renderer-service planning payload with
`packageMaterializationApprovalAuditProvenancePolicy`. MCP and CLI dry-run and
unavailable execution payloads expose future audit provenance metadata while
keeping `provenancePolicySelected:false`, `provenanceSubjectIdentified:false`,
`provenanceSourceCollected:false`, `provenanceSourceValidated:false`,
`provenanceGraphComputed:false`, `provenanceGraphStored:false`,
`provenanceChainLinked:false`, `provenanceChainVerified:false`,
`provenanceRecordCreated:false`, `provenanceRecordStored:false`,
`provenanceRecordPublished:false`, `auditRecordRead:false`,
`auditRecordQueried:false`, `auditRecordProvenanceLinked:false`,
`auditRecordProvenanceVerified:false`, `provenanceSignatureCreated:false`,
`provenanceSignatureVerified:false`, `provenanceHashComputed:false`,
`provenanceHashStored:false`, `materializationApproved:false`,
`approved:false`, `finalApprovalGranted:false`, `filesWritten:false`,
`commandExecution:false`, and `buildOutput:false`.

P25.56 extends the `render.thumbnail` renderer-service planning payload with
`packageMaterializationApprovalAuditCustodyPolicy`. MCP and CLI dry-run and
unavailable execution payloads expose future audit custody metadata while
keeping `custodyPolicySelected:false`, `custodySubjectIdentified:false`,
`custodyHolderIdentified:false`, `custodyTransferPrepared:false`,
`custodyTransferExecuted:false`, `custodyTransferred:false`,
`custodyTaken:false`, `custodyReleased:false`, `custodyChainLinked:false`,
`custodyChainVerified:false`, `custodyRecordCreated:false`,
`custodyRecordStored:false`, `custodyRecordPublished:false`,
`auditRecordRead:false`, `auditRecordQueried:false`,
`auditRecordCustodyLinked:false`, `auditRecordCustodyVerified:false`,
`custodySignatureCreated:false`, `custodySignatureVerified:false`,
`custodyHashComputed:false`, `custodyHashStored:false`,
`materializationApproved:false`, `approved:false`,
`finalApprovalGranted:false`, `filesWritten:false`,
`commandExecution:false`, and `buildOutput:false`.

P25.57 extends the `render.thumbnail` renderer-service planning payload with
`packageMaterializationApprovalAuditEvidencePolicy`. MCP and CLI dry-run and
unavailable execution payloads expose future audit evidence metadata while
keeping `evidencePolicySelected:false`, `evidenceSubjectIdentified:false`,
`evidenceSourceIdentified:false`, `evidenceCollected:false`,
`evidenceValidated:false`, `evidenceNormalized:false`,
`evidenceRecordCreated:false`, `evidenceRecordStored:false`,
`evidenceRecordPublished:false`, `evidenceBundleCreated:false`,
`evidenceBundleStored:false`, `auditRecordRead:false`,
`auditRecordQueried:false`, `auditRecordEvidenceLinked:false`,
`auditRecordEvidenceVerified:false`, `evidenceSignatureCreated:false`,
`evidenceSignatureVerified:false`, `evidenceHashComputed:false`,
`evidenceHashStored:false`, `materializationApproved:false`,
`approved:false`, `finalApprovalGranted:false`, `filesWritten:false`,
`commandExecution:false`, and `buildOutput:false`.

P25.58 extends the `render.thumbnail` renderer-service planning payload with
`packageMaterializationApprovalAuditAttestationPolicy`. MCP and CLI dry-run
and unavailable execution payloads expose future audit attestation metadata
while keeping `attestationPolicySelected:false`,
`attestationSubjectIdentified:false`,
`attestationAuthorityIdentified:false`, `attestationPrepared:false`,
`attestationCreated:false`, `attestationValidated:false`,
`attestationStored:false`, `attestationPublished:false`,
`attestationBundleCreated:false`, `attestationBundleStored:false`,
`evidenceRecordRead:false`, `evidenceRecordAttested:false`,
`evidenceRecordVerified:false`, `auditRecordRead:false`,
`auditRecordQueried:false`, `auditRecordAttestationLinked:false`,
`auditRecordAttestationVerified:false`,
`attestationSignatureCreated:false`,
`attestationSignatureVerified:false`, `attestationHashComputed:false`,
`attestationHashStored:false`, `materializationApproved:false`,
`approved:false`, `finalApprovalGranted:false`, `filesWritten:false`,
`commandExecution:false`, and `buildOutput:false`.

P25.59 extends the `render.thumbnail` renderer-service planning payload with
`packageMaterializationApprovalAuditNotarizationPolicy`. MCP and CLI dry-run
and unavailable execution payloads expose future audit notarization metadata
while keeping `notarizationPolicySelected:false`,
`notarizationSubjectIdentified:false`,
`notarizationAuthorityIdentified:false`, `notarizationPrepared:false`,
`notarizationCreated:false`, `notarizationValidated:false`,
`notarizationStored:false`, `notarizationPublished:false`,
`notarizationRecordCreated:false`, `notarizationRecordStored:false`,
`notarizationRecordPublished:false`, `attestationRead:false`,
`attestationNotarized:false`, `attestationVerified:false`,
`auditRecordRead:false`, `auditRecordQueried:false`,
`auditRecordNotarizationLinked:false`,
`auditRecordNotarizationVerified:false`,
`notarizationSignatureCreated:false`,
`notarizationSignatureVerified:false`, `notarizationHashComputed:false`,
`notarizationHashStored:false`, `materializationApproved:false`,
`approved:false`, `finalApprovalGranted:false`, `filesWritten:false`,
`commandExecution:false`, and `buildOutput:false`.

P25.60 extends the `render.thumbnail` renderer-service planning payload with
`packageMaterializationApprovalAuditCertificationPolicy`. MCP and CLI dry-run
and unavailable execution payloads expose future audit certification metadata
while keeping `certificationPolicySelected:false`,
`certificationSubjectIdentified:false`,
`certificationAuthorityIdentified:false`, `certificationPrepared:false`,
`certificationCreated:false`, `certificationValidated:false`,
`certificationStored:false`, `certificationPublished:false`,
`certificationRecordCreated:false`, `certificationRecordStored:false`,
`certificationRecordPublished:false`, `notarizationRead:false`,
`notarizationCertified:false`, `notarizationVerified:false`,
`auditRecordRead:false`, `auditRecordQueried:false`,
`auditRecordCertificationLinked:false`,
`auditRecordCertificationVerified:false`,
`certificationSignatureCreated:false`,
`certificationSignatureVerified:false`, `certificationHashComputed:false`,
`certificationHashStored:false`, `materializationApproved:false`,
`approved:false`, `finalApprovalGranted:false`, `filesWritten:false`,
`commandExecution:false`, and `buildOutput:false`.

P25.61 extends the `render.thumbnail` renderer-service planning payload with
`packageMaterializationApprovalAuditEndorsementPolicy`. MCP and CLI dry-run
and unavailable execution payloads expose future audit endorsement metadata
while keeping `endorsementPolicySelected:false`,
`endorsementSubjectIdentified:false`,
`endorsementAuthorityIdentified:false`, `endorsementPrepared:false`,
`endorsementCreated:false`, `endorsementValidated:false`,
`endorsementStored:false`, `endorsementPublished:false`,
`endorsementRecordCreated:false`, `endorsementRecordStored:false`,
`endorsementRecordPublished:false`, `certificationRead:false`,
`certificationEndorsed:false`, `certificationVerified:false`,
`auditRecordRead:false`, `auditRecordQueried:false`,
`auditRecordEndorsementLinked:false`,
`auditRecordEndorsementVerified:false`,
`endorsementSignatureCreated:false`,
`endorsementSignatureVerified:false`, `endorsementHashComputed:false`,
`endorsementHashStored:false`, `materializationApproved:false`,
`approved:false`, `finalApprovalGranted:false`, `filesWritten:false`,
`commandExecution:false`, and `buildOutput:false`.

P25.62 extends the `render.thumbnail` renderer-service planning payload with
`packageMaterializationApprovalAuditCountersignaturePolicy`. MCP and CLI
dry-run and unavailable execution payloads expose future audit countersignature
metadata while keeping `countersignaturePolicySelected:false`,
`countersignatureSubjectIdentified:false`,
`countersignatureAuthorityIdentified:false`,
`countersignaturePrepared:false`, `countersignatureCreated:false`,
`countersignatureValidated:false`, `countersignatureStored:false`,
`countersignaturePublished:false`, `countersignatureRecordCreated:false`,
`countersignatureRecordStored:false`, `countersignatureRecordPublished:false`,
`endorsementRead:false`, `endorsementCountersigned:false`,
`endorsementVerified:false`, `auditRecordRead:false`,
`auditRecordQueried:false`, `auditRecordCountersignatureLinked:false`,
`auditRecordCountersignatureVerified:false`,
`countersignatureSignatureCreated:false`,
`countersignatureSignatureVerified:false`,
`countersignatureHashComputed:false`, `countersignatureHashStored:false`,
`materializationApproved:false`, `approved:false`,
`finalApprovalGranted:false`, `filesWritten:false`,
`commandExecution:false`, and `buildOutput:false`.

P25.63 extends the `render.thumbnail` renderer-service planning payload with
`packageMaterializationApprovalAuditCountersignatureVerificationPolicy`. MCP
and CLI dry-run and unavailable execution payloads expose future audit
countersignature verification metadata while keeping
`countersignatureVerificationPolicySelected:false`,
`countersignatureVerificationSubjectIdentified:false`,
`countersignatureVerificationAuthorityIdentified:false`,
`countersignatureRead:false`, `countersignatureRecordRead:false`,
`countersignaturePayloadParsed:false`,
`countersignatureSignatureRead:false`,
`countersignatureSignatureVerified:false`,
`countersignatureHashComputed:false`, `countersignatureHashMatched:false`,
`countersignatureChainLinked:false`, `countersignatureChainVerified:false`,
`countersignatureVerificationPrepared:false`,
`countersignatureVerificationExecuted:false`,
`countersignatureVerificationStored:false`,
`countersignatureVerificationPublished:false`, `auditRecordRead:false`,
`auditRecordQueried:false`,
`auditRecordCountersignatureVerificationLinked:false`,
`auditRecordCountersignatureVerificationVerified:false`,
`countersignatureVerificationSignatureCreated:false`,
`countersignatureVerificationSignatureVerified:false`,
`countersignatureVerificationHashComputed:false`,
`countersignatureVerificationHashStored:false`,
`materializationApproved:false`, `approved:false`,
`finalApprovalGranted:false`, `filesWritten:false`,
`commandExecution:false`, and `buildOutput:false`.

P25.64 extends the `render.thumbnail` renderer-service planning payload with
`packageMaterializationApprovalAuditCountersignatureRevocationPolicy`. MCP and
CLI dry-run and unavailable execution payloads expose future audit
countersignature revocation metadata while keeping
`countersignatureRevocationPolicySelected:false`,
`countersignatureRevocationSubjectIdentified:false`,
`countersignatureRevocationAuthorityIdentified:false`,
`countersignatureRevocationReasonCaptured:false`,
`countersignatureRevocationScopeComputed:false`,
`countersignatureRevocationRequestPrepared:false`,
`countersignatureRevocationRequestValidated:false`,
`countersignatureRevocationRequestStored:false`,
`countersignatureRevocationExecuted:false`, `countersignatureRevoked:false`,
`countersignatureRevocationPublished:false`,
`countersignatureRevocationRecordCreated:false`,
`countersignatureRevocationRecordStored:false`,
`countersignatureRevocationRecordPublished:false`, `countersignatureRead:false`,
`countersignatureRecordRead:false`,
`countersignatureVerificationRead:false`,
`countersignatureVerificationRevoked:false`,
`countersignatureVerificationVerified:false`, `auditRecordRead:false`,
`auditRecordQueried:false`,
`auditRecordCountersignatureRevocationLinked:false`,
`auditRecordCountersignatureRevocationVerified:false`,
`countersignatureRevocationSignatureCreated:false`,
`countersignatureRevocationSignatureVerified:false`,
`countersignatureRevocationHashComputed:false`,
`countersignatureRevocationHashStored:false`,
`materializationApproved:false`, `approved:false`,
`finalApprovalGranted:false`, `filesWritten:false`,
`commandExecution:false`, and `buildOutput:false`.

P25.65 extends the `render.thumbnail` renderer-service planning payload with
`packageMaterializationApprovalAuditCountersignatureRevocationAppealPolicy`.
MCP and CLI dry-run and unavailable execution payloads expose future audit
countersignature revocation appeal metadata while keeping
`countersignatureRevocationAppealPolicySelected:false`,
`countersignatureRevocationAppealSubjectIdentified:false`,
`countersignatureRevocationAppealAuthorityIdentified:false`,
`countersignatureRevocationAppealReasonCaptured:false`,
`countersignatureRevocationAppealScopeComputed:false`,
`countersignatureRevocationAppealRequestPrepared:false`,
`countersignatureRevocationAppealRequestValidated:false`,
`countersignatureRevocationAppealRequestStored:false`,
`countersignatureRevocationAppealExecuted:false`,
`countersignatureRevocationAppealed:false`,
`countersignatureRevocationAppealGranted:false`,
`countersignatureRevocationAppealDenied:false`,
`countersignatureRevocationAppealPublished:false`,
`countersignatureRevocationAppealRecordCreated:false`,
`countersignatureRevocationAppealRecordStored:false`,
`countersignatureRevocationAppealRecordPublished:false`,
`countersignatureRevocationRead:false`,
`countersignatureRevocationRecordRead:false`, `countersignatureRead:false`,
`countersignatureRevocationVerified:false`, `auditRecordRead:false`,
`auditRecordQueried:false`,
`auditRecordCountersignatureRevocationAppealLinked:false`,
`auditRecordCountersignatureRevocationAppealVerified:false`,
`countersignatureRevocationAppealSignatureCreated:false`,
`countersignatureRevocationAppealSignatureVerified:false`,
`countersignatureRevocationAppealHashComputed:false`,
`countersignatureRevocationAppealHashStored:false`,
`materializationApproved:false`, `approved:false`,
`finalApprovalGranted:false`, `filesWritten:false`,
`commandExecution:false`, and `buildOutput:false`.

P25.66 extends the `render.thumbnail` renderer-service planning payload with
`packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionPolicy`.
MCP and CLI dry-run and unavailable execution payloads expose future audit
countersignature revocation appeal resolution metadata while keeping
`countersignatureRevocationAppealResolutionPolicySelected:false`,
`countersignatureRevocationAppealResolutionSubjectIdentified:false`,
`countersignatureRevocationAppealResolutionAuthorityIdentified:false`,
`countersignatureRevocationAppealRead:false`,
`countersignatureRevocationAppealRecordRead:false`,
`countersignatureRevocationAppealResolutionReasonCaptured:false`,
`countersignatureRevocationAppealResolutionScopeComputed:false`,
`countersignatureRevocationAppealResolutionOutcomeSelected:false`,
`countersignatureRevocationAppealResolutionPrepared:false`,
`countersignatureRevocationAppealResolutionValidated:false`,
`countersignatureRevocationAppealResolutionStored:false`,
`countersignatureRevocationAppealResolutionExecuted:false`,
`countersignatureRevocationAppealResolved:false`,
`countersignatureRevocationAppealResolutionAccepted:false`,
`countersignatureRevocationAppealResolutionRejected:false`,
`countersignatureRevocationAppealResolutionPublished:false`,
`countersignatureRevocationAppealResolutionRecordCreated:false`,
`countersignatureRevocationAppealResolutionRecordStored:false`,
`countersignatureRevocationAppealResolutionRecordPublished:false`,
`countersignatureRevocationRead:false`,
`countersignatureRevocationRecordRead:false`, `countersignatureRead:false`,
`countersignatureRevocationVerified:false`, `auditRecordRead:false`,
`auditRecordQueried:false`,
`auditRecordCountersignatureRevocationAppealResolutionLinked:false`,
`auditRecordCountersignatureRevocationAppealResolutionVerified:false`,
`countersignatureRevocationAppealResolutionSignatureCreated:false`,
`countersignatureRevocationAppealResolutionSignatureVerified:false`,
`countersignatureRevocationAppealResolutionHashComputed:false`,
`countersignatureRevocationAppealResolutionHashStored:false`,
`materializationApproved:false`, `approved:false`,
`finalApprovalGranted:false`, `filesWritten:false`,
`commandExecution:false`, and `buildOutput:false`.

P25.67 extends the `render.thumbnail` renderer-service planning payload with
`packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementPolicy`.
MCP and CLI dry-run and unavailable execution payloads expose future audit
countersignature revocation appeal resolution enforcement metadata while
keeping `countersignatureRevocationAppealResolutionEnforcementPolicySelected:false`,
`countersignatureRevocationAppealResolutionEnforcementSubjectIdentified:false`,
`countersignatureRevocationAppealResolutionEnforcementAuthorityIdentified:false`,
`countersignatureRevocationAppealResolutionRead:false`,
`countersignatureRevocationAppealResolutionRecordRead:false`,
`countersignatureRevocationAppealResolutionEnforcementReasonCaptured:false`,
`countersignatureRevocationAppealResolutionEnforcementScopeComputed:false`,
`countersignatureRevocationAppealResolutionEnforcementActionSelected:false`,
`countersignatureRevocationAppealResolutionEnforcementPrepared:false`,
`countersignatureRevocationAppealResolutionEnforcementValidated:false`,
`countersignatureRevocationAppealResolutionEnforcementStored:false`,
`countersignatureRevocationAppealResolutionEnforcementExecuted:false`,
`countersignatureRevocationAppealResolutionEnforced:false`,
`countersignatureRevocationAppealResolutionEnforcementAccepted:false`,
`countersignatureRevocationAppealResolutionEnforcementRejected:false`,
`countersignatureRevocationAppealResolutionEnforcementPublished:false`,
`countersignatureRevocationAppealResolutionEnforcementRecordCreated:false`,
`countersignatureRevocationAppealResolutionEnforcementRecordStored:false`,
`countersignatureRevocationAppealResolutionEnforcementRecordPublished:false`,
`countersignatureRevocationAppealRead:false`,
`countersignatureRevocationAppealRecordRead:false`,
`auditRecordRead:false`, `auditRecordQueried:false`,
`auditRecordCountersignatureRevocationAppealResolutionEnforcementLinked:false`,
`auditRecordCountersignatureRevocationAppealResolutionEnforcementVerified:false`,
`countersignatureRevocationAppealResolutionEnforcementSignatureCreated:false`,
`countersignatureRevocationAppealResolutionEnforcementSignatureVerified:false`,
`countersignatureRevocationAppealResolutionEnforcementHashComputed:false`,
`countersignatureRevocationAppealResolutionEnforcementHashStored:false`,
`materializationApproved:false`, `approved:false`,
`finalApprovalGranted:false`, `filesWritten:false`,
`commandExecution:false`, and `buildOutput:false`.

P25.68 extends the `render.thumbnail` renderer-service planning payload with
`packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidencePolicy`.
MCP and CLI dry-run and unavailable execution payloads expose future audit
countersignature revocation appeal resolution enforcement evidence metadata
while keeping evidence policy selection, subject/source identification,
evidence collection/validation/normalization, evidence record/bundle storage,
enforcement and audit record reads, audit evidence linking/verification,
evidence signing/hash, materialization approval, files written, command
execution, build output, process startup, and runtime dispatch disabled.

P25.74 extends the `render.thumbnail` renderer-service planning payload with
`packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationPolicy`. MCP and CLI dry-run and unavailable execution payloads expose
future audit countersignature revocation appeal resolution enforcement evidence
attestation notarization certification endorsement countersignature verification
metadata while keeping countersignature reads, record reads, payload parsing,
signature verification, hash matching, chain linking/verification, audit record
reads, verification result storage/publication, materialization approval, files
written, command execution, build output, process startup, and runtime dispatch
disabled.

P25.77 extends the `render.thumbnail` renderer-service planning payload with
`packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionPolicy`.
MCP and CLI dry-run and unavailable execution payloads expose future audit
countersignature revocation appeal resolution enforcement evidence attestation
notarization certification endorsement countersignature verification revocation
appeal resolution metadata while keeping resolution policy selection,
subject/authority identification, appeal reads, appeal record reads, resolution
reason capture, scope computation, outcome selection, resolution preparation/
storage/execution/publication, appeal resolution decisions, resolution record
storage/publication, countersignature and audit record reads, materialization
approval, files written, command execution, build output, process startup, and
runtime dispatch disabled.

P25.78 extends the `render.thumbnail` renderer-service planning payload with
`packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementPolicy`.
MCP and CLI dry-run and unavailable execution payloads expose future audit
countersignature revocation appeal resolution enforcement evidence attestation
notarization certification endorsement countersignature verification revocation
appeal resolution enforcement metadata while keeping enforcement policy
selection, subject/authority identification, resolution reads, resolution
record reads, enforcement reason capture, scope computation, action selection,
enforcement preparation/storage/execution/publication, resolution enforcement
decisions, enforcement record storage/publication, countersignature and audit
record reads, materialization approval, files written, command execution, build
output, process startup, and runtime dispatch disabled.

P25.75 extends the `render.thumbnail` renderer-service planning payload with
`packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationPolicy`.
MCP and CLI dry-run and unavailable execution payloads expose future audit
countersignature revocation appeal resolution enforcement evidence attestation
notarization certification endorsement countersignature verification revocation
metadata while keeping revocation policy selection, subject/authority
identification, reason capture, scope computation, revocation request storage,
verification revocation, revocation record publication, countersignature and
audit record reads, materialization approval, files written, command execution,
build output, process startup, and runtime dispatch disabled.

P25.76 extends the `render.thumbnail` renderer-service planning payload with
`packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealPolicy`.
MCP and CLI dry-run and unavailable execution payloads expose future audit
countersignature revocation appeal resolution enforcement evidence attestation
notarization certification endorsement countersignature verification revocation
appeal metadata while keeping appeal policy selection, subject/authority
identification, appeal reason capture, scope computation, appeal request
storage/execution, appeal grant/deny decisions, appeal record publication,
countersignature and audit record reads, materialization approval, files
written, command execution, build output, process startup, and runtime dispatch
disabled.

P25.69 extends the `render.thumbnail` renderer-service planning payload with
`packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationPolicy`.
MCP and CLI dry-run and unavailable execution payloads expose future audit
countersignature revocation appeal resolution enforcement evidence attestation
metadata while keeping attestation policy selection, subject/authority
identification, attestation prepare/create/validate/store/publish, attestation
bundle storage, evidence record reads/attestation/verification, audit record
reads, attestation linking/verification/signing/hashing, materialization
approval, files written, command execution, build output, process startup, and
runtime dispatch disabled.

P25.70 extends the `render.thumbnail` renderer-service planning payload with
`packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationPolicy`.
MCP and CLI dry-run and unavailable execution payloads expose future audit
countersignature revocation appeal resolution enforcement evidence attestation
notarization metadata while keeping notarization policy selection,
subject/authority identification, notarization prepare/create/validate/store/
publish, notarization record storage/publication, attestation reads/
notarization/verification, audit record reads, notarization linking/
verification/signing/hashing, materialization approval, files written, command
execution, build output, process startup, and runtime dispatch disabled.

P25.71 extends the `render.thumbnail` renderer-service planning payload with
`packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationPolicy`.
MCP and CLI dry-run and unavailable execution payloads expose future audit
countersignature revocation appeal resolution enforcement evidence attestation
notarization certification metadata while keeping certification policy
selection, subject/authority identification, certification prepare/create/
validate/store/publish, certification record storage/publication, notarization
reads/certification/verification, audit record reads, certification linking/
verification/signing/hashing, materialization approval, files written, command
execution, build output, process startup, and runtime dispatch disabled.

P25.72 extends the `render.thumbnail` renderer-service planning payload with
`packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementPolicy`.
MCP and CLI dry-run and unavailable execution payloads expose future audit
countersignature revocation appeal resolution enforcement evidence attestation
notarization certification endorsement metadata while keeping endorsement
policy selection, subject/authority identification, endorsement prepare/
create/validate/store/publish, endorsement record storage/publication,
certification reads/endorsement/verification, audit record reads, endorsement
linking/verification/signing/hashing, materialization approval, files written,
command execution, build output, process startup, and runtime dispatch
disabled.

P25.73 extends the `render.thumbnail` renderer-service planning payload with
`packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignaturePolicy`.
MCP and CLI dry-run and unavailable execution payloads expose future audit
countersignature revocation appeal resolution enforcement evidence attestation
notarization certification endorsement countersignature metadata while keeping
countersignature policy selection, subject/authority identification,
countersignature prepare/create/validate/store/publish, countersignature
record storage/publication, endorsement reads/countersignature/verification,
audit record reads, countersignature linking/verification/signing/hashing,
materialization approval, files written, command execution, build output,
process startup, and runtime dispatch disabled.

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
  templates, P25.30 package workspace wiring, P25.31 package build
  verification, P25.32 package materialization checklist, P25.33 package
  creation dry-run summary, P25.34 package creation file manifest, P25.35
  package materialization approval gate, P25.36 package materialization
  execution dry-run, P25.37 package materialization write contract, P25.38
  package materialization rollback contract, P25.39 package materialization
  verification manifest, P25.40 package materialization final approval
  checklist, P25.41 package materialization explicit approval token, P25.42
  package materialization approval audit trail, P25.43 package materialization
  approval replay guard, P25.44 package materialization approval expiry policy,
  P25.45 package materialization approval revocation policy, P25.46 package
  materialization approval scope binding policy, P25.47 package materialization
  approval operator confirmation policy, P25.48 package materialization
  approval emergency stop policy, P25.49 package materialization approval
  readiness verdict policy, P25.50 package materialization approval execution
  handoff policy, P25.51 package materialization approval post-handoff audit
  policy, P25.52 package materialization approval audit retention policy,
  P25.53 package materialization approval audit access policy, P25.54 package
  materialization approval audit integrity policy, P25.55 package
  materialization approval audit provenance policy, P25.56 package
  materialization approval audit custody policy, P25.57 package materialization
  approval audit evidence policy, P25.58 package materialization approval audit
  attestation policy, P25.59 package materialization approval audit
  notarization policy, P25.60 package materialization approval audit
  certification policy, P25.61 package materialization approval audit
  endorsement policy, P25.62 package materialization approval audit
  countersignature policy, P25.63 package materialization approval audit
  countersignature verification policy, P25.64 package materialization
  approval audit countersignature revocation policy, P25.65 package
  materialization approval audit countersignature revocation appeal policy,
  P25.66 package materialization approval audit countersignature revocation
  appeal resolution policy, P25.67 package materialization approval audit
  countersignature revocation appeal resolution enforcement policy, P25.68
  package materialization approval audit countersignature revocation appeal
  resolution enforcement evidence policy, P25.69 package materialization
  approval audit countersignature revocation appeal resolution enforcement
  evidence attestation policy, P25.70 package materialization approval
  audit countersignature revocation appeal resolution enforcement evidence
  attestation notarization policy, P25.71 package materialization approval
  audit countersignature revocation appeal resolution enforcement evidence
  attestation notarization certification policy, P25.72 package
  materialization approval audit countersignature revocation appeal resolution
  enforcement evidence attestation notarization certification endorsement
  policy, P25.73 package materialization approval audit countersignature
  revocation appeal resolution enforcement evidence attestation notarization
  certification endorsement countersignature policy, P25.74 package
  materialization approval audit countersignature revocation appeal resolution
  enforcement evidence attestation notarization certification endorsement
  countersignature verification policy, P25.75 package materialization
  approval audit countersignature revocation appeal resolution enforcement
  evidence attestation notarization certification endorsement countersignature
  verification revocation policy, and P25.76 package materialization approval
  audit countersignature revocation appeal resolution enforcement evidence
  attestation notarization certification endorsement countersignature
  verification revocation appeal policy, and P25.77 package materialization approval
  audit countersignature revocation appeal resolution enforcement evidence
  attestation notarization certification endorsement countersignature
  verification revocation appeal resolution policy, and P25.78 package
  materialization approval audit countersignature revocation appeal resolution
  enforcement evidence attestation notarization certification endorsement
  countersignature verification revocation appeal resolution enforcement policy
  while runtime execution remains unavailable
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
