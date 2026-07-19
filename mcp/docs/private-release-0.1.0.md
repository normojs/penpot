# Private Release Notes — penpot-cli 0.1.0

Status: **private fork release candidate** (Phase 29).  
Not a public npm package. Not an official Penpot upstream GA claim.

| Field | Value |
| --- | --- |
| CLI package version | `0.1.0` |
| Distribution | Private release archive only |
| Packaging tip (git) | `23b918e3bb` / tag `cli-v0.1.0` on `fork/main` |
| Artifact | `tmp/penpot-cli-release/penpot-cli-0.1.0.tar.gz` (generated) |
| Related docs | [`penpot-cli-build-install-strategy.md`](./penpot-cli-build-install-strategy.md), [`debug-diagnostics-descriptor-boundaries.md`](./debug-diagnostics-descriptor-boundaries.md), [`headless-live-gap-audit.md`](./headless-live-gap-audit.md) |

## What This Release Is

A **private, installable CLI archive** for the normojs/penpot fork’s first-class
MCP/CLI automation layer:

- Shared `@penpot/command-runtime` descriptors and envelopes
- Headless file/page/shape/prototype/component/token paths
- MCP tools + `penpot-cli` parity for the supported command set
- Gated advanced tools (`execute_code`, `debug.get_plugin_state`)

It is intended for **operators and developers who already run this fork**, not
for general public install as a standalone Penpot product.

## Install From Archive (Clean Machine)

Prerequisites: **Node.js ≥ 18**. No monorepo checkout required for the CLI binary.

```bash
# 1) Obtain the tarball produced by the packaging tip:
#    pnpm cli:package-check
#    → tmp/penpot-cli-release/penpot-cli-0.1.0.tar.gz

tar -xzf penpot-cli-0.1.0.tar.gz
cd penpot-cli-0.1.0

./bin/penpot-cli --version
./bin/penpot-cli --help
./bin/penpot-cli debug --help
./bin/penpot-cli mcp config --format text
```

### Extracted-archive smoke checklist (P29.2)

Run **outside** the git checkout (copy only the tarball):

| Step | Command | Expected |
| --- | --- | --- |
| Version | `./bin/penpot-cli --version` | `0.1.0` |
| Help | `./bin/penpot-cli --help` | Lists `mcp`, `token`, `debug plugin-state`, file/page/shape… |
| Debug help | `./bin/penpot-cli debug --help` | Documents `debug plugin-state`; notes agent-logs deferred |
| Config | `./bin/penpot-cli mcp config --format text` | Prints mode/URIs without backend |
| Runtime bundle | `test -f node_modules/@penpot/command-runtime/index.js` | Present; `package.json` has no `workspace:` protocol |

Notes:

- Subcommand `--help` for RPC/status commands may **attempt a real call**
  (e.g. `token status --help`, `debug plugin-state --help`). Prefer group help
  (`debug --help`, `mcp --help`) for offline smoke.
- `debug plugin-state` without a running MCP status URL fails with
  `mcp_status_unreachable` — expected offline.

### Build archive from checkout

```bash
# repo root, on the packaging tip SHA
pnpm cli:package-check
./tmp/penpot-cli-release/penpot-cli-0.1.0/bin/penpot-cli --help
```

## Known Limits (Do Not Over-Claim)

### Distribution

| Limit | Detail |
| --- | --- |
| No npm publish | Packages stay `"private": true`; archive-only unless Phase 30 decides otherwise |
| Not upstream Penpot | Push target is `fork` (normojs/penpot); `upstream` is fetch-only |
| MCP server not in CLI tar | Archive is **CLI + command-runtime**. Full MCP server still needs the fork/deploy path |

### Capabilities

| Area | Status in 0.1.0 |
| --- | --- |
| Headless authoring (file/page/shape/prototype/component/token) | Supported for documented contracts |
| `page.set_current` / `selection.*` | **Live-only** (plugin-live / editor-local); no persisted agent session state |
| `render.thumbnail` | Operator / gated renderer-service path; **not** default agent GA |
| `render.preview` / export | Supported for explicit targets; see inventory |
| `execute_code` | Disabled unless `PENPOT_MCP_ENABLE_EXECUTE_CODE=true` |
| `debug.get_plugin_state` | MCP requires `PENPOT_MCP_ENABLE_DEBUG_TOOLS=true`; CLI projects status URL |
| `debug.get_agent_logs` | **Descriptor-only**; use `penpot-cli mcp logs` |
| Complex grid cell/area editing | Partial; some still plugin-live |
| Multi-user production hardening | Implemented pieces exist; operator matrix/docs are Phase 32 |

### Security defaults (summary)

- Prefer typed tools over `execute_code`
- Never expect raw MCP/user tokens in tool JSON (`token.get_mcp_status` is presence-only)
- Remote/multi-user: keep destructive confirmation and FS access policies as documented in multi-user / gateway docs
- Log bodies are untrusted; do not stream raw logs over MCP by default

## Operator Happy Paths

```bash
# CLI diagnostics without plugin
penpot-cli mcp config --format json
penpot-cli mcp status --url <status-url> --format json
penpot-cli mcp logs --dir <log-dir> --format json

# Plugin/session projection (status endpoint must be up)
penpot-cli debug plugin-state --url <status-url> --format json

# Backend discovery (token required)
export PENPOT_CLI_TOKEN=...
penpot-cli token status --format json
penpot-cli account me --format json
penpot-cli team list --format json
```

MCP agents (default):

- Use `mcp.get_status`, file context bind tools, and typed authoring tools
- Enable `debug.get_plugin_state` only with `PENPOT_MCP_ENABLE_DEBUG_TOOLS=true`
- Do not assume thumbnail or agent-logs tools are fully available

## Verification Recorded For Phase 29

| ID | Result |
| --- | --- |
| P29.1 | Gate on tip: CLI types + 114 tests; MCP focused tests; command-runtime descriptors; `pnpm cli:package-check` |
| P29.2 | Extracted archive smoke: `--version` / `--help` / `debug --help` / `mcp config`; runtime bundled without `workspace:` |
| P29.3 | This document |
| P29.4 | Git tag `cli-v0.1.0` on packaging tip; `todo.md` tip SHA |

## What Comes Next (Not In 0.1.0)

- Phase 30: general distribution / version graduation  
- Phase 31: default thumbnail product narrative and happy path  
- Phase 32: production multi-user matrix and runbooks  
- Phase 33: `debug.get_agent_logs` metadata-only executable path  
- Phase 34: 1.0 exit criteria and positioning  

See [`todo.md`](../../todo.md) for open checklist items.
