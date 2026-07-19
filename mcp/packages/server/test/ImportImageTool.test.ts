import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { FileContextErrorCodes, FileContextRegistry } from "../src/FileContextRegistry.js";
import type { PenpotMcpServer } from "../src/PenpotMcpServer.js";
import { ImportImageTool } from "../src/tools/ImportImageTool.js";
import type { FileContextSnapshot } from "@penpot/mcp-common";

function parseTextResponse(response: Awaited<ReturnType<ImportImageTool["execute"]>>) {
    const text = response.content[0];
    if (text.type !== "text") {
        throw new Error("Expected text response");
    }
    return text.text;
}

function parseJsonResponse(response: Awaited<ReturnType<ImportImageTool["execute"]>>) {
    return JSON.parse(parseTextResponse(response));
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

function mcpServerWithImport(
    registry: FileContextRegistry,
    executePluginTask: (task: any) => Promise<any>,
    userToken: string | null = "token-1"
): PenpotMcpServer {
    return {
        fileContextRegistry: registry,
        getSessionContext: () => (userToken ? { userToken, mcpSessionId: "session-1" } : undefined),
        pluginBridge: {
            executePluginTask,
        },
    } as unknown as PenpotMcpServer;
}

function bindRegistry(registry: FileContextRegistry, userToken = "token-1") {
    const snapshot = context();
    registry.upsertContext(userToken, snapshot);
    registry.bindContext(userToken, snapshot.contextId);
}

test("ImportImageTool requires a bound file context", async () => {
    let taskCalled = false;
    const tool = new ImportImageTool(
        mcpServerWithImport(new FileContextRegistry(), async () => {
            taskCalled = true;
            throw new Error("should not execute plugin task without file context");
        })
    );

    assert.equal(tool.getToolName(), "import_image");
    const body = parseJsonResponse(
        await tool.execute({
            filePath: "/tmp/example.png",
        })
    );

    assert.equal(taskCalled, false);
    assert.equal(body.status, "error");
    assert.equal(body.error.code, FileContextErrorCodes.FILE_CONTEXT_REQUIRED);
    assert.equal(body.error.data.retryTool, "import_image");
});

test("ImportImageTool rejects relative file paths", async () => {
    const registry = new FileContextRegistry();
    bindRegistry(registry);
    const tool = new ImportImageTool(
        mcpServerWithImport(registry, async () => {
            throw new Error("should not execute plugin task for relative paths");
        })
    );

    const text = parseTextResponse(
        await tool.execute({
            filePath: "relative/image.png",
        })
    );
    assert.match(text, /Tool execution failed/);
    assert.match(text, /must be absolute/);
});

test("ImportImageTool rejects missing files", async () => {
    const registry = new FileContextRegistry();
    bindRegistry(registry);
    const tool = new ImportImageTool(
        mcpServerWithImport(registry, async () => {
            throw new Error("should not execute plugin task for missing files");
        })
    );

    const missingPath = join(tmpdir(), `penpot-import-image-missing-${Date.now()}.png`);
    const text = parseTextResponse(
        await tool.execute({
            filePath: missingPath,
        })
    );
    assert.match(text, /Tool execution failed/);
    assert.match(text, /File not found/);
});

test("ImportImageTool rejects unsupported image formats", async () => {
    const registry = new FileContextRegistry();
    bindRegistry(registry);
    const dir = mkdtempSync(join(tmpdir(), "penpot-import-image-"));
    const filePath = join(dir, "notes.txt");
    writeFileSync(filePath, "not-an-image");

    try {
        const tool = new ImportImageTool(
            mcpServerWithImport(registry, async () => {
                throw new Error("should not execute plugin task for unsupported formats");
            })
        );
        const text = parseTextResponse(
            await tool.execute({
                filePath,
            })
        );
        assert.match(text, /Tool execution failed/);
        assert.match(text, /Unsupported image format/);
        assert.match(text, /\.png/);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("ImportImageTool imports a local image through plugin executeCode", async () => {
    const registry = new FileContextRegistry();
    bindRegistry(registry);
    const dir = mkdtempSync(join(tmpdir(), "penpot-import-image-"));
    const filePath = join(dir, "pixel.png");
    const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    writeFileSync(filePath, bytes);

    let request: { task?: string; params?: { code?: string } } | undefined;
    try {
        const tool = new ImportImageTool(
            mcpServerWithImport(registry, async (task) => {
                request = task.toRequest();
                return { data: { result: { shapeId: "shape-imported-1" } } };
            })
        );

        const text = parseTextResponse(
            await tool.execute({
                filePath,
                x: 10,
                y: 20,
                width: 100,
            })
        );

        assert.deepEqual(JSON.parse(text), { shapeId: "shape-imported-1" });
        assert.ok(request);
        assert.equal(request.task, "executeCode");
        assert.match(String(request.params?.code), /penpotUtils\.importImage/);
        assert.match(String(request.params?.code), /image\/png/);
        assert.match(String(request.params?.code), /pixel\.png/);
        assert.ok(String(request.params?.code).includes(bytes.toString("base64")));
        assert.match(String(request.params?.code), /10, 20,\s*100, undefined/);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});
