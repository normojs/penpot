# penpot-cli / first-class MCP — work tracker

Lean tracker: **open work only**. Completed Phase 0–28 execution history was
removed 2026-07-19; recover from git history if needed. Product changelog:
`CHANGES.md`. Architecture and inventories live under `mcp/docs/`.

## Tracking Rules

- Prefer small, reviewable tasks with clear modules and verification.
- Mark status only after the stated scope is verified.
- Keep at most one roadmap feature row `in_progress` unless work is truly
  parallel and independent.
- Do not re-open completed historical phases here; add a new phase/row instead.
- Link docs under `mcp/docs/` rather than duplicating long design text.

## Status Legend

- `todo`: not started
- `in_progress`: actively being worked on
- `done`: completed and verified for its scope
- `blocked`: cannot proceed without a decision or external dependency

## Current Focus

**Private fork is feature-complete for the Phase 1–28 engineering program**
(headless MCP/CLI runtime, components/tokens, gated `debug.get_plugin_state`,
inventory/test coverage). CLI package version remains `0.1.0` with private
release archive distribution.

**Open path to general product** is Phase 29–34 / F37–F42: private release
graduation, distribution/versioning, default thumbnail experience, multi-user
hardening, remaining debug diagnostics (`debug.get_agent_logs`), and product
positioning. **P29.1 release gate passed on tip `a073398fcd` (2026-07-19).**
Next: **P29.2** clean-machine / extracted-archive smoke documentation, then
**P29.3** known-limits notes and **P29.4** tag.

Completed baseline (not re-listed as open tasks):

- Phases 1–28 product slices (see git history / `CHANGES.md`)
- Gated `debug.get_plugin_state` (MCP + CLI; `PENPOT_MCP_ENABLE_DEBUG_TOOLS`)
- MCP/CLI smoke and focused tool tests for status/token/debug/legacy tools
- Server ESM `.js` import suffixes for tools + root modules
- Private packaging path: `pnpm cli:package-check` → `tmp/penpot-cli-release/`
- Upstream policy: fetch-only `upstream`, push only to `fork`
- **P29.1** tip release gate on `a073398fcd`

## Feature Roadmap

Open capabilities only. Completed F1–F36 (Phases 1–28 product slices) are
historical and removed from this tracker; see git history / CHANGES.md for
detail.

| ID | Status | Capability | Target phases | User outcome | First acceptance check |
| --- | --- | --- | --- | --- | --- |
| F37 | todo | Private fork release graduation | Phase 29 | Operators can install a verified private `penpot-cli` archive from current `main` with documented smoke checks | Tip re-runs `pnpm cli:package-check`, clean-machine `--help`, and core CLI smokes; packaging tip records current git SHA |
| F38 | todo | General distribution and versioning | Phase 30 | Non-checkout users can install MCP/CLI without a full fork tree under an explicit packaging policy | Product decision on archive-only vs npm; install docs; CLI version graduation rules beyond `0.1.0` |
| F39 | todo | Default thumbnail and preview experience | Phase 31 | Agents can rely on a documented default path for file/frame thumbnails without undocumented gate spelunking | Default enablement policy for `render.thumbnail`; operator vs agent matrix; known-limits page |
| F40 | todo | Production multi-user hardening | Phase 32 | Self-hosted multi-user deployments have explicit security defaults, token guidance, and diagnostics redaction | Multi-user defaults, destructive confirmation, rate limits, log redaction fixtures, deploy runbook |
| F41 | todo | Completing debug diagnostics | Phase 33 | Operators and gated agents can inspect log metadata safely; raw tail stays explicit | Executable `debug.get_agent_logs` metadata-only default; redaction fixtures; optional gated tail |
| F42 | todo | General product positioning and support boundary | Phase 34 | Users understand whether this is a private fork product, early access, or candidate for upstream | Capability matrix, support boundary, upstream sync policy for consumers |

## Phase 29: Private Fork Release Graduation

Goal: treat current fork tip as a **private 0.1.x release candidate**: re-verify
packaging on tip, document known limits, and freeze a installable archive without
claiming general public GA.

| ID | Status | Task | Modules | Verification | Notes |
| --- | --- | --- | --- | --- | --- |
| P29.1 | done | Re-run release gate on current tip | `penpot-cli`, `mcp/packages/server`, root | Completed 2026-07-19 on `a073398fcd`: `penpot-cli types:check` + full CLI tests 114/114; MCP focused tests 31/31; command-runtime descriptor tests; `pnpm cli:package-check` → `tmp/penpot-cli-release/penpot-cli-0.1.0.tar.gz`; extracted `bin/penpot-cli --help` / `debug --help` / `mcp config` work | Must re-run if tip moves before P29.4 tag |
| P29.2 | todo | Clean-machine / extracted-archive smoke | release archive | Extract tar; `bin/penpot-cli --help`; `debug plugin-state --help`; `mcp config --help` | Confirms archive is not checkout-coupled |
| P29.3 | todo | Known-limits and private release notes | `mcp/docs`, `CHANGES.md`, `todo.md` | Document live-only tools, gated debug/execute_code, thumbnail operator path, no npm | Prevents over-claiming “general product” |
| P29.4 | todo | Tag and record packaging tip | git, `todo.md`, build-install strategy | Tag (e.g. `cli-v0.1.0` or dated fork tag); tip SHA matches `fork/main` | Private release only |

## Phase 30: General Distribution And Versioning

Goal: define how non-developers install and upgrade without a full Penpot fork
checkout. Blocks “general product” even when features are complete.

| ID | Status | Task | Modules | Verification | Notes |
| --- | --- | --- | --- | --- | --- |
| P30.1 | todo | Product decision: archive-only vs npm vs multi-artifact | root docs, packaging | Written decision in build-install strategy | npm remains optional; decision must be explicit |
| P30.2 | todo | Standalone install documentation | `mcp/docs`, README pointers | Fresh user can install MCP server + CLI from docs alone | Include Node version, env vars, token setup |
| P30.3 | todo | CLI version graduation policy | `penpot-cli/package.json`, CHANGES | Rules for 0.1 → 0.2 / 1.0; breaking-change notes | Keep CLI semver independent of Penpot product version |
| P30.4 | todo | Portable dependency bundling review | release script, command-runtime | Archive includes runtime deps; no workspace: protocol left unresolved | Revisit package-release.mjs assumptions |
| P30.5 | todo | Upgrade / migration notes for CLI consumers | `mcp/docs` | Document config env renames and command additions since 0.1.0 | Required before calling anything 1.0 |

## Phase 31: Default Thumbnail And Preview Experience

Goal: make visual output promises honest and, where chosen, default-usable.
`render.thumbnail` remains the largest capability gap for “general” agents.

| ID | Status | Task | Modules | Verification | Notes |
| --- | --- | --- | --- | --- | --- |
| P31.1 | todo | Document default thumbnail enablement policy | `mcp/docs`, architecture | Clear agent vs operator matrix; default-off vs endpoint-first | Do not silently claim full thumbnail GA |
| P31.2 | todo | Reduce remaining operator-only friction for one happy path | `renderer-service`, CLI, MCP | One documented file-target happy path with env/flags listed | Prefer file target before multi-frame matrix |
| P31.3 | todo | Failure UX for unavailable renderer | MCP, CLI | Stable `renderer_service_unavailable` actions point to docs | Already partially present; harden user-facing actions |
| P31.4 | todo | Preview vs thumbnail product narrative | docs, inventory | `render.preview` vs `render.thumbnail` when to use which | Avoid duplicate export/render confusion |
| P31.5 | todo | Optional: multi-target thumbnail matrix (post-happy-path) | renderer-service | Tagged-frame + file matrix tests | Explicitly non-blocking for private 0.1.x |

## Phase 32: Production Multi-User Hardening

Goal: self-hosted multi-user / remote deployments have explicit, testable defaults.

| ID | Status | Task | Modules | Verification | Notes |
| --- | --- | --- | --- | --- | --- |
| P32.1 | todo | Multi-user / remote default security matrix | MCP server, docs | Table of defaults for tokens, destructive confirm, FS access, execute_code, debug tools | Align with `multi-user-mode.md` / gateway docs |
| P32.2 | todo | Token lifecycle and rotation guidance | docs, token tools | Document create/regenerate/expiry; never log raw tokens | Builds on `token.get_mcp_status` |
| P32.3 | todo | Session isolation fixtures | MCP tests | Session A cannot observe session B file contexts / debug projections | Critical for multi-user claims |
| P32.4 | todo | Rate limit / write limit operator docs | MCP write limiter, docs | How to tune and how limits appear in errors | Already implemented; needs operator manual |
| P32.5 | todo | Deploy runbook (single-user local + multi-user) | `mcp/docs` | Step-by-step start, health, plugin connect, first agent call | Gateway + devenv + host modes |
| P32.6 | todo | Compatibility matrix | docs | Penpot version, Node, browser plugin negotiation | Version skew is a GA blocker |

## Phase 33: Completing Debug Diagnostics

Goal: finish the diagnostics story after gated `debug.get_plugin_state`.

| ID | Status | Task | Modules | Verification | Notes |
| --- | --- | --- | --- | --- | --- |
| P33.1 | todo | Executable `debug.get_agent_logs` metadata-only | command-runtime, MCP, CLI | Empty → `local` adapter; list log files sizes/mtimes; `content: null` by default | Project `mcp logs` / `getLogStatus()` |
| P33.2 | todo | Log redaction fixtures | MCP, CLI tests | Synthetic lines with tokens never appear in JSON | Required before any tail API |
| P33.3 | todo | Optional gated log tail | MCP (optional), CLI | Env-gated tailLines; still no follow over MCP | Follow stays CLI/`tail -f` |
| P33.4 | todo | Inventory/architecture alignment after agent-logs lands | docs | Remove “descriptor-only” for agent-logs when executable | Mirror Phase 28/post-28 pattern |

## Phase 34: Product Positioning And Support Boundary

Goal: decide what “general product” means for this fork and what is explicitly out
of scope (including upstream).

| ID | Status | Task | Modules | Verification | Notes |
| --- | --- | --- | --- | --- | --- |
| P34.1 | todo | Capability matrix (guaranteed / gated / live-only / unsupported) | docs | One page agents and operators can trust | Source of truth for sales/support claims |
| P34.2 | todo | Support boundary and issue triage | docs | What bugs are accepted; env required for repro | Prevents unbounded support load |
| P34.3 | todo | Upstream relationship decision | docs, git remotes policy | Stay fork product vs pursue upstream contribution path | Fetch-only upstream remains default until decided |
| P34.4 | todo | Naming / branding review | docs, package metadata | Avoid implying official Penpot GA unless true | Especially if npm ever opens |
| P34.5 | todo | 1.0 exit criteria checklist | `todo.md` | Explicit gates linking P29–P33 done rows | No 1.0 tag until checklist green |

## Remaining Work Checklist

Mark items `[x]` only when the matching phase-table row is `done` and verified.
Keep at most one roadmap feature `in_progress`.

### Phase 29: Private fork release graduation

- [x] **P29.1** Re-run release gate on tip `a073398fcd` (`types:check`, CLI 114 tests, MCP focused 31 tests, `pnpm cli:package-check`, extracted archive `--help`)
- [ ] **P29.2** Clean-machine / extracted-archive smoke (`bin/penpot-cli --help`, `debug plugin-state --help`, `mcp config --help`)
- [ ] **P29.3** Known-limits + private release notes (live-only, gated tools, thumbnail operator path, no public npm claim)
- [ ] **P29.4** Tag private release and record packaging tip SHA on `fork/main`

### Phase 30: General distribution and versioning

- [ ] **P30.1** Product decision: archive-only vs npm vs multi-artifact distribution
- [ ] **P30.2** Standalone install documentation (MCP server + CLI without full fork checkout narrative)
- [ ] **P30.3** CLI version graduation policy (0.1.x → 0.2 / 1.0 rules, breaking-change notes)
- [ ] **P30.4** Portable dependency bundling review for release archive
- [ ] **P30.5** Upgrade / migration notes for CLI/MCP consumers

### Phase 31: Default thumbnail and preview experience

- [ ] **P31.1** Document default `render.thumbnail` enablement policy (agent vs operator matrix)
- [ ] **P31.2** One documented file-target thumbnail happy path (env/flags, expected failures)
- [ ] **P31.3** Harden unavailable-renderer user-facing actions/docs
- [ ] **P31.4** Preview vs thumbnail product narrative in inventory/docs
- [ ] **P31.5** Optional multi-target thumbnail matrix (post happy-path; non-blocking for 0.1.x)

### Phase 32: Production multi-user hardening

- [ ] **P32.1** Multi-user / remote default security matrix (tokens, destructive confirm, FS, execute_code, debug tools)
- [ ] **P32.2** Token lifecycle and rotation guidance (create/regenerate/expiry; never log raw tokens)
- [ ] **P32.3** Session isolation fixtures (session A cannot observe session B contexts/debug projections)
- [ ] **P32.4** Rate/write limit operator documentation
- [ ] **P32.5** Deploy runbook (local single-user + multi-user/gateway)
- [ ] **P32.6** Compatibility matrix (Penpot / Node / plugin negotiation)

### Phase 33: Completing debug diagnostics

- [ ] **P33.1** Executable `debug.get_agent_logs` metadata-only (`local` adapter; no raw body by default)
- [ ] **P33.2** Log redaction fixtures (tokens never leak in JSON)
- [ ] **P33.3** Optional gated log tail (no MCP follow; CLI follow remains `mcp logs --follow`)
- [ ] **P33.4** Docs alignment after agent-logs becomes executable

### Phase 34: Product positioning and support boundary

- [ ] **P34.1** Capability matrix page (guaranteed / gated / live-only / unsupported)
- [ ] **P34.2** Support boundary and issue triage rules
- [ ] **P34.3** Upstream relationship decision (remain fork product vs pursue upstream path)
- [ ] **P34.4** Naming / branding review (no false “official Penpot GA” claim)
- [ ] **P34.5** Explicit 1.0 exit criteria checklist linking P29–P33

### Explicitly not open (policy)

- [ ] **Public npm publish as default distribution** — still not open unless P30.1 explicitly chooses npm
- [ ] **Official upstream Penpot merge / first-party GA claim** — blocked on P34.3 product decision
- [ ] **Persisted agent session state replacing live-only page/selection tools** — product decision remains plugin-live/editor-local (2026-07-19)
- [ ] **Ungated raw log body streaming over MCP** — rejected; metadata-only default + optional gated tail only (Phase 33)
