import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
    AdapterSelectionReasonCodes,
    CommandDescriptors,
    CommandErrorCodes,
    ExportFileLibraryModes,
    RenderThumbnailCachePolicies,
    RenderThumbnailTargets,
    HeadlessAuthoringCommandDescriptors,
    LiveGapCommandDescriptors,
    LowRiskCommandDescriptors,
    MigratedCommandDescriptors,
    ShapeExportCommandDescriptors,
    createAdapterSelectionError,
    createCommandRequestEnvelope,
    createCommandResultEnvelope,
    createExportFileContract,
    createRenderThumbnailContract,
    createRenderThumbnailRendererServiceClientRequest,
    createRenderThumbnailRendererServiceDispatchAdapterBoundary,
    createRenderThumbnailRendererServiceDispatchRegistrationPreflight,
    createRenderThumbnailRendererServiceExecutableAdapterRegistrationScaffold,
    createRenderThumbnailRendererServiceExecutionGate,
    createRenderThumbnailRendererServiceExecutionClientHarness,
    createRenderThumbnailRendererServiceHealthPreflight,
    createRenderThumbnailRendererServiceIntegrationFixtureHarness,
    createRenderThumbnailRendererServiceOptInConfiguration,
    createRenderThumbnailRendererServiceUnavailableErrorTaxonomy,
    createRenderThumbnailRendererServiceErrorPayload,
    createRenderThumbnailRendererServicePlan,
    createRenderThumbnailRendererServiceResult,
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
const renderThumbnailContractFixtures = JSON.parse(
    readFileSync(new URL("../../mcp/docs/render-thumbnail-contract-fixtures.json", import.meta.url), "utf8")
);
const renderThumbnailRuntimeBoundaryFixtures = JSON.parse(
    readFileSync(new URL("../../mcp/docs/render-thumbnail-runtime-boundary-fixtures.json", import.meta.url), "utf8")
);
const renderThumbnailRendererServiceFixtures = JSON.parse(
    readFileSync(new URL("../../mcp/docs/render-thumbnail-renderer-service-fixtures.json", import.meta.url), "utf8")
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
    assert.equal(CommandDescriptors.RENDER_THUMBNAIL.cliCommand, "render thumbnail");
    assert.deepEqual(CommandDescriptors.RENDER_THUMBNAIL.adapters, ["renderer-service"]);
    assert.match(CommandDescriptors.RENDER_THUMBNAIL.description, /dashboard file thumbnails/);
    assert.match(CommandDescriptors.RENDER_THUMBNAIL.description, /dry-run/);
    assert.match(CommandDescriptors.RENDER_THUMBNAIL.description, /tagged frame thumbnails/);
    assert.match(CommandDescriptors.RENDER_THUMBNAIL.inputSchema, /cachePolicy=reuse\|refresh/);
    assert.match(CommandDescriptors.RENDER_THUMBNAIL.responseShape, /renderer-service request shape/);
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
    assert.equal(contract.diagnostics.adapterBoundary, "mcp-cli-backend-rpc");
    assert.equal(contract.diagnostics.mcpToolRegistered, true);
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
            assert.equal(contract.diagnostics.adapterBoundary, "mcp-cli-backend-rpc");
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

test("render.thumbnail contract maps dashboard thumbnails to backend data and cache semantics", () => {
    const contract = createRenderThumbnailContract({
        fileId: "file-1",
        revn: 7,
    });

    assert.equal(contract.command, "render.thumbnail");
    assert.equal(contract.executable, false);
    assert.equal(contract.adapter, null);
    assert.equal(contract.target.kind, RenderThumbnailTargets.FILE);
    assert.equal(contract.target.fileId, "file-1");
    assert.equal(contract.target.revn, 7);
    assert.deepEqual(contract.requires, []);
    assert.equal(contract.artifact.kind, "thumbnail");
    assert.equal(contract.artifact.format, "png");
    assert.equal(contract.artifact.mimeType, "image/png");
    assert.equal(contract.artifact.width, 252);
    assert.equal(contract.artifact.height, 168);
    assert.equal(contract.cache.policy, RenderThumbnailCachePolicies.REUSE);
    assert.equal(contract.cache.scope, "file-thumbnail");
    assert.equal(contract.cache.key, "file:file-1:revn:7");
    assert.equal(contract.renderer.primary, "render-wasm-worker");
    assert.deepEqual(contract.backendRpc.data.request, {
        "file-id": "file-1",
        "strip-frames-with-thumbnails": false,
    });
    assert.equal(contract.backendRpc.persist.command, "create-file-thumbnail");
    assert.deepEqual(contract.backendRpc.persist.request, {
        "file-id": "file-1",
        revn: 7,
        media: "<rendered png blob>",
    });
    assert.equal(contract.diagnostics.adapterBoundary, "descriptor-only");
    assert.equal(contract.diagnostics.mcpToolRegistered, false);
    assert.equal(contract.diagnostics.cliCommandRegistered, false);
    assert.match(contract.diagnostics.exporterBoundary, /not exporter export-shapes/);
});

test("render.thumbnail contract matches the documented fixture matrix", async (t) => {
    assert.equal(renderThumbnailContractFixtures.command, "render.thumbnail");
    assert.match(renderThumbnailContractFixtures.notes.join(" "), /dashboard thumbnail data/);

    for (const fixture of renderThumbnailContractFixtures.cases) {
        await t.test(fixture.id, () => {
            const contract = createRenderThumbnailContract(fixture.input);
            assert.equal(contract.executable, false);
            assert.equal(contract.adapter, null);
            assert.equal(contract.target.kind, fixture.expected.targetKind);
            assert.deepEqual(contract.requires, fixture.expected.requires);
            assert.equal(contract.cache.policy, fixture.expected.cachePolicy);
            assert.equal(contract.cache.scope, fixture.expected.cacheScope);
            assert.equal(contract.cache.key, fixture.expected.cacheKey);
            assert.equal(contract.backendRpc.persist.command, fixture.expected.persistCommand);
            assert.deepEqual(contract.backendRpc.persist.request, fixture.expected.persistRequest);
            if (fixture.expected.artifact) {
                assert.equal(contract.artifact.width, fixture.expected.artifact.width);
                assert.equal(contract.artifact.height, fixture.expected.artifact.height);
                assert.equal(contract.artifact.format, fixture.expected.artifact.format);
                assert.equal(contract.artifact.output, fixture.expected.artifact.output ?? null);
            }
            if (fixture.expected.dataRequest) {
                assert.deepEqual(contract.backendRpc.data.request, fixture.expected.dataRequest);
            }
        });
    }
});

test("render.thumbnail contract validates target, format, cache, and dimensions", () => {
    assert.throws(
        () => createRenderThumbnailContract({ fileId: "file-1", target: "selection" }),
        /Unsupported render\.thumbnail target/
    );
    assert.throws(
        () => createRenderThumbnailContract({ fileId: "file-1", format: "jpeg" }),
        /Unsupported render\.thumbnail format/
    );
    assert.throws(
        () => createRenderThumbnailContract({ fileId: "file-1", cachePolicy: "stale" }),
        /Unsupported render\.thumbnail cachePolicy/
    );
    assert.throws(
        () => createRenderThumbnailContract({ fileId: "file-1", width: 0 }),
        /render\.thumbnail width must be an integer/
    );
});

test("render.thumbnail runtime boundary keeps execution unavailable until renderer service exists", () => {
    const boundary = renderThumbnailRuntimeBoundaryFixtures;
    const selected = boundary.decisionMatrix.find((option) => option.decision === "selected");
    const rejected = boundary.decisionMatrix.find((option) => option.id === "mcp-node-direct");

    assert.equal(boundary.command, "render.thumbnail");
    assert.equal(boundary.selectedBoundary, "thumbnail-renderer-service");
    assert.equal(boundary.executionBoundary.owner, "thumbnail-renderer-service");
    assert.equal(boundary.executionBoundary.adapterName, "renderer-service");
    assert.equal(boundary.executionBoundary.addAdapterNow, false);
    assert.equal(selected.id, "thumbnail-renderer-service");
    assert.equal(rejected.decision, "rejected");
    assert.deepEqual(boundary.runtimeRegistration.descriptorAdapters, ["renderer-service"]);
    assert.deepEqual(CommandDescriptors.RENDER_THUMBNAIL.adapters, ["renderer-service"]);
    assert.equal(CommandDescriptors.RENDER_THUMBNAIL.cliCommand, "render thumbnail");
    assert.equal(boundary.runtimeRegistration.mcpToolRegistered, true);
    assert.equal(boundary.runtimeRegistration.cliCommandRegistered, true);
    assert.equal(boundary.runtimeRegistration.runtimeExecutionRegistered, false);

    const contract = createRenderThumbnailContract({
        fileId: "file-1",
        pageId: "page-1",
        objectId: "frame-1",
        target: "frame",
    });
    assert.equal(contract.executable, false);
    assert.equal(contract.adapter, null);
    assert.equal(contract.backendRpc.data.command, boundary.executionBoundary.backendDataCommand);
    assert.equal(contract.backendRpc.persist.command, boundary.executionBoundary.framePersistCommand);
    assert.equal(boundary.resourceReturn.mcp.localFileWrites, false);
    assert.equal(boundary.resourceReturn.targets.file.persistCommand, "create-file-thumbnail");
    assert.equal(boundary.resourceReturn.targets.frame.persistCommand, "create-file-object-thumbnail");
    assert.equal(boundary.resourceReturn.targets.frame.registrationBlocker, "tagged-frame-download-uri");
    assert.match(boundary.cacheRefresh.refresh, /persist/);
    assert.match(boundary.auth.service, /caller session\/token/);
    assert.equal(boundary.executionGate.status, "closed");
    assert.equal(boundary.executionGate.dispatch, false);
    assert.ok(boundary.executionGate.integrationTestPlan.some((entry) => entry.includes("missing endpoint")));
    assert.equal(boundary.healthPreflight.status, "planned-disabled");
    assert.equal(boundary.healthPreflight.dispatch, false);
    assert.equal(boundary.executionClientHarness.dispatch, false);
    assert.equal(boundary.dispatchAdapterBoundary.dispatch, false);
    assert.equal(boundary.dispatchAdapterBoundary.resultMapping.successHelper, "createRenderThumbnailRendererServiceResult");
    assert.equal(boundary.optInConfiguration.status, "planned-disabled");
    assert.equal(boundary.optInConfiguration.dispatch, false);
    assert.equal(boundary.optInConfiguration.executionEnabledByConfiguration, false);
    assert.ok(boundary.testStrategy.some((item) => item.includes("descriptor tests")));
});

test("render.thumbnail renderer-service API fixtures define planning requests without registering execution", async (t) => {
    const fixtures = renderThumbnailRendererServiceFixtures;

    assert.equal(fixtures.command, "render.thumbnail");
    assert.equal(fixtures.adapter, "renderer-service");
    assert.equal(fixtures.serviceApi.operation, "thumbnail.render");
    assert.equal(fixtures.serviceApi.localFileWrites, false);
    assert.equal(fixtures.serviceApi.requestAuth.mode, "caller-session");
    assert.equal(fixtures.serviceApi.responseNormalization.successStatus, "ok");
    assert.equal(fixtures.serviceApi.responseNormalization.localFileWrites, false);
    assert.equal(fixtures.serviceApi.errorShape.retryable, "derived-from-status");
    assert.equal(fixtures.serviceApi.clientRequestScaffold.status, "scaffolded");
    assert.equal(fixtures.serviceApi.clientRequestScaffold.dispatch, false);
    assert.equal(fixtures.serviceApi.clientRequestScaffold.method, "POST");
    assert.deepEqual(fixtures.serviceApi.clientRequestScaffold.authForwarding.headerNames, ["authorization", "cookie"]);
    assert.equal(fixtures.serviceApi.clientRequestScaffold.authForwarding.tokenValuesIncluded, false);
    assert.equal(fixtures.serviceApi.executionGate.status, "closed");
    assert.equal(fixtures.serviceApi.executionGate.dispatch, false);
    assert.equal(fixtures.serviceApi.executionGate.optIn.env, "PENPOT_RENDER_THUMBNAIL_EXECUTION");
    assert.ok(fixtures.serviceApi.executionGate.failureModes.includes("renderer_service_integration_tests_missing"));
    assert.equal(fixtures.serviceApi.healthPreflight.status, "planned-disabled");
    assert.equal(fixtures.serviceApi.healthPreflight.dispatch, false);
    assert.equal(fixtures.serviceApi.executionClientHarness.dispatch, false);
    assert.equal(fixtures.serviceApi.dispatchAdapterBoundary.dispatch, false);
    assert.deepEqual(fixtures.serviceApi.dispatchAdapterBoundary.sequence, ["executionGate", "healthPreflight", "clientRequest", "normalizeResult"]);
    assert.equal(fixtures.serviceApi.optInConfiguration.status, "planned-disabled");
    assert.equal(fixtures.serviceApi.optInConfiguration.dispatch, false);
    assert.equal(fixtures.serviceApi.optInConfiguration.expectedValue, "renderer-service");
    assert.equal(fixtures.serviceApi.unavailableErrorTaxonomy.taxonomyVersion, "P25.17");
    assert.equal(fixtures.serviceApi.unavailableErrorTaxonomy.dispatch, false);
    assert.ok(fixtures.serviceApi.unavailableErrorTaxonomy.codes.includes("renderer_service_health_unavailable"));
    assert.equal(fixtures.serviceApi.integrationFixtureHarness.harnessVersion, "P25.18");
    assert.equal(fixtures.serviceApi.integrationFixtureHarness.dispatch, false);
    assert.ok(fixtures.serviceApi.integrationFixtureHarness.cases.includes("closed-gate-no-network"));
    assert.equal(fixtures.serviceApi.dispatchRegistrationPreflight.preflightVersion, "P25.19");
    assert.equal(fixtures.serviceApi.dispatchRegistrationPreflight.dispatch, false);
    assert.equal(fixtures.serviceApi.dispatchRegistrationPreflight.runtimeRegistration, false);
    assert.ok(fixtures.serviceApi.dispatchRegistrationPreflight.requiredChecks.includes("runtime-registration-ready"));
    assert.equal(fixtures.serviceApi.executableAdapterRegistrationScaffold.scaffoldVersion, "P25.20");
    assert.equal(fixtures.serviceApi.executableAdapterRegistrationScaffold.dispatch, false);
    assert.equal(fixtures.serviceApi.executableAdapterRegistrationScaffold.runtimeRegistration, false);
    assert.ok(fixtures.serviceApi.executableAdapterRegistrationScaffold.noOpBehavior.includes("do not call fetch"));
    assert.deepEqual(fixtures.runtimeRegistration.commandDescriptorAdapters, ["renderer-service"]);
    assert.deepEqual(CommandDescriptors.RENDER_THUMBNAIL.adapters, ["renderer-service"]);
    assert.equal(fixtures.runtimeRegistration.mcpToolRegistered, true);
    assert.equal(fixtures.runtimeRegistration.cliCommandRegistered, true);
    assert.equal(fixtures.runtimeRegistration.runtimeExecutionRegistered, false);
    assert.ok(fixtures.registrationGates.allTargets.includes("thumbnail-renderer-service-implementation"));
    assert.ok(fixtures.registrationGates.frame.includes("frame-source-data-provider"));
    assert.ok(fixtures.registrationGates.frame.includes("tagged-frame-resource-normalizer"));

    for (const fixture of fixtures.cases) {
        await t.test(fixture.id, () => {
            const contract = createRenderThumbnailContract(fixture.input);
            assert.equal(fixture.serviceRequest.command, contract.command);
            assert.equal(fixture.serviceRequest.operation, fixtures.serviceApi.operation);
            assert.equal(fixture.serviceRequest.adapter, fixtures.adapter);
            assert.equal(fixture.serviceRequest.target.kind, contract.target.kind);
            assert.equal(fixture.serviceRequest.target.fileId, contract.target.fileId);
            assert.equal(fixture.serviceRequest.artifact.format, contract.artifact.format);
            assert.equal(fixture.serviceRequest.artifact.width, contract.artifact.width);
            assert.equal(fixture.serviceRequest.artifact.height, contract.artifact.height);
            assert.equal(fixture.serviceRequest.cache.policy, contract.cache.policy);
            assert.equal(fixture.serviceRequest.cache.scope, contract.cache.scope);
            assert.equal(fixture.serviceRequest.cache.key, contract.cache.key);

            if (fixture.serviceRequest.backendRpc.data.command === "get-file-data-for-thumbnail") {
                assert.deepEqual(fixture.serviceRequest.backendRpc.data.request, contract.backendRpc.data.request);
            }
            if (fixture.serviceRequest.backendRpc.persist) {
                assert.equal(fixture.serviceRequest.backendRpc.persist.command, contract.backendRpc.persist.command);
            }
            if (contract.target.kind === RenderThumbnailTargets.FRAME) {
                assert.equal(
                    fixture.serviceRequest.target.objectKey,
                    `${contract.target.fileId}/${contract.target.pageId}/${contract.target.objectId}/${contract.target.tag}`
                );
                assert.ok(fixture.requiredCapabilities.includes("frame-source-data-provider"));
            }
            assert.equal(fixture.expectedResponse.status, "ok");
            assert.match(fixture.expectedResponse.resource.resourceUri, /^\/assets\/by-id\//);
            assert.match(fixture.expectedResponse.resource.downloadUri, /^https:\/\/penpot\.example\.test\/assets\/by-id\//);
            assert.equal(fixture.expectedResponse.resource.contentType, "image/png");
        });
    }

    for (const fixture of fixtures.errorCases) {
        await t.test(fixture.id, () => {
            if (fixture.serviceError) {
                const plan = createRenderThumbnailRendererServicePlan(fixture.input);
                const error = createRenderThumbnailRendererServiceErrorPayload(plan, fixture.serviceError);
                assert.equal(error.code, fixture.expectedError.code);
                assert.equal(error.data.retryable, fixture.expectedError.retryable);
                assert.equal(fixture.expectedError.dispatchServiceRequest, false);
                return;
            }

            const contract = createRenderThumbnailContract(fixture.input);
            assert.deepEqual(contract.requires, fixture.expectedError.requires);
            assert.equal(fixture.expectedError.dispatchServiceRequest, false);
        });
    }
});

test("render.thumbnail renderer-service plan exposes dry-run client request while runtime is unavailable", () => {
    const plan = createRenderThumbnailRendererServicePlan({
        fileId: "file-1",
        pageId: "page-1",
        objectId: "frame-1",
        target: "frame",
        tag: "component",
        width: 300,
        cachePolicy: "refresh",
        endpoint: "http://127.0.0.1:6070/thumbnail",
        publicUri: "https://penpot.example.test",
        probeTimeoutMs: 3500,
        optInConfiguration: {
            entrypoint: "cli",
            cliFlagValue: "renderer-service",
            envValue: "ignored-env",
        },
        clientRequest: {
            entrypoint: "cli",
            cliCommand: "render thumbnail",
        },
    });

    assert.equal(plan.command, "render.thumbnail");
    assert.equal(plan.status, "planned");
    assert.equal(plan.executable, false);
    assert.equal(plan.runtimeAvailable, false);
    assert.equal(plan.adapter, "renderer-service");
    assert.equal(plan.endpoint, "http://127.0.0.1:6070/thumbnail");
    assert.equal(plan.service.operation, "thumbnail.render");
    assert.equal(plan.service.localFileWrites, false);
    assert.equal(plan.client.configured, true);
    assert.equal(plan.client.healthEndpoint, "http://127.0.0.1:6070/thumbnail/health");
    assert.equal(plan.client.probeTimeoutMs, 3500);
    assert.equal(plan.client.networkProbe, false);
    assert.equal(plan.availability.status, "configured-unverified");
    assert.equal(plan.availability.probe, "metadata-only");
    assert.equal(plan.availability.checked, false);
    assert.deepEqual(plan.service.client, plan.client);
    assert.deepEqual(plan.service.availability, plan.availability);
    assert.equal(plan.optInConfiguration.status, "planned-disabled");
    assert.equal(plan.optInConfiguration.dispatch, false);
    assert.equal(plan.optInConfiguration.resolution.selectedSource, "cli-flag");
    assert.equal(plan.optInConfiguration.resolution.selectedValue, "renderer-service");
    assert.equal(plan.optInConfiguration.diagnostics.executionEnabledByConfiguration, false);
    assert.deepEqual(plan.service.optInConfiguration, plan.optInConfiguration);
    assert.equal(plan.executionGate.status, "closed");
    assert.equal(plan.executionGate.dispatch, false);
    assert.equal(plan.executionGate.optIn.env, "PENPOT_RENDER_THUMBNAIL_EXECUTION");
    assert.equal(plan.executionGate.optIn.configured, true);
    assert.equal(plan.executionGate.blockers.includes("explicit-opt-in"), false);
    assert.ok(plan.executionGate.blockers.includes("renderer-service-integration-tests"));
    assert.equal(plan.executionGate.integrationTestPlan.requiredBeforeDispatch, true);
    assert.deepEqual(plan.service.executionGate, plan.executionGate);
    assert.equal(plan.healthPreflight.status, "planned-disabled");
    assert.equal(plan.healthPreflight.dispatch, false);
    assert.equal(plan.healthPreflight.method, "GET");
    assert.equal(plan.healthPreflight.endpoint, "http://127.0.0.1:6070/thumbnail/health");
    assert.equal(plan.healthPreflight.networkProbe, false);
    assert.equal(plan.executionClientHarness.status, "planned-disabled");
    assert.equal(plan.executionClientHarness.dispatch, false);
    assert.deepEqual(plan.executionClientHarness.sequence, ["executionGate", "healthPreflight", "clientRequest", "normalizeResult"]);
    assert.equal(plan.dispatchAdapterBoundary.status, "planned-disabled");
    assert.equal(plan.dispatchAdapterBoundary.dispatch, false);
    assert.equal(plan.dispatchAdapterBoundary.adapter, "renderer-service");
    assert.ok(plan.dispatchAdapterBoundary.configPrecedence.includes("explicit command args"));
    assert.equal(plan.dispatchAdapterBoundary.resultMapping.successHelper, "createRenderThumbnailRendererServiceResult");
    assert.deepEqual(plan.dispatchAdapterBoundary.noDispatchDefaults.healthPreflightDispatch, false);
    assert.deepEqual(plan.service.healthPreflight, plan.healthPreflight);
    assert.deepEqual(plan.service.executionClientHarness, plan.executionClientHarness);
    assert.deepEqual(plan.service.dispatchAdapterBoundary, plan.dispatchAdapterBoundary);
    assert.equal(plan.unavailableErrorTaxonomy.taxonomyVersion, "P25.17");
    assert.equal(plan.unavailableErrorTaxonomy.dispatch, false);
    assert.equal(plan.unavailableErrorTaxonomy.defaultCode, "renderer_service_unavailable");
    assert.deepEqual(plan.service.unavailableErrorTaxonomy, plan.unavailableErrorTaxonomy);
    assert.equal(plan.integrationFixtureHarness.harnessVersion, "P25.18");
    assert.equal(plan.integrationFixtureHarness.dispatch, false);
    assert.equal(plan.integrationFixtureHarness.networkDispatch, false);
    assert.equal(plan.integrationFixtureHarness.localFileWrites, false);
    assert.ok(plan.integrationFixtureHarness.cases.some((entry) => entry.id === "render-success-cli-output-download"));
    assert.deepEqual(plan.service.integrationFixtureHarness, plan.integrationFixtureHarness);
    assert.equal(plan.dispatchRegistrationPreflight.preflightVersion, "P25.19");
    assert.equal(plan.dispatchRegistrationPreflight.dispatch, false);
    assert.equal(plan.dispatchRegistrationPreflight.networkDispatch, false);
    assert.equal(plan.dispatchRegistrationPreflight.runtimeRegistration, false);
    assert.ok(plan.dispatchRegistrationPreflight.blockers.includes("runtime-execution-registration"));
    assert.deepEqual(plan.service.dispatchRegistrationPreflight, plan.dispatchRegistrationPreflight);
    assert.equal(plan.executableAdapterRegistrationScaffold.scaffoldVersion, "P25.20");
    assert.equal(plan.executableAdapterRegistrationScaffold.dispatch, false);
    assert.equal(plan.executableAdapterRegistrationScaffold.networkDispatch, false);
    assert.equal(plan.executableAdapterRegistrationScaffold.runtimeRegistration, false);
    assert.equal(plan.executableAdapterRegistrationScaffold.localFileWrites, false);
    assert.equal(
        plan.executableAdapterRegistrationScaffold.consumes.dispatchRegistrationPreflight.preflightVersion,
        "P25.19"
    );
    assert.equal(plan.executableAdapterRegistrationScaffold.consumes.clientRequest.currentDispatch, false);
    assert.equal(plan.executableAdapterRegistrationScaffold.registrationSurface.runtimeExecutionRegistered, false);
    assert.deepEqual(plan.service.executableAdapterRegistrationScaffold, plan.executableAdapterRegistrationScaffold);
    assert.equal(plan.clientRequest.status, "scaffolded");
    assert.equal(plan.clientRequest.dispatch, false);
    assert.equal(plan.clientRequest.method, "POST");
    assert.equal(plan.clientRequest.endpoint, "http://127.0.0.1:6070/thumbnail");
    assert.equal(plan.clientRequest.timeoutMs, 3500);
    assert.equal(plan.clientRequest.headers["x-penpot-entrypoint"], "cli");
    assert.equal(plan.clientRequest.headers["x-penpot-cli-command"], "render thumbnail");
    assert.equal(plan.clientRequest.authForwarding.tokenValuesIncluded, false);
    assert.deepEqual(plan.clientRequest.body, plan.serviceRequest);
    assert.deepEqual(plan.service.clientRequest, plan.clientRequest);
    assert.equal(plan.service.resourceNormalization.exampleDownloadUri, "https://penpot.example.test/assets/by-id/{mediaId}");
    assert.equal(plan.target.objectKey, "file-1/page-1/frame-1/component");
    assert.equal(plan.artifact.width, 300);
    assert.equal(plan.artifact.height, 200);
    assert.equal(plan.cache.key, "file-1/page-1/frame-1/component");
    assert.equal(plan.serviceRequest.backendRpc.data.command, "get-file-frame-data-for-thumbnail");
    assert.equal(plan.serviceRequest.backendRpc.data.status, "required-future-capability");
    assert.equal(plan.serviceRequest.backendRpc.persist.command, "create-file-object-thumbnail");
    assert.equal(plan.serviceRequest.render.required, true);
    assert.deepEqual(plan.requires, []);
    assert.ok(plan.requiredCapabilities.includes("thumbnail-renderer-service-implementation"));
    assert.ok(plan.requiredCapabilities.includes("frame-source-data-provider"));
    assert.ok(plan.requiredCapabilities.includes("tagged-frame-resource-normalizer"));
    assert.equal(plan.diagnostics.adapterBoundary, "renderer-service-dry-run");
    assert.equal(plan.diagnostics.runtimeExecutionRegistered, false);
    assert.equal(plan.diagnostics.availabilityProbe, "metadata-only");
    assert.equal(plan.diagnostics.optInConfigurationStatus, "planned-disabled");
    assert.equal(plan.diagnostics.executionGateStatus, "closed");
    assert.equal(plan.diagnostics.healthPreflightDispatch, false);
    assert.equal(plan.diagnostics.executionClientHarnessDispatch, false);
    assert.equal(plan.diagnostics.dispatchAdapterBoundaryStatus, "planned-disabled");
    assert.equal(plan.diagnostics.dispatchAdapterBoundaryDispatch, false);
    assert.equal(plan.diagnostics.unavailableErrorTaxonomyVersion, "P25.17");
    assert.equal(plan.diagnostics.integrationFixtureHarnessVersion, "P25.18");
    assert.equal(plan.diagnostics.dispatchRegistrationPreflightVersion, "P25.19");
    assert.equal(plan.diagnostics.executableAdapterRegistrationScaffoldVersion, "P25.20");
});

test("render.thumbnail renderer-service plan reports not-configured availability without endpoint", () => {
    const plan = createRenderThumbnailRendererServicePlan({ fileId: "file-1" });

    assert.equal(plan.endpoint, null);
    assert.equal(plan.client.configured, false);
    assert.equal(plan.client.healthEndpoint, null);
    assert.equal(plan.client.probeTimeoutMs, 2500);
    assert.equal(plan.availability.status, "not-configured");
    assert.equal(plan.availability.networkProbe, false);
    assert.ok(plan.executionGate.blockers.includes("renderer-service-endpoint"));
});

test("render.thumbnail renderer-service execution gate requires explicit opt-in and integration tests before dispatch", () => {
    const gate = createRenderThumbnailRendererServiceExecutionGate({
        endpoint: "http://127.0.0.1:6070/thumbnail",
        targetKind: "file",
        cachePolicy: "reuse",
        requiredCapabilities: ["thumbnail-renderer-service-implementation", "file-thumbnail-cache-probe"],
        executionGate: {
            optInValue: "renderer-service",
            serviceImplemented: true,
            integrationTestsReady: false,
        },
    });

    assert.equal(gate.status, "closed");
    assert.equal(gate.dispatch, false);
    assert.equal(gate.optIn.configured, true);
    assert.equal(gate.readiness.endpointConfigured, true);
    assert.equal(gate.readiness.serviceImplemented, true);
    assert.equal(gate.readiness.integrationTestsReady, false);
    assert.ok(gate.blockers.includes("renderer-service-integration-tests"));
    assert.ok(gate.blockers.includes("file-thumbnail-cache-probe"));
    assert.equal(gate.blockers.includes("thumbnail-renderer-service-implementation"), false);
    assert.ok(gate.blockers.includes("runtime-execution-registration"));
    assert.equal(gate.integrationTestPlan.status, "required-before-dispatch");
    assert.ok(gate.integrationTestPlan.cases.some((entry) => entry.includes("file reuse")));
    assert.ok(gate.failureModes.some((entry) => entry.code === "renderer_service_execution_disabled"));
});

test("render.thumbnail renderer-service opt-in configuration resolves sources without enabling execution", () => {
    const config = createRenderThumbnailRendererServiceOptInConfiguration({
        entrypoint: "mcp",
        mcpArgValue: "renderer-service",
        envValue: "ignored-env",
        profileValue: "ignored-profile",
    });
    const invalid = createRenderThumbnailRendererServiceOptInConfiguration({
        entrypoint: "cli",
        envValue: "enabled",
    });

    assert.equal(config.status, "planned-disabled");
    assert.equal(config.dispatch, false);
    assert.equal(config.resolution.selectedSource, "mcp-arg");
    assert.equal(config.resolution.selectedValue, "renderer-service");
    assert.equal(config.resolution.valid, true);
    assert.equal(config.diagnostics.executionEnabledByConfiguration, false);
    assert.equal(config.diagnostics.gateCanOpenFromConfigurationOnly, false);
    assert.ok(config.futureSurfaces.cliFlags.includes("--render-thumbnail-execution renderer-service"));
    assert.equal(invalid.resolution.selectedSource, "environment");
    assert.equal(invalid.resolution.valid, false);
    assert.match(invalid.resolution.diagnostics, /unsupported opt-in value/);
});

test("render.thumbnail renderer-service health preflight and client harness stay disabled", () => {
    const healthPreflight = createRenderThumbnailRendererServiceHealthPreflight({
        client: {
            healthEndpoint: "http://127.0.0.1:6070/thumbnail/health",
            probeTimeoutMs: 4100,
        },
        executionGate: {
            status: "closed",
        },
    });
    const harness = createRenderThumbnailRendererServiceExecutionClientHarness({
        executionGate: { status: "closed" },
        healthPreflight,
    });

    assert.equal(healthPreflight.status, "planned-disabled");
    assert.equal(healthPreflight.dispatch, false);
    assert.equal(healthPreflight.method, "GET");
    assert.equal(healthPreflight.endpoint, "http://127.0.0.1:6070/thumbnail/health");
    assert.equal(healthPreflight.timeoutMs, 4100);
    assert.equal(healthPreflight.headers["x-penpot-preflight"], "renderer-service-health");
    assert.ok(healthPreflight.failureModes.some((entry) => entry.code === "renderer_service_preflight_disabled"));
    assert.equal(harness.status, "planned-disabled");
    assert.equal(harness.dispatch, false);
    assert.equal(harness.current.healthPreflightStatus, "planned-disabled");
    assert.ok(harness.integrationTestPlan.cases.some((entry) => entry.includes("health preflight failure")));
});

test("render.thumbnail renderer-service dispatch adapter boundary stays no-dispatch", () => {
    const boundary = createRenderThumbnailRendererServiceDispatchAdapterBoundary({
        client: { configured: true },
        executionGate: { status: "closed" },
        healthPreflight: { status: "planned-disabled" },
        executionClientHarness: { status: "planned-disabled" },
    });

    assert.equal(boundary.status, "planned-disabled");
    assert.equal(boundary.adapter, "renderer-service");
    assert.equal(boundary.dispatch, false);
    assert.equal(boundary.current.clientConfigured, true);
    assert.equal(boundary.consumes.executionGate.currentStatus, "closed");
    assert.equal(boundary.consumes.healthPreflight.currentStatus, "planned-disabled");
    assert.equal(boundary.consumes.clientRequest.currentDispatch, false);
    assert.equal(boundary.noDispatchDefaults.metadataOnlyAvailability, true);
    assert.equal(boundary.noDispatchDefaults.renderPostDispatch, false);
    assert.equal(boundary.resultMapping.errorHelper, "createRenderThumbnailRendererServiceErrorPayload");
    assert.ok(boundary.integrationTestPlan.cases.some((entry) => entry.includes("config precedence")));
});

test("render.thumbnail renderer-service unavailable error taxonomy defines stable no-dispatch codes", () => {
    const taxonomy = createRenderThumbnailRendererServiceUnavailableErrorTaxonomy({
        client: { configured: true },
        availability: { status: "configured-unverified" },
        executionGate: { status: "closed" },
        healthPreflight: { status: "planned-disabled" },
        dispatchAdapterBoundary: { status: "planned-disabled" },
    });
    const codes = taxonomy.errors.map((entry) => entry.code);
    const retryable = taxonomy.errors.filter((entry) => entry.retryable).map((entry) => entry.code);

    assert.equal(taxonomy.status, "planned");
    assert.equal(taxonomy.dispatch, false);
    assert.equal(taxonomy.taxonomyVersion, "P25.17");
    assert.equal(taxonomy.defaultCode, "renderer_service_unavailable");
    assert.deepEqual(codes, [
        "renderer_service_unavailable",
        "renderer_service_not_configured",
        "renderer_service_execution_disabled",
        "renderer_service_preflight_disabled",
        "renderer_service_health_unavailable",
        "renderer_service_health_invalid",
        "renderer_service_dispatch_disabled",
        "renderer_service_response_invalid",
        "renderer_service_resource_missing",
    ]);
    assert.deepEqual(retryable, ["renderer_service_health_unavailable"]);
    assert.ok(taxonomy.stages.includes("configuration"));
    assert.ok(taxonomy.stages.includes("resource-normalization"));
    assert.ok(taxonomy.payloadFields.common.includes("unavailableErrorTaxonomy"));
    assert.ok(taxonomy.payloadFields.mcp.includes("resource metadata only"));
    assert.ok(taxonomy.payloadFields.cli.includes("do not download PNG bytes until normalized render success"));
    assert.equal(taxonomy.current.clientConfigured, true);
    assert.equal(taxonomy.current.availabilityStatus, "configured-unverified");
    assert.equal(taxonomy.current.dispatchAdapterBoundaryStatus, "planned-disabled");
});

test("render.thumbnail renderer-service integration fixture harness plans no-dispatch cases", () => {
    const harness = createRenderThumbnailRendererServiceIntegrationFixtureHarness({
        targetKind: "frame",
        cachePolicy: "refresh",
        client: { configured: true },
        executionGate: { status: "closed" },
        healthPreflight: { status: "planned-disabled" },
        dispatchAdapterBoundary: { status: "planned-disabled" },
        unavailableErrorTaxonomy: { taxonomyVersion: "P25.17" },
    });
    const caseIds = harness.cases.map((entry) => entry.id);

    assert.equal(harness.status, "planned-disabled");
    assert.equal(harness.dispatch, false);
    assert.equal(harness.networkDispatch, false);
    assert.equal(harness.localFileWrites, false);
    assert.equal(harness.harnessVersion, "P25.18");
    assert.equal(harness.current.targetKind, "frame");
    assert.equal(harness.current.cachePolicy, "refresh");
    assert.equal(harness.current.clientConfigured, true);
    assert.deepEqual(harness.sequence, [
        "resolveConfig",
        "assertClosedGate",
        "healthPreflightFixture",
        "renderDispatchFixture",
        "normalizeResultOrError",
        "assertMcpCliResourceSemantics",
    ]);
    assert.deepEqual(caseIds, [
        "closed-gate-no-network",
        "missing-endpoint-not-configured",
        "health-unavailable-prevents-render",
        "render-success-mcp-resource-metadata",
        "render-success-cli-output-download",
        "service-error-normalization",
        "auth-forwarding-token-safe",
    ]);
    assert.ok(harness.cases.every((entry) => entry.dispatch === false && entry.networkDispatch === false));
    assert.equal(harness.cases.find((entry) => entry.id === "health-unavailable-prevents-render").expectedCode, "renderer_service_health_unavailable");
    assert.equal(harness.entrypointExpectations.mcp.localFileWrites, false);
    assert.equal(harness.entrypointExpectations.cli.outputDownload, "future executable path only");
    assert.equal(harness.fixtureInputs.fileRefresh.expectedPersistCommand, "create-file-thumbnail");
    assert.equal(harness.fixtureInputs.frameRefresh.expectedPersistCommand, "create-file-object-thumbnail");
    assert.ok(harness.requiredBeforeDispatch.some((entry) => entry.includes("closed gate fixture")));
});

test("render.thumbnail renderer-service dispatch registration preflight stays hard-disabled", () => {
    const preflight = createRenderThumbnailRendererServiceDispatchRegistrationPreflight({
        client: { configured: true },
        availability: { status: "configured-unverified" },
        optInConfiguration: { status: "planned-disabled" },
        executionGate: {
            status: "closed",
            optIn: { configured: true },
            readiness: {
                serviceImplemented: true,
                requiredCapabilities: [{ name: "thumbnail-renderer-service-implementation", satisfied: true }],
            },
        },
        healthPreflight: { status: "planned-disabled" },
        executionClientHarness: { status: "planned-disabled" },
        dispatchAdapterBoundary: { status: "planned-disabled" },
        unavailableErrorTaxonomy: { taxonomyVersion: "P25.17" },
        integrationFixtureHarness: { harnessVersion: "P25.18", status: "planned-disabled" },
        requiredCapabilities: ["thumbnail-renderer-service-implementation", "file-thumbnail-cache-probe"],
    });
    const checkIds = preflight.checks.map((entry) => entry.id);

    assert.equal(preflight.status, "planned-disabled");
    assert.equal(preflight.dispatch, false);
    assert.equal(preflight.networkDispatch, false);
    assert.equal(preflight.runtimeRegistration, false);
    assert.equal(preflight.localFileWrites, false);
    assert.equal(preflight.preflightVersion, "P25.19");
    assert.ok(checkIds.includes("explicit-opt-in"));
    assert.ok(checkIds.includes("integration-fixtures-ready"));
    assert.ok(checkIds.includes("runtime-registration-ready"));
    assert.ok(checkIds.includes("capability:file-thumbnail-cache-probe"));
    assert.equal(preflight.readiness.mayRegisterDispatch, false);
    assert.equal(preflight.registrationPlan.targetAdapter, "renderer-service");
    assert.equal(preflight.registrationPlan.runtimeExecutionRegistered, false);
    assert.ok(preflight.blockers.includes("renderer-service-integration-fixtures"));
    assert.ok(preflight.blockers.includes("renderer-service-health-preflight"));
    assert.ok(preflight.blockers.includes("renderer-service-dispatch-adapter"));
    assert.ok(preflight.blockers.includes("runtime-execution-registration"));
    assert.ok(preflight.blockers.includes("file-thumbnail-cache-probe"));
    assert.ok(preflight.nextActions.some((entry) => entry.includes("Only register executable dispatch")));
});

test("render.thumbnail renderer-service executable adapter registration scaffold stays no-op", () => {
    const scaffold = createRenderThumbnailRendererServiceExecutableAdapterRegistrationScaffold({
        dispatchRegistrationPreflight: {
            status: "planned-disabled",
            preflightVersion: "P25.19",
            readiness: { mayRegisterDispatch: false },
        },
        dispatchAdapterBoundary: { status: "planned-disabled", dispatch: false },
        clientRequest: { dispatch: false, method: "POST" },
    });

    assert.equal(scaffold.status, "planned-disabled");
    assert.equal(scaffold.scaffoldVersion, "P25.20");
    assert.equal(scaffold.adapter, "renderer-service");
    assert.equal(scaffold.dispatch, false);
    assert.equal(scaffold.networkDispatch, false);
    assert.equal(scaffold.runtimeRegistration, false);
    assert.equal(scaffold.localFileWrites, false);
    assert.equal(scaffold.consumes.dispatchRegistrationPreflight.requiredStatus, "ready");
    assert.equal(scaffold.consumes.dispatchRegistrationPreflight.currentStatus, "planned-disabled");
    assert.equal(scaffold.consumes.dispatchRegistrationPreflight.mayRegisterDispatch, false);
    assert.equal(scaffold.consumes.dispatchRegistrationPreflight.preflightVersion, "P25.19");
    assert.equal(scaffold.consumes.dispatchAdapterBoundary.currentDispatch, false);
    assert.equal(scaffold.consumes.clientRequest.requiredDispatch, true);
    assert.equal(scaffold.consumes.clientRequest.currentDispatch, false);
    assert.equal(scaffold.registrationSurface.command, "render.thumbnail");
    assert.deepEqual(scaffold.registrationSurface.entrypoints, ["mcp", "cli"]);
    assert.equal(scaffold.registrationSurface.runtimeExecutionRegistered, false);
    assert.ok(scaffold.noOpBehavior.includes("do not call fetch"));
    assert.ok(scaffold.noOpBehavior.includes("do not call backend RPC"));
    assert.ok(scaffold.noOpBehavior.includes("return renderer_service_unavailable while disabled"));
    assert.ok(scaffold.requiredBeforeEnablement.some((entry) => entry.includes("P25.19")));
});

test("render.thumbnail renderer-service client request scaffold adds MCP audit headers without dispatch", () => {
    const plan = createRenderThumbnailRendererServicePlan({
        fileId: "file-1",
        endpoint: "http://127.0.0.1:6070/thumbnail",
    });
    const request = createRenderThumbnailRendererServiceClientRequest(plan, {
        entrypoint: "mcp",
        mcpToolName: "render.thumbnail",
        mcpSessionId: "session-1",
    });

    assert.equal(request.status, "scaffolded");
    assert.equal(request.dispatch, false);
    assert.equal(request.method, "POST");
    assert.equal(request.headers["x-penpot-command"], "render.thumbnail");
    assert.equal(request.headers["x-penpot-renderer-operation"], "thumbnail.render");
    assert.equal(request.headers["x-penpot-entrypoint"], "mcp");
    assert.equal(request.headers["x-penpot-mcp-tool"], "render.thumbnail");
    assert.equal(request.headers["x-penpot-mcp-session"], "session-1");
    assert.deepEqual(request.authForwarding.headerNames, ["authorization", "cookie"]);
    assert.equal(request.authForwarding.tokenValuesIncluded, false);
});

test("render.thumbnail renderer-service result normalizes resource metadata", () => {
    const plan = createRenderThumbnailRendererServicePlan({
        fileId: "file-1",
        revn: 7,
        cachePolicy: "refresh",
        endpoint: "http://127.0.0.1:6070/thumbnail",
        publicUri: "https://penpot.example.test",
    });
    const fixture = renderThumbnailRendererServiceFixtures.cases.find((entry) => entry.id === "file-refresh-default");
    const result = createRenderThumbnailRendererServiceResult(plan, fixture.expectedResponse, {
        publicUri: "https://penpot.example.test",
    });

    assert.equal(result.command, "render.thumbnail");
    assert.equal(result.status, "ok");
    assert.equal(result.adapter, "renderer-service");
    assert.equal(result.operation, "thumbnail.render");
    assert.equal(result.cache.outcome, "refreshed");
    assert.equal(result.cache.scope, "file-thumbnail");
    assert.equal(result.cache.key, "file:file-1:revn:7");
    assert.equal(result.resource.mediaId, "media-file-thumb-7");
    assert.equal(result.resource.resourceUri, "/assets/by-id/media-file-thumb-7");
    assert.equal(result.resource.downloadUri, "https://penpot.example.test/assets/by-id/media-file-thumb-7");
    assert.equal(result.resource.contentType, "image/png");
    assert.equal(result.renderer.runtime, "render-wasm-worker");
    assert.equal(result.renderer.fallbackUsed, false);
    assert.equal(result.serviceResponse.localFileWrites, false);
});

test("render.thumbnail renderer-service result derives resource URI and errors consistently", () => {
    const plan = createRenderThumbnailRendererServicePlan({ fileId: "file-1" });
    const result = createRenderThumbnailRendererServiceResult(plan, {
        resource: {
            mediaId: "media-derived",
            contentType: "image/png",
        },
    });
    const error = createRenderThumbnailRendererServiceErrorPayload(plan, {
        status: 503,
        code: "renderer_service_unavailable",
        message: "Renderer service unavailable.",
        data: { outage: true },
    });

    assert.equal(result.resource.resourceUri, "/assets/by-id/media-derived");
    assert.equal(result.resource.downloadUri, "https://penpot.example.test/assets/by-id/media-derived");
    assert.throws(
        () => createRenderThumbnailRendererServiceResult(plan, { resource: {} }),
        /renderer-service response requires/
    );
    assert.equal(error.code, "renderer_service_unavailable");
    assert.equal(error.message, "Renderer service unavailable.");
    assert.equal(error.data.command, "render.thumbnail");
    assert.equal(error.data.status, 503);
    assert.equal(error.data.retryable, true);
    assert.deepEqual(error.data.serviceData, { outage: true });
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
