import assert from "node:assert/strict";
import test from "node:test";
import { FileContextRegistry, FileContextErrorCodes } from "../src/FileContextRegistry.js";
import type { PenpotMcpServer } from "../src/PenpotMcpServer.js";
import { PageCreateTool, PageListTool } from "../src/tools/PageTools.js";

type RpcCall = {
    methodName: string;
    params: Record<string, unknown>;
    userToken: string;
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
    userToken = "token-1"
): PenpotMcpServer {
    return {
        rpcClient,
        getSessionContext: () => ({ userToken }),
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
    assert.deepEqual(body.data.pages, [{ id: "00000000-0000-0000-0000-000000000002", name: "Page 1" }]);
});

test("PageCreateTool uses backend RPC when fileId is provided", async () => {
    const calls: RpcCall[] = [];
    const tool = new PageCreateTool(
        mcpServerWithRpc({
            post: async (methodName: string, params: Record<string, unknown>, userToken: string) => {
                calls.push({ methodName, params, userToken });
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
        },
    ]);
    assert.equal(body.status, "ok");
    assert.equal(body.data.adapter, "backend-command");
    assert.deepEqual(body.data.page, { id: "00000000-0000-0000-0000-000000000003", name: "Flow" });
    assert.equal(
        body.warnings[0],
        "makeCurrent requires a live bound workspace; backend-command created the page without switching UI state."
    );
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
