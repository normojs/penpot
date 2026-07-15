import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

const buildPath = "/Volumes/fushilu/.caches/penpot/renderer-service/index.js";
const serviceModule = await import(`${pathToFileURL(buildPath).href}?test=${Date.now()}`);
const pngFixture = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64"
);
const pngSignature = "89504e470d0a1a0a";

function assertPngBytes(value) {
    const bytes = Buffer.from(value);
    assert.ok(bytes.byteLength > 8);
    assert.equal(bytes.subarray(0, 8).toString("hex"), pngSignature);
    return bytes;
}

function browserFixtureRuntimeInput({ cachePolicy = "reuse" } = {}) {
    return {
        target: {
            kind: "file",
            fileId: "file-1",
            revn: 1,
        },
        artifact: {
            format: "png",
            mimeType: "image/png",
            width: 252,
            height: 168,
            extension: ".png",
        },
        cache: {
            policy: cachePolicy,
            scope: "file-thumbnail",
            key: "file:file-1:revn:1",
        },
        render: {
            runtime: "render-wasm-worker",
            fallback: "frontend-rasterizer",
        },
        sourceData: {
            fileId: "file-1",
            revn: 1,
            page: {
                id: "page-secret",
                objects: {},
            },
        },
    };
}

function assertBrowserFixtureRuntimeLifecycle(summary, {
    status = "not-configured",
    runtimeSource = "none",
    configured = false,
    enabled = false,
    processStarted = false,
    renderAttempts = 0,
    renderSuccesses = 0,
    pageCreateCount = 0,
    pageReuseValidated = false,
    nonEmptyPngValidated = false,
    closeAttempted = false,
    closeSucceeded = false,
} = {}) {
    assert.equal(summary.status, status);
    assert.equal(summary.diagnosticsVersion, "P26.31");
    assert.equal(summary.owner, "renderer-service");
    assert.equal(summary.mode, "browser-fixture-lifecycle");
    assert.equal(summary.runtimeSource, runtimeSource);
    assert.equal(summary.configured, configured);
    assert.equal(summary.enabled, enabled);
    assert.equal(summary.browser.engine, "chromium");
    assert.equal(summary.browser.headless, true);
    assert.equal(summary.browser.processStarted, processStarted);
    assert.equal(summary.browser.startupAttempted, processStarted);
    assert.equal(summary.browser.startupSucceeded, processStarted);
    assert.equal(summary.browser.pathValuesIncluded, false);
    assert.equal(summary.lifecycle.startupAttempted, processStarted);
    assert.equal(summary.lifecycle.startupSucceeded, processStarted);
    assert.equal(summary.lifecycle.startupFailed, false);
    assert.equal(summary.lifecycle.renderAttempts, renderAttempts);
    assert.equal(summary.lifecycle.renderSuccesses, renderSuccesses);
    assert.equal(summary.lifecycle.renderFailures, 0);
    assert.equal(summary.lifecycle.pageCreateCount, pageCreateCount);
    assert.equal(summary.lifecycle.pageReuseValidated, pageReuseValidated);
    assert.equal(summary.lifecycle.nonEmptyPngValidated, nonEmptyPngValidated);
    assert.equal(summary.lifecycle.closeAttempted, closeAttempted);
    assert.equal(summary.lifecycle.closeSucceeded, closeSucceeded);
    assert.equal(summary.lifecycle.closeFailed, false);
    assert.equal(summary.lifecycle.artifactByteLengthIncluded, false);
    assert.equal(summary.sideEffects.browserProcessStarted, processStarted);
    assert.equal(summary.sideEffects.runtimeExecutionRegistered, false);
    assert.equal(summary.sideEffects.runtimeAssetsLoaded, false);
    assert.equal(summary.sideEffects.assetManifestMaterialized, false);
    assert.equal(summary.sideEffects.networkDispatch, false);
    assert.equal(summary.sideEffects.dispatch, false);
    assert.equal(summary.sideEffects.localFileWrites, false);
    assert.equal(summary.redaction.sourceDataValuesIncluded, false);
    assert.equal(summary.redaction.pageValuesIncluded, false);
    assert.equal(summary.redaction.artifactValuesIncluded, false);
    assert.equal(summary.redaction.mediaValuesIncluded, false);
    assert.equal(summary.redaction.tokenValuesIncluded, false);
    assert.equal(summary.redaction.pathValuesIncluded, false);
    assert.equal(summary.omitted.playwrightBrowserPath, true);
    assert.equal(summary.omitted.runtimeModulePath, true);
    assert.equal(summary.omitted.workspaceRoot, true);
    assert.equal(summary.omitted.cacheRoot, true);
    assert.equal(summary.omitted.sourceData, true);
    assert.equal(summary.omitted.pageData, true);
    assert.equal(summary.omitted.artifactBytes, true);
    assert.equal(summary.omitted.mediaBytes, true);
    assert.equal(summary.omitted.tokenValues, true);
    return summary;
}

function assertRuntimeAssetManifestScaffold(manifest) {
    assert.deepEqual(manifest, serviceModule.bundledRuntimeBridgeAssetManifest);
    assert.equal(manifest.status, "planned-disabled");
    assert.equal(manifest.manifestVersion, "P26.20");
    assert.equal(manifest.owner, "renderer-service");
    assert.equal(manifest.bridge, "browser-backed-service-adapter");
    assert.equal(manifest.roots.cacheRoot, "/Volumes/fushilu/.caches/penpot/renderer-service");
    assert.deepEqual(
        manifest.assets.map((asset) => asset.id),
        [
            "thumbnail-worker-main",
            "thumbnail-worker-render-wasm-glue",
            "render-wasm-loader",
            "render-wasm-binary",
            "rasterizer-bundle",
            "rasterizer-html",
        ]
    );
    assert.ok(manifest.assets.every((asset) => asset.required === true));
    assert.ok(manifest.assets.every((asset) => asset.materialized === false));
    assert.ok(manifest.assets.every((asset) => asset.existsChecked === false));
    assert.ok(manifest.assets.every((asset) => asset.dispatch === false));
    assert.ok(manifest.assets.every((asset) => asset.localFileWrites === false));
    assert.ok(manifest.cacheOutputs.every((entry) => entry.path.startsWith("/Volumes/fushilu/.caches/penpot/renderer-service")));
    assert.ok(manifest.cacheOutputs.every((entry) => entry.materialized === false));
    assert.equal(manifest.sideEffects.browserProcessStarted, false);
    assert.equal(manifest.sideEffects.runtimeExecutionRegistered, false);
    assert.equal(manifest.sideEffects.runtimeAdapterImported, false);
    assert.equal(manifest.sideEffects.runtimeAssetsLoaded, false);
    assert.equal(manifest.sideEffects.assetManifestMaterialized, false);
    assert.equal(manifest.sideEffects.networkDispatch, false);
    assert.equal(manifest.sideEffects.dispatch, false);
    assert.equal(manifest.sideEffects.localFileWrites, false);
    assert.equal(manifest.redaction.sourceDataValuesIncluded, false);
    assert.equal(manifest.redaction.pageValuesIncluded, false);
    assert.equal(manifest.redaction.artifactValuesIncluded, false);
    assert.equal(manifest.redaction.mediaValuesIncluded, false);
    assert.equal(manifest.redaction.tokenValuesIncluded, false);
    assert.ok(manifest.validation.noDispatchTests.includes("runtime-asset-manifest-response-validator"));
}

function assertRuntimeAssetMaterializationPreflightScaffold(preflight) {
    assert.deepEqual(preflight, serviceModule.bundledRuntimeAssetMaterializationPreflight);
    assert.equal(preflight.status, "planned-disabled");
    assert.equal(preflight.preflightVersion, "P26.21");
    assert.equal(preflight.owner, "renderer-service");
    assert.equal(preflight.mode, "read-only-metadata");
    assert.equal(preflight.readiness, "not-checked");
    assert.equal(preflight.execution, null);
    assert.equal(preflight.sourceManifest.manifestVersion, "P26.20");
    assert.deepEqual(preflight.sourceManifest.assetIds, serviceModule.bundledRuntimeBridgeAssetManifest.validation.requiredAssetIds);
    assert.deepEqual(
        preflight.checks.map((check) => check.assetId),
        serviceModule.bundledRuntimeBridgeAssetManifest.assets.map((asset) => asset.id)
    );
    assert.ok(preflight.checks.every((check) => check.readiness === "not-checked"));
    assert.ok(preflight.checks.every((check) => check.exists === null));
    assert.ok(preflight.checks.every((check) => check.cacheOutputExists === null));
    assert.ok(preflight.checks.every((check) => check.sha256 === null));
    assert.ok(preflight.checks.every((check) => check.byteLength === null));
    assert.ok(preflight.checks.every((check) => check.fileRead === false));
    assert.ok(preflight.checks.every((check) => check.hashComputed === false));
    assert.ok(preflight.checks.every((check) => check.dispatch === false));
    assert.ok(preflight.checks.every((check) => check.localFileWrites === false));
    assert.ok(preflight.cacheOutputChecks.every((check) => check.readiness === "not-checked"));
    assert.ok(preflight.cacheOutputChecks.every((check) => check.exists === null));
    assert.ok(preflight.cacheOutputChecks.every((check) => check.writable === null));
    assert.ok(preflight.failureTaxonomy.some((entry) => entry.code === "renderer_service_runtime_asset_missing"));
    assert.ok(preflight.failureTaxonomy.every((entry) => entry.dispatch === false));
    assert.equal(preflight.gates.assetExistenceChecked, false);
    assert.equal(preflight.gates.assetHashesComputed, false);
    assert.equal(preflight.gates.cacheOutputsChecked, false);
    assert.equal(preflight.gates.materializationApproved, false);
    assert.equal(preflight.gates.browserLifecycleValidated, false);
    assert.equal(preflight.gates.runtimeRegistration, false);
    assert.equal(preflight.sideEffects.browserProcessStarted, false);
    assert.equal(preflight.sideEffects.runtimeAdapterImported, false);
    assert.equal(preflight.sideEffects.runtimeAssetsLoaded, false);
    assert.equal(preflight.sideEffects.fileRead, false);
    assert.equal(preflight.sideEffects.hashComputed, false);
    assert.equal(preflight.sideEffects.localFileWrites, false);
    assert.equal(preflight.redaction.sourceDataValuesIncluded, false);
    assert.equal(preflight.redaction.pageValuesIncluded, false);
    assert.equal(preflight.redaction.artifactValuesIncluded, false);
    assert.equal(preflight.redaction.mediaValuesIncluded, false);
    assert.equal(preflight.redaction.tokenValuesIncluded, false);
}

function assertRuntimeAssetMaterializationDryRunPlan(plan, { status = "not-executed", readiness = "not-checked", ready = false } = {}) {
    assert.equal(plan.status, "planned-disabled");
    assert.equal(plan.planVersion, "P26.26");
    assert.equal(plan.owner, "renderer-service");
    assert.equal(plan.mode, "metadata-only");
    assert.equal(plan.sourcePreflight.preflightVersion, "P26.21");
    assert.equal(plan.sourcePreflight.diagnosticsVersion, "P26.25");
    assert.equal(plan.sourcePreflight.status, status);
    assert.equal(plan.sourcePreflight.readiness, readiness);
    assert.equal(plan.sourcePreflight.ready, ready);
    assert.equal(plan.prerequisites.length, 3);
    assert.deepEqual(
        plan.copyPlan.map((entry) => entry.assetId),
        serviceModule.bundledRuntimeBridgeAssetManifest.assets.map((asset) => asset.id)
    );
    assert.deepEqual(
        plan.cacheOutputPlan.map((entry) => entry.cacheOutputId),
        serviceModule.bundledRuntimeBridgeAssetManifest.cacheOutputs.map((entry) => entry.id)
    );
    assert.ok(plan.copyPlan.every((entry) => entry.futureLocalFileWrites === true));
    assert.ok(plan.copyPlan.every((entry) => entry.localFileWrites === false));
    assert.ok(plan.copyPlan.every((entry) => entry.copyApproved === false));
    assert.ok(plan.cacheOutputPlan.every((entry) => entry.futureLocalFileWrites === true));
    assert.ok(plan.cacheOutputPlan.every((entry) => entry.localFileWrites === false));
    assert.equal(plan.approvalGate.status, "closed");
    assert.equal(plan.approvalGate.approvalRequired, true);
    assert.equal(plan.approvalGate.approvalGranted, false);
    assert.equal(plan.approvalGate.approvalTokenAccepted, false);
    assert.equal(plan.approvalGate.approvalTokenConsumed, false);
    assert.equal(plan.approvalGate.writesEnabled, false);
    assert.ok(plan.approvalGate.currentBlockers.includes("renderer_service_runtime_asset_materialization_approval_required"));
    assert.equal(plan.sideEffects.browserProcessStarted, false);
    assert.equal(plan.sideEffects.runtimeExecutionRegistered, false);
    assert.equal(plan.sideEffects.runtimeAdapterImported, false);
    assert.equal(plan.sideEffects.runtimeAssetsLoaded, false);
    assert.equal(plan.sideEffects.assetManifestMaterialized, false);
    assert.equal(plan.sideEffects.fileRead, false);
    assert.equal(plan.sideEffects.hashComputed, false);
    assert.equal(plan.sideEffects.networkDispatch, false);
    assert.equal(plan.sideEffects.dispatch, false);
    assert.equal(plan.sideEffects.localFileWrites, false);
    assert.equal(plan.redaction.sourceDataValuesIncluded, false);
    assert.equal(plan.redaction.pageValuesIncluded, false);
    assert.equal(plan.redaction.artifactValuesIncluded, false);
    assert.equal(plan.redaction.mediaValuesIncluded, false);
    assert.equal(plan.redaction.tokenValuesIncluded, false);
    assert.equal(plan.omitted.workspaceRoot, true);
    assert.equal(plan.omitted.cacheRoot, true);
    assert.equal(plan.omitted.publicPaths, true);
    assert.equal(plan.omitted.cachePaths, true);
    assert.equal(plan.omitted.sha256, true);
    assert.equal(plan.execution, null);
    return plan;
}

function assertRuntimeAssetMaterializationApprovalPlan(
    plan,
    {
        readiness = "not-checked",
        ready = false,
        modeConfigured = false,
        approvalTokenConfigured = false,
        auditConfigured = false,
        expectedDiagnosticCodes = [],
    } = {}
) {
    const configured = modeConfigured || approvalTokenConfigured || auditConfigured;
    assert.equal(plan.status, "planned-disabled");
    assert.equal(plan.planVersion, "P26.27");
    assert.equal(plan.diagnosticsVersion, "P26.28");
    assert.equal(plan.owner, "renderer-service");
    assert.equal(plan.mode, "metadata-only");
    assert.equal(plan.sourceDryRun.planVersion, "P26.26");
    assert.equal(plan.sourceDryRun.status, "planned-disabled");
    assert.equal(plan.sourceDryRun.readiness, readiness);
    assert.equal(plan.sourceDryRun.ready, ready);
    assert.equal(plan.sourceDryRun.approvalRequired, true);
    assert.equal(plan.sourceDryRun.approvalGranted, false);
    assert.equal(plan.sourceDryRun.writesEnabled, false);
    assert.equal(plan.sourceDryRun.copyPlanCounts.total, serviceModule.bundledRuntimeBridgeAssetManifest.assets.length);
    assert.equal(plan.sourceDryRun.cacheOutputPlanCounts.total, serviceModule.bundledRuntimeBridgeAssetManifest.cacheOutputs.length);
    assert.equal(plan.configuration.status, "planned-disabled");
    assert.equal(plan.configuration.configured, configured);
    assert.equal(plan.configuration.valuesIncluded, false);
    assert.equal(plan.configuration.mode.env, "PENPOT_RENDERER_SERVICE_RUNTIME_ASSET_MATERIALIZATION_APPROVAL");
    assert.equal(plan.configuration.mode.expectedValue, "approved");
    assert.equal(plan.configuration.mode.configured, modeConfigured);
    assert.equal(plan.configuration.mode.valueRead, false);
    assert.equal(plan.configuration.approvalToken.env, "PENPOT_RENDERER_SERVICE_RUNTIME_ASSET_MATERIALIZATION_APPROVAL_TOKEN");
    assert.equal(plan.configuration.approvalToken.requiredWhenEnabled, true);
    assert.equal(plan.configuration.approvalToken.configured, approvalTokenConfigured);
    assert.equal(plan.configuration.approvalToken.valueRead, false);
    assert.equal(plan.configuration.approvalToken.accepted, false);
    assert.equal(plan.configuration.approvalToken.consumed, false);
    assert.equal(plan.configuration.approvalToken.valuesIncluded, false);
    assert.equal(plan.configuration.audit.env, "PENPOT_RENDERER_SERVICE_RUNTIME_ASSET_MATERIALIZATION_APPROVAL_AUDIT_DIR");
    assert.equal(plan.configuration.audit.requiredWhenEnabled, true);
    assert.equal(plan.configuration.audit.configured, auditConfigured);
    assert.equal(plan.configuration.audit.valueRead, false);
    assert.equal(plan.configuration.audit.recordWrites, false);
    assert.equal(plan.configuration.audit.valuesIncluded, false);
    assert.equal(plan.approvalGate.status, "closed");
    assert.equal(plan.approvalGate.approvalRequired, true);
    assert.equal(plan.approvalGate.approvalGranted, false);
    assert.equal(plan.approvalGate.approvalTokenConfigured, approvalTokenConfigured);
    assert.equal(plan.approvalGate.approvalTokenAccepted, false);
    assert.equal(plan.approvalGate.approvalTokenConsumed, false);
    assert.equal(plan.approvalGate.writesEnabled, false);
    assert.ok(plan.approvalGate.currentBlockers.includes("renderer_service_runtime_asset_materialization_approval_scaffold_disabled"));
    assert.ok(plan.approvalGate.currentBlockers.includes("renderer_service_runtime_asset_materialization_approval_token_disabled"));
    for (const code of expectedDiagnosticCodes) {
        assert.ok(plan.diagnosticCodes.includes(code));
        assert.ok(plan.approvalGate.currentBlockers.includes(code));
    }
    assert.deepEqual(
        plan.diagnostics.map((diagnostic) => diagnostic.code),
        expectedDiagnosticCodes
    );
    assert.equal(plan.nextActions.length > 0, configured);
    assert.ok(plan.diagnostics.every((diagnostic) => diagnostic.severity === "unsupported"));
    assert.ok(plan.diagnostics.every((diagnostic) => diagnostic.valueRead === false));
    assert.ok(plan.diagnostics.every((diagnostic) => diagnostic.valuesIncluded === false));
    assert.equal(plan.readinessVerdict.status, "blocked");
    assert.equal(plan.readinessVerdict.verdictVersion, "P26.29");
    assert.equal(plan.readinessVerdict.owner, "renderer-service");
    assert.equal(plan.readinessVerdict.mode, "metadata-only");
    assert.equal(plan.readinessVerdict.computed, true);
    assert.equal(plan.readinessVerdict.trusted, false);
    assert.equal(plan.readinessVerdict.approvalReady, false);
    assert.equal(plan.readinessVerdict.materializationReady, false);
    assert.equal(plan.readinessVerdict.approvalGranted, false);
    assert.equal(plan.readinessVerdict.writesEnabled, false);
    assert.equal(plan.readinessVerdict.inputs.sourceDryRun.readiness, readiness);
    assert.equal(plan.readinessVerdict.inputs.sourceDryRun.ready, ready);
    assert.deepEqual(plan.readinessVerdict.inputs.sourceDryRun.blockerCodes, plan.sourceDryRun.diagnosticCodes);
    assert.equal(plan.readinessVerdict.inputs.approvalConfiguration.configured, configured);
    assert.equal(plan.readinessVerdict.inputs.approvalConfiguration.unsupportedConfiguration, expectedDiagnosticCodes.length > 0);
    assert.deepEqual(plan.readinessVerdict.inputs.approvalConfiguration.unsupportedDiagnosticCodes, expectedDiagnosticCodes);
    assert.equal(plan.readinessVerdict.inputs.approvalConfiguration.valuesIncluded, false);
    assert.equal(plan.readinessVerdict.inputs.approvalGate.status, "closed");
    assert.equal(plan.readinessVerdict.inputs.approvalGate.approvalRequired, true);
    assert.equal(plan.readinessVerdict.inputs.approvalGate.approvalGranted, false);
    assert.equal(plan.readinessVerdict.inputs.approvalGate.writesEnabled, false);
    assert.deepEqual(plan.readinessVerdict.inputs.approvalGate.blockerCodes, plan.diagnosticCodes);
    const dryRunReadyCheck = plan.readinessVerdict.checks.find((entry) => entry.id === "runtime-asset-materialization-dry-run-ready");
    const dryRunReady =
        ready &&
        readiness === "ready" &&
        plan.sourceDryRun.copyPlanCounts.blocked === 0 &&
        plan.sourceDryRun.copyPlanCounts.unknown === 0 &&
        plan.sourceDryRun.cacheOutputPlanCounts.blocked === 0 &&
        plan.sourceDryRun.cacheOutputPlanCounts.unknown === 0;
    assert.equal(dryRunReadyCheck.status, dryRunReady ? "passed" : "blocked");
    const configurationCheck = plan.readinessVerdict.checks.find(
        (entry) => entry.id === "runtime-asset-materialization-approval-configuration-supported"
    );
    assert.equal(configurationCheck.status, expectedDiagnosticCodes.length === 0 ? "passed" : "blocked");
    assert.ok(
        plan.readinessVerdict.checks.some(
            (entry) =>
                entry.id === "runtime-asset-materialization-approval-required" &&
                entry.status === "blocked" &&
                entry.diagnosticCodes.includes("renderer_service_runtime_asset_materialization_approval_required")
        )
    );
    assert.ok(plan.readinessVerdict.blockerCodes.includes("renderer_service_runtime_asset_materialization_approval_required"));
    assert.ok(plan.readinessVerdict.blockerCodes.includes("renderer_service_runtime_asset_materialization_approval_scaffold_disabled"));
    assert.ok(plan.readinessVerdict.blockerCodes.includes("renderer_service_runtime_asset_materialization_approval_token_disabled"));
    assert.equal(plan.readinessVerdict.nextActions.length > 0, true);
    assert.equal(plan.readinessVerdict.sideEffects.approvalTokenRead, false);
    assert.equal(plan.readinessVerdict.sideEffects.approvalTokenAccepted, false);
    assert.equal(plan.readinessVerdict.sideEffects.approvalTokenConsumed, false);
    assert.equal(plan.readinessVerdict.sideEffects.auditRecordWritten, false);
    assert.equal(plan.readinessVerdict.sideEffects.localFileWrites, false);
    assert.equal(plan.readinessVerdict.sideEffects.networkDispatch, false);
    assert.equal(plan.readinessVerdict.sideEffects.dispatch, false);
    assert.equal(plan.readinessVerdict.sideEffects.runtimeExecutionRegistered, false);
    assert.equal(plan.readinessVerdict.omitted.approvalTokenValues, true);
    assert.equal(plan.readinessVerdict.omitted.approvalAuditPaths, true);
    assert.equal(plan.readinessVerdict.omitted.approvalScopeHashes, true);
    assert.equal(plan.readinessVerdict.omitted.workspaceRoot, true);
    assert.equal(plan.readinessVerdict.omitted.cacheRoot, true);
    assert.equal(plan.readinessVerdict.omitted.sha256, true);
    assert.equal(plan.audit.status, "planned-disabled");
    assert.equal(plan.audit.auditTrailEnabled, false);
    assert.equal(plan.audit.auditRecordPrepared, false);
    assert.equal(plan.audit.auditRecordWritten, false);
    assert.equal(plan.audit.auditStorageConfigured, false);
    assert.equal(plan.audit.auditIntegrityChecked, false);
    assert.equal(plan.audit.auditValuesIncluded, false);
    assert.equal(plan.sideEffects.browserProcessStarted, false);
    assert.equal(plan.sideEffects.runtimeExecutionRegistered, false);
    assert.equal(plan.sideEffects.runtimeAdapterImported, false);
    assert.equal(plan.sideEffects.runtimeAssetsLoaded, false);
    assert.equal(plan.sideEffects.assetManifestMaterialized, false);
    assert.equal(plan.sideEffects.fileRead, false);
    assert.equal(plan.sideEffects.hashComputed, false);
    assert.equal(plan.sideEffects.networkDispatch, false);
    assert.equal(plan.sideEffects.dispatch, false);
    assert.equal(plan.sideEffects.localFileWrites, false);
    assert.equal(plan.sideEffects.approvalTokenRead, false);
    assert.equal(plan.sideEffects.approvalTokenAccepted, false);
    assert.equal(plan.sideEffects.approvalTokenConsumed, false);
    assert.equal(plan.sideEffects.auditRecordWritten, false);
    assert.equal(plan.redaction.tokenValuesIncluded, false);
    assert.equal(plan.redaction.approvalTokenValuesIncluded, false);
    assert.equal(plan.redaction.approvalAuditValuesIncluded, false);
    assert.equal(plan.omitted.workspaceRoot, true);
    assert.equal(plan.omitted.cacheRoot, true);
    assert.equal(plan.omitted.sha256, true);
    assert.equal(plan.omitted.tokenValues, true);
    assert.equal(plan.omitted.approvalTokenValues, true);
    assert.equal(plan.omitted.approvalAuditPaths, true);
    assert.equal(plan.omitted.approvalScopeHashes, true);
    assert.equal(plan.execution, null);
    return plan;
}

const rendererServiceCacheRoot = "/Volumes/fushilu/.caches/penpot/renderer-service";

function remapRuntimeAssetCachePath(path, cacheRoot) {
    if (path === rendererServiceCacheRoot) {
        return cacheRoot;
    }
    assert.ok(path.startsWith(`${rendererServiceCacheRoot}/`), `unexpected runtime cache path ${path}`);
    return join(cacheRoot, path.slice(`${rendererServiceCacheRoot}/`.length));
}

async function writeRuntimePreflightFile(path, bytes) {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, bytes);
}

async function createRuntimePreflightFixture({ missingAssetIds = [], missingCacheAssetIds = [], missingCacheOutputIds = [] } = {}) {
    const root = await mkdtemp(join(tmpdir(), "penpot-runtime-preflight-"));
    const workspaceRoot = join(root, "workspace");
    const cacheRoot = join(root, "cache");
    const missingAssets = new Set(missingAssetIds);
    const missingCacheAssets = new Set(missingCacheAssetIds);
    const missingCacheOutputs = new Set(missingCacheOutputIds);

    await mkdir(workspaceRoot, { recursive: true });
    await mkdir(cacheRoot, { recursive: true });

    for (const asset of serviceModule.bundledRuntimeBridgeAssetManifest.assets) {
        if (missingAssets.has(asset.id)) {
            continue;
        }
        await writeRuntimePreflightFile(join(workspaceRoot, asset.publicPath), `public:${asset.id}`);
        if (missingCacheAssets.has(asset.id)) {
            continue;
        }
        await writeRuntimePreflightFile(remapRuntimeAssetCachePath(asset.cachePath, cacheRoot), `cache:${asset.id}`);
    }

    for (const output of serviceModule.bundledRuntimeBridgeAssetManifest.cacheOutputs) {
        if (missingCacheOutputs.has(output.id)) {
            continue;
        }
        const mappedPath = remapRuntimeAssetCachePath(output.path, cacheRoot);
        if (mappedPath.endsWith(".mjs")) {
            await writeRuntimePreflightFile(mappedPath, "export const runtimeAdapter = null;\n");
        } else {
            await mkdir(mappedPath, { recursive: true });
        }
    }

    return {
        root,
        workspaceRoot,
        cacheRoot,
        cleanup: () => rm(root, { recursive: true, force: true }),
    };
}

function assertRuntimeAssetPreflightExecution(preflight, { workspaceRoot, cacheRoot, readiness }) {
    assertRuntimeAssetMaterializationPreflightScaffold({
        ...preflight,
        execution: null,
    });

    const execution = preflight.execution;
    assert.equal(execution.status, "executed");
    assert.equal(execution.executionVersion, "P26.22");
    assert.equal(execution.mode, "read-only");
    assert.equal(execution.diagnosticsVersion, "P26.25");
    assert.equal(execution.readiness, readiness);
    assert.equal(execution.workspaceRoot, workspaceRoot);
    assert.equal(execution.cacheRoot, cacheRoot);
    assert.deepEqual(
        execution.checks.map((check) => check.assetId),
        serviceModule.bundledRuntimeBridgeAssetManifest.assets.map((asset) => asset.id)
    );
    assert.deepEqual(
        execution.cacheOutputChecks.map((check) => check.cacheOutputId),
        serviceModule.bundledRuntimeBridgeAssetManifest.cacheOutputs.map((entry) => entry.id)
    );
    assert.equal(execution.sideEffects.browserProcessStarted, false);
    assert.equal(execution.sideEffects.runtimeExecutionRegistered, false);
    assert.equal(execution.sideEffects.runtimeAdapterImported, false);
    assert.equal(execution.sideEffects.runtimeAssetsLoaded, false);
    assert.equal(execution.sideEffects.assetManifestMaterialized, false);
    assert.equal(execution.sideEffects.networkDispatch, false);
    assert.equal(execution.sideEffects.dispatch, false);
    assert.equal(execution.sideEffects.localFileWrites, false);
    assert.equal(execution.redaction.sourceDataValuesIncluded, false);
    assert.equal(execution.redaction.pageValuesIncluded, false);
    assert.equal(execution.redaction.artifactValuesIncluded, false);
    assert.equal(execution.redaction.mediaValuesIncluded, false);
    assert.equal(execution.redaction.tokenValuesIncluded, false);
    assert.ok(Array.isArray(execution.diagnostics));
    assert.ok(Array.isArray(execution.nextActions));
    assert.equal(execution.nextActions.some((entry) => entry.includes(workspaceRoot)), false);
    assert.equal(execution.nextActions.some((entry) => entry.includes(cacheRoot)), false);
    return execution;
}

async function withService(run) {
    const service = await serviceModule.startRendererService({ port: 0 });
    try {
        await run(service);
    } finally {
        await service.stop();
    }
}

function fileBackendRpc(policy = "reuse") {
    const persist = {
        command: "create-file-thumbnail",
        method: "POST",
        request: { "file-id": "file-1", revn: 1, media: "<rendered png blob>" },
    };

    return {
        data: {
            command: "get-file-data-for-thumbnail",
            method: "GET",
            request: { "file-id": "file-1", "strip-frames-with-thumbnails": false },
        },
        persist: policy === "refresh" ? persist : null,
        cacheMissPersist: policy === "reuse" ? persist : null,
    };
}

function frameBackendRpc(policy = "refresh") {
    const persist = {
        command: "create-file-object-thumbnail",
        method: "POST",
        request: { "file-id": "file-1", "object-id": "file-1/page-1/frame-1/component", tag: "component", media: "<rendered png blob>" },
    };

    return {
        data: {
            command: "get-file-frame-data-for-thumbnail",
            method: "GET",
            request: { "file-id": "file-1", "page-id": "page-1", "object-id": "frame-1" },
        },
        persist: policy === "refresh" ? persist : null,
        cacheMissPersist: policy === "reuse" ? persist : null,
    };
}

function requestEnvelope(method, requestKeys, queryKeys = [], bodyKeys = [], transport = "penpot-rpc-json") {
    return {
        status: "planned-disabled",
        transport,
        method,
        requestKeys,
        queryKeys,
        bodyKeys,
        requestValuesIncluded: false,
        mediaValuesIncluded: false,
        tokenValuesIncluded: false,
        dispatch: false,
    };
}

function pipelineStage(name, condition, { entry = null, command = null, cacheProbe = null, runtime = null, status = "planned-disabled", dispatch = false } = {}) {
    return {
        name,
        status,
        condition,
        entry,
        command,
        cacheProbe,
        runtime,
        dispatch,
    };
}

function backendRpcPipeline(
    cachePolicy,
    orderedStages,
    { status = "planned-disabled", networkDispatch = false, cacheRead = false, dataRead = false, renderDispatch = false, persistWrite = false } = {}
) {
    return {
        status,
        cachePolicy,
        cacheHitShortCircuit: cachePolicy === "reuse",
        orderedStages,
        networkDispatch,
        cacheRead,
        dataRead,
        renderDispatch,
        persistWrite,
        sourceDataValuesIncluded: false,
        artifactValuesIncluded: false,
        tokenValuesIncluded: false,
    };
}

function backendRpcCacheProbe(strategy, scope, key, requestKeys, { status = "planned-disabled", command = null, endpoint = null, result = null, cacheRead = false, networkDispatch = false, dispatch = false } = {}) {
    return {
        status,
        strategy,
        condition: "before-source-data-read",
        scope,
        key,
        requestKeys,
        command,
        endpoint,
        hitResult: "resource-metadata",
        missResult: "continue-pipeline",
        result,
        cacheRead,
        networkDispatch,
        dispatch,
        cacheHitValuesIncluded: false,
        resourceValuesIncluded: false,
        mediaValuesIncluded: false,
        tokenValuesIncluded: false,
    };
}

function backendRpcRenderInput(cachePolicy = "reuse", { renderDispatch = false } = {}) {
    return {
        status: "source-data-ready",
        condition: "after-source-data-read",
        sourceDataRead: true,
        sourceDataEndpoint: "https://penpot.example.test/api/main/methods/get-file-data-for-thumbnail?_fmt=json",
        targetKind: "file",
        identityKeys: ["file-id", "revn"],
        revisionSource: "backend-source-data",
        requestRevision: "matched",
        revisionValueIncluded: false,
        cachePolicy,
        cacheScope: "file-thumbnail",
        cacheKey: "file:file-1:revn:1",
        artifactFormat: "png",
        artifactMimeType: "image/png",
        artifactWidth: 252,
        artifactHeight: 168,
        renderRuntime: "render-wasm-worker",
        renderFallback: "frontend-rasterizer",
        renderDispatch,
        sourceDataValuesIncluded: false,
        pageValuesIncluded: false,
        artifactValuesIncluded: false,
        mediaValuesIncluded: false,
        tokenValuesIncluded: false,
    };
}

function backendRpcFrameRenderInput({ renderDispatch = false, cachePolicy = "refresh" } = {}) {
    return {
        status: "source-data-ready",
        condition: "after-source-data-read",
        sourceDataRead: true,
        sourceDataEndpoint: "https://penpot.example.test/api/main/methods/get-file-frame-data-for-thumbnail?_fmt=json",
        targetKind: "frame",
        identityKeys: ["file-id", "page-id", "object-id"],
        revisionSource: "backend-source-data",
        requestRevision: "resolved",
        revisionValueIncluded: false,
        cachePolicy,
        cacheScope: "file-object-thumbnail",
        cacheKey: "file-1/page-1/frame-1/component",
        artifactFormat: "png",
        artifactMimeType: "image/png",
        artifactWidth: 320,
        artifactHeight: 200,
        renderRuntime: "render-wasm-worker",
        renderFallback: "frontend-rasterizer",
        renderDispatch,
        sourceDataValuesIncluded: false,
        pageValuesIncluded: false,
        artifactValuesIncluded: false,
        mediaValuesIncluded: false,
        tokenValuesIncluded: false,
    };
}

function backendRpcRenderOutput(byteLength, { runtime = "render-wasm-worker", fallbackUsed = false } = {}) {
    return {
        status: "artifact-ready",
        condition: "after-render",
        runtime,
        fallbackUsed,
        artifactFormat: "png",
        artifactMimeType: "image/png",
        artifactByteLength: byteLength,
        renderDispatch: true,
        localFileWrites: false,
        sourceDataValuesIncluded: false,
        pageValuesIncluded: false,
        artifactValuesIncluded: false,
        mediaValuesIncluded: false,
        tokenValuesIncluded: false,
    };
}

function backendRpcPersistOutput(
    byteLength,
    {
        entry = "cacheMissPersist",
        command = "create-file-thumbnail",
        endpoint = "https://penpot.example.test/api/main/methods/create-file-thumbnail?_fmt=json",
        targetKind = "file",
        identityKeys = ["file-id", "revn"],
        requestRevision = "matched",
        resourceFrom = "backend-create-file-thumbnail",
    } = {}
) {
    return {
        status: "persisted",
        condition: "after-render",
        entry,
        command,
        endpoint,
        targetKind,
        identityKeys,
        revisionSource: "backend-source-data",
        requestRevision,
        artifactFormat: "png",
        artifactMimeType: "image/png",
        artifactByteLength: byteLength,
        resourceFrom,
        persistWrite: true,
        localFileWrites: false,
        requestValuesIncluded: false,
        resourceValuesIncluded: false,
        mediaValuesIncluded: false,
        artifactValuesIncluded: false,
        tokenValuesIncluded: false,
    };
}

function assertBundledSceneBridgeContract(contract) {
    assert.deepEqual(contract, serviceModule.bundledSceneBridgeContract);
    assert.equal(contract.status, "planned-disabled");
    assert.equal(contract.contractVersion, "P26.32");
    assert.equal(contract.owner, "renderer-service");
    assert.equal(contract.mode, "metadata-only");
    assert.equal(contract.bridge, "browser-backed-service-adapter");
    assert.equal(contract.runtime, "render-wasm-worker");
    assert.equal(contract.fallback, "frontend-rasterizer");
    assert.equal(contract.adapterModule.exportName, "createBundledSceneBridgeRendererRuntime");
    assert.equal(contract.adapterModule.moduleImported, false);
    assert.equal(contract.adapterModule.runtimeRegistration, false);
    assert.equal(contract.adapterModule.valuesIncluded, false);
    assert.deepEqual(contract.assetPrerequisites.requiredAssetIds, serviceModule.bundledRuntimeBridgeAssetManifest.validation.requiredAssetIds);
    assert.deepEqual(
        contract.assetPrerequisites.requiredCacheOutputIds,
        serviceModule.bundledRuntimeBridgeAssetManifest.cacheOutputs.map((entry) => entry.id)
    );
    assert.equal(contract.assetPrerequisites.preflightRequired, true);
    assert.equal(contract.assetPrerequisites.approvalRequired, true);
    assert.equal(contract.assetPrerequisites.materializationWritesEnabled, false);
    assert.equal(contract.browserPageHandoff.activeEditorTabRequired, false);
    assert.equal(contract.browserPageHandoff.browserProcessStarted, false);
    assert.deepEqual(contract.renderInputContract.targetKinds, ["file", "frame"]);
    assert.equal(contract.renderInputContract.sourceDataValuesIncluded, false);
    assert.deepEqual(contract.renderOutputContract.allowedRuntimes, ["render-wasm-worker", "frontend-rasterizer"]);
    assert.equal(contract.renderOutputContract.nonEmptyPngRequired, true);
    assert.equal(contract.renderOutputContract.artifactBytesIncluded, false);
    assert.deepEqual(contract.diagnosticCodes, ["renderer_service_bundled_scene_bridge_contract_defined"]);
    assert.ok(contract.testMatrix.some((entry) => entry.id === "render-input-output-validation" && entry.dispatch === false));
    assert.equal(contract.sideEffects.browserProcessStarted, false);
    assert.equal(contract.sideEffects.runtimeAdapterImported, false);
    assert.equal(contract.sideEffects.localFileWrites, false);
    assert.equal(contract.redaction.pathValuesIncluded, false);
    assert.equal(contract.omitted.workspaceRoot, true);
    assert.equal(contract.omitted.sha256, true);
    assert.equal(contract.omitted.tokenValues, true);
    assert.equal(contract.execution, null);
    return contract;
}

function persistedThumbnailResponse(id = "persisted-thumbnail-png") {
    return new Response(
        JSON.stringify({
            id,
            uri: `https://penpot.example.test/assets/by-id/${id}`,
        }),
        { status: 200, headers: { "content-type": "application/json" } }
    );
}

test("noop host exposes the P25.24 health contract", async () => {
    await withService(async ({ host, port }) => {
        const response = await fetch(`http://${host}:${port}/health`);

        assert.equal(response.status, 200);
        assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8");
        const body = await response.json();
        assert.deepEqual(body, serviceModule.healthResponse);
        assert.ok(serviceModule.healthResponse.capabilities.includes("thumbnail.backend-rpc.frame-thumbnail-persist"));
        assert.ok(serviceModule.healthResponse.capabilities.includes("thumbnail.render.browser-fixture-runtime"));
        assert.ok(serviceModule.healthResponse.capabilities.includes("thumbnail.render.browser-fixture-runtime-diagnostics"));
        assert.ok(serviceModule.healthResponse.capabilities.includes("thumbnail.render.runtime-asset-manifest"));
        assert.ok(serviceModule.healthResponse.capabilities.includes("thumbnail.render.runtime-asset-preflight"));
        assert.ok(serviceModule.healthResponse.capabilities.includes("thumbnail.render.runtime-asset-materialization-dry-run"));
        assert.ok(serviceModule.healthResponse.capabilities.includes("thumbnail.render.runtime-asset-materialization-approval-scaffold"));
        assert.ok(serviceModule.healthResponse.capabilities.includes("thumbnail.render.bundled-scene-bridge-contract"));
        assert.deepEqual(body.browserFixtureRuntime, serviceModule.defaultBrowserFixtureRuntimeLifecycle);
        assertBrowserFixtureRuntimeLifecycle(body.browserFixtureRuntime);
        assertRuntimeAssetManifestScaffold(body.runtimeAssetManifest);
        assertRuntimeAssetMaterializationPreflightScaffold(body.runtimeAssetMaterializationPreflight);
        assertRuntimeAssetMaterializationDryRunPlan(body.runtimeAssetMaterializationDryRun);
        assertRuntimeAssetMaterializationApprovalPlan(body.runtimeAssetMaterializationApproval);
        assertBundledSceneBridgeContract(body.bundledSceneBridgeContract);
    });
});

test("noop host executes the P26.22 runtime asset preflight read-only ready slice", async () => {
    const fixture = await createRuntimePreflightFixture();
    const service = await serviceModule.startRendererService({
        port: 0,
        runtimeAssetPreflight: {
            executeReadOnly: true,
            workspaceRoot: fixture.workspaceRoot,
            cacheRoot: fixture.cacheRoot,
        },
        runtimeAssetMaterializationApproval: {
            modeConfigured: true,
            approvalTokenConfigured: true,
            auditConfigured: true,
        },
    });
    try {
        const response = await fetch(`http://${service.host}:${service.port}/health`);

        assert.equal(response.status, 200);
        const body = await response.json();
        const execution = assertRuntimeAssetPreflightExecution(body.runtimeAssetMaterializationPreflight, {
            workspaceRoot: fixture.workspaceRoot,
            cacheRoot: fixture.cacheRoot,
            readiness: "ready",
        });
        assert.equal(execution.summary.ready, true);
        assert.deepEqual(
            execution.summary.readyAssetIds,
            serviceModule.bundledRuntimeBridgeAssetManifest.assets.map((asset) => asset.id)
        );
        assert.deepEqual(execution.summary.missingAssetIds, []);
        assert.deepEqual(
            execution.summary.readyCacheOutputIds,
            serviceModule.bundledRuntimeBridgeAssetManifest.cacheOutputs.map((entry) => entry.id)
        );
        assert.deepEqual(execution.summary.missingCacheOutputIds, []);
        assert.deepEqual(execution.diagnostics, []);
        assert.deepEqual(execution.nextActions, []);
        assert.ok(execution.checks.every((check) => check.readiness === "ready"));
        assert.ok(execution.checks.every((check) => check.exists === true));
        assert.ok(execution.checks.every((check) => check.cacheOutputExists === true));
        assert.ok(execution.checks.every((check) => /^[a-f0-9]{64}$/.test(check.sha256)));
        assert.ok(execution.checks.every((check) => check.byteLength > 0));
        assert.ok(execution.checks.every((check) => check.fileRead === true));
        assert.ok(execution.checks.every((check) => check.hashComputed === true));
        assert.ok(execution.checks.every((check) => check.dispatch === false));
        assert.ok(execution.checks.every((check) => check.localFileWrites === false));
        assert.ok(execution.cacheOutputChecks.every((check) => check.readiness === "ready"));
        assert.ok(execution.cacheOutputChecks.every((check) => check.exists === true));
        assert.ok(execution.cacheOutputChecks.every((check) => check.writable === true));
        assert.ok(execution.cacheOutputChecks.every((check) => check.fileRead === false));
        assert.ok(execution.cacheOutputChecks.every((check) => check.localFileWrites === false));
        assert.equal(execution.sideEffects.fileRead, true);
        assert.equal(execution.sideEffects.hashComputed, true);
        const dryRun = assertRuntimeAssetMaterializationDryRunPlan(body.runtimeAssetMaterializationDryRun, {
            status: "ready",
            readiness: "ready",
            ready: true,
        });
        assert.ok(dryRun.copyPlan.every((entry) => entry.preflightReadiness === "ready"));
        assert.ok(dryRun.cacheOutputPlan.every((entry) => entry.preflightReadiness === "ready"));
        assert.deepEqual(dryRun.sourcePreflight.diagnosticCodes, []);
        const approval = assertRuntimeAssetMaterializationApprovalPlan(body.runtimeAssetMaterializationApproval, {
            readiness: "ready",
            ready: true,
            modeConfigured: true,
            approvalTokenConfigured: true,
            auditConfigured: true,
            expectedDiagnosticCodes: [
                "renderer_service_runtime_asset_materialization_approval_configuration_unsupported",
                "renderer_service_runtime_asset_materialization_approval_token_unsupported",
                "renderer_service_runtime_asset_materialization_approval_audit_unsupported",
            ],
        });
        assert.equal(approval.sourceDryRun.copyPlanCounts.ready, serviceModule.bundledRuntimeBridgeAssetManifest.assets.length);
        assert.equal(approval.sourceDryRun.cacheOutputPlanCounts.ready, serviceModule.bundledRuntimeBridgeAssetManifest.cacheOutputs.length);
        assert.equal(approval.approvalGate.writesEnabled, false);
    } finally {
        await service.stop();
        await fixture.cleanup();
    }
});

test("noop host reports degraded P26.22 runtime asset preflight readiness", async () => {
    const fixture = await createRuntimePreflightFixture({
        missingAssetIds: ["thumbnail-worker-main"],
        missingCacheAssetIds: ["render-wasm-loader"],
        missingCacheOutputIds: ["browser-profile-cache"],
    });
    const service = await serviceModule.startRendererService({
        port: 0,
        runtimeAssetPreflight: {
            executeReadOnly: true,
            workspaceRoot: fixture.workspaceRoot,
            cacheRoot: fixture.cacheRoot,
        },
        runtimeAssetMaterializationApproval: {
            modeConfigured: true,
            approvalTokenConfigured: true,
            auditConfigured: true,
        },
    });
    try {
        const response = await fetch(`http://${service.host}:${service.port}/health`);

        assert.equal(response.status, 200);
        const body = await response.json();
        const execution = assertRuntimeAssetPreflightExecution(body.runtimeAssetMaterializationPreflight, {
            workspaceRoot: fixture.workspaceRoot,
            cacheRoot: fixture.cacheRoot,
            readiness: "degraded",
        });
        assert.equal(execution.summary.ready, false);
        assert.ok(execution.summary.missingAssetIds.includes("thumbnail-worker-main"));
        assert.ok(execution.summary.missingAssetIds.includes("render-wasm-loader"));
        assert.ok(execution.summary.missingCacheOutputIds.includes("browser-profile-cache"));
        assert.deepEqual(
            execution.diagnostics.map((diagnostic) => diagnostic.code),
            [
                "renderer_service_runtime_asset_missing_public_asset",
                "renderer_service_runtime_asset_missing_cache_asset",
                "renderer_service_runtime_asset_cache_output_unavailable",
            ]
        );
        assert.deepEqual(
            execution.diagnostics.map((diagnostic) => diagnostic.severity),
            ["degraded", "degraded", "degraded"]
        );
        assert.equal(execution.diagnostics[0].assetId, "thumbnail-worker-main");
        assert.equal(execution.diagnostics[1].assetId, "render-wasm-loader");
        assert.equal(execution.diagnostics[2].cacheOutputId, "browser-profile-cache");
        assert.equal(JSON.stringify(execution.diagnostics).includes(fixture.workspaceRoot), false);
        assert.equal(JSON.stringify(execution.diagnostics).includes(fixture.cacheRoot), false);
        assert.ok(execution.nextActions.some((entry) => entry.includes("PENPOT_RENDERER_SERVICE_RUNTIME_ASSET_PREFLIGHT_WORKSPACE_ROOT")));
        assert.ok(execution.nextActions.some((entry) => entry.includes("PENPOT_RENDERER_SERVICE_RUNTIME_ASSET_PREFLIGHT_CACHE_ROOT")));

        const missingAsset = execution.checks.find((check) => check.assetId === "thumbnail-worker-main");
        assert.equal(missingAsset.readiness, "missing");
        assert.equal(missingAsset.exists, false);
        assert.equal(missingAsset.cacheOutputExists, false);
        assert.equal(missingAsset.sha256, null);
        assert.equal(missingAsset.byteLength, null);
        assert.equal(missingAsset.fileRead, false);
        assert.equal(missingAsset.hashComputed, false);

        const missingCacheAsset = execution.checks.find((check) => check.assetId === "render-wasm-loader");
        assert.equal(missingCacheAsset.readiness, "missing");
        assert.equal(missingCacheAsset.exists, true);
        assert.equal(missingCacheAsset.cacheOutputExists, false);
        assert.match(missingCacheAsset.sha256, /^[a-f0-9]{64}$/);

        const readyAsset = execution.checks.find((check) => check.assetId === "render-wasm-binary");
        assert.equal(readyAsset.readiness, "ready");
        assert.equal(readyAsset.exists, true);
        assert.equal(readyAsset.cacheOutputExists, true);
        assert.match(readyAsset.sha256, /^[a-f0-9]{64}$/);

        const missingCacheOutput = execution.cacheOutputChecks.find((check) => check.cacheOutputId === "browser-profile-cache");
        assert.equal(missingCacheOutput.readiness, "missing");
        assert.equal(missingCacheOutput.exists, false);
        assert.equal(missingCacheOutput.writable, false);
        assert.equal(missingCacheOutput.fileRead, false);
        assert.equal(missingCacheOutput.localFileWrites, false);
        const dryRun = assertRuntimeAssetMaterializationDryRunPlan(body.runtimeAssetMaterializationDryRun, {
            status: "degraded",
            readiness: "degraded",
            ready: false,
        });
        assert.ok(dryRun.sourcePreflight.missingAssetIds.includes("thumbnail-worker-main"));
        assert.ok(dryRun.sourcePreflight.missingCacheOutputIds.includes("browser-profile-cache"));
        assert.ok(dryRun.sourcePreflight.diagnosticCodes.includes("renderer_service_runtime_asset_missing_public_asset"));
        assert.ok(dryRun.sourcePreflight.diagnosticCodes.includes("renderer_service_runtime_asset_missing_cache_asset"));
        assert.ok(dryRun.sourcePreflight.diagnosticCodes.includes("renderer_service_runtime_asset_cache_output_unavailable"));
        assert.equal(dryRun.copyPlan.find((entry) => entry.assetId === "thumbnail-worker-main").preflightReadiness, "blocked");
        assert.equal(dryRun.cacheOutputPlan.find((entry) => entry.cacheOutputId === "browser-profile-cache").preflightReadiness, "blocked");
        const approval = assertRuntimeAssetMaterializationApprovalPlan(body.runtimeAssetMaterializationApproval, {
            readiness: "degraded",
            ready: false,
            modeConfigured: true,
            approvalTokenConfigured: true,
            auditConfigured: true,
            expectedDiagnosticCodes: [
                "renderer_service_runtime_asset_materialization_approval_configuration_unsupported",
                "renderer_service_runtime_asset_materialization_approval_token_unsupported",
                "renderer_service_runtime_asset_materialization_approval_audit_unsupported",
            ],
        });
        assert.ok(approval.sourceDryRun.diagnosticCodes.includes("renderer_service_runtime_asset_missing_public_asset"));
        assert.equal(approval.sourceDryRun.copyPlanCounts.blocked, 2);
        assert.equal(approval.sourceDryRun.cacheOutputPlanCounts.blocked, 1);
        assert.equal(approval.configuration.approvalToken.valueRead, false);
    } finally {
        await service.stop();
        await fixture.cleanup();
    }
});

test("noop host reads backend RPC planning base URI from environment", async () => {
    assert.deepEqual(serviceModule.readRendererServiceOptionsFromEnv({}), {
        host: "127.0.0.1",
        port: 6070,
    });

    assert.deepEqual(
        serviceModule.readRendererServiceOptionsFromEnv({
            PENPOT_RENDERER_SERVICE_HOST: "127.0.0.1",
            PENPOT_RENDERER_SERVICE_PORT: "6074",
            PENPOT_RENDERER_SERVICE_BACKEND_URI: "https://penpot.example.test/",
            PENPOT_RENDERER_SERVICE_RUNTIME_MODULE: " /tmp/renderer-runtime.mjs ",
            PENPOT_RENDERER_SERVICE_RUNTIME_ASSET_PREFLIGHT: "read-only",
            PENPOT_RENDERER_SERVICE_RUNTIME_ASSET_PREFLIGHT_WORKSPACE_ROOT: "/Users/fushilu/workspace/revocloud/penpot",
            PENPOT_RENDERER_SERVICE_RUNTIME_ASSET_PREFLIGHT_CACHE_ROOT: "/Volumes/fushilu/.caches/penpot/renderer-service",
        }),
        {
            host: "127.0.0.1",
            port: 6074,
            backendRpc: {
                baseUri: "https://penpot.example.test",
            },
            rendererRuntimeModule: "/tmp/renderer-runtime.mjs",
            runtimeAssetPreflight: {
                executeReadOnly: true,
                workspaceRoot: "/Users/fushilu/workspace/revocloud/penpot",
                cacheRoot: "/Volumes/fushilu/.caches/penpot/renderer-service",
            },
        }
    );

    assert.deepEqual(
        serviceModule.readRendererServiceOptionsFromEnv({
            PENPOT_RENDERER_SERVICE_BROWSER_FIXTURE_RUNTIME: " enabled ",
        }),
        {
            host: "127.0.0.1",
            port: 6070,
            browserFixtureRuntime: true,
        }
    );

    assert.deepEqual(
        serviceModule.readRendererServiceOptionsFromEnv({
            PENPOT_RENDERER_SERVICE_BACKEND_URI: "",
            PENPOT_BACKEND_URI: "http://127.0.0.1:6060/",
        }).backendRpc,
        {
            baseUri: "http://127.0.0.1:6060",
        }
    );

    assert.throws(
        () => serviceModule.readRendererServiceOptionsFromEnv({ PENPOT_RENDERER_SERVICE_BACKEND_URI: "file:///tmp/backend" }),
        /backend RPC baseUri must be an absolute HTTP\(S\) URL/
    );
    assert.throws(
        () =>
            serviceModule.readRendererServiceOptionsFromEnv({
                PENPOT_RENDERER_SERVICE_BROWSER_FIXTURE_RUNTIME: "true",
            }),
        /PENPOT_RENDERER_SERVICE_BROWSER_FIXTURE_RUNTIME must be set to enabled/
    );
    assert.throws(
        () =>
            serviceModule.readRendererServiceOptionsFromEnv({
                PENPOT_RENDERER_SERVICE_BROWSER_FIXTURE_RUNTIME: "enabled",
                PENPOT_RENDERER_SERVICE_RUNTIME_MODULE: "/tmp/renderer-runtime.mjs",
            }),
        /PENPOT_RENDERER_SERVICE_BROWSER_FIXTURE_RUNTIME cannot be combined with PENPOT_RENDERER_SERVICE_RUNTIME_MODULE/
    );
    assert.throws(
        () =>
            serviceModule.readRendererServiceOptionsFromEnv({
                PENPOT_RENDERER_SERVICE_RUNTIME_ASSET_PREFLIGHT: "true",
                PENPOT_RENDERER_SERVICE_RUNTIME_ASSET_PREFLIGHT_WORKSPACE_ROOT: "/Users/fushilu/workspace/revocloud/penpot",
            }),
        /PENPOT_RENDERER_SERVICE_RUNTIME_ASSET_PREFLIGHT must be set to read-only/
    );
    assert.throws(
        () =>
            serviceModule.readRendererServiceOptionsFromEnv({
                PENPOT_RENDERER_SERVICE_RUNTIME_ASSET_PREFLIGHT: "read-only",
            }),
        /runtime asset preflight root is required/
    );
    assert.throws(
        () =>
            serviceModule.readRendererServiceOptionsFromEnv({
                PENPOT_RENDERER_SERVICE_RUNTIME_ASSET_PREFLIGHT: "read-only",
                PENPOT_RENDERER_SERVICE_RUNTIME_ASSET_PREFLIGHT_WORKSPACE_ROOT: "relative-workspace",
            }),
        /runtime asset preflight root must be an absolute path/
    );
});

test("noop host reports unsupported P26.28 runtime asset materialization approval configuration attempts", async () => {
    const options = serviceModule.readRendererServiceOptionsFromEnv({
        PENPOT_RENDERER_SERVICE_RUNTIME_ASSET_MATERIALIZATION_APPROVAL: "approved",
        PENPOT_RENDERER_SERVICE_RUNTIME_ASSET_MATERIALIZATION_APPROVAL_TOKEN: "secret-approval-token",
        PENPOT_RENDERER_SERVICE_RUNTIME_ASSET_MATERIALIZATION_APPROVAL_AUDIT_DIR: "/tmp/secret-approval-audit",
    });
    assert.deepEqual(options.runtimeAssetMaterializationApproval, {
        modeConfigured: true,
        approvalTokenConfigured: true,
        auditConfigured: true,
    });

    const service = await serviceModule.startRendererService({
        ...options,
        port: 0,
    });
    try {
        const response = await fetch(`http://${service.host}:${service.port}/health`);

        assert.equal(response.status, 200);
        const body = await response.json();
        const approval = assertRuntimeAssetMaterializationApprovalPlan(body.runtimeAssetMaterializationApproval, {
            modeConfigured: true,
            approvalTokenConfigured: true,
            auditConfigured: true,
            expectedDiagnosticCodes: [
                "renderer_service_runtime_asset_materialization_approval_configuration_unsupported",
                "renderer_service_runtime_asset_materialization_approval_token_unsupported",
                "renderer_service_runtime_asset_materialization_approval_audit_unsupported",
            ],
        });
        assert.deepEqual(
            approval.diagnostics.map((diagnostic) => diagnostic.field),
            ["mode", "approvalToken", "audit"]
        );
        assert.equal(approval.configuration.mode.valueRead, false);
        assert.equal(approval.configuration.approvalToken.valueRead, false);
        assert.equal(approval.configuration.approvalToken.accepted, false);
        assert.equal(approval.configuration.approvalToken.consumed, false);
        assert.equal(approval.configuration.audit.valueRead, false);
        assert.equal(approval.configuration.audit.recordWrites, false);
        assert.equal(approval.audit.auditStorageConfigured, false);
        assert.equal(approval.audit.auditRecordWritten, false);
        assert.equal(approval.sideEffects.approvalTokenRead, false);
        assert.equal(approval.sideEffects.auditRecordWritten, false);
        assert.equal(approval.omitted.approvalTokenValues, true);
        assert.equal(approval.omitted.approvalAuditPaths, true);
        assert.equal(JSON.stringify(body).includes("secret-approval-token"), false);
        assert.equal(JSON.stringify(body).includes("/tmp/secret-approval-audit"), false);
    } finally {
        await service.stop();
    }
});

test("noop host enables runtime asset preflight execution from environment", async () => {
    const fixture = await createRuntimePreflightFixture();
    const options = serviceModule.readRendererServiceOptionsFromEnv({
        PENPOT_RENDERER_SERVICE_RUNTIME_ASSET_PREFLIGHT: "read-only",
        PENPOT_RENDERER_SERVICE_RUNTIME_ASSET_PREFLIGHT_WORKSPACE_ROOT: fixture.workspaceRoot,
        PENPOT_RENDERER_SERVICE_RUNTIME_ASSET_PREFLIGHT_CACHE_ROOT: fixture.cacheRoot,
    });
    assert.deepEqual(options.runtimeAssetPreflight, {
        executeReadOnly: true,
        workspaceRoot: fixture.workspaceRoot,
        cacheRoot: fixture.cacheRoot,
    });

    const service = await serviceModule.startRendererService({
        ...options,
        port: 0,
    });
    try {
        const response = await fetch(`http://${service.host}:${service.port}/health`);
        assert.equal(response.status, 200);
        const body = await response.json();
        const execution = assertRuntimeAssetPreflightExecution(body.runtimeAssetMaterializationPreflight, {
            workspaceRoot: fixture.workspaceRoot,
            cacheRoot: fixture.cacheRoot,
            readiness: "ready",
        });
        assert.equal(execution.summary.ready, true);
    } finally {
        await service.stop();
        await fixture.cleanup();
    }
});

test("noop host loads renderer runtime adapter modules from environment", async () => {
    const runtimeDir = await mkdtemp(join(tmpdir(), "penpot-renderer-runtime-"));
    const runtimeModulePath = join(runtimeDir, "runtime.mjs");
    await writeFile(
        runtimeModulePath,
        `
import { Buffer } from "node:buffer";

export default {
    async renderThumbnail(input) {
        if (input.sourceData.page.id !== "page-secret") {
            throw new Error("unexpected source data");
        }
        return {
            png: Buffer.from("${pngFixture.toString("base64")}", "base64"),
            runtime: "frontend-rasterizer",
            fallbackUsed: true
        };
    }
};
`
    );

    let service = null;
    try {
        const options = serviceModule.readRendererServiceOptionsFromEnv({
            PENPOT_RENDERER_SERVICE_BACKEND_URI: "https://penpot.example.test/",
            PENPOT_RENDERER_SERVICE_RUNTIME_MODULE: runtimeModulePath,
        });
        assert.equal(options.rendererRuntimeModule, runtimeModulePath);

        service = await serviceModule.startRendererService({
            ...options,
            port: 0,
            backendRpc: {
                ...options.backendRpc,
                fetch: async (url) => {
                    if (String(url).includes("create-file-thumbnail")) {
                        return persistedThumbnailResponse("persisted-runtime-module-thumbnail-png");
                    }
                    if (String(url).includes("get-file-data-for-thumbnail")) {
                        return new Response(JSON.stringify({ "file-id": "file-1", revn: 1, page: { id: "page-secret", objects: {} } }), {
                            status: 200,
                            headers: { "content-type": "application/json" },
                        });
                    }
                    return new Response(JSON.stringify({ hit: false, "file-id": "file-1", revn: 1 }), {
                        status: 200,
                        headers: { "content-type": "application/json" },
                    });
                },
            },
        });

        const response = await postValidFileThumbnail(service.host, service.port);
        assert.equal(response.status, 200);
        const body = await response.json();
        assert.equal(body.backendRpcClient.status, "persist-executed");
        assert.deepEqual(
            body.backendRpcClient.renderOutput,
            backendRpcRenderOutput(pngFixture.byteLength, { runtime: "frontend-rasterizer", fallbackUsed: true })
        );
        assert.deepEqual(
            body.backendRpcClient.persistOutput,
            backendRpcPersistOutput(pngFixture.byteLength)
        );
        assert.deepEqual(body.renderer, {
            runtime: "frontend-rasterizer",
            fallbackUsed: true,
        });
        assert.deepEqual(body.resource, {
            mediaId: "persisted-runtime-module-thumbnail-png",
            resourceUri: "/assets/by-id/persisted-runtime-module-thumbnail-png",
            downloadUri: "https://penpot.example.test/assets/by-id/persisted-runtime-module-thumbnail-png",
            contentType: "image/png",
        });
        assert.equal(JSON.stringify(body).includes("page-secret"), false);
    } finally {
        if (service) {
            await service.stop();
        }
        await rm(runtimeDir, { recursive: true, force: true });
    }
});

test("noop host rejects invalid renderer runtime adapter modules", async () => {
    const runtimeDir = await mkdtemp(join(tmpdir(), "penpot-renderer-runtime-"));
    const runtimeModulePath = join(runtimeDir, "runtime.mjs");
    await writeFile(runtimeModulePath, "export const notRenderer = true;\n");

    try {
        await assert.rejects(
            () => serviceModule.loadRendererRuntimeAdapterModule(runtimeModulePath),
            /runtime module must export a renderThumbnail function/
        );
        await assert.rejects(
            () => serviceModule.loadRendererRuntimeAdapterModule("relative-runtime.mjs"),
            /runtime module must be an absolute file path/
        );
    } finally {
        await rm(runtimeDir, { recursive: true, force: true });
    }
});

test("noop host calls renderer runtime adapter close hooks on stop", async () => {
    const runtimeDir = await mkdtemp(join(tmpdir(), "penpot-renderer-runtime-"));
    const runtimeModulePath = join(runtimeDir, "runtime.mjs");
    const runtimeModuleUrl = pathToFileURL(runtimeModulePath).href;
    await writeFile(
        runtimeModulePath,
        `
export let closeCount = 0;

export async function renderThumbnail() {
    throw new Error("render should not run in close hook test");
}

export function close() {
    closeCount += 1;
}
`
    );

    let service = null;
    try {
        service = await serviceModule.startRendererService({
            port: 0,
            rendererRuntimeModule: runtimeModulePath,
        });
        await service.stop();
        service = null;
        const runtimeModule = await import(runtimeModuleUrl);
        assert.equal(runtimeModule.closeCount, 1);
    } finally {
        if (service) {
            await service.stop();
        }
        await rm(runtimeDir, { recursive: true, force: true });
    }
});

test("browser fixture runtime renders non-empty PNGs and closes", async () => {
    const runtime = await serviceModule.createBrowserFixtureRendererRuntime();
    try {
        assertBrowserFixtureRuntimeLifecycle(runtime.browserFixtureRuntimeLifecycle(), {
            status: "started",
            runtimeSource: "browser-fixture",
            configured: true,
            enabled: true,
            processStarted: true,
        });

        const first = await runtime.renderThumbnail(browserFixtureRuntimeInput());
        const firstBytes = assertPngBytes(first.png);
        assert.equal(first.runtime, "frontend-rasterizer");
        assert.equal(first.fallbackUsed, true);
        assertBrowserFixtureRuntimeLifecycle(runtime.browserFixtureRuntimeLifecycle(), {
            status: "started",
            runtimeSource: "browser-fixture",
            configured: true,
            enabled: true,
            processStarted: true,
            renderAttempts: 1,
            renderSuccesses: 1,
            pageCreateCount: 1,
            nonEmptyPngValidated: true,
        });

        const second = await runtime.renderThumbnail(browserFixtureRuntimeInput({ cachePolicy: "refresh" }));
        const secondBytes = assertPngBytes(second.png);
        assert.equal(second.runtime, "frontend-rasterizer");
        assert.equal(second.fallbackUsed, true);
        assert.notEqual(secondBytes.toString("base64"), firstBytes.toString("base64"));
        assertBrowserFixtureRuntimeLifecycle(runtime.browserFixtureRuntimeLifecycle(), {
            status: "started",
            runtimeSource: "browser-fixture",
            configured: true,
            enabled: true,
            processStarted: true,
            renderAttempts: 2,
            renderSuccesses: 2,
            pageCreateCount: 1,
            pageReuseValidated: true,
            nonEmptyPngValidated: true,
        });
    } finally {
        await runtime.close();
    }

    assertBrowserFixtureRuntimeLifecycle(runtime.browserFixtureRuntimeLifecycle(), {
        status: "closed",
        runtimeSource: "browser-fixture",
        configured: true,
        enabled: true,
        processStarted: true,
        renderAttempts: 2,
        renderSuccesses: 2,
        pageCreateCount: 1,
        pageReuseValidated: true,
        nonEmptyPngValidated: true,
        closeAttempted: true,
        closeSucceeded: true,
    });

    await assert.rejects(
        () => runtime.renderThumbnail(browserFixtureRuntimeInput()),
        /browser fixture runtime is closed/
    );
});

test("noop host renders through explicitly enabled browser fixture runtime", async () => {
    const options = serviceModule.readRendererServiceOptionsFromEnv({
        PENPOT_RENDERER_SERVICE_BACKEND_URI: "https://penpot.example.test/",
        PENPOT_RENDERER_SERVICE_BROWSER_FIXTURE_RUNTIME: "enabled",
    });
    assert.equal(options.browserFixtureRuntime, true);

    const fetchCalls = [];
    let persistCount = 0;
    const service = await serviceModule.startRendererService({
        ...options,
        port: 0,
        backendRpc: {
            ...options.backendRpc,
            fetch: async (url, init) => {
                fetchCalls.push({ url: String(url), init });
                if (String(url).includes("create-file-thumbnail")) {
                    persistCount += 1;
                    return persistedThumbnailResponse(`persisted-browser-fixture-thumbnail-${persistCount}`);
                }
                if (String(url).includes("get-file-data-for-thumbnail")) {
                    return new Response(
                        JSON.stringify({
                            "file-id": "file-1",
                            revn: 1,
                            page: { id: "page-secret", objects: {} },
                        }),
                        { status: 200, headers: { "content-type": "application/json" } }
                    );
                }
                return new Response(
                    JSON.stringify({
                        hit: false,
                        "file-id": "file-1",
                        revn: 1,
                    }),
                    { status: 200, headers: { "content-type": "application/json" } }
                );
            },
        },
    });

    try {
        const healthResponse = await fetch(`http://${service.host}:${service.port}/health`);
        assert.equal(healthResponse.status, 200);
        const healthBody = await healthResponse.json();
        assertBrowserFixtureRuntimeLifecycle(healthBody.browserFixtureRuntime, {
            status: "started",
            runtimeSource: "browser-fixture",
            configured: true,
            enabled: true,
            processStarted: true,
        });

        const expectedMediaIds = ["persisted-browser-fixture-thumbnail-1", "persisted-browser-fixture-thumbnail-2"];
        for (let index = 0; index < expectedMediaIds.length; index += 1) {
            const mediaId = expectedMediaIds[index];
            const response = await postValidFileThumbnail(service.host, service.port);
            assert.equal(response.status, 200);
            const body = await response.json();
            const renderOutput = body.backendRpcClient.renderOutput;
            const persistOutput = body.backendRpcClient.persistOutput;

            assert.equal(body.backendRpcClient.status, "persist-executed");
            assert.equal(body.backendRpcClient.pipeline.renderDispatch, true);
            assert.equal(body.backendRpcClient.pipeline.persistWrite, true);
            assert.equal(renderOutput.runtime, "frontend-rasterizer");
            assert.equal(renderOutput.fallbackUsed, true);
            assert.ok(renderOutput.artifactByteLength > 8);
            assert.equal(persistOutput.artifactByteLength, renderOutput.artifactByteLength);
            assert.deepEqual(body.renderer, {
                runtime: "frontend-rasterizer",
                fallbackUsed: true,
            });
            assert.equal(body.resource.mediaId, mediaId);
            assertBrowserFixtureRuntimeLifecycle(body.browserFixtureRuntime, {
                status: "started",
                runtimeSource: "browser-fixture",
                configured: true,
                enabled: true,
                processStarted: true,
                renderAttempts: index + 1,
                renderSuccesses: index + 1,
                pageCreateCount: 1,
                pageReuseValidated: index > 0,
                nonEmptyPngValidated: true,
            });
            assert.equal(JSON.stringify(body).includes("page-secret"), false);
        }
        assert.equal(fetchCalls.length, 6);
    } finally {
        await service.stop();
    }
});

test("noop host executes configured file thumbnail cache probe and returns cache hits", async () => {
    const fetchCalls = [];
    const options = serviceModule.readRendererServiceOptionsFromEnv({
        PENPOT_RENDERER_SERVICE_BACKEND_URI: "https://penpot.example.test/",
    });
    const service = await serviceModule.startRendererService({
        ...options,
        port: 0,
        backendRpc: {
            ...options.backendRpc,
            fetch: async (url, init) => {
                fetchCalls.push({ url: String(url), init });
                return new Response(
                    JSON.stringify({
                        hit: true,
                        "file-id": "file-1",
                        revn: 1,
                        "media-id": "cached-thumbnail-png",
                        uri: "https://penpot.example.test/assets/by-id/cached-thumbnail-png",
                    }),
                    { status: 200, headers: { "content-type": "application/json" } }
                );
            },
        },
    });
    try {
        const response = await postValidFileThumbnail(service.host, service.port, {
            "content-type": "application/json",
            authorization: "Bearer service-secret-token",
            cookie: "auth-token=service-secret-token",
        });

        assert.equal(response.status, 200);
        const body = await response.json();
        assert.equal(body.backendRpcClient.status, "cache-probe-executed");
        assert.equal(body.backendRpcClient.baseUriConfigured, true);
        assert.equal(body.backendRpcClient.baseUri, "https://penpot.example.test");
        assert.equal(body.backendRpcClient.networkDispatch, true);
        assert.equal(body.backendRpcClient.cacheRead, true);
        assert.equal(body.backendRpcClient.dataRead, false);
        assert.equal(body.backendRpcClient.persistWrite, false);
        assert.equal(body.backendRpcClient.cacheProbe.status, "executed");
        assert.equal(body.backendRpcClient.cacheProbe.command, "get-file-thumbnail");
        assert.equal(body.backendRpcClient.cacheProbe.endpoint, "https://penpot.example.test/api/main/methods/get-file-thumbnail?_fmt=json");
        assert.equal(body.backendRpcClient.cacheProbe.result, "hit");
        assert.equal(body.backendRpcClient.cacheProbe.resourceUri, undefined);
        assert.equal(body.backendRpcClient.cacheProbe.mediaId, undefined);
        assert.equal(body.backendRpcClient.pipeline.status, "cache-probe-executed");
        assert.equal(body.backendRpcClient.pipeline.networkDispatch, true);
        assert.equal(body.backendRpcClient.pipeline.cacheRead, true);
        assert.equal(body.backendRpcClient.pipeline.dataRead, false);
        assert.equal(body.backendRpcClient.pipeline.renderDispatch, false);
        assert.equal(body.backendRpcClient.pipeline.persistWrite, false);
        assert.equal(body.backendRpcClient.renderInput, null);
        assert.equal(body.backendRpcClient.renderOutput, null);
        assert.equal(body.backendRpcClient.persistOutput, null);
        assert.equal(body.cache.outcome, "hit");
        assert.deepEqual(body.resource, {
            mediaId: "cached-thumbnail-png",
            resourceUri: "/assets/by-id/cached-thumbnail-png",
            downloadUri: "https://penpot.example.test/assets/by-id/cached-thumbnail-png",
            contentType: "image/png",
        });
        assert.deepEqual(body.renderer, {
            runtime: null,
            fallbackUsed: false,
        });
        assert.equal(JSON.stringify(body).includes("service-secret-token"), false);
        assert.equal(fetchCalls.length, 1);
        assert.equal(fetchCalls[0].url, "https://penpot.example.test/api/main/methods/get-file-thumbnail?_fmt=json&file-id=file-1&revn=1");
        assert.equal(fetchCalls[0].init.method, "GET");
        assert.equal(fetchCalls[0].init.headers.authorization, "Bearer service-secret-token");
        assert.equal(fetchCalls[0].init.headers.cookie, "auth-token=service-secret-token");
    } finally {
        await service.stop();
    }
});

test("noop host continues the no-op render path after configured cache probe misses", async () => {
    const fetchCalls = [];
    const service = await serviceModule.startRendererService({
        port: 0,
        backendRpc: {
            baseUri: "https://penpot.example.test",
            fetch: async (url, init) => {
                fetchCalls.push({ url: String(url), init });
                if (String(url).includes("get-file-data-for-thumbnail")) {
                    return new Response(
                        JSON.stringify({
                            "file-id": "file-1",
                            revn: 1,
                            page: { id: "page-1", objects: {} },
                        }),
                        { status: 200, headers: { "content-type": "application/json" } }
                    );
                }
                return new Response(
                    JSON.stringify({
                        hit: false,
                        "file-id": "file-1",
                        revn: 1,
                    }),
                    { status: 200, headers: { "content-type": "application/json" } }
                );
            },
        },
    });
    try {
        const response = await postValidFileThumbnail(service.host, service.port);

        assert.equal(response.status, 200);
        const body = await response.json();
        assert.equal(body.backendRpcClient.status, "source-data-read-executed");
        assert.equal(body.backendRpcClient.dataRead, true);
        assert.equal(body.backendRpcClient.networkDispatch, true);
        assert.equal(body.backendRpcClient.cacheProbe.status, "executed");
        assert.equal(body.backendRpcClient.cacheProbe.result, "miss");
        assert.equal(body.backendRpcClient.cacheProbe.cacheRead, true);
        assert.equal(body.backendRpcClient.cacheProbe.networkDispatch, true);
        assert.equal(body.backendRpcClient.pipeline.status, "source-data-read-executed");
        assert.equal(body.backendRpcClient.pipeline.networkDispatch, true);
        assert.equal(body.backendRpcClient.pipeline.dataRead, true);
        assert.equal(body.backendRpcClient.pipeline.orderedStages[0].status, "executed");
        assert.equal(body.backendRpcClient.pipeline.orderedStages[0].dispatch, true);
        assert.equal(body.backendRpcClient.pipeline.orderedStages[1].status, "executed");
        assert.equal(body.backendRpcClient.pipeline.orderedStages[1].dispatch, true);
        assert.equal(body.backendRpcClient.pipeline.renderDispatch, false);
        assert.equal(body.backendRpcClient.pipeline.persistWrite, false);
        assert.equal(body.backendRpcClient.pipeline.sourceDataValuesIncluded, false);
        assert.deepEqual(body.backendRpcClient.renderInput, backendRpcRenderInput("reuse"));
        assert.equal(body.backendRpcClient.renderOutput, null);
        assert.equal(body.backendRpcClient.persistOutput, null);
        assert.deepEqual(body.cache, {
            outcome: "rendered",
            policy: "reuse",
            scope: "file-thumbnail",
            key: "file:file-1:revn:1",
            probe: "file-thumbnail-by-file-id-and-revn",
        });
        assert.equal(body.resource.mediaId, "noop-thumbnail-png");
        assert.equal(body.resource.resourceUri, "/assets/by-id/noop-thumbnail-png");
        assert.equal(body.resource.downloadUri, `http://${service.host}:${service.port}/assets/by-id/noop-thumbnail-png`);
        assert.deepEqual(body.renderer, {
            runtime: "noop-png-fixture",
            fallbackUsed: false,
        });
        assert.equal(JSON.stringify(body).includes("page-1"), false);
        assert.equal(fetchCalls.length, 2);
        assert.equal(fetchCalls[0].url, "https://penpot.example.test/api/main/methods/get-file-thumbnail?_fmt=json&file-id=file-1&revn=1");
        assert.equal(fetchCalls[1].url, "https://penpot.example.test/api/main/methods/get-file-data-for-thumbnail?_fmt=json&file-id=file-1&strip-frames-with-thumbnails=false");
        assert.equal(fetchCalls[1].init.method, "GET");
    } finally {
        await service.stop();
    }
});

test("noop host executes configured file thumbnail source-data reads for refresh requests", async () => {
    const fetchCalls = [];
    const service = await serviceModule.startRendererService({
        port: 0,
        backendRpc: {
            baseUri: "https://penpot.example.test",
            fetch: async (url, init) => {
                fetchCalls.push({ url: String(url), init });
                return new Response(
                    JSON.stringify({
                        "file-id": "file-1",
                        revn: 1,
                        page: { id: "page-1", objects: {} },
                    }),
                    { status: 200, headers: { "content-type": "application/json" } }
                );
            },
        },
    });
    try {
        const response = await fetch(`http://${service.host}:${service.port}/thumbnail`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                operation: "thumbnail.render",
                target: { kind: "file", fileId: "file-1", revn: 1 },
                artifact: { format: "png", mimeType: "image/png", extension: ".png", width: 252, height: 168 },
                cache: { policy: "refresh", scope: "file-thumbnail", key: "file:file-1:revn:1" },
                backendRpc: fileBackendRpc("refresh"),
                render: { required: true, runtime: "render-wasm-worker", fallback: "frontend-rasterizer" },
            }),
        });

        assert.equal(response.status, 200);
        const body = await response.json();
        assert.equal(body.backendRpcClient.status, "source-data-read-executed");
        assert.equal(body.backendRpcClient.networkDispatch, true);
        assert.equal(body.backendRpcClient.cacheRead, false);
        assert.equal(body.backendRpcClient.dataRead, true);
        assert.equal(body.backendRpcClient.cacheProbe, null);
        assert.equal(body.backendRpcClient.pipeline.status, "source-data-read-executed");
        assert.equal(body.backendRpcClient.pipeline.cacheRead, false);
        assert.equal(body.backendRpcClient.pipeline.dataRead, true);
        assert.equal(body.backendRpcClient.pipeline.orderedStages[0].status, "executed");
        assert.equal(body.backendRpcClient.pipeline.orderedStages[0].dispatch, true);
        assert.equal(body.backendRpcClient.pipeline.renderDispatch, false);
        assert.equal(body.backendRpcClient.pipeline.persistWrite, false);
        assert.equal(body.backendRpcClient.pipeline.sourceDataValuesIncluded, false);
        assert.deepEqual(body.backendRpcClient.renderInput, backendRpcRenderInput("refresh"));
        assert.equal(body.backendRpcClient.renderOutput, null);
        assert.equal(body.backendRpcClient.persistOutput, null);
        assert.deepEqual(body.cache, {
            outcome: "rendered",
            policy: "refresh",
            scope: "file-thumbnail",
            key: "file:file-1:revn:1",
            probe: null,
        });
        assert.equal(JSON.stringify(body).includes("page-1"), false);
        assert.equal(fetchCalls.length, 1);
        assert.equal(fetchCalls[0].url, "https://penpot.example.test/api/main/methods/get-file-data-for-thumbnail?_fmt=json&file-id=file-1&strip-frames-with-thumbnails=false");
        assert.equal(fetchCalls[0].init.method, "GET");
    } finally {
        await service.stop();
    }
});

test("noop host persists injected renderer runtime adapter PNGs after source-data reads", async () => {
    const fetchCalls = [];
    const renderInputs = [];
    const service = await serviceModule.startRendererService({
        port: 0,
        backendRpc: {
            baseUri: "https://penpot.example.test",
            fetch: async (url, init) => {
                fetchCalls.push({ url: String(url), init });
                if (String(url).includes("create-file-thumbnail")) {
                    return persistedThumbnailResponse();
                }
                if (String(url).includes("get-file-data-for-thumbnail")) {
                    return new Response(
                        JSON.stringify({
                            "file-id": "file-1",
                            revn: 1,
                            page: { id: "page-secret", objects: {} },
                        }),
                        { status: 200, headers: { "content-type": "application/json" } }
                    );
                }
                return new Response(
                    JSON.stringify({
                        hit: false,
                        "file-id": "file-1",
                        revn: 1,
                    }),
                    { status: 200, headers: { "content-type": "application/json" } }
                );
            },
        },
        renderer: {
            renderThumbnail: async (input) => {
                renderInputs.push(input);
                return {
                    png: pngFixture,
                    runtime: "render-wasm-worker",
                    fallbackUsed: false,
                };
            },
        },
    });
    try {
        const response = await postValidFileThumbnail(service.host, service.port);

        assert.equal(response.status, 200);
        const body = await response.json();
        assert.equal(body.backendRpcClient.status, "persist-executed");
        assert.equal(body.backendRpcClient.pipeline.status, "persist-executed");
        assert.equal(body.backendRpcClient.pipeline.renderDispatch, true);
        assert.equal(body.backendRpcClient.pipeline.persistWrite, true);
        assert.equal(body.backendRpcClient.pipeline.orderedStages[2].name, "render");
        assert.equal(body.backendRpcClient.pipeline.orderedStages[2].status, "executed");
        assert.equal(body.backendRpcClient.pipeline.orderedStages[2].dispatch, true);
        assert.equal(body.backendRpcClient.pipeline.orderedStages[3].name, "thumbnail-persist");
        assert.equal(body.backendRpcClient.pipeline.orderedStages[3].status, "executed");
        assert.equal(body.backendRpcClient.pipeline.orderedStages[3].dispatch, true);
        assert.deepEqual(body.backendRpcClient.renderInput, backendRpcRenderInput("reuse", { renderDispatch: true }));
        assert.deepEqual(body.backendRpcClient.renderOutput, backendRpcRenderOutput(pngFixture.byteLength));
        assert.deepEqual(body.backendRpcClient.persistOutput, backendRpcPersistOutput(pngFixture.byteLength));
        assert.deepEqual(body.renderer, {
            runtime: "render-wasm-worker",
            fallbackUsed: false,
        });
        assert.deepEqual(body.resource, {
            mediaId: "persisted-thumbnail-png",
            resourceUri: "/assets/by-id/persisted-thumbnail-png",
            downloadUri: "https://penpot.example.test/assets/by-id/persisted-thumbnail-png",
            contentType: "image/png",
        });
        assert.equal(JSON.stringify(body).includes("page-secret"), false);
        assert.equal(JSON.stringify(body).includes(pngFixture.toString("base64")), false);

        assert.equal(renderInputs.length, 1);
        assert.equal(renderInputs[0].target.fileId, "file-1");
        assert.equal(renderInputs[0].sourceData.fileId, "file-1");
        assert.equal(renderInputs[0].sourceData.revn, 1);
        assert.deepEqual(renderInputs[0].sourceData.page, { id: "page-secret", objects: {} });
        assert.equal(renderInputs[0].artifact.width, 252);
        assert.equal(renderInputs[0].artifact.height, 168);
        assert.equal(fetchCalls.length, 3);
        assert.equal(fetchCalls[2].url, "https://penpot.example.test/api/main/methods/create-file-thumbnail?_fmt=json&file-id=file-1&revn=1");
        assert.equal(fetchCalls[2].init.method, "POST");
        assert.equal(fetchCalls[2].init.headers["content-type"], undefined);
        const media = fetchCalls[2].init.body.get("media");
        assert.equal(media.type, "image/png");
        assert.equal(Buffer.from(await media.arrayBuffer()).equals(pngFixture), true);
    } finally {
        await service.stop();
    }
});

test("noop host returns retryable errors when configured thumbnail persist dispatch fails", async () => {
    const service = await serviceModule.startRendererService({
        port: 0,
        backendRpc: {
            baseUri: "https://penpot.example.test",
            fetch: async (url) => {
                if (String(url).includes("create-file-thumbnail")) {
                    return new Response("backend unavailable", { status: 503 });
                }
                if (String(url).includes("get-file-thumbnail")) {
                    return new Response(JSON.stringify({ hit: false, "file-id": "file-1", revn: 1 }), {
                        status: 200,
                        headers: { "content-type": "application/json" },
                    });
                }
                return new Response(JSON.stringify({ "file-id": "file-1", revn: 1, page: { id: "page-secret", objects: {} } }), {
                    status: 200,
                    headers: { "content-type": "application/json" },
                });
            },
        },
        renderer: {
            renderThumbnail: async () => ({
                png: pngFixture,
                runtime: "render-wasm-worker",
                fallbackUsed: false,
            }),
        },
    });
    try {
        const response = await postValidFileThumbnail(service.host, service.port);

        assert.equal(response.status, 503);
        const body = await response.json();
        assert.equal(body.status, "error");
        assert.equal(body.code, "renderer_service_backend_thumbnail_persist_failed");
        assert.equal(body.retryable, true);
        assert.equal(body.field, "backendRpcClient.persistOutput");
        assert.equal(JSON.stringify(body).includes("page-secret"), false);
        assert.equal(JSON.stringify(body).includes(pngFixture.toString("base64")), false);
    } finally {
        await service.stop();
    }
});

test("noop host rejects invalid backend thumbnail persist resource responses", async () => {
    const service = await serviceModule.startRendererService({
        port: 0,
        backendRpc: {
            baseUri: "https://penpot.example.test",
            fetch: async (url) => {
                if (String(url).includes("create-file-thumbnail")) {
                    return new Response(
                        JSON.stringify({
                            id: "persisted-thumbnail-png",
                            uri: "https://penpot.example.test/assets/by-id/other-thumbnail-png",
                        }),
                        { status: 200, headers: { "content-type": "application/json" } }
                    );
                }
                if (String(url).includes("get-file-thumbnail")) {
                    return new Response(JSON.stringify({ hit: false, "file-id": "file-1", revn: 1 }), {
                        status: 200,
                        headers: { "content-type": "application/json" },
                    });
                }
                return new Response(JSON.stringify({ "file-id": "file-1", revn: 1, page: { id: "page-secret", objects: {} } }), {
                    status: 200,
                    headers: { "content-type": "application/json" },
                });
            },
        },
        renderer: {
            renderThumbnail: async () => ({
                png: pngFixture,
                runtime: "render-wasm-worker",
                fallbackUsed: false,
            }),
        },
    });
    try {
        const response = await postValidFileThumbnail(service.host, service.port);

        assert.equal(response.status, 502);
        const body = await response.json();
        assert.equal(body.status, "error");
        assert.equal(body.code, "renderer_service_backend_thumbnail_persist_response_invalid");
        assert.equal(body.retryable, true);
        assert.equal(body.field, "backendRpcClient.persistOutput.response.uri");
        assert.equal(JSON.stringify(body).includes("page-secret"), false);
        assert.equal(JSON.stringify(body).includes(pngFixture.toString("base64")), false);
    } finally {
        await service.stop();
    }
});

test("noop host rejects invalid renderer runtime adapter PNG bytes", async () => {
    const service = await serviceModule.startRendererService({
        port: 0,
        backendRpc: {
            baseUri: "https://penpot.example.test",
            fetch: async (url) => {
                if (String(url).includes("create-file-thumbnail")) {
                    return persistedThumbnailResponse();
                }
                if (String(url).includes("get-file-thumbnail")) {
                    return new Response(JSON.stringify({ hit: false, "file-id": "file-1", revn: 1 }), {
                        status: 200,
                        headers: { "content-type": "application/json" },
                    });
                }
                return new Response(JSON.stringify({ "file-id": "file-1", revn: 1, page: { id: "page-secret", objects: {} } }), {
                    status: 200,
                    headers: { "content-type": "application/json" },
                });
            },
        },
        renderer: {
            renderThumbnail: async () => ({
                png: Buffer.from("not a png"),
                runtime: "render-wasm-worker",
                fallbackUsed: false,
            }),
        },
    });
    try {
        const response = await postValidFileThumbnail(service.host, service.port);

        assert.equal(response.status, 502);
        const body = await response.json();
        assert.equal(body.status, "error");
        assert.equal(body.code, "renderer_service_render_response_invalid");
        assert.equal(body.field, "renderer.runtime.png");
        assert.equal(body.retryable, true);
        assert.equal(JSON.stringify(body).includes("page-secret"), false);
    } finally {
        await service.stop();
    }
});

test("noop host returns retryable errors when configured cache probe dispatch fails", async () => {
    const service = await serviceModule.startRendererService({
        port: 0,
        backendRpc: {
            baseUri: "https://penpot.example.test",
            fetch: async () => {
                throw new Error("backend unavailable with service-secret-token");
            },
        },
    });
    try {
        const response = await postValidFileThumbnail(service.host, service.port, {
            "content-type": "application/json",
            authorization: "Bearer service-secret-token",
            cookie: "auth-token=service-secret-token",
        });

        assert.equal(response.status, 502);
        const body = await response.json();
        assert.equal(body.status, "error");
        assert.equal(body.code, "renderer_service_backend_cache_probe_unavailable");
        assert.equal(body.retryable, true);
        assert.equal(body.field, "backendRpcClient.cacheProbe");
        assert.match(body.message, /cache probe could not reach/);
        assert.equal(JSON.stringify(body).includes("service-secret-token"), false);
    } finally {
        await service.stop();
    }
});

test("noop host returns a normalized PNG thumbnail resource", async () => {
    await withService(async ({ host, port }) => {
        const response = await fetch(`http://${host}:${port}/thumbnail`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                authorization: "Bearer service-secret-token",
                cookie: "theme=light; auth-token=service-secret-token",
            },
            body: JSON.stringify({
                operation: "thumbnail.render",
                target: { kind: "file", fileId: "file-1", revn: 1 },
                artifact: { format: "png", mimeType: "image/png", extension: ".png", width: 252, height: 168 },
                cache: { policy: "reuse", scope: "file-thumbnail", key: "file:file-1:revn:1", probe: "file-thumbnail-by-file-id-and-revn" },
                backendRpc: fileBackendRpc("reuse"),
                render: { required: "on-cache-miss", runtime: "render-wasm-worker", fallback: "frontend-rasterizer" },
            }),
        });

        assert.equal(response.status, 200);
        const body = await response.json();
        assert.equal(body.status, "ok");
        assert.equal(body.resource.mediaId, "noop-thumbnail-png");
        assert.equal(body.resource.resourceUri, "/assets/by-id/noop-thumbnail-png");
        assert.equal(body.resource.downloadUri, `http://${host}:${port}/assets/by-id/noop-thumbnail-png`);
        assert.equal(body.resource.contentType, "image/png");
        assert.deepEqual(body.cache, {
            outcome: "rendered",
            policy: "reuse",
            scope: "file-thumbnail",
            key: "file:file-1:revn:1",
            probe: "file-thumbnail-by-file-id-and-revn",
        });
        assert.deepEqual(body.auth, {
            mode: "caller-session",
            authorizationPresent: true,
            cookiePresent: true,
            authTokenCookiePresent: true,
            tokenValuesIncluded: false,
        });
        assert.deepEqual(body.backendRpcClient, {
            status: "not-configured",
            baseUriConfigured: false,
            baseUri: null,
            networkDispatch: false,
            cacheRead: false,
            dataRead: false,
            persistWrite: false,
            authForwarding: {
                mode: "caller-session",
                authorizationPresent: true,
                cookiePresent: true,
                authTokenCookiePresent: true,
                tokenValuesIncluded: false,
            },
            entries: {
                data: {
                    command: "get-file-data-for-thumbnail",
                    method: "GET",
                    requestPresent: true,
                    endpoint: null,
                    dispatch: false,
                    requestEnvelope: requestEnvelope(
                        "GET",
                        ["file-id", "strip-frames-with-thumbnails"],
                        ["file-id", "strip-frames-with-thumbnails"]
                    ),
                },
                persist: null,
                cacheMissPersist: {
                    command: "create-file-thumbnail",
                    method: "POST",
                    requestPresent: true,
                    endpoint: null,
                    dispatch: false,
                    requestEnvelope: requestEnvelope(
                        "POST",
                        ["file-id", "media", "revn"],
                        ["file-id", "revn"],
                        ["media"],
                        "penpot-rpc-multipart"
                    ),
                },
            },
            cacheProbe: backendRpcCacheProbe(
                "file-thumbnail-by-file-id-and-revn",
                "file-thumbnail",
                "file:file-1:revn:1",
                ["file-id", "revn"]
            ),
            pipeline: backendRpcPipeline("reuse", [
                pipelineStage("cache-probe", "always", { cacheProbe: "file-thumbnail-by-file-id-and-revn" }),
                pipelineStage("source-data-read", "on-cache-miss", {
                    entry: "data",
                    command: "get-file-data-for-thumbnail",
                }),
                pipelineStage("render", "on-cache-miss", { runtime: "render-wasm-worker" }),
                pipelineStage("thumbnail-persist", "on-cache-miss", {
                    entry: "cacheMissPersist",
                    command: "create-file-thumbnail",
                }),
            ]),
            renderInput: null,
            renderOutput: null,
            persistOutput: null,
        });
        assert.equal(JSON.stringify(body).includes("service-secret-token"), false);
        assert.deepEqual(body.request, {
            operation: "thumbnail.render",
            targetKind: "file",
            fileId: "file-1",
            pageId: null,
            objectId: null,
            objectKey: null,
            tag: null,
            revn: 1,
            format: "png",
            cachePolicy: "reuse",
            cacheScope: "file-thumbnail",
            cacheKey: "file:file-1:revn:1",
            cacheProbe: "file-thumbnail-by-file-id-and-revn",
            width: 252,
            height: 168,
            mimeType: "image/png",
            extension: ".png",
            renderRequired: "on-cache-miss",
            renderRuntime: "render-wasm-worker",
            renderFallback: "frontend-rasterizer",
            backendRpc: {
                data: { command: "get-file-data-for-thumbnail", method: "GET", requestPresent: true },
                persist: null,
                cacheMissPersist: { command: "create-file-thumbnail", method: "POST", requestPresent: true },
            },
        });
        assert.equal(body.localFileWrites, false);
        assertRuntimeAssetManifestScaffold(body.runtimeAssetManifest);
        assertRuntimeAssetMaterializationPreflightScaffold(body.runtimeAssetMaterializationPreflight);

        const resource = await fetch(body.resource.downloadUri);
        assert.equal(resource.status, 200);
        assert.equal(resource.headers.get("content-type"), "image/png");
        assert.equal((await resource.arrayBuffer()).byteLength > 0, true);
    });
});

test("noop host executes configured frame thumbnail source-data reads without an adapter", async () => {
    const fetchCalls = [];
    const service = await serviceModule.startRendererService({
        port: 0,
        backendRpc: {
            baseUri: "https://penpot.example.test",
            fetch: async (url, init) => {
                fetchCalls.push({ url: String(url), init });
                return new Response(
                    JSON.stringify({
                        "file-id": "file-1",
                        revn: 7,
                        "page-id": "page-1",
                        "object-id": "frame-1",
                        page: { id: "page-secret", objects: { "frame-1": { id: "frame-1", type: "frame" } } },
                    }),
                    { status: 200, headers: { "content-type": "application/json" } }
                );
            },
        },
    });

    try {
        const response = await fetch(`http://${service.host}:${service.port}/thumbnail`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                authorization: "Bearer service-secret-token",
                cookie: "auth-token=service-secret-token",
            },
            body: JSON.stringify({
                operation: "thumbnail.render",
                target: { kind: "frame", fileId: "file-1", pageId: "page-1", objectId: "frame-1", objectKey: "file-1/page-1/frame-1/component", tag: "component" },
                artifact: { format: "png", mimeType: "image/png", extension: ".png", width: 320, height: 200 },
                cache: { policy: "refresh", scope: "file-object-thumbnail", key: "file-1/page-1/frame-1/component" },
                backendRpc: frameBackendRpc("refresh"),
                render: { required: true, runtime: "render-wasm-worker", fallback: "frontend-rasterizer" },
            }),
        });

        assert.equal(response.status, 200);
        const body = await response.json();
        assert.deepEqual(body.backendRpcClient, {
            status: "source-data-read-executed",
            baseUriConfigured: true,
            baseUri: "https://penpot.example.test",
            networkDispatch: true,
            cacheRead: false,
            dataRead: true,
            persistWrite: false,
            authForwarding: {
                mode: "caller-session",
                authorizationPresent: true,
                cookiePresent: true,
                authTokenCookiePresent: true,
                tokenValuesIncluded: false,
            },
            entries: {
                data: {
                    command: "get-file-frame-data-for-thumbnail",
                    method: "GET",
                    requestPresent: true,
                    endpoint: "https://penpot.example.test/api/main/methods/get-file-frame-data-for-thumbnail?_fmt=json",
                    dispatch: false,
                    requestEnvelope: requestEnvelope("GET", ["file-id", "object-id", "page-id"], ["file-id", "object-id", "page-id"]),
                },
                persist: {
                    command: "create-file-object-thumbnail",
                    method: "POST",
                    requestPresent: true,
                    endpoint: "https://penpot.example.test/api/main/methods/create-file-object-thumbnail?_fmt=json",
                    dispatch: false,
                    requestEnvelope: requestEnvelope(
                        "POST",
                        ["file-id", "media", "object-id", "tag"],
                        ["file-id", "object-id", "tag"],
                        ["media"],
                        "penpot-rpc-multipart"
                    ),
                },
                cacheMissPersist: null,
            },
            cacheProbe: null,
            pipeline: backendRpcPipeline("refresh", [
                pipelineStage("source-data-read", "always", {
                    entry: "data",
                    command: "get-file-frame-data-for-thumbnail",
                    status: "executed",
                    dispatch: true,
                }),
                pipelineStage("render", "always", { runtime: "render-wasm-worker" }),
                pipelineStage("thumbnail-persist", "always", {
                    entry: "persist",
                    command: "create-file-object-thumbnail",
                }),
            ], { status: "source-data-read-executed", networkDispatch: true, dataRead: true }),
            renderInput: backendRpcFrameRenderInput(),
            renderOutput: null,
            persistOutput: null,
        });
        assert.equal(JSON.stringify(body).includes("service-secret-token"), false);
        assert.equal(JSON.stringify(body).includes("page-secret"), false);
        assert.equal(fetchCalls.length, 1);
        assert.equal(fetchCalls[0].url, "https://penpot.example.test/api/main/methods/get-file-frame-data-for-thumbnail?_fmt=json&file-id=file-1&page-id=page-1&object-id=frame-1");
        assert.equal(fetchCalls[0].init.method, "GET");
    } finally {
        await service.stop();
    }
});

test("noop host executes configured frame thumbnail cache probe and returns cache hits", async () => {
    const fetchCalls = [];
    const service = await serviceModule.startRendererService({
        port: 0,
        backendRpc: {
            baseUri: "https://penpot.example.test",
            fetch: async (url, init) => {
                fetchCalls.push({ url: String(url), init });
                return new Response(
                    JSON.stringify({
                        hit: true,
                        "file-id": "file-1",
                        "object-id": "file-1/page-1/frame-1/component",
                        tag: "component",
                        "media-id": "cached-frame-thumbnail-png",
                        uri: "https://penpot.example.test/assets/by-id/cached-frame-thumbnail-png",
                    }),
                    { status: 200, headers: { "content-type": "application/json" } }
                );
            },
        },
    });

    try {
        const response = await fetch(`http://${service.host}:${service.port}/thumbnail`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                authorization: "Bearer service-secret-token",
                cookie: "auth-token=service-secret-token",
            },
            body: JSON.stringify({
                operation: "thumbnail.render",
                target: { kind: "frame", fileId: "file-1", pageId: "page-1", objectId: "frame-1", objectKey: "file-1/page-1/frame-1/component", tag: "component" },
                artifact: { format: "png", mimeType: "image/png", extension: ".png", width: 320, height: 200 },
                cache: { policy: "reuse", scope: "file-object-thumbnail", key: "file-1/page-1/frame-1/component", probe: "file-object-thumbnail-by-object-key" },
                backendRpc: frameBackendRpc("reuse"),
                render: { required: "on-cache-miss", runtime: "render-wasm-worker", fallback: "frontend-rasterizer" },
            }),
        });

        assert.equal(response.status, 200);
        const body = await response.json();
        assert.equal(body.backendRpcClient.status, "cache-probe-executed");
        assert.equal(body.backendRpcClient.networkDispatch, true);
        assert.equal(body.backendRpcClient.cacheRead, true);
        assert.equal(body.backendRpcClient.dataRead, false);
        assert.equal(body.backendRpcClient.persistWrite, false);
        assert.deepEqual(
            body.backendRpcClient.cacheProbe,
            backendRpcCacheProbe(
                "file-object-thumbnail-by-object-key",
                "file-object-thumbnail",
                "file-1/page-1/frame-1/component",
                ["file-id", "object-id", "tag"],
                {
                    status: "executed",
                    command: "get-file-object-thumbnail",
                    endpoint: "https://penpot.example.test/api/main/methods/get-file-object-thumbnail?_fmt=json",
                    result: "hit",
                    cacheRead: true,
                    networkDispatch: true,
                    dispatch: true,
                }
            )
        );
        assert.equal(body.backendRpcClient.pipeline.status, "cache-probe-executed");
        assert.equal(body.backendRpcClient.pipeline.orderedStages[0].command, "get-file-object-thumbnail");
        assert.equal(body.backendRpcClient.pipeline.orderedStages[0].status, "executed");
        assert.equal(body.backendRpcClient.pipeline.orderedStages[0].dispatch, true);
        assert.equal(body.backendRpcClient.renderInput, null);
        assert.equal(body.backendRpcClient.renderOutput, null);
        assert.equal(body.backendRpcClient.persistOutput, null);
        assert.deepEqual(body.cache, {
            outcome: "hit",
            policy: "reuse",
            scope: "file-object-thumbnail",
            key: "file-1/page-1/frame-1/component",
            probe: "file-object-thumbnail-by-object-key",
        });
        assert.deepEqual(body.resource, {
            mediaId: "cached-frame-thumbnail-png",
            resourceUri: "/assets/by-id/cached-frame-thumbnail-png",
            downloadUri: "https://penpot.example.test/assets/by-id/cached-frame-thumbnail-png",
            contentType: "image/png",
        });
        assert.deepEqual(body.renderer, {
            runtime: null,
            fallbackUsed: false,
        });
        assert.equal(JSON.stringify(body).includes("service-secret-token"), false);
        assert.equal(fetchCalls.length, 1);
        assert.equal(fetchCalls[0].url, "https://penpot.example.test/api/main/methods/get-file-object-thumbnail?_fmt=json&file-id=file-1&object-id=file-1%2Fpage-1%2Fframe-1%2Fcomponent&tag=component");
        assert.equal(fetchCalls[0].init.method, "GET");
        assert.equal(fetchCalls[0].init.headers.authorization, "Bearer service-secret-token");
        assert.equal(fetchCalls[0].init.headers.cookie, "auth-token=service-secret-token");
    } finally {
        await service.stop();
    }
});

test("noop host continues the frame render and persist path after cache probe misses", async () => {
    const fetchCalls = [];
    const renderInputs = [];
    const service = await serviceModule.startRendererService({
        port: 0,
        backendRpc: {
            baseUri: "https://penpot.example.test",
            fetch: async (url, init) => {
                fetchCalls.push({ url: String(url), init });
                if (String(url).includes("get-file-object-thumbnail")) {
                    return new Response(
                        JSON.stringify({
                            hit: false,
                            "file-id": "file-1",
                            "object-id": "file-1/page-1/frame-1/component",
                            tag: "component",
                        }),
                        { status: 200, headers: { "content-type": "application/json" } }
                    );
                }
                if (String(url).includes("create-file-object-thumbnail")) {
                    return persistedThumbnailResponse("persisted-frame-reuse-thumbnail-png");
                }
                return new Response(
                    JSON.stringify({
                        "file-id": "file-1",
                        revn: 7,
                        "page-id": "page-1",
                        "object-id": "frame-1",
                        page: { id: "page-secret", objects: { "frame-1": { id: "frame-1", type: "frame" } } },
                    }),
                    { status: 200, headers: { "content-type": "application/json" } }
                );
            },
        },
        renderer: {
            renderThumbnail: async (input) => {
                renderInputs.push(input);
                return {
                    png: pngFixture,
                    runtime: "render-wasm-worker",
                    fallbackUsed: false,
                };
            },
        },
    });

    try {
        const response = await fetch(`http://${service.host}:${service.port}/thumbnail`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                operation: "thumbnail.render",
                target: { kind: "frame", fileId: "file-1", pageId: "page-1", objectId: "frame-1", objectKey: "file-1/page-1/frame-1/component", tag: "component" },
                artifact: { format: "png", mimeType: "image/png", extension: ".png", width: 320, height: 200 },
                cache: { policy: "reuse", scope: "file-object-thumbnail", key: "file-1/page-1/frame-1/component", probe: "file-object-thumbnail-by-object-key" },
                backendRpc: frameBackendRpc("reuse"),
                render: { required: "on-cache-miss", runtime: "render-wasm-worker", fallback: "frontend-rasterizer" },
            }),
        });

        assert.equal(response.status, 200);
        const body = await response.json();
        assert.equal(body.backendRpcClient.status, "persist-executed");
        assert.equal(body.backendRpcClient.cacheRead, true);
        assert.equal(body.backendRpcClient.dataRead, true);
        assert.equal(body.backendRpcClient.persistWrite, true);
        assert.equal(body.backendRpcClient.cacheProbe.result, "miss");
        assert.equal(body.backendRpcClient.cacheProbe.command, "get-file-object-thumbnail");
        assert.equal(body.backendRpcClient.pipeline.status, "persist-executed");
        assert.equal(body.backendRpcClient.pipeline.orderedStages[0].name, "cache-probe");
        assert.equal(body.backendRpcClient.pipeline.orderedStages[0].status, "executed");
        assert.equal(body.backendRpcClient.pipeline.orderedStages[1].status, "executed");
        assert.equal(body.backendRpcClient.pipeline.orderedStages[2].status, "executed");
        assert.equal(body.backendRpcClient.pipeline.orderedStages[3].entry, "cacheMissPersist");
        assert.equal(body.backendRpcClient.pipeline.orderedStages[3].status, "executed");
        assert.deepEqual(body.backendRpcClient.renderInput, backendRpcFrameRenderInput({ renderDispatch: true, cachePolicy: "reuse" }));
        assert.deepEqual(body.backendRpcClient.renderOutput, backendRpcRenderOutput(pngFixture.byteLength));
        assert.deepEqual(
            body.backendRpcClient.persistOutput,
            backendRpcPersistOutput(pngFixture.byteLength, {
                entry: "cacheMissPersist",
                command: "create-file-object-thumbnail",
                endpoint: "https://penpot.example.test/api/main/methods/create-file-object-thumbnail?_fmt=json",
                targetKind: "frame",
                identityKeys: ["file-id", "object-id", "tag"],
                requestRevision: "resolved",
                resourceFrom: "backend-create-file-object-thumbnail",
            })
        );
        assert.deepEqual(body.resource, {
            mediaId: "persisted-frame-reuse-thumbnail-png",
            resourceUri: "/assets/by-id/persisted-frame-reuse-thumbnail-png",
            downloadUri: "https://penpot.example.test/assets/by-id/persisted-frame-reuse-thumbnail-png",
            contentType: "image/png",
        });
        assert.equal(renderInputs.length, 1);
        assert.equal(renderInputs[0].cache.policy, "reuse");
        assert.equal(renderInputs[0].sourceData.objectKey, "file-1/page-1/frame-1/component");
        assert.equal(JSON.stringify(body).includes("page-secret"), false);
        assert.equal(JSON.stringify(body).includes(pngFixture.toString("base64")), false);
        assert.equal(fetchCalls.length, 3);
        assert.equal(fetchCalls[0].url, "https://penpot.example.test/api/main/methods/get-file-object-thumbnail?_fmt=json&file-id=file-1&object-id=file-1%2Fpage-1%2Fframe-1%2Fcomponent&tag=component");
        assert.equal(fetchCalls[1].url, "https://penpot.example.test/api/main/methods/get-file-frame-data-for-thumbnail?_fmt=json&file-id=file-1&page-id=page-1&object-id=frame-1");
        assert.equal(fetchCalls[2].url, "https://penpot.example.test/api/main/methods/create-file-object-thumbnail?_fmt=json&file-id=file-1&object-id=file-1%2Fpage-1%2Fframe-1%2Fcomponent&tag=component");
    } finally {
        await service.stop();
    }
});

test("noop host persists configured frame thumbnails rendered by injected runtime adapters", async () => {
    const fetchCalls = [];
    const renderInputs = [];
    const service = await serviceModule.startRendererService({
        port: 0,
        backendRpc: {
            baseUri: "https://penpot.example.test",
            fetch: async (url, init) => {
                fetchCalls.push({ url: String(url), init });
                if (String(url).includes("create-file-object-thumbnail")) {
                    return persistedThumbnailResponse("persisted-frame-thumbnail-png");
                }
                return new Response(
                    JSON.stringify({
                        "file-id": "file-1",
                        revn: 7,
                        "page-id": "page-1",
                        "object-id": "frame-1",
                        page: { id: "page-secret", objects: { "frame-1": { id: "frame-1", type: "frame" } } },
                    }),
                    { status: 200, headers: { "content-type": "application/json" } }
                );
            },
        },
        renderer: {
            renderThumbnail: async (input) => {
                renderInputs.push(input);
                return {
                    png: pngFixture,
                    runtime: "render-wasm-worker",
                    fallbackUsed: false,
                };
            },
        },
    });

    try {
        const response = await fetch(`http://${service.host}:${service.port}/thumbnail`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                operation: "thumbnail.render",
                target: { kind: "frame", fileId: "file-1", pageId: "page-1", objectId: "frame-1", objectKey: "file-1/page-1/frame-1/component", tag: "component" },
                artifact: { format: "png", mimeType: "image/png", extension: ".png", width: 320, height: 200 },
                cache: { policy: "refresh", scope: "file-object-thumbnail", key: "file-1/page-1/frame-1/component" },
                backendRpc: frameBackendRpc("refresh"),
                render: { required: true, runtime: "render-wasm-worker", fallback: "frontend-rasterizer" },
            }),
        });

        assert.equal(response.status, 200);
        const body = await response.json();
        assert.equal(body.backendRpcClient.status, "persist-executed");
        assert.equal(body.backendRpcClient.networkDispatch, true);
        assert.equal(body.backendRpcClient.dataRead, true);
        assert.equal(body.backendRpcClient.persistWrite, true);
        assert.equal(body.backendRpcClient.pipeline.status, "persist-executed");
        assert.equal(body.backendRpcClient.pipeline.renderDispatch, true);
        assert.equal(body.backendRpcClient.pipeline.persistWrite, true);
        assert.equal(body.backendRpcClient.pipeline.orderedStages[2].name, "thumbnail-persist");
        assert.equal(body.backendRpcClient.pipeline.orderedStages[2].status, "executed");
        assert.equal(body.backendRpcClient.pipeline.orderedStages[2].dispatch, true);
        assert.deepEqual(body.backendRpcClient.renderInput, backendRpcFrameRenderInput({ renderDispatch: true }));
        assert.deepEqual(body.backendRpcClient.renderOutput, backendRpcRenderOutput(pngFixture.byteLength));
        assert.deepEqual(
            body.backendRpcClient.persistOutput,
            backendRpcPersistOutput(pngFixture.byteLength, {
                entry: "persist",
                command: "create-file-object-thumbnail",
                endpoint: "https://penpot.example.test/api/main/methods/create-file-object-thumbnail?_fmt=json",
                targetKind: "frame",
                identityKeys: ["file-id", "object-id", "tag"],
                requestRevision: "resolved",
                resourceFrom: "backend-create-file-object-thumbnail",
            })
        );
        assert.deepEqual(body.resource, {
            mediaId: "persisted-frame-thumbnail-png",
            resourceUri: "/assets/by-id/persisted-frame-thumbnail-png",
            downloadUri: "https://penpot.example.test/assets/by-id/persisted-frame-thumbnail-png",
            contentType: "image/png",
        });
        assert.equal(JSON.stringify(body).includes("page-secret"), false);
        assert.equal(JSON.stringify(body).includes(pngFixture.toString("base64")), false);

        assert.equal(renderInputs.length, 1);
        assert.deepEqual(renderInputs[0].target, {
            kind: "frame",
            fileId: "file-1",
            pageId: "page-1",
            objectId: "frame-1",
            objectKey: "file-1/page-1/frame-1/component",
            tag: "component",
            revn: null,
        });
        assert.equal(renderInputs[0].sourceData.fileId, "file-1");
        assert.equal(renderInputs[0].sourceData.revn, 7);
        assert.equal(renderInputs[0].sourceData.pageId, "page-1");
        assert.equal(renderInputs[0].sourceData.objectId, "frame-1");
        assert.equal(renderInputs[0].sourceData.objectKey, "file-1/page-1/frame-1/component");
        assert.equal(renderInputs[0].sourceData.tag, "component");
        assert.deepEqual(renderInputs[0].sourceData.page, { id: "page-secret", objects: { "frame-1": { id: "frame-1", type: "frame" } } });
        assert.equal(fetchCalls.length, 2);
        assert.equal(fetchCalls[1].url, "https://penpot.example.test/api/main/methods/create-file-object-thumbnail?_fmt=json&file-id=file-1&object-id=file-1%2Fpage-1%2Fframe-1%2Fcomponent&tag=component");
        assert.equal(fetchCalls[1].init.method, "POST");
        assert.equal(fetchCalls[1].init.headers["content-type"], undefined);
        const media = fetchCalls[1].init.body.get("media");
        assert.equal(media.type, "image/png");
        assert.equal(Buffer.from(await media.arrayBuffer()).equals(pngFixture), true);
    } finally {
        await service.stop();
    }
});

async function postValidFileThumbnail(host, port, headers = { "content-type": "application/json" }) {
    return fetch(`http://${host}:${port}/thumbnail`, {
        method: "POST",
        headers,
        body: JSON.stringify({
            operation: "thumbnail.render",
            target: { kind: "file", fileId: "file-1", revn: 1 },
            artifact: { format: "png", mimeType: "image/png", extension: ".png", width: 252, height: 168 },
            cache: { policy: "reuse", scope: "file-thumbnail", key: "file:file-1:revn:1", probe: "file-thumbnail-by-file-id-and-revn" },
            backendRpc: fileBackendRpc("reuse"),
            render: { required: "on-cache-miss", runtime: "render-wasm-worker", fallback: "frontend-rasterizer" },
        }),
    });
}

test("noop host includes the P26.22 runtime asset preflight read-only execution in thumbnail responses", async () => {
    const fixture = await createRuntimePreflightFixture();
    const service = await serviceModule.startRendererService({
        port: 0,
        runtimeAssetPreflight: {
            executeReadOnly: true,
            workspaceRoot: fixture.workspaceRoot,
            cacheRoot: fixture.cacheRoot,
        },
        runtimeAssetMaterializationApproval: {
            modeConfigured: true,
            approvalTokenConfigured: true,
            auditConfigured: true,
        },
    });
    try {
        const response = await postValidFileThumbnail(service.host, service.port);

        assert.equal(response.status, 200);
        const body = await response.json();
        const execution = assertRuntimeAssetPreflightExecution(body.runtimeAssetMaterializationPreflight, {
            workspaceRoot: fixture.workspaceRoot,
            cacheRoot: fixture.cacheRoot,
            readiness: "ready",
        });
        assert.equal(body.localFileWrites, false);
        assert.equal(execution.summary.ready, true);
        const dryRun = assertRuntimeAssetMaterializationDryRunPlan(body.runtimeAssetMaterializationDryRun, {
            status: "ready",
            readiness: "ready",
            ready: true,
        });
        assert.ok(dryRun.copyPlan.every((entry) => entry.preflightReadiness === "ready"));
        const approval = assertRuntimeAssetMaterializationApprovalPlan(body.runtimeAssetMaterializationApproval, {
            readiness: "ready",
            ready: true,
            modeConfigured: true,
            approvalTokenConfigured: true,
            auditConfigured: true,
            expectedDiagnosticCodes: [
                "renderer_service_runtime_asset_materialization_approval_configuration_unsupported",
                "renderer_service_runtime_asset_materialization_approval_token_unsupported",
                "renderer_service_runtime_asset_materialization_approval_audit_unsupported",
            ],
        });
        assert.equal(approval.approvalGate.approvalTokenAccepted, false);
        assert.equal(approval.audit.auditRecordWritten, false);
        assert.equal(JSON.stringify(body).includes("public:thumbnail-worker-main"), false);
        assert.equal(JSON.stringify(body).includes("cache:thumbnail-worker-main"), false);
    } finally {
        await service.stop();
        await fixture.cleanup();
    }
});

test("noop host validates generated response resource metadata before returning it", async () => {
    const service = await serviceModule.startRendererService({
        port: 0,
        thumbnailResponseOverride: (body) => ({
            ...body,
            resource: {
                ...body.resource,
                contentType: "text/plain",
            },
        }),
    });
    try {
        const response = await postValidFileThumbnail(service.host, service.port);

        assert.equal(response.status, 500);
        const body = await response.json();
        assert.equal(body.status, "error");
        assert.equal(body.code, "renderer_service_response_invalid");
        assert.equal(body.retryable, false);
        assert.equal(body.field, "resource.contentType");
        assert.match(body.message, /resource\.contentType must match image\/png/);
    } finally {
        await service.stop();
    }
});

test("noop host validates generated response cache metadata before returning it", async () => {
    const service = await serviceModule.startRendererService({
        port: 0,
        thumbnailResponseOverride: (body) => ({
            ...body,
            cache: {
                ...body.cache,
                key: "file:file-1:revn:2",
            },
        }),
    });
    try {
        const response = await postValidFileThumbnail(service.host, service.port);

        assert.equal(response.status, 500);
        const body = await response.json();
        assert.equal(body.status, "error");
        assert.equal(body.code, "renderer_service_response_invalid");
        assert.equal(body.field, "cache.key");
        assert.match(body.message, /cache\.key must match file:file-1:revn:1/);
    } finally {
        await service.stop();
    }
});

test("noop host validates generated response auth summary before returning it", async () => {
    const service = await serviceModule.startRendererService({
        port: 0,
        thumbnailResponseOverride: (body) => ({
            ...body,
            auth: {
                ...body.auth,
                tokenValuesIncluded: true,
                token: "service-secret-token",
            },
        }),
    });
    try {
        const response = await postValidFileThumbnail(service.host, service.port, {
            "content-type": "application/json",
            authorization: "Bearer service-secret-token",
            cookie: "auth-token=service-secret-token",
        });

        assert.equal(response.status, 500);
        const body = await response.json();
        assert.equal(body.status, "error");
        assert.equal(body.code, "renderer_service_response_invalid");
        assert.equal(body.field, "auth.tokenValuesIncluded");
        assert.equal(JSON.stringify(body).includes("service-secret-token"), false);
    } finally {
        await service.stop();
    }
});

test("noop host validates generated runtime asset manifest before returning it", async () => {
    const service = await serviceModule.startRendererService({
        port: 0,
        thumbnailResponseOverride: (body) => ({
            ...body,
            runtimeAssetManifest: {
                ...body.runtimeAssetManifest,
                sideEffects: {
                    ...body.runtimeAssetManifest.sideEffects,
                    browserProcessStarted: true,
                },
            },
        }),
    });
    try {
        const response = await postValidFileThumbnail(service.host, service.port);

        assert.equal(response.status, 500);
        const body = await response.json();
        assert.equal(body.status, "error");
        assert.equal(body.code, "renderer_service_response_invalid");
        assert.equal(body.field, "runtimeAssetManifest.sideEffects.browserProcessStarted");
        assert.match(body.message, /runtimeAssetManifest\.sideEffects\.browserProcessStarted must match false/);
    } finally {
        await service.stop();
    }
});

test("noop host validates generated runtime asset materialization preflight before returning it", async () => {
    const service = await serviceModule.startRendererService({
        port: 0,
        thumbnailResponseOverride: (body) => ({
            ...body,
            runtimeAssetMaterializationPreflight: {
                ...body.runtimeAssetMaterializationPreflight,
                gates: {
                    ...body.runtimeAssetMaterializationPreflight.gates,
                    assetExistenceChecked: true,
                },
                checks: body.runtimeAssetMaterializationPreflight.checks.map((check, index) =>
                    index === 0
                        ? {
                              ...check,
                              exists: true,
                              fileRead: true,
                          }
                        : check
                ),
            },
        }),
    });
    try {
        const response = await postValidFileThumbnail(service.host, service.port);

        assert.equal(response.status, 500);
        const body = await response.json();
        assert.equal(body.status, "error");
        assert.equal(body.code, "renderer_service_response_invalid");
        assert.equal(body.field, "runtimeAssetMaterializationPreflight.checks.0.exists");
        assert.match(body.message, /runtimeAssetMaterializationPreflight\.checks\.0\.exists must match null/);
    } finally {
        await service.stop();
    }
});

test("noop host rejects unsafe P26.22 runtime asset preflight execution metadata", async () => {
    const fixture = await createRuntimePreflightFixture();
    const service = await serviceModule.startRendererService({
        port: 0,
        runtimeAssetPreflight: {
            executeReadOnly: true,
            workspaceRoot: fixture.workspaceRoot,
            cacheRoot: fixture.cacheRoot,
        },
        thumbnailResponseOverride: (body) => ({
            ...body,
            runtimeAssetMaterializationPreflight: {
                ...body.runtimeAssetMaterializationPreflight,
                execution: {
                    ...body.runtimeAssetMaterializationPreflight.execution,
                    sideEffects: {
                        ...body.runtimeAssetMaterializationPreflight.execution.sideEffects,
                        localFileWrites: true,
                    },
                },
            },
        }),
    });
    try {
        const response = await postValidFileThumbnail(service.host, service.port);

        assert.equal(response.status, 500);
        const body = await response.json();
        assert.equal(body.status, "error");
        assert.equal(body.code, "renderer_service_response_invalid");
        assert.equal(body.field, "runtimeAssetMaterializationPreflight.execution.sideEffects.localFileWrites");
        assert.match(body.message, /runtimeAssetMaterializationPreflight\.execution\.sideEffects\.localFileWrites must match false/);
    } finally {
        await service.stop();
        await fixture.cleanup();
    }
});

test("noop host rejects unsafe P26.26 runtime asset materialization dry-run metadata", async () => {
    const fixture = await createRuntimePreflightFixture();
    const service = await serviceModule.startRendererService({
        port: 0,
        runtimeAssetPreflight: {
            executeReadOnly: true,
            workspaceRoot: fixture.workspaceRoot,
            cacheRoot: fixture.cacheRoot,
        },
        thumbnailResponseOverride: (body) => ({
            ...body,
            runtimeAssetMaterializationDryRun: {
                ...body.runtimeAssetMaterializationDryRun,
                approvalGate: {
                    ...body.runtimeAssetMaterializationDryRun.approvalGate,
                    writesEnabled: true,
                },
            },
        }),
    });
    try {
        const response = await postValidFileThumbnail(service.host, service.port);

        assert.equal(response.status, 500);
        const body = await response.json();
        assert.equal(body.status, "error");
        assert.equal(body.code, "renderer_service_response_invalid");
        assert.equal(body.field, "runtimeAssetMaterializationDryRun.approvalGate.writesEnabled");
        assert.match(body.message, /runtimeAssetMaterializationDryRun\.approvalGate\.writesEnabled must match false/);
    } finally {
        await service.stop();
        await fixture.cleanup();
    }
});

test("noop host rejects unsafe P26.27 runtime asset materialization approval scaffold metadata", async () => {
    const fixture = await createRuntimePreflightFixture();
    const service = await serviceModule.startRendererService({
        port: 0,
        runtimeAssetPreflight: {
            executeReadOnly: true,
            workspaceRoot: fixture.workspaceRoot,
            cacheRoot: fixture.cacheRoot,
        },
        thumbnailResponseOverride: (body) => ({
            ...body,
            runtimeAssetMaterializationApproval: {
                ...body.runtimeAssetMaterializationApproval,
                approvalGate: {
                    ...body.runtimeAssetMaterializationApproval.approvalGate,
                    approvalTokenAccepted: true,
                    writesEnabled: true,
                },
            },
        }),
    });
    try {
        const response = await postValidFileThumbnail(service.host, service.port);

        assert.equal(response.status, 500);
        const body = await response.json();
        assert.equal(body.status, "error");
        assert.equal(body.code, "renderer_service_response_invalid");
        assert.equal(body.field, "runtimeAssetMaterializationApproval.approvalGate.approvalTokenAccepted");
        assert.match(body.message, /runtimeAssetMaterializationApproval\.approvalGate\.approvalTokenAccepted must match false/);
    } finally {
        await service.stop();
        await fixture.cleanup();
    }
});

test("noop host rejects unsafe P26.32 bundled scene bridge contract metadata", async () => {
    const fixture = await createRuntimePreflightFixture();
    const service = await serviceModule.startRendererService({
        port: 0,
        runtimeAssetPreflight: {
            executeReadOnly: true,
            workspaceRoot: fixture.workspaceRoot,
            cacheRoot: fixture.cacheRoot,
        },
        thumbnailResponseOverride: (body) => ({
            ...body,
            bundledSceneBridgeContract: {
                ...body.bundledSceneBridgeContract,
                adapterModule: {
                    ...body.bundledSceneBridgeContract.adapterModule,
                    moduleImported: true,
                },
            },
        }),
    });
    try {
        const response = await postValidFileThumbnail(service.host, service.port);

        assert.equal(response.status, 500);
        const body = await response.json();
        assert.equal(body.status, "error");
        assert.equal(body.code, "renderer_service_response_invalid");
        assert.equal(body.field, "bundledSceneBridgeContract.adapterModule.moduleImported");
        assert.match(body.message, /bundledSceneBridgeContract\.adapterModule\.moduleImported must match false/);
    } finally {
        await service.stop();
        await fixture.cleanup();
    }
});

test("noop host validates generated backend RPC client metadata before returning it", async () => {
    const service = await serviceModule.startRendererService({
        port: 0,
        thumbnailResponseOverride: (body) => ({
            ...body,
            backendRpcClient: {
                ...body.backendRpcClient,
                networkDispatch: true,
            },
        }),
    });
    try {
        const response = await postValidFileThumbnail(service.host, service.port);

        assert.equal(response.status, 500);
        const body = await response.json();
        assert.equal(body.status, "error");
        assert.equal(body.code, "renderer_service_response_invalid");
        assert.equal(body.field, "backendRpcClient.networkDispatch");
        assert.match(body.message, /backendRpcClient\.networkDispatch must match false/);
    } finally {
        await service.stop();
    }
});

test("noop host validates generated backend RPC cache probe plans before returning them", async () => {
    const service = await serviceModule.startRendererService({
        port: 0,
        thumbnailResponseOverride: (body) => ({
            ...body,
            backendRpcClient: {
                ...body.backendRpcClient,
                cacheProbe: {
                    ...body.backendRpcClient.cacheProbe,
                    resourceUri: "/assets/by-id/secret-cache-hit",
                },
            },
        }),
    });
    try {
        const response = await postValidFileThumbnail(service.host, service.port);

        assert.equal(response.status, 500);
        const body = await response.json();
        assert.equal(body.status, "error");
        assert.equal(body.code, "renderer_service_response_invalid");
        assert.equal(body.field, "backendRpcClient.cacheProbe.resourceUri");
        assert.equal(JSON.stringify(body).includes("secret-cache-hit"), false);
    } finally {
        await service.stop();
    }
});

test("noop host validates generated backend RPC request envelopes before returning them", async () => {
    const service = await serviceModule.startRendererService({
        port: 0,
        thumbnailResponseOverride: (body) => ({
            ...body,
            backendRpcClient: {
                ...body.backendRpcClient,
                entries: {
                    ...body.backendRpcClient.entries,
                    data: {
                        ...body.backendRpcClient.entries.data,
                        requestEnvelope: {
                            ...body.backendRpcClient.entries.data.requestEnvelope,
                            dispatch: true,
                        },
                    },
                },
            },
        }),
    });
    try {
        const response = await postValidFileThumbnail(service.host, service.port);

        assert.equal(response.status, 500);
        const body = await response.json();
        assert.equal(body.status, "error");
        assert.equal(body.code, "renderer_service_response_invalid");
        assert.equal(body.field, "backendRpcClient.entries.data.requestEnvelope.dispatch");
        assert.match(body.message, /requestEnvelope\.dispatch must match false/);
    } finally {
        await service.stop();
    }
});

test("noop host validates generated backend RPC pipeline plans before returning them", async () => {
    const service = await serviceModule.startRendererService({
        port: 0,
        thumbnailResponseOverride: (body) => ({
            ...body,
            backendRpcClient: {
                ...body.backendRpcClient,
                pipeline: {
                    ...body.backendRpcClient.pipeline,
                    dataRead: true,
                    sourceData: { fileId: "file-1" },
                },
            },
        }),
    });
    try {
        const response = await postValidFileThumbnail(service.host, service.port);

        assert.equal(response.status, 500);
        const body = await response.json();
        assert.equal(body.status, "error");
        assert.equal(body.code, "renderer_service_response_invalid");
        assert.equal(body.field, "backendRpcClient.pipeline.sourceData");
        assert.equal(JSON.stringify(body).includes("file-1"), false);
    } finally {
        await service.stop();
    }
});

test("noop host validates generated backend RPC render input summaries before returning them", async () => {
    const service = await serviceModule.startRendererService({
        port: 0,
        backendRpc: {
            baseUri: "https://penpot.example.test",
            fetch: async (url) => {
                if (String(url).includes("create-file-thumbnail")) {
                    return persistedThumbnailResponse();
                }
                if (String(url).includes("get-file-thumbnail")) {
                    return new Response(JSON.stringify({ hit: false, "file-id": "file-1", revn: 1 }), {
                        status: 200,
                        headers: { "content-type": "application/json" },
                    });
                }
                return new Response(JSON.stringify({ "file-id": "file-1", revn: 1, page: { id: "page-secret", objects: {} } }), {
                    status: 200,
                    headers: { "content-type": "application/json" },
                });
            },
        },
        thumbnailResponseOverride: (body) => ({
            ...body,
            backendRpcClient: {
                ...body.backendRpcClient,
                renderInput: {
                    ...body.backendRpcClient.renderInput,
                    sourceData: { page: "page-secret" },
                },
            },
        }),
    });
    try {
        const response = await postValidFileThumbnail(service.host, service.port);

        assert.equal(response.status, 500);
        const body = await response.json();
        assert.equal(body.status, "error");
        assert.equal(body.code, "renderer_service_response_invalid");
        assert.equal(body.field, "backendRpcClient.renderInput.sourceData");
        assert.equal(JSON.stringify(body).includes("page-secret"), false);
    } finally {
        await service.stop();
    }
});

test("noop host validates generated backend RPC render output summaries before returning them", async () => {
    const service = await serviceModule.startRendererService({
        port: 0,
        backendRpc: {
            baseUri: "https://penpot.example.test",
            fetch: async (url) => {
                if (String(url).includes("create-file-thumbnail")) {
                    return persistedThumbnailResponse();
                }
                if (String(url).includes("get-file-thumbnail")) {
                    return new Response(JSON.stringify({ hit: false, "file-id": "file-1", revn: 1 }), {
                        status: 200,
                        headers: { "content-type": "application/json" },
                    });
                }
                return new Response(JSON.stringify({ "file-id": "file-1", revn: 1, page: { id: "page-secret", objects: {} } }), {
                    status: 200,
                    headers: { "content-type": "application/json" },
                });
            },
        },
        renderer: {
            renderThumbnail: async () => ({
                png: pngFixture,
                runtime: "render-wasm-worker",
                fallbackUsed: false,
            }),
        },
        thumbnailResponseOverride: (body) => ({
            ...body,
            backendRpcClient: {
                ...body.backendRpcClient,
                renderOutput: {
                    ...body.backendRpcClient.renderOutput,
                    png: pngFixture.toString("base64"),
                },
            },
        }),
    });
    try {
        const response = await postValidFileThumbnail(service.host, service.port);

        assert.equal(response.status, 500);
        const body = await response.json();
        assert.equal(body.status, "error");
        assert.equal(body.code, "renderer_service_response_invalid");
        assert.equal(body.field, "backendRpcClient.renderOutput.png");
        assert.equal(JSON.stringify(body).includes(pngFixture.toString("base64")), false);
    } finally {
        await service.stop();
    }
});

test("noop host validates generated backend RPC persist output summaries before returning them", async () => {
    const service = await serviceModule.startRendererService({
        port: 0,
        backendRpc: {
            baseUri: "https://penpot.example.test",
            fetch: async (url) => {
                if (String(url).includes("create-file-thumbnail")) {
                    return persistedThumbnailResponse();
                }
                if (String(url).includes("get-file-thumbnail")) {
                    return new Response(JSON.stringify({ hit: false, "file-id": "file-1", revn: 1 }), {
                        status: 200,
                        headers: { "content-type": "application/json" },
                    });
                }
                return new Response(JSON.stringify({ "file-id": "file-1", revn: 1, page: { id: "page-secret", objects: {} } }), {
                    status: 200,
                    headers: { "content-type": "application/json" },
                });
            },
        },
        renderer: {
            renderThumbnail: async () => ({
                png: pngFixture,
                runtime: "render-wasm-worker",
                fallbackUsed: false,
            }),
        },
        thumbnailResponseOverride: (body) => ({
            ...body,
            backendRpcClient: {
                ...body.backendRpcClient,
                persistOutput: {
                    ...body.backendRpcClient.persistOutput,
                    mediaId: "persist-secret",
                },
            },
        }),
    });
    try {
        const response = await postValidFileThumbnail(service.host, service.port);

        assert.equal(response.status, 500);
        const body = await response.json();
        assert.equal(body.status, "error");
        assert.equal(body.code, "renderer_service_response_invalid");
        assert.equal(body.field, "backendRpcClient.persistOutput.mediaId");
        assert.equal(JSON.stringify(body).includes("persist-secret"), false);
    } finally {
        await service.stop();
    }
});

test("noop host accepts frame thumbnail target identity", async () => {
    await withService(async ({ host, port }) => {
        const response = await fetch(`http://${host}:${port}/thumbnail`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                operation: "thumbnail.render",
                target: { kind: "frame", fileId: "file-1", pageId: "page-1", objectId: "frame-1", tag: "component", objectKey: "file-1/page-1/frame-1/component" },
                artifact: { format: "png", mimeType: "image/png", extension: ".png", width: 300, height: 200 },
                cache: { policy: "refresh", scope: "file-object-thumbnail", key: "file-1/page-1/frame-1/component" },
                backendRpc: frameBackendRpc("refresh"),
                render: { required: true, runtime: "render-wasm-worker", fallback: "frontend-rasterizer" },
            }),
        });

        assert.equal(response.status, 200);
        const body = await response.json();
        assert.deepEqual(body.cache, {
            outcome: "rendered",
            policy: "refresh",
            scope: "file-object-thumbnail",
            key: "file-1/page-1/frame-1/component",
            probe: null,
        });
        assert.deepEqual(body.request, {
            operation: "thumbnail.render",
            targetKind: "frame",
            fileId: "file-1",
            pageId: "page-1",
            objectId: "frame-1",
            objectKey: "file-1/page-1/frame-1/component",
            tag: "component",
            revn: null,
            format: "png",
            cachePolicy: "refresh",
            cacheScope: "file-object-thumbnail",
            cacheKey: "file-1/page-1/frame-1/component",
            cacheProbe: null,
            width: 300,
            height: 200,
            mimeType: "image/png",
            extension: ".png",
            renderRequired: true,
            renderRuntime: "render-wasm-worker",
            renderFallback: "frontend-rasterizer",
            backendRpc: {
                data: { command: "get-file-frame-data-for-thumbnail", method: "GET", requestPresent: true },
                persist: { command: "create-file-object-thumbnail", method: "POST", requestPresent: true },
                cacheMissPersist: null,
            },
        });
    });
});

test("noop host rejects invalid thumbnail request bodies", async () => {
    await withService(async ({ host, port }) => {
        const response = await fetch(`http://${host}:${port}/thumbnail`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                operation: "thumbnail.render",
                target: { kind: "file", fileId: "file-1", revn: 1 },
                artifact: { format: "jpg", mimeType: "image/jpeg", extension: ".jpg", width: 252, height: 168 },
                cache: { policy: "reuse", scope: "file-thumbnail", key: "file:file-1:revn:1", probe: "file-thumbnail-by-file-id-and-revn" },
                render: { required: "on-cache-miss", runtime: "render-wasm-worker", fallback: "frontend-rasterizer" },
            }),
        });

        assert.equal(response.status, 400);
        const body = await response.json();
        assert.equal(body.status, "error");
        assert.equal(body.code, "renderer_service_format_invalid");
        assert.equal(body.retryable, false);
        assert.match(body.message, /artifact\.format must be png/);
    });
});

test("noop host rejects frame thumbnails without object identity", async () => {
    await withService(async ({ host, port }) => {
        const response = await fetch(`http://${host}:${port}/thumbnail`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                operation: "thumbnail.render",
                target: { kind: "frame", fileId: "file-1", pageId: "page-1" },
                artifact: { format: "png", mimeType: "image/png", extension: ".png", width: 300, height: 200 },
                cache: { policy: "refresh", scope: "file-object-thumbnail", key: "file-1/page-1/frame-1/component" },
                render: { required: true, runtime: "render-wasm-worker", fallback: "frontend-rasterizer" },
            }),
        });

        assert.equal(response.status, 400);
        const body = await response.json();
        assert.equal(body.status, "error");
        assert.equal(body.code, "renderer_service_target_object_id_required");
        assert.match(body.message, /target\.objectId is required/);
    });
});

test("noop host rejects cache scope mismatches", async () => {
    await withService(async ({ host, port }) => {
        const response = await fetch(`http://${host}:${port}/thumbnail`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                operation: "thumbnail.render",
                target: { kind: "file", fileId: "file-1", revn: 1 },
                artifact: { format: "png", mimeType: "image/png", extension: ".png", width: 252, height: 168 },
                cache: { policy: "reuse", scope: "file-object-thumbnail", key: "file:file-1:revn:1" },
                render: { required: "on-cache-miss", runtime: "render-wasm-worker", fallback: "frontend-rasterizer" },
            }),
        });

        assert.equal(response.status, 400);
        const body = await response.json();
        assert.equal(body.status, "error");
        assert.equal(body.code, "renderer_service_cache_scope_invalid");
        assert.match(body.message, /cache\.scope must be file-thumbnail/);
    });
});

test("noop host rejects cache probe metadata that does not match cache policy", async () => {
    await withService(async ({ host, port }) => {
        const response = await fetch(`http://${host}:${port}/thumbnail`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                operation: "thumbnail.render",
                target: { kind: "frame", fileId: "file-1", pageId: "page-1", objectId: "frame-1", tag: "component", objectKey: "file-1/page-1/frame-1/component" },
                artifact: { format: "png", mimeType: "image/png", extension: ".png", width: 300, height: 200 },
                cache: { policy: "refresh", scope: "file-object-thumbnail", key: "file-1/page-1/frame-1/component", probe: "file-object-thumbnail-by-object-key" },
                backendRpc: frameBackendRpc("refresh"),
                render: { required: true, runtime: "render-wasm-worker", fallback: "frontend-rasterizer" },
            }),
        });

        assert.equal(response.status, 400);
        const body = await response.json();
        assert.equal(body.status, "error");
        assert.equal(body.code, "renderer_service_cache_probe_unexpected");
        assert.match(body.message, /cache\.probe must be omitted/);
    });
});

test("noop host rejects file thumbnail cache keys that do not match the target revision", async () => {
    await withService(async ({ host, port }) => {
        const response = await fetch(`http://${host}:${port}/thumbnail`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                operation: "thumbnail.render",
                target: { kind: "file", fileId: "file-1", revn: 2 },
                artifact: { format: "png", mimeType: "image/png", extension: ".png", width: 252, height: 168 },
                cache: { policy: "reuse", scope: "file-thumbnail", key: "file:file-1:revn:1", probe: "file-thumbnail-by-file-id-and-revn" },
                backendRpc: fileBackendRpc("reuse"),
                render: { required: "on-cache-miss", runtime: "render-wasm-worker", fallback: "frontend-rasterizer" },
            }),
        });

        assert.equal(response.status, 400);
        const body = await response.json();
        assert.equal(body.status, "error");
        assert.equal(body.code, "renderer_service_cache_key_mismatch");
        assert.match(body.message, /cache\.key must match file:file-1:revn:2/);
    });
});

test("noop host rejects tagged frame persist requests that do not match target objectKey", async () => {
    await withService(async ({ host, port }) => {
        const backendRpc = frameBackendRpc("refresh");
        backendRpc.persist.request["object-id"] = "file-1/page-1/frame-2/component";

        const response = await fetch(`http://${host}:${port}/thumbnail`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                operation: "thumbnail.render",
                target: { kind: "frame", fileId: "file-1", pageId: "page-1", objectId: "frame-1", tag: "component", objectKey: "file-1/page-1/frame-1/component" },
                artifact: { format: "png", mimeType: "image/png", extension: ".png", width: 300, height: 200 },
                cache: { policy: "refresh", scope: "file-object-thumbnail", key: "file-1/page-1/frame-1/component" },
                backendRpc,
                render: { required: true, runtime: "render-wasm-worker", fallback: "frontend-rasterizer" },
            }),
        });

        assert.equal(response.status, 400);
        const body = await response.json();
        assert.equal(body.status, "error");
        assert.equal(body.code, "renderer_service_backend_rpc_persist_object_id_mismatch");
        assert.match(body.message, /backendRpc\.persist\.request\.object-id must match file-1\/page-1\/frame-1\/component/);
    });
});

test("noop host rejects invalid artifact dimensions", async () => {
    await withService(async ({ host, port }) => {
        const response = await fetch(`http://${host}:${port}/thumbnail`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                operation: "thumbnail.render",
                target: { kind: "file", fileId: "file-1", revn: 1 },
                artifact: { format: "png", mimeType: "image/png", extension: ".png", width: 0, height: 168 },
                cache: { policy: "reuse", scope: "file-thumbnail", key: "file:file-1:revn:1", probe: "file-thumbnail-by-file-id-and-revn" },
                render: { required: "on-cache-miss", runtime: "render-wasm-worker", fallback: "frontend-rasterizer" },
            }),
        });

        assert.equal(response.status, 400);
        const body = await response.json();
        assert.equal(body.status, "error");
        assert.equal(body.code, "renderer_service_width_invalid");
        assert.match(body.message, /artifact\.width must be an integer between 1 and 4096/);
    });
});

test("noop host rejects render intent that does not match cache policy", async () => {
    await withService(async ({ host, port }) => {
        const response = await fetch(`http://${host}:${port}/thumbnail`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                operation: "thumbnail.render",
                target: { kind: "file", fileId: "file-1", revn: 1 },
                artifact: { format: "png", mimeType: "image/png", extension: ".png", width: 252, height: 168 },
                cache: { policy: "reuse", scope: "file-thumbnail", key: "file:file-1:revn:1", probe: "file-thumbnail-by-file-id-and-revn" },
                render: { required: true, runtime: "render-wasm-worker", fallback: "frontend-rasterizer" },
            }),
        });

        assert.equal(response.status, 400);
        const body = await response.json();
        assert.equal(body.status, "error");
        assert.equal(body.code, "renderer_service_render_required_invalid");
        assert.match(body.message, /render\.required must be on-cache-miss/);
    });
});

test("noop host rejects backend RPC persist intent that does not match cache policy", async () => {
    await withService(async ({ host, port }) => {
        const backendRpc = fileBackendRpc("refresh");
        const response = await fetch(`http://${host}:${port}/thumbnail`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                operation: "thumbnail.render",
                target: { kind: "file", fileId: "file-1", revn: 1 },
                artifact: { format: "png", mimeType: "image/png", extension: ".png", width: 252, height: 168 },
                cache: { policy: "reuse", scope: "file-thumbnail", key: "file:file-1:revn:1", probe: "file-thumbnail-by-file-id-and-revn" },
                backendRpc,
                render: { required: "on-cache-miss", runtime: "render-wasm-worker", fallback: "frontend-rasterizer" },
            }),
        });

        assert.equal(response.status, 400);
        const body = await response.json();
        assert.equal(body.status, "error");
        assert.equal(body.code, "renderer_service_backend_rpc_persist_unexpected");
        assert.match(body.message, /backendRpc\.persist must be null for reuse/);
    });
});

test("noop host lifecycle closes the listening socket", async () => {
    const service = await serviceModule.startRendererService({ port: 0 });
    assert.equal(service.server.listening, true);

    await service.stop();

    assert.equal(service.server.listening, false);
});
