import assert from "node:assert/strict";
import test from "node:test";
import { McpWriteLimiter } from "../src/McpWriteLimiter.js";
import type { McpWriteLimiterConfig } from "../src/McpWriteLimiter.js";
import type { PenpotRpcRequestContext } from "../src/PenpotRpcClient.js";
import type { PenpotMcpServer } from "../src/PenpotMcpServer.js";
import {
    ShapeCreateFrameTool,
    ShapeCreateTextTool,
    ShapeDeleteTool,
    ShapeUpdateTool,
} from "../src/tools/ShapeCreateTools.js";
import { ToolErrorCodes } from "../src/tools/PenpotRpcTool.js";

type RpcCall = {
    methodName: string;
    params: Record<string, unknown>;
    userToken: string;
    context?: PenpotRpcRequestContext;
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
    userToken = "token-1",
    mcpSessionId = "session-1",
    limiterConfig: Partial<McpWriteLimiterConfig> = {},
    requireDestructiveConfirmation = false
): PenpotMcpServer {
    return {
        rpcClient,
        writeLimiter: new McpWriteLimiter(limiterConfig),
        getSessionContext: () => ({ userToken, mcpSessionId }),
        isDestructiveConfirmationRequired: () => requireDestructiveConfirmation,
    } as unknown as PenpotMcpServer;
}

test("ShapeCreateFrameTool uses backend RPC when fileId and pageId are provided", async () => {
    const calls: RpcCall[] = [];
    const tool = new ShapeCreateFrameTool(
        mcpServerWithRpc({
            post: async (
                methodName: string,
                params: Record<string, unknown>,
                userToken: string,
                context?: PenpotRpcRequestContext
            ) => {
                calls.push({ methodName, params, userToken, context });
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
            context: {
                mcpToolName: "shape.create_frame",
                mcpSessionId: "session-1",
                mcpAdapter: "backend-command",
                mcpFileId: "00000000-0000-0000-0000-000000000001",
                mcpPageId: "00000000-0000-0000-0000-000000000002",
                mcpShapeId: "00000000-0000-0000-0000-000000000003",
            },
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
            post: async (
                methodName: string,
                params: Record<string, unknown>,
                userToken: string,
                context?: PenpotRpcRequestContext
            ) => {
                calls.push({ methodName, params, userToken, context });
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
    assert.deepEqual(calls[0].context, {
        mcpToolName: "shape.create_text",
        mcpSessionId: "session-1",
        mcpAdapter: "backend-command",
        mcpFileId: "00000000-0000-0000-0000-000000000001",
        mcpPageId: "00000000-0000-0000-0000-000000000002",
        mcpShapeId: undefined,
    });
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

test("ShapeUpdateTool uses backend RPC when fileId is provided", async () => {
    const calls: RpcCall[] = [];
    const tool = new ShapeUpdateTool(
        mcpServerWithRpc({
            post: async (
                methodName: string,
                params: Record<string, unknown>,
                userToken: string,
                context?: PenpotRpcRequestContext
            ) => {
                calls.push({ methodName, params, userToken, context });
                return {
                    shape: { id: "00000000-0000-0000-0000-000000000003", type: "rect", name: "CTA" },
                    revn: 3,
                    vern: 0,
                };
            },
        })
    );

    const response = await tool.execute({
        fileId: "00000000-0000-0000-0000-000000000001",
        pageId: "00000000-0000-0000-0000-000000000002",
        shapeId: "00000000-0000-0000-0000-000000000003",
        name: " CTA ",
        x: 24,
        y: 32,
        width: 180,
        height: 48,
        fill: { color: "#3366ff", opacity: 0.8 },
        stroke: { color: "#2244aa", width: 2, alignment: "inner" },
        borderRadius: 8,
    });
    const body = parseJsonResponse(response);

    assert.deepEqual(calls, [
        {
            methodName: "update-file-shape",
            params: {
                id: "00000000-0000-0000-0000-000000000001",
                "page-id": "00000000-0000-0000-0000-000000000002",
                "shape-id": "00000000-0000-0000-0000-000000000003",
                name: "CTA",
                x: 24,
                y: 32,
                width: 180,
                height: 48,
                fill: { color: "#3366ff", opacity: 0.8 },
                stroke: { color: "#2244aa", width: 2, alignment: "inner" },
                "border-radius": 8,
                content: undefined,
                "font-size": undefined,
            },
            userToken: "token-1",
            context: {
                mcpToolName: "shape.update",
                mcpSessionId: "session-1",
                mcpAdapter: "backend-command",
                mcpFileId: "00000000-0000-0000-0000-000000000001",
                mcpPageId: "00000000-0000-0000-0000-000000000002",
                mcpShapeId: "00000000-0000-0000-0000-000000000003",
            },
        },
    ]);
    assert.equal(body.status, "ok");
    assert.equal(body.data.adapter, "backend-command");
    assert.equal(body.data.adapterSelection.selected, "backend-command");
    assert.deepEqual(body.data.shape, { id: "00000000-0000-0000-0000-000000000003", type: "rect", name: "CTA" });
});

test("ShapeDeleteTool uses backend RPC when fileId is provided", async () => {
    const calls: RpcCall[] = [];
    const tool = new ShapeDeleteTool(
        mcpServerWithRpc({
            post: async (
                methodName: string,
                params: Record<string, unknown>,
                userToken: string,
                context?: PenpotRpcRequestContext
            ) => {
                calls.push({ methodName, params, userToken, context });
                return {
                    shape: { id: "00000000-0000-0000-0000-000000000003", type: "rect", name: "CTA" },
                    revn: 4,
                    vern: 0,
                };
            },
        })
    );

    const response = await tool.execute({
        fileId: "00000000-0000-0000-0000-000000000001",
        shapeId: "00000000-0000-0000-0000-000000000003",
    });
    const body = parseJsonResponse(response);

    assert.deepEqual(calls, [
        {
            methodName: "delete-file-shape",
            params: {
                id: "00000000-0000-0000-0000-000000000001",
                "page-id": undefined,
                "shape-id": "00000000-0000-0000-0000-000000000003",
            },
            userToken: "token-1",
            context: {
                mcpToolName: "shape.delete",
                mcpSessionId: "session-1",
                mcpAdapter: "backend-command",
                mcpFileId: "00000000-0000-0000-0000-000000000001",
                mcpPageId: undefined,
                mcpShapeId: "00000000-0000-0000-0000-000000000003",
            },
        },
    ]);
    assert.equal(body.status, "ok");
    assert.equal(body.data.adapter, "backend-command");
    assert.equal(body.data.deleted, true);
});

test("ShapeDeleteTool requires confirmation before destructive backend delete when configured", async () => {
    const calls: RpcCall[] = [];
    const tool = new ShapeDeleteTool(
        mcpServerWithRpc(
            {
                post: async (methodName: string, params: Record<string, unknown>, userToken: string) => {
                    calls.push({ methodName, params, userToken });
                    return { shape: null };
                },
            },
            "token-1",
            "session-1",
            {},
            true
        )
    );

    const response = await tool.execute({
        fileId: "00000000-0000-0000-0000-000000000001",
        shapeId: "00000000-0000-0000-0000-000000000003",
    });
    const body = parseJsonResponse(response);

    assert.deepEqual(calls, []);
    assert.equal(body.status, "error");
    assert.equal(body.error.code, ToolErrorCodes.DESTRUCTIVE_ACTION_CONFIRMATION_REQUIRED);
    assert.equal(body.error.data.tool, "shape.delete");
    assert.equal(body.error.data.action, "delete_shape");
    assert.deepEqual(body.error.data.targets, {
        fileId: "00000000-0000-0000-0000-000000000001",
        pageId: null,
        shapeId: "00000000-0000-0000-0000-000000000003",
    });
    assert.deepEqual(body.error.data.confirmation, {
        field: "confirm",
        value: true,
    });
    assert.equal(body.error.data.adapter, "backend-command");
    assert.equal(body.error.data.policy.env, "PENPOT_MCP_REQUIRE_DESTRUCTIVE_CONFIRMATION");
});

test("ShapeDeleteTool executes confirmed destructive backend delete when configured", async () => {
    const calls: RpcCall[] = [];
    const tool = new ShapeDeleteTool(
        mcpServerWithRpc(
            {
                post: async (
                    methodName: string,
                    params: Record<string, unknown>,
                    userToken: string,
                    context?: PenpotRpcRequestContext
                ) => {
                    calls.push({ methodName, params, userToken, context });
                    return {
                        shape: { id: "00000000-0000-0000-0000-000000000003", type: "rect", name: "CTA" },
                        revn: 5,
                        vern: 0,
                    };
                },
            },
            "token-1",
            "session-1",
            {},
            true
        )
    );

    const response = await tool.execute({
        fileId: "00000000-0000-0000-0000-000000000001",
        shapeId: "00000000-0000-0000-0000-000000000003",
        confirm: true,
    });
    const body = parseJsonResponse(response);

    assert.equal(calls.length, 1);
    assert.equal(calls[0].methodName, "delete-file-shape");
    assert.equal(calls[0].context?.mcpToolName, "shape.delete");
    assert.equal(body.status, "ok");
    assert.equal(body.data.adapter, "backend-command");
    assert.equal(body.data.deleted, true);
});

test("ShapeUpdateTool reports adapter error for backend layout updates", async () => {
    const calls: RpcCall[] = [];
    const tool = new ShapeUpdateTool(
        mcpServerWithRpc({
            post: async (methodName: string, params: Record<string, unknown>, userToken: string) => {
                calls.push({ methodName, params, userToken });
                return { shape: null };
            },
        })
    );

    const response = await tool.execute({
        fileId: "00000000-0000-0000-0000-000000000001",
        shapeId: "00000000-0000-0000-0000-000000000003",
        layout: { type: "flex" },
    });
    const body = parseJsonResponse(response);

    assert.deepEqual(calls, []);
    assert.equal(body.status, "error");
    assert.equal(body.error.code, "adapter_not_available");
    assert.equal(body.error.data.adapterSelection.selected, null);
});

test("ShapeUpdateTool rejects concurrent writes to the same file and releases after completion", async () => {
    let releaseFirstWrite: (() => void) | undefined;
    const calls: RpcCall[] = [];
    const tool = new ShapeUpdateTool(
        mcpServerWithRpc(
            {
                post: async (
                    methodName: string,
                    params: Record<string, unknown>,
                    userToken: string,
                    context?: PenpotRpcRequestContext
                ) => {
                    calls.push({ methodName, params, userToken, context });
                    if (calls.length === 1) {
                        await new Promise<void>((resolve) => {
                            releaseFirstWrite = resolve;
                        });
                    }
                    return {
                        shape: { id: "00000000-0000-0000-0000-000000000003", type: "rect", name: "CTA" },
                        revn: calls.length,
                        vern: 0,
                    };
                },
            },
            "token-1",
            "session-1",
            {
                perFileConcurrency: 1,
                perSessionConcurrency: 2,
                perUserConcurrency: 4,
            }
        )
    );

    const args = {
        fileId: "00000000-0000-0000-0000-000000000001",
        shapeId: "00000000-0000-0000-0000-000000000003",
        x: 24,
    };

    const firstWrite = tool.execute(args);
    const rejectedResponse = await tool.execute({ ...args, x: 32 });
    const rejectedBody = parseJsonResponse(rejectedResponse);

    assert.equal(rejectedBody.status, "error");
    assert.equal(rejectedBody.error.code, "mcp_write_concurrency_limit");
    assert.equal(rejectedBody.error.data.status, 429);
    assert.equal(rejectedBody.error.data.data.scope, "file");
    assert.equal(calls.length, 1);

    releaseFirstWrite?.();
    const firstBody = parseJsonResponse(await firstWrite);
    assert.equal(firstBody.status, "ok");

    const acceptedResponse = await tool.execute({ ...args, x: 40 });
    const acceptedBody = parseJsonResponse(acceptedResponse);
    assert.equal(acceptedBody.status, "ok");
    assert.equal(calls.length, 2);
});
