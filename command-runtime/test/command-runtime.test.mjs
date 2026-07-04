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
    createRenderThumbnailRendererServicePackageBuildVerification,
    createRenderThumbnailRendererServicePackageCreationDryRunSummary,
    createRenderThumbnailRendererServicePackageCreationFileManifest,
    createRenderThumbnailRendererServicePackageMaterializationApprovalGate,
    createRenderThumbnailRendererServicePackageMaterializationExecutionDryRun,
    createRenderThumbnailRendererServicePackageMaterializationWriteContract,
    createRenderThumbnailRendererServicePackageMaterializationRollbackContract,
    createRenderThumbnailRendererServicePackageMaterializationVerificationManifest,
    createRenderThumbnailRendererServicePackageMaterializationFinalApprovalChecklist,
    createRenderThumbnailRendererServicePackageMaterializationExplicitApprovalToken,
    createRenderThumbnailRendererServicePackageMaterializationApprovalAuditTrail,
    createRenderThumbnailRendererServicePackageMaterializationApprovalReplayGuard,
    createRenderThumbnailRendererServicePackageMaterializationApprovalExpiryPolicy,
    createRenderThumbnailRendererServicePackageMaterializationApprovalRevocationPolicy,
    createRenderThumbnailRendererServicePackageMaterializationApprovalScopeBindingPolicy,
    createRenderThumbnailRendererServicePackageMaterializationApprovalOperatorConfirmationPolicy,
    createRenderThumbnailRendererServicePackageMaterializationApprovalEmergencyStopPolicy,
    createRenderThumbnailRendererServicePackageFileTemplates,
    createRenderThumbnailRendererServicePackageManifestScaffold,
    createRenderThumbnailRendererServicePackageMaterializationChecklist,
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
    assert.equal(fixtures.serviceApi.packageBuildVerification.verificationVersion, "P25.31");
    assert.equal(fixtures.serviceApi.packageBuildVerification.dispatch, false);
    assert.equal(fixtures.serviceApi.packageBuildVerification.networkDispatch, false);
    assert.equal(fixtures.serviceApi.packageBuildVerification.runtimeRegistration, false);
    assert.equal(fixtures.serviceApi.packageBuildVerification.localFileWrites, false);
    assert.equal(fixtures.serviceApi.packageBuildVerification.processSpawn, false);
    assert.equal(fixtures.serviceApi.packageBuildVerification.commandExecution, false);
    assert.equal(fixtures.serviceApi.packageBuildVerification.buildOutput, false);
    assert.equal(fixtures.serviceApi.packageMaterializationChecklist.checklistVersion, "P25.32");
    assert.equal(fixtures.serviceApi.packageMaterializationChecklist.dispatch, false);
    assert.equal(fixtures.serviceApi.packageMaterializationChecklist.networkDispatch, false);
    assert.equal(fixtures.serviceApi.packageMaterializationChecklist.runtimeRegistration, false);
    assert.equal(fixtures.serviceApi.packageMaterializationChecklist.localFileWrites, false);
    assert.equal(fixtures.serviceApi.packageMaterializationChecklist.fileMaterialization, false);
    assert.equal(fixtures.serviceApi.packageMaterializationChecklist.materializationApproved, false);
    assert.equal(fixtures.serviceApi.packageCreationDryRunSummary.summaryVersion, "P25.33");
    assert.equal(fixtures.serviceApi.packageCreationDryRunSummary.dryRunOnly, true);
    assert.equal(fixtures.serviceApi.packageCreationDryRunSummary.dispatch, false);
    assert.equal(fixtures.serviceApi.packageCreationDryRunSummary.runtimeRegistration, false);
    assert.equal(fixtures.serviceApi.packageCreationDryRunSummary.localFileWrites, false);
    assert.equal(fixtures.serviceApi.packageCreationDryRunSummary.fileMaterialization, false);
    assert.equal(fixtures.serviceApi.packageCreationDryRunSummary.filesWritten, false);
    assert.equal(fixtures.serviceApi.packageCreationFileManifest.manifestVersion, "P25.34");
    assert.equal(fixtures.serviceApi.packageCreationFileManifest.dryRunOnly, true);
    assert.equal(fixtures.serviceApi.packageCreationFileManifest.dispatch, false);
    assert.equal(fixtures.serviceApi.packageCreationFileManifest.runtimeRegistration, false);
    assert.equal(fixtures.serviceApi.packageCreationFileManifest.localFileWrites, false);
    assert.equal(fixtures.serviceApi.packageCreationFileManifest.fileMaterialization, false);
    assert.equal(fixtures.serviceApi.packageCreationFileManifest.filesWritten, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalGate.gateVersion, "P25.35");
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalGate.approvalRequired, true);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalGate.approved, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalGate.dispatch, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalGate.runtimeRegistration, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalGate.localFileWrites, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalGate.fileMaterialization, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalGate.materializationApproved, false);
    assert.equal(fixtures.serviceApi.packageMaterializationExecutionDryRun.dryRunVersion, "P25.36");
    assert.equal(fixtures.serviceApi.packageMaterializationExecutionDryRun.dryRunOnly, true);
    assert.equal(fixtures.serviceApi.packageMaterializationExecutionDryRun.executeNow, false);
    assert.equal(fixtures.serviceApi.packageMaterializationExecutionDryRun.approved, false);
    assert.equal(fixtures.serviceApi.packageMaterializationExecutionDryRun.dispatch, false);
    assert.equal(fixtures.serviceApi.packageMaterializationExecutionDryRun.runtimeRegistration, false);
    assert.equal(fixtures.serviceApi.packageMaterializationExecutionDryRun.localFileWrites, false);
    assert.equal(fixtures.serviceApi.packageMaterializationExecutionDryRun.fileMaterialization, false);
    assert.equal(fixtures.serviceApi.packageMaterializationExecutionDryRun.filesWritten, false);
    assert.equal(fixtures.serviceApi.packageMaterializationWriteContract.contractVersion, "P25.37");
    assert.equal(fixtures.serviceApi.packageMaterializationWriteContract.dryRunOnly, true);
    assert.equal(fixtures.serviceApi.packageMaterializationWriteContract.executeNow, false);
    assert.equal(fixtures.serviceApi.packageMaterializationWriteContract.approved, false);
    assert.equal(fixtures.serviceApi.packageMaterializationWriteContract.dispatch, false);
    assert.equal(fixtures.serviceApi.packageMaterializationWriteContract.runtimeRegistration, false);
    assert.equal(fixtures.serviceApi.packageMaterializationWriteContract.localFileWrites, false);
    assert.equal(fixtures.serviceApi.packageMaterializationWriteContract.fileMaterialization, false);
    assert.equal(fixtures.serviceApi.packageMaterializationWriteContract.filesWritten, false);
    assert.equal(fixtures.serviceApi.packageMaterializationRollbackContract.contractVersion, "P25.38");
    assert.equal(fixtures.serviceApi.packageMaterializationRollbackContract.dryRunOnly, true);
    assert.equal(fixtures.serviceApi.packageMaterializationRollbackContract.executeNow, false);
    assert.equal(fixtures.serviceApi.packageMaterializationRollbackContract.rollbackNow, false);
    assert.equal(fixtures.serviceApi.packageMaterializationRollbackContract.approved, false);
    assert.equal(fixtures.serviceApi.packageMaterializationRollbackContract.dispatch, false);
    assert.equal(fixtures.serviceApi.packageMaterializationRollbackContract.runtimeRegistration, false);
    assert.equal(fixtures.serviceApi.packageMaterializationRollbackContract.localFileWrites, false);
    assert.equal(fixtures.serviceApi.packageMaterializationRollbackContract.fileMaterialization, false);
    assert.equal(fixtures.serviceApi.packageMaterializationRollbackContract.filesWritten, false);
    assert.equal(fixtures.serviceApi.packageMaterializationVerificationManifest.manifestVersion, "P25.39");
    assert.equal(fixtures.serviceApi.packageMaterializationVerificationManifest.dryRunOnly, true);
    assert.equal(fixtures.serviceApi.packageMaterializationVerificationManifest.executeNow, false);
    assert.equal(fixtures.serviceApi.packageMaterializationVerificationManifest.verifyNow, false);
    assert.equal(fixtures.serviceApi.packageMaterializationVerificationManifest.approved, false);
    assert.equal(fixtures.serviceApi.packageMaterializationVerificationManifest.dispatch, false);
    assert.equal(fixtures.serviceApi.packageMaterializationVerificationManifest.runtimeRegistration, false);
    assert.equal(fixtures.serviceApi.packageMaterializationVerificationManifest.localFileWrites, false);
    assert.equal(fixtures.serviceApi.packageMaterializationVerificationManifest.commandExecution, false);
    assert.equal(fixtures.serviceApi.packageMaterializationVerificationManifest.buildOutput, false);
    assert.equal(fixtures.serviceApi.packageMaterializationVerificationManifest.filesWritten, false);
    assert.equal(fixtures.serviceApi.packageMaterializationFinalApprovalChecklist.checklistVersion, "P25.40");
    assert.equal(fixtures.serviceApi.packageMaterializationFinalApprovalChecklist.dryRunOnly, true);
    assert.equal(fixtures.serviceApi.packageMaterializationFinalApprovalChecklist.executeNow, false);
    assert.equal(fixtures.serviceApi.packageMaterializationFinalApprovalChecklist.approved, false);
    assert.equal(fixtures.serviceApi.packageMaterializationFinalApprovalChecklist.finalApprovalGranted, false);
    assert.equal(fixtures.serviceApi.packageMaterializationFinalApprovalChecklist.dispatch, false);
    assert.equal(fixtures.serviceApi.packageMaterializationFinalApprovalChecklist.runtimeRegistration, false);
    assert.equal(fixtures.serviceApi.packageMaterializationFinalApprovalChecklist.commandExecution, false);
    assert.equal(fixtures.serviceApi.packageMaterializationFinalApprovalChecklist.buildOutput, false);
    assert.equal(fixtures.serviceApi.packageMaterializationFinalApprovalChecklist.filesWritten, false);
    assert.equal(fixtures.serviceApi.packageMaterializationExplicitApprovalToken.tokenVersion, "P25.41");
    assert.equal(fixtures.serviceApi.packageMaterializationExplicitApprovalToken.tokenProvided, false);
    assert.equal(fixtures.serviceApi.packageMaterializationExplicitApprovalToken.tokenAccepted, false);
    assert.equal(fixtures.serviceApi.packageMaterializationExplicitApprovalToken.approved, false);
    assert.equal(fixtures.serviceApi.packageMaterializationExplicitApprovalToken.finalApprovalGranted, false);
    assert.equal(fixtures.serviceApi.packageMaterializationExplicitApprovalToken.commandExecution, false);
    assert.equal(fixtures.serviceApi.packageMaterializationExplicitApprovalToken.buildOutput, false);
    assert.equal(fixtures.serviceApi.packageMaterializationExplicitApprovalToken.filesWritten, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalAuditTrail.auditTrailVersion, "P25.42");
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalAuditTrail.auditRecordWritten, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalAuditTrail.writeAuditNow, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalAuditTrail.approved, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalAuditTrail.finalApprovalGranted, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalAuditTrail.commandExecution, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalAuditTrail.buildOutput, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalAuditTrail.filesWritten, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalReplayGuard.replayGuardVersion, "P25.43");
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalReplayGuard.replayCheckExecuted, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalReplayGuard.tokenAccepted, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalReplayGuard.tokenConsumed, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalReplayGuard.approved, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalReplayGuard.finalApprovalGranted, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalReplayGuard.commandExecution, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalReplayGuard.buildOutput, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalReplayGuard.filesWritten, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalExpiryPolicy.expiryPolicyVersion, "P25.44");
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalExpiryPolicy.expiryCheckExecuted, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalExpiryPolicy.tokenAccepted, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalExpiryPolicy.tokenValidated, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalExpiryPolicy.approved, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalExpiryPolicy.finalApprovalGranted, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalExpiryPolicy.commandExecution, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalExpiryPolicy.buildOutput, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalExpiryPolicy.filesWritten, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalRevocationPolicy.revocationPolicyVersion, "P25.45");
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalRevocationPolicy.revocationCheckExecuted, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalRevocationPolicy.revocationRegistryFetched, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalRevocationPolicy.revocationStatusTrusted, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalRevocationPolicy.tokenAccepted, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalRevocationPolicy.tokenValidated, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalRevocationPolicy.approved, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalRevocationPolicy.finalApprovalGranted, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalRevocationPolicy.commandExecution, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalRevocationPolicy.buildOutput, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalRevocationPolicy.filesWritten, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalScopeBindingPolicy.scopeBindingVersion, "P25.46");
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalScopeBindingPolicy.scopeBindingExecuted, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalScopeBindingPolicy.approvalScopeHashComputed, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalScopeBindingPolicy.fileSnapshotRead, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalScopeBindingPolicy.workspaceHashComputed, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalScopeBindingPolicy.tokenAccepted, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalScopeBindingPolicy.tokenValidated, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalScopeBindingPolicy.approved, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalScopeBindingPolicy.finalApprovalGranted, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalScopeBindingPolicy.commandExecution, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalScopeBindingPolicy.buildOutput, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalScopeBindingPolicy.filesWritten, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalOperatorConfirmationPolicy.operatorConfirmationVersion, "P25.47");
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalOperatorConfirmationPolicy.operatorConfirmationPrompted, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalOperatorConfirmationPolicy.operatorConfirmationReceived, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalOperatorConfirmationPolicy.operatorConfirmationStored, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalOperatorConfirmationPolicy.operatorIdentityVerified, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalOperatorConfirmationPolicy.confirmationTokenIssued, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalOperatorConfirmationPolicy.tokenAccepted, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalOperatorConfirmationPolicy.tokenValidated, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalOperatorConfirmationPolicy.approved, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalOperatorConfirmationPolicy.finalApprovalGranted, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalOperatorConfirmationPolicy.commandExecution, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalOperatorConfirmationPolicy.buildOutput, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalOperatorConfirmationPolicy.filesWritten, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalEmergencyStopPolicy.emergencyStopVersion, "P25.48");
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalEmergencyStopPolicy.emergencyStopChecked, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalEmergencyStopPolicy.emergencyStopFetched, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalEmergencyStopPolicy.emergencyStopStateRead, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalEmergencyStopPolicy.emergencyStopStateTrusted, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalEmergencyStopPolicy.stopRegistryFetched, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalEmergencyStopPolicy.stopStatusTrusted, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalEmergencyStopPolicy.tokenAccepted, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalEmergencyStopPolicy.tokenValidated, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalEmergencyStopPolicy.approved, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalEmergencyStopPolicy.finalApprovalGranted, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalEmergencyStopPolicy.commandExecution, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalEmergencyStopPolicy.buildOutput, false);
    assert.equal(fixtures.serviceApi.packageMaterializationApprovalEmergencyStopPolicy.filesWritten, false);
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
    assert.equal(plan.packageBuildVerification.verificationVersion, "P25.31");
    assert.equal(plan.packageBuildVerification.dispatch, false);
    assert.equal(plan.packageBuildVerification.networkDispatch, false);
    assert.equal(plan.packageBuildVerification.runtimeRegistration, false);
    assert.equal(plan.packageBuildVerification.localFileWrites, false);
    assert.equal(plan.packageBuildVerification.hostStartup, false);
    assert.equal(plan.packageBuildVerification.processSpawn, false);
    assert.equal(plan.packageBuildVerification.packageCreated, false);
    assert.equal(plan.packageBuildVerification.workspaceMutation, false);
    assert.equal(plan.packageBuildVerification.scriptRunnable, false);
    assert.equal(plan.packageBuildVerification.fileMaterialization, false);
    assert.equal(plan.packageBuildVerification.lockfileMutation, false);
    assert.equal(plan.packageBuildVerification.rootPackageJsonMutation, false);
    assert.equal(plan.packageBuildVerification.pnpmWorkspaceMutation, false);
    assert.equal(plan.packageBuildVerification.commandExecution, false);
    assert.equal(plan.packageBuildVerification.buildOutput, false);
    assert.equal(plan.packageBuildVerification.packageScriptsRunnable, false);
    assert.equal(plan.packageBuildVerification.consumes.packageWorkspaceWiring.wiringVersion, "P25.30");
    assert.ok(plan.packageBuildVerification.verificationCommands.some((entry) => entry.id === "workspace-filter-build" && entry.runnable === false));
    assert.ok(plan.packageBuildVerification.verificationCommands.some((entry) => entry.id === "workspace-filter-types-check" && entry.emitsFiles === false));
    assert.ok(plan.packageBuildVerification.expectedArtifacts.some((entry) => entry.path === "renderer-service/dist/index.js" && entry.producedNow === false));
    assert.equal(plan.packageBuildVerification.verificationReadiness.canRunVerification, false);
    assert.deepEqual(plan.service.packageBuildVerification, plan.packageBuildVerification);
    assert.equal(plan.packageMaterializationChecklist.checklistVersion, "P25.32");
    assert.equal(plan.packageMaterializationChecklist.dispatch, false);
    assert.equal(plan.packageMaterializationChecklist.networkDispatch, false);
    assert.equal(plan.packageMaterializationChecklist.runtimeRegistration, false);
    assert.equal(plan.packageMaterializationChecklist.localFileWrites, false);
    assert.equal(plan.packageMaterializationChecklist.hostStartup, false);
    assert.equal(plan.packageMaterializationChecklist.processSpawn, false);
    assert.equal(plan.packageMaterializationChecklist.packageCreated, false);
    assert.equal(plan.packageMaterializationChecklist.workspaceMutation, false);
    assert.equal(plan.packageMaterializationChecklist.scriptRunnable, false);
    assert.equal(plan.packageMaterializationChecklist.fileMaterialization, false);
    assert.equal(plan.packageMaterializationChecklist.lockfileMutation, false);
    assert.equal(plan.packageMaterializationChecklist.rootPackageJsonMutation, false);
    assert.equal(plan.packageMaterializationChecklist.pnpmWorkspaceMutation, false);
    assert.equal(plan.packageMaterializationChecklist.commandExecution, false);
    assert.equal(plan.packageMaterializationChecklist.buildOutput, false);
    assert.equal(plan.packageMaterializationChecklist.packageScriptsRunnable, false);
    assert.equal(plan.packageMaterializationChecklist.materializationApproved, false);
    assert.equal(plan.packageMaterializationChecklist.consumes.packageBuildVerification.verificationVersion, "P25.31");
    assert.ok(plan.packageMaterializationChecklist.materializationBatches.some((entry) => entry.id === "package-files" && entry.materializeNow === false));
    assert.ok(plan.packageMaterializationChecklist.materializationBatches.some((entry) => entry.id === "workspace-wiring" && entry.files.includes("pnpm-lock.yaml")));
    assert.ok(plan.packageMaterializationChecklist.readinessChecklist.every((entry) => entry.satisfied === false));
    assert.equal(plan.packageMaterializationChecklist.commitBoundary.includeRuntimeDispatch, false);
    assert.deepEqual(plan.service.packageMaterializationChecklist, plan.packageMaterializationChecklist);
    assert.equal(plan.packageCreationDryRunSummary.summaryVersion, "P25.33");
    assert.equal(plan.packageCreationDryRunSummary.dryRunOnly, true);
    assert.equal(plan.packageCreationDryRunSummary.dispatch, false);
    assert.equal(plan.packageCreationDryRunSummary.networkDispatch, false);
    assert.equal(plan.packageCreationDryRunSummary.runtimeRegistration, false);
    assert.equal(plan.packageCreationDryRunSummary.localFileWrites, false);
    assert.equal(plan.packageCreationDryRunSummary.packageCreated, false);
    assert.equal(plan.packageCreationDryRunSummary.workspaceMutation, false);
    assert.equal(plan.packageCreationDryRunSummary.fileMaterialization, false);
    assert.equal(plan.packageCreationDryRunSummary.lockfileMutation, false);
    assert.equal(plan.packageCreationDryRunSummary.commandExecution, false);
    assert.equal(plan.packageCreationDryRunSummary.buildOutput, false);
    assert.equal(plan.packageCreationDryRunSummary.materializationApproved, false);
    assert.equal(plan.packageCreationDryRunSummary.filesWritten, false);
    assert.equal(plan.packageCreationDryRunSummary.consumes.packageMaterializationChecklist.checklistVersion, "P25.32");
    assert.ok(plan.packageCreationDryRunSummary.summary.wouldCreateFiles.includes("renderer-service/package.json"));
    assert.ok(plan.packageCreationDryRunSummary.summary.wouldModifyFiles.includes("pnpm-lock.yaml"));
    assert.ok(plan.packageCreationDryRunSummary.summary.wouldRunCommands.includes("pnpm --filter @penpot/renderer-service test"));
    assert.ok(plan.packageCreationDryRunSummary.sections.some((entry) => entry.id === "verification" && entry.dryRunOnly === true));
    assert.deepEqual(plan.service.packageCreationDryRunSummary, plan.packageCreationDryRunSummary);
    assert.equal(plan.packageCreationFileManifest.manifestVersion, "P25.34");
    assert.equal(plan.packageCreationFileManifest.dryRunOnly, true);
    assert.equal(plan.packageCreationFileManifest.dispatch, false);
    assert.equal(plan.packageCreationFileManifest.networkDispatch, false);
    assert.equal(plan.packageCreationFileManifest.runtimeRegistration, false);
    assert.equal(plan.packageCreationFileManifest.localFileWrites, false);
    assert.equal(plan.packageCreationFileManifest.packageCreated, false);
    assert.equal(plan.packageCreationFileManifest.workspaceMutation, false);
    assert.equal(plan.packageCreationFileManifest.fileMaterialization, false);
    assert.equal(plan.packageCreationFileManifest.lockfileMutation, false);
    assert.equal(plan.packageCreationFileManifest.commandExecution, false);
    assert.equal(plan.packageCreationFileManifest.buildOutput, false);
    assert.equal(plan.packageCreationFileManifest.materializationApproved, false);
    assert.equal(plan.packageCreationFileManifest.filesWritten, false);
    assert.equal(plan.packageCreationFileManifest.consumes.packageCreationDryRunSummary.summaryVersion, "P25.33");
    assert.equal(plan.packageCreationFileManifest.packageDirectory.createNow, false);
    assert.ok(plan.packageCreationFileManifest.files.some((entry) => entry.id === "package-json" && entry.path === "renderer-service/package.json" && entry.createNow === false));
    assert.ok(plan.packageCreationFileManifest.files.some((entry) => entry.id === "noop-host" && entry.startsProcess === false && entry.rendersPng === false));
    assert.ok(plan.packageCreationFileManifest.generatedFiles.some((entry) => entry.path === "renderer-service/dist/index.js" && entry.generateNow === false));
    assert.ok(plan.packageCreationFileManifest.workspaceFiles.some((entry) => entry.path === "pnpm-lock.yaml" && entry.mutateNow === false));
    assert.equal(plan.packageCreationFileManifest.manifestReadiness.canMaterializeFiles, false);
    assert.deepEqual(plan.service.packageCreationFileManifest, plan.packageCreationFileManifest);
    assert.equal(plan.packageMaterializationApprovalGate.gateVersion, "P25.35");
    assert.equal(plan.packageMaterializationApprovalGate.dryRunOnly, true);
    assert.equal(plan.packageMaterializationApprovalGate.approvalRequired, true);
    assert.equal(plan.packageMaterializationApprovalGate.approved, false);
    assert.equal(plan.packageMaterializationApprovalGate.dispatch, false);
    assert.equal(plan.packageMaterializationApprovalGate.networkDispatch, false);
    assert.equal(plan.packageMaterializationApprovalGate.runtimeRegistration, false);
    assert.equal(plan.packageMaterializationApprovalGate.localFileWrites, false);
    assert.equal(plan.packageMaterializationApprovalGate.packageCreated, false);
    assert.equal(plan.packageMaterializationApprovalGate.workspaceMutation, false);
    assert.equal(plan.packageMaterializationApprovalGate.fileMaterialization, false);
    assert.equal(plan.packageMaterializationApprovalGate.lockfileMutation, false);
    assert.equal(plan.packageMaterializationApprovalGate.commandExecution, false);
    assert.equal(plan.packageMaterializationApprovalGate.buildOutput, false);
    assert.equal(plan.packageMaterializationApprovalGate.materializationApproved, false);
    assert.equal(plan.packageMaterializationApprovalGate.filesWritten, false);
    assert.equal(plan.packageMaterializationApprovalGate.consumes.packageCreationFileManifest.manifestVersion, "P25.34");
    assert.ok(plan.packageMaterializationApprovalGate.approvalInputs.some((entry) => entry.id === "explicit-user-approval" && entry.satisfied === false));
    assert.ok(plan.packageMaterializationApprovalGate.approvalScope.workspaceFiles.includes("pnpm-lock.yaml"));
    assert.equal(plan.packageMaterializationApprovalGate.approvalScope.runtimeDispatchIncluded, false);
    assert.equal(plan.packageMaterializationApprovalGate.approvalDecision.canMaterialize, false);
    assert.ok(plan.packageMaterializationApprovalGate.postApprovalSequence.some((entry) => entry.id === "run-package-verification" && entry.allowedBeforeApproval === false && entry.runsCommands === true));
    assert.deepEqual(plan.service.packageMaterializationApprovalGate, plan.packageMaterializationApprovalGate);
    assert.equal(plan.packageMaterializationExecutionDryRun.dryRunVersion, "P25.36");
    assert.equal(plan.packageMaterializationExecutionDryRun.dryRunOnly, true);
    assert.equal(plan.packageMaterializationExecutionDryRun.executeNow, false);
    assert.equal(plan.packageMaterializationExecutionDryRun.approvalRequired, true);
    assert.equal(plan.packageMaterializationExecutionDryRun.approved, false);
    assert.equal(plan.packageMaterializationExecutionDryRun.dispatch, false);
    assert.equal(plan.packageMaterializationExecutionDryRun.networkDispatch, false);
    assert.equal(plan.packageMaterializationExecutionDryRun.runtimeRegistration, false);
    assert.equal(plan.packageMaterializationExecutionDryRun.localFileWrites, false);
    assert.equal(plan.packageMaterializationExecutionDryRun.packageCreated, false);
    assert.equal(plan.packageMaterializationExecutionDryRun.workspaceMutation, false);
    assert.equal(plan.packageMaterializationExecutionDryRun.fileMaterialization, false);
    assert.equal(plan.packageMaterializationExecutionDryRun.lockfileMutation, false);
    assert.equal(plan.packageMaterializationExecutionDryRun.commandExecution, false);
    assert.equal(plan.packageMaterializationExecutionDryRun.buildOutput, false);
    assert.equal(plan.packageMaterializationExecutionDryRun.materializationApproved, false);
    assert.equal(plan.packageMaterializationExecutionDryRun.filesWritten, false);
    assert.equal(plan.packageMaterializationExecutionDryRun.consumes.packageMaterializationApprovalGate.gateVersion, "P25.35");
    assert.equal(plan.packageMaterializationExecutionDryRun.dryRunPlan.executeNow, false);
    assert.ok(plan.packageMaterializationExecutionDryRun.dryRunPlan.steps.some((entry) => entry.id === "write-package-files" && entry.executed === false && entry.writesFiles === true));
    assert.ok(plan.packageMaterializationExecutionDryRun.dryRunPlan.steps.some((entry) => entry.id === "run-verification" && entry.executed === false && entry.commands.includes("pnpm --filter @penpot/renderer-service test")));
    assert.equal(plan.packageMaterializationExecutionDryRun.executionOutputs.packageFilesWritten, false);
    assert.equal(plan.packageMaterializationExecutionDryRun.executionOutputs.commandsRun, false);
    assert.deepEqual(plan.service.packageMaterializationExecutionDryRun, plan.packageMaterializationExecutionDryRun);
    assert.equal(plan.packageMaterializationWriteContract.contractVersion, "P25.37");
    assert.equal(plan.packageMaterializationWriteContract.dryRunOnly, true);
    assert.equal(plan.packageMaterializationWriteContract.executeNow, false);
    assert.equal(plan.packageMaterializationWriteContract.approvalRequired, true);
    assert.equal(plan.packageMaterializationWriteContract.approved, false);
    assert.equal(plan.packageMaterializationWriteContract.dispatch, false);
    assert.equal(plan.packageMaterializationWriteContract.networkDispatch, false);
    assert.equal(plan.packageMaterializationWriteContract.runtimeRegistration, false);
    assert.equal(plan.packageMaterializationWriteContract.localFileWrites, false);
    assert.equal(plan.packageMaterializationWriteContract.packageCreated, false);
    assert.equal(plan.packageMaterializationWriteContract.workspaceMutation, false);
    assert.equal(plan.packageMaterializationWriteContract.fileMaterialization, false);
    assert.equal(plan.packageMaterializationWriteContract.lockfileMutation, false);
    assert.equal(plan.packageMaterializationWriteContract.commandExecution, false);
    assert.equal(plan.packageMaterializationWriteContract.buildOutput, false);
    assert.equal(plan.packageMaterializationWriteContract.materializationApproved, false);
    assert.equal(plan.packageMaterializationWriteContract.filesWritten, false);
    assert.equal(plan.packageMaterializationWriteContract.consumes.packageMaterializationExecutionDryRun.dryRunVersion, "P25.36");
    assert.equal(plan.packageMaterializationWriteContract.consumes.packageMaterializationApprovalGate.gateVersion, "P25.35");
    assert.equal(plan.packageMaterializationWriteContract.consumes.packageCreationFileManifest.manifestVersion, "P25.34");
    assert.equal(plan.packageMaterializationWriteContract.writeContract.packageDirectory.writeNow, false);
    assert.ok(plan.packageMaterializationWriteContract.writeContract.packageFiles.some((entry) => entry.path === "renderer-service/package.json" && entry.writeNow === false));
    assert.ok(plan.packageMaterializationWriteContract.writeContract.workspaceFiles.some((entry) => entry.path === "pnpm-lock.yaml" && entry.writeMode === "refresh" && entry.writeNow === false));
    assert.equal(plan.packageMaterializationWriteContract.integrityPlan.atomicWrites, true);
    assert.equal(plan.packageMaterializationWriteContract.integrityPlan.writeNow, false);
    assert.equal(plan.packageMaterializationWriteContract.rollbackContract.writeNow, false);
    assert.equal(plan.packageMaterializationWriteContract.rollbackContract.failureLeavesRuntimeDispatchDisabled, true);
    assert.deepEqual(plan.service.packageMaterializationWriteContract, plan.packageMaterializationWriteContract);
    assert.equal(plan.packageMaterializationRollbackContract.contractVersion, "P25.38");
    assert.equal(plan.packageMaterializationRollbackContract.dryRunOnly, true);
    assert.equal(plan.packageMaterializationRollbackContract.executeNow, false);
    assert.equal(plan.packageMaterializationRollbackContract.rollbackNow, false);
    assert.equal(plan.packageMaterializationRollbackContract.approvalRequired, true);
    assert.equal(plan.packageMaterializationRollbackContract.approved, false);
    assert.equal(plan.packageMaterializationRollbackContract.dispatch, false);
    assert.equal(plan.packageMaterializationRollbackContract.networkDispatch, false);
    assert.equal(plan.packageMaterializationRollbackContract.runtimeRegistration, false);
    assert.equal(plan.packageMaterializationRollbackContract.localFileWrites, false);
    assert.equal(plan.packageMaterializationRollbackContract.packageCreated, false);
    assert.equal(plan.packageMaterializationRollbackContract.workspaceMutation, false);
    assert.equal(plan.packageMaterializationRollbackContract.fileMaterialization, false);
    assert.equal(plan.packageMaterializationRollbackContract.lockfileMutation, false);
    assert.equal(plan.packageMaterializationRollbackContract.commandExecution, false);
    assert.equal(plan.packageMaterializationRollbackContract.buildOutput, false);
    assert.equal(plan.packageMaterializationRollbackContract.materializationApproved, false);
    assert.equal(plan.packageMaterializationRollbackContract.filesWritten, false);
    assert.equal(plan.packageMaterializationRollbackContract.rollbackExecuted, false);
    assert.equal(plan.packageMaterializationRollbackContract.consumes.packageMaterializationWriteContract.contractVersion, "P25.37");
    assert.equal(plan.packageMaterializationRollbackContract.snapshotPlan.snapshotNow, false);
    assert.ok(plan.packageMaterializationRollbackContract.snapshotPlan.workspaceFiles.includes("pnpm-lock.yaml"));
    assert.equal(plan.packageMaterializationRollbackContract.rollbackPlan.rollbackNow, false);
    assert.ok(plan.packageMaterializationRollbackContract.rollbackPlan.phases.some((entry) => entry.id === "restore-workspace-files" && entry.executesNow === false && entry.files.includes("pnpm-lock.yaml")));
    assert.ok(plan.packageMaterializationRollbackContract.rollbackPlan.phases.some((entry) => entry.id === "remove-empty-package-directory" && entry.target === "renderer-service"));
    assert.equal(plan.packageMaterializationRollbackContract.failureRecovery.runtimeDispatchRemainsDisabled, true);
    assert.equal(plan.packageMaterializationRollbackContract.verificationPlan.verifyNow, false);
    assert.equal(plan.packageMaterializationRollbackContract.verificationPlan.commandsRun, false);
    assert.deepEqual(plan.service.packageMaterializationRollbackContract, plan.packageMaterializationRollbackContract);
    assert.equal(plan.packageMaterializationVerificationManifest.manifestVersion, "P25.39");
    assert.equal(plan.packageMaterializationVerificationManifest.dryRunOnly, true);
    assert.equal(plan.packageMaterializationVerificationManifest.executeNow, false);
    assert.equal(plan.packageMaterializationVerificationManifest.verifyNow, false);
    assert.equal(plan.packageMaterializationVerificationManifest.rollbackNow, false);
    assert.equal(plan.packageMaterializationVerificationManifest.approvalRequired, true);
    assert.equal(plan.packageMaterializationVerificationManifest.approved, false);
    assert.equal(plan.packageMaterializationVerificationManifest.dispatch, false);
    assert.equal(plan.packageMaterializationVerificationManifest.networkDispatch, false);
    assert.equal(plan.packageMaterializationVerificationManifest.runtimeRegistration, false);
    assert.equal(plan.packageMaterializationVerificationManifest.localFileWrites, false);
    assert.equal(plan.packageMaterializationVerificationManifest.packageCreated, false);
    assert.equal(plan.packageMaterializationVerificationManifest.workspaceMutation, false);
    assert.equal(plan.packageMaterializationVerificationManifest.fileMaterialization, false);
    assert.equal(plan.packageMaterializationVerificationManifest.lockfileMutation, false);
    assert.equal(plan.packageMaterializationVerificationManifest.commandExecution, false);
    assert.equal(plan.packageMaterializationVerificationManifest.buildOutput, false);
    assert.equal(plan.packageMaterializationVerificationManifest.materializationApproved, false);
    assert.equal(plan.packageMaterializationVerificationManifest.filesWritten, false);
    assert.equal(plan.packageMaterializationVerificationManifest.verificationExecuted, false);
    assert.equal(plan.packageMaterializationVerificationManifest.consumes.packageMaterializationRollbackContract.contractVersion, "P25.38");
    assert.equal(plan.packageMaterializationVerificationManifest.consumes.packageMaterializationWriteContract.contractVersion, "P25.37");
    assert.equal(plan.packageMaterializationVerificationManifest.consumes.packageBuildVerification.verificationVersion, "P25.31");
    assert.equal(plan.packageMaterializationVerificationManifest.verificationManifest.verifyNow, false);
    assert.ok(plan.packageMaterializationVerificationManifest.verificationManifest.packageFiles.some((entry) => entry.path === "renderer-service/package.json" && entry.verifyNow === false));
    assert.ok(plan.packageMaterializationVerificationManifest.verificationManifest.workspaceFiles.some((entry) => entry.path === "pnpm-lock.yaml" && entry.verifyNow === false));
    assert.ok(plan.packageMaterializationVerificationManifest.verificationManifest.generatedOutputs.some((entry) => entry.path === "renderer-service/dist/index.js" && entry.verifyNow === false));
    assert.ok(plan.packageMaterializationVerificationManifest.commandManifest.commands.some((entry) => entry.command === "pnpm --filter @penpot/renderer-service test" && entry.runsNow === false));
    assert.equal(plan.packageMaterializationVerificationManifest.commandManifest.commandsRun, false);
    assert.equal(plan.packageMaterializationVerificationManifest.runtimeDisabledAssertions.runtimeRegistration, false);
    assert.equal(plan.packageMaterializationVerificationManifest.readinessDecision.canEnableRuntimeDispatch, false);
    assert.deepEqual(plan.service.packageMaterializationVerificationManifest, plan.packageMaterializationVerificationManifest);
    assert.equal(plan.packageMaterializationFinalApprovalChecklist.checklistVersion, "P25.40");
    assert.equal(plan.packageMaterializationFinalApprovalChecklist.dryRunOnly, true);
    assert.equal(plan.packageMaterializationFinalApprovalChecklist.approvalRequired, true);
    assert.equal(plan.packageMaterializationFinalApprovalChecklist.approved, false);
    assert.equal(plan.packageMaterializationFinalApprovalChecklist.finalApprovalGranted, false);
    assert.equal(plan.packageMaterializationFinalApprovalChecklist.executeNow, false);
    assert.equal(plan.packageMaterializationFinalApprovalChecklist.verifyNow, false);
    assert.equal(plan.packageMaterializationFinalApprovalChecklist.rollbackNow, false);
    assert.equal(plan.packageMaterializationFinalApprovalChecklist.dispatch, false);
    assert.equal(plan.packageMaterializationFinalApprovalChecklist.networkDispatch, false);
    assert.equal(plan.packageMaterializationFinalApprovalChecklist.runtimeRegistration, false);
    assert.equal(plan.packageMaterializationFinalApprovalChecklist.localFileWrites, false);
    assert.equal(plan.packageMaterializationFinalApprovalChecklist.packageCreated, false);
    assert.equal(plan.packageMaterializationFinalApprovalChecklist.workspaceMutation, false);
    assert.equal(plan.packageMaterializationFinalApprovalChecklist.fileMaterialization, false);
    assert.equal(plan.packageMaterializationFinalApprovalChecklist.lockfileMutation, false);
    assert.equal(plan.packageMaterializationFinalApprovalChecklist.commandExecution, false);
    assert.equal(plan.packageMaterializationFinalApprovalChecklist.buildOutput, false);
    assert.equal(plan.packageMaterializationFinalApprovalChecklist.materializationApproved, false);
    assert.equal(plan.packageMaterializationFinalApprovalChecklist.filesWritten, false);
    assert.equal(plan.packageMaterializationFinalApprovalChecklist.verificationExecuted, false);
    assert.equal(plan.packageMaterializationFinalApprovalChecklist.consumes.packageMaterializationVerificationManifest.manifestVersion, "P25.39");
    assert.equal(plan.packageMaterializationFinalApprovalChecklist.consumes.packageMaterializationRollbackContract.contractVersion, "P25.38");
    assert.equal(plan.packageMaterializationFinalApprovalChecklist.consumes.packageMaterializationWriteContract.contractVersion, "P25.37");
    assert.equal(plan.packageMaterializationFinalApprovalChecklist.consumes.packageMaterializationApprovalGate.gateVersion, "P25.35");
    assert.ok(plan.packageMaterializationFinalApprovalChecklist.checklist.some((entry) => entry.id === "explicit-user-approval" && entry.satisfied === false));
    assert.ok(plan.packageMaterializationFinalApprovalChecklist.checklist.some((entry) => entry.id === "runtime-dispatch-remains-disabled" && entry.satisfied === false));
    assert.ok(plan.packageMaterializationFinalApprovalChecklist.approvalScope.workspaceFiles.includes("pnpm-lock.yaml"));
    assert.ok(plan.packageMaterializationFinalApprovalChecklist.approvalScope.verificationCommands.includes("pnpm --filter @penpot/renderer-service test"));
    assert.equal(plan.packageMaterializationFinalApprovalChecklist.approvalDecision.canGrantFinalApproval, false);
    assert.equal(plan.packageMaterializationFinalApprovalChecklist.approvalDecision.canEnableRuntimeDispatch, false);
    assert.ok(plan.packageMaterializationFinalApprovalChecklist.postApprovalSequence.some((entry) => entry.id === "run-verification-manifest" && entry.allowedBeforeFinalApproval === false && entry.runsCommands === true));
    assert.deepEqual(plan.service.packageMaterializationFinalApprovalChecklist, plan.packageMaterializationFinalApprovalChecklist);
    assert.equal(plan.packageMaterializationExplicitApprovalToken.tokenVersion, "P25.41");
    assert.equal(plan.packageMaterializationExplicitApprovalToken.dryRunOnly, true);
    assert.equal(plan.packageMaterializationExplicitApprovalToken.approvalRequired, true);
    assert.equal(plan.packageMaterializationExplicitApprovalToken.approved, false);
    assert.equal(plan.packageMaterializationExplicitApprovalToken.finalApprovalGranted, false);
    assert.equal(plan.packageMaterializationExplicitApprovalToken.tokenRequired, true);
    assert.equal(plan.packageMaterializationExplicitApprovalToken.tokenProvided, false);
    assert.equal(plan.packageMaterializationExplicitApprovalToken.tokenAccepted, false);
    assert.equal(plan.packageMaterializationExplicitApprovalToken.tokenStored, false);
    assert.equal(plan.packageMaterializationExplicitApprovalToken.tokenValidated, false);
    assert.equal(plan.packageMaterializationExplicitApprovalToken.executeNow, false);
    assert.equal(plan.packageMaterializationExplicitApprovalToken.verifyNow, false);
    assert.equal(plan.packageMaterializationExplicitApprovalToken.rollbackNow, false);
    assert.equal(plan.packageMaterializationExplicitApprovalToken.dispatch, false);
    assert.equal(plan.packageMaterializationExplicitApprovalToken.networkDispatch, false);
    assert.equal(plan.packageMaterializationExplicitApprovalToken.runtimeRegistration, false);
    assert.equal(plan.packageMaterializationExplicitApprovalToken.localFileWrites, false);
    assert.equal(plan.packageMaterializationExplicitApprovalToken.packageCreated, false);
    assert.equal(plan.packageMaterializationExplicitApprovalToken.workspaceMutation, false);
    assert.equal(plan.packageMaterializationExplicitApprovalToken.fileMaterialization, false);
    assert.equal(plan.packageMaterializationExplicitApprovalToken.lockfileMutation, false);
    assert.equal(plan.packageMaterializationExplicitApprovalToken.commandExecution, false);
    assert.equal(plan.packageMaterializationExplicitApprovalToken.buildOutput, false);
    assert.equal(plan.packageMaterializationExplicitApprovalToken.materializationApproved, false);
    assert.equal(plan.packageMaterializationExplicitApprovalToken.filesWritten, false);
    assert.equal(plan.packageMaterializationExplicitApprovalToken.consumes.packageMaterializationFinalApprovalChecklist.checklistVersion, "P25.40");
    assert.equal(plan.packageMaterializationExplicitApprovalToken.consumes.packageMaterializationApprovalGate.gateVersion, "P25.35");
    assert.equal(plan.packageMaterializationExplicitApprovalToken.tokenContract.tokenType, "explicit-user-approval");
    assert.equal(plan.packageMaterializationExplicitApprovalToken.tokenContract.acceptedNow, false);
    assert.equal(plan.packageMaterializationExplicitApprovalToken.tokenContract.storedNow, false);
    assert.equal(plan.packageMaterializationExplicitApprovalToken.tokenContract.replayAllowed, false);
    assert.ok(plan.packageMaterializationExplicitApprovalToken.tokenContract.requiredScope.includes("renderer-service package directory materialization"));
    assert.equal(plan.packageMaterializationExplicitApprovalToken.validationPlan.validateNow, false);
    assert.equal(plan.packageMaterializationExplicitApprovalToken.validationPlan.requireRuntimeDispatchDisabled, true);
    assert.equal(plan.packageMaterializationExplicitApprovalToken.auditPlan.writeAuditNow, false);
    assert.equal(plan.packageMaterializationExplicitApprovalToken.auditPlan.tokenValueLogged, false);
    assert.equal(plan.packageMaterializationExplicitApprovalToken.approvalDecision.canAcceptToken, false);
    assert.equal(plan.packageMaterializationExplicitApprovalToken.approvalDecision.canGrantFinalApproval, false);
    assert.equal(plan.packageMaterializationExplicitApprovalToken.approvalDecision.canMaterializeFiles, false);
    assert.deepEqual(plan.service.packageMaterializationExplicitApprovalToken, plan.packageMaterializationExplicitApprovalToken);
    assert.equal(plan.packageMaterializationApprovalAuditTrail.auditTrailVersion, "P25.42");
    assert.equal(plan.packageMaterializationApprovalAuditTrail.dryRunOnly, true);
    assert.equal(plan.packageMaterializationApprovalAuditTrail.approvalRequired, true);
    assert.equal(plan.packageMaterializationApprovalAuditTrail.approved, false);
    assert.equal(plan.packageMaterializationApprovalAuditTrail.finalApprovalGranted, false);
    assert.equal(plan.packageMaterializationApprovalAuditTrail.auditTrailRequired, true);
    assert.equal(plan.packageMaterializationApprovalAuditTrail.auditRecordPlanned, true);
    assert.equal(plan.packageMaterializationApprovalAuditTrail.auditRecordWritten, false);
    assert.equal(plan.packageMaterializationApprovalAuditTrail.auditRecordPersisted, false);
    assert.equal(plan.packageMaterializationApprovalAuditTrail.writeAuditNow, false);
    assert.equal(plan.packageMaterializationApprovalAuditTrail.tokenAccepted, false);
    assert.equal(plan.packageMaterializationApprovalAuditTrail.tokenStored, false);
    assert.equal(plan.packageMaterializationApprovalAuditTrail.tokenValidated, false);
    assert.equal(plan.packageMaterializationApprovalAuditTrail.executeNow, false);
    assert.equal(plan.packageMaterializationApprovalAuditTrail.verifyNow, false);
    assert.equal(plan.packageMaterializationApprovalAuditTrail.rollbackNow, false);
    assert.equal(plan.packageMaterializationApprovalAuditTrail.dispatch, false);
    assert.equal(plan.packageMaterializationApprovalAuditTrail.networkDispatch, false);
    assert.equal(plan.packageMaterializationApprovalAuditTrail.runtimeRegistration, false);
    assert.equal(plan.packageMaterializationApprovalAuditTrail.localFileWrites, false);
    assert.equal(plan.packageMaterializationApprovalAuditTrail.packageCreated, false);
    assert.equal(plan.packageMaterializationApprovalAuditTrail.workspaceMutation, false);
    assert.equal(plan.packageMaterializationApprovalAuditTrail.fileMaterialization, false);
    assert.equal(plan.packageMaterializationApprovalAuditTrail.lockfileMutation, false);
    assert.equal(plan.packageMaterializationApprovalAuditTrail.commandExecution, false);
    assert.equal(plan.packageMaterializationApprovalAuditTrail.buildOutput, false);
    assert.equal(plan.packageMaterializationApprovalAuditTrail.materializationApproved, false);
    assert.equal(plan.packageMaterializationApprovalAuditTrail.filesWritten, false);
    assert.equal(plan.packageMaterializationApprovalAuditTrail.consumes.packageMaterializationExplicitApprovalToken.tokenVersion, "P25.41");
    assert.equal(plan.packageMaterializationApprovalAuditTrail.consumes.packageMaterializationFinalApprovalChecklist.checklistVersion, "P25.40");
    assert.equal(plan.packageMaterializationApprovalAuditTrail.consumes.packageMaterializationApprovalGate.gateVersion, "P25.35");
    assert.equal(plan.packageMaterializationApprovalAuditTrail.auditTrailContract.writeNow, false);
    assert.equal(plan.packageMaterializationApprovalAuditTrail.auditTrailContract.persistNow, false);
    assert.equal(plan.packageMaterializationApprovalAuditTrail.auditTrailContract.tokenValueLogged, false);
    assert.ok(plan.packageMaterializationApprovalAuditTrail.auditTrailContract.requiredFields.includes("approvalScopeHash"));
    assert.ok(plan.packageMaterializationApprovalAuditTrail.auditEvents.some((entry) => entry.id === "final-approval-decision" && entry.written === false));
    assert.equal(plan.packageMaterializationApprovalAuditTrail.retentionPlan.enforceNow, false);
    assert.equal(plan.packageMaterializationApprovalAuditTrail.retentionPlan.redactTokenValue, true);
    assert.equal(plan.packageMaterializationApprovalAuditTrail.approvalDecision.canWriteAuditRecord, false);
    assert.equal(plan.packageMaterializationApprovalAuditTrail.approvalDecision.canPersistAuditRecord, false);
    assert.equal(plan.packageMaterializationApprovalAuditTrail.approvalDecision.canGrantFinalApproval, false);
    assert.equal(plan.packageMaterializationApprovalAuditTrail.approvalDecision.canMaterializeFiles, false);
    assert.deepEqual(plan.service.packageMaterializationApprovalAuditTrail, plan.packageMaterializationApprovalAuditTrail);
    assert.equal(plan.packageMaterializationApprovalReplayGuard.replayGuardVersion, "P25.43");
    assert.equal(plan.packageMaterializationApprovalReplayGuard.dryRunOnly, true);
    assert.equal(plan.packageMaterializationApprovalReplayGuard.approvalRequired, true);
    assert.equal(plan.packageMaterializationApprovalReplayGuard.approved, false);
    assert.equal(plan.packageMaterializationApprovalReplayGuard.finalApprovalGranted, false);
    assert.equal(plan.packageMaterializationApprovalReplayGuard.replayGuardRequired, true);
    assert.equal(plan.packageMaterializationApprovalReplayGuard.replayCheckPlanned, true);
    assert.equal(plan.packageMaterializationApprovalReplayGuard.replayCheckExecuted, false);
    assert.equal(plan.packageMaterializationApprovalReplayGuard.replayDetected, false);
    assert.equal(plan.packageMaterializationApprovalReplayGuard.replayRejected, false);
    assert.equal(plan.packageMaterializationApprovalReplayGuard.tokenAccepted, false);
    assert.equal(plan.packageMaterializationApprovalReplayGuard.tokenStored, false);
    assert.equal(plan.packageMaterializationApprovalReplayGuard.tokenValidated, false);
    assert.equal(plan.packageMaterializationApprovalReplayGuard.tokenConsumed, false);
    assert.equal(plan.packageMaterializationApprovalReplayGuard.tokenRevoked, false);
    assert.equal(plan.packageMaterializationApprovalReplayGuard.nonceStored, false);
    assert.equal(plan.packageMaterializationApprovalReplayGuard.scopeHashStored, false);
    assert.equal(plan.packageMaterializationApprovalReplayGuard.executeNow, false);
    assert.equal(plan.packageMaterializationApprovalReplayGuard.verifyNow, false);
    assert.equal(plan.packageMaterializationApprovalReplayGuard.rollbackNow, false);
    assert.equal(plan.packageMaterializationApprovalReplayGuard.dispatch, false);
    assert.equal(plan.packageMaterializationApprovalReplayGuard.networkDispatch, false);
    assert.equal(plan.packageMaterializationApprovalReplayGuard.runtimeRegistration, false);
    assert.equal(plan.packageMaterializationApprovalReplayGuard.localFileWrites, false);
    assert.equal(plan.packageMaterializationApprovalReplayGuard.packageCreated, false);
    assert.equal(plan.packageMaterializationApprovalReplayGuard.workspaceMutation, false);
    assert.equal(plan.packageMaterializationApprovalReplayGuard.fileMaterialization, false);
    assert.equal(plan.packageMaterializationApprovalReplayGuard.lockfileMutation, false);
    assert.equal(plan.packageMaterializationApprovalReplayGuard.commandExecution, false);
    assert.equal(plan.packageMaterializationApprovalReplayGuard.buildOutput, false);
    assert.equal(plan.packageMaterializationApprovalReplayGuard.materializationApproved, false);
    assert.equal(plan.packageMaterializationApprovalReplayGuard.filesWritten, false);
    assert.equal(plan.packageMaterializationApprovalReplayGuard.consumes.packageMaterializationApprovalAuditTrail.auditTrailVersion, "P25.42");
    assert.equal(plan.packageMaterializationApprovalReplayGuard.consumes.packageMaterializationExplicitApprovalToken.tokenVersion, "P25.41");
    assert.equal(plan.packageMaterializationApprovalReplayGuard.consumes.packageMaterializationFinalApprovalChecklist.checklistVersion, "P25.40");
    assert.equal(plan.packageMaterializationApprovalReplayGuard.replayGuardContract.checkNow, false);
    assert.equal(plan.packageMaterializationApprovalReplayGuard.replayGuardContract.storeNonceNow, false);
    assert.equal(plan.packageMaterializationApprovalReplayGuard.replayGuardContract.consumeTokenNow, false);
    assert.equal(plan.packageMaterializationApprovalReplayGuard.replayGuardContract.rejectReplayNow, false);
    assert.equal(plan.packageMaterializationApprovalReplayGuard.replayGuardContract.tokenValueLogged, false);
    assert.ok(plan.packageMaterializationApprovalReplayGuard.replayGuardContract.requiredInputs.includes("approvalScopeHash"));
    assert.ok(plan.packageMaterializationApprovalReplayGuard.replayChecks.some((entry) => entry.id === "nonce-not-seen" && entry.executed === false));
    assert.equal(plan.packageMaterializationApprovalReplayGuard.replayDecision.canCheckReplay, false);
    assert.equal(plan.packageMaterializationApprovalReplayGuard.replayDecision.canConsumeToken, false);
    assert.equal(plan.packageMaterializationApprovalReplayGuard.replayDecision.canGrantFinalApproval, false);
    assert.equal(plan.packageMaterializationApprovalReplayGuard.replayDecision.canMaterializeFiles, false);
    assert.deepEqual(plan.service.packageMaterializationApprovalReplayGuard, plan.packageMaterializationApprovalReplayGuard);
    assert.equal(plan.packageMaterializationApprovalExpiryPolicy.expiryPolicyVersion, "P25.44");
    assert.equal(plan.packageMaterializationApprovalExpiryPolicy.dryRunOnly, true);
    assert.equal(plan.packageMaterializationApprovalExpiryPolicy.approvalRequired, true);
    assert.equal(plan.packageMaterializationApprovalExpiryPolicy.approved, false);
    assert.equal(plan.packageMaterializationApprovalExpiryPolicy.finalApprovalGranted, false);
    assert.equal(plan.packageMaterializationApprovalExpiryPolicy.expiryPolicyRequired, true);
    assert.equal(plan.packageMaterializationApprovalExpiryPolicy.expiryCheckPlanned, true);
    assert.equal(plan.packageMaterializationApprovalExpiryPolicy.expiryCheckExecuted, false);
    assert.equal(plan.packageMaterializationApprovalExpiryPolicy.tokenExpired, false);
    assert.equal(plan.packageMaterializationApprovalExpiryPolicy.tokenNotBeforeChecked, false);
    assert.equal(plan.packageMaterializationApprovalExpiryPolicy.tokenExpiresAtChecked, false);
    assert.equal(plan.packageMaterializationApprovalExpiryPolicy.clockSkewChecked, false);
    assert.equal(plan.packageMaterializationApprovalExpiryPolicy.tokenAccepted, false);
    assert.equal(plan.packageMaterializationApprovalExpiryPolicy.tokenStored, false);
    assert.equal(plan.packageMaterializationApprovalExpiryPolicy.tokenValidated, false);
    assert.equal(plan.packageMaterializationApprovalExpiryPolicy.tokenConsumed, false);
    assert.equal(plan.packageMaterializationApprovalExpiryPolicy.tokenRevoked, false);
    assert.equal(plan.packageMaterializationApprovalExpiryPolicy.executeNow, false);
    assert.equal(plan.packageMaterializationApprovalExpiryPolicy.verifyNow, false);
    assert.equal(plan.packageMaterializationApprovalExpiryPolicy.rollbackNow, false);
    assert.equal(plan.packageMaterializationApprovalExpiryPolicy.dispatch, false);
    assert.equal(plan.packageMaterializationApprovalExpiryPolicy.networkDispatch, false);
    assert.equal(plan.packageMaterializationApprovalExpiryPolicy.runtimeRegistration, false);
    assert.equal(plan.packageMaterializationApprovalExpiryPolicy.localFileWrites, false);
    assert.equal(plan.packageMaterializationApprovalExpiryPolicy.packageCreated, false);
    assert.equal(plan.packageMaterializationApprovalExpiryPolicy.workspaceMutation, false);
    assert.equal(plan.packageMaterializationApprovalExpiryPolicy.fileMaterialization, false);
    assert.equal(plan.packageMaterializationApprovalExpiryPolicy.lockfileMutation, false);
    assert.equal(plan.packageMaterializationApprovalExpiryPolicy.commandExecution, false);
    assert.equal(plan.packageMaterializationApprovalExpiryPolicy.buildOutput, false);
    assert.equal(plan.packageMaterializationApprovalExpiryPolicy.materializationApproved, false);
    assert.equal(plan.packageMaterializationApprovalExpiryPolicy.filesWritten, false);
    assert.equal(plan.packageMaterializationApprovalExpiryPolicy.consumes.packageMaterializationApprovalReplayGuard.replayGuardVersion, "P25.43");
    assert.equal(plan.packageMaterializationApprovalExpiryPolicy.consumes.packageMaterializationExplicitApprovalToken.tokenVersion, "P25.41");
    assert.equal(plan.packageMaterializationApprovalExpiryPolicy.consumes.packageMaterializationApprovalAuditTrail.auditTrailVersion, "P25.42");
    assert.equal(plan.packageMaterializationApprovalExpiryPolicy.expiryPolicy.checkNow, false);
    assert.equal(plan.packageMaterializationApprovalExpiryPolicy.expiryPolicy.validateExpiresAtNow, false);
    assert.equal(plan.packageMaterializationApprovalExpiryPolicy.expiryPolicy.validateClockSkewNow, false);
    assert.equal(plan.packageMaterializationApprovalExpiryPolicy.expiryPolicy.maxAgeSeconds, 900);
    assert.equal(plan.packageMaterializationApprovalExpiryPolicy.expiryPolicy.allowedClockSkewSeconds, 60);
    assert.ok(plan.packageMaterializationApprovalExpiryPolicy.expiryPolicy.requiredClaims.includes("expiresAt"));
    assert.ok(plan.packageMaterializationApprovalExpiryPolicy.expiryChecks.some((entry) => entry.id === "expires-at-in-future" && entry.executed === false));
    assert.equal(plan.packageMaterializationApprovalExpiryPolicy.expiryDecision.canCheckExpiry, false);
    assert.equal(plan.packageMaterializationApprovalExpiryPolicy.expiryDecision.canAcceptToken, false);
    assert.equal(plan.packageMaterializationApprovalExpiryPolicy.expiryDecision.canGrantFinalApproval, false);
    assert.deepEqual(plan.service.packageMaterializationApprovalExpiryPolicy, plan.packageMaterializationApprovalExpiryPolicy);
    assert.equal(plan.packageMaterializationApprovalRevocationPolicy.revocationPolicyVersion, "P25.45");
    assert.equal(plan.packageMaterializationApprovalRevocationPolicy.dryRunOnly, true);
    assert.equal(plan.packageMaterializationApprovalRevocationPolicy.approvalRequired, true);
    assert.equal(plan.packageMaterializationApprovalRevocationPolicy.approved, false);
    assert.equal(plan.packageMaterializationApprovalRevocationPolicy.finalApprovalGranted, false);
    assert.equal(plan.packageMaterializationApprovalRevocationPolicy.revocationPolicyRequired, true);
    assert.equal(plan.packageMaterializationApprovalRevocationPolicy.revocationCheckPlanned, true);
    assert.equal(plan.packageMaterializationApprovalRevocationPolicy.revocationCheckExecuted, false);
    assert.equal(plan.packageMaterializationApprovalRevocationPolicy.revocationRegistryConfigured, false);
    assert.equal(plan.packageMaterializationApprovalRevocationPolicy.revocationRegistryFetched, false);
    assert.equal(plan.packageMaterializationApprovalRevocationPolicy.revocationStatusFetched, false);
    assert.equal(plan.packageMaterializationApprovalRevocationPolicy.revocationStatusTrusted, false);
    assert.equal(plan.packageMaterializationApprovalRevocationPolicy.tokenRevocationChecked, false);
    assert.equal(plan.packageMaterializationApprovalRevocationPolicy.tokenRevoked, false);
    assert.equal(plan.packageMaterializationApprovalRevocationPolicy.revokedTokenRejected, false);
    assert.equal(plan.packageMaterializationApprovalRevocationPolicy.tokenAccepted, false);
    assert.equal(plan.packageMaterializationApprovalRevocationPolicy.tokenStored, false);
    assert.equal(plan.packageMaterializationApprovalRevocationPolicy.tokenValidated, false);
    assert.equal(plan.packageMaterializationApprovalRevocationPolicy.tokenConsumed, false);
    assert.equal(plan.packageMaterializationApprovalRevocationPolicy.executeNow, false);
    assert.equal(plan.packageMaterializationApprovalRevocationPolicy.verifyNow, false);
    assert.equal(plan.packageMaterializationApprovalRevocationPolicy.rollbackNow, false);
    assert.equal(plan.packageMaterializationApprovalRevocationPolicy.dispatch, false);
    assert.equal(plan.packageMaterializationApprovalRevocationPolicy.networkDispatch, false);
    assert.equal(plan.packageMaterializationApprovalRevocationPolicy.runtimeRegistration, false);
    assert.equal(plan.packageMaterializationApprovalRevocationPolicy.localFileWrites, false);
    assert.equal(plan.packageMaterializationApprovalRevocationPolicy.packageCreated, false);
    assert.equal(plan.packageMaterializationApprovalRevocationPolicy.workspaceMutation, false);
    assert.equal(plan.packageMaterializationApprovalRevocationPolicy.fileMaterialization, false);
    assert.equal(plan.packageMaterializationApprovalRevocationPolicy.lockfileMutation, false);
    assert.equal(plan.packageMaterializationApprovalRevocationPolicy.commandExecution, false);
    assert.equal(plan.packageMaterializationApprovalRevocationPolicy.buildOutput, false);
    assert.equal(plan.packageMaterializationApprovalRevocationPolicy.materializationApproved, false);
    assert.equal(plan.packageMaterializationApprovalRevocationPolicy.filesWritten, false);
    assert.equal(plan.packageMaterializationApprovalRevocationPolicy.consumes.packageMaterializationApprovalExpiryPolicy.expiryPolicyVersion, "P25.44");
    assert.equal(plan.packageMaterializationApprovalRevocationPolicy.consumes.packageMaterializationApprovalReplayGuard.replayGuardVersion, "P25.43");
    assert.equal(plan.packageMaterializationApprovalRevocationPolicy.consumes.packageMaterializationApprovalAuditTrail.auditTrailVersion, "P25.42");
    assert.equal(plan.packageMaterializationApprovalRevocationPolicy.revocationPolicy.checkNow, false);
    assert.equal(plan.packageMaterializationApprovalRevocationPolicy.revocationPolicy.fetchRegistryNow, false);
    assert.equal(plan.packageMaterializationApprovalRevocationPolicy.revocationPolicy.persistRevocationStateNow, false);
    assert.equal(plan.packageMaterializationApprovalRevocationPolicy.revocationPolicy.rejectRevokedTokenNow, false);
    assert.ok(plan.packageMaterializationApprovalRevocationPolicy.revocationPolicy.requiredInputs.includes("tokenId"));
    assert.ok(plan.packageMaterializationApprovalRevocationPolicy.revocationChecks.some((entry) => entry.id === "token-not-revoked" && entry.executed === false));
    assert.equal(plan.packageMaterializationApprovalRevocationPolicy.revocationDecision.canCheckRevocation, false);
    assert.equal(plan.packageMaterializationApprovalRevocationPolicy.revocationDecision.canRejectRevokedToken, false);
    assert.equal(plan.packageMaterializationApprovalRevocationPolicy.revocationDecision.canGrantFinalApproval, false);
    assert.deepEqual(plan.service.packageMaterializationApprovalRevocationPolicy, plan.packageMaterializationApprovalRevocationPolicy);
    assert.equal(plan.packageMaterializationApprovalScopeBindingPolicy.scopeBindingVersion, "P25.46");
    assert.equal(plan.packageMaterializationApprovalScopeBindingPolicy.dryRunOnly, true);
    assert.equal(plan.packageMaterializationApprovalScopeBindingPolicy.approvalRequired, true);
    assert.equal(plan.packageMaterializationApprovalScopeBindingPolicy.approved, false);
    assert.equal(plan.packageMaterializationApprovalScopeBindingPolicy.finalApprovalGranted, false);
    assert.equal(plan.packageMaterializationApprovalScopeBindingPolicy.scopeBindingRequired, true);
    assert.equal(plan.packageMaterializationApprovalScopeBindingPolicy.scopeBindingPlanned, true);
    assert.equal(plan.packageMaterializationApprovalScopeBindingPolicy.scopeBindingExecuted, false);
    assert.equal(plan.packageMaterializationApprovalScopeBindingPolicy.approvalScopeHashComputed, false);
    assert.equal(plan.packageMaterializationApprovalScopeBindingPolicy.approvalScopeHashValidated, false);
    assert.equal(plan.packageMaterializationApprovalScopeBindingPolicy.approvalScopeHashStored, false);
    assert.equal(plan.packageMaterializationApprovalScopeBindingPolicy.targetScopeBound, false);
    assert.equal(plan.packageMaterializationApprovalScopeBindingPolicy.commandScopeBound, false);
    assert.equal(plan.packageMaterializationApprovalScopeBindingPolicy.workspaceScopeBound, false);
    assert.equal(plan.packageMaterializationApprovalScopeBindingPolicy.packageScopeBound, false);
    assert.equal(plan.packageMaterializationApprovalScopeBindingPolicy.fileSnapshotRead, false);
    assert.equal(plan.packageMaterializationApprovalScopeBindingPolicy.workspaceHashComputed, false);
    assert.equal(plan.packageMaterializationApprovalScopeBindingPolicy.packageManifestHashComputed, false);
    assert.equal(plan.packageMaterializationApprovalScopeBindingPolicy.tokenScopeMatched, false);
    assert.equal(plan.packageMaterializationApprovalScopeBindingPolicy.tokenAccepted, false);
    assert.equal(plan.packageMaterializationApprovalScopeBindingPolicy.tokenStored, false);
    assert.equal(plan.packageMaterializationApprovalScopeBindingPolicy.tokenValidated, false);
    assert.equal(plan.packageMaterializationApprovalScopeBindingPolicy.tokenConsumed, false);
    assert.equal(plan.packageMaterializationApprovalScopeBindingPolicy.tokenRevoked, false);
    assert.equal(plan.packageMaterializationApprovalScopeBindingPolicy.executeNow, false);
    assert.equal(plan.packageMaterializationApprovalScopeBindingPolicy.verifyNow, false);
    assert.equal(plan.packageMaterializationApprovalScopeBindingPolicy.rollbackNow, false);
    assert.equal(plan.packageMaterializationApprovalScopeBindingPolicy.dispatch, false);
    assert.equal(plan.packageMaterializationApprovalScopeBindingPolicy.networkDispatch, false);
    assert.equal(plan.packageMaterializationApprovalScopeBindingPolicy.runtimeRegistration, false);
    assert.equal(plan.packageMaterializationApprovalScopeBindingPolicy.localFileWrites, false);
    assert.equal(plan.packageMaterializationApprovalScopeBindingPolicy.packageCreated, false);
    assert.equal(plan.packageMaterializationApprovalScopeBindingPolicy.workspaceMutation, false);
    assert.equal(plan.packageMaterializationApprovalScopeBindingPolicy.fileMaterialization, false);
    assert.equal(plan.packageMaterializationApprovalScopeBindingPolicy.lockfileMutation, false);
    assert.equal(plan.packageMaterializationApprovalScopeBindingPolicy.commandExecution, false);
    assert.equal(plan.packageMaterializationApprovalScopeBindingPolicy.buildOutput, false);
    assert.equal(plan.packageMaterializationApprovalScopeBindingPolicy.materializationApproved, false);
    assert.equal(plan.packageMaterializationApprovalScopeBindingPolicy.filesWritten, false);
    assert.equal(plan.packageMaterializationApprovalScopeBindingPolicy.consumes.packageMaterializationApprovalRevocationPolicy.revocationPolicyVersion, "P25.45");
    assert.equal(plan.packageMaterializationApprovalScopeBindingPolicy.consumes.packageMaterializationApprovalExpiryPolicy.expiryPolicyVersion, "P25.44");
    assert.equal(plan.packageMaterializationApprovalScopeBindingPolicy.consumes.packageMaterializationFinalApprovalChecklist.checklistVersion, "P25.40");
    assert.equal(plan.packageMaterializationApprovalScopeBindingPolicy.scopeBindingPolicy.bindNow, false);
    assert.equal(plan.packageMaterializationApprovalScopeBindingPolicy.scopeBindingPolicy.computeApprovalScopeHashNow, false);
    assert.equal(plan.packageMaterializationApprovalScopeBindingPolicy.scopeBindingPolicy.validateApprovalScopeHashNow, false);
    assert.equal(plan.packageMaterializationApprovalScopeBindingPolicy.scopeBindingPolicy.readFileSnapshotNow, false);
    assert.equal(plan.packageMaterializationApprovalScopeBindingPolicy.scopeBindingPolicy.computeWorkspaceHashNow, false);
    assert.equal(plan.packageMaterializationApprovalScopeBindingPolicy.scopeBindingPolicy.computePackageManifestHashNow, false);
    assert.equal(plan.packageMaterializationApprovalScopeBindingPolicy.scopeBindingPolicy.persistScopeBindingNow, false);
    assert.ok(plan.packageMaterializationApprovalScopeBindingPolicy.scopeBindingPolicy.requiredScopeFields.includes("target"));
    assert.ok(plan.packageMaterializationApprovalScopeBindingPolicy.scopeBindingChecks.some((entry) => entry.id === "approval-scope-hash-matches-token" && entry.executed === false));
    assert.equal(plan.packageMaterializationApprovalScopeBindingPolicy.scopeBindingDecision.canBindScope, false);
    assert.equal(plan.packageMaterializationApprovalScopeBindingPolicy.scopeBindingDecision.canComputeScopeHash, false);
    assert.equal(plan.packageMaterializationApprovalScopeBindingPolicy.scopeBindingDecision.canValidateTokenScope, false);
    assert.equal(plan.packageMaterializationApprovalScopeBindingPolicy.scopeBindingDecision.canGrantFinalApproval, false);
    assert.deepEqual(plan.service.packageMaterializationApprovalScopeBindingPolicy, plan.packageMaterializationApprovalScopeBindingPolicy);
    assert.equal(plan.packageMaterializationApprovalOperatorConfirmationPolicy.operatorConfirmationVersion, "P25.47");
    assert.equal(plan.packageMaterializationApprovalOperatorConfirmationPolicy.dryRunOnly, true);
    assert.equal(plan.packageMaterializationApprovalOperatorConfirmationPolicy.approvalRequired, true);
    assert.equal(plan.packageMaterializationApprovalOperatorConfirmationPolicy.approved, false);
    assert.equal(plan.packageMaterializationApprovalOperatorConfirmationPolicy.finalApprovalGranted, false);
    assert.equal(plan.packageMaterializationApprovalOperatorConfirmationPolicy.operatorConfirmationRequired, true);
    assert.equal(plan.packageMaterializationApprovalOperatorConfirmationPolicy.operatorConfirmationPlanned, true);
    assert.equal(plan.packageMaterializationApprovalOperatorConfirmationPolicy.operatorConfirmationPrompted, false);
    assert.equal(plan.packageMaterializationApprovalOperatorConfirmationPolicy.operatorConfirmationReceived, false);
    assert.equal(plan.packageMaterializationApprovalOperatorConfirmationPolicy.operatorConfirmationStored, false);
    assert.equal(plan.packageMaterializationApprovalOperatorConfirmationPolicy.operatorConfirmationValidated, false);
    assert.equal(plan.packageMaterializationApprovalOperatorConfirmationPolicy.operatorIdentityVerified, false);
    assert.equal(plan.packageMaterializationApprovalOperatorConfirmationPolicy.operatorIntentCaptured, false);
    assert.equal(plan.packageMaterializationApprovalOperatorConfirmationPolicy.confirmationAuditLinked, false);
    assert.equal(plan.packageMaterializationApprovalOperatorConfirmationPolicy.confirmationTokenIssued, false);
    assert.equal(plan.packageMaterializationApprovalOperatorConfirmationPolicy.tokenAccepted, false);
    assert.equal(plan.packageMaterializationApprovalOperatorConfirmationPolicy.tokenStored, false);
    assert.equal(plan.packageMaterializationApprovalOperatorConfirmationPolicy.tokenValidated, false);
    assert.equal(plan.packageMaterializationApprovalOperatorConfirmationPolicy.tokenConsumed, false);
    assert.equal(plan.packageMaterializationApprovalOperatorConfirmationPolicy.tokenRevoked, false);
    assert.equal(plan.packageMaterializationApprovalOperatorConfirmationPolicy.executeNow, false);
    assert.equal(plan.packageMaterializationApprovalOperatorConfirmationPolicy.verifyNow, false);
    assert.equal(plan.packageMaterializationApprovalOperatorConfirmationPolicy.rollbackNow, false);
    assert.equal(plan.packageMaterializationApprovalOperatorConfirmationPolicy.dispatch, false);
    assert.equal(plan.packageMaterializationApprovalOperatorConfirmationPolicy.networkDispatch, false);
    assert.equal(plan.packageMaterializationApprovalOperatorConfirmationPolicy.runtimeRegistration, false);
    assert.equal(plan.packageMaterializationApprovalOperatorConfirmationPolicy.localFileWrites, false);
    assert.equal(plan.packageMaterializationApprovalOperatorConfirmationPolicy.packageCreated, false);
    assert.equal(plan.packageMaterializationApprovalOperatorConfirmationPolicy.workspaceMutation, false);
    assert.equal(plan.packageMaterializationApprovalOperatorConfirmationPolicy.fileMaterialization, false);
    assert.equal(plan.packageMaterializationApprovalOperatorConfirmationPolicy.lockfileMutation, false);
    assert.equal(plan.packageMaterializationApprovalOperatorConfirmationPolicy.commandExecution, false);
    assert.equal(plan.packageMaterializationApprovalOperatorConfirmationPolicy.buildOutput, false);
    assert.equal(plan.packageMaterializationApprovalOperatorConfirmationPolicy.materializationApproved, false);
    assert.equal(plan.packageMaterializationApprovalOperatorConfirmationPolicy.filesWritten, false);
    assert.equal(plan.packageMaterializationApprovalOperatorConfirmationPolicy.consumes.packageMaterializationApprovalScopeBindingPolicy.scopeBindingVersion, "P25.46");
    assert.equal(plan.packageMaterializationApprovalOperatorConfirmationPolicy.consumes.packageMaterializationApprovalRevocationPolicy.revocationPolicyVersion, "P25.45");
    assert.equal(plan.packageMaterializationApprovalOperatorConfirmationPolicy.consumes.packageMaterializationFinalApprovalChecklist.checklistVersion, "P25.40");
    assert.equal(plan.packageMaterializationApprovalOperatorConfirmationPolicy.operatorConfirmationPolicy.promptNow, false);
    assert.equal(plan.packageMaterializationApprovalOperatorConfirmationPolicy.operatorConfirmationPolicy.acceptConfirmationNow, false);
    assert.equal(plan.packageMaterializationApprovalOperatorConfirmationPolicy.operatorConfirmationPolicy.validateOperatorIdentityNow, false);
    assert.equal(plan.packageMaterializationApprovalOperatorConfirmationPolicy.operatorConfirmationPolicy.persistConfirmationNow, false);
    assert.equal(plan.packageMaterializationApprovalOperatorConfirmationPolicy.operatorConfirmationPolicy.issueConfirmationTokenNow, false);
    assert.ok(plan.packageMaterializationApprovalOperatorConfirmationPolicy.operatorConfirmationPolicy.requiredInputs.includes("operatorId"));
    assert.ok(plan.packageMaterializationApprovalOperatorConfirmationPolicy.operatorConfirmationChecks.some((entry) => entry.id === "confirmation-audit-linked" && entry.executed === false));
    assert.equal(plan.packageMaterializationApprovalOperatorConfirmationPolicy.operatorConfirmationDecision.canPromptOperator, false);
    assert.equal(plan.packageMaterializationApprovalOperatorConfirmationPolicy.operatorConfirmationDecision.canAcceptConfirmation, false);
    assert.equal(plan.packageMaterializationApprovalOperatorConfirmationPolicy.operatorConfirmationDecision.canGrantFinalApproval, false);
    assert.deepEqual(plan.service.packageMaterializationApprovalOperatorConfirmationPolicy, plan.packageMaterializationApprovalOperatorConfirmationPolicy);
    assert.equal(plan.packageMaterializationApprovalEmergencyStopPolicy.emergencyStopVersion, "P25.48");
    assert.equal(plan.packageMaterializationApprovalEmergencyStopPolicy.dryRunOnly, true);
    assert.equal(plan.packageMaterializationApprovalEmergencyStopPolicy.approvalRequired, true);
    assert.equal(plan.packageMaterializationApprovalEmergencyStopPolicy.approved, false);
    assert.equal(plan.packageMaterializationApprovalEmergencyStopPolicy.finalApprovalGranted, false);
    assert.equal(plan.packageMaterializationApprovalEmergencyStopPolicy.emergencyStopRequired, true);
    assert.equal(plan.packageMaterializationApprovalEmergencyStopPolicy.emergencyStopPlanned, true);
    assert.equal(plan.packageMaterializationApprovalEmergencyStopPolicy.emergencyStopConfigured, false);
    assert.equal(plan.packageMaterializationApprovalEmergencyStopPolicy.emergencyStopChecked, false);
    assert.equal(plan.packageMaterializationApprovalEmergencyStopPolicy.emergencyStopFetched, false);
    assert.equal(plan.packageMaterializationApprovalEmergencyStopPolicy.emergencyStopStateRead, false);
    assert.equal(plan.packageMaterializationApprovalEmergencyStopPolicy.emergencyStopStateTrusted, false);
    assert.equal(plan.packageMaterializationApprovalEmergencyStopPolicy.emergencyStopActive, false);
    assert.equal(plan.packageMaterializationApprovalEmergencyStopPolicy.emergencyStopBypassAllowed, false);
    assert.equal(plan.packageMaterializationApprovalEmergencyStopPolicy.emergencyStopAuditLinked, false);
    assert.equal(plan.packageMaterializationApprovalEmergencyStopPolicy.stopRegistryConfigured, false);
    assert.equal(plan.packageMaterializationApprovalEmergencyStopPolicy.stopRegistryFetched, false);
    assert.equal(plan.packageMaterializationApprovalEmergencyStopPolicy.stopStatusFetched, false);
    assert.equal(plan.packageMaterializationApprovalEmergencyStopPolicy.stopStatusTrusted, false);
    assert.equal(plan.packageMaterializationApprovalEmergencyStopPolicy.stopSignalReceived, false);
    assert.equal(plan.packageMaterializationApprovalEmergencyStopPolicy.stopOverrideAccepted, false);
    assert.equal(plan.packageMaterializationApprovalEmergencyStopPolicy.tokenAccepted, false);
    assert.equal(plan.packageMaterializationApprovalEmergencyStopPolicy.tokenStored, false);
    assert.equal(plan.packageMaterializationApprovalEmergencyStopPolicy.tokenValidated, false);
    assert.equal(plan.packageMaterializationApprovalEmergencyStopPolicy.tokenConsumed, false);
    assert.equal(plan.packageMaterializationApprovalEmergencyStopPolicy.tokenRevoked, false);
    assert.equal(plan.packageMaterializationApprovalEmergencyStopPolicy.executeNow, false);
    assert.equal(plan.packageMaterializationApprovalEmergencyStopPolicy.verifyNow, false);
    assert.equal(plan.packageMaterializationApprovalEmergencyStopPolicy.rollbackNow, false);
    assert.equal(plan.packageMaterializationApprovalEmergencyStopPolicy.dispatch, false);
    assert.equal(plan.packageMaterializationApprovalEmergencyStopPolicy.networkDispatch, false);
    assert.equal(plan.packageMaterializationApprovalEmergencyStopPolicy.runtimeRegistration, false);
    assert.equal(plan.packageMaterializationApprovalEmergencyStopPolicy.localFileWrites, false);
    assert.equal(plan.packageMaterializationApprovalEmergencyStopPolicy.packageCreated, false);
    assert.equal(plan.packageMaterializationApprovalEmergencyStopPolicy.workspaceMutation, false);
    assert.equal(plan.packageMaterializationApprovalEmergencyStopPolicy.fileMaterialization, false);
    assert.equal(plan.packageMaterializationApprovalEmergencyStopPolicy.lockfileMutation, false);
    assert.equal(plan.packageMaterializationApprovalEmergencyStopPolicy.commandExecution, false);
    assert.equal(plan.packageMaterializationApprovalEmergencyStopPolicy.buildOutput, false);
    assert.equal(plan.packageMaterializationApprovalEmergencyStopPolicy.materializationApproved, false);
    assert.equal(plan.packageMaterializationApprovalEmergencyStopPolicy.filesWritten, false);
    assert.equal(plan.packageMaterializationApprovalEmergencyStopPolicy.consumes.packageMaterializationApprovalOperatorConfirmationPolicy.operatorConfirmationVersion, "P25.47");
    assert.equal(plan.packageMaterializationApprovalEmergencyStopPolicy.consumes.packageMaterializationApprovalRevocationPolicy.revocationPolicyVersion, "P25.45");
    assert.equal(plan.packageMaterializationApprovalEmergencyStopPolicy.consumes.packageMaterializationFinalApprovalChecklist.checklistVersion, "P25.40");
    assert.equal(plan.packageMaterializationApprovalEmergencyStopPolicy.emergencyStopPolicy.checkNow, false);
    assert.equal(plan.packageMaterializationApprovalEmergencyStopPolicy.emergencyStopPolicy.fetchRegistryNow, false);
    assert.equal(plan.packageMaterializationApprovalEmergencyStopPolicy.emergencyStopPolicy.readStopStateNow, false);
    assert.equal(plan.packageMaterializationApprovalEmergencyStopPolicy.emergencyStopPolicy.trustStopStateNow, false);
    assert.equal(plan.packageMaterializationApprovalEmergencyStopPolicy.emergencyStopPolicy.allowBypassNow, false);
    assert.ok(plan.packageMaterializationApprovalEmergencyStopPolicy.emergencyStopPolicy.requiredInputs.includes("stopSource"));
    assert.ok(plan.packageMaterializationApprovalEmergencyStopPolicy.emergencyStopChecks.some((entry) => entry.id === "emergency-stop-state-trusted" && entry.executed === false));
    assert.equal(plan.packageMaterializationApprovalEmergencyStopPolicy.emergencyStopDecision.canCheckEmergencyStop, false);
    assert.equal(plan.packageMaterializationApprovalEmergencyStopPolicy.emergencyStopDecision.canFetchStopRegistry, false);
    assert.equal(plan.packageMaterializationApprovalEmergencyStopPolicy.emergencyStopDecision.canTrustStopState, false);
    assert.equal(plan.packageMaterializationApprovalEmergencyStopPolicy.emergencyStopDecision.canGrantFinalApproval, false);
    assert.deepEqual(plan.service.packageMaterializationApprovalEmergencyStopPolicy, plan.packageMaterializationApprovalEmergencyStopPolicy);
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
    assert.equal(plan.diagnostics.packageBuildVerificationVersion, "P25.31");
    assert.equal(plan.diagnostics.packageMaterializationChecklistVersion, "P25.32");
    assert.equal(plan.diagnostics.packageCreationDryRunSummaryVersion, "P25.33");
    assert.equal(plan.diagnostics.packageCreationFileManifestVersion, "P25.34");
    assert.equal(plan.diagnostics.packageMaterializationApprovalGateVersion, "P25.35");
    assert.equal(plan.diagnostics.packageMaterializationExecutionDryRunVersion, "P25.36");
    assert.equal(plan.diagnostics.packageMaterializationWriteContractVersion, "P25.37");
    assert.equal(plan.diagnostics.packageMaterializationRollbackContractVersion, "P25.38");
    assert.equal(plan.diagnostics.packageMaterializationVerificationManifestVersion, "P25.39");
    assert.equal(plan.diagnostics.packageMaterializationFinalApprovalChecklistVersion, "P25.40");
    assert.equal(plan.diagnostics.packageMaterializationExplicitApprovalTokenVersion, "P25.41");
    assert.equal(plan.diagnostics.packageMaterializationApprovalAuditTrailVersion, "P25.42");
    assert.equal(plan.diagnostics.packageMaterializationApprovalReplayGuardVersion, "P25.43");
    assert.equal(plan.diagnostics.packageMaterializationApprovalExpiryPolicyVersion, "P25.44");
    assert.equal(plan.diagnostics.packageMaterializationApprovalRevocationPolicyVersion, "P25.45");
    assert.equal(plan.diagnostics.packageMaterializationApprovalScopeBindingPolicyVersion, "P25.46");
    assert.equal(plan.diagnostics.packageMaterializationApprovalOperatorConfirmationPolicyVersion, "P25.47");
    assert.equal(plan.diagnostics.packageMaterializationApprovalEmergencyStopPolicyVersion, "P25.48");
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

test("render.thumbnail renderer-service package build verification stays metadata-only", () => {
    const verification = createRenderThumbnailRendererServicePackageBuildVerification({
        packageWorkspaceWiring: {
            status: "planned-disabled",
            wiringVersion: "P25.30",
        },
        packageFileTemplates: {
            status: "planned-disabled",
            templateVersion: "P25.29",
            fileMaterialization: false,
        },
    });

    assert.equal(verification.status, "planned-disabled");
    assert.equal(verification.verificationVersion, "P25.31");
    assert.equal(verification.adapter, "renderer-service");
    assert.equal(verification.command, "render.thumbnail");
    assert.equal(verification.dispatch, false);
    assert.equal(verification.networkDispatch, false);
    assert.equal(verification.runtimeRegistration, false);
    assert.equal(verification.localFileWrites, false);
    assert.equal(verification.hostStartup, false);
    assert.equal(verification.processSpawn, false);
    assert.equal(verification.packageCreated, false);
    assert.equal(verification.workspaceMutation, false);
    assert.equal(verification.scriptRunnable, false);
    assert.equal(verification.fileMaterialization, false);
    assert.equal(verification.lockfileMutation, false);
    assert.equal(verification.rootPackageJsonMutation, false);
    assert.equal(verification.pnpmWorkspaceMutation, false);
    assert.equal(verification.commandExecution, false);
    assert.equal(verification.buildOutput, false);
    assert.equal(verification.packageScriptsRunnable, false);
    assert.equal(verification.consumes.packageWorkspaceWiring.wiringVersion, "P25.30");
    assert.equal(verification.consumes.packageWorkspaceWiring.workspaceRegistered, false);
    assert.equal(verification.consumes.packageWorkspaceWiring.scriptsRunnable, false);
    assert.equal(verification.consumes.packageFileTemplates.templateVersion, "P25.29");
    assert.equal(verification.consumes.packageFileTemplates.fileMaterialization, false);
    assert.ok(verification.verificationCommands.some((entry) => entry.command === "pnpm --filter @penpot/renderer-service build" && entry.runnable === false));
    assert.ok(verification.verificationCommands.some((entry) => entry.command.includes("tsc --noEmit") && entry.emitsFiles === false));
    assert.ok(verification.expectedArtifacts.every((entry) => entry.producedNow === false && entry.requiredAfterBuild === true));
    assert.equal(verification.verificationReadiness.status, "blocked");
    assert.equal(verification.verificationReadiness.canRunVerification, false);
    assert.ok(verification.verificationReadiness.blockers.includes("pnpm-workspace-entry"));
    assert.ok(verification.noOpGuarantees.includes("do not run renderer-service build commands"));
    assert.ok(verification.requiredBeforeRuntimeDispatch.includes("prove build, type-check, and test commands pass before making renderer-service scripts runnable"));
});

test("render.thumbnail renderer-service package materialization checklist stays metadata-only", () => {
    const checklist = createRenderThumbnailRendererServicePackageMaterializationChecklist({
        packageFileTemplates: {
            status: "planned-disabled",
            templateVersion: "P25.29",
            fileMaterialization: false,
        },
        packageWorkspaceWiring: {
            status: "planned-disabled",
            wiringVersion: "P25.30",
            workspaceMutation: false,
        },
        packageBuildVerification: {
            status: "planned-disabled",
            verificationVersion: "P25.31",
            commandExecution: false,
            buildOutput: false,
        },
    });

    assert.equal(checklist.status, "planned-disabled");
    assert.equal(checklist.checklistVersion, "P25.32");
    assert.equal(checklist.adapter, "renderer-service");
    assert.equal(checklist.command, "render.thumbnail");
    assert.equal(checklist.dispatch, false);
    assert.equal(checklist.networkDispatch, false);
    assert.equal(checklist.runtimeRegistration, false);
    assert.equal(checklist.localFileWrites, false);
    assert.equal(checklist.hostStartup, false);
    assert.equal(checklist.processSpawn, false);
    assert.equal(checklist.packageCreated, false);
    assert.equal(checklist.workspaceMutation, false);
    assert.equal(checklist.scriptRunnable, false);
    assert.equal(checklist.fileMaterialization, false);
    assert.equal(checklist.lockfileMutation, false);
    assert.equal(checklist.rootPackageJsonMutation, false);
    assert.equal(checklist.pnpmWorkspaceMutation, false);
    assert.equal(checklist.commandExecution, false);
    assert.equal(checklist.buildOutput, false);
    assert.equal(checklist.packageScriptsRunnable, false);
    assert.equal(checklist.materializationApproved, false);
    assert.equal(checklist.consumes.packageFileTemplates.templateVersion, "P25.29");
    assert.equal(checklist.consumes.packageWorkspaceWiring.wiringVersion, "P25.30");
    assert.equal(checklist.consumes.packageBuildVerification.verificationVersion, "P25.31");
    assert.ok(checklist.materializationBatches.some((entry) => entry.id === "package-files" && entry.files.includes("renderer-service/package.json") && entry.materializeNow === false));
    assert.ok(checklist.materializationBatches.some((entry) => entry.id === "verification-output" && entry.generatedOnlyAfterBuild === true && entry.materializeNow === false));
    assert.ok(checklist.readinessChecklist.some((entry) => entry.id === "runtime-dispatch-stays-disabled" && entry.satisfied === false));
    assert.equal(checklist.commitBoundary.includeRuntimeDispatch, false);
    assert.equal(checklist.commitBoundary.materializeNow, false);
    assert.ok(checklist.rollbackPlan.revertWorkspaceFiles.includes("pnpm-lock.yaml"));
    assert.equal(checklist.rollbackPlan.revertRuntimeRegistration, false);
    assert.ok(checklist.noOpGuarantees.includes("do not create renderer-service directory"));
    assert.ok(checklist.requiredBeforeRuntimeDispatch.includes("materialize package files and workspace wiring in a separate implementation task"));
});

test("render.thumbnail renderer-service package creation dry-run summary stays metadata-only", () => {
    const summary = createRenderThumbnailRendererServicePackageCreationDryRunSummary({
        packageMaterializationChecklist: {
            status: "planned-disabled",
            checklistVersion: "P25.32",
            materializationApproved: false,
        },
        packageFileTemplates: {
            status: "planned-disabled",
            templateVersion: "P25.29",
            fileMaterialization: false,
        },
        packageWorkspaceWiring: {
            status: "planned-disabled",
            wiringVersion: "P25.30",
            workspaceMutation: false,
        },
        packageBuildVerification: {
            status: "planned-disabled",
            verificationVersion: "P25.31",
            commandExecution: false,
        },
    });

    assert.equal(summary.status, "planned-disabled");
    assert.equal(summary.summaryVersion, "P25.33");
    assert.equal(summary.dryRunOnly, true);
    assert.equal(summary.adapter, "renderer-service");
    assert.equal(summary.command, "render.thumbnail");
    assert.equal(summary.dispatch, false);
    assert.equal(summary.networkDispatch, false);
    assert.equal(summary.runtimeRegistration, false);
    assert.equal(summary.localFileWrites, false);
    assert.equal(summary.hostStartup, false);
    assert.equal(summary.processSpawn, false);
    assert.equal(summary.packageCreated, false);
    assert.equal(summary.workspaceMutation, false);
    assert.equal(summary.scriptRunnable, false);
    assert.equal(summary.fileMaterialization, false);
    assert.equal(summary.lockfileMutation, false);
    assert.equal(summary.rootPackageJsonMutation, false);
    assert.equal(summary.pnpmWorkspaceMutation, false);
    assert.equal(summary.commandExecution, false);
    assert.equal(summary.buildOutput, false);
    assert.equal(summary.packageScriptsRunnable, false);
    assert.equal(summary.materializationApproved, false);
    assert.equal(summary.filesWritten, false);
    assert.equal(summary.consumes.packageMaterializationChecklist.checklistVersion, "P25.32");
    assert.equal(summary.consumes.packageMaterializationChecklist.materializationApproved, false);
    assert.equal(summary.summary.packageName, "@penpot/renderer-service");
    assert.equal(summary.summary.packageDirectory, "renderer-service");
    assert.ok(summary.summary.wouldCreateFiles.includes("renderer-service/src/noop-host.ts"));
    assert.ok(summary.summary.wouldModifyFiles.includes("pnpm-workspace.yaml"));
    assert.ok(summary.summary.wouldGenerateFilesAfterBuild.includes("renderer-service/dist/noop-host.js"));
    assert.ok(summary.summary.wouldRunCommands.includes("pnpm --filter @penpot/renderer-service build"));
    assert.ok(summary.sections.every((entry) => entry.dryRunOnly === true));
    assert.ok(summary.blockedUntil.includes("explicit package materialization implementation task"));
    assert.ok(summary.noOpGuarantees.includes("dry-run summary does not write package files"));
    assert.ok(summary.requiredBeforeRuntimeDispatch.includes("create package files in a later explicit implementation task"));
});

test("render.thumbnail renderer-service package creation file manifest stays metadata-only", () => {
    const manifest = createRenderThumbnailRendererServicePackageCreationFileManifest({
        packageCreationDryRunSummary: {
            status: "planned-disabled",
            summaryVersion: "P25.33",
            dryRunOnly: true,
            filesWritten: false,
        },
        packageFileTemplates: {
            status: "planned-disabled",
            templateVersion: "P25.29",
            fileMaterialization: false,
        },
        packageWorkspaceWiring: {
            status: "planned-disabled",
            wiringVersion: "P25.30",
            workspaceMutation: false,
        },
        packageBuildVerification: {
            status: "planned-disabled",
            verificationVersion: "P25.31",
            commandExecution: false,
            buildOutput: false,
        },
    });

    assert.equal(manifest.status, "planned-disabled");
    assert.equal(manifest.manifestVersion, "P25.34");
    assert.equal(manifest.dryRunOnly, true);
    assert.equal(manifest.adapter, "renderer-service");
    assert.equal(manifest.command, "render.thumbnail");
    assert.equal(manifest.dispatch, false);
    assert.equal(manifest.networkDispatch, false);
    assert.equal(manifest.runtimeRegistration, false);
    assert.equal(manifest.localFileWrites, false);
    assert.equal(manifest.hostStartup, false);
    assert.equal(manifest.processSpawn, false);
    assert.equal(manifest.packageCreated, false);
    assert.equal(manifest.workspaceMutation, false);
    assert.equal(manifest.scriptRunnable, false);
    assert.equal(manifest.fileMaterialization, false);
    assert.equal(manifest.lockfileMutation, false);
    assert.equal(manifest.rootPackageJsonMutation, false);
    assert.equal(manifest.pnpmWorkspaceMutation, false);
    assert.equal(manifest.commandExecution, false);
    assert.equal(manifest.buildOutput, false);
    assert.equal(manifest.packageScriptsRunnable, false);
    assert.equal(manifest.materializationApproved, false);
    assert.equal(manifest.filesWritten, false);
    assert.equal(manifest.consumes.packageCreationDryRunSummary.summaryVersion, "P25.33");
    assert.equal(manifest.consumes.packageCreationDryRunSummary.filesWritten, false);
    assert.equal(manifest.packageDirectory.path, "renderer-service");
    assert.equal(manifest.packageDirectory.createNow, false);
    assert.ok(manifest.files.some((entry) => entry.id === "entrypoint" && entry.path === "renderer-service/src/index.ts" && entry.runtimeRegistration === false));
    assert.ok(manifest.files.some((entry) => entry.id === "noop-host-test" && entry.processSpawn === false));
    assert.ok(manifest.generatedFiles.some((entry) => entry.path === "renderer-service/dist/noop-host.d.ts" && entry.generateNow === false));
    assert.ok(manifest.workspaceFiles.every((entry) => entry.mutateNow === false));
    assert.ok(manifest.manifestReadiness.blockers.includes("explicit file materialization task"));
    assert.ok(manifest.noOpGuarantees.includes("file manifest does not write renderer-service files"));
    assert.ok(manifest.requiredBeforeRuntimeDispatch.includes("materialize files in a later explicit implementation task"));
});

test("render.thumbnail renderer-service package materialization approval gate stays metadata-only", () => {
    const gate = createRenderThumbnailRendererServicePackageMaterializationApprovalGate({
        packageMaterializationChecklist: {
            status: "planned-disabled",
            checklistVersion: "P25.32",
            materializationApproved: false,
        },
        packageCreationFileManifest: {
            status: "planned-disabled",
            manifestVersion: "P25.34",
            filesWritten: false,
        },
        packageWorkspaceWiring: {
            status: "planned-disabled",
            wiringVersion: "P25.30",
            workspaceMutation: false,
        },
        packageBuildVerification: {
            status: "planned-disabled",
            verificationVersion: "P25.31",
            commandExecution: false,
            buildOutput: false,
        },
    });

    assert.equal(gate.status, "planned-disabled");
    assert.equal(gate.gateVersion, "P25.35");
    assert.equal(gate.dryRunOnly, true);
    assert.equal(gate.approvalRequired, true);
    assert.equal(gate.approved, false);
    assert.equal(gate.adapter, "renderer-service");
    assert.equal(gate.command, "render.thumbnail");
    assert.equal(gate.dispatch, false);
    assert.equal(gate.networkDispatch, false);
    assert.equal(gate.runtimeRegistration, false);
    assert.equal(gate.localFileWrites, false);
    assert.equal(gate.hostStartup, false);
    assert.equal(gate.processSpawn, false);
    assert.equal(gate.packageCreated, false);
    assert.equal(gate.workspaceMutation, false);
    assert.equal(gate.scriptRunnable, false);
    assert.equal(gate.fileMaterialization, false);
    assert.equal(gate.lockfileMutation, false);
    assert.equal(gate.rootPackageJsonMutation, false);
    assert.equal(gate.pnpmWorkspaceMutation, false);
    assert.equal(gate.commandExecution, false);
    assert.equal(gate.buildOutput, false);
    assert.equal(gate.packageScriptsRunnable, false);
    assert.equal(gate.materializationApproved, false);
    assert.equal(gate.filesWritten, false);
    assert.equal(gate.consumes.packageMaterializationChecklist.checklistVersion, "P25.32");
    assert.equal(gate.consumes.packageCreationFileManifest.manifestVersion, "P25.34");
    assert.equal(gate.consumes.packageCreationFileManifest.filesWritten, false);
    assert.ok(gate.approvalInputs.every((entry) => entry.required === true && entry.satisfied === false));
    assert.ok(gate.approvalScope.packageFiles.includes("renderer-service/package.json"));
    assert.ok(gate.approvalScope.workspaceFiles.includes("pnpm-lock.yaml"));
    assert.equal(gate.approvalScope.runtimeDispatchIncluded, false);
    assert.equal(gate.approvalDecision.status, "blocked");
    assert.equal(gate.approvalDecision.canMaterialize, false);
    assert.equal(gate.approvalDecision.canMutateWorkspace, false);
    assert.equal(gate.approvalDecision.canRunVerification, false);
    assert.ok(gate.postApprovalSequence.every((entry) => entry.allowedBeforeApproval === false));
    assert.ok(gate.noOpGuarantees.includes("approval gate does not grant approval"));
    assert.ok(gate.noOpGuarantees.includes("approval gate does not write package files"));
    assert.ok(gate.requiredBeforeRuntimeDispatch.includes("obtain explicit materialization approval in a later task"));
});

test("render.thumbnail renderer-service package materialization execution dry-run stays metadata-only", () => {
    const dryRun = createRenderThumbnailRendererServicePackageMaterializationExecutionDryRun({
        packageMaterializationApprovalGate: {
            status: "planned-disabled",
            gateVersion: "P25.35",
            approved: false,
        },
        packageCreationFileManifest: {
            status: "planned-disabled",
            manifestVersion: "P25.34",
            filesWritten: false,
        },
        packageWorkspaceWiring: {
            status: "planned-disabled",
            wiringVersion: "P25.30",
            workspaceMutation: false,
        },
        packageBuildVerification: {
            status: "planned-disabled",
            verificationVersion: "P25.31",
            commandExecution: false,
            buildOutput: false,
        },
    });

    assert.equal(dryRun.status, "planned-disabled");
    assert.equal(dryRun.dryRunVersion, "P25.36");
    assert.equal(dryRun.dryRunOnly, true);
    assert.equal(dryRun.executeNow, false);
    assert.equal(dryRun.approvalRequired, true);
    assert.equal(dryRun.approved, false);
    assert.equal(dryRun.adapter, "renderer-service");
    assert.equal(dryRun.command, "render.thumbnail");
    assert.equal(dryRun.dispatch, false);
    assert.equal(dryRun.networkDispatch, false);
    assert.equal(dryRun.runtimeRegistration, false);
    assert.equal(dryRun.localFileWrites, false);
    assert.equal(dryRun.hostStartup, false);
    assert.equal(dryRun.processSpawn, false);
    assert.equal(dryRun.packageCreated, false);
    assert.equal(dryRun.workspaceMutation, false);
    assert.equal(dryRun.scriptRunnable, false);
    assert.equal(dryRun.fileMaterialization, false);
    assert.equal(dryRun.lockfileMutation, false);
    assert.equal(dryRun.rootPackageJsonMutation, false);
    assert.equal(dryRun.pnpmWorkspaceMutation, false);
    assert.equal(dryRun.commandExecution, false);
    assert.equal(dryRun.buildOutput, false);
    assert.equal(dryRun.packageScriptsRunnable, false);
    assert.equal(dryRun.materializationApproved, false);
    assert.equal(dryRun.filesWritten, false);
    assert.equal(dryRun.consumes.packageMaterializationApprovalGate.gateVersion, "P25.35");
    assert.equal(dryRun.consumes.packageMaterializationApprovalGate.approved, false);
    assert.equal(dryRun.dryRunPlan.packageDirectory, "renderer-service");
    assert.equal(dryRun.dryRunPlan.executeNow, false);
    assert.equal(dryRun.dryRunPlan.approvalStatus, "blocked");
    assert.ok(dryRun.dryRunPlan.steps.some((entry) => entry.id === "create-package-directory" && entry.createsDirectory === true && entry.executed === false));
    assert.ok(dryRun.dryRunPlan.steps.some((entry) => entry.id === "update-workspace-files" && entry.files.includes("pnpm-lock.yaml") && entry.executed === false));
    assert.ok(dryRun.blockedBecause.includes("materialization approval is not granted"));
    assert.equal(dryRun.executionOutputs.packageDirectoryCreated, false);
    assert.equal(dryRun.executionOutputs.packageFilesWritten, false);
    assert.equal(dryRun.executionOutputs.workspaceFilesMutated, false);
    assert.equal(dryRun.executionOutputs.commandsRun, false);
    assert.ok(dryRun.noOpGuarantees.includes("execution dry-run does not write package files"));
    assert.ok(dryRun.requiredBeforeRuntimeDispatch.includes("obtain explicit approval before running materialization"));
});

test("render.thumbnail renderer-service package materialization write contract stays metadata-only", () => {
    const contract = createRenderThumbnailRendererServicePackageMaterializationWriteContract({
        packageMaterializationExecutionDryRun: {
            status: "planned-disabled",
            dryRunVersion: "P25.36",
            executeNow: false,
            filesWritten: false,
        },
        packageMaterializationApprovalGate: {
            status: "planned-disabled",
            gateVersion: "P25.35",
            approved: false,
        },
        packageCreationFileManifest: {
            status: "planned-disabled",
            manifestVersion: "P25.34",
            filesWritten: false,
        },
        packageWorkspaceWiring: {
            status: "planned-disabled",
            wiringVersion: "P25.30",
            workspaceMutation: false,
        },
    });

    assert.equal(contract.status, "planned-disabled");
    assert.equal(contract.contractVersion, "P25.37");
    assert.equal(contract.dryRunOnly, true);
    assert.equal(contract.approvalRequired, true);
    assert.equal(contract.approved, false);
    assert.equal(contract.executeNow, false);
    assert.equal(contract.adapter, "renderer-service");
    assert.equal(contract.command, "render.thumbnail");
    assert.equal(contract.dispatch, false);
    assert.equal(contract.networkDispatch, false);
    assert.equal(contract.runtimeRegistration, false);
    assert.equal(contract.localFileWrites, false);
    assert.equal(contract.hostStartup, false);
    assert.equal(contract.processSpawn, false);
    assert.equal(contract.packageCreated, false);
    assert.equal(contract.workspaceMutation, false);
    assert.equal(contract.scriptRunnable, false);
    assert.equal(contract.fileMaterialization, false);
    assert.equal(contract.lockfileMutation, false);
    assert.equal(contract.rootPackageJsonMutation, false);
    assert.equal(contract.pnpmWorkspaceMutation, false);
    assert.equal(contract.commandExecution, false);
    assert.equal(contract.buildOutput, false);
    assert.equal(contract.packageScriptsRunnable, false);
    assert.equal(contract.materializationApproved, false);
    assert.equal(contract.materializationApprovedRequired, true);
    assert.equal(contract.materializationApprovedNow, false);
    assert.equal(contract.filesWritten, false);
    assert.equal(contract.consumes.packageMaterializationExecutionDryRun.dryRunVersion, "P25.36");
    assert.equal(contract.consumes.packageMaterializationApprovalGate.gateVersion, "P25.35");
    assert.equal(contract.consumes.packageCreationFileManifest.manifestVersion, "P25.34");
    assert.equal(contract.consumes.packageWorkspaceWiring.wiringVersion, "P25.30");
    assert.equal(contract.writeContract.packageDirectory.path, "renderer-service");
    assert.equal(contract.writeContract.packageDirectory.writeNow, false);
    assert.ok(contract.writeContract.packageFiles.some((entry) => entry.path === "renderer-service/package.json" && entry.writeMode === "create" && entry.writeNow === false));
    assert.ok(contract.writeContract.workspaceFiles.some((entry) => entry.path === "pnpm-lock.yaml" && entry.writeMode === "refresh" && entry.writeNow === false));
    assert.ok(contract.writeContract.generatedFilesExcludedUntilBuild.includes("renderer-service/dist/index.js"));
    assert.equal(contract.integrityPlan.hashBeforeWrite, true);
    assert.equal(contract.integrityPlan.hashAfterWrite, true);
    assert.equal(contract.integrityPlan.atomicWrites, true);
    assert.equal(contract.integrityPlan.writeNow, false);
    assert.equal(contract.rollbackContract.writeNow, false);
    assert.equal(contract.rollbackContract.rollbackNow, false);
    assert.equal(contract.rollbackContract.failureLeavesRuntimeDispatchDisabled, true);
    assert.ok(contract.noOpGuarantees.includes("write contract does not write package files"));
    assert.ok(contract.requiredBeforeRuntimeDispatch.includes("execute write contract only after approval gate is satisfied"));
});

test("render.thumbnail renderer-service package materialization rollback contract stays metadata-only", () => {
    const contract = createRenderThumbnailRendererServicePackageMaterializationRollbackContract({
        packageMaterializationWriteContract: {
            status: "planned-disabled",
            contractVersion: "P25.37",
            writeNow: false,
            filesWritten: false,
        },
        packageMaterializationExecutionDryRun: {
            status: "planned-disabled",
            dryRunVersion: "P25.36",
            executeNow: false,
        },
        packageMaterializationApprovalGate: {
            status: "planned-disabled",
            gateVersion: "P25.35",
            approved: false,
        },
    });

    assert.equal(contract.status, "planned-disabled");
    assert.equal(contract.contractVersion, "P25.38");
    assert.equal(contract.dryRunOnly, true);
    assert.equal(contract.approvalRequired, true);
    assert.equal(contract.approved, false);
    assert.equal(contract.executeNow, false);
    assert.equal(contract.rollbackNow, false);
    assert.equal(contract.adapter, "renderer-service");
    assert.equal(contract.command, "render.thumbnail");
    assert.equal(contract.dispatch, false);
    assert.equal(contract.networkDispatch, false);
    assert.equal(contract.runtimeRegistration, false);
    assert.equal(contract.localFileWrites, false);
    assert.equal(contract.hostStartup, false);
    assert.equal(contract.processSpawn, false);
    assert.equal(contract.packageCreated, false);
    assert.equal(contract.workspaceMutation, false);
    assert.equal(contract.scriptRunnable, false);
    assert.equal(contract.fileMaterialization, false);
    assert.equal(contract.lockfileMutation, false);
    assert.equal(contract.rootPackageJsonMutation, false);
    assert.equal(contract.pnpmWorkspaceMutation, false);
    assert.equal(contract.commandExecution, false);
    assert.equal(contract.buildOutput, false);
    assert.equal(contract.packageScriptsRunnable, false);
    assert.equal(contract.materializationApproved, false);
    assert.equal(contract.materializationApprovedRequired, true);
    assert.equal(contract.materializationApprovedNow, false);
    assert.equal(contract.filesWritten, false);
    assert.equal(contract.rollbackExecuted, false);
    assert.equal(contract.consumes.packageMaterializationWriteContract.contractVersion, "P25.37");
    assert.equal(contract.consumes.packageMaterializationExecutionDryRun.dryRunVersion, "P25.36");
    assert.equal(contract.consumes.packageMaterializationApprovalGate.gateVersion, "P25.35");
    assert.equal(contract.snapshotPlan.snapshotNow, false);
    assert.equal(contract.snapshotPlan.hashBeforeWrite, true);
    assert.ok(contract.snapshotPlan.workspaceFiles.includes("pnpm-lock.yaml"));
    assert.equal(contract.rollbackPlan.status, "blocked");
    assert.equal(contract.rollbackPlan.rollbackNow, false);
    assert.ok(contract.rollbackPlan.phases.some((entry) => entry.id === "restore-workspace-files" && entry.executesNow === false && entry.files.includes("pnpm-lock.yaml")));
    assert.ok(contract.rollbackPlan.phases.some((entry) => entry.id === "verify-rollback" && entry.commandsRun === false));
    assert.equal(contract.failureRecovery.rollbackNow, false);
    assert.equal(contract.failureRecovery.manualReviewRequiredAfterFailure, true);
    assert.equal(contract.failureRecovery.runtimeDispatchRemainsDisabled, true);
    assert.equal(contract.verificationPlan.verifyNow, false);
    assert.equal(contract.verificationPlan.commandsRun, false);
    assert.ok(contract.noOpGuarantees.includes("rollback contract does not restore workspace manifests"));
    assert.ok(contract.requiredBeforeRuntimeDispatch.includes("capture rollback snapshots before any approved materialization"));
});

test("render.thumbnail renderer-service package materialization verification manifest stays metadata-only", () => {
    const manifest = createRenderThumbnailRendererServicePackageMaterializationVerificationManifest({
        packageMaterializationRollbackContract: {
            status: "planned-disabled",
            contractVersion: "P25.38",
            rollbackNow: false,
        },
        packageMaterializationWriteContract: {
            status: "planned-disabled",
            contractVersion: "P25.37",
            filesWritten: false,
        },
        packageBuildVerification: {
            status: "planned-disabled",
            verificationVersion: "P25.31",
            commandExecution: false,
            buildOutput: false,
        },
        packageCreationFileManifest: {
            status: "planned-disabled",
            manifestVersion: "P25.34",
            filesWritten: false,
        },
    });

    assert.equal(manifest.status, "planned-disabled");
    assert.equal(manifest.manifestVersion, "P25.39");
    assert.equal(manifest.dryRunOnly, true);
    assert.equal(manifest.approvalRequired, true);
    assert.equal(manifest.approved, false);
    assert.equal(manifest.executeNow, false);
    assert.equal(manifest.verifyNow, false);
    assert.equal(manifest.rollbackNow, false);
    assert.equal(manifest.adapter, "renderer-service");
    assert.equal(manifest.command, "render.thumbnail");
    assert.equal(manifest.dispatch, false);
    assert.equal(manifest.networkDispatch, false);
    assert.equal(manifest.runtimeRegistration, false);
    assert.equal(manifest.localFileWrites, false);
    assert.equal(manifest.hostStartup, false);
    assert.equal(manifest.processSpawn, false);
    assert.equal(manifest.packageCreated, false);
    assert.equal(manifest.workspaceMutation, false);
    assert.equal(manifest.scriptRunnable, false);
    assert.equal(manifest.fileMaterialization, false);
    assert.equal(manifest.lockfileMutation, false);
    assert.equal(manifest.rootPackageJsonMutation, false);
    assert.equal(manifest.pnpmWorkspaceMutation, false);
    assert.equal(manifest.commandExecution, false);
    assert.equal(manifest.buildOutput, false);
    assert.equal(manifest.packageScriptsRunnable, false);
    assert.equal(manifest.materializationApproved, false);
    assert.equal(manifest.filesWritten, false);
    assert.equal(manifest.rollbackExecuted, false);
    assert.equal(manifest.verificationExecuted, false);
    assert.equal(manifest.consumes.packageMaterializationRollbackContract.contractVersion, "P25.38");
    assert.equal(manifest.consumes.packageMaterializationWriteContract.contractVersion, "P25.37");
    assert.equal(manifest.consumes.packageBuildVerification.verificationVersion, "P25.31");
    assert.equal(manifest.verificationManifest.status, "blocked");
    assert.equal(manifest.verificationManifest.verifyNow, false);
    assert.equal(manifest.verificationManifest.packageDirectory.path, "renderer-service");
    assert.ok(manifest.verificationManifest.packageFiles.some((entry) => entry.path === "renderer-service/src/noop-host.ts" && entry.verifyNow === false));
    assert.ok(manifest.verificationManifest.workspaceFiles.some((entry) => entry.path === "pnpm-lock.yaml" && entry.verifyNow === false));
    assert.ok(manifest.verificationManifest.generatedOutputs.some((entry) => entry.path === "renderer-service/dist/index.js" && entry.verifyNow === false));
    assert.equal(manifest.commandManifest.commandsRun, false);
    assert.ok(manifest.commandManifest.commands.some((entry) => entry.id === "test" && entry.runsNow === false));
    assert.equal(manifest.runtimeDisabledAssertions.dispatch, false);
    assert.equal(manifest.runtimeDisabledAssertions.rendererServiceUnavailableUntilRegistration, true);
    assert.equal(manifest.readinessDecision.canVerifyMaterialization, false);
    assert.equal(manifest.readinessDecision.canEnableRuntimeDispatch, false);
    assert.ok(manifest.noOpGuarantees.includes("verification manifest does not run verification commands"));
    assert.ok(manifest.requiredBeforeRuntimeDispatch.includes("run verification commands only after approved materialization"));
});

test("render.thumbnail renderer-service package materialization final approval checklist stays metadata-only", () => {
    const checklist = createRenderThumbnailRendererServicePackageMaterializationFinalApprovalChecklist({
        packageMaterializationVerificationManifest: {
            status: "planned-disabled",
            manifestVersion: "P25.39",
            verifyNow: false,
        },
        packageMaterializationRollbackContract: {
            status: "planned-disabled",
            contractVersion: "P25.38",
            rollbackNow: false,
        },
        packageMaterializationWriteContract: {
            status: "planned-disabled",
            contractVersion: "P25.37",
            filesWritten: false,
        },
        packageMaterializationApprovalGate: {
            status: "planned-disabled",
            gateVersion: "P25.35",
            approved: false,
        },
    });

    assert.equal(checklist.status, "planned-disabled");
    assert.equal(checklist.checklistVersion, "P25.40");
    assert.equal(checklist.dryRunOnly, true);
    assert.equal(checklist.approvalRequired, true);
    assert.equal(checklist.approved, false);
    assert.equal(checklist.finalApprovalGranted, false);
    assert.equal(checklist.executeNow, false);
    assert.equal(checklist.verifyNow, false);
    assert.equal(checklist.rollbackNow, false);
    assert.equal(checklist.adapter, "renderer-service");
    assert.equal(checklist.command, "render.thumbnail");
    assert.equal(checklist.dispatch, false);
    assert.equal(checklist.networkDispatch, false);
    assert.equal(checklist.runtimeRegistration, false);
    assert.equal(checklist.localFileWrites, false);
    assert.equal(checklist.hostStartup, false);
    assert.equal(checklist.processSpawn, false);
    assert.equal(checklist.packageCreated, false);
    assert.equal(checklist.workspaceMutation, false);
    assert.equal(checklist.scriptRunnable, false);
    assert.equal(checklist.fileMaterialization, false);
    assert.equal(checklist.lockfileMutation, false);
    assert.equal(checklist.rootPackageJsonMutation, false);
    assert.equal(checklist.pnpmWorkspaceMutation, false);
    assert.equal(checklist.commandExecution, false);
    assert.equal(checklist.buildOutput, false);
    assert.equal(checklist.packageScriptsRunnable, false);
    assert.equal(checklist.materializationApproved, false);
    assert.equal(checklist.filesWritten, false);
    assert.equal(checklist.rollbackExecuted, false);
    assert.equal(checklist.verificationExecuted, false);
    assert.equal(checklist.consumes.packageMaterializationVerificationManifest.manifestVersion, "P25.39");
    assert.equal(checklist.consumes.packageMaterializationRollbackContract.contractVersion, "P25.38");
    assert.equal(checklist.consumes.packageMaterializationWriteContract.contractVersion, "P25.37");
    assert.equal(checklist.consumes.packageMaterializationApprovalGate.gateVersion, "P25.35");
    assert.ok(checklist.checklist.some((entry) => entry.id === "explicit-user-approval" && entry.satisfied === false));
    assert.ok(checklist.checklist.some((entry) => entry.id === "verification-manifest-reviewed" && entry.satisfied === false));
    assert.ok(checklist.approvalScope.workspaceFiles.includes("pnpm-lock.yaml"));
    assert.equal(checklist.approvalScope.runtimeDispatchIncluded, false);
    assert.equal(checklist.approvalDecision.canGrantFinalApproval, false);
    assert.equal(checklist.approvalDecision.canMaterializeFiles, false);
    assert.equal(checklist.approvalDecision.canRunVerification, false);
    assert.ok(checklist.postApprovalSequence.some((entry) => entry.id === "materialize-package-files" && entry.writesFiles === true && entry.allowedBeforeFinalApproval === false));
    assert.ok(checklist.noOpGuarantees.includes("final approval checklist does not grant approval"));
    assert.ok(checklist.requiredBeforeRuntimeDispatch.includes("grant final materialization approval in a later explicit implementation task"));
});

test("render.thumbnail renderer-service package materialization explicit approval token stays metadata-only", () => {
    const token = createRenderThumbnailRendererServicePackageMaterializationExplicitApprovalToken({
        packageMaterializationFinalApprovalChecklist: {
            status: "planned-disabled",
            checklistVersion: "P25.40",
            finalApprovalGranted: false,
        },
        packageMaterializationApprovalGate: {
            status: "planned-disabled",
            gateVersion: "P25.35",
            approved: false,
        },
    });

    assert.equal(token.status, "planned-disabled");
    assert.equal(token.tokenVersion, "P25.41");
    assert.equal(token.dryRunOnly, true);
    assert.equal(token.approvalRequired, true);
    assert.equal(token.approved, false);
    assert.equal(token.finalApprovalGranted, false);
    assert.equal(token.tokenRequired, true);
    assert.equal(token.tokenProvided, false);
    assert.equal(token.tokenAccepted, false);
    assert.equal(token.tokenStored, false);
    assert.equal(token.tokenValidated, false);
    assert.equal(token.executeNow, false);
    assert.equal(token.verifyNow, false);
    assert.equal(token.rollbackNow, false);
    assert.equal(token.dispatch, false);
    assert.equal(token.networkDispatch, false);
    assert.equal(token.runtimeRegistration, false);
    assert.equal(token.localFileWrites, false);
    assert.equal(token.hostStartup, false);
    assert.equal(token.processSpawn, false);
    assert.equal(token.packageCreated, false);
    assert.equal(token.workspaceMutation, false);
    assert.equal(token.scriptRunnable, false);
    assert.equal(token.fileMaterialization, false);
    assert.equal(token.lockfileMutation, false);
    assert.equal(token.rootPackageJsonMutation, false);
    assert.equal(token.pnpmWorkspaceMutation, false);
    assert.equal(token.commandExecution, false);
    assert.equal(token.buildOutput, false);
    assert.equal(token.packageScriptsRunnable, false);
    assert.equal(token.materializationApproved, false);
    assert.equal(token.filesWritten, false);
    assert.equal(token.rollbackExecuted, false);
    assert.equal(token.verificationExecuted, false);
    assert.equal(token.consumes.packageMaterializationFinalApprovalChecklist.checklistVersion, "P25.40");
    assert.equal(token.consumes.packageMaterializationFinalApprovalChecklist.finalApprovalGranted, false);
    assert.equal(token.consumes.packageMaterializationApprovalGate.gateVersion, "P25.35");
    assert.equal(token.consumes.packageMaterializationApprovalGate.approved, false);
    assert.equal(token.tokenContract.tokenType, "explicit-user-approval");
    assert.equal(token.tokenContract.format, "opaque-one-time-approval-token");
    assert.equal(token.tokenContract.acceptedNow, false);
    assert.equal(token.tokenContract.storedNow, false);
    assert.equal(token.tokenContract.expiryRequired, true);
    assert.equal(token.tokenContract.replayAllowed, false);
    assert.equal(token.tokenContract.tokenValueLogged, false);
    assert.ok(token.tokenContract.requiredScope.includes("post-materialization verification command execution"));
    assert.equal(token.validationPlan.validateNow, false);
    assert.equal(token.validationPlan.requiredChecklistItemsSatisfied, false);
    assert.equal(token.validationPlan.requireHumanIntent, true);
    assert.equal(token.validationPlan.requireWorkspaceMutationScope, true);
    assert.equal(token.validationPlan.requireRuntimeDispatchDisabled, true);
    assert.equal(token.auditPlan.writeAuditNow, false);
    assert.equal(token.auditPlan.includeScopeHash, true);
    assert.equal(token.auditPlan.tokenValueLogged, false);
    assert.equal(token.approvalDecision.canAcceptToken, false);
    assert.equal(token.approvalDecision.canGrantFinalApproval, false);
    assert.equal(token.approvalDecision.canMaterializeFiles, false);
    assert.equal(token.approvalDecision.canRunVerification, false);
    assert.ok(token.noOpGuarantees.includes("explicit approval token plan does not accept token input"));
    assert.ok(token.requiredBeforeRuntimeDispatch.includes("validate token scope, expiry, and one-time use before materialization"));
});

test("render.thumbnail renderer-service package materialization approval audit trail stays metadata-only", () => {
    const auditTrail = createRenderThumbnailRendererServicePackageMaterializationApprovalAuditTrail({
        packageMaterializationExplicitApprovalToken: {
            status: "planned-disabled",
            tokenVersion: "P25.41",
            tokenAccepted: false,
            tokenValidated: false,
        },
        packageMaterializationFinalApprovalChecklist: {
            status: "planned-disabled",
            checklistVersion: "P25.40",
            finalApprovalGranted: false,
        },
        packageMaterializationApprovalGate: {
            status: "planned-disabled",
            gateVersion: "P25.35",
            approved: false,
        },
    });

    assert.equal(auditTrail.status, "planned-disabled");
    assert.equal(auditTrail.auditTrailVersion, "P25.42");
    assert.equal(auditTrail.dryRunOnly, true);
    assert.equal(auditTrail.approvalRequired, true);
    assert.equal(auditTrail.approved, false);
    assert.equal(auditTrail.finalApprovalGranted, false);
    assert.equal(auditTrail.auditTrailRequired, true);
    assert.equal(auditTrail.auditRecordPlanned, true);
    assert.equal(auditTrail.auditRecordWritten, false);
    assert.equal(auditTrail.auditRecordPersisted, false);
    assert.equal(auditTrail.auditRecordValidated, false);
    assert.equal(auditTrail.auditRecordExported, false);
    assert.equal(auditTrail.writeAuditNow, false);
    assert.equal(auditTrail.tokenAccepted, false);
    assert.equal(auditTrail.tokenStored, false);
    assert.equal(auditTrail.tokenValidated, false);
    assert.equal(auditTrail.executeNow, false);
    assert.equal(auditTrail.verifyNow, false);
    assert.equal(auditTrail.rollbackNow, false);
    assert.equal(auditTrail.dispatch, false);
    assert.equal(auditTrail.networkDispatch, false);
    assert.equal(auditTrail.runtimeRegistration, false);
    assert.equal(auditTrail.localFileWrites, false);
    assert.equal(auditTrail.hostStartup, false);
    assert.equal(auditTrail.processSpawn, false);
    assert.equal(auditTrail.packageCreated, false);
    assert.equal(auditTrail.workspaceMutation, false);
    assert.equal(auditTrail.scriptRunnable, false);
    assert.equal(auditTrail.fileMaterialization, false);
    assert.equal(auditTrail.lockfileMutation, false);
    assert.equal(auditTrail.rootPackageJsonMutation, false);
    assert.equal(auditTrail.pnpmWorkspaceMutation, false);
    assert.equal(auditTrail.commandExecution, false);
    assert.equal(auditTrail.buildOutput, false);
    assert.equal(auditTrail.packageScriptsRunnable, false);
    assert.equal(auditTrail.materializationApproved, false);
    assert.equal(auditTrail.filesWritten, false);
    assert.equal(auditTrail.rollbackExecuted, false);
    assert.equal(auditTrail.verificationExecuted, false);
    assert.equal(auditTrail.consumes.packageMaterializationExplicitApprovalToken.tokenVersion, "P25.41");
    assert.equal(auditTrail.consumes.packageMaterializationExplicitApprovalToken.tokenAccepted, false);
    assert.equal(auditTrail.consumes.packageMaterializationFinalApprovalChecklist.checklistVersion, "P25.40");
    assert.equal(auditTrail.consumes.packageMaterializationApprovalGate.gateVersion, "P25.35");
    assert.equal(auditTrail.auditTrailContract.sink, "future-approval-audit-log");
    assert.equal(auditTrail.auditTrailContract.appendOnly, true);
    assert.equal(auditTrail.auditTrailContract.writeNow, false);
    assert.equal(auditTrail.auditTrailContract.persistNow, false);
    assert.equal(auditTrail.auditTrailContract.exportNow, false);
    assert.equal(auditTrail.auditTrailContract.tokenValueLogged, false);
    assert.ok(auditTrail.auditTrailContract.requiredFields.includes("decision"));
    assert.ok(auditTrail.auditEvents.some((entry) => entry.id === "approval-token-validated" && entry.written === false));
    assert.equal(auditTrail.retentionPlan.redactTokenValue, true);
    assert.equal(auditTrail.retentionPlan.enforceNow, false);
    assert.equal(auditTrail.approvalDecision.canWriteAuditRecord, false);
    assert.equal(auditTrail.approvalDecision.canPersistAuditRecord, false);
    assert.equal(auditTrail.approvalDecision.canAcceptToken, false);
    assert.equal(auditTrail.approvalDecision.canGrantFinalApproval, false);
    assert.equal(auditTrail.approvalDecision.canMaterializeFiles, false);
    assert.equal(auditTrail.approvalDecision.canRunVerification, false);
    assert.ok(auditTrail.noOpGuarantees.includes("approval audit trail plan does not write audit records"));
    assert.ok(auditTrail.requiredBeforeRuntimeDispatch.includes("write append-only audit record without logging token value"));
});

test("render.thumbnail renderer-service package materialization approval replay guard stays metadata-only", () => {
    const replayGuard = createRenderThumbnailRendererServicePackageMaterializationApprovalReplayGuard({
        packageMaterializationApprovalAuditTrail: {
            status: "planned-disabled",
            auditTrailVersion: "P25.42",
            auditRecordWritten: false,
        },
        packageMaterializationExplicitApprovalToken: {
            status: "planned-disabled",
            tokenVersion: "P25.41",
            tokenAccepted: false,
            tokenValidated: false,
        },
        packageMaterializationFinalApprovalChecklist: {
            status: "planned-disabled",
            checklistVersion: "P25.40",
            finalApprovalGranted: false,
        },
    });

    assert.equal(replayGuard.status, "planned-disabled");
    assert.equal(replayGuard.replayGuardVersion, "P25.43");
    assert.equal(replayGuard.dryRunOnly, true);
    assert.equal(replayGuard.approvalRequired, true);
    assert.equal(replayGuard.approved, false);
    assert.equal(replayGuard.finalApprovalGranted, false);
    assert.equal(replayGuard.replayGuardRequired, true);
    assert.equal(replayGuard.replayCheckPlanned, true);
    assert.equal(replayGuard.replayCheckExecuted, false);
    assert.equal(replayGuard.replayDetected, false);
    assert.equal(replayGuard.replayRejected, false);
    assert.equal(replayGuard.tokenAccepted, false);
    assert.equal(replayGuard.tokenStored, false);
    assert.equal(replayGuard.tokenValidated, false);
    assert.equal(replayGuard.tokenConsumed, false);
    assert.equal(replayGuard.tokenRevoked, false);
    assert.equal(replayGuard.nonceStored, false);
    assert.equal(replayGuard.scopeHashStored, false);
    assert.equal(replayGuard.executeNow, false);
    assert.equal(replayGuard.verifyNow, false);
    assert.equal(replayGuard.rollbackNow, false);
    assert.equal(replayGuard.dispatch, false);
    assert.equal(replayGuard.networkDispatch, false);
    assert.equal(replayGuard.runtimeRegistration, false);
    assert.equal(replayGuard.localFileWrites, false);
    assert.equal(replayGuard.hostStartup, false);
    assert.equal(replayGuard.processSpawn, false);
    assert.equal(replayGuard.packageCreated, false);
    assert.equal(replayGuard.workspaceMutation, false);
    assert.equal(replayGuard.scriptRunnable, false);
    assert.equal(replayGuard.fileMaterialization, false);
    assert.equal(replayGuard.lockfileMutation, false);
    assert.equal(replayGuard.rootPackageJsonMutation, false);
    assert.equal(replayGuard.pnpmWorkspaceMutation, false);
    assert.equal(replayGuard.commandExecution, false);
    assert.equal(replayGuard.buildOutput, false);
    assert.equal(replayGuard.packageScriptsRunnable, false);
    assert.equal(replayGuard.materializationApproved, false);
    assert.equal(replayGuard.filesWritten, false);
    assert.equal(replayGuard.rollbackExecuted, false);
    assert.equal(replayGuard.verificationExecuted, false);
    assert.equal(replayGuard.consumes.packageMaterializationApprovalAuditTrail.auditTrailVersion, "P25.42");
    assert.equal(replayGuard.consumes.packageMaterializationApprovalAuditTrail.auditRecordWritten, false);
    assert.equal(replayGuard.consumes.packageMaterializationExplicitApprovalToken.tokenVersion, "P25.41");
    assert.equal(replayGuard.consumes.packageMaterializationExplicitApprovalToken.tokenAccepted, false);
    assert.equal(replayGuard.consumes.packageMaterializationFinalApprovalChecklist.checklistVersion, "P25.40");
    assert.equal(replayGuard.replayGuardContract.strategy, "one-time-token-with-scope-hash-and-nonce");
    assert.equal(replayGuard.replayGuardContract.checkNow, false);
    assert.equal(replayGuard.replayGuardContract.storeNonceNow, false);
    assert.equal(replayGuard.replayGuardContract.storeScopeHashNow, false);
    assert.equal(replayGuard.replayGuardContract.consumeTokenNow, false);
    assert.equal(replayGuard.replayGuardContract.rejectReplayNow, false);
    assert.equal(replayGuard.replayGuardContract.tokenValueLogged, false);
    assert.ok(replayGuard.replayGuardContract.requiredInputs.includes("tokenNonce"));
    assert.ok(replayGuard.replayChecks.some((entry) => entry.id === "token-not-consumed" && entry.executed === false));
    assert.equal(replayGuard.replayDecision.canCheckReplay, false);
    assert.equal(replayGuard.replayDecision.canRejectReplay, false);
    assert.equal(replayGuard.replayDecision.canConsumeToken, false);
    assert.equal(replayGuard.replayDecision.canAcceptToken, false);
    assert.equal(replayGuard.replayDecision.canGrantFinalApproval, false);
    assert.equal(replayGuard.replayDecision.canMaterializeFiles, false);
    assert.ok(replayGuard.noOpGuarantees.includes("approval replay guard plan does not execute replay checks"));
    assert.ok(replayGuard.requiredBeforeRuntimeDispatch.includes("verify nonce and scope hash have not been consumed"));
});

test("render.thumbnail renderer-service package materialization approval expiry policy stays metadata-only", () => {
    const expiryPolicy = createRenderThumbnailRendererServicePackageMaterializationApprovalExpiryPolicy({
        packageMaterializationApprovalReplayGuard: {
            status: "planned-disabled",
            replayGuardVersion: "P25.43",
            replayCheckExecuted: false,
        },
        packageMaterializationExplicitApprovalToken: {
            status: "planned-disabled",
            tokenVersion: "P25.41",
            tokenValidated: false,
        },
        packageMaterializationApprovalAuditTrail: {
            status: "planned-disabled",
            auditTrailVersion: "P25.42",
            auditRecordWritten: false,
        },
    });

    assert.equal(expiryPolicy.status, "planned-disabled");
    assert.equal(expiryPolicy.expiryPolicyVersion, "P25.44");
    assert.equal(expiryPolicy.dryRunOnly, true);
    assert.equal(expiryPolicy.approvalRequired, true);
    assert.equal(expiryPolicy.approved, false);
    assert.equal(expiryPolicy.finalApprovalGranted, false);
    assert.equal(expiryPolicy.expiryPolicyRequired, true);
    assert.equal(expiryPolicy.expiryCheckPlanned, true);
    assert.equal(expiryPolicy.expiryCheckExecuted, false);
    assert.equal(expiryPolicy.tokenExpired, false);
    assert.equal(expiryPolicy.tokenNotBeforeChecked, false);
    assert.equal(expiryPolicy.tokenExpiresAtChecked, false);
    assert.equal(expiryPolicy.clockSkewChecked, false);
    assert.equal(expiryPolicy.tokenAccepted, false);
    assert.equal(expiryPolicy.tokenStored, false);
    assert.equal(expiryPolicy.tokenValidated, false);
    assert.equal(expiryPolicy.tokenConsumed, false);
    assert.equal(expiryPolicy.tokenRevoked, false);
    assert.equal(expiryPolicy.executeNow, false);
    assert.equal(expiryPolicy.verifyNow, false);
    assert.equal(expiryPolicy.rollbackNow, false);
    assert.equal(expiryPolicy.dispatch, false);
    assert.equal(expiryPolicy.networkDispatch, false);
    assert.equal(expiryPolicy.runtimeRegistration, false);
    assert.equal(expiryPolicy.localFileWrites, false);
    assert.equal(expiryPolicy.hostStartup, false);
    assert.equal(expiryPolicy.processSpawn, false);
    assert.equal(expiryPolicy.packageCreated, false);
    assert.equal(expiryPolicy.workspaceMutation, false);
    assert.equal(expiryPolicy.scriptRunnable, false);
    assert.equal(expiryPolicy.fileMaterialization, false);
    assert.equal(expiryPolicy.lockfileMutation, false);
    assert.equal(expiryPolicy.rootPackageJsonMutation, false);
    assert.equal(expiryPolicy.pnpmWorkspaceMutation, false);
    assert.equal(expiryPolicy.commandExecution, false);
    assert.equal(expiryPolicy.buildOutput, false);
    assert.equal(expiryPolicy.packageScriptsRunnable, false);
    assert.equal(expiryPolicy.materializationApproved, false);
    assert.equal(expiryPolicy.filesWritten, false);
    assert.equal(expiryPolicy.rollbackExecuted, false);
    assert.equal(expiryPolicy.verificationExecuted, false);
    assert.equal(expiryPolicy.consumes.packageMaterializationApprovalReplayGuard.replayGuardVersion, "P25.43");
    assert.equal(expiryPolicy.consumes.packageMaterializationApprovalReplayGuard.replayCheckExecuted, false);
    assert.equal(expiryPolicy.consumes.packageMaterializationExplicitApprovalToken.tokenVersion, "P25.41");
    assert.equal(expiryPolicy.consumes.packageMaterializationExplicitApprovalToken.tokenValidated, false);
    assert.equal(expiryPolicy.consumes.packageMaterializationApprovalAuditTrail.auditTrailVersion, "P25.42");
    assert.equal(expiryPolicy.expiryPolicy.policy, "short-lived-explicit-approval-token");
    assert.equal(expiryPolicy.expiryPolicy.checkNow, false);
    assert.equal(expiryPolicy.expiryPolicy.validateIssuedAtNow, false);
    assert.equal(expiryPolicy.expiryPolicy.validateNotBeforeNow, false);
    assert.equal(expiryPolicy.expiryPolicy.validateExpiresAtNow, false);
    assert.equal(expiryPolicy.expiryPolicy.validateClockSkewNow, false);
    assert.equal(expiryPolicy.expiryPolicy.maxAgeSeconds, 900);
    assert.equal(expiryPolicy.expiryPolicy.allowedClockSkewSeconds, 60);
    assert.equal(expiryPolicy.expiryPolicy.tokenValueLogged, false);
    assert.ok(expiryPolicy.expiryPolicy.requiredClaims.includes("issuedAt"));
    assert.ok(expiryPolicy.expiryChecks.some((entry) => entry.id === "clock-skew-within-policy" && entry.executed === false));
    assert.equal(expiryPolicy.expiryDecision.canCheckExpiry, false);
    assert.equal(expiryPolicy.expiryDecision.canAcceptToken, false);
    assert.equal(expiryPolicy.expiryDecision.canConsumeToken, false);
    assert.equal(expiryPolicy.expiryDecision.canGrantFinalApproval, false);
    assert.equal(expiryPolicy.expiryDecision.canMaterializeFiles, false);
    assert.ok(expiryPolicy.noOpGuarantees.includes("approval expiry policy plan does not execute expiry checks"));
    assert.ok(expiryPolicy.requiredBeforeRuntimeDispatch.includes("enforce max token age and clock skew policy"));
});

test("render.thumbnail renderer-service package materialization approval revocation policy stays metadata-only", () => {
    const revocationPolicy = createRenderThumbnailRendererServicePackageMaterializationApprovalRevocationPolicy({
        packageMaterializationApprovalExpiryPolicy: {
            status: "planned-disabled",
            expiryPolicyVersion: "P25.44",
            expiryCheckExecuted: false,
        },
        packageMaterializationApprovalReplayGuard: {
            status: "planned-disabled",
            replayGuardVersion: "P25.43",
            replayCheckExecuted: false,
        },
        packageMaterializationApprovalAuditTrail: {
            status: "planned-disabled",
            auditTrailVersion: "P25.42",
            auditRecordWritten: false,
        },
    });

    assert.equal(revocationPolicy.status, "planned-disabled");
    assert.equal(revocationPolicy.revocationPolicyVersion, "P25.45");
    assert.equal(revocationPolicy.dryRunOnly, true);
    assert.equal(revocationPolicy.approvalRequired, true);
    assert.equal(revocationPolicy.approved, false);
    assert.equal(revocationPolicy.finalApprovalGranted, false);
    assert.equal(revocationPolicy.revocationPolicyRequired, true);
    assert.equal(revocationPolicy.revocationCheckPlanned, true);
    assert.equal(revocationPolicy.revocationCheckExecuted, false);
    assert.equal(revocationPolicy.revocationRegistryConfigured, false);
    assert.equal(revocationPolicy.revocationRegistryFetched, false);
    assert.equal(revocationPolicy.revocationStatusFetched, false);
    assert.equal(revocationPolicy.revocationStatusTrusted, false);
    assert.equal(revocationPolicy.tokenRevocationChecked, false);
    assert.equal(revocationPolicy.tokenRevoked, false);
    assert.equal(revocationPolicy.revokedTokenRejected, false);
    assert.equal(revocationPolicy.tokenAccepted, false);
    assert.equal(revocationPolicy.tokenStored, false);
    assert.equal(revocationPolicy.tokenValidated, false);
    assert.equal(revocationPolicy.tokenConsumed, false);
    assert.equal(revocationPolicy.executeNow, false);
    assert.equal(revocationPolicy.verifyNow, false);
    assert.equal(revocationPolicy.rollbackNow, false);
    assert.equal(revocationPolicy.dispatch, false);
    assert.equal(revocationPolicy.networkDispatch, false);
    assert.equal(revocationPolicy.runtimeRegistration, false);
    assert.equal(revocationPolicy.localFileWrites, false);
    assert.equal(revocationPolicy.hostStartup, false);
    assert.equal(revocationPolicy.processSpawn, false);
    assert.equal(revocationPolicy.packageCreated, false);
    assert.equal(revocationPolicy.workspaceMutation, false);
    assert.equal(revocationPolicy.scriptRunnable, false);
    assert.equal(revocationPolicy.fileMaterialization, false);
    assert.equal(revocationPolicy.lockfileMutation, false);
    assert.equal(revocationPolicy.rootPackageJsonMutation, false);
    assert.equal(revocationPolicy.pnpmWorkspaceMutation, false);
    assert.equal(revocationPolicy.commandExecution, false);
    assert.equal(revocationPolicy.buildOutput, false);
    assert.equal(revocationPolicy.packageScriptsRunnable, false);
    assert.equal(revocationPolicy.materializationApproved, false);
    assert.equal(revocationPolicy.filesWritten, false);
    assert.equal(revocationPolicy.rollbackExecuted, false);
    assert.equal(revocationPolicy.verificationExecuted, false);
    assert.equal(revocationPolicy.consumes.packageMaterializationApprovalExpiryPolicy.expiryPolicyVersion, "P25.44");
    assert.equal(revocationPolicy.consumes.packageMaterializationApprovalExpiryPolicy.expiryCheckExecuted, false);
    assert.equal(revocationPolicy.consumes.packageMaterializationApprovalReplayGuard.replayGuardVersion, "P25.43");
    assert.equal(revocationPolicy.consumes.packageMaterializationApprovalReplayGuard.replayCheckExecuted, false);
    assert.equal(revocationPolicy.consumes.packageMaterializationApprovalAuditTrail.auditTrailVersion, "P25.42");
    assert.equal(revocationPolicy.consumes.packageMaterializationApprovalAuditTrail.auditRecordWritten, false);
    assert.equal(revocationPolicy.revocationPolicy.policy, "deny-revoked-explicit-approval-token");
    assert.equal(revocationPolicy.revocationPolicy.checkNow, false);
    assert.equal(revocationPolicy.revocationPolicy.fetchRegistryNow, false);
    assert.equal(revocationPolicy.revocationPolicy.validateRevocationEpochNow, false);
    assert.equal(revocationPolicy.revocationPolicy.persistRevocationStateNow, false);
    assert.equal(revocationPolicy.revocationPolicy.rejectRevokedTokenNow, false);
    assert.equal(revocationPolicy.revocationPolicy.tokenValueLogged, false);
    assert.ok(revocationPolicy.revocationPolicy.requiredInputs.includes("approvalScopeHash"));
    assert.ok(revocationPolicy.revocationPolicy.registrySources.includes("operator-revocation-list"));
    assert.ok(revocationPolicy.revocationChecks.some((entry) => entry.id === "revocation-registry-available" && entry.executed === false));
    assert.equal(revocationPolicy.revocationDecision.canCheckRevocation, false);
    assert.equal(revocationPolicy.revocationDecision.canRejectRevokedToken, false);
    assert.equal(revocationPolicy.revocationDecision.canAcceptToken, false);
    assert.equal(revocationPolicy.revocationDecision.canConsumeToken, false);
    assert.equal(revocationPolicy.revocationDecision.canGrantFinalApproval, false);
    assert.equal(revocationPolicy.revocationDecision.canMaterializeFiles, false);
    assert.ok(revocationPolicy.noOpGuarantees.includes("approval revocation policy plan does not execute revocation checks"));
    assert.ok(revocationPolicy.requiredBeforeRuntimeDispatch.includes("reject revoked tokens before replay guard consumption"));
});

test("render.thumbnail renderer-service package materialization approval scope binding policy stays metadata-only", () => {
    const scopeBindingPolicy = createRenderThumbnailRendererServicePackageMaterializationApprovalScopeBindingPolicy({
        packageMaterializationApprovalRevocationPolicy: {
            status: "planned-disabled",
            revocationPolicyVersion: "P25.45",
            revocationCheckExecuted: false,
        },
        packageMaterializationApprovalExpiryPolicy: {
            status: "planned-disabled",
            expiryPolicyVersion: "P25.44",
            expiryCheckExecuted: false,
        },
        packageMaterializationFinalApprovalChecklist: {
            status: "planned-disabled",
            checklistVersion: "P25.40",
            finalApprovalGranted: false,
        },
    });

    assert.equal(scopeBindingPolicy.status, "planned-disabled");
    assert.equal(scopeBindingPolicy.scopeBindingVersion, "P25.46");
    assert.equal(scopeBindingPolicy.dryRunOnly, true);
    assert.equal(scopeBindingPolicy.approvalRequired, true);
    assert.equal(scopeBindingPolicy.approved, false);
    assert.equal(scopeBindingPolicy.finalApprovalGranted, false);
    assert.equal(scopeBindingPolicy.scopeBindingRequired, true);
    assert.equal(scopeBindingPolicy.scopeBindingPlanned, true);
    assert.equal(scopeBindingPolicy.scopeBindingExecuted, false);
    assert.equal(scopeBindingPolicy.approvalScopeHashComputed, false);
    assert.equal(scopeBindingPolicy.approvalScopeHashValidated, false);
    assert.equal(scopeBindingPolicy.approvalScopeHashStored, false);
    assert.equal(scopeBindingPolicy.targetScopeBound, false);
    assert.equal(scopeBindingPolicy.commandScopeBound, false);
    assert.equal(scopeBindingPolicy.workspaceScopeBound, false);
    assert.equal(scopeBindingPolicy.packageScopeBound, false);
    assert.equal(scopeBindingPolicy.fileSnapshotRead, false);
    assert.equal(scopeBindingPolicy.workspaceHashComputed, false);
    assert.equal(scopeBindingPolicy.packageManifestHashComputed, false);
    assert.equal(scopeBindingPolicy.tokenScopeMatched, false);
    assert.equal(scopeBindingPolicy.tokenAccepted, false);
    assert.equal(scopeBindingPolicy.tokenStored, false);
    assert.equal(scopeBindingPolicy.tokenValidated, false);
    assert.equal(scopeBindingPolicy.tokenConsumed, false);
    assert.equal(scopeBindingPolicy.tokenRevoked, false);
    assert.equal(scopeBindingPolicy.executeNow, false);
    assert.equal(scopeBindingPolicy.verifyNow, false);
    assert.equal(scopeBindingPolicy.rollbackNow, false);
    assert.equal(scopeBindingPolicy.dispatch, false);
    assert.equal(scopeBindingPolicy.networkDispatch, false);
    assert.equal(scopeBindingPolicy.runtimeRegistration, false);
    assert.equal(scopeBindingPolicy.localFileWrites, false);
    assert.equal(scopeBindingPolicy.hostStartup, false);
    assert.equal(scopeBindingPolicy.processSpawn, false);
    assert.equal(scopeBindingPolicy.packageCreated, false);
    assert.equal(scopeBindingPolicy.workspaceMutation, false);
    assert.equal(scopeBindingPolicy.scriptRunnable, false);
    assert.equal(scopeBindingPolicy.fileMaterialization, false);
    assert.equal(scopeBindingPolicy.lockfileMutation, false);
    assert.equal(scopeBindingPolicy.rootPackageJsonMutation, false);
    assert.equal(scopeBindingPolicy.pnpmWorkspaceMutation, false);
    assert.equal(scopeBindingPolicy.commandExecution, false);
    assert.equal(scopeBindingPolicy.buildOutput, false);
    assert.equal(scopeBindingPolicy.packageScriptsRunnable, false);
    assert.equal(scopeBindingPolicy.materializationApproved, false);
    assert.equal(scopeBindingPolicy.filesWritten, false);
    assert.equal(scopeBindingPolicy.rollbackExecuted, false);
    assert.equal(scopeBindingPolicy.verificationExecuted, false);
    assert.equal(scopeBindingPolicy.consumes.packageMaterializationApprovalRevocationPolicy.revocationPolicyVersion, "P25.45");
    assert.equal(scopeBindingPolicy.consumes.packageMaterializationApprovalRevocationPolicy.revocationCheckExecuted, false);
    assert.equal(scopeBindingPolicy.consumes.packageMaterializationApprovalExpiryPolicy.expiryPolicyVersion, "P25.44");
    assert.equal(scopeBindingPolicy.consumes.packageMaterializationApprovalExpiryPolicy.expiryCheckExecuted, false);
    assert.equal(scopeBindingPolicy.consumes.packageMaterializationFinalApprovalChecklist.checklistVersion, "P25.40");
    assert.equal(scopeBindingPolicy.scopeBindingPolicy.policy, "bind-explicit-approval-token-to-renderer-package-scope");
    assert.equal(scopeBindingPolicy.scopeBindingPolicy.bindNow, false);
    assert.equal(scopeBindingPolicy.scopeBindingPolicy.computeApprovalScopeHashNow, false);
    assert.equal(scopeBindingPolicy.scopeBindingPolicy.validateApprovalScopeHashNow, false);
    assert.equal(scopeBindingPolicy.scopeBindingPolicy.readFileSnapshotNow, false);
    assert.equal(scopeBindingPolicy.scopeBindingPolicy.computeWorkspaceHashNow, false);
    assert.equal(scopeBindingPolicy.scopeBindingPolicy.computePackageManifestHashNow, false);
    assert.equal(scopeBindingPolicy.scopeBindingPolicy.persistScopeBindingNow, false);
    assert.equal(scopeBindingPolicy.scopeBindingPolicy.tokenValueLogged, false);
    assert.equal(scopeBindingPolicy.scopeBindingPolicy.hashAlgorithm, "sha256-planned");
    assert.ok(scopeBindingPolicy.scopeBindingPolicy.requiredScopeFields.includes("workspaceWiring"));
    assert.ok(scopeBindingPolicy.scopeBindingChecks.some((entry) => entry.id === "target-scope-declared" && entry.executed === false));
    assert.equal(scopeBindingPolicy.scopeBindingDecision.canBindScope, false);
    assert.equal(scopeBindingPolicy.scopeBindingDecision.canComputeScopeHash, false);
    assert.equal(scopeBindingPolicy.scopeBindingDecision.canValidateTokenScope, false);
    assert.equal(scopeBindingPolicy.scopeBindingDecision.canAcceptToken, false);
    assert.equal(scopeBindingPolicy.scopeBindingDecision.canConsumeToken, false);
    assert.equal(scopeBindingPolicy.scopeBindingDecision.canGrantFinalApproval, false);
    assert.equal(scopeBindingPolicy.scopeBindingDecision.canMaterializeFiles, false);
    assert.ok(scopeBindingPolicy.noOpGuarantees.includes("approval scope binding policy plan does not compute approval scope hashes"));
    assert.ok(scopeBindingPolicy.requiredBeforeRuntimeDispatch.includes("define canonical approval scope serialization"));
});

test("render.thumbnail renderer-service package materialization approval operator confirmation policy stays metadata-only", () => {
    const operatorConfirmationPolicy = createRenderThumbnailRendererServicePackageMaterializationApprovalOperatorConfirmationPolicy({
        packageMaterializationApprovalScopeBindingPolicy: {
            status: "planned-disabled",
            scopeBindingVersion: "P25.46",
            scopeBindingExecuted: false,
        },
        packageMaterializationApprovalRevocationPolicy: {
            status: "planned-disabled",
            revocationPolicyVersion: "P25.45",
            revocationCheckExecuted: false,
        },
        packageMaterializationFinalApprovalChecklist: {
            status: "planned-disabled",
            checklistVersion: "P25.40",
            finalApprovalGranted: false,
        },
    });

    assert.equal(operatorConfirmationPolicy.status, "planned-disabled");
    assert.equal(operatorConfirmationPolicy.operatorConfirmationVersion, "P25.47");
    assert.equal(operatorConfirmationPolicy.dryRunOnly, true);
    assert.equal(operatorConfirmationPolicy.approvalRequired, true);
    assert.equal(operatorConfirmationPolicy.approved, false);
    assert.equal(operatorConfirmationPolicy.finalApprovalGranted, false);
    assert.equal(operatorConfirmationPolicy.operatorConfirmationRequired, true);
    assert.equal(operatorConfirmationPolicy.operatorConfirmationPlanned, true);
    assert.equal(operatorConfirmationPolicy.operatorConfirmationPrompted, false);
    assert.equal(operatorConfirmationPolicy.operatorConfirmationReceived, false);
    assert.equal(operatorConfirmationPolicy.operatorConfirmationStored, false);
    assert.equal(operatorConfirmationPolicy.operatorConfirmationValidated, false);
    assert.equal(operatorConfirmationPolicy.operatorIdentityVerified, false);
    assert.equal(operatorConfirmationPolicy.operatorIntentCaptured, false);
    assert.equal(operatorConfirmationPolicy.confirmationAuditLinked, false);
    assert.equal(operatorConfirmationPolicy.confirmationTokenIssued, false);
    assert.equal(operatorConfirmationPolicy.tokenAccepted, false);
    assert.equal(operatorConfirmationPolicy.tokenStored, false);
    assert.equal(operatorConfirmationPolicy.tokenValidated, false);
    assert.equal(operatorConfirmationPolicy.tokenConsumed, false);
    assert.equal(operatorConfirmationPolicy.tokenRevoked, false);
    assert.equal(operatorConfirmationPolicy.executeNow, false);
    assert.equal(operatorConfirmationPolicy.verifyNow, false);
    assert.equal(operatorConfirmationPolicy.rollbackNow, false);
    assert.equal(operatorConfirmationPolicy.dispatch, false);
    assert.equal(operatorConfirmationPolicy.networkDispatch, false);
    assert.equal(operatorConfirmationPolicy.runtimeRegistration, false);
    assert.equal(operatorConfirmationPolicy.localFileWrites, false);
    assert.equal(operatorConfirmationPolicy.hostStartup, false);
    assert.equal(operatorConfirmationPolicy.processSpawn, false);
    assert.equal(operatorConfirmationPolicy.packageCreated, false);
    assert.equal(operatorConfirmationPolicy.workspaceMutation, false);
    assert.equal(operatorConfirmationPolicy.scriptRunnable, false);
    assert.equal(operatorConfirmationPolicy.fileMaterialization, false);
    assert.equal(operatorConfirmationPolicy.lockfileMutation, false);
    assert.equal(operatorConfirmationPolicy.rootPackageJsonMutation, false);
    assert.equal(operatorConfirmationPolicy.pnpmWorkspaceMutation, false);
    assert.equal(operatorConfirmationPolicy.commandExecution, false);
    assert.equal(operatorConfirmationPolicy.buildOutput, false);
    assert.equal(operatorConfirmationPolicy.packageScriptsRunnable, false);
    assert.equal(operatorConfirmationPolicy.materializationApproved, false);
    assert.equal(operatorConfirmationPolicy.filesWritten, false);
    assert.equal(operatorConfirmationPolicy.rollbackExecuted, false);
    assert.equal(operatorConfirmationPolicy.verificationExecuted, false);
    assert.equal(operatorConfirmationPolicy.consumes.packageMaterializationApprovalScopeBindingPolicy.scopeBindingVersion, "P25.46");
    assert.equal(operatorConfirmationPolicy.consumes.packageMaterializationApprovalScopeBindingPolicy.scopeBindingExecuted, false);
    assert.equal(operatorConfirmationPolicy.consumes.packageMaterializationApprovalRevocationPolicy.revocationPolicyVersion, "P25.45");
    assert.equal(operatorConfirmationPolicy.consumes.packageMaterializationApprovalRevocationPolicy.revocationCheckExecuted, false);
    assert.equal(operatorConfirmationPolicy.consumes.packageMaterializationFinalApprovalChecklist.checklistVersion, "P25.40");
    assert.equal(operatorConfirmationPolicy.operatorConfirmationPolicy.policy, "require-explicit-operator-confirmation");
    assert.equal(operatorConfirmationPolicy.operatorConfirmationPolicy.promptNow, false);
    assert.equal(operatorConfirmationPolicy.operatorConfirmationPolicy.acceptConfirmationNow, false);
    assert.equal(operatorConfirmationPolicy.operatorConfirmationPolicy.validateOperatorIdentityNow, false);
    assert.equal(operatorConfirmationPolicy.operatorConfirmationPolicy.persistConfirmationNow, false);
    assert.equal(operatorConfirmationPolicy.operatorConfirmationPolicy.issueConfirmationTokenNow, false);
    assert.equal(operatorConfirmationPolicy.operatorConfirmationPolicy.tokenValueLogged, false);
    assert.ok(operatorConfirmationPolicy.operatorConfirmationPolicy.requiredInputs.includes("confirmationIntent"));
    assert.ok(operatorConfirmationPolicy.operatorConfirmationChecks.some((entry) => entry.id === "operator-identity-present" && entry.executed === false));
    assert.equal(operatorConfirmationPolicy.operatorConfirmationDecision.canPromptOperator, false);
    assert.equal(operatorConfirmationPolicy.operatorConfirmationDecision.canAcceptConfirmation, false);
    assert.equal(operatorConfirmationPolicy.operatorConfirmationDecision.canValidateOperatorIdentity, false);
    assert.equal(operatorConfirmationPolicy.operatorConfirmationDecision.canIssueConfirmationToken, false);
    assert.equal(operatorConfirmationPolicy.operatorConfirmationDecision.canAcceptToken, false);
    assert.equal(operatorConfirmationPolicy.operatorConfirmationDecision.canConsumeToken, false);
    assert.equal(operatorConfirmationPolicy.operatorConfirmationDecision.canGrantFinalApproval, false);
    assert.equal(operatorConfirmationPolicy.operatorConfirmationDecision.canMaterializeFiles, false);
    assert.ok(operatorConfirmationPolicy.noOpGuarantees.includes("operator confirmation policy plan does not prompt operators"));
    assert.ok(operatorConfirmationPolicy.requiredBeforeRuntimeDispatch.includes("define operator identity source and confirmation phrase"));
});

test("render.thumbnail renderer-service package materialization approval emergency stop policy stays metadata-only", () => {
    const emergencyStopPolicy = createRenderThumbnailRendererServicePackageMaterializationApprovalEmergencyStopPolicy({
        packageMaterializationApprovalOperatorConfirmationPolicy: {
            status: "planned-disabled",
            operatorConfirmationVersion: "P25.47",
            operatorConfirmationReceived: false,
        },
        packageMaterializationApprovalRevocationPolicy: {
            status: "planned-disabled",
            revocationPolicyVersion: "P25.45",
            revocationCheckExecuted: false,
        },
        packageMaterializationFinalApprovalChecklist: {
            status: "planned-disabled",
            checklistVersion: "P25.40",
            finalApprovalGranted: false,
        },
    });

    assert.equal(emergencyStopPolicy.status, "planned-disabled");
    assert.equal(emergencyStopPolicy.emergencyStopVersion, "P25.48");
    assert.equal(emergencyStopPolicy.dryRunOnly, true);
    assert.equal(emergencyStopPolicy.approvalRequired, true);
    assert.equal(emergencyStopPolicy.approved, false);
    assert.equal(emergencyStopPolicy.finalApprovalGranted, false);
    assert.equal(emergencyStopPolicy.emergencyStopRequired, true);
    assert.equal(emergencyStopPolicy.emergencyStopPlanned, true);
    assert.equal(emergencyStopPolicy.emergencyStopConfigured, false);
    assert.equal(emergencyStopPolicy.emergencyStopChecked, false);
    assert.equal(emergencyStopPolicy.emergencyStopFetched, false);
    assert.equal(emergencyStopPolicy.emergencyStopStateRead, false);
    assert.equal(emergencyStopPolicy.emergencyStopStateTrusted, false);
    assert.equal(emergencyStopPolicy.emergencyStopActive, false);
    assert.equal(emergencyStopPolicy.emergencyStopBypassAllowed, false);
    assert.equal(emergencyStopPolicy.emergencyStopAuditLinked, false);
    assert.equal(emergencyStopPolicy.emergencyStopReasonRecorded, false);
    assert.equal(emergencyStopPolicy.stopRegistryConfigured, false);
    assert.equal(emergencyStopPolicy.stopRegistryFetched, false);
    assert.equal(emergencyStopPolicy.stopStatusFetched, false);
    assert.equal(emergencyStopPolicy.stopStatusTrusted, false);
    assert.equal(emergencyStopPolicy.stopSignalReceived, false);
    assert.equal(emergencyStopPolicy.stopSignalRejected, false);
    assert.equal(emergencyStopPolicy.stopOverrideAccepted, false);
    assert.equal(emergencyStopPolicy.tokenAccepted, false);
    assert.equal(emergencyStopPolicy.tokenStored, false);
    assert.equal(emergencyStopPolicy.tokenValidated, false);
    assert.equal(emergencyStopPolicy.tokenConsumed, false);
    assert.equal(emergencyStopPolicy.tokenRevoked, false);
    assert.equal(emergencyStopPolicy.executeNow, false);
    assert.equal(emergencyStopPolicy.verifyNow, false);
    assert.equal(emergencyStopPolicy.rollbackNow, false);
    assert.equal(emergencyStopPolicy.dispatch, false);
    assert.equal(emergencyStopPolicy.networkDispatch, false);
    assert.equal(emergencyStopPolicy.runtimeRegistration, false);
    assert.equal(emergencyStopPolicy.localFileWrites, false);
    assert.equal(emergencyStopPolicy.hostStartup, false);
    assert.equal(emergencyStopPolicy.processSpawn, false);
    assert.equal(emergencyStopPolicy.packageCreated, false);
    assert.equal(emergencyStopPolicy.workspaceMutation, false);
    assert.equal(emergencyStopPolicy.scriptRunnable, false);
    assert.equal(emergencyStopPolicy.fileMaterialization, false);
    assert.equal(emergencyStopPolicy.lockfileMutation, false);
    assert.equal(emergencyStopPolicy.rootPackageJsonMutation, false);
    assert.equal(emergencyStopPolicy.pnpmWorkspaceMutation, false);
    assert.equal(emergencyStopPolicy.commandExecution, false);
    assert.equal(emergencyStopPolicy.buildOutput, false);
    assert.equal(emergencyStopPolicy.packageScriptsRunnable, false);
    assert.equal(emergencyStopPolicy.materializationApproved, false);
    assert.equal(emergencyStopPolicy.filesWritten, false);
    assert.equal(emergencyStopPolicy.rollbackExecuted, false);
    assert.equal(emergencyStopPolicy.verificationExecuted, false);
    assert.equal(emergencyStopPolicy.consumes.packageMaterializationApprovalOperatorConfirmationPolicy.operatorConfirmationVersion, "P25.47");
    assert.equal(emergencyStopPolicy.consumes.packageMaterializationApprovalOperatorConfirmationPolicy.operatorConfirmationReceived, false);
    assert.equal(emergencyStopPolicy.consumes.packageMaterializationApprovalRevocationPolicy.revocationPolicyVersion, "P25.45");
    assert.equal(emergencyStopPolicy.consumes.packageMaterializationApprovalRevocationPolicy.revocationCheckExecuted, false);
    assert.equal(emergencyStopPolicy.consumes.packageMaterializationFinalApprovalChecklist.checklistVersion, "P25.40");
    assert.equal(emergencyStopPolicy.emergencyStopPolicy.policy, "deny-materialization-when-emergency-stop-is-active");
    assert.equal(emergencyStopPolicy.emergencyStopPolicy.checkNow, false);
    assert.equal(emergencyStopPolicy.emergencyStopPolicy.fetchRegistryNow, false);
    assert.equal(emergencyStopPolicy.emergencyStopPolicy.readStopStateNow, false);
    assert.equal(emergencyStopPolicy.emergencyStopPolicy.trustStopStateNow, false);
    assert.equal(emergencyStopPolicy.emergencyStopPolicy.allowBypassNow, false);
    assert.equal(emergencyStopPolicy.emergencyStopPolicy.persistStopDecisionNow, false);
    assert.equal(emergencyStopPolicy.emergencyStopPolicy.stopValueLogged, false);
    assert.ok(emergencyStopPolicy.emergencyStopPolicy.requiredInputs.includes("checkedAt"));
    assert.ok(emergencyStopPolicy.emergencyStopChecks.some((entry) => entry.id === "emergency-stop-not-active" && entry.executed === false));
    assert.equal(emergencyStopPolicy.emergencyStopDecision.canCheckEmergencyStop, false);
    assert.equal(emergencyStopPolicy.emergencyStopDecision.canFetchStopRegistry, false);
    assert.equal(emergencyStopPolicy.emergencyStopDecision.canReadStopState, false);
    assert.equal(emergencyStopPolicy.emergencyStopDecision.canTrustStopState, false);
    assert.equal(emergencyStopPolicy.emergencyStopDecision.canBypassEmergencyStop, false);
    assert.equal(emergencyStopPolicy.emergencyStopDecision.canAcceptToken, false);
    assert.equal(emergencyStopPolicy.emergencyStopDecision.canConsumeToken, false);
    assert.equal(emergencyStopPolicy.emergencyStopDecision.canGrantFinalApproval, false);
    assert.equal(emergencyStopPolicy.emergencyStopDecision.canMaterializeFiles, false);
    assert.ok(emergencyStopPolicy.noOpGuarantees.includes("emergency stop policy plan does not fetch stop registries"));
    assert.ok(emergencyStopPolicy.requiredBeforeRuntimeDispatch.includes("define emergency stop source and scope"));
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
