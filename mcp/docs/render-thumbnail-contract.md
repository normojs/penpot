# Render Thumbnail Contract

Status: P25.4 descriptor contract; P25.64 MCP/CLI renderer-service dry-run
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
P25.52 adds package materialization approval audit retention policy metadata
without selecting retention policies, computing retention windows, trusting
clocks, storing retention records, updating indexes, archiving, purging,
exporting, writing audit records, or granting approval. P25.53 adds package
materialization approval audit access policy metadata without selecting access
policies, identifying subjects, computing scopes, granting access, reading audit
records, exporting audit records, or issuing access tokens.

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
- P25.52 package materialization approval audit retention policy fields are
  planning-only. They define future retention policies, required retention
  inputs, retention checks, blocked retention decisions, and no-op guarantees
  while keeping
  `packageMaterializationApprovalAuditRetentionPolicy.retentionPolicySelected:false`,
  `packageMaterializationApprovalAuditRetentionPolicy.retentionWindowComputed:false`,
  `packageMaterializationApprovalAuditRetentionPolicy.retentionClockTrusted:false`,
  `packageMaterializationApprovalAuditRetentionPolicy.retentionRecordStored:false`,
  `packageMaterializationApprovalAuditRetentionPolicy.retentionIndexUpdated:false`,
  `packageMaterializationApprovalAuditRetentionPolicy.archiveStored:false`,
  `packageMaterializationApprovalAuditRetentionPolicy.purgeScheduled:false`,
  `packageMaterializationApprovalAuditRetentionPolicy.purgeExecuted:false`,
  `packageMaterializationApprovalAuditRetentionPolicy.exportWritten:false`,
  `packageMaterializationApprovalAuditRetentionPolicy.auditRecordWritten:false`,
  `approved:false`, `finalApprovalGranted:false`, `filesWritten:false`,
  `fileMaterialization:false`, `workspaceMutation:false`,
  `commandExecution:false`, `buildOutput:false`,
  `runtimeRegistration:false`, and `localFileWrites:false`. They do not select
  retention policies, compute retention windows, trust clocks, store retention
  records, update indexes, archive, purge, export, write audit records, grant
  approval, or materialize files.
- P25.53 package materialization approval audit access policy fields are
  planning-only. They define future audit access policies, required access
  inputs, access checks, blocked access decisions, and no-op guarantees while
  keeping
  `packageMaterializationApprovalAuditAccessPolicy.accessPolicySelected:false`,
  `packageMaterializationApprovalAuditAccessPolicy.accessSubjectIdentified:false`,
  `packageMaterializationApprovalAuditAccessPolicy.accessScopeComputed:false`,
  `packageMaterializationApprovalAuditAccessPolicy.accessDecisionStored:false`,
  `packageMaterializationApprovalAuditAccessPolicy.accessGranted:false`,
  `packageMaterializationApprovalAuditAccessPolicy.auditRecordRead:false`,
  `packageMaterializationApprovalAuditAccessPolicy.auditRecordQueried:false`,
  `packageMaterializationApprovalAuditAccessPolicy.auditRecordExported:false`,
  `packageMaterializationApprovalAuditAccessPolicy.accessTokenIssued:false`,
  `approved:false`, `finalApprovalGranted:false`, `filesWritten:false`,
  `fileMaterialization:false`, `workspaceMutation:false`,
  `commandExecution:false`, `buildOutput:false`,
  `runtimeRegistration:false`, and `localFileWrites:false`. They do not select
  access policies, identify subjects, compute or validate scopes, grant
  access, read or query audit records, export audit records, issue access
  tokens, grant approval, or materialize files.
- P25.54 package materialization approval audit integrity policy fields are
  planning-only. They define future integrity policies, required integrity
  inputs, integrity checks, blocked integrity decisions, and no-op guarantees
  while keeping
  `packageMaterializationApprovalAuditIntegrityPolicy.integrityPolicySelected:false`,
  `packageMaterializationApprovalAuditIntegrityPolicy.integrityHashComputed:false`,
  `packageMaterializationApprovalAuditIntegrityPolicy.integrityHashVerified:false`,
  `packageMaterializationApprovalAuditIntegrityPolicy.integritySignatureCreated:false`,
  `packageMaterializationApprovalAuditIntegrityPolicy.integrityChainVerified:false`,
  `packageMaterializationApprovalAuditIntegrityPolicy.auditRecordRead:false`,
  `packageMaterializationApprovalAuditIntegrityPolicy.auditRecordHashed:false`,
  `packageMaterializationApprovalAuditIntegrityPolicy.auditRecordVerified:false`,
  `packageMaterializationApprovalAuditIntegrityPolicy.auditRecordTamperChecked:false`,
  `approved:false`, `finalApprovalGranted:false`, `filesWritten:false`,
  `fileMaterialization:false`, `workspaceMutation:false`,
  `commandExecution:false`, `buildOutput:false`,
  `runtimeRegistration:false`, and `localFileWrites:false`. They do not select
  integrity policies, compute scopes, hash or verify audit records, create or
  verify signatures, link or verify integrity chains, check tamper state, grant
  approval, or materialize files.
- P25.55 package materialization approval audit provenance policy fields are
  planning-only. They define future provenance policies, required provenance
  inputs, provenance checks, blocked provenance decisions, and no-op guarantees
  while keeping
  `packageMaterializationApprovalAuditProvenancePolicy.provenancePolicySelected:false`,
  `packageMaterializationApprovalAuditProvenancePolicy.provenanceSubjectIdentified:false`,
  `packageMaterializationApprovalAuditProvenancePolicy.provenanceSourceCollected:false`,
  `packageMaterializationApprovalAuditProvenancePolicy.provenanceSourceValidated:false`,
  `packageMaterializationApprovalAuditProvenancePolicy.provenanceGraphComputed:false`,
  `packageMaterializationApprovalAuditProvenancePolicy.provenanceGraphStored:false`,
  `packageMaterializationApprovalAuditProvenancePolicy.provenanceRecordCreated:false`,
  `packageMaterializationApprovalAuditProvenancePolicy.auditRecordRead:false`,
  `packageMaterializationApprovalAuditProvenancePolicy.auditRecordQueried:false`,
  `packageMaterializationApprovalAuditProvenancePolicy.provenanceHashComputed:false`,
  `approved:false`, `finalApprovalGranted:false`, `filesWritten:false`,
  `fileMaterialization:false`, `workspaceMutation:false`,
  `commandExecution:false`, `buildOutput:false`,
  `runtimeRegistration:false`, and `localFileWrites:false`. They do not select
  provenance policies, identify provenance subjects, collect or validate
  sources, compute or store graphs, create provenance records, read or query
  audit records, sign or hash provenance, grant approval, or materialize files.
- P25.56 package materialization approval audit custody policy fields are
  planning-only. They define future custody policies, required custody inputs,
  custody checks, blocked custody decisions, and no-op guarantees while keeping
  `packageMaterializationApprovalAuditCustodyPolicy.custodyPolicySelected:false`,
  `packageMaterializationApprovalAuditCustodyPolicy.custodySubjectIdentified:false`,
  `packageMaterializationApprovalAuditCustodyPolicy.custodyHolderIdentified:false`,
  `packageMaterializationApprovalAuditCustodyPolicy.custodyTransferPrepared:false`,
  `packageMaterializationApprovalAuditCustodyPolicy.custodyTransferExecuted:false`,
  `packageMaterializationApprovalAuditCustodyPolicy.custodyTaken:false`,
  `packageMaterializationApprovalAuditCustodyPolicy.custodyReleased:false`,
  `packageMaterializationApprovalAuditCustodyPolicy.custodyRecordCreated:false`,
  `packageMaterializationApprovalAuditCustodyPolicy.auditRecordRead:false`,
  `packageMaterializationApprovalAuditCustodyPolicy.auditRecordQueried:false`,
  `packageMaterializationApprovalAuditCustodyPolicy.custodyHashComputed:false`,
  `approved:false`, `finalApprovalGranted:false`, `filesWritten:false`,
  `fileMaterialization:false`, `workspaceMutation:false`,
  `commandExecution:false`, `buildOutput:false`,
  `runtimeRegistration:false`, and `localFileWrites:false`. They do not select
  custody policies, identify custody subjects or holders, prepare or execute
  transfers, take or release custody, create custody records, read or query
  audit records, sign or hash custody, grant approval, or materialize files.
- P25.57 package materialization approval audit evidence policy fields are
  planning-only. They define future evidence policies, required evidence
  inputs, evidence checks, blocked evidence decisions, and no-op guarantees
  while keeping
  `packageMaterializationApprovalAuditEvidencePolicy.evidencePolicySelected:false`,
  `packageMaterializationApprovalAuditEvidencePolicy.evidenceSubjectIdentified:false`,
  `packageMaterializationApprovalAuditEvidencePolicy.evidenceSourceIdentified:false`,
  `packageMaterializationApprovalAuditEvidencePolicy.evidenceCollected:false`,
  `packageMaterializationApprovalAuditEvidencePolicy.evidenceValidated:false`,
  `packageMaterializationApprovalAuditEvidencePolicy.evidenceNormalized:false`,
  `packageMaterializationApprovalAuditEvidencePolicy.evidenceRecordCreated:false`,
  `packageMaterializationApprovalAuditEvidencePolicy.evidenceBundleCreated:false`,
  `packageMaterializationApprovalAuditEvidencePolicy.auditRecordRead:false`,
  `packageMaterializationApprovalAuditEvidencePolicy.auditRecordQueried:false`,
  `packageMaterializationApprovalAuditEvidencePolicy.evidenceHashComputed:false`,
  `approved:false`, `finalApprovalGranted:false`, `filesWritten:false`,
  `fileMaterialization:false`, `workspaceMutation:false`,
  `commandExecution:false`, `buildOutput:false`,
  `runtimeRegistration:false`, and `localFileWrites:false`. They do not select
  evidence policies, identify evidence subjects or sources, collect, validate,
  or normalize evidence, create evidence records or bundles, read or query
  audit records, sign or hash evidence, grant approval, or materialize files.
- P25.58 package materialization approval audit attestation policy fields are
  planning-only. They define future attestation policies, required attestation
  inputs, attestation checks, blocked attestation decisions, and no-op
  guarantees while keeping
  `packageMaterializationApprovalAuditAttestationPolicy.attestationPolicySelected:false`,
  `packageMaterializationApprovalAuditAttestationPolicy.attestationSubjectIdentified:false`,
  `packageMaterializationApprovalAuditAttestationPolicy.attestationAuthorityIdentified:false`,
  `packageMaterializationApprovalAuditAttestationPolicy.attestationPrepared:false`,
  `packageMaterializationApprovalAuditAttestationPolicy.attestationCreated:false`,
  `packageMaterializationApprovalAuditAttestationPolicy.attestationValidated:false`,
  `packageMaterializationApprovalAuditAttestationPolicy.attestationStored:false`,
  `packageMaterializationApprovalAuditAttestationPolicy.attestationPublished:false`,
  `packageMaterializationApprovalAuditAttestationPolicy.attestationBundleCreated:false`,
  `packageMaterializationApprovalAuditAttestationPolicy.evidenceRecordRead:false`,
  `packageMaterializationApprovalAuditAttestationPolicy.evidenceRecordAttested:false`,
  `packageMaterializationApprovalAuditAttestationPolicy.auditRecordRead:false`,
  `packageMaterializationApprovalAuditAttestationPolicy.auditRecordQueried:false`,
  `packageMaterializationApprovalAuditAttestationPolicy.attestationHashComputed:false`,
  `approved:false`, `finalApprovalGranted:false`, `filesWritten:false`,
  `fileMaterialization:false`, `workspaceMutation:false`,
  `commandExecution:false`, `buildOutput:false`,
  `runtimeRegistration:false`, and `localFileWrites:false`. They do not select
  attestation policies, identify subjects or authorities, prepare, create,
  validate, store, or publish attestations, create attestation bundles, read,
  attest, or verify evidence records, read or query audit records, sign or
  hash attestations, grant approval, or materialize files.
- P25.59 package materialization approval audit notarization policy fields are
  planning-only. They define future notarization policies, required
  notarization inputs, notarization checks, blocked notarization decisions, and
  no-op guarantees while keeping
  `packageMaterializationApprovalAuditNotarizationPolicy.notarizationPolicySelected:false`,
  `packageMaterializationApprovalAuditNotarizationPolicy.notarizationSubjectIdentified:false`,
  `packageMaterializationApprovalAuditNotarizationPolicy.notarizationAuthorityIdentified:false`,
  `packageMaterializationApprovalAuditNotarizationPolicy.notarizationPrepared:false`,
  `packageMaterializationApprovalAuditNotarizationPolicy.notarizationCreated:false`,
  `packageMaterializationApprovalAuditNotarizationPolicy.notarizationValidated:false`,
  `packageMaterializationApprovalAuditNotarizationPolicy.notarizationStored:false`,
  `packageMaterializationApprovalAuditNotarizationPolicy.notarizationPublished:false`,
  `packageMaterializationApprovalAuditNotarizationPolicy.notarizationRecordCreated:false`,
  `packageMaterializationApprovalAuditNotarizationPolicy.attestationRead:false`,
  `packageMaterializationApprovalAuditNotarizationPolicy.attestationNotarized:false`,
  `packageMaterializationApprovalAuditNotarizationPolicy.auditRecordRead:false`,
  `packageMaterializationApprovalAuditNotarizationPolicy.auditRecordQueried:false`,
  `packageMaterializationApprovalAuditNotarizationPolicy.notarizationHashComputed:false`,
  `approved:false`, `finalApprovalGranted:false`, `filesWritten:false`,
  `fileMaterialization:false`, `workspaceMutation:false`,
  `commandExecution:false`, `buildOutput:false`,
  `runtimeRegistration:false`, and `localFileWrites:false`. They do not select
  notarization policies, identify subjects or authorities, prepare, create,
  validate, store, or publish notarizations, create notarization records, read,
  notarize, or verify attestations, read or query audit records, sign or hash
  notarizations, grant approval, or materialize files.
- P25.60 package materialization approval audit certification policy fields are
  planning-only. They define future certification policies, required
  certification inputs, certification checks, blocked certification decisions,
  and no-op guarantees while keeping
  `packageMaterializationApprovalAuditCertificationPolicy.certificationPolicySelected:false`,
  `packageMaterializationApprovalAuditCertificationPolicy.certificationSubjectIdentified:false`,
  `packageMaterializationApprovalAuditCertificationPolicy.certificationAuthorityIdentified:false`,
  `packageMaterializationApprovalAuditCertificationPolicy.certificationPrepared:false`,
  `packageMaterializationApprovalAuditCertificationPolicy.certificationCreated:false`,
  `packageMaterializationApprovalAuditCertificationPolicy.certificationValidated:false`,
  `packageMaterializationApprovalAuditCertificationPolicy.certificationStored:false`,
  `packageMaterializationApprovalAuditCertificationPolicy.certificationPublished:false`,
  `packageMaterializationApprovalAuditCertificationPolicy.certificationRecordCreated:false`,
  `packageMaterializationApprovalAuditCertificationPolicy.notarizationRead:false`,
  `packageMaterializationApprovalAuditCertificationPolicy.notarizationCertified:false`,
  `packageMaterializationApprovalAuditCertificationPolicy.auditRecordRead:false`,
  `packageMaterializationApprovalAuditCertificationPolicy.auditRecordQueried:false`,
  `packageMaterializationApprovalAuditCertificationPolicy.certificationHashComputed:false`,
  `approved:false`, `finalApprovalGranted:false`, `filesWritten:false`,
  `fileMaterialization:false`, `workspaceMutation:false`,
  `commandExecution:false`, `buildOutput:false`,
  `runtimeRegistration:false`, and `localFileWrites:false`. They do not select
  certification policies, identify subjects or authorities, prepare, create,
  validate, store, or publish certifications, create certification records,
  read, certify, or verify notarizations, read or query audit records, sign or
  hash certifications, grant approval, or materialize files.
- P25.61 package materialization approval audit endorsement policy fields are
  planning-only. They define future endorsement policies, required endorsement
  inputs, endorsement checks, blocked endorsement decisions, and no-op
  guarantees while keeping
  `packageMaterializationApprovalAuditEndorsementPolicy.endorsementPolicySelected:false`,
  `packageMaterializationApprovalAuditEndorsementPolicy.endorsementSubjectIdentified:false`,
  `packageMaterializationApprovalAuditEndorsementPolicy.endorsementAuthorityIdentified:false`,
  `packageMaterializationApprovalAuditEndorsementPolicy.endorsementPrepared:false`,
  `packageMaterializationApprovalAuditEndorsementPolicy.endorsementCreated:false`,
  `packageMaterializationApprovalAuditEndorsementPolicy.endorsementValidated:false`,
  `packageMaterializationApprovalAuditEndorsementPolicy.endorsementStored:false`,
  `packageMaterializationApprovalAuditEndorsementPolicy.endorsementPublished:false`,
  `packageMaterializationApprovalAuditEndorsementPolicy.endorsementRecordCreated:false`,
  `packageMaterializationApprovalAuditEndorsementPolicy.certificationRead:false`,
  `packageMaterializationApprovalAuditEndorsementPolicy.certificationEndorsed:false`,
  `packageMaterializationApprovalAuditEndorsementPolicy.auditRecordRead:false`,
  `packageMaterializationApprovalAuditEndorsementPolicy.auditRecordQueried:false`,
  `packageMaterializationApprovalAuditEndorsementPolicy.endorsementHashComputed:false`,
  `approved:false`, `finalApprovalGranted:false`, `filesWritten:false`,
  `fileMaterialization:false`, `workspaceMutation:false`,
  `commandExecution:false`, `buildOutput:false`,
  `runtimeRegistration:false`, and `localFileWrites:false`. They do not select
  endorsement policies, identify subjects or authorities, prepare, create,
  validate, store, or publish endorsements, create endorsement records, read,
  endorse, or verify certifications, read or query audit records, sign or hash
  endorsements, grant approval, or materialize files.
- P25.62 package materialization approval audit countersignature policy fields
  are planning-only. They define future countersignature policies, required
  countersignature inputs, countersignature checks, blocked countersignature
  decisions, and no-op guarantees while keeping
  `packageMaterializationApprovalAuditCountersignaturePolicy.countersignaturePolicySelected:false`,
  `packageMaterializationApprovalAuditCountersignaturePolicy.countersignatureSubjectIdentified:false`,
  `packageMaterializationApprovalAuditCountersignaturePolicy.countersignatureAuthorityIdentified:false`,
  `packageMaterializationApprovalAuditCountersignaturePolicy.countersignaturePrepared:false`,
  `packageMaterializationApprovalAuditCountersignaturePolicy.countersignatureCreated:false`,
  `packageMaterializationApprovalAuditCountersignaturePolicy.countersignatureValidated:false`,
  `packageMaterializationApprovalAuditCountersignaturePolicy.countersignatureStored:false`,
  `packageMaterializationApprovalAuditCountersignaturePolicy.countersignaturePublished:false`,
  `packageMaterializationApprovalAuditCountersignaturePolicy.countersignatureRecordCreated:false`,
  `packageMaterializationApprovalAuditCountersignaturePolicy.endorsementRead:false`,
  `packageMaterializationApprovalAuditCountersignaturePolicy.endorsementCountersigned:false`,
  `packageMaterializationApprovalAuditCountersignaturePolicy.auditRecordRead:false`,
  `packageMaterializationApprovalAuditCountersignaturePolicy.auditRecordQueried:false`,
  `packageMaterializationApprovalAuditCountersignaturePolicy.countersignatureHashComputed:false`,
  `approved:false`, `finalApprovalGranted:false`, `filesWritten:false`,
  `fileMaterialization:false`, `workspaceMutation:false`,
  `commandExecution:false`, `buildOutput:false`,
  `runtimeRegistration:false`, and `localFileWrites:false`. They do not select
  countersignature policies, identify subjects or authorities, prepare, create,
  validate, store, or publish countersignatures, create countersignature records,
  read, countersign, or verify endorsements, read or query audit records, sign or
  hash countersignatures, grant approval, or materialize files.
- P25.63 package materialization approval audit countersignature verification
  policy fields are planning-only. They define future countersignature
  verification policies, required verification inputs, verification checks,
  blocked verification decisions, and no-op guarantees while keeping
  `packageMaterializationApprovalAuditCountersignatureVerificationPolicy.countersignatureVerificationPolicySelected:false`,
  `packageMaterializationApprovalAuditCountersignatureVerificationPolicy.countersignatureVerificationSubjectIdentified:false`,
  `packageMaterializationApprovalAuditCountersignatureVerificationPolicy.countersignatureVerificationAuthorityIdentified:false`,
  `packageMaterializationApprovalAuditCountersignatureVerificationPolicy.countersignatureRead:false`,
  `packageMaterializationApprovalAuditCountersignatureVerificationPolicy.countersignatureRecordRead:false`,
  `packageMaterializationApprovalAuditCountersignatureVerificationPolicy.countersignaturePayloadParsed:false`,
  `packageMaterializationApprovalAuditCountersignatureVerificationPolicy.countersignatureSignatureVerified:false`,
  `packageMaterializationApprovalAuditCountersignatureVerificationPolicy.countersignatureHashComputed:false`,
  `packageMaterializationApprovalAuditCountersignatureVerificationPolicy.countersignatureHashMatched:false`,
  `packageMaterializationApprovalAuditCountersignatureVerificationPolicy.countersignatureChainVerified:false`,
  `packageMaterializationApprovalAuditCountersignatureVerificationPolicy.countersignatureVerificationExecuted:false`,
  `packageMaterializationApprovalAuditCountersignatureVerificationPolicy.countersignatureVerificationStored:false`,
  `packageMaterializationApprovalAuditCountersignatureVerificationPolicy.auditRecordRead:false`,
  `packageMaterializationApprovalAuditCountersignatureVerificationPolicy.auditRecordQueried:false`,
  `packageMaterializationApprovalAuditCountersignatureVerificationPolicy.countersignatureVerificationHashComputed:false`,
  `approved:false`, `finalApprovalGranted:false`, `filesWritten:false`,
  `fileMaterialization:false`, `workspaceMutation:false`,
  `commandExecution:false`, `buildOutput:false`,
  `runtimeRegistration:false`, and `localFileWrites:false`. They do not select
  verification policies, identify subjects or authorities, read
  countersignatures or audit records, parse payloads, verify signatures, compute
  hashes, link chains, store verification results, grant approval, or
  materialize files.
- P25.64 package materialization approval audit countersignature revocation
  policy fields are planning-only. They define future countersignature
  revocation policies, required revocation inputs, revocation checks, blocked
  revocation decisions, and no-op guarantees while keeping
  `packageMaterializationApprovalAuditCountersignatureRevocationPolicy.countersignatureRevocationPolicySelected:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationPolicy.countersignatureRevocationSubjectIdentified:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationPolicy.countersignatureRevocationAuthorityIdentified:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationPolicy.countersignatureRevocationReasonCaptured:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationPolicy.countersignatureRevocationRequestPrepared:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationPolicy.countersignatureRevocationExecuted:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationPolicy.countersignatureRevoked:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationPolicy.countersignatureRevocationRecordCreated:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationPolicy.countersignatureRead:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationPolicy.countersignatureVerificationRead:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationPolicy.auditRecordRead:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationPolicy.auditRecordQueried:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationPolicy.countersignatureRevocationHashComputed:false`,
  `approved:false`, `finalApprovalGranted:false`, `filesWritten:false`,
  `fileMaterialization:false`, `workspaceMutation:false`,
  `commandExecution:false`, `buildOutput:false`,
  `runtimeRegistration:false`, and `localFileWrites:false`. They do not select
  revocation policies, identify subjects or authorities, capture revocation
  reasons, read countersignatures or audit records, revoke countersignatures,
  create revocation records, sign or hash revocations, grant approval, or
  materialize files.
- P25.65 package materialization approval audit countersignature revocation
  appeal policy fields are planning-only. They define future countersignature
  revocation appeal policies, required appeal inputs, appeal checks, blocked
  appeal decisions, and no-op guarantees while keeping
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealPolicy.countersignatureRevocationAppealPolicySelected:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealPolicy.countersignatureRevocationAppealSubjectIdentified:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealPolicy.countersignatureRevocationAppealAuthorityIdentified:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealPolicy.countersignatureRevocationAppealReasonCaptured:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealPolicy.countersignatureRevocationAppealRequestPrepared:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealPolicy.countersignatureRevocationAppealExecuted:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealPolicy.countersignatureRevocationAppealed:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealPolicy.countersignatureRevocationAppealGranted:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealPolicy.countersignatureRevocationAppealDenied:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealPolicy.countersignatureRevocationAppealRecordCreated:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealPolicy.countersignatureRevocationRead:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealPolicy.auditRecordRead:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealPolicy.auditRecordQueried:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealPolicy.countersignatureRevocationAppealHashComputed:false`,
  `approved:false`, `finalApprovalGranted:false`, `filesWritten:false`,
  `fileMaterialization:false`, `workspaceMutation:false`,
  `commandExecution:false`, `buildOutput:false`, `runtimeRegistration:false`,
  and `localFileWrites:false`. They do not select appeal policies, identify
  subjects or authorities, capture appeal reasons, read revocations,
  countersignatures, or audit records, appeal revocations, grant or deny
  appeals, create appeal records, sign or hash appeals, grant approval, or
  materialize files.
- P25.66 package materialization approval audit countersignature revocation
  appeal resolution policy fields are planning-only. They define future
  countersignature revocation appeal resolution policies, required resolution
  inputs, resolution checks, blocked resolution decisions, and no-op guarantees
  while keeping
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionPolicy.countersignatureRevocationAppealResolutionPolicySelected:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionPolicy.countersignatureRevocationAppealResolutionSubjectIdentified:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionPolicy.countersignatureRevocationAppealResolutionAuthorityIdentified:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionPolicy.countersignatureRevocationAppealRead:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionPolicy.countersignatureRevocationAppealRecordRead:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionPolicy.countersignatureRevocationAppealResolutionReasonCaptured:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionPolicy.countersignatureRevocationAppealResolutionScopeComputed:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionPolicy.countersignatureRevocationAppealResolutionOutcomeSelected:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionPolicy.countersignatureRevocationAppealResolutionPrepared:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionPolicy.countersignatureRevocationAppealResolutionValidated:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionPolicy.countersignatureRevocationAppealResolutionStored:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionPolicy.countersignatureRevocationAppealResolutionExecuted:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionPolicy.countersignatureRevocationAppealResolved:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionPolicy.countersignatureRevocationAppealResolutionAccepted:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionPolicy.countersignatureRevocationAppealResolutionRejected:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionPolicy.countersignatureRevocationAppealResolutionPublished:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionPolicy.countersignatureRevocationAppealResolutionRecordCreated:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionPolicy.countersignatureRevocationAppealResolutionRecordStored:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionPolicy.countersignatureRevocationAppealResolutionRecordPublished:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionPolicy.countersignatureRevocationRead:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionPolicy.auditRecordRead:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionPolicy.auditRecordQueried:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionPolicy.countersignatureRevocationAppealResolutionHashComputed:false`,
  `approved:false`, `finalApprovalGranted:false`, `filesWritten:false`,
  `fileMaterialization:false`, `workspaceMutation:false`,
  `commandExecution:false`, `buildOutput:false`, `runtimeRegistration:false`,
  and `localFileWrites:false`. They do not select resolution policies, identify
  subjects or authorities, read appeal or audit records, capture resolution
  reasons, compute scopes, select outcomes, prepare, validate, store, execute,
  or publish resolutions, resolve appeals, accept or reject resolutions, create,
  store, or publish resolution records, sign or hash resolutions, grant
  approval, or materialize files.
- P25.67 package materialization approval audit countersignature revocation
  appeal resolution enforcement policy fields are planning-only. They define
  future countersignature revocation appeal resolution enforcement policies,
  required enforcement inputs, enforcement checks, blocked enforcement
  decisions, and no-op guarantees while keeping
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementPolicy.countersignatureRevocationAppealResolutionEnforcementPolicySelected:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementPolicy.countersignatureRevocationAppealResolutionEnforcementSubjectIdentified:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementPolicy.countersignatureRevocationAppealResolutionEnforcementAuthorityIdentified:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementPolicy.countersignatureRevocationAppealResolutionRead:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementPolicy.countersignatureRevocationAppealResolutionRecordRead:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementPolicy.countersignatureRevocationAppealResolutionEnforcementReasonCaptured:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementPolicy.countersignatureRevocationAppealResolutionEnforcementScopeComputed:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementPolicy.countersignatureRevocationAppealResolutionEnforcementActionSelected:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementPolicy.countersignatureRevocationAppealResolutionEnforcementPrepared:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementPolicy.countersignatureRevocationAppealResolutionEnforcementValidated:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementPolicy.countersignatureRevocationAppealResolutionEnforcementStored:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementPolicy.countersignatureRevocationAppealResolutionEnforcementExecuted:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementPolicy.countersignatureRevocationAppealResolutionEnforced:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementPolicy.countersignatureRevocationAppealResolutionEnforcementAccepted:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementPolicy.countersignatureRevocationAppealResolutionEnforcementRejected:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementPolicy.countersignatureRevocationAppealResolutionEnforcementPublished:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementPolicy.countersignatureRevocationAppealResolutionEnforcementRecordCreated:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementPolicy.countersignatureRevocationAppealResolutionEnforcementRecordStored:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementPolicy.countersignatureRevocationAppealResolutionEnforcementRecordPublished:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementPolicy.countersignatureRevocationAppealRead:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementPolicy.auditRecordRead:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementPolicy.auditRecordQueried:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementPolicy.countersignatureRevocationAppealResolutionEnforcementSignatureCreated:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementPolicy.countersignatureRevocationAppealResolutionEnforcementSignatureVerified:false`,
  `packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementPolicy.countersignatureRevocationAppealResolutionEnforcementHashComputed:false`,
  `approved:false`, `finalApprovalGranted:false`, `filesWritten:false`,
  `fileMaterialization:false`, `workspaceMutation:false`,
  `commandExecution:false`, `buildOutput:false`, `runtimeRegistration:false`,
  and `localFileWrites:false`. They do not select enforcement policies,
  identify subjects or authorities, read resolution or audit records, capture
  enforcement reasons, compute scopes, select actions, prepare, validate, store,
  execute, or publish enforcement, enforce resolutions, accept or reject
  enforcement, create enforcement records, sign or hash enforcement, grant
  approval, or materialize files.
- P25.68 package materialization approval audit countersignature revocation
  appeal resolution enforcement evidence policy fields are planning-only. They
  define future enforcement evidence policies, required evidence inputs,
  evidence checks, blocked evidence decisions, and no-op guarantees while
  keeping evidence policy selection, evidence subject/source identification,
  evidence collection/validation/normalization, evidence record storage,
  evidence bundle storage, enforcement/audit record reads, evidence
  linking/verification/signing/hashing, approval, file writes, workspace
  mutation, command execution, build output, package creation, process startup,
  and runtime registration disabled.
- P25.69 package materialization approval audit countersignature revocation
  appeal resolution enforcement evidence attestation policy fields are
  planning-only. They define future enforcement evidence attestation policies,
  required attestation inputs, attestation checks, blocked attestation
  decisions, and no-op guarantees while keeping attestation policy selection,
  subject/authority identification, attestation preparation/creation/
  validation/storage/publication, attestation bundle storage, evidence record
  reads/attestation/verification, audit record reads, attestation
  linking/verification/signing/hashing, approval, file writes, workspace
  mutation, command execution, build output, package creation, process startup,
  and runtime registration disabled.
- P25.70 package materialization approval audit countersignature revocation
  appeal resolution enforcement evidence attestation notarization policy fields
  are planning-only. They define future enforcement evidence attestation
  notarization policies, required notarization inputs, notarization checks,
  blocked notarization decisions, and no-op guarantees while keeping
  notarization policy selection, subject/authority identification,
  notarization preparation/creation/validation/storage/publication,
  notarization record storage/publication, attestation reads/notarization/
  verification, audit record reads, notarization linking/verification/signing/
  hashing, approval, file writes, workspace mutation, command execution, build
  output, package creation, process startup, and runtime registration disabled.
- P25.77 package materialization approval audit countersignature revocation appeal resolution enforcement evidence attestation notarization certification endorsement countersignature verification revocation appeal resolution policy fields are
  planning-only. They define future verification revocation appeal resolution
  policies, required resolution inputs, resolution checks, blocked resolution
  decisions, and no-op guarantees while keeping resolution policy selection,
  subject/authority identification, appeal reads, appeal record reads,
  resolution reason capture, scope computation, outcome selection, resolution
  storage/execution, appeal accepted/rejected decisions, resolution record
  storage/publication, countersignature and audit record reads, approval, file
  writes, workspace mutation, command execution, build output, package creation,
  process startup, and runtime registration disabled.
- P25.78 package materialization approval audit countersignature revocation appeal resolution enforcement evidence attestation notarization certification endorsement countersignature verification revocation appeal resolution enforcement policy fields are
  planning-only. They define future verification revocation appeal resolution
  enforcement policies, required enforcement inputs, enforcement checks,
  blocked enforcement decisions, and no-op guarantees while keeping enforcement
  policy selection, subject/authority identification, resolution reads,
  resolution record reads, enforcement reason capture, scope computation,
  action selection, enforcement storage/execution, resolution enforcement
  decisions, enforcement record storage/publication, countersignature and audit
  record reads, approval, file writes, workspace mutation, command execution,
  build output, package creation, process startup, and runtime registration
  disabled.
- P25.79 package materialization approval audit countersignature revocation appeal resolution enforcement evidence attestation notarization certification endorsement countersignature verification revocation appeal resolution enforcement evidence policy fields are
  planning-only. They define future verification revocation appeal resolution
  enforcement evidence policies, required evidence inputs, evidence checks,
  blocked evidence decisions, and no-op guarantees while keeping evidence
  policy selection, subject/source identification, evidence collection,
  validation, normalization, evidence record storage/publication, evidence
  bundle storage, enforcement, resolution, appeal, revocation, countersignature,
  and audit record reads, approval, file writes, workspace mutation, command
  execution, build output, package creation, process startup, and runtime
  registration disabled.
- P25.80 package materialization approval audit countersignature revocation appeal resolution enforcement evidence attestation notarization certification endorsement countersignature verification revocation appeal resolution enforcement evidence attestation policy fields are
  planning-only. They define future verification revocation appeal resolution
  enforcement evidence attestation policies, required attestation inputs,
  attestation checks, blocked attestation decisions, and no-op guarantees while
  keeping attestation policy selection, subject/authority identification,
  attestation creation/storage/publication, attestation bundle storage,
  evidence record reads/attestation/verification, evidence bundle reads,
  enforcement, resolution, appeal, revocation, countersignature, and audit
  record reads, approval, file writes, workspace mutation, command execution,
  build output, package creation, process startup, and runtime registration
  disabled.
- P25.81 package materialization approval audit countersignature revocation appeal resolution enforcement evidence attestation notarization certification endorsement countersignature verification revocation appeal resolution enforcement evidence attestation notarization policy fields are
  planning-only. They define future verification revocation appeal resolution
  enforcement evidence attestation notarization policies, required
  notarization inputs, notarization checks, blocked notarization decisions, and
  no-op guarantees while keeping notarization policy selection,
  subject/authority identification, notarization creation/storage/publication,
  notarization record storage/publication, attestation reads/notarization/
  verification, evidence, enforcement, resolution, appeal, revocation,
  countersignature, and audit record reads, approval, file writes, workspace
  mutation, command execution, build output, package creation, process startup,
  and runtime registration disabled.
- P25.82 package materialization approval audit countersignature revocation appeal resolution enforcement evidence attestation notarization certification endorsement countersignature verification revocation appeal resolution enforcement evidence attestation notarization certification policy fields are
  planning-only. They define future verification revocation appeal resolution
  enforcement evidence attestation notarization certification policies,
  required certification inputs, certification checks, blocked certification
  decisions, and no-op guarantees while keeping certification policy selection,
  subject/authority identification, certification creation/storage/
  publication, certification record storage/publication, notarization reads/
  certification/verification, attestation reads/notarization/verification,
  evidence, enforcement, resolution, appeal, revocation, countersignature, and
  audit record reads, approval, file writes, workspace mutation, command
  execution, build output, package creation, process startup, and runtime
  registration disabled.
- P25.83 package materialization approval audit countersignature revocation appeal resolution enforcement evidence attestation notarization certification endorsement countersignature verification revocation appeal resolution enforcement evidence attestation notarization certification endorsement policy fields are
  planning-only. They define future verification revocation appeal resolution
  enforcement evidence attestation notarization certification endorsement
  policies, required endorsement inputs, endorsement checks, blocked
  endorsement decisions, and no-op guarantees while keeping endorsement policy
  selection, subject/authority identification, endorsement creation/storage/
  publication, endorsement record storage/publication, certification reads/
  endorsement/verification, lower audit-chain reads, approval, file writes,
  workspace mutation, command execution, build output, package creation,
  process startup, and runtime registration disabled.
- P25.84 package materialization approval audit countersignature revocation appeal resolution enforcement evidence attestation notarization certification endorsement countersignature verification revocation appeal resolution enforcement evidence attestation notarization certification endorsement countersignature policy fields are
  planning-only. They define future verification revocation appeal resolution
  enforcement evidence attestation notarization certification endorsement
  countersignature policies, required endorsement-countersignature inputs,
  countersignature checks, blocked countersignature decisions, and no-op
  guarantees while keeping countersignature policy selection, subject/authority
  identification, endorsement countersigning, countersignature record storage/
  publication, endorsement reads/countersigning/verification, audit-chain
  reads, approval, file writes, workspace mutation, command execution, build
  output, package creation, process startup, and runtime registration disabled.
- P25.85 package materialization approval audit countersignature revocation appeal resolution enforcement evidence attestation notarization certification endorsement countersignature verification revocation appeal resolution enforcement evidence attestation notarization certification endorsement countersignature verification policy fields are planning-only. They define future
  countersignature verification metadata, required verification inputs,
  verification checks, blocked verification decisions, and no-op guarantees
  while keeping verification policy selection, subject/authority
  identification, countersignature reads, payload parsing, signature
  verification, hash computation/matching, chain verification, audit reads,
  approval, file writes, workspace mutation, command execution, build output,
  package creation, process startup, and runtime registration disabled.
- P25.86 package materialization approval audit countersignature revocation
  appeal resolution enforcement evidence attestation notarization certification
  endorsement countersignature verification revocation appeal resolution
  enforcement evidence attestation notarization certification endorsement
  countersignature verification revocation policy fields are planning-only.
  They define future countersignature verification revocation metadata,
  required revocation inputs, revocation checks, blocked revocation decisions,
  and no-op guarantees while keeping revocation policy selection,
  subject/authority identification, reason capture, scope computation, request
  storage/execution, verification record revocation, revocation record
  storage/publication, countersignature and audit record reads, approval, file
  writes, workspace mutation, command execution, build output, package
  creation, process startup, and runtime registration disabled.
- P25.71 package materialization approval audit countersignature revocation
  appeal resolution enforcement evidence attestation notarization certification
  policy fields are planning-only. They define future enforcement evidence
  attestation notarization certification policies, required certification
  inputs, certification checks, blocked certification decisions, and no-op
  guarantees while keeping certification policy selection, subject/authority
  identification, certification preparation/creation/validation/storage/
  publication, certification record storage/publication, notarization reads/
  certification/verification, audit record reads, certification linking/
  verification/signing/hashing, approval, file writes, workspace mutation,
  command execution, build output, package creation, process startup, and
  runtime registration disabled.
- P25.72 package materialization approval audit countersignature revocation
  appeal resolution enforcement evidence attestation notarization certification
  endorsement policy fields are planning-only. They define future enforcement
  evidence attestation notarization certification endorsement policies,
  required endorsement inputs, endorsement checks, blocked endorsement
  decisions, and no-op guarantees while keeping endorsement policy selection,
  subject/authority identification, endorsement preparation/creation/
  validation/storage/publication, endorsement record storage/publication,
  certification reads/endorsement/verification, audit record reads,
  endorsement linking/verification/signing/hashing, approval, file writes,
  workspace mutation, command execution, build output, package creation,
  process startup, and runtime registration disabled.
- P25.73 package materialization approval audit countersignature revocation
  appeal resolution enforcement evidence attestation notarization certification
  endorsement countersignature policy fields are planning-only. They define
  future enforcement evidence attestation notarization certification
  endorsement countersignature policies, required countersignature inputs,
  countersignature checks, blocked countersignature decisions, and no-op
  guarantees while keeping countersignature policy selection, subject/authority
  identification, countersignature preparation/creation/validation/storage/
  publication, countersignature record storage/publication, endorsement reads/
  countersignature/verification, audit record reads, countersignature linking/
  verification/signing/hashing, approval, file writes, workspace mutation,
  command execution, build output, package creation, process startup, and
  runtime registration disabled.
- P25.74 package materialization approval audit countersignature revocation
  appeal resolution enforcement evidence attestation notarization certification
  endorsement countersignature verification policy fields are planning-only.
  They define future endorsement countersignature verification policies,
  required verification inputs, verification checks, blocked verification
  decisions, and no-op guarantees while keeping countersignature reads, record
  reads, payload parsing, signature verification, hash matching, chain linking/
  verification, audit record reads, verification result storage/publication,
  approval, file writes, workspace mutation, command execution, build output,
  package creation, process startup, and runtime registration disabled.
- P25.75 package materialization approval audit countersignature revocation
  appeal resolution enforcement evidence attestation notarization certification
  endorsement countersignature verification revocation policy fields are
  planning-only. They define future verification revocation policies, required
  revocation inputs, revocation checks, blocked revocation decisions, and no-op
  guarantees while keeping revocation policy selection, subject/authority
  identification, reason capture, scope computation, request storage/execution,
  verification record revocation, revocation record storage/publication,
  countersignature and audit record reads, approval, file writes, workspace
  mutation, command execution, build output, package creation, process startup,
  and runtime registration disabled.
- P25.76 package materialization approval audit countersignature revocation
  appeal resolution enforcement evidence attestation notarization certification
  endorsement countersignature verification revocation appeal policy fields are
  planning-only. They define future verification revocation appeal policies,
  required appeal inputs, appeal checks, blocked appeal decisions, and no-op
  guarantees while keeping appeal policy selection, subject/authority
  identification, appeal reason capture, scope computation, request
  storage/execution, appeal grant/deny decisions, appeal record
  storage/publication, countersignature and audit record reads, approval, file
  writes, workspace mutation, command execution, build output, package creation,
  process startup, and runtime registration disabled.
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
`render-thumbnail-renderer-service-fixtures.json` for the P25.73 future
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
  verification, package materialization approval expiry/revocation/scope
  binding/operator confirmation/emergency stop/readiness verdict/execution
  handoff/post-handoff audit policies, and package materialization approval
  audit retention/access/integrity/provenance/custody/evidence/attestation/
  notarization/certification/endorsement/countersignature/countersignature
  verification/countersignature revocation/countersignature revocation appeal
  /countersignature revocation appeal resolution/countersignature revocation
  appeal resolution enforcement/enforcement evidence/enforcement evidence
  attestation/enforcement evidence attestation notarization/enforcement
  evidence attestation notarization certification/enforcement evidence
  attestation notarization certification endorsement/enforcement evidence
  attestation notarization certification endorsement countersignature
  policies plus enforcement evidence attestation notarization certification
  endorsement countersignature verification revocation policies.

## Fixtures

`render-thumbnail-contract-fixtures.json` is the canonical fixture matrix for:

- default dashboard file thumbnail
- refreshed dashboard file thumbnail with custom width
- tagged frame thumbnail object-key mapping
- missing frame target requirements

The command-runtime test suite consumes the fixture directly.
