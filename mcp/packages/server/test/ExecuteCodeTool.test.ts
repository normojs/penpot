import assert from "node:assert/strict";
import test from "node:test";
import { ExecuteCodeErrorCodes, ExecuteCodeTool } from "../src/tools/ExecuteCodeTool.js";
import type { PenpotMcpServer } from "../src/PenpotMcpServer.js";

function parseJsonResponse(response: Awaited<ReturnType<ExecuteCodeTool["execute"]>>) {
    const text = response.content[0];
    if (text.type !== "text") {
        throw new Error("Expected text response");
    }
    return JSON.parse(text.text);
}

function mcpServerWithExecuteCode(enabled: boolean, executePluginTask: (task: any) => Promise<any>): PenpotMcpServer {
    return {
        isExecuteCodeEnabled: () => enabled,
        pluginBridge: {
            executePluginTask,
        },
    } as unknown as PenpotMcpServer;
}

test("ExecuteCodeTool returns structured disabled response by default", async () => {
    let taskCalled = false;
    const tool = new ExecuteCodeTool(
        mcpServerWithExecuteCode(false, async () => {
            taskCalled = true;
            throw new Error("executePluginTask should not be called when disabled");
        })
    );

    const response = await tool.execute({ code: "return penpot.currentFile;" });
    const body = parseJsonResponse(response);

    assert.equal(taskCalled, false);
    assert.equal(body.status, "error");
    assert.equal(body.error.code, ExecuteCodeErrorCodes.EXECUTE_CODE_DISABLED);
    assert.equal(body.error.config.env, "PENPOT_MCP_ENABLE_EXECUTE_CODE");
    assert.ok(body.error.actions.includes("shape.create_frame"));
    assert.ok(body.error.actions.includes("shape.set_layout"));
    assert.ok(body.error.actions.includes("shape.set_style"));
    assert.ok(body.error.actions.includes("render.preview"));
});

test("ExecuteCodeTool executes plugin task when explicitly enabled", async () => {
    let request: unknown;
    const tool = new ExecuteCodeTool(
        mcpServerWithExecuteCode(true, async (task) => {
            request = task.toRequest();
            return { data: { ok: true } };
        })
    );

    const response = await tool.execute({ code: "return { ok: true };" });
    const text = response.content[0];

    assert.equal(text.type, "text");
    assert.deepEqual(JSON.parse(text.text), { ok: true });
    assert.ok(request);
    assert.equal((request as { task: string }).task, "executeCode");
    assert.deepEqual((request as { params: unknown }).params, { code: "return { ok: true };" });
});
