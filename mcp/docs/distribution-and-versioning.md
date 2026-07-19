# Distribution And Versioning (Phase 30)

Status: **decided for the current product window (post–private 0.1.0)**.  
Companion docs: [`penpot-cli-build-install-strategy.md`](./penpot-cli-build-install-strategy.md),
[`private-release-0.1.0.md`](./private-release-0.1.0.md),
[`standalone-install.md`](./standalone-install.md).

## P30.1 Product Decision: How Users Get Bits

| Option | Verdict (now) | Why |
| --- | --- | --- |
| **Private release archive** (`penpot-cli-<ver>.tar.gz`) | **Accepted — default** | Already verified (Phase 29); vendors `@penpot/command-runtime`; no `workspace:` protocol; works outside monorepo for the CLI binary |
| **Full fork checkout + `pnpm`** | **Accepted — developer/operator path** | Required for MCP server, plugin assets, renderer-service, and Penpot product itself |
| **npm publish (`penpot-cli` / `@penpot/*`)** | **Rejected for now** | Packages remain `"private": true`; workspace runtime boundary and branding/support model are not ready; re-open only via explicit product decision |
| **Multi-artifact public set** (CLI tar + MCP docker + plugin zip) | **Deferred** | Useful later; not blocking private 0.1.x consumers; track under future Phase 30 revision if needed |

### Decision summary

1. **Default portable CLI path** = archive from `pnpm cli:package-check`.
2. **Default MCP/server path** = run from this **private fork checkout** (or your
   existing self-hosted Penpot deploy that includes the fork’s MCP packages).
3. **npm is not a supported install path** until a later decision flips
   `"private": true` and defines publish ownership, versioning, and support.
4. Do **not** claim a single “download one tarball, get full Penpot + MCP”
   general product. CLI archive ≠ full stack.

### When to revisit npm

Re-open npm only if **all** are true:

- Public support boundary exists (Phase 34)
- Runtime packages can be published without `workspace:*` or are fully bundled
- Versioning policy (below) has been used for at least one minor after 0.1.x
- Branding review allows non-official naming (no false “official Penpot” claim)

## P30.3 CLI Version Graduation Policy

CLI package semver lives in `penpot-cli/package.json` and is **independent** of
the Penpot product version (currently Penpot-line `2.15.x` in this fork).

| Bump | When | Examples |
| --- | --- | --- |
| **0.1.x patch** | Bugfixes, docs, tests, non-breaking help/text, gated tool hardening that stays opt-in | Fix envelope field; add smoke test |
| **0.2.0 minor** | Additive CLI/MCP commands or env vars that are backward compatible; new optional adapters | New `debug agent-logs` metadata command; new optional flag |
| **1.0.0 major** | Only after Phase 29–33 exit criteria and Phase 34.5 checklist are green; public install story is intentional | First “general product” claim |
| **Breaking (any major, or 0.x minor if needed)** | Rename/remove commands, change default auth/env, change JSON envelope `status`/`error` shape incompatibly | Require migration notes (P30.5) in the same release |

Rules:

1. Tag private CLI releases as `cli-v<semver>` (e.g. `cli-v0.1.0`).
2. Record packaging tip SHA in release notes / `todo.md`.
3. Do not jump to **1.0.0** only because features feel “done”; 1.0 requires
   distribution + defaults + hardening + positioning checklists.
4. MCP server package version may remain independent; document both when shipping
   coordinated releases.

## P30.4 Portable Dependency Bundling Review

Script: `penpot-cli/scripts/package-release.mjs`.

### What the archive must contain

| Path | Role |
| --- | --- |
| `bin/penpot-cli` | Executable Node wrapper |
| `dist/index.js` | Built CLI |
| `node_modules/@penpot/command-runtime/**` | Vendored runtime (from monorepo `command-runtime/`) |
| `package.json` | `"private": true`, dependency on runtime **version string** (not `workspace:`) |
| `README.md`, `RELEASE.md` | Operator notes |

### Assumptions (current, accepted for 0.1.x)

1. Only **one** workspace runtime dependency is required at CLI runtime:
   `@penpot/command-runtime`.
2. Runtime package `files` field lists everything that must be copied.
3. No transitive npm deps are required for current CLI commands beyond Node
   built-ins + vendored runtime.
4. Verification in-script: extract tar, run `--help` and `mcp config --format json`.

### Gaps / follow-ups (non-blocking for archive-only 0.1.x)

| Gap | Risk | Mitigation |
| --- | --- | --- |
| MCP server **not** in CLI tar | Operators may expect full stack in one file | Documented in private release notes + standalone install |
| Runtime copy uses `runtimePackage.files` only | New runtime files omitted if not listed | Keep `command-runtime/package.json` `files` accurate; package-check asserts `index.js` / `index.d.ts` |
| No checksum/signature step | Supply-chain for private distro | Optional later: SHA256SUMS next to tar |
| No multi-platform native deps today | Low | Revisit if CLI gains native modules |

### Review checklist (run each packaging tip)

```bash
pnpm cli:package-check
python3 - <<'PY'
import json, tarfile, io
from pathlib import Path
tar = Path('tmp/penpot-cli-release/penpot-cli-0.1.0.tar.gz')
with tarfile.open(tar) as t:
    pkg = json.load(t.extractfile('penpot-cli-0.1.0/package.json'))
assert pkg['private'] is True
assert 'workspace:' not in json.dumps(pkg)
assert '@penpot/command-runtime' in pkg.get('dependencies', {})
print('portable package.json OK', pkg['dependencies'])
PY
```

## P30.5 Upgrade / Migration Notes (since private 0.1.0 baseline)

For consumers of **CLI 0.1.0** / tag `cli-v0.1.0`:

### Compatible additions already present in 0.1.0 tip

- `penpot-cli debug plugin-state` (projects MCP status; MCP tool gated by
  `PENPOT_MCP_ENABLE_DEBUG_TOOLS=true`)
- Shared discovery: `account me`, `team list`, `project list`, `file recent`
- `token status` (token-safe; never prints raw MCP token)
- Components/tokens CLI: `component create|instantiate`, `tokens list|apply`
- Export file / render preview / gated render thumbnail dry-run & operator path

### Env vars operators should know

| Env | Purpose |
| --- | --- |
| `PENPOT_CLI_TOKEN` / `PENPOT_MCP_USER_TOKEN` / `PENPOT_ACCESS_TOKEN` | Backend RPC auth for CLI |
| `PENPOT_BACKEND_URI` / `PENPOT_PUBLIC_URI` | Backend/public base URLs |
| `PENPOT_MCP_STATUS_URI` / `PENPOT_MCP_STREAM_URI` / … | MCP endpoint overrides |
| `PENPOT_MCP_ENABLE_EXECUTE_CODE` | Gate legacy `execute_code` (**MCP server**) |
| `PENPOT_MCP_ENABLE_DEBUG_TOOLS` | Gate `debug.get_plugin_state` (**MCP server**) |
| `PENPOT_MCP_REQUIRE_DESTRUCTIVE_CONFIRMATION` | Destructive confirm override |
| Renderer-service vars | See render-thumbnail docs; thumbnail is **not** default GA |

### Breaking changes to avoid casually

- Renaming CLI subcommands (`file list` → something else)
- Changing JSON envelope top-level `status: ok|error` contract
- Returning raw tokens from any status tool
- Enabling `execute_code` or debug tools by default

### Migrating from checkout-linked CLI to archive

```bash
# old (dev)
pnpm --filter penpot-cli build && node penpot-cli/dist/index.js ...

# new (portable)
tar -xzf penpot-cli-0.1.0.tar.gz
./penpot-cli-0.1.0/bin/penpot-cli ...
```

Config env vars are the same; only the binary path changes.

## Exit Criteria For Phase 30

- [x] Explicit archive-only vs npm decision written (this doc + strategy)
- [x] Standalone install doc for CLI archive + fork MCP path
- [x] Version graduation rules written
- [x] Bundling review of `package-release.mjs` recorded
- [x] Migration/upgrade notes for 0.1.0 consumers

Phase 30 does **not** by itself authorize 1.0 or npm publish.
