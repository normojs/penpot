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
- Prototype helpers persist page flows plus navigate and overlay interactions
  through `:set-flow` and `:mod-obj` changes.

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
| `shape.set_layout` | Registered MCP tool, command-runtime descriptor, and `penpot-cli shape set-layout`. | Alias over `shape.update.layout`; backend-command with explicit targets, plugin-live otherwise. | Behavior overlaps with `shape.update.layout`; a thin alias avoids a second layout mutation contract. | Keep forwarding to the same update paths and preserve alias names only in command/tool audit metadata. |
| `shape.set_style` | Registered MCP tool, command-runtime descriptor, and `penpot-cli shape set-style`. | Alias over `shape.update` fill/stroke/text/corner fields; backend-command with explicit targets, plugin-live otherwise for supported fields. | Behavior overlaps with `shape.update` style fields; a thin alias avoids a second style mutation contract. | Keep forwarding to the same update paths and preserve alias names only in command/tool audit metadata. |
| `shape.group`, `shape.ungroup` | Names exist in `ToolNames.ts`, not registered. | Unsupported or descriptor-only. | No backend/common or plugin task implementation found. | Leave out of P17.2 unless a separate grouping wave is selected. |
| `prototype.create_flow` | Registered MCP tool and descriptor; backend-command with `fileId`, plugin-live otherwise. | Backend-safe persisted data plus plugin-live convenience. | Flow data persists on the page. | Keep behavior. |
| `prototype.create_interaction` | Registered MCP tool and descriptor; backend-command with `fileId`, plugin-live otherwise. | Backend-safe persisted data plus plugin-live convenience. | Navigate interaction data persists on source shape. | Keep behavior. |
| `prototype.list_interactions` | Registered MCP tool, backend/common read helper, and CLI command. | Backend-safe persisted read. | Flows and interactions are persisted in file data. | Keep as the discovery/read path; P22.2 adds optional `interactionId` plus explicit `identity.kind` metadata while preserving source-shape/index fields. |
| `prototype.delete_interaction` | Registered MCP tool, backend/common delete helper, and CLI command. | Backend-safe persisted mutation with stable-id or source-shape/index identity. | Interaction arrays are persisted on source shapes; P22.3 can target stored interaction ids and keeps source/index as the legacy fallback and guard form. | Keep stable-id deletion as the preferred target when `prototype.list_interactions` returns `interactionId`. |
| `prototype.update_interaction` | Registered MCP tool, backend/common update helper, command-runtime descriptor, and CLI command. | Backend-safe persisted mutation with stable-id or source-shape/index identity. | P23.4 implements action-specific patches, stale guards, immutable action type, board/shape validation, and supported animation/overlay fields. | Keep backend-command-only for persisted data; plugin-live is out of scope. |
| `prototype.reorder_interaction` | Registered MCP tool, backend/common reorder helper, command-runtime descriptor, and CLI command. | Backend-safe persisted mutation with stable-id or source-shape/index identity. | Reordering mutates the source-shape interaction vector within the same source shape and returns the moved summary at its new index. | Keep same-source reorder only. |
| `prototype.duplicate_interaction` | Registered MCP tool, backend/common duplicate helper, command-runtime descriptor, and CLI command. | Backend-safe persisted mutation with stable-id or source-shape/index identity. | Duplicating an interaction creates a same-source copy with a fresh persisted interaction UUID. | Keep cross-shape duplication out of scope until remap semantics are explicitly defined. |
| `prototype.create_overlay` | Registered MCP tool, command-runtime descriptor, and `penpot-cli prototype create-overlay`. | Backend-safe persisted mutation. | Persisted overlays are interactions with `:open-overlay`, `:toggle-overlay`, or `:close-overlay` actions. The backend/common helper now creates those actions with explicit source, destination, relative target, preset/manual positioning, close/background flags, trigger, delay, and dissolve/slide animation metadata. | Keep backend-command-only for explicit file/page/source targets; plugin-live is not part of the P20 contract. |
| `export.shape` | Registered descriptor and MCP tool through plugin-live. | Plugin-live workspace/export state. | It can use explicit live shape or current selection and returns plugin base64 data. | Keep plugin-live. Explicit exporter shape/page preview is covered by `render.preview`. |
| `export.page` | Registered descriptor and MCP tool. | Exporter/read-only plus plugin-live. | Exporter path requires explicit ids; plugin-live can use bound workspace page. | Keep behavior. |
| `render.preview` | Registered descriptor and MCP tool. | Exporter/read-only plus plugin-live. | Exporter path requires explicit file/page/object ids; plugin-live can preview page/shape/selection. | Keep behavior. |
| `export.file` | Registered descriptor and MCP tool; `penpot-cli export file` also uses backend-rpc. | MCP and CLI backend-rpc file archive export. | MCP calls backend `export-binfile`, reads the SSE resource URI, and returns resource metadata plus `downloadUri`; CLI can additionally download the returned `.penpot` archive with `--output`. | Keep exporter/plugin-live out of `export.file`; use `export.page` or `render.preview` for page/object artifacts. |
| `render.thumbnail` | Registered MCP planning-only tool plus command-runtime descriptor entries; no executable renderer. P25.4 adds a fixture-backed contract, P25.6 audits the runtime boundary, P25.7 defines renderer-service API fixtures, P25.8 adds CLI dry-run/client planning, P25.9 adds MCP dry-run planning, P25.10 adds metadata-only availability probes, P25.11 defines response/error normalization, P25.12 adds disabled client request scaffolding, P25.13 adds closed execution gate metadata, P25.14 adds disabled health preflight plus executable client harness plans, P25.15 adds disabled dispatch adapter boundary metadata, P25.16 adds opt-in configuration surfaces, P25.17 adds unavailable error taxonomy, P25.18 adds integration fixture harness metadata, P25.19 adds dispatch registration preflight metadata, P25.20 adds disabled executable adapter registration scaffold metadata, P25.21 adds disabled adapter registry manifest metadata, P25.22 adds final disabled enablement checklist metadata, P25.23 audits the first concrete implementation slice, P25.24 defines health/no-op contract fixtures, P25.25 defines the no-op service host scaffold, P25.26 defines host lifecycle test fixtures, P25.27 defines package manifest scaffold metadata, P25.28 defines package creation guardrails, P25.29 defines package file templates, P25.30 defines package workspace wiring, P25.31 defines package build verification, P25.32 defines package materialization checklist, P25.33 defines package creation dry-run summary, P25.34 defines package creation file manifest, P25.35 defines package materialization approval gate, P25.36 defines package materialization execution dry-run, P25.37 defines package materialization write contract, P25.38 defines package materialization rollback contract, P25.39 defines package materialization verification manifest, P25.40 defines package materialization final approval checklist, P25.41 defines package materialization explicit approval token, P25.42 defines package materialization approval audit trail, P25.43 defines package materialization approval replay guard, P25.44 defines package materialization approval expiry policy, P25.45 defines package materialization approval revocation policy, P25.46 defines package materialization approval scope binding policy, P25.47 defines package materialization approval operator confirmation policy, P25.48 defines package materialization approval emergency stop policy, P25.49 defines package materialization approval readiness verdict policy, P25.50 defines package materialization approval execution handoff policy, P25.51 defines package materialization approval post-handoff audit policy, P25.52 defines package materialization approval audit retention policy, P25.53 defines package materialization approval audit access policy, P25.54 defines package materialization approval audit integrity policy, P25.55 defines package materialization approval audit provenance policy, P25.56 defines package materialization approval audit custody policy, P25.57 defines package materialization approval audit evidence policy, P25.58 defines package materialization approval audit attestation policy.
P25.59 defines the package materialization approval audit notarization policy.
P25.60 defines the package materialization approval audit certification policy.
P25.61 defines the package materialization approval audit endorsement policy.
P25.62 defines the package materialization approval audit countersignature policy. | Dashboard thumbnail contract with `renderer-service` planning adapter; runtime execution still unavailable. | File thumbnails use `get-file-data-for-thumbnail` plus `create-file-thumbnail`; tagged frame thumbnails use `fileId/pageId/objectId/tag` and `create-file-object-thumbnail`. MCP and CLI dry-run print the future `thumbnail.render` service request plus client/availability, response/error, disabled client request metadata, closed execution gate, disabled preflight/harness metadata, disabled dispatch adapter boundary, opt-in diagnostics, unavailable error taxonomy, integration fixture harness, dispatch registration preflight, executable adapter registration scaffold, adapter registry manifest, enablement checklist, implementation slice audit, health/no-op contract fixtures, no-op service host scaffold, host lifecycle test fixtures, package manifest scaffold, package creation guardrails, package file templates, package workspace wiring, package build verification, package materialization checklist, package creation dry-run summary, package creation file manifest, package materialization approval gate, package materialization execution dry-run, package materialization write contract, package materialization rollback contract, package materialization verification manifest, package materialization final approval checklist, package materialization explicit approval token, package materialization approval audit trail, package materialization approval replay guard, package materialization approval expiry policy, package materialization approval revocation policy, package materialization approval scope binding policy, package materialization approval operator confirmation policy, package materialization approval emergency stop policy, package materialization approval readiness verdict policy, package materialization approval execution handoff policy, package materialization approval post-handoff audit policy, package materialization approval audit retention policy, and package materialization approval audit access policy, package materialization approval audit integrity policy, package materialization approval audit provenance policy, package materialization approval audit custody policy, package materialization approval audit evidence policy, package materialization approval audit attestation policy, package materialization approval audit notarization policy, package materialization approval audit certification policy, package materialization approval audit endorsement policy, and package materialization approval audit countersignature policy. | Keep runtime execution disabled until opt-in config surfaces, renderer-service implementation, workspace wiring, health preflight, cache probe, tagged-frame source data, resource normalization, auth, integration tests, and runtime registration exist. |
P25.63 defines the package materialization approval audit countersignature verification policy. | Dashboard thumbnail contract with `renderer-service` planning adapter; runtime execution still unavailable. | Dry-run and unavailable execution payloads expose countersignature verification policy metadata without reading countersignatures or audit records, verifying signatures, computing hashes, storing verification results, writing files, starting processes, or registering dispatch. | Keep runtime execution disabled until opt-in config surfaces, renderer-service implementation, workspace wiring, health preflight, cache probe, tagged-frame source data, resource normalization, auth, integration tests, and runtime registration exist. |
P25.64 defines the package materialization approval audit countersignature revocation policy. | Dashboard thumbnail contract with `renderer-service` planning adapter; runtime execution still unavailable. | Dry-run and unavailable execution payloads expose countersignature revocation policy metadata without reading countersignatures or audit records, revoking countersignatures, storing revocation records, writing files, starting processes, or registering dispatch. | Keep runtime execution disabled until opt-in config surfaces, renderer-service implementation, workspace wiring, health preflight, cache probe, tagged-frame source data, resource normalization, auth, integration tests, and runtime registration exist. |
P25.65 defines the package materialization approval audit countersignature revocation appeal policy. | Dashboard thumbnail contract with `renderer-service` planning adapter; runtime execution still unavailable. | Dry-run and unavailable execution payloads expose countersignature revocation appeal policy metadata without reading revocations or audit records, appealing revocations, storing appeal records, writing files, starting processes, or registering dispatch. | Keep runtime execution disabled until opt-in config surfaces, renderer-service implementation, workspace wiring, health preflight, cache probe, tagged-frame source data, resource normalization, auth, integration tests, and runtime registration exist. |
P25.66 defines the package materialization approval audit countersignature revocation appeal resolution policy. | Dashboard thumbnail contract with `renderer-service` planning adapter; runtime execution still unavailable. | Dry-run and unavailable execution payloads expose countersignature revocation appeal resolution policy metadata without reading appeals or audit records, resolving appeals, storing resolution records, writing files, starting processes, or registering dispatch. | Keep runtime execution disabled until opt-in config surfaces, renderer-service implementation, workspace wiring, health preflight, cache probe, tagged-frame source data, resource normalization, auth, integration tests, and runtime registration exist. |
P25.67 defines the package materialization approval audit countersignature revocation appeal resolution enforcement policy. | Dashboard thumbnail contract with `renderer-service` planning adapter; runtime execution still unavailable. | Dry-run and unavailable execution payloads expose countersignature revocation appeal resolution enforcement policy metadata without reading resolutions or audit records, enforcing resolutions, storing enforcement records, writing files, starting processes, or registering dispatch. | Keep runtime execution disabled until opt-in config surfaces, renderer-service implementation, workspace wiring, health preflight, cache probe, tagged-frame source data, resource normalization, auth, integration tests, and runtime registration exist. |
P25.68 defines the package materialization approval audit countersignature revocation appeal resolution enforcement evidence policy. | Dashboard thumbnail contract with `renderer-service` planning adapter; runtime execution still unavailable. | Dry-run and unavailable execution payloads expose countersignature revocation appeal resolution enforcement evidence policy metadata without collecting evidence, reading enforcement or audit records, storing evidence records, writing files, starting processes, or registering dispatch. | Keep runtime execution disabled until opt-in config surfaces, renderer-service implementation, workspace wiring, health preflight, cache probe, tagged-frame source data, resource normalization, auth, integration tests, and runtime registration exist. |
P25.69 defines the package materialization approval audit countersignature revocation appeal resolution enforcement evidence attestation policy. | Dashboard thumbnail contract with `renderer-service` planning adapter; runtime execution still unavailable. | Dry-run and unavailable execution payloads expose countersignature revocation appeal resolution enforcement evidence attestation policy metadata without attesting evidence, reading evidence or audit records, storing attestations, writing files, starting processes, or registering dispatch. | Keep runtime execution disabled until opt-in config surfaces, renderer-service implementation, workspace wiring, health preflight, cache probe, tagged-frame source data, resource normalization, auth, integration tests, and runtime registration exist. |
P25.70 defines the package materialization approval audit countersignature revocation appeal resolution enforcement evidence attestation notarization policy. | Dashboard thumbnail contract with `renderer-service` planning adapter; runtime execution still unavailable. | Dry-run and unavailable execution payloads expose countersignature revocation appeal resolution enforcement evidence attestation notarization policy metadata without notarizing attestations, reading attestations or audit records, storing notarization records, writing files, starting processes, or registering dispatch. | Keep runtime execution disabled until opt-in config surfaces, renderer-service implementation, workspace wiring, health preflight, cache probe, tagged-frame source data, resource normalization, auth, integration tests, and runtime registration exist. |
| `component.create`, `component.instantiate`, `tokens.list`, `tokens.apply` | Names exist in `ToolNames.ts`, not registered. | Unsupported or descriptor-only. | No runtime task or backend helper found. | Leave for a future components/tokens wave. |
| `debug.get_plugin_state`, `debug.get_agent_logs` | Names exist in `ToolNames.ts`, not registered. | Unsupported or descriptor-only. | Diagnostics exist through status/log paths, not these tools. | Keep out of P17.2 unless diagnostics naming is explicitly selected. |
| Legacy `execute_code`, `export_shape`, `import_image` | Registered legacy tools. | Legacy live/plugin or local filesystem behavior. | They are compatibility surfaces, not the typed headless path. | Do not expand; keep gated/legacy behavior. |

P25.47 extends the `render.thumbnail` renderer-service planning payload with
metadata-only package materialization approval operator confirmation policy.
It defines future explicit operator confirmation while keeping operator prompts,
confirmation collection/storage/validation, identity verification,
confirmation token issuance, token validation/acceptance/consumption, approval,
file writes, workspace mutation, command execution, build output, package
creation, process startup, and runtime registration disabled.

P25.48 extends the `render.thumbnail` renderer-service planning payload with
metadata-only package materialization approval emergency stop policy. It defines
future trusted stop source, stop scope, stop registry, and blocked stop
decision metadata while keeping stop registry fetches, stop-state reads/trust,
stop overrides, token validation/acceptance/consumption, approval, file writes,
workspace mutation, command execution, build output, package creation, process
startup, and runtime registration disabled.

P25.49 extends the `render.thumbnail` renderer-service planning payload with
metadata-only package materialization approval readiness verdict policy. It
defines future final readiness inputs, blocker evaluation, trusted verdict, and
blocked readiness decision metadata while keeping verdict computation/storage,
input validation, blocker evaluation, token validation/acceptance/consumption,
approval, file writes, workspace mutation, command execution, build output,
package creation, process startup, and runtime registration disabled.

P25.50 extends the `render.thumbnail` renderer-service planning payload with
metadata-only package materialization approval execution handoff policy. It
defines future post-approval handoff targets, required handoff inputs, handoff
checks, and blocked execution-job decision metadata while keeping handoff
preparation/queueing/storage/validation, execution job
creation/queueing/dispatch, owner selection/notification, token
validation/acceptance/consumption, approval, file writes, workspace mutation,
command execution, build output, package creation, process startup, and
runtime registration disabled.

P25.51 extends the `render.thumbnail` renderer-service planning payload with
metadata-only package materialization approval post-handoff audit policy. It
defines future audit sinks, required audit inputs, post-handoff audit checks,
and blocked audit decision metadata while keeping audit record
preparation/validation/storage/publication/export/write, handoff snapshot
capture, execution job snapshot capture, audit sink selection/notification,
token validation/acceptance/consumption, approval, file writes, workspace
mutation, command execution, build output, package creation, process startup,
and runtime registration disabled.

P25.52 extends the `render.thumbnail` renderer-service planning payload with
metadata-only package materialization approval audit retention policy. It
defines future retention policies, required retention inputs, retention checks,
and blocked retention decision metadata while keeping retention policy
selection, retention window computation, trusted clocks, retention record/index
storage, archive storage, purge scheduling/execution, export writes, audit
writes, approval, file writes, workspace mutation, command execution, build
output, package creation, process startup, and runtime registration disabled.

P25.53 extends the `render.thumbnail` renderer-service planning payload with
metadata-only package materialization approval audit access policy. It defines
future access policies, required access inputs, access checks, and blocked
access decision metadata while keeping access policy selection, subject
identification, scope computation/validation, decision storage, access
grant/deny, audit record read/query/export/download/redaction/sign/share,
access token issue/validation/consumption, approval, file writes, workspace
mutation, command execution, build output, package creation, process startup,
and runtime registration disabled.

P25.54 extends the `render.thumbnail` renderer-service planning payload with
metadata-only package materialization approval audit integrity policy. It
defines future integrity policies, required integrity inputs, integrity checks,
and blocked integrity decision metadata while keeping integrity policy
selection, subject identification, scope computation, hash
computation/storage/verification, signature creation/verification, integrity
chain linking/verification, audit record read/hash/verify/sign/seal/tamper
checks, integrity record storage, approval, file writes, workspace mutation,
command execution, build output, package creation, process startup, and runtime
registration disabled.

P25.55 extends the `render.thumbnail` renderer-service planning payload with
metadata-only package materialization approval audit provenance policy. It
defines future provenance policies, required provenance inputs, provenance
checks, and blocked provenance decision metadata while keeping provenance
policy selection, subject identification, source collection/validation, graph
computation/storage, chain linking/verification, provenance record
creation/storage/publication, audit record read/query, provenance
linking/verification/signing/hashing, approval, file writes, workspace
mutation, command execution, build output, package creation, process startup,
and runtime registration disabled.

P25.56 extends the `render.thumbnail` renderer-service planning payload with
metadata-only package materialization approval audit custody policy. It defines
future custody policies, required custody inputs, custody checks, and blocked
custody decision metadata while keeping custody policy selection, subject and
holder identification, transfer preparation/execution, custody take/release/
transfer, custody chain linking/verification, custody record
creation/storage/publication, audit record read/query, custody
linking/verification/signing/hashing, approval, file writes, workspace
mutation, command execution, build output, package creation, process startup,
and runtime registration disabled.

P25.57 extends the `render.thumbnail` renderer-service planning payload with
metadata-only package materialization approval audit evidence policy. It
defines future evidence policies, required evidence inputs, evidence checks,
and blocked evidence decision metadata while keeping evidence policy selection,
subject/source identification, evidence collection/validation/normalization,
evidence record creation/storage/publication, evidence bundle creation/storage,
audit record read/query, evidence linking/verification/signing/hashing,
approval, file writes, workspace mutation, command execution, build output,
package creation, process startup, and runtime registration disabled.

P25.58 extends the `render.thumbnail` renderer-service planning payload with
metadata-only package materialization approval audit attestation policy. It
defines future attestation policies, required attestation inputs, attestation
checks, and blocked attestation decision metadata while keeping attestation
policy selection, subject/authority identification, attestation preparation/
creation/validation/storage/publication, attestation bundle creation/storage,
evidence record read/attest/verify, audit record read/query, attestation
linking/verification/signing/hashing, approval, file writes, workspace
mutation, command execution, build output, package creation, process startup,
and runtime registration disabled.

P25.59 extends the `render.thumbnail` renderer-service planning payload with
metadata-only package materialization approval audit notarization policy. It
defines future notarization policies, required notarization inputs,
notarization checks, and blocked notarization decision metadata while keeping
notarization policy selection, subject/authority identification,
notarization preparation/creation/validation/storage/publication,
notarization record creation/storage/publication, attestation read/notarize/
verify, audit record read/query, notarization linking/verification/signing/
hashing, approval, file writes, workspace mutation, command execution, build
output, package creation, process startup, and runtime registration disabled.

P25.60 extends the `render.thumbnail` renderer-service planning payload with
metadata-only package materialization approval audit certification policy. It
defines future certification policies, required certification inputs,
certification checks, and blocked certification decision metadata while keeping
certification policy selection, subject/authority identification,
certification preparation/creation/validation/storage/publication,
certification record creation/storage/publication, notarization read/certify/
verify, audit record read/query, certification linking/verification/signing/
hashing, approval, file writes, workspace mutation, command execution, build
output, package creation, process startup, and runtime registration disabled.

P25.61 extends the `render.thumbnail` renderer-service planning payload with
metadata-only package materialization approval audit endorsement policy. It
defines future endorsement policies, required endorsement inputs, endorsement
checks, and blocked endorsement decision metadata while keeping endorsement
policy selection, subject/authority identification, endorsement preparation/
creation/validation/storage/publication, endorsement record creation/storage/
publication, certification read/endorse/verify, audit record read/query,
endorsement linking/verification/signing/hashing, approval, file writes,
workspace mutation, command execution, build output, package creation, process
startup, and runtime registration disabled.

P25.62 extends the `render.thumbnail` renderer-service planning payload with
metadata-only package materialization approval audit countersignature policy. It
defines future countersignature policies, required countersignature inputs,
countersignature checks, and blocked countersignature decision metadata while
keeping countersignature policy selection, subject/authority identification,
countersignature preparation/creation/validation/storage/publication,
countersignature record creation/storage/publication, endorsement
read/countersign/verify, audit record read/query, countersignature
linking/verification/signing/hashing, approval, file writes, workspace
mutation, command execution, build output, package creation, process startup,
and runtime registration disabled.

P25.63 extends the `render.thumbnail` renderer-service planning payload with
metadata-only package materialization approval audit countersignature
verification policy. It defines future countersignature verification policies,
required verification inputs, verification checks, and blocked verification
decision metadata while keeping verification policy selection, subject/authority
identification, countersignature and audit record reads, payload parsing,
signature verification, hash computation, chain linking, verification result
storage/publication, approval, file writes, workspace mutation, command
execution, build output, package creation, process startup, and runtime
registration disabled.

P25.64 extends the `render.thumbnail` renderer-service planning payload with
metadata-only package materialization approval audit countersignature
revocation policy. It defines future countersignature revocation policies,
required revocation inputs, revocation checks, and blocked revocation decision
metadata while keeping revocation policy selection, subject/authority
identification, revocation reason capture, countersignature and audit record
reads, countersignature revocation, revocation record creation/storage/
publication, revocation linking/verification/signing/hashing, approval, file
writes, workspace mutation, command execution, build output, package creation,
process startup, and runtime registration disabled.

P25.65 extends the `render.thumbnail` renderer-service planning payload with
metadata-only package materialization approval audit countersignature revocation
appeal policy. It defines future countersignature revocation appeal policies,
required appeal inputs, appeal checks, and blocked appeal decision metadata
while keeping appeal policy selection, subject/authority identification, appeal
reason capture, revocation and audit record reads, revocation appeals, appeal
grant/denial, appeal record creation/storage/publication, appeal
linking/verification/signing/hashing, approval, file writes, workspace mutation,
command execution, build output, package creation, process startup, and runtime
registration disabled.

P25.66 extends the `render.thumbnail` renderer-service planning payload with
metadata-only package materialization approval audit countersignature revocation
appeal resolution policy. It defines future countersignature revocation appeal
resolution policies, required resolution inputs, resolution checks, and blocked
resolution decision metadata while keeping resolution policy selection,
subject/authority identification, appeal and audit record reads, resolution
reason/scope/outcome capture, appeal resolution, resolution acceptance/
rejection, resolution record creation/storage/publication, resolution
linking/verification/signing/hashing, approval, file writes, workspace mutation,
command execution, build output, package creation, process startup, and runtime
registration disabled.

P25.67 extends the `render.thumbnail` renderer-service planning payload with
metadata-only package materialization approval audit countersignature revocation
appeal resolution enforcement policy. It defines future countersignature
revocation appeal resolution enforcement policies, required enforcement inputs,
enforcement checks, and blocked enforcement decision metadata while keeping
enforcement policy selection, subject/authority identification, resolution and
audit record reads, enforcement reason/scope/action capture, resolution
enforcement, enforcement acceptance/rejection, enforcement record creation/
storage/publication, enforcement linking/verification/signing/hashing,
approval, file writes, workspace mutation, command execution, build output,
package creation, process startup, and runtime registration disabled.

P25.68 extends the `render.thumbnail` renderer-service planning payload with
metadata-only package materialization approval audit countersignature revocation
appeal resolution enforcement evidence policy. It defines future
countersignature revocation appeal resolution enforcement evidence policies,
required evidence inputs, evidence checks, and blocked evidence decision
metadata while keeping evidence policy selection, subject/source
identification, enforcement and audit record reads, evidence collection/
validation/normalization, evidence record/bundle storage, evidence
linking/verification/signing/hashing, approval, file writes, workspace
mutation, command execution, build output, package creation, process startup,
and runtime registration disabled.

P25.69 extends the `render.thumbnail` renderer-service planning payload with
metadata-only package materialization approval audit countersignature revocation
appeal resolution enforcement evidence attestation policy. It defines future
countersignature revocation appeal resolution enforcement evidence attestation
policies, required attestation inputs, attestation checks, and blocked
attestation decision metadata while keeping attestation policy selection,
subject/authority identification, evidence and audit record reads, evidence
attestation/verification, attestation creation/storage/publication, attestation
linking/verification/signing/hashing, approval, file writes, workspace
mutation, command execution, build output, package creation, process startup,
and runtime registration disabled.

P25.70 extends the `render.thumbnail` renderer-service planning payload with
metadata-only package materialization approval audit countersignature revocation
appeal resolution enforcement evidence attestation notarization policy. It
defines future countersignature revocation appeal resolution enforcement
evidence attestation notarization policies, required notarization inputs,
notarization checks, and blocked notarization decision metadata while keeping
notarization policy selection, subject/authority identification, attestation
and audit record reads, attestation notarization/verification, notarization
creation/storage/publication, notarization linking/verification/signing/
hashing, approval, file writes, workspace mutation, command execution, build
output, package creation, process startup, and runtime registration disabled.

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
   - Adapter: implemented in P20.3 as `backend-command`.
   - Reason: overlay interactions are persisted source-shape data after P20.1
     made summaries readable and P20.2 defined the payload contract.
   - Scope: explicit file/page/source targets; plugin-live overlay creation is
     not part of this slice.

7. `shape.set_layout`
   - Adapter: implemented in P21.2 as MCP `backend-command` with
     `plugin-live` fallback; P21.3 adds `penpot-cli shape set-layout`.
   - Reason: current behavior lives under `shape.update.layout`; grid backend
     support remains limited to the container track subset.

8. `shape.set_style`
   - Adapter: implemented in P21.2 as MCP `backend-command` with
     `plugin-live` fallback for fields the plugin task supports; P21.3 adds
     `penpot-cli shape set-style`.
   - Reason: current behavior lives under `shape.update` style/text fields.

P17.2 implementation note:

- Added `LiveGapCommandDescriptors` to `@penpot/command-runtime` for the
  original Phase 17 live-gap commands. P21.1 later adds `shape.set_style` as a
  descriptor-first alias alongside `shape.set_layout`, P21.2 registers both
  aliases as MCP tools, and P21.3 adds matching CLI aliases.
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

P20.1 implementation note:

- `prototype-interactions-summary` now reports persisted `:open-overlay`,
  `:toggle-overlay`, and `:close-overlay` interactions in addition to
  navigate-to interactions.
- Overlay summaries include destination board identity, optional relative shape
  identity, overlay position type, overlay position point, click-outside close
  flag, background overlay flag, and animation when present.
- Backend `get-file-prototype-interactions`, MCP
  `prototype.list_interactions`, and `penpot-cli prototype list-interactions`
  expose those summaries read-only. `prototype.create_overlay` remains
  descriptor-only until P20.2/P20.3.

P20.2 contract note:

- `prototype-create-overlay-contract.md` defines the payload and response
  contract for future `prototype.create_overlay` execution.
- The contract requires explicit `fileId`, `pageId`, `sourceShapeId`, and
  `actionType`; `destinationBoardId` is required for `open-overlay` and
  `toggle-overlay`, and optional for `close-overlay`.
- Manual positioning requires an explicit `{x, y}` point, and push animation is
  rejected for overlay actions.
- At P20.2, the command-runtime descriptor exposed the concrete payload
  contract while still keeping `adapters: []` until P20.3 registered an
  implementation.

P20.3 implementation note:

- Common/backend now create persisted `open-overlay`, `toggle-overlay`, and
  `close-overlay` interactions through `create-prototype-overlay-request` and
  `create-file-prototype-overlay`.
- MCP registers `prototype.create_overlay` as a backend-command tool for
  explicit file/page/source targets and returns the created overlay summary
  plus revision and adapter-selection metadata.
- `penpot-cli prototype create-overlay` calls the same RPC and validates
  required action, destination, manual position, and unsupported push animation
  inputs before sending the backend request.
- The command-runtime descriptor now advertises the backend-command adapter and
  CLI command; plugin-live remains out of scope for overlay creation.

P21.1 alias contract note:

- `shape.set_layout` and `shape.set_style` are aliases over `shape.update`;
  P21.1 intentionally defined them descriptor-first before MCP/CLI alias tools
  were registered.
- `shape.set_layout` covers the existing `shape.update.layout` payload:
  backend-command supports `none`, `flex`, and the grid container track subset,
  while grid cell placement remains future/plugin-live work.
- `shape.set_style` covers the existing `shape.update` style/text payload:
  fills, strokes, corner radii, text content, and font size.
- The later registration slices forward alias calls to the same
  backend-command/plugin-live shape update paths and preserve alias names only
  in command/tool audit metadata.

P21.2/P21.3 alias registration note:

- `shape.set_layout` and `shape.set_style` are now registered MCP tools, and
  `penpot-cli shape set-layout` / `shape set-style` are matching CLI aliases.
- Both tools reuse the same adapter selection and execution helpers as
  `shape.update`, so `fileId` selects backend-command `update-file-shape` and
  omitted explicit targets select plugin-live when the requested fields are
  supported by the plugin task.
- Backend writes preserve the alias name in MCP audit headers, and responses
  preserve the alias id in `adapterSelection.command`.
- CLI aliases select the same backend-command request builder as
  `shape update`; `shape set-layout` accepts only layout fields and
  `shape set-style` accepts only style/text fields.

## P19.3 Overlay Contract Reassessment

At the Phase 19 reassessment, `prototype.create_overlay` remained
descriptor-only and unsupported.

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
- At that time, the existing MCP plugin prototype task handler created flows
  and navigate-to interactions only. The backend/common headless helper also
  created only navigate-to interactions.
- Overlay position calculation depends on source shape, destination board,
  relative target, page objects, and viewer/editor geometry conventions, so a
  headless write needs fixtures before execution.

Decision:

- Keep the command-runtime descriptor with `adapters: []` during P19.3.
- Do not register an executable MCP tool or CLI command for overlay creation at
  the Phase 19 boundary.
- Do not reuse `prototype.create_interaction` for overlay actions until the
  input payload and response summary include overlay-specific fields.
- Make the next implementation slice read-only: extend prototype interaction
  summaries to report existing persisted overlay interactions, then use those
  fixtures to define the create payload. P20.3 later implemented the resulting
  backend-command create path.

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

- P22.3 adds stable-id deletion for prototype interactions while preserving
  explicit `fileId`, optional `pageId`, `sourceShapeId`, and zero-based
  `interactionIndex` as the legacy fallback and optional guard form.
- P22.4 defined descriptor-only planned update/reorder/duplicate helpers, and
  P23.4 made them executable through backend-command/MCP/CLI after copy/remap
  id regeneration and action-specific fixtures landed.
- P23.2 adds backend-command create-time UUID generation, P23.3 adds the
  common legacy id migration, and the first P23.4 slice regenerates ids for
  distinct copied shape/page interactions.
- Whether plugin-live `prototype.list_interactions` is needed, or whether
  backend-command reads are enough for agents.
- Whether exporter-backed `export.shape` should get an explicit file/page/shape
  mode or remain covered by `render.preview` plus `export.page`.
- P25.3 implements the `export.file` CLI path as backend `export-binfile`
  RPC/SSE plus `.penpot` resource URI handling and optional download.
- P25.4 selects the `render.thumbnail` contract as dashboard thumbnail
  data/render/cache semantics with PNG artifact metadata; runtime execution
  remains unregistered until renderer ownership is explicit.
- P25.5 registers MCP `export.file` on the same backend-rpc `export-binfile`
  SSE/resource contract. MCP returns resource metadata and `downloadUri`;
  local archive writes remain the CLI `--output` responsibility.
- P25.6 selects a future dedicated thumbnail renderer service for
  `render.thumbnail`. MCP Node direct rendering is rejected, frontend worker
  and exporter paths are deferred, backend cache wrapping is insufficient
  alone, and registration remains blocked until service resource returns are
  fixture-backed.
- P25.7 defines renderer-service API fixtures for file refresh, file cache
  reuse, tagged frame refresh, missing frame target errors, auth forwarding,
  resource URI normalization, and future MCP/CLI test contracts.
- P25.8 adds the CLI dry-run/client boundary for `render.thumbnail`. The
  command-runtime descriptor advertises `renderer-service` planning, CLI
  `render thumbnail --dry-run` prints the future request, and execution returns
  `renderer_service_unavailable` until the renderer service exists.
- P25.9 registers MCP `render.thumbnail` as planning-only. It returns the same
  renderer-service request metadata as CLI dry-run and reports
  `renderer_service_unavailable` for execution without contacting renderer,
  backend, exporter, or plugin runtimes.
- P25.10 adds metadata-only renderer-service availability probes. MCP and CLI
  plans include endpoint, health endpoint, timeout, and configured/not
  configured status without performing network checks.
- P25.11 defines response and error normalization for future renderer-service
  execution. Successful responses normalize resource/download URI metadata and
  service errors normalize retryability/status without enabling network calls.
- P25.12 adds disabled client request scaffolding for future renderer-service
  execution. The scaffold includes audit/auth-forwarding metadata but keeps
  `dispatch:false`.
- P25.13 adds closed execution gate metadata for future renderer-service
  execution. The gate includes opt-in/config readiness, failure modes, and the
  integration-test plan while keeping `executionGate.dispatch:false`.
- P25.14 adds disabled health preflight and executable client harness metadata.
  The plans define future GET `/health`, execution sequence, and failure modes
  while keeping `healthPreflight.dispatch:false` and
  `executionClientHarness.dispatch:false`.
- P25.15 adds disabled dispatch adapter boundary metadata. The boundary defines
  config precedence, gate/preflight/request consumption, result/error mapping,
  and no-dispatch defaults while keeping `dispatchAdapterBoundary.dispatch:false`.
- P25.16 adds opt-in configuration surface metadata. The surface defines CLI,
  MCP, env, profile, and backend config sources plus invalid-value diagnostics
  while keeping `optInConfiguration.dispatch:false`.
- P25.17 adds unavailable error taxonomy metadata. The taxonomy defines stable
  configuration, gate, preflight, dispatch, response, and resource codes while
  keeping `unavailableErrorTaxonomy.dispatch:false`.
- P25.18 adds integration fixture harness metadata. The harness defines future
  closed-gate, health-failure, render-success, service-error, MCP metadata,
  CLI output, and token-safe auth fixtures while keeping
  `integrationFixtureHarness.dispatch:false` and `networkDispatch:false`.
- P25.19 adds dispatch registration preflight metadata. The preflight defines
  final readiness checks while keeping `dispatch:false`,
  `networkDispatch:false`, and `runtimeRegistration:false`.
- P25.20 adds executable adapter registration scaffold metadata. The scaffold
  exposes the future MCP/CLI registration surface while keeping
  `dispatch:false`, `networkDispatch:false`, `runtimeRegistration:false`, and
  `localFileWrites:false`.
- P25.21 adds adapter registry manifest metadata. The manifest exposes future
  registry and entrypoint wiring while keeping `dispatch:false`,
  `networkDispatch:false`, `runtimeRegistration:false`, and
  `localFileWrites:false`.
- P25.22 adds final enablement checklist metadata. The checklist summarizes
  remaining runtime gates while keeping `dispatch:false`,
  `networkDispatch:false`, `runtimeRegistration:false`, and
  `localFileWrites:false`.
- P25.23 audits the concrete implementation slice and selects the
  renderer-service health/no-op contract fixture as the next safe step while
  keeping `dispatch:false`, `networkDispatch:false`,
  `runtimeRegistration:false`, and `localFileWrites:false`.
- P25.24 defines the health/no-op contract fixtures for `/health` and
  `thumbnail.render` while keeping `dispatch:false`, `networkDispatch:false`,
  `runtimeRegistration:false`, and `localFileWrites:false`.
- P25.25 defines the no-op service host scaffold while keeping
  `hostStartup:false`, `dispatch:false`, `networkDispatch:false`,
  `runtimeRegistration:false`, and `localFileWrites:false`.
- P25.26 defines host lifecycle test fixtures while keeping
  `processSpawn:false`, `hostStartup:false`, `networkDispatch:false`,
  `runtimeRegistration:false`, and `localFileWrites:false`.
- P25.27 defines package manifest scaffold metadata while keeping
  `packageCreated:false`, `workspaceMutation:false`, `scriptRunnable:false`,
  and runtime registration disabled.
- P25.28 defines package creation guardrails while keeping
  `packageCreated:false`, `workspaceMutation:false`, `scriptRunnable:false`,
  `hostStartup:false`, `processSpawn:false`, and runtime registration disabled.
- P25.29 defines package file templates while keeping
  `fileMaterialization:false`, `packageCreated:false`,
  `workspaceMutation:false`, `scriptRunnable:false`, and runtime registration
  disabled.
- P25.30 defines package workspace wiring while keeping
  `pnpmWorkspaceMutation:false`, `rootPackageJsonMutation:false`,
  `lockfileMutation:false`, `workspaceMutation:false`, `packageCreated:false`,
  `scriptRunnable:false`, `fileMaterialization:false`, and runtime
  registration disabled.
- P25.31 defines package build verification while keeping
  `commandExecution:false`, `buildOutput:false`,
  `packageScriptsRunnable:false`, `processSpawn:false`, and runtime
  registration disabled.
- P25.32 defines package materialization checklist while keeping
  `materializationApproved:false`, `fileMaterialization:false`,
  `workspaceMutation:false`, `lockfileMutation:false`, and runtime
  registration disabled.
- P25.33 defines package creation dry-run summary while keeping
  `dryRunOnly:true`, `filesWritten:false`, `fileMaterialization:false`,
  `workspaceMutation:false`, and runtime registration disabled.
- P25.34 defines package creation file manifest while keeping
  `dryRunOnly:true`, `filesWritten:false`, `fileMaterialization:false`,
  `workspaceMutation:false`, `lockfileMutation:false`, command execution,
  build output, package creation, process startup, and runtime registration
  disabled.
- P25.35 defines package materialization approval gate while keeping
  `approvalRequired:true`, `approved:false`, `filesWritten:false`,
  `fileMaterialization:false`, `workspaceMutation:false`,
  `lockfileMutation:false`, command execution, build output, package
  creation, process startup, and runtime registration disabled.
- P25.36 defines package materialization execution dry-run while keeping
  `executeNow:false`, `approved:false`, `filesWritten:false`,
  `fileMaterialization:false`, `workspaceMutation:false`,
  `lockfileMutation:false`, command execution, build output, package
  creation, process startup, and runtime registration disabled.
- P25.37 defines package materialization write contract while keeping
  `executeNow:false`, `approved:false`, `filesWritten:false`,
  `fileMaterialization:false`, `workspaceMutation:false`,
  `lockfileMutation:false`, command execution, build output, package
  creation, process startup, and runtime registration disabled.
- P25.38 defines package materialization rollback contract while keeping
  `executeNow:false`, `rollbackNow:false`, `approved:false`,
  `filesWritten:false`, `rollbackExecuted:false`,
  `fileMaterialization:false`, `workspaceMutation:false`,
  `lockfileMutation:false`, command execution, build output, package
  creation, process startup, and runtime registration disabled.
- P25.39 defines package materialization verification manifest while keeping
  `executeNow:false`, `verifyNow:false`, `approved:false`,
  `filesWritten:false`, `verificationExecuted:false`,
  `fileMaterialization:false`, `workspaceMutation:false`,
  `lockfileMutation:false`, command execution, build output, package
  creation, process startup, and runtime registration disabled.
- P25.40 defines package materialization final approval checklist while keeping
  `finalApprovalGranted:false`, `executeNow:false`, `verifyNow:false`,
  `approved:false`, `filesWritten:false`, `fileMaterialization:false`,
  `workspaceMutation:false`, `lockfileMutation:false`, command execution,
  build output, package creation, process startup, and runtime registration
  disabled.
- P25.41 defines package materialization explicit approval token while keeping
  `tokenProvided:false`, `tokenAccepted:false`, `tokenStored:false`,
  `tokenValidated:false`, `approved:false`, `finalApprovalGranted:false`,
  `filesWritten:false`, `fileMaterialization:false`,
  `workspaceMutation:false`, `lockfileMutation:false`, command execution,
  build output, package creation, process startup, and runtime registration
  disabled.
- P25.42 defines package materialization approval audit trail while keeping
  `auditRecordWritten:false`, `auditRecordPersisted:false`,
  `auditRecordValidated:false`, `auditRecordExported:false`,
  `writeAuditNow:false`, `tokenAccepted:false`, `approved:false`,
  `finalApprovalGranted:false`, `filesWritten:false`,
  `fileMaterialization:false`, `workspaceMutation:false`,
  `lockfileMutation:false`, command execution, build output, package creation,
  process startup, and runtime registration disabled.
- P25.43 defines package materialization approval replay guard while keeping
  replay checks, nonce/scope-hash storage, token consumption/revocation, token
  acceptance, approval, file writes, workspace mutation, command execution,
  build output, package creation, process startup, and runtime registration
  disabled.
- P25.44 defines package materialization approval expiry policy while keeping
  expiry checks, wall-clock reads/trust, token validation/acceptance/consumption,
  approval, file writes, workspace mutation, command execution, build output,
  package creation, process startup, and runtime registration disabled.
- P25.45 defines package materialization approval revocation policy while
  keeping revocation checks, registry fetches, revocation state reads/trust,
  token validation/acceptance/consumption, approval, file writes, workspace
  mutation, command execution, build output, package creation, process startup,
  and runtime registration disabled.
- P25.46 defines package materialization approval scope binding policy while
  keeping scope binding, approval scope hash computation/validation/storage,
  file snapshot reads, workspace/package hashing, token
  validation/acceptance/consumption, approval, file writes, workspace mutation,
  command execution, build output, package creation, process startup, and
  runtime registration disabled.
- P25.47 defines package materialization approval operator confirmation policy
  while keeping operator prompts, confirmation collection/storage/validation,
  identity verification, confirmation token issuance, token
  validation/acceptance/consumption, approval, file writes, workspace mutation,
  command execution, build output, package creation, process startup, and
  runtime registration disabled.
- P25.48 defines package materialization approval emergency stop policy while
  keeping stop registry fetches, stop-state reads/trust, stop overrides, token
  validation/acceptance/consumption, approval, file writes, workspace mutation,
  command execution, build output, package creation, process startup, and
  runtime registration disabled.
- P25.49 defines package materialization approval readiness verdict policy
  while keeping verdict computation/storage/trust, readiness input validation,
  blocker evaluation, token validation/acceptance/consumption, approval, file
  writes, workspace mutation, command execution, build output, package
  creation, process startup, and runtime registration disabled.
- P25.50 defines package materialization approval execution handoff policy
  while keeping handoff preparation/queueing/storage/validation, execution job
  creation/queueing/dispatch, owner selection/notification, token
  validation/acceptance/consumption, approval, file writes, workspace
  mutation, command execution, build output, package creation, process
  startup, and runtime registration disabled.
- P25.51 defines package materialization approval post-handoff audit policy
  while keeping audit record preparation/validation/storage/publication/export/write,
  handoff snapshot capture, execution job snapshot capture, audit sink
  selection/notification, token validation/acceptance/consumption, approval,
  file writes, workspace mutation, command execution, build output, package
  creation, process startup, and runtime registration disabled.
- P25.52 defines package materialization approval audit retention policy while
  keeping retention policy selection, retention window computation, trusted
  clocks, retention record/index storage, archive storage, purge scheduling
  and execution, export writes, audit writes, approval, file writes, workspace
  mutation, command execution, build output, package creation, process startup,
  and runtime registration disabled.
