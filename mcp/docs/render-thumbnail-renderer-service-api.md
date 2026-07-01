# Render Thumbnail Renderer Service API

Status: P25.10 API fixtures, MCP/CLI dry-run/client boundaries, and
metadata-only availability probes defined; executable runtime registration
remains blocked.

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
- extend MCP tests from dry-run/unavailable planning into auth forwarding,
  resource metadata, and renderer-service error responses
- add CLI smoke tests for dry-run, execution metadata, `--output`, and missing
  token behavior

`render-thumbnail-renderer-service-fixtures.json` is the canonical fixture
matrix for the API shape.
