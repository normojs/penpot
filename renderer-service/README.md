# Penpot Renderer Service

This private workspace package establishes the local HTTP boundary for staged
`render.thumbnail` execution.

The current host implements:

- `GET /health`, returning the P25.24 health contract.
- `POST /thumbnail`, validating the executable request contract and returning a
  normalized PNG resource.
- Optional injected renderer runtime adapters for file thumbnail source-data
  reads. Adapter PNG bytes are stored only in memory and served by resource URL.
- Optional local runtime adapter module loading via
  `PENPOT_RENDERER_SERVICE_RUNTIME_MODULE`.
- `GET /assets/by-id/noop-thumbnail-png`, serving the fixture PNG resource, and
  `GET /assets/by-id/{renderedMediaId}` for in-memory adapter artifacts.

Build output is intentionally kept outside the repository at
`/Volumes/fushilu/.caches/penpot/renderer-service`.

Run the host manually with:

```sh
pnpm --filter @penpot/renderer-service start:noop
```

The host defaults to `127.0.0.1:6070`. Set
`PENPOT_RENDERER_SERVICE_HOST` and `PENPOT_RENDERER_SERVICE_PORT` to override
the bind address. Set `PENPOT_RENDERER_SERVICE_BACKEND_URI`, or
`PENPOT_BACKEND_URI` as a fallback, to expose backend RPC endpoint planning
metadata in thumbnail responses. File-target cache probes, file source-data
reads, and tagged-frame refresh source-data reads run only on the gated
thumbnail path. Set
`PENPOT_RENDERER_SERVICE_RUNTIME_MODULE` to an absolute local path or `file:`
URL for an ES module that exports `renderThumbnail`; default manual hosts keep
the fixture PNG path. When a configured file-target or tagged-frame refresh
request renders through an adapter, the host can persist the PNG through the
matching backend thumbnail RPC and return backend resource metadata. Manual
hosts do not bundle a render-wasm bridge yet, so bundled real scene rendering
remains disabled.
