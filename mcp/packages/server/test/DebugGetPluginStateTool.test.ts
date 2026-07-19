import assert from "node:assert/strict";
import test from "node:test";
import type { PenpotMcpServer } from "../src/PenpotMcpServer.js";
import {
    DEBUG_TOOLS_ENABLE_ENV,
    DebugGetPluginStateTool,
    DebugToolsErrorCodes,
    derivePluginStatus,
    projectPluginState,
} from "../src/tools/DebugTools.js";

function parseJsonResponse(response: Awaited<ReturnType<DebugGetPluginStateTool["execute"]>>) {
    const text = response.content[0];
    if (text.type !== "text") {
        throw new Error("Expected text response");
    }
    return JSON.parse(text.text);
}

function createServer(options: {
    debugToolsEnabled?: boolean;
    multiUserMode?: boolean;
    userToken?: string | null;
    compatibleClients?: number;
    incompatibleClients?: number;
    pendingNegotiationClients?: number;
    connectedClients?: number;
    authenticatedClients?: number;
    pendingTasks?: number;
    fileContextStatus?: "unbound" | "available" | "bound" | "stale";
    clients?: unknown[];
} = {}): PenpotMcpServer {
    const userToken = options.userToken === undefined ? "token-1" : options.userToken;
    const multiUserMode = options.multiUserMode ?? false;
    const fileContextStatus = options.fileContextStatus ?? "unbound";
    const compatibleClients = options.compatibleClients ?? 0;
    const incompatibleClients = options.incompatibleClients ?? 0;
    const pendingNegotiationClients = options.pendingNegotiationClients ?? 0;
    const connectedClients =
        options.connectedClients ?? compatibleClients + incompatibleClients + pendingNegotiationClients;
    const authenticatedClients = options.authenticatedClients ?? (userToken ? 1 : 0);

    return {
        isDebugToolsEnabled: () => options.debugToolsEnabled ?? false,
        getSessionContext: () =>
            userToken
                ? {
                      userToken,
                      mcpSessionId: "session-1",
                  }
                : undefined,
        getStatus: () => ({
            status: "ok",
            server: {
                multiUserMode,
                debugToolsEnabled: options.debugToolsEnabled ?? false,
            },
            transports: {
                webSocket: {
                    connectedClients,
                    authenticatedClients,
                    compatibleClients,
                    incompatibleClients,
                    pendingNegotiationClients,
                    pendingTasks: options.pendingTasks ?? 0,
                    clients: options.clients ?? [{ userToken: "should-not-leak", negotiationStatus: "compatible" }],
                },
            },
        }),
        fileContextRegistry: {
            getSessionSummary: () => ({
                status: fileContextStatus,
                bound: fileContextStatus === "bound",
                boundContext:
                    fileContextStatus === "bound"
                        ? {
                              fileId: "00000000-0000-0000-0000-000000000001",
                              status: "bound",
                          }
                        : null,
                availableContexts: [],
                staleContexts: [],
                contextCount: fileContextStatus === "unbound" ? 0 : 1,
            }),
        },
    } as unknown as PenpotMcpServer;
}

test("derivePluginStatus maps client counts", () => {
    assert.equal(derivePluginStatus({ compatibleClients: 1 }), "connected");
    assert.equal(derivePluginStatus({ incompatibleClients: 2 }), "incompatible");
    assert.equal(derivePluginStatus({ pendingNegotiationClients: 1 }), "negotiating");
    assert.equal(derivePluginStatus({}), "disconnected");
});

test("projectPluginState returns token-safe projection without client dumps", () => {
    const projection = projectPluginState({
        multiUserMode: true,
        userTokenPresent: true,
        webSocket: {
            connectedClients: 2,
            authenticatedClients: 1,
            compatibleClients: 1,
            incompatibleClients: 0,
            pendingNegotiationClients: 1,
            pendingTasks: 3,
        },
        fileContext: {
            status: "bound",
            boundContext: { fileId: "file-1" },
        },
        enabled: true,
    });

    assert.equal(projection.adapter, "local");
    assert.equal((projection.plugin as { status: string }).status, "connected");
    assert.equal((projection.plugin as { pendingTasks: number }).pendingTasks, 3);
    assert.equal((projection.session as { scopedToCurrentSession: boolean }).scopedToCurrentSession, true);
    assert.equal((projection.fileContext as { boundFileId: string }).boundFileId, "file-1");
    assert.equal("clients" in (projection.plugin as object), false);
    assert.equal(JSON.stringify(projection).includes("token"), false);
});

test("DebugGetPluginStateTool returns structured disabled error by default", async () => {
    const tool = new DebugGetPluginStateTool(createServer({ debugToolsEnabled: false }));
    const body = parseJsonResponse(await tool.execute({}));

    assert.equal(tool.getToolName(), "debug.get_plugin_state");
    assert.equal(body.status, "error");
    assert.equal(body.error.code, DebugToolsErrorCodes.DEBUG_TOOLS_DISABLED);
    assert.equal(body.error.config.env, DEBUG_TOOLS_ENABLE_ENV);
    assert.ok(body.error.actions.includes("mcp.get_status"));
});

test("DebugGetPluginStateTool returns projection when enabled", async () => {
    const tool = new DebugGetPluginStateTool(
        createServer({
            debugToolsEnabled: true,
            multiUserMode: true,
            userToken: "secret-session-token",
            compatibleClients: 1,
            pendingTasks: 4,
            fileContextStatus: "bound",
            clients: [{ userToken: "plugin-client-token", negotiationStatus: "compatible" }],
        })
    );

    const body = parseJsonResponse(await tool.execute({}));
    assert.equal(body.status, "ok");
    assert.equal(body.data.adapter, "local");
    assert.equal(body.data.enabled, true);
    assert.equal(body.data.plugin.status, "connected");
    assert.equal(body.data.plugin.pendingTasks, 4);
    assert.equal(body.data.session.mode, "multi-user");
    assert.equal(body.data.session.userTokenPresent, true);
    assert.equal(body.data.session.scopedToCurrentSession, true);
    assert.equal(body.data.fileContext.status, "bound");
    assert.equal(body.data.fileContext.boundFileId, "00000000-0000-0000-0000-000000000001");
    assert.equal("clients" in body.data.plugin, false);
    assert.equal(JSON.stringify(body).includes("secret-session-token"), false);
    assert.equal(JSON.stringify(body).includes("plugin-client-token"), false);
    assert.equal(body.warnings?.length ?? 0, 0);
});

test("DebugGetPluginStateTool warns when file context is unbound", async () => {
    const tool = new DebugGetPluginStateTool(
        createServer({
            debugToolsEnabled: true,
            fileContextStatus: "unbound",
        })
    );
    const body = parseJsonResponse(await tool.execute({}));
    assert.equal(body.status, "ok");
    assert.equal(body.data.fileContext.status, "unbound");
    assert.deepEqual(body.warnings, [
        "Open a Penpot file in this browser session before using file-scoped MCP tools.",
    ]);
});
