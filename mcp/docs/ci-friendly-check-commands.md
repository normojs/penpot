# CI-Friendly Check Commands

Status: P14.4 release-verification command matrix
Updated: 2026-06-16

This document defines the repeatable checks for the `penpot-cli` fork. It is
intended for CI jobs, local release candidates, and AI-agent development
sessions where the available toolchain may differ by machine.

The goal is to record product failures separately from missing local tools. A
failed test, type error, lint violation, or behavior mismatch is a product
failure. A missing `pnpm`, `node`, `clojure`, `cljfmt`, `clj-kondo`, browser
driver, `node_modules` directory, or running Penpot service is a local tooling
or environment limitation until the command actually executes the product code
and fails.

## Baseline Checks

Run these for every change, including docs-only changes:

```bash
git diff --check
```

For docs that add or rename release-verification entries, also check that the
new links are discoverable:

```bash
rg -n "ci-friendly|smoke flow|release verification|P14\\.4" \
  todo.md CHANGES.md mcp/README.md penpot-cli/README.md mcp/docs
```

## TypeScript: MCP

Use the root shortcuts for release packaging checks when possible:

```bash
pnpm mcp:plugin:package
pnpm mcp:plugin:check
```

Use the nested MCP workspace commands when a change touches server, plugin,
common, or package internals:

```bash
pnpm --dir mcp run fmt:check
pnpm --dir mcp --filter mcp-server types:check
pnpm --dir mcp --filter mcp-server test
pnpm --dir mcp --filter mcp-common types:check
pnpm --dir mcp --filter mcp-plugin types:check
pnpm --dir mcp --filter mcp-plugin package:frontend
pnpm --dir mcp --filter mcp-plugin check:frontend
```

For a full MCP workspace regression:

```bash
pnpm --dir mcp run build
pnpm --dir mcp run build:types
```

## TypeScript: penpot-cli

Use these after any CLI command, output, command-runtime adapter, or packaging
change:

```bash
pnpm --filter penpot-cli types:check
pnpm --filter penpot-cli test
pnpm --filter penpot-cli smoke:help
pnpm cli:install-check
```

`pnpm --filter penpot-cli lint` is an alias for the CLI type check and can be
used when matching older task notes:

```bash
pnpm --filter penpot-cli lint
```

Build checks are required before validating the installed binary surface:

```bash
pnpm --filter penpot-cli build
pnpm cli:build
```

## Clojure And ClojureScript

Run repository-wide Clojure lint and format checks from the repository root:

```bash
pnpm lint
pnpm check-fmt
```

Run backend tests from the `backend/` directory, as required by the backend
module instructions:

```bash
cd backend
clojure -M:dev:test --focus backend-tests.my-ns-test
clojure -M:dev:test
```

Replace `backend-tests.my-ns-test` with the focused namespace touched by the
change. If no backend source was touched, record that the backend test tier was
not applicable instead of running an unrelated suite.

Run frontend checks from the `frontend/` directory:

```bash
cd frontend
pnpm run check-fmt:clj
pnpm run lint:clj
pnpm run test
```

Add JavaScript and SCSS checks when those files are touched:

```bash
cd frontend
pnpm run check-fmt:js
pnpm run lint:js
pnpm run check-fmt:scss
pnpm run lint:scss
```

Run the frontend production build only when release packaging, source-map
analysis, or bundled MCP assets are in scope:

```bash
cd frontend
pnpm run build:app
```

Do not add, modify, or run frontend Playwright integration tests unless the task
explicitly asks for e2e coverage.

## Smoke Flows

The release smoke flows are split by required environment:

| Flow | Document | Environment |
| --- | --- | --- |
| Config/global connection | [`config-global-connection-smoke-flow.md`](config-global-connection-smoke-flow.md) | Static checks plus optional running stack and UI checks |
| Headless edit/export | [`headless-edit-export-smoke-flow.md`](headless-edit-export-smoke-flow.md) | Authenticated backend/exporter for full execution; dry-run coverage without a live workspace |
| Live bind | [`live-bind-smoke-flow.md`](live-bind-smoke-flow.md) | Running frontend, MCP server, bundled plugin, and browser workspace |
| Smoke index | [`regression-smoke-flows.md`](regression-smoke-flows.md) | Summary of automated and running-stack smoke expectations |

For no-service local smoke coverage, run:

```bash
pnpm --dir mcp --filter mcp-server test
pnpm --filter penpot-cli test
pnpm --filter penpot-cli smoke:help
```

For running-stack smoke evidence, record the exact command output or UI state
from the three focused smoke-flow documents. At minimum, capture the command,
working directory, exit code, first failing line when applicable, selected
adapter, and whether the failure is a product failure or local tooling issue.

## Module Change Matrix

| Changed area | Minimum checks |
| --- | --- |
| Docs only | `git diff --check`, link discovery with `rg` when docs add links |
| `mcp/packages/server` | MCP format, server typecheck, server tests |
| `mcp/packages/plugin` | MCP format, plugin typecheck, plugin package/check frontend assets |
| `mcp/packages/common` or `command-runtime` | MCP format, common typecheck, server tests, CLI tests when adapters/descriptors change |
| `penpot-cli` | CLI typecheck, tests, smoke help, install check |
| `frontend` MCP lifecycle/settings/UI | frontend CLJ format/lint/test; JS/SCSS checks if touched |
| `backend` RPC/headless commands | focused backend test, backend regression when feasible, root CLJ lint/format |
| `common` shared data helpers | root CLJ lint/format, focused backend/frontend tests for consumers |
| `exporter` or render output | exporter-related dry-run/execution smoke plus affected TS/CLJ checks |
| Packaging/gateway | MCP plugin package/check, CLI install check, relevant smoke-flow docs |

## Failure Classification

Use this format in release notes, PR comments, and `todo.md` task notes:

```text
Command:
Working directory:
Exit code:
First failing line:
Classification: product failure | missing local tool | missing dependency | service unavailable | not applicable
Follow-up:
```

Examples of local tooling or environment limitations:

- `pnpm`, `node`, `clojure`, `cljfmt`, or `clj-kondo` is not installed.
- `node_modules` is missing and the task did not include dependency setup.
- Browser automation or a browser profile is unavailable for a live bind check.
- Backend, frontend, exporter, MCP server, or plugin assets are not running for
  running-stack smoke flows.

Examples of product failures:

- TypeScript or Clojure code compiles far enough to report type/schema errors.
- Unit tests execute and fail assertions.
- Format or lint commands execute and report violations.
- CLI or MCP JSON output differs from the documented command contract.
- A running Penpot stack returns the wrong endpoint, adapter, permission,
  context, or artifact behavior.

## CI Profile Suggestions

The full release matrix can be split into independent CI jobs:

| Profile | Commands |
| --- | --- |
| `docs-only` | `git diff --check` plus link discovery |
| `typescript-no-service` | MCP format/type/test, CLI type/test/smoke help |
| `frontend-cljs` | frontend CLJ format/lint/test |
| `backend-jvm` | root CLJ lint/format plus focused or full backend tests |
| `packaging` | MCP plugin package/check and CLI install check |
| `running-stack-smoke` | focused smoke flows against a live Penpot stack |

CI should fail on product failures. Missing local tools should fail only in jobs
whose contract is to provide that toolchain; otherwise they should be reported
as environment limitations and routed to the matching setup task.
