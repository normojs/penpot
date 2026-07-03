# Render Thumbnail Runtime Boundary

Status: P25.6 audit complete; runtime registration remains blocked.

`render.thumbnail` has a descriptor-only target/cache/artifact contract, but it
still needs an executable owner before MCP or CLI can render thumbnail PNG
bytes. This document selects that future boundary and records why the existing
surfaces are not enough by themselves.

## Decision

The future executable owner should be a dedicated thumbnail renderer service,
exposed later through a `renderer-service` style adapter after its API is
defined and tested.

P25.6 did not register MCP `render.thumbnail`, add a CLI `render thumbnail`
command, or add a new command-runtime adapter. P25.8 later adds the CLI
dry-run/client planning adapter, P25.9 adds the MCP planning-only dry-run tool,
P25.10 adds metadata-only availability probes, P25.11 defines response and
error normalization contracts, P25.12 adds disabled client request scaffolding,
P25.13 adds the closed execution gate plus integration-test plan, and P25.14
adds disabled health preflight plus executable client harness plans. P25.15
adds the disabled dispatch adapter boundary, and P25.16 adds opt-in
configuration surfaces. P25.17 adds the unavailable error taxonomy, P25.18
adds the integration fixture harness, P25.19 adds dispatch registration
preflight, P25.20 adds the disabled executable adapter registration scaffold,
P25.21 adds the disabled adapter registry manifest, P25.22 adds the final
disabled enablement checklist, P25.23 audits the first concrete implementation
slice, P25.24 defines the health/no-op contract fixtures, and P25.25 defines
the no-op service host scaffold. P25.26 defines host lifecycle test fixtures,
P25.27 defines package manifest scaffold metadata, P25.28 defines package
creation guardrails, P25.29 defines package file templates, and P25.30 defines
package workspace wiring. P25.31 defines package build verification; runtime
execution remains blocked. P25.32 defines package materialization checklist
metadata without creating files. P25.33 defines package creation dry-run
summary metadata without writing files.

## Existing Surfaces

Backend thumbnail RPCs already own the persistence and permission boundary:

- `get-file-data-for-thumbnail` loads reduced file/page data and checks read
  permission.
- `create-file-thumbnail` stores dashboard file thumbnail media for a file
  revision. It currently allows callers with read permission.
- `create-file-object-thumbnail` stores tagged frame/object thumbnails under
  `fileId/pageId/objectId/tag` and requires edition permission.
- `get-file-object-thumbnails` reads tagged frame/object thumbnail media ids.

The frontend owns the browser rendering implementation:

- The dashboard worker renders file thumbnails using the Penpot
  render-wasm/OffscreenCanvas path when available.
- The legacy/fallback path uses frontend SVG rendering and rasterization.
- Workspace tagged frame thumbnails depend on current editor state and the
  browser rasterizer path.

The exporter owns Playwright-based preview/export rendering, but it does not
currently implement dashboard thumbnail cache semantics or the backend
thumbnail persistence flow.

## Boundary Audit

| Option | Decision | Reason |
| --- | --- | --- |
| MCP Node process renders directly | Rejected | The MCP server lacks the ClojureScript render-wasm worker bridge, browser canvas/OffscreenCanvas, rasterizer iframe, fonts, and media loading environment needed for faithful PNG bytes. |
| Frontend worker bridge | Deferred | It has the right rendering code, but it is tied to an active browser/frontend session and does not satisfy global background MCP or CLI execution. |
| Exporter-compatible service | Deferred | Playwright could host rendering, but current exporter handlers are export/preview oriented and do not own thumbnail data loading, cache policy, or persistence. |
| Backend thumbnail cache wrapper | Insufficient | Backend can authorize, fetch data, and persist uploaded blobs; it does not render PNG bytes. |
| Dedicated thumbnail renderer service | Selected | A service can host browser/WASM/rasterizer runtime, call or receive backend thumbnail data, persist via existing RPCs, and normalize resource metadata for MCP and CLI. |

## Future Runtime Contract

The renderer service should execute the same high-level flow for both MCP and
CLI:

1. Authenticate with the caller session or token.
2. Call `get-file-data-for-thumbnail` for file thumbnail source data.
3. Render a PNG using a browser/WASM/rasterizer-compatible runtime.
4. Persist the PNG through `create-file-thumbnail` for file targets or
   `create-file-object-thumbnail` for tagged frame targets.
5. Return artifact metadata, cache metadata, and resource metadata.

The service must not bypass backend permission checks or write directly to
storage with elevated credentials. Backend RPC remains the authority for file
access, persistence, and cache ownership.

## Resource Return

MCP should return resource metadata only. It must not write thumbnail files to
the MCP server filesystem.

The future MCP response should include:

- PNG artifact metadata: format, MIME type, width, height, and extension.
- Cache metadata: policy, scope, key, and whether the response reused or
  refreshed persisted media.
- `resourceUri` and `downloadUri` when the backend/service can expose a
  downloadable persisted resource.
- The selected adapter and renderer-service diagnostics.

CLI should return the same resource metadata. A future `--output` option may
download the PNG locally, mirroring the split already used by `export.file`:
MCP reports resources, while CLI may write files on explicit request.

File thumbnails can use the `create-file-thumbnail` `{:uri, :id}` response as
the resource source. Tagged frame thumbnails are not ready for registration
until the service or backend normalizes the `create-file-object-thumbnail`
result into equivalent downloadable resource metadata.

## Cache Refresh

`cachePolicy: "reuse"` may return an existing resource only when the runtime can
prove the cache key is current:

- File thumbnail key: `file:<fileId>:revn:<revn>`.
- Tagged frame thumbnail key: `fileId/pageId/objectId/tag`.

`cachePolicy: "refresh"` must render a fresh PNG and persist it through the
target-specific backend command before returning resource metadata.

If freshness cannot be proven, the runtime should either refresh or return a
structured unavailable/unsupported error. It should not silently return stale
media.

## Auth

- Source data reads use `get-file-data-for-thumbnail` and backend read
  permission checks.
- Dashboard file thumbnail persistence uses `create-file-thumbnail`, which
  currently accepts read permission for thumbnail updates.
- Tagged frame thumbnail persistence uses `create-file-object-thumbnail` and
  requires edition permission.
- Renderer-service requests must carry caller auth and audit context.

## Test Strategy

Before `render.thumbnail` becomes executable:

- Keep command-runtime tests proving the descriptor has no adapters and no CLI
  command.
- Add service API fixture tests for file targets, tagged frame targets, cache
  reuse, cache refresh, PNG dimensions, and resource normalization.
- Add MCP tests only after registration, covering auth propagation, adapter
  rejection, refresh/reuse behavior, resource metadata, and missing resource
  errors.
- Add CLI smoke tests only after the service exists, covering dry-run,
  resource metadata, `--output` download, and missing-token errors.

`render-thumbnail-runtime-boundary-fixtures.json` is the canonical machine
readable audit fixture for this decision.

P25.7 added `render-thumbnail-renderer-service-api.md` and
`render-thumbnail-renderer-service-fixtures.json` as the service-facing API
contract for future implementation. P25.8 adds the CLI dry-run/client
boundary, P25.9 adds the MCP planning-only dry-run boundary, P25.10 adds client
configuration plus metadata-only availability status, P25.11 defines
response/error normalization, P25.12 adds the disabled future client request
scaffold, P25.13 adds the closed execution gate, and P25.14 adds disabled
health preflight plus executable client harness plans. P25.15 adds the disabled
dispatch adapter boundary, P25.16 adds opt-in configuration surfaces, and
P25.17 adds stable unavailable/preflight/dispatch/resource error taxonomy
metadata. P25.18 adds fixture harness metadata for closed gate, health failure,
render success, service failure, MCP metadata, CLI output gating, and token-safe
auth cases. P25.19 adds dispatch registration preflight metadata for the final
readiness checks before executable runtime registration, P25.20 adds the
no-op executable adapter registration scaffold behind that preflight, P25.21
adds the metadata-only adapter registry manifest, P25.22 adds the final
metadata-only enablement checklist, P25.23 adds the metadata-only
implementation slice audit, P25.24 adds the metadata-only health/no-op
contract fixtures, and P25.25 adds the metadata-only no-op service host
scaffold. P25.26 adds metadata-only host lifecycle test fixtures, P25.27 adds
metadata-only package manifest scaffold fields, P25.28 adds metadata-only
package creation guardrails, P25.29 adds metadata-only package file templates,
P25.30 adds metadata-only package workspace wiring, and P25.31 adds
metadata-only package build verification. P25.32 adds metadata-only package
materialization checklist. P25.33 adds metadata-only package creation dry-run
summary. MCP
`render.thumbnail` and `penpot-cli render thumbnail --dry-run` can print the
future request shape, configured/not configured service metadata,
response/error contracts, `clientRequest.dispatch:false`,
`executionGate.dispatch:false`, `healthPreflight.dispatch:false`,
`executionClientHarness.dispatch:false`, `dispatchAdapterBoundary.dispatch:false`,
`optInConfiguration.dispatch:false`, and `unavailableErrorTaxonomy.dispatch:false`,
plus `integrationFixtureHarness.dispatch:false` and `networkDispatch:false`,
`dispatchRegistrationPreflight.runtimeRegistration:false`, and
`executableAdapterRegistrationScaffold.runtimeRegistration:false`, plus
`adapterRegistryManifest.runtimeRegistration:false` and
`enablementChecklist.runtimeRegistration:false`, plus
`implementationSliceAudit.runtimeRegistration:false` and
`healthNoopContractFixtures.runtimeRegistration:false`, plus
`noopServiceHostScaffold.runtimeRegistration:false` and
`noopServiceHostScaffold.hostStartup:false`, plus
`hostLifecycleTestFixtures.processSpawn:false`,
`packageManifestScaffold.packageCreated:false`,
`packageManifestScaffold.workspaceMutation:false`, and
`packageManifestScaffold.scriptRunnable:false`,
plus `packageCreationGuardrails.packageCreated:false`,
`packageCreationGuardrails.workspaceMutation:false`,
`packageCreationGuardrails.scriptRunnable:false`,
`packageCreationGuardrails.hostStartup:false`, and
`packageCreationGuardrails.processSpawn:false`,
plus `packageFileTemplates.fileMaterialization:false`,
`packageFileTemplates.packageCreated:false`,
`packageFileTemplates.workspaceMutation:false`, and
`packageFileTemplates.scriptRunnable:false`,
plus `packageWorkspaceWiring.pnpmWorkspaceMutation:false`,
`packageWorkspaceWiring.rootPackageJsonMutation:false`,
`packageWorkspaceWiring.lockfileMutation:false`,
`packageWorkspaceWiring.workspaceMutation:false`,
`packageWorkspaceWiring.packageCreated:false`,
`packageWorkspaceWiring.scriptRunnable:false`, and
`packageWorkspaceWiring.fileMaterialization:false`,
plus `packageBuildVerification.commandExecution:false`,
`packageBuildVerification.buildOutput:false`,
`packageBuildVerification.packageScriptsRunnable:false`,
`packageBuildVerification.processSpawn:false`, and
`packageBuildVerification.runtimeRegistration:false`,
plus `packageMaterializationChecklist.materializationApproved:false`,
`packageMaterializationChecklist.fileMaterialization:false`,
`packageMaterializationChecklist.workspaceMutation:false`,
`packageMaterializationChecklist.lockfileMutation:false`, and
`packageMaterializationChecklist.runtimeRegistration:false`,
plus `packageCreationDryRunSummary.dryRunOnly:true`,
`packageCreationDryRunSummary.filesWritten:false`,
`packageCreationDryRunSummary.fileMaterialization:false`,
`packageCreationDryRunSummary.workspaceMutation:false`, and
`packageCreationDryRunSummary.runtimeRegistration:false`,
but execution still returns
`renderer_service_unavailable` until explicit opt-in, config surfaces, renderer
service, integration tests, health preflight, file cache probe, tagged-frame
source-data provider, and tagged-frame resource normalizer exist.
