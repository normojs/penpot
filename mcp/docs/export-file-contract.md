# Export File Contract

Status: P25.2 descriptor-only contract.

This document defines the planned `export.file` archive contract before MCP,
CLI, or adapter execution is enabled. The current implementation must remain
non-executable until a later task registers a backend-rpc adapter and tests the
stream/resource path end to end.

## Existing Penpot Surface

File-level `.penpot` export already exists in the product through the backend
`export-binfile` RPC/SSE command:

```clojure
{:file-id <file-id>
 :include-libraries <boolean>
 :embed-assets <boolean>}
```

The backend checks read permissions for the file, runs the binary file export,
stores a temporary ZIP object, and returns a resource URI. This is separate
from the exporter service used by `export.page` and `render.preview`.

`export.file` therefore maps to backend file export semantics, not exporter
`export-shapes`.

## Command Request

Canonical command input:

```json
{
  "fileId": "uuid",
  "format": "penpot",
  "libraryMode": "all",
  "output": "optional/path/file.penpot",
  "adapter": "auto"
}
```

Supported `libraryMode` values:

| Mode | Backend `include-libraries` | Backend `embed-assets` | Meaning |
| --- | --- | --- | --- |
| `all` | `true` | `false` | Include linked libraries as separate library files. This matches the current UI default. |
| `merge` | `false` | `true` | Embed external library assets into the exported file. |
| `detach` | `false` | `false` | Export only the file and detach external libraries. |

The shared command-runtime helper also accepts the lower-level booleans
`includeLibraries` and `embedAssets` while normalizing to `libraryMode`.
`includeLibraries=true` and `embedAssets=true` is invalid because the backend UI
contract never produces that combination.

## Planned Response

Contract-only response shape:

```json
{
  "command": "export.file",
  "status": "contract",
  "executable": false,
  "adapter": null,
  "artifact": {
    "kind": "file-export",
    "format": "penpot",
    "mimeType": "application/zip",
    "extension": ".penpot",
    "libraryMode": "all"
  },
  "backendRpc": {
    "command": "export-binfile",
    "transport": "sse",
    "response": "resource-uri"
  }
}
```

The executable version should wrap the resource URI in the normal command
result envelope, optionally download it when `output` is supplied, and report
the final artifact path or resource metadata.

## Runtime Boundaries

- `@penpot/command-runtime` exposes `createExportFileContract` and fixture
  coverage for the request mapping.
- The `export.file` descriptor keeps `adapters: []`.
- MCP must not register `export.file` until backend-rpc SSE/resource handling
  is implemented for this command.
- `penpot-cli` must not add `export file` until it can stream the backend result
  and download the returned URI without relying on a live browser workspace.
- Exporter service execution is out of scope for this command.

## Fixtures

`export-file-contract-fixtures.json` is the canonical fixture matrix for:

- default `all` export
- `merge` export
- `detach` export
- missing `fileId` target reporting

The command-runtime test suite consumes the fixture directly.
