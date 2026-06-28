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
    LiveGapCommandDescriptors,
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

const mcpUrlDerivationFixtures = JSON.parse(
    readFileSync(new URL("../../mcp/docs/mcp-url-derivation-fixtures.json", import.meta.url), "utf8")
);

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

function pickMcpConfigFields(data) {
    return {
        mode: data.mode,
        autoConnect: data.autoConnect,
        publicUri: data.publicUri,
        streamUri: data.streamUri,
        sseUri: data.sseUri,
        websocketUri: data.websocketUri,
        statusUri: data.statusUri,
    };
}

function createMcpFixtureEnv(fixture) {
    const env = {
        PENPOT_BACKEND_URI: "http://127.0.0.1:6060",
        PENPOT_CLI_TOKEN: "token-1",
    };
    if (fixture.expected.publicUri === mcpUrlDerivationFixtures.runtimeDefaults.publicUri) {
        env.PENPOT_MCP_PUBLIC_URI = mcpUrlDerivationFixtures.runtimeDefaults.publicUri;
    }
    return env;
}

test("top-level help lists first-class MCP, shape, and export commands", async () => {
    const result = await runCli(["--help"]);

    assert.equal(result.exitCode, 0);
    assert.equal(result.stderr, "");
    assert.match(result.stdout, /penpot-cli mcp config/);
    assert.match(result.stdout, /penpot-cli page rename/);
    assert.match(result.stdout, /penpot-cli shape delete/);
    assert.match(result.stdout, /penpot-cli shape set-layout/);
    assert.match(result.stdout, /penpot-cli shape set-style/);
    assert.match(result.stdout, /penpot-cli prototype create-flow/);
    assert.match(result.stdout, /penpot-cli prototype create-overlay/);
    assert.match(result.stdout, /penpot-cli prototype delete-interaction/);
    assert.match(result.stdout, /penpot-cli prototype update-interaction/);
    assert.match(result.stdout, /penpot-cli prototype reorder-interaction/);
    assert.match(result.stdout, /penpot-cli prototype duplicate-interaction/);
    assert.match(result.stdout, /penpot-cli export page/);
    assert.match(result.stdout, /penpot-cli export file/);
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
        ["page.rename", "prototype.create_flow", "prototype.create_interaction", "prototype.create_overlay"]
    );
    assert.equal(CommandDescriptors.PAGE_RENAME.cliCommand, "page rename");
    assert.equal(CommandDescriptors.PAGE_RENAME.mcpToolName, "page.rename");
    assert.equal(CommandDescriptors.PROTOTYPE_CREATE_FLOW.cliCommand, "prototype create-flow");
    assert.equal(CommandDescriptors.PROTOTYPE_CREATE_INTERACTION.mcpToolName, "prototype.create_interaction");
    assert.equal(CommandDescriptors.PROTOTYPE_CREATE_OVERLAY.cliCommand, "prototype create-overlay");
    assert.equal(getCommandDescriptor("page rename").id, "page.rename");
    assert.equal(getCommandDescriptor("prototype create-flow").id, "prototype.create_flow");
    assert.equal(getCommandDescriptor("prototype create-overlay").id, "prototype.create_overlay");
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
            "export.file",
            "render.preview",
            "render.thumbnail",
        ]
    );
    assert.equal(MigratedCommandDescriptors.length, 32);
    assert.equal(CommandDescriptors.SHAPE_DELETE.cliCommand, "shape delete");
    assert.equal(CommandDescriptors.SHAPE_CREATE_IMAGE.cliCommand, "shape create-image");
    assert.equal(CommandDescriptors.SHAPE_SET_LAYOUT.cliCommand, "shape set-layout");
    assert.equal(CommandDescriptors.SHAPE_SET_STYLE.cliCommand, "shape set-style");
    assert.equal(CommandDescriptors.EXPORT_PAGE.mcpToolName, "export.page");
    assert.equal(CommandDescriptors.EXPORT_FILE.mcpToolName, "export.file");
    assert.equal(CommandDescriptors.EXPORT_FILE.cliCommand, "export file");
    assert.deepEqual(CommandDescriptors.EXPORT_FILE.adapters, ["backend-rpc"]);
    assert.equal(CommandDescriptors.RENDER_THUMBNAIL.mcpToolName, "render.thumbnail");
    assert.equal(CommandDescriptors.RENDER_THUMBNAIL.cliCommand, undefined);
    assert.deepEqual(CommandDescriptors.RENDER_THUMBNAIL.adapters, []);
    assert.match(CommandDescriptors.RENDER_THUMBNAIL.description, /dashboard file thumbnails/);
    assert.match(CommandDescriptors.RENDER_THUMBNAIL.inputSchema, /cachePolicy=reuse\|refresh/);
    assert.equal(getCommandDescriptor("shape create-frame").id, "shape.create_frame");
    assert.equal(getCommandDescriptor("shape create-image").id, "shape.create_image");
    assert.equal(getCommandDescriptor("shape set-layout").id, "shape.set_layout");
    assert.equal(getCommandDescriptor("shape set-style").id, "shape.set_style");
    assert.equal(getCommandDescriptor("export.file").id, "export.file");
    assert.equal(getCommandDescriptor("export file").id, "export.file");
    assert.equal(getCommandDescriptor("render.preview").title, "Render preview");
    assert.equal(getCommandDescriptor("render preview").cliCommand, "render preview");
    assert.equal(getCommandDescriptor("render.thumbnail").title, "Render thumbnail");
});

test("command runtime exposes live-gap descriptor boundaries", () => {
    assert.deepEqual(
        LiveGapCommandDescriptors.map((descriptor) => descriptor.id),
        [
            "page.set_current",
            "selection.get",
            "selection.set",
            "prototype.list_interactions",
            "prototype.delete_interaction",
            "prototype.update_interaction",
            "prototype.reorder_interaction",
            "prototype.duplicate_interaction",
            "shape.set_layout",
            "shape.set_style",
        ]
    );
    assert.equal(MigratedCommandDescriptors.length, 32);
    assert.equal(CommandDescriptors.PAGE_SET_CURRENT.mcpToolName, "page.set_current");
    assert.equal(CommandDescriptors.PAGE_SET_CURRENT.cliCommand, undefined);
    assert.equal(getCommandDescriptor("selection.get").adapters[0], "plugin-live");
    assert.equal(getCommandDescriptor("selection.set").adapters[0], "plugin-live");
    assert.equal(getCommandDescriptor("selection.set").cliCommand, undefined);
    assert.equal(getCommandDescriptor("prototype list-interactions").id, "prototype.list_interactions");
    assert.equal(getCommandDescriptor("prototype delete-interaction").id, "prototype.delete_interaction");
    assert.equal(getCommandDescriptor("prototype update-interaction").id, "prototype.update_interaction");
    assert.equal(getCommandDescriptor("prototype reorder-interaction").id, "prototype.reorder_interaction");
    assert.equal(getCommandDescriptor("prototype duplicate-interaction").id, "prototype.duplicate_interaction");
    assert.deepEqual(CommandDescriptors.PROTOTYPE_DELETE_INTERACTION.adapters, ["backend-command"]);
    assert.match(CommandDescriptors.PROTOTYPE_LIST_INTERACTIONS.responseShape, /identity.kind stable-id\|source-index/);
    assert.equal(CommandDescriptors.PROTOTYPE_DELETE_INTERACTION.cliCommand, "prototype delete-interaction");
    assert.match(CommandDescriptors.PROTOTYPE_DELETE_INTERACTION.description, /sourceShapeId/);
    assert.match(CommandDescriptors.PROTOTYPE_DELETE_INTERACTION.inputSchema, /interactionIndex/);
    assert.match(CommandDescriptors.PROTOTYPE_DELETE_INTERACTION.inputSchema, /interactionId/);
    assert.deepEqual(CommandDescriptors.PROTOTYPE_UPDATE_INTERACTION.adapters, ["backend-command"]);
    assert.equal(CommandDescriptors.PROTOTYPE_UPDATE_INTERACTION.cliCommand, "prototype update-interaction");
    assert.match(CommandDescriptors.PROTOTYPE_UPDATE_INTERACTION.inputSchema, /actionType immutable/);
    assert.deepEqual(CommandDescriptors.PROTOTYPE_REORDER_INTERACTION.adapters, ["backend-command"]);
    assert.equal(CommandDescriptors.PROTOTYPE_REORDER_INTERACTION.cliCommand, "prototype reorder-interaction");
    assert.match(CommandDescriptors.PROTOTYPE_REORDER_INTERACTION.inputSchema, /same source shape only/);
    assert.deepEqual(CommandDescriptors.PROTOTYPE_DUPLICATE_INTERACTION.adapters, ["backend-command"]);
    assert.equal(CommandDescriptors.PROTOTYPE_DUPLICATE_INTERACTION.cliCommand, "prototype duplicate-interaction");
    assert.match(CommandDescriptors.PROTOTYPE_DUPLICATE_INTERACTION.inputSchema, /generates new interactionId/);
    assert.deepEqual(CommandDescriptors.SHAPE_SET_LAYOUT.adapters, ["backend-command", "plugin-live"]);
    assert.deepEqual(CommandDescriptors.SHAPE_SET_STYLE.adapters, ["backend-command", "plugin-live"]);
    assert.equal(CommandDescriptors.SHAPE_SET_LAYOUT.cliCommand, "shape set-layout");
    assert.equal(CommandDescriptors.SHAPE_SET_STYLE.cliCommand, "shape set-style");
    assert.equal(
        getAdapterSelectionReason(AdapterSelectionReasonCodes.CLI_LIVE_WORKSPACE_STATE_UNSUPPORTED),
        "CLI commands do not read or mutate editor-local workspace state; use MCP file.open, file.get_context, and file.bind_context before retrying the live-only tool."
    );
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
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
        throw new Error("mcp config should not read the backend unless profile-source is enabled");
    };
    const result = await runCli(["mcp", "config", "--format", "json"], {
        PENPOT_MCP_PUBLIC_URI: "https://penpot.example.test/",
        PENPOT_MCP_LOG_DIR: "/tmp/penpot-mcp-logs",
    });

    try {
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
            configSource: {
                profileSource: "off",
                status: "disabled",
                backendUri: null,
                profileId: null,
                warnings: [],
            },
            fieldSources: {
                mode: "default",
                autoConnect: "default",
                publicUri: "env",
                streamUri: "derived",
                sseUri: "derived",
                websocketUri: "derived",
                statusUri: "derived",
                logDir: "env",
            },
        });
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("mcp config reports local mode using persisted config field names", async () => {
    const result = await runCli(["mcp", "config", "--mode", "local", "--format", "json"]);
    const body = parseJson(result.stdout);

    assert.equal(result.exitCode, 0);
    assert.equal(result.stderr, "");
    assert.equal(body.status, "ok");
    assert.equal(body.data.mode, "local");
    assert.equal(body.data.publicUri, "http://localhost:4401");
    assert.equal(body.data.configSource.profileSource, "off");
    assert.equal(body.data.fieldSources.mode, "flag");
    assert.equal(body.data.fieldSources.websocketUri, "derived");
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
    assert.equal(body.data.fieldSources.mode, "flag");
    assert.equal(body.data.fieldSources.autoConnect, "flag");
    assert.equal(body.data.fieldSources.publicUri, "env");
    assert.equal(body.data.fieldSources.streamUri, "env");
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

test("mcp config matches canonical URL derivation fixtures", async (t) => {
    for (const fixture of mcpUrlDerivationFixtures.cases) {
        await t.test(fixture.id, async () => {
            const originalFetch = globalThis.fetch;
            globalThis.fetch = async () => ({
                ok: true,
                status: 200,
                statusText: "OK",
                headers: { get: () => "application/json" },
                text: async () =>
                    JSON.stringify({
                        id: UUIDS.profile,
                        props: fixture.profileProps,
                    }),
            });

            try {
                const result = await runCli(
                    ["mcp", "config", "--profile-source", "backend", "--format", "json"],
                    createMcpFixtureEnv(fixture)
                );
                const body = parseJson(result.stdout);

                assert.equal(result.exitCode, 0);
                assert.equal(result.stderr, "");
                assert.equal(body.status, "ok");
                assert.equal(body.data.configSource.status, "loaded");
                assert.deepEqual(pickMcpConfigFields(body.data), fixture.expected);
            } finally {
                globalThis.fetch = originalFetch;
            }
        });
    }
});

test("mcp config reads authenticated profile source from backend", async () => {
    const originalFetch = globalThis.fetch;
    const calls = [];
    globalThis.fetch = async (url, options) => {
        calls.push({ url: String(url), options });
        return {
            ok: true,
            status: 200,
            statusText: "OK",
            headers: { get: () => "application/json" },
            text: async () =>
                JSON.stringify({
                    id: UUIDS.profile,
                    props: {
                        "mcp-config": {
                            mode: "custom",
                            "auto-connect": false,
                            "public-uri": "https://profile.example.test/",
                            "status-uri": "https://status.profile.example.test/mcp/status",
                            token: "secret-value",
                        },
                    },
                }),
        };
    };

    try {
        const result = await runCli(["mcp", "config", "--profile-source", "backend", "--format", "json"], {
            PENPOT_BACKEND_URI: "http://127.0.0.1:6060",
            PENPOT_CLI_TOKEN: "token-1",
        });
        const body = parseJson(result.stdout);

        assert.equal(result.exitCode, 0);
        assert.equal(result.stderr, "");
        assert.equal(calls.length, 1);
        assert.match(calls[0].url, /\/api\/main\/methods\/get-profile\?_fmt=json$/);
        assert.equal(calls[0].options.method, "GET");
        assert.equal(calls[0].options.headers.authorization, "Bearer token-1");
        assert.equal(calls[0].options.headers.cookie, "auth-token=token-1");
        assert.equal(body.status, "ok");
        assert.equal(body.data.mode, "custom");
        assert.equal(body.data.autoConnect, false);
        assert.equal(body.data.publicUri, "https://profile.example.test");
        assert.equal(body.data.statusUri, "https://status.profile.example.test/mcp/status");
        assert.equal(body.data.configSource.profileSource, "backend");
        assert.equal(body.data.configSource.status, "loaded");
        assert.equal(body.data.configSource.profileId, UUIDS.profile);
        assert.equal(body.data.fieldSources.mode, "profile");
        assert.equal(body.data.fieldSources.autoConnect, "profile");
        assert.equal(body.data.fieldSources.publicUri, "profile");
        assert.equal(body.data.fieldSources.streamUri, "derived");
        assert.equal(JSON.stringify(body).includes("secret-value"), false);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("mcp config keeps flag and env precedence over profile source", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => ({
        ok: true,
        status: 200,
        statusText: "OK",
        headers: { get: () => "application/json" },
        text: async () =>
            JSON.stringify({
                id: UUIDS.profile,
                props: {
                    "mcp-config": {
                        mode: "local",
                        "auto-connect": false,
                        "public-uri": "https://profile.example.test",
                    },
                },
            }),
    });

    try {
        const result = await runCli(
            ["mcp", "config", "--profile-source", "backend", "--mode", "builtin", "--auto-connect", "true", "--format", "json"],
            {
                PENPOT_BACKEND_URI: "http://127.0.0.1:6060",
                PENPOT_CLI_TOKEN: "token-1",
                PENPOT_MCP_PUBLIC_URI: "https://env.example.test",
            }
        );
        const body = parseJson(result.stdout);

        assert.equal(result.exitCode, 0);
        assert.equal(result.stderr, "");
        assert.equal(body.status, "ok");
        assert.equal(body.data.mode, "builtin");
        assert.equal(body.data.autoConnect, true);
        assert.equal(body.data.publicUri, "https://env.example.test");
        assert.equal(body.data.streamUri, "https://env.example.test/mcp/stream");
        assert.equal(body.data.fieldSources.mode, "flag");
        assert.equal(body.data.fieldSources.autoConnect, "flag");
        assert.equal(body.data.fieldSources.publicUri, "env");
        assert.equal(body.data.configSource.status, "loaded");
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("mcp config backend profile source requires auth token", async () => {
    const result = await runCli(["mcp", "config", "--profile-source", "backend", "--format", "json"], {
        PENPOT_BACKEND_URI: "http://127.0.0.1:6060",
    });
    const body = parseJson(result.stdout);

    assert.equal(result.exitCode, 2);
    assert.equal(result.stderr, "");
    assert.equal(body.status, "error");
    assert.equal(body.error.code, CommandErrorCodes.AUTHENTICATION_REQUIRED);
    assert.equal(body.error.data.profileSource, "backend");
});

test("mcp config auto profile source skips backend when token is missing", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
        throw new Error("auto without token should not call backend");
    };

    try {
        const result = await runCli(["mcp", "config", "--profile-source", "auto", "--format", "json"], {
            PENPOT_BACKEND_URI: "http://127.0.0.1:6060",
            PENPOT_MCP_PUBLIC_URI: "https://env.example.test",
        });
        const body = parseJson(result.stdout);

        assert.equal(result.exitCode, 0);
        assert.equal(result.stderr, "");
        assert.equal(body.status, "ok");
        assert.equal(body.data.publicUri, "https://env.example.test");
        assert.equal(body.data.configSource.profileSource, "auto");
        assert.equal(body.data.configSource.status, "fallback");
        assert.match(body.data.configSource.warnings[0], /no auth token/);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("mcp config auto profile source falls back on backend failure", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
        throw new Error("network down");
    };

    try {
        const result = await runCli(["mcp", "config", "--profile-source", "auto", "--format", "json"], {
            PENPOT_BACKEND_URI: "http://127.0.0.1:6060",
            PENPOT_CLI_TOKEN: "token-1",
            PENPOT_MCP_PUBLIC_URI: "https://env.example.test",
        });
        const body = parseJson(result.stdout);

        assert.equal(result.exitCode, 0);
        assert.equal(result.stderr, "");
        assert.equal(body.status, "ok");
        assert.equal(body.data.publicUri, "https://env.example.test");
        assert.equal(body.data.configSource.profileSource, "auto");
        assert.equal(body.data.configSource.status, "fallback");
        assert.match(body.data.configSource.warnings[0], /network down/);
        assert.equal(body.data.fieldSources.publicUri, "env");
    } finally {
        globalThis.fetch = originalFetch;
    }
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
    assert.equal(body.data.surfaces.backend, "http://localhost:6060");
    assert.ok(body.data.services.some((service) => service.name === "devenv-dependencies"));
    assert.ok(body.data.dependencyChecks.some((check) => check.name === "manage.sh"));
    assert.ok(body.data.portChecks.some((check) => check.name === "mcpHttpInternal" && check.port === 4401));
    assert.ok(body.data.readinessChecks.includes("GET http://127.0.0.1:3449/mcp/status"));
});

test("dev up host dry-run reports dependency, port, and startup boundaries", async () => {
    const result = await runCli(["dev", "up", "--mcp", "--mode", "host", "--dry-run", "--format", "json"], {
        PENPOT_MCP_PUBLIC_URI: "http://127.0.0.1:3449",
    });
    const body = parseJson(result.stdout);

    assert.equal(result.exitCode, 0);
    assert.equal(body.status, "ok");
    assert.equal(body.data.mode, "host");
    assert.equal(body.data.dryRun, true);
    assert.ok(body.data.services.some((service) => service.name === "frontend-watch" && service.status === "unsupported"));
    assert.ok(body.data.services.some((service) => service.name === "mcp-server" && service.ports.includes(4402)));
    assert.ok(body.data.dependencyChecks.some((check) => check.name === "node"));
    assert.ok(body.data.dependencyChecks.some((check) => check.name === "pnpm"));
    assert.ok(body.data.dependencyChecks.some((check) => check.name === "clojure"));
    assert.ok(body.data.portChecks.some((check) => check.name === "frontend" && check.port === 3449));
    assert.ok(body.data.portChecks.some((check) => check.name === "backend" && check.port === 6060));
    assert.equal(body.data.startupBoundaries[0].status, "planning_only");
});

test("dev up hybrid dry-run reports docker dependency and host MCP surfaces", async () => {
    const result = await runCli(["dev", "up", "--mcp", "--mode", "hybrid", "--dry-run", "--format", "json"], {
        PENPOT_MCP_PUBLIC_URI: "http://127.0.0.1:3449",
    });
    const body = parseJson(result.stdout);

    assert.equal(result.exitCode, 0);
    assert.equal(body.status, "ok");
    assert.equal(body.data.mode, "hybrid");
    assert.ok(body.data.services.some((service) => service.name === "backend-api" && service.kind === "docker-dependency"));
    assert.ok(body.data.services.some((service) => service.name === "mcp-server" && service.surfaces.includes("http://localhost:4401/status")));
    assert.ok(body.data.dependencyChecks.some((check) => check.name === "docker"));
    assert.ok(body.data.dependencyChecks.some((check) => check.name === "manage.sh"));
    assert.ok(body.data.dependencyChecks.some((check) => check.name === "pnpm"));
    assert.ok(body.data.portChecks.some((check) => check.name === "mcpWebSocketInternal" && check.port === 4402));
    assert.equal(body.data.startupBoundaries[0].status, "planning_only");
});

test("dev up host startup returns plan with unsupported boundary", async () => {
    const result = await runCli(["dev", "up", "--mcp", "--mode", "host", "--format", "json"], {
        PENPOT_MCP_PUBLIC_URI: "http://127.0.0.1:3449",
    });
    const body = parseJson(result.stdout);

    assert.equal(result.exitCode, 2);
    assert.equal(body.status, "error");
    assert.equal(body.error.code, "dev_mode_not_implemented");
    assert.equal(body.error.data.plan.mode, "host");
    assert.equal(body.error.data.plan.startupBoundaries[0].status, "planning_only");
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

test("file open text guidance names live-only selection MCP tools", async () => {
    const result = await runCli(["file", "open", UUIDS.file], {
        PENPOT_PUBLIC_URI: "https://penpot.example.test",
    });

    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /Workspace URL/);
    assert.match(result.stdout, /page\.set_current/);
    assert.match(result.stdout, /selection\.get/);
    assert.match(result.stdout, /selection\.set/);
    assert.match(result.stdout, /file\.get_context/);
    assert.match(result.stdout, /file\.bind_context/);
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

test("shape update sends grid layout subset fields to backend-command RPC", async () => {
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
                        name: "Grid",
                        type: "frame",
                        pageId: UUIDS.page,
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
                "update",
                "--file",
                UUIDS.file,
                "--page",
                UUIDS.page,
                "--shape",
                UUIDS.object,
                "--layout",
                "grid",
                "--layout-grid-direction",
                "row",
                "--layout-align-items",
                "center",
                "--layout-justify-items",
                "stretch",
                "--layout-align-content",
                "space-between",
                "--layout-justify-content",
                "space-evenly",
                "--layout-gap",
                "12",
                "--layout-row-gap",
                "20",
                "--layout-padding",
                "24",
                "--layout-grid-rows",
                "fixed:120,flex:1",
                "--layout-grid-columns",
                "percent:50",
                "--layout-grid-columns",
                "auto",
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
        assert.deepEqual(JSON.parse(calls[0].options.body), {
            id: UUIDS.file,
            "page-id": UUIDS.page,
            "shape-id": UUIDS.object,
            layout: {
                type: "grid",
                direction: "row",
                "align-items": "center",
                "justify-items": "stretch",
                "align-content": "space-between",
                "justify-content": "space-evenly",
                "row-gap": 20,
                "column-gap": 12,
                padding: 24,
                rows: [
                    { type: "fixed", value: 120 },
                    { type: "flex", value: 1 },
                ],
                columns: [{ type: "percent", value: 50 }, { type: "auto" }],
            },
        });
        assert.equal(body.status, "ok");
        assert.equal(body.data.adapter, "backend-command");
        assert.equal(body.data.adapterSelection.command, "shape.update");
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("shape update rejects reverse directions for grid layout in CLI parsing", async () => {
    const result = await runCli(
        [
            "shape",
            "update",
            "--file",
            UUIDS.file,
            "--shape",
            UUIDS.object,
            "--layout",
            "grid",
            "--layout-grid-direction",
            "row-reverse",
            "--format",
            "json",
        ],
        {
            PENPOT_BACKEND_URI: "http://127.0.0.1:6060",
            PENPOT_CLI_TOKEN: "token-1",
        }
    );
    const body = parseJson(result.stdout);

    assert.equal(result.exitCode, 2);
    assert.equal(result.stderr, "");
    assert.equal(body.status, "error");
    assert.equal(body.error.code, "shape_layout_grid_direction_invalid");
});

test("shape set-layout maps to backend-command shape update with alias metadata", async () => {
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
                        name: "Stack",
                        type: "frame",
                        pageId: UUIDS.page,
                    },
                    revn: 5,
                    vern: 0,
                }),
        };
    };

    try {
        const result = await runCli(
            [
                "shape",
                "set-layout",
                "--file",
                UUIDS.file,
                "--page",
                UUIDS.page,
                "--shape",
                UUIDS.object,
                "--layout",
                "flex",
                "--layout-direction",
                "column",
                "--layout-gap",
                "12",
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
        assert.deepEqual(JSON.parse(calls[0].options.body), {
            id: UUIDS.file,
            "page-id": UUIDS.page,
            "shape-id": UUIDS.object,
            layout: {
                type: "flex",
                direction: "column",
                "row-gap": 12,
                "column-gap": 12,
                padding: 16,
            },
        });
        assert.equal(body.status, "ok");
        assert.equal(body.data.adapter, "backend-command");
        assert.equal(body.data.adapterSelection.command, "shape.set_layout");
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("shape set-style maps to backend-command shape update with alias metadata", async () => {
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
                        name: "Title",
                        type: "text",
                        pageId: UUIDS.page,
                    },
                    revn: 6,
                    vern: 0,
                }),
        };
    };

    try {
        const result = await runCli(
            [
                "shape",
                "set-style",
                "--file",
                UUIDS.file,
                "--page",
                UUIDS.page,
                "--shape",
                UUIDS.object,
                "--fill",
                "#111111",
                "--stroke",
                "#333333",
                "--stroke-width",
                "2",
                "--r1",
                "4",
                "--r2",
                "6",
                "--content",
                "Hello",
                "--font-size",
                "32",
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
        assert.deepEqual(JSON.parse(calls[0].options.body), {
            id: UUIDS.file,
            "page-id": UUIDS.page,
            "shape-id": UUIDS.object,
            content: "Hello",
            fill: { color: "#111111" },
            stroke: { color: "#333333", width: 2 },
            r1: 4,
            r2: 6,
            "font-size": 32,
        });
        assert.equal(body.status, "ok");
        assert.equal(body.data.adapter, "backend-command");
        assert.equal(body.data.adapterSelection.command, "shape.set_style");
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("shape alias commands reject fields outside their alias contract", async () => {
    const layoutResult = await runCli(
        [
            "shape",
            "set-layout",
            "--file",
            UUIDS.file,
            "--shape",
            UUIDS.object,
            "--layout",
            "flex",
            "--fill",
            "#ffffff",
            "--format",
            "json",
        ],
        { PENPOT_CLI_TOKEN: "token-1" }
    );
    const layoutBody = parseJson(layoutResult.stdout);

    assert.equal(layoutResult.exitCode, 2);
    assert.equal(layoutResult.stderr, "");
    assert.equal(layoutBody.status, "error");
    assert.equal(layoutBody.error.code, "shape_alias_option_invalid");

    const styleResult = await runCli(
        [
            "shape",
            "set-style",
            "--file",
            UUIDS.file,
            "--shape",
            UUIDS.object,
            "--fill",
            "#ffffff",
            "--layout",
            "flex",
            "--format",
            "json",
        ],
        { PENPOT_CLI_TOKEN: "token-1" }
    );
    const styleBody = parseJson(styleResult.stdout);

    assert.equal(styleResult.exitCode, 2);
    assert.equal(styleResult.stderr, "");
    assert.equal(styleBody.status, "error");
    assert.equal(styleBody.error.code, "shape_alias_option_invalid");
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
                        interactionId: "00000000-0000-0000-0000-000000000101",
                        sourceShapeId: UUIDS.object,
                        destinationBoardId: UUIDS.profile,
                        index: 0,
                        identity: {
                            kind: "stable-id",
                            interactionId: "00000000-0000-0000-0000-000000000101",
                            sourceShapeId: UUIDS.object,
                            interactionIndex: 0,
                        },
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
        assert.equal(body.data.interaction.interactionId, "00000000-0000-0000-0000-000000000101");
        assert.equal(body.data.interaction.identity.kind, "stable-id");
        assert.equal(body.data.interaction.actionType, "navigate-to");
        assert.equal(body.data.revn, 6);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("prototype create-overlay sends overlay backend-command RPC", async () => {
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
                        interactionId: "00000000-0000-0000-0000-000000000102",
                        sourceShapeId: UUIDS.object,
                        destinationBoardId: UUIDS.profile,
                        relativeToShapeId: UUIDS.object,
                        index: 1,
                        identity: {
                            kind: "stable-id",
                            interactionId: "00000000-0000-0000-0000-000000000102",
                            sourceShapeId: UUIDS.object,
                            interactionIndex: 1,
                        },
                        actionType: "toggle-overlay",
                        overlayPositionType: "manual",
                        overlayPosition: { x: 12, y: 16 },
                        closeClickOutside: true,
                        backgroundOverlay: true,
                    },
                    revn: 7,
                    vern: 0,
                }),
        };
    };

    try {
        const result = await runCli(
            [
                "prototype",
                "create-overlay",
                "--file",
                UUIDS.file,
                "--page",
                UUIDS.page,
                "--source",
                UUIDS.object,
                "--action",
                "toggle-overlay",
                "--destination",
                UUIDS.profile,
                "--relative-to",
                UUIDS.object,
                "--position",
                "manual",
                "--manual-x",
                "12",
                "--manual-y",
                "16",
                "--close-click-outside",
                "--background-overlay",
                "--trigger",
                "mouse-enter",
                "--animation",
                "dissolve",
                "--animation-duration",
                "300",
                "--animation-easing",
                "linear",
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
        assert.match(calls[0].url, /\/api\/main\/methods\/create-file-prototype-overlay\?_fmt=json$/);
        assert.deepEqual(JSON.parse(calls[0].options.body), {
            id: UUIDS.file,
            "page-id": UUIDS.page,
            "source-shape-id": UUIDS.object,
            "action-type": "toggle-overlay",
            "destination-board-id": UUIDS.profile,
            "relative-to-shape-id": UUIDS.object,
            "overlay-position-type": "manual",
            "manual-position": { x: 12, y: 16 },
            "close-click-outside": true,
            "background-overlay": true,
            trigger: "mouse-enter",
            animation: {
                type: "dissolve",
                duration: 300,
                easing: "linear",
            },
        });
        assert.equal(body.status, "ok");
        assert.equal(body.data.adapter, "backend-command");
        assert.equal(body.data.adapterSelection.command, "prototype.create_overlay");
        assert.equal(body.data.sourceShapeId, UUIDS.object);
        assert.equal(body.data.interaction.interactionId, "00000000-0000-0000-0000-000000000102");
        assert.equal(body.data.interaction.identity.kind, "stable-id");
        assert.equal(body.data.interaction.actionType, "toggle-overlay");
        assert.equal(body.data.interaction.overlayPosition.x, 12);
        assert.equal(body.data.revn, 7);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("prototype create-overlay rejects push animation locally", async () => {
    const originalFetch = globalThis.fetch;
    const calls = [];
    globalThis.fetch = async (url, options) => {
        calls.push({ url: String(url), options });
        throw new Error("prototype create-overlay push validation should not call fetch");
    };

    try {
        const result = await runCli(
            [
                "prototype",
                "create-overlay",
                "--file",
                UUIDS.file,
                "--page",
                UUIDS.page,
                "--source",
                UUIDS.object,
                "--action",
                "open-overlay",
                "--destination",
                UUIDS.profile,
                "--animation",
                "push",
                "--animation-duration",
                "300",
                "--format",
                "json",
            ],
            {
                PENPOT_BACKEND_URI: "http://127.0.0.1:6060",
                PENPOT_CLI_TOKEN: "token-1",
            }
        );
        const body = parseJson(result.stdout);

        assert.equal(result.exitCode, 2);
        assert.equal(calls.length, 0);
        assert.equal(body.status, "error");
        assert.equal(body.error.code, "prototype_overlay_animation_unsupported");
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("prototype list-interactions reads persisted prototype data with backend-command RPC", async () => {
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
                    fileId: UUIDS.file,
                    flows: [
                        {
                            id: UUIDS.profile,
                            name: "Checkout",
                            pageId: UUIDS.page,
                            startingBoardId: UUIDS.object,
                        },
                    ],
                    interactions: [
                        {
                            interactionId: "00000000-0000-0000-0000-000000000101",
                            sourceShapeId: UUIDS.object,
                            destinationBoardId: UUIDS.profile,
                            index: 0,
                            identity: {
                                kind: "stable-id",
                                interactionId: "00000000-0000-0000-0000-000000000101",
                                sourceShapeId: UUIDS.object,
                                interactionIndex: 0,
                            },
                            actionType: "navigate-to",
                        },
                        {
                            sourceShapeId: UUIDS.object,
                            destinationBoardId: UUIDS.profile,
                            relativeToShapeId: UUIDS.object,
                            index: 1,
                            identity: {
                                kind: "source-index",
                                sourceShapeId: UUIDS.object,
                                interactionIndex: 1,
                                unstable: true,
                            },
                            actionType: "open-overlay",
                            overlayPositionType: "manual",
                            overlayPosition: { x: 12, y: 16 },
                            closeClickOutside: true,
                            backgroundOverlay: true,
                        },
                        {
                            sourceShapeId: UUIDS.object,
                            destinationBoardId: UUIDS.profile,
                            index: 2,
                            identity: {
                                kind: "source-index",
                                sourceShapeId: UUIDS.object,
                                interactionIndex: 2,
                                unstable: true,
                            },
                            actionType: "toggle-overlay",
                            overlayPositionType: "bottom-right",
                            overlayPosition: { x: 0, y: 0 },
                            closeClickOutside: false,
                            backgroundOverlay: false,
                        },
                        {
                            sourceShapeId: UUIDS.object,
                            destinationBoardId: UUIDS.profile,
                            index: 3,
                            identity: {
                                kind: "source-index",
                                sourceShapeId: UUIDS.object,
                                interactionIndex: 3,
                                unstable: true,
                            },
                            actionType: "close-overlay",
                        },
                    ],
                }),
        };
    };

    try {
        const result = await runCli(
            [
                "prototype",
                "list-interactions",
                "--file",
                UUIDS.file,
                "--page",
                UUIDS.page,
                "--flow-id",
                UUIDS.profile,
                "--source",
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
        const url = new URL(calls[0].url);

        assert.equal(result.exitCode, 0);
        assert.equal(result.stderr, "");
        assert.equal(calls.length, 1);
        assert.match(calls[0].url, /\/api\/main\/methods\/get-file-prototype-interactions\?/);
        assert.equal(calls[0].options.method, "GET");
        assert.equal(calls[0].options.body, undefined);
        assert.equal(url.searchParams.get("id"), UUIDS.file);
        assert.equal(url.searchParams.get("page-id"), UUIDS.page);
        assert.equal(url.searchParams.get("flow-id"), UUIDS.profile);
        assert.equal(url.searchParams.get("source-shape-id"), UUIDS.object);
        assert.equal(body.status, "ok");
        assert.equal(body.data.adapter, "backend-command");
        assert.equal(body.data.adapterSelection.command, "prototype.list_interactions");
        assert.equal(body.data.flows[0].name, "Checkout");
        assert.equal(body.data.interactions[0].interactionId, "00000000-0000-0000-0000-000000000101");
        assert.equal(body.data.interactions[0].identity.kind, "stable-id");
        assert.equal(body.data.interactions[0].actionType, "navigate-to");
        assert.equal(body.data.interactions[1].identity.kind, "source-index");
        assert.equal(body.data.interactions[1].identity.unstable, true);
        assert.equal(body.data.interactions[1].actionType, "open-overlay");
        assert.equal(body.data.interactions[1].overlayPosition.x, 12);
        assert.equal(body.data.interactions[2].actionType, "toggle-overlay");
        assert.equal(body.data.interactions[3].actionType, "close-overlay");
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("prototype delete-interaction sends backend-command RPC", async () => {
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
                        index: 1,
                        actionType: "navigate-to",
                    },
                    revn: 7,
                    vern: 0,
                }),
        };
    };

    try {
        const result = await runCli(
            [
                "prototype",
                "delete-interaction",
                "--file",
                UUIDS.file,
                "--page",
                UUIDS.page,
                "--source",
                UUIDS.object,
                "--index",
                "1",
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
        assert.match(calls[0].url, /\/api\/main\/methods\/delete-file-prototype-interaction\?_fmt=json$/);
        assert.deepEqual(JSON.parse(calls[0].options.body), {
            id: UUIDS.file,
            "page-id": UUIDS.page,
            "source-shape-id": UUIDS.object,
            "interaction-index": 1,
        });
        assert.equal(body.status, "ok");
        assert.equal(body.data.adapter, "backend-command");
        assert.equal(body.data.adapterSelection.command, "prototype.delete_interaction");
        assert.equal(body.data.sourceShapeId, UUIDS.object);
        assert.equal(body.data.interactionIndex, 1);
        assert.equal(body.data.interaction.actionType, "navigate-to");
        assert.equal(body.data.revn, 7);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("prototype delete-interaction sends stable interaction id to backend-command RPC", async () => {
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
                        interactionId: "00000000-0000-0000-0000-000000000101",
                        sourceShapeId: UUIDS.object,
                        destinationBoardId: UUIDS.profile,
                        index: 1,
                        identity: {
                            kind: "stable-id",
                            interactionId: "00000000-0000-0000-0000-000000000101",
                            sourceShapeId: UUIDS.object,
                            interactionIndex: 1,
                        },
                        actionType: "navigate-to",
                    },
                    revn: 8,
                    vern: 0,
                }),
        };
    };

    try {
        const result = await runCli(
            [
                "prototype",
                "delete-interaction",
                "--file",
                UUIDS.file,
                "--page",
                UUIDS.page,
                "--interaction-id",
                "00000000-0000-0000-0000-000000000101",
                "--source",
                UUIDS.object,
                "--index",
                "1",
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
        assert.deepEqual(JSON.parse(calls[0].options.body), {
            id: UUIDS.file,
            "page-id": UUIDS.page,
            "interaction-id": "00000000-0000-0000-0000-000000000101",
            "source-shape-id": UUIDS.object,
            "interaction-index": 1,
        });
        assert.equal(body.status, "ok");
        assert.equal(body.data.interactionId, "00000000-0000-0000-0000-000000000101");
        assert.equal(body.data.sourceShapeId, UUIDS.object);
        assert.equal(body.data.interactionIndex, 1);
        assert.equal(body.data.interaction.identity.kind, "stable-id");
        assert.equal(body.data.revn, 8);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("prototype update-interaction sends backend-command RPC", async () => {
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
                        interactionId: "00000000-0000-0000-0000-000000000101",
                        sourceShapeId: UUIDS.object,
                        destinationBoardId: UUIDS.profile,
                        index: 0,
                        actionType: "navigate-to",
                    },
                    revn: 9,
                    vern: 0,
                }),
        };
    };

    try {
        const result = await runCli(
            [
                "prototype",
                "update-interaction",
                "--file",
                UUIDS.file,
                "--page",
                UUIDS.page,
                "--interaction-id",
                "00000000-0000-0000-0000-000000000101",
                "--source",
                UUIDS.object,
                "--index",
                "0",
                "--destination",
                UUIDS.profile,
                "--trigger",
                "mouse-enter",
                "--preserve-scroll=false",
                "--animation",
                "dissolve",
                "--animation-duration",
                "250",
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
        assert.match(calls[0].url, /\/api\/main\/methods\/update-file-prototype-interaction\?_fmt=json$/);
        assert.deepEqual(JSON.parse(calls[0].options.body), {
            id: UUIDS.file,
            "page-id": UUIDS.page,
            "interaction-id": "00000000-0000-0000-0000-000000000101",
            "source-shape-id": UUIDS.object,
            "interaction-index": 0,
            "destination-board-id": UUIDS.profile,
            trigger: "mouse-enter",
            "preserve-scroll-position": false,
            animation: {
                type: "dissolve",
                duration: 250,
            },
        });
        assert.equal(body.status, "ok");
        assert.equal(body.data.adapterSelection.command, "prototype.update_interaction");
        assert.equal(body.data.interactionId, "00000000-0000-0000-0000-000000000101");
        assert.equal(body.data.interactionIndex, 0);
        assert.equal(body.data.revn, 9);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("prototype reorder-interaction sends backend-command RPC", async () => {
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
                        interactionId: "00000000-0000-0000-0000-000000000101",
                        sourceShapeId: UUIDS.object,
                        index: 2,
                        actionType: "navigate-to",
                    },
                    revn: 10,
                    vern: 0,
                }),
        };
    };

    try {
        const result = await runCli(
            [
                "prototype",
                "reorder-interaction",
                "--file",
                UUIDS.file,
                "--page",
                UUIDS.page,
                "--interaction-id",
                "00000000-0000-0000-0000-000000000101",
                "--source",
                UUIDS.object,
                "--index",
                "1",
                "--to-index",
                "2",
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
        assert.match(calls[0].url, /\/api\/main\/methods\/reorder-file-prototype-interaction\?_fmt=json$/);
        assert.deepEqual(JSON.parse(calls[0].options.body), {
            id: UUIDS.file,
            "page-id": UUIDS.page,
            "interaction-id": "00000000-0000-0000-0000-000000000101",
            "source-shape-id": UUIDS.object,
            "interaction-index": 1,
            "to-index": 2,
        });
        assert.equal(body.status, "ok");
        assert.equal(body.data.adapterSelection.command, "prototype.reorder_interaction");
        assert.equal(body.data.interactionIndex, 2);
        assert.equal(body.data.revn, 10);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("prototype duplicate-interaction sends backend-command RPC", async () => {
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
                        interactionId: "00000000-0000-0000-0000-000000000202",
                        sourceShapeId: UUIDS.object,
                        index: 1,
                        actionType: "navigate-to",
                    },
                    revn: 11,
                    vern: 0,
                }),
        };
    };

    try {
        const result = await runCli(
            [
                "prototype",
                "duplicate-interaction",
                "--file",
                UUIDS.file,
                "--page",
                UUIDS.page,
                "--interaction-id",
                "00000000-0000-0000-0000-000000000101",
                "--source",
                UUIDS.object,
                "--index",
                "0",
                "--insertion-index",
                "1",
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
        assert.match(calls[0].url, /\/api\/main\/methods\/duplicate-file-prototype-interaction\?_fmt=json$/);
        assert.deepEqual(JSON.parse(calls[0].options.body), {
            id: UUIDS.file,
            "page-id": UUIDS.page,
            "interaction-id": "00000000-0000-0000-0000-000000000101",
            "source-shape-id": UUIDS.object,
            "interaction-index": 0,
            "insertion-index": 1,
        });
        assert.equal(body.status, "ok");
        assert.equal(body.data.adapterSelection.command, "prototype.duplicate_interaction");
        assert.equal(body.data.interactionId, "00000000-0000-0000-0000-000000000202");
        assert.equal(body.data.interactionIndex, 1);
        assert.equal(body.data.revn, 11);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("prototype delete-interaction rejects missing target", async () => {
    const result = await runCli(
        [
            "prototype",
            "delete-interaction",
            "--file",
            UUIDS.file,
            "--page",
            UUIDS.page,
            "--format",
            "json",
        ],
        {
            PENPOT_BACKEND_URI: "http://127.0.0.1:6060",
            PENPOT_CLI_TOKEN: "token-1",
        }
    );
    const body = parseJson(result.stdout);

    assert.equal(result.exitCode, 2);
    assert.equal(result.stderr, "");
    assert.equal(body.status, "error");
    assert.equal(body.error.code, "prototype_interaction_target_required");
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

test("export file dry-run returns backend-rpc export-binfile plan", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
        throw new Error("export file dry-run should not call fetch");
    };

    try {
        const result = await runCli(
            [
                "export",
                "file",
                "--file",
                UUIDS.file,
                "--library-mode",
                "merge",
                "--dry-run",
                "--format",
                "json",
            ],
            {
                PENPOT_BACKEND_URI: "http://127.0.0.1:6060",
            }
        );
        const body = parseJson(result.stdout);

        assert.equal(result.exitCode, 0);
        assert.equal(result.stderr, "");
        assert.equal(body.status, "ok");
        assert.equal(body.data.command, "export.file");
        assert.equal(body.data.adapter, "backend-rpc");
        assert.equal(body.data.adapterSelection.status, "selected");
        assert.equal(body.data.requires.length, 0);
        assert.equal(body.data.artifact.libraryMode, "merge");
        assert.equal(body.data.artifact.includeLibraries, false);
        assert.equal(body.data.artifact.embedAssets, true);
        assert.match(body.data.backendRpc.endpoint, /\/api\/main\/methods\/export-binfile\?_fmt=json$/);
        assert.deepEqual(body.data.backendRpc.request, {
            "file-id": UUIDS.file,
            "include-libraries": false,
            "embed-assets": true,
        });
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("export file executes backend SSE and returns resource metadata", async () => {
    const originalFetch = globalThis.fetch;
    const calls = [];
    globalThis.fetch = async (url, options = {}) => {
        calls.push({ url: String(url), options });
        return {
            ok: true,
            status: 200,
            statusText: "OK",
            headers: {
                get: (name) => (name.toLowerCase() === "content-type" ? "text/event-stream;charset=UTF-8" : null),
            },
            text: async () => 'event: end\ndata: "http://127.0.0.1:6060/assets/by-id/resource-1"\n\n',
        };
    };

    try {
        const result = await runCli(
            [
                "export",
                "file",
                "--file",
                UUIDS.file,
                "--library-mode",
                "merge",
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
        assert.match(calls[0].url, /\/api\/main\/methods\/export-binfile\?_fmt=json$/);
        assert.equal(calls[0].options.method, "POST");
        assert.equal(calls[0].options.headers.authorization, "Token token-1");
        assert.deepEqual(JSON.parse(calls[0].options.body), {
            "file-id": UUIDS.file,
            "include-libraries": false,
            "embed-assets": true,
        });
        assert.equal(body.status, "ok");
        assert.equal(body.data.command, "export.file");
        assert.equal(body.data.adapter, "backend-rpc");
        assert.equal(body.data.resource.uri, "http://127.0.0.1:6060/assets/by-id/resource-1");
        assert.equal(body.data.resource["resource-uri"], "http://127.0.0.1:6060/assets/by-id/resource-1");
        assert.equal(body.data.downloadedResource, undefined);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("export file executes backend SSE and writes output artifact", async () => {
    const originalFetch = globalThis.fetch;
    const tempDir = mkdtempSync(join(tmpdir(), "penpot-cli-file-export-"));
    const outputPath = join(tempDir, "archive.penpot");
    const calls = [];

    globalThis.fetch = async (url, options = {}) => {
        calls.push({ url: String(url), options });
        if (String(url).includes("/api/main/methods/export-binfile")) {
            return {
                ok: true,
                status: 200,
                statusText: "OK",
                headers: {
                    get: (name) => (name.toLowerCase() === "content-type" ? "text/event-stream" : null),
                },
                text: async () => 'event: end\ndata: "/assets/by-id/resource-2"\n\n',
            };
        }

        return {
            ok: true,
            status: 200,
            statusText: "OK",
            headers: {
                get: (name) => (name.toLowerCase() === "content-type" ? "application/zip" : null),
                has: () => false,
            },
            arrayBuffer: async () => new Uint8Array([80, 75, 3, 4]).buffer,
        };
    };

    try {
        const result = await runCli(
            [
                "export",
                "file",
                "--file",
                UUIDS.file,
                "--library-mode",
                "detach",
                "--output",
                outputPath,
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
        assert.equal(calls.length, 2);
        assert.deepEqual(JSON.parse(calls[0].options.body), {
            "file-id": UUIDS.file,
            "include-libraries": false,
            "embed-assets": false,
        });
        assert.equal(calls[1].url, "http://127.0.0.1:6060/assets/by-id/resource-2");
        assert.equal(calls[1].options.headers.authorization, "Bearer token-1");
        assert.equal(calls[1].options.headers.cookie, "auth-token=token-1");
        assert.deepEqual([...readFileSync(outputPath)], [80, 75, 3, 4]);
        assert.equal(body.status, "ok");
        assert.equal(body.data.command, "export.file");
        assert.equal(body.data.artifact.libraryMode, "detach");
        assert.equal(body.data.downloadedResource.path, outputPath);
        assert.equal(body.data.downloadedResource.bytes, 4);
        assert.equal(body.data.downloadedResource.contentType, "application/zip");
    } finally {
        globalThis.fetch = originalFetch;
        rmSync(tempDir, { recursive: true, force: true });
    }
});

test("export file rejects exporter adapter with structured error", async () => {
    const result = await runCli([
        "export",
        "file",
        "--file",
        UUIDS.file,
        "--adapter",
        "exporter",
        "--dry-run",
        "--format",
        "json",
    ]);
    const body = parseJson(result.stdout);

    assert.equal(result.exitCode, 2);
    assert.equal(result.stderr, "");
    assert.equal(body.status, "error");
    assert.equal(body.error.code, "adapter_not_available");
    assert.equal(body.error.data.adapterSelection.command, "export.file");
    assert.equal(body.error.data.adapterSelection.requested, "exporter");
});

test("export file execution requires auth token", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
        throw new Error("export file without token should not call fetch");
    };

    try {
        const result = await runCli(["export", "file", "--file", UUIDS.file, "--format", "json"]);
        const body = parseJson(result.stdout);

        assert.equal(result.exitCode, 2);
        assert.equal(result.stderr, "");
        assert.equal(body.status, "error");
        assert.equal(body.error.code, CommandErrorCodes.AUTHENTICATION_REQUIRED);
    } finally {
        globalThis.fetch = originalFetch;
    }
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
