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
    assert.deepEqual(body.error.actions.slice(0, 2), ["file.get_context", "file.bind_context"]);
});

test("requireBoundFileContext allows execution when a context is bound", () => {
    const registry = new FileContextRegistry();
    const snapshot = context();
    registry.upsertContext("token-1", snapshot);
    registry.bindContext("token-1", snapshot.contextId);

    const response = requireBoundFileContext(mcpServerWithRegistry(registry), "token-1", "export_shape");
    assert.equal(response, null);
});
