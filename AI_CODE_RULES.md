# AI Coding Rules For `penpot-cli`

These rules apply to AI coding agents working on this `penpot-cli` fork of
Penpot `2.15.4`.

They complement `AGENTS.md`. If there is a conflict, follow `AGENTS.md` first,
then these fork-specific rules.

## 1. Operating Loop

Every AI coding task must follow this loop:

1. Read root `AGENTS.md`.
2. Identify affected modules.
3. Read only the affected module `AGENTS.md` files when they exist.
4. Check `todo.md` and mark the current task as `in_progress`.
5. Read the relevant architecture docs before changing code.
6. Make the smallest coherent change.
7. Run focused verification for the touched modules when practical.
8. Update `todo.md` immediately after completing or blocking a step.
9. Update `CHANGES.md` for user-visible behavior, docs, or project structure.
10. Summarize changed files, verification, and remaining risks.

Do not start implementation work from memory when repository context is
available.

## 2. Planning And Tracking

- Use `todo.md` as the source of truth for implementation progress.
- At most one task should be marked `in_progress` unless parallel work is
  intentionally split.
- When a task completes, mark it `done`, add the date, and add a short result
  note.
- When a task is blocked, mark it `blocked`, explain why, and name the decision
  needed.
- If the implementation direction changes, update
  `mcp/docs/first-class-mcp-architecture.md` in the same change.
- Do not leave completed work only in chat history.

## 3. Project Direction

The fork goal is to make MCP a first-class Penpot automation capability and to
prepare a future `penpot-cli` entry point.

Preferred direction:

```text
MCP Gateway
  -> Global MCP Agent
  -> File MCP Agent
  -> Automation Command Runtime
  -> backend/common/exporter/plugin adapters
```

Avoid adding one-off automation paths that cannot be reused by MCP and CLI.

## 4. MCP-Specific Rules

- Keep the bundled MCP plugin, but move lifecycle toward a global background
  system plugin.
- Distinguish global tools from file-context tools.
- Global tools must work without an open design file when possible.
- File tools must return structured `file_context_required` errors when no
  file is bound.
- Prefer typed tools such as `file.create`, `page.list`, `shape.create_text`,
  and `export.page` over arbitrary `execute_code`.
- Keep `execute_code` as an advanced fallback, not the normal implementation
  path.
- Do not add local file-system access unless it is explicitly gated by local
  mode and user configuration.
- Preserve normal Penpot permission checks for every user, team, project, and
  file operation.
- Make MCP server, plugin, and frontend capability/version mismatches explicit.

## 5. CLI-Specific Rules

The future CLI should be a thin automation surface, not a separate business
logic fork.

Preferred command shape:

```bash
penpot-cli dev up --mcp
penpot-cli mcp status
penpot-cli mcp config
penpot-cli file list
penpot-cli file create --name "Demo"
penpot-cli export page --file <file-id> --page <page-id>
```

Rules:

- CLI commands should reuse MCP/automation command schemas where possible.
- CLI output should be script-friendly by default and support human-readable
  summaries.
- Do not hide service startup failures; report missing dependencies and ports
  clearly.
- Keep local orchestration separate from production server behavior.

## 6. Module Rules

### Frontend

- Read `frontend/AGENTS.md` before frontend changes.
- Keep MCP lifecycle state separate from workspace file context.
- Prefer existing Potok events, refs, store patterns, and i18n patterns.
- Add focused frontend tests for lifecycle/state logic when changing behavior.
- Avoid broad UI redesign while working on MCP infrastructure.

### Backend

- Read `backend/AGENTS.md` before backend changes.
- Use existing RPC command patterns and permission checks.
- Add or update backend tests for new RPC commands.
- Avoid direct database changes outside established migration and db helper
  patterns.

### Common

- Read `common/AGENTS.md` before shared model/schema changes.
- Treat common changes as cross-module changes and test consumers where
  practical.
- Prefer existing schemas and file data helpers over ad hoc data mutation.

### MCP

- Keep TypeScript types strict and tool schemas explicit.
- Keep server tools small and delegate behavior to command/runtime helpers.
- Keep plugin task handlers narrow and testable.
- Preserve multi-user mode assumptions when changing session routing.
- Run MCP build/type checks when touching `mcp/`.

### Exporter

- Treat exporter as headless rendering/export infrastructure.
- Reuse existing HTTP handlers and renderer modules.
- Keep local filesystem writes explicitly permission-gated.

### Render WASM

- Touch only when rendering behavior truly requires it.
- Read `render-wasm/AGENTS.md` before changes.

## 7. Security And Safety

- MCP tokens authenticate users; they do not bypass Penpot authorization.
- Write operations should be auditable once implementation reaches hardening.
- Destructive tools need structured responses and eventually confirmation
  policy.
- Do not expose debug or REPL services broadly.
- Do not enable local file access or arbitrary code execution by default.
- Avoid logging raw tokens, secrets, file contents, or user private data.

## 8. Verification Expectations

Use the smallest verification that proves the change:

- Docs-only changes: run whitespace/diff checks.
- MCP TypeScript changes: run relevant `pnpm` build/type/format checks in
  `mcp/`.
- Frontend CLJS changes: run focused frontend lint/test commands when
  practical.
- Backend CLJ changes: run focused backend tests for touched namespaces.
- Common CLJC changes: run both JVM and JS tests where practical.
- CLI changes: add command smoke tests or at least verify `--help` and one
  successful command path.

If verification cannot be run, record why in the final response and in
`todo.md` when it affects task status.

## 9. Changelog Rules

- Main application, MCP, backend, frontend, common, exporter, and render-wasm
  changes use root `CHANGES.md`.
- Plugin subproject-only changes use `plugins/CHANGELOG.md`.
- Planning docs for this fork should be recorded in root `CHANGES.md`.
- Keep changelog entries concise and user-facing.

## 10. What To Avoid

- Do not build a second automation system that bypasses MCP and CLI reuse.
- Do not scatter MCP state across unrelated frontend namespaces.
- Do not treat `execute_code` as the main product API.
- Do not hard-code local ports in user-facing flows.
- Do not change unrelated modules during planning or infrastructure work.
- Do not rebrand the whole product in one broad change; split rename/branding
  into planned tasks.
- Do not commit unless the user explicitly asks.

