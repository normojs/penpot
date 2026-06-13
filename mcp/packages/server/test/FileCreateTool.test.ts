import assert from "node:assert/strict";
import test from "node:test";
import { McpWriteLimiter } from "../src/McpWriteLimiter.js";
import type { McpWriteLimiterConfig } from "../src/McpWriteLimiter.js";
import type { PenpotRpcRequestContext } from "../src/PenpotRpcClient.js";
import type { PenpotMcpServer } from "../src/PenpotMcpServer.js";
import { FileCreateTool } from "../src/tools/FileCreateTool.js";

type RpcCall = {
    methodName: string;
    params: Record<string, unknown>;
    userToken: string;
    context?: PenpotRpcRequestContext;
};

function parseJsonResponse(response: Awaited<ReturnType<FileCreateTool["execute"]>>) {
    const text = response.content[0];
    if (text.type !== "text") {
        throw new Error("Expected text response");
    }
    return JSON.parse(text.text);
}

function mcpServerWithRpc(
    rpcClient: { post?: (...args: any[]) => Promise<unknown> },
    userToken = "token-1",
    mcpSessionId = "session-1",
    limiterConfig: Partial<McpWriteLimiterConfig> = {}
): PenpotMcpServer {
    return {
        rpcClient,
        writeLimiter: new McpWriteLimiter(limiterConfig),
        getSessionContext: () => ({ userToken, mcpSessionId }),
    } as unknown as PenpotMcpServer;
}

test("FileCreateTool sends MCP write audit context", async () => {
    const calls: RpcCall[] = [];
    const tool = new FileCreateTool(
        mcpServerWithRpc({
            post: async (
                methodName: string,
                params: Record<string, unknown>,
                userToken: string,
                context?: PenpotRpcRequestContext
            ) => {
                calls.push({ methodName, params, userToken, context });
                return {
                    id: "00000000-0000-0000-0000-000000000002",
                    name: "Prototype",
                    projectId: "00000000-0000-0000-0000-000000000001",
                };
            },
        })
    );

    const response = await tool.execute({
        projectId: "00000000-0000-0000-0000-000000000001",
        name: " Prototype ",
    });
    const body = parseJsonResponse(response);

    assert.deepEqual(calls, [
        {
            methodName: "create-file",
            params: {
                name: "Prototype",
                "project-id": "00000000-0000-0000-0000-000000000001",
                "is-shared": false,
            },
            userToken: "token-1",
            context: {
                mcpToolName: "file.create",
                mcpSessionId: "session-1",
                mcpAdapter: "backend-command",
                mcpProjectId: "00000000-0000-0000-0000-000000000001",
            },
        },
    ]);
    assert.equal(body.status, "ok");
    assert.equal(body.data.file.id, "00000000-0000-0000-0000-000000000002");
});

test("FileCreateTool returns structured rate-limit error", async () => {
    const calls: RpcCall[] = [];
    const tool = new FileCreateTool(
        mcpServerWithRpc(
            {
                post: async (
                    methodName: string,
                    params: Record<string, unknown>,
                    userToken: string,
                    context?: PenpotRpcRequestContext
                ) => {
                    calls.push({ methodName, params, userToken, context });
                    return { id: "00000000-0000-0000-0000-000000000002", name: "Prototype" };
                },
            },
            "token-1",
            "session-1",
            {
                perUserRateLimit: 1,
                perSessionRateLimit: 1,
                perFileRateLimit: 0,
            }
        )
    );

    await tool.execute({
        projectId: "00000000-0000-0000-0000-000000000001",
        name: "Prototype 1",
    });
    const response = await tool.execute({
        projectId: "00000000-0000-0000-0000-000000000001",
        name: "Prototype 2",
    });
    const body = parseJsonResponse(response);

    assert.equal(calls.length, 1);
    assert.equal(body.status, "error");
    assert.equal(body.error.code, "mcp_write_rate_limit");
    assert.equal(body.error.data.status, 429);
    assert.equal(body.error.data.data.scope, "user");
    assert.equal(body.error.data.data.toolName, "file.create");
});
