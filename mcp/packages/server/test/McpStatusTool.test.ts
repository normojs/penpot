import assert from "node:assert/strict";
import test from "node:test";
import type { PenpotMcpServer } from "../src/PenpotMcpServer.js";
import { McpStatusTool } from "../src/tools/McpStatusTool.js";

function parseJsonResponse(response: Awaited<ReturnType<McpStatusTool["execute"]>>) {
    const text = response.content[0];
    if (text.type !== "text") {
        throw new Error("Expected text response");
    }
    return JSON.parse(text.text);
}

function createStatusServer(options: {
    multiUserMode?: boolean;
    userToken?: string | null;
    mcpSessionId?: string;
    compatibleClients?: number;
    incompatibleClients?: number;
    pendingNegotiationClients?: number;
    connectedClients?: number;
    authenticatedClients?: number;
    pendingTasks?: number;
    fileContextStatus?: "unbound" | "available" | "bound" | "stale";
    clients?: unknown[];
} = {}): PenpotMcpServer {
    const multiUserMode = options.multiUserMode ?? false;
    const userToken = options.userToken === undefined ? "token-1" : options.userToken;
    const fileContextStatus = options.fileContextStatus ?? "unbound";
    const compatibleClients = options.compatibleClients ?? 0;
    const incompatibleClients = options.incompatibleClients ?? 0;
    const pendingNegotiationClients = options.pendingNegotiationClients ?? 0;
    const connectedClients = options.connectedClients ?? compatibleClients + incompatibleClients + pendingNegotiationClients;
    const authenticatedClients = options.authenticatedClients ?? (userToken ? 1 : 0);
    const clients = options.clients ?? [];

    return {
        getSessionContext: () =>
            userToken
                ? {
                      userToken,
                      mcpSessionId: options.mcpSessionId ?? "session-1",
                  }
                : undefined,
        getStatus: () => ({
            status: "ok",
            server: {
                startedAt: "2026-07-19T00:00:00.000Z",
                host: "127.0.0.1",
                port: 4401,
                multiUserMode,
                remoteMode: false,
                fileSystemAccessEnabled: false,
                executeCodeEnabled: false,
                destructiveConfirmationRequired: true,
                registeredTools: 12,
                sessionTimeoutMinutes: 30,
            },
            transports: {
                streamableHttpSessions: 1,
                sseSessions: 0,
                webSocket: {
                    port: 4402,
                    connectedClients,
                    authenticatedClients,
                    compatibleClients,
                    incompatibleClients,
                    pendingNegotiationClients,
                    clients,
                    pendingTasks: options.pendingTasks ?? 0,
                    taskTimeoutSeconds: 30,
                },
            },
            fileContexts: {
                sessionsWithContexts: 0,
                totalContexts: 0,
                availableContexts: 0,
                boundContexts: 0,
                staleContexts: 0,
            },
            writeLimits: {
                enabled: true,
            },
            logging: {
                fileLoggingEnabled: true,
                logDir: "/tmp/penpot-mcp-logs",
            },
        }),
        fileContextRegistry: {
            getSessionSummary: () => ({
                status: fileContextStatus,
                bound: fileContextStatus === "bound",
                boundContext:
                    fileContextStatus === "bound"
                        ? {
                              contextId: "ctx-1",
                              fileId: "00000000-0000-0000-0000-000000000001",
                              pageId: "00000000-0000-0000-0000-000000000002",
                              status: "bound",
                              lastSeenAt: "2026-07-19T00:00:00.000Z",
                              selectionIds: [],
                              capabilities: [],
                              updatedAt: "2026-07-19T00:00:00.000Z",
                          }
                        : null,
                availableContexts: [],
                staleContexts: [],
                contextCount: fileContextStatus === "unbound" ? 0 : 1,
            }),
        },
    } as unknown as PenpotMcpServer;
}

test("McpStatusTool returns token-safe status envelope with plugin and session fields", async () => {
    const tool = new McpStatusTool(
        createStatusServer({
            multiUserMode: true,
            userToken: "token-1",
            compatibleClients: 1,
            pendingTasks: 2,
            fileContextStatus: "bound",
            clients: [{ authenticated: true, negotiationStatus: "compatible", plugin: { version: "1.0.0" } }],
        })
    );

    const response = await tool.execute({});
    const body = parseJsonResponse(response);

    assert.equal(body.status, "ok");
    assert.equal(body.data.server.port, 4401);
    assert.equal(body.data.server.multiUserMode, true);
    assert.equal(body.data.session.mode, "multi-user");
    assert.equal(body.data.session.authenticated, true);
    assert.equal(body.data.session.userTokenPresent, true);
    assert.equal(body.data.plugin.status, "connected");
    assert.equal(body.data.plugin.compatibleClients, 1);
    assert.equal(body.data.plugin.pendingTasks, 2);
    assert.equal(body.data.fileContext.status, "bound");
    assert.equal(body.data.fileContext.boundContext.fileId, "00000000-0000-0000-0000-000000000001");
    assert.equal(body.warnings?.length ?? 0, 0);
    assert.equal(JSON.stringify(body).includes("token-1"), false);
});

test("McpStatusTool reports disconnected plugin and unbound warning", async () => {
    const tool = new McpStatusTool(
        createStatusServer({
            multiUserMode: false,
            userToken: null,
            compatibleClients: 0,
            incompatibleClients: 0,
            pendingNegotiationClients: 0,
            fileContextStatus: "unbound",
        })
    );

    const response = await tool.execute({});
    const body = parseJsonResponse(response);

    assert.equal(body.status, "ok");
    assert.equal(body.data.session.mode, "single-user");
    assert.equal(body.data.session.authenticated, true);
    assert.equal(body.data.session.userTokenPresent, false);
    assert.equal(body.data.plugin.status, "disconnected");
    assert.equal(body.data.fileContext.status, "unbound");
    assert.deepEqual(body.warnings, [
        "Open a Penpot file in this browser session before using file-scoped MCP tools.",
    ]);
});

test("McpStatusTool maps incompatible and negotiating plugin statuses", async () => {
    const incompatible = parseJsonResponse(
        await new McpStatusTool(
            createStatusServer({
                compatibleClients: 0,
                incompatibleClients: 2,
                pendingNegotiationClients: 0,
            })
        ).execute({})
    );
    assert.equal(incompatible.data.plugin.status, "incompatible");

    const negotiating = parseJsonResponse(
        await new McpStatusTool(
            createStatusServer({
                compatibleClients: 0,
                incompatibleClients: 0,
                pendingNegotiationClients: 1,
            })
        ).execute({})
    );
    assert.equal(negotiating.data.plugin.status, "negotiating");
});
