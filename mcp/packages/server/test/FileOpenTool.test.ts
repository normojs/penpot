import assert from "node:assert/strict";
import test from "node:test";
import { PenpotMcpServer } from "../src/PenpotMcpServer.js";
import { FileOpenTool } from "../src/tools/FileOpenTool.js";

const UUIDS = {
    file: "00000000-0000-0000-0000-000000000001",
    page: "00000000-0000-0000-0000-000000000002",
};

function parseJsonResponse(response: Awaited<ReturnType<FileOpenTool["execute"]>>) {
    const text = response.content[0];
    assert.equal(text.type, "text");
    return JSON.parse(text.text);
}

test("FileOpenTool returns workspace URL and handoff actions", async () => {
    const tool = new FileOpenTool({
        getSessionContext: () => ({ userToken: "token-1" }),
    } as unknown as PenpotMcpServer);

    const response = await tool.execute({
        fileId: UUIDS.file,
        teamId: "team-1",
        pageId: UUIDS.page,
        publicUri: "https://penpot.example.test/",
    });
    const body = parseJsonResponse(response);
    const expectedUrl =
        "https://penpot.example.test/#/workspace?file-id=00000000-0000-0000-0000-000000000001&team-id=team-1&page-id=00000000-0000-0000-0000-000000000002";

    assert.equal(body.status, "ok");
    assert.equal(body.data.command, "file.open");
    assert.equal(body.data.adapter, "browser-url");
    assert.equal(body.data.boundContext, false);
    assert.equal(body.data.url, expectedUrl);
    assert.equal(body.data.workspaceUrl, expectedUrl);
    assert.equal(body.data.handoff.workspaceUrl, expectedUrl);
    assert.deepEqual(body.data.handoff.nextActions, [
        "open_workspace_url",
        "file.get_context",
        "file.bind_context",
        "retry_original_tool",
    ]);
    assert.deepEqual(body.data.handoff.target, {
        fileId: UUIDS.file,
        teamId: "team-1",
        pageId: UUIDS.page,
    });
});

test("FileOpenTool rejects unsupported adapter requests", async () => {
    const tool = new FileOpenTool({} as unknown as PenpotMcpServer);
    const response = await tool.execute({
        fileId: UUIDS.file,
        adapter: "plugin-live",
    });
    const body = parseJsonResponse(response);

    assert.equal(body.status, "error");
    assert.equal(body.error.code, "adapter_not_supported");
    assert.equal(body.error.data.adapterSelection.command, "file.open");
    assert.equal(body.error.data.adapterSelection.requested, "plugin-live");
});
