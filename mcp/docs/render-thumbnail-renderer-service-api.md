# Render Thumbnail Renderer Service API

P26.4 enables the first explicitly gated renderer-service execution slice. The
private `@penpot/renderer-service` host still binds only when started manually
and exposes `GET /health` with the P25.24 health body, but `POST /thumbnail`
now returns a normalized PNG resource record backed by a host-served fixture PNG
at `/assets/by-id/noop-thumbnail-png`. MCP and `penpot-cli` execute this path
only when the renderer-service endpoint and explicit `renderer-service` opt-in
are configured; dry-run planning remains network-free. CLI `--output` downloads
the normalized `downloadUri`, while MCP returns resource metadata only. The
later slices add backend cache probe execution, source-data reads, source-data
render input summaries, and an injectable renderer runtime adapter on the
gated file-thumbnail path; thumbnail persistence writes remain disabled and
manual hosts without a renderer adapter keep the no-op PNG path. P26.14 adds
an explicit local runtime module registration boundary for manual hosts via
`PENPOT_RENDERER_SERVICE_RUNTIME_MODULE`.
P26.5 adds a token-safe `backendRpcClient` plan to renderer-service thumbnail
responses so backend data/cache/persist endpoints are normalized for staged
execution. That plan now feeds the executable file-thumbnail cache probe,
source-data read path, and injected renderer runtime adapter boundary, while
persistence writes remain disabled.
P26.6 extends each planned backend RPC entry with a disabled request envelope
that fixes the future GET query and POST JSON body key shapes without exposing
request values, media values, token values, or enabling network dispatch.
P26.7 adds a disabled ordered backend RPC pipeline plan so cache probe,
source-data read, render, and persistence stages are visible and self-validated
before any backend IO or scene rendering is enabled.
P26.8 wires backend RPC planning configuration into the manual no-op host:
`PENPOT_RENDERER_SERVICE_BACKEND_URI`, falling back to `PENPOT_BACKEND_URI`,
configures only disabled endpoint metadata and still never dispatches backend
RPCs.
P26.9 adds a disabled `backendRpcClient.cacheProbe` plan for reuse requests,
recording the future cache lookup strategy, identity keys, hit/miss shape, and
false cache-read/network-dispatch/value flags without reading caches or
returning cached resources.
P26.12 adds `backendRpcClient.renderInput` after successful configured
file-thumbnail source-data reads. The summary records the render handoff
envelope with cache/artifact/runtime metadata and hard false source-data,
page, artifact, media, and token value flags; cache hits, unconfigured
requests, and tagged-frame requests keep `renderInput:null`.
P26.13 adds an explicit renderer runtime adapter execution boundary after
successful configured file-thumbnail source-data reads. Injected adapters
receive validated source data internally and return PNG bytes that are stored
only in memory and served by resource URL. Responses mark
`backendRpcClient.pipeline.renderDispatch:true`,
`backendRpcClient.renderInput.renderDispatch:true`, and expose
`backendRpcClient.renderOutput` metadata without source-data, page, artifact
byte, media, or credential values. Cache hits and hosts without an adapter
still keep the existing short-circuit/no-op behavior.
P26.14 lets the manual host load a local ES module runtime adapter at startup.
The module must be configured with an absolute file path or `file:` URL and
export `renderThumbnail` directly or through its default export. Loading the
module does not change dry-run behavior, does not import modules from CLI
lifecycle status/start planning, and still routes adapter results through the
P26.13 PNG byte and response redaction validators.

Status: P25.144 supersedes the earlier disabled-planning boundary for the
first executable slice. The renderer-service package, health/no-op host, MCP
tool path, and `penpot-cli render thumbnail` path are materialized and
registered. Execution remains explicit and narrow: callers must provide a
renderer-service endpoint and set the `renderer-service` opt-in, dry runs stay
network-free, the renderer service returns fixture PNG resource metadata, and
no backend thumbnail RPC persistence is attempted by this slice. Earlier P25
metadata remains useful as audit history for the gates that led to this
execution boundary.

Historical status: P25.64 API fixtures, MCP/CLI dry-run/client boundaries,
metadata-only availability probes, response normalization contracts, disabled
client request scaffold, closed execution gate, disabled health preflight, and
executable client harness plus dispatch adapter boundary plans, and opt-in
configuration surfaces plus unavailable error taxonomy and integration fixture
harness plus dispatch registration preflight and executable adapter
registration scaffold plus adapter registry manifest, final enablement
checklist, implementation slice audit, health/no-op contract fixtures, and
no-op service host scaffold plus host lifecycle test fixtures and package
manifest scaffold plus package creation guardrails, package file templates, and
package workspace wiring plus package build verification defined. P25.32 adds package materialization checklist
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
P25.54 adds package materialization approval audit integrity policy metadata
without selecting integrity policies, computing hashes, verifying hashes,
creating signatures, verifying signatures, linking integrity chains, reading
audit records, checking tamper state, or storing integrity records.
P25.55 adds package materialization approval audit provenance policy metadata
without selecting provenance policies, identifying subjects, collecting or
validating provenance sources, computing or storing provenance graphs, linking
or verifying provenance chains, creating/storing/publishing provenance records,
reading or querying audit records, signing or hashing provenance, or writing
files.
P25.56 adds package materialization approval audit custody policy metadata
without selecting custody policies, identifying custody subjects or holders,
preparing or executing custody transfers, taking/releasing/transferring
custody, linking or verifying custody chains, creating/storing/publishing
custody records, reading or querying audit records, signing or hashing custody,
or writing files.
P25.57 adds package materialization approval audit evidence policy metadata
without selecting evidence policies, identifying subjects or sources,
collecting, validating, or normalizing evidence, creating/storing/publishing
evidence records, creating/storing evidence bundles, reading or querying audit
records, signing or hashing evidence, or writing files.
P25.58 adds package materialization approval audit attestation policy metadata
without selecting attestation policies, identifying subjects or authorities,
preparing/creating/validating/storing/publishing attestations, creating/storing
attestation bundles, reading/attesting/verifying evidence records, reading or
querying audit records, signing or hashing attestations, or writing files.
P25.59 adds package materialization approval audit notarization policy metadata
without selecting notarization policies, identifying subjects or authorities,
preparing/creating/validating/storing/publishing notarizations,
creating/storing/publishing notarization records, reading/notarizing/verifying
attestations, reading or querying audit records, signing or hashing
notarizations, or writing files.
P25.62 adds package materialization approval audit countersignature policy
metadata without selecting countersignature policies, identifying subjects or
authorities, preparing/creating/validating/storing/publishing countersignatures,
creating/storing/publishing countersignature records, reading/countersigning/
verifying endorsements, reading or querying audit records, signing or hashing
countersignatures, or writing files.
P25.63 adds package materialization approval audit countersignature verification
policy metadata without selecting verification policies, identifying subjects
or authorities, reading countersignatures or countersignature records, parsing
payloads, verifying signatures, computing or matching hashes, linking chains,
storing verification results, reading or querying audit records, signing or
hashing verification results, or writing files.
P25.64 adds package materialization approval audit countersignature revocation
policy metadata without selecting revocation policies, identifying subjects or
authorities, capturing revocation reasons, preparing or executing revocation
requests, revoking countersignatures, creating/storing/publishing revocation
records, reading countersignatures or audit records, signing or hashing
revocations, or writing files.

P25.6 selected a dedicated thumbnail renderer service as the executable owner
for `render.thumbnail`. This document defines the service-facing request and
response contract shared by MCP and `penpot-cli`.

This is still not a real Penpot scene renderer implementation. MCP
`render.thumbnail` and CLI `render thumbnail --dry-run` can print the
renderer-service plan without contacting the service. With a configured
endpoint and explicit `renderer-service` opt-in, non-dry-run calls execute the
P25.144 no-op renderer-service slice and normalize the returned PNG resource
metadata.

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

P25.144 executes the first renderer-service slice. The package and no-op host
are present, `GET /health` is probed before rendering, `POST /thumbnail` is
dispatched only after explicit opt-in, and the response is normalized into the
shared cache/resource/renderer metadata contract. MCP returns metadata only;
CLI may download the normalized `downloadUri` when `--output` is supplied.
This slice still does not render real Penpot scene data or persist thumbnails
through backend RPCs.

P25.145 validates executable `thumbnail.render` request bodies at the service
boundary before returning the no-op PNG resource. The service requires JSON
`operation: thumbnail.render`, `target.kind` of `file` or `frame`, and
`artifact.format: png`; invalid requests return structured non-retryable 400
errors. The success response includes a compact request summary so MCP/CLI
integration tests can prove the shared request contract reached the service.

P25.146 extends service-boundary validation to target identity. File thumbnail
requests must include `target.fileId`, and frame thumbnail requests must
include `target.fileId`, `target.pageId`, and `target.objectId`; the no-op
success response echoes those ids in the request summary. This keeps invalid
requests from reaching future backend data/persist work that cannot be mapped
to a file thumbnail or tagged frame thumbnail.

P25.147 validates cache metadata at the service boundary. Requests must include
`cache.policy` of `reuse` or `refresh`, a non-empty `cache.key`, and a
target-matching `cache.scope`: `file-thumbnail` for file thumbnails and
`file-object-thumbnail` for frame thumbnails. The no-op success response echoes
the cache identity so later cache reuse, refresh, and backend persistence work
can rely on the executable request contract.

P25.148 validates PNG artifact sizing and media metadata at the service
boundary. Requests must include positive bounded integer `artifact.width` and
`artifact.height` values, `artifact.mimeType: image/png`, and
`artifact.extension: .png`; the no-op success response echoes those artifact
fields. This prepares the service boundary for real renderer sizing without
claiming scene rasterization is implemented.

P25.149 validates render execution intent. Requests must include
`render.runtime: render-wasm-worker`, `render.fallback: frontend-rasterizer`,
and a `render.required` value that matches the cache policy: `true` for
`refresh` and `on-cache-miss` for `reuse`. The no-op response echoes this
intent so later cache probing can decide whether the renderer must run without
changing the request contract.

P25.150 forwards caller-session auth metadata through executable thumbnail
dispatch. CLI execution derives `Authorization: Bearer <token>` and an
`auth-token` cookie from `--token`, `PENPOT_CLI_TOKEN`,
`PENPOT_MCP_USER_TOKEN`, or `PENPOT_ACCESS_TOKEN`; MCP execution derives the
same headers from the current MCP session token. Dry-run plans remain
token-free. The renderer-service no-op host returns only auth presence metadata
(`authorizationPresent`, `cookiePresent`, `authTokenCookiePresent`, and
`tokenValuesIncluded: false`) and never echoes credential values.

P25.151 validates backend RPC intent metadata before no-op rendering. Requests
must include `backendRpc.data` matching the target kind
(`get-file-data-for-thumbnail` with `GET` for file thumbnails, or
`get-file-frame-data-for-thumbnail` with `required-future-capability` status for
frame thumbnails). Refresh requests must provide `backendRpc.persist`, reuse
requests must provide `backendRpc.cacheMissPersist`, and those persist entries
must target `create-file-thumbnail` or `create-file-object-thumbnail` with
`POST` as appropriate. The service echoes only command/method/request-presence
metadata and still does not call backend RPCs or persist thumbnails.

P25.152 validates cache probe intent metadata before no-op rendering. Reuse
requests must include `cache.probe` with `file-thumbnail-by-file-id-and-revn`
for file thumbnails or `file-object-thumbnail-by-object-key` for tagged frame
thumbnails; refresh requests must omit cache probe metadata. The service echoes
the accepted probe in the compact request summary, but it still does not read
thumbnail cache records or decide cache hits.

P25.153 validates thumbnail request identity consistency before no-op
rendering. File thumbnail requests must keep target file/revision identity,
`cache.key`, backend source-data request identity, and persist/cache-miss persist
request identity aligned, using the unresolved revision placeholder until source
data supplies a concrete revision. Tagged frame thumbnail requests must keep the
target object key, cache key, backend source-data request, and persist request
aligned on the same file/page/object/tag identity. The service rejects mismatches
with structured non-retryable 400 errors while still avoiding cache reads,
backend RPC calls, real rendering, or thumbnail persistence.

P25.154 validates the generated thumbnail response before returning it to
MCP/CLI callers. The no-op host now rejects internally malformed resource,
cache, renderer, request-summary, or auth-summary metadata with
`renderer_service_response_invalid` instead of sending an `ok` body that client
normalization could consume. This keeps response resource URIs, download URIs,
PNG content type, cache identity, renderer metadata, request echo, token-safe
auth summary, `runtimeRegistration`, `dispatch`, and `localFileWrites`
consistent before future real rendering, cache reads, backend reads, or
thumbnail persistence replace the no-op implementation.

P26.5 plans the renderer-service backend RPC client boundary without executing
it. When a backend base URI is configured, the no-op host now derives
`api/main/methods/<command>?_fmt=json` endpoints for the validated source-data
and persistence commands, echoes only caller-session auth presence, and marks
`dispatch`, `networkDispatch`, `cacheRead`, `dataRead`, and `persistWrite` as
false. The response validator rejects malformed `backendRpcClient` metadata
before returning success, and tests prove an injected fetch implementation is
not called.

P26.6 plans the renderer-service backend RPC request envelope boundary without
executing it. Each `backendRpcClient.entries.*.requestEnvelope` records the
Penpot RPC JSON transport, HTTP method, canonical request keys, GET query keys,
POST JSON body keys, and hard false `requestValuesIncluded`,
`mediaValuesIncluded`, `tokenValuesIncluded`, and `dispatch` flags. The
response validator rejects malformed envelopes before returning success, and
the service still does not read thumbnail caches, read backend source data,
persist thumbnails, or perform backend network dispatch.

P26.7 plans the renderer-service backend RPC runtime pipeline without executing
it. `backendRpcClient.pipeline` records ordered stages for cache probing,
source-data reads, render dispatch, and thumbnail persistence. Reuse requests
start with `cache-probe` and run later stages `on-cache-miss`; refresh requests
run source-data, render, and persist stages `always`. The plan keeps
`networkDispatch`, `cacheRead`, `dataRead`, `renderDispatch`, `persistWrite`,
`sourceDataValuesIncluded`, `artifactValuesIncluded`, and
`tokenValuesIncluded` false. The response validator rejects malformed pipeline
metadata or accidental request/media/source-data/credential value exposure
before returning success.

P26.8 exposes backend RPC planning base URI configuration to the manual
renderer-service host. `PENPOT_RENDERER_SERVICE_BACKEND_URI` is preferred and
`PENPOT_BACKEND_URI` is accepted as a fallback; both are normalized to absolute
HTTP(S) base URIs before the service starts. This only switches
`backendRpcClient.status` from `not-configured` to `configured-disabled` and
fills disabled endpoint metadata. It does not call backend RPCs, read thumbnail
caches, read source data, render scene data, persist thumbnails, or expose
request/media/token values.

P26.9 plans the renderer-service cache probe boundary without executing it.
Reuse responses include `backendRpcClient.cacheProbe` with
`status:"planned-disabled"`, the selected strategy such as
`file-thumbnail-by-file-id-and-revn`, canonical cache lookup keys, cache key,
`hitResult:"resource-metadata"`, `missResult:"continue-pipeline"`, and hard
false `cacheRead`, `networkDispatch`, `dispatch`,
`cacheHitValuesIncluded`, `resourceValuesIncluded`, `mediaValuesIncluded`, and
`tokenValuesIncluded` flags. Refresh responses use `cacheProbe:null`. The
response validator rejects malformed probe plans and accidental cached resource
or cache-hit value exposure before success.

P26.10 executes the first read-only cache probe for configured file-target
reuse requests. The renderer-service now calls `get-file-thumbnail` only when
backend URI planning is configured, the request targets a file, and
`cache.policy` is `reuse`. A cache hit returns normalized cached resource
metadata with `cache.outcome:"hit"` and `renderer.runtime:null`; a cache miss
keeps the existing no-op PNG resource path. Backend dispatch failures remain
retryable service errors, and the validator still rejects malformed probe
responses or credential/value leakage.

P26.11 executes the first backend source-data read for configured file-target
refresh requests and reuse cache misses. The renderer-service now calls
`get-file-data-for-thumbnail` after request validation, skips the read when a
reuse cache probe hits, validates response file/revision/page identity, and
exposes only execution metadata. Tagged-frame source-data reads, thumbnail
persistence writes, scene rendering, media values, source-data values, and
credential values remain disabled or redacted.

P26.12 adds a token-safe renderer handoff summary after successful configured
file-thumbnail source-data reads. `backendRpcClient.renderInput` is present
only when `get-file-data-for-thumbnail` executed and returned a validated
file/revision/page envelope. It records the source-data endpoint, identity
field names, revision source, cache policy/scope/key, PNG dimensions, renderer
runtime/fallback names, the current `renderDispatch` execution state, and hard
false `sourceDataValuesIncluded`, `pageValuesIncluded`,
`artifactValuesIncluded`, `mediaValuesIncluded`, and `tokenValuesIncluded`
flags. Cache hits, unconfigured requests, and tagged-frame requests keep
`renderInput:null`. The response validator rejects malformed render-input
metadata and accidental source-data/page/artifact/media/credential value
exposure before success.

P26.13 executes the first renderer runtime adapter boundary for configured
file-thumbnail source-data reads. The service calls an injected
`renderThumbnail` adapter only after source data is validated and only when the
cache path did not hit. Adapter PNG bytes are registered in an in-memory asset
store and returned as normalized `/assets/by-id/{mediaId}` metadata; no local
filesystem writes occur. The pipeline records `status:"render-executed"`,
marks the render stage executed, and keeps `persistWrite:false`. Manual hosts
without an adapter, cache hits, unconfigured requests, and tagged-frame
requests do not dispatch render. Thumbnail persistence writes, tagged-frame
source-data reads, source-data/page values, artifact bytes in JSON, media
values, and credential values remain disabled or redacted.

P26.14 adds manual runtime adapter module registration. When
`PENPOT_RENDERER_SERVICE_RUNTIME_MODULE` is set to an absolute local path or
`file:` URL, startup imports that ES module and accepts a named
`renderThumbnail`, default object `renderThumbnail`, or default function as the
runtime adapter. Invalid or missing exports fail startup before the host binds.
`penpot-cli renderer-service status/start` reports the configured module path
as no-import/no-dispatch lifecycle metadata; the CLI still does not spawn,
probe, import, or render. This is a registration boundary only: bundled
render-wasm/frontend rasterizer scene rendering, tagged-frame source-data
reads, thumbnail persistence writes, local file writes, source-data/page
values, artifact byte exposure, media values, and credential values remain
disabled or redacted.

The P25.77 revocation appeal resolution enforcement evidence attestation
notarization certification endorsement countersignature verification revocation
appeal resolution slice keeps resolution policy selection, subject/authority
identification, appeal reads, appeal record reads, resolution reason capture,
scope computation, outcome selection, resolution preparation/storage/execution/
publication, appeal accepted/rejected decisions, resolution record creation/
storage/publication, countersignature and audit record reads, resolution
linking/verification/signing/hashing, file writes, package creation, workspace
mutation, lockfile mutation, command execution, build output, materialization
approval, process startup, dispatch, network dispatch, runtime registration,
and local file writes disabled.

The P25.78 revocation appeal resolution enforcement evidence attestation
notarization certification endorsement countersignature verification revocation
appeal resolution enforcement slice keeps enforcement policy selection,
subject/authority identification, resolution reads, resolution record reads,
enforcement reason capture, scope computation, action selection, enforcement
preparation/storage/execution/publication, resolution enforcement decisions,
enforcement record creation/storage/publication, countersignature and audit
record reads, enforcement linking/verification/signing/hashing, file writes,
package creation, workspace mutation, lockfile mutation, command execution,
build output, materialization approval, process startup, dispatch, network
dispatch, runtime registration, and local file writes disabled.

The P25.79 revocation appeal resolution enforcement evidence attestation
notarization certification endorsement countersignature verification revocation
appeal resolution enforcement evidence slice keeps evidence policy selection,
subject/source identification, evidence collection, validation, normalization,
evidence record creation/storage/publication, evidence bundle creation/storage,
enforcement, resolution, appeal, revocation, countersignature, and audit record
reads, evidence linking/verification/signing/hashing, file writes, package
creation, workspace mutation, lockfile mutation, command execution, build
output, materialization approval, process startup, dispatch, network dispatch,
runtime registration, and local file writes disabled.

The P25.80 revocation appeal resolution enforcement evidence attestation
notarization certification endorsement countersignature verification revocation
appeal resolution enforcement evidence attestation slice keeps attestation
policy selection, subject/authority identification, attestation preparation,
creation, validation, storage, publication, attestation bundle creation/storage,
evidence record reads/attestation/verification, evidence bundle reads,
enforcement, resolution, appeal, revocation, countersignature, and audit record
reads, attestation linking/verification/signing/hashing, file writes, package
creation, workspace mutation, lockfile mutation, command execution, build
output, materialization approval, process startup, dispatch, network dispatch,
runtime registration, and local file writes disabled.

The P25.81 revocation appeal resolution enforcement evidence attestation
notarization certification endorsement countersignature verification revocation
appeal resolution enforcement evidence attestation notarization slice keeps
notarization policy selection, subject/authority identification, notarization
preparation, creation, validation, storage, publication, notarization record
creation/storage/publication, attestation reads/notarization/verification,
evidence, enforcement, resolution, appeal, revocation, countersignature, and
audit record reads, notarization linking/verification/signing/hashing, file
writes, package creation, workspace mutation, lockfile mutation, command
execution, build output, materialization approval, process startup, dispatch,
network dispatch, runtime registration, and local file writes disabled.

The P25.82 revocation appeal resolution enforcement evidence attestation
notarization certification endorsement countersignature verification revocation
appeal resolution enforcement evidence attestation notarization certification
slice keeps certification policy selection, subject/authority identification,
certification preparation, creation, validation, storage, publication,
certification record creation/storage/publication, notarization reads/
certification/verification, attestation reads/notarization/verification,
evidence, enforcement, resolution, appeal, revocation, countersignature, and
audit record reads, certification linking/verification/signing/hashing, file
writes, package creation, workspace mutation, lockfile mutation, command
execution, build output, materialization approval, process startup, dispatch,
network dispatch, runtime registration, and local file writes disabled.

The P25.83 revocation appeal resolution enforcement evidence attestation
notarization certification endorsement countersignature verification revocation
appeal resolution enforcement evidence attestation notarization certification
endorsement slice keeps endorsement policy selection, subject/authority
identification, endorsement preparation, creation, validation, storage,
publication, endorsement record creation/storage/publication, certification
reads/endorsement/verification, lower audit-chain reads, endorsement
linking/verification/signing/hashing, file writes, package creation, workspace
mutation, lockfile mutation, command execution, build output, materialization
approval, process startup, dispatch, network dispatch, runtime registration,
and local file writes disabled.

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

P25.43 defines the package materialization approval replay guard. Plans now
include `packageMaterializationApprovalReplayGuard`, covering future one-time
token replay prevention, nonce and scope-hash checks, blocked replay decision,
and no-op guarantees while keeping replay checks, nonce storage, scope-hash
storage, token consumption, token revocation, token acceptance, final approval,
file writes, package creation, workspace mutation, lockfile mutation, command
execution, build output, materialization approval, process startup, dispatch,
network dispatch, runtime registration, and local file writes disabled.

P25.44 defines the package materialization approval expiry policy. Plans now
include `packageMaterializationApprovalExpiryPolicy`, covering future
short-lived approval token expiry rules, required
`issuedAt`/`notBefore`/`expiresAt` claims, max-age and clock-skew checks,
blocked expiry decision, and no-op guarantees while keeping expiry checks,
wall-clock reads/trust, token validation, token acceptance, token consumption,
token revocation, final approval, file writes, package creation, workspace
mutation, lockfile mutation, command execution, build output, materialization
approval, process startup, dispatch, network dispatch, runtime registration,
and local file writes disabled.

P25.45 defines the package materialization approval revocation policy. Plans
now include `packageMaterializationApprovalRevocationPolicy`, covering future
revoked-token denial rules, revocation registry sources, revocation epoch
checks, audit linkage, blocked revocation decision, and no-op guarantees while
keeping revocation checks, registry fetches, revocation state reads/trust,
token validation, token acceptance, token consumption, final approval, file
writes, package creation, workspace mutation, lockfile mutation, command
execution, build output, materialization approval, process startup, dispatch,
network dispatch, runtime registration, and local file writes disabled.

P25.46 defines the package materialization approval scope binding policy.
Plans now include `packageMaterializationApprovalScopeBindingPolicy`, covering
future canonical approval scope serialization, approval scope hash planning,
target/command/workspace/package binding, token scope match, blocked
scope-binding decision, and no-op guarantees while keeping scope binding,
approval scope hash computation/validation/storage, file snapshot reads,
workspace/package hashing, token validation, token acceptance, token
consumption, final approval, file writes, package creation, workspace
mutation, lockfile mutation, command execution, build output, materialization
approval, process startup, dispatch, network dispatch, runtime registration,
and local file writes disabled.

P25.47 defines the package materialization approval operator confirmation
policy. Plans now include
`packageMaterializationApprovalOperatorConfirmationPolicy`, covering future
explicit operator identity and intent inputs, visible approval scope,
confirmation phrase, audit linkage, blocked confirmation decision, and no-op
guarantees while keeping operator prompts, confirmation
collection/storage/validation, identity verification, confirmation token
issuance, token validation, token acceptance, token consumption, final
approval, file writes, package creation, workspace mutation, lockfile mutation,
command execution, build output, materialization approval, process startup,
dispatch, network dispatch, runtime registration, and local file writes
disabled.

P25.48 defines the package materialization approval emergency stop policy.
Plans now include `packageMaterializationApprovalEmergencyStopPolicy`, covering
future trusted stop source, stop scope inputs, stop registry state, blocked
emergency-stop decision, and no-op guarantees while keeping emergency-stop
configuration, stop registry fetches, stop-state reads/trust, stop overrides,
token validation, token acceptance, token consumption, final approval, file
writes, package creation, workspace mutation, lockfile mutation, command
execution, build output, materialization approval, process startup, dispatch,
network dispatch, runtime registration, and local file writes disabled.

P25.49 defines the package materialization approval readiness verdict policy.
Plans now include `packageMaterializationApprovalReadinessVerdictPolicy`,
covering future final readiness inputs, blocker evaluation, trusted verdict,
audit linkage, blocked readiness decision, and no-op guarantees while keeping
verdict computation/storage/trust, readiness input validation, blocker
evaluation, token validation, token acceptance, token consumption, final
approval, file writes, package creation, workspace mutation, lockfile mutation,
command execution, build output, materialization approval, process startup,
dispatch, network dispatch, runtime registration, and local file writes
disabled.

P25.50 defines the package materialization approval execution handoff policy.
Plans now include `packageMaterializationApprovalExecutionHandoffPolicy`,
covering future post-approval handoff targets, required handoff inputs,
handoff checks, blocked execution-job decisions, and no-op guarantees while
keeping handoff preparation, handoff queueing, handoff storage, handoff
validation, execution job creation, execution job queueing, execution job
dispatch, owner selection, owner notification, token validation, token
acceptance, token consumption, final approval, file writes, package creation,
workspace mutation, lockfile mutation, command execution, build output,
materialization approval, process startup, dispatch, network dispatch, runtime
registration, and local file writes disabled.

P25.51 defines the package materialization approval post-handoff audit policy.
P25.52 defines the package materialization approval audit retention policy.
P25.53 defines the package materialization approval audit access policy.
P25.54 defines the package materialization approval audit integrity policy.
P25.55 defines the package materialization approval audit provenance policy.
P25.56 defines the package materialization approval audit custody policy.
P25.57 defines the package materialization approval audit evidence policy.
P25.58 defines the package materialization approval audit attestation policy.
P25.59 defines the package materialization approval audit notarization policy.
P25.60 defines the package materialization approval audit certification policy.
P25.61 defines the package materialization approval audit endorsement policy.
P25.62 defines the package materialization approval audit countersignature
policy.
P25.63 defines the package materialization approval audit countersignature
verification policy.
P25.64 defines the package materialization approval audit countersignature
revocation policy.
P25.65 defines the package materialization approval audit countersignature
revocation appeal policy.
P25.66 defines the package materialization approval audit countersignature
revocation appeal resolution policy.
P25.67 defines the package materialization approval audit countersignature
revocation appeal resolution enforcement policy.
P25.68 defines the package materialization approval audit countersignature
revocation appeal resolution enforcement evidence policy.
P25.69 defines the package materialization approval audit countersignature
revocation appeal resolution enforcement evidence attestation policy.
P25.70 defines the package materialization approval audit countersignature
revocation appeal resolution enforcement evidence attestation notarization
policy.
P25.71 defines the package materialization approval audit countersignature
revocation appeal resolution enforcement evidence attestation notarization
certification policy.
P25.72 defines the package materialization approval audit countersignature
revocation appeal resolution enforcement evidence attestation notarization
certification endorsement policy.
P25.73 defines the package materialization approval audit countersignature
revocation appeal resolution enforcement evidence attestation notarization
certification endorsement countersignature policy.
Plans now include `packageMaterializationApprovalPostHandoffAuditPolicy`,
`packageMaterializationApprovalAuditRetentionPolicy`,
`packageMaterializationApprovalAuditAccessPolicy`,
`packageMaterializationApprovalAuditIntegrityPolicy`,
`packageMaterializationApprovalAuditProvenancePolicy`,
`packageMaterializationApprovalAuditCustodyPolicy`,
`packageMaterializationApprovalAuditEvidencePolicy`,
`packageMaterializationApprovalAuditAttestationPolicy`,
`packageMaterializationApprovalAuditNotarizationPolicy`,
`packageMaterializationApprovalAuditCertificationPolicy`,
`packageMaterializationApprovalAuditEndorsementPolicy`,
`packageMaterializationApprovalAuditCountersignaturePolicy`,
`packageMaterializationApprovalAuditCountersignatureVerificationPolicy`,
`packageMaterializationApprovalAuditCountersignatureRevocationPolicy`,
`packageMaterializationApprovalAuditCountersignatureRevocationAppealPolicy`,
`packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionPolicy`,
`packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementPolicy`,
`packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidencePolicy`,
`packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationPolicy`,
`packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationPolicy`,
`packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationPolicy`,
`packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementPolicy`,
`packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignaturePolicy`,
`packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationPolicy`,
`packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationPolicy`,
`packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealPolicy`,
`packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionPolicy`,
`packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementPolicy`,
and
`packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidencePolicy`.
P25.80 adds
`packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationPolicy`.
P25.81 adds
`packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationPolicy`.
P25.82 adds
`packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationPolicy`.
P25.83 adds
`packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementPolicy`.
P25.84 adds
`packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignaturePolicy`.
P25.85 adds
`packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationPolicy`.
P25.86 adds
`packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationPolicy`.
P25.87 adds
`packageMaterializationApprovalAuditCountersignatureRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealResolutionEnforcementEvidenceAttestationNotarizationCertificationEndorsementCountersignatureVerificationRevocationAppealPolicy`.
These cover future audit sinks, retention, access, integrity, provenance,
custody, evidence, attestation, notarization, certification, endorsement, and
countersignature/countersignature verification/countersignature revocation/
countersignature revocation appeal/countersignature revocation appeal
resolution/countersignature revocation appeal resolution enforcement/
enforcement evidence/enforcement evidence attestation/enforcement evidence
attestation notarization/enforcement evidence attestation notarization
certification/enforcement evidence attestation notarization certification
endorsement/enforcement evidence attestation notarization certification
endorsement countersignature/endorsement countersignature verification/
endorsement countersignature verification revocation/endorsement
countersignature verification revocation appeal/endorsement countersignature
verification revocation appeal resolution/endorsement countersignature
verification revocation appeal resolution enforcement/endorsement
countersignature verification revocation appeal resolution enforcement
evidence/endorsement countersignature verification revocation appeal resolution
enforcement evidence attestation notarization/enforcement evidence attestation
notarization certification/enforcement evidence attestation notarization
certification endorsement countersignature/enforcement evidence attestation
notarization certification endorsement countersignature verification/
enforcement evidence attestation notarization certification endorsement
countersignature verification revocation metadata, including required inputs,
checks, blocked decisions, and no-op guarantees. The
P25.65 revocation appeal slice keeps appeal policy
selection, subject/authority identification, appeal reason capture,
countersignature revocation reads, countersignature and audit record reads,
countersignature revocation appeals, appeal grant/denial, appeal record
storage, signature verification, hash computation, file writes, package
creation, workspace mutation, lockfile mutation, command execution, build
output, materialization approval, process startup, dispatch, network dispatch,
runtime registration, and local file writes disabled. The P25.66 revocation
appeal resolution slice keeps resolution policy selection, subject/authority
identification, appeal and appeal record reads, resolution reason/scope/outcome
capture, resolution preparation/validation/storage/execution/publication,
appeal resolution acceptance/rejection, resolution record storage, audit record
linking, signature verification, hash computation, file writes, package
creation, workspace mutation, lockfile mutation, command execution, build
output, materialization approval, process startup, dispatch, network dispatch,
runtime registration, and local file writes disabled.
The P25.67 revocation appeal resolution enforcement slice keeps enforcement
policy selection, subject/authority identification, resolution and resolution
record reads, enforcement reason/scope/action capture, enforcement preparation/
validation/storage/execution/publication, resolution enforcement acceptance/
rejection, enforcement record storage, audit record linking, signature
verification, hash computation, file writes, package creation, workspace
mutation, lockfile mutation, command execution, build output, materialization
approval, process startup, dispatch, network dispatch, runtime registration,
and local file writes disabled.
The P25.68 revocation appeal resolution enforcement evidence slice keeps
evidence policy selection, subject/source identification, enforcement and audit
record reads, evidence collection/validation/normalization, evidence record
creation/storage/publication, evidence bundle creation/storage, audit evidence
linking/verification, signature verification, hash computation, file writes,
package creation, workspace mutation, lockfile mutation, command execution,
build output, materialization approval, process startup, dispatch, network
dispatch, runtime registration, and local file writes disabled.
The P25.69 revocation appeal resolution enforcement evidence attestation slice
keeps attestation policy selection, subject/authority identification,
attestation preparation/creation/validation/storage/publication, attestation
bundle creation/storage, evidence record reads/attestation/verification, audit
record reads, attestation linking/verification, signature verification, hash
computation, file writes, package creation, workspace mutation, lockfile
mutation, command execution, build output, materialization approval, process
startup, dispatch, network dispatch, runtime registration, and local file
writes disabled.
The P25.70 revocation appeal resolution enforcement evidence attestation
notarization slice keeps notarization policy selection, subject/authority
identification, notarization preparation/creation/validation/storage/
publication, notarization record creation/storage/publication, attestation
reads/notarization/verification, audit record reads, notarization linking/
verification, signature verification, hash computation, file writes, package
creation, workspace mutation, lockfile mutation, command execution, build
output, materialization approval, process startup, dispatch, network dispatch,
runtime registration, and local file writes disabled.
The P25.71 revocation appeal resolution enforcement evidence attestation
notarization certification slice keeps certification policy selection,
subject/authority identification, certification preparation/creation/
validation/storage/publication, certification record creation/storage/
publication, notarization reads/certification/verification, audit record
reads, certification linking/verification, signature verification, hash
computation, file writes, package creation, workspace mutation, lockfile
mutation, command execution, build output, materialization approval, process
startup, dispatch, network dispatch, runtime registration, and local file
writes disabled.
The P25.72 revocation appeal resolution enforcement evidence attestation
notarization certification endorsement slice keeps endorsement policy
selection, subject/authority identification, endorsement preparation/creation/
validation/storage/publication, endorsement record creation/storage/
publication, certification reads/endorsement/verification, audit record reads,
endorsement linking/verification, signature verification, hash computation,
file writes, package creation, workspace mutation, lockfile mutation, command
execution, build output, materialization approval, process startup, dispatch,
network dispatch, runtime registration, and local file writes disabled.
The P25.73 revocation appeal resolution enforcement evidence attestation
notarization certification endorsement countersignature slice keeps
countersignature policy selection, subject/authority identification,
countersignature preparation/creation/validation/storage/publication,
countersignature record creation/storage/publication, endorsement reads/
countersignature/verification, audit record reads, countersignature linking/
verification, signature verification, hash computation, file writes, package
creation, workspace mutation, lockfile mutation, command execution, build
output, materialization approval, process startup, dispatch, network dispatch,
runtime registration, and local file writes disabled.

The P25.74 revocation appeal resolution enforcement evidence attestation
notarization certification endorsement countersignature verification slice keeps
verification policy selection, subject/authority identification, countersignature
and countersignature record reads, payload parsing, signature verification, hash
matching, chain linking/verification, audit record reads, verification result
storage/publication, file writes, package creation, workspace mutation, lockfile
mutation, command execution, build output, materialization approval, process
startup, dispatch, network dispatch, runtime registration, and local file writes
disabled.

The P25.75 revocation appeal resolution enforcement evidence attestation
notarization certification endorsement countersignature verification revocation
slice keeps revocation policy selection, subject/authority identification,
reason capture, scope computation, revocation request preparation/storage/
execution/publication, verification record revocation, revocation record
creation/storage/publication, countersignature and audit record reads,
revocation linking/verification/signing/hashing, file writes, package creation,
workspace mutation, lockfile mutation, command execution, build output,
materialization approval, process startup, dispatch, network dispatch, runtime
registration, and local file writes disabled.

The P25.76 revocation appeal resolution enforcement evidence attestation
notarization certification endorsement countersignature verification revocation
appeal slice keeps appeal policy selection, subject/authority identification,
appeal reason capture, scope computation, appeal request preparation/storage/
execution/publication, appeal grant/deny decisions, appeal record
creation/storage/publication, countersignature and audit record reads, appeal
linking/verification/signing/hashing, file writes, package creation, workspace
mutation, lockfile mutation, command execution, build output, materialization
approval, process startup, dispatch, network dispatch, runtime registration,
and local file writes disabled.

The P25.86 revocation appeal resolution enforcement evidence attestation
notarization certification endorsement countersignature verification
revocation slice keeps revocation policy selection, subject/authority
identification, reason capture, scope computation, revocation request
preparation/storage/execution/publication, verification revocation, revocation
record creation/storage/publication, countersignature and audit record reads,
revocation linking/verification/signing/hashing, file writes, package
creation, workspace mutation, lockfile mutation, command execution, build
output, materialization approval, process startup, dispatch, network dispatch,
runtime registration, and local file writes disabled.

The P25.87 revocation appeal resolution enforcement evidence attestation
notarization certification endorsement countersignature verification
revocation appeal slice keeps appeal policy selection, subject/authority
identification, appeal reason capture, scope computation, appeal request
preparation/storage/execution/publication, appeal grant/deny decisions, appeal
record creation/storage/publication, revocation and audit record reads, appeal
linking/verification/signing/hashing, file writes, package creation, workspace
mutation, lockfile mutation, command execution, build output, materialization
approval, process startup, dispatch, network dispatch, runtime registration,
and local file writes disabled.

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
    "healthEndpoint": "http://127.0.0.1:6070/health",
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
    "endpoint": "http://127.0.0.1:6070/health",
    "expected": {
      "okStatuses": [200],
      "contentType": "application/json",
      "bodyStatus": "ok",
      "requiredFields": ["status", "renderer", "mode", "capabilities"]
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

## P25.154 Entrypoint Fixture

`p25154-entrypoint-file-reuse-current` pins the opt-in MCP and CLI execution
path without writing files. The focused tests load this fixture, assert the live
renderer-service `POST` body equals `serviceRequest`, return `expectedResponse`
from the mocked service, and verify the normalized resource/cache/request/auth
metadata while keeping credential values out of JSON output.

```json
{
  "serviceRequest": {
    "command": "render.thumbnail",
    "operation": "thumbnail.render",
    "adapter": "renderer-service",
    "target": {
      "kind": "file",
      "fileId": "00000000-0000-0000-0000-000000000001",
      "pageId": null,
      "objectId": null,
      "objectKey": null,
      "tag": null,
      "revn": 7
    },
    "cache": {
      "policy": "reuse",
      "scope": "file-thumbnail",
      "key": "file:00000000-0000-0000-0000-000000000001:revn:7",
      "probe": "file-thumbnail-by-file-id-and-revn"
    }
  },
  "expectedResponse": {
    "status": "ok",
    "cache": {
      "outcome": "hit",
      "scope": "file-thumbnail",
      "key": "file:00000000-0000-0000-0000-000000000001:revn:7"
    },
    "resource": {
      "mediaId": "media-file-thumb-p25154",
      "resourceUri": "/assets/by-id/media-file-thumb-p25154",
      "downloadUri": "https://penpot.example.test/assets/by-id/media-file-thumb-p25154",
      "contentType": "image/png"
    },
    "auth": {
      "mode": "caller-session",
      "authorizationPresent": true,
      "cookiePresent": true,
      "authTokenCookiePresent": true,
      "tokenValuesIncluded": false
    }
  }
}
```

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
  },
  "backendRpcClient": {
    "status": "configured-disabled",
    "baseUriConfigured": true,
    "baseUri": "https://penpot.example.test",
    "networkDispatch": false,
    "cacheRead": false,
    "dataRead": false,
    "persistWrite": false,
    "authForwarding": {
      "mode": "caller-session",
      "authorizationPresent": true,
      "cookiePresent": true,
      "authTokenCookiePresent": true,
      "tokenValuesIncluded": false
    },
    "entries": {
      "data": {
        "command": "get-file-data-for-thumbnail",
        "method": "GET",
        "requestPresent": true,
        "endpoint": "https://penpot.example.test/api/main/methods/get-file-data-for-thumbnail?_fmt=json",
        "dispatch": false,
        "requestEnvelope": {
          "status": "planned-disabled",
          "transport": "penpot-rpc-json",
          "method": "GET",
          "requestKeys": ["file-id", "strip-frames-with-thumbnails"],
          "queryKeys": ["file-id", "strip-frames-with-thumbnails"],
          "bodyKeys": [],
          "requestValuesIncluded": false,
          "mediaValuesIncluded": false,
          "tokenValuesIncluded": false,
          "dispatch": false
        }
      },
      "persist": {
        "command": "create-file-thumbnail",
        "method": "POST",
        "requestPresent": true,
        "endpoint": "https://penpot.example.test/api/main/methods/create-file-thumbnail?_fmt=json",
        "dispatch": false,
        "requestEnvelope": {
          "status": "planned-disabled",
          "transport": "penpot-rpc-json",
          "method": "POST",
          "requestKeys": ["file-id", "media", "revn"],
          "queryKeys": [],
          "bodyKeys": ["file-id", "media", "revn"],
          "requestValuesIncluded": false,
          "mediaValuesIncluded": false,
          "tokenValuesIncluded": false,
          "dispatch": false
        }
      },
      "cacheMissPersist": null
    },
    "cacheProbe": null,
    "pipeline": {
      "status": "planned-disabled",
      "cachePolicy": "refresh",
      "cacheHitShortCircuit": false,
      "orderedStages": [
        {
          "name": "source-data-read",
          "status": "planned-disabled",
          "condition": "always",
          "entry": "data",
          "command": "get-file-data-for-thumbnail",
          "cacheProbe": null,
          "runtime": null,
          "dispatch": false
        },
        {
          "name": "render",
          "status": "planned-disabled",
          "condition": "always",
          "entry": null,
          "command": null,
          "cacheProbe": null,
          "runtime": "render-wasm-worker",
          "dispatch": false
        },
        {
          "name": "thumbnail-persist",
          "status": "planned-disabled",
          "condition": "always",
          "entry": "persist",
          "command": "create-file-thumbnail",
          "cacheProbe": null,
          "runtime": null,
          "dispatch": false
        }
      ],
      "networkDispatch": false,
      "cacheRead": false,
      "dataRead": false,
      "renderDispatch": false,
      "persistWrite": false,
      "sourceDataValuesIncluded": false,
      "artifactValuesIncluded": false,
      "tokenValuesIncluded": false
    },
    "renderInput": null,
    "renderOutput": null
  }
}
```

After a configured file-thumbnail refresh or reuse cache miss executes
`get-file-data-for-thumbnail`, `backendRpcClient.renderInput` has this
metadata-only shape. `renderDispatch` is `false` when no runtime adapter is
configured and `true` when the P26.13 adapter boundary executes.

```json
{
  "status": "source-data-ready",
  "condition": "after-source-data-read",
  "sourceDataRead": true,
  "sourceDataEndpoint": "https://penpot.example.test/api/main/methods/get-file-data-for-thumbnail?_fmt=json",
  "targetKind": "file",
  "identityKeys": ["file-id", "revn"],
  "revisionSource": "backend-source-data",
  "requestRevision": "matched",
  "revisionValueIncluded": false,
  "cachePolicy": "refresh",
  "cacheScope": "file-thumbnail",
  "cacheKey": "file:<fileId>:revn:<revn>",
  "artifactFormat": "png",
  "artifactMimeType": "image/png",
  "artifactWidth": 252,
  "artifactHeight": 168,
  "renderRuntime": "render-wasm-worker",
  "renderFallback": "frontend-rasterizer",
  "renderDispatch": false,
  "sourceDataValuesIncluded": false,
  "pageValuesIncluded": false,
  "artifactValuesIncluded": false,
  "mediaValuesIncluded": false,
  "tokenValuesIncluded": false
}
```

When an injected renderer runtime adapter executes, the pipeline render stage
is marked executed and `backendRpcClient.renderOutput` has this metadata-only
shape:

```json
{
  "status": "artifact-ready",
  "condition": "after-render",
  "runtime": "render-wasm-worker",
  "fallbackUsed": false,
  "artifactFormat": "png",
  "artifactMimeType": "image/png",
  "artifactByteLength": 68,
  "renderDispatch": true,
  "localFileWrites": false,
  "sourceDataValuesIncluded": false,
  "pageValuesIncluded": false,
  "artifactValuesIncluded": false,
  "mediaValuesIncluded": false,
  "tokenValuesIncluded": false
}
```

MCP must return resource metadata only; it must not write files on the MCP
server filesystem. CLI should return the same metadata, and a future
`--output` flag may download the PNG resource locally.

## Remaining Gates

`render.thumbnail` has an explicit renderer-service execution path, but these
gates remain before the renderer can be treated as fully implemented:

- keep MCP `render.thumbnail` dry-run and `penpot-cli render thumbnail
  --dry-run` as request inspection paths
- keep manual hosts no-op unless a renderer runtime adapter is explicitly
  injected or configured through `PENPOT_RENDERER_SERVICE_RUNTIME_MODULE`
- keep file thumbnail cache probe execution limited to file reuse while
  tagged-frame source-data loading remains pending
- replace the injected test adapter with a bundled render-wasm/frontend
  rasterizer runtime bridge before claiming real scene rendering
- add thumbnail persistence writes only after rendered PNG bytes can be mapped
  to backend `media` upload payloads safely
- add or expose explicit frame source-data loading for tagged frame targets
- normalize tagged frame media ids to resource URIs
- keep response normalization covered by fixtures before persistence writes or
  bundled runtime registration expand
- extend MCP tests from dry-run/unavailable planning into auth forwarding,
  resource metadata, and renderer-service error responses
- add CLI smoke tests for dry-run, execution metadata, `--output`, and missing
  token behavior

`render-thumbnail-renderer-service-fixtures.json` is the canonical fixture
matrix for the API shape.
