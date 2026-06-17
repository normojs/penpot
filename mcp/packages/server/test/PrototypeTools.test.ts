import assert from "node:assert/strict";
import test from "node:test";
import { McpWriteLimiter } from "../src/McpWriteLimiter.js";
import type { PenpotRpcRequestContext } from "../src/PenpotRpcClient.js";
import type { PenpotMcpServer } from "../src/PenpotMcpServer.js";
import {
    PrototypeCreateFlowTool,
    PrototypeCreateInteractionTool,
    PrototypeListInteractionsTool,
} from "../src/tools/PrototypeTools.js";

type RpcCall = {
    methodName: string;
    params: Record<string, unknown>;
    userToken: string;
    context?: PenpotRpcRequestContext;
};

function parseJsonResponse(response: Awaited<ReturnType<PrototypeCreateFlowTool["execute"]>>) {
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

test("PrototypeCreateFlowTool uses backend RPC when fileId is provided", async () => {
    const calls: RpcCall[] = [];
    const tool = new PrototypeCreateFlowTool(
        mcpServerWithRpc({
            post: async (
                methodName: string,
                params: Record<string, unknown>,
                userToken: string,
                context?: PenpotRpcRequestContext
            ) => {
                calls.push({ methodName, params, userToken, context });
                return {
                    flow: {
                        id: "00000000-0000-0000-0000-000000000004",
                        name: "Checkout",
                        pageId: "00000000-0000-0000-0000-000000000002",
                        startingBoardId: "00000000-0000-0000-0000-000000000003",
                    },
                    revn: 3,
                    vern: 0,
                };
            },
        })
    );

    const response = await tool.execute({
        fileId: "00000000-0000-0000-0000-000000000001",
        pageId: "00000000-0000-0000-0000-000000000002",
        flowId: "00000000-0000-0000-0000-000000000004",
        name: " Checkout ",
        startingBoardId: "00000000-0000-0000-0000-000000000003",
    });
    const body = parseJsonResponse(response);

    assert.deepEqual(calls, [
        {
            methodName: "create-file-prototype-flow",
            params: {
                id: "00000000-0000-0000-0000-000000000001",
                "page-id": "00000000-0000-0000-0000-000000000002",
                "flow-id": "00000000-0000-0000-0000-000000000004",
                name: "Checkout",
                "starting-board-id": "00000000-0000-0000-0000-000000000003",
            },
            userToken: "token-1",
            context: {
                mcpToolName: "prototype.create_flow",
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
    assert.equal(body.data.fileId, "00000000-0000-0000-0000-000000000001");
    assert.equal(body.data.flow.name, "Checkout");
    assert.equal(body.data.revn, 3);
});

test("PrototypeCreateInteractionTool maps navigate interaction backend parameters", async () => {
    const calls: RpcCall[] = [];
    const tool = new PrototypeCreateInteractionTool(
        mcpServerWithRpc({
            post: async (
                methodName: string,
                params: Record<string, unknown>,
                userToken: string,
                context?: PenpotRpcRequestContext
            ) => {
                calls.push({ methodName, params, userToken, context });
                return {
                    interaction: {
                        sourceShapeId: "00000000-0000-0000-0000-000000000003",
                        index: 0,
                        actionType: "navigate-to",
                    },
                    revn: 4,
                    vern: 0,
                };
            },
        })
    );

    const response = await tool.execute({
        fileId: "00000000-0000-0000-0000-000000000001",
        pageId: "00000000-0000-0000-0000-000000000002",
        sourceShapeId: "00000000-0000-0000-0000-000000000003",
        destinationBoardId: "00000000-0000-0000-0000-000000000004",
        trigger: "after-delay",
        delay: 1200,
        preserveScrollPosition: true,
        animation: {
            type: "slide",
            duration: 250,
            easing: "ease-in-out",
            direction: "right",
            way: "in",
            offsetEffect: true,
        },
    });
    const body = parseJsonResponse(response);

    assert.deepEqual(calls, [
        {
            methodName: "create-file-prototype-interaction",
            params: {
                id: "00000000-0000-0000-0000-000000000001",
                "page-id": "00000000-0000-0000-0000-000000000002",
                "source-shape-id": "00000000-0000-0000-0000-000000000003",
                "destination-board-id": "00000000-0000-0000-0000-000000000004",
                trigger: "after-delay",
                delay: 1200,
                "preserve-scroll-position": true,
                animation: {
                    type: "slide",
                    duration: 250,
                    easing: "ease-in-out",
                    direction: "right",
                    way: "in",
                    "offset-effect": true,
                },
            },
            userToken: "token-1",
            context: {
                mcpToolName: "prototype.create_interaction",
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
    assert.equal(body.data.adapterSelection.command, "prototype.create_interaction");
    assert.equal(body.data.interaction.actionType, "navigate-to");
    assert.equal(body.data.revn, 4);
});

test("PrototypeListInteractionsTool reads persisted prototype data through backend RPC", async () => {
    const calls: RpcCall[] = [];
    const tool = new PrototypeListInteractionsTool(
        mcpServerWithRpc({
            get: async (methodName: string, params: Record<string, unknown>, userToken: string) => {
                calls.push({ methodName, params, userToken });
                return {
                    fileId: "00000000-0000-0000-0000-000000000001",
                    flows: [
                        {
                            id: "00000000-0000-0000-0000-000000000005",
                            name: "Checkout",
                            pageId: "00000000-0000-0000-0000-000000000002",
                            startingBoardId: "00000000-0000-0000-0000-000000000004",
                        },
                    ],
                    interactions: [
                        {
                            sourceShapeId: "00000000-0000-0000-0000-000000000003",
                            destinationBoardId: "00000000-0000-0000-0000-000000000004",
                            index: 0,
                            actionType: "navigate-to",
                        },
                    ],
                };
            },
        })
    );

    const response = await tool.execute({
        fileId: "00000000-0000-0000-0000-000000000001",
        pageId: "00000000-0000-0000-0000-000000000002",
        flowId: "00000000-0000-0000-0000-000000000005",
        sourceShapeId: "00000000-0000-0000-0000-000000000003",
    });
    const body = parseJsonResponse(response);

    assert.deepEqual(calls, [
        {
            methodName: "get-file-prototype-interactions",
            params: {
                id: "00000000-0000-0000-0000-000000000001",
                "page-id": "00000000-0000-0000-0000-000000000002",
                "flow-id": "00000000-0000-0000-0000-000000000005",
                "source-shape-id": "00000000-0000-0000-0000-000000000003",
            },
            userToken: "token-1",
        },
    ]);
    assert.equal(body.status, "ok");
    assert.equal(body.data.adapter, "backend-command");
    assert.equal(body.data.adapterSelection.command, "prototype.list_interactions");
    assert.equal(body.data.fileId, "00000000-0000-0000-0000-000000000001");
    assert.equal(body.data.pageId, "00000000-0000-0000-0000-000000000002");
    assert.equal(body.data.flows.length, 1);
    assert.equal(body.data.interactions[0].actionType, "navigate-to");
});

test("PrototypeCreateFlowTool reports adapter error when target is incomplete", async () => {
    const calls: RpcCall[] = [];
    const tool = new PrototypeCreateFlowTool(
        mcpServerWithRpc({
            post: async (methodName: string, params: Record<string, unknown>, userToken: string) => {
                calls.push({ methodName, params, userToken });
                return {};
            },
        })
    );

    const response = await tool.execute({
        pageId: "00000000-0000-0000-0000-000000000002",
        name: "Checkout",
        startingBoardId: "00000000-0000-0000-0000-000000000003",
    });
    const body = parseJsonResponse(response);

    assert.deepEqual(calls, []);
    assert.equal(body.status, "error");
    assert.equal(body.error.code, "adapter_not_available");
    assert.equal(body.error.data.adapterSelection.selected, null);
});
