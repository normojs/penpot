# MCP And CLI Regression Smoke Flows

This document tracks the smoke flows for the `penpot-cli` fork. It complements
the focused unit tests in `mcp/packages/server/test` and the CLI smoke tests in
`penpot-cli/test`.

For the focused release check of saved MCP configuration and the global
background connection lifecycle, see
[`config-global-connection-smoke-flow.md`](config-global-connection-smoke-flow.md).
For the focused release check of headless file/page/shape edits and exporter
artifacts, see
[`headless-edit-export-smoke-flow.md`](headless-edit-export-smoke-flow.md).

## Automated Locally

Run these checks before committing MCP or CLI behavior changes:

```bash
pnpm --dir mcp --filter mcp-server types:check
pnpm --dir mcp --filter mcp-server test
pnpm --dir mcp fmt:check
pnpm --filter penpot-cli types:check
pnpm --filter penpot-cli lint
pnpm --filter penpot-cli test
pnpm --filter penpot-cli smoke:help
git diff --check
```

The CLI smoke suite runs without a live Penpot deployment. It verifies:

- top-level command discovery for MCP, shape, and export commands
- derived MCP stream, SSE, WebSocket, status, and log configuration
- `dev up --mcp --dry-run` service surface planning
- `file open` workspace URL generation without claiming MCP context binding
- backend-command page and shape creation/update paths with adapter diagnostics
- exporter-backed `export page --dry-run` adapter selection and request payload
- exporter-backed `render preview` dry-run and output write paths
- structured adapter errors for unsupported export adapters
- pre-RPC validation for empty `shape update` commands

The MCP server suite verifies the current first-class server contracts:

- global RPC tools and structured RPC errors
- file context registry, bind/release, stale reconnect, and required-context
  errors
- plugin task serialization for page, shape, prototype, export, and legacy
  execute-code paths
- backend-command page and shape adapter selection
- write audit context, write limit rejection, and delete confirmation rejection
- plugin protocol and capability negotiation

## Manual With A Running Penpot Stack

These smoke flows require backend, frontend, exporter, MCP server, and plugin
assets to be running:

1. `penpot-cli mcp config --format json`
2. `penpot-cli dev up --mcp --dry-run --format json`
3. `penpot-cli mcp status --format json`
4. Connect a compatible bundled MCP plugin and verify `mcp.get_status`
   reports a compatible plugin connection.
5. From an authenticated session, run `team.list`, `project.list`, `file.list`,
   and `file.get_recent`.
6. Run the headless edit/export flow in
   [`headless-edit-export-smoke-flow.md`](headless-edit-export-smoke-flow.md):
   create a file, create a page, create/update frame/rectangle/text shapes,
   dry-run preview/export requests, and write at least one artifact without
   opening or binding a workspace.
7. Open a workspace, bind the file context from the workspace MCP menu, and
   verify `file.get_context` reports the bound file and page.
8. With `PENPOT_MCP_REQUIRE_DESTRUCTIVE_CONFIRMATION=true`, verify
   `shape.delete` rejects the first call and succeeds only with
   `confirm: true`.
9. Run `render.preview` or `export.page` from a bound workspace context.
10. Run `penpot-cli export page --file <id> --page <id> --object <id>
    --profile-id <id> --dry-run --format json`.
11. Run `penpot-cli export page --file <id> --page <id> --object <id>
    --profile-id <id> --token <auth-token> --output /tmp/penpot-export.png`
    and verify the output bytes are written.

## Currently Blocked Locally

The local desktop environment used for this development pass can run the MCP
and CLI TypeScript checks. Full frontend and backend regression commands remain
blocked until the Clojure and frontend toolchain are available:

- `clojure`
- `cljfmt`
- `clj-kondo`
- frontend `node_modules` / frontend formatter dependencies

When those are available, pair the TypeScript checks with the existing
frontend MCP lifecycle tests and backend focused RPC tests for the touched
commands.
