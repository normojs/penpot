# Multi-User Mode

> [!WARNING]
> Multi-user mode is for **self-hosted / fork** deployments. Treat it as
> production-ready only after applying the security defaults in
> [`production-multi-user-hardening.md`](./production-multi-user-hardening.md).
> Older bootstrap notes that hard-code plugin tokens are **dev/test only**.

The Penpot MCP server supports a multi-user mode, allowing multiple Penpot users
to connect to the same MCP server instance simultaneously.
This supports remote deployments of the MCP server, without requiring each user
to run their own server instance.

## Limitations

Multi-user mode has the limitation that tools which read from or write to
the local file system are not supported, as the server cannot access
the client's file system. This affects the import and export tools that require
local paths. Multi-user forces **remote mode** (FS access off; destructive
confirmation on by default).

## Production defaults

See the full matrix and runbook:

- [`production-multi-user-hardening.md`](./production-multi-user-hardening.md)
- [`self-hosted-mcp-gateway.md`](./self-hosted-mcp-gateway.md)

Keep `PENPOT_MCP_ENABLE_EXECUTE_CODE` and `PENPOT_MCP_ENABLE_DEBUG_TOOLS` unset
on shared hosts unless you have a break-glass policy.

## Running Components in Multi-User Mode

To run the MCP server and the Penpot MCP plugin in multi-user mode (for testing),
you can use the following command:

```shell
npm run bootstrap:multi-user
```

This will:
* launch the MCP server in multi-user mode (adding the `--multi-user` flag),
* build and launch the Penpot MCP plugin server in multi-user mode.

See the package.json scripts for both `mcp-server` and `penpot-plugin` for details.

In multi-user mode, users are required to be authenticated via a token.

* This token is provided in the URL used to connect to the MCP server,
  e.g. `http://localhost:4401/mcp?userToken=USER_TOKEN`.
* The same token must be provided when connecting the Penpot MCP plugin
  to the MCP server.
  In production, issue **per-user** MCP tokens from Penpot integrations settings
  and inject them into clients/plugins — do not share a single hard-coded token.
