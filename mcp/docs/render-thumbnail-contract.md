# Render Thumbnail Contract

Status: P25.4 descriptor contract; P25.30 MCP/CLI renderer-service dry-run
boundaries, metadata-only availability probes, response normalization
contracts, disabled client request scaffolding, closed execution gate, disabled
health preflight, executable client harness plan, and dispatch adapter boundary
plus opt-in configuration surfaces, unavailable error taxonomy, and integration
fixture harness plus dispatch registration preflight and executable adapter
registration scaffold plus adapter registry manifest and final enablement
checklist plus implementation slice audit and health/no-op contract fixtures
plus no-op service host scaffold, host lifecycle test fixtures, and package
manifest scaffold plus package creation guardrails, package file templates, and
package workspace wiring defined; runtime execution still blocked.

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
`render-thumbnail-renderer-service-fixtures.json` for the P25.30 future
renderer-service request/response API, MCP/CLI dry-run/client boundary, and
metadata-only availability probe plus response/error normalization and disabled
client request, execution gate, health preflight, and execution harness
scaffolding, plus the dispatch adapter boundary, opt-in configuration surfaces,
unavailable error taxonomy, integration fixture harness, and dispatch
registration preflight plus executable adapter registration scaffold and
adapter registry manifest plus enablement checklist and implementation slice
audit plus health/no-op contract fixtures, no-op service host scaffold, and
host lifecycle test fixtures plus package manifest scaffold, package creation
guardrails, package file templates, and package workspace wiring.

## Fixtures

`render-thumbnail-contract-fixtures.json` is the canonical fixture matrix for:

- default dashboard file thumbnail
- refreshed dashboard file thumbnail with custom width
- tagged frame thumbnail object-key mapping
- missing frame target requirements

The command-runtime test suite consumes the fixture directly.
