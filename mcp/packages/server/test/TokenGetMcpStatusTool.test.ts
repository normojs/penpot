import assert from "node:assert/strict";
import test from "node:test";
import type { PenpotMcpServer } from "../src/PenpotMcpServer.js";
import { summarizeMcpToken, TokenGetMcpStatusTool } from "../src/tools/TokenTools.js";

function parseJsonResponse(response: Awaited<ReturnType<TokenGetMcpStatusTool["execute"]>>) {
    const text = response.content[0];
    if (text.type !== "text") {
        throw new Error("Expected text response");
    }
    return JSON.parse(text.text);
}

function mcpServerWithRpc(
    rpcClient: { get?: (...args: any[]) => Promise<unknown> },
    options: { userToken?: string | null; mcpSessionId?: string } = {}
): PenpotMcpServer {
    const userToken = options.userToken === undefined ? "token-1" : options.userToken;
    const mcpSessionId = options.mcpSessionId ?? "session-1";
    return {
        rpcClient,
        getSessionContext: () => (userToken ? { userToken, mcpSessionId } : undefined),
    } as unknown as PenpotMcpServer;
}

test("summarizeMcpToken never returns the raw token value", () => {
    const summary = summarizeMcpToken(
        {
            id: "mcp-token-1",
            token: "super-secret-mcp-token",
            "expires-at": "2026-08-01T00:00:00.000Z",
        },
        true
    );

    assert.equal(summary.present, true);
    assert.equal(summary.expiresAt, "2026-08-01T00:00:00.000Z");
    assert.equal(summary.rawTokenPresent, true);
    assert.equal((summary.session as { userTokenPresent: boolean }).userTokenPresent, true);
    assert.equal("token" in summary, false);
    assert.equal(JSON.stringify(summary).includes("super-secret-mcp-token"), false);
    assert.ok(Array.isArray(summary.nextActions));
});

test("summarizeMcpToken reports absent token rows", () => {
    const summary = summarizeMcpToken(null, false);
    assert.equal(summary.present, false);
    assert.equal(summary.expiresAt, null);
    assert.equal(summary.rawTokenPresent, false);
    assert.equal((summary.session as { userTokenPresent: boolean }).userTokenPresent, false);
    assert.ok((summary.nextActions as string[]).some((action) => /Create or regenerate/i.test(action)));
});

test("TokenGetMcpStatusTool returns token-safe backend-rpc summary", async () => {
    const calls: Array<{ methodName: string; params: Record<string, unknown>; userToken: string }> = [];
    const tool = new TokenGetMcpStatusTool(
        mcpServerWithRpc({
            get: async (methodName: string, params: Record<string, unknown>, userToken: string) => {
                calls.push({ methodName, params, userToken });
                return {
                    id: "mcp-token-1",
                    token: "raw-should-not-leak",
                    expiresAt: "2026-08-01T00:00:00.000Z",
                };
            },
        })
    );

    const response = await tool.execute({});
    const body = parseJsonResponse(response);

    assert.deepEqual(calls, [
        {
            methodName: "get-current-mcp-token",
            params: {},
            userToken: "token-1",
        },
    ]);
    assert.equal(body.status, "ok");
    assert.equal(body.data.present, true);
    assert.equal(body.data.expiresAt, "2026-08-01T00:00:00.000Z");
    assert.equal(body.data.rawTokenPresent, true);
    assert.equal(body.data.session.userTokenPresent, true);
    assert.equal(body.data.adapter, "backend-rpc");
    assert.equal(JSON.stringify(body).includes("raw-should-not-leak"), false);
    assert.equal(JSON.stringify(body).includes("token-1"), false);
});

test("TokenGetMcpStatusTool requires authentication", async () => {
    let called = false;
    const tool = new TokenGetMcpStatusTool(
        mcpServerWithRpc(
            {
                get: async () => {
                    called = true;
                    return null;
                },
            },
            { userToken: null }
        )
    );

    const response = await tool.execute({});
    const body = parseJsonResponse(response);

    assert.equal(called, false);
    assert.equal(body.status, "error");
    assert.equal(body.error.code, "authentication_required");
});

test("TokenGetMcpStatusTool maps RPC failures", async () => {
    const tool = new TokenGetMcpStatusTool(
        mcpServerWithRpc({
            get: async () => {
                throw new Error("backend down");
            },
        })
    );

    const response = await tool.execute({});
    const body = parseJsonResponse(response);

    assert.equal(body.status, "error");
    assert.equal(body.error.code, "penpot_rpc_error");
    assert.match(String(body.error.message), /backend down/);
});
