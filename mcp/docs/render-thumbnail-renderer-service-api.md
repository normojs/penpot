# Render Thumbnail Renderer Service API

Status: P25.42 API fixtures, MCP/CLI dry-run/client boundaries, metadata-only
availability probes, response normalization contracts, disabled client request
scaffold, closed execution gate, disabled health preflight, and executable
client harness plus dispatch adapter boundary plans, and opt-in configuration
surfaces plus unavailable error taxonomy and integration fixture harness
plus dispatch registration preflight and executable adapter registration
scaffold plus adapter registry manifest, final enablement checklist,
implementation slice audit, health/no-op contract fixtures, and no-op service
host scaffold plus host lifecycle test fixtures and package manifest scaffold
plus package creation guardrails, package file templates, and package
workspace wiring plus package build verification defined; executable runtime
registration remains blocked. P25.32 adds package materialization checklist
metadata without creating package files. P25.33 adds package creation dry-run
summary metadata without writing files. P25.34 adds package creation file
manifest metadata without materializing files. P25.35 adds package
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
persisting, validating, or exporting audit records.

P25.6 selected a dedicated thumbnail renderer service as the future executable
owner for `render.thumbnail`. This document defines the service-facing request
and response contract that MCP and `penpot-cli` should share once a renderer
service exists.

This is not a renderer implementation. MCP `render.thumbnail` and CLI
`render thumbnail --dry-run` can print the future renderer-service plan, and
execution returns `renderer_service_unavailable` until the service exists. The
shared command descriptor advertises the planning adapter `renderer-service`,
but runtime execution remains unavailable.

P25.10 adds client configuration metadata to the plan. Callers can inspect the
configured endpoint, derived `/health` endpoint, probe timeout, content types,
and availability status without contacting the service. `configured-unverified`
means an endpoint exists but was not probed; `not-configured` means no endpoint
was provided by arguments or environment.

P25.11 defines response normalization before execution exists. A successful
service response is normalized into cache metadata, resource/download URI,
renderer metadata, and a `serviceResponse.localFileWrites: false` marker.
Service errors normalize to a shared error payload with service status,
retryability, endpoint, and service data.

P25.12 defines the future execution client request scaffold. The scaffold
contains POST metadata, JSON headers, MCP/CLI audit headers, caller-session auth
forwarding header names, timeout, and the `serviceRequest` body. It always has
`dispatch: false` until an explicit execution gate and integration tests exist.

P25.13 defines that explicit execution gate as planning data. The gate is
closed by default, requires `PENPOT_RENDER_THUMBNAIL_EXECUTION=renderer-service`,
records required renderer-service config, names failure modes, and embeds the
integration-test plan that must pass before any future client can dispatch.
P25.13 still does not contact the renderer service.

P25.14 defines the next disabled planning layer: a future GET `/health`
preflight and an executable client harness sequence. Both are returned in
MCP/CLI planning and unavailable execution responses with `dispatch:false` and
`networkProbe:false`; they document the order `executionGate -> healthPreflight
-> clientRequest -> normalizeResult` without enabling network probes.

P25.15 defines the future dispatch adapter boundary. It records config
precedence, gate/preflight/client request consumption, no-dispatch defaults,
and result/error mapping helpers. It still has `dispatch:false` and does not
replace metadata-only availability or perform health/render network calls.

P25.16 defines the future opt-in configuration surfaces. CLI, MCP, environment,
profile, and backend config sources are resolved into diagnostics, but
configuration alone cannot open the gate or enable dispatch.

P25.17 defines the renderer-service unavailable error taxonomy. Plans now name
stable configuration, execution-gate, health-preflight, dispatch,
response-normalization, and resource-normalization error codes with
retryability and MCP/CLI payload fields. It remains planning data with
`dispatch:false`.

P25.18 defines the renderer-service integration fixture harness. Plans now
name fixture cases for closed gate, missing endpoint, health failure, render
success, service failure, MCP metadata returns, CLI output gating, and
token-safe auth. It remains planning data with `dispatch:false`,
`networkDispatch:false`, and `localFileWrites:false`.

P25.19 defines the executable dispatch registration preflight. Plans now name
the final readiness checks for explicit opt-in, endpoint config, service
implementation, integration fixtures, health preflight, dispatch adapter,
target/cache capabilities, and runtime registration. It remains hard-disabled
with `dispatch:false`, `networkDispatch:false`, and `runtimeRegistration:false`.

P25.20 defines the disabled executable adapter registration scaffold. Plans now
include `executableAdapterRegistrationScaffold`, which consumes the P25.19
preflight, dispatch adapter boundary, and client request metadata while keeping
`dispatch:false`, `networkDispatch:false`, `runtimeRegistration:false`, and
`localFileWrites:false`.

P25.21 defines the disabled adapter registry manifest. Plans now include
`adapterRegistryManifest`, which records the future `renderer-service` registry
key, MCP/CLI entrypoint wiring, and no-op guarantees while keeping
`dispatch:false`, `networkDispatch:false`, `runtimeRegistration:false`, and
`localFileWrites:false`.

P25.22 defines the final disabled enablement checklist. Plans now include
`enablementChecklist`, which summarizes the remaining opt-in, health,
integration, adapter registration, registry, and target/cache capability gates
before executable runtime registration can be selected.

P25.23 audits the first concrete implementation slice. Plans now include
`implementationSliceAudit`, which selects the renderer-service health/no-op
contract fixture slice and keeps dispatch, network dispatch, runtime
registration, and local file writes disabled.

P25.24 defines the health/no-op contract fixtures selected by that audit. Plans
now include `healthNoopContractFixtures`, covering `/health` OK/unavailable
responses and a no-op `thumbnail.render` response while keeping dispatch,
network dispatch, runtime registration, and local file writes disabled.

P25.25 defines the no-op service host scaffold for those fixtures. Plans now
include `noopServiceHostScaffold`, covering the future host package, routes,
configuration, lifecycle, and observability while keeping process startup,
dispatch, network dispatch, runtime registration, and local file writes
disabled.

P25.26 defines disabled host lifecycle test fixtures. Plans now include
`hostLifecycleTestFixtures`, covering start, stop, readiness, supervision,
logs, and errors while keeping process spawn, port binding, health probes,
dispatch, runtime registration, and local file writes disabled.

P25.27 defines the package manifest scaffold. Plans now include
`packageManifestScaffold`, covering the future `@penpot/renderer-service`
package name, directory, private ESM package shape, planned scripts, exports,
dependencies, planned files, and workspace integration flags while keeping
package creation, workspace mutation, script runnability, dispatch, network
dispatch, runtime registration, and local file writes disabled.

P25.28 defines package creation guardrails. Plans now include
`packageCreationGuardrails`, covering required checks, blocked package files,
blocked workspace/runtime mutations, allowed planning work, denied actions, and
runtime-dispatch prerequisites while keeping package creation, workspace
mutation, scripts, host startup, process spawn, dispatch, network dispatch,
runtime registration, and local file writes disabled.

P25.29 defines package file templates. Plans now include
`packageFileTemplates`, covering metadata-only planned `package.json`,
`tsconfig.json`, source entrypoint, no-op host, and no-op host test file shapes
while keeping file materialization, package creation, workspace mutation,
script runnability, host startup, process spawn, dispatch, network dispatch,
runtime registration, and local file writes disabled.

P25.30 defines package workspace wiring. Plans now include
`packageWorkspaceWiring`, covering the planned `pnpm-workspace.yaml` entry,
root package scripts, lockfile touchpoints, workspace dependency filter, and
non-target files while keeping pnpm workspace mutation, root package.json
mutation, lockfile mutation, workspace mutation, package creation, script
runnability, file materialization, dispatch, network dispatch, runtime
registration, and local file writes disabled.

P25.31 defines package build verification. Plans now include
`packageBuildVerification`, covering planned filtered build, type-check, and
test commands plus expected `dist` artifacts while keeping command execution,
process spawn, build output, package scripts, package creation, workspace
mutation, file materialization, dispatch, network dispatch, runtime
registration, and local file writes disabled.

P25.32 defines the package materialization checklist. Plans now include
`packageMaterializationChecklist`, covering planned package, workspace, and
generated-output batches plus readiness checks, commit boundary, and rollback
plan while keeping materialization approval, file materialization, workspace
mutation, lockfile mutation, command execution, build output, dispatch, network
dispatch, runtime registration, and local file writes disabled.

P25.33 defines the package creation dry-run summary. Plans now include
`packageCreationDryRunSummary`, covering future would-create, would-modify,
would-generate, and would-run sections plus blocked-until reasons while
keeping dry-run-only behavior, file writes, workspace mutation, lockfile
mutation, command execution, build output, materialization approval, dispatch,
network dispatch, runtime registration, and local file writes disabled.

P25.34 defines the package creation file manifest. Plans now include
`packageCreationFileManifest`, covering the future package directory, package
files, generated dist files, workspace files, readiness blockers, and no-op
guarantees while keeping dry-run-only behavior, file writes, package creation,
workspace mutation, lockfile mutation, command execution, build output,
materialization approval, process startup, dispatch, network dispatch, runtime
registration, and local file writes disabled.

P25.35 defines the package materialization approval gate. Plans now include
`packageMaterializationApprovalGate`, covering explicit approval inputs,
approval scope, blocked decision state, post-approval sequence, and no-op
guarantees while keeping approval ungranted, dry-run-only behavior, file
writes, package creation, workspace mutation, lockfile mutation, command
execution, build output, materialization approval, process startup, dispatch,
network dispatch, runtime registration, and local file writes disabled.

P25.36 defines the package materialization execution dry-run. Plans now include
`packageMaterializationExecutionDryRun`, covering future directory creation,
package file write, workspace mutation, and verification command steps plus
blocked reasons and execution output flags while keeping execution blocked,
approval ungranted, file writes, package creation, workspace mutation, lockfile
mutation, command execution, build output, materialization approval, process
startup, dispatch, network dispatch, runtime registration, and local file
writes disabled.

P25.37 defines the package materialization write contract. Plans now include
`packageMaterializationWriteContract`, covering the future package directory,
package files, workspace files, integrity checks, atomic write expectations,
and rollback contract while keeping execution blocked, approval ungranted, file
writes, package creation, workspace mutation, lockfile mutation, command
execution, build output, materialization approval, process startup, dispatch,
network dispatch, runtime registration, and local file writes disabled.

P25.38 defines the package materialization rollback contract. Plans now include
`packageMaterializationRollbackContract`, covering pre-write snapshots,
rollback phases, failure recovery, and rollback verification while keeping
execution blocked, rollback unexecuted, approval ungranted, file writes,
package creation, workspace mutation, lockfile mutation, command execution,
build output, materialization approval, process startup, dispatch, network
dispatch, runtime registration, and local file writes disabled.

P25.39 defines the package materialization verification manifest. Plans now
include `packageMaterializationVerificationManifest`, covering package file
checks, workspace file checks, generated output checks, verification commands,
and runtime-disabled assertions while keeping execution blocked, verification
unexecuted, approval ungranted, file writes, package creation, workspace
mutation, lockfile mutation, command execution, build output, materialization
approval, process startup, dispatch, network dispatch, runtime registration,
and local file writes disabled.

P25.40 defines the package materialization final approval checklist. Plans now
include `packageMaterializationFinalApprovalChecklist`, covering explicit
approval items, approval scope, blocked decision state, and post-approval
sequence while keeping execution blocked, final approval ungranted, approval
ungranted, file writes, package creation, workspace mutation, lockfile
mutation, command execution, build output, materialization approval, process
startup, dispatch, network dispatch, runtime registration, and local file
writes disabled.

P25.41 defines the package materialization explicit approval token. Plans now
include `packageMaterializationExplicitApprovalToken`, covering the future
opaque one-time token format, required approval scope, validation plan, audit
plan, blocked decision state, and no-op guarantees while keeping token
acceptance, token storage, token validation, token consumption, final approval,
file writes, package creation, workspace mutation, lockfile mutation, command
execution, build output, materialization approval, process startup, dispatch,
network dispatch, runtime registration, and local file writes disabled.

P25.42 defines the package materialization approval audit trail. Plans now
include `packageMaterializationApprovalAuditTrail`, covering the future
append-only audit record format, required audit events, retention plan,
blocked decision state, and no-op guarantees while keeping audit record writes,
audit persistence, audit validation, audit export, token acceptance, final
approval, file writes, package creation, workspace mutation, lockfile mutation,
command execution, build output, materialization approval, process startup,
dispatch, network dispatch, runtime registration, and local file writes
disabled.

## Service Boundary

The future service operation is `thumbnail.render` behind a
`renderer-service` adapter. The transport can be an internal HTTP endpoint or a
worker RPC; callers should treat it as an implementation detail.

Planning responses include:

```json
{
  "client": {
    "endpoint": "http://127.0.0.1:6070/thumbnail",
    "configured": true,
    "healthEndpoint": "http://127.0.0.1:6070/thumbnail/health",
    "healthMethod": "GET",
    "probeTimeoutMs": 2500,
    "networkProbe": false
  },
  "availability": {
    "status": "configured-unverified",
    "probe": "metadata-only",
    "checked": false
  }
}
```

Health preflight and execution harness scaffold:

```json
{
  "healthPreflight": {
    "status": "planned-disabled",
    "dispatch": false,
    "networkProbe": false,
    "method": "GET",
    "endpoint": "http://127.0.0.1:6070/thumbnail/health",
    "expected": {
      "okStatuses": [200],
      "contentType": "application/json",
      "bodyStatus": "ok",
      "requiredFields": ["status", "renderer", "version"]
    }
  },
  "executionClientHarness": {
    "status": "planned-disabled",
    "dispatch": false,
    "sequence": ["executionGate", "healthPreflight", "clientRequest", "normalizeResult"]
  },
  "dispatchAdapterBoundary": {
    "status": "planned-disabled",
    "adapter": "renderer-service",
    "dispatch": false,
    "configPrecedence": [
      "explicit command args",
      "entrypoint environment",
      "profile/backend config source",
      "development defaults"
    ],
    "resultMapping": {
      "successHelper": "createRenderThumbnailRendererServiceResult",
      "errorHelper": "createRenderThumbnailRendererServiceErrorPayload"
    }
  },
  "optInConfiguration": {
    "status": "planned-disabled",
    "dispatch": false,
    "expectedValue": "renderer-service",
    "futureSurfaces": {
      "cliFlags": ["--render-thumbnail-execution renderer-service"],
      "mcpArgs": ["rendererServiceExecution: renderer-service"],
      "environment": ["PENPOT_RENDER_THUMBNAIL_EXECUTION=renderer-service"],
      "profileKeys": ["renderer.thumbnail.execution"],
      "backendConfigKeys": ["renderer.thumbnail.execution"]
    }
  }
}
```

Execution gate scaffold:

```json
{
  "executionGate": {
    "status": "closed",
    "dispatch": false,
    "optIn": {
      "env": "PENPOT_RENDER_THUMBNAIL_EXECUTION",
      "expectedValue": "renderer-service"
    },
    "failureModes": [
      { "code": "renderer_service_execution_disabled" },
      { "code": "renderer_service_not_configured" },
      { "code": "renderer_service_integration_tests_missing" },
      { "code": "renderer_service_capability_missing" }
    ],
    "integrationTestPlan": {
      "status": "required-before-dispatch",
      "requiredBeforeDispatch": true
    }
  }
}
```

Successful response normalization expects one of these resource inputs:

```json
{
  "resource": {
    "resourceUri": "/assets/by-id/media-file-thumb-7",
    "downloadUri": "https://penpot.example.test/assets/by-id/media-file-thumb-7",
    "contentType": "image/png"
  }
}
```

If only `mediaId` is returned, callers derive `/assets/by-id/{mediaId}` and
then resolve `downloadUri` from the entry adapter `publicUri` or backend URI.
MCP never writes files; future CLI `--output` may download only after a
successful normalized result exists.

Future client request scaffold:

```json
{
  "clientRequest": {
    "status": "scaffolded",
    "dispatch": false,
    "method": "POST",
    "headers": {
      "x-penpot-command": "render.thumbnail",
      "x-penpot-renderer-operation": "thumbnail.render",
      "x-penpot-entrypoint": "mcp"
    },
    "authForwarding": {
      "mode": "caller-session",
      "headerNames": ["authorization", "cookie"],
      "tokenValuesIncluded": false
    }
  }
}
```

The renderer service owns:

- browser canvas or OffscreenCanvas setup
- Penpot render-wasm worker bridge setup
- frontend rasterizer-compatible fallback
- font and media asset loading for render fidelity
- PNG byte generation

The backend remains the authority for:

- caller permissions
- source file data
- thumbnail persistence
- cache ownership
- media resource ids and resource URIs

## Request Shape

Canonical service request:

```json
{
  "command": "render.thumbnail",
  "operation": "thumbnail.render",
  "adapter": "renderer-service",
  "target": {
    "kind": "file",
    "fileId": "uuid",
    "pageId": null,
    "objectId": null,
    "tag": null,
    "revn": 7
  },
  "artifact": {
    "format": "png",
    "mimeType": "image/png",
    "width": 252,
    "height": 168,
    "extension": ".png"
  },
  "cache": {
    "policy": "refresh",
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

The service must receive caller auth rather than privileged service-only write
credentials. MCP should forward MCP audit context; CLI should forward command
context. The fixture names these headers without requiring every transport to
use HTTP.

## File Targets

File thumbnail refresh uses:

- data command: `get-file-data-for-thumbnail`
- persist command: `create-file-thumbnail`
- cache scope: `file-thumbnail`
- cache key: `file:<fileId>:revn:<revn>`

`cachePolicy: "reuse"` may skip rendering only after the service proves the
current file revision already has a thumbnail resource. If the service cannot
prove freshness, it should refresh or return a structured unavailable error.

## Tagged Frame Targets

Tagged frame thumbnails use:

- object key: `fileId/pageId/objectId/tag`
- persist command: `create-file-object-thumbnail`
- cache scope: `file-object-thumbnail`
- cache key: `fileId/pageId/objectId/tag`

The API fixture names a future `get-file-frame-data-for-thumbnail` data
capability for explicit `pageId` and `objectId` targets. Current backend
`get-file-data-for-thumbnail` is file-thumbnail oriented and does not provide a
stable arbitrary-frame source-data request. This capability must exist before
tagged frame thumbnail execution can be registered.

`create-file-object-thumbnail` returns stored row/media metadata rather than
the same `{:uri, :id}` shape returned by `create-file-thumbnail`. The service or
backend must normalize that media id into `/assets/by-id/{mediaId}` before MCP
or CLI registration.

## Response Shape

Successful response:

```json
{
  "status": "ok",
  "command": "render.thumbnail",
  "adapter": "renderer-service",
  "artifact": {
    "format": "png",
    "mimeType": "image/png",
    "width": 252,
    "height": 168,
    "extension": ".png"
  },
  "cache": {
    "outcome": "refreshed",
    "scope": "file-thumbnail",
    "key": "file:<fileId>:revn:<revn>"
  },
  "resource": {
    "mediaId": "uuid",
    "resourceUri": "/assets/by-id/<mediaId>",
    "downloadUri": "https://penpot.example.test/assets/by-id/<mediaId>",
    "contentType": "image/png"
  },
  "renderer": {
    "runtime": "render-wasm-worker",
    "fallbackUsed": false
  }
}
```

MCP must return resource metadata only; it must not write files on the MCP
server filesystem. CLI should return the same metadata, and a future
`--output` flag may download the PNG resource locally.

## Registration Gates

Before `render.thumbnail` becomes executable:

- implement the thumbnail renderer service
- keep MCP `render.thumbnail` dry-run and `penpot-cli render thumbnail
  --dry-run` as request inspection paths until execution exists
- keep availability probes metadata-only until a real health endpoint and
  execution client are implemented
- add a file thumbnail cache probe for `reuse`
- add or expose explicit frame source-data loading for tagged frame targets
- normalize tagged frame media ids to resource URIs
- keep response normalization covered by fixtures before any network client is
  enabled
- keep `clientRequest.dispatch` false until an explicit execution gate and
  integration tests exist
- keep `executionGate.dispatch` false until opt-in env, endpoint config,
  service implementation, integration tests, target/cache capabilities, and
  runtime registration all exist
- keep `healthPreflight.dispatch`, `healthPreflight.networkProbe`, and
  `executionClientHarness.dispatch` false until the executable adapter boundary
  is explicitly implemented
- keep `dispatchAdapterBoundary.dispatch` false until opt-in configuration
  surfaces and executable adapter registration are implemented
- keep `optInConfiguration.dispatch` false and treat opt-in values as
  diagnostics-only until runtime dispatch is explicitly implemented
- keep `unavailableErrorTaxonomy.dispatch` false and expose stable
  unavailable/preflight/dispatch/resource codes in dry-run and unavailable
  responses before executable network paths exist
- keep `integrationFixtureHarness.dispatch`, `networkDispatch`, and
  `localFileWrites` false while using fixture cases to define the future
  integration suite required before executable renderer-service dispatch
- keep `dispatchRegistrationPreflight.dispatch`, `networkDispatch`, and
  `runtimeRegistration` false while using readiness checks to document the
  final gate before executable renderer-service registration
- keep `executableAdapterRegistrationScaffold.dispatch`, `networkDispatch`,
  `runtimeRegistration`, and `localFileWrites` false while exposing the no-op
  registration surface in MCP/CLI dry-run and unavailable responses
- keep `adapterRegistryManifest.dispatch`, `networkDispatch`,
  `runtimeRegistration`, and `localFileWrites` false while exposing future
  registry and entrypoint wiring as metadata only
- keep `enablementChecklist.dispatch`, `networkDispatch`,
  `runtimeRegistration`, and `localFileWrites` false while using it as the
  final metadata-only gate summary before implementation work
- extend MCP tests from dry-run/unavailable planning into auth forwarding,
  resource metadata, and renderer-service error responses
- add CLI smoke tests for dry-run, execution metadata, `--output`, and missing
  token behavior

`render-thumbnail-renderer-service-fixtures.json` is the canonical fixture
matrix for the API shape.
