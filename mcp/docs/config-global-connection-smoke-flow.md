# MCP Config And Global Connection Smoke Flow

Status: P14.1 release-verification smoke flow
Target fork: `penpot-cli` based on Penpot `2.15.4`

This flow verifies that MCP behaves as a first-class, globally configured
Penpot capability. It covers the user path from enablement through mode
changes, auto-connect, manual connect/disconnect, status evidence, and disable.

Use this document with
[`regression-smoke-flows.md`](regression-smoke-flows.md) and
[`self-hosted-mcp-gateway.md`](self-hosted-mcp-gateway.md). The former remains
the broad MCP/CLI regression matrix; this document is the focused release check
for saved configuration and the background global connection lifecycle.

## Preconditions

- Penpot is running with the `enable-mcp` feature flag.
- The MCP server is reachable through the same public origin as Penpot in
  built-in mode, normally at `/mcp/status`, `/mcp/stream`, `/mcp/sse`, and
  `/mcp/ws`.
- The bundled MCP plugin assets are present at `/plugins/mcp/manifest.json` and
  `/plugins/mcp/mcp-plugin.json`.
- The test account can log in, open Settings, and create or reuse an MCP token.
- `penpot-cli` has been built when CLI checks are required.

Run the install/build check first when the local workspace has dependencies:

```bash
pnpm cli:install-check
```

If the local Clojure or frontend browser test toolchain is unavailable, keep
the TypeScript/CLI checks and record the manual UI evidence listed below. That
is a local tooling limitation, not a product failure.

## Static And CLI Checks

These commands do not require a workspace file to be open.

Check the built-in gateway derivation:

```bash
PENPOT_MCP_PUBLIC_URI=http://localhost:3449 \
  node penpot-cli/dist/index.js mcp config --format json
```

Expected evidence:

- `mode` is `builtin`.
- `autoConnect` is `true` unless explicitly overridden.
- `streamUrl`, `sseUrl`, `websocketUrl`, and `statusUrl` use
  `http://localhost:3449/mcp/*`.
- `profileProps.mcp-config` uses persisted-profile names such as
  `auto-connect`, `stream-uri`, `websocket-uri`, and `status-uri`.

Check custom gateway derivation:

```bash
PENPOT_MCP_MODE=custom \
PENPOT_MCP_PUBLIC_URI=https://penpot.example.com \
  node penpot-cli/dist/index.js mcp config --format json
```

Expected evidence:

- `mode` is `custom`.
- Missing endpoint overrides are derived from
  `https://penpot.example.com/mcp/*`.
- No token value appears in the output.

Check local developer defaults:

```bash
node penpot-cli/dist/index.js mcp config --mode local --format json
```

Expected evidence:

- `mode` is `local`.
- Stream and SSE use `http://localhost:4401`.
- WebSocket uses `ws://localhost:4402`.
- Status uses `http://localhost:4401/status`.

Check the public status endpoint when a stack is running:

```bash
node penpot-cli/dist/index.js mcp status \
  --url http://localhost:3449/mcp/status \
  --format json
```

Expected evidence:

- The command returns token-safe status JSON.
- Server, transport, plugin, and pending task counts are visible.
- The response contains no MCP token or session secret.

## Running Stack Checks

Check the public gateway and bundled plugin assets:

```bash
curl http://localhost:3449/mcp/status
curl http://localhost:3449/plugins/mcp/manifest.json
curl http://localhost:3449/plugins/mcp/mcp-plugin.json
```

Expected evidence:

- `/mcp/status` returns HTTP 200 with token-safe diagnostics.
- Plugin manifest and metadata return HTTP 200.
- Raw `4401` and `4402` ports are not required by the user-facing built-in
  flow.

For a self-hosted environment, replace `http://localhost:3449` with the public
Penpot origin.

## Manual UI Flow

Use one browser session for the primary user. A second tab is optional for
checking multi-tab owner behavior, but this P14.1 flow does not require a file
workspace to be open.

1. Log in and open Settings, then Integrations.
2. Enable MCP.
3. Create or reuse an MCP token.
4. Select built-in mode.
5. Confirm the endpoint preview shows the public Penpot gateway:
   `/mcp/stream`, `/mcp/sse`, `/mcp/ws`, and `/mcp/status`.
6. Save and refresh diagnostics.
7. Confirm the status panel can reach the effective status URL.
8. Select custom mode and set a public URI such as
   `https://penpot.example.com`.
9. Confirm the preview derives the four gateway endpoints from that public URI.
10. Save, then reset back to built-in mode.
11. Select local mode.
12. Confirm the preview shows `localhost:4401` stream/SSE/status and
    `localhost:4402` WebSocket defaults.
13. Return to built-in mode and save.
14. Turn auto-connect off and save.
15. Refresh the browser or log out and back in.
16. Confirm MCP remains enabled and the hidden plugin/manual controls are
    available, but the background plugin does not auto-connect.
17. Use the manual connect control.
18. Confirm diagnostics or `mcp.get_status` reports a compatible plugin
    connection in global mode, with no bound file context required.
19. Use the manual disconnect control.
20. Confirm status moves back to enabled/configured but disconnected.
21. Turn auto-connect on and save.
22. Refresh the browser or log out and back in.
23. Confirm the background MCP plugin connects automatically after login.
24. Disable MCP and save.
25. Confirm the plugin disconnects, generated client URLs are unavailable or
    disabled in the UI, and diagnostics/status reflect disabled MCP.

## Completion Evidence

Record these artifacts for a release candidate:

- JSON output from built-in, custom, and local `penpot-cli mcp config` checks.
- JSON output from `penpot-cli mcp status --format json` against the public
  `/mcp/status` route.
- A note that `/plugins/mcp/manifest.json` and `/plugins/mcp/mcp-plugin.json`
  returned successfully.
- UI evidence that built-in, custom, and local endpoint previews match the
  effective config rules.
- UI evidence that `auto-connect=false` prevents startup connection while
  keeping manual connect/disconnect available.
- UI or MCP evidence that manual connect reaches a global connected state
  without opening a design file.
- UI evidence that disabling MCP disconnects the plugin and stops connection
  controls.

## Failure Guide

| Symptom | Likely cause | Recovery |
| --- | --- | --- |
| `/mcp/status` returns 404 | `enable-mcp` is missing or the frontend gateway did not install MCP routes | Enable the feature flag and restart the frontend service |
| `/mcp/status` returns 502 | Frontend gateway cannot reach the MCP service | Check `PENPOT_MCP_URI`, service DNS, and the MCP container/process |
| Plugin assets return 404 | Bundled MCP plugin was not packaged into frontend public assets | Run `pnpm mcp:plugin:package` and check the release bundle |
| Built-in preview shows raw `4401` or `4402` URLs | Runtime public URI or persisted mode is wrong | Reset to built-in and verify public MCP URL globals |
| Custom mode does not derive expected paths | Public URI or explicit endpoint overrides are malformed | Re-enter the public URI and inspect saved `profile.props.mcp-config` |
| Local mode does not connect | Local MCP server is not running or browser local-network access is blocked | Start the local MCP server or use built-in mode for shared stacks |
| Auto-connect off still connects after refresh | Stale tab ownership or old config broadcast state | Refresh all Penpot tabs, save again, and recheck `auto-connect` |
| Manual connect is unavailable while MCP is enabled | Hidden bundled plugin failed to load | Check plugin manifest, plugin metadata, and browser console errors |
| Disabled MCP still shows connected | Another tab still owns the plugin session or state is stale | Close duplicate tabs, refresh, and verify diagnostics again |

## Pass Criteria

P14.1 passes when the same account can:

- enable MCP from global settings
- switch built-in, custom, and local config modes and see correct effective
  endpoints
- turn auto-connect off and verify no startup connection occurs
- manually connect and disconnect MCP without opening a file
- verify connected-global status through UI diagnostics or `mcp.get_status`
- turn auto-connect back on and verify login-time connection
- disable MCP and verify the plugin disconnects

