# Product Positioning And Support Boundary (Phase 34)

Status: **decided for private 0.1.x**.  
This is the source of truth for what this fork **is**, what it **guarantees**,
how issues are triaged, how it relates to upstream Penpot, and what must be
true before any **1.0** claim.

Related:

- [`private-release-0.1.0.md`](./private-release-0.1.0.md)  
- [`distribution-and-versioning.md`](./distribution-and-versioning.md)  
- [`standalone-install.md`](./standalone-install.md)  
- [`thumbnail-and-preview-experience.md`](./thumbnail-and-preview-experience.md)  
- [`production-multi-user-hardening.md`](./production-multi-user-hardening.md)  
- [`debug-diagnostics-descriptor-boundaries.md`](./debug-diagnostics-descriptor-boundaries.md)  
- [`command-runtime-inventory.md`](./command-runtime-inventory.md)  
- [`todo.md`](../../todo.md)  

---

## One-Sentence Positioning

**normojs/penpot** is a **private, self-hosted Penpot 2.15.4 fork** that ships a
first-class **MCP server + `penpot-cli`** automation layer (shared command
runtime, typed tools, portable CLI archive). It is **not** official Penpot
product GA, **not** an npm-published general package, and **not** a drop-in
replacement for stock Penpot SaaS.

| Claim | Allowed for 0.1.x? |
| --- | --- |
| Private fork automation toolkit | **Yes** |
| Self-hosted multi-user capable with documented defaults | **Yes** (see hardening doc) |
| Portable CLI archive (`cli-v0.1.0`) | **Yes** |
| Public npm install | **No** |
| Official Penpot first-party feature | **No** |
| Full headless visual parity (default thumbnails) | **No** |
| Ungated raw log streaming over MCP | **No** |

---

## P34.1 Capability Matrix

Legend:

| Tier | Meaning |
| --- | --- |
| **Guaranteed** | Documented, tested, default-safe for private 0.1.x operators/agents |
| **Gated** | Implemented but off unless env/endpoint explicitly enables |
| **Live-only** | Requires bound browser plugin / editor-local state |
| **Operator path** | Works when operator infrastructure is configured; not default agent GA |
| **Unsupported / rejected** | Will not be treated as a product promise |

### Diagnostics And Status

| Capability | Tier | Notes |
| --- | --- | --- |
| `mcp.get_status` / `penpot-cli mcp status` | Guaranteed | Token-safe aggregate status |
| `penpot-cli mcp config` | Guaranteed | Effective endpoints/mode |
| `penpot-cli mcp logs` (+ `--follow`) | Guaranteed (operator) | Local log dir listing/follow |
| `token.get_mcp_status` / `token status` | Guaranteed | Presence/expiry only; never raw token |
| `debug.get_plugin_state` | Gated | `PENPOT_MCP_ENABLE_DEBUG_TOOLS=true` |
| `debug.get_agent_logs` | Gated (metadata-only) | Same env on MCP; `content: null` default |
| Raw log body over MCP / MCP follow | Unsupported | Use CLI `mcp logs --follow` |

### Discovery And Auth

| Capability | Tier | Notes |
| --- | --- | --- |
| `account me`, `team list`, `project list` | Guaranteed | backend-rpc |
| `file list` / `file recent` / `file search` | Guaranteed | backend-rpc |
| `file.create` / `file.duplicate` / `file.open` | Guaranteed | create/dup RPC; open is URL handoff |
| File context get/bind/release | Guaranteed | Per-user token isolation |

### Headless Authoring

| Capability | Tier | Notes |
| --- | --- | --- |
| `page.list` / `create` / `rename` | Guaranteed | backend-command with fileId |
| `shape.create_*` / `update` / `delete` / group | Guaranteed | Documented field subsets |
| `shape.set_layout` / `set_style` | Guaranteed | Aliases of shape.update |
| Prototype create/list/update/delete/reorder/duplicate/overlay | Guaranteed | Persisted data contracts |
| `component.create` / `instantiate` | Guaranteed | Local + linked-library paths as documented |
| `tokens.list` / `tokens.apply` | Guaranteed | Explicit attributes; materialization best-effort |
| Complex grid cell/area editing | Live-only / limited | Container tracks headless; complex areas may need plugin |
| `page.set_current` / `selection.get` / `selection.set` | **Live-only** | Editor-local; no persisted agent session state |

### Export / Render

| Capability | Tier | Notes |
| --- | --- | --- |
| `export.page` / `export.shape` / `export.file` | Guaranteed | Per inventory adapters |
| `render.preview` | Guaranteed | Explicit targets; exporter/plugin-live |
| `render.thumbnail` | **Operator path** | Endpoint-first renderer-service; **not** default agent GA |
| Multi-target thumbnail matrix | Optional (P31.5) | Non-blocking for 0.1.x |

### Advanced / Legacy

| Capability | Tier | Notes |
| --- | --- | --- |
| `execute_code` | Gated | `PENPOT_MCP_ENABLE_EXECUTE_CODE=true`; prefer typed tools |
| `high_level_overview` / `penpot_api_info` | Guaranteed (legacy docs) | Local docs helpers |
| `import_image` / path-based `export_shape` | Local-only | Disabled in remote/multi-user |

### Distribution

| Capability | Tier | Notes |
| --- | --- | --- |
| CLI release archive | Guaranteed | `pnpm cli:package-check` |
| Full MCP in CLI tar | Unsupported | MCP needs fork checkout/deploy |
| npm publish | Unsupported (policy) | Until Phase 30 decision reversed |
| Official upstream merge | Out of product scope | See P34.3 |

Agents and operators should treat **ToolNames presence** and empty marketing
lists as **non-authoritative**; this matrix + inventory win.

---

## P34.2 Support Boundary And Issue Triage

### In scope for support (private 0.1.x)

- CLI archive install smoke (`--help`, `mcp config`, metadata debug tools)  
- MCP typed tools listed as **Guaranteed** or **Gated** (with env set)  
- Auth/token-safe envelopes (no raw token leakage)  
- File-context bind/isolation bugs  
- Documented env defaults (write limits, destructive confirm, remote FS off)  
- Packaging tip regressions on tagged SHAs (`cli-v0.1.0` lineage)  

### Out of scope / best-effort only

- Stock upstream Penpot without this fork’s MCP packages  
- Third-party agent frameworks beyond “MCP client sends tools”  
- Guaranteeing renderer-service defaults without operator setup  
- Performance SLAs, multi-region SaaS isolation  
- Bugs only reproducible with undocumented custom patches  

### Required reproduction fields

Issues should include:

1. Git tag or SHA (`cli-v0.1.0` / `main` SHA)  
2. Node version  
3. Single-user vs multi-user / remote  
4. Exact CLI command or MCP tool name + redacted args  
5. Redacted env list (names only for secrets)  
6. Whether plugin was connected/compatible  
7. Expected vs actual JSON `error.code` when applicable  

### Severity guidance

| Severity | Examples |
| --- | --- |
| P0 | Raw token leak; cross-user file-context bleed |
| P1 | Guaranteed tool broken on tagged release; package-check fails on tip |
| P2 | Gated tool wrong only when enabled; docs mismatch |
| P3 | Help text, optional matrix, cosmetic |

### Response policy (private product)

No public SLA. Private operators: triage P0/P1 first; feature requests go to
`todo.md` phases rather than silent scope expansion.

---

## P34.3 Upstream Relationship Decision

**Decision for 0.1.x: remain a private fork product.**

| Remote | Role |
| --- | --- |
| `fork` → `https://github.com/normojs/penpot` | **Push target**; product development |
| `upstream` → `https://github.com/penpot/penpot` | **Fetch only**; selective cherry-pick |

### Rules

1. Never `git push upstream`.  
2. Prefer small reviewed cherry-picks of upstream fixes over bulk merges while
   MCP/CLI/renderer-service diverge.  
3. Do not market as “will be merged to official Penpot.”  
4. Revisit contribution upstream only with an explicit product decision and a
   cleaned patch series that does not require private packaging assumptions.

### Consumer implication

Users depending on this automation must track **this fork’s tags/docs**, not
stock Penpot release notes alone.

---

## P34.4 Naming And Branding Review

| Name | Use |
| --- | --- |
| **penpot-cli** | CLI binary and private package name |
| **first-class MCP** | Descriptive of the automation surface in this fork |
| **normojs/penpot** | GitHub product identity |
| **Penpot 2.15.4** | Upstream baseline version only |

### Allowed wording

- “Private Penpot fork with first-class MCP and penpot-cli”  
- “Private 0.1.0 CLI release archive (`cli-v0.1.0`)”  
- “Self-hosted multi-user capable with documented defaults”  

### Disallowed wording (unless a future decision changes)

- “Official Penpot MCP” / “Penpot GA feature”  
- “npm install -g penpot-cli” as supported path  
- “Full visual automation / thumbnail GA for all agents”  
- “Drop-in replacement for penpot.com SaaS”  

Package metadata remains `"private": true`. If npm is ever opened, branding
review must re-run before the first public package name is chosen.

---

## P34.5 1.0 Exit Criteria Checklist

Do **not** tag `cli-v1.0.0` or claim general product 1.0 until **all** boxes
below are intentionally checked in a release review (not by implication).

### Product definition

- [x] Positioning page exists (this document)  
- [x] Capability matrix published (P34.1)  
- [x] Support boundary published (P34.2)  
- [x] Upstream relationship explicit (P34.3)  
- [x] Branding rules explicit (P34.4)  
- [ ] Public audience decision: stay private-only vs early-access vs public  

### Distribution (Phase 30)

- [x] Archive-only portable CLI path verified  
- [x] Standalone install docs  
- [x] Semver graduation rules  
- [ ] If public 1.0: npm or multi-artifact decision **re-opened and implemented**  
- [x] Private archive checksum file next to tar (`.sha256` from `package-check`)
- [ ] If public 1.0: signed checksums / release attestation process (cosign/GPG)  

### Capability honesty (Phases 31–33)

- [x] Thumbnail not claimed as default agent GA  
- [x] File-target thumbnail operator path documented  
- [x] Debug plugin-state gated + token-safe  
- [x] Agent-logs metadata-only + redaction fixtures  
- [ ] Optional: P31.5 multi-target thumbnail matrix (not required for private 1.0,
  required only if 1.0 marketing promises batch thumbnails)  

### Production (Phase 32)

- [x] Multi-user security matrix  
- [x] Token lifecycle guidance  
- [x] Session isolation fixture  
- [x] Write limit operator manual  
- [x] Deploy runbook + compatibility matrix  
- [ ] Production soak / external operator pilot sign-off (process, not code)  

### Engineering gates on the 1.0 tip

- [ ] `pnpm --filter penpot-cli types:check`  
- [ ] `pnpm --filter penpot-cli test`  
- [ ] MCP focused tests for status/token/debug tools  
- [ ] `pnpm cli:package-check` on the **same SHA** to be tagged  
- [ ] Clean-machine extract smoke  
- [ ] No open P0 security items (token leak, cross-user context)  

### Versioning

- [ ] CLI package.json bumped to `1.0.0` only after checklist review  
- [ ] Tag `cli-v1.0.0` with release notes linking this doc  
- [ ] Changelog entry states what 1.0 **does not** include  

**Private 0.1.x may continue shipping** without meeting public 1.0 bars.
Phase 29–33 completion **does not** auto-promote to 1.0.

---

## Recommended Next Product Moves (Post–Phase 34 Docs)

1. Keep shipping **0.1.x** private archives for internal operators.  
2. Optionally execute **P31.5** if dashboard thumbnail batch quality matters.  
3. Run an external/private pilot and check the process boxes under P34.5.  
4. Only then decide public early-access vs stay private-only.

---

## Phase 34 Exit Criteria

| ID | Criterion | Status |
| --- | --- | --- |
| P34.1 | Capability matrix published | This doc |
| P34.2 | Support boundary + triage published | This doc |
| P34.3 | Upstream relationship decision recorded | Private fork; fetch-only upstream |
| P34.4 | Branding rules recorded | This doc + README alignment |
| P34.5 | 1.0 checklist explicit | This doc (many process boxes remain open by design) |
