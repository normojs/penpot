# CLI Profile Config Read Path

Status: P16.1 audit contract
Updated: 2026-06-16

This document defines how `penpot-cli mcp config` should read saved MCP
configuration from a Penpot profile in P16.2 while preserving the current
offline and environment-derived behavior.

## Current State

`penpot-cli mcp config` is currently a local derivation command. It reads flags
and `PENPOT_MCP_*` environment variables, applies runtime defaults, and returns
both legacy camelCase URL fields and a `profileProps["mcp-config"]` preview.
It does not call Penpot.

The existing CLI inputs are:

- flags: `--mode`, `--mcp-mode`, `--auto-connect`, `--public-uri`,
  `--stream-uri`, `--sse-uri`, `--websocket-uri`, `--ws-uri`, `--status-uri`,
  `--url`, `--dir`, `--log-dir`
- environment: `PENPOT_MCP_MODE`, `PENPOT_MCP_AUTO_CONNECT`,
  `PENPOT_MCP_PUBLIC_URI`, `PENPOT_MCP_STREAM_URI`,
  `PENPOT_MCP_SSE_URI`, `PENPOT_MCP_WEBSOCKET_URI`,
  `PENPOT_MCP_STATUS_URI`, `PENPOT_MCP_LOG_DIR`
- backend/auth helpers already used by other commands: `--backend-uri`,
  `PENPOT_BACKEND_URI`, `PENPOT_PUBLIC_URI`, `--token`,
  `PENPOT_CLI_TOKEN`, `PENPOT_MCP_USER_TOKEN`, and `PENPOT_ACCESS_TOKEN`

Backend already exposes `get-profile` and `update-profile-props`.
`get-profile` returns the current authenticated profile when a token/session is
present, and falls back to the anonymous profile object when no profile is
resolved. Profile props are filtered through `filter-props`, and
`:mcp-config` is sanitized to keep only supported modes, boolean
`:auto-connect`, and non-blank URL strings.

Frontend already treats `profile.props.mcp-config` as optional:

- missing config means built-in runtime defaults
- unknown or missing mode means `builtin`
- `auto-connect` defaults to true unless explicitly false
- `local` uses direct local MCP defaults plus explicit URL overrides
- `custom` derives missing endpoints from `public-uri`, then runtime defaults
- `builtin` uses runtime defaults and ignores persisted URL overrides

## P16.2 Command Contract

Profile reading is opt-in so existing scripts do not start making network
requests. P16.2 adds `--profile-source auto|off|backend` to `mcp config`,
with `off` as the default.

Expected meanings:

| Source | Network? | Behavior |
| --- | --- | --- |
| `off` | no | current behavior: flags/env/defaults only |
| `backend` | yes | require a token, call backend `get-profile`, fail clearly on auth/network/backend errors |
| `auto` | maybe | call backend only when a token is present; otherwise report offline fallback without failing |

The backend call uses the existing CLI RPC URL helper shape:

- URL: `<backend-uri>/api/main/methods/get-profile?_fmt=json`
- method: `GET`
- headers: `accept: application/json`, `authorization: Bearer <token>`,
  `cookie: auth-token=<token>`, `x-client: penpot-cli/0.1`

The CLI must treat the anonymous profile id as "no authenticated profile",
not as saved config.

## Precedence

Effective MCP config fields should be resolved in this order:

| Priority | Source | Notes |
| --- | --- | --- |
| 1 | CLI flags | Explicit command-line values always win |
| 2 | Environment variables | Preserve current script/self-hosted behavior |
| 3 | Authenticated profile props | Only when the profile source actually reads a non-anonymous profile |
| 4 | Runtime defaults | Built-in and local defaults from the CLI |
| 5 | Offline fallback | Same as runtime defaults, with source metadata explaining why profile was not read |

The same precedence applies field by field. For example, a saved custom
`public-uri` can supply default endpoints, while `PENPOT_MCP_STREAM_URI` can
override only the stream endpoint and keep the other saved or derived values.

`logDir` remains local-only. It should continue to come from `--dir`,
`--log-dir`, or `PENPOT_MCP_LOG_DIR`; profile props must not persist or supply
log file paths.

## Output Shape

Current JSON fields should remain stable:

- `mode`
- `autoConnect`
- `publicUri`
- `streamUri`
- `sseUri`
- `websocketUri`
- `statusUri`
- `logDir`
- `profileProps["mcp-config"]`

P16.2 adds diagnostic metadata without removing existing fields:

```json
{
  "configSource": {
    "profileSource": "off",
    "status": "disabled",
    "backendUri": null,
    "profileId": null,
    "warnings": []
  },
  "fieldSources": {
    "mode": "default",
    "autoConnect": "default",
    "publicUri": "default",
    "streamUri": "derived",
    "sseUri": "derived",
    "websocketUri": "derived",
    "statusUri": "derived",
    "logDir": "unset"
  }
}
```

Recommended source labels are `flag`, `env`, `profile`, `default`, `derived`,
`unset`, and `fallback`.

Text output stays human-readable and includes profile-source/config-source
lines plus warnings when fallback behavior is involved.

## Error And Fallback Contract

| Case | `off` | `auto` | `backend` |
| --- | --- | --- | --- |
| missing token | ok, skipped | ok, skipped with fallback metadata | fail with `authentication_required` |
| backend unavailable | not called | warn and use env/default fallback | fail with `mcp_profile_read_failed` |
| non-OK profile response | not called | warn and use env/default fallback | fail with normalized backend error |
| anonymous profile | not called | warn and use env/default fallback | fail with `mcp_profile_auth_required` |
| malformed legacy config | not possible from sanitized backend result; defensive CLI parsing should ignore invalid nested values and warn | same | same |
| profile has only `mcp-enabled` | use env/default fallback | use env/default fallback | use env/default fallback |

No profile read path may ever persist or print token values. Token-bearing keys
inside a legacy profile config must be ignored if they appear in raw data.

## Fixture Matrix For P16.2 And P16.3

P16.2 CLI smoke tests cover:

1. default `off` mode does not call backend and preserves current JSON output
   plus source metadata.
2. `backend` with saved custom profile config returns profile-derived values.
3. `backend` with saved local profile config returns local endpoint defaults
   and profile overrides.
4. flags override environment and profile values field by field.
5. environment overrides profile values field by field.
6. `auto` without token succeeds with skipped profile metadata.
7. `backend` without token fails with `authentication_required`.
8. `auto` backend network failure succeeds with warning and fallback.
9. `backend` network failure fails with `mcp_profile_read_failed`.
10. anonymous or zero-uuid profile fails in `backend` and falls back in `auto`.
11. profile containing only `mcp-enabled` behaves like missing `mcp-config`.
12. defensive parsing ignores unknown modes, blank URLs, unknown nested keys,
    and token-like nested keys.

P16.3 should mirror frontend `effective-config` cases:

- built-in missing config
- built-in `auto-connect=false`
- custom with only `public-uri`
- custom with explicit stream/SSE/WebSocket/status overrides
- local defaults
- local partial overrides
- unknown mode fallback
- blank URL fallback
- reset config represented by missing `mcp-config`

## Implementation Notes

The P16.2 implementation stays inside `penpot-cli/src/index.ts` and its
existing smoke test file. It reuses backend `get-profile`; no new backend RPC
is required. Profile reading remains non-default until scripts, CI, and
self-hosted env-only deployments have a migration window.
