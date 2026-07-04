# Render Thumbnail Contract

Status: P25.4 descriptor contract; P25.51 MCP/CLI renderer-service dry-run
boundaries, metadata-only availability probes, response normalization
contracts, disabled client request scaffolding, closed execution gate, disabled
health preflight, executable client harness plan, and dispatch adapter boundary
plus opt-in configuration surfaces, unavailable error taxonomy, and integration
fixture harness plus dispatch registration preflight and executable adapter
registration scaffold plus adapter registry manifest and final enablement
checklist plus implementation slice audit and health/no-op contract fixtures
plus no-op service host scaffold, host lifecycle test fixtures, and package
manifest scaffold plus package creation guardrails, package file templates, and
package workspace wiring plus package build verification defined; runtime
execution still blocked. P25.32 adds package materialization checklist
metadata without filesystem mutation, P25.33 adds package creation dry-run
summary metadata without file writes, P25.34 adds package creation file
manifest metadata without materializing files, and P25.35 adds package
materialization approval gate metadata without granting approval. P25.36 adds
package materialization execution dry-run metadata without executing writes.
P25.37 adds package materialization write contract metadata without performing
writes. P25.38 adds package materialization rollback contract metadata without
executing rollback. P25.39 adds package materialization verification manifest
metadata without running verification. P25.40 adds package materialization
final approval checklist metadata without granting approval. P25.41 adds
package materialization explicit approval token metadata without accepting,
storing, validating, consuming, or granting approval from a token. P25.42 adds
package materialization approval audit trail metadata without writing,
persisting, validating, or exporting audit records. P25.43 adds package
materialization approval replay guard metadata without executing replay checks,
storing nonce/scope hash state, consuming tokens, or granting approval. P25.44
adds package materialization approval expiry policy metadata without executing
expiry checks, reading or trusting wall-clock time, validating tokens, accepting
tokens, consuming tokens, or granting approval. P25.45 adds package
materialization approval revocation policy metadata without executing
revocation checks, fetching revocation registries, reading or trusting
revocation state, validating tokens, accepting tokens, consuming tokens, or
granting approval. P25.46 adds package materialization approval scope binding
policy metadata without computing approval scope hashes, reading file
snapshots, hashing workspace/package files, validating tokens, accepting
tokens, consuming tokens, or granting approval. P25.47 adds package
materialization approval operator confirmation policy metadata without
prompting operators, collecting/storing/validating confirmations, verifying
identity, issuing confirmation tokens, accepting/validating tokens, consuming
tokens, or granting approval. P25.48 adds package materialization approval
emergency stop policy metadata without configuring or fetching stop registries,
reading or trusting stop state, accepting stop overrides, accepting/validating
tokens, consuming tokens, or granting approval. P25.49 adds package
materialization approval readiness verdict policy metadata without computing,
storing, or trusting verdicts, validating readiness inputs, evaluating
blockers, accepting/validating tokens, consuming tokens, or granting approval.
P25.50 adds package materialization approval execution handoff policy metadata
without preparing, validating, storing, or queuing handoffs, creating or
dispatching execution jobs, selecting execution owners, accepting/validating
tokens, consuming tokens, or granting approval.
P25.51 adds package materialization approval post-handoff audit policy metadata
without preparing, validating, storing, publishing, exporting, or writing audit
records, capturing handoff or execution job snapshots, selecting audit sinks,
accepting/validating tokens, consuming tokens, or granting approval.

This document defines the `render.thumbnail` contract before executable MCP or
CLI rendering is enabled. The contract follows Penpot's existing dashboard
thumbnail pipeline instead of the exporter `export-shapes` path.

## Existing Penpot Surface

Dashboard file thumbnails currently use this flow:

1. Backend `get-file-data-for-thumbnail` returns the file revision plus a
   reduced page payload for thumbnail rendering.
2. The frontend thumbnail worker renders a PNG blob at width `252` with a
   `3:2` width-to-height aspect ratio.
3. Backend `create-file-thumbnail` stores the file thumbnail for the file
   revision.

Tagged frame/object thumbnails use a related persistence path:

1. The frontend renders a frame thumbnail from workspace state.
2. Backend `create-file-object-thumbnail` stores the PNG blob under an object
   key formatted as `fileId/pageId/objectId/tag`.
3. Backend `get-file-object-thumbnails` can read cached tagged thumbnails.

`render.thumbnail` therefore maps to thumbnail data/render/cache semantics, not
exporter preview/export semantics.

## Command Request

Canonical command input:

```json
{
  "fileId": "uuid",
  "target": "file",
  "width": 252,
  "cachePolicy": "reuse",
  "format": "png",
  "output": "optional/path/thumb.png",
  "adapter": "auto"
}
```

Supported target values:

| Target | Required ids | Cache scope | Persist command |
| --- | --- | --- | --- |
| `file` | `fileId` | `file-thumbnail` | `create-file-thumbnail` |
| `frame` | `fileId`, `pageId`, `objectId` | `file-object-thumbnail` | `create-file-object-thumbnail` |

`object` and `shape` are accepted aliases for `frame` in the shared contract.
The tagged frame key is `fileId/pageId/objectId/tag`; `tag` defaults to
`frame`.

Supported cache policies:

| Policy | Meaning |
| --- | --- |
| `reuse` | Prefer an existing thumbnail when the runtime can prove the cache key is current. |
| `refresh` | Render and persist a fresh PNG thumbnail. |

The only supported format is PNG. The default width is `252`; height is derived
as `round(width * 2 / 3)`.

## Contract Response

Shared contract shape:

```json
{
  "command": "render.thumbnail",
  "status": "contract",
  "executable": false,
  "adapter": null,
  "target": {
    "kind": "file",
    "fileId": "uuid",
    "pageId": null,
    "objectId": null,
    "tag": null,
    "revn": 7
  },
  "artifact": {
    "kind": "thumbnail",
    "format": "png",
    "mimeType": "image/png",
    "extension": ".png",
    "width": 252,
    "height": 168,
    "aspectRatio": "3:2"
  },
  "cache": {
    "policy": "reuse",
    "scope": "file-thumbnail",
    "key": "file:<fileId>:revn:<revn>"
  },
  "backendRpc": {
    "data": {
      "command": "get-file-data-for-thumbnail"
    },
    "persist": {
      "command": "create-file-thumbnail"
    }
  }
}
```

## Runtime Boundaries

- `@penpot/command-runtime` exposes `createRenderThumbnailContract` and fixture
  coverage for request, cache, renderer, and persist mapping.
- The `render.thumbnail` descriptor exposes the planning adapter
  `renderer-service`, CLI command `render thumbnail`, and MCP
  `render.thumbnail` dry-run tool for request inspection only.
- MCP may return the renderer-service plan but must not execute
  `render.thumbnail` until a runtime owns the worker/rasterizer execution
  boundary and resource return shape.
- CLI `render thumbnail --dry-run` may print the future renderer-service
  request shape. CLI execution without `--dry-run` must keep returning
  `renderer_service_unavailable` until it can render PNG bytes or delegate to a
  stable renderer service.
- P25.10 availability fields are metadata-only. They may derive a health
  endpoint and timeout from configuration, but they must not contact the
  renderer service during planning.
- P25.11 response fields are normalization contracts only. They define how a
  future service response becomes resource metadata and how service errors are
  shaped, but they must not trigger renderer-service execution.
- P25.12 client request fields are scaffolding only. They define future POST,
  audit, and auth-forwarding metadata with `dispatch:false`.
- P25.13 execution gate fields are planning-only. They define explicit opt-in,
  required config, blockers, failure modes, and integration-test plan with
  `executionGate.dispatch:false`.
- P25.14 health preflight and execution harness fields are planning-only. They
  define future GET `/health`, execution ordering, failure modes, and test
  expectations with `healthPreflight.dispatch:false` and
  `executionClientHarness.dispatch:false`.
- P25.15 dispatch adapter boundary fields are planning-only. They define config
  precedence, gate/preflight/request consumption, result/error mapping, and
  no-dispatch defaults with `dispatchAdapterBoundary.dispatch:false`.
- P25.16 opt-in configuration fields are planning-only. They define CLI, MCP,
  environment, profile, and backend config surfaces plus diagnostics with
  `optInConfiguration.dispatch:false`.
- P25.17 unavailable error taxonomy fields are planning-only. They define
  stable configuration, execution-gate, preflight, dispatch, response, and
  resource error codes plus retryability with
  `unavailableErrorTaxonomy.dispatch:false`.
- P25.18 integration fixture harness fields are planning-only. They define
  future closed-gate, health-failure, render-success, service-error, MCP
  metadata, CLI output, and token-safe auth fixtures with
  `integrationFixtureHarness.dispatch:false` and `networkDispatch:false`.
- P25.19 dispatch registration preflight fields are planning-only. They define
  final readiness checks for future executable registration with
  `dispatchRegistrationPreflight.dispatch:false`,
  `networkDispatch:false`, and `runtimeRegistration:false`.
- P25.20 executable adapter registration scaffold fields are planning-only.
  They expose the future MCP/CLI registration surface with
  `executableAdapterRegistrationScaffold.dispatch:false`,
  `networkDispatch:false`, `runtimeRegistration:false`, and
  `localFileWrites:false`.
- P25.21 adapter registry manifest fields are planning-only. They expose the
  future `renderer-service` registry key and MCP/CLI entrypoint wiring with
  `adapterRegistryManifest.dispatch:false`, `networkDispatch:false`,
  `runtimeRegistration:false`, and `localFileWrites:false`.
- P25.22 enablement checklist fields are planning-only. They summarize the
  remaining runtime gates with `enablementChecklist.dispatch:false`,
  `networkDispatch:false`, `runtimeRegistration:false`, and
  `localFileWrites:false`.
- P25.23 implementation slice audit fields are planning-only. They select the
  health/no-op contract fixture slice as the first safe implementation step
  while keeping `implementationSliceAudit.dispatch:false`,
  `networkDispatch:false`, `runtimeRegistration:false`, and
  `localFileWrites:false`.
- P25.24 health/no-op contract fixture fields are planning-only. They define
  `/health` OK/unavailable and no-op `thumbnail.render` response fixtures while
  keeping `healthNoopContractFixtures.dispatch:false`,
  `networkDispatch:false`, `runtimeRegistration:false`, and
  `localFileWrites:false`.
- P25.25 no-op service host scaffold fields are planning-only. They describe
  the future host package, routes, config, lifecycle, and observability while
  keeping `noopServiceHostScaffold.hostStartup:false`, `dispatch:false`,
  `networkDispatch:false`, `runtimeRegistration:false`, and
  `localFileWrites:false`.
- P25.26 host lifecycle test fixture fields are planning-only. They cover
  start, stop, readiness, supervision, logs, and errors while keeping
  `hostLifecycleTestFixtures.processSpawn:false`, `hostStartup:false`,
  `networkDispatch:false`, `runtimeRegistration:false`, and
  `localFileWrites:false`.
- P25.27 package manifest scaffold fields are planning-only. They define the
  future `@penpot/renderer-service` package metadata, planned scripts, exports,
  dependencies, files, and workspace integration flags while keeping
  `packageManifestScaffold.packageCreated:false`,
  `workspaceMutation:false`, `scriptRunnable:false`,
  `networkDispatch:false`, `runtimeRegistration:false`, and
  `localFileWrites:false`.
- P25.28 package creation guardrail fields are planning-only. They define
  required creation checks, blocked package/workspace/runtime mutations,
  allowed planning work, denied actions, and runtime prerequisites while
  keeping `packageCreationGuardrails.packageCreated:false`,
  `workspaceMutation:false`, `scriptRunnable:false`, `hostStartup:false`,
  `processSpawn:false`, `networkDispatch:false`, `runtimeRegistration:false`,
  and `localFileWrites:false`.
- P25.29 package file template fields are planning-only. They define planned
  `package.json`, `tsconfig.json`, source, no-op host, and test shapes while
  keeping `packageFileTemplates.fileMaterialization:false`,
  `packageCreated:false`, `workspaceMutation:false`, `scriptRunnable:false`,
  `hostStartup:false`, `processSpawn:false`, `networkDispatch:false`,
  `runtimeRegistration:false`, and `localFileWrites:false`.
- P25.30 package workspace wiring fields are planning-only. They define the
  planned `pnpm-workspace.yaml` entry, root scripts, lockfile touchpoints,
  workspace dependency filter, and non-target files while keeping
  `packageWorkspaceWiring.pnpmWorkspaceMutation:false`,
  `rootPackageJsonMutation:false`, `lockfileMutation:false`,
  `workspaceMutation:false`, `packageCreated:false`, `scriptRunnable:false`,
  `fileMaterialization:false`, `networkDispatch:false`,
  `runtimeRegistration:false`, and `localFileWrites:false`.
- P25.31 package build verification fields are planning-only. They define the
  planned filtered build, type-check, and test commands plus expected `dist`
  artifacts while keeping `packageBuildVerification.commandExecution:false`,
  `buildOutput:false`, `packageScriptsRunnable:false`, `processSpawn:false`,
  `workspaceMutation:false`, `packageCreated:false`, `networkDispatch:false`,
  `runtimeRegistration:false`, and `localFileWrites:false`.
- P25.32 package materialization checklist fields are planning-only. They
  define package/workspace/output batches, readiness checks, commit boundary,
  and rollback plan while keeping
  `packageMaterializationChecklist.materializationApproved:false`,
  `fileMaterialization:false`, `workspaceMutation:false`,
  `lockfileMutation:false`, `commandExecution:false`, `buildOutput:false`,
  `runtimeRegistration:false`, and `localFileWrites:false`.
- P25.33 package creation dry-run summary fields are planning-only. They
  define would-create, would-modify, would-generate, and would-run summary
  sections while keeping `packageCreationDryRunSummary.dryRunOnly:true`,
  `filesWritten:false`, `fileMaterialization:false`,
  `workspaceMutation:false`, `lockfileMutation:false`,
  `commandExecution:false`, `buildOutput:false`, `runtimeRegistration:false`,
  and `localFileWrites:false`.
- P25.34 package creation file manifest fields are planning-only. They define
  the future package directory, package files, generated files, workspace
  files, readiness blockers, and no-op guarantees while keeping
  `packageCreationFileManifest.dryRunOnly:true`, `filesWritten:false`,
  `fileMaterialization:false`, `workspaceMutation:false`,
  `lockfileMutation:false`, `commandExecution:false`, `buildOutput:false`,
  `materializationApproved:false`, `runtimeRegistration:false`, and
  `localFileWrites:false`.
- P25.35 package materialization approval gate fields are planning-only. They
  define explicit approval inputs, approval scope, blocked decision state,
  post-approval sequence, and no-op guarantees while keeping
  `packageMaterializationApprovalGate.approvalRequired:true`,
  `approved:false`, `filesWritten:false`, `fileMaterialization:false`,
  `workspaceMutation:false`, `lockfileMutation:false`,
  `commandExecution:false`, `buildOutput:false`,
  `materializationApproved:false`, `runtimeRegistration:false`, and
  `localFileWrites:false`.
- P25.36 package materialization execution dry-run fields are planning-only.
  They define future directory creation, package file write, workspace
  mutation, and verification command steps while keeping
  `packageMaterializationExecutionDryRun.executeNow:false`,
  `approved:false`, `filesWritten:false`, `fileMaterialization:false`,
  `workspaceMutation:false`, `lockfileMutation:false`,
  `commandExecution:false`, `buildOutput:false`,
  `materializationApproved:false`, `runtimeRegistration:false`, and
  `localFileWrites:false`.
- P25.37 package materialization write contract fields are planning-only. They
  define future package directory, package file, workspace file, integrity,
  atomic write, and rollback expectations while keeping
  `packageMaterializationWriteContract.executeNow:false`,
  `approved:false`, `filesWritten:false`, `fileMaterialization:false`,
  `workspaceMutation:false`, `lockfileMutation:false`,
  `commandExecution:false`, `buildOutput:false`,
  `materializationApproved:false`, `runtimeRegistration:false`, and
  `localFileWrites:false`.
- P25.38 package materialization rollback contract fields are planning-only.
  They define pre-write snapshots, rollback phases, failure recovery, and
  rollback verification while keeping
  `packageMaterializationRollbackContract.executeNow:false`,
  `packageMaterializationRollbackContract.rollbackNow:false`,
  `approved:false`, `filesWritten:false`, `rollbackExecuted:false`,
  `fileMaterialization:false`, `workspaceMutation:false`,
  `lockfileMutation:false`, `commandExecution:false`, `buildOutput:false`,
  `materializationApproved:false`, `runtimeRegistration:false`, and
  `localFileWrites:false`.
- P25.39 package materialization verification manifest fields are
  planning-only. They define future package file checks, workspace file checks,
  generated output checks, verification commands, and runtime-disabled
  assertions while keeping
  `packageMaterializationVerificationManifest.executeNow:false`,
  `packageMaterializationVerificationManifest.verifyNow:false`,
  `approved:false`, `filesWritten:false`, `verificationExecuted:false`,
  `fileMaterialization:false`, `workspaceMutation:false`,
  `lockfileMutation:false`, `commandExecution:false`, `buildOutput:false`,
  `materializationApproved:false`, `runtimeRegistration:false`, and
  `localFileWrites:false`.
- P25.40 package materialization final approval checklist fields are
  planning-only. They define required approval items, approval scope, blocked
  decision state, and post-approval sequence while keeping
  `packageMaterializationFinalApprovalChecklist.finalApprovalGranted:false`,
  `packageMaterializationFinalApprovalChecklist.executeNow:false`,
  `packageMaterializationFinalApprovalChecklist.verifyNow:false`,
  `approved:false`, `filesWritten:false`, `verificationExecuted:false`,
  `fileMaterialization:false`, `workspaceMutation:false`,
  `lockfileMutation:false`, `commandExecution:false`, `buildOutput:false`,
  `materializationApproved:false`, `runtimeRegistration:false`, and
  `localFileWrites:false`.
- P25.41 package materialization explicit approval token fields are
  planning-only. They define a future opaque one-time approval token contract,
  required scope, validation plan, audit plan, blocked decision state, and
  no-op guarantees while keeping
  `packageMaterializationExplicitApprovalToken.tokenProvided:false`,
  `packageMaterializationExplicitApprovalToken.tokenAccepted:false`,
  `packageMaterializationExplicitApprovalToken.tokenStored:false`,
  `packageMaterializationExplicitApprovalToken.tokenValidated:false`,
  `approved:false`, `finalApprovalGranted:false`, `filesWritten:false`,
  `verificationExecuted:false`, `fileMaterialization:false`,
  `workspaceMutation:false`, `lockfileMutation:false`,
  `commandExecution:false`, `buildOutput:false`,
  `materializationApproved:false`, `runtimeRegistration:false`, and
  `localFileWrites:false`.
- P25.42 package materialization approval audit trail fields are
  planning-only. They define a future append-only audit record contract,
  required audit events, retention plan, blocked decision state, and no-op
  guarantees while keeping
  `packageMaterializationApprovalAuditTrail.auditRecordWritten:false`,
  `packageMaterializationApprovalAuditTrail.auditRecordPersisted:false`,
  `packageMaterializationApprovalAuditTrail.auditRecordValidated:false`,
  `packageMaterializationApprovalAuditTrail.auditRecordExported:false`,
  `packageMaterializationApprovalAuditTrail.writeAuditNow:false`,
  `tokenAccepted:false`, `approved:false`, `finalApprovalGranted:false`,
  `filesWritten:false`, `verificationExecuted:false`,
  `fileMaterialization:false`, `workspaceMutation:false`,
  `lockfileMutation:false`, `commandExecution:false`, `buildOutput:false`,
  `materializationApproved:false`, `runtimeRegistration:false`, and
  `localFileWrites:false`.
- P25.43 package materialization approval replay guard fields are
  planning-only. They define future one-time token replay prevention, nonce and
  scope-hash checks, blocked replay decision, and no-op guarantees while
  keeping
  `packageMaterializationApprovalReplayGuard.replayCheckExecuted:false`,
  `packageMaterializationApprovalReplayGuard.replayDetected:false`,
  `packageMaterializationApprovalReplayGuard.replayRejected:false`,
  `packageMaterializationApprovalReplayGuard.nonceStored:false`,
  `packageMaterializationApprovalReplayGuard.scopeHashStored:false`,
  `tokenAccepted:false`, `tokenConsumed:false`, `tokenRevoked:false`,
  `approved:false`, `finalApprovalGranted:false`, `filesWritten:false`,
  `verificationExecuted:false`, `fileMaterialization:false`,
  `workspaceMutation:false`, `lockfileMutation:false`,
  `commandExecution:false`, `buildOutput:false`,
  `materializationApproved:false`, `runtimeRegistration:false`, and
  `localFileWrites:false`.
- P25.44 package materialization approval expiry policy fields are
  planning-only. They define future short-lived approval token expiry rules,
  required `issuedAt`/`notBefore`/`expiresAt` claims, max-age and clock-skew
  checks, blocked expiry decision, and no-op guarantees while keeping
  `packageMaterializationApprovalExpiryPolicy.expiryCheckExecuted:false`,
  `packageMaterializationApprovalExpiryPolicy.tokenExpired:false`,
  `packageMaterializationApprovalExpiryPolicy.tokenNotBeforeChecked:false`,
  `packageMaterializationApprovalExpiryPolicy.tokenExpiresAtChecked:false`,
  `packageMaterializationApprovalExpiryPolicy.clockSkewChecked:false`,
  `tokenAccepted:false`, `tokenValidated:false`, `tokenConsumed:false`,
  `tokenRevoked:false`, `approved:false`, `finalApprovalGranted:false`,
  `filesWritten:false`, `verificationExecuted:false`,
  `fileMaterialization:false`, `workspaceMutation:false`,
  `lockfileMutation:false`, `commandExecution:false`, `buildOutput:false`,
  `materializationApproved:false`, `runtimeRegistration:false`, and
  `localFileWrites:false`. They do not read or trust wall-clock time.
- P25.45 package materialization approval revocation policy fields are
  planning-only. They define future revoked-token denial rules, revocation
  registry sources, revocation epoch checks, audit linkage, blocked revocation
  decision, and no-op guarantees while keeping
  `packageMaterializationApprovalRevocationPolicy.revocationCheckExecuted:false`,
  `packageMaterializationApprovalRevocationPolicy.revocationRegistryFetched:false`,
  `packageMaterializationApprovalRevocationPolicy.revocationStatusFetched:false`,
  `packageMaterializationApprovalRevocationPolicy.revocationStatusTrusted:false`,
  `packageMaterializationApprovalRevocationPolicy.tokenRevocationChecked:false`,
  `packageMaterializationApprovalRevocationPolicy.revokedTokenRejected:false`,
  `tokenAccepted:false`, `tokenValidated:false`, `tokenConsumed:false`,
  `approved:false`, `finalApprovalGranted:false`, `filesWritten:false`,
  `verificationExecuted:false`, `fileMaterialization:false`,
  `workspaceMutation:false`, `lockfileMutation:false`,
  `commandExecution:false`, `buildOutput:false`,
  `materializationApproved:false`, `runtimeRegistration:false`, and
  `localFileWrites:false`. They do not fetch, read, or trust revocation state.
- P25.46 package materialization approval scope binding policy fields are
  planning-only. They define future canonical approval scope serialization,
  approval scope hash planning, target/command/workspace/package binding,
  token scope match, blocked scope-binding decision, and no-op guarantees while
  keeping
  `packageMaterializationApprovalScopeBindingPolicy.scopeBindingExecuted:false`,
  `packageMaterializationApprovalScopeBindingPolicy.approvalScopeHashComputed:false`,
  `packageMaterializationApprovalScopeBindingPolicy.approvalScopeHashValidated:false`,
  `packageMaterializationApprovalScopeBindingPolicy.fileSnapshotRead:false`,
  `packageMaterializationApprovalScopeBindingPolicy.workspaceHashComputed:false`,
  `packageMaterializationApprovalScopeBindingPolicy.packageManifestHashComputed:false`,
  `packageMaterializationApprovalScopeBindingPolicy.tokenScopeMatched:false`,
  `tokenAccepted:false`, `tokenValidated:false`, `tokenConsumed:false`,
  `approved:false`, `finalApprovalGranted:false`, `filesWritten:false`,
  `verificationExecuted:false`, `fileMaterialization:false`,
  `workspaceMutation:false`, `lockfileMutation:false`,
  `commandExecution:false`, `buildOutput:false`,
  `materializationApproved:false`, `runtimeRegistration:false`, and
  `localFileWrites:false`. They do not read file snapshots or hash workspace
  or package files.
- P25.47 package materialization approval operator confirmation policy fields
  are planning-only. They define future explicit operator confirmation,
  required identity and intent inputs, visible approval scope, confirmation
  phrase, audit linkage, blocked confirmation decision, and no-op guarantees
  while keeping
  `packageMaterializationApprovalOperatorConfirmationPolicy.operatorConfirmationPrompted:false`,
  `packageMaterializationApprovalOperatorConfirmationPolicy.operatorConfirmationReceived:false`,
  `packageMaterializationApprovalOperatorConfirmationPolicy.operatorConfirmationStored:false`,
  `packageMaterializationApprovalOperatorConfirmationPolicy.operatorConfirmationValidated:false`,
  `packageMaterializationApprovalOperatorConfirmationPolicy.operatorIdentityVerified:false`,
  `packageMaterializationApprovalOperatorConfirmationPolicy.confirmationTokenIssued:false`,
  `tokenAccepted:false`, `tokenValidated:false`, `tokenConsumed:false`,
  `approved:false`, `finalApprovalGranted:false`, `filesWritten:false`,
  `verificationExecuted:false`, `fileMaterialization:false`,
  `workspaceMutation:false`, `lockfileMutation:false`,
  `commandExecution:false`, `buildOutput:false`,
  `materializationApproved:false`, `runtimeRegistration:false`, and
  `localFileWrites:false`. They do not prompt operators, collect or persist
  confirmations, verify identity, issue confirmation tokens, or accept tokens.
- P25.48 package materialization approval emergency stop policy fields are
  planning-only. They define future trusted stop source, stop scope inputs,
  stop registry state, blocked emergency-stop decision, and no-op guarantees
  while keeping
  `packageMaterializationApprovalEmergencyStopPolicy.emergencyStopChecked:false`,
  `packageMaterializationApprovalEmergencyStopPolicy.emergencyStopFetched:false`,
  `packageMaterializationApprovalEmergencyStopPolicy.emergencyStopStateRead:false`,
  `packageMaterializationApprovalEmergencyStopPolicy.emergencyStopStateTrusted:false`,
  `packageMaterializationApprovalEmergencyStopPolicy.stopRegistryFetched:false`,
  `packageMaterializationApprovalEmergencyStopPolicy.stopStatusTrusted:false`,
  `tokenAccepted:false`, `tokenValidated:false`, `tokenConsumed:false`,
  `approved:false`, `finalApprovalGranted:false`, `filesWritten:false`,
  `verificationExecuted:false`, `fileMaterialization:false`,
  `workspaceMutation:false`, `lockfileMutation:false`,
  `commandExecution:false`, `buildOutput:false`,
  `materializationApproved:false`, `runtimeRegistration:false`, and
  `localFileWrites:false`. They do not configure or fetch stop registries,
  read or trust stop state, accept overrides, grant approval, or accept tokens.
- P25.49 package materialization approval readiness verdict policy fields are
  planning-only. They define future final readiness inputs, blocker evaluation,
  trusted verdict, audit linkage, blocked readiness decision, and no-op
  guarantees while keeping
  `packageMaterializationApprovalReadinessVerdictPolicy.readinessVerdictComputed:false`,
  `packageMaterializationApprovalReadinessVerdictPolicy.readinessVerdictStored:false`,
  `packageMaterializationApprovalReadinessVerdictPolicy.readinessVerdictTrusted:false`,
  `packageMaterializationApprovalReadinessVerdictPolicy.readinessInputsValidated:false`,
  `packageMaterializationApprovalReadinessVerdictPolicy.readinessBlockersEvaluated:false`,
  `packageMaterializationApprovalReadinessVerdictPolicy.materializationReady:false`,
  `tokenAccepted:false`, `tokenValidated:false`, `tokenConsumed:false`,
  `approved:false`, `finalApprovalGranted:false`, `filesWritten:false`,
  `verificationExecuted:false`, `fileMaterialization:false`,
  `workspaceMutation:false`, `lockfileMutation:false`,
  `commandExecution:false`, `buildOutput:false`,
  `materializationApproved:false`, `runtimeRegistration:false`, and
  `localFileWrites:false`. They do not compute, store, or trust verdicts,
  validate readiness inputs, evaluate blockers, grant approval, or accept
  tokens.
- P25.50 package materialization approval execution handoff policy fields are
  planning-only. They define future post-approval handoff targets, required
  handoff inputs, handoff checks, blocked execution-job decisions, and no-op
  guarantees while keeping
  `packageMaterializationApprovalExecutionHandoffPolicy.handoffPrepared:false`,
  `packageMaterializationApprovalExecutionHandoffPolicy.handoffQueued:false`,
  `packageMaterializationApprovalExecutionHandoffPolicy.handoffStored:false`,
  `packageMaterializationApprovalExecutionHandoffPolicy.handoffValidated:false`,
  `packageMaterializationApprovalExecutionHandoffPolicy.executionJobCreated:false`,
  `packageMaterializationApprovalExecutionHandoffPolicy.executionJobQueued:false`,
  `packageMaterializationApprovalExecutionHandoffPolicy.executionJobDispatched:false`,
  `packageMaterializationApprovalExecutionHandoffPolicy.materializationReady:false`,
  `packageMaterializationApprovalExecutionHandoffPolicy.materializationApproved:false`,
  `tokenAccepted:false`, `tokenValidated:false`, `tokenConsumed:false`,
  `approved:false`, `finalApprovalGranted:false`, `filesWritten:false`,
  `verificationExecuted:false`, `fileMaterialization:false`,
  `workspaceMutation:false`, `lockfileMutation:false`,
  `commandExecution:false`, `buildOutput:false`,
  `runtimeRegistration:false`, and `localFileWrites:false`. They do not
  prepare, validate, persist, or queue handoffs, create or dispatch execution
  jobs, select or notify execution owners, grant approval, or accept tokens.
- P25.51 package materialization approval post-handoff audit policy fields are
  planning-only. They define future audit sinks, required audit inputs,
  post-handoff audit checks, blocked audit decisions, and no-op guarantees
  while keeping
  `packageMaterializationApprovalPostHandoffAuditPolicy.auditRecordPrepared:false`,
  `packageMaterializationApprovalPostHandoffAuditPolicy.auditRecordValidated:false`,
  `packageMaterializationApprovalPostHandoffAuditPolicy.auditRecordStored:false`,
  `packageMaterializationApprovalPostHandoffAuditPolicy.auditRecordWritten:false`,
  `packageMaterializationApprovalPostHandoffAuditPolicy.handoffSnapshotCaptured:false`,
  `packageMaterializationApprovalPostHandoffAuditPolicy.executionJobSnapshotCaptured:false`,
  `packageMaterializationApprovalPostHandoffAuditPolicy.materializationReady:false`,
  `packageMaterializationApprovalPostHandoffAuditPolicy.materializationApproved:false`,
  `tokenAccepted:false`, `tokenValidated:false`, `tokenConsumed:false`,
  `approved:false`, `finalApprovalGranted:false`, `filesWritten:false`,
  `verificationExecuted:false`, `fileMaterialization:false`,
  `workspaceMutation:false`, `lockfileMutation:false`,
  `commandExecution:false`, `buildOutput:false`,
  `runtimeRegistration:false`, and `localFileWrites:false`. They do not
  prepare, validate, store, publish, export, or write audit records, capture
  handoff or execution job snapshots, select audit sinks, grant approval, or
  accept tokens.
- Exporter service execution is out of scope for this command unless a later
  task explicitly maps thumbnail rendering to exporter-compatible semantics.
- P25.6 selects a future dedicated thumbnail renderer service as the executable
  owner. MCP Node direct rendering is rejected, frontend worker and exporter
  paths are deferred, and the backend cache wrapper is insufficient by itself.
- Tagged frame thumbnail registration remains blocked until the service or
  backend can normalize `create-file-object-thumbnail` into downloadable
  resource metadata equivalent to file thumbnail returns.

See `render-thumbnail-runtime-boundary.md` and
`render-thumbnail-runtime-boundary-fixtures.json` for the executable boundary
audit, resource-return rules, cache refresh behavior, auth expectations, and
future test strategy.
See `render-thumbnail-renderer-service-api.md` and
`render-thumbnail-renderer-service-fixtures.json` for the P25.51 future
renderer-service request/response API, MCP/CLI dry-run/client boundary, and
metadata-only availability probe plus response/error normalization and disabled
client request, execution gate, health preflight, and execution harness
scaffolding, plus the dispatch adapter boundary, opt-in configuration surfaces,
unavailable error taxonomy, integration fixture harness, and dispatch
registration preflight plus executable adapter registration scaffold and
adapter registry manifest plus enablement checklist and implementation slice
audit plus health/no-op contract fixtures, no-op service host scaffold, and
host lifecycle test fixtures plus package manifest scaffold, package creation
guardrails, package file templates, package workspace wiring, package build
verification, package materialization approval expiry policy, package
materialization approval revocation policy, package materialization approval
scope binding policy, and package materialization approval operator
confirmation policy, package materialization approval emergency stop policy,
package materialization approval readiness verdict policy, and package
materialization approval execution handoff policy, and package materialization
approval post-handoff audit policy.

## Fixtures

`render-thumbnail-contract-fixtures.json` is the canonical fixture matrix for:

- default dashboard file thumbnail
- refreshed dashboard file thumbnail with custom width
- tagged frame thumbnail object-key mapping
- missing frame target requirements

The command-runtime test suite consumes the fixture directly.
