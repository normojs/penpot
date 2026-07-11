# Penpot Renderer Service

This private workspace package establishes the local HTTP boundary for future
`render.thumbnail` execution.

The current no-op host implements only:

- `GET /health`, returning the P25.24 health contract.
- `POST /thumbnail`, returning `501 renderer_service_noop` without rendering or
  writing an artifact.

Build output is intentionally kept outside the repository at
`/Volumes/fushilu/.caches/penpot/renderer-service`.

Run the host manually with:

```sh
pnpm --filter @penpot/renderer-service start:noop
```

The host defaults to `127.0.0.1:6070`. Set
`PENPOT_RENDERER_SERVICE_HOST` and `PENPOT_RENDERER_SERVICE_PORT` to override
the bind address. MCP and CLI rendering remain disabled in this phase.
