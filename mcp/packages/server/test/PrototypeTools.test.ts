import assert from "node:assert/strict";
import test from "node:test";
import { McpWriteLimiter } from "../src/McpWriteLimiter.js";
import type { PenpotRpcRequestContext } from "../src/PenpotRpcClient.js";
import type { PenpotMcpServer } from "../src/PenpotMcpServer.js";
import {
    PrototypeCreateFlowTool,
    PrototypeCreateInteractionTool,
    PrototypeCreateOverlayTool,
    PrototypeDeleteInteractionTool,
    PrototypeDuplicateInteractionTool,
    PrototypeListInteractionsTool,
    PrototypeReorderInteractionTool,
    PrototypeUpdateInteractionTool,
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
                        interactionId: "00000000-0000-0000-0000-000000000101",
                        sourceShapeId: "00000000-0000-0000-0000-000000000003",
                        index: 0,
                        identity: {
                            kind: "stable-id",
                            interactionId: "00000000-0000-0000-0000-000000000101",
                            sourceShapeId: "00000000-0000-0000-0000-000000000003",
                            interactionIndex: 0,
                        },
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
    assert.equal(body.data.interaction.interactionId, "00000000-0000-0000-0000-000000000101");
    assert.equal(body.data.interaction.identity.kind, "stable-id");
    assert.equal(body.data.interaction.actionType, "navigate-to");
    assert.equal(body.data.revn, 4);
});

test("PrototypeCreateOverlayTool maps overlay backend parameters", async () => {
    const calls: RpcCall[] = [];
    const tool = new PrototypeCreateOverlayTool(
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
                        interactionId: "00000000-0000-0000-0000-000000000102",
                        sourceShapeId: "00000000-0000-0000-0000-000000000003",
                        destinationBoardId: "00000000-0000-0000-0000-000000000004",
                        relativeToShapeId: "00000000-0000-0000-0000-000000000003",
                        index: 1,
                        identity: {
                            kind: "stable-id",
                            interactionId: "00000000-0000-0000-0000-000000000102",
                            sourceShapeId: "00000000-0000-0000-0000-000000000003",
                            interactionIndex: 1,
                        },
                        actionType: "toggle-overlay",
                        overlayPositionType: "manual",
                        overlayPosition: { x: 12, y: 16 },
                        closeClickOutside: true,
                        backgroundOverlay: true,
                    },
                    revn: 5,
                    vern: 0,
                };
            },
        })
    );

    const response = await tool.execute({
        fileId: "00000000-0000-0000-0000-000000000001",
        pageId: "00000000-0000-0000-0000-000000000002",
        sourceShapeId: "00000000-0000-0000-0000-000000000003",
        actionType: "toggle-overlay",
        destinationBoardId: "00000000-0000-0000-0000-000000000004",
        relativeToShapeId: "00000000-0000-0000-0000-000000000003",
        overlayPositionType: "manual",
        manualPosition: { x: 12, y: 16 },
        closeClickOutside: true,
        backgroundOverlay: true,
        trigger: "mouse-enter",
        animation: {
            type: "dissolve",
            duration: 300,
            easing: "linear",
        },
    });
    const body = parseJsonResponse(response);

    assert.deepEqual(calls, [
        {
            methodName: "create-file-prototype-overlay",
            params: {
                id: "00000000-0000-0000-0000-000000000001",
                "page-id": "00000000-0000-0000-0000-000000000002",
                "source-shape-id": "00000000-0000-0000-0000-000000000003",
                "action-type": "toggle-overlay",
                "destination-board-id": "00000000-0000-0000-0000-000000000004",
                "relative-to-shape-id": "00000000-0000-0000-0000-000000000003",
                "overlay-position-type": "manual",
                "manual-position": { x: 12, y: 16 },
                "close-click-outside": true,
                "background-overlay": true,
                trigger: "mouse-enter",
                delay: undefined,
                animation: {
                    type: "dissolve",
                    duration: 300,
                    easing: "linear",
                },
            },
            userToken: "token-1",
            context: {
                mcpToolName: "prototype.create_overlay",
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
    assert.equal(body.data.adapterSelection.command, "prototype.create_overlay");
    assert.equal(body.data.sourceShapeId, "00000000-0000-0000-0000-000000000003");
    assert.equal(body.data.interaction.interactionId, "00000000-0000-0000-0000-000000000102");
    assert.equal(body.data.interaction.identity.kind, "stable-id");
    assert.equal(body.data.interaction.actionType, "toggle-overlay");
    assert.equal(body.data.interaction.overlayPosition.x, 12);
    assert.equal(body.data.revn, 5);
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
                            interactionId: "00000000-0000-0000-0000-000000000101",
                            sourceShapeId: "00000000-0000-0000-0000-000000000003",
                            destinationBoardId: "00000000-0000-0000-0000-000000000004",
                            index: 0,
                            identity: {
                                kind: "stable-id",
                                interactionId: "00000000-0000-0000-0000-000000000101",
                                sourceShapeId: "00000000-0000-0000-0000-000000000003",
                                interactionIndex: 0,
                            },
                            actionType: "navigate-to",
                        },
                        {
                            sourceShapeId: "00000000-0000-0000-0000-000000000003",
                            destinationBoardId: "00000000-0000-0000-0000-000000000004",
                            relativeToShapeId: "00000000-0000-0000-0000-000000000003",
                            index: 1,
                            identity: {
                                kind: "source-index",
                                sourceShapeId: "00000000-0000-0000-0000-000000000003",
                                interactionIndex: 1,
                                unstable: true,
                            },
                            actionType: "open-overlay",
                            overlayPositionType: "manual",
                            overlayPosition: { x: 12, y: 16 },
                            closeClickOutside: true,
                            backgroundOverlay: true,
                        },
                        {
                            sourceShapeId: "00000000-0000-0000-0000-000000000003",
                            destinationBoardId: "00000000-0000-0000-0000-000000000004",
                            index: 2,
                            identity: {
                                kind: "source-index",
                                sourceShapeId: "00000000-0000-0000-0000-000000000003",
                                interactionIndex: 2,
                                unstable: true,
                            },
                            actionType: "toggle-overlay",
                            overlayPositionType: "bottom-right",
                            overlayPosition: { x: 0, y: 0 },
                            closeClickOutside: false,
                            backgroundOverlay: false,
                        },
                        {
                            sourceShapeId: "00000000-0000-0000-0000-000000000003",
                            destinationBoardId: "00000000-0000-0000-0000-000000000004",
                            index: 3,
                            identity: {
                                kind: "source-index",
                                sourceShapeId: "00000000-0000-0000-0000-000000000003",
                                interactionIndex: 3,
                                unstable: true,
                            },
                            actionType: "close-overlay",
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
    assert.equal(body.data.interactions[0].interactionId, "00000000-0000-0000-0000-000000000101");
    assert.equal(body.data.interactions[0].identity.kind, "stable-id");
    assert.equal(body.data.interactions[0].actionType, "navigate-to");
    assert.equal(body.data.interactions[1].identity.kind, "source-index");
    assert.equal(body.data.interactions[1].identity.unstable, true);
    assert.equal(body.data.interactions[1].actionType, "open-overlay");
    assert.equal(body.data.interactions[1].overlayPosition.x, 12);
    assert.equal(body.data.interactions[2].actionType, "toggle-overlay");
    assert.equal(body.data.interactions[3].actionType, "close-overlay");
});

test("PrototypeDeleteInteractionTool deletes persisted prototype interaction through backend RPC", async () => {
    const calls: RpcCall[] = [];
    const tool = new PrototypeDeleteInteractionTool(
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
                        destinationBoardId: "00000000-0000-0000-0000-000000000004",
                        index: 1,
                        actionType: "navigate-to",
                    },
                    revn: 5,
                    vern: 0,
                };
            },
        })
    );

    const response = await tool.execute({
        fileId: "00000000-0000-0000-0000-000000000001",
        pageId: "00000000-0000-0000-0000-000000000002",
        sourceShapeId: "00000000-0000-0000-0000-000000000003",
        interactionIndex: 1,
    });
    const body = parseJsonResponse(response);

    assert.deepEqual(calls, [
        {
            methodName: "delete-file-prototype-interaction",
            params: {
                id: "00000000-0000-0000-0000-000000000001",
                "page-id": "00000000-0000-0000-0000-000000000002",
                "source-shape-id": "00000000-0000-0000-0000-000000000003",
                "interaction-index": 1,
            },
            userToken: "token-1",
            context: {
                mcpToolName: "prototype.delete_interaction",
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
    assert.equal(body.data.adapterSelection.command, "prototype.delete_interaction");
    assert.equal(body.data.sourceShapeId, "00000000-0000-0000-0000-000000000003");
    assert.equal(body.data.interactionIndex, 1);
    assert.equal(body.data.interaction.actionType, "navigate-to");
    assert.equal(body.data.revn, 5);
});

test("PrototypeDeleteInteractionTool deletes by stable interaction id through backend RPC", async () => {
    const calls: RpcCall[] = [];
    const tool = new PrototypeDeleteInteractionTool(
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
                        interactionId: "00000000-0000-0000-0000-000000000101",
                        sourceShapeId: "00000000-0000-0000-0000-000000000003",
                        destinationBoardId: "00000000-0000-0000-0000-000000000004",
                        index: 1,
                        identity: {
                            kind: "stable-id",
                            interactionId: "00000000-0000-0000-0000-000000000101",
                            sourceShapeId: "00000000-0000-0000-0000-000000000003",
                            interactionIndex: 1,
                        },
                        actionType: "navigate-to",
                    },
                    revn: 6,
                    vern: 0,
                };
            },
        })
    );

    const response = await tool.execute({
        fileId: "00000000-0000-0000-0000-000000000001",
        pageId: "00000000-0000-0000-0000-000000000002",
        interactionId: "00000000-0000-0000-0000-000000000101",
        sourceShapeId: "00000000-0000-0000-0000-000000000003",
        interactionIndex: 1,
    });
    const body = parseJsonResponse(response);

    assert.deepEqual(calls[0].params, {
        id: "00000000-0000-0000-0000-000000000001",
        "page-id": "00000000-0000-0000-0000-000000000002",
        "interaction-id": "00000000-0000-0000-0000-000000000101",
        "source-shape-id": "00000000-0000-0000-0000-000000000003",
        "interaction-index": 1,
    });
    assert.equal(body.status, "ok");
    assert.equal(body.data.interactionId, "00000000-0000-0000-0000-000000000101");
    assert.equal(body.data.sourceShapeId, "00000000-0000-0000-0000-000000000003");
    assert.equal(body.data.interactionIndex, 1);
    assert.equal(body.data.interaction.identity.kind, "stable-id");
});

test("PrototypeUpdateInteractionTool updates persisted prototype interaction through backend RPC", async () => {
    const calls: RpcCall[] = [];
    const tool = new PrototypeUpdateInteractionTool(
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
                        interactionId: "00000000-0000-0000-0000-000000000101",
                        sourceShapeId: "00000000-0000-0000-0000-000000000003",
                        destinationBoardId: "00000000-0000-0000-0000-000000000004",
                        index: 0,
                        actionType: "navigate-to",
                    },
                    revn: 7,
                    vern: 0,
                };
            },
        })
    );

    const response = await tool.execute({
        fileId: "00000000-0000-0000-0000-000000000001",
        pageId: "00000000-0000-0000-0000-000000000002",
        interactionId: "00000000-0000-0000-0000-000000000101",
        sourceShapeId: "00000000-0000-0000-0000-000000000003",
        interactionIndex: 0,
        destinationBoardId: "00000000-0000-0000-0000-000000000004",
        trigger: "mouse-enter",
        preserveScrollPosition: true,
        animation: {
            type: "dissolve",
            duration: 250,
            easing: "ease-in",
        },
    });
    const body = parseJsonResponse(response);

    assert.deepEqual(calls, [
        {
            methodName: "update-file-prototype-interaction",
            params: {
                id: "00000000-0000-0000-0000-000000000001",
                "page-id": "00000000-0000-0000-0000-000000000002",
                "interaction-id": "00000000-0000-0000-0000-000000000101",
                "source-shape-id": "00000000-0000-0000-0000-000000000003",
                "interaction-index": 0,
                "destination-board-id": "00000000-0000-0000-0000-000000000004",
                trigger: "mouse-enter",
                "preserve-scroll-position": true,
                animation: {
                    type: "dissolve",
                    duration: 250,
                    easing: "ease-in",
                },
            },
            userToken: "token-1",
            context: {
                mcpToolName: "prototype.update_interaction",
                mcpSessionId: "session-1",
                mcpAdapter: "backend-command",
                mcpFileId: "00000000-0000-0000-0000-000000000001",
                mcpPageId: "00000000-0000-0000-0000-000000000002",
                mcpShapeId: "00000000-0000-0000-0000-000000000003",
            },
        },
    ]);
    assert.equal(body.status, "ok");
    assert.equal(body.data.adapterSelection.command, "prototype.update_interaction");
    assert.equal(body.data.interactionId, "00000000-0000-0000-0000-000000000101");
    assert.equal(body.data.interactionIndex, 0);
    assert.equal(body.data.revn, 7);
});

test("PrototypeReorderInteractionTool reorders persisted prototype interaction through backend RPC", async () => {
    const calls: RpcCall[] = [];
    const tool = new PrototypeReorderInteractionTool(
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
                        interactionId: "00000000-0000-0000-0000-000000000101",
                        sourceShapeId: "00000000-0000-0000-0000-000000000003",
                        index: 2,
                        actionType: "navigate-to",
                    },
                    revn: 8,
                    vern: 0,
                };
            },
        })
    );

    const response = await tool.execute({
        fileId: "00000000-0000-0000-0000-000000000001",
        pageId: "00000000-0000-0000-0000-000000000002",
        interactionId: "00000000-0000-0000-0000-000000000101",
        sourceShapeId: "00000000-0000-0000-0000-000000000003",
        interactionIndex: 1,
        toIndex: 2,
    });
    const body = parseJsonResponse(response);

    assert.deepEqual(calls[0].params, {
        id: "00000000-0000-0000-0000-000000000001",
        "page-id": "00000000-0000-0000-0000-000000000002",
        "interaction-id": "00000000-0000-0000-0000-000000000101",
        "source-shape-id": "00000000-0000-0000-0000-000000000003",
        "interaction-index": 1,
        "to-index": 2,
    });
    assert.equal(calls[0].context?.mcpToolName, "prototype.reorder_interaction");
    assert.equal(body.status, "ok");
    assert.equal(body.data.adapterSelection.command, "prototype.reorder_interaction");
    assert.equal(body.data.interactionIndex, 2);
    assert.equal(body.data.revn, 8);
});

test("PrototypeDuplicateInteractionTool duplicates persisted prototype interaction through backend RPC", async () => {
    const calls: RpcCall[] = [];
    const tool = new PrototypeDuplicateInteractionTool(
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
                        interactionId: "00000000-0000-0000-0000-000000000202",
                        sourceShapeId: "00000000-0000-0000-0000-000000000003",
                        index: 1,
                        actionType: "navigate-to",
                    },
                    revn: 9,
                    vern: 0,
                };
            },
        })
    );

    const response = await tool.execute({
        fileId: "00000000-0000-0000-0000-000000000001",
        pageId: "00000000-0000-0000-0000-000000000002",
        interactionId: "00000000-0000-0000-0000-000000000101",
        sourceShapeId: "00000000-0000-0000-0000-000000000003",
        interactionIndex: 0,
        insertionIndex: 1,
    });
    const body = parseJsonResponse(response);

    assert.deepEqual(calls[0].params, {
        id: "00000000-0000-0000-0000-000000000001",
        "page-id": "00000000-0000-0000-0000-000000000002",
        "interaction-id": "00000000-0000-0000-0000-000000000101",
        "source-shape-id": "00000000-0000-0000-0000-000000000003",
        "interaction-index": 0,
        "insertion-index": 1,
    });
    assert.equal(calls[0].context?.mcpToolName, "prototype.duplicate_interaction");
    assert.equal(body.status, "ok");
    assert.equal(body.data.adapterSelection.command, "prototype.duplicate_interaction");
    assert.equal(body.data.interactionId, "00000000-0000-0000-0000-000000000202");
    assert.equal(body.data.interactionIndex, 1);
    assert.equal(body.data.revn, 9);
});

test("PrototypeDeleteInteractionTool rejects missing delete target", async () => {
    const calls: RpcCall[] = [];
    const tool = new PrototypeDeleteInteractionTool(
        mcpServerWithRpc({
            post: async (methodName: string, params: Record<string, unknown>, userToken: string) => {
                calls.push({ methodName, params, userToken });
                return {};
            },
        })
    );

    const response = await tool.execute({
        fileId: "00000000-0000-0000-0000-000000000001",
        pageId: "00000000-0000-0000-0000-000000000002",
    });
    const body = parseJsonResponse(response);

    assert.equal(calls.length, 0);
    assert.equal(body.status, "error");
    assert.equal(body.error.code, "prototype_interaction_target_required");
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
