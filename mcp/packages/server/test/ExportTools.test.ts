import assert from "node:assert/strict";
import test from "node:test";
import { CommandDescriptors, CommandErrorCodes } from "@penpot/command-runtime";
import { FileContextRegistry } from "../src/FileContextRegistry.js";
import type { PenpotRpcRequestContext, PenpotSseEvent } from "../src/PenpotRpcClient.js";
import { PenpotMcpServer } from "../src/PenpotMcpServer.js";
import { ExportFileTool, RenderPreviewTool, RenderThumbnailTool } from "../src/tools/ExportTools.js";

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

type SseCall = {
    methodName: string;
    params: Record<string, unknown>;
    userToken: string;
    context?: PenpotRpcRequestContext;
};

function mcpServerWithSse(
    postSse: (...args: any[]) => Promise<PenpotSseEvent[]>,
    userToken: string | undefined = "token-1"
): PenpotMcpServer {
    return {
        rpcClient: {
            getBaseUri: () => "http://127.0.0.1:6060",
            getMethodUrl: (methodName: string) => `http://127.0.0.1:6060/api/main/methods/${methodName}?_fmt=json`,
            postSse,
        },
        getSessionContext: () => ({ userToken, mcpSessionId: "session-1" }),
    } as unknown as PenpotMcpServer;
}

test("ExportFileTool executes backend export-binfile SSE and returns resource metadata", async () => {
    const calls: SseCall[] = [];
    const tool = new ExportFileTool(
        mcpServerWithSse(
            async (
                methodName: string,
                params: Record<string, unknown>,
                userToken: string,
                context?: PenpotRpcRequestContext
            ) => {
                calls.push({ methodName, params, userToken, context });
                return [
                    { type: "progress", data: { step: "queued" } },
                    {
                        type: "end",
                        data: {
                            "resource-uri": "/assets/by-id/resource-1",
                            filename: "Design.penpot",
                            mtype: "application/zip",
                        },
                    },
                ];
            }
        )
    );

    const response = await tool.execute({
        fileId: UUIDS.file,
        libraryMode: "merge",
    });
    const body = parseJsonResponse(response);

    assert.deepEqual(calls, [
        {
            methodName: "export-binfile",
            params: {
                "file-id": UUIDS.file,
                "include-libraries": false,
                "embed-assets": true,
            },
            userToken: "token-1",
            context: {
                mcpToolName: "export.file",
                mcpAdapter: "backend-rpc",
                mcpSessionId: "session-1",
                mcpFileId: UUIDS.file,
            },
        },
    ]);
    assert.equal(body.status, "ok");
    assert.equal(body.data.command, CommandDescriptors.EXPORT_FILE.id);
    assert.equal(body.data.adapter, "backend-rpc");
    assert.equal(body.data.adapterSelection.selected, "backend-rpc");
    assert.equal(body.data.artifact.libraryMode, "merge");
    assert.equal(body.data.artifact.includeLibraries, false);
    assert.equal(body.data.artifact.embedAssets, true);
    assert.equal(body.data.backendRpc.command, "export-binfile");
    assert.equal(body.data.backendRpc.responseContentType, "text/event-stream");
    assert.equal(body.data.resource.uri, "/assets/by-id/resource-1");
    assert.equal(body.data.resource["resource-uri"], "/assets/by-id/resource-1");
    assert.equal(body.data.resourceUri, "/assets/by-id/resource-1");
    assert.equal(body.data.downloadUri, "http://127.0.0.1:6060/assets/by-id/resource-1");
    assert.deepEqual(body.data.stream.eventTypes, ["progress", "end"]);
});

test("ExportFileTool normalizes string end events into resource metadata", async () => {
    const tool = new ExportFileTool(
        mcpServerWithSse(async () => [
            { type: "end", data: "http://127.0.0.1:6060/assets/by-id/resource-2" },
        ])
    );

    const response = await tool.execute({ fileId: UUIDS.file });
    const body = parseJsonResponse(response);

    assert.equal(body.status, "ok");
    assert.equal(body.data.artifact.libraryMode, "all");
    assert.equal(body.data.resource.uri, "http://127.0.0.1:6060/assets/by-id/resource-2");
    assert.equal(body.data.resource["resource-uri"], "http://127.0.0.1:6060/assets/by-id/resource-2");
});

test("ExportFileTool requires an authenticated MCP session token", async () => {
    const tool = new ExportFileTool(
        mcpServerWithSse(async () => {
            throw new Error("export.file without token should not call backend");
        }, "")
    );

    const response = await tool.execute({ fileId: UUIDS.file });
    const body = parseJsonResponse(response);

    assert.equal(body.status, "error");
    assert.equal(body.error.code, CommandErrorCodes.AUTHENTICATION_REQUIRED);
});

test("ExportFileTool rejects missing target and unsupported adapters before calling backend", async () => {
    let called = false;
    const tool = new ExportFileTool(
        mcpServerWithSse(async () => {
            called = true;
            return [];
        })
    );

    const missingTarget = parseJsonResponse(await tool.execute({}));
    const unsupportedAdapter = parseJsonResponse(await tool.execute({ fileId: UUIDS.file, adapter: "exporter" }));

    assert.equal(called, false);
    assert.equal(missingTarget.status, "error");
    assert.equal(missingTarget.error.code, "export_file_target_required");
    assert.equal(unsupportedAdapter.status, "error");
    assert.equal(unsupportedAdapter.error.code, "adapter_not_available");
    assert.equal(unsupportedAdapter.error.data.adapterSelection.command, "export.file");
    assert.equal(unsupportedAdapter.error.data.adapterSelection.requested, "exporter");
});

test("ExportFileTool reports incomplete streams and missing resource URIs", async () => {
    const incompleteTool = new ExportFileTool(mcpServerWithSse(async () => [{ type: "progress", data: {} }]));
    const missingResourceTool = new ExportFileTool(mcpServerWithSse(async () => [{ type: "end", data: { filename: "x" } }]));

    const incomplete = parseJsonResponse(await incompleteTool.execute({ fileId: UUIDS.file }));
    const missingResource = parseJsonResponse(await missingResourceTool.execute({ fileId: UUIDS.file }));

    assert.equal(incomplete.status, "error");
    assert.equal(incomplete.error.code, "export_file_stream_incomplete");
    assert.deepEqual(incomplete.error.data.events, ["progress"]);
    assert.equal(missingResource.status, "error");
    assert.equal(missingResource.error.code, "export_file_resource_uri_missing");
});

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

test("RenderThumbnailTool dry-run returns renderer-service request metadata without network calls", async () => {
    const originalFetch = globalThis.fetch;
    let fetchCalled = false;
    let sseCalled = false;
    globalThis.fetch = async () => {
        fetchCalled = true;
        throw new Error("render.thumbnail dry-run must not call fetch");
    };

    try {
        const tool = new RenderThumbnailTool(
            mcpServerWithSse(async () => {
                sseCalled = true;
                throw new Error("render.thumbnail dry-run must not call backend SSE");
            })
        );

        const response = await tool.execute({
            fileId: UUIDS.file,
            target: "frame",
            pageId: UUIDS.page,
            objectId: UUIDS.object,
            tag: "cover",
            width: 320,
            cachePolicy: "refresh",
            endpoint: "http://127.0.0.1:6070/thumbnail",
            probeTimeoutMs: 3500,
        });
        const body = parseJsonResponse(response);

        assert.equal(fetchCalled, false);
        assert.equal(sseCalled, false);
        assert.equal(body.status, "ok");
        assert.equal(body.data.command, CommandDescriptors.RENDER_THUMBNAIL.id);
        assert.equal(body.data.status, "planned");
        assert.equal(body.data.executable, false);
        assert.equal(body.data.runtimeAvailable, false);
        assert.equal(body.data.adapter, "renderer-service");
        assert.equal(body.data.adapterSelection.selected, "renderer-service");
        assert.equal(body.data.endpoint, "http://127.0.0.1:6070/thumbnail");
        assert.equal(body.data.service.operation, "thumbnail.render");
        assert.equal(body.data.service.localFileWrites, false);
        assert.equal(body.data.client.healthEndpoint, "http://127.0.0.1:6070/thumbnail/health");
        assert.equal(body.data.client.probeTimeoutMs, 3500);
        assert.equal(body.data.client.networkProbe, false);
        assert.equal(body.data.availability.status, "configured-unverified");
        assert.equal(body.data.availability.probe, "metadata-only");
        assert.equal(body.data.availability.checked, false);
        assert.deepEqual(body.data.service.client, body.data.client);
        assert.equal(body.data.service.responseNormalization.successStatus, "ok");
        assert.equal(body.data.service.responseNormalization.localFileWrites, false);
        assert.equal(body.data.service.errorShape.code, "renderer_service_error");
        assert.equal(body.data.serviceRequest.operation, "thumbnail.render");
        assert.equal(body.data.serviceRequest.target.objectKey, `${UUIDS.file}/${UUIDS.page}/${UUIDS.object}/cover`);
        assert.equal(body.data.serviceRequest.artifact.width, 320);
        assert.equal(body.data.serviceRequest.backendRpc.data.command, "get-file-frame-data-for-thumbnail");
        assert.equal(body.data.serviceRequest.backendRpc.persist.command, "create-file-object-thumbnail");
        assert.deepEqual(body.data.requires, []);
        assert.equal(body.data.diagnostics.mcpToolRegistered, true);
        assert.equal(body.data.diagnostics.runtimeExecutionRegistered, false);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("RenderThumbnailTool execution reports renderer service unavailable without network calls", async () => {
    const originalFetch = globalThis.fetch;
    let fetchCalled = false;
    let sseCalled = false;
    globalThis.fetch = async () => {
        fetchCalled = true;
        throw new Error("render.thumbnail unavailable path must not call fetch");
    };

    try {
        const tool = new RenderThumbnailTool(
            mcpServerWithSse(async () => {
                sseCalled = true;
                throw new Error("render.thumbnail unavailable path must not call backend SSE");
            })
        );

        const response = await tool.execute({
            fileId: UUIDS.file,
            dryRun: false,
        });
        const body = parseJsonResponse(response);

        assert.equal(fetchCalled, false);
        assert.equal(sseCalled, false);
        assert.equal(body.status, "error");
        assert.equal(body.error.code, "renderer_service_unavailable");
        assert.equal(body.error.data.command, CommandDescriptors.RENDER_THUMBNAIL.id);
        assert.equal(body.error.data.adapter, "renderer-service");
        assert.equal(body.error.data.client.configured, false);
        assert.equal(body.error.data.availability.status, "not-configured");
        assert.equal(body.error.data.availability.networkProbe, false);
        assert.equal(body.error.data.serviceRequest.operation, "thumbnail.render");
        assert.deepEqual(body.error.data.requiredCapabilities, ["thumbnail-renderer-service-implementation", "file-thumbnail-cache-probe"]);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("RenderThumbnailTool rejects unavailable adapters and incomplete frame targets", async () => {
    let sseCalled = false;
    const tool = new RenderThumbnailTool(
        mcpServerWithSse(async () => {
            sseCalled = true;
            return [];
        })
    );

    const unsupportedAdapter = parseJsonResponse(
        await tool.execute({
            fileId: UUIDS.file,
            adapter: "exporter",
        })
    );
    const missingObject = parseJsonResponse(
        await tool.execute({
            fileId: UUIDS.file,
            target: "frame",
            pageId: UUIDS.page,
        })
    );

    assert.equal(sseCalled, false);
    assert.equal(unsupportedAdapter.status, "error");
    assert.equal(unsupportedAdapter.error.code, "adapter_not_available");
    assert.equal(unsupportedAdapter.error.data.adapterSelection.command, "render.thumbnail");
    assert.equal(unsupportedAdapter.error.data.adapterSelection.requested, "exporter");
    assert.equal(missingObject.status, "error");
    assert.equal(missingObject.error.code, "object_id_required");
    assert.deepEqual(missingObject.error.data.requires, ["objectId"]);
});
