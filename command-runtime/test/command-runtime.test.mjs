import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
    AdapterSelectionReasonCodes,
    CommandDescriptors,
    CommandErrorCodes,
    ExportFileLibraryModes,
    HeadlessAuthoringCommandDescriptors,
    LiveGapCommandDescriptors,
    LowRiskCommandDescriptors,
    MigratedCommandDescriptors,
    ShapeExportCommandDescriptors,
    createAdapterSelectionError,
    createCommandRequestEnvelope,
    createCommandResultEnvelope,
    createExportFileContract,
    createFileOpenHandoff,
    createWorkspaceUrl,
    getAdapterSelectionReason,
    getCommandDescriptor,
    selectCommandAdapter,
} from "../index.js";

const LOW_RISK_IDS = ["mcp.status", "mcp.config", "file.list", "file.create", "file.open", "page.list", "page.create"];
const HEADLESS_AUTHORING_IDS = [
    "page.rename",
    "prototype.create_flow",
    "prototype.create_interaction",
    "prototype.create_overlay",
];
const SHAPE_EXPORT_IDS = [
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
];
const LIVE_GAP_IDS = [
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
];
const exportFileContractFixtures = JSON.parse(
    readFileSync(new URL("../../mcp/docs/export-file-contract-fixtures.json", import.meta.url), "utf8")
);

test("descriptor groups expose stable command ids", () => {
    assert.deepEqual(
        LowRiskCommandDescriptors.map((descriptor) => descriptor.id),
        LOW_RISK_IDS
    );
    assert.deepEqual(
        ShapeExportCommandDescriptors.map((descriptor) => descriptor.id),
        SHAPE_EXPORT_IDS
    );
    assert.deepEqual(
        HeadlessAuthoringCommandDescriptors.map((descriptor) => descriptor.id),
        HEADLESS_AUTHORING_IDS
    );
    assert.deepEqual(
        LiveGapCommandDescriptors.map((descriptor) => descriptor.id),
        LIVE_GAP_IDS
    );
    assert.deepEqual(
        MigratedCommandDescriptors.map((descriptor) => descriptor.id),
        [...LOW_RISK_IDS, ...HEADLESS_AUTHORING_IDS, ...SHAPE_EXPORT_IDS, ...LIVE_GAP_IDS]
    );
});

test("descriptor lookup supports internal, MCP, and CLI command names", () => {
    assert.equal(getCommandDescriptor("mcp.get_status"), CommandDescriptors.MCP_STATUS);
    assert.equal(getCommandDescriptor("file.open"), CommandDescriptors.FILE_OPEN);
    assert.equal(getCommandDescriptor("page rename"), CommandDescriptors.PAGE_RENAME);
    assert.equal(getCommandDescriptor("prototype create-flow"), CommandDescriptors.PROTOTYPE_CREATE_FLOW);
    assert.equal(getCommandDescriptor("prototype.create_interaction"), CommandDescriptors.PROTOTYPE_CREATE_INTERACTION);
    assert.equal(getCommandDescriptor("shape create-frame"), CommandDescriptors.SHAPE_CREATE_FRAME);
    assert.equal(getCommandDescriptor("shape create-image"), CommandDescriptors.SHAPE_CREATE_IMAGE);
    assert.equal(getCommandDescriptor("export.page"), CommandDescriptors.EXPORT_PAGE);
    assert.equal(getCommandDescriptor("export.file"), CommandDescriptors.EXPORT_FILE);
    assert.equal(getCommandDescriptor("render preview"), CommandDescriptors.RENDER_PREVIEW);
    assert.equal(getCommandDescriptor("render.thumbnail"), CommandDescriptors.RENDER_THUMBNAIL);
    assert.equal(getCommandDescriptor("page.set_current"), CommandDescriptors.PAGE_SET_CURRENT);
    assert.equal(getCommandDescriptor("selection.get"), CommandDescriptors.SELECTION_GET);
    assert.equal(getCommandDescriptor("prototype list-interactions"), CommandDescriptors.PROTOTYPE_LIST_INTERACTIONS);
    assert.equal(getCommandDescriptor("prototype.delete_interaction"), CommandDescriptors.PROTOTYPE_DELETE_INTERACTION);
    assert.equal(getCommandDescriptor("prototype delete-interaction"), CommandDescriptors.PROTOTYPE_DELETE_INTERACTION);
    assert.equal(getCommandDescriptor("prototype.update_interaction"), CommandDescriptors.PROTOTYPE_UPDATE_INTERACTION);
    assert.equal(getCommandDescriptor("prototype update-interaction"), CommandDescriptors.PROTOTYPE_UPDATE_INTERACTION);
    assert.equal(getCommandDescriptor("prototype.reorder_interaction"), CommandDescriptors.PROTOTYPE_REORDER_INTERACTION);
    assert.equal(getCommandDescriptor("prototype reorder-interaction"), CommandDescriptors.PROTOTYPE_REORDER_INTERACTION);
    assert.equal(getCommandDescriptor("prototype.duplicate_interaction"), CommandDescriptors.PROTOTYPE_DUPLICATE_INTERACTION);
    assert.equal(getCommandDescriptor("prototype duplicate-interaction"), CommandDescriptors.PROTOTYPE_DUPLICATE_INTERACTION);
    assert.equal(getCommandDescriptor("shape.set_layout"), CommandDescriptors.SHAPE_SET_LAYOUT);
    assert.equal(getCommandDescriptor("shape set-layout"), CommandDescriptors.SHAPE_SET_LAYOUT);
    assert.equal(getCommandDescriptor("shape.set_style"), CommandDescriptors.SHAPE_SET_STYLE);
    assert.equal(getCommandDescriptor("shape set-style"), CommandDescriptors.SHAPE_SET_STYLE);
    assert.equal(getCommandDescriptor("missing.command"), undefined);
});

test("live-gap descriptors document live-only and planned command boundaries", () => {
    assert.equal(CommandDescriptors.PAGE_SET_CURRENT.mcpToolName, "page.set_current");
    assert.equal(CommandDescriptors.PAGE_SET_CURRENT.cliCommand, undefined);
    assert.deepEqual(CommandDescriptors.PAGE_SET_CURRENT.adapters, ["plugin-live"]);
    assert.match(CommandDescriptors.SELECTION_GET.description, /live Penpot workspace/);
    assert.match(CommandDescriptors.SELECTION_SET.description, /live Penpot workspace/);
    assert.match(CommandDescriptors.SELECTION_SET.responseShape, /selected shape summaries/);
    assert.equal(CommandDescriptors.PROTOTYPE_LIST_INTERACTIONS.cliCommand, "prototype list-interactions");
    assert.deepEqual(CommandDescriptors.PROTOTYPE_LIST_INTERACTIONS.adapters, ["backend-command"]);
    assert.match(CommandDescriptors.PROTOTYPE_LIST_INTERACTIONS.description, /navigate and overlay interactions/);
    assert.match(CommandDescriptors.PROTOTYPE_LIST_INTERACTIONS.responseShape, /open-overlay/);
    assert.match(CommandDescriptors.PROTOTYPE_LIST_INTERACTIONS.responseShape, /interactionId/);
    assert.match(CommandDescriptors.PROTOTYPE_LIST_INTERACTIONS.responseShape, /identity.kind stable-id\|source-index/);
    assert.match(CommandDescriptors.PROTOTYPE_CREATE_INTERACTION.responseShape, /generated interactionId/);
    assert.match(CommandDescriptors.PROTOTYPE_CREATE_INTERACTION.responseShape, /identity.kind stable-id/);
    assert.equal(CommandDescriptors.PROTOTYPE_DELETE_INTERACTION.cliCommand, "prototype delete-interaction");
    assert.deepEqual(CommandDescriptors.PROTOTYPE_DELETE_INTERACTION.adapters, ["backend-command"]);
    assert.match(CommandDescriptors.PROTOTYPE_DELETE_INTERACTION.description, /stable interactionId/);
    assert.match(CommandDescriptors.PROTOTYPE_DELETE_INTERACTION.description, /sourceShapeId/);
    assert.match(CommandDescriptors.PROTOTYPE_DELETE_INTERACTION.description, /interactionIndex/);
    assert.equal(
        CommandDescriptors.PROTOTYPE_DELETE_INTERACTION.inputSchema,
        "fileId, pageId?, interactionId? OR sourceShapeId + interactionIndex, optional sourceShapeId/interactionIndex guards with interactionId, adapter?"
    );
    assert.match(CommandDescriptors.PROTOTYPE_DELETE_INTERACTION.responseShape, /interactionId/);
    assert.match(CommandDescriptors.PROTOTYPE_DELETE_INTERACTION.responseShape, /deleted interaction summary/);
    assert.equal(CommandDescriptors.PROTOTYPE_UPDATE_INTERACTION.cliCommand, "prototype update-interaction");
    assert.deepEqual(CommandDescriptors.PROTOTYPE_UPDATE_INTERACTION.adapters, ["backend-command"]);
    assert.match(CommandDescriptors.PROTOTYPE_UPDATE_INTERACTION.description, /Updates supported fields/);
    assert.match(CommandDescriptors.PROTOTYPE_UPDATE_INTERACTION.inputSchema, /actionType immutable/);
    assert.equal(CommandDescriptors.PROTOTYPE_REORDER_INTERACTION.cliCommand, "prototype reorder-interaction");
    assert.deepEqual(CommandDescriptors.PROTOTYPE_REORDER_INTERACTION.adapters, ["backend-command"]);
    assert.match(CommandDescriptors.PROTOTYPE_REORDER_INTERACTION.inputSchema, /same source shape only/);
    assert.equal(CommandDescriptors.PROTOTYPE_DUPLICATE_INTERACTION.cliCommand, "prototype duplicate-interaction");
    assert.deepEqual(CommandDescriptors.PROTOTYPE_DUPLICATE_INTERACTION.adapters, ["backend-command"]);
    assert.match(CommandDescriptors.PROTOTYPE_DUPLICATE_INTERACTION.inputSchema, /generates new interactionId/);
    assert.match(
        getAdapterSelectionReason(AdapterSelectionReasonCodes.BACKEND_COMMAND_PROTOTYPE_MUTATION_UNSUPPORTED),
        /explicit persisted-data contract/
    );
    assert.equal(CommandDescriptors.PROTOTYPE_CREATE_OVERLAY.cliCommand, "prototype create-overlay");
    assert.deepEqual(CommandDescriptors.PROTOTYPE_CREATE_OVERLAY.adapters, ["backend-command"]);
    assert.match(CommandDescriptors.PROTOTYPE_CREATE_OVERLAY.description, /Creates a persisted open, toggle, or close overlay/);
    assert.match(CommandDescriptors.PROTOTYPE_CREATE_OVERLAY.inputSchema, /actionType=open-overlay\|toggle-overlay\|close-overlay/);
    assert.match(CommandDescriptors.PROTOTYPE_CREATE_OVERLAY.inputSchema, /manualPosition\{x,y\} required/);
    assert.match(CommandDescriptors.PROTOTYPE_CREATE_OVERLAY.inputSchema, /push animation unsupported/);
    assert.match(CommandDescriptors.PROTOTYPE_CREATE_OVERLAY.responseShape, /overlay interaction summary/);
    assert.match(CommandDescriptors.PROTOTYPE_CREATE_OVERLAY.responseShape, /generated interactionId/);
    assert.equal(CommandDescriptors.SHAPE_SET_LAYOUT.cliCommand, "shape set-layout");
    assert.deepEqual(CommandDescriptors.SHAPE_SET_LAYOUT.adapters, ["backend-command", "plugin-live"]);
    assert.match(CommandDescriptors.SHAPE_SET_LAYOUT.description, /MCP and CLI alias for shape.update layout fields/);
    assert.match(CommandDescriptors.SHAPE_SET_LAYOUT.responseShape, /alias command\/tool audit metadata/);
    assert.equal(CommandDescriptors.SHAPE_SET_STYLE.cliCommand, "shape set-style");
    assert.deepEqual(CommandDescriptors.SHAPE_SET_STYLE.adapters, ["backend-command", "plugin-live"]);
    assert.match(CommandDescriptors.SHAPE_SET_STYLE.description, /MCP and CLI alias for shape.update style\/text fields/);
    assert.match(CommandDescriptors.SHAPE_SET_STYLE.inputSchema, /fill\?/);
    assert.match(CommandDescriptors.SHAPE_SET_STYLE.responseShape, /alias command\/tool audit metadata/);
});

test("shape/export descriptors document planned file and thumbnail boundaries", () => {
    assert.equal(CommandDescriptors.EXPORT_FILE.mcpToolName, "export.file");
    assert.equal(CommandDescriptors.EXPORT_FILE.cliCommand, "export file");
    assert.deepEqual(CommandDescriptors.EXPORT_FILE.adapters, ["backend-rpc"]);
    assert.match(CommandDescriptors.EXPORT_FILE.description, /backend-rpc export-binfile/);
    assert.match(CommandDescriptors.EXPORT_FILE.inputSchema, /libraryMode=all\|merge\|detach/);
    assert.match(CommandDescriptors.EXPORT_FILE.inputSchema, /includeLibraries/);
    assert.match(CommandDescriptors.EXPORT_FILE.responseShape, /export-binfile/);
    assert.equal(CommandDescriptors.RENDER_THUMBNAIL.mcpToolName, "render.thumbnail");
    assert.equal(CommandDescriptors.RENDER_THUMBNAIL.cliCommand, undefined);
    assert.deepEqual(CommandDescriptors.RENDER_THUMBNAIL.adapters, []);
    assert.match(CommandDescriptors.RENDER_THUMBNAIL.description, /Planned thumbnail render/);
    assert.match(CommandDescriptors.RENDER_THUMBNAIL.description, /cache policy/);
    assert.match(CommandDescriptors.RENDER_THUMBNAIL.inputSchema, /objectId|size/);
});

test("export.file contract maps CLI binary archive requests to backend RPC semantics", () => {
    const contract = createExportFileContract({
        fileId: "file-1",
        name: "Checkout flow",
        output: "checkout.penpot",
    });

    assert.equal(contract.command, "export.file");
    assert.equal(contract.executable, true);
    assert.equal(contract.adapter, "backend-rpc");
    assert.deepEqual(contract.requires, []);
    assert.deepEqual(contract.target, { fileId: "file-1" });
    assert.equal(contract.artifact.kind, "file-export");
    assert.equal(contract.artifact.format, "penpot");
    assert.equal(contract.artifact.mimeType, "application/zip");
    assert.equal(contract.artifact.extension, ".penpot");
    assert.equal(contract.artifact.name, "Checkout flow");
    assert.equal(contract.artifact.libraryMode, ExportFileLibraryModes.ALL);
    assert.equal(contract.artifact.includeLibraries, true);
    assert.equal(contract.artifact.embedAssets, false);
    assert.equal(contract.artifact.output, "checkout.penpot");
    assert.equal(contract.backendRpc.command, "export-binfile");
    assert.equal(contract.backendRpc.transport, "sse");
    assert.equal(contract.backendRpc.response, "resource-uri");
    assert.deepEqual(contract.backendRpc.request, {
        "file-id": "file-1",
        "include-libraries": true,
        "embed-assets": false,
    });
    assert.equal(contract.diagnostics.adapterBoundary, "cli-backend-rpc");
    assert.equal(contract.diagnostics.mcpToolRegistered, false);
    assert.equal(contract.diagnostics.cliCommandRegistered, true);
    assert.match(contract.diagnostics.exporterBoundary, /not exporter export-shapes/);
});

test("export.file contract matches the documented fixture matrix", async (t) => {
    assert.equal(exportFileContractFixtures.command, "export.file");
    assert.match(exportFileContractFixtures.notes.join(" "), /not exporter export-shapes/);

    for (const fixture of exportFileContractFixtures.cases) {
        await t.test(fixture.id, () => {
            const contract = createExportFileContract(fixture.input);
            assert.equal(contract.executable, true);
            assert.equal(contract.adapter, "backend-rpc");
            assert.equal(contract.artifact.libraryMode, fixture.expected.libraryMode);
            assert.equal(contract.artifact.includeLibraries, fixture.expected.includeLibraries);
            assert.equal(contract.artifact.embedAssets, fixture.expected.embedAssets);
            assert.deepEqual(contract.requires, fixture.expected.requires);
            assert.deepEqual(contract.backendRpc.request, fixture.expected.backendRpcRequest);
            assert.equal(contract.diagnostics.adapterBoundary, "cli-backend-rpc");
        });
    }
});

test("export.file contract validates unsupported format and library boolean combinations", () => {
    assert.throws(
        () => createExportFileContract({ fileId: "file-1", format: "zip" }),
        /Unsupported export\.file format/
    );
    assert.throws(
        () => createExportFileContract({ fileId: "file-1", includeLibraries: true, embedAssets: true }),
        /cannot set includeLibraries and embedAssets/
    );
});

test("file open helpers produce stable workspace URLs and handoff actions", () => {
    const workspaceUrl = createWorkspaceUrl({
        publicUri: "https://penpot.example.test/",
        fileId: "file-1",
        teamId: "team-1",
        pageId: "page-1",
    });

    assert.equal(workspaceUrl, "https://penpot.example.test/#/workspace?file-id=file-1&team-id=team-1&page-id=page-1");
    assert.deepEqual(
        createFileOpenHandoff({
            fileId: "file-1",
            teamId: "team-1",
            pageId: "page-1",
            workspaceUrl,
        }),
        {
            status: "url_returned",
            requiresUserAction: true,
            workspaceUrl,
            nextActions: ["open_workspace_url", "file.get_context", "file.bind_context", "retry_original_tool"],
            target: {
                fileId: "file-1",
                teamId: "team-1",
                pageId: "page-1",
            },
        }
    );
});

test("adapter selection prefers available candidates by priority", () => {
    const selection = selectCommandAdapter({
        command: CommandDescriptors.PAGE_LIST.id,
        candidates: [
            { kind: "plugin-live", available: true, priority: 50 },
            { kind: "backend-command", available: true, priority: 10 },
        ],
    });

    assert.equal(selection.status, "selected");
    assert.equal(selection.requested, "auto");
    assert.equal(selection.selected, "backend-command");
    assert.equal(selection.fallbacks[0].kind, "plugin-live");
});

test("adapter selection errors share codes, messages, and payload shape", () => {
    const unsupported = selectCommandAdapter({
        command: CommandDescriptors.EXPORT_PAGE.id,
        requestedAdapter: "plugin-live",
        candidates: [
            {
                kind: "exporter",
                available: false,
                reason: getAdapterSelectionReason(AdapterSelectionReasonCodes.CLI_EXPORT_PLUGIN_LIVE_UNSUPPORTED),
            },
        ],
    });
    const unsupportedError = createAdapterSelectionError(unsupported, { actions: ["Use --adapter auto."] });

    assert.equal(unsupported.status, "unsupported");
    assert.equal(unsupportedError.code, CommandErrorCodes.ADAPTER_NOT_SUPPORTED);
    assert.equal(unsupportedError.message, "No available adapter matched 'plugin-live' for export.page.");
    assert.deepEqual(unsupportedError.actions, ["Use --adapter auto."]);
    assert.equal(unsupportedError.data.adapterSelection, unsupported);

    const unavailable = selectCommandAdapter({
        command: CommandDescriptors.SHAPE_UPDATE.id,
        requestedAdapter: "backend-command",
        candidates: [
            {
                kind: "backend-command",
                available: false,
                reason: getAdapterSelectionReason(AdapterSelectionReasonCodes.BACKEND_COMMAND_LAYOUT_UNSUPPORTED),
            },
        ],
    });
    const unavailableError = createAdapterSelectionError(unavailable);

    assert.equal(unavailable.status, "unavailable");
    assert.equal(unavailableError.code, CommandErrorCodes.ADAPTER_NOT_AVAILABLE);
    assert.equal(
        unavailable.candidates[0].reason,
        "backend-command supports layout none, flex, and grid container tracks only; use plugin-live for unsupported layout details."
    );
    assert.equal(
        getAdapterSelectionReason(AdapterSelectionReasonCodes.PLUGIN_LIVE_BACKEND_ONLY_SHAPE_FIELDS_UNSUPPORTED),
        "plugin-live does not support backend-only shape style or hierarchy fields; pass fileId to use backend-command."
    );
    assert.equal(
        getAdapterSelectionReason(AdapterSelectionReasonCodes.EXPORTER_EXPLICIT_TARGET_REQUIRED),
        "exporter requires explicit fileId, pageId, and objectId."
    );
    assert.equal(
        getAdapterSelectionReason(AdapterSelectionReasonCodes.PLUGIN_LIVE_WORKSPACE_STATE_REQUIRED),
        "plugin-live requires a bound Penpot workspace because this command reads or changes editor-local state."
    );
    assert.equal(
        getAdapterSelectionReason(AdapterSelectionReasonCodes.BACKEND_COMMAND_PROTOTYPE_READ_PLANNED),
        "backend-command prototype reads require explicit file/page targets."
    );
    assert.equal(
        getAdapterSelectionReason(AdapterSelectionReasonCodes.BACKEND_COMMAND_GRID_CONTRACT_UNSUPPORTED),
        "backend-command grid cell and child placement updates are unsupported until a stable cell payload contract exists."
    );
    assert.equal(
        getAdapterSelectionReason(AdapterSelectionReasonCodes.CLI_LIVE_WORKSPACE_STATE_UNSUPPORTED),
        "CLI commands do not read or mutate editor-local workspace state; use MCP file.open, file.get_context, and file.bind_context before retrying the live-only tool."
    );
});

test("request and result envelopes preserve data while keeping auth token-safe", () => {
    const adapterSelection = selectCommandAdapter({
        command: CommandDescriptors.FILE_LIST.id,
        candidates: [{ kind: "backend-rpc", available: true }],
    });
    const request = createCommandRequestEnvelope(CommandDescriptors.FILE_LIST, {
        transport: "mcp",
        input: { projectId: "project-1" },
        target: { projectId: "project-1", omitted: undefined },
        auth: { userTokenPresent: true, source: "test", token: "secret-token" },
        adapterSelection,
    });
    const result = createCommandResultEnvelope(request, { files: [] }, { warnings: ["empty"] });

    assert.equal(request.command, "file.list");
    assert.equal(request.adapter, "backend-rpc");
    assert.deepEqual(request.target, { projectId: "project-1" });
    assert.deepEqual(request.auth, { userTokenPresent: true, source: "test" });
    assert.equal(Object.hasOwn(request.auth, "token"), false);
    assert.deepEqual(result.data, { files: [] });
    assert.deepEqual(result.warnings, ["empty"]);
});
