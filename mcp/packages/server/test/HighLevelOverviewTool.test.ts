import assert from "node:assert/strict";
import test from "node:test";
import type { PenpotMcpServer } from "../src/PenpotMcpServer.js";
import { HighLevelOverviewTool } from "../src/tools/HighLevelOverviewTool.js";

function parseTextResponse(response: Awaited<ReturnType<HighLevelOverviewTool["execute"]>>) {
    const text = response.content[0];
    if (text.type !== "text") {
        throw new Error("Expected text response");
    }
    return text.text;
}

test("HighLevelOverviewTool returns server overview instructions", async () => {
    const overview =
        "Penpot High-Level Overview\nUse typed MCP tools before execute_code.\nPrefer file.bind_context for live tools.";
    const tool = new HighLevelOverviewTool({
        getHighLevelOverviewInstructions: () => overview,
        getSessionContext: () => undefined,
    } as unknown as PenpotMcpServer);

    assert.equal(tool.getToolName(), "high_level_overview");
    assert.match(tool.getToolDescription(), /high-level instructions/i);

    const response = await tool.execute({});
    assert.equal(parseTextResponse(response), overview);
});
