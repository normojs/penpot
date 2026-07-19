# penpot-cli

Private fork of [Penpot](https://github.com/penpot/penpot) that makes **MCP** and
**`penpot-cli`** first-class automation surfaces for design files.

Base line: Penpot **2.15.4** (MPL-2.0).

This is not a drop-in replacement for the official Penpot product surface. It
keeps the design tool and permission model, and adds shared, typed automation
paths so agents and scripts can inspect accounts and files, create or edit
supported objects, bind live file context, and export results — without treating
MCP as a hidden debug feature or a project-local plugin hack.

Repository: <https://github.com/normojs/penpot>

Upstream Penpot: <https://github.com/penpot/penpot>

## Why this fork

| Goal | What it means here |
| --- | --- |
| Built in, user controlled | MCP is part of the product surface, enabled and configured by the user |
| One shared command model | MCP tools and `penpot-cli` share descriptors, envelopes, and adapters |
| Headless where safe | Stable commands prefer backend/common/exporter paths; live workspace stays available for editor-local state |
| Permissions preserved | Automation still runs through normal Penpot auth and access checks |
| Typed before arbitrary | Prefer explicit commands over free-form code execution |

Success looks like: configure MCP once, use the same concepts from an AI client
or the terminal, and run supported workflows without keeping a browser tab open
just to hold plugin state.

## Architecture (short)

```text
Users / AI agents
  |
  +-- Penpot UI (settings, diagnostics, bind/release)
  +-- MCP clients  ->  /mcp/stream | /mcp/sse | /mcp/ws
  +-- penpot-cli   ->  local orchestration + command adapters

Command runtime (@penpot/command-runtime)
  descriptors · request/result envelopes · adapter selection · errors

Adapters
  backend-rpc · backend-command · plugin-live · exporter
  renderer-service · browser-url · local-fs (gated)
```

Deeper design notes live under [`mcp/docs/`](mcp/docs/), especially:

- [`mcp/docs/first-class-mcp-architecture.md`](mcp/docs/first-class-mcp-architecture.md)
- [`mcp/docs/penpot-cli-overall-blueprint.md`](mcp/docs/penpot-cli-overall-blueprint.md)
- [`mcp/docs/headless-command-runtime.md`](mcp/docs/headless-command-runtime.md)

Product intent: [`PRODUCT.md`](PRODUCT.md). Agent operating guide: [`AGENTS.md`](AGENTS.md).

## Repository layout

| Path | Role |
| --- | --- |
| `frontend/` | Penpot design editor (ClojureScript) + MCP lifecycle/UI integration |
| `backend/` | HTTP/RPC, auth, headless command support |
| `common/` | Shared schemas and file-data helpers |
| `mcp/` | MCP server, plugin assets, architecture docs |
| `penpot-cli/` | Terminal entry point for status, config, file/page/shape/export flows |
| `command-runtime/` | Shared command descriptors and adapter selection |
| `renderer-service/` | Thumbnail renderer process boundary (gated; still evolving) |
| `exporter/` | Headless export pipeline |
| `render-wasm/` | Canvas renderer (WASM) |
| `todo.md` | Execution tracker for this fork |

pnpm workspace packages today: `command-runtime`, `penpot-cli`, `renderer-service`.

## Current capability snapshot

Already in good shape for private checkout use:

- Global MCP connection lifecycle, persisted config, diagnostics
- Typed tools/commands for files, pages, shapes, prototype flows/interactions
- Shared CLI/MCP paths for many create/update/delete/export operations
- File context bind/release and live selection commands when a workspace is bound
- `export.file` through backend binary export
- Portable private `penpot-cli` release archive packaging

Still gated / in progress:

- Full bundled scene-bridge path inside `renderer-service` (Phase 26; thumbnail
  rendering is opt-in and not yet a default “real scene” path)
- Components/Tokens wave is backend-command executable:
  `tokens.list`, multi-shape `tokens.apply` (simple ref + spacing/typography
  materialization), multi-shape-wrap `component.create`, and local/linked-library
  `component.instantiate` (explicit x/y)
- Shape grouping is backend-command executable: `shape.group` / `shape.ungroup`
- Some editor-local or layout-edge operations remain plugin-live only
- Packages are private workspace artifacts (not published to npm)

Track day-to-day status in [`todo.md`](todo.md).

## Quick start (this fork)

Requirements: Node.js (18+ recommended; MCP paths are tested around current LTS),
pnpm via Corepack, and the usual Penpot backend/frontend stack when you need a
full instance.

```bash
git clone https://github.com/normojs/penpot.git
cd penpot
pnpm install
```

### CLI

```bash
pnpm cli:build
node penpot-cli/dist/index.js --help

# shortcuts from repo root
pnpm cli:help
pnpm cli:install-check
pnpm cli:package-check
```

Common diagnostics:

```bash
node penpot-cli/dist/index.js mcp status
node penpot-cli/dist/index.js mcp config --format json
```

More detail: [`penpot-cli/README.md`](penpot-cli/README.md).

### MCP package

```bash
cd mcp
pnpm install
pnpm run build
# see mcp/README.md for server + plugin startup modes
```

Self-hosted gateway notes: [`mcp/docs/self-hosted-mcp-gateway.md`](mcp/docs/self-hosted-mcp-gateway.md).

### Full Penpot stack

This fork still contains upstream frontend/backend/exporter modules. For classic
self-host / devenv flows, start from upstream docs and adapt to this checkout:

- <https://help.penpot.app/technical-guide/getting-started/>
- <https://help.penpot.app/technical-guide/developer/>

## Relationship to upstream

| | This fork (`normojs/penpot`) | Upstream (`penpot/penpot`) |
| --- | --- | --- |
| Focus | First-class MCP + CLI automation | Full design product |
| Default branch here | `main` | `develop` |
| npm publish | Private / not the goal | Official releases |
| Contribution target | This repository for fork work | Upstream for core Penpot product changes |

Local git remotes in a typical checkout:

```text
fork      https://github.com/normojs/penpot.git     # this repo (push)
upstream  https://github.com/penpot/penpot.git      # official (fetch only)
```

## Development notes

- Prefer shared command-runtime changes over one-off MCP-only or CLI-only paths.
- Update `todo.md` when a tracked task starts, finishes, or blocks.
- User-visible behavior or docs changes should also update `CHANGES.md`.
- AI coding conventions for the fork: [`AI_CODE_RULES.md`](AI_CODE_RULES.md).

## License

```
This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at http://mozilla.org/MPL/2.0/.

Copyright (c) KALEIDOS INC Sucursal en España SL
```

Penpot is a Kaleidos [open source project](https://kaleidos.net/). This
repository is an independent private fork that builds on that codebase; it is
not an official Penpot product channel.
