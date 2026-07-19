import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type { PenpotMcpServer } from "../src/PenpotMcpServer.js";
import {
    DEBUG_TOOLS_ENABLE_ENV,
    DebugGetAgentLogsTool,
    DebugToolsErrorCodes,
    assertNoSensitiveLogPayload,
    listAgentLogFileMetadata,
    projectAgentLogs,
    redactLogLine,
} from "../src/tools/DebugTools.js";

function parseJsonResponse(response: Awaited<ReturnType<DebugGetAgentLogsTool["execute"]>>) {
    const text = response.content[0];
    if (text.type !== "text") {
        throw new Error("Expected text response");
    }
    return JSON.parse(text.text);
}

function createServer(options: { debugToolsEnabled?: boolean; remoteMode?: boolean } = {}): PenpotMcpServer {
    return {
        isDebugToolsEnabled: () => options.debugToolsEnabled ?? false,
        getSessionContext: () => ({ userToken: "secret-session-token", mcpSessionId: "session-1" }),
        getStatus: () => ({
            status: "ok",
            server: {
                multiUserMode: true,
                remoteMode: options.remoteMode ?? true,
                debugToolsEnabled: options.debugToolsEnabled ?? false,
            },
        }),
    } as unknown as PenpotMcpServer;
}

test("redactLogLine strips tokens and auth headers", () => {
    const raw =
        'Authorization: Bearer super-secret-token userToken=abc123 Token xyz."token":"raw-value" cookie: a=b;';
    const redacted = redactLogLine(raw);
    assert.match(redacted, /\[REDACTED\]/);
    assert.equal(redacted.includes("super-secret-token"), false);
    assert.equal(redacted.includes("abc123"), false);
    assert.equal(redacted.includes("raw-value"), false);
    assertNoSensitiveLogPayload(redacted);
});

test("assertNoSensitiveLogPayload rejects obvious leaks", () => {
    assert.throws(() => assertNoSensitiveLogPayload("Authorization: Bearer leak"), /sensitive authorization/);
    assert.throws(() => assertNoSensitiveLogPayload("connect?userToken=leaked"), /userToken/);
});

test("listAgentLogFileMetadata returns name/size/mtime only", async () => {
    const dir = mkdtempSync(join(tmpdir(), "penpot-agent-logs-"));
    try {
        writeFileSync(join(dir, "a.log"), "hello");
        writeFileSync(join(dir, "notes.txt"), "ignore");
        const files = await listAgentLogFileMetadata(dir);
        assert.equal(files.length, 1);
        assert.equal(files[0].name, "a.log");
        assert.equal(files[0].sizeBytes, 5);
        assert.ok(files[0].modifiedAt);
        assert.equal("path" in files[0], false);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test("projectAgentLogs is metadata-only and path-safe", () => {
    const projection = projectAgentLogs({
        enabled: true,
        remoteMode: true,
        loggingStatus: {
            level: "info",
            file: { enabled: true, path: "/var/log/penpot/penpot-mcp-secret.log" },
            console: { enabled: true },
            loki: { enabled: false },
        },
        files: [{ name: "penpot-mcp-secret.log", sizeBytes: 10, modifiedAt: "2026-07-19T00:00:00.000Z" }],
    });

    assert.equal(projection.content, null);
    assert.equal(projection.contentPolicy, "metadata-only-default");
    assert.equal((projection.logging as { activeLogFileName: string }).activeLogFileName, "penpot-mcp-secret.log");
    assert.equal(JSON.stringify(projection).includes("/var/log"), false);
    assert.equal(JSON.stringify(projection).includes("secret-session"), false);
});

test("DebugGetAgentLogsTool returns structured disabled error by default", async () => {
    const tool = new DebugGetAgentLogsTool(createServer({ debugToolsEnabled: false }));
    const body = parseJsonResponse(await tool.execute({}));
    assert.equal(tool.getToolName(), "debug.get_agent_logs");
    assert.equal(body.status, "error");
    assert.equal(body.error.code, DebugToolsErrorCodes.DEBUG_TOOLS_DISABLED);
    assert.equal(body.error.config.env, DEBUG_TOOLS_ENABLE_ENV);
});

test("DebugGetAgentLogsTool returns metadata when enabled", async () => {
    const dir = mkdtempSync(join(tmpdir(), "penpot-agent-logs-enabled-"));
    const previous = process.env.PENPOT_MCP_LOG_DIR;
    try {
        writeFileSync(join(dir, "run.log"), "line\n");
        process.env.PENPOT_MCP_LOG_DIR = dir;
        const tool = new DebugGetAgentLogsTool(createServer({ debugToolsEnabled: true, remoteMode: true }));
        const body = parseJsonResponse(await tool.execute({}));
        assert.equal(body.status, "ok");
        assert.equal(body.data.adapter, "local");
        assert.equal(body.data.content, null);
        assert.equal(body.data.contentPolicy, "metadata-only-default");
        assert.ok(Array.isArray(body.data.files));
        assert.equal(body.data.files[0].name, "run.log");
        assert.equal(JSON.stringify(body).includes("secret-session-token"), false);
        assert.equal(JSON.stringify(body).includes(dir), false);
    } finally {
        if (previous === undefined) {
            delete process.env.PENPOT_MCP_LOG_DIR;
        } else {
            process.env.PENPOT_MCP_LOG_DIR = previous;
        }
        rmSync(dir, { recursive: true, force: true });
    }
});
