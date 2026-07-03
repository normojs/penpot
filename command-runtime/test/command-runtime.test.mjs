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
    createRenderThumbnailRendererServiceAdapterRegistryManifest,
    createRenderThumbnailRendererServiceClientRequest,
    createRenderThumbnailRendererServiceDispatchAdapterBoundary,
    createRenderThumbnailRendererServiceDispatchRegistrationPreflight,
    createRenderThumbnailRendererServiceExecutableAdapterRegistrationScaffold,
    createRenderThumbnailRendererServiceExecutionGate,
    createRenderThumbnailRendererServiceExecutionClientHarness,
    createRenderThumbnailRendererServiceEnablementChecklist,
    createRenderThumbnailRendererServiceHealthPreflight,
    createRenderThumbnailRendererServiceHostLifecycleTestFixtures,
    createRenderThumbnailRendererServiceHealthNoopContractFixtures,
    createRenderThumbnailRendererServiceImplementationSliceAudit,
    createRenderThumbnailRendererServiceIntegrationFixtureHarness,
    createRenderThumbnailRendererServiceNoopServiceHostScaffold,
    createRenderThumbnailRendererServicePackageCreationGuardrails,
    createRenderThumbnailRendererServicePackageFileTemplates,
    createRenderThumbnailRendererServicePackageManifestScaffold,
    createRenderThumbnailRendererServicePackageWorkspaceWiring,
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
    assert.equal(fixtures.serviceApi.adapterRegistryManifest.manifestVersion, "P25.21");
    assert.equal(fixtures.serviceApi.adapterRegistryManifest.dispatch, false);
    assert.equal(fixtures.serviceApi.adapterRegistryManifest.runtimeRegistration, false);
    assert.equal(fixtures.serviceApi.adapterRegistryManifest.registry.runtimeExecutionRegistered, false);
    assert.equal(fixtures.serviceApi.enablementChecklist.checklistVersion, "P25.22");
    assert.equal(fixtures.serviceApi.enablementChecklist.dispatch, false);
    assert.equal(fixtures.serviceApi.enablementChecklist.runtimeRegistration, false);
    assert.equal(fixtures.serviceApi.enablementChecklist.readiness.mayEnableRuntime, false);
    assert.equal(fixtures.serviceApi.implementationSliceAudit.auditVersion, "P25.23");
    assert.equal(fixtures.serviceApi.implementationSliceAudit.dispatch, false);
    assert.equal(fixtures.serviceApi.implementationSliceAudit.networkDispatch, false);
    assert.equal(fixtures.serviceApi.implementationSliceAudit.runtimeRegistration, false);
    assert.equal(fixtures.serviceApi.implementationSliceAudit.localFileWrites, false);
    assert.equal(fixtures.serviceApi.implementationSliceAudit.selectedSlice.id, "renderer-service-health-and-noop-contract");
    assert.equal(fixtures.serviceApi.implementationSliceAudit.selectedSlice.enablesRuntimeDispatch, false);
    assert.equal(fixtures.serviceApi.healthNoopContractFixtures.fixtureVersion, "P25.24");
    assert.equal(fixtures.serviceApi.healthNoopContractFixtures.dispatch, false);
    assert.equal(fixtures.serviceApi.healthNoopContractFixtures.networkDispatch, false);
    assert.equal(fixtures.serviceApi.healthNoopContractFixtures.runtimeRegistration, false);
    assert.equal(fixtures.serviceApi.healthNoopContractFixtures.localFileWrites, false);
    assert.equal(fixtures.serviceApi.healthNoopContractFixtures.healthContract.okResponse.status, 200);
    assert.equal(fixtures.serviceApi.healthNoopContractFixtures.noopRenderContract.response.status, 501);
    assert.equal(fixtures.serviceApi.noopServiceHostScaffold.scaffoldVersion, "P25.25");
    assert.equal(fixtures.serviceApi.noopServiceHostScaffold.dispatch, false);
    assert.equal(fixtures.serviceApi.noopServiceHostScaffold.networkDispatch, false);
    assert.equal(fixtures.serviceApi.noopServiceHostScaffold.runtimeRegistration, false);
    assert.equal(fixtures.serviceApi.noopServiceHostScaffold.localFileWrites, false);
    assert.equal(fixtures.serviceApi.noopServiceHostScaffold.hostStartup, false);
    assert.equal(fixtures.serviceApi.noopServiceHostScaffold.host.startsProcess, false);
    assert.equal(fixtures.serviceApi.hostLifecycleTestFixtures.fixtureVersion, "P25.26");
    assert.equal(fixtures.serviceApi.hostLifecycleTestFixtures.dispatch, false);
    assert.equal(fixtures.serviceApi.hostLifecycleTestFixtures.networkDispatch, false);
    assert.equal(fixtures.serviceApi.hostLifecycleTestFixtures.runtimeRegistration, false);
    assert.equal(fixtures.serviceApi.hostLifecycleTestFixtures.localFileWrites, false);
    assert.equal(fixtures.serviceApi.hostLifecycleTestFixtures.hostStartup, false);
    assert.equal(fixtures.serviceApi.hostLifecycleTestFixtures.processSpawn, false);
    assert.equal(fixtures.serviceApi.packageManifestScaffold.manifestVersion, "P25.27");
    assert.equal(fixtures.serviceApi.packageManifestScaffold.dispatch, false);
    assert.equal(fixtures.serviceApi.packageManifestScaffold.networkDispatch, false);
    assert.equal(fixtures.serviceApi.packageManifestScaffold.runtimeRegistration, false);
    assert.equal(fixtures.serviceApi.packageManifestScaffold.localFileWrites, false);
    assert.equal(fixtures.serviceApi.packageManifestScaffold.packageCreated, false);
    assert.equal(fixtures.serviceApi.packageManifestScaffold.workspaceMutation, false);
    assert.equal(fixtures.serviceApi.packageCreationGuardrails.guardrailVersion, "P25.28");
    assert.equal(fixtures.serviceApi.packageCreationGuardrails.dispatch, false);
    assert.equal(fixtures.serviceApi.packageCreationGuardrails.networkDispatch, false);
    assert.equal(fixtures.serviceApi.packageCreationGuardrails.runtimeRegistration, false);
    assert.equal(fixtures.serviceApi.packageCreationGuardrails.localFileWrites, false);
    assert.equal(fixtures.serviceApi.packageCreationGuardrails.packageCreated, false);
    assert.equal(fixtures.serviceApi.packageCreationGuardrails.workspaceMutation, false);
    assert.equal(fixtures.serviceApi.packageCreationGuardrails.scriptRunnable, false);
    assert.equal(fixtures.serviceApi.packageFileTemplates.templateVersion, "P25.29");
    assert.equal(fixtures.serviceApi.packageFileTemplates.dispatch, false);
    assert.equal(fixtures.serviceApi.packageFileTemplates.networkDispatch, false);
    assert.equal(fixtures.serviceApi.packageFileTemplates.runtimeRegistration, false);
    assert.equal(fixtures.serviceApi.packageFileTemplates.localFileWrites, false);
    assert.equal(fixtures.serviceApi.packageFileTemplates.packageCreated, false);
    assert.equal(fixtures.serviceApi.packageFileTemplates.workspaceMutation, false);
    assert.equal(fixtures.serviceApi.packageFileTemplates.fileMaterialization, false);
    assert.equal(fixtures.serviceApi.packageWorkspaceWiring.wiringVersion, "P25.30");
    assert.equal(fixtures.serviceApi.packageWorkspaceWiring.dispatch, false);
    assert.equal(fixtures.serviceApi.packageWorkspaceWiring.networkDispatch, false);
    assert.equal(fixtures.serviceApi.packageWorkspaceWiring.runtimeRegistration, false);
    assert.equal(fixtures.serviceApi.packageWorkspaceWiring.localFileWrites, false);
    assert.equal(fixtures.serviceApi.packageWorkspaceWiring.workspaceMutation, false);
    assert.equal(fixtures.serviceApi.packageWorkspaceWiring.lockfileMutation, false);
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
    assert.equal(plan.adapterRegistryManifest.manifestVersion, "P25.21");
    assert.equal(plan.adapterRegistryManifest.dispatch, false);
    assert.equal(plan.adapterRegistryManifest.networkDispatch, false);
    assert.equal(plan.adapterRegistryManifest.runtimeRegistration, false);
    assert.equal(plan.adapterRegistryManifest.localFileWrites, false);
    assert.equal(plan.adapterRegistryManifest.consumes.executableAdapterRegistrationScaffold.scaffoldVersion, "P25.20");
    assert.equal(plan.adapterRegistryManifest.registry.key, "renderer-service");
    assert.equal(plan.adapterRegistryManifest.registry.runtimeExecutionRegistered, false);
    assert.equal(plan.adapterRegistryManifest.entrypoints.mcp.dryRunOnly, true);
    assert.equal(plan.adapterRegistryManifest.entrypoints.cli.outputWritesRequireNormalizedDownloadUri, true);
    assert.deepEqual(plan.service.adapterRegistryManifest, plan.adapterRegistryManifest);
    assert.equal(plan.enablementChecklist.checklistVersion, "P25.22");
    assert.equal(plan.enablementChecklist.dispatch, false);
    assert.equal(plan.enablementChecklist.networkDispatch, false);
    assert.equal(plan.enablementChecklist.runtimeRegistration, false);
    assert.equal(plan.enablementChecklist.localFileWrites, false);
    assert.equal(plan.enablementChecklist.readiness.allGatesSatisfied, false);
    assert.equal(plan.enablementChecklist.readiness.mayEnableRuntime, false);
    assert.equal(plan.enablementChecklist.readiness.mayDispatchNetwork, false);
    assert.equal(plan.enablementChecklist.readiness.mayWriteLocalFiles, false);
    assert.equal(plan.enablementChecklist.versions.adapterRegistryManifest, "P25.21");
    assert.ok(plan.enablementChecklist.blockers.includes("renderer-service-adapter-registry"));
    assert.ok(plan.enablementChecklist.blockers.includes("runtime-execution-registration"));
    assert.ok(plan.enablementChecklist.blockers.includes("thumbnail-renderer-service-implementation"));
    assert.deepEqual(plan.service.enablementChecklist, plan.enablementChecklist);
    assert.equal(plan.implementationSliceAudit.auditVersion, "P25.23");
    assert.equal(plan.implementationSliceAudit.dispatch, false);
    assert.equal(plan.implementationSliceAudit.networkDispatch, false);
    assert.equal(plan.implementationSliceAudit.runtimeRegistration, false);
    assert.equal(plan.implementationSliceAudit.localFileWrites, false);
    assert.equal(plan.implementationSliceAudit.selectedSlice.id, "renderer-service-health-and-noop-contract");
    assert.equal(plan.implementationSliceAudit.selectedSlice.enablesRuntimeDispatch, false);
    assert.ok(plan.implementationSliceAudit.blockers.includes("runtime-execution-registration"));
    assert.ok(plan.implementationSliceAudit.blockers.includes("thumbnail-renderer-service-implementation"));
    assert.deepEqual(plan.service.implementationSliceAudit, plan.implementationSliceAudit);
    assert.equal(plan.healthNoopContractFixtures.fixtureVersion, "P25.24");
    assert.equal(plan.healthNoopContractFixtures.dispatch, false);
    assert.equal(plan.healthNoopContractFixtures.networkDispatch, false);
    assert.equal(plan.healthNoopContractFixtures.runtimeRegistration, false);
    assert.equal(plan.healthNoopContractFixtures.localFileWrites, false);
    assert.equal(plan.healthNoopContractFixtures.selectedSlice, "renderer-service-health-and-noop-contract");
    assert.equal(plan.healthNoopContractFixtures.consumes.implementationSliceAudit.auditVersion, "P25.23");
    assert.equal(plan.healthNoopContractFixtures.consumes.clientRequest.currentDispatch, false);
    assert.equal(plan.healthNoopContractFixtures.healthContract.endpoint, "http://127.0.0.1:6070/thumbnail/health");
    assert.equal(plan.healthNoopContractFixtures.healthContract.okResponse.status, 200);
    assert.equal(plan.healthNoopContractFixtures.noopRenderContract.response.status, 501);
    assert.equal(plan.healthNoopContractFixtures.noopRenderContract.response.body.resource, null);
    assert.ok(plan.healthNoopContractFixtures.fixtureCases.some((entry) => entry.id === "thumbnail-render-noop-no-png"));
    assert.deepEqual(plan.service.healthNoopContractFixtures, plan.healthNoopContractFixtures);
    assert.equal(plan.noopServiceHostScaffold.scaffoldVersion, "P25.25");
    assert.equal(plan.noopServiceHostScaffold.dispatch, false);
    assert.equal(plan.noopServiceHostScaffold.networkDispatch, false);
    assert.equal(plan.noopServiceHostScaffold.runtimeRegistration, false);
    assert.equal(plan.noopServiceHostScaffold.localFileWrites, false);
    assert.equal(plan.noopServiceHostScaffold.hostStartup, false);
    assert.equal(plan.noopServiceHostScaffold.consumes.healthNoopContractFixtures.fixtureVersion, "P25.24");
    assert.equal(plan.noopServiceHostScaffold.host.endpoint, "http://127.0.0.1:6070/thumbnail");
    assert.equal(plan.noopServiceHostScaffold.host.healthEndpoint, "http://127.0.0.1:6070/thumbnail/health");
    assert.equal(plan.noopServiceHostScaffold.host.startsProcess, false);
    assert.equal(plan.noopServiceHostScaffold.host.rendersPng, false);
    assert.ok(plan.noopServiceHostScaffold.routes.some((entry) => entry.id === "thumbnail-render-noop"));
    assert.deepEqual(plan.service.noopServiceHostScaffold, plan.noopServiceHostScaffold);
    assert.equal(plan.hostLifecycleTestFixtures.fixtureVersion, "P25.26");
    assert.equal(plan.hostLifecycleTestFixtures.dispatch, false);
    assert.equal(plan.hostLifecycleTestFixtures.networkDispatch, false);
    assert.equal(plan.hostLifecycleTestFixtures.runtimeRegistration, false);
    assert.equal(plan.hostLifecycleTestFixtures.localFileWrites, false);
    assert.equal(plan.hostLifecycleTestFixtures.hostStartup, false);
    assert.equal(plan.hostLifecycleTestFixtures.processSpawn, false);
    assert.equal(plan.hostLifecycleTestFixtures.consumes.noopServiceHostScaffold.scaffoldVersion, "P25.25");
    assert.ok(plan.hostLifecycleTestFixtures.fixtureMatrix.some((entry) => entry.id === "start-plan-does-not-spawn-process"));
    assert.ok(plan.hostLifecycleTestFixtures.fixtureMatrix.some((entry) => entry.id === "readiness-plan-uses-health-fixture"));
    assert.equal(plan.hostLifecycleTestFixtures.assertions.unavailablePayloadIncludesScaffold, true);
    assert.deepEqual(plan.service.hostLifecycleTestFixtures, plan.hostLifecycleTestFixtures);
    assert.equal(plan.packageManifestScaffold.manifestVersion, "P25.27");
    assert.equal(plan.packageManifestScaffold.dispatch, false);
    assert.equal(plan.packageManifestScaffold.networkDispatch, false);
    assert.equal(plan.packageManifestScaffold.runtimeRegistration, false);
    assert.equal(plan.packageManifestScaffold.localFileWrites, false);
    assert.equal(plan.packageManifestScaffold.packageCreated, false);
    assert.equal(plan.packageManifestScaffold.workspaceMutation, false);
    assert.equal(plan.packageManifestScaffold.scriptRunnable, false);
    assert.equal(plan.packageManifestScaffold.consumes.hostLifecycleTestFixtures.fixtureVersion, "P25.26");
    assert.equal(plan.packageManifestScaffold.package.name, "@penpot/renderer-service");
    assert.equal(plan.packageManifestScaffold.package.workspaceRegistered, false);
    assert.equal(plan.packageManifestScaffold.workspaceIntegration.lockfileMutation, false);
    assert.ok(plan.packageManifestScaffold.plannedFiles.includes("renderer-service/package.json"));
    assert.deepEqual(plan.service.packageManifestScaffold, plan.packageManifestScaffold);
    assert.equal(plan.packageCreationGuardrails.guardrailVersion, "P25.28");
    assert.equal(plan.packageCreationGuardrails.dispatch, false);
    assert.equal(plan.packageCreationGuardrails.networkDispatch, false);
    assert.equal(plan.packageCreationGuardrails.runtimeRegistration, false);
    assert.equal(plan.packageCreationGuardrails.localFileWrites, false);
    assert.equal(plan.packageCreationGuardrails.hostStartup, false);
    assert.equal(plan.packageCreationGuardrails.processSpawn, false);
    assert.equal(plan.packageCreationGuardrails.packageCreated, false);
    assert.equal(plan.packageCreationGuardrails.workspaceMutation, false);
    assert.equal(plan.packageCreationGuardrails.scriptRunnable, false);
    assert.equal(plan.packageCreationGuardrails.consumes.packageManifestScaffold.manifestVersion, "P25.27");
    assert.equal(plan.packageCreationGuardrails.creationReadiness.canCreatePackage, false);
    assert.ok(plan.packageCreationGuardrails.creationReadiness.requiredChecks.some((entry) => entry.id === "workspace-manifest-review" && entry.satisfied === false));
    assert.ok(plan.packageCreationGuardrails.blockedMutations.workspaceFiles.includes("pnpm-lock.yaml"));
    assert.ok(plan.packageCreationGuardrails.deniedInThisStep.includes("create renderer-service directory"));
    assert.deepEqual(plan.service.packageCreationGuardrails, plan.packageCreationGuardrails);
    assert.equal(plan.packageFileTemplates.templateVersion, "P25.29");
    assert.equal(plan.packageFileTemplates.dispatch, false);
    assert.equal(plan.packageFileTemplates.networkDispatch, false);
    assert.equal(plan.packageFileTemplates.runtimeRegistration, false);
    assert.equal(plan.packageFileTemplates.localFileWrites, false);
    assert.equal(plan.packageFileTemplates.hostStartup, false);
    assert.equal(plan.packageFileTemplates.processSpawn, false);
    assert.equal(plan.packageFileTemplates.packageCreated, false);
    assert.equal(plan.packageFileTemplates.workspaceMutation, false);
    assert.equal(plan.packageFileTemplates.scriptRunnable, false);
    assert.equal(plan.packageFileTemplates.fileMaterialization, false);
    assert.equal(plan.packageFileTemplates.consumes.packageCreationGuardrails.guardrailVersion, "P25.28");
    assert.equal(plan.packageFileTemplates.packageJson.path, "renderer-service/package.json");
    assert.equal(plan.packageFileTemplates.packageJson.materialized, false);
    assert.equal(plan.packageFileTemplates.packageJson.package.name, "@penpot/renderer-service");
    assert.equal(plan.packageFileTemplates.tsconfig.writesFile, false);
    assert.ok(plan.packageFileTemplates.sourceFiles.some((entry) => entry.path === "renderer-service/src/noop-host.ts" && entry.startsProcess === false));
    assert.ok(plan.packageFileTemplates.testFiles.some((entry) => entry.path === "renderer-service/test/noop-host.test.mjs" && entry.processSpawn === false));
    assert.deepEqual(plan.service.packageFileTemplates, plan.packageFileTemplates);
    assert.equal(plan.packageWorkspaceWiring.wiringVersion, "P25.30");
    assert.equal(plan.packageWorkspaceWiring.dispatch, false);
    assert.equal(plan.packageWorkspaceWiring.networkDispatch, false);
    assert.equal(plan.packageWorkspaceWiring.runtimeRegistration, false);
    assert.equal(plan.packageWorkspaceWiring.localFileWrites, false);
    assert.equal(plan.packageWorkspaceWiring.hostStartup, false);
    assert.equal(plan.packageWorkspaceWiring.processSpawn, false);
    assert.equal(plan.packageWorkspaceWiring.packageCreated, false);
    assert.equal(plan.packageWorkspaceWiring.workspaceMutation, false);
    assert.equal(plan.packageWorkspaceWiring.scriptRunnable, false);
    assert.equal(plan.packageWorkspaceWiring.fileMaterialization, false);
    assert.equal(plan.packageWorkspaceWiring.lockfileMutation, false);
    assert.equal(plan.packageWorkspaceWiring.rootPackageJsonMutation, false);
    assert.equal(plan.packageWorkspaceWiring.pnpmWorkspaceMutation, false);
    assert.equal(plan.packageWorkspaceWiring.consumes.packageFileTemplates.templateVersion, "P25.29");
    assert.ok(plan.packageWorkspaceWiring.workspaceEntries.some((entry) => entry.file === "pnpm-workspace.yaml" && entry.mutateNow === false));
    assert.ok(plan.packageWorkspaceWiring.rootPackageScripts.some((entry) => entry.script === "renderer-service:test" && entry.runnable === false));
    assert.equal(plan.packageWorkspaceWiring.lockfilePlan.mutateNow, false);
    assert.equal(plan.packageWorkspaceWiring.workspaceDependencyPlan.workspaceRegistered, false);
    assert.deepEqual(plan.service.packageWorkspaceWiring, plan.packageWorkspaceWiring);
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
    assert.equal(plan.diagnostics.adapterRegistryManifestVersion, "P25.21");
    assert.equal(plan.diagnostics.enablementChecklistVersion, "P25.22");
    assert.equal(plan.diagnostics.implementationSliceAuditVersion, "P25.23");
    assert.equal(plan.diagnostics.healthNoopContractFixturesVersion, "P25.24");
    assert.equal(plan.diagnostics.noopServiceHostScaffoldVersion, "P25.25");
    assert.equal(plan.diagnostics.hostLifecycleTestFixturesVersion, "P25.26");
    assert.equal(plan.diagnostics.packageManifestScaffoldVersion, "P25.27");
    assert.equal(plan.diagnostics.packageCreationGuardrailsVersion, "P25.28");
    assert.equal(plan.diagnostics.packageFileTemplatesVersion, "P25.29");
    assert.equal(plan.diagnostics.packageWorkspaceWiringVersion, "P25.30");
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

test("render.thumbnail renderer-service adapter registry manifest stays metadata-only", () => {
    const manifest = createRenderThumbnailRendererServiceAdapterRegistryManifest({
        executableAdapterRegistrationScaffold: {
            status: "planned-disabled",
            scaffoldVersion: "P25.20",
        },
        dispatchRegistrationPreflight: {
            status: "planned-disabled",
            preflightVersion: "P25.19",
        },
        dispatchAdapterBoundary: {
            status: "planned-disabled",
            dispatch: false,
        },
    });

    assert.equal(manifest.status, "planned-disabled");
    assert.equal(manifest.manifestVersion, "P25.21");
    assert.equal(manifest.adapter, "renderer-service");
    assert.equal(manifest.command, "render.thumbnail");
    assert.equal(manifest.dispatch, false);
    assert.equal(manifest.networkDispatch, false);
    assert.equal(manifest.runtimeRegistration, false);
    assert.equal(manifest.localFileWrites, false);
    assert.equal(manifest.consumes.executableAdapterRegistrationScaffold.requiredStatus, "ready");
    assert.equal(manifest.consumes.executableAdapterRegistrationScaffold.currentStatus, "planned-disabled");
    assert.equal(manifest.consumes.executableAdapterRegistrationScaffold.scaffoldVersion, "P25.20");
    assert.equal(manifest.consumes.dispatchRegistrationPreflight.preflightVersion, "P25.19");
    assert.equal(manifest.consumes.dispatchAdapterBoundary.currentDispatch, false);
    assert.equal(manifest.registry.namespace, "render.thumbnail.adapters");
    assert.equal(manifest.registry.key, "renderer-service");
    assert.equal(manifest.registry.descriptorAdapterAlreadyPresent, true);
    assert.equal(manifest.registry.runtimeExecutionRegistered, false);
    assert.equal(manifest.registry.defaultEnabled, false);
    assert.equal(manifest.entrypoints.mcp.tool, "render.thumbnail");
    assert.equal(manifest.entrypoints.mcp.dryRunOnly, true);
    assert.equal(manifest.entrypoints.mcp.localFileWrites, false);
    assert.equal(manifest.entrypoints.cli.command, "render thumbnail");
    assert.equal(manifest.entrypoints.cli.dryRunOnly, true);
    assert.equal(manifest.entrypoints.cli.outputWritesRequireNormalizedDownloadUri, true);
    assert.ok(manifest.noOpGuarantees.includes("do not mutate command runtime adapter registry"));
    assert.ok(manifest.noOpGuarantees.includes("do not call renderer-service network endpoints"));
    assert.ok(manifest.requiredBeforeEnablement.some((entry) => entry.includes("P25.20")));
});

test("render.thumbnail renderer-service enablement checklist stays hard-disabled", () => {
    const checklist = createRenderThumbnailRendererServiceEnablementChecklist({
        optInConfiguration: { status: "planned-disabled" },
        executionGate: { status: "closed" },
        healthPreflight: { status: "planned-disabled" },
        executionClientHarness: { status: "planned-disabled" },
        dispatchAdapterBoundary: { status: "planned-disabled" },
        unavailableErrorTaxonomy: { taxonomyVersion: "P25.17" },
        integrationFixtureHarness: { status: "planned-disabled", harnessVersion: "P25.18" },
        dispatchRegistrationPreflight: { status: "planned-disabled", preflightVersion: "P25.19" },
        executableAdapterRegistrationScaffold: { status: "planned-disabled", scaffoldVersion: "P25.20" },
        adapterRegistryManifest: { status: "planned-disabled", manifestVersion: "P25.21" },
        requiredCapabilities: ["thumbnail-renderer-service-implementation", "file-thumbnail-cache-probe"],
    });
    const gateIds = checklist.gates.map((entry) => entry.id);

    assert.equal(checklist.status, "planned-disabled");
    assert.equal(checklist.checklistVersion, "P25.22");
    assert.equal(checklist.adapter, "renderer-service");
    assert.equal(checklist.command, "render.thumbnail");
    assert.equal(checklist.dispatch, false);
    assert.equal(checklist.networkDispatch, false);
    assert.equal(checklist.runtimeRegistration, false);
    assert.equal(checklist.localFileWrites, false);
    assert.ok(gateIds.includes("opt-in-configuration"));
    assert.ok(gateIds.includes("adapter-registry-ready"));
    assert.ok(gateIds.includes("capability:thumbnail-renderer-service-implementation"));
    assert.equal(checklist.readiness.allGatesSatisfied, false);
    assert.equal(checklist.readiness.mayEnableRuntime, false);
    assert.equal(checklist.readiness.mayDispatchNetwork, false);
    assert.equal(checklist.readiness.mayWriteLocalFiles, false);
    assert.equal(checklist.versions.unavailableErrorTaxonomy, "P25.17");
    assert.equal(checklist.versions.integrationFixtureHarness, "P25.18");
    assert.equal(checklist.versions.dispatchRegistrationPreflight, "P25.19");
    assert.equal(checklist.versions.executableAdapterRegistrationScaffold, "P25.20");
    assert.equal(checklist.versions.adapterRegistryManifest, "P25.21");
    assert.ok(checklist.blockers.includes("renderer-service-adapter-registry"));
    assert.ok(checklist.blockers.includes("thumbnail-renderer-service-implementation"));
    assert.ok(checklist.requiredBeforeEnablement.includes("implement renderer-service runtime and health endpoint"));
    assert.ok(checklist.requiredBeforeEnablement.some((entry) => entry.includes("CLI --output")));
});

test("render.thumbnail renderer-service implementation slice audit selects no-op health contract", () => {
    const audit = createRenderThumbnailRendererServiceImplementationSliceAudit({
        enablementChecklist: { status: "planned-disabled", checklistVersion: "P25.22" },
        adapterRegistryManifest: { status: "planned-disabled", manifestVersion: "P25.21" },
        executableAdapterRegistrationScaffold: { status: "planned-disabled", scaffoldVersion: "P25.20" },
        dispatchRegistrationPreflight: { status: "planned-disabled", preflightVersion: "P25.19" },
        requiredCapabilities: ["thumbnail-renderer-service-implementation", "file-thumbnail-cache-probe"],
    });

    assert.equal(audit.status, "planned-disabled");
    assert.equal(audit.auditVersion, "P25.23");
    assert.equal(audit.adapter, "renderer-service");
    assert.equal(audit.command, "render.thumbnail");
    assert.equal(audit.dispatch, false);
    assert.equal(audit.networkDispatch, false);
    assert.equal(audit.runtimeRegistration, false);
    assert.equal(audit.localFileWrites, false);
    assert.equal(audit.selectedSlice.id, "renderer-service-health-and-noop-contract");
    assert.equal(audit.selectedSlice.selected, true);
    assert.equal(audit.selectedSlice.enablesRuntimeDispatch, false);
    assert.ok(audit.auditedSurfaces.backendRpc.includes("get-file-data-for-thumbnail"));
    assert.ok(audit.auditedSurfaces.entrypoints.includes("penpot-cli render thumbnail"));
    assert.ok(audit.implementationSlices.some((entry) => entry.id === "file-refresh-render" && entry.selected === false));
    assert.equal(audit.consumes.enablementChecklist.checklistVersion, "P25.22");
    assert.equal(audit.consumes.adapterRegistryManifest.runtimeExecutionRegistered, false);
    assert.ok(audit.blockers.includes("renderer-service-health-endpoint-contract"));
    assert.ok(audit.blockers.includes("thumbnail-renderer-service-implementation"));
    assert.ok(audit.requiredBeforeRuntimeDispatch.includes("enable command-runtime dispatch in a separate reviewed task"));
});

test("render.thumbnail renderer-service health/no-op contract fixtures stay metadata-only", () => {
    const fixtures = createRenderThumbnailRendererServiceHealthNoopContractFixtures({
        client: {
            endpoint: "http://127.0.0.1:6070/thumbnail",
            healthEndpoint: "http://127.0.0.1:6070/thumbnail/health",
            probeTimeoutMs: 3000,
        },
        implementationSliceAudit: {
            auditVersion: "P25.23",
            selectedSlice: { id: "renderer-service-health-and-noop-contract", enablesRuntimeDispatch: false },
        },
        healthPreflight: { status: "planned-disabled", dispatch: false },
        clientRequest: { method: "POST", dispatch: false },
    });

    assert.equal(fixtures.status, "planned-disabled");
    assert.equal(fixtures.fixtureVersion, "P25.24");
    assert.equal(fixtures.adapter, "renderer-service");
    assert.equal(fixtures.command, "render.thumbnail");
    assert.equal(fixtures.dispatch, false);
    assert.equal(fixtures.networkDispatch, false);
    assert.equal(fixtures.runtimeRegistration, false);
    assert.equal(fixtures.localFileWrites, false);
    assert.equal(fixtures.selectedSlice, "renderer-service-health-and-noop-contract");
    assert.equal(fixtures.consumes.implementationSliceAudit.auditVersion, "P25.23");
    assert.equal(fixtures.consumes.implementationSliceAudit.enablesRuntimeDispatch, false);
    assert.equal(fixtures.consumes.healthPreflight.currentDispatch, false);
    assert.equal(fixtures.consumes.clientRequest.currentDispatch, false);
    assert.equal(fixtures.healthContract.method, "GET");
    assert.equal(fixtures.healthContract.endpoint, "http://127.0.0.1:6070/thumbnail/health");
    assert.equal(fixtures.healthContract.timeoutMs, 3000);
    assert.equal(fixtures.healthContract.dispatch, false);
    assert.equal(fixtures.healthContract.networkDispatch, false);
    assert.equal(fixtures.healthContract.okResponse.status, 200);
    assert.equal(fixtures.healthContract.okResponse.body.runtimeRegistration, false);
    assert.ok(fixtures.healthContract.okResponse.body.capabilities.includes("thumbnail.render.noop"));
    assert.equal(fixtures.noopRenderContract.operation, "thumbnail.render");
    assert.equal(fixtures.noopRenderContract.dispatch, false);
    assert.equal(fixtures.noopRenderContract.networkDispatch, false);
    assert.equal(fixtures.noopRenderContract.localFileWrites, false);
    assert.equal(fixtures.noopRenderContract.response.status, 501);
    assert.equal(fixtures.noopRenderContract.response.body.code, "renderer_service_noop");
    assert.equal(fixtures.noopRenderContract.response.body.resource, null);
    assert.ok(fixtures.fixtureCases.some((entry) => entry.id === "health-ok-no-runtime-registration"));
    assert.ok(fixtures.noOpGuarantees.includes("do not perform health fetches from command-runtime, MCP, or CLI"));
    assert.ok(fixtures.requiredBeforeRuntimeDispatch.includes("replace the no-op thumbnail.render response with a gated renderer-service implementation"));
});

test("render.thumbnail renderer-service no-op service host scaffold stays disabled", () => {
    const scaffold = createRenderThumbnailRendererServiceNoopServiceHostScaffold({
        client: {
            endpoint: "http://127.0.0.1:6070/thumbnail",
            healthEndpoint: "http://127.0.0.1:6070/thumbnail/health",
        },
        healthNoopContractFixtures: {
            status: "planned-disabled",
            fixtureVersion: "P25.24",
            dispatch: false,
            healthContract: { id: "renderer-service-health" },
            noopRenderContract: { id: "thumbnail-render-noop" },
        },
        implementationSliceAudit: {
            auditVersion: "P25.23",
            selectedSlice: { id: "renderer-service-health-and-noop-contract" },
        },
    });

    assert.equal(scaffold.status, "planned-disabled");
    assert.equal(scaffold.scaffoldVersion, "P25.25");
    assert.equal(scaffold.adapter, "renderer-service");
    assert.equal(scaffold.command, "render.thumbnail");
    assert.equal(scaffold.dispatch, false);
    assert.equal(scaffold.networkDispatch, false);
    assert.equal(scaffold.runtimeRegistration, false);
    assert.equal(scaffold.localFileWrites, false);
    assert.equal(scaffold.hostStartup, false);
    assert.equal(scaffold.selectedSlice, "renderer-service-health-and-noop-contract");
    assert.equal(scaffold.consumes.healthNoopContractFixtures.fixtureVersion, "P25.24");
    assert.equal(scaffold.consumes.healthNoopContractFixtures.currentDispatch, false);
    assert.equal(scaffold.consumes.implementationSliceAudit.auditVersion, "P25.23");
    assert.equal(scaffold.host.id, "renderer-service-noop-host");
    assert.equal(scaffold.host.packageName, "@penpot/renderer-service");
    assert.equal(scaffold.host.endpoint, "http://127.0.0.1:6070/thumbnail");
    assert.equal(scaffold.host.healthEndpoint, "http://127.0.0.1:6070/thumbnail/health");
    assert.equal(scaffold.host.startsProcess, false);
    assert.equal(scaffold.host.registersRuntime, false);
    assert.equal(scaffold.host.callsBackendRpc, false);
    assert.equal(scaffold.host.rendersPng, false);
    assert.equal(scaffold.host.writesLocalFiles, false);
    assert.ok(scaffold.routes.some((entry) => entry.id === "health" && entry.dispatch === false));
    assert.ok(scaffold.routes.some((entry) => entry.id === "thumbnail-render-noop" && entry.dispatch === false));
    assert.equal(scaffold.configuration.defaultMode, "noop");
    assert.equal(scaffold.lifecycle.hostStartup, false);
    assert.equal(scaffold.observability.tokenValuesIncluded, false);
    assert.ok(scaffold.noOpGuarantees.includes("do not start a renderer-service process from command-runtime, MCP, or CLI"));
    assert.ok(scaffold.requiredBeforeRuntimeDispatch.includes("create the renderer-service package and noop host entrypoint in a dedicated implementation task"));
});

test("render.thumbnail renderer-service host lifecycle test fixtures stay disabled", () => {
    const fixtures = createRenderThumbnailRendererServiceHostLifecycleTestFixtures({
        noopServiceHostScaffold: {
            status: "planned-disabled",
            scaffoldVersion: "P25.25",
            hostStartup: false,
        },
        healthNoopContractFixtures: {
            status: "planned-disabled",
            fixtureVersion: "P25.24",
            dispatch: false,
            healthContract: { id: "renderer-service-health" },
        },
    });

    assert.equal(fixtures.status, "planned-disabled");
    assert.equal(fixtures.fixtureVersion, "P25.26");
    assert.equal(fixtures.adapter, "renderer-service");
    assert.equal(fixtures.command, "render.thumbnail");
    assert.equal(fixtures.dispatch, false);
    assert.equal(fixtures.networkDispatch, false);
    assert.equal(fixtures.runtimeRegistration, false);
    assert.equal(fixtures.localFileWrites, false);
    assert.equal(fixtures.hostStartup, false);
    assert.equal(fixtures.processSpawn, false);
    assert.equal(fixtures.consumes.noopServiceHostScaffold.scaffoldVersion, "P25.25");
    assert.equal(fixtures.consumes.noopServiceHostScaffold.hostStartup, false);
    assert.equal(fixtures.consumes.healthNoopContractFixtures.fixtureVersion, "P25.24");
    assert.equal(fixtures.consumes.healthNoopContractFixtures.currentDispatch, false);
    assert.ok(fixtures.fixtureMatrix.some((entry) => entry.id === "start-plan-does-not-spawn-process" && entry.processSpawn === false));
    assert.ok(fixtures.fixtureMatrix.some((entry) => entry.id === "stop-plan-does-not-signal-process" && entry.processSignal === false));
    assert.ok(fixtures.fixtureMatrix.some((entry) => entry.id === "readiness-plan-uses-health-fixture" && entry.networkDispatch === false));
    assert.ok(fixtures.fixtureMatrix.some((entry) => entry.id === "supervision-plan-disabled" && entry.restartPolicy === "none"));
    assert.equal(fixtures.assertions.hostStartup, false);
    assert.equal(fixtures.assertions.processSpawn, false);
    assert.equal(fixtures.assertions.networkDispatch, false);
    assert.equal(fixtures.assertions.runtimeRegistration, false);
    assert.equal(fixtures.assertions.localFileWrites, false);
    assert.equal(fixtures.assertions.tokenValuesIncluded, false);
    assert.equal(fixtures.assertions.unavailablePayloadIncludesScaffold, true);
    assert.equal(fixtures.testEntrypoints.commandRuntime, "createRenderThumbnailRendererServiceHostLifecycleTestFixtures");
    assert.ok(fixtures.noOpGuarantees.includes("do not spawn renderer-service in lifecycle fixture tests"));
    assert.ok(fixtures.requiredBeforeRuntimeDispatch.includes("implement lifecycle tests against a real no-op host in a dedicated task"));
});

test("render.thumbnail renderer-service package manifest scaffold stays metadata-only", () => {
    const scaffold = createRenderThumbnailRendererServicePackageManifestScaffold({
        noopServiceHostScaffold: {
            status: "planned-disabled",
            scaffoldVersion: "P25.25",
            hostStartup: false,
        },
        hostLifecycleTestFixtures: {
            status: "planned-disabled",
            fixtureVersion: "P25.26",
            processSpawn: false,
        },
    });

    assert.equal(scaffold.status, "planned-disabled");
    assert.equal(scaffold.manifestVersion, "P25.27");
    assert.equal(scaffold.adapter, "renderer-service");
    assert.equal(scaffold.command, "render.thumbnail");
    assert.equal(scaffold.dispatch, false);
    assert.equal(scaffold.networkDispatch, false);
    assert.equal(scaffold.runtimeRegistration, false);
    assert.equal(scaffold.localFileWrites, false);
    assert.equal(scaffold.packageCreated, false);
    assert.equal(scaffold.workspaceMutation, false);
    assert.equal(scaffold.scriptRunnable, false);
    assert.equal(scaffold.consumes.noopServiceHostScaffold.scaffoldVersion, "P25.25");
    assert.equal(scaffold.consumes.noopServiceHostScaffold.hostStartup, false);
    assert.equal(scaffold.consumes.hostLifecycleTestFixtures.fixtureVersion, "P25.26");
    assert.equal(scaffold.consumes.hostLifecycleTestFixtures.processSpawn, false);
    assert.equal(scaffold.package.name, "@penpot/renderer-service");
    assert.equal(scaffold.package.directory, "renderer-service");
    assert.equal(scaffold.package.packageCreated, false);
    assert.equal(scaffold.package.workspaceRegistered, false);
    assert.equal(scaffold.scripts["start:noop"].runnable, false);
    assert.equal(scaffold.scripts["start:noop"].startsProcess, false);
    assert.equal(scaffold.scripts.build.emitsFiles, false);
    assert.equal(scaffold.dependencies.addNow, false);
    assert.deepEqual(scaffold.dependencies.runtime, []);
    assert.ok(scaffold.dependencies.dev.includes("typescript"));
    assert.equal(scaffold.workspaceIntegration.rootPackageJsonMutation, false);
    assert.equal(scaffold.workspaceIntegration.pnpmWorkspaceMutation, false);
    assert.equal(scaffold.workspaceIntegration.lockfileMutation, false);
    assert.equal(scaffold.workspaceIntegration.dockerComposeMutation, false);
    assert.ok(scaffold.plannedFiles.includes("renderer-service/src/noop-host.ts"));
    assert.ok(scaffold.noOpGuarantees.includes("do not create renderer-service package files"));
    assert.ok(scaffold.requiredBeforeRuntimeDispatch.includes("create package files in a dedicated implementation task"));
});

test("render.thumbnail renderer-service package creation guardrails stay metadata-only", () => {
    const guardrails = createRenderThumbnailRendererServicePackageCreationGuardrails({
        packageManifestScaffold: {
            status: "planned-disabled",
            manifestVersion: "P25.27",
            packageCreated: false,
            workspaceMutation: false,
            scriptRunnable: false,
        },
        hostLifecycleTestFixtures: {
            status: "planned-disabled",
            fixtureVersion: "P25.26",
            processSpawn: false,
        },
    });

    assert.equal(guardrails.status, "planned-disabled");
    assert.equal(guardrails.guardrailVersion, "P25.28");
    assert.equal(guardrails.adapter, "renderer-service");
    assert.equal(guardrails.command, "render.thumbnail");
    assert.equal(guardrails.dispatch, false);
    assert.equal(guardrails.networkDispatch, false);
    assert.equal(guardrails.runtimeRegistration, false);
    assert.equal(guardrails.localFileWrites, false);
    assert.equal(guardrails.hostStartup, false);
    assert.equal(guardrails.processSpawn, false);
    assert.equal(guardrails.packageCreated, false);
    assert.equal(guardrails.workspaceMutation, false);
    assert.equal(guardrails.scriptRunnable, false);
    assert.equal(guardrails.consumes.packageManifestScaffold.manifestVersion, "P25.27");
    assert.equal(guardrails.consumes.packageManifestScaffold.packageCreated, false);
    assert.equal(guardrails.consumes.packageManifestScaffold.workspaceMutation, false);
    assert.equal(guardrails.consumes.packageManifestScaffold.scriptRunnable, false);
    assert.equal(guardrails.consumes.hostLifecycleTestFixtures.fixtureVersion, "P25.26");
    assert.equal(guardrails.consumes.hostLifecycleTestFixtures.processSpawn, false);
    assert.equal(guardrails.creationReadiness.status, "blocked");
    assert.equal(guardrails.creationReadiness.canCreatePackage, false);
    assert.ok(guardrails.creationReadiness.requiredChecks.every((entry) => entry.requiredBeforePackageCreation === true && entry.satisfied === false));
    assert.ok(guardrails.blockedMutations.packageFiles.includes("renderer-service/package.json"));
    assert.ok(guardrails.blockedMutations.workspaceFiles.includes("pnpm-workspace.yaml"));
    assert.ok(guardrails.blockedMutations.runtimeFiles.some((entry) => entry.includes("command-runtime")));
    assert.ok(guardrails.allowedInThisStep.includes("metadata-only guardrail planning"));
    assert.ok(guardrails.deniedInThisStep.includes("mutate lockfiles"));
    assert.ok(guardrails.requiredBeforeRuntimeDispatch.includes("create renderer-service package files in a later explicit implementation task"));
});

test("render.thumbnail renderer-service package file templates stay metadata-only", () => {
    const templates = createRenderThumbnailRendererServicePackageFileTemplates({
        packageManifestScaffold: {
            status: "planned-disabled",
            manifestVersion: "P25.27",
            packageCreated: false,
        },
        packageCreationGuardrails: {
            status: "planned-disabled",
            guardrailVersion: "P25.28",
            creationReadiness: {
                canCreatePackage: false,
            },
            workspaceMutation: false,
        },
    });

    assert.equal(templates.status, "planned-disabled");
    assert.equal(templates.templateVersion, "P25.29");
    assert.equal(templates.adapter, "renderer-service");
    assert.equal(templates.command, "render.thumbnail");
    assert.equal(templates.dispatch, false);
    assert.equal(templates.networkDispatch, false);
    assert.equal(templates.runtimeRegistration, false);
    assert.equal(templates.localFileWrites, false);
    assert.equal(templates.hostStartup, false);
    assert.equal(templates.processSpawn, false);
    assert.equal(templates.packageCreated, false);
    assert.equal(templates.workspaceMutation, false);
    assert.equal(templates.scriptRunnable, false);
    assert.equal(templates.fileMaterialization, false);
    assert.equal(templates.consumes.packageManifestScaffold.manifestVersion, "P25.27");
    assert.equal(templates.consumes.packageManifestScaffold.packageCreated, false);
    assert.equal(templates.consumes.packageCreationGuardrails.guardrailVersion, "P25.28");
    assert.equal(templates.consumes.packageCreationGuardrails.canCreatePackage, false);
    assert.equal(templates.packageJson.path, "renderer-service/package.json");
    assert.equal(templates.packageJson.materialized, false);
    assert.equal(templates.packageJson.writesFile, false);
    assert.equal(templates.packageJson.package.name, "@penpot/renderer-service");
    assert.equal(templates.packageJson.package.scripts["start:noop"], "node dist/noop-host.js");
    assert.equal(templates.tsconfig.path, "renderer-service/tsconfig.json");
    assert.equal(templates.tsconfig.materialized, false);
    assert.equal(templates.tsconfig.compilerOptions.strict, true);
    assert.ok(templates.sourceFiles.some((entry) => entry.path === "renderer-service/src/index.ts" && entry.runtimeRegistration === false));
    assert.ok(templates.sourceFiles.some((entry) => entry.path === "renderer-service/src/noop-host.ts" && entry.rendersPng === false));
    assert.ok(templates.testFiles.some((entry) => entry.path === "renderer-service/test/noop-host.test.mjs" && entry.processSpawn === false));
    assert.ok(templates.templateMatrix.every((entry) => entry.materialized === false && entry.writesFile === false));
    assert.ok(templates.noOpGuarantees.includes("do not create renderer-service template files"));
    assert.ok(templates.requiredBeforeRuntimeDispatch.includes("materialize package file templates in a dedicated implementation task"));
});

test("render.thumbnail renderer-service package workspace wiring stays metadata-only", () => {
    const wiring = createRenderThumbnailRendererServicePackageWorkspaceWiring({
        packageManifestScaffold: {
            status: "planned-disabled",
            manifestVersion: "P25.27",
        },
        packageCreationGuardrails: {
            status: "planned-disabled",
            guardrailVersion: "P25.28",
            workspaceMutation: false,
        },
        packageFileTemplates: {
            status: "planned-disabled",
            templateVersion: "P25.29",
            fileMaterialization: false,
        },
    });

    assert.equal(wiring.status, "planned-disabled");
    assert.equal(wiring.wiringVersion, "P25.30");
    assert.equal(wiring.adapter, "renderer-service");
    assert.equal(wiring.command, "render.thumbnail");
    assert.equal(wiring.dispatch, false);
    assert.equal(wiring.networkDispatch, false);
    assert.equal(wiring.runtimeRegistration, false);
    assert.equal(wiring.localFileWrites, false);
    assert.equal(wiring.hostStartup, false);
    assert.equal(wiring.processSpawn, false);
    assert.equal(wiring.packageCreated, false);
    assert.equal(wiring.workspaceMutation, false);
    assert.equal(wiring.scriptRunnable, false);
    assert.equal(wiring.fileMaterialization, false);
    assert.equal(wiring.lockfileMutation, false);
    assert.equal(wiring.rootPackageJsonMutation, false);
    assert.equal(wiring.pnpmWorkspaceMutation, false);
    assert.equal(wiring.consumes.packageManifestScaffold.manifestVersion, "P25.27");
    assert.equal(wiring.consumes.packageManifestScaffold.workspaceRegistered, false);
    assert.equal(wiring.consumes.packageCreationGuardrails.guardrailVersion, "P25.28");
    assert.equal(wiring.consumes.packageCreationGuardrails.workspaceMutation, false);
    assert.equal(wiring.consumes.packageFileTemplates.templateVersion, "P25.29");
    assert.equal(wiring.consumes.packageFileTemplates.fileMaterialization, false);
    assert.ok(wiring.workspaceEntries.some((entry) => entry.plannedEntry === "renderer-service" && entry.mutateNow === false));
    assert.ok(wiring.rootPackageScripts.some((entry) => entry.script === "renderer-service:start:noop" && entry.runnable === false));
    assert.equal(wiring.lockfilePlan.file, "pnpm-lock.yaml");
    assert.equal(wiring.lockfilePlan.mutateNow, false);
    assert.ok(wiring.lockfilePlan.dependencyAdditions.includes("typescript"));
    assert.equal(wiring.workspaceDependencyPlan.packageName, "@penpot/renderer-service");
    assert.equal(wiring.workspaceDependencyPlan.workspaceRegistered, false);
    assert.ok(wiring.nonTargets.some((entry) => entry.file === "docker-compose.yaml" && entry.mutateNow === false));
    assert.ok(wiring.noOpGuarantees.includes("do not edit pnpm-workspace.yaml"));
    assert.ok(wiring.requiredBeforeRuntimeDispatch.includes("add pnpm workspace entry and lockfile changes in the same package wiring task"));
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
