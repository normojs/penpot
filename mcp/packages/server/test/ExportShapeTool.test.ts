import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { FileContextErrorCodes, FileContextRegistry } from "../src/FileContextRegistry.js";
import type { PenpotMcpServer } from "../src/PenpotMcpServer.js";
import { ExportShapeTool } from "../src/tools/ExportShapeTool.js";
import type { FileContextSnapshot } from "@penpot/mcp-common";

// Minimal valid 1x1 PNG.
const MINI_PNG = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64"
);

function parseTextResponse(response: Awaited<ReturnType<ExportShapeTool["execute"]>>) {
    const text = response.content[0];
    if (text.type !== "text") {
        throw new Error(`Expected text response, got ${text.type}`);
    }
    return text.text;
}

function parseJsonResponse(response: Awaited<ReturnType<ExportShapeTool["execute"]>>) {
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

function mcpServerWithExport(
    registry: FileContextRegistry,
    options: {
        executePluginTask?: (task: any) => Promise<any>;
        fileSystemAccessEnabled?: boolean;
        userToken?: string | null;
    } = {}
): PenpotMcpServer {
    const userToken = options.userToken === undefined ? "token-1" : options.userToken;
    return {
        fileContextRegistry: registry,
        isFileSystemAccessEnabled: () => options.fileSystemAccessEnabled ?? false,
        getSessionContext: () => (userToken ? { userToken, mcpSessionId: "session-1" } : undefined),
        pluginBridge: {
            executePluginTask:
                options.executePluginTask ??
                (async () => {
                    throw new Error("executePluginTask not stubbed");
                }),
        },
    } as unknown as PenpotMcpServer;
}

function bindRegistry(registry: FileContextRegistry, userToken = "token-1") {
    const snapshot = context();
    registry.upsertContext(userToken, snapshot);
    registry.bindContext(userToken, snapshot.contextId);
}

test("ExportShapeTool omits filePath schema when file-system access is disabled", () => {
    const registry = new FileContextRegistry();
    const disabled = new ExportShapeTool(mcpServerWithExport(registry, { fileSystemAccessEnabled: false }));
    const enabled = new ExportShapeTool(mcpServerWithExport(registry, { fileSystemAccessEnabled: true }));

    assert.equal(disabled.getToolName(), "export_shape");
    assert.equal("filePath" in disabled.getInputSchema(), false);
    assert.ok("filePath" in enabled.getInputSchema());
    assert.match(enabled.getToolDescription(), /save it to a file/i);
    assert.ok(!/save it to a file/i.test(disabled.getToolDescription()));
});

test("ExportShapeTool requires a bound file context", async () => {
    let taskCalled = false;
    const tool = new ExportShapeTool(
        mcpServerWithExport(new FileContextRegistry(), {
            executePluginTask: async () => {
                taskCalled = true;
                throw new Error("should not execute without file context");
            },
        })
    );

    const body = parseJsonResponse(
        await tool.execute({
            shapeId: "shape-1",
            format: "png",
            mode: "shape",
        })
    );

    assert.equal(taskCalled, false);
    assert.equal(body.status, "error");
    assert.equal(body.error.code, FileContextErrorCodes.FILE_CONTEXT_REQUIRED);
    assert.equal(body.error.data.retryTool, "export_shape");
});

test("ExportShapeTool rejects relative export file paths", async () => {
    const registry = new FileContextRegistry();
    bindRegistry(registry);
    const tool = new ExportShapeTool(
        mcpServerWithExport(registry, {
            fileSystemAccessEnabled: true,
            executePluginTask: async () => {
                throw new Error("should not execute for relative paths");
            },
        })
    );

    const text = parseTextResponse(
        await tool.execute({
            shapeId: "shape-1",
            format: "png",
            mode: "shape",
            filePath: "relative/out.png",
        })
    );
    assert.match(text, /Tool execution failed/);
    assert.match(text, /must be absolute/);
});

test("ExportShapeTool exports selection/page/shape ids through plugin executeCode", async () => {
    const registry = new FileContextRegistry();
    bindRegistry(registry);
    const codes: string[] = [];

    const tool = new ExportShapeTool(
        mcpServerWithExport(registry, {
            executePluginTask: async (task) => {
                const request = task.toRequest();
                codes.push(String(request.params.code));
                return { data: { result: new Uint8Array(MINI_PNG) } };
            },
        })
    );

    const selection = await tool.execute({ shapeId: "selection", format: "png", mode: "shape" });
    assert.equal(selection.content[0].type, "image");
    assert.equal((selection.content[0] as { mimeType?: string }).mimeType, "image/png");

    const page = await tool.execute({ shapeId: "page", format: "png", mode: "fill" });
    assert.equal(page.content[0].type, "image");

    const shape = await tool.execute({ shapeId: "shape-123", format: "svg", mode: "shape" });
    assert.equal(shape.content[0].type, "text");

    assert.match(codes[0], /penpot\.selection\[0\]/);
    assert.match(codes[0], /exportImage\(.+, "shape", false\)/);
    assert.match(codes[1], /penpot\.root/);
    assert.match(codes[1], /exportImage\(.+, "fill", false\)/);
    assert.match(codes[2], /findShapeById\("shape-123"\)/);
    assert.match(codes[2], /exportImage\(.+, "shape", true\)/);
});

test("ExportShapeTool writes PNG output when file-system access is enabled", async () => {
    const registry = new FileContextRegistry();
    bindRegistry(registry);
    const dir = mkdtempSync(join(tmpdir(), "penpot-export-shape-"));
    const filePath = join(dir, "out.png");

    try {
        const tool = new ExportShapeTool(
            mcpServerWithExport(registry, {
                fileSystemAccessEnabled: true,
                executePluginTask: async () => ({ data: { result: new Uint8Array(MINI_PNG) } }),
            })
        );

        const text = parseTextResponse(
            await tool.execute({
                shapeId: "shape-1",
                format: "png",
                mode: "shape",
                filePath,
            })
        );
        assert.match(text, new RegExp(`exported to ${filePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
        assert.deepEqual(readFileSync(filePath), MINI_PNG);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});
