import assert from "node:assert/strict";
import test from "node:test";
import { CommandDescriptors } from "@penpot/command-runtime";
import { FileContextRegistry } from "../src/FileContextRegistry.js";
import { PenpotMcpServer } from "../src/PenpotMcpServer.js";
import { RenderPreviewTool } from "../src/tools/ExportTools.js";

const UUIDS = {
    file: "00000000-0000-0000-0000-000000000001",
    page: "00000000-0000-0000-0000-000000000002",
    object: "00000000-0000-0000-0000-000000000003",
    profile: "00000000-0000-0000-0000-000000000004",
};

function parseJsonResponse(response: Awaited<ReturnType<RenderPreviewTool["execute"]>>) {
    const text = response.content[0];
    assert.equal(text.type, "text");
    return JSON.parse(text.text);
}

test("RenderPreviewTool uses exporter for explicit file/page/object targets", async () => {
    const originalFetch = globalThis.fetch;
    const originalExporterUri = process.env.PENPOT_EXPORTER_URI;
    const calls: Array<{ url: string; options: RequestInit }> = [];

    process.env.PENPOT_EXPORTER_URI = "http://127.0.0.1:6061";
    globalThis.fetch = async (url, options = {}) => {
        calls.push({ url: String(url), options });
        return {
            ok: true,
            status: 200,
            statusText: "OK",
            headers: {
                get: (name: string) => (name.toLowerCase() === "content-type" ? "application/json" : null),
            },
            text: async () =>
                JSON.stringify({
                    id: "resource-1",
                    uri: "http://127.0.0.1:6061/resource/1",
                    mtype: "image/png",
                    filename: "preview.png",
                }),
        } as Response;
    };

    try {
        const tool = new RenderPreviewTool({
            getSessionContext: () => ({ userToken: "token-1", mcpSessionId: "session-1" }),
        } as unknown as PenpotMcpServer);
        const response = await tool.execute({
            fileId: UUIDS.file,
            pageId: UUIDS.page,
            objectId: UUIDS.object,
            profileId: UUIDS.profile,
            scale: 2,
        });
        const body = parseJsonResponse(response);

        assert.equal(calls.length, 1);
        assert.equal(calls[0].url, "http://127.0.0.1:6061");
        assert.equal(calls[0].options.method, "POST");
        assert.equal((calls[0].options.headers as Record<string, string>).cookie, "auth-token=token-1");
        assert.match(String(calls[0].options.body), /~:export-shapes/);
        assert.match(String(calls[0].options.body), /~:type/);
        assert.equal(body.status, "ok");
        assert.equal(body.data.command, CommandDescriptors.RENDER_PREVIEW.id);
        assert.equal(body.data.adapter, "exporter");
        assert.equal(body.data.adapterSelection.selected, "exporter");
        assert.equal(body.data.artifact.kind, "preview");
        assert.equal(body.data.artifact.mimeType, "image/png");
        assert.equal(body.data.artifact.target.objectId, UUIDS.object);
        assert.equal(body.data.resource.uri, "http://127.0.0.1:6061/resource/1");
    } finally {
        globalThis.fetch = originalFetch;
        if (originalExporterUri === undefined) {
            delete process.env.PENPOT_EXPORTER_URI;
        } else {
            process.env.PENPOT_EXPORTER_URI = originalExporterUri;
        }
    }
});

test("RenderPreviewTool preserves plugin-live preview for bound workspace context", async () => {
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
        capabilities: [],
        updatedAt: new Date(0).toISOString(),
    });
    registry.bindContext("token-1", "ctx-1");

    const requests: unknown[] = [];
    const tool = new RenderPreviewTool({
        fileContextRegistry: registry,
        getSessionContext: () => ({ userToken: "token-1" }),
        pluginBridge: {
            executePluginTask: async (task: { toRequest: () => unknown }) => {
                requests.push(task.toRequest());
                return {
                    data: {
                        export: {
                            targetType: "selection",
                            format: "png",
                            mimeType: "image/png",
                            byteLength: 4,
                            dataBase64: "iVBORw==",
                        },
                    },
                };
            },
        },
    } as unknown as PenpotMcpServer);

    const response = await tool.execute({ target: "selection", scale: 1 });
    const body = parseJsonResponse(response);

    assert.equal(requests.length, 1);
    assert.equal((requests[0] as { task: string }).task, "export");
    assert.deepEqual((requests[0] as { params: unknown }).params, {
        action: "renderPreview",
        target: "selection",
        shapeId: undefined,
        pageId: undefined,
        format: "png",
        scale: 1,
    });
    assert.equal(body.status, "ok");
    assert.equal(body.data.adapter, "plugin-live");
    assert.equal(body.data.adapterSelection.command, "render.preview");
    assert.equal(body.data.export.dataBase64, "iVBORw==");
});

test("RenderPreviewTool rejects partial explicit exporter targets", async () => {
    const tool = new RenderPreviewTool({} as unknown as PenpotMcpServer);
    const response = await tool.execute({
        fileId: UUIDS.file,
        pageId: UUIDS.page,
    });
    const body = parseJsonResponse(response);

    assert.equal(body.status, "error");
    assert.equal(body.error.code, "adapter_not_available");
    assert.equal(body.error.data.adapterSelection.command, "render.preview");
    assert.equal(body.error.data.adapterSelection.selected, null);
});
