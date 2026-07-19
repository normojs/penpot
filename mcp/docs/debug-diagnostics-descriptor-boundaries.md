# Debug Diagnostics Descriptor Boundaries

Status: P28.2 complete for command-runtime catalog. Descriptor-only entries
exist with empty adapters; no MCP tools, CLI handlers, or executable adapters
are registered yet for the debug command names.

This document turns the residual unregistered names in `ToolNames.ts` and the
guidance in [`headless-live-gap-audit.md`](./headless-live-gap-audit.md) into an
explicit Phase 28 contract. It reserves public command names, maps them onto
diagnostics that already exist, and keeps adapters empty until redaction,
session scoping, and enablement gates are specified.

## Product Intent

Agents already see these names under advanced tools:

```text
debug.get_plugin_state
debug.get_agent_logs
```

Today those names are:

- present in `ToolNames.ts` and `AdvancedToolNames`
- present in `command-runtime` as `DEBUG_GET_PLUGIN_STATE` /
  `DEBUG_GET_AGENT_LOGS` inside `DebugDiagnosticsCommandDescriptors`
  with `adapters: []`
- **not** registered in `PenpotMcpServer.initTools()`
- **not** exposed as executable `penpot-cli` commands

Agents must not treat name presence as executable support.

Phase 28 makes the names discoverable as **planned, non-executable** command
catalog entries and documents how they relate to the existing status/log
surfaces. Later phases may add fixtures, enablement gates, MCP tools, and CLI
commands only after the contracts below are stable.

## Existing Diagnostics (Already Executable)

Do **not** invent a second diagnostics stack. Future debug tools must reuse or
project these surfaces:

| Existing surface | Adapter | What it already returns | Gaps relative to debug names |
| --- | --- | --- | --- |
| MCP `mcp.get_status` / CLI `mcp status` | local / HTTP status URL | server mode, transports, plugin connection counts, client compatibility summaries, write limits, logging status, file-context session summary | Plugin detail is aggregated; no dedicated “plugin state” tool name |
| CLI `mcp logs` | local filesystem | log-dir listing (name/size/mtime) and optional `--follow` | No MCP tool equivalent; no tail/content summary API |
| `PluginBridge.getStatus()` | internal | connected/authenticated/compatible client counts, redacted client rows, pending task count | Not a public tool; only via status envelope |
| `getLogStatus()` / `PENPOT_MCP_LOG_DIR` | internal | whether file logging is enabled and the active log file path | Path only; no log body |

Architecture already groups debug tools with `execute_code` as advanced tools
that should only be available when explicitly enabled. Prefer typed status/log
paths for normal agent workflows.

## Command Set

| Command | Planned role | First safe adapter candidate | Current adapter list (Phase 28) |
| --- | --- | --- | --- |
| `debug.get_plugin_state` | Token-safe snapshot of plugin-bridge connectivity and compatibility for the current MCP session | `local` (project of `mcp.get_status.plugin` + session file-context) | `[]` empty |
| `debug.get_agent_logs` | Token-safe summary of MCP server log configuration and recent log file metadata (not raw secrets) | `local` (project of status.logging + `mcp logs` listing) | `[]` empty |

Reserved CLI names (not registered in Phase 28):

```text
debug plugin-state
debug agent-logs
```

These CLI names are intentionally parallel to `mcp status` / `mcp logs`. Until
execution is enabled, operators should keep using:

```text
penpot-cli mcp status
penpot-cli mcp logs --dir <path>
```

## Non-Goals For Phase 28

- Register MCP tools for either debug name.
- Register executable or dry-run CLI commands for either debug name.
- Add non-empty adapters in command-runtime.
- Stream raw log bodies over MCP by default.
- Return `userToken`, auth headers, cookies, or unredacted request payloads.
- Expose other sessions’ plugin clients in multi-user mode.
- Replace `mcp.get_status` / `mcp logs`; those remain the supported ops path.
- Expand legacy `execute_code` as a debug substitute.

## Planned Response Contracts (Descriptor-Only)

These shapes are planning fixtures only. They are **not** returned by any
registered tool until a later executable phase.

### `debug.get_plugin_state` (planned)

```json
{
  "status": "ok",
  "data": {
    "adapter": "local",
    "plugin": {
      "status": "connected|incompatible|negotiating|disconnected",
      "connectedClients": 0,
      "authenticatedClients": 0,
      "compatibleClients": 0,
      "incompatibleClients": 0,
      "pendingNegotiationClients": 0,
      "pendingTasks": 0
    },
    "session": {
      "mode": "single-user|multi-user",
      "userTokenPresent": true,
      "scopedToCurrentSession": true
    },
    "fileContext": {
      "status": "bound|unbound|stale|ambiguous",
      "boundFileId": null
    },
    "nextActions": [
      "mcp.get_status",
      "file.get_context",
      "file.bind_context"
    ]
  }
}
```

Rules:

- Prefer counts and enum status over full client dumps.
- If client rows are included later, strip tokens and keep only compatibility /
  version / connection age fields already safe in `mcp.get_status`.
- Multi-user mode must scope to the current session token’s connection only.
- Never invent plugin workspace DOM state; this is bridge/session state, not
  editor selection or shape trees (those stay live-only tools).

### `debug.get_agent_logs` (planned)

```json
{
  "status": "ok",
  "data": {
    "adapter": "local",
    "logging": {
      "fileLoggingEnabled": true,
      "logDirConfigured": true,
      "activeLogFilePresent": true
    },
    "files": [
      {
        "name": "penpot-mcp-YYYYMMDD-HHMMSS.log",
        "sizeBytes": 0,
        "modifiedAt": "ISO-8601"
      }
    ],
    "content": null,
    "contentPolicy": "metadata-only-default",
    "nextActions": [
      "mcp.get_status",
      "Use penpot-cli mcp logs --dir <path> for operator listing",
      "Use penpot-cli mcp logs --dir <path> --follow for operator tail"
    ]
  }
}
```

Rules:

- Default is **metadata only** (dir configured, file list, sizes, mtimes).
- Absolute paths may be omitted or redacted in remote/multi-user mode; CLI can
  keep local absolute paths when the operator already passed `--dir`.
- Optional future `tailLines` / `level` filters require an explicit enablement
  gate and redaction pass (strip `Authorization`, `Token `, `userToken=`,
  cookies, and long base64 blobs).
- Do not implement log follow over MCP; follow stays CLI/`tail -f` only.

## Enablement Gate (Future Executable Phase Only)

Mirror the `execute_code` pattern. Proposed env (not implemented in Phase 28):

```text
PENPOT_MCP_ENABLE_DEBUG_TOOLS=true
```

Until that gate exists and is documented:

- descriptors keep `adapters: []`
- MCP registration stays off
- CLI execution stays off
- agents should call `mcp.get_status` and operators should use `mcp logs`

## Adapter Decision

| Option | Verdict | Why |
| --- | --- | --- |
| New backend-rpc | Reject for v1 | No Penpot backend RPC owns plugin-bridge or MCP server log files |
| plugin-live task | Reject for v1 | Plugin already reports hello/compatibility over the bridge; extra live tasks add coupling without new persisted data |
| local projection of status/logs | Accept as first executable candidate | Data already assembled by `getStatus()` / log-dir listing |
| empty adapters now | Required for Phase 28 | Discoverability without false executability |

## Security And Multi-User Constraints

1. **Token safety** — same bar as `token.get_mcp_status` and `mcp.get_status`:
   never return raw MCP/user tokens.
2. **Session scope** — multi-user responses must not list other users’ plugin
   clients or file contexts.
3. **Log redaction** — log bodies are untrusted text; default metadata-only.
4. **Remote mode** — prefer not to expose host filesystem absolute paths in MCP
   responses when `remoteMode` is true.
5. **Destructive none** — both commands are read-only; no write limits apply,
   but rate limits may still apply later if log tail is expensive.

## Phase Plan

| ID | Task | Modules | Exit criteria |
| --- | --- | --- | --- |
| **P28.1** | done | Plan debug diagnostics descriptor boundaries (this document) | `mcp/docs`, `todo.md`, `CHANGES.md` | Names mapped to existing status/log surfaces; non-goals and response contracts explicit; adapters empty by policy |
| **P28.2** | done | Add descriptor-only `debug.get_plugin_state` / `debug.get_agent_logs` entries | `command-runtime`, tests, inventory | `DebugDiagnosticsCommandDescriptors` group; empty adapters; lookup by id / mcpToolName / cliCommand; Migrated 47 |
| **P28.3** | todo | Align residual inventory/architecture wording | `mcp/docs`, `todo.md` | “Declared but not registered” section marks both as descriptor-only planned; advanced-tools section references this doc |

### First post-descriptor executable candidate (not Phase 28)

Prefer **`debug.get_plugin_state`** as a thin local projection of
`mcp.get_status` plugin + session file-context fields, still behind
`PENPOT_MCP_ENABLE_DEBUG_TOOLS`. Defer log-content APIs until redaction fixtures
exist; keep `mcp logs` as the operator path for file listing/follow.

## Verification Notes For Later Implementation

When execution is eventually enabled:

1. command-runtime tests: empty adapters until gate + registration land.
2. MCP tool tests: enablement false → structured `debug_tools_disabled` (or
   tool absent); enablement true → token-safe plugin snapshot.
3. CLI smoke: `debug plugin-state` / `debug agent-logs` mirror MCP data; logs
   metadata matches `mcp logs` listing for the same `--dir`.
4. Multi-user fixture: session A cannot observe session B plugin clients.
5. Redaction fixture: synthetic log lines containing tokens never appear in
   MCP/CLI JSON.

## Relationship To Other Commands

| Command | Relationship |
| --- | --- |
| `mcp.get_status` | Superset ops snapshot; remains default agent diagnostics entry |
| `mcp.logs` / CLI `mcp logs` | Operator log-dir listing/follow; future `debug.get_agent_logs` projects a subset |
| `token.get_mcp_status` | Profile MCP token presence only; not plugin/log diagnostics |
| `file.get_context` | File-context detail; plugin-state may link nextActions here when unbound |
| `execute_code` | Legacy advanced tool; not a substitute for structured debug tools |

## Decision Summary

1. Keep both debug names **descriptor-only** in Phase 28 with **empty adapters**.
2. Map them onto **existing** status and log surfaces instead of new backends.
3. Default log access is **metadata-only**; raw tail needs a later gated design.
4. Any executable registration requires an explicit enablement env and
   multi-user/session redaction tests.
5. Until then, agents and operators should use `mcp.get_status` and
   `penpot-cli mcp logs`.
