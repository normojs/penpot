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
  `PENPOT_RENDERER_SERVICE_RUNTIME_MODULE`; adapters may also export `close`
  for service shutdown cleanup.
- Optional browser-backed fixture runtime loading via
  `PENPOT_RENDERER_SERVICE_BROWSER_FIXTURE_RUNTIME=enabled`. This starts a
  Playwright Chromium instance, draws a fixture canvas PNG, and validates
  browser startup/reuse/shutdown without claiming real Penpot scene rendering.
- Redacted `browserFixtureRuntime` diagnostics on `/health` and `/thumbnail`
  that report configuration, startup, render counts, page reuse, PNG
  validation, close state, side effects, and omitted-field markers without
  exposing paths, source/page data, artifact/media bytes, or token values.
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
Set `PENPOT_RENDERER_SERVICE_BROWSER_FIXTURE_RUNTIME=enabled` to opt into the
P26.30 browser-backed fixture adapter instead of `PENPOT_RENDERER_SERVICE_RUNTIME_MODULE`;
the two runtime sources are mutually exclusive. Keep Playwright browser
binaries under the shared cache, for example
`PLAYWRIGHT_BROWSERS_PATH=/Volumes/fushilu/.caches/ms-playwright`.
When enabled, `/health` and `/thumbnail` expose a redacted
`browserFixtureRuntime` lifecycle summary for the fixture adapter. The summary
is diagnostic metadata only and does not expose browser paths, runtime module
paths, workspace/cache roots, source data, page data, artifact bytes, media
bytes, or tokens.

`/health` and `/thumbnail` also expose the staged runtime asset materialization
surfaces: read-only preflight summaries, metadata-only dry-run copy/cache
plans, the disabled approval token/config/audit scaffold, and the P26.29
`runtimeAssetMaterializationApproval.readinessVerdict`. That verdict is only a
blocked readiness summary; it does not read or accept approval tokens, write
audit records, materialize cache assets, start browsers, register runtime
execution, or enable backend/network dispatch.
