# Live Bind Smoke Flow

Status: P14.3 release-verification smoke flow

This flow verifies the handoff from global/headless MCP work into a live
workspace plugin context. It covers opening the target file, observing an
available context, binding it for plugin-live tools, running one live-only
command, releasing the context, stale recovery, and multi-tab ownership.

Use it after file-context, workspace MCP lifecycle, plugin task, page current,
selection, or handoff changes. Pair it with
[`file-open-bind-handoff.md`](file-open-bind-handoff.md), which defines the
underlying response and error contracts.

## Scope

The flow covers:

- `file.open` returning a browser URL and handoff actions without binding
- the workspace plugin reporting an available file context after the URL opens
- `file.get_context` exposing unbound, available, bound, and stale states
- `file.bind_context` binding by `contextId` or, when unique, by `fileId`
- a plugin-live command succeeding only while a file context is bound
- `file.release_context` returning the context to available/unbound state
- `file_context_required` recovery guidance after release or stale disconnect
- single write-capable MCP ownership across multiple workspace tabs

The canonical live-only command for this smoke is `page.set_current` through
the plugin-live path. Page current and selection state remain live workspace
semantics, so this flow should not pass explicit backend-command targets that
would hide a broken live binding.

## Preconditions

- Penpot is running with backend, frontend, MCP server, and bundled MCP plugin
  assets available.
- MCP is enabled and connected globally, as verified by
  [`config-global-connection-smoke-flow.md`](config-global-connection-smoke-flow.md).
- A browser session is logged in with a user token that can read and edit the
  target file.
- The target `FILE_ID` is known. `TEAM_ID` and `PAGE_ID` are optional but make
  the workspace URL and evidence easier to inspect.
- A second page id, `SECOND_PAGE_ID`, exists in the same file when using
  `page.set_current` as the live command.
- A second browser tab or window is available for the multi-tab owner check.

The file can be created by the headless flow in
[`headless-edit-export-smoke-flow.md`](headless-edit-export-smoke-flow.md), but
that flow should complete before this one starts.

## Static Checks

These checks run without a live browser workspace and protect the server-side
contracts used by this flow:

```bash
pnpm --dir mcp --filter mcp-server test
git diff --check
```

The MCP server tests cover `file.open`, file-context registry lifecycle,
required-context errors, release-after-bind behavior, stale disconnects, and
plugin task serialization for page commands.

Frontend CLJS lifecycle tests should be paired with this flow when the local
toolchain is available. If `clojure`, `cljfmt`, `clj-kondo`, or frontend
dependencies are missing locally, record that as a tooling limitation and keep
the MCP server plus manual running-stack evidence.

## MCP Flow

Keep JSON responses from each step as release evidence.

1. Ask MCP for the workspace URL.

   ```json
   {
     "tool": "file.open",
     "arguments": {
       "fileId": "<FILE_ID>",
       "teamId": "<TEAM_ID>",
       "pageId": "<PAGE_ID>",
       "publicUri": "http://localhost:3449"
     }
   }
   ```

   Expected evidence:

   - `adapter: "browser-url"`
   - `boundContext: false`
   - `handoff.status: "url_returned"`
   - `handoff.nextActions` contains `open_workspace_url`,
     `file.get_context`, `file.bind_context`, and `retry_original_tool`

2. Open `workspaceUrl` in the logged-in browser session.

   The URL should use this shape:

   ```text
   <public-uri>/#/workspace?file-id=<FILE_ID>[&team-id=<TEAM_ID>][&page-id=<PAGE_ID>]
   ```

3. Confirm MCP is connected in the workspace.

   Use the workspace main menu if needed:

   - `mcp-menu-toggle-mcp-plugin` connects or disconnects MCP.
   - `mcp-menu-toggle-file-context` binds or releases the current file.
   - `mcp-menu-nav-to-integrations` opens diagnostics.

4. Inspect file context.

   ```json
   {
     "tool": "file.get_context",
     "arguments": {}
   }
   ```

   Expected evidence:

   - `fileContext.status: "available"`
   - `fileContext.bound: false`
   - one available context has the expected `fileId`
   - the context includes a stable `contextId`

5. Bind the available context.

   Prefer `contextId` when it is present:

   ```json
   {
     "tool": "file.bind_context",
     "arguments": {
       "contextId": "<CONTEXT_ID>"
     }
   }
   ```

   If exactly one available context exists for the file, `fileId` is acceptable:

   ```json
   {
     "tool": "file.bind_context",
     "arguments": {
       "fileId": "<FILE_ID>"
     }
   }
   ```

   Expected evidence:

   - `boundContext.status: "bound"`
   - `boundContext.fileId` matches the target file
   - `verifiedFile.id` matches the target file
   - `nextActions` includes `file.get_context`

6. Inspect context again.

   Expected evidence:

   - `fileContext.status: "bound"`
   - `fileContext.bound: true`
   - `fileContext.boundContext.fileId` matches the target file

7. Run one live-only command through the bound context.

   Use `page.set_current`. The tool is inherently plugin-live and accepts only
   `pageId`, so do not add explicit file targets or adapter overrides:

   ```json
   {
     "tool": "page.set_current",
     "arguments": {
       "pageId": "<SECOND_PAGE_ID>"
     }
   }
   ```

   Expected evidence:

   - the command succeeds without `file_context_required`
   - the response or the next `file.get_context` call reflects the new current
     page when the plugin reports page metadata
   - the adapter evidence is plugin-live in the response metadata or through
     the page plugin task response

   `selection.get` or `selection.set` can be used as additional live-only
   evidence when the workspace has a known selection setup.

8. Release the bound context.

   ```json
   {
     "tool": "file.release_context",
     "arguments": {}
   }
   ```

   Expected evidence:

   - `released: true`
   - `releasedContext.fileId` matches the target file
   - `fileContext.bound: false`
   - the same open workspace may remain available but is no longer bound

9. Retry the same live-only command.

   Expected evidence:

   - the command fails with `code: "file_context_required"`
   - recovery actions include `file.open`, `file.get_context`,
     `file.bind_context`, and `retry_original_tool`
   - when the target file is known, the response includes a `workspaceUrl`

## Stale Recovery

1. Bind the context as above.
2. Close the workspace tab or disconnect the MCP plugin.
3. Call `file.get_context`.
4. Retry the live-only command.
5. Reopen the original `workspaceUrl`, wait for the context to become
   available, bind it again, and rerun the command.

Expected evidence:

- stale or unavailable context is visible after the tab disconnects
- the live-only command returns `file_context_required`
- reopening the URL produces a fresh available context
- binding the fresh context allows the plugin-live command to succeed again

## Multi-Tab Owner Check

The frontend preserves one active write-capable MCP owner per user session.
Verify that behavior with two tabs:

1. Open the target file in tab A and bind it.
2. Open the same file in tab B.
3. Confirm tab B reports that MCP is active in another tab, or offers the
   switch-owner action.
4. Use the switch/connect action in tab B.
5. Confirm tab A loses active MCP ownership or receives the force-disconnect
   state.
6. Call `file.get_context`.
7. Bind or keep the context owned by tab B, then run the live-only command.
8. Release the context from tab B.

Expected evidence:

- only one tab can own write-capable MCP work at a time
- switching ownership does not leave two simultaneously bound contexts for the
  same token
- stale contexts from the previous owner are either absent or reported clearly
- releasing from the active owner leaves no bound context

## Pass Criteria

P14.3 passes when the same account can:

- receive a `file.open` URL and handoff payload that does not bind context
- open the workspace and observe an available context
- bind the context and see `file.get_context` move to `bound`
- run `page.set_current` through plugin-live while bound
- release the context and see live-only commands require binding again
- recover from a stale tab by reopening and rebinding
- verify multi-tab switching keeps a single write-capable MCP owner

## Failure Guide

| Symptom | Likely cause | Recovery |
| --- | --- | --- |
| No available context after opening the URL | Plugin is disconnected, MCP is disabled, browser is logged out, or the wrong token is used | Reconnect MCP, refresh diagnostics, verify the session token, and reopen the workspace URL |
| `file.bind_context` is ambiguous | Multiple open contexts match the token or file | Bind by `contextId` instead of `fileId` |
| Bind fails with permission error | Token cannot access the file | Use a token for a profile with file/project access |
| Live command still returns `file_context_required` after bind | The bound context is stale or owned by another tab | Call `file.get_context`, switch owner if needed, reopen the URL, and bind the fresh context |
| `page.set_current` does not prove plugin-live execution | The command response lacks adapter or plugin task evidence | Inspect the response metadata and follow with `file.get_context`; do not pass unsupported adapter or file-target arguments |
| Second tab cannot become owner | The ownership prompt was dismissed or stale tab state remains | Refresh both tabs, reconnect MCP in tab B, and inspect diagnostics |
| Release leaves a bound context | Another tab re-bound the file or release targeted an old context | Inspect `file.get_context`, switch to the active owner, and release again |
