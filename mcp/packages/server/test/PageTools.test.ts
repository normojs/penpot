import assert from "node:assert/strict";
import test from "node:test";
import { FileContextRegistry, FileContextErrorCodes } from "../src/FileContextRegistry.js";
import { McpWriteLimiter } from "../src/McpWriteLimiter.js";
import type { PenpotRpcRequestContext } from "../src/PenpotRpcClient.js";
import type { PenpotMcpServer } from "../src/PenpotMcpServer.js";
import { PageCreateTool, PageListTool, PageRenameTool } from "../src/tools/PageTools.js";

type RpcCall = {
    methodName: string;
    params: Record<string, unknown>;
    userToken: string;
    context?: PenpotRpcRequestContext;
};

function parseJsonResponse(response: Awaited<ReturnType<PageListTool["execute"]>>) {
    const text = response.content[0];
    if (text.type !== "text") {
        throw new Error("Expected text response");
    }
    return JSON.parse(text.text);
}

function mcpServerWithRpc(
    rpcClient: { get?: (...args: any[]) => Promise<unknown>; post?: (...args: any[]) => Promise<unknown> },
    userToken = "token-1",
    mcpSessionId = "session-1"
): PenpotMcpServer {
    return {
        rpcClient,
        writeLimiter: new McpWriteLimiter(),
        getSessionContext: () => ({ userToken, mcpSessionId }),
    } as unknown as PenpotMcpServer;
}

test("PageListTool uses backend RPC when fileId is provided", async () => {
    const calls: RpcCall[] = [];
    const tool = new PageListTool(
        mcpServerWithRpc({
            get: async (methodName: string, params: Record<string, unknown>, userToken: string) => {
                calls.push({ methodName, params, userToken });
                return {
                    pages: [{ id: "00000000-0000-0000-0000-000000000002", name: "Page 1" }],
                };
            },
        })
    );

    const response = await tool.execute({ fileId: "00000000-0000-0000-0000-000000000001" });
    const body = parseJsonResponse(response);

    assert.deepEqual(calls, [
        {
            methodName: "get-file-pages",
            params: { id: "00000000-0000-0000-0000-000000000001" },
            userToken: "token-1",
        },
    ]);
    assert.equal(body.status, "ok");
    assert.equal(body.data.adapter, "backend-command");
    assert.equal(body.data.adapterSelection.selected, "backend-command");
    assert.equal(body.data.adapterSelection.requested, "auto");
    assert.equal(body.data.adapterSelection.fallbacks[0].kind, "plugin-live");
    assert.deepEqual(body.data.pages, [{ id: "00000000-0000-0000-0000-000000000002", name: "Page 1" }]);
});

test("PageCreateTool uses backend RPC when fileId is provided", async () => {
    const calls: RpcCall[] = [];
    const tool = new PageCreateTool(
        mcpServerWithRpc({
            post: async (
                methodName: string,
                params: Record<string, unknown>,
                userToken: string,
                context?: PenpotRpcRequestContext
            ) => {
                calls.push({ methodName, params, userToken, context });
                return {
                    page: { id: "00000000-0000-0000-0000-000000000003", name: "Flow" },
                    revn: 1,
                    vern: 0,
                };
            },
        })
    );

    const response = await tool.execute({
        fileId: "00000000-0000-0000-0000-000000000001",
        pageId: "00000000-0000-0000-0000-000000000003",
        name: " Flow ",
        makeCurrent: true,
    });
    const body = parseJsonResponse(response);

    assert.deepEqual(calls, [
        {
            methodName: "create-file-page",
            params: {
                id: "00000000-0000-0000-0000-000000000001",
                "page-id": "00000000-0000-0000-0000-000000000003",
                name: "Flow",
            },
            userToken: "token-1",
            context: {
                mcpToolName: "page.create",
                mcpSessionId: "session-1",
                mcpAdapter: "backend-command",
                mcpFileId: "00000000-0000-0000-0000-000000000001",
                mcpPageId: "00000000-0000-0000-0000-000000000003",
            },
        },
    ]);
    assert.equal(body.status, "ok");
    assert.equal(body.data.adapter, "backend-command");
    assert.equal(body.data.adapterSelection.selected, "backend-command");
    assert.equal(body.data.adapterSelection.requested, "auto");
    assert.deepEqual(body.data.page, { id: "00000000-0000-0000-0000-000000000003", name: "Flow" });
    assert.equal(
        body.warnings[0],
        "makeCurrent requires a live bound workspace; backend-command created the page without switching UI state."
    );
});

test("PageRenameTool uses backend RPC when fileId is provided", async () => {
    const calls: RpcCall[] = [];
    const tool = new PageRenameTool(
        mcpServerWithRpc({
            post: async (
                methodName: string,
                params: Record<string, unknown>,
                userToken: string,
                context?: PenpotRpcRequestContext
            ) => {
                calls.push({ methodName, params, userToken, context });
                return {
                    page: { id: "00000000-0000-0000-0000-000000000003", name: "Renamed Flow" },
                    revn: 2,
                    vern: 0,
                };
            },
        })
    );

    const response = await tool.execute({
        fileId: "00000000-0000-0000-0000-000000000001",
        pageId: "00000000-0000-0000-0000-000000000003",
        name: " Renamed Flow ",
    });
    const body = parseJsonResponse(response);

    assert.deepEqual(calls, [
        {
            methodName: "rename-file-page",
            params: {
                id: "00000000-0000-0000-0000-000000000001",
                "page-id": "00000000-0000-0000-0000-000000000003",
                name: "Renamed Flow",
            },
            userToken: "token-1",
            context: {
                mcpToolName: "page.rename",
                mcpSessionId: "session-1",
                mcpAdapter: "backend-command",
                mcpFileId: "00000000-0000-0000-0000-000000000001",
                mcpPageId: "00000000-0000-0000-0000-000000000003",
            },
        },
    ]);
    assert.equal(body.status, "ok");
    assert.equal(body.data.adapter, "backend-command");
    assert.equal(body.data.adapterSelection.selected, "backend-command");
    assert.equal(body.data.adapterSelection.requested, "auto");
    assert.deepEqual(body.data.page, { id: "00000000-0000-0000-0000-000000000003", name: "Renamed Flow" });
    assert.equal(body.data.revn, 2);
});

test("PageListTool returns adapter selection error for unsupported explicit adapter", async () => {
    const calls: RpcCall[] = [];
    const tool = new PageListTool(
        mcpServerWithRpc({
            get: async (methodName: string, params: Record<string, unknown>, userToken: string) => {
                calls.push({ methodName, params, userToken });
                return { pages: [] };
            },
        })
    );

    const response = await tool.execute({
        fileId: "00000000-0000-0000-0000-000000000001",
        adapter: "exporter",
    });
    const body = parseJsonResponse(response);

    assert.deepEqual(calls, []);
    assert.equal(body.status, "error");
    assert.equal(body.error.code, "adapter_not_supported");
    assert.equal(body.error.data.adapterSelection.requested, "exporter");
    assert.equal(body.error.data.adapterSelection.selected, null);
});

test("PageListTool without fileId still requires a live bound file context", async () => {
    const registry = new FileContextRegistry();
    const tool = new PageListTool({
        fileContextRegistry: registry,
        getSessionContext: () => ({ userToken: "token-1" }),
    } as unknown as PenpotMcpServer);

    const response = await tool.execute({});
    const body = parseJsonResponse(response);

    assert.equal(body.status, "error");
    assert.equal(body.error.code, FileContextErrorCodes.FILE_CONTEXT_REQUIRED);
});
