# Existing MCP User Migration Notes

Status: current migration guide
Target fork: `penpot-cli` based on Penpot `2.15.4`

These notes are for existing Penpot MCP users moving to the first-class MCP
model in this fork. The main change is operational: MCP becomes a built-in
Penpot capability with a global lifecycle, documented gateway routes, and
persisted user connection preferences.

## What Changes

| Before | After |
| --- | --- |
| MCP often required project-local MCP client configuration | Penpot exposes a stable public gateway under `/mcp/*` |
| Users commonly copied raw local ports such as `4401` or `4402` | Normal clients use `/mcp/stream`; plugin WebSocket traffic uses `/mcp/ws` |
| Plugin connection was tied to opening a design file | MCP can connect globally after login, then bind a file context when needed |
| Configuration lived mostly in runtime env vars or manual client setup | User preferences can live in `profile.props.mcp-config` |
| `execute_code` was part of the common workflow | Typed tools are the default; `execute_code` is opt-in through env |

## Compatibility Summary

Existing data is intentionally compatible:

- `profile.props.mcp-enabled` remains the on/off switch.
- Missing `profile.props.mcp-config` means built-in gateway defaults.
- `{:mcp-config nil}` resets a user to built-in defaults.
- MCP tokens stay in access-token rows with `type = "mcp"`; tokens are not
  stored in profile props.
- Unknown config modes fall back to built-in behavior in the frontend.
- Partial custom URLs derive missing endpoints from `public-uri` or runtime
  defaults.
- `penpot-cli mcp config` keeps legacy camelCase URL fields in JSON output for
  scripts and also reports a `profileProps.mcp-config` view.

## Users With Only `:mcp-enabled`

No manual data migration is required for users whose profile props only contain:

```clojure
{:mcp-enabled true}
```

On first use, they keep built-in defaults:

```text
stream:    <public>/mcp/stream
sse:       <public>/mcp/sse
websocket: <public>/mcp/ws
status:    <public>/mcp/status
```

If they open Integrations settings and save custom MCP preferences, Penpot adds
`profile.props.mcp-config`. If they reset to built-in defaults, Penpot removes
the nested config again by writing `{:mcp-config nil}`.

## Project-Local MCP Client Configs

Older workflows often configured each project or agent workspace with a local
MCP URL. Migrate those clients to the Penpot public gateway URL:

```text
https://penpot.example.com/mcp/stream?userToken=YOUR_MCP_KEY
```

For legacy SSE-only clients:

```text
https://penpot.example.com/mcp/sse?userToken=YOUR_MCP_KEY
```

Keep the token per user. Do not copy another user's MCP token into shared
project files. For clients that support workspace-level MCP config, prefer a
private local override or secret storage for `YOUR_MCP_KEY`.

## Environment-Only Self-Hosted Config

Self-hosted operators can keep runtime env configuration. The recommended
gateway environment shape is:

```text
PENPOT_PUBLIC_URI=https://penpot.example.com
PENPOT_MCP_PUBLIC_URI=https://penpot.example.com
```

Use explicit endpoint overrides only when the public gateway is non-standard:

```text
PENPOT_MCP_STREAM_URI=https://mcp.example.com/mcp
PENPOT_MCP_SSE_URI=https://mcp.example.com/sse
PENPOT_MCP_WEBSOCKET_URI=https://mcp.example.com/ws
PENPOT_MCP_STATUS_URI=https://mcp.example.com/status
```

`PENPOT_MCP_URI` and `PENPOT_MCP_URI_WS` are frontend nginx upstreams to the
internal MCP service. They should normally stay internal, for example
`http://penpot-mcp:4401` and `http://penpot-mcp:4402`.

## Direct Port Users

Local standalone MCP development can still use:

```text
http://localhost:4401/mcp
http://localhost:4401/sse
ws://localhost:4402
http://localhost:4401/status
```

For shared self-hosted instances, replace direct-port client URLs with the
public gateway paths. Raw ports are implementation details in built-in gateway
deployments and should not be part of normal user instructions.

## Existing Tokens

Existing MCP tokens continue to work if they are not expired. Token behavior is
unchanged:

- MCP clients pass the token as `userToken` in the MCP endpoint URL.
- Backend-backed tools use that token as the Penpot access token for normal
  permission checks.
- Tokens are not persisted in `profile.props.mcp-config`.
- Regenerating or deleting the MCP key in Integrations settings affects client
  access exactly as before.

After migrating client URLs, verify the token by calling:

```bash
node penpot-cli/dist/index.js mcp status \
  --url https://penpot.example.com/mcp/status
```

Then connect the MCP client with:

```text
https://penpot.example.com/mcp/stream?userToken=YOUR_MCP_KEY
```

## Existing Plugin Habits

Users no longer need to manually load the plugin from
`http://localhost:4400/manifest.json` in normal built-in deployments. The
bundled plugin is packaged into the frontend asset tree at:

```text
/plugins/mcp/manifest.json
/plugins/mcp/mcp-plugin.json
```

Manual local plugin loading remains useful for MCP package development only.

## Existing `execute_code` Workflows

Typed MCP tools are the default path for normal automation. The legacy
`execute_code` tool is disabled unless the MCP server starts with:

```text
PENPOT_MCP_ENABLE_EXECUTE_CODE=true
```

Migrate repeatable workflows to typed file, page, shape, prototype, export, and
render tools where possible. Keep `execute_code` for trusted debugging or
advanced local development.

## Verification Checklist

- `PENPOT_FLAGS` contains `enable-mcp` for built-in deployments.
- `/mcp/status` returns token-safe server status.
- `/plugins/mcp/manifest.json` and `/plugins/mcp/mcp-plugin.json` are served.
- Penpot Integrations settings show built-in, custom, or local mode correctly.
- Existing users with only `:mcp-enabled` can still enable and connect MCP.
- User tokens are not present in `profile.props.mcp-config`.
- Project-local client configs now point to `/mcp/stream` or `/mcp/sse`.
- Direct `4401` and `4402` URLs are used only for local standalone development.

For the self-hosted gateway setup path, see
[`self-hosted-mcp-gateway.md`](self-hosted-mcp-gateway.md).
