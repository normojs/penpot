# Production Multi-User Hardening (Phase 32)

Status: **operator policy + defaults for self-hosted multi-user / remote MCP**.  
Implements the Phase 32 documentation exit criteria. Code already provides many
of these controls; this page is the security matrix, token guidance, isolation
expectations, rate-limit knobs, deploy runbook, and compatibility matrix.

Related:

- [`multi-user-mode.md`](./multi-user-mode.md) — flags and bootstrap notes  
- [`self-hosted-mcp-gateway.md`](./self-hosted-mcp-gateway.md) — gateway shape  
- [`standalone-install.md`](./standalone-install.md) — install entry  
- [`thumbnail-and-preview-experience.md`](./thumbnail-and-preview-experience.md)  
- [`private-release-0.1.0.md`](./private-release-0.1.0.md)  

> Multi-user mode remains a **self-hosted / fork** capability. It is not an
> official Penpot SaaS claim. Treat shared deployments as high-trust only after
> reviewing this matrix.

## P32.1 Security Defaults Matrix

| Control | Local single-user (default) | Multi-user (`--multi-user`) | Remote (`PENPOT_MCP_REMOTE_MODE=true`) |
| --- | --- | --- | --- |
| Auth token on MCP stream | Optional for some local flows | **Required** (`?userToken=`) | **Required** in practice |
| Plugin auth | Local plugin hello | Same token as MCP user | Same |
| File-system tools (`import_image`, path export) | **Enabled** (local FS assumed) | **Disabled** (remote mode forced) | **Disabled** |
| Destructive confirmation | Off unless env forces on | **On** unless `PENPOT_MCP_REQUIRE_DESTRUCTIVE_CONFIRMATION=false` | **On** unless explicitly false |
| `execute_code` | Off unless `PENPOT_MCP_ENABLE_EXECUTE_CODE=true` | Same (keep **off** in shared hosts) | Same |
| `debug.get_plugin_state` | Off unless `PENPOT_MCP_ENABLE_DEBUG_TOOLS=true` | Same; projection is token-safe counts | Same |
| `debug.get_agent_logs` | Not executable | Not executable | Not executable |
| Write rate / concurrency limits | On (env-tunable) | On | On |
| Session idle timeout | 60 minutes (streamable HTTP) | Same | Same |
| File context registry | Per-token session key | **Isolated per user token** | Same |
| Status `/mcp/status` | Token-safe aggregate | Token-safe; do not put secrets in logs | Prefer not exposing host paths |

### Recommended production baseline

```bash
# MCP process
# multi-user flag or equivalent entrypoint
export PENPOT_MCP_REMOTE_MODE=true   # if multi-user not already forcing remote
# Leave execute_code and debug tools unset/false
# Optional harden:
export PENPOT_MCP_REQUIRE_DESTRUCTIVE_CONFIRMATION=true
```

**Do not** enable `PENPOT_MCP_ENABLE_EXECUTE_CODE` or
`PENPOT_MCP_ENABLE_DEBUG_TOOLS` on shared multi-tenant hosts without a written
exception.

## P32.2 Token Lifecycle And Rotation

### Token types

| Token | Where used | Storage rule |
| --- | --- | --- |
| MCP access token (`type=mcp` in Penpot) | MCP client stream URL `userToken` | Never in `profile.props`; never in tool JSON |
| Session / auth-token for CLI RPC | `PENPOT_CLI_TOKEN` etc. | Env or secret store; not committed |
| Plugin connection token | Must match MCP user token in multi-user | Not logged in full |

### Operator guidance

1. Create/regenerate MCP tokens in Penpot **Settings → Integrations** (fork UI).  
2. Prefer short-lived tokens where your IdP/Penpot policy allows.  
3. On compromise: **revoke/regenerate**, restart MCP clients, disconnect plugins.  
4. Use `token.get_mcp_status` / `penpot-cli token status` for **presence/expiry only**.  
5. Log only **fingerprints** (server already avoids printing raw tokens in status).  
6. Rotate tokens after staff offboarding or public log exposure.

### Never do

- Return raw MCP/user tokens from tools or status envelopes  
- Put tokens in `profile.props.mcp-config`  
- Share one userToken across unrelated people in multi-user mode  

## P32.3 Session Isolation Expectations

### Guarantees (implemented)

| Boundary | Behavior |
| --- | --- |
| File context registry | Keyed by user token (`sessionKey`); token A cannot read token B contexts |
| MCP request context | `AsyncLocalStorage` carries `userToken` + `mcpSessionId` per request |
| Streamable sessions | Map session id → `{ transport, userToken }` |
| Plugin bridge tasks | Associated with authenticated plugin clients |
| Debug plugin-state | When enabled, returns **counts** + **current session** fileContext summary; not other users’ raw client tokens |

### Fixture / test expectation

Automated coverage must keep proving:

```text
Given contexts bound under token-1 and token-2,
getSessionSummary(token-1) never lists token-2 contexts.
```

See `FileContextRegistry` tests (multi-token isolation case).

### Residual risks (honest)

- Process-wide aggregates (e.g. total plugin client counts on status) may still
  reflect server-wide activity; they must stay **token-free**.  
- Operators with host access can read log files — keep log redaction discipline
  (Phase 33 for agent-logs).  
- Hard-coded plugin test tokens in older multi-user bootstrap notes are
  **dev-only**; production must inject real per-user tokens.

## P32.4 Rate And Write Limits (Operator Manual)

Implementation: `McpWriteLimiter.fromEnv()`.

### Defaults (per rolling window)

| Knob | Env | Default |
| --- | --- | --- |
| Window | `PENPOT_MCP_WRITE_RATE_WINDOW_MS` | `60000` (1 min) |
| Rate / user | `PENPOT_MCP_WRITE_RATE_LIMIT_PER_USER` | `240` |
| Rate / session | `PENPOT_MCP_WRITE_RATE_LIMIT_PER_SESSION` | `120` |
| Rate / file | `PENPOT_MCP_WRITE_RATE_LIMIT_PER_FILE` | `120` |
| Concurrency / user | `PENPOT_MCP_WRITE_CONCURRENCY_PER_USER` | `4` |
| Concurrency / session | `PENPOT_MCP_WRITE_CONCURRENCY_PER_SESSION` | `2` |
| Concurrency / file | `PENPOT_MCP_WRITE_CONCURRENCY_PER_FILE` | `1` |

### Error codes agents see

| Code | Meaning |
| --- | --- |
| `mcp_write_rate_limit` | Too many writes in the window for user/session/file |
| `mcp_write_concurrency_limit` | Too many concurrent writes |

Responses include scope, limit, and optional `retryAfterMs` / `resetAt` when
available. Tune **up** carefully for batch automation; tune **down** for noisy
shared agents.

### Observability

`mcp.get_status` → `writeLimits` summarizes limiter status without secrets.

## P32.5 Deploy Runbook

### A. Local single-user (dev)

1. Start Penpot devenv (frontend/backend) for this fork.  
2. Enable MCP (`enable-mcp` / profile flag as documented).  
3. Start MCP server package (`pnpm run start:dev` in `mcp/packages/server` or
   compose service).  
4. Connect MCP client to public `/mcp/stream` (or local stream URL).  
5. Open browser with plugin; confirm `mcp.get_status` shows plugin compatibility.  
6. `file.bind_context` then run a typed tool (e.g. `page.list`).  
7. CLI: `penpot-cli mcp status`, `penpot-cli token status`.

### B. Self-hosted multi-user (production-shaped)

1. Deploy **this fork** images/checkout (not stock upstream alone).  
2. Follow [`self-hosted-mcp-gateway.md`](./self-hosted-mcp-gateway.md):
   public `/mcp/stream|sse|ws|status` only; keep `4401`/`4402` internal.  
3. Run MCP with **multi-user** (and thus remote mode):
   - no local FS tools  
   - destructive confirmation on by default  
4. TLS terminate at edge; do not put raw tokens in access logs.  
5. Issue **per-user** MCP tokens; configure each MCP client with its own
   `userToken`.  
6. Plugin must authenticate with the **same** user token.  
7. Health checks:
   - `GET /mcp/status` (token-safe)  
   - plugin connected + compatible  
   - write a canary shape in a test file, then delete with confirmation policy  
8. Keep `execute_code` and debug tools **off** unless break-glass.  
9. Optional: tune write limiter envs; ship log volume mounts with restricted ACLs.

### C. First agent call checklist

```text
[ ] status ok, multiUserMode/remoteMode as expected
[ ] userTokenPresent true for the session
[ ] plugin status connected/compatible for this user
[ ] file context bound before file-scoped tools
[ ] destructive tools require confirmation when remote
[ ] no raw tokens in JSON responses
```

## P32.6 Compatibility Matrix

| Component | Supported baseline (fork private 0.1.x) | Notes |
| --- | --- | --- |
| Penpot product line | **2.15.4** fork base | Re-verify after upstream cherry-picks |
| Node.js | **≥ 18** | CLI archive + MCP TS packages |
| Package manager | **pnpm** (workspace) | Checkout path |
| MCP transports | Streamable HTTP, SSE (legacy), WS plugin | Prefer stream + WS |
| CLI | `penpot-cli` **0.1.0** / tag `cli-v0.1.0` | Archive or checkout |
| Browser plugin | Bundled MCP plugin assets with frontend | Must match server negotiation |
| renderer-service | Optional operator path | Not required for core multi-user authoring |
| Official npm | **Not supported** | Archive-only decision (Phase 30) |

Version skew: if plugin negotiation reports incompatible, upgrade plugin assets
and MCP server together from the same fork tip.

## Phase 32 Exit Criteria

| ID | Criterion | Status |
| --- | --- | --- |
| P32.1 | Security defaults matrix published | This doc |
| P32.2 | Token lifecycle guidance published | This doc |
| P32.3 | Session isolation expectation + automated fixture | Registry multi-token test |
| P32.4 | Rate/write limit operator manual | This doc |
| P32.5 | Deploy runbook local + multi-user | This doc |
| P32.6 | Compatibility matrix | This doc |

## Explicit Non-Goals

- Multi-tenant SaaS isolation beyond single self-hosted process  
- Guaranteeing zero aggregate counters on status  
- Enabling execute_code/debug by default  
- Shipping MCP inside the CLI tarball  
