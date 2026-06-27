import assert from "node:assert/strict";
import test from "node:test";
import { McpWriteLimiter } from "../src/McpWriteLimiter.js";
import type { McpWriteLimiterConfig } from "../src/McpWriteLimiter.js";
import type { PenpotRpcRequestContext } from "../src/PenpotRpcClient.js";
import type { PenpotMcpServer } from "../src/PenpotMcpServer.js";
import {
    ShapeCreateFrameTool,
    ShapeCreateImageTool,
    ShapeCreateTextTool,
    ShapeDeleteTool,
    ShapeSetLayoutTool,
    ShapeSetStyleTool,
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

function mcpServerWithPlugin(
    pluginBridge: { executePluginTask: (...args: any[]) => Promise<unknown> },
    userToken = "token-1",
    mcpSessionId = "session-1"
): PenpotMcpServer {
    return {
        pluginBridge,
        getSessionContext: () => ({ userToken, mcpSessionId }),
        fileContextRegistry: {
            getSessionSummary: () => ({
                bound: true,
                boundContext: { status: "bound" },
                availableContexts: [],
                staleContexts: [],
            }),
        },
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

test("ShapeCreateImageTool uses backend RPC when fileId and pageId are provided", async () => {
    const calls: RpcCall[] = [];
    const tool = new ShapeCreateImageTool(
        mcpServerWithRpc({
            post: async (
                methodName: string,
                params: Record<string, unknown>,
                userToken: string,
                context?: PenpotRpcRequestContext
            ) => {
                calls.push({ methodName, params, userToken, context });
                return {
                    shape: { id: "00000000-0000-0000-0000-000000000005", type: "rect", name: "Hero" },
                    media: { id: "00000000-0000-0000-0000-000000000006", width: 575, height: 416 },
                    revn: 3,
                    vern: 0,
                };
            },
        })
    );

    const response = await tool.execute({
        fileId: "00000000-0000-0000-0000-000000000001",
        pageId: "00000000-0000-0000-0000-000000000002",
        shapeId: "00000000-0000-0000-0000-000000000005",
        parentId: "00000000-0000-0000-0000-000000000003",
        name: " Hero ",
        x: 12,
        y: 24,
        width: 575,
        imageBase64: "aGVsbG8=",
        mimeType: "image/png",
    });
    const body = parseJsonResponse(response);

    assert.deepEqual(calls, [
        {
            methodName: "create-file-image-shape",
            params: {
                id: "00000000-0000-0000-0000-000000000001",
                "page-id": "00000000-0000-0000-0000-000000000002",
                "shape-id": "00000000-0000-0000-0000-000000000005",
                "parent-id": "00000000-0000-0000-0000-000000000003",
                name: "Hero",
                x: 12,
                y: 24,
                width: 575,
                height: undefined,
                "image-base64": "aGVsbG8=",
                "mime-type": "image/png",
            },
            userToken: "token-1",
            context: {
                mcpToolName: "shape.create_image",
                mcpSessionId: "session-1",
                mcpAdapter: "backend-command",
                mcpFileId: "00000000-0000-0000-0000-000000000001",
                mcpPageId: "00000000-0000-0000-0000-000000000002",
                mcpShapeId: "00000000-0000-0000-0000-000000000005",
            },
        },
    ]);
    assert.equal(body.status, "ok");
    assert.equal(body.data.adapter, "backend-command");
    assert.equal(body.data.adapterSelection.selected, "backend-command");
    assert.deepEqual(body.data.media, { id: "00000000-0000-0000-0000-000000000006", width: 575, height: 416 });
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
        parentId: "00000000-0000-0000-0000-000000000004",
        index: 0,
        name: " CTA ",
        x: 24,
        y: 32,
        width: 180,
        height: 48,
        fill: { color: "#3366ff", opacity: 0.8 },
        fills: [{ color: "#3366ff", opacity: 0.8 }, { color: "#ffffff" }],
        stroke: { color: "#2244aa", width: 2, alignment: "inner" },
        strokes: [
            { color: "#2244aa", width: 2, alignment: "inner" },
            { color: "#112244", opacity: 0.5 },
        ],
        borderRadius: 8,
        r1: 4,
        r2: 6,
        r3: 8,
        r4: 10,
        layout: {
            type: "flex",
            direction: "column",
            wrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            rowGap: 12,
            columnGap: 8,
            padding: 16,
        },
    });
    const body = parseJsonResponse(response);

    assert.deepEqual(calls, [
        {
            methodName: "update-file-shape",
            params: {
                id: "00000000-0000-0000-0000-000000000001",
                "page-id": "00000000-0000-0000-0000-000000000002",
                "shape-id": "00000000-0000-0000-0000-000000000003",
                "parent-id": "00000000-0000-0000-0000-000000000004",
                index: 0,
                name: "CTA",
                x: 24,
                y: 32,
                width: 180,
                height: 48,
                fill: { color: "#3366ff", opacity: 0.8 },
                fills: [{ color: "#3366ff", opacity: 0.8 }, { color: "#ffffff" }],
                stroke: { color: "#2244aa", width: 2, alignment: "inner" },
                strokes: [
                    { color: "#2244aa", width: 2, alignment: "inner" },
                    { color: "#112244", opacity: 0.5 },
                ],
                "border-radius": 8,
                r1: 4,
                r2: 6,
                r3: 8,
                r4: 10,
                content: undefined,
                "font-size": undefined,
                layout: {
                    type: "flex",
                    direction: "column",
                    wrap: "wrap",
                    "align-items": "center",
                    "justify-content": "space-between",
                    "row-gap": 12,
                    "column-gap": 8,
                    padding: 16,
                },
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

test("ShapeUpdateTool rejects backend-only fields without fileId", async () => {
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
        shapeId: "00000000-0000-0000-0000-000000000003",
        parentId: "00000000-0000-0000-0000-000000000004",
    });
    const body = parseJsonResponse(response);

    assert.deepEqual(calls, []);
    assert.equal(body.status, "error");
    assert.equal(body.error.code, "adapter_not_available");
    assert.equal(body.error.data.adapterSelection.command, "shape.update");
    assert.equal(body.error.data.adapterSelection.selected, null);
    assert.equal(
        body.error.data.adapterSelection.candidates[1].reason,
        "plugin-live does not support backend-only shape style or hierarchy fields; pass fileId to use backend-command."
    );
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

test("ShapeUpdateTool sends backend grid layout subset updates", async () => {
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
                return { shape: { id: "00000000-0000-0000-0000-000000000003", type: "frame" }, revn: 2, vern: 0 };
            },
        })
    );

    const response = await tool.execute({
        fileId: "00000000-0000-0000-0000-000000000001",
        shapeId: "00000000-0000-0000-0000-000000000003",
        layout: {
            type: "grid",
            direction: "row",
            alignItems: "center",
            justifyItems: "stretch",
            alignContent: "space-between",
            justifyContent: "space-evenly",
            rowGap: 20,
            columnGap: 12,
            padding: 24,
            rows: [
                { type: "fixed", value: 120 },
                { type: "flex", value: 1 },
            ],
            columns: [{ type: "percent", value: 50 }, { type: "auto" }],
        },
    });
    const body = parseJsonResponse(response);

    assert.equal(calls.length, 1);
    assert.equal(calls[0].methodName, "update-file-shape");
    assert.deepEqual(calls[0].params.layout, {
        type: "grid",
        direction: "row",
        "align-items": "center",
        "justify-items": "stretch",
        "align-content": "space-between",
        "justify-content": "space-evenly",
        "row-gap": 20,
        "column-gap": 12,
        padding: 24,
        rows: [
            { type: "fixed", value: 120 },
            { type: "flex", value: 1 },
        ],
        columns: [{ type: "percent", value: 50 }, { type: "auto" }],
    });
    assert.equal(calls[0].context?.mcpToolName, "shape.update");
    assert.equal(body.status, "ok");
    assert.equal(body.data.adapter, "backend-command");
    assert.equal(body.data.adapterSelection.selected, "backend-command");
});

test("ShapeSetLayoutTool forwards backend layout updates with alias audit context", async () => {
    const calls: RpcCall[] = [];
    const tool = new ShapeSetLayoutTool(
        mcpServerWithRpc({
            post: async (
                methodName: string,
                params: Record<string, unknown>,
                userToken: string,
                context?: PenpotRpcRequestContext
            ) => {
                calls.push({ methodName, params, userToken, context });
                return { shape: { id: "00000000-0000-0000-0000-000000000003", type: "frame" }, revn: 6, vern: 0 };
            },
        })
    );

    const response = await tool.execute({
        fileId: "00000000-0000-0000-0000-000000000001",
        pageId: "00000000-0000-0000-0000-000000000002",
        shapeId: "00000000-0000-0000-0000-000000000003",
        layout: {
            type: "flex",
            direction: "column",
            rowGap: 12,
            padding: 16,
        },
    });
    const body = parseJsonResponse(response);

    assert.equal(calls.length, 1);
    assert.equal(calls[0].methodName, "update-file-shape");
    assert.deepEqual(calls[0].params.layout, {
        type: "flex",
        direction: "column",
        "row-gap": 12,
        padding: 16,
    });
    assert.equal(calls[0].context?.mcpToolName, "shape.set_layout");
    assert.equal(body.status, "ok");
    assert.equal(body.data.adapter, "backend-command");
    assert.equal(body.data.adapterSelection.command, "shape.set_layout");
});

test("ShapeSetLayoutTool forwards plugin-live layout updates with alias adapter metadata", async () => {
    const requests: Array<{ id: string; task: string; params: Record<string, unknown> }> = [];
    const tool = new ShapeSetLayoutTool(
        mcpServerWithPlugin({
            executePluginTask: async (
                task: { toRequest: () => { id: string; task: string; params: Record<string, unknown> } }
            ) => {
                requests.push(task.toRequest());
                return {
                    data: {
                        shape: { id: "00000000-0000-0000-0000-000000000003", type: "frame", name: "Card" },
                        currentPage: null,
                    },
                };
            },
        })
    );

    const response = await tool.execute({
        shapeId: "00000000-0000-0000-0000-000000000003",
        layout: {
            type: "flex",
            direction: "row",
            columnGap: 8,
        },
    });
    const body = parseJsonResponse(response);

    assert.equal(requests.length, 1);
    assert.match(requests[0].id, /^[0-9a-f-]{36}$/);
    assert.equal(requests[0].task, "shape");
    assert.deepEqual(requests[0].params, {
        action: "update",
        shapeId: "00000000-0000-0000-0000-000000000003",
        name: undefined,
        x: undefined,
        y: undefined,
        width: undefined,
        height: undefined,
        fill: undefined,
        stroke: undefined,
        borderRadius: undefined,
        content: undefined,
        fontSize: undefined,
        layout: {
            type: "flex",
            direction: "row",
            columnGap: 8,
        },
    });
    assert.equal(body.status, "ok");
    assert.equal(body.data.adapter, "plugin-live");
    assert.equal(body.data.adapterSelection.command, "shape.set_layout");
});

test("ShapeSetStyleTool forwards backend style updates with alias audit context", async () => {
    const calls: RpcCall[] = [];
    const tool = new ShapeSetStyleTool(
        mcpServerWithRpc({
            post: async (
                methodName: string,
                params: Record<string, unknown>,
                userToken: string,
                context?: PenpotRpcRequestContext
            ) => {
                calls.push({ methodName, params, userToken, context });
                return {
                    shape: { id: "00000000-0000-0000-0000-000000000003", type: "text", name: "Title" },
                    revn: 7,
                    vern: 0,
                };
            },
        })
    );

    const response = await tool.execute({
        fileId: "00000000-0000-0000-0000-000000000001",
        pageId: "00000000-0000-0000-0000-000000000002",
        shapeId: "00000000-0000-0000-0000-000000000003",
        fills: [{ color: "#111111" }],
        r1: 4,
        r2: 6,
        content: "Hello",
        fontSize: 32,
    });
    const body = parseJsonResponse(response);

    assert.equal(calls.length, 1);
    assert.equal(calls[0].methodName, "update-file-shape");
    assert.deepEqual(calls[0].params.fills, [{ color: "#111111" }]);
    assert.equal(calls[0].params.r1, 4);
    assert.equal(calls[0].params.r2, 6);
    assert.equal(calls[0].params.content, "Hello");
    assert.equal(calls[0].params["font-size"], 32);
    assert.equal(calls[0].context?.mcpToolName, "shape.set_style");
    assert.equal(body.status, "ok");
    assert.equal(body.data.adapter, "backend-command");
    assert.equal(body.data.adapterSelection.command, "shape.set_style");
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
