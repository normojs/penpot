# Export File Contract

Status: P25.3 CLI backend-rpc executable contract; MCP registration pending.

This document defines the `export.file` archive contract. `penpot-cli export
file` now executes it through backend-rpc/SSE and can download the returned
resource with `--output`. MCP `export.file` remains unregistered until the MCP
backend-rpc resource return path is implemented.

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

## Response

Shared contract shape:

```json
{
  "command": "export.file",
  "status": "contract",
  "executable": true,
  "adapter": "backend-rpc",
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

The CLI executable response wraps the resource URI in the normal command result
shape, optionally downloads it when `output` is supplied, and reports the final
artifact path or resource metadata.

## Runtime Boundaries

- `@penpot/command-runtime` exposes `createExportFileContract` and fixture
  coverage for the request mapping.
- The `export.file` descriptor advertises `cliCommand: "export file"` and the
  `backend-rpc` adapter for CLI execution.
- MCP must not register `export.file` until MCP-side backend-rpc SSE/resource
  handling is implemented for this command.
- `penpot-cli export file` calls backend `export-binfile`, reads the SSE `end`
  resource URI, and downloads the returned URI when `--output` is supplied.
- Exporter service execution is out of scope for this command.

## Fixtures

`export-file-contract-fixtures.json` is the canonical fixture matrix for:

- default `all` export
- `merge` export
- `detach` export
- missing `fileId` target reporting

The command-runtime test suite consumes the fixture directly.
