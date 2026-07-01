# Render Thumbnail Contract

Status: P25.4 descriptor contract; P25.11 MCP/CLI renderer-service dry-run
boundaries, metadata-only availability probes, and response normalization
contracts defined; runtime execution still blocked.

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
`render-thumbnail-renderer-service-fixtures.json` for the P25.11 future
renderer-service request/response API, MCP/CLI dry-run/client boundary, and
metadata-only availability probe plus response/error normalization.

## Fixtures

`render-thumbnail-contract-fixtures.json` is the canonical fixture matrix for:

- default dashboard file thumbnail
- refreshed dashboard file thumbnail with custom width
- tagged frame thumbnail object-key mapping
- missing frame target requirements

The command-runtime test suite consumes the fixture directly.
