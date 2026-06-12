# penpot-cli Agent Guide

## Module Scope

`penpot-cli/` is the top-level TypeScript command-line package for this fork.
It coordinates Penpot development services, MCP status/configuration, and
future shared automation commands.

## Working Rules

- Keep the CLI independent from MCP server internals at first. Prefer stable
  process, filesystem config, and HTTP surfaces until the shared command
  runtime exists.
- Keep command names aligned with MCP tool names and the architecture plan:
  `mcp status`, `mcp config`, `mcp logs`, `dev up --mcp`, and future
  file/export commands.
- Use Node.js built-ins before adding runtime dependencies.
- Keep command output script-friendly: support JSON output where a command
  exposes structured data.
- Update `todo.md`, `CHANGES.md`, and
  `mcp/docs/first-class-mcp-architecture.md` whenever CLI behavior or command
  scope changes.
- Verify `pnpm --filter penpot-cli build`, `types:check`, `lint`, and
  `smoke:help` after CLI changes.
