# Manual MCP Configuration Audit

This audit records the current MCP configuration and persistence paths before
implementing persistent manual configuration.

## Current State

### Runtime URL Defaults

Frontend MCP URLs are currently derived in `frontend/src/app/config.cljs`:

- `cf/mcp-public-uri` uses `globalThis.penpotMcpPublicURI` or `cf/public-uri`.
- `cf/mcp-server-url` uses `globalThis.penpotMcpStreamURI` or
  `<mcp-public-uri>/mcp/stream`.
- `cf/mcp-sse-uri` uses `globalThis.penpotMcpSseURI` or
  `<mcp-public-uri>/mcp/sse`.
- `cf/mcp-ws-uri` uses `globalThis.penpotMcpWebSocketURI`, the legacy
  `globalThis.penpotMcpServerURI`, or `<mcp-public-uri>/mcp/ws`.
- `cf/mcp-status-uri` uses `globalThis.penpotMcpStatusURI` or
  `<mcp-public-uri>/mcp/status`.

Docker injects those globals from `PENPOT_MCP_PUBLIC_URI`,
`PENPOT_MCP_STREAM_URI`, `PENPOT_MCP_SSE_URI`,
`PENPOT_MCP_WEBSOCKET_URI`, and `PENPOT_MCP_STATUS_URI` in
`docker/images/files/nginx-entrypoint.sh`. The reverse proxy exposes `/mcp/ws`,
`/mcp/stream`, `/mcp/sse`, and `/mcp/status` when the `enable-mcp` flag is
present.

`penpot-cli mcp config` has an independent but similar URL derivation model:

- `PENPOT_MCP_PUBLIC_URI` defaults to `http://localhost:3449`.
- `PENPOT_MCP_STREAM_URI` overrides `<public>/mcp/stream`.
- `PENPOT_MCP_SSE_URI` overrides `<public>/mcp/sse`.
- `PENPOT_MCP_WEBSOCKET_URI` overrides `<public>/mcp/ws`.
- `PENPOT_MCP_STATUS_URI` overrides `<public>/mcp/status`.

### Persisted User State

The on/off state remains the compatibility switch:

```clojure
{:mcp-enabled true}
```

P9.2 adds an optional nested connection config profile prop:

```clojure
{:mcp-config {:mode "builtin"       ;; builtin | custom | local
              :auto-connect true
              :public-uri nil
              :stream-uri nil
              :sse-uri nil
              :websocket-uri nil
              :status-uri nil}}
```

Frontend writes it with `du/update-profile-props` from the Integrations
settings page and MCP key modals. Backend accepts both `:mcp-enabled` and
`:mcp-config` through `backend/src/app/rpc/commands/profile.clj` in
`schema:props`.

`update-profile-props` merges simple profile props into the profile row, removes
keys whose value is `nil`, and ignores namespaced keys. Reset-to-built-in can
therefore remove the whole config by sending `{:mcp-config nil}`.

MCP access tokens are stored separately as access-token rows with
`type = "mcp"`. `get-current-mcp-token` returns the first non-expired MCP token
for the current profile. The token should remain separate from profile props;
the manual config should only store connection preferences.

### Lifecycle And UI Usage

`frontend/src/app/main/data/mcp.cljs` keeps `:profile :props :mcp-enabled` as
the only persisted gate:

- app initialization starts MCP only when the `:mcp` feature flag is present
  and `:mcp-enabled` is true
- `init-mcp` passes the effective `:websocket-uri` to the bundled plugin
- diagnostics fetch the effective `:status-uri`
- reconnect watcher activation follows the enabled state, not a separate
  `auto-connect` setting

`frontend/src/app/main/ui/settings/integrations.cljs` currently exposes:

- generate/regenerate/delete MCP key
- enable/disable switch
- built-in/custom/local connection mode editing with endpoint preview
- reset-to-built-in and save actions for `profile.props.mcp-config`
- copied MCP stream URL with `?userToken=<token>` derived from the effective
  `:stream-uri`
- diagnostics refresh panel

The workspace menu reads the same `:mcp-enabled` profile prop and current
ephemeral `:mcp` state for connect/disconnect and bind/release controls.

## Gaps

- Persisted connection mode and URL preferences exist, but the global lifecycle
  still treats enabled MCP as an immediate startup signal.
- `auto-connect` is now persisted but not yet applied. Enabled MCP still
  attempts global startup after login; P9.4 owns connection/disconnection
  behavior.
- Frontend URL derivation and CLI URL derivation are similar but not shared as a
  documented product model.
- `penpot-cli mcp config` still derives URLs from environment variables rather
  than persisted user profile props.

## Proposed Persistent Model

Keep `:mcp-enabled` as the compatibility switch and add a single optional
profile prop for connection preferences:

```clojure
{:mcp-enabled true
 :mcp-config {:mode "builtin"       ;; builtin | custom | local
              :auto-connect true
              :public-uri nil       ;; optional base for derived gateway URLs
              :stream-uri nil       ;; MCP client stream URL
              :sse-uri nil          ;; legacy client SSE URL
              :websocket-uri nil    ;; bundled plugin WebSocket URL
              :status-uri nil}}     ;; diagnostics URL
```

Guidelines:

- Treat `:mcp-enabled` as the master on/off value for backward compatibility.
- Treat `:mcp-config` as optional; missing config means built-in defaults.
- Store only user preferences, never MCP token values.
- Use strings for `:mode` and URLs to match existing profile-prop schemas and
  JSON/Transit clients.
- Omit unset nested URL fields from `:mcp-config`; reset-to-built-in can remove
  the whole config by sending `{:mcp-config nil}` through
  `update-profile-props`.

## Effective Config Rules

The frontend should compute an effective config from runtime defaults plus the
profile config:

1. Build runtime defaults from the current `cf/mcp-*` values.
2. Read `profile.props.mcp-config`.
3. If mode is missing, use `"builtin"`.
4. In `"builtin"` mode, use runtime defaults and ignore custom URL fields.
5. In `"local"` mode, default to standalone local endpoints:
   - stream: `http://localhost:4401/mcp`
   - SSE: `http://localhost:4401/sse`
   - WebSocket: `ws://localhost:4402`
   - status: `http://localhost:4401/status`
6. In `"custom"` mode, use explicit URL fields, with `public-uri` as an
   optional base for deriving missing gateway-style paths.
7. `auto-connect` defaults to true when missing, preserving current behavior.

`mcp.cljs`, the Integrations settings page, workspace menu status, and
diagnostics should all read this effective config instead of reading `cf/*`
URLs directly.

## Development Order

1. Done in P9.2: add backend schema support for `:mcp-config`, runtime
   SSE/status overrides, frontend runtime defaults/effective config helpers,
   diagnostics/plugin/client URL consumers, and focused backend/frontend tests.
2. Done in P9.3: wire settings UI controls to save mode, auto-connect, and URL
   overrides, including a reset-to-built-in action and effective endpoint
   preview.
3. Apply `auto-connect` to global MCP lifecycle.
4. Update `penpot-cli mcp config` docs so the CLI env names match the same
   product model.
