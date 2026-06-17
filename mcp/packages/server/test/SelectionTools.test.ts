import assert from "node:assert/strict";
import test from "node:test";
import { FileContextErrorCodes, FileContextRegistry } from "../src/FileContextRegistry.js";
import type { PenpotMcpServer } from "../src/PenpotMcpServer.js";
import { SelectionGetTool, SelectionSetTool } from "../src/tools/SelectionTools.js";

const UUIDS = {
    file: "00000000-0000-0000-0000-000000000001",
    page: "00000000-0000-0000-0000-000000000002",
    object: "00000000-0000-0000-0000-000000000003",
    object2: "00000000-0000-0000-0000-000000000004",
};

function parseJsonResponse(response: Awaited<ReturnType<SelectionGetTool["execute"]>>) {
    const text = response.content[0];
    assert.equal(text.type, "text");
    return JSON.parse(text.text);
}

test("SelectionGetTool returns live binding guidance when unbound", async () => {
    const registry = new FileContextRegistry();
    const tool = new SelectionGetTool({
        fileContextRegistry: registry,
        getSessionContext: () => ({ userToken: "token-1" }),
    } as unknown as PenpotMcpServer);

    const response = await tool.execute({});
    const body = parseJsonResponse(response);

    assert.equal(body.status, "error");
    assert.equal(body.error.code, FileContextErrorCodes.FILE_CONTEXT_REQUIRED);
    assert.equal(body.error.data.liveOnly.adapter, "plugin-live");
    assert.equal(body.error.data.liveOnly.state, "editor-local");
    assert.equal(body.error.data.retryTool, "selection.get");
});

test("SelectionGetTool returns live binding guidance when bound context is stale", async () => {
    const registry = new FileContextRegistry();
    registry.upsertContext("token-1", {
        contextId: "ctx-1",
        status: "available",
        ownerTabId: "tab-1",
        fileId: UUIDS.file,
        fileName: "Design",
        pageId: UUIDS.page,
        pageName: "Page",
        selectionIds: [UUIDS.object],
        capabilities: ["selection.read", "selection.write"],
        updatedAt: new Date(0).toISOString(),
    });
    registry.bindContext("token-1", "ctx-1");
    registry.markSessionStale("token-1", "plugin-disconnected");
    const tool = new SelectionGetTool({
        fileContextRegistry: registry,
        getSessionContext: () => ({ userToken: "token-1" }),
    } as unknown as PenpotMcpServer);

    const response = await tool.execute({});
    const body = parseJsonResponse(response);

    assert.equal(body.status, "error");
    assert.equal(body.error.code, FileContextErrorCodes.FILE_CONTEXT_REQUIRED);
    assert.equal(body.error.data.liveOnly.adapter, "plugin-live");
    assert.equal(body.error.data.retryTool, "selection.get");
    assert.equal(body.error.data.fileContext.status, "stale");
});

test("SelectionGetTool executes plugin-live task when context is bound", async () => {
    const registry = new FileContextRegistry();
    registry.upsertContext("token-1", {
        contextId: "ctx-1",
        status: "available",
        ownerTabId: "tab-1",
        fileId: UUIDS.file,
        fileName: "Design",
        pageId: UUIDS.page,
        pageName: "Page",
        selectionIds: [UUIDS.object],
        capabilities: ["selection.read", "selection.write"],
        updatedAt: new Date(0).toISOString(),
    });
    registry.bindContext("token-1", "ctx-1");

    const requests: unknown[] = [];
    const tool = new SelectionGetTool({
        fileContextRegistry: registry,
        getSessionContext: () => ({ userToken: "token-1" }),
        pluginBridge: {
            executePluginTask: async (task: { toRequest: () => unknown }) => {
                requests.push(task.toRequest());
                return {
                    data: {
                        selectionIds: [UUIDS.object],
                        shapes: [
                            {
                                id: UUIDS.object,
                                name: "CTA",
                                type: "rect",
                                pageId: UUIDS.page,
                                pageName: "Page",
                                x: 10,
                                y: 20,
                                width: 100,
                                height: 40,
                            },
                        ],
                        currentPage: {
                            id: UUIDS.page,
                            name: "Page",
                            current: true,
                        },
                    },
                };
            },
        },
    } as unknown as PenpotMcpServer);

    const response = await tool.execute({});
    const body = parseJsonResponse(response);

    assert.equal(requests.length, 1);
    assert.equal((requests[0] as { task: string }).task, "selection");
    assert.deepEqual((requests[0] as { params: unknown }).params, { action: "get" });
    assert.equal(body.status, "ok");
    assert.equal(body.data.adapter, "plugin-live");
    assert.equal(body.data.adapterSelection.command, "selection.get");
    assert.equal(body.data.adapterSelection.selected, "plugin-live");
    assert.deepEqual(body.data.selectionIds, [UUIDS.object]);
    assert.equal(body.data.shapes[0].name, "CTA");
});

test("SelectionGetTool rejects unsupported explicit adapters", async () => {
    const tool = new SelectionGetTool({} as unknown as PenpotMcpServer);

    const response = await tool.execute({ adapter: "backend-command" });
    const body = parseJsonResponse(response);

    assert.equal(body.status, "error");
    assert.equal(body.error.code, "adapter_not_supported");
    assert.equal(body.error.data.adapterSelection.command, "selection.get");
    assert.equal(body.error.data.adapterSelection.selected, null);
});

test("SelectionSetTool returns live binding guidance when unbound", async () => {
    const registry = new FileContextRegistry();
    const tool = new SelectionSetTool({
        fileContextRegistry: registry,
        getSessionContext: () => ({ userToken: "token-1" }),
    } as unknown as PenpotMcpServer);

    const response = await tool.execute({ shapeIds: [UUIDS.object] });
    const body = parseJsonResponse(response);

    assert.equal(body.status, "error");
    assert.equal(body.error.code, FileContextErrorCodes.FILE_CONTEXT_REQUIRED);
    assert.equal(body.error.data.liveOnly.adapter, "plugin-live");
    assert.equal(body.error.data.liveOnly.state, "editor-local");
    assert.equal(body.error.data.retryTool, "selection.set");
});

test("SelectionSetTool returns live binding guidance when bound context is stale", async () => {
    const registry = new FileContextRegistry();
    registry.upsertContext("token-1", {
        contextId: "ctx-1",
        status: "available",
        ownerTabId: "tab-1",
        fileId: UUIDS.file,
        fileName: "Design",
        pageId: UUIDS.page,
        pageName: "Page",
        selectionIds: [UUIDS.object],
        capabilities: ["selection.read", "selection.write"],
        updatedAt: new Date(0).toISOString(),
    });
    registry.bindContext("token-1", "ctx-1");
    registry.markSessionStale("token-1", "plugin-disconnected");
    const tool = new SelectionSetTool({
        fileContextRegistry: registry,
        getSessionContext: () => ({ userToken: "token-1" }),
    } as unknown as PenpotMcpServer);

    const response = await tool.execute({ shapeIds: [UUIDS.object] });
    const body = parseJsonResponse(response);

    assert.equal(body.status, "error");
    assert.equal(body.error.code, FileContextErrorCodes.FILE_CONTEXT_REQUIRED);
    assert.equal(body.error.data.liveOnly.adapter, "plugin-live");
    assert.equal(body.error.data.retryTool, "selection.set");
    assert.equal(body.error.data.fileContext.status, "stale");
});

test("SelectionSetTool executes plugin-live task when context is bound", async () => {
    const registry = new FileContextRegistry();
    registry.upsertContext("token-1", {
        contextId: "ctx-1",
        status: "available",
        ownerTabId: "tab-1",
        fileId: UUIDS.file,
        fileName: "Design",
        pageId: UUIDS.page,
        pageName: "Page",
        selectionIds: [],
        capabilities: ["selection.read", "selection.write"],
        updatedAt: new Date(0).toISOString(),
    });
    registry.bindContext("token-1", "ctx-1");

    const requests: unknown[] = [];
    const tool = new SelectionSetTool({
        fileContextRegistry: registry,
        getSessionContext: () => ({ userToken: "token-1" }),
        pluginBridge: {
            executePluginTask: async (task: { toRequest: () => unknown }) => {
                requests.push(task.toRequest());
                return {
                    data: {
                        selectionIds: [UUIDS.object, UUIDS.object2],
                        shapes: [
                            {
                                id: UUIDS.object,
                                name: "CTA",
                                type: "rect",
                                pageId: UUIDS.page,
                                pageName: "Page",
                                x: 10,
                                y: 20,
                                width: 100,
                                height: 40,
                            },
                            {
                                id: UUIDS.object2,
                                name: "Label",
                                type: "text",
                                pageId: UUIDS.page,
                                pageName: "Page",
                                x: 12,
                                y: 24,
                                width: 80,
                                height: 24,
                            },
                        ],
                        currentPage: {
                            id: UUIDS.page,
                            name: "Page",
                            current: true,
                        },
                    },
                };
            },
        },
    } as unknown as PenpotMcpServer);

    const response = await tool.execute({ shapeIds: [UUIDS.object, UUIDS.object2] });
    const body = parseJsonResponse(response);

    assert.equal(requests.length, 1);
    assert.equal((requests[0] as { task: string }).task, "selection");
    assert.deepEqual((requests[0] as { params: unknown }).params, {
        action: "set",
        shapeIds: [UUIDS.object, UUIDS.object2],
    });
    assert.equal(body.status, "ok");
    assert.equal(body.data.adapter, "plugin-live");
    assert.equal(body.data.adapterSelection.command, "selection.set");
    assert.equal(body.data.adapterSelection.selected, "plugin-live");
    assert.deepEqual(body.data.selectionIds, [UUIDS.object, UUIDS.object2]);
    assert.equal(body.data.shapes[1].name, "Label");
});

test("SelectionSetTool allows clearing selection", async () => {
    const registry = new FileContextRegistry();
    registry.upsertContext("token-1", {
        contextId: "ctx-1",
        status: "available",
        ownerTabId: "tab-1",
        fileId: UUIDS.file,
        fileName: "Design",
        pageId: UUIDS.page,
        pageName: "Page",
        selectionIds: [UUIDS.object],
        capabilities: ["selection.read", "selection.write"],
        updatedAt: new Date(0).toISOString(),
    });
    registry.bindContext("token-1", "ctx-1");

    const requests: unknown[] = [];
    const tool = new SelectionSetTool({
        fileContextRegistry: registry,
        getSessionContext: () => ({ userToken: "token-1" }),
        pluginBridge: {
            executePluginTask: async (task: { toRequest: () => unknown }) => {
                requests.push(task.toRequest());
                return {
                    data: {
                        selectionIds: [],
                        shapes: [],
                        currentPage: {
                            id: UUIDS.page,
                            name: "Page",
                            current: true,
                        },
                    },
                };
            },
        },
    } as unknown as PenpotMcpServer);

    const response = await tool.execute({ shapeIds: [] });
    const body = parseJsonResponse(response);

    assert.deepEqual((requests[0] as { params: unknown }).params, { action: "set", shapeIds: [] });
    assert.equal(body.status, "ok");
    assert.deepEqual(body.data.selectionIds, []);
    assert.deepEqual(body.data.shapes, []);
});

test("SelectionSetTool rejects unsupported explicit adapters", async () => {
    const tool = new SelectionSetTool({} as unknown as PenpotMcpServer);

    const response = await tool.execute({ shapeIds: [UUIDS.object], adapter: "backend-command" });
    const body = parseJsonResponse(response);

    assert.equal(body.status, "error");
    assert.equal(body.error.code, "adapter_not_supported");
    assert.equal(body.error.data.adapterSelection.command, "selection.set");
    assert.equal(body.error.data.adapterSelection.selected, null);
});
