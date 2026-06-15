import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
    AdapterSelectionReasonCodes,
    CommandDescriptors,
    CommandErrorCodes,
    HeadlessAuthoringCommandDescriptors,
    LowRiskCommandDescriptors,
    MigratedCommandDescriptors,
    ShapeExportCommandDescriptors,
    createAdapterSelectionError,
    createCommandRequestEnvelope,
    createCommandResultEnvelope,
    getCommandDescriptor,
    getAdapterSelectionReason,
    selectCommandAdapter,
} from "@penpot/command-runtime";
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
    assert.match(result.stdout, /penpot-cli page rename/);
    assert.match(result.stdout, /penpot-cli shape delete/);
    assert.match(result.stdout, /penpot-cli prototype create-flow/);
    assert.match(result.stdout, /penpot-cli export page/);
    assert.match(result.stdout, /penpot-cli render preview/);
});

test("command runtime exposes low-risk command descriptors", () => {
    assert.deepEqual(
        LowRiskCommandDescriptors.map((descriptor) => descriptor.id),
        ["mcp.status", "mcp.config", "file.list", "file.create", "file.open", "page.list", "page.create"]
    );
    assert.equal(CommandDescriptors.MCP_STATUS.mcpToolName, "mcp.get_status");
    assert.equal(getCommandDescriptor("mcp.get_status").id, "mcp.status");
    assert.equal(getCommandDescriptor("page.list").cliCommand, "page list");
});

test("command runtime exposes headless authoring descriptors", () => {
    assert.deepEqual(
        HeadlessAuthoringCommandDescriptors.map((descriptor) => descriptor.id),
        ["page.rename", "prototype.create_flow", "prototype.create_interaction"]
    );
    assert.equal(CommandDescriptors.PAGE_RENAME.cliCommand, "page rename");
    assert.equal(CommandDescriptors.PAGE_RENAME.mcpToolName, "page.rename");
    assert.equal(CommandDescriptors.PROTOTYPE_CREATE_FLOW.cliCommand, "prototype create-flow");
    assert.equal(CommandDescriptors.PROTOTYPE_CREATE_INTERACTION.mcpToolName, "prototype.create_interaction");
    assert.equal(getCommandDescriptor("page rename").id, "page.rename");
    assert.equal(getCommandDescriptor("prototype create-flow").id, "prototype.create_flow");
});

test("command runtime exposes migrated shape and export descriptors", () => {
    assert.deepEqual(
        ShapeExportCommandDescriptors.map((descriptor) => descriptor.id),
        [
            "shape.create_frame",
            "shape.create_rect",
            "shape.create_text",
            "shape.create_image",
            "shape.update",
            "shape.delete",
            "export.shape",
            "export.page",
            "render.preview",
        ]
    );
    assert.equal(MigratedCommandDescriptors.length, 19);
    assert.equal(CommandDescriptors.SHAPE_DELETE.cliCommand, "shape delete");
    assert.equal(CommandDescriptors.SHAPE_CREATE_IMAGE.cliCommand, "shape create-image");
    assert.equal(CommandDescriptors.EXPORT_PAGE.mcpToolName, "export.page");
    assert.equal(getCommandDescriptor("shape create-frame").id, "shape.create_frame");
    assert.equal(getCommandDescriptor("shape create-image").id, "shape.create_image");
    assert.equal(getCommandDescriptor("render.preview").title, "Render preview");
    assert.equal(getCommandDescriptor("render preview").cliCommand, "render preview");
});

test("command runtime creates token-safe request and result envelopes", () => {
    const adapterSelection = selectCommandAdapter({
        command: CommandDescriptors.PAGE_LIST.id,
        requestedAdapter: "auto",
        candidates: [{ kind: "backend-command", available: true }],
    });
    const request = createCommandRequestEnvelope(CommandDescriptors.PAGE_LIST, {
        transport: "cli",
        input: { fileId: UUIDS.file },
        target: { fileId: UUIDS.file, unused: undefined },
        auth: { userTokenPresent: true, source: "test", token: "secret-value" },
        adapterSelection,
        diagnostics: { rpcCommand: "get-file-pages" },
    });
    const result = createCommandResultEnvelope(request, { pages: [] }, { warnings: ["none"] });

    assert.equal(request.command, "page.list");
    assert.equal(request.transport, "cli");
    assert.equal(request.descriptor.cliCommand, "page list");
    assert.equal(request.adapter, "backend-command");
    assert.deepEqual(request.target, { fileId: UUIDS.file });
    assert.deepEqual(request.auth, { userTokenPresent: true, source: "test" });
    assert.equal(Object.hasOwn(request.auth, "token"), false);
    assert.equal(result.status, "ok");
    assert.equal(result.adapterSelection.selected, "backend-command");
    assert.deepEqual(result.data, { pages: [] });
    assert.deepEqual(result.warnings, ["none"]);
});

test("command runtime centralizes adapter error payloads and reason text", () => {
    const selection = selectCommandAdapter({
        command: "page.list",
        requestedAdapter: "exporter",
        candidates: [
            {
                kind: "backend-command",
                available: false,
                reason: getAdapterSelectionReason(AdapterSelectionReasonCodes.BACKEND_COMMAND_FILE_ID_REQUIRED),
            },
        ],
    });
    const error = createAdapterSelectionError(selection, { actions: ["Use --adapter auto."] });

    assert.equal(selection.status, "unsupported");
    assert.equal(selection.candidates[0].reason, "backend-command requires an explicit fileId.");
    assert.equal(error.code, CommandErrorCodes.ADAPTER_NOT_SUPPORTED);
    assert.equal(error.message, "No available adapter matched 'exporter' for page.list.");
    assert.deepEqual(error.actions, ["Use --adapter auto."]);
    assert.equal(error.data.adapterSelection, selection);
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
        mode: "builtin",
        autoConnect: true,
        publicUri: "https://penpot.example.test",
        streamUri: "https://penpot.example.test/mcp/stream",
        sseUri: "https://penpot.example.test/mcp/sse",
        websocketUri: "https://penpot.example.test/mcp/ws",
        statusUri: "https://penpot.example.test/mcp/status",
        logDir: "/tmp/penpot-mcp-logs",
        profileProps: {
            "mcp-config": {
                mode: "builtin",
                "auto-connect": true,
                "public-uri": "https://penpot.example.test",
                "stream-uri": "https://penpot.example.test/mcp/stream",
                "sse-uri": "https://penpot.example.test/mcp/sse",
                "websocket-uri": "https://penpot.example.test/mcp/ws",
                "status-uri": "https://penpot.example.test/mcp/status",
            },
        },
    });
});

test("mcp config reports local mode using persisted config field names", async () => {
    const result = await runCli(["mcp", "config", "--mode", "local", "--format", "json"]);
    const body = parseJson(result.stdout);

    assert.equal(result.exitCode, 0);
    assert.equal(result.stderr, "");
    assert.equal(body.status, "ok");
    assert.equal(body.data.mode, "local");
    assert.equal(body.data.publicUri, "http://localhost:4401");
    assert.deepEqual(body.data.profileProps["mcp-config"], {
        mode: "local",
        "auto-connect": true,
        "public-uri": "http://localhost:4401",
        "stream-uri": "http://localhost:4401/mcp",
        "sse-uri": "http://localhost:4401/sse",
        "websocket-uri": "ws://localhost:4402",
        "status-uri": "http://localhost:4401/status",
    });
});

test("mcp config reports custom mode and auto-connect override", async () => {
    const result = await runCli(["mcp", "config", "--mode", "custom", "--auto-connect", "false", "--format", "json"], {
        PENPOT_MCP_PUBLIC_URI: "https://external-mcp.example",
        PENPOT_MCP_STREAM_URI: "https://stream.external.example/mcp",
    });
    const body = parseJson(result.stdout);

    assert.equal(result.exitCode, 0);
    assert.equal(result.stderr, "");
    assert.equal(body.status, "ok");
    assert.equal(body.data.mode, "custom");
    assert.equal(body.data.autoConnect, false);
    assert.deepEqual(body.data.profileProps["mcp-config"], {
        mode: "custom",
        "auto-connect": false,
        "public-uri": "https://external-mcp.example",
        "stream-uri": "https://stream.external.example/mcp",
        "sse-uri": "https://external-mcp.example/mcp/sse",
        "websocket-uri": "https://external-mcp.example/mcp/ws",
        "status-uri": "https://external-mcp.example/mcp/status",
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
    const expectedUrl =
        "https://penpot.example.test/#/workspace?file-id=00000000-0000-0000-0000-000000000001&team-id=team-1&page-id=00000000-0000-0000-0000-000000000002";
    assert.equal(body.data.url, expectedUrl);
    assert.equal(body.data.workspaceUrl, expectedUrl);
    assert.equal(body.data.handoff.status, "url_returned");
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

test("page rename calls backend-command RPC with trimmed name", async () => {
    const originalFetch = globalThis.fetch;
    const calls = [];
    globalThis.fetch = async (url, options) => {
        calls.push({ url: String(url), options });
        return {
            ok: true,
            status: 200,
            statusText: "OK",
            text: async () =>
                JSON.stringify({
                    page: { id: UUIDS.page, name: "Renamed" },
                    revn: 2,
                    vern: 0,
                }),
        };
    };

    try {
        const result = await runCli(
            [
                "page",
                "rename",
                "--file",
                UUIDS.file,
                "--page",
                UUIDS.page,
                "--name",
                " Renamed ",
                "--format",
                "json",
            ],
            {
                PENPOT_BACKEND_URI: "http://127.0.0.1:6060",
                PENPOT_CLI_TOKEN: "token-1",
            }
        );
        const body = parseJson(result.stdout);

        assert.equal(result.exitCode, 0);
        assert.equal(result.stderr, "");
        assert.equal(calls.length, 1);
        assert.match(calls[0].url, /\/api\/main\/methods\/rename-file-page\?_fmt=json$/);
        assert.equal(calls[0].options.method, "POST");
        assert.equal(calls[0].options.headers.authorization, "Token token-1");
        assert.deepEqual(JSON.parse(calls[0].options.body), {
            id: UUIDS.file,
            "page-id": UUIDS.page,
            name: "Renamed",
        });
        assert.equal(body.status, "ok");
        assert.equal(body.data.adapter, "backend-command");
        assert.equal(body.data.adapterSelection.command, "page.rename");
        assert.deepEqual(body.data.page, { id: UUIDS.page, name: "Renamed" });
        assert.equal(body.data.revn, 2);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("shape update sends rich style, hierarchy, and layout fields to backend-command RPC", async () => {
    const originalFetch = globalThis.fetch;
    const calls = [];
    globalThis.fetch = async (url, options) => {
        calls.push({ url: String(url), options });
        return {
            ok: true,
            status: 200,
            statusText: "OK",
            text: async () =>
                JSON.stringify({
                    shape: {
                        id: UUIDS.object,
                        name: "CTA",
                        type: "rect",
                        pageId: UUIDS.page,
                        parentId: UUIDS.profile,
                    },
                    revn: 3,
                    vern: 0,
                }),
        };
    };

    try {
        const result = await runCli(
            [
                "shape",
                "update",
                "--file",
                UUIDS.file,
                "--page",
                UUIDS.page,
                "--shape",
                UUIDS.object,
                "--parent",
                UUIDS.profile,
                "--index",
                "0",
                "--fill",
                "#3366ff",
                "--fill-opacity",
                "0.8",
                "--fill",
                "#ffffff",
                "--stroke",
                "#2244aa",
                "--stroke-opacity",
                "1",
                "--stroke-width",
                "2",
                "--stroke-style",
                "solid",
                "--stroke-alignment",
                "inner",
                "--stroke",
                "#112244",
                "--stroke-opacity",
                "0.5",
                "--stroke-style",
                "dotted",
                "--stroke-alignment",
                "outer",
                "--border-radius",
                "8",
                "--r1",
                "4",
                "--r2",
                "6",
                "--r3",
                "8",
                "--r4",
                "10",
                "--layout",
                "flex",
                "--layout-direction",
                "column",
                "--layout-wrap",
                "wrap",
                "--layout-align-items",
                "center",
                "--layout-justify-content",
                "space-between",
                "--layout-row-gap",
                "12",
                "--layout-column-gap",
                "8",
                "--layout-padding",
                "16",
                "--format",
                "json",
            ],
            {
                PENPOT_BACKEND_URI: "http://127.0.0.1:6060",
                PENPOT_CLI_TOKEN: "token-1",
            }
        );
        const body = parseJson(result.stdout);

        assert.equal(result.exitCode, 0);
        assert.equal(result.stderr, "");
        assert.equal(calls.length, 1);
        assert.match(calls[0].url, /\/api\/main\/methods\/update-file-shape\?_fmt=json$/);
        assert.equal(calls[0].options.method, "POST");
        assert.deepEqual(JSON.parse(calls[0].options.body), {
            id: UUIDS.file,
            "page-id": UUIDS.page,
            "shape-id": UUIDS.object,
            "parent-id": UUIDS.profile,
            index: 0,
            fill: { color: "#3366ff", opacity: 0.8 },
            fills: [{ color: "#3366ff", opacity: 0.8 }, { color: "#ffffff" }],
            stroke: {
                color: "#2244aa",
                opacity: 1,
                width: 2,
                style: "solid",
                alignment: "inner",
            },
            strokes: [
                {
                    color: "#2244aa",
                    opacity: 1,
                    width: 2,
                    style: "solid",
                    alignment: "inner",
                },
                {
                    color: "#112244",
                    opacity: 0.5,
                    style: "dotted",
                    alignment: "outer",
                },
            ],
            "border-radius": 8,
            r1: 4,
            r2: 6,
            r3: 8,
            r4: 10,
            layout: {
                type: "flex",
                direction: "column",
                wrap: "wrap",
                "align-items": "center",
                "justify-content": "space-between",
                "row-gap": 12,
                "column-gap": 8,
                padding: 16,
            },
        });
        assert.equal(body.status, "ok");
        assert.equal(body.data.adapter, "backend-command");
        assert.equal(body.data.adapterSelection.command, "shape.update");
        assert.equal(body.data.shape.parentId, UUIDS.profile);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("shape create-image reads a local image and sends backend-command RPC", async () => {
    const originalFetch = globalThis.fetch;
    const calls = [];
    const tempDir = mkdtempSync(join(tmpdir(), "penpot-cli-image-"));
    const imagePath = join(tempDir, "hero.png");
    writeFileSync(imagePath, Buffer.from("hello"));

    globalThis.fetch = async (url, options) => {
        calls.push({ url: String(url), options });
        return {
            ok: true,
            status: 200,
            statusText: "OK",
            text: async () =>
                JSON.stringify({
                    shape: {
                        id: UUIDS.object,
                        name: "Hero",
                        type: "rect",
                        pageId: UUIDS.page,
                    },
                    media: {
                        id: UUIDS.profile,
                        name: "Hero",
                        width: 575,
                        height: 416,
                        mtype: "image/png",
                    },
                    revn: 4,
                    vern: 0,
                }),
        };
    };

    try {
        const result = await runCli(
            [
                "shape",
                "create-image",
                "--file",
                UUIDS.file,
                "--page",
                UUIDS.page,
                "--shape-id",
                UUIDS.object,
                "--parent",
                UUIDS.profile,
                "--image",
                imagePath,
                "--name",
                "Hero",
                "--x",
                "12",
                "--y",
                "24",
                "--width",
                "575",
                "--format",
                "json",
            ],
            {
                PENPOT_BACKEND_URI: "http://127.0.0.1:6060",
                PENPOT_CLI_TOKEN: "token-1",
            }
        );
        const body = parseJson(result.stdout);

        assert.equal(result.exitCode, 0);
        assert.equal(result.stderr, "");
        assert.equal(calls.length, 1);
        assert.match(calls[0].url, /\/api\/main\/methods\/create-file-image-shape\?_fmt=json$/);
        assert.deepEqual(JSON.parse(calls[0].options.body), {
            id: UUIDS.file,
            "page-id": UUIDS.page,
            "shape-id": UUIDS.object,
            "parent-id": UUIDS.profile,
            name: "Hero",
            x: 12,
            y: 24,
            width: 575,
            "image-base64": "aGVsbG8=",
            "mime-type": "image/png",
        });
        assert.equal(body.status, "ok");
        assert.equal(body.data.adapter, "backend-command");
        assert.equal(body.data.adapterSelection.command, "shape.create_image");
        assert.equal(body.data.source.name, "hero.png");
        assert.equal(body.data.media.mtype, "image/png");
    } finally {
        globalThis.fetch = originalFetch;
        rmSync(tempDir, { recursive: true, force: true });
    }
});

test("prototype create-flow sends backend-command RPC", async () => {
    const originalFetch = globalThis.fetch;
    const calls = [];
    globalThis.fetch = async (url, options) => {
        calls.push({ url: String(url), options });
        return {
            ok: true,
            status: 200,
            statusText: "OK",
            text: async () =>
                JSON.stringify({
                    flow: {
                        id: UUIDS.profile,
                        name: "Checkout",
                        pageId: UUIDS.page,
                        startingBoardId: UUIDS.object,
                    },
                    revn: 5,
                    vern: 0,
                }),
        };
    };

    try {
        const result = await runCli(
            [
                "prototype",
                "create-flow",
                "--file",
                UUIDS.file,
                "--page",
                UUIDS.page,
                "--flow-id",
                UUIDS.profile,
                "--name",
                " Checkout ",
                "--starting-board",
                UUIDS.object,
                "--format",
                "json",
            ],
            {
                PENPOT_BACKEND_URI: "http://127.0.0.1:6060",
                PENPOT_CLI_TOKEN: "token-1",
            }
        );
        const body = parseJson(result.stdout);

        assert.equal(result.exitCode, 0);
        assert.equal(result.stderr, "");
        assert.equal(calls.length, 1);
        assert.match(calls[0].url, /\/api\/main\/methods\/create-file-prototype-flow\?_fmt=json$/);
        assert.deepEqual(JSON.parse(calls[0].options.body), {
            id: UUIDS.file,
            "page-id": UUIDS.page,
            "flow-id": UUIDS.profile,
            name: "Checkout",
            "starting-board-id": UUIDS.object,
        });
        assert.equal(body.status, "ok");
        assert.equal(body.data.adapter, "backend-command");
        assert.equal(body.data.adapterSelection.command, "prototype.create_flow");
        assert.equal(body.data.flow.name, "Checkout");
        assert.equal(body.data.revn, 5);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("prototype create-interaction sends navigate interaction backend-command RPC", async () => {
    const originalFetch = globalThis.fetch;
    const calls = [];
    globalThis.fetch = async (url, options) => {
        calls.push({ url: String(url), options });
        return {
            ok: true,
            status: 200,
            statusText: "OK",
            text: async () =>
                JSON.stringify({
                    interaction: {
                        sourceShapeId: UUIDS.object,
                        destinationBoardId: UUIDS.profile,
                        index: 0,
                        actionType: "navigate-to",
                    },
                    revn: 6,
                    vern: 0,
                }),
        };
    };

    try {
        const result = await runCli(
            [
                "prototype",
                "create-interaction",
                "--file",
                UUIDS.file,
                "--page",
                UUIDS.page,
                "--source",
                UUIDS.object,
                "--destination",
                UUIDS.profile,
                "--delay",
                "1200",
                "--preserve-scroll",
                "--animation",
                "slide",
                "--animation-duration",
                "250",
                "--animation-easing",
                "ease-in-out",
                "--animation-direction",
                "right",
                "--animation-way",
                "in",
                "--offset-effect",
                "--format",
                "json",
            ],
            {
                PENPOT_BACKEND_URI: "http://127.0.0.1:6060",
                PENPOT_CLI_TOKEN: "token-1",
            }
        );
        const body = parseJson(result.stdout);

        assert.equal(result.exitCode, 0);
        assert.equal(result.stderr, "");
        assert.equal(calls.length, 1);
        assert.match(calls[0].url, /\/api\/main\/methods\/create-file-prototype-interaction\?_fmt=json$/);
        assert.deepEqual(JSON.parse(calls[0].options.body), {
            id: UUIDS.file,
            "page-id": UUIDS.page,
            "source-shape-id": UUIDS.object,
            "destination-board-id": UUIDS.profile,
            trigger: "after-delay",
            delay: 1200,
            "preserve-scroll-position": true,
            animation: {
                type: "slide",
                duration: 250,
                easing: "ease-in-out",
                direction: "right",
                way: "in",
                "offset-effect": true,
            },
        });
        assert.equal(body.status, "ok");
        assert.equal(body.data.adapter, "backend-command");
        assert.equal(body.data.adapterSelection.command, "prototype.create_interaction");
        assert.equal(body.data.interaction.actionType, "navigate-to");
        assert.equal(body.data.revn, 6);
    } finally {
        globalThis.fetch = originalFetch;
    }
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

test("render preview dry-run returns exporter adapter plan and artifact metadata", async () => {
    const result = await runCli(
        [
            "render",
            "preview",
            "--file",
            UUIDS.file,
            "--page",
            UUIDS.page,
            "--object",
            UUIDS.object,
            "--profile-id",
            UUIDS.profile,
            "--scale",
            "1.5",
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
    assert.equal(body.data.command, "render.preview");
    assert.equal(body.data.adapter, "exporter");
    assert.equal(body.data.artifact.kind, "preview");
    assert.equal(body.data.artifact.mimeType, "image/png");
    assert.equal(body.data.artifact.target.objectId, UUIDS.object);
    assert.equal(body.data.request.cmd, "export-shapes");
    assert.equal(body.data.request.exports[0].type, "png");
    assert.equal(body.data.request.exports[0].scale, 1.5);
});

test("render preview executes exporter request and writes output artifact", async () => {
    const originalFetch = globalThis.fetch;
    const tempDir = mkdtempSync(join(tmpdir(), "penpot-cli-preview-"));
    const outputPath = join(tempDir, "preview.png");
    const calls = [];

    globalThis.fetch = async (url, options = {}) => {
        calls.push({ url: String(url), options });
        if (String(url) === "http://127.0.0.1:6061") {
            return {
                ok: true,
                status: 200,
                statusText: "OK",
                headers: {
                    get: (name) => (name.toLowerCase() === "content-type" ? "application/json" : null),
                },
                text: async () =>
                    JSON.stringify({
                        id: "resource-1",
                        uri: "http://127.0.0.1:6061/resource/1",
                        mtype: "image/png",
                        filename: "preview.png",
                    }),
            };
        }

        return {
            ok: true,
            status: 200,
            statusText: "OK",
            headers: {
                get: (name) => (name.toLowerCase() === "content-type" ? "image/png" : null),
                has: () => false,
            },
            arrayBuffer: async () => new Uint8Array([137, 80, 78, 71]).buffer,
        };
    };

    try {
        const result = await runCli(
            [
                "render",
                "preview",
                "--file",
                UUIDS.file,
                "--page",
                UUIDS.page,
                "--object",
                UUIDS.object,
                "--profile-id",
                UUIDS.profile,
                "--output",
                outputPath,
                "--format",
                "json",
            ],
            {
                PENPOT_EXPORTER_URI: "http://127.0.0.1:6061",
                PENPOT_CLI_TOKEN: "token-1",
            }
        );
        const body = parseJson(result.stdout);

        assert.equal(result.exitCode, 0);
        assert.equal(result.stderr, "");
        assert.equal(calls.length, 2);
        assert.equal(calls[0].options.method, "POST");
        assert.equal(calls[0].options.headers.cookie, "auth-token=token-1");
        assert.match(calls[0].options.body, /~:export-shapes/);
        assert.match(calls[0].options.body, /~:type/);
        assert.equal(calls[1].url, "http://127.0.0.1:6061/resource/1");
        assert.deepEqual([...readFileSync(outputPath)], [137, 80, 78, 71]);
        assert.equal(body.status, "ok");
        assert.equal(body.data.command, "render.preview");
        assert.equal(body.data.artifact.kind, "preview");
        assert.equal(body.data.downloadedResource.path, outputPath);
        assert.equal(body.data.downloadedResource.contentType, "image/png");
    } finally {
        globalThis.fetch = originalFetch;
        rmSync(tempDir, { recursive: true, force: true });
    }
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
