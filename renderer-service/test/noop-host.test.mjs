import assert from "node:assert/strict";
import test from "node:test";
import { pathToFileURL } from "node:url";

const buildPath = "/Volumes/fushilu/.caches/penpot/renderer-service/index.js";
const serviceModule = await import(`${pathToFileURL(buildPath).href}?test=${Date.now()}`);

async function withService(run) {
    const service = await serviceModule.startRendererService({ port: 0 });
    try {
        await run(service);
    } finally {
        await service.stop();
    }
}

function fileBackendRpc(policy = "reuse") {
    const persist = {
        command: "create-file-thumbnail",
        method: "POST",
        request: { "file-id": "file-1", revn: 1, media: "<rendered png blob>" },
    };

    return {
        data: {
            command: "get-file-data-for-thumbnail",
            method: "GET",
            request: { "file-id": "file-1", "strip-frames-with-thumbnails": false },
        },
        persist: policy === "refresh" ? persist : null,
        cacheMissPersist: policy === "reuse" ? persist : null,
    };
}

function frameBackendRpc(policy = "refresh") {
    const persist = {
        command: "create-file-object-thumbnail",
        method: "POST",
        request: { "file-id": "file-1", "object-id": "file-1/page-1/frame-1/component", tag: "component", media: "<rendered png blob>" },
    };

    return {
        data: {
            command: "get-file-frame-data-for-thumbnail",
            status: "required-future-capability",
            request: { "file-id": "file-1", "page-id": "page-1", "object-id": "frame-1" },
        },
        persist: policy === "refresh" ? persist : null,
        cacheMissPersist: policy === "reuse" ? persist : null,
    };
}

function requestEnvelope(method, requestKeys, queryKeys = [], bodyKeys = []) {
    return {
        status: "planned-disabled",
        transport: "penpot-rpc-json",
        method,
        requestKeys,
        queryKeys,
        bodyKeys,
        requestValuesIncluded: false,
        mediaValuesIncluded: false,
        tokenValuesIncluded: false,
        dispatch: false,
    };
}

function pipelineStage(name, condition, { entry = null, command = null, cacheProbe = null, runtime = null, status = "planned-disabled", dispatch = false } = {}) {
    return {
        name,
        status,
        condition,
        entry,
        command,
        cacheProbe,
        runtime,
        dispatch,
    };
}

function backendRpcPipeline(cachePolicy, orderedStages, { status = "planned-disabled", networkDispatch = false, cacheRead = false, dataRead = false } = {}) {
    return {
        status,
        cachePolicy,
        cacheHitShortCircuit: cachePolicy === "reuse",
        orderedStages,
        networkDispatch,
        cacheRead,
        dataRead,
        renderDispatch: false,
        persistWrite: false,
        sourceDataValuesIncluded: false,
        artifactValuesIncluded: false,
        tokenValuesIncluded: false,
    };
}

function backendRpcCacheProbe(strategy, scope, key, requestKeys, { status = "planned-disabled", command = null, endpoint = null, result = null, cacheRead = false, networkDispatch = false, dispatch = false } = {}) {
    return {
        status,
        strategy,
        condition: "before-source-data-read",
        scope,
        key,
        requestKeys,
        command,
        endpoint,
        hitResult: "resource-metadata",
        missResult: "continue-pipeline",
        result,
        cacheRead,
        networkDispatch,
        dispatch,
        cacheHitValuesIncluded: false,
        resourceValuesIncluded: false,
        mediaValuesIncluded: false,
        tokenValuesIncluded: false,
    };
}

function backendRpcRenderInput(cachePolicy = "reuse") {
    return {
        status: "source-data-ready",
        condition: "after-source-data-read",
        sourceDataRead: true,
        sourceDataEndpoint: "https://penpot.example.test/api/main/methods/get-file-data-for-thumbnail?_fmt=json",
        targetKind: "file",
        identityKeys: ["file-id", "revn"],
        revisionSource: "backend-source-data",
        requestRevision: "matched",
        revisionValueIncluded: false,
        cachePolicy,
        cacheScope: "file-thumbnail",
        cacheKey: "file:file-1:revn:1",
        artifactFormat: "png",
        artifactMimeType: "image/png",
        artifactWidth: 252,
        artifactHeight: 168,
        renderRuntime: "render-wasm-worker",
        renderFallback: "frontend-rasterizer",
        renderDispatch: false,
        sourceDataValuesIncluded: false,
        pageValuesIncluded: false,
        artifactValuesIncluded: false,
        mediaValuesIncluded: false,
        tokenValuesIncluded: false,
    };
}

test("noop host exposes the P25.24 health contract", async () => {
    await withService(async ({ host, port }) => {
        const response = await fetch(`http://${host}:${port}/health`);

        assert.equal(response.status, 200);
        assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8");
        assert.deepEqual(await response.json(), serviceModule.healthResponse);
    });
});

test("noop host reads backend RPC planning base URI from environment", async () => {
    assert.deepEqual(serviceModule.readRendererServiceOptionsFromEnv({}), {
        host: "127.0.0.1",
        port: 6070,
    });

    assert.deepEqual(
        serviceModule.readRendererServiceOptionsFromEnv({
            PENPOT_RENDERER_SERVICE_HOST: "127.0.0.1",
            PENPOT_RENDERER_SERVICE_PORT: "6074",
            PENPOT_RENDERER_SERVICE_BACKEND_URI: "https://penpot.example.test/",
        }),
        {
            host: "127.0.0.1",
            port: 6074,
            backendRpc: {
                baseUri: "https://penpot.example.test",
            },
        }
    );

    assert.deepEqual(
        serviceModule.readRendererServiceOptionsFromEnv({
            PENPOT_RENDERER_SERVICE_BACKEND_URI: "",
            PENPOT_BACKEND_URI: "http://127.0.0.1:6060/",
        }).backendRpc,
        {
            baseUri: "http://127.0.0.1:6060",
        }
    );

    assert.throws(
        () => serviceModule.readRendererServiceOptionsFromEnv({ PENPOT_RENDERER_SERVICE_BACKEND_URI: "file:///tmp/backend" }),
        /backend RPC baseUri must be an absolute HTTP\(S\) URL/
    );
});

test("noop host executes configured file thumbnail cache probe and returns cache hits", async () => {
    const fetchCalls = [];
    const options = serviceModule.readRendererServiceOptionsFromEnv({
        PENPOT_RENDERER_SERVICE_BACKEND_URI: "https://penpot.example.test/",
    });
    const service = await serviceModule.startRendererService({
        ...options,
        port: 0,
        backendRpc: {
            ...options.backendRpc,
            fetch: async (url, init) => {
                fetchCalls.push({ url: String(url), init });
                return new Response(
                    JSON.stringify({
                        hit: true,
                        "file-id": "file-1",
                        revn: 1,
                        "media-id": "cached-thumbnail-png",
                        uri: "https://penpot.example.test/assets/by-id/cached-thumbnail-png",
                    }),
                    { status: 200, headers: { "content-type": "application/json" } }
                );
            },
        },
    });
    try {
        const response = await postValidFileThumbnail(service.host, service.port, {
            "content-type": "application/json",
            authorization: "Bearer service-secret-token",
            cookie: "auth-token=service-secret-token",
        });

        assert.equal(response.status, 200);
        const body = await response.json();
        assert.equal(body.backendRpcClient.status, "cache-probe-executed");
        assert.equal(body.backendRpcClient.baseUriConfigured, true);
        assert.equal(body.backendRpcClient.baseUri, "https://penpot.example.test");
        assert.equal(body.backendRpcClient.networkDispatch, true);
        assert.equal(body.backendRpcClient.cacheRead, true);
        assert.equal(body.backendRpcClient.dataRead, false);
        assert.equal(body.backendRpcClient.persistWrite, false);
        assert.equal(body.backendRpcClient.cacheProbe.status, "executed");
        assert.equal(body.backendRpcClient.cacheProbe.command, "get-file-thumbnail");
        assert.equal(body.backendRpcClient.cacheProbe.endpoint, "https://penpot.example.test/api/main/methods/get-file-thumbnail?_fmt=json");
        assert.equal(body.backendRpcClient.cacheProbe.result, "hit");
        assert.equal(body.backendRpcClient.cacheProbe.resourceUri, undefined);
        assert.equal(body.backendRpcClient.cacheProbe.mediaId, undefined);
        assert.equal(body.backendRpcClient.pipeline.status, "cache-probe-executed");
        assert.equal(body.backendRpcClient.pipeline.networkDispatch, true);
        assert.equal(body.backendRpcClient.pipeline.cacheRead, true);
        assert.equal(body.backendRpcClient.pipeline.dataRead, false);
        assert.equal(body.backendRpcClient.pipeline.renderDispatch, false);
        assert.equal(body.backendRpcClient.pipeline.persistWrite, false);
        assert.equal(body.backendRpcClient.renderInput, null);
        assert.equal(body.cache.outcome, "hit");
        assert.deepEqual(body.resource, {
            mediaId: "cached-thumbnail-png",
            resourceUri: "/assets/by-id/cached-thumbnail-png",
            downloadUri: "https://penpot.example.test/assets/by-id/cached-thumbnail-png",
            contentType: "image/png",
        });
        assert.deepEqual(body.renderer, {
            runtime: null,
            fallbackUsed: false,
        });
        assert.equal(JSON.stringify(body).includes("service-secret-token"), false);
        assert.equal(fetchCalls.length, 1);
        assert.equal(fetchCalls[0].url, "https://penpot.example.test/api/main/methods/get-file-thumbnail?_fmt=json&file-id=file-1&revn=1");
        assert.equal(fetchCalls[0].init.method, "GET");
        assert.equal(fetchCalls[0].init.headers.authorization, "Bearer service-secret-token");
        assert.equal(fetchCalls[0].init.headers.cookie, "auth-token=service-secret-token");
    } finally {
        await service.stop();
    }
});

test("noop host continues the no-op render path after configured cache probe misses", async () => {
    const fetchCalls = [];
    const service = await serviceModule.startRendererService({
        port: 0,
        backendRpc: {
            baseUri: "https://penpot.example.test",
            fetch: async (url, init) => {
                fetchCalls.push({ url: String(url), init });
                if (String(url).includes("get-file-data-for-thumbnail")) {
                    return new Response(
                        JSON.stringify({
                            "file-id": "file-1",
                            revn: 1,
                            page: { id: "page-1", objects: {} },
                        }),
                        { status: 200, headers: { "content-type": "application/json" } }
                    );
                }
                return new Response(
                    JSON.stringify({
                        hit: false,
                        "file-id": "file-1",
                        revn: 1,
                    }),
                    { status: 200, headers: { "content-type": "application/json" } }
                );
            },
        },
    });
    try {
        const response = await postValidFileThumbnail(service.host, service.port);

        assert.equal(response.status, 200);
        const body = await response.json();
        assert.equal(body.backendRpcClient.status, "source-data-read-executed");
        assert.equal(body.backendRpcClient.dataRead, true);
        assert.equal(body.backendRpcClient.networkDispatch, true);
        assert.equal(body.backendRpcClient.cacheProbe.status, "executed");
        assert.equal(body.backendRpcClient.cacheProbe.result, "miss");
        assert.equal(body.backendRpcClient.cacheProbe.cacheRead, true);
        assert.equal(body.backendRpcClient.cacheProbe.networkDispatch, true);
        assert.equal(body.backendRpcClient.pipeline.status, "source-data-read-executed");
        assert.equal(body.backendRpcClient.pipeline.networkDispatch, true);
        assert.equal(body.backendRpcClient.pipeline.dataRead, true);
        assert.equal(body.backendRpcClient.pipeline.orderedStages[0].status, "executed");
        assert.equal(body.backendRpcClient.pipeline.orderedStages[0].dispatch, true);
        assert.equal(body.backendRpcClient.pipeline.orderedStages[1].status, "executed");
        assert.equal(body.backendRpcClient.pipeline.orderedStages[1].dispatch, true);
        assert.equal(body.backendRpcClient.pipeline.renderDispatch, false);
        assert.equal(body.backendRpcClient.pipeline.persistWrite, false);
        assert.equal(body.backendRpcClient.pipeline.sourceDataValuesIncluded, false);
        assert.deepEqual(body.backendRpcClient.renderInput, backendRpcRenderInput("reuse"));
        assert.deepEqual(body.cache, {
            outcome: "rendered",
            policy: "reuse",
            scope: "file-thumbnail",
            key: "file:file-1:revn:1",
            probe: "file-thumbnail-by-file-id-and-revn",
        });
        assert.equal(body.resource.mediaId, "noop-thumbnail-png");
        assert.equal(body.resource.resourceUri, "/assets/by-id/noop-thumbnail-png");
        assert.equal(body.resource.downloadUri, `http://${service.host}:${service.port}/assets/by-id/noop-thumbnail-png`);
        assert.deepEqual(body.renderer, {
            runtime: "noop-png-fixture",
            fallbackUsed: false,
        });
        assert.equal(JSON.stringify(body).includes("page-1"), false);
        assert.equal(fetchCalls.length, 2);
        assert.equal(fetchCalls[0].url, "https://penpot.example.test/api/main/methods/get-file-thumbnail?_fmt=json&file-id=file-1&revn=1");
        assert.equal(fetchCalls[1].url, "https://penpot.example.test/api/main/methods/get-file-data-for-thumbnail?_fmt=json&file-id=file-1&strip-frames-with-thumbnails=false");
        assert.equal(fetchCalls[1].init.method, "GET");
    } finally {
        await service.stop();
    }
});

test("noop host executes configured file thumbnail source-data reads for refresh requests", async () => {
    const fetchCalls = [];
    const service = await serviceModule.startRendererService({
        port: 0,
        backendRpc: {
            baseUri: "https://penpot.example.test",
            fetch: async (url, init) => {
                fetchCalls.push({ url: String(url), init });
                return new Response(
                    JSON.stringify({
                        "file-id": "file-1",
                        revn: 1,
                        page: { id: "page-1", objects: {} },
                    }),
                    { status: 200, headers: { "content-type": "application/json" } }
                );
            },
        },
    });
    try {
        const response = await fetch(`http://${service.host}:${service.port}/thumbnail`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                operation: "thumbnail.render",
                target: { kind: "file", fileId: "file-1", revn: 1 },
                artifact: { format: "png", mimeType: "image/png", extension: ".png", width: 252, height: 168 },
                cache: { policy: "refresh", scope: "file-thumbnail", key: "file:file-1:revn:1" },
                backendRpc: fileBackendRpc("refresh"),
                render: { required: true, runtime: "render-wasm-worker", fallback: "frontend-rasterizer" },
            }),
        });

        assert.equal(response.status, 200);
        const body = await response.json();
        assert.equal(body.backendRpcClient.status, "source-data-read-executed");
        assert.equal(body.backendRpcClient.networkDispatch, true);
        assert.equal(body.backendRpcClient.cacheRead, false);
        assert.equal(body.backendRpcClient.dataRead, true);
        assert.equal(body.backendRpcClient.cacheProbe, null);
        assert.equal(body.backendRpcClient.pipeline.status, "source-data-read-executed");
        assert.equal(body.backendRpcClient.pipeline.cacheRead, false);
        assert.equal(body.backendRpcClient.pipeline.dataRead, true);
        assert.equal(body.backendRpcClient.pipeline.orderedStages[0].status, "executed");
        assert.equal(body.backendRpcClient.pipeline.orderedStages[0].dispatch, true);
        assert.equal(body.backendRpcClient.pipeline.renderDispatch, false);
        assert.equal(body.backendRpcClient.pipeline.persistWrite, false);
        assert.equal(body.backendRpcClient.pipeline.sourceDataValuesIncluded, false);
        assert.deepEqual(body.backendRpcClient.renderInput, backendRpcRenderInput("refresh"));
        assert.deepEqual(body.cache, {
            outcome: "rendered",
            policy: "refresh",
            scope: "file-thumbnail",
            key: "file:file-1:revn:1",
            probe: null,
        });
        assert.equal(JSON.stringify(body).includes("page-1"), false);
        assert.equal(fetchCalls.length, 1);
        assert.equal(fetchCalls[0].url, "https://penpot.example.test/api/main/methods/get-file-data-for-thumbnail?_fmt=json&file-id=file-1&strip-frames-with-thumbnails=false");
        assert.equal(fetchCalls[0].init.method, "GET");
    } finally {
        await service.stop();
    }
});

test("noop host returns retryable errors when configured cache probe dispatch fails", async () => {
    const service = await serviceModule.startRendererService({
        port: 0,
        backendRpc: {
            baseUri: "https://penpot.example.test",
            fetch: async () => {
                throw new Error("backend unavailable with service-secret-token");
            },
        },
    });
    try {
        const response = await postValidFileThumbnail(service.host, service.port, {
            "content-type": "application/json",
            authorization: "Bearer service-secret-token",
            cookie: "auth-token=service-secret-token",
        });

        assert.equal(response.status, 502);
        const body = await response.json();
        assert.equal(body.status, "error");
        assert.equal(body.code, "renderer_service_backend_cache_probe_unavailable");
        assert.equal(body.retryable, true);
        assert.equal(body.field, "backendRpcClient.cacheProbe");
        assert.match(body.message, /cache probe could not reach/);
        assert.equal(JSON.stringify(body).includes("service-secret-token"), false);
    } finally {
        await service.stop();
    }
});

test("noop host returns a normalized PNG thumbnail resource", async () => {
    await withService(async ({ host, port }) => {
        const response = await fetch(`http://${host}:${port}/thumbnail`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                authorization: "Bearer service-secret-token",
                cookie: "theme=light; auth-token=service-secret-token",
            },
            body: JSON.stringify({
                operation: "thumbnail.render",
                target: { kind: "file", fileId: "file-1", revn: 1 },
                artifact: { format: "png", mimeType: "image/png", extension: ".png", width: 252, height: 168 },
                cache: { policy: "reuse", scope: "file-thumbnail", key: "file:file-1:revn:1", probe: "file-thumbnail-by-file-id-and-revn" },
                backendRpc: fileBackendRpc("reuse"),
                render: { required: "on-cache-miss", runtime: "render-wasm-worker", fallback: "frontend-rasterizer" },
            }),
        });

        assert.equal(response.status, 200);
        const body = await response.json();
        assert.equal(body.status, "ok");
        assert.equal(body.resource.mediaId, "noop-thumbnail-png");
        assert.equal(body.resource.resourceUri, "/assets/by-id/noop-thumbnail-png");
        assert.equal(body.resource.downloadUri, `http://${host}:${port}/assets/by-id/noop-thumbnail-png`);
        assert.equal(body.resource.contentType, "image/png");
        assert.deepEqual(body.cache, {
            outcome: "rendered",
            policy: "reuse",
            scope: "file-thumbnail",
            key: "file:file-1:revn:1",
            probe: "file-thumbnail-by-file-id-and-revn",
        });
        assert.deepEqual(body.auth, {
            mode: "caller-session",
            authorizationPresent: true,
            cookiePresent: true,
            authTokenCookiePresent: true,
            tokenValuesIncluded: false,
        });
        assert.deepEqual(body.backendRpcClient, {
            status: "not-configured",
            baseUriConfigured: false,
            baseUri: null,
            networkDispatch: false,
            cacheRead: false,
            dataRead: false,
            persistWrite: false,
            authForwarding: {
                mode: "caller-session",
                authorizationPresent: true,
                cookiePresent: true,
                authTokenCookiePresent: true,
                tokenValuesIncluded: false,
            },
            entries: {
                data: {
                    command: "get-file-data-for-thumbnail",
                    method: "GET",
                    requestPresent: true,
                    endpoint: null,
                    dispatch: false,
                    requestEnvelope: requestEnvelope(
                        "GET",
                        ["file-id", "strip-frames-with-thumbnails"],
                        ["file-id", "strip-frames-with-thumbnails"]
                    ),
                },
                persist: null,
                cacheMissPersist: {
                    command: "create-file-thumbnail",
                    method: "POST",
                    requestPresent: true,
                    endpoint: null,
                    dispatch: false,
                    requestEnvelope: requestEnvelope("POST", ["file-id", "media", "revn"], [], ["file-id", "media", "revn"]),
                },
            },
            cacheProbe: backendRpcCacheProbe(
                "file-thumbnail-by-file-id-and-revn",
                "file-thumbnail",
                "file:file-1:revn:1",
                ["file-id", "revn"]
            ),
            pipeline: backendRpcPipeline("reuse", [
                pipelineStage("cache-probe", "always", { cacheProbe: "file-thumbnail-by-file-id-and-revn" }),
                pipelineStage("source-data-read", "on-cache-miss", {
                    entry: "data",
                    command: "get-file-data-for-thumbnail",
                }),
                pipelineStage("render", "on-cache-miss", { runtime: "render-wasm-worker" }),
                pipelineStage("thumbnail-persist", "on-cache-miss", {
                    entry: "cacheMissPersist",
                    command: "create-file-thumbnail",
                }),
            ]),
            renderInput: null,
        });
        assert.equal(JSON.stringify(body).includes("service-secret-token"), false);
        assert.deepEqual(body.request, {
            operation: "thumbnail.render",
            targetKind: "file",
            fileId: "file-1",
            pageId: null,
            objectId: null,
            objectKey: null,
            tag: null,
            revn: 1,
            format: "png",
            cachePolicy: "reuse",
            cacheScope: "file-thumbnail",
            cacheKey: "file:file-1:revn:1",
            cacheProbe: "file-thumbnail-by-file-id-and-revn",
            width: 252,
            height: 168,
            mimeType: "image/png",
            extension: ".png",
            renderRequired: "on-cache-miss",
            renderRuntime: "render-wasm-worker",
            renderFallback: "frontend-rasterizer",
            backendRpc: {
                data: { command: "get-file-data-for-thumbnail", method: "GET", requestPresent: true },
                persist: null,
                cacheMissPersist: { command: "create-file-thumbnail", method: "POST", requestPresent: true },
            },
        });
        assert.equal(body.localFileWrites, false);

        const resource = await fetch(body.resource.downloadUri);
        assert.equal(resource.status, 200);
        assert.equal(resource.headers.get("content-type"), "image/png");
        assert.equal((await resource.arrayBuffer()).byteLength > 0, true);
    });
});

test("noop host plans backend RPC client endpoints without dispatching them", async () => {
    let fetchCalls = 0;
    const service = await serviceModule.startRendererService({
        port: 0,
        backendRpc: {
            baseUri: "https://penpot.example.test",
            fetch: async () => {
                fetchCalls += 1;
                throw new Error("backend RPC dispatch must remain disabled");
            },
        },
    });

    try {
        const response = await fetch(`http://${service.host}:${service.port}/thumbnail`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                authorization: "Bearer service-secret-token",
                cookie: "auth-token=service-secret-token",
            },
            body: JSON.stringify({
                operation: "thumbnail.render",
                target: { kind: "frame", fileId: "file-1", pageId: "page-1", objectId: "frame-1", objectKey: "file-1/page-1/frame-1/component", tag: "component" },
                artifact: { format: "png", mimeType: "image/png", extension: ".png", width: 320, height: 200 },
                cache: { policy: "refresh", scope: "file-object-thumbnail", key: "file-1/page-1/frame-1/component" },
                backendRpc: frameBackendRpc("refresh"),
                render: { required: true, runtime: "render-wasm-worker", fallback: "frontend-rasterizer" },
            }),
        });

        assert.equal(response.status, 200);
        const body = await response.json();
        assert.deepEqual(body.backendRpcClient, {
            status: "configured-disabled",
            baseUriConfigured: true,
            baseUri: "https://penpot.example.test",
            networkDispatch: false,
            cacheRead: false,
            dataRead: false,
            persistWrite: false,
            authForwarding: {
                mode: "caller-session",
                authorizationPresent: true,
                cookiePresent: true,
                authTokenCookiePresent: true,
                tokenValuesIncluded: false,
            },
            entries: {
                data: {
                    command: "get-file-frame-data-for-thumbnail",
                    method: null,
                    requestPresent: true,
                    endpoint: "https://penpot.example.test/api/main/methods/get-file-frame-data-for-thumbnail?_fmt=json",
                    dispatch: false,
                    requestEnvelope: requestEnvelope(null, ["file-id", "object-id", "page-id"]),
                },
                persist: {
                    command: "create-file-object-thumbnail",
                    method: "POST",
                    requestPresent: true,
                    endpoint: "https://penpot.example.test/api/main/methods/create-file-object-thumbnail?_fmt=json",
                    dispatch: false,
                    requestEnvelope: requestEnvelope("POST", ["file-id", "media", "object-id", "tag"], [], ["file-id", "media", "object-id", "tag"]),
                },
                cacheMissPersist: null,
            },
            cacheProbe: null,
            pipeline: backendRpcPipeline("refresh", [
                pipelineStage("source-data-read", "always", {
                    entry: "data",
                    command: "get-file-frame-data-for-thumbnail",
                }),
                pipelineStage("render", "always", { runtime: "render-wasm-worker" }),
                pipelineStage("thumbnail-persist", "always", {
                    entry: "persist",
                    command: "create-file-object-thumbnail",
                }),
            ]),
            renderInput: null,
        });
        assert.equal(JSON.stringify(body).includes("service-secret-token"), false);
        assert.equal(fetchCalls, 0);
    } finally {
        await service.stop();
    }
});

async function postValidFileThumbnail(host, port, headers = { "content-type": "application/json" }) {
    return fetch(`http://${host}:${port}/thumbnail`, {
        method: "POST",
        headers,
        body: JSON.stringify({
            operation: "thumbnail.render",
            target: { kind: "file", fileId: "file-1", revn: 1 },
            artifact: { format: "png", mimeType: "image/png", extension: ".png", width: 252, height: 168 },
            cache: { policy: "reuse", scope: "file-thumbnail", key: "file:file-1:revn:1", probe: "file-thumbnail-by-file-id-and-revn" },
            backendRpc: fileBackendRpc("reuse"),
            render: { required: "on-cache-miss", runtime: "render-wasm-worker", fallback: "frontend-rasterizer" },
        }),
    });
}

test("noop host validates generated response resource metadata before returning it", async () => {
    const service = await serviceModule.startRendererService({
        port: 0,
        thumbnailResponseOverride: (body) => ({
            ...body,
            resource: {
                ...body.resource,
                contentType: "text/plain",
            },
        }),
    });
    try {
        const response = await postValidFileThumbnail(service.host, service.port);

        assert.equal(response.status, 500);
        const body = await response.json();
        assert.equal(body.status, "error");
        assert.equal(body.code, "renderer_service_response_invalid");
        assert.equal(body.retryable, false);
        assert.equal(body.field, "resource.contentType");
        assert.match(body.message, /resource\.contentType must match image\/png/);
    } finally {
        await service.stop();
    }
});

test("noop host validates generated response cache metadata before returning it", async () => {
    const service = await serviceModule.startRendererService({
        port: 0,
        thumbnailResponseOverride: (body) => ({
            ...body,
            cache: {
                ...body.cache,
                key: "file:file-1:revn:2",
            },
        }),
    });
    try {
        const response = await postValidFileThumbnail(service.host, service.port);

        assert.equal(response.status, 500);
        const body = await response.json();
        assert.equal(body.status, "error");
        assert.equal(body.code, "renderer_service_response_invalid");
        assert.equal(body.field, "cache.key");
        assert.match(body.message, /cache\.key must match file:file-1:revn:1/);
    } finally {
        await service.stop();
    }
});

test("noop host validates generated response auth summary before returning it", async () => {
    const service = await serviceModule.startRendererService({
        port: 0,
        thumbnailResponseOverride: (body) => ({
            ...body,
            auth: {
                ...body.auth,
                tokenValuesIncluded: true,
                token: "service-secret-token",
            },
        }),
    });
    try {
        const response = await postValidFileThumbnail(service.host, service.port, {
            "content-type": "application/json",
            authorization: "Bearer service-secret-token",
            cookie: "auth-token=service-secret-token",
        });

        assert.equal(response.status, 500);
        const body = await response.json();
        assert.equal(body.status, "error");
        assert.equal(body.code, "renderer_service_response_invalid");
        assert.equal(body.field, "auth.tokenValuesIncluded");
        assert.equal(JSON.stringify(body).includes("service-secret-token"), false);
    } finally {
        await service.stop();
    }
});

test("noop host validates generated backend RPC client metadata before returning it", async () => {
    const service = await serviceModule.startRendererService({
        port: 0,
        thumbnailResponseOverride: (body) => ({
            ...body,
            backendRpcClient: {
                ...body.backendRpcClient,
                networkDispatch: true,
            },
        }),
    });
    try {
        const response = await postValidFileThumbnail(service.host, service.port);

        assert.equal(response.status, 500);
        const body = await response.json();
        assert.equal(body.status, "error");
        assert.equal(body.code, "renderer_service_response_invalid");
        assert.equal(body.field, "backendRpcClient.networkDispatch");
        assert.match(body.message, /backendRpcClient\.networkDispatch must match false/);
    } finally {
        await service.stop();
    }
});

test("noop host validates generated backend RPC cache probe plans before returning them", async () => {
    const service = await serviceModule.startRendererService({
        port: 0,
        thumbnailResponseOverride: (body) => ({
            ...body,
            backendRpcClient: {
                ...body.backendRpcClient,
                cacheProbe: {
                    ...body.backendRpcClient.cacheProbe,
                    resourceUri: "/assets/by-id/secret-cache-hit",
                },
            },
        }),
    });
    try {
        const response = await postValidFileThumbnail(service.host, service.port);

        assert.equal(response.status, 500);
        const body = await response.json();
        assert.equal(body.status, "error");
        assert.equal(body.code, "renderer_service_response_invalid");
        assert.equal(body.field, "backendRpcClient.cacheProbe.resourceUri");
        assert.equal(JSON.stringify(body).includes("secret-cache-hit"), false);
    } finally {
        await service.stop();
    }
});

test("noop host validates generated backend RPC request envelopes before returning them", async () => {
    const service = await serviceModule.startRendererService({
        port: 0,
        thumbnailResponseOverride: (body) => ({
            ...body,
            backendRpcClient: {
                ...body.backendRpcClient,
                entries: {
                    ...body.backendRpcClient.entries,
                    data: {
                        ...body.backendRpcClient.entries.data,
                        requestEnvelope: {
                            ...body.backendRpcClient.entries.data.requestEnvelope,
                            dispatch: true,
                        },
                    },
                },
            },
        }),
    });
    try {
        const response = await postValidFileThumbnail(service.host, service.port);

        assert.equal(response.status, 500);
        const body = await response.json();
        assert.equal(body.status, "error");
        assert.equal(body.code, "renderer_service_response_invalid");
        assert.equal(body.field, "backendRpcClient.entries.data.requestEnvelope.dispatch");
        assert.match(body.message, /requestEnvelope\.dispatch must match false/);
    } finally {
        await service.stop();
    }
});

test("noop host validates generated backend RPC pipeline plans before returning them", async () => {
    const service = await serviceModule.startRendererService({
        port: 0,
        thumbnailResponseOverride: (body) => ({
            ...body,
            backendRpcClient: {
                ...body.backendRpcClient,
                pipeline: {
                    ...body.backendRpcClient.pipeline,
                    dataRead: true,
                    sourceData: { fileId: "file-1" },
                },
            },
        }),
    });
    try {
        const response = await postValidFileThumbnail(service.host, service.port);

        assert.equal(response.status, 500);
        const body = await response.json();
        assert.equal(body.status, "error");
        assert.equal(body.code, "renderer_service_response_invalid");
        assert.equal(body.field, "backendRpcClient.pipeline.sourceData");
        assert.equal(JSON.stringify(body).includes("file-1"), false);
    } finally {
        await service.stop();
    }
});

test("noop host validates generated backend RPC render input summaries before returning them", async () => {
    const service = await serviceModule.startRendererService({
        port: 0,
        backendRpc: {
            baseUri: "https://penpot.example.test",
            fetch: async (url) => {
                if (String(url).includes("get-file-thumbnail")) {
                    return new Response(JSON.stringify({ hit: false, "file-id": "file-1", revn: 1 }), {
                        status: 200,
                        headers: { "content-type": "application/json" },
                    });
                }
                return new Response(JSON.stringify({ "file-id": "file-1", revn: 1, page: { id: "page-secret", objects: {} } }), {
                    status: 200,
                    headers: { "content-type": "application/json" },
                });
            },
        },
        thumbnailResponseOverride: (body) => ({
            ...body,
            backendRpcClient: {
                ...body.backendRpcClient,
                renderInput: {
                    ...body.backendRpcClient.renderInput,
                    sourceData: { page: "page-secret" },
                },
            },
        }),
    });
    try {
        const response = await postValidFileThumbnail(service.host, service.port);

        assert.equal(response.status, 500);
        const body = await response.json();
        assert.equal(body.status, "error");
        assert.equal(body.code, "renderer_service_response_invalid");
        assert.equal(body.field, "backendRpcClient.renderInput.sourceData");
        assert.equal(JSON.stringify(body).includes("page-secret"), false);
    } finally {
        await service.stop();
    }
});

test("noop host accepts frame thumbnail target identity", async () => {
    await withService(async ({ host, port }) => {
        const response = await fetch(`http://${host}:${port}/thumbnail`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                operation: "thumbnail.render",
                target: { kind: "frame", fileId: "file-1", pageId: "page-1", objectId: "frame-1", tag: "component", objectKey: "file-1/page-1/frame-1/component" },
                artifact: { format: "png", mimeType: "image/png", extension: ".png", width: 300, height: 200 },
                cache: { policy: "refresh", scope: "file-object-thumbnail", key: "file-1/page-1/frame-1/component" },
                backendRpc: frameBackendRpc("refresh"),
                render: { required: true, runtime: "render-wasm-worker", fallback: "frontend-rasterizer" },
            }),
        });

        assert.equal(response.status, 200);
        const body = await response.json();
        assert.deepEqual(body.cache, {
            outcome: "rendered",
            policy: "refresh",
            scope: "file-object-thumbnail",
            key: "file-1/page-1/frame-1/component",
            probe: null,
        });
        assert.deepEqual(body.request, {
            operation: "thumbnail.render",
            targetKind: "frame",
            fileId: "file-1",
            pageId: "page-1",
            objectId: "frame-1",
            objectKey: "file-1/page-1/frame-1/component",
            tag: "component",
            revn: null,
            format: "png",
            cachePolicy: "refresh",
            cacheScope: "file-object-thumbnail",
            cacheKey: "file-1/page-1/frame-1/component",
            cacheProbe: null,
            width: 300,
            height: 200,
            mimeType: "image/png",
            extension: ".png",
            renderRequired: true,
            renderRuntime: "render-wasm-worker",
            renderFallback: "frontend-rasterizer",
            backendRpc: {
                data: { command: "get-file-frame-data-for-thumbnail", method: null, requestPresent: true },
                persist: { command: "create-file-object-thumbnail", method: "POST", requestPresent: true },
                cacheMissPersist: null,
            },
        });
    });
});

test("noop host rejects invalid thumbnail request bodies", async () => {
    await withService(async ({ host, port }) => {
        const response = await fetch(`http://${host}:${port}/thumbnail`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                operation: "thumbnail.render",
                target: { kind: "file", fileId: "file-1", revn: 1 },
                artifact: { format: "jpg", mimeType: "image/jpeg", extension: ".jpg", width: 252, height: 168 },
                cache: { policy: "reuse", scope: "file-thumbnail", key: "file:file-1:revn:1", probe: "file-thumbnail-by-file-id-and-revn" },
                render: { required: "on-cache-miss", runtime: "render-wasm-worker", fallback: "frontend-rasterizer" },
            }),
        });

        assert.equal(response.status, 400);
        const body = await response.json();
        assert.equal(body.status, "error");
        assert.equal(body.code, "renderer_service_format_invalid");
        assert.equal(body.retryable, false);
        assert.match(body.message, /artifact\.format must be png/);
    });
});

test("noop host rejects frame thumbnails without object identity", async () => {
    await withService(async ({ host, port }) => {
        const response = await fetch(`http://${host}:${port}/thumbnail`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                operation: "thumbnail.render",
                target: { kind: "frame", fileId: "file-1", pageId: "page-1" },
                artifact: { format: "png", mimeType: "image/png", extension: ".png", width: 300, height: 200 },
                cache: { policy: "refresh", scope: "file-object-thumbnail", key: "file-1/page-1/frame-1/component" },
                render: { required: true, runtime: "render-wasm-worker", fallback: "frontend-rasterizer" },
            }),
        });

        assert.equal(response.status, 400);
        const body = await response.json();
        assert.equal(body.status, "error");
        assert.equal(body.code, "renderer_service_target_object_id_required");
        assert.match(body.message, /target\.objectId is required/);
    });
});

test("noop host rejects cache scope mismatches", async () => {
    await withService(async ({ host, port }) => {
        const response = await fetch(`http://${host}:${port}/thumbnail`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                operation: "thumbnail.render",
                target: { kind: "file", fileId: "file-1", revn: 1 },
                artifact: { format: "png", mimeType: "image/png", extension: ".png", width: 252, height: 168 },
                cache: { policy: "reuse", scope: "file-object-thumbnail", key: "file:file-1:revn:1" },
                render: { required: "on-cache-miss", runtime: "render-wasm-worker", fallback: "frontend-rasterizer" },
            }),
        });

        assert.equal(response.status, 400);
        const body = await response.json();
        assert.equal(body.status, "error");
        assert.equal(body.code, "renderer_service_cache_scope_invalid");
        assert.match(body.message, /cache\.scope must be file-thumbnail/);
    });
});

test("noop host rejects cache probe metadata that does not match cache policy", async () => {
    await withService(async ({ host, port }) => {
        const response = await fetch(`http://${host}:${port}/thumbnail`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                operation: "thumbnail.render",
                target: { kind: "frame", fileId: "file-1", pageId: "page-1", objectId: "frame-1", tag: "component", objectKey: "file-1/page-1/frame-1/component" },
                artifact: { format: "png", mimeType: "image/png", extension: ".png", width: 300, height: 200 },
                cache: { policy: "refresh", scope: "file-object-thumbnail", key: "file-1/page-1/frame-1/component", probe: "file-object-thumbnail-by-object-key" },
                backendRpc: frameBackendRpc("refresh"),
                render: { required: true, runtime: "render-wasm-worker", fallback: "frontend-rasterizer" },
            }),
        });

        assert.equal(response.status, 400);
        const body = await response.json();
        assert.equal(body.status, "error");
        assert.equal(body.code, "renderer_service_cache_probe_unexpected");
        assert.match(body.message, /cache\.probe must be omitted/);
    });
});

test("noop host rejects file thumbnail cache keys that do not match the target revision", async () => {
    await withService(async ({ host, port }) => {
        const response = await fetch(`http://${host}:${port}/thumbnail`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                operation: "thumbnail.render",
                target: { kind: "file", fileId: "file-1", revn: 2 },
                artifact: { format: "png", mimeType: "image/png", extension: ".png", width: 252, height: 168 },
                cache: { policy: "reuse", scope: "file-thumbnail", key: "file:file-1:revn:1", probe: "file-thumbnail-by-file-id-and-revn" },
                backendRpc: fileBackendRpc("reuse"),
                render: { required: "on-cache-miss", runtime: "render-wasm-worker", fallback: "frontend-rasterizer" },
            }),
        });

        assert.equal(response.status, 400);
        const body = await response.json();
        assert.equal(body.status, "error");
        assert.equal(body.code, "renderer_service_cache_key_mismatch");
        assert.match(body.message, /cache\.key must match file:file-1:revn:2/);
    });
});

test("noop host rejects tagged frame persist requests that do not match target objectKey", async () => {
    await withService(async ({ host, port }) => {
        const backendRpc = frameBackendRpc("refresh");
        backendRpc.persist.request["object-id"] = "file-1/page-1/frame-2/component";

        const response = await fetch(`http://${host}:${port}/thumbnail`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                operation: "thumbnail.render",
                target: { kind: "frame", fileId: "file-1", pageId: "page-1", objectId: "frame-1", tag: "component", objectKey: "file-1/page-1/frame-1/component" },
                artifact: { format: "png", mimeType: "image/png", extension: ".png", width: 300, height: 200 },
                cache: { policy: "refresh", scope: "file-object-thumbnail", key: "file-1/page-1/frame-1/component" },
                backendRpc,
                render: { required: true, runtime: "render-wasm-worker", fallback: "frontend-rasterizer" },
            }),
        });

        assert.equal(response.status, 400);
        const body = await response.json();
        assert.equal(body.status, "error");
        assert.equal(body.code, "renderer_service_backend_rpc_persist_object_id_mismatch");
        assert.match(body.message, /backendRpc\.persist\.request\.object-id must match file-1\/page-1\/frame-1\/component/);
    });
});

test("noop host rejects invalid artifact dimensions", async () => {
    await withService(async ({ host, port }) => {
        const response = await fetch(`http://${host}:${port}/thumbnail`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                operation: "thumbnail.render",
                target: { kind: "file", fileId: "file-1", revn: 1 },
                artifact: { format: "png", mimeType: "image/png", extension: ".png", width: 0, height: 168 },
                cache: { policy: "reuse", scope: "file-thumbnail", key: "file:file-1:revn:1", probe: "file-thumbnail-by-file-id-and-revn" },
                render: { required: "on-cache-miss", runtime: "render-wasm-worker", fallback: "frontend-rasterizer" },
            }),
        });

        assert.equal(response.status, 400);
        const body = await response.json();
        assert.equal(body.status, "error");
        assert.equal(body.code, "renderer_service_width_invalid");
        assert.match(body.message, /artifact\.width must be an integer between 1 and 4096/);
    });
});

test("noop host rejects render intent that does not match cache policy", async () => {
    await withService(async ({ host, port }) => {
        const response = await fetch(`http://${host}:${port}/thumbnail`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                operation: "thumbnail.render",
                target: { kind: "file", fileId: "file-1", revn: 1 },
                artifact: { format: "png", mimeType: "image/png", extension: ".png", width: 252, height: 168 },
                cache: { policy: "reuse", scope: "file-thumbnail", key: "file:file-1:revn:1", probe: "file-thumbnail-by-file-id-and-revn" },
                render: { required: true, runtime: "render-wasm-worker", fallback: "frontend-rasterizer" },
            }),
        });

        assert.equal(response.status, 400);
        const body = await response.json();
        assert.equal(body.status, "error");
        assert.equal(body.code, "renderer_service_render_required_invalid");
        assert.match(body.message, /render\.required must be on-cache-miss/);
    });
});

test("noop host rejects backend RPC persist intent that does not match cache policy", async () => {
    await withService(async ({ host, port }) => {
        const backendRpc = fileBackendRpc("refresh");
        const response = await fetch(`http://${host}:${port}/thumbnail`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                operation: "thumbnail.render",
                target: { kind: "file", fileId: "file-1", revn: 1 },
                artifact: { format: "png", mimeType: "image/png", extension: ".png", width: 252, height: 168 },
                cache: { policy: "reuse", scope: "file-thumbnail", key: "file:file-1:revn:1", probe: "file-thumbnail-by-file-id-and-revn" },
                backendRpc,
                render: { required: "on-cache-miss", runtime: "render-wasm-worker", fallback: "frontend-rasterizer" },
            }),
        });

        assert.equal(response.status, 400);
        const body = await response.json();
        assert.equal(body.status, "error");
        assert.equal(body.code, "renderer_service_backend_rpc_persist_unexpected");
        assert.match(body.message, /backendRpc\.persist must be null for reuse/);
    });
});

test("noop host lifecycle closes the listening socket", async () => {
    const service = await serviceModule.startRendererService({ port: 0 });
    assert.equal(service.server.listening, true);

    await service.stop();

    assert.equal(service.server.listening, false);
});
