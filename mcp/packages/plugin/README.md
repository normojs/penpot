# Penpot MCP Plugin

This project contains a Penpot plugin that accompanies the Penpot MCP server.
It connects to the MCP server via WebSocket, subsequently allowing the MCP
server to execute tasks in Penpot using the Plugin API.

## Setup

1. Install Dependencies

        pnpm install

2. Build the Project

        pnpm run build

   The release build writes the plugin bundle into `dist/` and generates
   `dist/mcp-plugin.json` with the MCP package version, plugin package version,
   protocol version, manifest version, code entry point, and icon name. The
   protocol version is read from `packages/common/src/types.ts`, so the plugin
   bundle and server protocol stay aligned.

3. Start a Local Development Server

        pnpm run start

   This will start a local development server at `http://localhost:4400`.

## Frontend Packaging

The built-in Penpot frontend serves the bundled MCP plugin from
`/plugins/mcp/manifest.json`. Package the plugin into the frontend public assets
with:

    pnpm run package:frontend

This copies `dist/` to `../../frontend/resources/public/plugins/mcp` and checks
that `manifest.json`, `plugin.js`, `index.html`, `icon.jpg`, and
`mcp-plugin.json` are present and version-compatible.

To verify an already packaged frontend plugin without rebuilding, run:

    pnpm run check:frontend

From the repository root, the same checks are available as:

    pnpm mcp:plugin:package
    pnpm mcp:plugin:check
