# Penpot Renderer Service

This private workspace package establishes the local HTTP boundary for staged
`render.thumbnail` execution.

The current no-op host implements only:

- `GET /health`, returning the P25.24 health contract.
- `POST /thumbnail`, validating the executable request contract and returning a
  normalized fixture PNG resource without rendering Penpot scene data.
- `GET /assets/by-id/noop-thumbnail-png`, serving the fixture PNG resource.

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
metadata in thumbnail responses. File-target cache probes and source-data reads
run only on the gated thumbnail path; tagged-frame source-data reads,
thumbnail persistence, and real scene rendering remain disabled.
