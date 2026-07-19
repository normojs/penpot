import assert from "node:assert/strict";
import test from "node:test";
import type { ApiDocs, ApiType } from "../src/ApiDocs.js";
import type { PenpotMcpServer } from "../src/PenpotMcpServer.js";
import { PenpotApiInfoTool } from "../src/tools/PenpotApiInfoTool.js";

function parseTextResponse(response: Awaited<ReturnType<PenpotApiInfoTool["execute"]>>) {
    const text = response.content[0];
    if (text.type !== "text") {
        throw new Error("Expected text response");
    }
    return text.text;
}

function createApiType(options: {
    overview: string;
    fullText: string;
    members?: Record<string, string>;
}): ApiType {
    const members = options.members ?? {};
    return {
        getName: () => "Shape",
        getOverviewText: () => options.overview,
        getFullText: () => options.fullText,
        getMember: (memberName: string) => members[memberName] ?? null,
    } as unknown as ApiType;
}

function createApiDocs(types: Record<string, ApiType>): ApiDocs {
    return {
        getType: (typeName: string) => types[typeName.toLowerCase()] ?? null,
        getTypeNames: () => Object.keys(types),
        getTypeCount: () => Object.keys(types).length,
    } as unknown as ApiDocs;
}

const mcpServer = {
    getSessionContext: () => undefined,
} as unknown as PenpotMcpServer;

test("PenpotApiInfoTool returns full type docs when short enough", async () => {
    const tool = new PenpotApiInfoTool(
        mcpServer,
        createApiDocs({
            shape: createApiType({
                overview: "Shape overview",
                fullText: "Shape overview\n\n## methods\n\n### resize\n\nResize the shape.",
            }),
        })
    );

    assert.equal(tool.getToolName(), "penpot_api_info");
    const response = await tool.execute({ type: "Shape" });
    assert.match(parseTextResponse(response), /Shape overview/);
    assert.match(parseTextResponse(response), /resize/i);
});

test("PenpotApiInfoTool returns overview truncation for long docs", async () => {
    const longBody = "x".repeat(2500);
    const tool = new PenpotApiInfoTool(
        mcpServer,
        createApiDocs({
            shape: createApiType({
                overview: "Shape overview only",
                fullText: `Shape overview only\n\n${longBody}`,
            }),
        })
    );

    const text = parseTextResponse(await tool.execute({ type: "shape" }));
    assert.match(text, /Shape overview only/);
    assert.match(text, /Member details not provided \(too long\)/);
    assert.ok(!text.includes(longBody));
});

test("PenpotApiInfoTool returns a specific member", async () => {
    const tool = new PenpotApiInfoTool(
        mcpServer,
        createApiDocs({
            shape: createApiType({
                overview: "Shape overview",
                fullText: "Shape overview",
                members: {
                    resize: "resize(width, height): void",
                },
            }),
        })
    );

    const text = parseTextResponse(await tool.execute({ type: "Shape", member: "resize" }));
    assert.equal(text, "resize(width, height): void");
});

test("PenpotApiInfoTool reports missing type as tool execution failure text", async () => {
    const tool = new PenpotApiInfoTool(mcpServer, createApiDocs({}));
    const text = parseTextResponse(await tool.execute({ type: "MissingType" }));
    assert.match(text, /Tool execution failed/);
    assert.match(text, /API type "MissingType" not found/);
});

test("PenpotApiInfoTool reports missing member as tool execution failure text", async () => {
    const tool = new PenpotApiInfoTool(
        mcpServer,
        createApiDocs({
            shape: createApiType({
                overview: "Shape overview",
                fullText: "Shape overview",
                members: {},
            }),
        })
    );

    const text = parseTextResponse(await tool.execute({ type: "Shape", member: "missing" }));
    assert.match(text, /Tool execution failed/);
    assert.match(text, /Member "missing" not found in type "Shape"/);
});
