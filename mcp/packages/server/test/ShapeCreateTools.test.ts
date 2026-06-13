import assert from "node:assert/strict";
import test from "node:test";
import type { PenpotMcpServer } from "../src/PenpotMcpServer.js";
import { ShapeCreateFrameTool, ShapeCreateTextTool } from "../src/tools/ShapeCreateTools.js";

type RpcCall = {
    methodName: string;
    params: Record<string, unknown>;
    userToken: string;
};

function parseJsonResponse(response: Awaited<ReturnType<ShapeCreateFrameTool["execute"]>>) {
    const text = response.content[0];
    if (text.type !== "text") {
        throw new Error("Expected text response");
    }
    return JSON.parse(text.text);
}

function mcpServerWithRpc(
    rpcClient: { post?: (...args: any[]) => Promise<unknown> },
    userToken = "token-1"
): PenpotMcpServer {
    return {
        rpcClient,
        getSessionContext: () => ({ userToken }),
    } as unknown as PenpotMcpServer;
}

test("ShapeCreateFrameTool uses backend RPC when fileId and pageId are provided", async () => {
    const calls: RpcCall[] = [];
    const tool = new ShapeCreateFrameTool(
        mcpServerWithRpc({
            post: async (methodName: string, params: Record<string, unknown>, userToken: string) => {
                calls.push({ methodName, params, userToken });
                return {
                    shape: { id: "00000000-0000-0000-0000-000000000003", type: "frame", name: "Login" },
                    revn: 1,
                    vern: 0,
                };
            },
        })
    );

    const response = await tool.execute({
        fileId: "00000000-0000-0000-0000-000000000001",
        pageId: "00000000-0000-0000-0000-000000000002",
        shapeId: "00000000-0000-0000-0000-000000000003",
        name: " Login ",
        x: 10,
        y: 20,
        width: 320,
        height: 640,
        fill: { color: "#ffffff" },
    });
    const body = parseJsonResponse(response);

    assert.deepEqual(calls, [
        {
            methodName: "create-file-shape",
            params: {
                id: "00000000-0000-0000-0000-000000000001",
                "page-id": "00000000-0000-0000-0000-000000000002",
                "shape-id": "00000000-0000-0000-0000-000000000003",
                "parent-id": undefined,
                type: "frame",
                name: "Login",
                x: 10,
                y: 20,
                width: 320,
                height: 640,
                content: undefined,
                fill: { color: "#ffffff" },
                stroke: undefined,
                "border-radius": undefined,
                "font-size": undefined,
            },
            userToken: "token-1",
        },
    ]);
    assert.equal(body.status, "ok");
    assert.equal(body.data.adapter, "backend-command");
    assert.equal(body.data.adapterSelection.selected, "backend-command");
    assert.deepEqual(body.data.shape, { id: "00000000-0000-0000-0000-000000000003", type: "frame", name: "Login" });
});

test("ShapeCreateTextTool maps backend text parameters", async () => {
    const calls: RpcCall[] = [];
    const tool = new ShapeCreateTextTool(
        mcpServerWithRpc({
            post: async (methodName: string, params: Record<string, unknown>, userToken: string) => {
                calls.push({ methodName, params, userToken });
                return {
                    shape: { id: "00000000-0000-0000-0000-000000000004", type: "text", name: "Title" },
                    revn: 2,
                    vern: 0,
                };
            },
        })
    );

    const response = await tool.execute({
        fileId: "00000000-0000-0000-0000-000000000001",
        pageId: "00000000-0000-0000-0000-000000000002",
        parentId: "00000000-0000-0000-0000-000000000003",
        x: 24,
        y: 32,
        width: 200,
        height: 40,
        content: "Welcome",
        fontSize: 24,
        fill: { color: "#111111" },
    });
    const body = parseJsonResponse(response);

    assert.equal(calls[0].methodName, "create-file-shape");
    assert.equal(calls[0].params.type, "text");
    assert.equal(calls[0].params["parent-id"], "00000000-0000-0000-0000-000000000003");
    assert.equal(calls[0].params.content, "Welcome");
    assert.equal(calls[0].params["font-size"], 24);
    assert.deepEqual(calls[0].params.fill, { color: "#111111" });
    assert.equal(body.status, "ok");
    assert.equal(body.data.adapter, "backend-command");
});

test("ShapeCreateFrameTool reports adapter error when backend target is incomplete", async () => {
    const calls: RpcCall[] = [];
    const tool = new ShapeCreateFrameTool(
        mcpServerWithRpc({
            post: async (methodName: string, params: Record<string, unknown>, userToken: string) => {
                calls.push({ methodName, params, userToken });
                return { shape: null };
            },
        })
    );

    const response = await tool.execute({
        fileId: "00000000-0000-0000-0000-000000000001",
        x: 10,
        y: 20,
        width: 320,
        height: 640,
    });
    const body = parseJsonResponse(response);

    assert.deepEqual(calls, []);
    assert.equal(body.status, "error");
    assert.equal(body.error.code, "adapter_not_available");
    assert.equal(body.error.data.adapterSelection.selected, null);
});
