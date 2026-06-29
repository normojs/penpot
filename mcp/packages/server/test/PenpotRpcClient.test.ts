import assert from "node:assert/strict";
import test from "node:test";
import { PenpotRpcClient, PenpotRpcError } from "../src/PenpotRpcClient.js";

type FetchCall = {
    input: Parameters<typeof fetch>[0];
    init?: Parameters<typeof fetch>[1];
};

const originalFetch = globalThis.fetch;

function withFetchMock(handler: typeof fetch): () => void {
    globalThis.fetch = handler;
    return () => {
        globalThis.fetch = originalFetch;
    };
}

function assertRpcError(cause: unknown, code: string): asserts cause is PenpotRpcError {
    assert.ok(cause instanceof PenpotRpcError);
    assert.equal(cause.code, code);
}

test("PenpotRpcClient.get sends token auth and query params", async () => {
    let call: FetchCall | undefined;
    const restoreFetch = withFetchMock(async (input, init) => {
        call = { input, init };
        return new Response(JSON.stringify({ files: [] }), { status: 200 });
    });

    try {
        const client = new PenpotRpcClient("http://penpot.example");
        const result = await client.get("get-project-files", { "project-id": "project-1" }, "token-123");

        assert.deepEqual(result, { files: [] });
        assert.ok(call);
        assert.equal(call.init?.method, "GET");
        assert.equal((call.init?.headers as Record<string, string>).authorization, "Token token-123");
        assert.equal((call.init?.headers as Record<string, string>)["x-client"], "penpot-mcp/1.0");

        const url = new URL(String(call.input));
        assert.equal(url.pathname, "/api/main/methods/get-project-files");
        assert.equal(url.searchParams.get("_fmt"), "json");
        assert.equal(url.searchParams.get("project-id"), "project-1");
    } finally {
        restoreFetch();
    }
});

test("PenpotRpcClient.post sends JSON body", async () => {
    let call: FetchCall | undefined;
    const restoreFetch = withFetchMock(async (input, init) => {
        call = { input, init };
        return new Response(JSON.stringify({ id: "file-1" }), { status: 200 });
    });

    try {
        const client = new PenpotRpcClient("http://penpot.example");
        const result = await client.post(
            "create-file",
            { name: "Prototype", "project-id": "project-1", "is-shared": false },
            "token-123"
        );

        assert.deepEqual(result, { id: "file-1" });
        assert.ok(call);
        assert.equal(call.init?.method, "POST");
        assert.equal((call.init?.headers as Record<string, string>)["content-type"], "application/json");
        assert.deepEqual(JSON.parse(call.init?.body as string), {
            name: "Prototype",
            "project-id": "project-1",
            "is-shared": false,
        });
    } finally {
        restoreFetch();
    }
});

test("PenpotRpcClient.postSse sends JSON body, context headers, and parses transit SSE events", async () => {
    let call: FetchCall | undefined;
    const restoreFetch = withFetchMock(async (input, init) => {
        call = { input, init };
        return new Response(
            [
                'event: progress\ndata: {"step":"queued"}',
                'event: end\ndata: ["^ ","~:resource-uri","/assets/by-id/resource-1","~:filename","Design.penpot"]',
                "",
            ].join("\n\n"),
            {
                status: 200,
                headers: { "content-type": "text/event-stream;charset=UTF-8" },
            }
        );
    });

    try {
        const client = new PenpotRpcClient("http://penpot.example");
        const events = await client.postSse(
            "export-binfile",
            { "file-id": "file-1", "include-libraries": false, "embed-assets": true },
            "token-123",
            {
                mcpToolName: "export.file",
                mcpAdapter: "backend-rpc",
                mcpSessionId: "session-1",
                mcpFileId: "file-1",
            }
        );

        assert.ok(call);
        assert.equal(call.init?.method, "POST");
        const headers = call.init?.headers as Record<string, string>;
        assert.equal(headers.accept, "text/event-stream,application/json");
        assert.equal(headers.authorization, "Token token-123");
        assert.equal(headers["content-type"], "application/json");
        assert.equal(headers["x-client"], "penpot-mcp/1.0");
        assert.equal(headers["x-event-origin"], "mcp");
        assert.equal(headers["x-external-session-id"], "session-1");
        assert.equal(headers["x-penpot-mcp-tool"], "export.file");
        assert.equal(headers["x-penpot-mcp-adapter"], "backend-rpc");
        assert.equal(headers["x-penpot-mcp-file-id"], "file-1");
        assert.deepEqual(JSON.parse(call.init?.body as string), {
            "file-id": "file-1",
            "include-libraries": false,
            "embed-assets": true,
        });

        const url = new URL(String(call.input));
        assert.equal(url.pathname, "/api/main/methods/export-binfile");
        assert.equal(url.searchParams.get("_fmt"), "json");
        assert.deepEqual(events, [
            { type: "progress", data: { step: "queued" } },
            {
                type: "end",
                data: {
                    "resource-uri": "/assets/by-id/resource-1",
                    filename: "Design.penpot",
                },
            },
        ]);
    } finally {
        restoreFetch();
    }
});

test("PenpotRpcClient.postSse rejects non-SSE success responses", async () => {
    const restoreFetch = withFetchMock(async () => {
        return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { "content-type": "application/json" },
        });
    });

    try {
        const client = new PenpotRpcClient("http://penpot.example");
        await assert.rejects(
            () => client.postSse("export-binfile", {}, "token-123"),
            (cause) => {
                assertRpcError(cause, "penpot_rpc_stream_expected");
                assert.equal(cause.status, 502);
                return true;
            }
        );
    } finally {
        restoreFetch();
    }
});

test("PenpotRpcClient.postSse normalizes backend stream error events", async () => {
    const restoreFetch = withFetchMock(async () => {
        return new Response('event: error\ndata: {"code":"not-allowed","message":"not allowed"}\n\n', {
            status: 200,
            headers: { "content-type": "text/event-stream" },
        });
    });

    try {
        const client = new PenpotRpcClient("http://penpot.example");
        await assert.rejects(
            () => client.postSse("export-binfile", {}, "token-123"),
            (cause) => {
                assertRpcError(cause, "not_allowed");
                assert.equal(cause.status, 200);
                return true;
            }
        );
    } finally {
        restoreFetch();
    }
});

test("PenpotRpcClient.post sends MCP audit context headers", async () => {
    let call: FetchCall | undefined;
    const restoreFetch = withFetchMock(async (input, init) => {
        call = { input, init };
        return new Response(JSON.stringify({ id: "shape-1" }), { status: 200 });
    });

    try {
        const client = new PenpotRpcClient("http://penpot.example");
        const result = await client.post("create-file-shape", { id: "file-1", "page-id": "page-1" }, "token-123", {
            mcpToolName: "shape.create_rect",
            mcpAdapter: "backend-command",
            mcpSessionId: "session-1",
            mcpFileId: "file-1",
            mcpPageId: "page-1",
            mcpShapeId: "shape-1",
        });

        assert.deepEqual(result, { id: "shape-1" });
        assert.ok(call);
        const headers = call.init?.headers as Record<string, string>;
        assert.equal(headers["x-event-origin"], "mcp");
        assert.equal(headers["x-external-session-id"], "session-1");
        assert.equal(headers["x-penpot-mcp-tool"], "shape.create_rect");
        assert.equal(headers["x-penpot-mcp-adapter"], "backend-command");
        assert.equal(headers["x-penpot-mcp-session-id"], "session-1");
        assert.equal(headers["x-penpot-mcp-file-id"], "file-1");
        assert.equal(headers["x-penpot-mcp-page-id"], "page-1");
        assert.equal(headers["x-penpot-mcp-shape-id"], "shape-1");
    } finally {
        restoreFetch();
    }
});

test("PenpotRpcClient classifies backend configuration errors", async () => {
    const client = new PenpotRpcClient("not a url");

    await assert.rejects(
        () => client.get("get-profile", {}, "token-123"),
        (cause) => {
            assertRpcError(cause, "penpot_backend_config_invalid");
            return true;
        }
    );
});

test("PenpotRpcClient classifies backend availability errors", async () => {
    const restoreFetch = withFetchMock(async () => {
        throw new Error("connection refused");
    });

    try {
        const client = new PenpotRpcClient("http://penpot.example");
        await assert.rejects(
            () => client.get("get-profile", {}, "token-123"),
            (cause) => {
                assertRpcError(cause, "penpot_backend_unavailable");
                return true;
            }
        );
    } finally {
        restoreFetch();
    }
});

test("PenpotRpcClient normalizes backend HTTP errors", async () => {
    const cases = [
        {
            status: 401,
            body: { type: "authentication", code: "authentication-required", hint: "authentication required" },
            code: "authentication_required",
        },
        {
            status: 403,
            body: { type: "authorization", code: "not-allowed", hint: "not allowed" },
            code: "permission_denied",
        },
        {
            status: 404,
            body: { type: "not-found", code: "object-not-found", hint: "not found" },
            code: "object_not_found_or_forbidden",
        },
        {
            status: 400,
            body: { type: "validation", code: "params-validation", hint: "invalid params" },
            code: "params_validation",
        },
        {
            status: 429,
            body: null,
            code: "rate_limit_reached",
        },
    ];

    for (const item of cases) {
        const restoreFetch = withFetchMock(async () => {
            return new Response(JSON.stringify(item.body), { status: item.status });
        });

        try {
            const client = new PenpotRpcClient("http://penpot.example");
            await assert.rejects(
                () => client.get("get-profile", {}, "token-123"),
                (cause) => {
                    assertRpcError(cause, item.code);
                    assert.equal(cause.status, item.status);
                    return true;
                }
            );
        } finally {
            restoreFetch();
        }
    }
});
