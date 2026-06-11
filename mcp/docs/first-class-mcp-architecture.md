# First-Class MCP Architecture Plan

Status: draft
Target fork: `penpot-cli` based on Penpot `2.15.4`
Scope: MCP, built-in MCP plugin, Penpot automation, future CLI integration

## Execution Tracking

Implementation progress is tracked in the repository root `todo.md`.

AI coding agents should follow the fork-specific rules in the repository root
`AI_CODE_RULES.md`.

Every implementation step should update the tracking files as follows:

1. Mark the active task in `todo.md` before starting work.
2. Mark the task `done` or `blocked` when the step finishes.
3. Update this architecture document when the implementation changes the plan.
4. Update `CHANGES.md` for user-visible behavior, docs, or project structure.

## 1. Goal

Make MCP a first-class Penpot capability instead of a feature that only works
after the user opens a file and manually connects a plugin.

The intended product shape is:

```text
Penpot starts / user logs in
  -> MCP can be enabled or disabled by the user
  -> MCP can use built-in defaults or manual configuration
  -> the built-in MCP plugin can run in the background
  -> global MCP tools work without an active design file
  -> file-level MCP tools become available when a file context is bound
```

The MCP plugin remains a default bundled system plugin. The key change is its
lifecycle: it becomes a global background agent, with a file agent layered on
top when a design file is open or explicitly selected.

## 2. Design Principles

1. **Built in, but user controlled.**
   MCP ships with Penpot and can start automatically, but users must be able to
   turn it on or off and override connection settings.

2. **One public MCP surface.**
   Users and MCP clients should see one stable MCP URL. Internal ports such as
   `4401`, `4402`, `4403`, and plugin asset hosting should be hidden behind
   Penpot routing, reverse proxying, or `penpot-cli` orchestration.

3. **Global before file-specific.**
   MCP should be able to answer account, team, project, file, token, and status
   questions before a workspace tab is active.

4. **Structured tools before arbitrary code.**
   Keep `execute_code` as an advanced/debug tool, but move normal workflows to
   typed tools and a shared command runtime.

5. **CLI and MCP should converge.**
   `penpot-cli` and MCP tools should call the same automation command layer
   wherever possible. CLI is the shell entry point; MCP is the AI entry point.

6. **Headless is a destination, not the first milestone.**
   Existing plugin-backed operations can be reused first. Gradually move
   stable operations down into backend/common/exporter so they work without an
   open browser.

## 3. Current State in Penpot 2.15.4

The current implementation already contains useful building blocks:

- `mcp/` is a TypeScript workspace with MCP server, plugin, and shared types.
- MCP server exposes Streamable HTTP and SSE endpoints.
- MCP server also runs a WebSocket server for plugin connections.
- The built-in plugin executes tasks inside the Penpot Plugin API context.
- Frontend settings already manage an MCP access token and server URL.
- Docker/nginx can expose `/mcp/stream`, `/mcp/sse`, and `/mcp/ws` when
  `enable-mcp` is active.
- Frontend build copies the MCP plugin bundle into `plugins/mcp/`.

Important limitations:

- The real design-editing power is still workspace/file-bound.
- The server normally needs a connected plugin instance before design tools can
  do useful work.
- The main general-purpose tool is `execute_code`, which forwards JavaScript to
  the plugin context.
- Local development exposes several ports:

```text
Backend HTTP:       6060
Exporter HTTP:      6061
Frontend shadow:    3448 / 3447 / 8888
MCP plugin preview: 4400
MCP HTTP/SSE:       4401
MCP WebSocket:      4402
MCP REPL:           4403
```

The first-class MCP plan should keep the useful parts and remove the user-facing
complexity.

### 3.1 MCP Routing Audit (2026-06-11)

Current MCP routing already has a mostly stable public shape in production and
devenv. The main gap is that standalone development and plugin lifecycle still
expose several internal ports and require manual wiring.

Public paths:

| Public path | Current target | Used by | Notes |
| --- | --- | --- | --- |
| `/mcp/stream` | MCP server `/mcp` | MCP clients and generated settings config | Main Streamable HTTP transport |
| `/mcp/sse` | MCP server `/sse` | Legacy MCP clients | Keep until no supported clients need SSE |
| `/mcp/ws` | MCP WebSocket server | Built-in MCP plugin | Plugin-side channel, not the MCP client transport |
| `/plugins/mcp/manifest.json` | Bundled plugin dist | Frontend workspace MCP startup | Loaded by current workspace lifecycle |
| `/mcp/status` | MCP server `/status` | UI, CLI, MCP diagnostics | Token-safe server/session/plugin counts |

Internal ports:

| Port | Component | Default source | Intended visibility |
| --- | --- | --- | --- |
| `4400` | MCP plugin preview server | `mcp/packages/plugin/vite.config.ts` | Local plugin development only |
| `4401` | MCP HTTP/SSE server | `PENPOT_MCP_SERVER_PORT`, default `4401` | Internal behind `/mcp/stream` and `/mcp/sse` |
| `4402` | MCP plugin WebSocket server | `PENPOT_MCP_WEBSOCKET_PORT`, default `4402` | Internal behind `/mcp/ws` |
| `4403` | MCP REPL server | `PENPOT_MCP_REPL_PORT`, default `4403` | Developer/debug only, never user-facing |

Production Docker routing:

| Area | Current behavior | Source |
| --- | --- | --- |
| Feature flag | MCP nginx locations are installed only when `PENPOT_FLAGS` contains `enable-mcp` | `docker/images/files/nginx-entrypoint.sh` |
| Public frontend base | Optional `PENPOT_MCP_PUBLIC_URI` writes `globalThis.penpotMcpPublicURI` into `config.js` | `docker/images/files/nginx-entrypoint.sh` |
| Public stream override | Optional `PENPOT_MCP_STREAM_URI` writes `globalThis.penpotMcpStreamURI` into `config.js` | `docker/images/files/nginx-entrypoint.sh` |
| Public WebSocket override | Optional `PENPOT_MCP_WEBSOCKET_URI` writes `globalThis.penpotMcpWebSocketURI` into `config.js` | `docker/images/files/nginx-entrypoint.sh` |
| MCP service URI | Defaults to `http://penpot-mcp:4401` | `docker/images/files/nginx-entrypoint.sh` |
| MCP WebSocket URI | Defaults to `http://penpot-mcp:4402` | `docker/images/files/nginx-entrypoint.sh` |
| Stream route | `/mcp/stream` proxies to `$PENPOT_MCP_URI/mcp` | `docker/images/files/nginx-mcp-locations.conf.template` |
| SSE route | `/mcp/sse` proxies to `$PENPOT_MCP_URI/sse` | `docker/images/files/nginx-mcp-locations.conf.template` |
| WebSocket route | `/mcp/ws` proxies to `$PENPOT_MCP_URI_WS` with upgrade headers | `docker/images/files/nginx-mcp-locations.conf.template` |
| Status route | `/mcp/status` proxies to `$PENPOT_MCP_URI/status` | `docker/images/files/nginx-mcp-locations.conf.template` |
| Container host | MCP image binds `PENPOT_MCP_SERVER_HOST=0.0.0.0` | `docker/images/Dockerfile.mcp` |

Devenv routing:

| Area | Current behavior | Source |
| --- | --- | --- |
| Plugin assets | `/plugins/mcp` aliases `mcp/packages/plugin/dist` | `docker/devenv/files/nginx.conf` |
| Stream route | `/mcp/stream` proxies to `127.0.0.1:4401/mcp` | `docker/devenv/files/nginx.conf` |
| SSE route | `/mcp/sse` proxies to `127.0.0.1:4401/sse` | `docker/devenv/files/nginx.conf` |
| WebSocket route | `/mcp/ws` proxies to `127.0.0.1:4402` | `docker/devenv/files/nginx.conf` |
| Status route | `/mcp/status` proxies to `127.0.0.1:4401/status` | `docker/devenv/files/nginx.conf` |
| Exposed ports | `4400`, `4401`, `4402`, and `4403` are exposed | `docker/devenv/docker-compose.yaml` |
| Bind hosts | MCP server and plugin preview host are set to `0.0.0.0` | `docker/devenv/files/bashrc` |

Frontend URL sources:

| Consumer | Current URL source | Notes |
| --- | --- | --- |
| MCP public base | `cf/mcp-public-uri`, from `globalThis.penpotMcpPublicURI` or `public-uri` | First Phase 1 slice establishes one frontend base for public MCP routes |
| Settings generated MCP config | `cf/mcp-server-url`, from `globalThis.penpotMcpStreamURI` or `mcp-public-url "stream"` | User-facing URL is public-path based |
| Token-created modal | Same `cf/mcp-server-url` plus `?userToken=...` | Matches settings copy action |
| Workspace plugin startup | `plugins/mcp/manifest.json` and `plugins/mcp/` under `public-uri` | Still workspace scoped |
| Plugin WebSocket URL | `cf/mcp-ws-uri`, from `globalThis.penpotMcpWebSocketURI`, legacy `globalThis.penpotMcpServerURI`, or `mcp-public-url "ws"` | Default stream and WebSocket URLs now derive from the same base |
| Production plugin bundle | `frontend/scripts/build` builds plugin with `WS_URI="/mcp/ws"` and copies dist into `target/dist/plugins/mcp/` | Keeps production plugin on public path |
| Plugin standalone build | `mcp/packages/plugin/vite.config.ts` accepts `PENPOT_MCP_WEBSOCKET_URI`, legacy `WS_URI`, or derives `/mcp/ws` from `PENPOT_MCP_PUBLIC_URI` | Falls back to `http://localhost:4402` only for standalone local mode |

Standalone local MCP routing:

| Area | Current behavior | Source |
| --- | --- | --- |
| Plugin loading | User manually loads `http://localhost:4400/manifest.json` | `mcp/README.md` |
| MCP client URL | Docs point clients to `http://localhost:4401/mcp` | `mcp/README.md` |
| Legacy SSE URL | Docs point clients to `http://localhost:4401/sse` | `mcp/README.md` |
| Status URL | Docs point local diagnostics to `http://localhost:4401/status` | `mcp/README.md` |
| Plugin WebSocket | Plugin preview uses `PENPOT_MCP_WEBSOCKET_URI`, `WS_URI`, `PENPOT_MCP_PUBLIC_URI + /mcp/ws`, or fallback `http://localhost:4402` | `mcp/packages/plugin/vite.config.ts` |
| REPL | Local debug port remains `4403` | `mcp/README.md` |

Routing divergences to fix next:

- Built-in/gateway mode now derives default stream and WebSocket URLs from the
  same MCP public base. Standalone docs keep direct ports only for local package
  execution outside the Penpot gateway.
- Manual profile settings still need to adopt the same `builtin | custom |
  local` model in a user-visible settings form.
- The MCP plugin is bundled in production, but startup is still owned by
  workspace code instead of a global app lifecycle.
- Devenv exposes all MCP ports directly. That is useful for debugging, but
  `penpot-cli dev up --mcp` should make `/mcp/stream`, `/mcp/sse`, and
  `/mcp/ws` the default mental model.
- `/mcp/status` now exists as an HTTP diagnostic endpoint. Future CLI commands
  can call it directly, and Phase 3 can add an MCP `mcp.get_status` tool with
  user/session context.
- The REPL port should remain disabled or tightly local in production-facing
  modes, especially after MCP becomes easier to enable.

Phase 1 decisions:

- Public MCP traffic uses `/mcp/stream`, `/mcp/sse`, `/mcp/ws`, and
  `/mcp/status`.
- Internal ports `4401`, `4402`, and `4403` remain configurable but are not the
  normal user-facing model.
- Frontend stream and WebSocket defaults derive from `penpotMcpPublicURI` or
  `public-uri`; explicit stream/WebSocket overrides remain available for
  custom deployments.
- Docker can inject `PENPOT_MCP_PUBLIC_URI`, `PENPOT_MCP_STREAM_URI`, and
  `PENPOT_MCP_WEBSOCKET_URI` into frontend runtime config.
- The MCP plugin build can derive `/mcp/ws` from `PENPOT_MCP_PUBLIC_URI`, use
  explicit `PENPOT_MCP_WEBSOCKET_URI`, or fall back to local standalone
  `http://localhost:4402`.
- `/mcp/status` is the first diagnostics surface and should be reused by
  `penpot-cli mcp status`.
- `penpot-cli dev up --mcp` should initially wrap existing devenv behavior
  instead of replacing the tmux workflow.

## 4. Target Architecture

```text
MCP clients
  Cursor, Claude, Codex, other agents
        |
        v
MCP Gateway
  /mcp/stream
  /mcp/sse
  /mcp/ws
  /mcp/status
        |
        v
MCP Server
  tool registry
  session routing
  auth and permissions
  command runtime adapter
        |
        +------------------------------+
        |                              |
        v                              v
Global MCP Agent                 File MCP Agent
  system plugin                    workspace/file context
  background lifecycle             selection/page/shape ops
  account/project/file tools       prototype/edit/export tools
        |                              |
        +---------------+--------------+
                        |
                        v
Automation Command Runtime
  typed command schemas
  capability checks
  backend/RPC dispatch
  plugin dispatch
  exporter/render dispatch
                        |
                        v
Penpot core
  backend
  common data model
  exporter
  render-wasm
  plugin API
```

## 5. Components

### 5.1 MCP Gateway

The gateway is the only MCP entry point users should need to understand.

Public paths:

```text
/mcp/stream  -> Streamable HTTP transport
/mcp/sse     -> legacy SSE transport
/mcp/ws      -> plugin WebSocket channel
/mcp/status  -> optional status/debug endpoint
```

Responsibilities:

- Hide internal ports in production and development.
- Route MCP client traffic to the MCP server.
- Route plugin WebSocket traffic to the MCP server.
- Support remote deployments and local development.
- Provide consistent URLs for settings, docs, and generated client configs.

Development target:

```bash
penpot-cli dev up --mcp
penpot-cli mcp status
penpot-cli mcp config
```

The CLI can orchestrate ports internally, but the user-facing URL should remain
stable.

#### 5.1.1 Local Dev Orchestration Contract

`penpot-cli dev up --mcp` should be the friendly entry point for local
development. In Phase 1 this is a design contract; the concrete CLI package is
planned for Phase 6.

Default command:

```bash
penpot-cli dev up --mcp
```

Equivalent first implementation:

```bash
penpot-cli dev up --mode devenv --mcp --public-uri http://localhost:3449
```

Supported modes:

| Mode | Purpose | First implementation behavior |
| --- | --- | --- |
| `devenv` | Reuse the existing Docker devenv and tmux workflow | Ensure `./manage.sh start-devenv` has run, then enter or instruct `./manage.sh run-devenv` |
| `host` | Run services directly on the host | Later option once local dependency checks are reliable |
| `hybrid` | Use Docker dependencies, run selected app services on host | Later option for faster frontend/MCP iteration |

`--mcp` should ensure the following development surface:

| Surface | Public URL | Internal/default process |
| --- | --- | --- |
| Frontend app | `http://localhost:3449` | frontend shadow/watch process |
| Backend API | `http://localhost:6060` through nginx | backend `./scripts/start-dev` |
| Exporter | `http://localhost:6061` through nginx | exporter watch and wait/start scripts |
| MCP stream | `http://localhost:3449/mcp/stream` | MCP server `:4401/mcp` |
| MCP SSE | `http://localhost:3449/mcp/sse` | MCP server `:4401/sse` |
| MCP WebSocket | `http://localhost:3449/mcp/ws` | MCP WebSocket server `:4402` |
| MCP status | `http://localhost:3449/mcp/status` | MCP server `:4401/status` |
| MCP plugin assets | `http://localhost:3449/plugins/mcp/manifest.json` | `mcp/packages/plugin/dist` |

Responsibilities:

- Check required tools before starting: Docker for `devenv`, Node/pnpm and
  Clojure only for host/hybrid modes.
- Ensure frontend and backend flags include `enable-mcp`.
- Build or watch MCP plugin assets when `mcp/packages/plugin/dist` is missing
  or stale.
- Start the MCP server in multi-user mode when using normal Penpot login and
  token flow.
- Export or print the public MCP config:

```text
PENPOT_MCP_PUBLIC_URI=http://localhost:3449
stream=http://localhost:3449/mcp/stream
websocket=http://localhost:3449/mcp/ws
status=http://localhost:3449/mcp/status
```

- Run readiness checks:
  - `GET /api/health` or equivalent backend health path when available
  - `GET /mcp/status`
  - plugin manifest exists at `/plugins/mcp/manifest.json`
- On failure, print the exact process or dependency that is missing instead of
  hiding the error.

Follow-up commands:

```bash
penpot-cli dev down
penpot-cli mcp status
penpot-cli mcp config --format json
penpot-cli mcp logs --follow
```

The first Phase 6 implementation can wrap existing devenv commands and status
URLs. It does not need to replace tmux immediately.

### 5.2 Global MCP Agent

The Global MCP Agent is a built-in system plugin that can run in the background
after login. It is not a marketplace plugin and should not require manual
manifest installation.

Responsibilities:

- Start and stop according to user MCP settings.
- Connect to `/mcp/ws` or a user-configured WebSocket URL.
- Maintain connection status and reconnect behavior.
- Provide a stable user/session identity to the MCP server.
- Expose global Penpot context:
  - current user
  - enabled/disabled status
  - teams
  - projects
  - files
  - recently opened files
  - available file contexts
- Broker file context activation when a file-level tool is requested.

Lifecycle:

```text
user authenticated
  -> load MCP profile settings
  -> if enabled and configured, start Global MCP Agent
  -> connect WebSocket
  -> register global capabilities
  -> watch profile/settings changes
  -> reconnect or stop as needed
```

Current code to evolve:

- Move lifecycle ownership out of `frontend/src/app/main/data/workspace/mcp.cljs`.
- Introduce a global namespace such as:

```text
frontend/src/app/main/data/mcp.cljs
frontend/src/app/main/data/mcp/global.cljs
frontend/src/app/main/data/mcp/file.cljs
```

Workspace code should bind file context, not own MCP startup.

#### 5.2.1 Current Lifecycle Audit

Current frontend lifecycle:

| Step | Current code | Behavior |
| --- | --- | --- |
| Fetch MCP token | `frontend/src/app/main/data/workspace.cljs` calls `du/fetch-access-tokens` during workspace initialization when `:mcp` flag is active | Token data is loaded only as part of opening a workspace |
| Start MCP flow | `workspace-initialized` emits `mcp/init` | MCP startup is file/workspace-bound |
| Load MCP plugin | `mcp/init-mcp` calls `dp/start-plugin!` with `plugins/mcp/manifest.json` and `allow-background true` | Plugin is bundled and can run hidden, but only after workspace init |
| Inject MCP extension | `dp/start-plugin!` receives `#js {:mcp ...}` | Plugin gets token, WebSocket URL, status callback, and connect/disconnect event subscriptions |
| Auto-connect plugin | `mcp/packages/plugin/src/plugin.ts` sends `start-server` to hidden UI after `ui-initialized` when `mcp` extension exists | Built-in plugin connects without manual UI action |
| WebSocket connect | `mcp/packages/plugin/src/main.ts` opens `baseUrl || PENPOT_MCP_WEBSOCKET_URL`, appending `userToken` | Plugin bridge gets a user-bound WebSocket connection |
| Status update | Plugin UI posts `update-connection-status`; `plugin.ts` calls `mcp.setMcpStatus` | Frontend stores `[:mcp :connection-status]` |
| Reconnect | `start-reconnect-watcher!` emits `::connect` every 10 seconds unless status is `connecting` or `connected` | Reconnect only starts after a successful connection status path |
| Multi-tab ownership | Broadcast events `:mcp/ping`, `:mcp/pong`, and `:mcp/force-disconect` coordinate `[:mcp :connected-tab]` | Only one tab should own active MCP work |
| Manual workspace menu | `frontend/src/app/main/ui/workspace/main_menu.cljs` calls `mcp/connect-mcp` or `mcp/user-disconnect-mcp` | User controls MCP from an open file |
| Workspace finalize | `finalize-workspace` emits `mcp/notify-other-tabs-disconnect` | Closing a file can tear down MCP ownership |

Important current state keys:

```clojure
{:mcp {:active true|false
       :connection-status "connecting|connected|disconnected|error"
       :connected-tab <session-id>}}
```

Current broadcast protocol:

| Event | Purpose |
| --- | --- |
| `:mcp/enable` | Settings enabled MCP; workspace handler updates profile props and starts init |
| `:mcp/disable` | Settings disabled MCP; workspace handler disconnects and stops reconnect watcher |
| `:mcp/ping` | Newly opened workspace asks other tabs for MCP ownership |
| `:mcp/pong` | A tab reports its connection status |
| `:mcp/force-disconect` | The current tab asks other tabs to disconnect before it connects |

Lifecycle changes needed for first-class MCP:

- Move token loading and plugin startup to a global authenticated app flow, not
  workspace initialization.
- Keep the existing hidden plugin auto-connect behavior; it is already the
  right shape for a background system plugin.
- Preserve broadcast ownership, but rename the model from `connected-tab` to an
  explicit global owner/file-context owner.
- Split state into global connection status and file context status.
- Keep workspace menu actions as file-context bind/unbind controls instead of
  owning server startup.
- Stop tying reconnect watcher lifetime to workspace finalization.

#### 5.2.2 Global MCP State Design

Proposed frontend namespaces:

```text
frontend/src/app/main/data/mcp.cljs          ;; public events and compatibility exports
frontend/src/app/main/data/mcp/config.cljs   ;; profile/config/token derivation
frontend/src/app/main/data/mcp/plugin.cljs   ;; system plugin startup and status bridge
frontend/src/app/main/data/mcp/context.cljs  ;; file context bind/release
```

Proposed state shape:

```clojure
{:mcp
 {:enabled? false
  :configured? false
  :mode :builtin               ;; :builtin | :custom | :local
  :auto-connect? true

  :config
  {:stream-url "https://penpot.example.com/mcp/stream"
   :ws-url "https://penpot.example.com/mcp/ws"
   :status-url "https://penpot.example.com/mcp/status"
   :allow-execute-code? false
   :allow-local-files? false}

  :token
  {:present? false
   :expires-at nil}

  :plugin
  {:started? false
   :starting? false
   :manifest-url "https://penpot.example.com/plugins/mcp/manifest.json"
   :version nil
   :last-error nil}

  :connection
  {:status :disabled           ;; see status model below
   :owner-tab nil
   :connected-at nil
   :last-error nil
   :server-status nil}

  :file-context
  {:status :none               ;; :none | :available | :bound | :required | :error
   :owner-tab nil
   :team-id nil
   :project-id nil
   :file-id nil
   :page-id nil
   :selection-ids #{}
   :bound-at nil
   :last-error nil}

  ;; Short-term compatibility aliases for existing UI.
  :active false
  :connection-status "disconnected"
  :connected-tab nil}}
```

Connection status model:

| Status | Meaning |
| --- | --- |
| `:disabled` | User or admin has MCP turned off |
| `:missing-token` | MCP is enabled but no valid MCP token exists |
| `:configured` | Required settings and token exist, but plugin is not connected |
| `:starting-plugin` | Built-in system plugin is being loaded |
| `:connecting` | Plugin is opening the WebSocket |
| `:connected-global` | MCP is connected without an active file context |
| `:connected-file` | MCP is connected and bound to a file context |
| `:disconnected` | Previously connected, now intentionally disconnected |
| `:error` | Last startup, connection, or plugin bridge operation failed |

Primary events:

| Event | Scope | Responsibility |
| --- | --- | --- |
| `mcp/initialize` | global | Derive config from profile/runtime config, fetch token summary, optionally start plugin |
| `mcp/finalize` | global | Stop watchers and plugin connection on logout/app shutdown |
| `mcp/config-updated` | global | Recompute mode, URLs, security toggles, and configured state |
| `mcp/token-updated` | global | Update token summary and reconnect if auto-connect is enabled |
| `mcp/start` | global | Start hidden bundled plugin if enabled/configured |
| `mcp/stop` | global | Ask plugin to disconnect and stop reconnect watcher |
| `mcp/plugin-status-updated` | plugin bridge | Convert plugin UI statuses into global status states |
| `mcp/owner-ping` / `mcp/owner-pong` | tab ownership | Preserve single write-capable owner tab |
| `mcp/bind-file-context` | file | Attach current workspace file/page/selection |
| `mcp/release-file-context` | file | Return to `:connected-global` |
| `mcp/file-context-updated` | file | Refresh page and selection metadata while a file is open |

Migration notes:

- Phase 2 should add the new namespace and state shape first, then keep
  compatibility aliases updated for existing `refs/mcp` consumers.
- Existing `workspace.mcp` functions can become wrappers that call global
  events while file-context code is extracted.
- Settings toggles should emit global `mcp/config-updated` or `mcp/start` /
  `mcp/stop` events directly, not rely on workspace broadcast handlers.
- Workspace initialization should emit `mcp/bind-file-context` only after the
  file bundle is loaded and permissions are known.
- Workspace finalization should emit `mcp/release-file-context`, not global
  disconnect.

Phase 2 implementation note:

- `frontend/src/app/main/data/mcp.cljs` is now the lifecycle owner.
- `frontend/src/app/main.cljs` starts MCP after an authenticated profile is
  fetched when the `:mcp` feature flag is active.
- `frontend/src/app/main/data/workspace/mcp.cljs` is a compatibility wrapper
  around the global MCP namespace for existing workspace menu callers.
- `frontend/src/app/main/data/workspace.cljs` no longer starts MCP on
  `workspace-initialized` and no longer broadcasts MCP disconnect on workspace
  finalization.
- Focused lifecycle tests live in `frontend/test/frontend_tests/data/mcp_test.cljs`.

### 5.3 File MCP Agent

The File MCP Agent handles design operations that require a current file,
page, selection, or canvas context.

Responsibilities:

- Register the active file/page/selection with the Global MCP Agent.
- Execute file-scoped tools through the plugin API while the file is open.
- Return structured errors when no file context is available.
- Support explicit context switching:

```text
open_file
bind_file_context
get_current_file_context
release_file_context
```

When a file-level tool is called without a bound context, the server should
return:

```json
{
  "code": "file_context_required",
  "message": "A Penpot file must be opened or bound before this tool can run.",
  "actions": ["list_files", "open_file", "bind_file_context"]
}
```

#### 5.3.1 File Context Registry Design

The file context registry is the bridge between global MCP tools and
file-scoped design tools. It should exist in two layers:

| Layer | Owner | Responsibility |
| --- | --- | --- |
| Frontend registry | Global MCP agent in `frontend/src/app/main/data/mcp.cljs` | Know which browser tabs/workspaces are open, which tab owns MCP work, and what file/page/selection is current |
| Server registry | MCP server | Know which user session has an available or bound file context, without trusting client-provided permissions blindly |

Registry entry shape:

```json
{
  "contextId": "tab-uuid:file-uuid",
  "status": "available",
  "ownerTabId": "tab-uuid",
  "teamId": "team-uuid",
  "projectId": "project-uuid",
  "fileId": "file-uuid",
  "fileName": "Mobile checkout",
  "pageId": "page-uuid",
  "pageName": "Flow",
  "selectionIds": ["shape-uuid"],
  "capabilities": ["page.read", "shape.write", "export.read"],
  "updatedAt": "2026-06-11T00:00:00.000Z"
}
```

Status model:

| Status | Meaning |
| --- | --- |
| `available` | A workspace tab is open and can be bound by MCP |
| `bound` | MCP has selected this context for file-scoped tools |
| `stale` | The tab stopped reporting or the file was closed |
| `released` | MCP/user explicitly detached the context |
| `error` | Last registry update failed |

Registration flow:

```text
workspace opens file
  -> frontend emits mcp/register-file-context
  -> global MCP agent stores available context
  -> plugin/server bridge publishes token-scoped context summary
  -> MCP server verifies access with backend RPC before binding
  -> file.bind_context marks one context as bound
```

Update flow:

- Workspace selection/page changes update the frontend registry.
- The active owner tab publishes context deltas to the MCP server.
- The MCP server stores only token-scoped context summaries and timestamps.
- If the owner tab disconnects or misses heartbeats, the server marks bound
  context `stale` and file tools return `file_context_required`.

Multi-tab rules:

- A user token may have multiple available contexts.
- Only one context per user token can be `bound` for write-capable file tools
  at a time.
- Binding a context in one tab should force-release the previously bound
  context for that same token.
- Read-only inspection may later support multiple contexts, but Phase 4 should
  keep a single bound context to avoid ambiguous edits.

Planned tools:

| Tool | Scope | Behavior |
| --- | --- | --- |
| `file.get_context` | global/file | Return current bound context and available contexts |
| `file.bind_context` | global/file | Bind by `contextId` or by `fileId` when exactly one matching available context exists |
| `file.release_context` | file | Release current bound context and return to `connected-global` |

Phase 4.2 implementation note:

- The plugin now reports `file-context-update` WebSocket messages containing
  `currentFile`, `currentPage`, selection ids, owner id, capabilities, and
  timestamps.
- The MCP server stores token-scoped file context summaries in
  `FileContextRegistry`.
- `mcp.get_status` now reads the registry for current session file context
  state instead of returning a placeholder.
- `file.get_context` returns the bound context, available contexts, stale
  contexts, and next actions for the current MCP token.
- `file.bind_context` can bind by `contextId`, by `fileId` when exactly one
  matching context exists, or by no selector when exactly one active context
  exists.
- Binding verifies current-user file access through the existing
  `get-file-summary` backend RPC before marking the context bound.
- Plugin-reported `teamId` and `projectId` remain optional because the Penpot
  plugin API does not always expose them directly; backend authorization is the
  source of truth.
- WebSocket disconnects mark contexts stale and clear the bound context for the
  session. Explicit release remains Phase 4.3.

Structured errors:

| Error code | Trigger |
| --- | --- |
| `file_context_required` | A file-scoped tool needs a bound context and none exists |
| `file_context_ambiguous` | A bind request matches multiple available contexts |
| `file_context_not_found` | Requested `contextId`/`fileId` is not available to the session |
| `file_context_stale` | Bound tab closed or stopped reporting |

### 5.4 Automation Command Runtime

The command runtime is the long-term shared layer for MCP and `penpot-cli`.

It should define typed commands with:

- command name
- input schema
- output schema
- required auth
- required capabilities
- scope (`global`, `file`, `local`)
- implementation adapter

Example:

```text
command: file.create
scope: global
adapter: backend-rpc

command: shape.create
scope: file
adapter: plugin-api first, backend/common later

command: export.shape
scope: file or headless
adapter: plugin-api/exporter first, exporter later
```

Adapters:

```text
backend-rpc    calls backend RPC commands
plugin-api     executes inside the system plugin context
exporter       calls exporter/render services
local-fs       allowed only in local mode with explicit permission
```

MCP tools and CLI commands become thin adapters over this runtime.

## 6. User Configuration

MCP settings should stay explicit and user-visible.

Suggested profile props:

```clojure
{:mcp-enabled false
 :mcp-auto-connect true
 :mcp-mode "builtin"          ;; builtin | custom | local
 :mcp-server-url nil          ;; optional override
 :mcp-ws-url nil              ;; optional override
 :mcp-allow-execute-code false
 :mcp-allow-local-files false}
```

Existing storage to reuse:

- `profile.props.mcp-enabled`
- `access-token` rows with `type = "mcp"`
- frontend config values for MCP stream and WebSocket URLs

Settings page controls:

```text
MCP Server
  [toggle] Enable MCP
  [toggle] Auto-connect after login

Connection mode
  - Built-in service
  - Custom MCP server
  - Local development

MCP stream URL
  [input/copy]

MCP WebSocket URL
  [input/copy]

Security
  [toggle] Allow advanced execute_code tool
  [toggle] Allow local file access

Actions
  Generate/regenerate MCP key
  Copy client config
  Test connection
  Disconnect current session
  View logs/status
```

Workspace menu controls:

```text
MCP: Disabled | Connecting | Connected globally | Connected to this file | Error
Connect MCP
Disconnect MCP
Bind this file
Manage MCP settings
```

## 7. State Machine

Frontend and server should share the same conceptual states.

```text
disabled
  MCP is off for the user.

unconfigured
  MCP is enabled but missing token or connection URL.

configured
  MCP has enough settings to start.

connecting
  Global MCP Agent is connecting to the server.

connected-global
  MCP is connected, but no file context is active.

connected-file
  MCP is connected and has an active file context.

needs-file-context
  A file-level tool was requested without an active file context.

reconnecting
  Connection dropped and auto-connect is enabled.

error
  Startup, auth, WebSocket, version, or permission failure.
```

Common transitions:

```text
disabled -> configured
configured -> connecting
connecting -> connected-global
connected-global -> connected-file
connected-file -> connected-global
connected-global -> needs-file-context
connected-* -> reconnecting
reconnecting -> connected-global
any -> error
any -> disabled
```

## 8. Tool Model

New first-class tools use dotted names:

```text
domain.verb
domain.verb_noun
```

Examples:

```text
mcp.get_status
file.create
shape.create_frame
prototype.create_interaction
```

Naming rules:

- The part before the dot is the capability domain: `mcp`, `account`, `team`,
  `project`, `file`, `page`, `selection`, `shape`, `prototype`, `export`,
  `render`, `tokens`, `component`, or `debug`.
- The part after the dot is a verb or verb phrase using snake case.
- Global tools must not require an open workspace tab.
- File tools must report a structured `file_context_required` error when they
  need a bound file and none is available.
- Destructive tools should use verbs such as `delete`, `release`, or
  `remove`, and later pass through confirmation/audit policy.
- Legacy underscore tools such as `execute_code`, `export_shape`, and
  `import_image` remain registered for compatibility until typed first-class
  replacements cover the same workflows.

Server code stores the shared registry in
`mcp/packages/server/src/ToolNames.ts`. New tools should use those constants
instead of hand-written string names.

Tool schemas use Zod raw shapes at the `Tool` boundary. The default response
format for structured tools is JSON text with stable top-level keys:

```json
{
  "status": "ok",
  "data": {},
  "warnings": []
}
```

Errors that agents can recover from should include a stable `code`, a human
message, and optional `actions`:

```json
{
  "code": "file_context_required",
  "message": "A Penpot file must be opened or bound before this tool can run.",
  "actions": ["file.list", "file.open", "file.bind_context"]
}
```

Global RPC-backed tools use the same structure for backend and permission
failures:

| Error code | Meaning | Typical next action |
| --- | --- | --- |
| `authentication_required` | No MCP user token is attached to the current session, or the backend returned 401 | Reconnect MCP with a valid `userToken` |
| `penpot_backend_config_invalid` | `PENPOT_BACKEND_URI` or `PENPOT_PUBLIC_URI` is not a valid URL | Fix server configuration |
| `penpot_backend_unavailable` | The MCP server could not reach backend RPC | Start/check the Penpot backend |
| `permission_denied` | Backend returned 403 | Pick a resource available to the user |
| `object_not_found_or_forbidden` | Backend returned `object-not-found`, which Penpot also uses to hide inaccessible objects | List teams/projects/files again and choose an accessible target |
| backend code with underscores | Backend returned a validation/domain error | Inspect `error.data.response` for backend details |

`error.data` may include the backend HTTP status, backend error code/type, and
the original backend response. It must not include raw access tokens.

### 8.1 Global Tools

Available without an open file:

```text
mcp.get_status
account.get_current_user
team.list
project.list
file.list
file.search
file.create
file.duplicate
file.open
file.get_recent
token.get_mcp_status
```

`mcp.get_status` is the first implemented dotted global tool. It returns JSON
text with these top-level fields:

```text
status
data.server
data.transports
data.session
data.plugin
data.fileContext
warnings
```

The tool reuses the same token-safe status model as `/mcp/status`, then adds
current MCP session information. It never returns the raw user token. Until the
Phase 4 file context broker exists, `data.fileContext.status` is reported as
`unbound`.

The first global read tools are implemented through existing Penpot RPC
endpoints and do not require a workspace tab:

| MCP tool | Penpot RPC command | Required input |
| --- | --- | --- |
| `account.get_current_user` | `get-profile` | Current MCP `userToken` |
| `team.list` | `get-teams` | Current MCP `userToken` |
| `project.list` | `get-projects` | Optional `teamId`; without it, projects are fetched for all available teams |
| `file.list` | `get-project-files` | `projectId` |
| `file.get_recent` | `get-team-recent-files` | `teamId`; optional response `limit` |
| `file.create` | `create-file` | `projectId`; optional `name` and `isShared` |

These tools call the backend through `PENPOT_BACKEND_URI`, falling back to
`PENPOT_PUBLIC_URI` and then `http://localhost:6060`. They send the MCP
`userToken` as `Authorization: Token <token>` so normal Penpot access-token
authentication and permissions apply.

`file.create` is the first global write tool. It returns a file summary and
does not bind the new file as the active file context. Until Phase 4 adds
`file.open` and `file.bind_context`, the user or agent should open the new file
in Penpot before calling file-scoped editing tools.

### 8.2 File Context Tools

Require a bound file:

```text
file.get_context
file.bind_context
file.release_context
page.list
page.create
page.rename
page.set_current
selection.get
selection.set
```

### 8.3 Design Editing Tools

Require a bound file and page:

```text
shape.create_frame
shape.create_rect
shape.create_text
shape.create_image
shape.update
shape.delete
shape.group
shape.ungroup
shape.set_layout
shape.set_style
component.create
component.instantiate
tokens.list
tokens.apply
```

### 8.4 Prototype Tools

Require a bound file:

```text
prototype.create_flow
prototype.create_interaction
prototype.create_overlay
prototype.list_interactions
prototype.delete_interaction
```

### 8.5 Export and Render Tools

May start file-bound and later move to headless:

```text
export.shape
export.page
export.file
render.preview
render.thumbnail
```

### 8.6 Advanced Tools

Available only when explicitly enabled:

```text
execute_code
debug.get_plugin_state
debug.get_agent_logs
```

`execute_code` should remain useful for development and emergency fallback, but
normal agent workflows should prefer typed tools.

## 9. Development Order

### Phase 0: Baseline and Documentation

Goal: document the target and avoid accidental architecture drift.

Work:

- Keep this plan in `mcp/docs/`.
- Add a short architecture decision record if ADRs are introduced later.
- Record current code entry points and ports.
- Define naming conventions for global tools and file tools.

Definition of done:

- Architecture plan exists.
- The team can agree on the first implementation phase.

### Phase 1: Gateway and Configuration Cleanup

Goal: one MCP URL from the user's point of view.

Work:

- Ensure `/mcp/stream`, `/mcp/sse`, and `/mcp/ws` work consistently in dev and
  production.
- Keep internal ports configurable, but hide them from normal users.
- Add `penpot-cli mcp status` or equivalent dev script once `penpot-cli` exists.
- Make generated client config always point to the stable stream URL.
- Make WebSocket URL derivation deterministic for built-in mode.

Definition of done:

- Users do not need to know ports `4401`, `4402`, or `4403`.
- Settings page and generated MCP config use the same URL source.
- Local dev can start all MCP dependencies with one command.

### Phase 2: Global Background System Plugin

Goal: MCP can run after login without opening a design file first.

Work:

- Move MCP lifecycle from workspace data flow to global app data flow.
- Start the bundled MCP plugin as a background system plugin.
- Keep manual enable/disable behavior.
- Respect `mcp-auto-connect`.
- Register global connection status in frontend state.
- Preserve multi-tab coordination so only the intended tab owns active MCP work.

Definition of done:

- A logged-in user can enable MCP from settings and see global connection status.
- The plugin can connect in the background.
- Disconnect and reconnect work without reloading the app.

### Phase 3: Global MCP Tools

Goal: MCP provides useful capabilities before file context exists.

Work:

- Add typed global tools for status, teams, projects, files, and file creation.
- Implement these through backend RPC or existing frontend data access where
  appropriate.
- Add structured errors for missing permissions and missing configuration.
- Add tests around tool schemas and permission checks.

Implementation notes:

- `mcp/packages/server/src/ToolNames.ts` is the shared tool-name registry for
  dotted first-class tools and legacy compatibility tools.
- `mcp.get_status` is implemented by
  `mcp/packages/server/src/tools/McpStatusTool.ts` and registered before legacy
  plugin-backed tools.
- The first status tool includes server, transport, plugin, session, and
  placeholder file-context fields. File-context discovery and binding remain
  Phase 4 work.
- `mcp/packages/server/src/PenpotRpcClient.ts` is the first backend RPC bridge
  for global tools.
- `account.get_current_user`, `team.list`, `project.list`, `file.list`, and
  `file.get_recent` are implemented in
  `mcp/packages/server/src/tools/GlobalReadTools.ts`.
- `file.create` is implemented in
  `mcp/packages/server/src/tools/FileCreateTool.ts` using the existing
  `create-file` RPC command and backend project edit permissions.
- `mcp/packages/server/src/tools/PenpotRpcTool.ts` centralizes structured
  global-tool responses and recoverable error actions.
- `mcp/packages/server/test/PenpotRpcClient.test.ts` covers RPC request shape,
  JSON POST bodies, backend configuration/unavailable errors, and auth,
  permission, not-found, and validation error normalization.

Definition of done:

- An MCP client can list projects/files and create a file without a workspace
  being open.
- File-level tools return `file_context_required` instead of generic plugin
  connection failures.

Phase 3 implementation note:

- Global status/read/create tools are implemented and covered by MCP server
  type, format, and focused unit checks.
- `file_context_required` remains Phase 4 because it needs the file context
  registry and file-bound tool classification.

### Phase 4: File Context Broker

Goal: make file context explicit and manageable.

Work:

- Add a context registry in the Global MCP Agent.
- Register opened workspace tabs as available file contexts.
- Add `file.bind_context`, `file.open`, and `file.release_context`.
- If a file is not open, `file.open` should navigate Penpot to it or return a
  user-action-required response.
- Track active page and selection for the bound context.

Definition of done:

- MCP can distinguish global connection from file connection.
- Users can manually bind the current file from the workspace menu.
- Agents can request a file context and receive clear next steps.

### Phase 5: Structured File Tools

Goal: reduce dependence on arbitrary JavaScript execution.

Work:

- Wrap common Plugin API operations in typed MCP tools.
- Start with safe, common primitives:
  - list pages
  - create page
  - create frame
  - create text
  - create rectangle
  - update shape properties
  - export selected shape/page
- Keep implementation plugin-backed at first.
- Add a capability registry so tools can report when they are available.

Definition of done:

- Common prototype generation can be done through typed tools.
- `execute_code` is no longer the normal path for basic creation and export.

### Phase 6: `penpot-cli` Entry Point

Goal: give developers one command-line surface for MCP and automation.

Work:

- Add CLI commands for orchestration:

```bash
penpot-cli dev up --mcp
penpot-cli mcp status
penpot-cli mcp config
penpot-cli mcp logs
```

- Add CLI commands that call the same command runtime:

```bash
penpot-cli file list
penpot-cli file create --name "Demo"
penpot-cli file open <file-id>
penpot-cli export page --file <file-id> --page <page-id>
```

Definition of done:

- Local developers can start and inspect the MCP stack through CLI.
- CLI and MCP share command names, schemas, and results where possible.

### Phase 7: Headless Command Runtime

Goal: move stable operations out of the browser/plugin dependency.

Work:

- Move file/page/shape operations into backend/common command handlers where
  safe.
- Reuse common schemas and file data validation.
- Reuse exporter/render-wasm for output.
- Keep plugin-backed operations only for features that truly need live UI or
  selection context.

Definition of done:

- A subset of prototype generation works without an open browser tab.
- `penpot-cli` can create and export simple designs in headless mode.
- MCP can choose the best adapter: backend, exporter, plugin, or local.

### Phase 8: Hardening and Observability

Goal: make MCP safe enough to be on by default in real deployments.

Work:

- Add audit events for MCP write operations.
- Add rate limits and concurrency limits per user/session/file.
- Add version/capability negotiation between server, plugin, and Penpot.
- Add structured logs and status diagnostics.
- Add explicit permissions for local file access and `execute_code`.
- Add automated tests for connection lifecycle, multi-tab ownership, and
  permission failures.

Definition of done:

- MCP failures are diagnosable from UI and logs.
- Sensitive tools are gated.
- Concurrent sessions cannot silently edit the wrong file.

## 10. Feature Backlog

| Priority | Feature | Main modules | Notes |
| --- | --- | --- | --- |
| P0 | Stable MCP gateway URLs | docker, frontend, mcp, CLI | Hide internal ports from users |
| P0 | Manual MCP enable/disable | frontend, backend | Reuse `profile.props.mcp-enabled` |
| P0 | Manual MCP URL configuration | frontend, backend | Support built-in, custom, local |
| P0 | Background Global MCP Agent | frontend, mcp plugin | Start after login, not workspace-only |
| P0 | Connection status model | frontend, mcp server | Shared states: connected-global, connected-file, error |
| P1 | Global tool group | mcp server, backend | user/team/project/file actions |
| P1 | File context broker | frontend, mcp server | Explicit binding and missing-context errors |
| P1 | Structured page/shape tools | mcp server, mcp plugin | Reduce `execute_code` dependency |
| P1 | CLI MCP orchestration | penpot-cli | Start/status/config/logs |
| P2 | CLI command runtime | penpot-cli, mcp server | Shared schemas with MCP tools |
| P2 | Headless file operations | backend, common | Direct file/page/shape mutation |
| P2 | Headless export path | exporter, render-wasm | Export without open workspace |
| P2 | Audit and rate limiting | backend, mcp server | Required before broad default enablement |

## 11. Security Model

MCP can modify user data, so every layer needs explicit permission boundaries.

Rules:

- MCP token authenticates a Penpot user, not a machine with global privileges.
- Every command must check normal Penpot permissions.
- File tools must check access to the bound file.
- Local file system access is disabled unless local mode and user setting allow
  it.
- `execute_code` is disabled by default in first-class mode, or at minimum
  clearly marked as advanced.
- Write operations should be auditable.
- MCP server should reject unknown or incompatible plugin versions.
- Multi-tab ownership must be explicit to avoid editing the wrong file.

Suggested sensitive settings:

```text
mcp-allow-execute-code
mcp-allow-local-files
mcp-allow-background-writes
mcp-require-confirmation-for-destructive-actions
```

## 12. Open Questions

1. Should MCP be enabled by default for all users, or visible but disabled until
   the user turns it on?
2. Should `execute_code` be available in hosted/remote mode at all?
3. Should global file creation go directly through backend RPC from MCP server,
   or through the Global MCP Agent first?
4. How should a headless command choose a target team/project when the prompt is
   ambiguous?
5. Should `penpot-cli` live inside this monorepo or as a separate package that
   consumes Penpot packages?
6. What is the minimum typed tool set needed to create a useful prototype
   without arbitrary JavaScript?

## 13. Recommended First Implementation Slice

Build the smallest version that proves MCP can be global:

1. Add user-visible MCP mode/config fields.
2. Move MCP lifecycle from workspace scope to app/global scope.
3. Start the bundled plugin as a background system plugin after login.
4. Keep existing file editing through the current plugin bridge.
5. Add a global `mcp.get_status` tool.
6. Add clear `file_context_required` errors for file tools.
7. Add CLI/dev script support to start and inspect the MCP stack.

This keeps the existing working MCP bridge intact while changing the product
model from "open a file, then connect a plugin" to "MCP is part of Penpot, and
file context is attached when needed."
