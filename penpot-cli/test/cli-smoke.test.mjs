import assert from "node:assert/strict";
import test from "node:test";
import { run } from "../dist/index.js";

const UUIDS = {
    file: "00000000-0000-0000-0000-000000000001",
    page: "00000000-0000-0000-0000-000000000002",
    object: "00000000-0000-0000-0000-000000000003",
    profile: "00000000-0000-0000-0000-000000000004",
};

function createCapture() {
    let stdout = "";
    let stderr = "";
    return {
        io: {
            stdout: {
                write(chunk) {
                    stdout += String(chunk);
                    return true;
                },
            },
            stderr: {
                write(chunk) {
                    stderr += String(chunk);
                    return true;
                },
            },
        },
        output() {
            return { stdout, stderr };
        },
    };
}

async function runCli(argv, env = {}) {
    const capture = createCapture();
    const exitCode = await run(argv, capture.io, env);
    return {
        exitCode,
        ...capture.output(),
    };
}

function parseJson(stdout) {
    return JSON.parse(stdout);
}

test("top-level help lists first-class MCP, shape, and export commands", async () => {
    const result = await runCli(["--help"]);

    assert.equal(result.exitCode, 0);
    assert.equal(result.stderr, "");
    assert.match(result.stdout, /penpot-cli mcp config/);
    assert.match(result.stdout, /penpot-cli shape delete/);
    assert.match(result.stdout, /penpot-cli export page/);
});

test("mcp config derives stable public MCP surfaces from environment", async () => {
    const result = await runCli(["mcp", "config", "--format", "json"], {
        PENPOT_MCP_PUBLIC_URI: "https://penpot.example.test/",
        PENPOT_MCP_LOG_DIR: "/tmp/penpot-mcp-logs",
    });
    const body = parseJson(result.stdout);

    assert.equal(result.exitCode, 0);
    assert.equal(result.stderr, "");
    assert.equal(body.status, "ok");
    assert.deepEqual(body.data, {
        publicUri: "https://penpot.example.test",
        streamUri: "https://penpot.example.test/mcp/stream",
        sseUri: "https://penpot.example.test/mcp/sse",
        websocketUri: "https://penpot.example.test/mcp/ws",
        statusUri: "https://penpot.example.test/mcp/status",
        logDir: "/tmp/penpot-mcp-logs",
    });
});

test("dev up dry-run reports MCP surfaces without starting services", async () => {
    const result = await runCli(["dev", "up", "--mcp", "--dry-run", "--format", "json"], {
        PENPOT_MCP_PUBLIC_URI: "http://127.0.0.1:3449",
    });
    const body = parseJson(result.stdout);

    assert.equal(result.exitCode, 0);
    assert.equal(body.status, "ok");
    assert.equal(body.data.mcpEnabled, true);
    assert.equal(body.data.dryRun, true);
    assert.equal(body.data.surfaces.mcpStream, "http://127.0.0.1:3449/mcp/stream");
    assert.ok(body.data.readinessChecks.includes("GET http://127.0.0.1:3449/mcp/status"));
});

test("file open emits a workspace URL and does not claim to bind MCP context", async () => {
    const result = await runCli(["file", "open", UUIDS.file, "--team-id", "team-1", "--page-id", UUIDS.page, "--format", "json"], {
        PENPOT_PUBLIC_URI: "https://penpot.example.test",
    });
    const body = parseJson(result.stdout);

    assert.equal(result.exitCode, 0);
    assert.equal(body.status, "ok");
    assert.equal(body.data.adapter, "browser-url");
    assert.equal(body.data.boundContext, false);
    assert.equal(
        body.data.url,
        "https://penpot.example.test/#/workspace?file-id=00000000-0000-0000-0000-000000000001&team-id=team-1&page-id=00000000-0000-0000-0000-000000000002"
    );
});

test("export page dry-run returns exporter adapter plan and request payload", async () => {
    const result = await runCli(
        [
            "export",
            "page",
            "--file",
            UUIDS.file,
            "--page",
            UUIDS.page,
            "--object",
            UUIDS.object,
            "--profile-id",
            UUIDS.profile,
            "--export-format",
            "svg",
            "--scale",
            "2",
            "--dry-run",
            "--format",
            "json",
        ],
        {
            PENPOT_EXPORTER_URI: "http://127.0.0.1:6061",
        }
    );
    const body = parseJson(result.stdout);

    assert.equal(result.exitCode, 0);
    assert.equal(body.status, "ok");
    assert.equal(body.data.command, "export.page");
    assert.equal(body.data.adapter, "exporter");
    assert.equal(body.data.adapterSelection.status, "selected");
    assert.equal(body.data.requires.length, 0);
    assert.equal(body.data.request.cmd, "export-shapes");
    assert.equal(body.data.request.exports[0]["file-id"], UUIDS.file);
    assert.equal(body.data.request.exports[0]["page-id"], UUIDS.page);
    assert.equal(body.data.request.exports[0]["object-id"], UUIDS.object);
    assert.equal(body.data.request.exports[0].type, "svg");
    assert.equal(body.data.request.exports[0].scale, 2);
});

test("export page dry-run rejects plugin-live adapter with structured error", async () => {
    const result = await runCli([
        "export",
        "page",
        "--file",
        UUIDS.file,
        "--page",
        UUIDS.page,
        "--object",
        UUIDS.object,
        "--profile-id",
        UUIDS.profile,
        "--adapter",
        "plugin-live",
        "--dry-run",
        "--format",
        "json",
    ]);
    const body = parseJson(result.stdout);

    assert.equal(result.exitCode, 2);
    assert.equal(result.stderr, "");
    assert.equal(body.status, "error");
    assert.equal(body.error.code, "adapter_not_available");
    assert.equal(body.error.data.adapterSelection.command, "export.page");
    assert.equal(body.error.data.adapterSelection.requested, "plugin-live");
});

test("shape update validates that at least one update field is present before RPC", async () => {
    const result = await runCli(["shape", "update", "--file", UUIDS.file, "--shape", UUIDS.object, "--format", "json"], {
        PENPOT_CLI_TOKEN: "token-1",
    });
    const body = parseJson(result.stdout);

    assert.equal(result.exitCode, 2);
    assert.equal(result.stderr, "");
    assert.equal(body.status, "error");
    assert.equal(body.error.code, "shape_update_empty");
});
