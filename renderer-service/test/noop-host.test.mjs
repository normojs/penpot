import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

const buildPath = "/Volumes/fushilu/.caches/penpot/renderer-service/index.js";
const bundledSceneBridgeRuntimeBuildPath = join(dirname(buildPath), "bundled-scene-bridge-runtime.js");
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

function assertBundledSceneBridgeAdapterModule(readiness) {
    assert.deepEqual(readiness, serviceModule.bundledSceneBridgeAdapterModule);
    assert.equal(readiness.status, "planned-disabled");
    assert.equal(readiness.readinessVersion, "P26.33");
    assert.equal(readiness.owner, "renderer-service");
    assert.equal(readiness.mode, "disabled-module-boundary");
    assert.equal(readiness.module, "./bundled-scene-bridge-runtime.js");
    assert.equal(readiness.exportName, "createBundledSceneBridgeRendererRuntime");
    assert.equal(readiness.defaultServiceImport, false);
    assert.equal(readiness.moduleDefined, true);
    assert.equal(readiness.moduleImported, false);
    assert.equal(readiness.factoryInvoked, false);
    assert.equal(readiness.runtimeRegistration, false);
    assert.equal(readiness.runtimeExecutionRegistered, false);
    assert.equal(readiness.browserProcessStarted, false);
    assert.equal(readiness.runtimeAssetsLoaded, false);
    assert.equal(readiness.localFileWrites, false);
    assert.deepEqual(readiness.diagnosticCodes, [
        "renderer_service_bundled_scene_bridge_adapter_module_defined_disabled",
    ]);
    assert.equal(readiness.sideEffects.runtimeAdapterImported, false);
    assert.equal(readiness.sideEffects.runtimeFactoryInvoked, false);
    assert.equal(readiness.sideEffects.localFileWrites, false);
    assert.equal(readiness.redaction.pathValuesIncluded, false);
    assert.equal(readiness.redaction.sourceDataValuesIncluded, false);
    assert.equal(readiness.omitted.modulePath, true);
    assert.equal(readiness.omitted.sourceData, true);
    assert.equal(readiness.omitted.tokenValues, true);
    assert.equal(readiness.execution, null);
    return readiness;
}

function assertBundledSceneBridgeImportGate(
    gate,
    {
        status = "planned-disabled",
        configured = false,
        requested = false,
        importGateRequested = requested,
        registrationPreflightRequested = false,
    } = {}
) {
    assert.equal(gate.status, status);
    assert.equal(gate.gateVersion, "P26.34");
    assert.equal(gate.owner, "renderer-service");
    assert.equal(gate.mode, "explicit-import-gate");
    assert.equal(gate.env, "PENPOT_RENDERER_SERVICE_BUNDLED_SCENE_BRIDGE_RUNTIME");
    assert.equal(gate.expectedValue, "import-gate");
    assert.deepEqual(gate.acceptedValues, ["import-gate", "registration-preflight"]);
    assert.equal(gate.configured, configured);
    assert.equal(gate.requested, requested);
    assert.equal(gate.importGateRequested, importGateRequested);
    assert.equal(gate.registrationPreflightRequested, registrationPreflightRequested);
    assert.equal(gate.configuration.configured, configured);
    assert.equal(gate.configuration.expectedValue, "import-gate");
    assert.deepEqual(gate.configuration.acceptedValues, ["import-gate", "registration-preflight"]);
    assert.equal(gate.configuration.valueRead, false);
    assert.equal(gate.configuration.valuesIncluded, false);
    assert.equal(gate.configuration.accepted, requested && status !== "invalid");
    assert.equal(gate.configuration.importGateAccepted, importGateRequested && status !== "invalid");
    assert.equal(gate.configuration.registrationPreflightAccepted, registrationPreflightRequested && status !== "invalid");
    assert.equal(gate.conflicts.runtimeModule, false);
    assert.equal(gate.conflicts.browserFixtureRuntime, false);
    assert.equal(gate.gate.importRequiresExplicitConfig, true);
    assert.equal(gate.gate.importEnabled, false);
    assert.equal(gate.gate.importAttempted, false);
    assert.equal(gate.gate.moduleImported, false);
    assert.equal(gate.gate.factoryInvoked, false);
    assert.equal(gate.gate.runtimeRegistration, false);
    assert.equal(gate.gate.runtimeExecutionRegistered, false);
    assert.equal(gate.sideEffects.runtimeAdapterImported, false);
    assert.equal(gate.sideEffects.runtimeFactoryInvoked, false);
    assert.equal(gate.sideEffects.browserProcessStarted, false);
    assert.equal(gate.sideEffects.localFileWrites, false);
    assert.equal(gate.redaction.modeValuesIncluded, false);
    assert.equal(gate.redaction.pathValuesIncluded, false);
    assert.equal(gate.redaction.sourceDataValuesIncluded, false);
    assert.equal(gate.omitted.configuredValue, true);
    assert.equal(gate.omitted.modulePath, true);
    assert.equal(gate.omitted.sourceData, true);
    assert.equal(gate.omitted.tokenValues, true);
    assert.equal(gate.execution, null);
    return gate;
}

function assertBundledSceneBridgeFactoryShapePreflight(preflight) {
    assert.equal(preflight.status, "planned-disabled");
    assert.equal(preflight.preflightVersion, "P26.35");
    assert.equal(preflight.owner, "renderer-service");
    assert.equal(preflight.mode, "closed-factory-shape-preflight");
    assert.equal(preflight.source.contractVersion, "P26.32");
    assert.equal(preflight.source.adapterModuleReadinessVersion, "P26.33");
    assert.equal(preflight.source.importGateVersion, "P26.34");
    assert.equal(preflight.source.importGateRequired, true);
    assert.equal(preflight.source.importGateOpen, false);
    assert.equal(preflight.moduleImport.module, "./bundled-scene-bridge-runtime.js");
    assert.equal(preflight.moduleImport.exportName, "createBundledSceneBridgeRendererRuntime");
    assert.equal(preflight.moduleImport.importAttempted, false);
    assert.equal(preflight.moduleImport.moduleImported, false);
    assert.equal(preflight.moduleImport.namespaceInspected, false);
    assert.equal(preflight.factoryShape.expectedType, "function");
    assert.equal(preflight.factoryShape.factoryPresent, false);
    assert.equal(preflight.factoryShape.shapeCheckAttempted, false);
    assert.equal(preflight.factoryShape.factoryInvoked, false);
    assert.deepEqual(preflight.factoryShape.requiredOptionKeys, ["assetManifest", "runtimeAssetPreflight", "browser"]);
    assert.deepEqual(preflight.runtimeOptionsShape.requiredKeys, ["renderThumbnail"]);
    assert.deepEqual(preflight.runtimeOptionsShape.optionalKeys, ["close"]);
    assert.equal(preflight.runtimeOptionsShape.runtimeOptionsCreated, false);
    assert.equal(preflight.runtimeOptionsShape.renderThumbnailChecked, false);
    assert.equal(preflight.runtimeOptionsShape.runtimeRegistration, false);
    assert.deepEqual(
        preflight.importOutcomeTaxonomy.map((entry) => entry.code),
        [
            "renderer_service_bundled_scene_bridge_factory_shape_import_disabled",
            "renderer_service_bundled_scene_bridge_factory_shape_export_missing",
            "renderer_service_bundled_scene_bridge_factory_shape_not_callable",
            "renderer_service_bundled_scene_bridge_factory_shape_result_invalid",
        ]
    );
    assert.deepEqual(preflight.diagnosticCodes, [
        "renderer_service_bundled_scene_bridge_factory_shape_preflight_defined_disabled",
    ]);
    assert.equal(preflight.sideEffects.runtimeAdapterImported, false);
    assert.equal(preflight.sideEffects.runtimeFactoryInvoked, false);
    assert.equal(preflight.sideEffects.runtimeOptionsCreated, false);
    assert.equal(preflight.sideEffects.browserProcessStarted, false);
    assert.equal(preflight.sideEffects.localFileWrites, false);
    assert.equal(preflight.redaction.moduleValuesIncluded, false);
    assert.equal(preflight.redaction.pathValuesIncluded, false);
    assert.equal(preflight.redaction.sourceDataValuesIncluded, false);
    assert.equal(preflight.omitted.moduleNamespace, true);
    assert.equal(preflight.omitted.factoryValue, true);
    assert.equal(preflight.omitted.runtimeOptionsValue, true);
    assert.equal(preflight.omitted.modulePath, true);
    assert.equal(preflight.omitted.sourceData, true);
    assert.equal(preflight.omitted.tokenValues, true);
    assert.equal(preflight.execution, null);
    return preflight;
}

function assertBundledSceneBridgeModuleNamespaceImportPreflight(
    preflight,
    { status = "planned-disabled", importGateOpen = false, importAttempted = false, moduleImported = false, factoryPresent = false, factoryCallable = false } = {}
) {
    assert.equal(preflight.status, status);
    assert.equal(preflight.preflightVersion, "P26.36");
    assert.equal(preflight.owner, "renderer-service");
    assert.equal(preflight.mode, "gated-module-namespace-import-preflight");
    assert.equal(preflight.source.contractVersion, "P26.32");
    assert.equal(preflight.source.adapterModuleReadinessVersion, "P26.33");
    assert.equal(preflight.source.importGateVersion, "P26.34");
    assert.equal(preflight.source.factoryShapePreflightVersion, "P26.35");
    assert.equal(preflight.source.importGateRequired, true);
    assert.equal(preflight.source.importGateOpen, importGateOpen);
    assert.equal(preflight.moduleImport.module, "./bundled-scene-bridge-runtime.js");
    assert.equal(preflight.moduleImport.moduleType, "service-owned-es-module");
    assert.equal(preflight.moduleImport.exportName, "createBundledSceneBridgeRendererRuntime");
    assert.equal(preflight.moduleImport.importAttempted, importAttempted);
    assert.equal(preflight.moduleImport.moduleImported, moduleImported);
    assert.equal(preflight.moduleImport.namespaceInspected, moduleImported);
    assert.equal(preflight.moduleImport.importSucceeded, moduleImported);
    assert.equal(preflight.moduleImport.valuesIncluded, false);
    assert.equal(preflight.factoryShape.expectedType, "function");
    assert.equal(preflight.factoryShape.expectedSignature, "(options) => Promise<RendererRuntimeOptions>");
    assert.equal(preflight.factoryShape.factoryPresent, factoryPresent);
    assert.equal(preflight.factoryShape.callableChecked, importAttempted && moduleImported);
    assert.equal(preflight.factoryShape.factoryCallable, factoryCallable);
    assert.equal(preflight.factoryShape.factoryInvoked, false);
    assert.equal(preflight.factoryShape.valuesIncluded, false);
    assert.equal(preflight.runtimeOptionsShape.runtimeOptionsCreated, false);
    assert.equal(preflight.runtimeOptionsShape.shapeCheckAttempted, false);
    assert.equal(preflight.runtimeOptionsShape.runtimeRegistration, false);
    assert.equal(preflight.runtimeOptionsShape.runtimeExecutionRegistered, false);
    assert.equal(preflight.runtimeOptionsShape.valuesIncluded, false);
    assert.deepEqual(
        preflight.importOutcomeTaxonomy.map((entry) => entry.code),
        [
            "renderer_service_bundled_scene_bridge_module_namespace_import_gate_closed",
            "renderer_service_bundled_scene_bridge_module_namespace_import_failed",
            "renderer_service_bundled_scene_bridge_module_namespace_export_missing",
            "renderer_service_bundled_scene_bridge_module_namespace_export_not_callable",
            "renderer_service_bundled_scene_bridge_module_namespace_import_ready",
        ]
    );
    assert.equal(preflight.sideEffects.runtimeAdapterImported, moduleImported);
    assert.equal(preflight.sideEffects.runtimeFactoryInvoked, false);
    assert.equal(preflight.sideEffects.runtimeOptionsCreated, false);
    assert.equal(preflight.sideEffects.browserProcessStarted, false);
    assert.equal(preflight.sideEffects.runtimeAssetsLoaded, false);
    assert.equal(preflight.sideEffects.backendRpcReads, false);
    assert.equal(preflight.sideEffects.localFileWrites, false);
    assert.equal(preflight.redaction.moduleValuesIncluded, false);
    assert.equal(preflight.redaction.pathValuesIncluded, false);
    assert.equal(preflight.redaction.sourceDataValuesIncluded, false);
    assert.equal(preflight.omitted.moduleNamespace, true);
    assert.equal(preflight.omitted.factoryValue, true);
    assert.equal(preflight.omitted.runtimeOptionsValue, true);
    assert.equal(preflight.omitted.modulePath, true);
    assert.equal(preflight.omitted.sourceData, true);
    assert.equal(preflight.omitted.tokenValues, true);
    if (importAttempted) {
        assert.equal(preflight.execution.attempted, true);
        assert.equal(preflight.execution.importGateAccepted, true);
        assert.equal(preflight.execution.moduleImported, moduleImported);
        assert.equal(preflight.execution.namespaceInspected, moduleImported);
        assert.equal(preflight.execution.factoryPresent, factoryPresent);
        assert.equal(preflight.execution.factoryCallable, factoryCallable);
        assert.equal(preflight.execution.factoryInvoked, false);
        assert.equal(preflight.execution.runtimeOptionsCreated, false);
        assert.equal(preflight.execution.runtimeRegistration, false);
        assert.equal(preflight.execution.valuesIncluded, false);
    } else {
        assert.equal(preflight.execution, null);
    }
    return preflight;
}

function assertBundledSceneBridgeFactoryInvocationPreflight(
    preflight,
    { status = "planned-disabled", namespaceImportReady = false, factoryInvoked = false, runtimeOptionsCreated = false } = {}
) {
    assert.equal(preflight.status, status);
    assert.equal(preflight.preflightVersion, "P26.38");
    assert.equal(preflight.owner, "renderer-service");
    assert.equal(preflight.mode, "guarded-factory-invocation-preflight");
    assert.equal(preflight.source.contractVersion, "P26.32");
    assert.equal(preflight.source.adapterModuleReadinessVersion, "P26.33");
    assert.equal(preflight.source.importGateVersion, "P26.34");
    assert.equal(preflight.source.factoryShapePreflightVersion, "P26.35");
    assert.equal(preflight.source.moduleNamespaceImportPreflightVersion, "P26.36");
    assert.equal(preflight.source.namespaceImportReady, namespaceImportReady);
    assert.equal(
        preflight.source.readiness,
        namespaceImportReady ? "ready-for-guarded-factory-invocation" : "blocked-until-namespace-import-ready"
    );
    assert.equal(preflight.guard.namespaceImportRequired, true);
    assert.equal(preflight.guard.explicitFutureInvocationGateRequired, true);
    assert.equal(preflight.guard.invocationEnabled, factoryInvoked);
    assert.equal(preflight.guard.invocationAttempted, factoryInvoked);
    assert.equal(preflight.guard.factoryInvoked, factoryInvoked);
    assert.equal(preflight.guard.runtimeOptionsCreated, runtimeOptionsCreated);
    assert.equal(preflight.guard.runtimeRegistration, false);
    assert.equal(preflight.factoryInvocation.exportName, "createBundledSceneBridgeRendererRuntime");
    assert.equal(preflight.factoryInvocation.expectedSignature, "(options) => Promise<RendererRuntimeOptions>");
    assert.equal(preflight.factoryInvocation.inertOptionsRequired, true);
    assert.equal(preflight.factoryInvocation.invocationAttempted, factoryInvoked);
    assert.equal(preflight.factoryInvocation.factoryInvoked, factoryInvoked);
    assert.equal(preflight.factoryInvocation.promiseAwaited, factoryInvoked);
    assert.equal(preflight.factoryInvocation.resultAccepted, status === "ready");
    assert.deepEqual(preflight.inertOptionsPlan.requiredOptionKeys, ["assetManifest", "runtimeAssetPreflight", "browser"]);
    assert.equal(preflight.inertOptionsPlan.optionValuesCreated, factoryInvoked);
    assert.equal(preflight.inertOptionsPlan.optionValuesIncluded, false);
    assert.equal(preflight.inertOptionsPlan.browserProcessStarted, false);
    assert.equal(preflight.inertOptionsPlan.runtimeAssetsLoaded, false);
    assert.deepEqual(preflight.runtimeOptionsShape.requiredKeys, ["renderThumbnail"]);
    assert.deepEqual(preflight.runtimeOptionsShape.optionalKeys, ["close"]);
    assert.equal(preflight.runtimeOptionsShape.runtimeOptionsCreated, runtimeOptionsCreated);
    assert.equal(preflight.runtimeOptionsShape.shapeCheckAttempted, factoryInvoked);
    assert.equal(preflight.runtimeOptionsShape.renderThumbnailChecked, factoryInvoked);
    assert.equal(preflight.runtimeOptionsShape.closeHookChecked, factoryInvoked);
    assert.equal(preflight.runtimeOptionsShape.runtimeRegistration, false);
    assert.deepEqual(
        preflight.invocationOutcomeTaxonomy.map((entry) => entry.code),
        [
            "renderer_service_bundled_scene_bridge_factory_invocation_namespace_not_ready",
            "renderer_service_bundled_scene_bridge_factory_invocation_disabled",
            "renderer_service_bundled_scene_bridge_factory_invocation_rejected",
            "renderer_service_bundled_scene_bridge_factory_invocation_result_invalid",
            "renderer_service_bundled_scene_bridge_factory_invocation_ready",
        ]
    );
    assert.deepEqual(preflight.diagnosticCodes, [
        status === "ready"
            ? "renderer_service_bundled_scene_bridge_factory_invocation_ready"
            : "renderer_service_bundled_scene_bridge_factory_invocation_namespace_not_ready",
    ]);
    assert.equal(preflight.sideEffects.runtimeAdapterImported, factoryInvoked);
    assert.equal(preflight.sideEffects.runtimeFactoryInvoked, factoryInvoked);
    assert.equal(preflight.sideEffects.runtimeOptionsCreated, runtimeOptionsCreated);
    assert.equal(preflight.sideEffects.browserProcessStarted, false);
    assert.equal(preflight.sideEffects.runtimeAssetsLoaded, false);
    assert.equal(preflight.sideEffects.localFileWrites, false);
    assert.equal(preflight.redaction.moduleValuesIncluded, false);
    assert.equal(preflight.redaction.factoryValuesIncluded, false);
    assert.equal(preflight.redaction.runtimeOptionsValuesIncluded, false);
    assert.equal(preflight.redaction.optionValuesIncluded, false);
    assert.equal(preflight.omitted.moduleNamespace, true);
    assert.equal(preflight.omitted.factoryValue, true);
    assert.equal(preflight.omitted.runtimeOptionsValue, true);
    assert.equal(preflight.omitted.optionValues, true);
    assert.equal(preflight.omitted.modulePath, true);
    assert.equal(preflight.omitted.sourceData, true);
    assert.equal(preflight.omitted.tokenValues, true);
    if (factoryInvoked) {
        assert.equal(preflight.execution.attempted, true);
        assert.equal(preflight.execution.succeeded, status === "ready");
        assert.equal(preflight.execution.outcome, status === "ready" ? "ready" : "result-invalid");
        assert.equal(preflight.execution.namespaceImportReady, true);
        assert.equal(preflight.execution.moduleImported, true);
        assert.equal(preflight.execution.factoryInvoked, true);
        assert.equal(preflight.execution.inertOptionsCreated, true);
        assert.equal(preflight.execution.runtimeOptionsCreated, runtimeOptionsCreated);
        assert.equal(preflight.execution.runtimeOptionsShapeValid, status === "ready");
        assert.equal(preflight.execution.runtimeRegistration, false);
        assert.equal(preflight.execution.renderDispatch, false);
        assert.equal(preflight.execution.browserProcessStarted, false);
        assert.equal(preflight.execution.runtimeAssetsLoaded, false);
        assert.equal(preflight.execution.valuesIncluded, false);
    } else {
        assert.equal(preflight.execution, null);
    }
    return preflight;
}

function assertBundledSceneBridgeRuntimeRegistrationPreflight(
    preflight,
    { status = "planned-disabled", factoryInvocationReady = false, registrationPreflightGateOpen = false } = {}
) {
    const lifecycleReady = factoryInvocationReady && registrationPreflightGateOpen;
    assert.equal(preflight.status, status);
    assert.equal(preflight.preflightVersion, "P26.40");
    assert.equal(preflight.owner, "renderer-service");
    assert.equal(preflight.mode, "guarded-runtime-registration-preflight");
    assert.equal(preflight.source.contractVersion, "P26.32");
    assert.equal(preflight.source.adapterModuleReadinessVersion, "P26.33");
    assert.equal(preflight.source.importGateVersion, "P26.34");
    assert.equal(preflight.source.factoryShapePreflightVersion, "P26.35");
    assert.equal(preflight.source.moduleNamespaceImportPreflightVersion, "P26.36");
    assert.equal(preflight.source.factoryInvocationPreflightVersion, "P26.38");
    assert.equal(preflight.source.registrationPreflightGateVersion, "P26.40");
    assert.equal(preflight.source.factoryInvocationReady, factoryInvocationReady);
    assert.equal(preflight.source.factoryInvocationExecuted, factoryInvocationReady);
    assert.equal(preflight.source.runtimeOptionsShapeReady, factoryInvocationReady);
    assert.equal(preflight.source.registrationPreflightGateOpen, lifecycleReady);
    assert.equal(
        preflight.source.readiness,
        lifecycleReady
            ? "runtime-registration-preflight-ready"
            : factoryInvocationReady
              ? "blocked-until-registration-preflight-gate-opens"
            : "blocked-until-factory-invocation-ready"
    );
    assert.equal(preflight.guard.factoryInvocationReadyRequired, true);
    assert.equal(preflight.guard.explicitFutureRegistrationGateRequired, true);
    assert.equal(preflight.guard.explicitRegistrationPreflightGateRequired, true);
    assert.equal(preflight.guard.registrationPreflightGateOpen, lifecycleReady);
    assert.equal(preflight.guard.registrationEnabled, false);
    assert.equal(preflight.guard.registrationAttempted, false);
    assert.equal(preflight.guard.runtimeRegistered, false);
    assert.equal(preflight.guard.runtimeRegistration, false);
    assert.equal(preflight.guard.runtimeExecutionRegistered, false);
    assert.equal(preflight.guard.renderDispatch, false);
    assert.equal(preflight.registrationContract.runtimeId, "bundled-scene-bridge");
    assert.equal(preflight.registrationContract.targetRegistry, "renderer-service.thumbnail-runtime-registry");
    assert.deepEqual(preflight.registrationContract.requiredRuntimeOptionKeys, ["renderThumbnail"]);
    assert.deepEqual(preflight.registrationContract.optionalRuntimeOptionKeys, ["close"]);
    assert.deepEqual(preflight.registrationContract.requiredRegistrationInputs, ["runtimeId", "runtimeOptions", "lifecycleOwner"]);
    assert.equal(preflight.registrationContract.duplicateRegistrationPolicy, "reject-until-explicit-replace-policy");
    assert.equal(preflight.registrationContract.renderDispatchEnabledAfterRegistration, false);
    assert.equal(preflight.registrationContract.valuesIncluded, false);
    assert.equal(preflight.lifecycleCleanup.lifecycleOwner, "renderer-service");
    assert.equal(preflight.lifecycleCleanup.closeHookPolicy, "register-close-if-present-call-on-unregister");
    assert.equal(preflight.lifecycleCleanup.closeHookRequired, false);
    assert.equal(preflight.lifecycleCleanup.cleanupOnRegistrationFailure, true);
    assert.equal(preflight.lifecycleCleanup.cleanupOnServiceStop, true);
    for (const property of [
        "closeHookRegistered",
        "closeAttempted",
        "closeSucceeded",
        "closeFailed",
        "browserProcessStarted",
        "browserPageCreated",
        "runtimeAssetsLoaded",
        "localFileWrites",
        "valuesIncluded",
    ]) {
        assert.equal(preflight.lifecycleCleanup[property], false);
    }
    assert.deepEqual(
        preflight.registrationOutcomeTaxonomy.map((entry) => entry.code),
        [
            "renderer_service_bundled_scene_bridge_runtime_registration_factory_not_ready",
            "renderer_service_bundled_scene_bridge_runtime_registration_disabled",
            "renderer_service_bundled_scene_bridge_runtime_registration_runtime_options_invalid",
            "renderer_service_bundled_scene_bridge_runtime_registration_lifecycle_cleanup_invalid",
            "renderer_service_bundled_scene_bridge_runtime_registration_ready",
        ]
    );
    assert.deepEqual(preflight.diagnosticCodes, [
        lifecycleReady
            ? "renderer_service_bundled_scene_bridge_runtime_registration_ready"
            : factoryInvocationReady
              ? "renderer_service_bundled_scene_bridge_runtime_registration_disabled"
            : "renderer_service_bundled_scene_bridge_runtime_registration_factory_not_ready",
    ]);
    assert.deepEqual(
        preflight.checks.map((entry) => [entry.id, entry.status, entry.dispatch]),
        [
            ["factory-invocation-ready", factoryInvocationReady ? "passed" : "blocked", false],
            ["runtime-options-registration-shape", factoryInvocationReady ? "passed" : "blocked", false],
            ["registration-preflight-gate", lifecycleReady ? "passed" : "blocked", false],
            ["lifecycle-cleanup-contract", lifecycleReady ? "passed" : "planned", false],
            ["registration-outcome-taxonomy", lifecycleReady ? "passed" : "planned", false],
        ]
    );
    for (const property of [
        "runtimeRegistration",
        "runtimeExecutionRegistered",
        "renderDispatch",
        "browserProcessStarted",
        "browserPageCreated",
        "runtimeAdapterImported",
        "runtimeFactoryInvoked",
        "runtimeOptionsCreated",
        "runtimeAssetsLoaded",
        "assetManifestMaterialized",
        "backendRpcReads",
        "sourceDataReads",
        "networkDispatch",
        "dispatch",
        "localFileWrites",
    ]) {
        assert.equal(preflight.sideEffects[property], false);
    }
    for (const property of [
        "moduleValuesIncluded",
        "factoryValuesIncluded",
        "runtimeOptionsValuesIncluded",
        "optionValuesIncluded",
        "registryValuesIncluded",
        "lifecycleValuesIncluded",
        "pathValuesIncluded",
        "sourceDataValuesIncluded",
        "pageValuesIncluded",
        "artifactValuesIncluded",
        "mediaValuesIncluded",
        "tokenValuesIncluded",
    ]) {
        assert.equal(preflight.redaction[property], false);
    }
    for (const property of [
        "moduleNamespace",
        "factoryValue",
        "runtimeOptionsValue",
        "optionValues",
        "registryValue",
        "lifecycleHandles",
        "workspaceRoot",
        "cacheRoot",
        "modulePath",
        "publicPaths",
        "cachePaths",
        "sha256",
        "playwrightBrowserPath",
        "runtimeModulePath",
        "sourceData",
        "pageData",
        "artifactBytes",
        "mediaBytes",
        "tokenValues",
    ]) {
        assert.equal(preflight.omitted[property], true);
    }
    assert.equal(preflight.execution, null);
    return preflight;
}

function assertBundledSceneBridgeRuntimeRegistryRegistrationBoundary(
    boundary,
    { runtimeRegistrationPreflightReady = false } = {}
) {
    assert.equal(boundary.status, "planned-disabled");
    assert.equal(boundary.boundaryVersion, "P26.41");
    assert.equal(boundary.owner, "renderer-service");
    assert.equal(boundary.mode, "no-dispatch-runtime-registry-registration-boundary");
    assert.equal(boundary.source.contractVersion, "P26.32");
    assert.equal(boundary.source.runtimeRegistrationPreflightVersion, "P26.40");
    assert.equal(boundary.source.registryBoundaryVersion, "P26.41");
    assert.equal(boundary.source.runtimeRegistrationPreflightReady, runtimeRegistrationPreflightReady);
    assert.equal(boundary.source.runtimeRegistrationPreflightStatus, runtimeRegistrationPreflightReady ? "ready" : "planned-disabled");
    assert.equal(boundary.source.registrationPreflightGateOpen, runtimeRegistrationPreflightReady);
    assert.equal(
        boundary.source.readiness,
        runtimeRegistrationPreflightReady
            ? "registry-registration-boundary-planned"
            : "blocked-until-runtime-registration-preflight-ready"
    );
    assert.equal(boundary.guard.runtimeRegistrationPreflightReadyRequired, true);
    assert.equal(boundary.guard.explicitFutureRegistryRegistrationGateRequired, true);
    for (const property of [
        "registryRegistrationEnabled",
        "registryRegistrationAttempted",
        "runtimeInstalled",
        "runtimeRegistered",
        "runtimeRegistration",
        "runtimeExecutionRegistered",
        "renderDispatch",
        "browserProcessStarted",
        "registryValuesIncluded",
    ]) {
        assert.equal(boundary.guard[property], false);
    }
    assert.equal(boundary.registrySlot.runtimeId, "bundled-scene-bridge");
    assert.equal(boundary.registrySlot.targetRegistry, "renderer-service.thumbnail-runtime-registry");
    assert.equal(boundary.registrySlot.slotOwner, "renderer-service");
    assert.equal(boundary.registrySlot.slotStatus, "planned-empty");
    for (const property of ["runtimeInstalled", "runtimeAvailableForDispatch", "renderDispatchEnabled", "valuesIncluded"]) {
        assert.equal(boundary.registrySlot[property], false);
    }
    assert.equal(boundary.duplicateRegistrationPolicy.duplicateRegistrationPolicy, "reject-until-explicit-replace-policy");
    assert.equal(boundary.duplicateRegistrationPolicy.replacementPolicy, "not-supported-until-reviewed");
    for (const property of ["existingRuntimeLookup", "existingRuntimeValuesIncluded", "duplicateReplacementAttempted", "valuesIncluded"]) {
        assert.equal(boundary.duplicateRegistrationPolicy[property], false);
    }
    assert.equal(boundary.runtimeAvailability.status, "metadata-only");
    assert.equal(boundary.runtimeAvailability.runtimeId, "bundled-scene-bridge");
    for (const property of [
        "runtimeInstalled",
        "runtimeValueAvailable",
        "runtimeAvailableForDispatch",
        "renderDispatchEnabled",
        "valuesIncluded",
    ]) {
        assert.equal(boundary.runtimeAvailability[property], false);
    }
    assert.equal(boundary.lifecycleCleanup.lifecycleOwner, "renderer-service");
    assert.equal(boundary.lifecycleCleanup.closeHookPolicy, "register-close-if-present-call-on-unregister");
    assert.equal(boundary.lifecycleCleanup.closeHookRequired, false);
    assert.equal(boundary.lifecycleCleanup.cleanupOnDuplicateRejected, true);
    assert.equal(boundary.lifecycleCleanup.cleanupOnRegistrationFailure, true);
    assert.equal(boundary.lifecycleCleanup.cleanupOnServiceStop, true);
    for (const property of [
        "closeHookRegistered",
        "closeAttempted",
        "closeSucceeded",
        "closeFailed",
        "browserProcessStarted",
        "browserPageCreated",
        "runtimeAssetsLoaded",
        "localFileWrites",
        "valuesIncluded",
    ]) {
        assert.equal(boundary.lifecycleCleanup[property], false);
    }
    assert.deepEqual(
        boundary.boundaryOutcomeTaxonomy.map((entry) => entry.code),
        [
            "renderer_service_bundled_scene_bridge_runtime_registry_registration_boundary_preflight_not_ready",
            "renderer_service_bundled_scene_bridge_runtime_registry_registration_boundary_planned",
            "renderer_service_bundled_scene_bridge_runtime_registry_registration_duplicate_rejected",
            "renderer_service_bundled_scene_bridge_runtime_registry_registration_replacement_unsupported",
            "renderer_service_bundled_scene_bridge_runtime_registry_registration_cleanup_invalid",
        ]
    );
    assert.deepEqual(boundary.diagnosticCodes, [
        runtimeRegistrationPreflightReady
            ? "renderer_service_bundled_scene_bridge_runtime_registry_registration_boundary_planned"
            : "renderer_service_bundled_scene_bridge_runtime_registry_registration_boundary_preflight_not_ready",
    ]);
    assert.deepEqual(
        boundary.checks.map((entry) => [entry.id, entry.status, entry.dispatch]),
        [
            ["runtime-registration-preflight-ready", runtimeRegistrationPreflightReady ? "passed" : "blocked", false],
            ["registry-slot-plan", "planned", false],
            ["duplicate-registration-policy", "planned", false],
            ["lifecycle-cleanup-plan", "planned", false],
            ["no-dispatch-runtime-availability", "planned", false],
        ]
    );
    for (const property of [
        "registryLookup",
        "runtimeInstallation",
        "runtimeRegistration",
        "runtimeExecutionRegistered",
        "renderDispatch",
        "browserProcessStarted",
        "browserPageCreated",
        "runtimeAdapterImported",
        "runtimeFactoryInvoked",
        "runtimeOptionsCreated",
        "runtimeAssetsLoaded",
        "assetManifestMaterialized",
        "backendRpcReads",
        "sourceDataReads",
        "networkDispatch",
        "dispatch",
        "localFileWrites",
    ]) {
        assert.equal(boundary.sideEffects[property], false);
    }
    for (const property of [
        "moduleValuesIncluded",
        "factoryValuesIncluded",
        "runtimeOptionsValuesIncluded",
        "optionValuesIncluded",
        "runtimeValuesIncluded",
        "registryValuesIncluded",
        "lifecycleValuesIncluded",
        "pathValuesIncluded",
        "sourceDataValuesIncluded",
        "pageValuesIncluded",
        "artifactValuesIncluded",
        "mediaValuesIncluded",
        "tokenValuesIncluded",
    ]) {
        assert.equal(boundary.redaction[property], false);
    }
    for (const property of [
        "moduleNamespace",
        "factoryValue",
        "runtimeOptionsValue",
        "optionValues",
        "runtimeValue",
        "registryValue",
        "lifecycleHandles",
        "workspaceRoot",
        "cacheRoot",
        "modulePath",
        "publicPaths",
        "cachePaths",
        "sha256",
        "playwrightBrowserPath",
        "runtimeModulePath",
        "sourceData",
        "pageData",
        "artifactBytes",
        "mediaBytes",
        "tokenValues",
    ]) {
        assert.equal(boundary.omitted[property], true);
    }
    assert.equal(boundary.execution, null);
    return boundary;
}

function assertBundledSceneBridgeRuntimeRegistryInstallationContract(
    contract,
    { registryRegistrationBoundaryReady = false } = {}
) {
    assert.equal(contract.status, "planned-disabled");
    assert.equal(contract.contractVersion, "P26.42");
    assert.equal(contract.owner, "renderer-service");
    assert.equal(contract.mode, "guarded-runtime-registry-installation-contract");
    assert.equal(contract.source.runtimeRegistrationPreflightVersion, "P26.40");
    assert.equal(contract.source.registryRegistrationBoundaryVersion, "P26.41");
    assert.equal(contract.source.registryInstallationContractVersion, "P26.42");
    assert.equal(contract.source.runtimeRegistrationPreflightReady, registryRegistrationBoundaryReady);
    assert.equal(contract.source.registryRegistrationBoundaryReady, registryRegistrationBoundaryReady);
    assert.equal(contract.source.registryRegistrationBoundaryStatus, "planned-disabled");
    assert.equal(contract.source.registrySlotStatus, "planned-empty");
    assert.equal(
        contract.source.readiness,
        registryRegistrationBoundaryReady
            ? "runtime-registry-installation-contract-planned"
            : "blocked-until-registry-registration-boundary-ready"
    );
    assert.equal(contract.guard.registryRegistrationBoundaryReadyRequired, true);
    assert.equal(contract.guard.explicitFutureInstallationGateRequired, true);
    for (const property of [
        "runtimeInstallationEnabled",
        "runtimeInstallationAttempted",
        "runtimeInstalled",
        "runtimeRegistered",
        "runtimeRegistration",
        "runtimeExecutionRegistered",
        "renderDispatch",
        "browserProcessStarted",
        "runtimeValuesIncluded",
        "registryValuesIncluded",
    ]) {
        assert.equal(contract.guard[property], false);
    }
    assert.equal(contract.runtimeValueShape.runtimeId, "bundled-scene-bridge");
    assert.equal(contract.runtimeValueShape.targetRegistry, "renderer-service.thumbnail-runtime-registry");
    assert.deepEqual(contract.runtimeValueShape.requiredMethods, ["renderThumbnail"]);
    assert.deepEqual(contract.runtimeValueShape.optionalMethods, ["close"]);
    assert.deepEqual(contract.runtimeValueShape.requiredInstallationInputs, ["runtimeId", "runtimeValue", "lifecycleOwner"]);
    for (const property of [
        "runtimeValueCreated",
        "runtimeValueInstalled",
        "renderDispatchEnabledAfterInstallation",
        "valuesIncluded",
    ]) {
        assert.equal(contract.runtimeValueShape[property], false);
    }
    assert.equal(contract.closeHookOwnership.lifecycleOwner, "renderer-service");
    assert.equal(contract.closeHookOwnership.closeHookOwner, "renderer-service");
    assert.equal(contract.closeHookOwnership.closeHookSource, "runtime.close");
    assert.equal(contract.closeHookOwnership.closeHookRequired, false);
    for (const property of [
        "closeHookRegistered",
        "closeAttempted",
        "closeSucceeded",
        "closeFailed",
        "browserProcessStarted",
        "browserPageCreated",
        "runtimeAssetsLoaded",
        "localFileWrites",
        "valuesIncluded",
    ]) {
        assert.equal(contract.closeHookOwnership[property], false);
    }
    assert.equal(contract.duplicateRollbackHandling.duplicateDetectionRequired, true);
    assert.equal(contract.duplicateRollbackHandling.duplicateRegistrationPolicy, "reject-until-explicit-replace-policy");
    assert.equal(contract.duplicateRollbackHandling.replacementPolicy, "not-supported-until-reviewed");
    assert.equal(contract.duplicateRollbackHandling.rollbackRequiredOnDuplicate, true);
    assert.equal(contract.duplicateRollbackHandling.cleanupOnInstallationFailure, true);
    assert.equal(contract.duplicateRollbackHandling.cleanupOnServiceStop, true);
    for (const property of [
        "existingRuntimeLookup",
        "existingRuntimeValuesIncluded",
        "duplicateDetected",
        "rollbackAttempted",
        "rollbackSucceeded",
        "rollbackFailed",
        "valuesIncluded",
    ]) {
        assert.equal(contract.duplicateRollbackHandling[property], false);
    }
    assert.deepEqual(
        contract.installationOutcomeTaxonomy.map((entry) => entry.code),
        [
            "renderer_service_bundled_scene_bridge_runtime_registry_installation_contract_boundary_not_ready",
            "renderer_service_bundled_scene_bridge_runtime_registry_installation_contract_planned",
            "renderer_service_bundled_scene_bridge_runtime_registry_installation_runtime_value_invalid",
            "renderer_service_bundled_scene_bridge_runtime_registry_installation_close_hook_invalid",
            "renderer_service_bundled_scene_bridge_runtime_registry_installation_duplicate_rollback_invalid",
        ]
    );
    assert.deepEqual(contract.diagnosticCodes, [
        registryRegistrationBoundaryReady
            ? "renderer_service_bundled_scene_bridge_runtime_registry_installation_contract_planned"
            : "renderer_service_bundled_scene_bridge_runtime_registry_installation_contract_boundary_not_ready",
    ]);
    assert.deepEqual(
        contract.checks.map((entry) => [entry.id, entry.status, entry.dispatch]),
        [
            ["registry-registration-boundary-ready", registryRegistrationBoundaryReady ? "passed" : "blocked", false],
            ["runtime-value-shape-contract", "planned", false],
            ["close-hook-ownership-contract", "planned", false],
            ["duplicate-rollback-handling", "planned", false],
            ["invalid-installation-diagnostics", "planned", false],
        ]
    );
    for (const property of [
        "registryLookup",
        "runtimeValueCreation",
        "runtimeInstallation",
        "runtimeRegistration",
        "runtimeExecutionRegistered",
        "closeHookRegistration",
        "duplicateRollback",
        "renderDispatch",
        "browserProcessStarted",
        "browserPageCreated",
        "runtimeAdapterImported",
        "runtimeFactoryInvoked",
        "runtimeOptionsCreated",
        "runtimeAssetsLoaded",
        "assetManifestMaterialized",
        "backendRpcReads",
        "sourceDataReads",
        "networkDispatch",
        "dispatch",
        "localFileWrites",
    ]) {
        assert.equal(contract.sideEffects[property], false);
    }
    for (const property of [
        "moduleValuesIncluded",
        "factoryValuesIncluded",
        "runtimeOptionsValuesIncluded",
        "optionValuesIncluded",
        "runtimeValuesIncluded",
        "registryValuesIncluded",
        "lifecycleValuesIncluded",
        "pathValuesIncluded",
        "sourceDataValuesIncluded",
        "pageValuesIncluded",
        "artifactValuesIncluded",
        "mediaValuesIncluded",
        "tokenValuesIncluded",
    ]) {
        assert.equal(contract.redaction[property], false);
    }
    for (const property of [
        "moduleNamespace",
        "factoryValue",
        "runtimeOptionsValue",
        "optionValues",
        "runtimeValue",
        "registryValue",
        "lifecycleHandles",
        "workspaceRoot",
        "cacheRoot",
        "modulePath",
        "publicPaths",
        "cachePaths",
        "sha256",
        "playwrightBrowserPath",
        "runtimeModulePath",
        "sourceData",
        "pageData",
        "artifactBytes",
        "mediaBytes",
        "tokenValues",
    ]) {
        assert.equal(contract.omitted[property], true);
    }
    assert.equal(contract.execution, null);
    return contract;
}

function assertBundledSceneBridgeRuntimeRegistryInstallationGate(
    gate,
    { contractReady = false, reviewed = false, invalid = false } = {}
) {
    const configured = reviewed || invalid;
    const expectedStatus = invalid ? "invalid" : reviewed ? "configured-disabled" : "planned-disabled";
    const expectedReadiness = invalid
        ? "invalid-installation-gate-configuration"
        : reviewed
          ? "installation-gate-reviewed-disabled"
          : contractReady
            ? "blocked-until-installation-gate-reviewed"
            : "blocked-until-installation-contract-ready";
    const expectedRefusalReason = invalid
        ? "installation-gate-configuration-invalid"
        : reviewed
          ? "installation-disabled-until-runtime-installation-task"
          : contractReady
            ? "installation-gate-not-reviewed"
            : "installation-contract-not-ready";
    const expectedDiagnosticCode = invalid
        ? "renderer_service_bundled_scene_bridge_runtime_registry_installation_gate_configuration_invalid"
        : reviewed
          ? "renderer_service_bundled_scene_bridge_runtime_registry_installation_gate_reviewed_disabled"
          : contractReady
            ? "renderer_service_bundled_scene_bridge_runtime_registry_installation_gate_not_configured"
            : "renderer_service_bundled_scene_bridge_runtime_registry_installation_gate_contract_not_ready";

    assert.equal(gate.status, expectedStatus);
    assert.equal(gate.gateVersion, "P26.43");
    assert.equal(gate.owner, "renderer-service");
    assert.equal(gate.mode, "guarded-runtime-registry-installation-gate");
    assert.equal(gate.source.runtimeRegistrationPreflightVersion, "P26.40");
    assert.equal(gate.source.registryRegistrationBoundaryVersion, "P26.41");
    assert.equal(gate.source.registryInstallationContractVersion, "P26.42");
    assert.equal(gate.source.registryInstallationGateVersion, "P26.43");
    assert.equal(gate.source.runtimeRegistrationPreflightReady, contractReady);
    assert.equal(gate.source.registryRegistrationBoundaryReady, contractReady);
    assert.equal(gate.source.registryInstallationContractReady, contractReady);
    assert.equal(gate.source.registryInstallationContractStatus, "planned-disabled");
    assert.equal(
        gate.source.registryInstallationContractReadiness,
        contractReady
            ? "runtime-registry-installation-contract-planned"
            : "blocked-until-registry-registration-boundary-ready"
    );
    assert.equal(gate.source.readiness, expectedReadiness);
    assert.equal(gate.configuration.env, "PENPOT_RENDERER_SERVICE_BUNDLED_SCENE_BRIDGE_RUNTIME_INSTALLATION_GATE");
    assert.equal(gate.configuration.configured, configured);
    assert.equal(gate.configuration.acceptedValue, "reviewed");
    assert.equal(gate.configuration.accepted, reviewed);
    assert.equal(gate.configuration.valid, !invalid);
    assert.equal(gate.configuration.valueRead, false);
    assert.equal(gate.configuration.valuesIncluded, false);
    assert.equal(gate.gate.registryInstallationContractReadyRequired, true);
    assert.equal(gate.gate.explicitReviewedGateRequired, true);
    assert.equal(gate.gate.reviewedGateOpen, reviewed);
    assert.equal(gate.gate.futureInstallationAttemptAllowed, reviewed);
    for (const property of [
        "runtimeInstallationEnabled",
        "runtimeInstallationAttempted",
        "runtimeInstalled",
        "runtimeRegistered",
        "runtimeRegistration",
        "runtimeExecutionRegistered",
        "renderDispatch",
        "browserProcessStarted",
        "runtimeValuesIncluded",
        "registryValuesIncluded",
    ]) {
        assert.equal(gate.gate[property], false);
    }
    assert.equal(gate.refusalDiagnostics.refusalRequired, true);
    assert.equal(gate.refusalDiagnostics.refusalReason, expectedRefusalReason);
    assert.equal(gate.refusalDiagnostics.invalidGateValue, invalid);
    assert.equal(gate.refusalDiagnostics.registryWriteRefused, true);
    assert.equal(gate.refusalDiagnostics.runtimeValueCreationRefused, true);
    assert.equal(gate.refusalDiagnostics.runtimeInstallationRefused, true);
    assert.equal(gate.refusalDiagnostics.renderDispatchRefused, true);
    assert.equal(gate.refusalDiagnostics.valuesIncluded, false);
    assert.equal(gate.rollbackPreconditions.duplicateDetectionRequired, true);
    assert.equal(gate.rollbackPreconditions.duplicateRegistrationPolicy, "reject-until-explicit-replace-policy");
    assert.equal(gate.rollbackPreconditions.replacementPolicy, "not-supported-until-reviewed");
    assert.equal(gate.rollbackPreconditions.rollbackRequiredOnDuplicate, true);
    assert.equal(gate.rollbackPreconditions.cleanupOnInstallationFailure, true);
    assert.equal(gate.rollbackPreconditions.cleanupOnServiceStop, true);
    assert.equal(gate.rollbackPreconditions.closeHookCleanupRequired, true);
    for (const property of ["rollbackPrepared", "rollbackAttempted", "cleanupAttempted", "valuesIncluded"]) {
        assert.equal(gate.rollbackPreconditions[property], false);
    }
    assert.equal(gate.lifecycleOwnership.lifecycleOwner, "renderer-service");
    assert.equal(gate.lifecycleOwnership.registryOwner, "renderer-service");
    assert.equal(gate.lifecycleOwnership.closeHookOwner, "renderer-service");
    assert.equal(gate.lifecycleOwnership.runtimeId, "bundled-scene-bridge");
    assert.equal(gate.lifecycleOwnership.targetRegistry, "renderer-service.thumbnail-runtime-registry");
    assert.equal(gate.lifecycleOwnership.lifecycleScope, "thumbnail-runtime-registry");
    assert.equal(gate.lifecycleOwnership.noDispatchLifecycle, true);
    for (const property of ["closeHookRegistered", "runtimeValueOwned", "registrySlotOwned", "valuesIncluded"]) {
        assert.equal(gate.lifecycleOwnership[property], false);
    }
    assert.deepEqual(
        gate.gateOutcomeTaxonomy.map((entry) => entry.code),
        [
            "renderer_service_bundled_scene_bridge_runtime_registry_installation_gate_contract_not_ready",
            "renderer_service_bundled_scene_bridge_runtime_registry_installation_gate_not_configured",
            "renderer_service_bundled_scene_bridge_runtime_registry_installation_gate_configuration_invalid",
            "renderer_service_bundled_scene_bridge_runtime_registry_installation_gate_reviewed_disabled",
            "renderer_service_bundled_scene_bridge_runtime_registry_installation_gate_rollback_preconditions_invalid",
        ]
    );
    assert.ok(gate.gateOutcomeTaxonomy.every((entry) => entry.dispatch === false));
    assert.deepEqual(gate.diagnosticCodes, [expectedDiagnosticCode]);
    assert.deepEqual(gate.diagnostics.map((entry) => entry.code), [expectedDiagnosticCode]);
    assert.equal(gate.diagnostics[0].env, "PENPOT_RENDERER_SERVICE_BUNDLED_SCENE_BRIDGE_RUNTIME_INSTALLATION_GATE");
    assert.equal(gate.diagnostics[0].valueRead, false);
    assert.equal(gate.diagnostics[0].valuesIncluded, false);
    assert.deepEqual(gate.nextActions, gate.diagnostics[0].nextActions);
    assert.deepEqual(
        gate.checks.map((entry) => [entry.id, entry.status, entry.dispatch]),
        [
            ["installation-contract-ready", contractReady ? "passed" : "blocked", false],
            ["explicit-installation-gate-reviewed", invalid ? "invalid" : reviewed ? "passed" : "blocked", false],
            ["rollback-preconditions-planned", "planned", false],
            ["no-dispatch-lifecycle-owned", "planned", false],
            ["refusal-diagnostics-planned", "planned", false],
        ]
    );
    for (const property of [
        "registryLookup",
        "registryWrite",
        "runtimeValueCreation",
        "runtimeInstallation",
        "runtimeRegistration",
        "runtimeExecutionRegistered",
        "closeHookRegistration",
        "duplicateRollback",
        "renderDispatch",
        "browserProcessStarted",
        "browserPageCreated",
        "runtimeAdapterImported",
        "runtimeFactoryInvoked",
        "runtimeOptionsCreated",
        "runtimeAssetsLoaded",
        "assetManifestMaterialized",
        "backendRpcReads",
        "sourceDataReads",
        "networkDispatch",
        "dispatch",
        "localFileWrites",
    ]) {
        assert.equal(gate.sideEffects[property], false);
    }
    for (const property of [
        "modeValuesIncluded",
        "moduleValuesIncluded",
        "factoryValuesIncluded",
        "runtimeOptionsValuesIncluded",
        "optionValuesIncluded",
        "runtimeValuesIncluded",
        "registryValuesIncluded",
        "lifecycleValuesIncluded",
        "pathValuesIncluded",
        "sourceDataValuesIncluded",
        "pageValuesIncluded",
        "artifactValuesIncluded",
        "mediaValuesIncluded",
        "tokenValuesIncluded",
    ]) {
        assert.equal(gate.redaction[property], false);
    }
    for (const property of [
        "configuredValue",
        "moduleNamespace",
        "factoryValue",
        "runtimeOptionsValue",
        "optionValues",
        "runtimeValue",
        "registryValue",
        "lifecycleHandles",
        "workspaceRoot",
        "cacheRoot",
        "modulePath",
        "publicPaths",
        "cachePaths",
        "sha256",
        "playwrightBrowserPath",
        "runtimeModulePath",
        "sourceData",
        "pageData",
        "artifactBytes",
        "mediaBytes",
        "tokenValues",
    ]) {
        assert.equal(gate.omitted[property], true);
    }
    assert.equal(gate.execution, null);
    return gate;
}

function assertBundledSceneBridgeRuntimeRegistryInstallationPreflight(
    preflight,
    { gateReady = false, invalid = false, gateReadiness = "blocked-until-installation-contract-ready" } = {}
) {
    const expectedStatus = invalid ? "invalid" : gateReady ? "ready" : "blocked";
    const expectedGateStatus = invalid ? "invalid" : gateReady ? "configured-disabled" : "planned-disabled";
    const expectedGateReadiness = invalid
        ? "invalid-installation-gate-configuration"
        : gateReady
          ? "installation-gate-reviewed-disabled"
          : gateReadiness;
    const expectedReadiness = invalid
        ? "invalid-installation-gate"
        : gateReady
          ? "installation-preflight-ready"
          : "blocked-until-reviewed-installation-gate";
    const expectedRefusalReason = invalid
        ? "installation-gate-invalid"
        : gateReady
          ? "installation-execution-disabled-in-preflight"
          : "installation-gate-not-ready";
    const expectedDiagnosticCode = invalid
        ? "renderer_service_bundled_scene_bridge_runtime_registry_installation_preflight_gate_invalid"
        : gateReady
          ? "renderer_service_bundled_scene_bridge_runtime_registry_installation_preflight_ready"
          : "renderer_service_bundled_scene_bridge_runtime_registry_installation_preflight_gate_not_ready";

    assert.equal(preflight.status, expectedStatus);
    assert.equal(preflight.preflightVersion, "P26.44");
    assert.equal(preflight.owner, "renderer-service");
    assert.equal(preflight.mode, "guarded-runtime-registry-installation-preflight");
    assert.equal(preflight.source.runtimeRegistrationPreflightVersion, "P26.40");
    assert.equal(preflight.source.registryRegistrationBoundaryVersion, "P26.41");
    assert.equal(preflight.source.registryInstallationContractVersion, "P26.42");
    assert.equal(preflight.source.registryInstallationGateVersion, "P26.43");
    assert.equal(preflight.source.registryInstallationPreflightVersion, "P26.44");
    assert.equal(preflight.source.registryInstallationGateReady, gateReady);
    assert.equal(preflight.source.registryInstallationGateStatus, expectedGateStatus);
    assert.equal(preflight.source.registryInstallationGateReadiness, expectedGateReadiness);
    assert.equal(preflight.source.reviewedGateOpen, gateReady);
    assert.equal(preflight.source.futureInstallationAttemptAllowed, gateReady);
    assert.equal(preflight.source.readiness, expectedReadiness);
    for (const property of [
        "registryInstallationGateReadyRequired",
        "reviewedGateOpenRequired",
        "futureInstallationAttemptAllowedRequired",
        "rollbackPreconditionsRequired",
        "lifecycleOwnershipRequired",
        "noDispatchRequired",
    ]) {
        assert.equal(preflight.preflight[property], true);
    }
    assert.equal(preflight.preflight.readyForLaterInstallationTask, gateReady);
    for (const property of [
        "installationAttemptAllowedInThisTask",
        "registryLookupAttempted",
        "registryWriteAttempted",
        "runtimeValueCreated",
        "runtimeInstallationAttempted",
        "runtimeInstalled",
        "runtimeRegistered",
        "runtimeRegistration",
        "runtimeExecutionRegistered",
        "closeHookRegistered",
        "duplicateRollbackAttempted",
        "renderDispatch",
        "browserProcessStarted",
        "runtimeValuesIncluded",
        "registryValuesIncluded",
    ]) {
        assert.equal(preflight.preflight[property], false);
    }
    assert.equal(preflight.refusalDiagnostics.refusalRequired, true);
    assert.equal(preflight.refusalDiagnostics.refusalReason, expectedRefusalReason);
    assert.equal(preflight.refusalDiagnostics.invalidGateMetadata, invalid);
    for (const property of [
        "registryLookupRefused",
        "registryWriteRefused",
        "runtimeValueCreationRefused",
        "runtimeInstallationRefused",
        "closeHookRegistrationRefused",
        "duplicateRollbackRefused",
        "renderDispatchRefused",
    ]) {
        assert.equal(preflight.refusalDiagnostics[property], true);
    }
    assert.equal(preflight.refusalDiagnostics.valuesIncluded, false);
    assert.equal(preflight.rollbackPreconditions.duplicateDetectionRequired, true);
    assert.equal(preflight.rollbackPreconditions.duplicateRegistrationPolicy, "reject-until-explicit-replace-policy");
    assert.equal(preflight.rollbackPreconditions.replacementPolicy, "not-supported-until-reviewed");
    assert.equal(preflight.rollbackPreconditions.rollbackRequiredOnDuplicate, true);
    assert.equal(preflight.rollbackPreconditions.cleanupOnInstallationFailure, true);
    assert.equal(preflight.rollbackPreconditions.cleanupOnServiceStop, true);
    assert.equal(preflight.rollbackPreconditions.closeHookCleanupRequired, true);
    assert.equal(preflight.rollbackPreconditions.preconditionsVerified, gateReady);
    for (const property of ["rollbackPrepared", "rollbackAttempted", "cleanupAttempted", "valuesIncluded"]) {
        assert.equal(preflight.rollbackPreconditions[property], false);
    }
    assert.equal(preflight.lifecycleOwnership.lifecycleOwner, "renderer-service");
    assert.equal(preflight.lifecycleOwnership.registryOwner, "renderer-service");
    assert.equal(preflight.lifecycleOwnership.closeHookOwner, "renderer-service");
    assert.equal(preflight.lifecycleOwnership.runtimeId, "bundled-scene-bridge");
    assert.equal(preflight.lifecycleOwnership.targetRegistry, "renderer-service.thumbnail-runtime-registry");
    assert.equal(preflight.lifecycleOwnership.lifecycleScope, "thumbnail-runtime-registry");
    assert.equal(preflight.lifecycleOwnership.noDispatchLifecycle, true);
    assert.equal(preflight.lifecycleOwnership.lifecycleOwnershipVerified, gateReady);
    for (const property of ["closeHookRegistered", "runtimeValueOwned", "registrySlotOwned", "valuesIncluded"]) {
        assert.equal(preflight.lifecycleOwnership[property], false);
    }
    assert.deepEqual(
        preflight.preflightOutcomeTaxonomy.map((entry) => entry.code),
        [
            "renderer_service_bundled_scene_bridge_runtime_registry_installation_preflight_gate_not_ready",
            "renderer_service_bundled_scene_bridge_runtime_registry_installation_preflight_gate_invalid",
            "renderer_service_bundled_scene_bridge_runtime_registry_installation_preflight_ready",
            "renderer_service_bundled_scene_bridge_runtime_registry_installation_preflight_unsafe_metadata",
        ]
    );
    assert.ok(preflight.preflightOutcomeTaxonomy.every((entry) => entry.dispatch === false));
    assert.deepEqual(preflight.diagnosticCodes, [expectedDiagnosticCode]);
    assert.deepEqual(preflight.diagnostics.map((entry) => entry.code), [expectedDiagnosticCode]);
    assert.equal(preflight.diagnostics[0].env, "PENPOT_RENDERER_SERVICE_BUNDLED_SCENE_BRIDGE_RUNTIME_INSTALLATION_GATE");
    assert.equal(preflight.diagnostics[0].valueRead, false);
    assert.equal(preflight.diagnostics[0].valuesIncluded, false);
    assert.deepEqual(preflight.nextActions, preflight.diagnostics[0].nextActions);
    assert.deepEqual(
        preflight.checks.map((entry) => [entry.id, entry.status, entry.dispatch]),
        [
            ["installation-gate-ready", invalid ? "invalid" : gateReady ? "passed" : "blocked", false],
            ["reviewed-gate-open", invalid ? "invalid" : gateReady ? "passed" : "blocked", false],
            ["future-installation-attempt-allowed", invalid ? "invalid" : gateReady ? "passed" : "blocked", false],
            ["rollback-preconditions-verified", invalid ? "invalid" : gateReady ? "passed" : "blocked", false],
            ["no-dispatch-lifecycle-owned", invalid ? "invalid" : gateReady ? "passed" : "blocked", false],
            ["runtime-values-redacted", "passed", false],
        ]
    );
    for (const property of [
        "registryLookup",
        "registryWrite",
        "runtimeValueCreation",
        "runtimeInstallation",
        "runtimeRegistration",
        "runtimeExecutionRegistered",
        "closeHookRegistration",
        "duplicateRollback",
        "renderDispatch",
        "browserProcessStarted",
        "browserPageCreated",
        "runtimeAdapterImported",
        "runtimeFactoryInvoked",
        "runtimeOptionsCreated",
        "runtimeAssetsLoaded",
        "assetManifestMaterialized",
        "backendRpcReads",
        "sourceDataReads",
        "networkDispatch",
        "dispatch",
        "localFileWrites",
    ]) {
        assert.equal(preflight.sideEffects[property], false);
    }
    for (const property of [
        "modeValuesIncluded",
        "moduleValuesIncluded",
        "factoryValuesIncluded",
        "runtimeOptionsValuesIncluded",
        "optionValuesIncluded",
        "runtimeValuesIncluded",
        "registryValuesIncluded",
        "lifecycleValuesIncluded",
        "pathValuesIncluded",
        "sourceDataValuesIncluded",
        "pageValuesIncluded",
        "artifactValuesIncluded",
        "mediaValuesIncluded",
        "tokenValuesIncluded",
    ]) {
        assert.equal(preflight.redaction[property], false);
    }
    for (const property of [
        "configuredValue",
        "moduleNamespace",
        "factoryValue",
        "runtimeOptionsValue",
        "optionValues",
        "runtimeValue",
        "registryValue",
        "lifecycleHandles",
        "workspaceRoot",
        "cacheRoot",
        "modulePath",
        "publicPaths",
        "cachePaths",
        "sha256",
        "playwrightBrowserPath",
        "runtimeModulePath",
        "sourceData",
        "pageData",
        "artifactBytes",
        "mediaBytes",
        "tokenValues",
    ]) {
        assert.equal(preflight.omitted[property], true);
    }
    assert.equal(preflight.execution, null);
    return preflight;
}

function assertBundledSceneBridgeRuntimeRegistryInstallationExecutionBoundary(
    boundary,
    { preflightReady = false, invalid = false, preflightReadiness = "blocked-until-reviewed-installation-gate" } = {}
) {
    const expectedStatus = invalid ? "invalid" : preflightReady ? "planned-disabled" : "blocked";
    const expectedPreflightStatus = invalid ? "invalid" : preflightReady ? "ready" : "blocked";
    const expectedPreflightReadiness = invalid
        ? "invalid-installation-gate"
        : preflightReady
          ? "installation-preflight-ready"
          : preflightReadiness;
    const expectedReadiness = invalid
        ? "invalid-installation-preflight"
        : preflightReady
          ? "runtime-registry-installation-execution-boundary-planned"
          : "blocked-until-installation-preflight-ready";
    const expectedRefusalReason = invalid
        ? "installation-preflight-invalid"
        : preflightReady
          ? "installation-execution-disabled-until-reviewed-execution-task"
          : "installation-preflight-not-ready";
    const expectedDiagnosticCode = invalid
        ? "renderer_service_bundled_scene_bridge_runtime_registry_installation_execution_boundary_preflight_invalid"
        : preflightReady
          ? "renderer_service_bundled_scene_bridge_runtime_registry_installation_execution_boundary_planned"
          : "renderer_service_bundled_scene_bridge_runtime_registry_installation_execution_boundary_preflight_not_ready";

    assert.equal(boundary.status, expectedStatus);
    assert.equal(boundary.boundaryVersion, "P26.45");
    assert.equal(boundary.owner, "renderer-service");
    assert.equal(boundary.mode, "guarded-runtime-registry-installation-execution-boundary");
    assert.equal(boundary.source.runtimeRegistrationPreflightVersion, "P26.40");
    assert.equal(boundary.source.registryRegistrationBoundaryVersion, "P26.41");
    assert.equal(boundary.source.registryInstallationContractVersion, "P26.42");
    assert.equal(boundary.source.registryInstallationGateVersion, "P26.43");
    assert.equal(boundary.source.registryInstallationPreflightVersion, "P26.44");
    assert.equal(boundary.source.registryInstallationExecutionBoundaryVersion, "P26.45");
    assert.equal(boundary.source.registryInstallationPreflightReady, preflightReady);
    assert.equal(boundary.source.registryInstallationPreflightStatus, expectedPreflightStatus);
    assert.equal(boundary.source.registryInstallationPreflightReadiness, expectedPreflightReadiness);
    assert.equal(boundary.source.reviewedGateOpen, preflightReady);
    assert.equal(boundary.source.futureInstallationAttemptAllowed, preflightReady);
    assert.equal(boundary.source.readiness, expectedReadiness);
    for (const property of [
        "registryInstallationPreflightReadyRequired",
        "explicitExecutionReviewRequired",
        "duplicateLookupRequired",
        "runtimeValueCreationRequired",
        "registryInstallationRequired",
        "closeHookRegistrationRequired",
        "rollbackHookRequired",
        "noDispatchRequired",
    ]) {
        assert.equal(boundary.executionBoundary[property], true);
    }
    assert.equal(boundary.executionBoundary.executionPlanReady, preflightReady);
    for (const property of [
        "executionAttemptAllowedInThisTask",
        "runtimeInstallationEnabled",
        "registryLookupAttempted",
        "registryWriteAttempted",
        "runtimeValueCreated",
        "runtimeInstallationAttempted",
        "runtimeInstalled",
        "runtimeRegistered",
        "runtimeRegistration",
        "runtimeExecutionRegistered",
        "closeHookRegistered",
        "duplicateRollbackAttempted",
        "renderDispatch",
        "browserProcessStarted",
        "runtimeValuesIncluded",
        "registryValuesIncluded",
    ]) {
        assert.equal(boundary.executionBoundary[property], false);
    }
    assert.equal(boundary.runtimeValuePlan.runtimeId, "bundled-scene-bridge");
    assert.equal(boundary.runtimeValuePlan.targetRegistry, "renderer-service.thumbnail-runtime-registry");
    assert.deepEqual(boundary.runtimeValuePlan.requiredMethods, ["renderThumbnail"]);
    assert.deepEqual(boundary.runtimeValuePlan.optionalMethods, ["close"]);
    assert.deepEqual(boundary.runtimeValuePlan.requiredInstallationInputs, [
        "runtimeId",
        "runtimeValue",
        "lifecycleOwner",
        "closeHook",
    ]);
    assert.equal(boundary.runtimeValuePlan.runtimeValueCreationPlanned, true);
    for (const property of [
        "runtimeValueCreated",
        "runtimeValueInstalled",
        "runtimeRegistered",
        "runtimeExecutionRegistered",
        "renderDispatchEnabledAfterInstallation",
        "valuesIncluded",
    ]) {
        assert.equal(boundary.runtimeValuePlan[property], false);
    }
    for (const property of [
        "duplicateDetectionRequired",
        "existingRuntimeLookupRequired",
        "rollbackRequiredOnDuplicate",
        "rollbackHookRequired",
        "cleanupOnInstallationFailure",
        "cleanupOnServiceStop",
    ]) {
        assert.equal(boundary.duplicateHandling[property], true);
    }
    assert.equal(boundary.duplicateHandling.duplicateRegistrationPolicy, "reject-until-explicit-replace-policy");
    assert.equal(boundary.duplicateHandling.replacementPolicy, "not-supported-until-reviewed");
    for (const property of [
        "existingRuntimeLookupAttempted",
        "existingRuntimeFound",
        "duplicateDetected",
        "rollbackPrepared",
        "rollbackAttempted",
        "cleanupAttempted",
        "valuesIncluded",
    ]) {
        assert.equal(boundary.duplicateHandling[property], false);
    }
    assert.equal(boundary.lifecycleOwnership.lifecycleOwner, "renderer-service");
    assert.equal(boundary.lifecycleOwnership.registryOwner, "renderer-service");
    assert.equal(boundary.lifecycleOwnership.closeHookOwner, "renderer-service");
    assert.equal(boundary.lifecycleOwnership.rollbackOwner, "renderer-service");
    assert.equal(boundary.lifecycleOwnership.runtimeId, "bundled-scene-bridge");
    assert.equal(boundary.lifecycleOwnership.targetRegistry, "renderer-service.thumbnail-runtime-registry");
    assert.equal(boundary.lifecycleOwnership.lifecycleScope, "thumbnail-runtime-registry");
    assert.equal(boundary.lifecycleOwnership.noDispatchLifecycle, true);
    assert.equal(boundary.lifecycleOwnership.lifecycleOwnershipVerified, preflightReady);
    for (const property of ["closeHookRegistered", "rollbackHookRegistered", "runtimeValueOwned", "registrySlotOwned", "valuesIncluded"]) {
        assert.equal(boundary.lifecycleOwnership[property], false);
    }
    assert.equal(boundary.refusalDiagnostics.refusalRequired, true);
    assert.equal(boundary.refusalDiagnostics.refusalReason, expectedRefusalReason);
    assert.equal(boundary.refusalDiagnostics.invalidPreflightMetadata, invalid);
    for (const property of [
        "registryLookupRefused",
        "registryWriteRefused",
        "runtimeValueCreationRefused",
        "runtimeInstallationRefused",
        "closeHookRegistrationRefused",
        "duplicateRollbackRefused",
        "renderDispatchRefused",
    ]) {
        assert.equal(boundary.refusalDiagnostics[property], true);
    }
    assert.equal(boundary.refusalDiagnostics.valuesIncluded, false);
    assert.deepEqual(
        boundary.executionOutcomeTaxonomy.map((entry) => entry.code),
        [
            "renderer_service_bundled_scene_bridge_runtime_registry_installation_execution_boundary_preflight_not_ready",
            "renderer_service_bundled_scene_bridge_runtime_registry_installation_execution_boundary_preflight_invalid",
            "renderer_service_bundled_scene_bridge_runtime_registry_installation_execution_boundary_planned",
            "renderer_service_bundled_scene_bridge_runtime_registry_installation_execution_boundary_unsafe_metadata",
        ]
    );
    assert.ok(boundary.executionOutcomeTaxonomy.every((entry) => entry.dispatch === false));
    assert.deepEqual(boundary.diagnosticCodes, [expectedDiagnosticCode]);
    assert.deepEqual(boundary.diagnostics.map((entry) => entry.code), [expectedDiagnosticCode]);
    assert.equal(boundary.diagnostics[0].env, "PENPOT_RENDERER_SERVICE_BUNDLED_SCENE_BRIDGE_RUNTIME_INSTALLATION_GATE");
    assert.equal(boundary.diagnostics[0].valueRead, false);
    assert.equal(boundary.diagnostics[0].valuesIncluded, false);
    assert.deepEqual(boundary.nextActions, boundary.diagnostics[0].nextActions);
    const expectedBoundaryCheckStatus = invalid ? "invalid" : "planned";
    assert.deepEqual(
        boundary.checks.map((entry) => [entry.id, entry.status, entry.dispatch]),
        [
            ["installation-preflight-ready", invalid ? "invalid" : preflightReady ? "passed" : "blocked", false],
            ["runtime-value-creation-boundary", expectedBoundaryCheckStatus, false],
            ["registry-installation-boundary", expectedBoundaryCheckStatus, false],
            ["close-hook-registration-boundary", expectedBoundaryCheckStatus, false],
            ["duplicate-rollback-boundary", expectedBoundaryCheckStatus, false],
            ["runtime-values-redacted", "passed", false],
        ]
    );
    for (const property of [
        "registryLookup",
        "registryWrite",
        "runtimeValueCreation",
        "runtimeInstallation",
        "runtimeRegistration",
        "runtimeExecutionRegistered",
        "closeHookRegistration",
        "duplicateRollback",
        "renderDispatch",
        "browserProcessStarted",
        "browserPageCreated",
        "runtimeAdapterImported",
        "runtimeFactoryInvoked",
        "runtimeOptionsCreated",
        "runtimeAssetsLoaded",
        "assetManifestMaterialized",
        "backendRpcReads",
        "sourceDataReads",
        "networkDispatch",
        "dispatch",
        "localFileWrites",
    ]) {
        assert.equal(boundary.sideEffects[property], false);
    }
    for (const property of [
        "modeValuesIncluded",
        "moduleValuesIncluded",
        "factoryValuesIncluded",
        "runtimeOptionsValuesIncluded",
        "optionValuesIncluded",
        "runtimeValuesIncluded",
        "registryValuesIncluded",
        "lifecycleValuesIncluded",
        "pathValuesIncluded",
        "sourceDataValuesIncluded",
        "pageValuesIncluded",
        "artifactValuesIncluded",
        "mediaValuesIncluded",
        "tokenValuesIncluded",
    ]) {
        assert.equal(boundary.redaction[property], false);
    }
    for (const property of [
        "configuredValue",
        "moduleNamespace",
        "factoryValue",
        "runtimeOptionsValue",
        "optionValues",
        "runtimeValue",
        "registryValue",
        "lifecycleHandles",
        "workspaceRoot",
        "cacheRoot",
        "modulePath",
        "publicPaths",
        "cachePaths",
        "sha256",
        "playwrightBrowserPath",
        "runtimeModulePath",
        "sourceData",
        "pageData",
        "artifactBytes",
        "mediaBytes",
        "tokenValues",
    ]) {
        assert.equal(boundary.omitted[property], true);
    }
    assert.equal(boundary.execution, null);
    return boundary;
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
        assert.ok(serviceModule.healthResponse.capabilities.includes("thumbnail.render.bundled-scene-bridge-adapter-module"));
        assert.ok(serviceModule.healthResponse.capabilities.includes("thumbnail.render.bundled-scene-bridge-import-gate"));
        assert.ok(serviceModule.healthResponse.capabilities.includes("thumbnail.render.bundled-scene-bridge-factory-shape-preflight"));
        assert.ok(serviceModule.healthResponse.capabilities.includes("thumbnail.render.bundled-scene-bridge-module-namespace-import-preflight"));
        assert.ok(serviceModule.healthResponse.capabilities.includes("thumbnail.render.bundled-scene-bridge-factory-invocation-preflight"));
        assert.ok(serviceModule.healthResponse.capabilities.includes("thumbnail.render.bundled-scene-bridge-runtime-registration-preflight"));
        assert.ok(serviceModule.healthResponse.capabilities.includes("thumbnail.render.bundled-scene-bridge-runtime-registry-registration-boundary"));
        assert.ok(serviceModule.healthResponse.capabilities.includes("thumbnail.render.bundled-scene-bridge-runtime-registry-installation-contract"));
        assert.ok(serviceModule.healthResponse.capabilities.includes("thumbnail.render.bundled-scene-bridge-runtime-registry-installation-gate"));
        assert.ok(serviceModule.healthResponse.capabilities.includes("thumbnail.render.bundled-scene-bridge-runtime-registry-installation-preflight"));
        assert.deepEqual(body.browserFixtureRuntime, serviceModule.defaultBrowserFixtureRuntimeLifecycle);
        assertBrowserFixtureRuntimeLifecycle(body.browserFixtureRuntime);
        assertRuntimeAssetManifestScaffold(body.runtimeAssetManifest);
        assertRuntimeAssetMaterializationPreflightScaffold(body.runtimeAssetMaterializationPreflight);
        assertRuntimeAssetMaterializationDryRunPlan(body.runtimeAssetMaterializationDryRun);
        assertRuntimeAssetMaterializationApprovalPlan(body.runtimeAssetMaterializationApproval);
        assertBundledSceneBridgeContract(body.bundledSceneBridgeContract);
        assertBundledSceneBridgeAdapterModule(body.bundledSceneBridgeAdapterModule);
        assert.deepEqual(body.bundledSceneBridgeImportGate, serviceModule.bundledSceneBridgeImportGate);
        assertBundledSceneBridgeImportGate(body.bundledSceneBridgeImportGate);
        assert.deepEqual(body.bundledSceneBridgeFactoryShapePreflight, serviceModule.bundledSceneBridgeFactoryShapePreflight);
        assertBundledSceneBridgeFactoryShapePreflight(body.bundledSceneBridgeFactoryShapePreflight);
        assert.deepEqual(
            body.bundledSceneBridgeModuleNamespaceImportPreflight,
            serviceModule.bundledSceneBridgeModuleNamespaceImportPreflight
        );
        assertBundledSceneBridgeModuleNamespaceImportPreflight(body.bundledSceneBridgeModuleNamespaceImportPreflight);
        assert.deepEqual(
            body.bundledSceneBridgeFactoryInvocationPreflight,
            serviceModule.bundledSceneBridgeFactoryInvocationPreflight
        );
        assertBundledSceneBridgeFactoryInvocationPreflight(body.bundledSceneBridgeFactoryInvocationPreflight);
        assert.deepEqual(
            body.bundledSceneBridgeRuntimeRegistrationPreflight,
            serviceModule.bundledSceneBridgeRuntimeRegistrationPreflight
        );
        assertBundledSceneBridgeRuntimeRegistrationPreflight(body.bundledSceneBridgeRuntimeRegistrationPreflight);
        assert.deepEqual(
            body.bundledSceneBridgeRuntimeRegistryRegistrationBoundary,
            serviceModule.bundledSceneBridgeRuntimeRegistryRegistrationBoundary
        );
        assertBundledSceneBridgeRuntimeRegistryRegistrationBoundary(body.bundledSceneBridgeRuntimeRegistryRegistrationBoundary);
        assert.deepEqual(
            body.bundledSceneBridgeRuntimeRegistryInstallationContract,
            serviceModule.bundledSceneBridgeRuntimeRegistryInstallationContract
        );
        assertBundledSceneBridgeRuntimeRegistryInstallationContract(body.bundledSceneBridgeRuntimeRegistryInstallationContract);
        assert.deepEqual(
            body.bundledSceneBridgeRuntimeRegistryInstallationGate,
            serviceModule.bundledSceneBridgeRuntimeRegistryInstallationGate
        );
        assertBundledSceneBridgeRuntimeRegistryInstallationGate(body.bundledSceneBridgeRuntimeRegistryInstallationGate);
        assert.deepEqual(
            body.bundledSceneBridgeRuntimeRegistryInstallationPreflight,
            serviceModule.bundledSceneBridgeRuntimeRegistryInstallationPreflight
        );
        assertBundledSceneBridgeRuntimeRegistryInstallationPreflight(
            body.bundledSceneBridgeRuntimeRegistryInstallationPreflight
        );
        assert.deepEqual(
            body.bundledSceneBridgeRuntimeRegistryInstallationExecutionBoundary,
            serviceModule.bundledSceneBridgeRuntimeRegistryInstallationExecutionBoundary
        );
        assertBundledSceneBridgeRuntimeRegistryInstallationExecutionBoundary(
            body.bundledSceneBridgeRuntimeRegistryInstallationExecutionBoundary
        );
    });
});

test("noop host reports configured P26.34 import gate plus P26.36 namespace, P26.38 factory invocation, and P26.40 blocked registration preflights", async () => {
    const service = await serviceModule.startRendererService({
        port: 0,
        bundledSceneBridgeImportGate: {
            configured: true,
            value: "import-gate",
        },
    });
    try {
        const response = await fetch(`http://${service.host}:${service.port}/health`);

        assert.equal(response.status, 200);
        const body = await response.json();
        const gate = assertBundledSceneBridgeImportGate(body.bundledSceneBridgeImportGate, {
            status: "configured-disabled",
            configured: true,
            requested: true,
        });
        assert.equal(gate.valid, true);
        assert.equal(gate.configuration.accepted, true);
        assert.deepEqual(gate.diagnosticCodes, [
            "renderer_service_bundled_scene_bridge_import_gate_defined_disabled",
        ]);
        assertBundledSceneBridgeModuleNamespaceImportPreflight(body.bundledSceneBridgeModuleNamespaceImportPreflight, {
            status: "ready",
            importGateOpen: true,
            importAttempted: true,
            moduleImported: true,
            factoryPresent: true,
            factoryCallable: true,
        });
        assertBundledSceneBridgeFactoryInvocationPreflight(body.bundledSceneBridgeFactoryInvocationPreflight, {
            status: "ready",
            namespaceImportReady: true,
            factoryInvoked: true,
            runtimeOptionsCreated: true,
        });
        assertBundledSceneBridgeRuntimeRegistrationPreflight(body.bundledSceneBridgeRuntimeRegistrationPreflight, {
            factoryInvocationReady: true,
            registrationPreflightGateOpen: false,
        });
        assertBundledSceneBridgeRuntimeRegistryRegistrationBoundary(
            body.bundledSceneBridgeRuntimeRegistryRegistrationBoundary,
            {
                runtimeRegistrationPreflightReady: false,
            }
        );
        assertBundledSceneBridgeRuntimeRegistryInstallationContract(
            body.bundledSceneBridgeRuntimeRegistryInstallationContract,
            {
                registryRegistrationBoundaryReady: false,
            }
        );
        assertBundledSceneBridgeRuntimeRegistryInstallationGate(body.bundledSceneBridgeRuntimeRegistryInstallationGate, {
            contractReady: false,
        });
        assertBundledSceneBridgeRuntimeRegistryInstallationPreflight(
            body.bundledSceneBridgeRuntimeRegistryInstallationPreflight
        );
    } finally {
        await service.stop();
    }
});

test("noop host reports configured P26.40 registration preflight ready without runtime side effects", async () => {
    const service = await serviceModule.startRendererService({
        port: 0,
        bundledSceneBridgeImportGate: {
            configured: true,
            value: "registration-preflight",
        },
    });
    try {
        const response = await fetch(`http://${service.host}:${service.port}/health`);

        assert.equal(response.status, 200);
        const body = await response.json();
        const gate = assertBundledSceneBridgeImportGate(body.bundledSceneBridgeImportGate, {
            status: "configured-disabled",
            configured: true,
            requested: true,
            importGateRequested: false,
            registrationPreflightRequested: true,
        });
        assert.equal(gate.valid, true);
        assert.equal(gate.configuration.accepted, true);
        assert.equal(gate.configuration.importGateAccepted, false);
        assert.equal(gate.configuration.registrationPreflightAccepted, true);
        assert.deepEqual(gate.diagnosticCodes, [
            "renderer_service_bundled_scene_bridge_import_gate_defined_disabled",
        ]);
        assertBundledSceneBridgeModuleNamespaceImportPreflight(body.bundledSceneBridgeModuleNamespaceImportPreflight, {
            status: "ready",
            importGateOpen: true,
            importAttempted: true,
            moduleImported: true,
            factoryPresent: true,
            factoryCallable: true,
        });
        assertBundledSceneBridgeFactoryInvocationPreflight(body.bundledSceneBridgeFactoryInvocationPreflight, {
            status: "ready",
            namespaceImportReady: true,
            factoryInvoked: true,
            runtimeOptionsCreated: true,
        });
        assertBundledSceneBridgeRuntimeRegistrationPreflight(body.bundledSceneBridgeRuntimeRegistrationPreflight, {
            status: "ready",
            factoryInvocationReady: true,
            registrationPreflightGateOpen: true,
        });
        assertBundledSceneBridgeRuntimeRegistryRegistrationBoundary(
            body.bundledSceneBridgeRuntimeRegistryRegistrationBoundary,
            {
                runtimeRegistrationPreflightReady: true,
            }
        );
        assertBundledSceneBridgeRuntimeRegistryInstallationContract(
            body.bundledSceneBridgeRuntimeRegistryInstallationContract,
            {
                registryRegistrationBoundaryReady: true,
            }
        );
        assertBundledSceneBridgeRuntimeRegistryInstallationGate(body.bundledSceneBridgeRuntimeRegistryInstallationGate, {
            contractReady: true,
        });
        assertBundledSceneBridgeRuntimeRegistryInstallationPreflight(
            body.bundledSceneBridgeRuntimeRegistryInstallationPreflight,
            {
                gateReadiness: "blocked-until-installation-gate-reviewed",
            }
        );
        assertBundledSceneBridgeRuntimeRegistryInstallationExecutionBoundary(
            body.bundledSceneBridgeRuntimeRegistryInstallationExecutionBoundary,
            {
                preflightReadiness: "blocked-until-reviewed-installation-gate",
            }
        );
    } finally {
        await service.stop();
    }
});

test("noop host reports reviewed P26.43 runtime registry installation gate without runtime side effects", async () => {
    const service = await serviceModule.startRendererService({
        port: 0,
        bundledSceneBridgeImportGate: {
            configured: true,
            value: "registration-preflight",
        },
        bundledSceneBridgeRuntimeRegistryInstallationGate: {
            configured: true,
            value: "reviewed",
        },
    });
    try {
        const response = await fetch(`http://${service.host}:${service.port}/health`);

        assert.equal(response.status, 200);
        const body = await response.json();
        assertBundledSceneBridgeRuntimeRegistryInstallationContract(
            body.bundledSceneBridgeRuntimeRegistryInstallationContract,
            {
                registryRegistrationBoundaryReady: true,
            }
        );
        const gate = assertBundledSceneBridgeRuntimeRegistryInstallationGate(
            body.bundledSceneBridgeRuntimeRegistryInstallationGate,
            {
                contractReady: true,
                reviewed: true,
            }
        );
        assert.equal(gate.gate.reviewedGateOpen, true);
        assert.equal(gate.gate.futureInstallationAttemptAllowed, true);
        assert.equal(gate.sideEffects.registryWrite, false);
        assert.equal(gate.sideEffects.runtimeInstallation, false);
        assert.equal(gate.sideEffects.renderDispatch, false);
        assert.equal(gate.omitted.runtimeValue, true);
        assert.equal(gate.omitted.configuredValue, true);
        const preflight = assertBundledSceneBridgeRuntimeRegistryInstallationPreflight(
            body.bundledSceneBridgeRuntimeRegistryInstallationPreflight,
            {
                gateReady: true,
            }
        );
        assert.equal(preflight.preflight.readyForLaterInstallationTask, true);
        assert.equal(preflight.rollbackPreconditions.preconditionsVerified, true);
        assert.equal(preflight.lifecycleOwnership.lifecycleOwnershipVerified, true);
        const executionBoundary = assertBundledSceneBridgeRuntimeRegistryInstallationExecutionBoundary(
            body.bundledSceneBridgeRuntimeRegistryInstallationExecutionBoundary,
            {
                preflightReady: true,
            }
        );
        assert.equal(executionBoundary.executionBoundary.executionPlanReady, true);
        assert.equal(executionBoundary.executionBoundary.runtimeInstallationEnabled, false);
        assert.equal(executionBoundary.runtimeValuePlan.runtimeValueCreated, false);
        assert.equal(executionBoundary.duplicateHandling.existingRuntimeLookupAttempted, false);
        assert.equal(executionBoundary.lifecycleOwnership.lifecycleOwnershipVerified, true);
    } finally {
        await service.stop();
    }
});

test("noop host reports invalid P26.43 runtime registry installation gate diagnostics", async () => {
    const service = await serviceModule.startRendererService({
        port: 0,
        bundledSceneBridgeImportGate: {
            configured: true,
            value: "registration-preflight",
        },
        bundledSceneBridgeRuntimeRegistryInstallationGate: {
            configured: true,
            value: "enabled",
        },
    });
    try {
        const response = await fetch(`http://${service.host}:${service.port}/health`);

        assert.equal(response.status, 200);
        const body = await response.json();
        const gate = assertBundledSceneBridgeRuntimeRegistryInstallationGate(
            body.bundledSceneBridgeRuntimeRegistryInstallationGate,
            {
                contractReady: true,
                invalid: true,
            }
        );
        assert.equal(gate.configuration.configured, true);
        assert.equal(gate.configuration.accepted, false);
        assert.equal(gate.configuration.valid, false);
        assert.equal(gate.configuration.valueRead, false);
        assert.equal(gate.refusalDiagnostics.invalidGateValue, true);
        assert.equal(gate.sideEffects.registryWrite, false);
        assertBundledSceneBridgeRuntimeRegistryInstallationPreflight(
            body.bundledSceneBridgeRuntimeRegistryInstallationPreflight,
            {
                invalid: true,
            }
        );
        assertBundledSceneBridgeRuntimeRegistryInstallationExecutionBoundary(
            body.bundledSceneBridgeRuntimeRegistryInstallationExecutionBoundary,
            {
                invalid: true,
            }
        );
    } finally {
        await service.stop();
    }
});

test("noop host reports invalid P26.34 bundled scene bridge import gate diagnostics", async () => {
    const service = await serviceModule.startRendererService({
        port: 0,
        bundledSceneBridgeImportGate: {
            configured: true,
            value: "enabled",
        },
    });
    try {
        const response = await fetch(`http://${service.host}:${service.port}/health`);

        assert.equal(response.status, 200);
        const body = await response.json();
        const gate = body.bundledSceneBridgeImportGate;
        assert.equal(gate.status, "invalid");
        assert.equal(gate.configured, true);
        assert.equal(gate.requested, false);
        assert.equal(gate.importGateRequested, false);
        assert.equal(gate.registrationPreflightRequested, false);
        assert.equal(gate.valid, false);
        assert.deepEqual(gate.acceptedValues, ["import-gate", "registration-preflight"]);
        assert.equal(gate.configuration.valueRead, false);
        assert.equal(gate.configuration.valuesIncluded, false);
        assert.deepEqual(gate.configuration.acceptedValues, ["import-gate", "registration-preflight"]);
        assert.equal(gate.configuration.importGateAccepted, false);
        assert.equal(gate.configuration.registrationPreflightAccepted, false);
        assert.deepEqual(gate.diagnosticCodes, [
            "renderer_service_bundled_scene_bridge_import_gate_configuration_invalid",
        ]);
        assert.equal(gate.diagnostics[0].field, "mode");
        assert.equal(gate.diagnostics[0].valueRead, false);
        assert.equal(gate.diagnostics[0].valuesIncluded, false);
        assert.equal(gate.omitted.configuredValue, true);
        assert.equal(JSON.stringify(gate).includes("enabled"), false);
    } finally {
        await service.stop();
    }
});

test("noop host exposes the disabled P26.33 bundled scene bridge adapter module boundary", async () => {
    const adapterModule = await import(`${pathToFileURL(bundledSceneBridgeRuntimeBuildPath).href}?test=${Date.now()}`);

    assert.equal(typeof adapterModule.createBundledSceneBridgeRendererRuntime, "function");
    assert.equal(adapterModule.bundledSceneBridgeAdapterModuleBoundary.status, "planned-disabled");
    assert.equal(adapterModule.bundledSceneBridgeAdapterModuleBoundary.readinessVersion, "P26.33");
    assert.equal(adapterModule.bundledSceneBridgeAdapterModuleBoundary.defaultServiceImport, false);
    assert.equal(adapterModule.bundledSceneBridgeAdapterModuleBoundary.runtimeRegistration, false);
    assert.equal(adapterModule.bundledSceneBridgeAdapterModuleBoundary.browserProcessStarted, false);
    assert.equal(adapterModule.bundledSceneBridgeAdapterModuleBoundary.runtimeAssetsLoaded, false);
    assert.equal(adapterModule.bundledSceneBridgeAdapterModuleBoundary.localFileWrites, false);
    assert.equal(adapterModule.bundledSceneBridgeAdapterModuleBoundary.valuesIncluded, false);

    const runtime = await adapterModule.createBundledSceneBridgeRendererRuntime();
    assert.equal(typeof runtime.renderThumbnail, "function");
    assert.equal(typeof runtime.close, "function");
    await assert.rejects(
        () => runtime.renderThumbnail(browserFixtureRuntimeInput()),
        (error) => {
            assert.equal(error.code, "renderer_service_bundled_scene_bridge_runtime_disabled");
            assert.match(error.message, /disabled/);
            return true;
        }
    );
    await runtime.close();
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

test("noop host rejects unsafe P26.33 bundled scene bridge adapter module readiness", async () => {
    const service = await serviceModule.startRendererService({
        port: 0,
        thumbnailResponseOverride: (body) => ({
            ...body,
            bundledSceneBridgeAdapterModule: {
                ...body.bundledSceneBridgeAdapterModule,
                moduleImported: true,
                factoryInvoked: true,
                sideEffects: {
                    ...body.bundledSceneBridgeAdapterModule.sideEffects,
                    runtimeAdapterImported: true,
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
        assert.equal(body.field, "bundledSceneBridgeAdapterModule.moduleImported");
        assert.match(body.message, /bundledSceneBridgeAdapterModule\.moduleImported must match false/);
    } finally {
        await service.stop();
    }
});

test("noop host reports blocked P26.36 module namespace import preflight when the import gate is closed", async () => {
    const service = await serviceModule.startRendererService({
        port: 0,
    });
    try {
        const response = await fetch(`http://${service.host}:${service.port}/health`);
        const body = await response.json();
        assertBundledSceneBridgeModuleNamespaceImportPreflight(body.bundledSceneBridgeModuleNamespaceImportPreflight, {
            status: "planned-disabled",
            importGateOpen: false,
            importAttempted: false,
            moduleImported: false,
            factoryPresent: false,
            factoryCallable: false,
        });
        assert.deepEqual(body.bundledSceneBridgeModuleNamespaceImportPreflight.diagnosticCodes, [
            "renderer_service_bundled_scene_bridge_module_namespace_import_gate_closed",
        ]);
    } finally {
        await service.stop();
    }
});

test("noop host rejects unsafe P26.34 bundled scene bridge import gate metadata", async () => {
    const service = await serviceModule.startRendererService({
        port: 0,
        thumbnailResponseOverride: (body) => ({
            ...body,
            bundledSceneBridgeImportGate: {
                ...body.bundledSceneBridgeImportGate,
                gate: {
                    ...body.bundledSceneBridgeImportGate.gate,
                    importAttempted: true,
                },
                sideEffects: {
                    ...body.bundledSceneBridgeImportGate.sideEffects,
                    runtimeAdapterImported: true,
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
        assert.equal(body.field, "bundledSceneBridgeImportGate.gate.importAttempted");
        assert.match(body.message, /bundledSceneBridgeImportGate\.gate\.importAttempted must match false/);
    } finally {
        await service.stop();
    }
});

test("noop host rejects unsafe P26.36 bundled scene bridge module namespace import preflight metadata", async () => {
    const service = await serviceModule.startRendererService({
        port: 0,
        thumbnailResponseOverride: (body) => ({
            ...body,
            bundledSceneBridgeModuleNamespaceImportPreflight: {
                ...body.bundledSceneBridgeModuleNamespaceImportPreflight,
                moduleImport: {
                    ...body.bundledSceneBridgeModuleNamespaceImportPreflight.moduleImport,
                    importAttempted: true,
                },
                factoryShape: {
                    ...body.bundledSceneBridgeModuleNamespaceImportPreflight.factoryShape,
                    factoryInvoked: true,
                },
                sideEffects: {
                    ...body.bundledSceneBridgeModuleNamespaceImportPreflight.sideEffects,
                    runtimeAdapterImported: true,
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
        assert.equal(body.field, "bundledSceneBridgeModuleNamespaceImportPreflight.moduleImport.importAttempted");
        assert.match(body.message, /bundledSceneBridgeModuleNamespaceImportPreflight\.moduleImport\.importAttempted must match false/);
    } finally {
        await service.stop();
    }
});

test("noop host rejects unsafe P26.38 bundled scene bridge factory invocation preflight metadata", async () => {
    const service = await serviceModule.startRendererService({
        port: 0,
        thumbnailResponseOverride: (body) => ({
            ...body,
            bundledSceneBridgeFactoryInvocationPreflight: {
                ...body.bundledSceneBridgeFactoryInvocationPreflight,
                guard: {
                    ...body.bundledSceneBridgeFactoryInvocationPreflight.guard,
                    factoryInvoked: true,
                },
                factoryInvocation: {
                    ...body.bundledSceneBridgeFactoryInvocationPreflight.factoryInvocation,
                    invocationAttempted: true,
                    factoryInvoked: true,
                },
                runtimeOptionsShape: {
                    ...body.bundledSceneBridgeFactoryInvocationPreflight.runtimeOptionsShape,
                    runtimeOptionsCreated: true,
                },
                redaction: {
                    ...body.bundledSceneBridgeFactoryInvocationPreflight.redaction,
                    factoryValuesIncluded: true,
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
        assert.equal(body.field, "bundledSceneBridgeFactoryInvocationPreflight.guard.factoryInvoked");
        assert.match(body.message, /bundledSceneBridgeFactoryInvocationPreflight\.guard\.factoryInvoked must match false/);
    } finally {
        await service.stop();
    }
});

test("noop host rejects unsafe P26.40 bundled scene bridge runtime registration preflight metadata", async () => {
    const service = await serviceModule.startRendererService({
        port: 0,
        thumbnailResponseOverride: (body) => ({
            ...body,
            bundledSceneBridgeRuntimeRegistrationPreflight: {
                ...body.bundledSceneBridgeRuntimeRegistrationPreflight,
                guard: {
                    ...body.bundledSceneBridgeRuntimeRegistrationPreflight.guard,
                    runtimeRegistration: true,
                },
                sideEffects: {
                    ...body.bundledSceneBridgeRuntimeRegistrationPreflight.sideEffects,
                    runtimeRegistration: true,
                },
                redaction: {
                    ...body.bundledSceneBridgeRuntimeRegistrationPreflight.redaction,
                    registryValuesIncluded: true,
                },
                omitted: {
                    ...body.bundledSceneBridgeRuntimeRegistrationPreflight.omitted,
                    registryValue: false,
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
        assert.equal(body.field, "bundledSceneBridgeRuntimeRegistrationPreflight.guard.runtimeRegistration");
        assert.match(body.message, /bundledSceneBridgeRuntimeRegistrationPreflight\.guard\.runtimeRegistration must match false/);
    } finally {
        await service.stop();
    }
});

test("noop host rejects unsafe P26.41 bundled scene bridge runtime registry registration boundary metadata", async () => {
    const service = await serviceModule.startRendererService({
        port: 0,
        thumbnailResponseOverride: (body) => ({
            ...body,
            bundledSceneBridgeRuntimeRegistryRegistrationBoundary: {
                ...body.bundledSceneBridgeRuntimeRegistryRegistrationBoundary,
                guard: {
                    ...body.bundledSceneBridgeRuntimeRegistryRegistrationBoundary.guard,
                    runtimeInstalled: true,
                },
                registrySlot: {
                    ...body.bundledSceneBridgeRuntimeRegistryRegistrationBoundary.registrySlot,
                    runtimeInstalled: true,
                },
                sideEffects: {
                    ...body.bundledSceneBridgeRuntimeRegistryRegistrationBoundary.sideEffects,
                    runtimeInstallation: true,
                },
                redaction: {
                    ...body.bundledSceneBridgeRuntimeRegistryRegistrationBoundary.redaction,
                    runtimeValuesIncluded: true,
                },
                omitted: {
                    ...body.bundledSceneBridgeRuntimeRegistryRegistrationBoundary.omitted,
                    runtimeValue: false,
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
        assert.equal(body.field, "bundledSceneBridgeRuntimeRegistryRegistrationBoundary.guard.runtimeInstalled");
        assert.match(body.message, /bundledSceneBridgeRuntimeRegistryRegistrationBoundary\.guard\.runtimeInstalled must match false/);
    } finally {
        await service.stop();
    }
});

test("noop host rejects unsafe P26.42 bundled scene bridge runtime registry installation contract metadata", async () => {
    const service = await serviceModule.startRendererService({
        port: 0,
        thumbnailResponseOverride: (body) => ({
            ...body,
            bundledSceneBridgeRuntimeRegistryInstallationContract: {
                ...body.bundledSceneBridgeRuntimeRegistryInstallationContract,
                guard: {
                    ...body.bundledSceneBridgeRuntimeRegistryInstallationContract.guard,
                    runtimeInstalled: true,
                },
                runtimeValueShape: {
                    ...body.bundledSceneBridgeRuntimeRegistryInstallationContract.runtimeValueShape,
                    runtimeValueInstalled: true,
                },
                closeHookOwnership: {
                    ...body.bundledSceneBridgeRuntimeRegistryInstallationContract.closeHookOwnership,
                    closeHookRegistered: true,
                },
                duplicateRollbackHandling: {
                    ...body.bundledSceneBridgeRuntimeRegistryInstallationContract.duplicateRollbackHandling,
                    rollbackAttempted: true,
                },
                sideEffects: {
                    ...body.bundledSceneBridgeRuntimeRegistryInstallationContract.sideEffects,
                    runtimeInstallation: true,
                },
                redaction: {
                    ...body.bundledSceneBridgeRuntimeRegistryInstallationContract.redaction,
                    runtimeValuesIncluded: true,
                },
                omitted: {
                    ...body.bundledSceneBridgeRuntimeRegistryInstallationContract.omitted,
                    runtimeValue: false,
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
        assert.equal(body.field, "bundledSceneBridgeRuntimeRegistryInstallationContract.guard.runtimeInstalled");
        assert.match(body.message, /bundledSceneBridgeRuntimeRegistryInstallationContract\.guard\.runtimeInstalled must match false/);
    } finally {
        await service.stop();
    }
});

test("noop host rejects unsafe P26.43 bundled scene bridge runtime registry installation gate metadata", async () => {
    const service = await serviceModule.startRendererService({
        port: 0,
        thumbnailResponseOverride: (body) => ({
            ...body,
            bundledSceneBridgeRuntimeRegistryInstallationGate: {
                ...body.bundledSceneBridgeRuntimeRegistryInstallationGate,
                gate: {
                    ...body.bundledSceneBridgeRuntimeRegistryInstallationGate.gate,
                    runtimeInstalled: true,
                },
                sideEffects: {
                    ...body.bundledSceneBridgeRuntimeRegistryInstallationGate.sideEffects,
                    registryWrite: true,
                },
                redaction: {
                    ...body.bundledSceneBridgeRuntimeRegistryInstallationGate.redaction,
                    runtimeValuesIncluded: true,
                },
                omitted: {
                    ...body.bundledSceneBridgeRuntimeRegistryInstallationGate.omitted,
                    runtimeValue: false,
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
        assert.equal(body.field, "bundledSceneBridgeRuntimeRegistryInstallationGate.gate.runtimeInstalled");
        assert.match(body.message, /bundledSceneBridgeRuntimeRegistryInstallationGate\.gate\.runtimeInstalled must match false/);
    } finally {
        await service.stop();
    }
});

test("noop host rejects unsafe P26.44 bundled scene bridge runtime registry installation preflight metadata", async () => {
    const service = await serviceModule.startRendererService({
        port: 0,
        thumbnailResponseOverride: (body) => ({
            ...body,
            bundledSceneBridgeRuntimeRegistryInstallationPreflight: {
                ...body.bundledSceneBridgeRuntimeRegistryInstallationPreflight,
                preflight: {
                    ...body.bundledSceneBridgeRuntimeRegistryInstallationPreflight.preflight,
                    runtimeInstalled: true,
                },
                sideEffects: {
                    ...body.bundledSceneBridgeRuntimeRegistryInstallationPreflight.sideEffects,
                    registryWrite: true,
                },
                redaction: {
                    ...body.bundledSceneBridgeRuntimeRegistryInstallationPreflight.redaction,
                    runtimeValuesIncluded: true,
                },
                omitted: {
                    ...body.bundledSceneBridgeRuntimeRegistryInstallationPreflight.omitted,
                    runtimeValue: false,
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
        assert.equal(body.field, "bundledSceneBridgeRuntimeRegistryInstallationPreflight.preflight.runtimeInstalled");
        assert.match(
            body.message,
            /bundledSceneBridgeRuntimeRegistryInstallationPreflight\.preflight\.runtimeInstalled must match false/
        );
    } finally {
        await service.stop();
    }
});

test("noop host rejects unsafe P26.45 bundled scene bridge runtime registry installation execution boundary metadata", async () => {
    const service = await serviceModule.startRendererService({
        port: 0,
        thumbnailResponseOverride: (body) => ({
            ...body,
            bundledSceneBridgeRuntimeRegistryInstallationExecutionBoundary: {
                ...body.bundledSceneBridgeRuntimeRegistryInstallationExecutionBoundary,
                executionBoundary: {
                    ...body.bundledSceneBridgeRuntimeRegistryInstallationExecutionBoundary.executionBoundary,
                    runtimeValueCreated: true,
                },
                sideEffects: {
                    ...body.bundledSceneBridgeRuntimeRegistryInstallationExecutionBoundary.sideEffects,
                    registryWrite: true,
                },
                redaction: {
                    ...body.bundledSceneBridgeRuntimeRegistryInstallationExecutionBoundary.redaction,
                    runtimeValuesIncluded: true,
                },
                omitted: {
                    ...body.bundledSceneBridgeRuntimeRegistryInstallationExecutionBoundary.omitted,
                    runtimeValue: false,
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
        assert.equal(body.field, "bundledSceneBridgeRuntimeRegistryInstallationExecutionBoundary.executionBoundary.runtimeValueCreated");
        assert.match(
            body.message,
            /bundledSceneBridgeRuntimeRegistryInstallationExecutionBoundary\.executionBoundary\.runtimeValueCreated must match false/
        );
    } finally {
        await service.stop();
    }
});

test("noop host rejects unsafe P26.35 bundled scene bridge factory-shape preflight metadata", async () => {
    const service = await serviceModule.startRendererService({
        port: 0,
        thumbnailResponseOverride: (body) => ({
            ...body,
            bundledSceneBridgeFactoryShapePreflight: {
                ...body.bundledSceneBridgeFactoryShapePreflight,
                moduleImport: {
                    ...body.bundledSceneBridgeFactoryShapePreflight.moduleImport,
                    importAttempted: true,
                },
                factoryShape: {
                    ...body.bundledSceneBridgeFactoryShapePreflight.factoryShape,
                    factoryInvoked: true,
                },
                sideEffects: {
                    ...body.bundledSceneBridgeFactoryShapePreflight.sideEffects,
                    runtimeAdapterImported: true,
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
        assert.equal(body.field, "bundledSceneBridgeFactoryShapePreflight.moduleImport.importAttempted");
        assert.match(body.message, /bundledSceneBridgeFactoryShapePreflight\.moduleImport\.importAttempted must match false/);
    } finally {
        await service.stop();
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
