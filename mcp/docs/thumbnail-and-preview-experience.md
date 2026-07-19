# Thumbnail And Preview Experience (Phase 31)

Status: **product policy for private 0.1.x / post–Phase 30**.  
This document is the agent vs operator matrix for visual output. It does **not**
claim full `render.thumbnail` GA.

Related:

- [`render-thumbnail-contract.md`](./render-thumbnail-contract.md)  
- [`render-thumbnail-renderer-service-api.md`](./render-thumbnail-renderer-service-api.md)  
- [`private-release-0.1.0.md`](./private-release-0.1.0.md)  
- [`standalone-install.md`](./standalone-install.md)  
- [`command-runtime-inventory.md`](./command-runtime-inventory.md)  

## P31.1 Default Enablement Policy

### Product rule

| Surface | Default for **agents** | Default for **operators** |
| --- | --- | --- |
| `render.preview` | **Supported** for explicit file/page/object targets via exporter | Same |
| `export.page` / `export.shape` / `export.file` | **Supported** per inventory contracts | Same |
| `render.thumbnail` | **Not default-GA** — do not promise dashboard thumbnails without operator setup | **Operator path**: endpoint-first when renderer-service is configured |
| Live plugin visual capture | Requires bound browser plugin session | Same |

**Default policy for `render.thumbnail`:**

1. **Agents** should prefer `render.preview` or export tools for visual proof.
2. **Thumbnail execution** is available only when a **renderer-service endpoint**
   is configured (endpoint-first). There is no silent “always on” MCP default.
3. Operators may close the gate explicitly with  
   `PENPOT_RENDER_THUMBNAIL_EXECUTION=disabled` (or `off` / `false` / `0` / `no`).
4. Dry-run (`--dry-run` / MCP planning) remains **network-free** and always safe
   for inspecting the request shape.
5. Multi-frame / tagged-frame matrix expansion is **optional** (P31.5) and not
   required for private 0.1.x claims.

### Why not full thumbnail GA

- Rendering depends on a separate **renderer-service** host and asset/runtime
  gates, not on the MCP process alone.
- Backend thumbnail RPCs authorize/load/persist; they do **not** produce PNG
  bytes by themselves.
- Claiming GA without a stable operator happy path produces false agent confidence.

## P31.4 Preview vs Thumbnail Narrative

| Command | Purpose | Adapter | Typical use |
| --- | --- | --- | --- |
| **`render.preview`** | Raster preview of an **explicit** page/object for agents | `exporter` / `plugin-live` (context-bound) | “Show me this frame as PNG now” |
| **`export.page` / `export.shape`** | Export shape/page data or files | exporter / plugin-live / backend-rpc | Artifacts, handoff, archives |
| **`export.file`** | Whole `.penpot` archive | `backend-rpc` | File download/backup |
| **`render.thumbnail`** | **Dashboard-style** file or tagged-frame thumbnail (cache/persist semantics) | `renderer-service` | File list thumbnails, refresh cache |

Rules of thumb:

- Need a **one-off visual** of a known object → `render.preview` or export.  
- Need **dashboard thumbnail** cache/key/persist behavior → `render.thumbnail`
  (operator-configured renderer-service).  
- Do **not** use `render.thumbnail` as a substitute for exporter preview.

## P31.2 File-Target Happy Path (Operator)

Prefer **file** target before multi-frame matrix.

### Prerequisites

1. Penpot backend reachable (auth token for CLI/MCP as needed).  
2. `@penpot/renderer-service` (or compatible host) listening.  
3. Node ≥ 18 for CLI.

### Minimal env / flags

```bash
# Renderer HTTP endpoint (example local default)
export PENPOT_RENDERER_SERVICE_URI=http://localhost:6070/thumbnail

# Optional: force-close execution even if endpoint is set
# export PENPOT_RENDER_THUMBNAIL_EXECUTION=disabled

export PENPOT_CLI_TOKEN=...          # if backend auth required for related RPCs
export PENPOT_PUBLIC_URI=http://localhost:3449
```

### CLI happy path

```bash
# 1) Inspect plan without network (always safe)
penpot-cli render thumbnail \
  --file <file-id> \
  --target file \
  --dry-run \
  --format json

# 2) Execute file thumbnail when endpoint is up
penpot-cli render thumbnail \
  --file <file-id> \
  --target file \
  --renderer-service-uri http://localhost:6070/thumbnail \
  --format json

# Optional: write PNG when execution returns a downloadable resource
penpot-cli render thumbnail \
  --file <file-id> \
  --target file \
  --renderer-service-uri http://localhost:6070/thumbnail \
  --output /tmp/file-thumb.png \
  --format json
```

### MCP happy path

1. Ensure server process can reach `PENPOT_RENDERER_SERVICE_URI`.  
2. Call `render.thumbnail` with `fileId` and `target: "file"` (or omit frame ids).  
3. On success, treat returned resource metadata as **metadata-first**; download
   semantics differ for CLI `--output` vs MCP.  
4. On failure, follow [P31.3](#p313-failure-ux-unavailable-renderer) actions.

### Starting renderer-service (operator)

From the fork checkout (not in CLI tar):

```bash
# See package docs / penpot-cli renderer-service commands
penpot-cli renderer-service status --format json
# Manual or controlled spawn per P26.54 — default remains no auto-daemon for MCP
```

Do not assume MCP auto-starts renderer-service.

### Expected failures on the happy path

| Situation | Typical code | Agent should |
| --- | --- | --- |
| No endpoint / closed gate | `renderer_service_unavailable` / `renderer_service_execution_disabled` | Fall back to `render.preview` or export; tell operator to configure URI |
| Service down | `renderer_service_health_unavailable` / `renderer_service_unavailable` | Retry later; point to health/logs |
| Bad frame args | `page_id_required` / `object_id_required` | Fix inputs; use file target if unsure |
| Auth missing for related backend | auth errors | Supply token |

## P31.3 Failure UX (Unavailable Renderer)

Stable primary code: **`renderer_service_unavailable`** (and related stage codes).

### Required operator actions (user-facing)

When thumbnail execution fails because the renderer path is not ready, responses
should steer users to:

1. **Use dry-run** to inspect the planned request without contacting the service.  
2. **Configure** `PENPOT_RENDERER_SERVICE_URI` / `--renderer-service-uri`.  
3. **Check health** of renderer-service and its logs.  
4. **Prefer** `render.preview` or `export.page` for exporter-backed visuals.  
5. **Read** this doc: `mcp/docs/thumbnail-and-preview-experience.md`.

Implementation note: shared
`createRenderThumbnailRendererServiceErrorPayload` includes these actions so
MCP and CLI stay aligned.

### Codes agents may see

| Code | Meaning |
| --- | --- |
| `renderer_service_unavailable` | Endpoint missing, closed, or request failed |
| `renderer_service_not_configured` | No endpoint configuration |
| `renderer_service_execution_disabled` | Gate closed / dispatch false |
| `renderer_service_health_unavailable` | Health preflight failed (often retryable) |
| `renderer_service_error` | Service returned non-OK |
| `renderer_service_response_invalid` | Non-JSON or malformed body |

## Agent Guidance (Copy-Paste)

```text
For visuals: prefer render.preview or export.* with explicit ids.
Use render.thumbnail only if the operator has configured renderer-service
(PENPOT_RENDERER_SERVICE_URI) and you need dashboard thumbnail semantics.
If you get renderer_service_unavailable, do not loop: fall back to preview/export
and surface the operator setup doc mcp/docs/thumbnail-and-preview-experience.md.
Never treat ToolNames presence as full thumbnail GA.
```

## P31.5 Multi-Target Matrix (Optional, Non-Blocking)

Out of scope for private 0.1.x “done”:

- Exhaustive tagged-frame + file cache matrix in CI  
- Multi-object batch thumbnails  
- Auto-spawn renderer for every MCP process  

Track as optional hardening after the file-target happy path is trusted.

## Phase 31 Exit Criteria

| ID | Criterion |
| --- | --- |
| P31.1 | Agent vs operator matrix written (this doc) |
| P31.2 | One file-target happy path with env/flags documented |
| P31.3 | Unavailable-renderer actions point at dry-run, config, preview/export, and this doc |
| P31.4 | Preview vs thumbnail narrative explicit |
| P31.5 | Optional; not required for Phase 31 “docs complete” |

## What We Still Do Not Claim

- Default-on thumbnails for all MCP agents  
- Thumbnail path equal in reliability to exporter preview  
- Official Penpot product GA for rendering  
