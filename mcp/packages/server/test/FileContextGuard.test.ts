import assert from "node:assert/strict";
import test from "node:test";
import { FileContextErrorCodes, FileContextRegistry } from "../src/FileContextRegistry.js";
import type { PenpotMcpServer } from "../src/PenpotMcpServer.js";
import { requireBoundFileContext } from "../src/tools/FileContextGuard.js";
import type { FileContextSnapshot } from "@penpot/mcp-common";

function mcpServerWithRegistry(registry: FileContextRegistry): PenpotMcpServer {
    return { fileContextRegistry: registry } as unknown as PenpotMcpServer;
}

function context(): FileContextSnapshot {
    return {
        contextId: "tab-1:00000000-0000-0000-0000-000000000001",
        status: "available",
        ownerTabId: "tab-1",
        fileId: "00000000-0000-0000-0000-000000000001",
        fileName: "Prototype",
        pageId: "00000000-0000-0000-0000-000000000002",
        teamId: "team-1",
        selectionIds: [],
        capabilities: ["shape.write"],
        updatedAt: "2026-06-11T00:00:00.000Z",
    };
}

function parseJsonResponse(response: NonNullable<ReturnType<typeof requireBoundFileContext>>) {
    const text = response.content[0];
    if (text.type !== "text") {
        throw new Error("Expected text response");
    }
    return JSON.parse(text.text);
}

test("requireBoundFileContext returns structured file_context_required when unbound", () => {
    const registry = new FileContextRegistry();
    const response = requireBoundFileContext(mcpServerWithRegistry(registry), "token-1", "export_shape");

    assert.ok(response);
    const body = parseJsonResponse(response);
    assert.equal(body.status, "error");
    assert.equal(body.error.code, FileContextErrorCodes.FILE_CONTEXT_REQUIRED);
    assert.deepEqual(body.error.actions, [
        "file.list",
        "file.get_recent",
        "file.open",
        "file.get_context",
        "file.bind_context",
        "retry_original_tool",
    ]);
    assert.equal(body.error.data.handoff, null);
    assert.deepEqual(body.error.data.nextActions, body.error.actions);
    assert.equal(body.error.data.retryTool, "export_shape");
});

test("requireBoundFileContext allows execution when a context is bound", () => {
    const registry = new FileContextRegistry();
    const snapshot = context();
    registry.upsertContext("token-1", snapshot);
    registry.bindContext("token-1", snapshot.contextId);

    const response = requireBoundFileContext(mcpServerWithRegistry(registry), "token-1", "export_shape");
    assert.equal(response, null);
});

test("requireBoundFileContext blocks file tools again after release", () => {
    const registry = new FileContextRegistry();
    const snapshot = context();
    registry.upsertContext("token-1", snapshot);
    registry.bindContext("token-1", snapshot.contextId);
    registry.releaseContext("token-1");

    const response = requireBoundFileContext(mcpServerWithRegistry(registry), "token-1", "export_shape");
    assert.ok(response);
    const body = parseJsonResponse(response);
    assert.equal(body.error.code, FileContextErrorCodes.FILE_CONTEXT_REQUIRED);
});

test("requireBoundFileContext includes file open handoff when an available context can identify the target", () => {
    const registry = new FileContextRegistry();
    registry.upsertContext("token-1", context());

    const response = requireBoundFileContext(mcpServerWithRegistry(registry), "token-1", "shape.create_rect");
    assert.ok(response);
    const body = parseJsonResponse(response);

    assert.deepEqual(body.error.actions, ["file.open", "file.get_context", "file.bind_context", "retry_original_tool"]);
    assert.equal(body.error.data.handoff.status, "context_required");
    assert.equal(
        body.error.data.handoff.workspaceUrl,
        "http://localhost:3449/#/workspace?file-id=00000000-0000-0000-0000-000000000001&team-id=team-1&page-id=00000000-0000-0000-0000-000000000002"
    );
    assert.deepEqual(body.error.data.handoff.nextActions, [
        "open_workspace_url",
        "file.get_context",
        "file.bind_context",
        "retry_original_tool",
    ]);
    assert.deepEqual(body.error.data.handoff.target, {
        fileId: "00000000-0000-0000-0000-000000000001",
        teamId: "team-1",
        pageId: "00000000-0000-0000-0000-000000000002",
    });
    assert.equal(body.error.data.retryTool, "shape.create_rect");
    assert.deepEqual(body.error.data.target, body.error.data.handoff.target);
    assert.equal(body.error.data.liveOnly.adapter, "plugin-live");
    assert.equal(body.error.data.liveOnly.state, "editor-local");
});

test("requireBoundFileContext accepts explicit target guidance for live-only tools", () => {
    const registry = new FileContextRegistry();

    const response = requireBoundFileContext(mcpServerWithRegistry(registry), "token-1", "prototype.create_flow", {
        publicUri: "https://penpot.example/",
        target: {
            fileId: "00000000-0000-0000-0000-000000000003",
            pageId: "00000000-0000-0000-0000-000000000004",
        },
    });
    assert.ok(response);
    const body = parseJsonResponse(response);

    assert.deepEqual(body.error.actions, ["file.open", "file.get_context", "file.bind_context", "retry_original_tool"]);
    assert.equal(
        body.error.data.handoff.workspaceUrl,
        "https://penpot.example/#/workspace?file-id=00000000-0000-0000-0000-000000000003&page-id=00000000-0000-0000-0000-000000000004"
    );
    assert.deepEqual(body.error.data.handoff.target, {
        fileId: "00000000-0000-0000-0000-000000000003",
        pageId: "00000000-0000-0000-0000-000000000004",
    });
});

test("requireBoundFileContext merges partial live target guidance with an available context", () => {
    const registry = new FileContextRegistry();
    registry.upsertContext("token-1", context());

    const response = requireBoundFileContext(mcpServerWithRegistry(registry), "token-1", "page.set_current", {
        publicUri: "https://penpot.example/",
        target: {
            pageId: "00000000-0000-0000-0000-000000000004",
        },
    });
    assert.ok(response);
    const body = parseJsonResponse(response);

    assert.equal(
        body.error.data.handoff.workspaceUrl,
        "https://penpot.example/#/workspace?file-id=00000000-0000-0000-0000-000000000001&team-id=team-1&page-id=00000000-0000-0000-0000-000000000004"
    );
    assert.deepEqual(body.error.data.target, {
        fileId: "00000000-0000-0000-0000-000000000001",
        teamId: "team-1",
        pageId: "00000000-0000-0000-0000-000000000004",
    });
    assert.deepEqual(body.error.data.liveOnly.recovery, [
        "open_workspace_url",
        "file.get_context",
        "file.bind_context",
        "retry_original_tool",
    ]);
});

test("requireBoundFileContext blocks file tools after plugin disconnect marks context stale", () => {
    const registry = new FileContextRegistry();
    const snapshot = context();
    registry.upsertContext("token-1", snapshot);
    registry.bindContext("token-1", snapshot.contextId);
    registry.clearSession("token-1", "plugin WebSocket disconnected");

    const response = requireBoundFileContext(mcpServerWithRegistry(registry), "token-1", "export_shape");
    assert.ok(response);
    const body = parseJsonResponse(response);
    assert.equal(body.error.code, FileContextErrorCodes.FILE_CONTEXT_REQUIRED);
});
