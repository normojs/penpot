# Self-Hosted MCP Gateway Setup

Status: current self-hosted operator guide
Target fork: `penpot-cli` based on Penpot `2.15.4`

This guide describes the supported self-hosted MCP deployment shape for this
fork. The recommended path is built-in gateway mode: Penpot serves MCP under
the same public origin as the frontend, while raw MCP ports stay internal.

Existing MCP users upgrading from project-local configs, direct ports, or
environment-only setup should also read
[`existing-mcp-user-migration.md`](existing-mcp-user-migration.md).

## Supported Shape

Public self-hosted Penpot should expose these paths:

| Public path | Purpose | Upstream |
| --- | --- | --- |
| `/mcp/stream` | Streamable HTTP MCP client endpoint | MCP server `/mcp` |
| `/mcp/sse` | Legacy SSE MCP client endpoint | MCP server `/sse` |
| `/mcp/ws` | Bundled MCP plugin WebSocket endpoint | MCP WebSocket server |
| `/mcp/status` | Token-safe diagnostics endpoint | MCP server `/status` |
| `/plugins/mcp/manifest.json` | Bundled MCP plugin manifest | Frontend static assets |
| `/plugins/mcp/mcp-plugin.json` | Bundled MCP plugin metadata | Frontend static assets |

Ports `4401` and `4402` are internal service ports in built-in deployments.
Users and MCP clients should not need to configure them directly.

## Docker Compose Built-In Mode

Use built-in mode for normal self-hosted installs.

1. Enable MCP in the frontend flags:

   ```yaml
   PENPOT_FLAGS: disable-email-verification enable-smtp enable-prepl-server disable-secure-session-cookies enable-mcp
   ```

2. Run the MCP service on the internal Docker network:

   ```yaml
   penpot-mcp:
     image: penpotapp/mcp:${PENPOT_VERSION:-2.15}
     environment:
       PENPOT_BACKEND_URI: http://penpot-backend:6060
   ```

3. Keep frontend-to-MCP upstreams internal:

   ```yaml
   PENPOT_MCP_URI: http://penpot-mcp:4401
   PENPOT_MCP_URI_WS: http://penpot-mcp:4402
   ```

   These values can usually be omitted because the frontend entrypoint defaults
   to the internal `penpot-mcp` service when `enable-mcp` is present.

4. Set the public Penpot origin:

   ```yaml
   PENPOT_PUBLIC_URI: https://penpot.example.com
   PENPOT_MCP_PUBLIC_URI: https://penpot.example.com
   ```

   `PENPOT_MCP_PUBLIC_URI` is optional when it matches `PENPOT_PUBLIC_URI`.
   It is useful when the MCP public gateway is served from a different public
   base than the rest of Penpot.

With this shape, the frontend runtime config derives:

```text
stream:    https://penpot.example.com/mcp/stream
sse:       https://penpot.example.com/mcp/sse
websocket: https://penpot.example.com/mcp/ws
status:    https://penpot.example.com/mcp/status
```

## Reverse Proxy Requirements

The public reverse proxy in front of `penpot-frontend` must preserve the MCP
paths above.

- Forward `/mcp/ws` with WebSocket upgrade headers.
- Do not buffer `/mcp/stream` or `/mcp/sse`; both can keep long-lived
  responses open.
- Use read timeouts long enough for MCP client sessions.
- Serve `/plugins/mcp/manifest.json` and `/plugins/mcp/mcp-plugin.json` from
  the same public Penpot origin as the frontend.
- Keep `4401` and `4402` unexposed unless you are deliberately debugging an
  internal deployment.

The Penpot frontend image installs the MCP nginx locations only when
`PENPOT_FLAGS` contains `enable-mcp`. Without that flag, `/mcp/*` routes are
not created.

## Runtime Config Modes

Penpot settings and `penpot-cli mcp config` use the same mode names.

| Mode | Use case | URL behavior |
| --- | --- | --- |
| `builtin` | Normal hosted or self-hosted gateway | Derive `/mcp/stream`, `/mcp/sse`, `/mcp/ws`, and `/mcp/status` from the Penpot public origin |
| `custom` | External MCP gateway or non-standard proxy shape | Use explicit `PENPOT_MCP_STREAM_URI`, `PENPOT_MCP_SSE_URI`, `PENPOT_MCP_WEBSOCKET_URI`, and `PENPOT_MCP_STATUS_URI` overrides, or derive from `PENPOT_MCP_PUBLIC_URI` |
| `local` | Developer runs MCP directly on a workstation | Use `http://localhost:4401/mcp`, `http://localhost:4401/sse`, `ws://localhost:4402`, and `http://localhost:4401/status` |

`builtin` is the supported default for self-hosted operators. `custom` is for
advanced reverse-proxy topologies. `local` is for package development and is
not recommended for a shared self-hosted service.

## Client Configuration

Create or copy the user's MCP token from Penpot settings, then configure MCP
clients with the public stream endpoint:

```text
https://penpot.example.com/mcp/stream?userToken=YOUR_MCP_KEY
```

For clients that still require SSE:

```text
https://penpot.example.com/mcp/sse?userToken=YOUR_MCP_KEY
```

The WebSocket endpoint is for the bundled Penpot MCP plugin:

```text
https://penpot.example.com/mcp/ws
```

Normal MCP clients should use the stream endpoint unless they explicitly need
legacy SSE.

## Diagnostics

Check the public gateway:

```bash
curl https://penpot.example.com/mcp/status
curl https://penpot.example.com/plugins/mcp/manifest.json
curl https://penpot.example.com/plugins/mcp/mcp-plugin.json
```

Check the effective CLI view:

```bash
PENPOT_MCP_PUBLIC_URI=https://penpot.example.com \
  node penpot-cli/dist/index.js mcp config --format json

node penpot-cli/dist/index.js mcp status \
  --url https://penpot.example.com/mcp/status
```

For custom mode, pass explicit endpoint overrides before running
`mcp config`:

```bash
PENPOT_MCP_MODE=custom \
PENPOT_MCP_STREAM_URI=https://mcp.example.com/mcp \
PENPOT_MCP_SSE_URI=https://mcp.example.com/sse \
PENPOT_MCP_WEBSOCKET_URI=https://mcp.example.com/ws \
PENPOT_MCP_STATUS_URI=https://mcp.example.com/status \
  node penpot-cli/dist/index.js mcp config --format json
```

## Common Failures

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `404` from `/mcp/status` | `enable-mcp` is missing, or the frontend entrypoint did not install MCP nginx locations | Add `enable-mcp` to `PENPOT_FLAGS` and restart `penpot-frontend` |
| `502` from `/mcp/status` | `penpot-frontend` cannot reach `penpot-mcp`, or `PENPOT_MCP_URI` points at the wrong upstream | Check the Docker service name, network, and `PENPOT_MCP_URI` |
| Stream or SSE connects then stalls | Reverse proxy buffers or times out long-lived responses | Disable buffering and raise read timeouts for `/mcp/stream` and `/mcp/sse` |
| Plugin cannot connect | `/mcp/ws` is not upgraded as a WebSocket, or the public WebSocket URL is wrong | Preserve `Upgrade` and `Connection` headers and check `PENPOT_MCP_WEBSOCKET_URI` |
| `manifest.json` or `mcp-plugin.json` is missing | Frontend bundle does not include packaged MCP plugin assets, or `/plugins` is not served | Run the frontend bundle with P13.2 plugin asset packaging and keep `/plugins` routed |
| Global tools cannot list teams/projects/files | MCP service cannot reach the backend | Set `PENPOT_BACKEND_URI` inside `penpot-mcp` to the backend service URL |

## Operator Checklist

- `enable-mcp` is present in `PENPOT_FLAGS`.
- `penpot-mcp` is running on the same internal network as `penpot-frontend`.
- `PENPOT_BACKEND_URI` inside `penpot-mcp` points to the backend service.
- Public clients use `/mcp/stream?userToken=...`.
- `/mcp/ws` supports WebSocket upgrades.
- `/plugins/mcp/manifest.json` and `/plugins/mcp/mcp-plugin.json` return
  successful responses.
- `penpot-cli mcp status --url <public>/mcp/status` returns status JSON.
