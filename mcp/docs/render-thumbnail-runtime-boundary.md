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
summary metadata without writing files. P25.34 defines package creation file
manifest metadata without materializing files. P25.35 defines package
materialization approval gate metadata without granting approval. P25.36
defines package materialization execution dry-run metadata without executing
writes. P25.37 defines package materialization write contract metadata without
performing writes. P25.38 defines package materialization rollback contract
metadata without executing rollback. P25.39 defines package materialization
verification manifest metadata without running verification. P25.40 defines
package materialization final approval checklist metadata without granting
approval. P25.41 defines package materialization explicit approval token
metadata without accepting, storing, validating, consuming, or granting
approval from a token. P25.42 defines package materialization approval audit
trail metadata without writing, persisting, validating, or exporting audit
records. P25.43 defines package materialization approval replay guard metadata
without executing replay checks, storing nonce/scope hash state, consuming
tokens, or granting approval. P25.44 defines package materialization approval
expiry policy metadata without executing expiry checks, reading or trusting
wall-clock time, validating tokens, accepting tokens, consuming tokens, or
granting approval. P25.45 defines package materialization approval revocation
policy metadata without executing revocation checks, fetching revocation
registries, reading or trusting revocation state, validating tokens, accepting
tokens, consuming tokens, or granting approval. P25.46 defines package
materialization approval scope binding policy metadata without computing
approval scope hashes, reading file snapshots, hashing workspace/package files,
validating tokens, accepting tokens, consuming tokens, or granting approval.
P25.47 defines package materialization approval operator confirmation policy
metadata without prompting operators, collecting/storing/validating
confirmations, verifying identity, issuing confirmation tokens,
accepting/validating tokens, consuming tokens, or granting approval.
P25.48 defines package materialization approval emergency stop policy metadata
without configuring or fetching stop registries, reading or trusting stop
state, accepting stop overrides, accepting/validating tokens, consuming tokens,
or granting approval.
P25.49 defines package materialization approval readiness verdict policy
metadata without computing, storing, or trusting verdicts, validating readiness
inputs, evaluating blockers, accepting/validating tokens, consuming tokens, or
granting approval.
P25.50 defines package materialization approval execution handoff policy
metadata without preparing, validating, storing, or queuing handoffs, creating
or dispatching execution jobs, selecting execution owners,
accepting/validating tokens, consuming tokens, or granting approval.
P25.51 defines package materialization approval post-handoff audit policy
metadata without preparing, validating, storing, publishing, exporting, or
writing audit records, capturing handoff or execution job snapshots, selecting
audit sinks, accepting/validating tokens, consuming tokens, or granting
approval. P25.52 defines package materialization approval audit retention
policy metadata without selecting retention policies, computing retention
windows, trusting clocks, storing retention records, updating indexes, archiving,
purging, exporting, writing audit records, or granting approval. P25.53 defines
package materialization approval audit access policy metadata without selecting
access policies, identifying subjects, computing scopes, granting access,
reading audit records, exporting audit records, or issuing access tokens.
P25.54 defines package materialization approval audit integrity policy metadata
without hashing, signing, linking, verifying, or tamper-checking audit records.
P25.55 defines package materialization approval audit provenance policy metadata
without collecting sources, computing graphs, creating provenance records, or
linking provenance. P25.56 defines package materialization approval audit
custody policy metadata without preparing transfers, taking/releasing custody,
creating custody records, or linking custody. P25.57 defines package
materialization approval audit evidence policy metadata without collecting,
validating, normalizing, or storing evidence. P25.58 defines package
materialization approval audit attestation policy metadata without selecting
attestation policies, creating attestations, storing attestation bundles, or
attesting evidence records. P25.59 defines package materialization approval
audit notarization policy metadata without selecting notarization policies,
creating notarizations, storing notarization records, or notarizing
attestations. P25.60 defines package materialization approval audit
certification policy metadata without selecting certification policies,
creating certifications, storing certification records, or certifying
notarizations. P25.61 defines package materialization approval audit
endorsement policy metadata without selecting endorsement policies, creating
endorsements, storing endorsement records, or endorsing certifications.
P25.62 defines package materialization approval audit countersignature policy
metadata without selecting countersignature policies, creating
countersignatures, storing countersignature records, or countersigning
endorsements.
P25.63 defines package materialization approval audit countersignature
verification policy metadata without selecting verification policies, reading
countersignatures or audit records, verifying signatures, computing hashes, or
storing verification results.
P25.64 defines package materialization approval audit countersignature
revocation policy metadata without selecting revocation policies, reading audit
records, revoking countersignatures, storing revocation records, or enabling
dispatch.
P25.65 defines package materialization approval audit countersignature
revocation appeal policy metadata without selecting appeal policies, reading
revocations or audit records, appealing revocations, storing appeal records, or
enabling dispatch.
P25.66 defines package materialization approval audit countersignature
revocation appeal resolution policy metadata without selecting resolution
policies, reading appeal or audit records, resolving appeals, storing
resolution records, or enabling dispatch.
P25.67 defines package materialization approval audit countersignature
revocation appeal resolution enforcement policy metadata without selecting
enforcement policies, reading resolution or audit records, enforcing
resolutions, storing enforcement records, or enabling dispatch.
P25.68 defines package materialization approval audit countersignature
revocation appeal resolution enforcement evidence policy metadata without
selecting evidence policies, identifying evidence sources, collecting evidence,
reading enforcement or audit records, storing evidence records, or enabling
dispatch.
P25.69 defines package materialization approval audit countersignature
revocation appeal resolution enforcement evidence attestation policy metadata
without selecting attestation policies, reading evidence or audit records,
attesting evidence, storing attestation records, or enabling dispatch.
P25.70 defines package materialization approval audit countersignature
revocation appeal resolution enforcement evidence attestation notarization
policy metadata without selecting notarization policies, reading attestations
or audit records, notarizing attestations, storing notarization records, or
enabling dispatch.
P25.71 defines package materialization approval audit countersignature
revocation appeal resolution enforcement evidence attestation notarization
certification policy metadata without selecting certification policies, reading
notarizations or audit records, certifying notarizations, storing
certification records, or enabling dispatch.
P25.72 defines package materialization approval audit countersignature
revocation appeal resolution enforcement evidence attestation notarization
certification endorsement policy metadata without selecting endorsement
policies, reading certifications or audit records, endorsing certifications,
storing endorsement records, or enabling dispatch.
P25.73 defines package materialization approval audit countersignature
revocation appeal resolution enforcement evidence attestation notarization
certification endorsement countersignature policy metadata without selecting
countersignature policies, reading endorsements or audit records,
countersigning endorsements, storing countersignature records, or enabling
dispatch.
P25.74 defines package materialization approval audit countersignature
revocation appeal resolution enforcement evidence attestation notarization
certification endorsement countersignature verification policy metadata without
reading countersignatures or audit records, parsing payloads, verifying
signatures, matching hashes, storing verification results, or enabling dispatch.
P25.75 defines package materialization approval audit countersignature
revocation appeal resolution enforcement evidence attestation notarization
certification endorsement countersignature verification revocation policy
metadata without selecting revocation policies, revoking verification records,
creating revocation records, reading countersignatures or audit records, or
enabling dispatch.
P25.76 defines package materialization approval audit countersignature
revocation appeal resolution enforcement evidence attestation notarization
certification endorsement countersignature verification revocation appeal policy
metadata without selecting appeal policies, filing appeals, granting or denying
appeals, creating appeal records, reading countersignatures or audit records, or
enabling dispatch.
P25.77 defines package materialization approval audit countersignature
revocation appeal resolution enforcement evidence attestation notarization
certification endorsement countersignature verification revocation appeal
resolution policy metadata without selecting resolution policies, reading
appeals or audit records, resolving appeals, storing resolution records, or
enabling dispatch.
P25.78 defines package materialization approval audit countersignature
revocation appeal resolution enforcement evidence attestation notarization
certification endorsement countersignature verification revocation appeal
resolution enforcement policy metadata without selecting enforcement policies,
reading resolutions or audit records, enforcing resolutions, storing
enforcement records, or enabling dispatch.
P25.79 defines package materialization approval audit countersignature
revocation appeal resolution enforcement evidence attestation notarization
certification endorsement countersignature verification revocation appeal
resolution enforcement evidence policy metadata without selecting evidence
policies, identifying evidence subjects or sources, collecting evidence,
reading enforcement, resolution, appeal, revocation, countersignature, or audit
records, storing evidence records or bundles, or enabling dispatch.
P25.80 defines package materialization approval audit countersignature
revocation appeal resolution enforcement evidence attestation notarization
certification endorsement countersignature verification revocation appeal
resolution enforcement evidence attestation policy metadata without selecting
attestation policies, identifying attestation subjects or authorities, creating
or storing attestations or attestation bundles, reading, attesting, or verifying
evidence records, reading evidence bundles, reading enforcement, resolution,
appeal, revocation, countersignature, or audit records, or enabling dispatch.
P25.81 defines package materialization approval audit countersignature
revocation appeal resolution enforcement evidence attestation notarization
certification endorsement countersignature verification revocation appeal
resolution enforcement evidence attestation notarization policy metadata
without selecting notarization policies, identifying notarization subjects or
authorities, creating or storing notarizations or notarization records,
reading, notarizing, or verifying attestations, reading evidence, enforcement,
resolution, appeal, revocation, countersignature, or audit records, or enabling
dispatch.
P25.82 defines package materialization approval audit countersignature
revocation appeal resolution enforcement evidence attestation notarization
certification endorsement countersignature verification revocation appeal
resolution enforcement evidence attestation notarization certification policy
metadata without selecting certification policies, identifying certification
subjects or authorities, creating or storing certifications or certification
records, reading, certifying, or verifying notarizations, reading, notarizing,
or verifying attestations, reading evidence, enforcement, resolution, appeal,
revocation, countersignature, or audit records, or enabling dispatch.
P25.83 defines package materialization approval audit countersignature
revocation appeal resolution enforcement evidence attestation notarization
certification endorsement countersignature verification revocation appeal
resolution enforcement evidence attestation notarization certification
endorsement policy metadata without selecting endorsement policies, identifying
endorsement subjects or authorities, creating or storing endorsements or
endorsement records, reading, endorsing, or verifying certifications, reading
lower audit-chain records, or enabling dispatch.
P25.84 defines package materialization approval audit countersignature
revocation appeal resolution enforcement evidence attestation notarization
certification endorsement countersignature verification revocation appeal
resolution enforcement evidence attestation notarization certification
endorsement countersignature policy metadata without selecting countersignature
policies, identifying countersignature subjects or authorities, creating or
storing countersignatures or countersignature records, reading, countersigning,
or verifying endorsements, reading audit records, or enabling dispatch.
P25.85 defines package materialization approval audit countersignature
revocation appeal resolution enforcement evidence attestation notarization
certification endorsement countersignature verification revocation appeal
resolution enforcement evidence attestation notarization certification
endorsement countersignature verification policy metadata without selecting
verification policies, identifying subjects or authorities, reading
countersignatures or audit records, parsing payloads, verifying signatures,
computing hashes, storing verification results, or enabling dispatch.
P25.86 defines package materialization approval audit countersignature
revocation appeal resolution enforcement evidence attestation notarization
certification endorsement countersignature verification revocation appeal
resolution enforcement evidence attestation notarization certification
endorsement countersignature verification revocation policy metadata without
selecting revocation policies, revoking verification records, creating
revocation records, reading countersignatures or audit records, materializing
files, starting processes, or enabling dispatch.
P25.87 defines package materialization approval audit countersignature
revocation appeal resolution enforcement evidence attestation notarization
certification endorsement countersignature verification revocation appeal
resolution enforcement evidence attestation notarization certification
endorsement countersignature verification revocation appeal policy metadata
without selecting appeal policies, identifying appeal subjects or authorities,
capturing appeal reasons, preparing appeal requests, creating appeal records,
reading revocations or audit records, materializing files, starting processes,
or enabling dispatch.

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

File thumbnails use the `create-file-thumbnail` `{:uri, :id}` response as the
resource source. Tagged frame thumbnails use the matching
`create-file-object-thumbnail` response and normalize its media id/URI into
the same downloadable resource metadata shape.

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

## Backend RPC Client Plan

P26.5 adds a renderer-service `backendRpcClient` response field as an execution
guardrail for the future backend integration. The service may be configured with
a backend base URI, then derives Penpot RPC endpoints using the existing
`api/main/methods/<command>?_fmt=json` convention for the validated source-data
and persistence commands. The field also echoes caller-session auth presence
without credential values.

P26.5 initially exposed this as non-executing metadata. Current renderer-service
requests may execute supported cache probing, source-data reads, runtime
adapter rendering, and backend persistence only through the separately gated
slices below; disabled or inapplicable stages still keep their dispatch and
value exposure flags false.

P26.6 extends each planned backend RPC entry with a disabled request envelope.
The envelope fixes the Penpot RPC JSON transport, HTTP method, canonical request
keys, GET query keys, and POST JSON body keys while keeping
`requestValuesIncluded:false`, `mediaValuesIncluded:false`,
`tokenValuesIncluded:false`, and `dispatch:false`. This prepares request
construction for a later execution slice without exposing backend request
values or enabling network dispatch.

P26.7 adds an ordered pipeline plan to the same response. Reuse requests plan a
`cache-probe` stage followed by `source-data-read`, `render`, and
`thumbnail-persist` stages that run only on cache miss; refresh requests plan
source-data, render, and persist stages unconditionally. Stages that are not
executed for a request keep their execution flags false, and all
value-redaction flags remain false even when the file-target pipeline reaches
P26.15 persistence.

P26.8 exposes this backend URI boundary through manual host configuration.
`PENPOT_RENDERER_SERVICE_BACKEND_URI`, with `PENPOT_BACKEND_URI` as a fallback,
sets the backend RPC base URI used to derive endpoint metadata. Invalid
non-HTTP(S) values fail before the host starts. The environment setting alone
does not enable rendering or persistence; file-target execution also requires
the request path, cache/source-data preconditions, and a configured runtime
adapter where rendering is needed.

P26.9 adds a disabled cache-probe plan to reuse renderer-service responses.
The plan records the future cache lookup strategy, canonical request keys,
cache scope/key, cache-hit result shape, and cache-miss continuation behavior
while keeping `cacheRead:false`, `networkDispatch:false`, `dispatch:false`,
and cache-hit/resource/media/token value flags false. Refresh responses keep
`backendRpcClient.cacheProbe:null`. This makes cache-reuse semantics explicit
without implementing cache reads or cached resource returns.

P26.10 through P26.18 progressively execute the backend/render pipeline while
preserving the same redaction boundary. Configured file reuse requests can
probe `get-file-thumbnail`; file refresh requests and cache misses can read
`get-file-data-for-thumbnail`; tagged-frame refresh requests can read
`get-file-frame-data-for-thumbnail`; tagged-frame reuse requests can probe
`get-file-object-thumbnail`; injected or manually registered runtime adapters
can render PNG bytes; and successful file-target or tagged-frame cache-miss
renders can persist through backend `create-file-thumbnail` or
`create-file-object-thumbnail`, both using multipart `media` uploads. The
service returns cached or persisted backend resource metadata with token-safe
execution summaries, but bundled real scene rendering, local file writes,
source-data/page/media value exposure, and credential value exposure remain out
of scope.

P26.19 selects the future bundled scene-rendering bridge: a renderer-service
owned browser-backed adapter module that loads packaged frontend thumbnail
worker, render-wasm, and rasterizer fallback assets without requiring an active
editor tab. Direct Node render-wasm execution remains rejected for the first
bridge because the current WebGL/Emscripten integration depends on browser
canvas APIs and frontend globals.
P26.20 materializes the bridge asset manifest scaffold itself: the service now
records the expected frontend worker, render-wasm loader/binary, rasterizer
fallback assets, cache output paths, and validation metadata while keeping
browser startup, runtime execution, asset materialization, local file writes,
and runtime registration disabled.
P26.21 adds the materialization preflight boundary for that manifest. It
records future existence, cache-output, and SHA-256 readiness checks plus
failure codes, but it still reports `not-checked` and keeps file reads, hash
computation, browser startup, adapter imports, local writes, and runtime
registration disabled.
P26.22 exercises the next preflight slice behind an explicit renderer-service
option. The service can report `ready` or `degraded` by checking public asset
paths, cache asset paths, cache-output writability, byte length, and SHA-256
hashes, using only stat/read operations against configured absolute workspace
and cache roots. Browser-backed materialization remains blocked: no browser is
started, no runtime adapter is imported or loaded, no assets are copied, no
network dispatch occurs, no local files are written, no runtime is registered,
and no source-data/page/artifact/media/token values are returned.
P26.23 exposes only a redacted summary of that preflight through CLI/MCP health
preflight results. The summary includes readiness, counts, ready/missing ids,
side-effect flags, and redaction flags, while omitting configured roots,
public/cache paths, SHA-256 values, token values, and source-data/page/artifact/
media values. CLI/MCP do not perform their own filesystem reads or hashes.
P26.24 adds the explicit manual-host configuration surface for enabling that
read-only preflight. Operators set
`PENPOT_RENDERER_SERVICE_RUNTIME_ASSET_PREFLIGHT=read-only` plus an absolute
workspace root and optional absolute cache root; lifecycle commands only report
the configuration and manual command, while the running renderer-service host
owns the actual read-only checks.
P26.25 keeps the same boundary but adds stable degraded and invalid diagnostic
codes plus redacted next actions for missing public assets, missing cache
copies, unavailable cache outputs, hash failures, and invalid operator
configuration. CLI/MCP still only consume the renderer-service `/health`
response and never expose workspace/cache roots or filesystem paths.
P26.26 adds a metadata-only materialization dry-run on the same
renderer-service-owned boundary. `/health` and `/thumbnail` now report
source-preflight state, copy/cache-output plan counts, side-effect flags, and
an approval-required gate derived from P26.25 diagnostics. Approval stays
closed and writes stay disabled: no assets are copied, no browser is started,
no runtime adapter is imported or loaded, no backend/source-data reads or
network dispatch occur, no runtime execution is registered, and CLI/MCP
summaries still omit roots, paths, hashes, tokens, source data, page data,
artifacts, and media values.

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
summary. P25.34 adds metadata-only package creation file manifest. P25.35 adds
metadata-only package materialization approval gate. P25.36 adds metadata-only
package materialization execution dry-run. P25.37 adds metadata-only package
materialization write contract. P25.38 adds metadata-only package
materialization rollback contract. P25.39 adds metadata-only package
materialization verification manifest. P25.40 adds metadata-only package
materialization final approval checklist. P25.41 adds metadata-only package
materialization explicit approval token. P25.42 adds metadata-only package
materialization approval audit trail. P25.43 adds metadata-only package
materialization approval replay guard. P25.44 adds metadata-only package
materialization approval expiry policy. P25.45 adds metadata-only package
materialization approval revocation policy. P25.46 adds metadata-only package
materialization approval scope binding policy. P25.47 adds metadata-only
package materialization approval operator confirmation policy. P25.48 adds
metadata-only package materialization approval emergency stop policy. P25.49
adds metadata-only package materialization approval readiness verdict policy.
P25.50 adds metadata-only package materialization approval execution handoff
policy.
P25.51 adds metadata-only package materialization approval post-handoff audit
policy.
P25.52 adds metadata-only package materialization approval audit retention
policy.
P25.53 adds metadata-only package materialization approval audit access
policy.
P25.54 adds metadata-only package materialization approval audit integrity
policy.
P25.55 adds metadata-only package materialization approval audit provenance
policy.
P25.56 adds metadata-only package materialization approval audit custody
policy.
P25.57 adds metadata-only package materialization approval audit evidence
policy.
P25.58 adds metadata-only package materialization approval audit attestation
policy.
P25.59 adds metadata-only package materialization approval audit notarization
policy.
P25.60 adds metadata-only package materialization approval audit certification
policy.
P25.61 adds metadata-only package materialization approval audit endorsement
policy.
P25.62 adds metadata-only package materialization approval audit
countersignature policy.
P25.63 adds metadata-only package materialization approval audit
countersignature verification policy.
P25.64 adds metadata-only package materialization approval audit
countersignature revocation policy.
MCP
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
plus `packageCreationFileManifest.dryRunOnly:true`,
`packageCreationFileManifest.filesWritten:false`,
`packageCreationFileManifest.fileMaterialization:false`,
`packageCreationFileManifest.workspaceMutation:false`, and
`packageCreationFileManifest.runtimeRegistration:false`,
plus `packageMaterializationApprovalGate.approvalRequired:true`,
`packageMaterializationApprovalGate.approved:false`,
`packageMaterializationApprovalGate.filesWritten:false`,
`packageMaterializationApprovalGate.fileMaterialization:false`,
`packageMaterializationApprovalGate.workspaceMutation:false`, and
`packageMaterializationApprovalGate.runtimeRegistration:false`,
plus `packageMaterializationExecutionDryRun.executeNow:false`,
`packageMaterializationExecutionDryRun.approved:false`,
`packageMaterializationExecutionDryRun.filesWritten:false`,
`packageMaterializationExecutionDryRun.fileMaterialization:false`,
`packageMaterializationExecutionDryRun.workspaceMutation:false`, and
`packageMaterializationExecutionDryRun.runtimeRegistration:false`,
plus `packageMaterializationWriteContract.executeNow:false`,
`packageMaterializationWriteContract.approved:false`,
`packageMaterializationWriteContract.filesWritten:false`,
`packageMaterializationWriteContract.fileMaterialization:false`,
`packageMaterializationWriteContract.workspaceMutation:false`, and
`packageMaterializationWriteContract.runtimeRegistration:false`,
plus `packageMaterializationRollbackContract.executeNow:false`,
`packageMaterializationRollbackContract.rollbackNow:false`,
`packageMaterializationRollbackContract.approved:false`,
`packageMaterializationRollbackContract.filesWritten:false`,
`packageMaterializationRollbackContract.rollbackExecuted:false`,
`packageMaterializationRollbackContract.fileMaterialization:false`,
`packageMaterializationRollbackContract.workspaceMutation:false`, and
`packageMaterializationRollbackContract.runtimeRegistration:false`,
plus `packageMaterializationVerificationManifest.executeNow:false`,
`packageMaterializationVerificationManifest.verifyNow:false`,
`packageMaterializationVerificationManifest.approved:false`,
`packageMaterializationVerificationManifest.filesWritten:false`,
`packageMaterializationVerificationManifest.verificationExecuted:false`,
`packageMaterializationVerificationManifest.fileMaterialization:false`,
`packageMaterializationVerificationManifest.workspaceMutation:false`, and
`packageMaterializationVerificationManifest.runtimeRegistration:false`,
plus `packageMaterializationFinalApprovalChecklist.finalApprovalGranted:false`,
`packageMaterializationFinalApprovalChecklist.executeNow:false`,
`packageMaterializationFinalApprovalChecklist.verifyNow:false`,
`packageMaterializationFinalApprovalChecklist.approved:false`,
`packageMaterializationFinalApprovalChecklist.filesWritten:false`,
`packageMaterializationFinalApprovalChecklist.fileMaterialization:false`,
`packageMaterializationFinalApprovalChecklist.workspaceMutation:false`, and
`packageMaterializationFinalApprovalChecklist.runtimeRegistration:false`,
plus `packageMaterializationApprovalAuditRetentionPolicy.retentionPolicySelected:false`,
`packageMaterializationApprovalAuditRetentionPolicy.retentionWindowComputed:false`,
`packageMaterializationApprovalAuditRetentionPolicy.retentionClockTrusted:false`,
`packageMaterializationApprovalAuditRetentionPolicy.retentionRecordStored:false`,
`packageMaterializationApprovalAuditRetentionPolicy.retentionIndexUpdated:false`,
`packageMaterializationApprovalAuditRetentionPolicy.archiveStored:false`,
`packageMaterializationApprovalAuditRetentionPolicy.purgeScheduled:false`,
`packageMaterializationApprovalAuditRetentionPolicy.purgeExecuted:false`,
`packageMaterializationApprovalAuditRetentionPolicy.exportWritten:false`,
`packageMaterializationApprovalAuditRetentionPolicy.auditRecordWritten:false`,
`packageMaterializationApprovalAuditRetentionPolicy.materializationApproved:false`,
`packageMaterializationApprovalAuditRetentionPolicy.filesWritten:false`,
`packageMaterializationApprovalAuditRetentionPolicy.commandExecution:false`, and
`packageMaterializationApprovalAuditRetentionPolicy.buildOutput:false`,
plus `packageMaterializationApprovalAuditAccessPolicy.accessPolicySelected:false`,
`packageMaterializationApprovalAuditAccessPolicy.accessSubjectIdentified:false`,
`packageMaterializationApprovalAuditAccessPolicy.accessScopeComputed:false`,
`packageMaterializationApprovalAuditAccessPolicy.accessScopeValidated:false`,
`packageMaterializationApprovalAuditAccessPolicy.accessDecisionStored:false`,
`packageMaterializationApprovalAuditAccessPolicy.accessGranted:false`,
`packageMaterializationApprovalAuditAccessPolicy.accessDenied:false`,
`packageMaterializationApprovalAuditAccessPolicy.auditRecordRead:false`,
`packageMaterializationApprovalAuditAccessPolicy.auditRecordQueried:false`,
`packageMaterializationApprovalAuditAccessPolicy.auditRecordExported:false`,
`packageMaterializationApprovalAuditAccessPolicy.accessTokenIssued:false`,
`packageMaterializationApprovalAuditAccessPolicy.materializationApproved:false`,
`packageMaterializationApprovalAuditAccessPolicy.filesWritten:false`,
`packageMaterializationApprovalAuditAccessPolicy.commandExecution:false`, and
`packageMaterializationApprovalAuditAccessPolicy.buildOutput:false`,
plus `packageMaterializationApprovalAuditIntegrityPolicy.integrityPolicySelected:false`,
`packageMaterializationApprovalAuditIntegrityPolicy.integrityHashComputed:false`,
`packageMaterializationApprovalAuditIntegrityPolicy.integrityHashVerified:false`,
`packageMaterializationApprovalAuditIntegrityPolicy.integritySignatureCreated:false`,
`packageMaterializationApprovalAuditIntegrityPolicy.integrityChainVerified:false`,
`packageMaterializationApprovalAuditIntegrityPolicy.auditRecordRead:false`,
`packageMaterializationApprovalAuditIntegrityPolicy.auditRecordHashed:false`,
`packageMaterializationApprovalAuditIntegrityPolicy.auditRecordVerified:false`,
`packageMaterializationApprovalAuditIntegrityPolicy.auditRecordTamperChecked:false`,
`packageMaterializationApprovalAuditIntegrityPolicy.materializationApproved:false`,
`packageMaterializationApprovalAuditIntegrityPolicy.filesWritten:false`,
`packageMaterializationApprovalAuditIntegrityPolicy.commandExecution:false`, and
`packageMaterializationApprovalAuditIntegrityPolicy.buildOutput:false`,
plus `packageMaterializationApprovalAuditProvenancePolicy.provenancePolicySelected:false`,
`packageMaterializationApprovalAuditProvenancePolicy.provenanceSourceCollected:false`,
`packageMaterializationApprovalAuditProvenancePolicy.provenanceSourceValidated:false`,
`packageMaterializationApprovalAuditProvenancePolicy.provenanceGraphComputed:false`,
`packageMaterializationApprovalAuditProvenancePolicy.provenanceGraphStored:false`,
`packageMaterializationApprovalAuditProvenancePolicy.provenanceRecordCreated:false`,
`packageMaterializationApprovalAuditProvenancePolicy.auditRecordRead:false`,
`packageMaterializationApprovalAuditProvenancePolicy.auditRecordQueried:false`,
`packageMaterializationApprovalAuditProvenancePolicy.provenanceHashComputed:false`,
`packageMaterializationApprovalAuditProvenancePolicy.materializationApproved:false`,
`packageMaterializationApprovalAuditProvenancePolicy.filesWritten:false`,
`packageMaterializationApprovalAuditProvenancePolicy.commandExecution:false`, and
`packageMaterializationApprovalAuditProvenancePolicy.buildOutput:false`,
plus `packageMaterializationApprovalAuditCustodyPolicy.custodyPolicySelected:false`,
`packageMaterializationApprovalAuditCustodyPolicy.custodyTransferPrepared:false`,
`packageMaterializationApprovalAuditCustodyPolicy.custodyTransferExecuted:false`,
`packageMaterializationApprovalAuditCustodyPolicy.custodyTaken:false`,
`packageMaterializationApprovalAuditCustodyPolicy.custodyReleased:false`,
`packageMaterializationApprovalAuditCustodyPolicy.custodyRecordCreated:false`,
`packageMaterializationApprovalAuditCustodyPolicy.auditRecordRead:false`,
`packageMaterializationApprovalAuditCustodyPolicy.auditRecordQueried:false`,
`packageMaterializationApprovalAuditCustodyPolicy.custodyHashComputed:false`,
`packageMaterializationApprovalAuditCustodyPolicy.materializationApproved:false`,
`packageMaterializationApprovalAuditCustodyPolicy.filesWritten:false`,
`packageMaterializationApprovalAuditCustodyPolicy.commandExecution:false`, and
`packageMaterializationApprovalAuditCustodyPolicy.buildOutput:false`,
plus `packageMaterializationApprovalAuditEvidencePolicy.evidencePolicySelected:false`,
`packageMaterializationApprovalAuditEvidencePolicy.evidenceCollected:false`,
`packageMaterializationApprovalAuditEvidencePolicy.evidenceValidated:false`,
`packageMaterializationApprovalAuditEvidencePolicy.evidenceNormalized:false`,
`packageMaterializationApprovalAuditEvidencePolicy.evidenceRecordCreated:false`,
`packageMaterializationApprovalAuditEvidencePolicy.evidenceBundleCreated:false`,
`packageMaterializationApprovalAuditEvidencePolicy.auditRecordRead:false`,
`packageMaterializationApprovalAuditEvidencePolicy.auditRecordQueried:false`,
`packageMaterializationApprovalAuditEvidencePolicy.evidenceHashComputed:false`,
`packageMaterializationApprovalAuditEvidencePolicy.materializationApproved:false`,
`packageMaterializationApprovalAuditEvidencePolicy.filesWritten:false`,
`packageMaterializationApprovalAuditEvidencePolicy.commandExecution:false`, and
`packageMaterializationApprovalAuditEvidencePolicy.buildOutput:false`,
plus `packageMaterializationApprovalAuditAttestationPolicy.attestationPolicySelected:false`,
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
`packageMaterializationApprovalAuditAttestationPolicy.evidenceRecordVerified:false`,
`packageMaterializationApprovalAuditAttestationPolicy.auditRecordRead:false`,
`packageMaterializationApprovalAuditAttestationPolicy.auditRecordQueried:false`,
`packageMaterializationApprovalAuditAttestationPolicy.attestationHashComputed:false`,
`packageMaterializationApprovalAuditAttestationPolicy.materializationApproved:false`,
`packageMaterializationApprovalAuditAttestationPolicy.filesWritten:false`,
`packageMaterializationApprovalAuditAttestationPolicy.commandExecution:false`, and
`packageMaterializationApprovalAuditAttestationPolicy.buildOutput:false`,
plus `packageMaterializationApprovalAuditNotarizationPolicy.notarizationPolicySelected:false`,
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
`packageMaterializationApprovalAuditNotarizationPolicy.attestationVerified:false`,
`packageMaterializationApprovalAuditNotarizationPolicy.auditRecordRead:false`,
`packageMaterializationApprovalAuditNotarizationPolicy.auditRecordQueried:false`,
`packageMaterializationApprovalAuditNotarizationPolicy.notarizationHashComputed:false`,
`packageMaterializationApprovalAuditNotarizationPolicy.materializationApproved:false`,
`packageMaterializationApprovalAuditNotarizationPolicy.filesWritten:false`,
`packageMaterializationApprovalAuditNotarizationPolicy.commandExecution:false`, and
`packageMaterializationApprovalAuditNotarizationPolicy.buildOutput:false`,
plus `packageMaterializationApprovalAuditCertificationPolicy.certificationPolicySelected:false`,
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
`packageMaterializationApprovalAuditCertificationPolicy.notarizationVerified:false`,
`packageMaterializationApprovalAuditCertificationPolicy.auditRecordRead:false`,
`packageMaterializationApprovalAuditCertificationPolicy.auditRecordQueried:false`,
`packageMaterializationApprovalAuditCertificationPolicy.certificationHashComputed:false`,
`packageMaterializationApprovalAuditCertificationPolicy.materializationApproved:false`,
`packageMaterializationApprovalAuditCertificationPolicy.filesWritten:false`,
`packageMaterializationApprovalAuditCertificationPolicy.commandExecution:false`, and
`packageMaterializationApprovalAuditCertificationPolicy.buildOutput:false`,
plus `packageMaterializationApprovalAuditEndorsementPolicy.endorsementPolicySelected:false`,
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
`packageMaterializationApprovalAuditEndorsementPolicy.certificationVerified:false`,
`packageMaterializationApprovalAuditEndorsementPolicy.auditRecordRead:false`,
`packageMaterializationApprovalAuditEndorsementPolicy.auditRecordQueried:false`,
`packageMaterializationApprovalAuditEndorsementPolicy.endorsementHashComputed:false`,
`packageMaterializationApprovalAuditEndorsementPolicy.materializationApproved:false`,
`packageMaterializationApprovalAuditEndorsementPolicy.filesWritten:false`,
`packageMaterializationApprovalAuditEndorsementPolicy.commandExecution:false`, and
`packageMaterializationApprovalAuditEndorsementPolicy.buildOutput:false`,
but execution still returns
`renderer_service_unavailable` until explicit opt-in, config surfaces, renderer
service, integration tests, health preflight, file cache probe, tagged-frame
cache probe, and renderer runtime bridge exist.
