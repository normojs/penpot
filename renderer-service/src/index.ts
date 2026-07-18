import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { access, copyFile, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { dirname, isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createBrowserFixtureRendererRuntime } from "./browser-fixture-runtime.js";

export { createBrowserFixtureRendererRuntime } from "./browser-fixture-runtime.js";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 6070;
const BACKEND_RPC_BASE_URI_ENV = "PENPOT_RENDERER_SERVICE_BACKEND_URI";
const BACKEND_RPC_BASE_URI_FALLBACK_ENV = "PENPOT_BACKEND_URI";
const RENDERER_RUNTIME_MODULE_ENV = "PENPOT_RENDERER_SERVICE_RUNTIME_MODULE";
const BROWSER_FIXTURE_RUNTIME_ENV = "PENPOT_RENDERER_SERVICE_BROWSER_FIXTURE_RUNTIME";
const BUNDLED_SCENE_BRIDGE_RUNTIME_ENV = "PENPOT_RENDERER_SERVICE_BUNDLED_SCENE_BRIDGE_RUNTIME";
const BUNDLED_SCENE_BRIDGE_RUNTIME_IMPORT_GATE_VALUE = "import-gate";
const BUNDLED_SCENE_BRIDGE_RUNTIME_REGISTRATION_PREFLIGHT_VALUE = "registration-preflight";
const BUNDLED_SCENE_BRIDGE_RUNTIME_EXPECTED_VALUE = BUNDLED_SCENE_BRIDGE_RUNTIME_IMPORT_GATE_VALUE;
const BUNDLED_SCENE_BRIDGE_RUNTIME_ACCEPTED_VALUES = [
    BUNDLED_SCENE_BRIDGE_RUNTIME_IMPORT_GATE_VALUE,
    BUNDLED_SCENE_BRIDGE_RUNTIME_REGISTRATION_PREFLIGHT_VALUE,
] as const;
const BUNDLED_SCENE_BRIDGE_RUNTIME_INSTALLATION_GATE_ENV =
    "PENPOT_RENDERER_SERVICE_BUNDLED_SCENE_BRIDGE_RUNTIME_INSTALLATION_GATE";
const BUNDLED_SCENE_BRIDGE_RUNTIME_INSTALLATION_GATE_REVIEWED_VALUE = "reviewed";
const BUNDLED_SCENE_BRIDGE_REAL_RUNTIME_MODULE_GATE_ENV =
    "PENPOT_RENDERER_SERVICE_BUNDLED_SCENE_BRIDGE_REAL_RUNTIME_MODULE_GATE";
const BUNDLED_SCENE_BRIDGE_REAL_RUNTIME_MODULE_GATE_REVIEWED_VALUE = "reviewed-scaffold";
const BUNDLED_SCENE_BRIDGE_RENDER_DISPATCH_GATE_ENV =
    "PENPOT_RENDERER_SERVICE_BUNDLED_SCENE_BRIDGE_RENDER_DISPATCH_GATE";
const BUNDLED_SCENE_BRIDGE_RENDER_DISPATCH_GATE_REVIEWED_VALUE = "reviewed-dispatch";
const BUNDLED_SCENE_BRIDGE_RUNTIME_ID = "bundled-scene-bridge";
const BUNDLED_SCENE_BRIDGE_TARGET_REGISTRY = "renderer-service.thumbnail-runtime-registry";
const RUNTIME_ASSET_PREFLIGHT_ENV = "PENPOT_RENDERER_SERVICE_RUNTIME_ASSET_PREFLIGHT";
const RUNTIME_ASSET_PREFLIGHT_WORKSPACE_ROOT_ENV = "PENPOT_RENDERER_SERVICE_RUNTIME_ASSET_PREFLIGHT_WORKSPACE_ROOT";
const RUNTIME_ASSET_PREFLIGHT_CACHE_ROOT_ENV = "PENPOT_RENDERER_SERVICE_RUNTIME_ASSET_PREFLIGHT_CACHE_ROOT";
const RUNTIME_ASSET_MATERIALIZATION_APPROVAL_ENV = "PENPOT_RENDERER_SERVICE_RUNTIME_ASSET_MATERIALIZATION_APPROVAL";
const RUNTIME_ASSET_MATERIALIZATION_APPROVAL_TOKEN_ENV = "PENPOT_RENDERER_SERVICE_RUNTIME_ASSET_MATERIALIZATION_APPROVAL_TOKEN";
const RUNTIME_ASSET_MATERIALIZATION_APPROVAL_AUDIT_DIR_ENV = "PENPOT_RENDERER_SERVICE_RUNTIME_ASSET_MATERIALIZATION_APPROVAL_AUDIT_DIR";
const RENDERER_SERVICE_CACHE_ROOT = "/Volumes/fushilu/.caches/penpot/renderer-service";

export type RendererBackendRpcClientOptions = {
    baseUri?: string;
    fetch?: typeof fetch;
};

export type RendererRuntimeRenderInput = {
    target:
        | {
              kind: "file";
              fileId: string;
              revn: number | null;
          }
        | {
              kind: "frame";
              fileId: string;
              pageId: string;
              objectId: string;
              objectKey: string;
              tag: string;
              revn: null;
          };
    artifact: {
        format: "png";
        mimeType: "image/png";
        width: number;
        height: number;
        extension: ".png";
    };
    cache: {
        policy: "reuse" | "refresh";
        scope: "file-thumbnail" | "file-object-thumbnail";
        key: string;
    };
    render: {
        runtime: "render-wasm-worker";
        fallback: "frontend-rasterizer";
    };
    sourceData: {
        fileId: string;
        revn: number;
        pageId?: string;
        objectId?: string;
        objectKey?: string;
        tag?: string;
        page: Record<string, unknown>;
    };
};

export type RendererRuntimeRenderResult = {
    png: ArrayBuffer | Uint8Array;
    runtime?: "render-wasm-worker" | "frontend-rasterizer";
    fallbackUsed?: boolean;
};

export type RendererRuntimeSource = "none" | "injected" | "runtime-module" | "browser-fixture";

export type RendererBrowserFixtureRuntimeLifecycleDiagnostics = {
    status: "not-configured" | "started" | "closed";
    diagnosticsVersion: "P26.31";
    owner: "renderer-service";
    mode: "browser-fixture-lifecycle";
    runtimeSource: RendererRuntimeSource;
    configured: boolean;
    enabled: boolean;
    runtimeModuleConfigured: boolean;
    injectedRuntimeConfigured: boolean;
    browser: {
        engine: "chromium";
        headless: true;
        processStarted: boolean;
        startupAttempted: boolean;
        startupSucceeded: boolean;
        closed: boolean;
        pathValuesIncluded: false;
    };
    lifecycle: {
        startupAttempted: boolean;
        startupSucceeded: boolean;
        startupFailed: false;
        renderAttempts: number;
        renderSuccesses: number;
        renderFailures: number;
        lastRenderSucceeded: boolean | null;
        pageCreateCount: number;
        pageReuseValidated: boolean;
        nonEmptyPngValidated: boolean;
        closeAttempted: boolean;
        closeSucceeded: boolean;
        closeFailed: false;
        artifactByteLengthIncluded: false;
    };
    sideEffects: {
        browserProcessStarted: boolean;
        runtimeExecutionRegistered: false;
        runtimeAdapterImported: boolean;
        runtimeAssetsLoaded: false;
        assetManifestMaterialized: false;
        networkDispatch: false;
        dispatch: false;
        localFileWrites: false;
    };
    redaction: {
        sourceDataValuesIncluded: false;
        pageValuesIncluded: false;
        artifactValuesIncluded: false;
        mediaValuesIncluded: false;
        tokenValuesIncluded: false;
        pathValuesIncluded: false;
    };
    omitted: {
        playwrightBrowserPath: true;
        runtimeModulePath: true;
        workspaceRoot: true;
        cacheRoot: true;
        sourceData: true;
        pageData: true;
        artifactBytes: true;
        mediaBytes: true;
        tokenValues: true;
    };
};

export type RendererRuntimeOptions = {
    renderThumbnail?: (input: RendererRuntimeRenderInput) => RendererRuntimeRenderResult | Promise<RendererRuntimeRenderResult>;
    close?: () => void | Promise<void>;
    browserFixtureRuntimeLifecycle?: () => RendererBrowserFixtureRuntimeLifecycleDiagnostics;
};

export type RendererRuntimeAssetPreflightOptions = {
    executeReadOnly?: boolean;
    workspaceRoot?: string;
    cacheRoot?: string;
};

export type RendererRuntimeAssetMaterializationApprovalOptions = {
    modeConfigured?: boolean;
    approvalTokenConfigured?: boolean;
    auditConfigured?: boolean;
    mode?: string;
    approvalToken?: string;
    auditDir?: string;
    executeMaterialization?: boolean;
};

export type RendererBundledSceneBridgeImportGateOptions = {
    configured?: boolean;
    value?: string;
};

export type RendererBundledSceneBridgeRuntimeRegistryInstallationGateOptions = {
    configured?: boolean;
    value?: string;
};

export type RendererBundledSceneBridgeRealRuntimeModuleGateOptions = {
    configured?: boolean;
    value?: string;
};

export type RendererBundledSceneBridgeRenderDispatchGateOptions = {
    configured?: boolean;
    value?: string;
};

type BundledSceneBridgeInstalledRuntimeEntry = {
    runtimeId: typeof BUNDLED_SCENE_BRIDGE_RUNTIME_ID;
    runtimeValue: RendererRuntimeOptions;
    closeHookRegistered: boolean;
    rollbackHookRegistered: boolean;
    installedAtMs: number;
    runtimeKind?: "stub" | "real";
};

type BundledSceneBridgeThumbnailRuntimeRegistry = Map<string, BundledSceneBridgeInstalledRuntimeEntry>;

export type RendererServiceOptions = {
    host?: string;
    port?: number;
    backendRpc?: RendererBackendRpcClientOptions;
    renderer?: RendererRuntimeOptions;
    rendererRuntimeModule?: string;
    browserFixtureRuntime?: boolean;
    rendererRuntimeSource?: RendererRuntimeSource;
    runtimeAssetPreflight?: RendererRuntimeAssetPreflightOptions;
    runtimeAssetMaterializationApproval?: RendererRuntimeAssetMaterializationApprovalOptions;
    bundledSceneBridgeImportGate?: RendererBundledSceneBridgeImportGateOptions;
    bundledSceneBridgeRuntimeRegistryInstallationGate?: RendererBundledSceneBridgeRuntimeRegistryInstallationGateOptions;
    bundledSceneBridgeRealRuntimeModuleGate?: RendererBundledSceneBridgeRealRuntimeModuleGateOptions;
    bundledSceneBridgeRenderDispatchGate?: RendererBundledSceneBridgeRenderDispatchGateOptions;
    thumbnailResponseOverride?: (response: Record<string, unknown>) => unknown;
};

export type StartedRendererService = {
    host: string;
    port: number;
    server: Server;
    stop: () => Promise<void>;
};

export const bundledRuntimeBridgeAssetManifest = {
    status: "planned-disabled",
    manifestVersion: "P26.20",
    owner: "renderer-service",
    bridge: "browser-backed-service-adapter",
    runtime: "render-wasm-worker",
    fallback: "frontend-rasterizer",
    roots: {
        frontendPublicJs: "frontend/resources/public/js",
        frontendWorkerJs: "frontend/resources/public/js/worker",
        cacheRoot: RENDERER_SERVICE_CACHE_ROOT,
    },
    assets: [
        {
            id: "thumbnail-worker-main",
            kind: "frontend-worker-bundle",
            role: "thumbnail worker command bridge",
            sourcePath: "frontend/src/app/worker/thumbnails.cljs",
            publicPath: "frontend/resources/public/js/worker/main.js",
            cachePath: `${RENDERER_SERVICE_CACHE_ROOT}/runtime-assets/worker/main.js`,
            required: true,
            materialized: false,
            existsChecked: false,
            loaded: false,
            byteHash: null,
            dispatch: false,
            localFileWrites: false,
        },
        {
            id: "thumbnail-worker-render-wasm-glue",
            kind: "render-wasm-worker-glue",
            role: "worker importScripts render-wasm glue",
            sourcePath: "render-wasm/_build_env",
            publicPath: "frontend/resources/public/js/worker/render.js",
            cachePath: `${RENDERER_SERVICE_CACHE_ROOT}/runtime-assets/worker/render.js`,
            required: true,
            materialized: false,
            existsChecked: false,
            loaded: false,
            byteHash: null,
            dispatch: false,
            localFileWrites: false,
        },
        {
            id: "render-wasm-loader",
            kind: "render-wasm-js-loader",
            role: "Emscripten render-wasm module loader",
            sourcePath: "render-wasm/_build_env",
            publicPath: "frontend/resources/public/js/render-wasm.js",
            cachePath: `${RENDERER_SERVICE_CACHE_ROOT}/runtime-assets/render-wasm.js`,
            required: true,
            materialized: false,
            existsChecked: false,
            loaded: false,
            byteHash: null,
            dispatch: false,
            localFileWrites: false,
        },
        {
            id: "render-wasm-binary",
            kind: "render-wasm-binary",
            role: "render-wasm WebAssembly binary",
            sourcePath: "render-wasm/_build_env",
            publicPath: "frontend/resources/public/js/render-wasm.wasm",
            cachePath: `${RENDERER_SERVICE_CACHE_ROOT}/runtime-assets/render-wasm.wasm`,
            required: true,
            materialized: false,
            existsChecked: false,
            loaded: false,
            byteHash: null,
            dispatch: false,
            localFileWrites: false,
        },
        {
            id: "rasterizer-bundle",
            kind: "frontend-rasterizer-bundle",
            role: "SVG rasterizer fallback bundle",
            sourcePath: "frontend/src/app/rasterizer.cljs",
            publicPath: "frontend/resources/public/js/rasterizer.js",
            cachePath: `${RENDERER_SERVICE_CACHE_ROOT}/runtime-assets/rasterizer.js`,
            required: true,
            materialized: false,
            existsChecked: false,
            loaded: false,
            byteHash: null,
            dispatch: false,
            localFileWrites: false,
        },
        {
            id: "rasterizer-html",
            kind: "frontend-rasterizer-html",
            role: "SVG rasterizer fallback document",
            sourcePath: "frontend/resources/templates/rasterizer.mustache",
            publicPath: "frontend/resources/public/rasterizer.html",
            cachePath: `${RENDERER_SERVICE_CACHE_ROOT}/runtime-assets/rasterizer.html`,
            required: true,
            materialized: false,
            existsChecked: false,
            loaded: false,
            byteHash: null,
            dispatch: false,
            localFileWrites: false,
        },
    ],
    cacheOutputs: [
        {
            id: "runtime-asset-cache",
            path: `${RENDERER_SERVICE_CACHE_ROOT}/runtime-assets`,
            purpose: "future packaged frontend/render-wasm runtime assets",
            materialized: false,
            existsChecked: false,
            localFileWrites: false,
        },
        {
            id: "browser-profile-cache",
            path: `${RENDERER_SERVICE_CACHE_ROOT}/browser-profile`,
            purpose: "future isolated headless browser profile",
            materialized: false,
            existsChecked: false,
            localFileWrites: false,
        },
        {
            id: "runtime-adapter-cache",
            path: `${RENDERER_SERVICE_CACHE_ROOT}/bundled-runtime-adapter.mjs`,
            purpose: "future service-owned browser-backed adapter module",
            materialized: false,
            existsChecked: false,
            localFileWrites: false,
        },
    ],
    validation: {
        status: "metadata-only",
        requiredAssetIds: [
            "thumbnail-worker-main",
            "thumbnail-worker-render-wasm-glue",
            "render-wasm-loader",
            "render-wasm-binary",
            "rasterizer-bundle",
            "rasterizer-html",
        ],
        noDispatchTests: [
            "health-runtime-asset-manifest-no-browser-start",
            "thumbnail-runtime-asset-manifest-no-dispatch",
            "runtime-asset-manifest-response-validator",
        ],
        blockedUntil: [
            "browser lifecycle tests",
            "asset materialization checks",
            "pixel/resource assertions",
            "explicit runtime registration gate",
        ],
    },
    sideEffects: {
        browserProcessStarted: false,
        runtimeExecutionRegistered: false,
        runtimeAdapterImported: false,
        runtimeAssetsLoaded: false,
        assetManifestMaterialized: false,
        networkDispatch: false,
        dispatch: false,
        localFileWrites: false,
    },
    redaction: {
        sourceDataValuesIncluded: false,
        pageValuesIncluded: false,
        artifactValuesIncluded: false,
        mediaValuesIncluded: false,
        tokenValuesIncluded: false,
    },
} as const;

export const bundledRuntimeAssetMaterializationPreflight = {
    status: "planned-disabled",
    preflightVersion: "P26.21",
    owner: "renderer-service",
    mode: "read-only-metadata",
    readiness: "not-checked",
    sourceManifest: {
        manifestVersion: bundledRuntimeBridgeAssetManifest.manifestVersion,
        status: bundledRuntimeBridgeAssetManifest.status,
        assetIds: bundledRuntimeBridgeAssetManifest.validation.requiredAssetIds,
        cacheOutputIds: bundledRuntimeBridgeAssetManifest.cacheOutputs.map((entry) => entry.id),
    },
    checks: bundledRuntimeBridgeAssetManifest.assets.map((asset) => ({
        id: `${asset.id}-materialization-readiness`,
        assetId: asset.id,
        kind: asset.kind,
        publicPath: asset.publicPath,
        cachePath: asset.cachePath,
        required: asset.required,
        readiness: "not-checked",
        plannedChecks: ["public-asset-exists", "cache-asset-exists", "sha256-ready"],
        exists: null,
        cacheOutputExists: null,
        sha256: null,
        byteLength: null,
        fileRead: false,
        hashComputed: false,
        dispatch: false,
        localFileWrites: false,
    })),
    cacheOutputChecks: bundledRuntimeBridgeAssetManifest.cacheOutputs.map((entry) => ({
        id: `${entry.id}-readiness`,
        cacheOutputId: entry.id,
        path: entry.path,
        readiness: "not-checked",
        exists: null,
        writable: null,
        fileRead: false,
        localFileWrites: false,
    })),
    failureTaxonomy: [
        {
            code: "renderer_service_runtime_asset_preflight_disabled",
            stage: "preflight-gate",
            retryable: false,
            dispatch: false,
        },
        {
            code: "renderer_service_runtime_asset_missing",
            stage: "asset-existence",
            retryable: true,
            dispatch: false,
        },
        {
            code: "renderer_service_runtime_asset_hash_unavailable",
            stage: "asset-hash",
            retryable: true,
            dispatch: false,
        },
        {
            code: "renderer_service_runtime_asset_hash_mismatch",
            stage: "asset-hash",
            retryable: false,
            dispatch: false,
        },
        {
            code: "renderer_service_runtime_asset_cache_output_unavailable",
            stage: "cache-output",
            retryable: true,
            dispatch: false,
        },
    ],
    gates: {
        assetExistenceChecked: false,
        assetHashesComputed: false,
        cacheOutputsChecked: false,
        materializationApproved: false,
        browserLifecycleValidated: false,
        runtimeRegistration: false,
    },
    sideEffects: {
        browserProcessStarted: false,
        runtimeExecutionRegistered: false,
        runtimeAdapterImported: false,
        runtimeAssetsLoaded: false,
        assetManifestMaterialized: false,
        fileRead: false,
        hashComputed: false,
        networkDispatch: false,
        dispatch: false,
        localFileWrites: false,
    },
    redaction: {
        sourceDataValuesIncluded: false,
        pageValuesIncluded: false,
        artifactValuesIncluded: false,
        mediaValuesIncluded: false,
        tokenValuesIncluded: false,
    },
    execution: null,
} as const;

type RuntimeAssetMaterializationDryRunPlan = {
    status: "planned-disabled";
    planVersion: "P26.26";
    owner: "renderer-service";
    mode: "metadata-only";
    sourcePreflight: {
        preflightVersion: "P26.21";
        executionVersion: string | null;
        diagnosticsVersion: "P26.25";
        status: "not-executed" | "ready" | "degraded";
        readiness: "not-checked" | "ready" | "degraded";
        ready: boolean;
        diagnosticCodes: string[];
        missingAssetIds: string[];
        missingCacheOutputIds: string[];
    };
    prerequisites: Array<{
        id: string;
        required: true;
        status: "satisfied" | "blocked" | "approval-required";
        source: string;
        diagnosticCodes: string[];
        nextActions: string[];
    }>;
    copyPlan: Array<{
        id: string;
        assetId: string;
        source: "public-asset";
        destination: "runtime-asset-cache";
        preflightReadiness: "ready" | "blocked" | "unknown";
        copyRequired: true;
        futureLocalFileWrites: true;
        localFileWrites: false;
        copyApproved: false;
        blockedByDiagnosticCodes: string[];
    }>;
    cacheOutputPlan: Array<{
        id: string;
        cacheOutputId: string;
        preflightReadiness: "ready" | "blocked" | "unknown";
        requiredBeforeMaterialization: true;
        futureLocalFileWrites: true;
        localFileWrites: false;
        blockedByDiagnosticCodes: string[];
    }>;
    approvalGate: {
        status: "closed";
        approvalRequired: true;
        approvalGranted: false;
        approvalTokenAccepted: false;
        approvalTokenConsumed: false;
        writesEnabled: false;
        currentBlockers: string[];
        opensWhen: string[];
    };
    sideEffects: {
        browserProcessStarted: false;
        runtimeExecutionRegistered: false;
        runtimeAdapterImported: false;
        runtimeAssetsLoaded: false;
        assetManifestMaterialized: false;
        fileRead: false;
        hashComputed: false;
        networkDispatch: false;
        dispatch: false;
        localFileWrites: false;
    };
    redaction: {
        sourceDataValuesIncluded: false;
        pageValuesIncluded: false;
        artifactValuesIncluded: false;
        mediaValuesIncluded: false;
        tokenValuesIncluded: false;
    };
    omitted: {
        workspaceRoot: true;
        cacheRoot: true;
        publicPaths: true;
        cachePaths: true;
        sha256: true;
        tokenValues: true;
        sourceDataValues: true;
        pageValues: true;
        artifactValues: true;
        mediaValues: true;
    };
    execution: null;
};

type RuntimeAssetMaterializationPlanCounts = {
    total: number;
    ready: number;
    blocked: number;
    unknown: number;
};

type RuntimeAssetMaterializationApprovalReadinessVerdict = {
    status: "blocked";
    verdictVersion: "P26.29";
    owner: "renderer-service";
    mode: "metadata-only";
    computed: true;
    trusted: false;
    approvalReady: false;
    materializationReady: false;
    approvalGranted: false;
    writesEnabled: false;
    inputs: {
        sourceDryRun: {
            planVersion: "P26.26" | null;
            status: "planned-disabled" | "invalid";
            readiness: "not-checked" | "ready" | "degraded" | "unknown";
            ready: boolean;
            copyPlanCounts: RuntimeAssetMaterializationPlanCounts;
            cacheOutputPlanCounts: RuntimeAssetMaterializationPlanCounts;
            blockerCodes: string[];
        };
        approvalConfiguration: {
            configured: boolean;
            unsupportedConfiguration: boolean;
            unsupportedDiagnosticCodes: string[];
            valuesIncluded: false;
        };
        approvalGate: {
            status: "closed";
            blockerCodes: string[];
            approvalRequired: true;
            approvalGranted: false;
            writesEnabled: false;
        };
    };
    checks: Array<{
        id:
            | "runtime-asset-materialization-dry-run-ready"
            | "runtime-asset-materialization-approval-required"
            | "runtime-asset-materialization-approval-configuration-supported"
            | "runtime-asset-materialization-approval-scaffold-enabled"
            | "runtime-asset-materialization-approval-token-validation-enabled";
        required: true;
        status: "passed" | "blocked";
        diagnosticCodes: string[];
    }>;
    blockerCodes: string[];
    nextActions: string[];
    sideEffects: {
        approvalTokenRead: false;
        approvalTokenAccepted: false;
        approvalTokenConsumed: false;
        auditRecordWritten: false;
        localFileWrites: false;
        networkDispatch: false;
        dispatch: false;
        runtimeExecutionRegistered: false;
    };
    omitted: {
        approvalTokenValues: true;
        approvalAuditPaths: true;
        approvalScopeHashes: true;
        workspaceRoot: true;
        cacheRoot: true;
        sha256: true;
    };
};

type RuntimeAssetMaterializationApprovalPlan = {
    status: "planned-disabled";
    planVersion: "P26.27";
    diagnosticsVersion: "P26.28";
    owner: "renderer-service";
    mode: "metadata-only";
    sourceDryRun: {
        planVersion: "P26.26" | null;
        status: "planned-disabled" | "invalid";
        readiness: "not-checked" | "ready" | "degraded" | "unknown";
        ready: boolean;
        approvalRequired: boolean;
        approvalGranted: boolean;
        writesEnabled: boolean;
        copyPlanCounts: RuntimeAssetMaterializationPlanCounts;
        cacheOutputPlanCounts: RuntimeAssetMaterializationPlanCounts;
        diagnosticCodes: string[];
    };
    configuration: {
        status: "planned-disabled";
        configured: boolean;
        valuesIncluded: false;
        mode: {
            env: typeof RUNTIME_ASSET_MATERIALIZATION_APPROVAL_ENV;
            expectedValue: "approved";
            configured: boolean;
            valueRead: false;
        };
        approvalToken: {
            env: typeof RUNTIME_ASSET_MATERIALIZATION_APPROVAL_TOKEN_ENV;
            requiredWhenEnabled: true;
            configured: boolean;
            valueRead: false;
            accepted: false;
            consumed: false;
            valuesIncluded: false;
        };
        audit: {
            env: typeof RUNTIME_ASSET_MATERIALIZATION_APPROVAL_AUDIT_DIR_ENV;
            requiredWhenEnabled: true;
            configured: boolean;
            valueRead: false;
            recordWrites: false;
            valuesIncluded: false;
        };
    };
    approvalGate: {
        status: "closed";
        approvalRequired: true;
        approvalGranted: false;
        approvalTokenConfigured: boolean;
        approvalTokenAccepted: false;
        approvalTokenConsumed: false;
        writesEnabled: false;
        currentBlockers: string[];
        opensWhen: string[];
    };
    diagnostics: Array<{
        code: string;
        severity: "unsupported";
        field: "mode" | "approvalToken" | "audit";
        env: string;
        valueRead: false;
        valuesIncluded: false;
        message: string;
        nextActions: string[];
    }>;
    diagnosticCodes: string[];
    nextActions: string[];
    readinessVerdict: RuntimeAssetMaterializationApprovalReadinessVerdict;
    audit: {
        status: "planned-disabled";
        auditTrailEnabled: false;
        auditRecordPrepared: false;
        auditRecordWritten: false;
        auditStorageConfigured: false;
        auditIntegrityChecked: false;
        auditValuesIncluded: false;
    };
    sideEffects: {
        browserProcessStarted: false;
        runtimeExecutionRegistered: false;
        runtimeAdapterImported: false;
        runtimeAssetsLoaded: false;
        assetManifestMaterialized: false;
        fileRead: false;
        hashComputed: false;
        networkDispatch: false;
        dispatch: false;
        localFileWrites: false;
        approvalTokenRead: false;
        approvalTokenAccepted: false;
        approvalTokenConsumed: false;
        auditRecordWritten: false;
    };
    redaction: {
        sourceDataValuesIncluded: false;
        pageValuesIncluded: false;
        artifactValuesIncluded: false;
        mediaValuesIncluded: false;
        tokenValuesIncluded: false;
        approvalTokenValuesIncluded: false;
        approvalAuditValuesIncluded: false;
    };
    omitted: {
        workspaceRoot: true;
        cacheRoot: true;
        publicPaths: true;
        cachePaths: true;
        sha256: true;
        tokenValues: true;
        approvalTokenValues: true;
        approvalAuditPaths: true;
        approvalScopeHashes: true;
        sourceDataValues: true;
        pageValues: true;
        artifactValues: true;
        mediaValues: true;
    };
    execution: null;
};

function unknownStringArray(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function preflightDiagnosticCodes(execution: Record<string, unknown> | null): string[] {
    return uniqueStrings(
        Array.isArray(execution?.diagnostics)
            ? execution.diagnostics
                  .filter((entry): entry is Record<string, unknown> => isRecord(entry))
                  .map((entry) => (typeof entry.code === "string" ? entry.code : null))
                  .filter((entry): entry is string => Boolean(entry))
            : []
    );
}

function runtimeAssetMaterializationDryRunPlan(preflight: Record<string, unknown>): RuntimeAssetMaterializationDryRunPlan {
    const execution = isRecord(preflight.execution) ? preflight.execution : null;
    const summary = isRecord(execution?.summary) ? execution.summary : {};
    const diagnosticCodes = preflightDiagnosticCodes(execution);
    const missingAssetIds = unknownStringArray(summary.missingAssetIds);
    const missingCacheOutputIds = unknownStringArray(summary.missingCacheOutputIds);
    const readiness = execution?.readiness === "ready" || execution?.readiness === "degraded" ? execution.readiness : "not-checked";
    const preflightReady = readiness === "ready" && summary.ready === true;
    const preflightExecuted = execution !== null;
    const materializationApprovalCode = "renderer_service_runtime_asset_materialization_approval_required";
    const preflightRequiredCode = "renderer_service_runtime_asset_materialization_preflight_required";
    const blockers = uniqueStrings([
        ...(preflightExecuted ? diagnosticCodes : [preflightRequiredCode]),
        materializationApprovalCode,
    ]);

    return {
        status: "planned-disabled",
        planVersion: "P26.26",
        owner: "renderer-service",
        mode: "metadata-only",
        sourcePreflight: {
            preflightVersion: "P26.21",
            executionVersion: typeof execution?.executionVersion === "string" ? execution.executionVersion : null,
            diagnosticsVersion: "P26.25",
            status: preflightExecuted ? (preflightReady ? "ready" : "degraded") : "not-executed",
            readiness,
            ready: preflightReady,
            diagnosticCodes,
            missingAssetIds,
            missingCacheOutputIds,
        },
        prerequisites: [
            {
                id: "runtime-asset-preflight-executed",
                required: true,
                status: preflightExecuted ? "satisfied" : "blocked",
                source: "runtimeAssetMaterializationPreflight.execution",
                diagnosticCodes: preflightExecuted ? [] : [preflightRequiredCode],
                nextActions: preflightExecuted
                    ? []
                    : [
                          `Set ${RUNTIME_ASSET_PREFLIGHT_ENV}=read-only.`,
                          `Set ${RUNTIME_ASSET_PREFLIGHT_WORKSPACE_ROOT_ENV} to the Penpot workspace root.`,
                          "Start renderer-service and rerun /health before materialization dry-run approval.",
                      ],
            },
            {
                id: "runtime-asset-preflight-ready",
                required: true,
                status: preflightReady ? "satisfied" : "blocked",
                source: "runtimeAssetMaterializationPreflight.execution.diagnostics",
                diagnosticCodes: preflightReady ? [] : diagnosticCodes,
                nextActions: preflightReady ? [] : unknownStringArray(execution?.nextActions),
            },
            {
                id: "runtime-asset-materialization-approval",
                required: true,
                status: "approval-required",
                source: "runtimeAssetMaterializationDryRun.approvalGate",
                diagnosticCodes: [materializationApprovalCode],
                nextActions: [
                    "Review the dry-run copy and cache-output plan before enabling runtime asset materialization.",
                    "Keep materialization disabled until an explicit future approval gate is implemented.",
                ],
            },
        ],
        copyPlan: bundledRuntimeBridgeAssetManifest.assets.map((asset) => ({
            id: `${asset.id}-materialization-copy-dry-run`,
            assetId: asset.id,
            source: "public-asset",
            destination: "runtime-asset-cache",
            preflightReadiness: !preflightExecuted ? "unknown" : missingAssetIds.includes(asset.id) ? "blocked" : "ready",
            copyRequired: true,
            futureLocalFileWrites: true,
            localFileWrites: false,
            copyApproved: false,
            blockedByDiagnosticCodes: !preflightExecuted
                ? [preflightRequiredCode]
                : missingAssetIds.includes(asset.id)
                    ? diagnosticCodes
                    : [],
        })),
        cacheOutputPlan: bundledRuntimeBridgeAssetManifest.cacheOutputs.map((entry) => ({
            id: `${entry.id}-materialization-dry-run`,
            cacheOutputId: entry.id,
            preflightReadiness: !preflightExecuted ? "unknown" : missingCacheOutputIds.includes(entry.id) ? "blocked" : "ready",
            requiredBeforeMaterialization: true,
            futureLocalFileWrites: true,
            localFileWrites: false,
            blockedByDiagnosticCodes: !preflightExecuted
                ? [preflightRequiredCode]
                : missingCacheOutputIds.includes(entry.id)
                    ? diagnosticCodes
                    : [],
        })),
        approvalGate: {
            status: "closed",
            approvalRequired: true,
            approvalGranted: false,
            approvalTokenAccepted: false,
            approvalTokenConsumed: false,
            writesEnabled: false,
            currentBlockers: blockers,
            opensWhen: [
                "runtime asset preflight has executed",
                "runtime asset preflight readiness is ready",
                "explicit future materialization approval gate is implemented",
            ],
        },
        sideEffects: {
            browserProcessStarted: false,
            runtimeExecutionRegistered: false,
            runtimeAdapterImported: false,
            runtimeAssetsLoaded: false,
            assetManifestMaterialized: false,
            fileRead: false,
            hashComputed: false,
            networkDispatch: false,
            dispatch: false,
            localFileWrites: false,
        },
        redaction: {
            sourceDataValuesIncluded: false,
            pageValuesIncluded: false,
            artifactValuesIncluded: false,
            mediaValuesIncluded: false,
            tokenValuesIncluded: false,
        },
        omitted: {
            workspaceRoot: true,
            cacheRoot: true,
            publicPaths: true,
            cachePaths: true,
            sha256: true,
            tokenValues: true,
            sourceDataValues: true,
            pageValues: true,
            artifactValues: true,
            mediaValues: true,
        },
        execution: null,
    };
}

function runtimeAssetPlanCounts(entries: Record<string, unknown>[]): RuntimeAssetMaterializationPlanCounts {
    const readiness = entries.map((entry) => (typeof entry.preflightReadiness === "string" ? entry.preflightReadiness : "unknown"));
    return {
        total: entries.length,
        ready: readiness.filter((entry) => entry === "ready").length,
        blocked: readiness.filter((entry) => entry === "blocked").length,
        unknown: readiness.filter((entry) => entry === "unknown").length,
    };
}

function resolveMaterializationApprovalSecrets(
    options: RendererRuntimeAssetMaterializationApprovalOptions | undefined
): {
    mode: string | undefined;
    approvalToken: string | undefined;
    auditDir: string | undefined;
} {
    return {
        mode:
            (typeof options?.mode === "string" ? options.mode.trim() : undefined) ||
            optionalString(process.env[RUNTIME_ASSET_MATERIALIZATION_APPROVAL_ENV])?.trim() ||
            undefined,
        approvalToken:
            (typeof options?.approvalToken === "string" ? options.approvalToken : undefined) ||
            optionalString(process.env[RUNTIME_ASSET_MATERIALIZATION_APPROVAL_TOKEN_ENV]) ||
            undefined,
        auditDir:
            (typeof options?.auditDir === "string" ? options.auditDir.trim() : undefined) ||
            optionalString(process.env[RUNTIME_ASSET_MATERIALIZATION_APPROVAL_AUDIT_DIR_ENV])?.trim() ||
            undefined,
    };
}

function isMaterializationApproved(options: RendererRuntimeAssetMaterializationApprovalOptions | undefined): {
    modeConfigured: boolean;
    modeAccepted: boolean;
    tokenConfigured: boolean;
    tokenAccepted: boolean;
    auditConfigured: boolean;
    approved: boolean;
    mode: string | undefined;
    approvalToken: string | undefined;
    auditDir: string | undefined;
} {
    const secrets = resolveMaterializationApprovalSecrets(options);
    const modeConfigured = options?.modeConfigured === true || typeof options?.mode === "string" || Boolean(secrets.mode);
    const tokenConfigured =
        options?.approvalTokenConfigured === true || typeof options?.approvalToken === "string" || Boolean(secrets.approvalToken);
    const auditConfigured = options?.auditConfigured === true || typeof options?.auditDir === "string" || Boolean(secrets.auditDir);
    const modeAccepted = secrets.mode === "approved";
    const tokenAccepted = typeof secrets.approvalToken === "string" && secrets.approvalToken.trim().length > 0;
    const auditDirOk = typeof secrets.auditDir === "string" && secrets.auditDir.trim().length > 0;
    return {
        modeConfigured,
        modeAccepted,
        tokenConfigured,
        tokenAccepted,
        auditConfigured,
        approved: modeAccepted && tokenAccepted && auditDirOk && options?.executeMaterialization !== false,
        mode: secrets.mode,
        approvalToken: secrets.approvalToken,
        auditDir: secrets.auditDir,
    };
}

function runtimeAssetMaterializationApprovalDiagnostics(
    options: RendererRuntimeAssetMaterializationApprovalOptions | undefined
): RuntimeAssetMaterializationApprovalPlan["diagnostics"] {
    const diagnostics: RuntimeAssetMaterializationApprovalPlan["diagnostics"] = [];
    // P26.51 supports fully approved mode+token+audit. Partial/invalid config remains unsupported.
    const approval = isMaterializationApproved({
        ...options,
        executeMaterialization: true,
    });
    if (approval.approved) {
        return diagnostics;
    }
    if (options?.modeConfigured === true) {
        diagnostics.push({
            code: "renderer_service_runtime_asset_materialization_approval_configuration_unsupported",
            severity: "unsupported",
            field: "mode",
            env: RUNTIME_ASSET_MATERIALIZATION_APPROVAL_ENV,
            valueRead: false,
            valuesIncluded: false,
            message: "Runtime asset materialization approval mode is configured, but the approval gate is not implemented yet.",
            nextActions: [
                `Leave ${RUNTIME_ASSET_MATERIALIZATION_APPROVAL_ENV} unset until the future approval gate is implemented.`,
                "Use runtime asset materialization dry-run diagnostics to review readiness without enabling writes.",
            ],
        });
    }
    if (options?.approvalTokenConfigured === true) {
        diagnostics.push({
            code: "renderer_service_runtime_asset_materialization_approval_token_unsupported",
            severity: "unsupported",
            field: "approvalToken",
            env: RUNTIME_ASSET_MATERIALIZATION_APPROVAL_TOKEN_ENV,
            valueRead: false,
            valuesIncluded: false,
            message: "Runtime asset materialization approval token is configured, but token validation is not implemented yet.",
            nextActions: [
                `Leave ${RUNTIME_ASSET_MATERIALIZATION_APPROVAL_TOKEN_ENV} unset until approval token validation is implemented.`,
                "Do not rely on approval token configuration to enable runtime asset materialization writes.",
            ],
        });
    }
    if (options?.auditConfigured === true) {
        diagnostics.push({
            code: "renderer_service_runtime_asset_materialization_approval_audit_unsupported",
            severity: "unsupported",
            field: "audit",
            env: RUNTIME_ASSET_MATERIALIZATION_APPROVAL_AUDIT_DIR_ENV,
            valueRead: false,
            valuesIncluded: false,
            message: "Runtime asset materialization approval audit storage is configured, but audit writes are not implemented yet.",
            nextActions: [
                `Leave ${RUNTIME_ASSET_MATERIALIZATION_APPROVAL_AUDIT_DIR_ENV} unset until approval audit persistence is implemented.`,
                "Keep materialization disabled until approval audit storage is explicitly enabled by a future task.",
            ],
        });
    }
    return diagnostics;
}

function runtimeAssetMaterializationApprovalReadinessVerdict({
    sourceDryRun,
    configurationConfigured,
    configurationDiagnosticCodes,
    diagnosticCodes,
    approvalDisabledCode,
    approvalTokenDisabledCode,
    nextActions,
}: {
    sourceDryRun: RuntimeAssetMaterializationApprovalPlan["sourceDryRun"];
    configurationConfigured: boolean;
    configurationDiagnosticCodes: string[];
    diagnosticCodes: string[];
    approvalDisabledCode: string;
    approvalTokenDisabledCode: string;
    nextActions: string[];
}): RuntimeAssetMaterializationApprovalReadinessVerdict {
    const dryRunReadinessBlockers = sourceDryRun.diagnosticCodes.filter(
        (code) => code !== "renderer_service_runtime_asset_materialization_approval_required"
    );
    const dryRunReady =
        sourceDryRun.ready === true &&
        sourceDryRun.readiness === "ready" &&
        sourceDryRun.copyPlanCounts.blocked === 0 &&
        sourceDryRun.copyPlanCounts.unknown === 0 &&
        sourceDryRun.cacheOutputPlanCounts.blocked === 0 &&
        sourceDryRun.cacheOutputPlanCounts.unknown === 0 &&
        dryRunReadinessBlockers.length === 0;
    const checks: RuntimeAssetMaterializationApprovalReadinessVerdict["checks"] = [
        {
            id: "runtime-asset-materialization-dry-run-ready",
            required: true,
            status: dryRunReady ? "passed" : "blocked",
            diagnosticCodes: dryRunReady ? [] : dryRunReadinessBlockers,
        },
        {
            id: "runtime-asset-materialization-approval-required",
            required: true,
            status: "blocked",
            diagnosticCodes: ["renderer_service_runtime_asset_materialization_approval_required"],
        },
        {
            id: "runtime-asset-materialization-approval-configuration-supported",
            required: true,
            status: configurationDiagnosticCodes.length === 0 ? "passed" : "blocked",
            diagnosticCodes: configurationDiagnosticCodes,
        },
        {
            id: "runtime-asset-materialization-approval-scaffold-enabled",
            required: true,
            status: "blocked",
            diagnosticCodes: [approvalDisabledCode],
        },
        {
            id: "runtime-asset-materialization-approval-token-validation-enabled",
            required: true,
            status: "blocked",
            diagnosticCodes: [approvalTokenDisabledCode],
        },
    ];
    const blockerCodes = uniqueStrings(checks.flatMap((check) => (check.status === "blocked" ? check.diagnosticCodes : [])));
    const verdictNextActions = uniqueStrings([
        ...nextActions,
        ...(dryRunReady
            ? []
            : [
                  "Resolve runtime asset materialization dry-run blockers before trusting an approval readiness verdict.",
                  "Rerun renderer-service /health after the runtime asset preflight and dry-run are ready.",
              ]),
        "Keep runtime asset materialization disabled until the approval scaffold, token validation, and audit persistence are implemented.",
    ]);

    return {
        status: "blocked",
        verdictVersion: "P26.29",
        owner: "renderer-service",
        mode: "metadata-only",
        computed: true,
        trusted: false,
        approvalReady: false,
        materializationReady: false,
        approvalGranted: false,
        writesEnabled: false,
        inputs: {
            sourceDryRun: {
                ...sourceDryRun,
                blockerCodes: sourceDryRun.diagnosticCodes,
            },
            approvalConfiguration: {
                configured: configurationConfigured,
                unsupportedConfiguration: configurationDiagnosticCodes.length > 0,
                unsupportedDiagnosticCodes: configurationDiagnosticCodes,
                valuesIncluded: false,
            },
            approvalGate: {
                status: "closed",
                blockerCodes: diagnosticCodes,
                approvalRequired: true,
                approvalGranted: false,
                writesEnabled: false,
            },
        },
        checks,
        blockerCodes,
        nextActions: verdictNextActions,
        sideEffects: {
            approvalTokenRead: false,
            approvalTokenAccepted: false,
            approvalTokenConsumed: false,
            auditRecordWritten: false,
            localFileWrites: false,
            networkDispatch: false,
            dispatch: false,
            runtimeExecutionRegistered: false,
        },
        omitted: {
            approvalTokenValues: true,
            approvalAuditPaths: true,
            approvalScopeHashes: true,
            workspaceRoot: true,
            cacheRoot: true,
            sha256: true,
        },
    };
}

function runtimeAssetMaterializationApprovalPlan(
    dryRun: Record<string, unknown>,
    options: RendererRuntimeAssetMaterializationApprovalOptions | undefined = undefined
): RuntimeAssetMaterializationApprovalPlan {
    const sourcePreflight = isRecord(dryRun.sourcePreflight) ? dryRun.sourcePreflight : {};
    const approvalGate = isRecord(dryRun.approvalGate) ? dryRun.approvalGate : {};
    const copyPlan = Array.isArray(dryRun.copyPlan) ? dryRun.copyPlan.filter((entry): entry is Record<string, unknown> => isRecord(entry)) : [];
    const cacheOutputPlan = Array.isArray(dryRun.cacheOutputPlan)
        ? dryRun.cacheOutputPlan.filter((entry): entry is Record<string, unknown> => isRecord(entry))
        : [];
    const readiness =
        sourcePreflight.readiness === "not-checked" || sourcePreflight.readiness === "ready" || sourcePreflight.readiness === "degraded"
            ? sourcePreflight.readiness
            : "unknown";
    const approvalDisabledCode = "renderer_service_runtime_asset_materialization_approval_scaffold_disabled";
    const approvalTokenDisabledCode = "renderer_service_runtime_asset_materialization_approval_token_disabled";
    const diagnostics = runtimeAssetMaterializationApprovalDiagnostics(options);
    const configurationConfigured =
        options?.modeConfigured === true || options?.approvalTokenConfigured === true || options?.auditConfigured === true;
    const configurationDiagnosticCodes = diagnostics.map((diagnostic) => diagnostic.code);
    const sourceDiagnosticCodes = uniqueStrings([
        ...unknownStringArray(sourcePreflight.diagnosticCodes),
        ...unknownStringArray(approvalGate.currentBlockers),
    ]);
    const diagnosticCodes = uniqueStrings([
        ...sourceDiagnosticCodes,
        ...configurationDiagnosticCodes,
        approvalDisabledCode,
        approvalTokenDisabledCode,
    ]);
    const blockers = diagnosticCodes;
    const nextActions = uniqueStrings(diagnostics.flatMap((diagnostic) => diagnostic.nextActions));
    const sourceDryRunSummary: RuntimeAssetMaterializationApprovalPlan["sourceDryRun"] = {
        planVersion: dryRun.planVersion === "P26.26" ? "P26.26" : null,
        status: dryRun.status === "planned-disabled" && dryRun.planVersion === "P26.26" ? "planned-disabled" : "invalid",
        readiness,
        ready: sourcePreflight.ready === true,
        approvalRequired: approvalGate.approvalRequired !== false,
        approvalGranted: approvalGate.approvalGranted === true,
        writesEnabled: approvalGate.writesEnabled === true,
        copyPlanCounts: runtimeAssetPlanCounts(copyPlan),
        cacheOutputPlanCounts: runtimeAssetPlanCounts(cacheOutputPlan),
        diagnosticCodes: sourceDiagnosticCodes,
    };

    return {
        status: "planned-disabled",
        planVersion: "P26.27",
        diagnosticsVersion: "P26.28",
        owner: "renderer-service",
        mode: "metadata-only",
        sourceDryRun: sourceDryRunSummary,
        configuration: {
            status: "planned-disabled",
            configured: configurationConfigured,
            valuesIncluded: false,
            mode: {
                env: RUNTIME_ASSET_MATERIALIZATION_APPROVAL_ENV,
                expectedValue: "approved",
                configured: options?.modeConfigured === true,
                valueRead: false,
            },
            approvalToken: {
                env: RUNTIME_ASSET_MATERIALIZATION_APPROVAL_TOKEN_ENV,
                requiredWhenEnabled: true,
                configured: options?.approvalTokenConfigured === true,
                valueRead: false,
                accepted: false,
                consumed: false,
                valuesIncluded: false,
            },
            audit: {
                env: RUNTIME_ASSET_MATERIALIZATION_APPROVAL_AUDIT_DIR_ENV,
                requiredWhenEnabled: true,
                configured: options?.auditConfigured === true,
                valueRead: false,
                recordWrites: false,
                valuesIncluded: false,
            },
        },
        approvalGate: {
            status: "closed",
            approvalRequired: true,
            approvalGranted: false,
            approvalTokenConfigured: options?.approvalTokenConfigured === true,
            approvalTokenAccepted: false,
            approvalTokenConsumed: false,
            writesEnabled: false,
            currentBlockers: blockers,
            opensWhen: [
                "runtime asset materialization dry-run has been reviewed",
                `future ${RUNTIME_ASSET_MATERIALIZATION_APPROVAL_ENV}=approved configuration is implemented`,
                "future approval token validation and audit persistence are implemented",
            ],
        },
        diagnostics,
        diagnosticCodes,
        nextActions,
        readinessVerdict: runtimeAssetMaterializationApprovalReadinessVerdict({
            sourceDryRun: sourceDryRunSummary,
            configurationConfigured,
            configurationDiagnosticCodes,
            diagnosticCodes,
            approvalDisabledCode,
            approvalTokenDisabledCode,
            nextActions,
        }),
        audit: {
            status: "planned-disabled",
            auditTrailEnabled: false,
            auditRecordPrepared: false,
            auditRecordWritten: false,
            auditStorageConfigured: false,
            auditIntegrityChecked: false,
            auditValuesIncluded: false,
        },
        sideEffects: {
            browserProcessStarted: false,
            runtimeExecutionRegistered: false,
            runtimeAdapterImported: false,
            runtimeAssetsLoaded: false,
            assetManifestMaterialized: false,
            fileRead: false,
            hashComputed: false,
            networkDispatch: false,
            dispatch: false,
            localFileWrites: false,
            approvalTokenRead: false,
            approvalTokenAccepted: false,
            approvalTokenConsumed: false,
            auditRecordWritten: false,
        },
        redaction: {
            sourceDataValuesIncluded: false,
            pageValuesIncluded: false,
            artifactValuesIncluded: false,
            mediaValuesIncluded: false,
            tokenValuesIncluded: false,
            approvalTokenValuesIncluded: false,
            approvalAuditValuesIncluded: false,
        },
        omitted: {
            workspaceRoot: true,
            cacheRoot: true,
            publicPaths: true,
            cachePaths: true,
            sha256: true,
            tokenValues: true,
            approvalTokenValues: true,
            approvalAuditPaths: true,
            approvalScopeHashes: true,
            sourceDataValues: true,
            pageValues: true,
            artifactValues: true,
            mediaValues: true,
        },
        execution: null,
    };
}

export const bundledRuntimeAssetMaterializationDryRunPlan = runtimeAssetMaterializationDryRunPlan(
    bundledRuntimeAssetMaterializationPreflight
);

export const bundledRuntimeAssetMaterializationApprovalPlan = runtimeAssetMaterializationApprovalPlan(
    bundledRuntimeAssetMaterializationDryRunPlan
);

const runtimeAssetMaterializationExecutionBase = {
    status: "blocked",
    executionVersion: "P26.51",
    owner: "renderer-service",
    mode: "approved-runtime-asset-cache-materialization",
    source: {
        preflightVersion: "P26.21",
        dryRunVersion: "P26.26",
        approvalVersion: "P26.27",
        readinessVerdictVersion: "P26.29",
        materializationExecutionVersion: "P26.51",
        preflightReady: false,
        dryRunReady: false,
        approvalReady: false,
        readiness: "blocked-until-approved-materialization",
    },
    approval: {
        modeConfigured: false,
        modeAccepted: false,
        tokenConfigured: false,
        tokenAccepted: false,
        auditConfigured: false,
        auditWritable: false,
        approvalGranted: false,
        valuesIncluded: false,
    },
    materialization: {
        attempted: false,
        succeeded: false,
        assetsCopied: 0,
        assetsVerified: 0,
        assetsRolledBack: 0,
        hashVerificationEnabled: true,
        rollbackOnFailure: true,
        localFileWrites: false,
        valuesIncluded: false,
    },
    diagnostics: [
        {
            code: "renderer_service_runtime_asset_materialization_execution_blocked",
            severity: "blocked",
            field: "source.approvalReady",
            message:
                "Runtime asset cache materialization is blocked until preflight/dry-run readiness and an explicit approved materialization configuration are present.",
            nextActions: [
                "Configure runtime asset preflight readiness, set PENPOT_RENDERER_SERVICE_RUNTIME_ASSET_MATERIALIZATION_APPROVAL=approved with a non-empty approval token and audit dir, then rerun /health.",
                "Keep unapproved writes, browser startup before assets are ready, runtime value exposure, and default MCP/CLI enablement gated.",
            ],
        },
    ],
    diagnosticCodes: ["renderer_service_runtime_asset_materialization_execution_blocked"],
    nextActions: [
        "Configure runtime asset preflight readiness, set PENPOT_RENDERER_SERVICE_RUNTIME_ASSET_MATERIALIZATION_APPROVAL=approved with a non-empty approval token and audit dir, then rerun /health.",
        "Keep unapproved writes, browser startup before assets are ready, runtime value exposure, and default MCP/CLI enablement gated.",
    ],
    checks: [
        { id: "preflight-ready", status: "blocked", required: true, dispatch: false },
        { id: "dry-run-ready", status: "blocked", required: true, dispatch: false },
        { id: "approval-granted", status: "blocked", required: true, dispatch: false },
        { id: "hash-verification", status: "planned", required: true, dispatch: false },
        { id: "rollback-on-failure", status: "planned", required: true, dispatch: false },
        { id: "values-redacted", status: "passed", required: true, dispatch: false },
    ],
    sideEffects: {
        browserProcessStarted: false,
        runtimeExecutionRegistered: false,
        runtimeAdapterImported: false,
        runtimeAssetsLoaded: false,
        assetManifestMaterialized: false,
        fileRead: false,
        hashComputed: false,
        networkDispatch: false,
        dispatch: false,
        localFileWrites: false,
        auditRecordWritten: false,
    },
    redaction: {
        pathValuesIncluded: false,
        tokenValuesIncluded: false,
        sourceDataValuesIncluded: false,
        pageValuesIncluded: false,
        artifactValuesIncluded: false,
        mediaValuesIncluded: false,
    },
    omitted: {
        workspaceRoot: true,
        cacheRoot: true,
        publicPaths: true,
        cachePaths: true,
        sha256: true,
        tokenValues: true,
        approvalAuditPaths: true,
    },
    execution: null,
} as const;


export const runtimeAssetMaterializationExecution = runtimeAssetMaterializationExecutionBase;

const bundledSceneBridgeRealScenePngBase = {
    status: "blocked",
    productionVersion: "P26.52",
    owner: "renderer-service",
    mode: "minimal-real-scene-png-production",
    source: {
        registryInstallationVersion: "P26.46",
        installedRuntimeLifecycleVersion: "P26.47",
        realRuntimeModuleScaffoldVersion: "P26.49",
        installedRuntimeRenderDispatchVersion: "P26.50",
        materializationExecutionVersion: "P26.51",
        realScenePngProductionVersion: "P26.52",
        realRuntimeInstalled: false,
        assetsMaterialized: false,
        sourceDataAvailable: false,
        renderDispatched: false,
        readiness: "blocked-until-real-runtime-assets-source-data-and-dispatch",
    },
    production: {
        targetKinds: ["file", "frame"],
        nonEmptyPngRequired: true,
        persistThroughBackendRpc: true,
        multiTargetMatrixEnabled: false,
        realRuntimeSelected: false,
        nonEmptyPngProduced: false,
        persisted: false,
        valuesIncluded: false,
    },
    refusalDiagnostics: {
        refusalRequired: true,
        refusalReason: "real-scene-png-prerequisites-not-met",
        realRuntimeMissing: true,
        assetsNotMaterialized: true,
        sourceDataMissing: true,
        renderDispatchRefused: true,
        valuesIncluded: false,
    },
    diagnostics: [
        {
            code: "renderer_service_bundled_scene_bridge_real_scene_png_blocked",
            severity: "blocked",
            field: "source.realRuntimeInstalled",
            message:
                "Minimal real-scene PNG production is blocked until a real installed runtime, approved asset materialization, backend source-data, and reviewed render dispatch are available.",
            nextActions: [
                "Approve asset materialization, open the real-runtime module scaffold and render-dispatch gates, install the real runtime, then request a single file or tagged-frame thumbnail.",
                "Keep broad default enablement, multi-target matrix expansion, and credential/media/source value exposure gated.",
            ],
        },
    ],
    diagnosticCodes: ["renderer_service_bundled_scene_bridge_real_scene_png_blocked"],
    nextActions: [
        "Approve asset materialization, open the real-runtime module scaffold and render-dispatch gates, install the real runtime, then request a single file or tagged-frame thumbnail.",
        "Keep broad default enablement, multi-target matrix expansion, and credential/media/source value exposure gated.",
    ],
    checks: [
        { id: "real-runtime-installed", status: "blocked", required: true, dispatch: false },
        { id: "assets-materialized", status: "blocked", required: true, dispatch: false },
        { id: "source-data-available", status: "blocked", required: true, dispatch: false },
        { id: "render-dispatch", status: "blocked", required: true, dispatch: false },
        { id: "non-empty-png", status: "planned", required: true, dispatch: false },
        { id: "backend-persist", status: "planned", required: true, dispatch: false },
        { id: "values-redacted", status: "passed", required: true, dispatch: false },
    ],
    sideEffects: {
        browserProcessStarted: false,
        runtimeAssetsLoaded: false,
        renderDispatch: false,
        networkDispatch: false,
        dispatch: false,
        localFileWrites: false,
    },
    redaction: {
        runtimeValuesIncluded: false,
        sourceDataValuesIncluded: false,
        pageValuesIncluded: false,
        artifactValuesIncluded: false,
        mediaValuesIncluded: false,
        tokenValuesIncluded: false,
        pathValuesIncluded: false,
    },
    omitted: {
        runtimeValue: true,
        sourceData: true,
        pageData: true,
        artifactBytes: true,
        mediaBytes: true,
        tokenValues: true,
        publicPaths: true,
        cachePaths: true,
        sha256: true,
    },
    execution: null,
} as const;

export const bundledSceneBridgeRealScenePng = bundledSceneBridgeRealScenePngBase;

function bundledSceneBridgeRealScenePngResponse(input: {
    realRuntimeInstalled: boolean;
    assetsMaterialized: boolean;
    sourceDataAvailable: boolean;
    renderDispatched: boolean;
    nonEmptyPngProduced: boolean;
    persisted: boolean;
    realRuntimeSelected: boolean;
    targetKind?: "file" | "frame" | null;
}): Record<string, unknown> {
    if (
        !input.realRuntimeInstalled &&
        !input.assetsMaterialized &&
        !input.sourceDataAvailable &&
        !input.renderDispatched &&
        !input.nonEmptyPngProduced &&
        !input.persisted &&
        !input.realRuntimeSelected
    ) {
        return { ...bundledSceneBridgeRealScenePngBase };
    }
    const ready =
        input.realRuntimeInstalled &&
        input.assetsMaterialized &&
        input.sourceDataAvailable &&
        input.renderDispatched &&
        input.nonEmptyPngProduced;
    if (!ready) {
        return {
            ...bundledSceneBridgeRealScenePngBase,
            source: {
                ...bundledSceneBridgeRealScenePngBase.source,
                realRuntimeInstalled: input.realRuntimeInstalled,
                assetsMaterialized: input.assetsMaterialized,
                sourceDataAvailable: input.sourceDataAvailable,
                renderDispatched: input.renderDispatched,
                readiness: !input.realRuntimeInstalled
                    ? "blocked-until-real-runtime-installed"
                    : !input.assetsMaterialized
                      ? "blocked-until-assets-materialized"
                      : !input.sourceDataAvailable
                        ? "blocked-until-source-data"
                        : !input.renderDispatched
                          ? "blocked-until-render-dispatch"
                          : "blocked-until-non-empty-png",
            },
            production: {
                ...bundledSceneBridgeRealScenePngBase.production,
                realRuntimeSelected: input.realRuntimeSelected,
                nonEmptyPngProduced: input.nonEmptyPngProduced,
                persisted: input.persisted,
            },
            refusalDiagnostics: {
                refusalRequired: true,
                refusalReason: "real-scene-png-prerequisites-not-met",
                realRuntimeMissing: !input.realRuntimeInstalled,
                assetsNotMaterialized: !input.assetsMaterialized,
                sourceDataMissing: !input.sourceDataAvailable,
                renderDispatchRefused: !input.renderDispatched,
                valuesIncluded: false,
            },
            checks: [
                {
                    id: "real-runtime-installed",
                    status: input.realRuntimeInstalled ? "passed" : "blocked",
                    required: true,
                    dispatch: false,
                },
                {
                    id: "assets-materialized",
                    status: input.assetsMaterialized ? "passed" : "blocked",
                    required: true,
                    dispatch: false,
                },
                {
                    id: "source-data-available",
                    status: input.sourceDataAvailable ? "passed" : "blocked",
                    required: true,
                    dispatch: false,
                },
                {
                    id: "render-dispatch",
                    status: input.renderDispatched ? "passed" : "blocked",
                    required: true,
                    dispatch: input.renderDispatched,
                },
                {
                    id: "non-empty-png",
                    status: input.nonEmptyPngProduced ? "passed" : "planned",
                    required: true,
                    dispatch: false,
                },
                {
                    id: "backend-persist",
                    status: input.persisted ? "passed" : "planned",
                    required: true,
                    dispatch: false,
                },
                { id: "values-redacted", status: "passed", required: true, dispatch: false },
            ],
            sideEffects: {
                ...bundledSceneBridgeRealScenePngBase.sideEffects,
                renderDispatch: input.renderDispatched,
                dispatch: input.renderDispatched,
            },
            execution: null,
        };
    }

    return {
        ...bundledSceneBridgeRealScenePngBase,
        status: "produced",
        source: {
            ...bundledSceneBridgeRealScenePngBase.source,
            realRuntimeInstalled: true,
            assetsMaterialized: true,
            sourceDataAvailable: true,
            renderDispatched: true,
            readiness: "minimal-real-scene-png-produced",
        },
        production: {
            ...bundledSceneBridgeRealScenePngBase.production,
            realRuntimeSelected: true,
            nonEmptyPngProduced: true,
            persisted: input.persisted,
            valuesIncluded: false,
        },
        refusalDiagnostics: {
            refusalRequired: false,
            refusalReason: "real-scene-png-produced",
            realRuntimeMissing: false,
            assetsNotMaterialized: false,
            sourceDataMissing: false,
            renderDispatchRefused: false,
            valuesIncluded: false,
        },
        diagnostics: [
            {
                code: "renderer_service_bundled_scene_bridge_real_scene_png_produced",
                severity: "info",
                field: "production.nonEmptyPngProduced",
                message:
                    "Minimal real-scene PNG was produced through the installed real bundled scene bridge runtime and existing resource/persist pipeline for a single target.",
                nextActions: [
                    "Keep multi-target matrix expansion and broad default enablement gated.",
                    "Keep credential/media/source value exposure redacted in diagnostics and responses.",
                ],
            },
        ],
        diagnosticCodes: ["renderer_service_bundled_scene_bridge_real_scene_png_produced"],
        nextActions: [
            "Keep multi-target matrix expansion and broad default enablement gated.",
            "Keep credential/media/source value exposure redacted in diagnostics and responses.",
        ],
        checks: [
            { id: "real-runtime-installed", status: "passed", required: true, dispatch: false },
            { id: "assets-materialized", status: "passed", required: true, dispatch: false },
            { id: "source-data-available", status: "passed", required: true, dispatch: false },
            { id: "render-dispatch", status: "passed", required: true, dispatch: true },
            { id: "non-empty-png", status: "passed", required: true, dispatch: false },
            { id: "backend-persist", status: input.persisted ? "passed" : "planned", required: true, dispatch: false },
            { id: "values-redacted", status: "passed", required: true, dispatch: false },
        ],
        sideEffects: {
            browserProcessStarted: false,
            runtimeAssetsLoaded: false,
            renderDispatch: true,
            networkDispatch: input.persisted,
            dispatch: true,
            localFileWrites: false,
        },
        execution: {
            attempted: true,
            succeeded: true,
            outcome: "produced",
            targetKind: input.targetKind ?? null,
            nonEmptyPngProduced: true,
            persisted: input.persisted,
            multiTargetMatrixEnabled: false,
            valuesIncluded: false,
        },
    };
}

function validateBundledSceneBridgeRealScenePngResponse(actual: unknown, field: string): void {
    const record = responseRecord(actual, field);
    const status = String(record.status ?? "");
    if (!["blocked", "produced", "invalid"].includes(status)) {
        responseInvalid(`${field}.status must be blocked, produced, or invalid.`, `${field}.status`);
    }
    requireResponseEqual(record.productionVersion, "P26.52", `${field}.productionVersion`);
    requireResponseEqual(record.owner, "renderer-service", `${field}.owner`);
    requireResponseEqual(record.mode, "minimal-real-scene-png-production", `${field}.mode`);
    const production = responseRecord(record.production, `${field}.production`);
    requireResponseEqual(production.multiTargetMatrixEnabled, false, `${field}.production.multiTargetMatrixEnabled`);
    requireResponseEqual(production.valuesIncluded, false, `${field}.production.valuesIncluded`);
    const redaction = responseRecord(record.redaction, `${field}.redaction`);
    for (const property of [
        "runtimeValuesIncluded",
        "sourceDataValuesIncluded",
        "pageValuesIncluded",
        "artifactValuesIncluded",
        "mediaValuesIncluded",
        "tokenValuesIncluded",
        "pathValuesIncluded",
    ]) {
        requireResponseEqual(redaction[property], false, `${field}.redaction.${property}`);
    }
    const omitted = responseRecord(record.omitted, `${field}.omitted`);
    for (const property of [
        "runtimeValue",
        "sourceData",
        "pageData",
        "artifactBytes",
        "mediaBytes",
        "tokenValues",
        "publicPaths",
        "cachePaths",
        "sha256",
    ]) {
        requireResponseEqual(omitted[property], true, `${field}.omitted.${property}`);
    }
}


function materializationExecutionDiagnostic(
    code: string,
    severity: "info" | "blocked" | "invalid",
    field: string,
    message: string,
    nextActions: string[]
) {
    return {
        code,
        severity,
        field,
        message,
        nextActions,
    };
}

async function ensureParentDir(path: string): Promise<void> {
    await mkdir(dirname(path), { recursive: true });
}

async function executeRuntimeAssetMaterialization(
    preflight: Record<string, unknown>,
    dryRun: Record<string, unknown>,
    options: RendererRuntimeAssetMaterializationApprovalOptions | undefined
): Promise<Record<string, unknown>> {
    const approval = isMaterializationApproved(options);
    const execution = isRecord(preflight.execution) ? preflight.execution : null;
    const summary = isRecord(execution?.summary) ? execution.summary : {};
    const checks = Array.isArray(execution?.checks)
        ? execution.checks.filter((entry): entry is Record<string, unknown> => isRecord(entry))
        : [];
    const publicAssetsReady =
        checks.length > 0 &&
        checks.every((entry) => entry.required !== true || entry.exists === true);
    const preflightExecuted = execution !== null && (execution.readiness === "ready" || execution.readiness === "degraded");
    const preflightReady = preflightExecuted && publicAssetsReady;
    const dryRunSource = isRecord(dryRun.sourcePreflight) ? dryRun.sourcePreflight : {};
    // Dry-run is usable once preflight executed; cache misses are expected before materialization.
    const dryRunReady = preflightExecuted && dryRun.planVersion === "P26.26";
    const workspaceRoot = typeof execution?.workspaceRoot === "string" ? execution.workspaceRoot : null;
    const cacheRoot = typeof execution?.cacheRoot === "string" ? execution.cacheRoot : null;

    if (!approval.approved || !preflightReady || !dryRunReady || !workspaceRoot || !cacheRoot) {
        const diagnostic = materializationExecutionDiagnostic(
            "renderer_service_runtime_asset_materialization_execution_blocked",
            "blocked",
            !approval.approved ? "source.approvalReady" : "source.preflightReady",
            "Runtime asset cache materialization is blocked until preflight/dry-run readiness and an explicit approved materialization configuration are present.",
            [
                "Configure runtime asset preflight readiness, set PENPOT_RENDERER_SERVICE_RUNTIME_ASSET_MATERIALIZATION_APPROVAL=approved with a non-empty approval token and audit dir, then rerun /health.",
                "Keep unapproved writes, browser startup before assets are ready, runtime value exposure, and default MCP/CLI enablement gated.",
            ]
        );
        return {
            ...runtimeAssetMaterializationExecutionBase,
            source: {
                ...runtimeAssetMaterializationExecutionBase.source,
                preflightReady,
                dryRunReady,
                approvalReady: approval.approved,
                readiness: !approval.approved
                    ? "blocked-until-approved-materialization"
                    : !preflightReady
                      ? "blocked-until-preflight-ready"
                      : "blocked-until-dry-run-ready",
            },
            approval: {
                modeConfigured: approval.modeConfigured,
                modeAccepted: approval.modeAccepted,
                tokenConfigured: approval.tokenConfigured,
                tokenAccepted: approval.tokenAccepted,
                auditConfigured: approval.auditConfigured,
                auditWritable: false,
                approvalGranted: approval.approved,
                valuesIncluded: false,
            },
            diagnostics: [diagnostic],
            diagnosticCodes: [diagnostic.code],
            nextActions: diagnostic.nextActions,
            checks: [
                { id: "preflight-ready", status: preflightReady ? "passed" : "blocked", required: true, dispatch: false },
                { id: "dry-run-ready", status: dryRunReady ? "passed" : "blocked", required: true, dispatch: false },
                { id: "approval-granted", status: approval.approved ? "passed" : "blocked", required: true, dispatch: false },
                { id: "hash-verification", status: "planned", required: true, dispatch: false },
                { id: "rollback-on-failure", status: "planned", required: true, dispatch: false },
                { id: "values-redacted", status: "passed", required: true, dispatch: false },
            ],
            execution: null,
        };
    }

    // Invalid mode/token when configured incorrectly
    if ((approval.modeConfigured && !approval.modeAccepted) || (approval.tokenConfigured && !approval.tokenAccepted)) {
        const diagnostic = materializationExecutionDiagnostic(
            "renderer_service_runtime_asset_materialization_execution_approval_invalid",
            "invalid",
            "approval.modeAccepted",
            "Runtime asset cache materialization rejected invalid approval configuration.",
            [
                "Set PENPOT_RENDERER_SERVICE_RUNTIME_ASSET_MATERIALIZATION_APPROVAL=approved with a non-empty token and audit directory.",
                "Keep unapproved writes and value exposure gated.",
            ]
        );
        return {
            ...runtimeAssetMaterializationExecutionBase,
            status: "invalid",
            source: {
                ...runtimeAssetMaterializationExecutionBase.source,
                preflightReady,
                dryRunReady,
                approvalReady: false,
                readiness: "invalid-materialization-approval",
            },
            approval: {
                modeConfigured: approval.modeConfigured,
                modeAccepted: approval.modeAccepted,
                tokenConfigured: approval.tokenConfigured,
                tokenAccepted: approval.tokenAccepted,
                auditConfigured: approval.auditConfigured,
                auditWritable: false,
                approvalGranted: false,
                valuesIncluded: false,
            },
            diagnostics: [diagnostic],
            diagnosticCodes: [diagnostic.code],
            nextActions: diagnostic.nextActions,
            checks: [
                { id: "preflight-ready", status: preflightReady ? "passed" : "blocked", required: true, dispatch: false },
                { id: "dry-run-ready", status: dryRunReady ? "passed" : "blocked", required: true, dispatch: false },
                { id: "approval-granted", status: "invalid", required: true, dispatch: false },
                { id: "hash-verification", status: "blocked", required: true, dispatch: false },
                { id: "rollback-on-failure", status: "blocked", required: true, dispatch: false },
                { id: "values-redacted", status: "passed", required: true, dispatch: false },
            ],
            execution: null,
        };
    }

    const writtenPaths: string[] = [];
    let assetsCopied = 0;
    let assetsVerified = 0;
    let assetsRolledBack = 0;
    let fileRead = false;
    let hashComputed = false;
    let auditRecordWritten = false;
    const assetResults: Array<Record<string, unknown>> = [];

    try {
        for (const asset of bundledRuntimeBridgeAssetManifest.assets) {
            const publicPath = isAbsolute(asset.publicPath) ? asset.publicPath : resolve(workspaceRoot, asset.publicPath);
            const cachePath = remapRuntimeAssetCachePath(asset.cachePath, cacheRoot);
            const sourceExists = await filesystemEntryExists(publicPath);
            if (!sourceExists) {
                throw Object.assign(new Error(`Missing public runtime asset for materialization: ${asset.id}`), {
                    code: "renderer_service_runtime_asset_materialization_source_missing",
                });
            }
            const sourceHash = await runtimeAssetHash(publicPath, true);
            fileRead = fileRead || sourceHash.fileRead;
            hashComputed = hashComputed || sourceHash.hashComputed;
            await ensureParentDir(cachePath);
            // Write via temp then rename for atomicity; track for rollback
            const tempPath = `${cachePath}.materializing`;
            await copyFile(publicPath, tempPath);
            writtenPaths.push(tempPath);
            const tempHash = await runtimeAssetHash(tempPath, true);
            fileRead = true;
            hashComputed = true;
            if (!tempHash.hashComputed || tempHash.sha256 !== sourceHash.sha256) {
                throw Object.assign(new Error(`Hash verification failed for runtime asset materialization: ${asset.id}`), {
                    code: "renderer_service_runtime_asset_materialization_hash_mismatch",
                });
            }
            await rm(cachePath, { force: true }).catch(() => undefined);
            // rename by copy+rm for cross-device safety
            await copyFile(tempPath, cachePath);
            writtenPaths.push(cachePath);
            await rm(tempPath, { force: true });
            // remove temp from written list conceptually; keep cachePath
            const tempIndex = writtenPaths.indexOf(tempPath);
            if (tempIndex >= 0) {
                writtenPaths.splice(tempIndex, 1);
            }
            assetsCopied += 1;
            assetsVerified += 1;
            assetResults.push({
                assetId: asset.id,
                copied: true,
                hashVerified: true,
                valuesIncluded: false,
            });
        }

        const auditDir = approval.auditDir?.trim() ?? "";
        await mkdir(auditDir, { recursive: true });
        const auditPath = resolve(auditDir, `runtime-asset-materialization-${Date.now()}.json`);
        const auditPayload = {
            executionVersion: "P26.51",
            status: "executed",
            assetsCopied,
            assetsVerified,
            assetResults,
            // no token/path/hash values
            valuesIncluded: false,
            tokenValuesIncluded: false,
            pathValuesIncluded: false,
            sha256ValuesIncluded: false,
        };
        await writeFile(auditPath, `${JSON.stringify(auditPayload)}\n`, "utf8");
        auditRecordWritten = true;

        const diagnostic = materializationExecutionDiagnostic(
            "renderer_service_runtime_asset_materialization_execution_succeeded",
            "info",
            "materialization.succeeded",
            "Approved runtime asset cache materialization copied and hash-verified public assets into the cache root with audit metadata.",
            [
                "Keep browser startup, runtime value exposure, and default MCP/CLI enablement gated until later reviewed slices.",
                "Proceed to real-scene PNG production only after installed real runtime and source-data paths are ready.",
            ]
        );
        return {
            ...runtimeAssetMaterializationExecutionBase,
            status: "executed",
            source: {
                ...runtimeAssetMaterializationExecutionBase.source,
                preflightReady: true,
                dryRunReady: true,
                approvalReady: true,
                readiness: "runtime-asset-materialization-executed",
            },
            approval: {
                modeConfigured: true,
                modeAccepted: true,
                tokenConfigured: true,
                tokenAccepted: true,
                auditConfigured: true,
                auditWritable: true,
                approvalGranted: true,
                valuesIncluded: false,
            },
            materialization: {
                attempted: true,
                succeeded: true,
                assetsCopied,
                assetsVerified,
                assetsRolledBack: 0,
                hashVerificationEnabled: true,
                rollbackOnFailure: true,
                localFileWrites: true,
                valuesIncluded: false,
            },
            diagnostics: [diagnostic],
            diagnosticCodes: [diagnostic.code],
            nextActions: diagnostic.nextActions,
            checks: [
                { id: "preflight-ready", status: "passed", required: true, dispatch: false },
                { id: "dry-run-ready", status: "passed", required: true, dispatch: false },
                { id: "approval-granted", status: "passed", required: true, dispatch: false },
                { id: "hash-verification", status: "passed", required: true, dispatch: false },
                { id: "rollback-on-failure", status: "passed", required: true, dispatch: false },
                { id: "values-redacted", status: "passed", required: true, dispatch: false },
            ],
            sideEffects: {
                browserProcessStarted: false,
                runtimeExecutionRegistered: false,
                runtimeAdapterImported: false,
                runtimeAssetsLoaded: false,
                assetManifestMaterialized: true,
                fileRead: true,
                hashComputed: true,
                networkDispatch: false,
                dispatch: false,
                localFileWrites: true,
                auditRecordWritten: true,
            },
            execution: {
                attempted: true,
                succeeded: true,
                outcome: "executed",
                assetsCopied,
                assetsVerified,
                assetsRolledBack: 0,
                assetCount: assetResults.length,
                valuesIncluded: false,
            },
        };
    } catch (error) {
        for (const written of [...writtenPaths].reverse()) {
            try {
                await rm(written, { force: true, recursive: true });
                assetsRolledBack += 1;
            } catch {
                // best-effort rollback
            }
        }
        const diagnostic = materializationExecutionDiagnostic(
            "renderer_service_runtime_asset_materialization_execution_failed",
            "invalid",
            "materialization.succeeded",
            error instanceof Error ? error.message : "Runtime asset cache materialization failed.",
            [
                "Inspect public asset availability and cache root permissions, then rerun approved materialization.",
                "Keep unapproved writes, browser startup before assets are ready, runtime value exposure, and default MCP/CLI enablement gated.",
            ]
        );
        return {
            ...runtimeAssetMaterializationExecutionBase,
            status: "invalid",
            source: {
                ...runtimeAssetMaterializationExecutionBase.source,
                preflightReady: true,
                dryRunReady: true,
                approvalReady: true,
                readiness: "runtime-asset-materialization-failed",
            },
            approval: {
                modeConfigured: true,
                modeAccepted: true,
                tokenConfigured: true,
                tokenAccepted: true,
                auditConfigured: true,
                auditWritable: false,
                approvalGranted: true,
                valuesIncluded: false,
            },
            materialization: {
                attempted: true,
                succeeded: false,
                assetsCopied,
                assetsVerified,
                assetsRolledBack,
                hashVerificationEnabled: true,
                rollbackOnFailure: true,
                localFileWrites: assetsCopied > 0 || assetsRolledBack > 0,
                valuesIncluded: false,
            },
            diagnostics: [diagnostic],
            diagnosticCodes: [diagnostic.code],
            nextActions: diagnostic.nextActions,
            checks: [
                { id: "preflight-ready", status: "passed", required: true, dispatch: false },
                { id: "dry-run-ready", status: "passed", required: true, dispatch: false },
                { id: "approval-granted", status: "passed", required: true, dispatch: false },
                { id: "hash-verification", status: "failed", required: true, dispatch: false },
                { id: "rollback-on-failure", status: "passed", required: true, dispatch: false },
                { id: "values-redacted", status: "passed", required: true, dispatch: false },
            ],
            sideEffects: {
                browserProcessStarted: false,
                runtimeExecutionRegistered: false,
                runtimeAdapterImported: false,
                runtimeAssetsLoaded: false,
                assetManifestMaterialized: false,
                fileRead,
                hashComputed,
                networkDispatch: false,
                dispatch: false,
                localFileWrites: assetsCopied > 0 || assetsRolledBack > 0,
                auditRecordWritten,
            },
            execution: {
                attempted: true,
                succeeded: false,
                outcome: "failed-rolled-back",
                assetsCopied,
                assetsVerified,
                assetsRolledBack,
                valuesIncluded: false,
            },
        };
    }
}

function validateRuntimeAssetMaterializationExecutionResponse(actual: unknown, field: string): void {
    const record = responseRecord(actual, field);
    const status = String(record.status ?? "");
    if (!["blocked", "executed", "invalid"].includes(status)) {
        responseInvalid(`${field}.status must be blocked, executed, or invalid.`, `${field}.status`);
    }
    requireResponseEqual(record.executionVersion, "P26.51", `${field}.executionVersion`);
    requireResponseEqual(record.owner, "renderer-service", `${field}.owner`);
    requireResponseEqual(record.mode, "approved-runtime-asset-cache-materialization", `${field}.mode`);

    const source = responseRecord(record.source, `${field}.source`);
    requireResponseEqual(source.materializationExecutionVersion, "P26.51", `${field}.source.materializationExecutionVersion`);

    const approval = responseRecord(record.approval, `${field}.approval`);
    requireResponseEqual(approval.valuesIncluded, false, `${field}.approval.valuesIncluded`);

    const materialization = responseRecord(record.materialization, `${field}.materialization`);
    requireResponseEqual(materialization.valuesIncluded, false, `${field}.materialization.valuesIncluded`);
    requireResponseEqual(materialization.hashVerificationEnabled, true, `${field}.materialization.hashVerificationEnabled`);
    requireResponseEqual(materialization.rollbackOnFailure, true, `${field}.materialization.rollbackOnFailure`);

    const redaction = responseRecord(record.redaction, `${field}.redaction`);
    for (const property of [
        "pathValuesIncluded",
        "tokenValuesIncluded",
        "sourceDataValuesIncluded",
        "pageValuesIncluded",
        "artifactValuesIncluded",
        "mediaValuesIncluded",
    ]) {
        requireResponseEqual(redaction[property], false, `${field}.redaction.${property}`);
    }

    const omitted = responseRecord(record.omitted, `${field}.omitted`);
    for (const property of [
        "workspaceRoot",
        "cacheRoot",
        "publicPaths",
        "cachePaths",
        "sha256",
        "tokenValues",
        "approvalAuditPaths",
    ]) {
        requireResponseEqual(omitted[property], true, `${field}.omitted.${property}`);
    }

    const sideEffects = responseRecord(record.sideEffects, `${field}.sideEffects`);
    requireResponseEqual(sideEffects.browserProcessStarted, false, `${field}.sideEffects.browserProcessStarted`);
    requireResponseEqual(sideEffects.runtimeAdapterImported, false, `${field}.sideEffects.runtimeAdapterImported`);
    requireResponseEqual(sideEffects.runtimeAssetsLoaded, false, `${field}.sideEffects.runtimeAssetsLoaded`);
    requireResponseEqual(sideEffects.dispatch, false, `${field}.sideEffects.dispatch`);
    requireResponseEqual(sideEffects.networkDispatch, false, `${field}.sideEffects.networkDispatch`);
}



export const bundledSceneBridgeContract = {
    status: "planned-disabled",
    contractVersion: "P26.32",
    owner: "renderer-service",
    mode: "metadata-only",
    bridge: "browser-backed-service-adapter",
    runtime: "render-wasm-worker",
    fallback: "frontend-rasterizer",
    adapterModule: {
        status: "planned-disabled",
        moduleType: "service-owned-es-module",
        exportName: "createBundledSceneBridgeRendererRuntime",
        factorySignature: "(options) => Promise<RendererRuntimeOptions>",
        implements: "RendererRuntimeOptions.renderThumbnail",
        lifecycleHook: "close",
        moduleImported: false,
        runtimeRegistration: false,
        valuesIncluded: false,
    },
    assetPrerequisites: {
        manifestVersion: bundledRuntimeBridgeAssetManifest.manifestVersion,
        preflightVersion: bundledRuntimeAssetMaterializationPreflight.preflightVersion,
        preflightExecutionVersion: "P26.22",
        materializationDryRunVersion: bundledRuntimeAssetMaterializationDryRunPlan.planVersion,
        materializationApprovalVersion: bundledRuntimeAssetMaterializationApprovalPlan.planVersion,
        requiredAssetIds: bundledRuntimeBridgeAssetManifest.validation.requiredAssetIds,
        requiredCacheOutputIds: bundledRuntimeBridgeAssetManifest.cacheOutputs.map((entry) => entry.id),
        preflightRequired: true,
        approvalRequired: true,
        materializationApproved: false,
        materializationWritesEnabled: false,
        assetExistenceChecked: false,
        assetHashesComputed: false,
        cacheOutputsChecked: false,
        assetValuesIncluded: false,
    },
    browserPageHandoff: {
        owner: "renderer-service",
        engine: "chromium",
        headless: true,
        activeEditorTabRequired: false,
        pageReusePolicy: "single-page-serial-queue",
        sourceDataTransfer: "renderer-service-internal-redacted",
        browserProcessStarted: false,
        pageCreated: false,
        pageValuesIncluded: false,
        playwrightPathIncluded: false,
    },
    renderInputContract: {
        type: "RendererRuntimeRenderInput",
        targetKinds: ["file", "frame"],
        requiredSections: ["target", "artifact", "cache", "render", "sourceData"],
        renderRuntime: "render-wasm-worker",
        renderFallback: "frontend-rasterizer",
        sourceDataValuesIncluded: false,
        pageValuesIncluded: false,
        artifactValuesIncluded: false,
        mediaValuesIncluded: false,
        tokenValuesIncluded: false,
    },
    renderOutputContract: {
        type: "RendererRuntimeRenderResult",
        artifactFormat: "png",
        artifactMimeType: "image/png",
        allowedRuntimes: ["render-wasm-worker", "frontend-rasterizer"],
        nonEmptyPngRequired: true,
        artifactByteLengthIncluded: false,
        artifactBytesIncluded: false,
        localFileWrites: false,
        resourceValuesIncluded: false,
        mediaValuesIncluded: false,
    },
    diagnostics: [
        {
            code: "renderer_service_bundled_scene_bridge_contract_defined",
            severity: "info",
            message: "The bundled scene bridge adapter contract is documented and validated, but runtime registration remains disabled.",
            nextActions: ["Implement the bundled scene bridge adapter in a later task behind the existing renderer-service opt-in gate."],
        },
    ],
    diagnosticCodes: ["renderer_service_bundled_scene_bridge_contract_defined"],
    nextActions: [
        "Implement the service-owned bundled scene bridge adapter after asset materialization approval is reviewed.",
        "Keep default MCP/CLI rendering disabled until the adapter passes browser lifecycle and pixel/resource tests.",
    ],
    blockedAlternatives: [
        {
            id: "direct-node-render-wasm",
            selected: false,
            reason: "the current Emscripten/WebGL bridge is coupled to browser canvas APIs and frontend globals",
        },
        {
            id: "active-frontend-session-bridge",
            selected: false,
            reason: "global MCP and CLI thumbnail execution must not require an open editor tab",
        },
        {
            id: "exporter-preview-reuse",
            selected: false,
            reason: "exporter preview paths do not own dashboard thumbnail cache probes, source-data reads, or persistence",
        },
    ],
    executionSequence: [
        "load bundled browser adapter once per renderer-service process",
        "create or reuse a headless browser page with packaged thumbnail bridge assets",
        "send source data to the bridge only inside the service process",
        "render via render-wasm worker path when available",
        "fallback to frontend rasterizer-compatible SVG path when render-wasm cannot initialize",
        "return PNG bytes in memory to the existing persist stage",
    ],
    testMatrix: [
        {
            id: "contract-surfaced-health-thumbnail",
            required: true,
            status: "planned",
            dispatch: false,
        },
        {
            id: "adapter-module-contract-validation",
            required: true,
            status: "planned",
            dispatch: false,
        },
        {
            id: "asset-prerequisite-gates",
            required: true,
            status: "planned",
            dispatch: false,
        },
        {
            id: "browser-page-handoff-redaction",
            required: true,
            status: "planned",
            dispatch: false,
        },
        {
            id: "render-input-output-validation",
            required: true,
            status: "planned",
            dispatch: false,
        },
    ],
    sideEffects: {
        browserProcessStarted: false,
        runtimeExecutionRegistered: false,
        runtimeAdapterImported: false,
        runtimeAssetsLoaded: false,
        assetManifestMaterialized: false,
        networkDispatch: false,
        dispatch: false,
        localFileWrites: false,
    },
    redaction: {
        sourceDataValuesIncluded: false,
        pageValuesIncluded: false,
        artifactValuesIncluded: false,
        mediaValuesIncluded: false,
        tokenValuesIncluded: false,
        pathValuesIncluded: false,
    },
    omitted: {
        workspaceRoot: true,
        cacheRoot: true,
        publicPaths: true,
        cachePaths: true,
        sha256: true,
        playwrightBrowserPath: true,
        runtimeModulePath: true,
        sourceData: true,
        pageData: true,
        artifactBytes: true,
        mediaBytes: true,
        tokenValues: true,
    },
    execution: null,
} as const;

export const bundledSceneBridgeAdapterModule = {
    status: "planned-disabled",
    readinessVersion: "P26.33",
    owner: "renderer-service",
    mode: "disabled-module-boundary",
    module: "./bundled-scene-bridge-runtime.js",
    moduleType: "service-owned-es-module",
    exportName: "createBundledSceneBridgeRendererRuntime",
    factorySignature: "(options) => Promise<RendererRuntimeOptions>",
    implements: "RendererRuntimeOptions.renderThumbnail",
    lifecycleHook: "close",
    defaultServiceImport: false,
    moduleDefined: true,
    moduleImported: false,
    factoryInvoked: false,
    runtimeRegistration: false,
    runtimeExecutionRegistered: false,
    browserProcessStarted: false,
    browserPageCreated: false,
    runtimeAssetsLoaded: false,
    assetMaterializationWritesEnabled: false,
    backendRpcReads: false,
    sourceDataReads: false,
    networkDispatch: false,
    dispatch: false,
    localFileWrites: false,
    valuesIncluded: false,
    diagnostics: [
        {
            code: "renderer_service_bundled_scene_bridge_adapter_module_defined_disabled",
            severity: "info",
            message: "The bundled scene bridge adapter module boundary exists, but default service import, factory invocation, and runtime registration remain disabled.",
            nextActions: [
                "Add an explicit renderer-service import and registration gate before invoking the adapter factory.",
                "Add browser lifecycle, pixel, and resource normalization tests before enabling real scene rendering.",
            ],
        },
    ],
    diagnosticCodes: ["renderer_service_bundled_scene_bridge_adapter_module_defined_disabled"],
    nextActions: [
        "Wire the adapter through an explicit renderer-service opt-in gate in a later task.",
        "Keep default MCP/CLI rendering on the existing renderer-service execution path until the adapter passes browser and pixel tests.",
    ],
    sideEffects: {
        browserProcessStarted: false,
        browserPageCreated: false,
        runtimeExecutionRegistered: false,
        runtimeAdapterImported: false,
        runtimeFactoryInvoked: false,
        runtimeAssetsLoaded: false,
        assetManifestMaterialized: false,
        backendRpcReads: false,
        sourceDataReads: false,
        networkDispatch: false,
        dispatch: false,
        localFileWrites: false,
    },
    redaction: {
        pathValuesIncluded: false,
        sourceDataValuesIncluded: false,
        pageValuesIncluded: false,
        artifactValuesIncluded: false,
        mediaValuesIncluded: false,
        tokenValuesIncluded: false,
    },
    omitted: {
        workspaceRoot: true,
        cacheRoot: true,
        modulePath: true,
        publicPaths: true,
        cachePaths: true,
        sha256: true,
        playwrightBrowserPath: true,
        runtimeModulePath: true,
        sourceData: true,
        pageData: true,
        artifactBytes: true,
        mediaBytes: true,
        tokenValues: true,
    },
    execution: null,
} as const;

function bundledSceneBridgeImportGateResponse(
    options: Pick<
        RendererServiceOptions,
        "renderer" | "rendererRuntimeModule" | "browserFixtureRuntime" | "rendererRuntimeSource" | "bundledSceneBridgeImportGate"
    > = {}
): Record<string, unknown> {
    const runtimeSource = rendererRuntimeSourceForOptions(options);
    const configured = options.bundledSceneBridgeImportGate?.configured === true;
    const value = options.bundledSceneBridgeImportGate?.value;
    const importGateRequested = value === BUNDLED_SCENE_BRIDGE_RUNTIME_IMPORT_GATE_VALUE;
    const registrationPreflightRequested = value === BUNDLED_SCENE_BRIDGE_RUNTIME_REGISTRATION_PREFLIGHT_VALUE;
    const valueValid = !configured || importGateRequested || registrationPreflightRequested;
    const runtimeModuleConflict = configured && (Boolean(options.rendererRuntimeModule) || runtimeSource === "runtime-module");
    const browserFixtureRuntimeConflict = configured && (options.browserFixtureRuntime === true || runtimeSource === "browser-fixture");
    const injectedRuntimeConflict = configured && (Boolean(options.renderer) || runtimeSource === "injected");
    const diagnostics = [];

    if (configured && !valueValid) {
        diagnostics.push({
            code: "renderer_service_bundled_scene_bridge_import_gate_configuration_invalid",
            severity: "invalid",
            field: "mode",
            env: BUNDLED_SCENE_BRIDGE_RUNTIME_ENV,
            valueRead: false,
            valuesIncluded: false,
            message: "Renderer-service bundled scene bridge runtime mode must be import-gate or registration-preflight when configured.",
            nextActions: [
                `Set ${BUNDLED_SCENE_BRIDGE_RUNTIME_ENV}=${BUNDLED_SCENE_BRIDGE_RUNTIME_IMPORT_GATE_VALUE} for import/factory preflight, set it to ${BUNDLED_SCENE_BRIDGE_RUNTIME_REGISTRATION_PREFLIGHT_VALUE} for runtime registration preflight, or leave it unset.`,
                "Rerun renderer-service /health after fixing the mode.",
            ],
        });
    }
    if (runtimeModuleConflict) {
        diagnostics.push({
            code: "renderer_service_bundled_scene_bridge_import_gate_runtime_module_conflict",
            severity: "invalid",
            field: "runtimeModule",
            env: RENDERER_RUNTIME_MODULE_ENV,
            valueRead: false,
            valuesIncluded: false,
            message: "Renderer-service bundled scene bridge import gate cannot be combined with a manual runtime module.",
            nextActions: [
                `Unset ${BUNDLED_SCENE_BRIDGE_RUNTIME_ENV} when using ${RENDERER_RUNTIME_MODULE_ENV}.`,
                "Use only one renderer runtime selection mechanism for a renderer-service process.",
            ],
        });
    }
    if (browserFixtureRuntimeConflict) {
        diagnostics.push({
            code: "renderer_service_bundled_scene_bridge_import_gate_browser_fixture_conflict",
            severity: "invalid",
            field: "browserFixtureRuntime",
            env: BROWSER_FIXTURE_RUNTIME_ENV,
            valueRead: false,
            valuesIncluded: false,
            message: "Renderer-service bundled scene bridge import gate cannot be combined with the browser fixture runtime.",
            nextActions: [
                `Unset ${BUNDLED_SCENE_BRIDGE_RUNTIME_ENV} when using ${BROWSER_FIXTURE_RUNTIME_ENV}.`,
                "Keep fixture lifecycle validation separate from the future bundled scene bridge import gate.",
            ],
        });
    }
    if (injectedRuntimeConflict) {
        diagnostics.push({
            code: "renderer_service_bundled_scene_bridge_import_gate_injected_runtime_conflict",
            severity: "invalid",
            field: "injectedRuntime",
            env: "RendererServiceOptions.renderer",
            valueRead: false,
            valuesIncluded: false,
            message: "Renderer-service bundled scene bridge import gate cannot be combined with an injected runtime adapter.",
            nextActions: [
                "Unset the bundled scene bridge import gate when injecting a test runtime adapter.",
                "Use only one renderer runtime selection mechanism for a renderer-service process.",
            ],
        });
    }

    const invalid = diagnostics.length > 0;
    const diagnosticEntries =
        diagnostics.length > 0
            ? diagnostics
            : [
                  {
                      code: "renderer_service_bundled_scene_bridge_import_gate_defined_disabled",
                      severity: "info",
                      field: "mode",
                      env: BUNDLED_SCENE_BRIDGE_RUNTIME_ENV,
                      valueRead: false,
                      valuesIncluded: false,
                      message: "The bundled scene bridge import gate is defined, but module import, factory invocation, and runtime registration remain disabled.",
                      nextActions: [
                          `Set ${BUNDLED_SCENE_BRIDGE_RUNTIME_ENV}=${BUNDLED_SCENE_BRIDGE_RUNTIME_EXPECTED_VALUE} only after the future import implementation is enabled.`,
                          `Use ${BUNDLED_SCENE_BRIDGE_RUNTIME_ENV}=${BUNDLED_SCENE_BRIDGE_RUNTIME_REGISTRATION_PREFLIGHT_VALUE} only for the guarded P26.40 runtime registration preflight.`,
                          "Keep default MCP/CLI rendering on the existing renderer-service path until browser and pixel tests pass.",
                      ],
                  },
              ];

    return {
        status: invalid ? "invalid" : configured ? "configured-disabled" : "planned-disabled",
        gateVersion: "P26.34",
        owner: "renderer-service",
        mode: "explicit-import-gate",
        env: BUNDLED_SCENE_BRIDGE_RUNTIME_ENV,
        expectedValue: BUNDLED_SCENE_BRIDGE_RUNTIME_EXPECTED_VALUE,
        acceptedValues: [...BUNDLED_SCENE_BRIDGE_RUNTIME_ACCEPTED_VALUES],
        configured,
        requested: configured && valueValid,
        importGateRequested: configured && importGateRequested,
        registrationPreflightRequested: configured && registrationPreflightRequested,
        valid: !invalid,
        configuration: {
            configured,
            expectedValue: BUNDLED_SCENE_BRIDGE_RUNTIME_EXPECTED_VALUE,
            acceptedValues: [...BUNDLED_SCENE_BRIDGE_RUNTIME_ACCEPTED_VALUES],
            valueRead: false,
            valuesIncluded: false,
            accepted: configured && valueValid && !invalid,
            importGateAccepted: configured && importGateRequested && !invalid,
            registrationPreflightAccepted: configured && registrationPreflightRequested && !invalid,
        },
        conflicts: {
            runtimeModule: runtimeModuleConflict,
            browserFixtureRuntime: browserFixtureRuntimeConflict,
            injectedRuntime: injectedRuntimeConflict,
        },
        gate: {
            importRequiresExplicitConfig: true,
            importEnabled: false,
            importAttempted: false,
            moduleImported: false,
            factoryInvoked: false,
            runtimeRegistration: false,
            runtimeExecutionRegistered: false,
        },
        diagnostics: diagnosticEntries,
        diagnosticCodes: diagnosticEntries.map((entry) => entry.code),
        nextActions: [...new Set(diagnosticEntries.flatMap((entry) => entry.nextActions))],
        sideEffects: {
            browserProcessStarted: false,
            browserPageCreated: false,
            runtimeExecutionRegistered: false,
            runtimeAdapterImported: false,
            runtimeFactoryInvoked: false,
            runtimeAssetsLoaded: false,
            assetManifestMaterialized: false,
            backendRpcReads: false,
            sourceDataReads: false,
            networkDispatch: false,
            dispatch: false,
            localFileWrites: false,
        },
        redaction: {
            modeValuesIncluded: false,
            pathValuesIncluded: false,
            sourceDataValuesIncluded: false,
            pageValuesIncluded: false,
            artifactValuesIncluded: false,
            mediaValuesIncluded: false,
            tokenValuesIncluded: false,
        },
        omitted: {
            configuredValue: true,
            workspaceRoot: true,
            cacheRoot: true,
            modulePath: true,
            publicPaths: true,
            cachePaths: true,
            sha256: true,
            playwrightBrowserPath: true,
            runtimeModulePath: true,
            sourceData: true,
            pageData: true,
            artifactBytes: true,
            mediaBytes: true,
            tokenValues: true,
        },
        execution: null,
    };
}

export const bundledSceneBridgeImportGate = bundledSceneBridgeImportGateResponse();

export const bundledSceneBridgeFactoryShapePreflight = {
    status: "planned-disabled",
    preflightVersion: "P26.35",
    owner: "renderer-service",
    mode: "closed-factory-shape-preflight",
    source: {
        contractVersion: "P26.32",
        adapterModuleReadinessVersion: "P26.33",
        importGateVersion: "P26.34",
        importGateRequired: true,
        importGateOpen: false,
        readiness: "blocked-until-import-gate-opens",
    },
    moduleImport: {
        module: "./bundled-scene-bridge-runtime.js",
        moduleType: "service-owned-es-module",
        exportName: "createBundledSceneBridgeRendererRuntime",
        importAttempted: false,
        moduleImported: false,
        namespaceInspected: false,
        valuesIncluded: false,
    },
    factoryShape: {
        expectedType: "function",
        expectedSignature: "(options) => Promise<RendererRuntimeOptions>",
        requiredOptionKeys: ["assetManifest", "runtimeAssetPreflight", "browser"],
        factoryPresent: false,
        shapeCheckAttempted: false,
        callableChecked: false,
        optionsShapeValidated: false,
        promiseReturnValidated: false,
        factoryInvoked: false,
        valuesIncluded: false,
    },
    runtimeOptionsShape: {
        expectedType: "RendererRuntimeOptions",
        requiredKeys: ["renderThumbnail"],
        optionalKeys: ["close"],
        renderThumbnailExpectedType: "function",
        closeExpectedType: "function",
        runtimeOptionsCreated: false,
        shapeCheckAttempted: false,
        renderThumbnailChecked: false,
        closeHookChecked: false,
        runtimeRegistration: false,
        runtimeExecutionRegistered: false,
        valuesIncluded: false,
    },
    importOutcomeTaxonomy: [
        {
            code: "renderer_service_bundled_scene_bridge_factory_shape_import_disabled",
            stage: "import",
            severity: "blocked",
            retryable: false,
            dispatch: false,
        },
        {
            code: "renderer_service_bundled_scene_bridge_factory_shape_export_missing",
            stage: "namespace",
            severity: "invalid",
            retryable: false,
            dispatch: false,
        },
        {
            code: "renderer_service_bundled_scene_bridge_factory_shape_not_callable",
            stage: "factory",
            severity: "invalid",
            retryable: false,
            dispatch: false,
        },
        {
            code: "renderer_service_bundled_scene_bridge_factory_shape_result_invalid",
            stage: "runtime-options",
            severity: "invalid",
            retryable: false,
            dispatch: false,
        },
    ],
    diagnostics: [
        {
            code: "renderer_service_bundled_scene_bridge_factory_shape_preflight_defined_disabled",
            severity: "info",
            field: "factoryShape",
            message: "The bundled scene bridge adapter factory-shape preflight is defined, but adapter import, factory invocation, and runtime option validation remain disabled.",
            nextActions: [
                "Open the explicit bundled scene bridge import gate in a later task before checking the adapter factory shape.",
                "Keep default MCP/CLI rendering on the existing renderer-service path until factory shape, browser lifecycle, and pixel tests pass.",
            ],
        },
    ],
    diagnosticCodes: ["renderer_service_bundled_scene_bridge_factory_shape_preflight_defined_disabled"],
    nextActions: [
        "Implement the closed import preflight before loading the bundled scene bridge module.",
        "Validate factory shape without exposing module paths, source data, page data, artifact bytes, media bytes, or tokens.",
    ],
    checks: [
        {
            id: "import-gate-open",
            status: "blocked",
            required: true,
            dispatch: false,
        },
        {
            id: "module-namespace-export",
            status: "planned",
            required: true,
            dispatch: false,
        },
        {
            id: "factory-callable-shape",
            status: "planned",
            required: true,
            dispatch: false,
        },
        {
            id: "runtime-options-shape",
            status: "planned",
            required: true,
            dispatch: false,
        },
    ],
    sideEffects: {
        browserProcessStarted: false,
        browserPageCreated: false,
        runtimeExecutionRegistered: false,
        runtimeAdapterImported: false,
        runtimeFactoryInvoked: false,
        runtimeOptionsCreated: false,
        runtimeAssetsLoaded: false,
        assetManifestMaterialized: false,
        backendRpcReads: false,
        sourceDataReads: false,
        networkDispatch: false,
        dispatch: false,
        localFileWrites: false,
    },
    redaction: {
        moduleValuesIncluded: false,
        pathValuesIncluded: false,
        sourceDataValuesIncluded: false,
        pageValuesIncluded: false,
        artifactValuesIncluded: false,
        mediaValuesIncluded: false,
        tokenValuesIncluded: false,
    },
    omitted: {
        moduleNamespace: true,
        factoryValue: true,
        runtimeOptionsValue: true,
        workspaceRoot: true,
        cacheRoot: true,
        modulePath: true,
        publicPaths: true,
        cachePaths: true,
        sha256: true,
        playwrightBrowserPath: true,
        runtimeModulePath: true,
        sourceData: true,
        pageData: true,
        artifactBytes: true,
        mediaBytes: true,
        tokenValues: true,
    },
    execution: null,
} as const;

const bundledSceneBridgeModuleNamespaceImportPreflightBase = {
    status: "planned-disabled",
    preflightVersion: "P26.36",
    owner: "renderer-service",
    mode: "gated-module-namespace-import-preflight",
    source: {
        contractVersion: "P26.32",
        adapterModuleReadinessVersion: "P26.33",
        importGateVersion: "P26.34",
        factoryShapePreflightVersion: "P26.35",
        importGateRequired: true,
        importGateOpen: false,
        readiness: "blocked-until-import-gate-opens",
    },
    moduleImport: {
        module: "./bundled-scene-bridge-runtime.js",
        moduleType: "service-owned-es-module",
        exportName: "createBundledSceneBridgeRendererRuntime",
        importAttempted: false,
        moduleImported: false,
        namespaceInspected: false,
        importSucceeded: false,
        valuesIncluded: false,
    },
    factoryShape: {
        expectedType: "function",
        expectedSignature: "(options) => Promise<RendererRuntimeOptions>",
        factoryPresent: false,
        callableChecked: false,
        factoryCallable: false,
        factoryInvoked: false,
        valuesIncluded: false,
    },
    runtimeOptionsShape: {
        runtimeOptionsCreated: false,
        shapeCheckAttempted: false,
        runtimeRegistration: false,
        runtimeExecutionRegistered: false,
        valuesIncluded: false,
    },
    importOutcomeTaxonomy: [
        {
            code: "renderer_service_bundled_scene_bridge_module_namespace_import_gate_closed",
            stage: "gate",
            severity: "blocked",
            retryable: false,
            dispatch: false,
        },
        {
            code: "renderer_service_bundled_scene_bridge_module_namespace_import_failed",
            stage: "import",
            severity: "invalid",
            retryable: true,
            dispatch: false,
        },
        {
            code: "renderer_service_bundled_scene_bridge_module_namespace_export_missing",
            stage: "namespace",
            severity: "invalid",
            retryable: false,
            dispatch: false,
        },
        {
            code: "renderer_service_bundled_scene_bridge_module_namespace_export_not_callable",
            stage: "factory",
            severity: "invalid",
            retryable: false,
            dispatch: false,
        },
        {
            code: "renderer_service_bundled_scene_bridge_module_namespace_import_ready",
            stage: "namespace",
            severity: "info",
            retryable: false,
            dispatch: false,
        },
    ],
    diagnostics: [
        {
            code: "renderer_service_bundled_scene_bridge_module_namespace_import_gate_closed",
            severity: "blocked",
            field: "source.importGateOpen",
            message: "The bundled scene bridge module namespace import preflight is defined, but the explicit import gate is not open.",
            nextActions: [
                `Set ${BUNDLED_SCENE_BRIDGE_RUNTIME_ENV}=${BUNDLED_SCENE_BRIDGE_RUNTIME_EXPECTED_VALUE} only when intentionally checking the bundled scene bridge module namespace.`,
                "Keep factory invocation, runtime option creation, browser startup, and runtime registration disabled until later reviewed tasks.",
            ],
        },
    ],
    diagnosticCodes: ["renderer_service_bundled_scene_bridge_module_namespace_import_gate_closed"],
    nextActions: [
        `Set ${BUNDLED_SCENE_BRIDGE_RUNTIME_ENV}=${BUNDLED_SCENE_BRIDGE_RUNTIME_EXPECTED_VALUE} only when intentionally checking the bundled scene bridge module namespace.`,
        "Keep factory invocation, runtime option creation, browser startup, and runtime registration disabled until later reviewed tasks.",
    ],
    checks: [
        {
            id: "import-gate-open",
            status: "blocked",
            required: true,
            dispatch: false,
        },
        {
            id: "module-namespace-import",
            status: "planned",
            required: true,
            dispatch: false,
        },
        {
            id: "module-namespace-export",
            status: "planned",
            required: true,
            dispatch: false,
        },
        {
            id: "factory-callable-shape",
            status: "planned",
            required: true,
            dispatch: false,
        },
        {
            id: "runtime-options-shape",
            status: "blocked",
            required: false,
            dispatch: false,
        },
    ],
    sideEffects: {
        browserProcessStarted: false,
        browserPageCreated: false,
        runtimeExecutionRegistered: false,
        runtimeAdapterImported: false,
        runtimeFactoryInvoked: false,
        runtimeOptionsCreated: false,
        runtimeAssetsLoaded: false,
        assetManifestMaterialized: false,
        backendRpcReads: false,
        sourceDataReads: false,
        networkDispatch: false,
        dispatch: false,
        localFileWrites: false,
    },
    redaction: {
        moduleValuesIncluded: false,
        pathValuesIncluded: false,
        sourceDataValuesIncluded: false,
        pageValuesIncluded: false,
        artifactValuesIncluded: false,
        mediaValuesIncluded: false,
        tokenValuesIncluded: false,
    },
    omitted: {
        moduleNamespace: true,
        factoryValue: true,
        runtimeOptionsValue: true,
        workspaceRoot: true,
        cacheRoot: true,
        modulePath: true,
        publicPaths: true,
        cachePaths: true,
        sha256: true,
        playwrightBrowserPath: true,
        runtimeModulePath: true,
        sourceData: true,
        pageData: true,
        artifactBytes: true,
        mediaBytes: true,
        tokenValues: true,
    },
    execution: null,
} as const;

export const bundledSceneBridgeModuleNamespaceImportPreflight = bundledSceneBridgeModuleNamespaceImportPreflightBase;

function bundledSceneBridgeModuleNamespaceImportDiagnostic(
    code: string,
    severity: "info" | "blocked" | "invalid",
    field: string,
    message: string,
    nextActions: string[]
) {
    return {
        code,
        severity,
        field,
        message,
        nextActions,
    };
}

async function bundledSceneBridgeModuleNamespaceImportPreflightResponse(
    importGate: Record<string, unknown>
): Promise<Record<string, unknown>> {
    const configuration = isRecord(importGate.configuration) ? importGate.configuration : {};
    const importGateAccepted = importGate.status === "configured-disabled" && configuration.accepted === true;
    const importGateInvalid = importGate.status === "invalid";

    if (!importGateAccepted) {
        const diagnostic = importGateInvalid
            ? bundledSceneBridgeModuleNamespaceImportDiagnostic(
                  "renderer_service_bundled_scene_bridge_module_namespace_import_gate_invalid",
                  "blocked",
                  "source.importGateOpen",
                  "The bundled scene bridge module namespace import preflight is blocked because the explicit import gate configuration is invalid.",
                  [
                      `Set ${BUNDLED_SCENE_BRIDGE_RUNTIME_ENV}=${BUNDLED_SCENE_BRIDGE_RUNTIME_EXPECTED_VALUE} or leave it unset.`,
                      "Resolve import gate conflicts before attempting module namespace import preflight.",
                  ]
              )
            : bundledSceneBridgeModuleNamespaceImportPreflightBase.diagnostics[0];
        return {
            ...bundledSceneBridgeModuleNamespaceImportPreflightBase,
            status: importGateInvalid ? "blocked" : "planned-disabled",
            diagnostics: [diagnostic],
            diagnosticCodes: [diagnostic.code],
            nextActions: diagnostic.nextActions,
        };
    }

    try {
        const namespace = await import("./bundled-scene-bridge-runtime.js");
        const exportName = bundledSceneBridgeModuleNamespaceImportPreflightBase.moduleImport.exportName;
        const factoryPresent = Object.prototype.hasOwnProperty.call(namespace, exportName);
        const factoryCallable = typeof namespace[exportName as keyof typeof namespace] === "function";
        const status = factoryPresent && factoryCallable ? "ready" : "invalid";
        const diagnostic = factoryPresent
            ? factoryCallable
                ? bundledSceneBridgeModuleNamespaceImportDiagnostic(
                      "renderer_service_bundled_scene_bridge_module_namespace_import_ready",
                      "info",
                      "factoryShape",
                      "The bundled scene bridge module namespace was imported and the expected factory export is callable.",
                      [
                          "Keep factory invocation disabled until runtime options, browser lifecycle, and pixel assertions are reviewed.",
                          "Proceed to the next gated task before registering the bundled scene bridge runtime.",
                      ]
                  )
                : bundledSceneBridgeModuleNamespaceImportDiagnostic(
                      "renderer_service_bundled_scene_bridge_module_namespace_export_not_callable",
                      "invalid",
                      "factoryShape.factoryCallable",
                      "The bundled scene bridge module namespace was imported, but the expected factory export is not callable.",
                      [
                          "Fix the service-owned bundled scene bridge module export shape.",
                          "Rerun renderer-service /health before enabling factory invocation.",
                      ]
                  )
            : bundledSceneBridgeModuleNamespaceImportDiagnostic(
                  "renderer_service_bundled_scene_bridge_module_namespace_export_missing",
                  "invalid",
                  "moduleImport.exportName",
                  "The bundled scene bridge module namespace was imported, but the expected factory export is missing.",
                  [
                      "Restore the service-owned bundled scene bridge module factory export.",
                      "Rerun renderer-service /health before enabling factory invocation.",
                  ]
              );

        return {
            ...bundledSceneBridgeModuleNamespaceImportPreflightBase,
            status,
            source: {
                ...bundledSceneBridgeModuleNamespaceImportPreflightBase.source,
                importGateOpen: true,
                readiness: status === "ready" ? "namespace-import-ready" : "namespace-import-invalid",
            },
            moduleImport: {
                ...bundledSceneBridgeModuleNamespaceImportPreflightBase.moduleImport,
                importAttempted: true,
                moduleImported: true,
                namespaceInspected: true,
                importSucceeded: true,
            },
            factoryShape: {
                ...bundledSceneBridgeModuleNamespaceImportPreflightBase.factoryShape,
                factoryPresent,
                callableChecked: true,
                factoryCallable,
            },
            diagnostics: [diagnostic],
            diagnosticCodes: [diagnostic.code],
            nextActions: diagnostic.nextActions,
            checks: [
                { id: "import-gate-open", status: "passed", required: true, dispatch: false },
                { id: "module-namespace-import", status: "passed", required: true, dispatch: false },
                { id: "module-namespace-export", status: factoryPresent ? "passed" : "failed", required: true, dispatch: false },
                { id: "factory-callable-shape", status: factoryCallable ? "passed" : "failed", required: true, dispatch: false },
                { id: "runtime-options-shape", status: "blocked", required: false, dispatch: false },
            ],
            sideEffects: {
                ...bundledSceneBridgeModuleNamespaceImportPreflightBase.sideEffects,
                runtimeAdapterImported: true,
            },
            execution: {
                attempted: true,
                succeeded: status === "ready",
                outcome: status,
                importGateAccepted: true,
                moduleImported: true,
                namespaceInspected: true,
                factoryPresent,
                factoryCallable,
                factoryInvoked: false,
                runtimeOptionsCreated: false,
                runtimeRegistration: false,
                valuesIncluded: false,
            },
        };
    } catch {
        const diagnostic = bundledSceneBridgeModuleNamespaceImportDiagnostic(
            "renderer_service_bundled_scene_bridge_module_namespace_import_failed",
            "invalid",
            "moduleImport",
            "The bundled scene bridge module namespace import failed before factory invocation.",
            [
                "Check that the renderer-service bundled scene bridge module is built with the service package.",
                "Rerun renderer-service /health after rebuilding renderer-service.",
            ]
        );
        return {
            ...bundledSceneBridgeModuleNamespaceImportPreflightBase,
            status: "invalid",
            source: {
                ...bundledSceneBridgeModuleNamespaceImportPreflightBase.source,
                importGateOpen: true,
                readiness: "namespace-import-invalid",
            },
            moduleImport: {
                ...bundledSceneBridgeModuleNamespaceImportPreflightBase.moduleImport,
                importAttempted: true,
            },
            diagnostics: [diagnostic],
            diagnosticCodes: [diagnostic.code],
            nextActions: diagnostic.nextActions,
            checks: [
                { id: "import-gate-open", status: "passed", required: true, dispatch: false },
                { id: "module-namespace-import", status: "failed", required: true, dispatch: false },
                { id: "module-namespace-export", status: "blocked", required: true, dispatch: false },
                { id: "factory-callable-shape", status: "blocked", required: true, dispatch: false },
                { id: "runtime-options-shape", status: "blocked", required: false, dispatch: false },
            ],
            execution: {
                attempted: true,
                succeeded: false,
                outcome: "import-failed",
                importGateAccepted: true,
                moduleImported: false,
                namespaceInspected: false,
                factoryPresent: false,
                factoryCallable: false,
                factoryInvoked: false,
                runtimeOptionsCreated: false,
                runtimeRegistration: false,
                valuesIncluded: false,
            },
        };
    }
}

const bundledSceneBridgeFactoryInvocationPreflightBase = {
    status: "planned-disabled",
    preflightVersion: "P26.38",
    owner: "renderer-service",
    mode: "guarded-factory-invocation-preflight",
    source: {
        contractVersion: "P26.32",
        adapterModuleReadinessVersion: "P26.33",
        importGateVersion: "P26.34",
        factoryShapePreflightVersion: "P26.35",
        moduleNamespaceImportPreflightVersion: "P26.36",
        namespaceImportReady: false,
        readiness: "blocked-until-namespace-import-ready",
    },
    guard: {
        namespaceImportRequired: true,
        explicitFutureInvocationGateRequired: true,
        invocationEnabled: false,
        invocationAttempted: false,
        factoryInvoked: false,
        runtimeOptionsCreated: false,
        runtimeRegistration: false,
        runtimeExecutionRegistered: false,
    },
    factoryInvocation: {
        exportName: "createBundledSceneBridgeRendererRuntime",
        expectedSignature: "(options) => Promise<RendererRuntimeOptions>",
        inertOptionsRequired: true,
        invocationAttempted: false,
        factoryInvoked: false,
        promiseAwaited: false,
        resultAccepted: false,
        valuesIncluded: false,
    },
    inertOptionsPlan: {
        requiredOptionKeys: ["assetManifest", "runtimeAssetPreflight", "browser"],
        assetManifestSource: "runtimeAssetManifest",
        runtimeAssetPreflightSource: "runtimeAssetMaterializationPreflight",
        browserSource: "inert-browser-handle-placeholder",
        optionValuesCreated: false,
        optionValuesIncluded: false,
        assetManifestValueIncluded: false,
        runtimeAssetPreflightValueIncluded: false,
        browserValueIncluded: false,
        browserProcessStarted: false,
        runtimeAssetsLoaded: false,
        assetManifestMaterialized: false,
    },
    runtimeOptionsShape: {
        expectedType: "RendererRuntimeOptions",
        requiredKeys: ["renderThumbnail"],
        optionalKeys: ["close"],
        runtimeOptionsCreated: false,
        shapeCheckAttempted: false,
        renderThumbnailChecked: false,
        closeHookChecked: false,
        runtimeRegistration: false,
        runtimeExecutionRegistered: false,
        valuesIncluded: false,
    },
    invocationOutcomeTaxonomy: [
        {
            code: "renderer_service_bundled_scene_bridge_factory_invocation_namespace_not_ready",
            stage: "namespace",
            severity: "blocked",
            retryable: false,
            dispatch: false,
        },
        {
            code: "renderer_service_bundled_scene_bridge_factory_invocation_disabled",
            stage: "guard",
            severity: "blocked",
            retryable: false,
            dispatch: false,
        },
        {
            code: "renderer_service_bundled_scene_bridge_factory_invocation_rejected",
            stage: "factory",
            severity: "invalid",
            retryable: true,
            dispatch: false,
        },
        {
            code: "renderer_service_bundled_scene_bridge_factory_invocation_result_invalid",
            stage: "runtime-options",
            severity: "invalid",
            retryable: false,
            dispatch: false,
        },
        {
            code: "renderer_service_bundled_scene_bridge_factory_invocation_ready",
            stage: "runtime-options",
            severity: "info",
            retryable: false,
            dispatch: false,
        },
    ],
    diagnostics: [
        {
            code: "renderer_service_bundled_scene_bridge_factory_invocation_namespace_not_ready",
            severity: "blocked",
            field: "source.namespaceImportReady",
            message: "The bundled scene bridge factory invocation preflight is blocked because module namespace import readiness has not been proven.",
            nextActions: [
                `Set ${BUNDLED_SCENE_BRIDGE_RUNTIME_ENV}=${BUNDLED_SCENE_BRIDGE_RUNTIME_EXPECTED_VALUE} and verify P26.36 namespace import readiness first.`,
                "Keep runtime registration, render dispatch, browser startup, asset loading, and value exposure disabled.",
            ],
        },
    ],
    diagnosticCodes: ["renderer_service_bundled_scene_bridge_factory_invocation_namespace_not_ready"],
    nextActions: [
        `Set ${BUNDLED_SCENE_BRIDGE_RUNTIME_ENV}=${BUNDLED_SCENE_BRIDGE_RUNTIME_EXPECTED_VALUE} and verify P26.36 namespace import readiness first.`,
        "Keep runtime registration, render dispatch, browser startup, asset loading, and value exposure disabled.",
    ],
    checks: [
        {
            id: "module-namespace-import-ready",
            status: "blocked",
            required: true,
            dispatch: false,
        },
        {
            id: "future-invocation-gate",
            status: "planned",
            required: true,
            dispatch: false,
        },
        {
            id: "inert-options-envelope",
            status: "planned",
            required: true,
            dispatch: false,
        },
        {
            id: "factory-invocation",
            status: "blocked",
            required: true,
            dispatch: false,
        },
        {
            id: "runtime-options-shape",
            status: "planned",
            required: true,
            dispatch: false,
        },
    ],
    sideEffects: {
        browserProcessStarted: false,
        browserPageCreated: false,
        runtimeExecutionRegistered: false,
        runtimeAdapterImported: false,
        runtimeFactoryInvoked: false,
        runtimeOptionsCreated: false,
        runtimeAssetsLoaded: false,
        assetManifestMaterialized: false,
        backendRpcReads: false,
        sourceDataReads: false,
        networkDispatch: false,
        dispatch: false,
        localFileWrites: false,
    },
    redaction: {
        moduleValuesIncluded: false,
        factoryValuesIncluded: false,
        runtimeOptionsValuesIncluded: false,
        optionValuesIncluded: false,
        pathValuesIncluded: false,
        sourceDataValuesIncluded: false,
        pageValuesIncluded: false,
        artifactValuesIncluded: false,
        mediaValuesIncluded: false,
        tokenValuesIncluded: false,
    },
    omitted: {
        moduleNamespace: true,
        factoryValue: true,
        runtimeOptionsValue: true,
        optionValues: true,
        workspaceRoot: true,
        cacheRoot: true,
        modulePath: true,
        publicPaths: true,
        cachePaths: true,
        sha256: true,
        playwrightBrowserPath: true,
        runtimeModulePath: true,
        sourceData: true,
        pageData: true,
        artifactBytes: true,
        mediaBytes: true,
        tokenValues: true,
    },
    execution: null,
} as const;

export const bundledSceneBridgeFactoryInvocationPreflight = bundledSceneBridgeFactoryInvocationPreflightBase;

type BundledSceneBridgeFactory = (options: unknown) => unknown | Promise<unknown>;

function bundledSceneBridgeFactoryInvocationDiagnostic(
    code: string,
    severity: "info" | "blocked" | "invalid",
    field: string,
    message: string,
    nextActions: string[]
) {
    return {
        code,
        severity,
        field,
        message,
        nextActions,
    };
}

function createBundledSceneBridgeInertOptions(): Record<string, unknown> {
    const disabledBrowserOperation = () => {
        const error = new Error("Bundled scene bridge preflight inert browser handle cannot start a browser.");
        Object.assign(error, { code: "renderer_service_bundled_scene_bridge_inert_browser_handle" });
        throw error;
    };

    return Object.freeze({
        assetManifest: Object.freeze({
            kind: "redacted-runtime-asset-manifest-handle",
            valuesIncluded: false,
        }),
        runtimeAssetPreflight: Object.freeze({
            kind: "redacted-runtime-asset-preflight-handle",
            valuesIncluded: false,
        }),
        browser: Object.freeze({
            kind: "inert-browser-handle",
            browserProcessStarted: false,
            browserPageCreated: false,
            valuesIncluded: false,
            launch: disabledBrowserOperation,
            newPage: disabledBrowserOperation,
        }),
        executionEnabled: false,
    });
}

async function bundledSceneBridgeFactoryInvocationPreflightResponse(
    moduleNamespaceImportPreflight: Record<string, unknown>
): Promise<Record<string, unknown>> {
    const namespaceReady =
        moduleNamespaceImportPreflight.status === "ready" &&
        isRecord(moduleNamespaceImportPreflight.factoryShape) &&
        moduleNamespaceImportPreflight.factoryShape.factoryCallable === true &&
        isRecord(moduleNamespaceImportPreflight.moduleImport) &&
        moduleNamespaceImportPreflight.moduleImport.importSucceeded === true;

    if (!namespaceReady) {
        return bundledSceneBridgeFactoryInvocationPreflightBase;
    }

    const readySource = {
        ...bundledSceneBridgeFactoryInvocationPreflightBase.source,
        namespaceImportReady: true,
        readiness: "ready-for-guarded-factory-invocation",
    };
    let runtimeAdapterImported = false;
    let optionValuesCreated = false;
    let factoryInvoked = false;

    try {
        const namespace = await import("./bundled-scene-bridge-runtime.js");
        runtimeAdapterImported = true;
        const exportName = bundledSceneBridgeFactoryInvocationPreflightBase.factoryInvocation.exportName;
        const factory = namespace[exportName as keyof typeof namespace];

        if (typeof factory !== "function") {
            const diagnostic = bundledSceneBridgeFactoryInvocationDiagnostic(
                "renderer_service_bundled_scene_bridge_factory_invocation_result_invalid",
                "invalid",
                "factoryInvocation.exportName",
                "The bundled scene bridge factory invocation preflight could not find a callable factory after namespace readiness.",
                [
                    "Restore the service-owned bundled scene bridge module factory export.",
                    "Rerun renderer-service /health before registering the bundled scene bridge runtime.",
                ]
            );
            return {
                ...bundledSceneBridgeFactoryInvocationPreflightBase,
                status: "invalid",
                source: readySource,
                guard: {
                    ...bundledSceneBridgeFactoryInvocationPreflightBase.guard,
                    invocationEnabled: true,
                    invocationAttempted: true,
                },
                diagnostics: [diagnostic],
                diagnosticCodes: [diagnostic.code],
                nextActions: diagnostic.nextActions,
                checks: [
                    { id: "module-namespace-import-ready", status: "passed", required: true, dispatch: false },
                    { id: "future-invocation-gate", status: "passed", required: true, dispatch: false },
                    { id: "inert-options-envelope", status: "blocked", required: true, dispatch: false },
                    { id: "factory-invocation", status: "failed", required: true, dispatch: false },
                    { id: "runtime-options-shape", status: "blocked", required: true, dispatch: false },
                ],
                sideEffects: {
                    ...bundledSceneBridgeFactoryInvocationPreflightBase.sideEffects,
                    runtimeAdapterImported,
                },
                execution: {
                    attempted: true,
                    succeeded: false,
                    outcome: "factory-not-callable",
                    namespaceImportReady: true,
                    moduleImported: runtimeAdapterImported,
                    factoryInvoked: false,
                    inertOptionsCreated: false,
                    runtimeOptionsCreated: false,
                    runtimeOptionsShapeValid: false,
                    runtimeRegistration: false,
                    renderDispatch: false,
                    browserProcessStarted: false,
                    runtimeAssetsLoaded: false,
                    assetManifestMaterialized: false,
                    valuesIncluded: false,
                },
            };
        }

        const inertOptions = createBundledSceneBridgeInertOptions();
        optionValuesCreated = true;
        factoryInvoked = true;
        const runtimeOptions = await (factory as BundledSceneBridgeFactory)(inertOptions);
        const runtimeOptionsRecord = isRecord(runtimeOptions);
        const renderThumbnailChecked = runtimeOptionsRecord;
        const closeHookChecked = runtimeOptionsRecord;
        const renderThumbnailCallable = runtimeOptionsRecord && typeof runtimeOptions.renderThumbnail === "function";
        const closeHookValid = runtimeOptionsRecord && (runtimeOptions.close === undefined || typeof runtimeOptions.close === "function");
        const runtimeOptionsValid = renderThumbnailCallable && closeHookValid;
        const diagnostic = runtimeOptionsValid
            ? bundledSceneBridgeFactoryInvocationDiagnostic(
                  "renderer_service_bundled_scene_bridge_factory_invocation_ready",
                  "info",
                  "runtimeOptionsShape",
                  "The bundled scene bridge factory invocation preflight created redacted runtime options with the expected callable shape.",
                  [
                      "Keep runtime registration and render dispatch disabled until browser lifecycle, asset loading, and pixel assertions are reviewed.",
                      "Proceed to the next gated task before registering the bundled scene bridge runtime.",
                  ]
              )
            : bundledSceneBridgeFactoryInvocationDiagnostic(
                  "renderer_service_bundled_scene_bridge_factory_invocation_result_invalid",
                  "invalid",
                  "runtimeOptionsShape",
                  "The bundled scene bridge factory invocation preflight returned runtime options without the expected callable shape.",
                  [
                      "Fix the service-owned bundled scene bridge factory result shape.",
                      "Rerun renderer-service /health before registering the bundled scene bridge runtime.",
                  ]
              );

        return {
            ...bundledSceneBridgeFactoryInvocationPreflightBase,
            status: runtimeOptionsValid ? "ready" : "invalid",
            source: readySource,
            guard: {
                ...bundledSceneBridgeFactoryInvocationPreflightBase.guard,
                invocationEnabled: true,
                invocationAttempted: true,
                factoryInvoked: true,
                runtimeOptionsCreated: runtimeOptionsRecord,
            },
            factoryInvocation: {
                ...bundledSceneBridgeFactoryInvocationPreflightBase.factoryInvocation,
                invocationAttempted: true,
                factoryInvoked: true,
                promiseAwaited: true,
                resultAccepted: runtimeOptionsValid,
            },
            inertOptionsPlan: {
                ...bundledSceneBridgeFactoryInvocationPreflightBase.inertOptionsPlan,
                optionValuesCreated: true,
            },
            runtimeOptionsShape: {
                ...bundledSceneBridgeFactoryInvocationPreflightBase.runtimeOptionsShape,
                runtimeOptionsCreated: runtimeOptionsRecord,
                shapeCheckAttempted: true,
                renderThumbnailChecked,
                closeHookChecked,
            },
            diagnostics: [diagnostic],
            diagnosticCodes: [diagnostic.code],
            nextActions: diagnostic.nextActions,
            checks: [
                { id: "module-namespace-import-ready", status: "passed", required: true, dispatch: false },
                { id: "future-invocation-gate", status: "passed", required: true, dispatch: false },
                { id: "inert-options-envelope", status: "passed", required: true, dispatch: false },
                { id: "factory-invocation", status: "passed", required: true, dispatch: false },
                { id: "runtime-options-shape", status: runtimeOptionsValid ? "passed" : "failed", required: true, dispatch: false },
            ],
            sideEffects: {
                ...bundledSceneBridgeFactoryInvocationPreflightBase.sideEffects,
                runtimeAdapterImported,
                runtimeFactoryInvoked: true,
                runtimeOptionsCreated: runtimeOptionsRecord,
            },
            execution: {
                attempted: true,
                succeeded: runtimeOptionsValid,
                outcome: runtimeOptionsValid ? "ready" : "result-invalid",
                namespaceImportReady: true,
                moduleImported: runtimeAdapterImported,
                factoryInvoked: true,
                inertOptionsCreated: true,
                runtimeOptionsCreated: runtimeOptionsRecord,
                runtimeOptionsShapeValid: runtimeOptionsValid,
                runtimeRegistration: false,
                renderDispatch: false,
                browserProcessStarted: false,
                runtimeAssetsLoaded: false,
                assetManifestMaterialized: false,
                valuesIncluded: false,
            },
        };
    } catch {
        const diagnostic = bundledSceneBridgeFactoryInvocationDiagnostic(
            "renderer_service_bundled_scene_bridge_factory_invocation_rejected",
            "invalid",
            "factoryInvocation",
            "The bundled scene bridge factory invocation preflight rejected while using inert redacted options.",
            [
                "Fix the service-owned bundled scene bridge factory so it accepts the inert preflight option envelope.",
                "Rerun renderer-service /health before registering the bundled scene bridge runtime.",
            ]
        );
        return {
            ...bundledSceneBridgeFactoryInvocationPreflightBase,
            status: "invalid",
            source: readySource,
            guard: {
                ...bundledSceneBridgeFactoryInvocationPreflightBase.guard,
                invocationEnabled: true,
                invocationAttempted: true,
                factoryInvoked,
            },
            factoryInvocation: {
                ...bundledSceneBridgeFactoryInvocationPreflightBase.factoryInvocation,
                invocationAttempted: factoryInvoked,
                factoryInvoked,
                promiseAwaited: factoryInvoked,
            },
            inertOptionsPlan: {
                ...bundledSceneBridgeFactoryInvocationPreflightBase.inertOptionsPlan,
                optionValuesCreated,
            },
            diagnostics: [diagnostic],
            diagnosticCodes: [diagnostic.code],
            nextActions: diagnostic.nextActions,
            checks: [
                { id: "module-namespace-import-ready", status: "passed", required: true, dispatch: false },
                { id: "future-invocation-gate", status: "passed", required: true, dispatch: false },
                { id: "inert-options-envelope", status: optionValuesCreated ? "passed" : "failed", required: true, dispatch: false },
                { id: "factory-invocation", status: "failed", required: true, dispatch: false },
                { id: "runtime-options-shape", status: "blocked", required: true, dispatch: false },
            ],
            sideEffects: {
                ...bundledSceneBridgeFactoryInvocationPreflightBase.sideEffects,
                runtimeAdapterImported,
                runtimeFactoryInvoked: factoryInvoked,
            },
            execution: {
                attempted: true,
                succeeded: false,
                outcome: "factory-rejected",
                namespaceImportReady: true,
                moduleImported: runtimeAdapterImported,
                factoryInvoked,
                inertOptionsCreated: optionValuesCreated,
                runtimeOptionsCreated: false,
                runtimeOptionsShapeValid: false,
                runtimeRegistration: false,
                renderDispatch: false,
                browserProcessStarted: false,
                runtimeAssetsLoaded: false,
                assetManifestMaterialized: false,
                valuesIncluded: false,
            },
        };
    }
}

const bundledSceneBridgeRuntimeRegistrationPreflightBase = {
    status: "planned-disabled",
    preflightVersion: "P26.40",
    owner: "renderer-service",
    mode: "guarded-runtime-registration-preflight",
    source: {
        contractVersion: "P26.32",
        adapterModuleReadinessVersion: "P26.33",
        importGateVersion: "P26.34",
        factoryShapePreflightVersion: "P26.35",
        moduleNamespaceImportPreflightVersion: "P26.36",
        factoryInvocationPreflightVersion: "P26.38",
        registrationPreflightGateVersion: "P26.40",
        factoryInvocationReady: false,
        factoryInvocationExecuted: false,
        runtimeOptionsShapeReady: false,
        registrationPreflightGateOpen: false,
        readiness: "blocked-until-factory-invocation-ready",
    },
    guard: {
        factoryInvocationReadyRequired: true,
        explicitFutureRegistrationGateRequired: true,
        explicitRegistrationPreflightGateRequired: true,
        registrationPreflightGateOpen: false,
        registrationEnabled: false,
        registrationAttempted: false,
        runtimeRegistered: false,
        runtimeRegistration: false,
        runtimeExecutionRegistered: false,
        renderDispatch: false,
    },
    registrationContract: {
        runtimeId: "bundled-scene-bridge",
        targetRegistry: "renderer-service.thumbnail-runtime-registry",
        requiredRuntimeOptionKeys: ["renderThumbnail"],
        optionalRuntimeOptionKeys: ["close"],
        requiredRegistrationInputs: ["runtimeId", "runtimeOptions", "lifecycleOwner"],
        duplicateRegistrationPolicy: "reject-until-explicit-replace-policy",
        renderDispatchEnabledAfterRegistration: false,
        valuesIncluded: false,
    },
    lifecycleCleanup: {
        lifecycleOwner: "renderer-service",
        closeHookPolicy: "register-close-if-present-call-on-unregister",
        closeHookRequired: false,
        cleanupOnRegistrationFailure: true,
        cleanupOnServiceStop: true,
        closeHookRegistered: false,
        closeAttempted: false,
        closeSucceeded: false,
        closeFailed: false,
        browserProcessStarted: false,
        browserPageCreated: false,
        runtimeAssetsLoaded: false,
        localFileWrites: false,
        valuesIncluded: false,
    },
    registrationOutcomeTaxonomy: [
        {
            code: "renderer_service_bundled_scene_bridge_runtime_registration_factory_not_ready",
            stage: "factory-invocation",
            severity: "blocked",
            retryable: false,
            dispatch: false,
        },
        {
            code: "renderer_service_bundled_scene_bridge_runtime_registration_disabled",
            stage: "registration-preflight-gate",
            severity: "blocked",
            retryable: false,
            dispatch: false,
        },
        {
            code: "renderer_service_bundled_scene_bridge_runtime_registration_runtime_options_invalid",
            stage: "runtime-options",
            severity: "invalid",
            retryable: false,
            dispatch: false,
        },
        {
            code: "renderer_service_bundled_scene_bridge_runtime_registration_lifecycle_cleanup_invalid",
            stage: "lifecycle-cleanup",
            severity: "invalid",
            retryable: false,
            dispatch: false,
        },
        {
            code: "renderer_service_bundled_scene_bridge_runtime_registration_ready",
            stage: "registration-preflight-plan",
            severity: "info",
            retryable: false,
            dispatch: false,
        },
    ],
    diagnostics: [
        {
            code: "renderer_service_bundled_scene_bridge_runtime_registration_factory_not_ready",
            severity: "blocked",
            field: "source.factoryInvocationReady",
            message: "The bundled scene bridge runtime registration preflight is blocked until the P26.38 factory invocation preflight reports ready runtime options.",
            nextActions: [
                "Verify renderer-service /health bundledSceneBridgeFactoryInvocationPreflight reports ready before planning runtime registration.",
                "Keep runtime registration, render dispatch, browser startup, asset loading, and value exposure disabled.",
            ],
        },
    ],
    diagnosticCodes: ["renderer_service_bundled_scene_bridge_runtime_registration_factory_not_ready"],
    nextActions: [
        "Verify renderer-service /health bundledSceneBridgeFactoryInvocationPreflight reports ready before planning runtime registration.",
        "Keep runtime registration, render dispatch, browser startup, asset loading, and value exposure disabled.",
    ],
    checks: [
        {
            id: "factory-invocation-ready",
            status: "blocked",
            required: true,
            dispatch: false,
        },
        {
            id: "runtime-options-registration-shape",
            status: "blocked",
            required: true,
            dispatch: false,
        },
        {
            id: "registration-preflight-gate",
            status: "blocked",
            required: true,
            dispatch: false,
        },
        {
            id: "lifecycle-cleanup-contract",
            status: "planned",
            required: true,
            dispatch: false,
        },
        {
            id: "registration-outcome-taxonomy",
            status: "planned",
            required: true,
            dispatch: false,
        },
    ],
    sideEffects: {
        runtimeRegistration: false,
        runtimeExecutionRegistered: false,
        renderDispatch: false,
        browserProcessStarted: false,
        browserPageCreated: false,
        runtimeAdapterImported: false,
        runtimeFactoryInvoked: false,
        runtimeOptionsCreated: false,
        runtimeAssetsLoaded: false,
        assetManifestMaterialized: false,
        backendRpcReads: false,
        sourceDataReads: false,
        networkDispatch: false,
        dispatch: false,
        localFileWrites: false,
    },
    redaction: {
        moduleValuesIncluded: false,
        factoryValuesIncluded: false,
        runtimeOptionsValuesIncluded: false,
        optionValuesIncluded: false,
        registryValuesIncluded: false,
        lifecycleValuesIncluded: false,
        pathValuesIncluded: false,
        sourceDataValuesIncluded: false,
        pageValuesIncluded: false,
        artifactValuesIncluded: false,
        mediaValuesIncluded: false,
        tokenValuesIncluded: false,
    },
    omitted: {
        moduleNamespace: true,
        factoryValue: true,
        runtimeOptionsValue: true,
        optionValues: true,
        registryValue: true,
        lifecycleHandles: true,
        workspaceRoot: true,
        cacheRoot: true,
        modulePath: true,
        publicPaths: true,
        cachePaths: true,
        sha256: true,
        playwrightBrowserPath: true,
        runtimeModulePath: true,
        sourceData: true,
        pageData: true,
        artifactBytes: true,
        mediaBytes: true,
        tokenValues: true,
    },
    execution: null,
} as const;

export const bundledSceneBridgeRuntimeRegistrationPreflight = bundledSceneBridgeRuntimeRegistrationPreflightBase;

function bundledSceneBridgeRuntimeRegistrationDiagnostic(
    code: string,
    severity: "info" | "blocked" | "invalid",
    field: string,
    message: string,
    nextActions: string[]
) {
    return {
        code,
        severity,
        field,
        message,
        nextActions,
    };
}

function bundledSceneBridgeRuntimeRegistrationPreflightResponse(
    importGate: Record<string, unknown>,
    factoryInvocationPreflight: Record<string, unknown>
): Record<string, unknown> {
    const importGateConfiguration = isRecord(importGate.configuration) ? importGate.configuration : {};
    const registrationPreflightGateOpen =
        importGate.status === "configured-disabled" && importGateConfiguration.registrationPreflightAccepted === true;
    const runtimeOptionsShape = isRecord(factoryInvocationPreflight.runtimeOptionsShape)
        ? factoryInvocationPreflight.runtimeOptionsShape
        : {};
    const execution = isRecord(factoryInvocationPreflight.execution) ? factoryInvocationPreflight.execution : {};
    const factoryReady =
        factoryInvocationPreflight.status === "ready" &&
        factoryInvocationPreflight.preflightVersion === "P26.38" &&
        execution.attempted === true &&
        execution.succeeded === true &&
        execution.outcome === "ready" &&
        execution.runtimeOptionsShapeValid === true &&
        execution.runtimeRegistration === false &&
        execution.renderDispatch === false &&
        runtimeOptionsShape.runtimeOptionsCreated === true &&
        runtimeOptionsShape.shapeCheckAttempted === true &&
        runtimeOptionsShape.renderThumbnailChecked === true &&
        runtimeOptionsShape.runtimeRegistration === false &&
        runtimeOptionsShape.runtimeExecutionRegistered === false;

    if (!factoryReady) {
        return bundledSceneBridgeRuntimeRegistrationPreflightBase;
    }

    const source = {
        ...bundledSceneBridgeRuntimeRegistrationPreflightBase.source,
        factoryInvocationReady: true,
        factoryInvocationExecuted: true,
        runtimeOptionsShapeReady: true,
        registrationPreflightGateOpen,
        readiness: registrationPreflightGateOpen
            ? "runtime-registration-preflight-ready"
            : "blocked-until-registration-preflight-gate-opens",
    };

    const guard = {
        ...bundledSceneBridgeRuntimeRegistrationPreflightBase.guard,
        registrationPreflightGateOpen,
    };

    if (!registrationPreflightGateOpen) {
        const diagnostic = bundledSceneBridgeRuntimeRegistrationDiagnostic(
            "renderer_service_bundled_scene_bridge_runtime_registration_disabled",
            "blocked",
            "guard.registrationPreflightGateOpen",
            "The bundled scene bridge runtime registration preflight is blocked until PENPOT_RENDERER_SERVICE_BUNDLED_SCENE_BRIDGE_RUNTIME is set to registration-preflight.",
            [
                `Set ${BUNDLED_SCENE_BRIDGE_RUNTIME_ENV}=${BUNDLED_SCENE_BRIDGE_RUNTIME_REGISTRATION_PREFLIGHT_VALUE} only for the guarded P26.40 runtime registration preflight.`,
                "Keep render dispatch, browser startup, asset loading, backend/source-data reads, local writes, and value exposure disabled.",
            ]
        );

        return {
            ...bundledSceneBridgeRuntimeRegistrationPreflightBase,
            source,
            guard,
            diagnostics: [diagnostic],
            diagnosticCodes: [diagnostic.code],
            nextActions: diagnostic.nextActions,
            checks: [
                { id: "factory-invocation-ready", status: "passed", required: true, dispatch: false },
                { id: "runtime-options-registration-shape", status: "passed", required: true, dispatch: false },
                { id: "registration-preflight-gate", status: "blocked", required: true, dispatch: false },
                { id: "lifecycle-cleanup-contract", status: "planned", required: true, dispatch: false },
                { id: "registration-outcome-taxonomy", status: "planned", required: true, dispatch: false },
            ],
            execution: null,
        };
    }

    const diagnostic = bundledSceneBridgeRuntimeRegistrationDiagnostic(
        "renderer_service_bundled_scene_bridge_runtime_registration_ready",
        "info",
        "guard.registrationPreflightGateOpen",
        "The bundled scene bridge runtime registration preflight gate is open and the redacted factory invocation output is ready for the next reviewed registration task.",
        [
            "Proceed with the next reviewed task before registering any renderer runtime in the service registry.",
            "Keep render dispatch, browser startup, asset loading, backend/source-data reads, local writes, and value exposure disabled.",
        ]
    );

    return {
        ...bundledSceneBridgeRuntimeRegistrationPreflightBase,
        status: "ready",
        source,
        guard,
        diagnostics: [diagnostic],
        diagnosticCodes: [diagnostic.code],
        nextActions: diagnostic.nextActions,
        checks: [
            { id: "factory-invocation-ready", status: "passed", required: true, dispatch: false },
            { id: "runtime-options-registration-shape", status: "passed", required: true, dispatch: false },
            { id: "registration-preflight-gate", status: "passed", required: true, dispatch: false },
            { id: "lifecycle-cleanup-contract", status: "passed", required: true, dispatch: false },
            { id: "registration-outcome-taxonomy", status: "passed", required: true, dispatch: false },
        ],
        execution: null,
    };
}

const bundledSceneBridgeRuntimeRegistryRegistrationBoundaryBase = {
    status: "planned-disabled",
    boundaryVersion: "P26.41",
    owner: "renderer-service",
    mode: "no-dispatch-runtime-registry-registration-boundary",
    source: {
        contractVersion: "P26.32",
        runtimeRegistrationPreflightVersion: "P26.40",
        registryBoundaryVersion: "P26.41",
        runtimeRegistrationPreflightReady: false,
        runtimeRegistrationPreflightStatus: "planned-disabled",
        registrationPreflightGateOpen: false,
        readiness: "blocked-until-runtime-registration-preflight-ready",
    },
    guard: {
        runtimeRegistrationPreflightReadyRequired: true,
        explicitFutureRegistryRegistrationGateRequired: true,
        registryRegistrationEnabled: false,
        registryRegistrationAttempted: false,
        runtimeInstalled: false,
        runtimeRegistered: false,
        runtimeRegistration: false,
        runtimeExecutionRegistered: false,
        renderDispatch: false,
        browserProcessStarted: false,
        registryValuesIncluded: false,
    },
    registrySlot: {
        runtimeId: "bundled-scene-bridge",
        targetRegistry: "renderer-service.thumbnail-runtime-registry",
        slotOwner: "renderer-service",
        slotStatus: "planned-empty",
        runtimeInstalled: false,
        runtimeAvailableForDispatch: false,
        renderDispatchEnabled: false,
        valuesIncluded: false,
    },
    duplicateRegistrationPolicy: {
        duplicateRegistrationPolicy: "reject-until-explicit-replace-policy",
        replacementPolicy: "not-supported-until-reviewed",
        existingRuntimeLookup: false,
        existingRuntimeValuesIncluded: false,
        duplicateReplacementAttempted: false,
        valuesIncluded: false,
    },
    runtimeAvailability: {
        status: "metadata-only",
        runtimeId: "bundled-scene-bridge",
        runtimeInstalled: false,
        runtimeValueAvailable: false,
        runtimeAvailableForDispatch: false,
        renderDispatchEnabled: false,
        valuesIncluded: false,
    },
    lifecycleCleanup: {
        lifecycleOwner: "renderer-service",
        closeHookPolicy: "register-close-if-present-call-on-unregister",
        closeHookRequired: false,
        cleanupOnDuplicateRejected: true,
        cleanupOnRegistrationFailure: true,
        cleanupOnServiceStop: true,
        closeHookRegistered: false,
        closeAttempted: false,
        closeSucceeded: false,
        closeFailed: false,
        browserProcessStarted: false,
        browserPageCreated: false,
        runtimeAssetsLoaded: false,
        localFileWrites: false,
        valuesIncluded: false,
    },
    boundaryOutcomeTaxonomy: [
        {
            code: "renderer_service_bundled_scene_bridge_runtime_registry_registration_boundary_preflight_not_ready",
            stage: "runtime-registration-preflight",
            severity: "blocked",
            retryable: false,
            dispatch: false,
        },
        {
            code: "renderer_service_bundled_scene_bridge_runtime_registry_registration_boundary_planned",
            stage: "registry-boundary-plan",
            severity: "info",
            retryable: false,
            dispatch: false,
        },
        {
            code: "renderer_service_bundled_scene_bridge_runtime_registry_registration_duplicate_rejected",
            stage: "duplicate-registration-policy",
            severity: "blocked",
            retryable: false,
            dispatch: false,
        },
        {
            code: "renderer_service_bundled_scene_bridge_runtime_registry_registration_replacement_unsupported",
            stage: "replacement-policy",
            severity: "blocked",
            retryable: false,
            dispatch: false,
        },
        {
            code: "renderer_service_bundled_scene_bridge_runtime_registry_registration_cleanup_invalid",
            stage: "lifecycle-cleanup",
            severity: "invalid",
            retryable: false,
            dispatch: false,
        },
    ],
    diagnostics: [
        {
            code: "renderer_service_bundled_scene_bridge_runtime_registry_registration_boundary_preflight_not_ready",
            severity: "blocked",
            field: "source.runtimeRegistrationPreflightReady",
            message: "The bundled scene bridge runtime registry registration boundary is blocked until the P26.40 runtime registration preflight reports ready.",
            nextActions: [
                "Verify renderer-service /health bundledSceneBridgeRuntimeRegistrationPreflight reports ready before planning registry slot ownership.",
                "Keep runtime registration, registry installation, render dispatch, browser startup, asset loading, reads, writes, and value exposure disabled.",
            ],
        },
    ],
    diagnosticCodes: ["renderer_service_bundled_scene_bridge_runtime_registry_registration_boundary_preflight_not_ready"],
    nextActions: [
        "Verify renderer-service /health bundledSceneBridgeRuntimeRegistrationPreflight reports ready before planning registry slot ownership.",
        "Keep runtime registration, registry installation, render dispatch, browser startup, asset loading, reads, writes, and value exposure disabled.",
    ],
    checks: [
        { id: "runtime-registration-preflight-ready", status: "blocked", required: true, dispatch: false },
        { id: "registry-slot-plan", status: "planned", required: true, dispatch: false },
        { id: "duplicate-registration-policy", status: "planned", required: true, dispatch: false },
        { id: "lifecycle-cleanup-plan", status: "planned", required: true, dispatch: false },
        { id: "no-dispatch-runtime-availability", status: "planned", required: true, dispatch: false },
    ],
    sideEffects: {
        registryLookup: false,
        runtimeInstallation: false,
        runtimeRegistration: false,
        runtimeExecutionRegistered: false,
        renderDispatch: false,
        browserProcessStarted: false,
        browserPageCreated: false,
        runtimeAdapterImported: false,
        runtimeFactoryInvoked: false,
        runtimeOptionsCreated: false,
        runtimeAssetsLoaded: false,
        assetManifestMaterialized: false,
        backendRpcReads: false,
        sourceDataReads: false,
        networkDispatch: false,
        dispatch: false,
        localFileWrites: false,
    },
    redaction: {
        moduleValuesIncluded: false,
        factoryValuesIncluded: false,
        runtimeOptionsValuesIncluded: false,
        optionValuesIncluded: false,
        runtimeValuesIncluded: false,
        registryValuesIncluded: false,
        lifecycleValuesIncluded: false,
        pathValuesIncluded: false,
        sourceDataValuesIncluded: false,
        pageValuesIncluded: false,
        artifactValuesIncluded: false,
        mediaValuesIncluded: false,
        tokenValuesIncluded: false,
    },
    omitted: {
        moduleNamespace: true,
        factoryValue: true,
        runtimeOptionsValue: true,
        optionValues: true,
        runtimeValue: true,
        registryValue: true,
        lifecycleHandles: true,
        workspaceRoot: true,
        cacheRoot: true,
        modulePath: true,
        publicPaths: true,
        cachePaths: true,
        sha256: true,
        playwrightBrowserPath: true,
        runtimeModulePath: true,
        sourceData: true,
        pageData: true,
        artifactBytes: true,
        mediaBytes: true,
        tokenValues: true,
    },
    execution: null,
} as const;

export const bundledSceneBridgeRuntimeRegistryRegistrationBoundary = bundledSceneBridgeRuntimeRegistryRegistrationBoundaryBase;

function bundledSceneBridgeRuntimeRegistryRegistrationBoundaryDiagnostic(
    code: string,
    severity: "info" | "blocked" | "invalid",
    field: string,
    message: string,
    nextActions: string[]
) {
    return {
        code,
        severity,
        field,
        message,
        nextActions,
    };
}

function bundledSceneBridgeRuntimeRegistryRegistrationBoundaryResponse(
    runtimeRegistrationPreflight: Record<string, unknown>
): Record<string, unknown> {
    const source = isRecord(runtimeRegistrationPreflight.source) ? runtimeRegistrationPreflight.source : {};
    const guard = isRecord(runtimeRegistrationPreflight.guard) ? runtimeRegistrationPreflight.guard : {};
    const runtimeRegistrationPreflightReady =
        runtimeRegistrationPreflight.status === "ready" &&
        runtimeRegistrationPreflight.preflightVersion === "P26.40" &&
        source.readiness === "runtime-registration-preflight-ready" &&
        source.registrationPreflightGateOpen === true &&
        guard.runtimeRegistration === false &&
        guard.runtimeExecutionRegistered === false &&
        guard.renderDispatch === false;

    if (!runtimeRegistrationPreflightReady) {
        return bundledSceneBridgeRuntimeRegistryRegistrationBoundaryBase;
    }

    const diagnostic = bundledSceneBridgeRuntimeRegistryRegistrationBoundaryDiagnostic(
        "renderer_service_bundled_scene_bridge_runtime_registry_registration_boundary_planned",
        "info",
        "source.runtimeRegistrationPreflightReady",
        "The bundled scene bridge runtime registry registration boundary is planned after the P26.40 preflight, but no runtime value is installed or available for dispatch.",
        [
            "Proceed with a later reviewed task before installing any bundled scene bridge runtime value in the renderer-service registry.",
            "Keep registry lookup, runtime registration, render dispatch, browser startup, asset loading, reads, writes, and value exposure disabled.",
        ]
    );

    return {
        ...bundledSceneBridgeRuntimeRegistryRegistrationBoundaryBase,
        source: {
            ...bundledSceneBridgeRuntimeRegistryRegistrationBoundaryBase.source,
            runtimeRegistrationPreflightReady: true,
            runtimeRegistrationPreflightStatus: "ready",
            registrationPreflightGateOpen: true,
            readiness: "registry-registration-boundary-planned",
        },
        diagnostics: [diagnostic],
        diagnosticCodes: [diagnostic.code],
        nextActions: diagnostic.nextActions,
        checks: [
            { id: "runtime-registration-preflight-ready", status: "passed", required: true, dispatch: false },
            { id: "registry-slot-plan", status: "planned", required: true, dispatch: false },
            { id: "duplicate-registration-policy", status: "planned", required: true, dispatch: false },
            { id: "lifecycle-cleanup-plan", status: "planned", required: true, dispatch: false },
            { id: "no-dispatch-runtime-availability", status: "planned", required: true, dispatch: false },
        ],
        execution: null,
    };
}

const bundledSceneBridgeRuntimeRegistryInstallationContractBase = {
    status: "planned-disabled",
    contractVersion: "P26.42",
    owner: "renderer-service",
    mode: "guarded-runtime-registry-installation-contract",
    source: {
        runtimeRegistrationPreflightVersion: "P26.40",
        registryRegistrationBoundaryVersion: "P26.41",
        registryInstallationContractVersion: "P26.42",
        runtimeRegistrationPreflightReady: false,
        registryRegistrationBoundaryReady: false,
        registryRegistrationBoundaryStatus: "planned-disabled",
        registrySlotStatus: "planned-empty",
        readiness: "blocked-until-registry-registration-boundary-ready",
    },
    guard: {
        registryRegistrationBoundaryReadyRequired: true,
        explicitFutureInstallationGateRequired: true,
        runtimeInstallationEnabled: false,
        runtimeInstallationAttempted: false,
        runtimeInstalled: false,
        runtimeRegistered: false,
        runtimeRegistration: false,
        runtimeExecutionRegistered: false,
        renderDispatch: false,
        browserProcessStarted: false,
        runtimeValuesIncluded: false,
        registryValuesIncluded: false,
    },
    runtimeValueShape: {
        runtimeId: "bundled-scene-bridge",
        targetRegistry: "renderer-service.thumbnail-runtime-registry",
        requiredMethods: ["renderThumbnail"],
        optionalMethods: ["close"],
        requiredInstallationInputs: ["runtimeId", "runtimeValue", "lifecycleOwner"],
        runtimeValueCreated: false,
        runtimeValueInstalled: false,
        renderDispatchEnabledAfterInstallation: false,
        valuesIncluded: false,
    },
    closeHookOwnership: {
        lifecycleOwner: "renderer-service",
        closeHookOwner: "renderer-service",
        closeHookSource: "runtime.close",
        closeHookRequired: false,
        closeHookRegistered: false,
        closeAttempted: false,
        closeSucceeded: false,
        closeFailed: false,
        browserProcessStarted: false,
        browserPageCreated: false,
        runtimeAssetsLoaded: false,
        localFileWrites: false,
        valuesIncluded: false,
    },
    duplicateRollbackHandling: {
        duplicateDetectionRequired: true,
        duplicateRegistrationPolicy: "reject-until-explicit-replace-policy",
        replacementPolicy: "not-supported-until-reviewed",
        rollbackRequiredOnDuplicate: true,
        cleanupOnInstallationFailure: true,
        cleanupOnServiceStop: true,
        existingRuntimeLookup: false,
        existingRuntimeValuesIncluded: false,
        duplicateDetected: false,
        rollbackAttempted: false,
        rollbackSucceeded: false,
        rollbackFailed: false,
        valuesIncluded: false,
    },
    installationOutcomeTaxonomy: [
        {
            code: "renderer_service_bundled_scene_bridge_runtime_registry_installation_contract_boundary_not_ready",
            stage: "registry-registration-boundary",
            severity: "blocked",
            retryable: false,
            dispatch: false,
        },
        {
            code: "renderer_service_bundled_scene_bridge_runtime_registry_installation_contract_planned",
            stage: "installation-contract-plan",
            severity: "info",
            retryable: false,
            dispatch: false,
        },
        {
            code: "renderer_service_bundled_scene_bridge_runtime_registry_installation_runtime_value_invalid",
            stage: "runtime-value-shape",
            severity: "invalid",
            retryable: false,
            dispatch: false,
        },
        {
            code: "renderer_service_bundled_scene_bridge_runtime_registry_installation_close_hook_invalid",
            stage: "close-hook-ownership",
            severity: "invalid",
            retryable: false,
            dispatch: false,
        },
        {
            code: "renderer_service_bundled_scene_bridge_runtime_registry_installation_duplicate_rollback_invalid",
            stage: "duplicate-rollback-handling",
            severity: "invalid",
            retryable: false,
            dispatch: false,
        },
    ],
    diagnostics: [
        {
            code: "renderer_service_bundled_scene_bridge_runtime_registry_installation_contract_boundary_not_ready",
            severity: "blocked",
            field: "source.registryRegistrationBoundaryReady",
            message: "The bundled scene bridge runtime registry installation contract is blocked until the P26.41 registry registration boundary is planned and still empty.",
            nextActions: [
                "Verify renderer-service /health bundledSceneBridgeRuntimeRegistryRegistrationBoundary reports the planned empty registry slot before defining installation gates.",
                "Keep runtime installation, runtime registration, render dispatch, browser startup, asset loading, reads, writes, and value exposure disabled.",
            ],
        },
    ],
    diagnosticCodes: ["renderer_service_bundled_scene_bridge_runtime_registry_installation_contract_boundary_not_ready"],
    nextActions: [
        "Verify renderer-service /health bundledSceneBridgeRuntimeRegistryRegistrationBoundary reports the planned empty registry slot before defining installation gates.",
        "Keep runtime installation, runtime registration, render dispatch, browser startup, asset loading, reads, writes, and value exposure disabled.",
    ],
    checks: [
        { id: "registry-registration-boundary-ready", status: "blocked", required: true, dispatch: false },
        { id: "runtime-value-shape-contract", status: "planned", required: true, dispatch: false },
        { id: "close-hook-ownership-contract", status: "planned", required: true, dispatch: false },
        { id: "duplicate-rollback-handling", status: "planned", required: true, dispatch: false },
        { id: "invalid-installation-diagnostics", status: "planned", required: true, dispatch: false },
    ],
    sideEffects: {
        registryLookup: false,
        runtimeValueCreation: false,
        runtimeInstallation: false,
        runtimeRegistration: false,
        runtimeExecutionRegistered: false,
        closeHookRegistration: false,
        duplicateRollback: false,
        renderDispatch: false,
        browserProcessStarted: false,
        browserPageCreated: false,
        runtimeAdapterImported: false,
        runtimeFactoryInvoked: false,
        runtimeOptionsCreated: false,
        runtimeAssetsLoaded: false,
        assetManifestMaterialized: false,
        backendRpcReads: false,
        sourceDataReads: false,
        networkDispatch: false,
        dispatch: false,
        localFileWrites: false,
    },
    redaction: {
        moduleValuesIncluded: false,
        factoryValuesIncluded: false,
        runtimeOptionsValuesIncluded: false,
        optionValuesIncluded: false,
        runtimeValuesIncluded: false,
        registryValuesIncluded: false,
        lifecycleValuesIncluded: false,
        pathValuesIncluded: false,
        sourceDataValuesIncluded: false,
        pageValuesIncluded: false,
        artifactValuesIncluded: false,
        mediaValuesIncluded: false,
        tokenValuesIncluded: false,
    },
    omitted: {
        moduleNamespace: true,
        factoryValue: true,
        runtimeOptionsValue: true,
        optionValues: true,
        runtimeValue: true,
        registryValue: true,
        lifecycleHandles: true,
        workspaceRoot: true,
        cacheRoot: true,
        modulePath: true,
        publicPaths: true,
        cachePaths: true,
        sha256: true,
        playwrightBrowserPath: true,
        runtimeModulePath: true,
        sourceData: true,
        pageData: true,
        artifactBytes: true,
        mediaBytes: true,
        tokenValues: true,
    },
    execution: null,
} as const;

export const bundledSceneBridgeRuntimeRegistryInstallationContract = bundledSceneBridgeRuntimeRegistryInstallationContractBase;

function bundledSceneBridgeRuntimeRegistryInstallationContractDiagnostic(
    code: string,
    severity: "info" | "blocked" | "invalid",
    field: string,
    message: string,
    nextActions: string[]
) {
    return {
        code,
        severity,
        field,
        message,
        nextActions,
    };
}

function bundledSceneBridgeRuntimeRegistryInstallationContractResponse(
    registryRegistrationBoundary: Record<string, unknown>
): Record<string, unknown> {
    const source = isRecord(registryRegistrationBoundary.source) ? registryRegistrationBoundary.source : {};
    const guard = isRecord(registryRegistrationBoundary.guard) ? registryRegistrationBoundary.guard : {};
    const registrySlot = isRecord(registryRegistrationBoundary.registrySlot) ? registryRegistrationBoundary.registrySlot : {};
    const runtimeAvailability = isRecord(registryRegistrationBoundary.runtimeAvailability)
        ? registryRegistrationBoundary.runtimeAvailability
        : {};
    const registryRegistrationBoundaryReady =
        registryRegistrationBoundary.status === "planned-disabled" &&
        registryRegistrationBoundary.boundaryVersion === "P26.41" &&
        source.runtimeRegistrationPreflightReady === true &&
        source.readiness === "registry-registration-boundary-planned" &&
        guard.runtimeInstalled === false &&
        guard.runtimeRegistered === false &&
        guard.runtimeRegistration === false &&
        guard.runtimeExecutionRegistered === false &&
        guard.renderDispatch === false &&
        registrySlot.runtimeInstalled === false &&
        registrySlot.slotStatus === "planned-empty" &&
        runtimeAvailability.runtimeInstalled === false &&
        runtimeAvailability.runtimeValueAvailable === false;

    if (!registryRegistrationBoundaryReady) {
        return bundledSceneBridgeRuntimeRegistryInstallationContractBase;
    }

    const diagnostic = bundledSceneBridgeRuntimeRegistryInstallationContractDiagnostic(
        "renderer_service_bundled_scene_bridge_runtime_registry_installation_contract_planned",
        "info",
        "source.registryRegistrationBoundaryReady",
        "The bundled scene bridge runtime registry installation contract is planned after the P26.41 empty registry boundary, but no runtime value is installed.",
        [
            "Proceed with a later reviewed task before enabling any runtime installation gate or writing to the renderer-service registry.",
            "Keep runtime installation, runtime registration, render dispatch, browser startup, asset loading, reads, writes, and value exposure disabled.",
        ]
    );

    return {
        ...bundledSceneBridgeRuntimeRegistryInstallationContractBase,
        source: {
            ...bundledSceneBridgeRuntimeRegistryInstallationContractBase.source,
            runtimeRegistrationPreflightReady: true,
            registryRegistrationBoundaryReady: true,
            registryRegistrationBoundaryStatus: "planned-disabled",
            registrySlotStatus: "planned-empty",
            readiness: "runtime-registry-installation-contract-planned",
        },
        diagnostics: [diagnostic],
        diagnosticCodes: [diagnostic.code],
        nextActions: diagnostic.nextActions,
        checks: [
            { id: "registry-registration-boundary-ready", status: "passed", required: true, dispatch: false },
            { id: "runtime-value-shape-contract", status: "planned", required: true, dispatch: false },
            { id: "close-hook-ownership-contract", status: "planned", required: true, dispatch: false },
            { id: "duplicate-rollback-handling", status: "planned", required: true, dispatch: false },
            { id: "invalid-installation-diagnostics", status: "planned", required: true, dispatch: false },
        ],
        execution: null,
    };
}

const bundledSceneBridgeRuntimeRegistryInstallationGateBase = {
    status: "planned-disabled",
    gateVersion: "P26.43",
    owner: "renderer-service",
    mode: "guarded-runtime-registry-installation-gate",
    source: {
        runtimeRegistrationPreflightVersion: "P26.40",
        registryRegistrationBoundaryVersion: "P26.41",
        registryInstallationContractVersion: "P26.42",
        registryInstallationGateVersion: "P26.43",
        runtimeRegistrationPreflightReady: false,
        registryRegistrationBoundaryReady: false,
        registryInstallationContractReady: false,
        registryInstallationContractStatus: "planned-disabled",
        registryInstallationContractReadiness: "blocked-until-registry-registration-boundary-ready",
        readiness: "blocked-until-installation-contract-ready",
    },
    configuration: {
        env: BUNDLED_SCENE_BRIDGE_RUNTIME_INSTALLATION_GATE_ENV,
        configured: false,
        acceptedValue: BUNDLED_SCENE_BRIDGE_RUNTIME_INSTALLATION_GATE_REVIEWED_VALUE,
        accepted: false,
        valid: true,
        valueRead: false,
        valuesIncluded: false,
    },
    gate: {
        registryInstallationContractReadyRequired: true,
        explicitReviewedGateRequired: true,
        reviewedGateOpen: false,
        futureInstallationAttemptAllowed: false,
        runtimeInstallationEnabled: false,
        runtimeInstallationAttempted: false,
        runtimeInstalled: false,
        runtimeRegistered: false,
        runtimeRegistration: false,
        runtimeExecutionRegistered: false,
        renderDispatch: false,
        browserProcessStarted: false,
        runtimeValuesIncluded: false,
        registryValuesIncluded: false,
    },
    refusalDiagnostics: {
        refusalRequired: true,
        refusalReason: "installation-contract-not-ready",
        invalidGateValue: false,
        registryWriteRefused: true,
        runtimeValueCreationRefused: true,
        runtimeInstallationRefused: true,
        renderDispatchRefused: true,
        valuesIncluded: false,
    },
    rollbackPreconditions: {
        duplicateDetectionRequired: true,
        duplicateRegistrationPolicy: "reject-until-explicit-replace-policy",
        replacementPolicy: "not-supported-until-reviewed",
        rollbackRequiredOnDuplicate: true,
        cleanupOnInstallationFailure: true,
        cleanupOnServiceStop: true,
        closeHookCleanupRequired: true,
        rollbackPrepared: false,
        rollbackAttempted: false,
        cleanupAttempted: false,
        valuesIncluded: false,
    },
    lifecycleOwnership: {
        lifecycleOwner: "renderer-service",
        registryOwner: "renderer-service",
        closeHookOwner: "renderer-service",
        runtimeId: "bundled-scene-bridge",
        targetRegistry: "renderer-service.thumbnail-runtime-registry",
        lifecycleScope: "thumbnail-runtime-registry",
        noDispatchLifecycle: true,
        closeHookRegistered: false,
        runtimeValueOwned: false,
        registrySlotOwned: false,
        valuesIncluded: false,
    },
    gateOutcomeTaxonomy: [
        {
            code: "renderer_service_bundled_scene_bridge_runtime_registry_installation_gate_contract_not_ready",
            stage: "installation-contract-readiness",
            severity: "blocked",
            retryable: false,
            dispatch: false,
        },
        {
            code: "renderer_service_bundled_scene_bridge_runtime_registry_installation_gate_not_configured",
            stage: "installation-gate-configuration",
            severity: "blocked",
            retryable: false,
            dispatch: false,
        },
        {
            code: "renderer_service_bundled_scene_bridge_runtime_registry_installation_gate_configuration_invalid",
            stage: "installation-gate-configuration",
            severity: "invalid",
            retryable: false,
            dispatch: false,
        },
        {
            code: "renderer_service_bundled_scene_bridge_runtime_registry_installation_gate_reviewed_disabled",
            stage: "reviewed-installation-gate",
            severity: "info",
            retryable: false,
            dispatch: false,
        },
        {
            code: "renderer_service_bundled_scene_bridge_runtime_registry_installation_gate_rollback_preconditions_invalid",
            stage: "rollback-preconditions",
            severity: "invalid",
            retryable: false,
            dispatch: false,
        },
    ],
    diagnostics: [
        {
            code: "renderer_service_bundled_scene_bridge_runtime_registry_installation_gate_contract_not_ready",
            severity: "blocked",
            field: "source.registryInstallationContractReady",
            env: BUNDLED_SCENE_BRIDGE_RUNTIME_INSTALLATION_GATE_ENV,
            valueRead: false,
            valuesIncluded: false,
            message: "The bundled scene bridge runtime registry installation gate is blocked until the P26.42 installation contract is planned and safe.",
            nextActions: [
                "Verify renderer-service /health bundledSceneBridgeRuntimeRegistryInstallationContract reports runtime-registry-installation-contract-planned before reviewing the installation gate.",
                "Keep registry writes, runtime installation, runtime registration, render dispatch, browser startup, asset loading, reads, writes, and value exposure disabled.",
            ],
        },
    ],
    diagnosticCodes: ["renderer_service_bundled_scene_bridge_runtime_registry_installation_gate_contract_not_ready"],
    nextActions: [
        "Verify renderer-service /health bundledSceneBridgeRuntimeRegistryInstallationContract reports runtime-registry-installation-contract-planned before reviewing the installation gate.",
        "Keep registry writes, runtime installation, runtime registration, render dispatch, browser startup, asset loading, reads, writes, and value exposure disabled.",
    ],
    checks: [
        { id: "installation-contract-ready", status: "blocked", required: true, dispatch: false },
        { id: "explicit-installation-gate-reviewed", status: "blocked", required: true, dispatch: false },
        { id: "rollback-preconditions-planned", status: "planned", required: true, dispatch: false },
        { id: "no-dispatch-lifecycle-owned", status: "planned", required: true, dispatch: false },
        { id: "refusal-diagnostics-planned", status: "planned", required: true, dispatch: false },
    ],
    sideEffects: {
        registryLookup: false,
        registryWrite: false,
        runtimeValueCreation: false,
        runtimeInstallation: false,
        runtimeRegistration: false,
        runtimeExecutionRegistered: false,
        closeHookRegistration: false,
        duplicateRollback: false,
        renderDispatch: false,
        browserProcessStarted: false,
        browserPageCreated: false,
        runtimeAdapterImported: false,
        runtimeFactoryInvoked: false,
        runtimeOptionsCreated: false,
        runtimeAssetsLoaded: false,
        assetManifestMaterialized: false,
        backendRpcReads: false,
        sourceDataReads: false,
        networkDispatch: false,
        dispatch: false,
        localFileWrites: false,
    },
    redaction: {
        modeValuesIncluded: false,
        moduleValuesIncluded: false,
        factoryValuesIncluded: false,
        runtimeOptionsValuesIncluded: false,
        optionValuesIncluded: false,
        runtimeValuesIncluded: false,
        registryValuesIncluded: false,
        lifecycleValuesIncluded: false,
        pathValuesIncluded: false,
        sourceDataValuesIncluded: false,
        pageValuesIncluded: false,
        artifactValuesIncluded: false,
        mediaValuesIncluded: false,
        tokenValuesIncluded: false,
    },
    omitted: {
        configuredValue: true,
        moduleNamespace: true,
        factoryValue: true,
        runtimeOptionsValue: true,
        optionValues: true,
        runtimeValue: true,
        registryValue: true,
        lifecycleHandles: true,
        workspaceRoot: true,
        cacheRoot: true,
        modulePath: true,
        publicPaths: true,
        cachePaths: true,
        sha256: true,
        playwrightBrowserPath: true,
        runtimeModulePath: true,
        sourceData: true,
        pageData: true,
        artifactBytes: true,
        mediaBytes: true,
        tokenValues: true,
    },
    execution: null,
} as const;

export const bundledSceneBridgeRuntimeRegistryInstallationGate = bundledSceneBridgeRuntimeRegistryInstallationGateBase;

const bundledSceneBridgeRuntimeRegistryInstallationPreflightBase = {
    status: "blocked",
    preflightVersion: "P26.44",
    owner: "renderer-service",
    mode: "guarded-runtime-registry-installation-preflight",
    source: {
        runtimeRegistrationPreflightVersion: "P26.40",
        registryRegistrationBoundaryVersion: "P26.41",
        registryInstallationContractVersion: "P26.42",
        registryInstallationGateVersion: "P26.43",
        registryInstallationPreflightVersion: "P26.44",
        registryInstallationGateReady: false,
        registryInstallationGateStatus: "planned-disabled",
        registryInstallationGateReadiness: "blocked-until-installation-contract-ready",
        reviewedGateOpen: false,
        futureInstallationAttemptAllowed: false,
        readiness: "blocked-until-reviewed-installation-gate",
    },
    preflight: {
        registryInstallationGateReadyRequired: true,
        reviewedGateOpenRequired: true,
        futureInstallationAttemptAllowedRequired: true,
        rollbackPreconditionsRequired: true,
        lifecycleOwnershipRequired: true,
        noDispatchRequired: true,
        installationAttemptAllowedInThisTask: false,
        readyForLaterInstallationTask: false,
        registryLookupAttempted: false,
        registryWriteAttempted: false,
        runtimeValueCreated: false,
        runtimeInstallationAttempted: false,
        runtimeInstalled: false,
        runtimeRegistered: false,
        runtimeRegistration: false,
        runtimeExecutionRegistered: false,
        closeHookRegistered: false,
        duplicateRollbackAttempted: false,
        renderDispatch: false,
        browserProcessStarted: false,
        runtimeValuesIncluded: false,
        registryValuesIncluded: false,
    },
    refusalDiagnostics: {
        refusalRequired: true,
        refusalReason: "installation-gate-not-ready",
        invalidGateMetadata: false,
        registryLookupRefused: true,
        registryWriteRefused: true,
        runtimeValueCreationRefused: true,
        runtimeInstallationRefused: true,
        closeHookRegistrationRefused: true,
        duplicateRollbackRefused: true,
        renderDispatchRefused: true,
        valuesIncluded: false,
    },
    rollbackPreconditions: {
        duplicateDetectionRequired: true,
        duplicateRegistrationPolicy: "reject-until-explicit-replace-policy",
        replacementPolicy: "not-supported-until-reviewed",
        rollbackRequiredOnDuplicate: true,
        cleanupOnInstallationFailure: true,
        cleanupOnServiceStop: true,
        closeHookCleanupRequired: true,
        preconditionsVerified: false,
        rollbackPrepared: false,
        rollbackAttempted: false,
        cleanupAttempted: false,
        valuesIncluded: false,
    },
    lifecycleOwnership: {
        lifecycleOwner: "renderer-service",
        registryOwner: "renderer-service",
        closeHookOwner: "renderer-service",
        runtimeId: "bundled-scene-bridge",
        targetRegistry: "renderer-service.thumbnail-runtime-registry",
        lifecycleScope: "thumbnail-runtime-registry",
        noDispatchLifecycle: true,
        lifecycleOwnershipVerified: false,
        closeHookRegistered: false,
        runtimeValueOwned: false,
        registrySlotOwned: false,
        valuesIncluded: false,
    },
    preflightOutcomeTaxonomy: [
        {
            code: "renderer_service_bundled_scene_bridge_runtime_registry_installation_preflight_gate_not_ready",
            stage: "installation-gate-readiness",
            severity: "blocked",
            retryable: false,
            dispatch: false,
        },
        {
            code: "renderer_service_bundled_scene_bridge_runtime_registry_installation_preflight_gate_invalid",
            stage: "installation-gate-readiness",
            severity: "invalid",
            retryable: false,
            dispatch: false,
        },
        {
            code: "renderer_service_bundled_scene_bridge_runtime_registry_installation_preflight_ready",
            stage: "installation-preflight-readiness",
            severity: "info",
            retryable: false,
            dispatch: false,
        },
        {
            code: "renderer_service_bundled_scene_bridge_runtime_registry_installation_preflight_unsafe_metadata",
            stage: "installation-preflight-metadata",
            severity: "invalid",
            retryable: false,
            dispatch: false,
        },
    ],
    diagnostics: [
        {
            code: "renderer_service_bundled_scene_bridge_runtime_registry_installation_preflight_gate_not_ready",
            severity: "blocked",
            field: "source.registryInstallationGateReady",
            env: BUNDLED_SCENE_BRIDGE_RUNTIME_INSTALLATION_GATE_ENV,
            valueRead: false,
            valuesIncluded: false,
            message: "The bundled scene bridge runtime registry installation preflight is blocked until the P26.43 reviewed gate is ready in renderer-service /health.",
            nextActions: [
                "Verify renderer-service /health bundledSceneBridgeRuntimeRegistryInstallationGate reports configured-disabled with the reviewed gate open before trusting the installation preflight.",
                "Keep registry lookup, registry writes, runtime value creation, runtime installation, close-hook registration, rollback, render dispatch, browser startup, reads, writes, and value exposure disabled.",
            ],
        },
    ],
    diagnosticCodes: ["renderer_service_bundled_scene_bridge_runtime_registry_installation_preflight_gate_not_ready"],
    nextActions: [
        "Verify renderer-service /health bundledSceneBridgeRuntimeRegistryInstallationGate reports configured-disabled with the reviewed gate open before trusting the installation preflight.",
        "Keep registry lookup, registry writes, runtime value creation, runtime installation, close-hook registration, rollback, render dispatch, browser startup, reads, writes, and value exposure disabled.",
    ],
    checks: [
        { id: "installation-gate-ready", status: "blocked", required: true, dispatch: false },
        { id: "reviewed-gate-open", status: "blocked", required: true, dispatch: false },
        { id: "future-installation-attempt-allowed", status: "blocked", required: true, dispatch: false },
        { id: "rollback-preconditions-verified", status: "blocked", required: true, dispatch: false },
        { id: "no-dispatch-lifecycle-owned", status: "blocked", required: true, dispatch: false },
        { id: "runtime-values-redacted", status: "passed", required: true, dispatch: false },
    ],
    sideEffects: {
        registryLookup: false,
        registryWrite: false,
        runtimeValueCreation: false,
        runtimeInstallation: false,
        runtimeRegistration: false,
        runtimeExecutionRegistered: false,
        closeHookRegistration: false,
        duplicateRollback: false,
        renderDispatch: false,
        browserProcessStarted: false,
        browserPageCreated: false,
        runtimeAdapterImported: false,
        runtimeFactoryInvoked: false,
        runtimeOptionsCreated: false,
        runtimeAssetsLoaded: false,
        assetManifestMaterialized: false,
        backendRpcReads: false,
        sourceDataReads: false,
        networkDispatch: false,
        dispatch: false,
        localFileWrites: false,
    },
    redaction: {
        modeValuesIncluded: false,
        moduleValuesIncluded: false,
        factoryValuesIncluded: false,
        runtimeOptionsValuesIncluded: false,
        optionValuesIncluded: false,
        runtimeValuesIncluded: false,
        registryValuesIncluded: false,
        lifecycleValuesIncluded: false,
        pathValuesIncluded: false,
        sourceDataValuesIncluded: false,
        pageValuesIncluded: false,
        artifactValuesIncluded: false,
        mediaValuesIncluded: false,
        tokenValuesIncluded: false,
    },
    omitted: {
        configuredValue: true,
        moduleNamespace: true,
        factoryValue: true,
        runtimeOptionsValue: true,
        optionValues: true,
        runtimeValue: true,
        registryValue: true,
        lifecycleHandles: true,
        workspaceRoot: true,
        cacheRoot: true,
        modulePath: true,
        publicPaths: true,
        cachePaths: true,
        sha256: true,
        playwrightBrowserPath: true,
        runtimeModulePath: true,
        sourceData: true,
        pageData: true,
        artifactBytes: true,
        mediaBytes: true,
        tokenValues: true,
    },
    execution: null,
} as const;

export const bundledSceneBridgeRuntimeRegistryInstallationPreflight =
    bundledSceneBridgeRuntimeRegistryInstallationPreflightBase;

const bundledSceneBridgeRuntimeRegistryInstallationExecutionBoundaryBase = {
    status: "blocked",
    boundaryVersion: "P26.45",
    owner: "renderer-service",
    mode: "guarded-runtime-registry-installation-execution-boundary",
    source: {
        runtimeRegistrationPreflightVersion: "P26.40",
        registryRegistrationBoundaryVersion: "P26.41",
        registryInstallationContractVersion: "P26.42",
        registryInstallationGateVersion: "P26.43",
        registryInstallationPreflightVersion: "P26.44",
        registryInstallationExecutionBoundaryVersion: "P26.45",
        registryInstallationPreflightReady: false,
        registryInstallationPreflightStatus: "blocked",
        registryInstallationPreflightReadiness: "blocked-until-reviewed-installation-gate",
        reviewedGateOpen: false,
        futureInstallationAttemptAllowed: false,
        readiness: "blocked-until-installation-preflight-ready",
    },
    executionBoundary: {
        registryInstallationPreflightReadyRequired: true,
        explicitExecutionReviewRequired: true,
        duplicateLookupRequired: true,
        runtimeValueCreationRequired: true,
        registryInstallationRequired: true,
        closeHookRegistrationRequired: true,
        rollbackHookRequired: true,
        noDispatchRequired: true,
        executionPlanReady: false,
        executionAttemptAllowedInThisTask: false,
        runtimeInstallationEnabled: false,
        registryLookupAttempted: false,
        registryWriteAttempted: false,
        runtimeValueCreated: false,
        runtimeInstallationAttempted: false,
        runtimeInstalled: false,
        runtimeRegistered: false,
        runtimeRegistration: false,
        runtimeExecutionRegistered: false,
        closeHookRegistered: false,
        duplicateRollbackAttempted: false,
        renderDispatch: false,
        browserProcessStarted: false,
        runtimeValuesIncluded: false,
        registryValuesIncluded: false,
    },
    runtimeValuePlan: {
        runtimeId: "bundled-scene-bridge",
        targetRegistry: "renderer-service.thumbnail-runtime-registry",
        requiredMethods: ["renderThumbnail"],
        optionalMethods: ["close"],
        requiredInstallationInputs: ["runtimeId", "runtimeValue", "lifecycleOwner", "closeHook"],
        runtimeValueCreationPlanned: true,
        runtimeValueCreated: false,
        runtimeValueInstalled: false,
        runtimeRegistered: false,
        runtimeExecutionRegistered: false,
        renderDispatchEnabledAfterInstallation: false,
        valuesIncluded: false,
    },
    duplicateHandling: {
        duplicateDetectionRequired: true,
        existingRuntimeLookupRequired: true,
        duplicateRegistrationPolicy: "reject-until-explicit-replace-policy",
        replacementPolicy: "not-supported-until-reviewed",
        rollbackRequiredOnDuplicate: true,
        rollbackHookRequired: true,
        cleanupOnInstallationFailure: true,
        cleanupOnServiceStop: true,
        existingRuntimeLookupAttempted: false,
        existingRuntimeFound: false,
        duplicateDetected: false,
        rollbackPrepared: false,
        rollbackAttempted: false,
        cleanupAttempted: false,
        valuesIncluded: false,
    },
    lifecycleOwnership: {
        lifecycleOwner: "renderer-service",
        registryOwner: "renderer-service",
        closeHookOwner: "renderer-service",
        rollbackOwner: "renderer-service",
        runtimeId: "bundled-scene-bridge",
        targetRegistry: "renderer-service.thumbnail-runtime-registry",
        lifecycleScope: "thumbnail-runtime-registry",
        noDispatchLifecycle: true,
        lifecycleOwnershipVerified: false,
        closeHookRegistered: false,
        rollbackHookRegistered: false,
        runtimeValueOwned: false,
        registrySlotOwned: false,
        valuesIncluded: false,
    },
    refusalDiagnostics: {
        refusalRequired: true,
        refusalReason: "installation-preflight-not-ready",
        invalidPreflightMetadata: false,
        registryLookupRefused: true,
        registryWriteRefused: true,
        runtimeValueCreationRefused: true,
        runtimeInstallationRefused: true,
        closeHookRegistrationRefused: true,
        duplicateRollbackRefused: true,
        renderDispatchRefused: true,
        valuesIncluded: false,
    },
    executionOutcomeTaxonomy: [
        {
            code: "renderer_service_bundled_scene_bridge_runtime_registry_installation_execution_boundary_preflight_not_ready",
            stage: "installation-preflight-readiness",
            severity: "blocked",
            retryable: false,
            dispatch: false,
        },
        {
            code: "renderer_service_bundled_scene_bridge_runtime_registry_installation_execution_boundary_preflight_invalid",
            stage: "installation-preflight-readiness",
            severity: "invalid",
            retryable: false,
            dispatch: false,
        },
        {
            code: "renderer_service_bundled_scene_bridge_runtime_registry_installation_execution_boundary_planned",
            stage: "installation-execution-boundary",
            severity: "info",
            retryable: false,
            dispatch: false,
        },
        {
            code: "renderer_service_bundled_scene_bridge_runtime_registry_installation_execution_boundary_unsafe_metadata",
            stage: "installation-execution-boundary-metadata",
            severity: "invalid",
            retryable: false,
            dispatch: false,
        },
    ],
    diagnostics: [
        {
            code: "renderer_service_bundled_scene_bridge_runtime_registry_installation_execution_boundary_preflight_not_ready",
            severity: "blocked",
            field: "source.registryInstallationPreflightReady",
            env: BUNDLED_SCENE_BRIDGE_RUNTIME_INSTALLATION_GATE_ENV,
            valueRead: false,
            valuesIncluded: false,
            message: "The bundled scene bridge runtime registry installation execution boundary is blocked until the P26.44 installation preflight is ready.",
            nextActions: [
                "Verify renderer-service /health bundledSceneBridgeRuntimeRegistryInstallationPreflight reports installation-preflight-ready before planning installation execution.",
                "Keep registry lookup, registry writes, runtime value creation, runtime installation, close-hook registration, rollback, render dispatch, browser startup, reads, writes, and value exposure disabled.",
            ],
        },
    ],
    diagnosticCodes: [
        "renderer_service_bundled_scene_bridge_runtime_registry_installation_execution_boundary_preflight_not_ready",
    ],
    nextActions: [
        "Verify renderer-service /health bundledSceneBridgeRuntimeRegistryInstallationPreflight reports installation-preflight-ready before planning installation execution.",
        "Keep registry lookup, registry writes, runtime value creation, runtime installation, close-hook registration, rollback, render dispatch, browser startup, reads, writes, and value exposure disabled.",
    ],
    checks: [
        { id: "installation-preflight-ready", status: "blocked", required: true, dispatch: false },
        { id: "runtime-value-creation-boundary", status: "planned", required: true, dispatch: false },
        { id: "registry-installation-boundary", status: "planned", required: true, dispatch: false },
        { id: "close-hook-registration-boundary", status: "planned", required: true, dispatch: false },
        { id: "duplicate-rollback-boundary", status: "planned", required: true, dispatch: false },
        { id: "runtime-values-redacted", status: "passed", required: true, dispatch: false },
    ],
    sideEffects: {
        registryLookup: false,
        registryWrite: false,
        runtimeValueCreation: false,
        runtimeInstallation: false,
        runtimeRegistration: false,
        runtimeExecutionRegistered: false,
        closeHookRegistration: false,
        duplicateRollback: false,
        renderDispatch: false,
        browserProcessStarted: false,
        browserPageCreated: false,
        runtimeAdapterImported: false,
        runtimeFactoryInvoked: false,
        runtimeOptionsCreated: false,
        runtimeAssetsLoaded: false,
        assetManifestMaterialized: false,
        backendRpcReads: false,
        sourceDataReads: false,
        networkDispatch: false,
        dispatch: false,
        localFileWrites: false,
    },
    redaction: {
        modeValuesIncluded: false,
        moduleValuesIncluded: false,
        factoryValuesIncluded: false,
        runtimeOptionsValuesIncluded: false,
        optionValuesIncluded: false,
        runtimeValuesIncluded: false,
        registryValuesIncluded: false,
        lifecycleValuesIncluded: false,
        pathValuesIncluded: false,
        sourceDataValuesIncluded: false,
        pageValuesIncluded: false,
        artifactValuesIncluded: false,
        mediaValuesIncluded: false,
        tokenValuesIncluded: false,
    },
    omitted: {
        configuredValue: true,
        moduleNamespace: true,
        factoryValue: true,
        runtimeOptionsValue: true,
        optionValues: true,
        runtimeValue: true,
        registryValue: true,
        lifecycleHandles: true,
        workspaceRoot: true,
        cacheRoot: true,
        modulePath: true,
        publicPaths: true,
        cachePaths: true,
        sha256: true,
        playwrightBrowserPath: true,
        runtimeModulePath: true,
        sourceData: true,
        pageData: true,
        artifactBytes: true,
        mediaBytes: true,
        tokenValues: true,
    },
    execution: null,
} as const;

export const bundledSceneBridgeRuntimeRegistryInstallationExecutionBoundary =
    bundledSceneBridgeRuntimeRegistryInstallationExecutionBoundaryBase;

function bundledSceneBridgeRuntimeRegistryInstallationGateDiagnostic(
    code: string,
    severity: "info" | "blocked" | "invalid",
    field: string,
    message: string,
    nextActions: string[]
) {
    return {
        code,
        severity,
        field,
        env: BUNDLED_SCENE_BRIDGE_RUNTIME_INSTALLATION_GATE_ENV,
        valueRead: false,
        valuesIncluded: false,
        message,
        nextActions,
    };
}

function bundledSceneBridgeRuntimeRegistryInstallationGateResponse(
    registryInstallationContract: Record<string, unknown>,
    options: Pick<RendererServiceOptions, "bundledSceneBridgeRuntimeRegistryInstallationGate"> = {}
): Record<string, unknown> {
    const source = isRecord(registryInstallationContract.source) ? registryInstallationContract.source : {};
    const guard = isRecord(registryInstallationContract.guard) ? registryInstallationContract.guard : {};
    const runtimeValueShape = isRecord(registryInstallationContract.runtimeValueShape)
        ? registryInstallationContract.runtimeValueShape
        : {};
    const closeHookOwnership = isRecord(registryInstallationContract.closeHookOwnership)
        ? registryInstallationContract.closeHookOwnership
        : {};
    const duplicateRollbackHandling = isRecord(registryInstallationContract.duplicateRollbackHandling)
        ? registryInstallationContract.duplicateRollbackHandling
        : {};
    const contractReady =
        registryInstallationContract.status === "planned-disabled" &&
        registryInstallationContract.contractVersion === "P26.42" &&
        source.runtimeRegistrationPreflightReady === true &&
        source.registryRegistrationBoundaryReady === true &&
        source.readiness === "runtime-registry-installation-contract-planned" &&
        guard.runtimeInstallationEnabled === false &&
        guard.runtimeInstallationAttempted === false &&
        guard.runtimeInstalled === false &&
        guard.runtimeRegistered === false &&
        guard.runtimeRegistration === false &&
        guard.runtimeExecutionRegistered === false &&
        guard.renderDispatch === false &&
        runtimeValueShape.runtimeValueCreated === false &&
        runtimeValueShape.runtimeValueInstalled === false &&
        closeHookOwnership.closeHookRegistered === false &&
        duplicateRollbackHandling.rollbackAttempted === false;
    const configured = options.bundledSceneBridgeRuntimeRegistryInstallationGate?.configured === true;
    const value = options.bundledSceneBridgeRuntimeRegistryInstallationGate?.value;
    const accepted = configured && value === BUNDLED_SCENE_BRIDGE_RUNTIME_INSTALLATION_GATE_REVIEWED_VALUE;
    const valid = !configured || accepted;

    let status: "planned-disabled" | "configured-disabled" | "invalid" =
        bundledSceneBridgeRuntimeRegistryInstallationGateBase.status;
    let readiness = contractReady
        ? "blocked-until-installation-gate-reviewed"
        : "blocked-until-installation-contract-ready";
    let refusalReason = contractReady ? "installation-gate-not-reviewed" : "installation-contract-not-ready";
    let checks: Array<{ id: string; status: string; required: boolean; dispatch: boolean }> =
        bundledSceneBridgeRuntimeRegistryInstallationGateBase.checks.map((check) => ({ ...check }));
    let diagnostic = bundledSceneBridgeRuntimeRegistryInstallationGateDiagnostic(
        "renderer_service_bundled_scene_bridge_runtime_registry_installation_gate_contract_not_ready",
        "blocked",
        "source.registryInstallationContractReady",
        "The bundled scene bridge runtime registry installation gate is blocked until the P26.42 installation contract is planned and safe.",
        [
            "Verify renderer-service /health bundledSceneBridgeRuntimeRegistryInstallationContract reports runtime-registry-installation-contract-planned before reviewing the installation gate.",
            "Keep registry writes, runtime installation, runtime registration, render dispatch, browser startup, asset loading, reads, writes, and value exposure disabled.",
        ]
    );

    if (configured && !accepted) {
        status = "invalid";
        readiness = "invalid-installation-gate-configuration";
        refusalReason = "installation-gate-configuration-invalid";
        checks = checks.map((check) =>
            check.id === "installation-contract-ready"
                ? { ...check, status: contractReady ? "passed" : "blocked" }
                : check.id === "explicit-installation-gate-reviewed"
                  ? { ...check, status: "invalid" }
                  : check
        );
        diagnostic = bundledSceneBridgeRuntimeRegistryInstallationGateDiagnostic(
            "renderer_service_bundled_scene_bridge_runtime_registry_installation_gate_configuration_invalid",
            "invalid",
            "configuration.accepted",
            "Renderer-service bundled scene bridge runtime registry installation gate must be reviewed when configured.",
            [
                `Set ${BUNDLED_SCENE_BRIDGE_RUNTIME_INSTALLATION_GATE_ENV}=${BUNDLED_SCENE_BRIDGE_RUNTIME_INSTALLATION_GATE_REVIEWED_VALUE} only after the P26.42 installation contract is ready, or leave it unset.`,
                "Keep registry writes, runtime installation, runtime registration, render dispatch, browser startup, asset loading, reads, writes, and value exposure disabled.",
            ]
        );
    } else if (contractReady && accepted) {
        status = "configured-disabled";
        readiness = "installation-gate-reviewed-disabled";
        refusalReason = "installation-disabled-until-runtime-installation-task";
        checks = checks.map((check) =>
            check.id === "installation-contract-ready" || check.id === "explicit-installation-gate-reviewed"
                ? { ...check, status: "passed" }
                : check
        );
        diagnostic = bundledSceneBridgeRuntimeRegistryInstallationGateDiagnostic(
            "renderer_service_bundled_scene_bridge_runtime_registry_installation_gate_reviewed_disabled",
            "info",
            "gate.reviewedGateOpen",
            "The bundled scene bridge runtime registry installation gate is reviewed after the P26.42 contract, but runtime installation remains disabled.",
            [
                "Proceed with a later reviewed runtime installation task before creating or installing any runtime registry value.",
                "Keep registry writes, runtime installation, runtime registration, render dispatch, browser startup, asset loading, reads, writes, and value exposure disabled in P26.43.",
            ]
        );
    } else if (contractReady) {
        checks = checks.map((check) =>
            check.id === "installation-contract-ready" ? { ...check, status: "passed" } : check
        );
        diagnostic = bundledSceneBridgeRuntimeRegistryInstallationGateDiagnostic(
            "renderer_service_bundled_scene_bridge_runtime_registry_installation_gate_not_configured",
            "blocked",
            "configuration.configured",
            "The bundled scene bridge runtime registry installation gate is blocked until the explicit reviewed gate is configured.",
            [
                `Set ${BUNDLED_SCENE_BRIDGE_RUNTIME_INSTALLATION_GATE_ENV}=${BUNDLED_SCENE_BRIDGE_RUNTIME_INSTALLATION_GATE_REVIEWED_VALUE} only after reviewing the P26.42 installation contract.`,
                "Keep registry writes, runtime installation, runtime registration, render dispatch, browser startup, asset loading, reads, writes, and value exposure disabled.",
            ]
        );
    }

    return {
        ...bundledSceneBridgeRuntimeRegistryInstallationGateBase,
        status,
        source: {
            ...bundledSceneBridgeRuntimeRegistryInstallationGateBase.source,
            runtimeRegistrationPreflightReady: source.runtimeRegistrationPreflightReady === true,
            registryRegistrationBoundaryReady: source.registryRegistrationBoundaryReady === true,
            registryInstallationContractReady: contractReady,
            registryInstallationContractStatus:
                typeof registryInstallationContract.status === "string"
                    ? registryInstallationContract.status
                    : "planned-disabled",
            registryInstallationContractReadiness:
                typeof source.readiness === "string"
                    ? source.readiness
                    : "blocked-until-registry-registration-boundary-ready",
            readiness,
        },
        configuration: {
            ...bundledSceneBridgeRuntimeRegistryInstallationGateBase.configuration,
            configured,
            accepted,
            valid,
        },
        gate: {
            ...bundledSceneBridgeRuntimeRegistryInstallationGateBase.gate,
            reviewedGateOpen: contractReady && accepted,
            futureInstallationAttemptAllowed: contractReady && accepted,
        },
        refusalDiagnostics: {
            ...bundledSceneBridgeRuntimeRegistryInstallationGateBase.refusalDiagnostics,
            refusalReason,
            invalidGateValue: configured && !accepted,
        },
        diagnostics: [diagnostic],
        diagnosticCodes: [diagnostic.code],
        nextActions: diagnostic.nextActions,
        checks,
        execution: null,
    };
}

function bundledSceneBridgeRuntimeRegistryInstallationPreflightDiagnostic(
    code: string,
    severity: "info" | "blocked" | "invalid",
    field: string,
    message: string,
    nextActions: string[]
) {
    return {
        code,
        severity,
        field,
        env: BUNDLED_SCENE_BRIDGE_RUNTIME_INSTALLATION_GATE_ENV,
        valueRead: false,
        valuesIncluded: false,
        message,
        nextActions,
    };
}

function bundledSceneBridgeRuntimeRegistryInstallationPreflightResponse(
    registryInstallationGate: Record<string, unknown>
): Record<string, unknown> {
    const source = isRecord(registryInstallationGate.source) ? registryInstallationGate.source : {};
    const gate = isRecord(registryInstallationGate.gate) ? registryInstallationGate.gate : {};
    const refusalDiagnostics = isRecord(registryInstallationGate.refusalDiagnostics)
        ? registryInstallationGate.refusalDiagnostics
        : {};
    const rollbackPreconditions = isRecord(registryInstallationGate.rollbackPreconditions)
        ? registryInstallationGate.rollbackPreconditions
        : {};
    const lifecycleOwnership = isRecord(registryInstallationGate.lifecycleOwnership)
        ? registryInstallationGate.lifecycleOwnership
        : {};

    const falseGateFields = [
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
    ];
    const allFalse = (record: Record<string, unknown>, fields: string[]) => fields.every((field) => record[field] === false);
    const rollbackReady =
        rollbackPreconditions.duplicateDetectionRequired === true &&
        rollbackPreconditions.duplicateRegistrationPolicy === "reject-until-explicit-replace-policy" &&
        rollbackPreconditions.replacementPolicy === "not-supported-until-reviewed" &&
        rollbackPreconditions.rollbackRequiredOnDuplicate === true &&
        rollbackPreconditions.cleanupOnInstallationFailure === true &&
        rollbackPreconditions.cleanupOnServiceStop === true &&
        rollbackPreconditions.closeHookCleanupRequired === true &&
        allFalse(rollbackPreconditions, ["rollbackPrepared", "rollbackAttempted", "cleanupAttempted", "valuesIncluded"]);
    const lifecycleReady =
        lifecycleOwnership.lifecycleOwner === "renderer-service" &&
        lifecycleOwnership.registryOwner === "renderer-service" &&
        lifecycleOwnership.closeHookOwner === "renderer-service" &&
        lifecycleOwnership.runtimeId === "bundled-scene-bridge" &&
        lifecycleOwnership.targetRegistry === "renderer-service.thumbnail-runtime-registry" &&
        lifecycleOwnership.lifecycleScope === "thumbnail-runtime-registry" &&
        lifecycleOwnership.noDispatchLifecycle === true &&
        allFalse(lifecycleOwnership, ["closeHookRegistered", "runtimeValueOwned", "registrySlotOwned", "valuesIncluded"]);
    const gateSafe =
        allFalse(gate, falseGateFields) &&
        refusalDiagnostics.registryWriteRefused === true &&
        refusalDiagnostics.runtimeValueCreationRefused === true &&
        refusalDiagnostics.runtimeInstallationRefused === true &&
        refusalDiagnostics.renderDispatchRefused === true &&
        refusalDiagnostics.valuesIncluded === false;
    const gateReady =
        registryInstallationGate.status === "configured-disabled" &&
        registryInstallationGate.gateVersion === "P26.43" &&
        source.registryInstallationContractReady === true &&
        source.readiness === "installation-gate-reviewed-disabled" &&
        gate.reviewedGateOpen === true &&
        gate.futureInstallationAttemptAllowed === true &&
        rollbackReady &&
        lifecycleReady &&
        gateSafe;
    const gateInvalid = registryInstallationGate.status === "invalid";

    let status: "blocked" | "ready" | "invalid" = "blocked";
    let readiness = "blocked-until-reviewed-installation-gate";
    let refusalReason = "installation-gate-not-ready";
    let diagnostic = bundledSceneBridgeRuntimeRegistryInstallationPreflightDiagnostic(
        "renderer_service_bundled_scene_bridge_runtime_registry_installation_preflight_gate_not_ready",
        "blocked",
        "source.registryInstallationGateReady",
        "The bundled scene bridge runtime registry installation preflight is blocked until the P26.43 reviewed gate is ready in renderer-service /health.",
        [
            "Verify renderer-service /health bundledSceneBridgeRuntimeRegistryInstallationGate reports configured-disabled with the reviewed gate open before trusting the installation preflight.",
            "Keep registry lookup, registry writes, runtime value creation, runtime installation, close-hook registration, rollback, render dispatch, browser startup, reads, writes, and value exposure disabled.",
        ]
    );

    if (gateInvalid) {
        status = "invalid";
        readiness = "invalid-installation-gate";
        refusalReason = "installation-gate-invalid";
        diagnostic = bundledSceneBridgeRuntimeRegistryInstallationPreflightDiagnostic(
            "renderer_service_bundled_scene_bridge_runtime_registry_installation_preflight_gate_invalid",
            "invalid",
            "source.registryInstallationGateStatus",
            "The bundled scene bridge runtime registry installation preflight rejected invalid P26.43 gate metadata.",
            [
                "Fix renderer-service /health bundledSceneBridgeRuntimeRegistryInstallationGate before evaluating the installation preflight.",
                "Keep registry lookup, registry writes, runtime value creation, runtime installation, close-hook registration, rollback, render dispatch, browser startup, reads, writes, and value exposure disabled.",
            ]
        );
    } else if (gateReady) {
        status = "ready";
        readiness = "installation-preflight-ready";
        refusalReason = "installation-execution-disabled-in-preflight";
        diagnostic = bundledSceneBridgeRuntimeRegistryInstallationPreflightDiagnostic(
            "renderer_service_bundled_scene_bridge_runtime_registry_installation_preflight_ready",
            "info",
            "preflight.readyForLaterInstallationTask",
            "The bundled scene bridge runtime registry installation preflight passed, but this task still does not install or expose a runtime value.",
            [
                "Proceed only with a later reviewed runtime installation execution boundary before creating or installing any runtime registry value.",
                "Keep registry lookup, registry writes, runtime value creation, runtime installation, close-hook registration, rollback, render dispatch, browser startup, reads, writes, and value exposure disabled in P26.44.",
            ]
        );
    }

    const gateStatus = typeof registryInstallationGate.status === "string" ? registryInstallationGate.status : "planned-disabled";
    const gateReadiness = typeof source.readiness === "string" ? source.readiness : "blocked-until-installation-contract-ready";
    const checkStatus = (readyStatus: string = "passed") =>
        gateInvalid ? "invalid" : gateReady ? readyStatus : "blocked";

    return {
        ...bundledSceneBridgeRuntimeRegistryInstallationPreflightBase,
        status,
        source: {
            ...bundledSceneBridgeRuntimeRegistryInstallationPreflightBase.source,
            registryInstallationGateReady: gateReady,
            registryInstallationGateStatus: gateStatus,
            registryInstallationGateReadiness: gateReadiness,
            reviewedGateOpen: gate.reviewedGateOpen === true,
            futureInstallationAttemptAllowed: gate.futureInstallationAttemptAllowed === true,
            readiness,
        },
        preflight: {
            ...bundledSceneBridgeRuntimeRegistryInstallationPreflightBase.preflight,
            readyForLaterInstallationTask: gateReady,
        },
        refusalDiagnostics: {
            ...bundledSceneBridgeRuntimeRegistryInstallationPreflightBase.refusalDiagnostics,
            refusalReason,
            invalidGateMetadata: gateInvalid,
        },
        rollbackPreconditions: {
            ...bundledSceneBridgeRuntimeRegistryInstallationPreflightBase.rollbackPreconditions,
            preconditionsVerified: gateReady,
        },
        lifecycleOwnership: {
            ...bundledSceneBridgeRuntimeRegistryInstallationPreflightBase.lifecycleOwnership,
            lifecycleOwnershipVerified: gateReady,
        },
        diagnostics: [diagnostic],
        diagnosticCodes: [diagnostic.code],
        nextActions: diagnostic.nextActions,
        checks: [
            { id: "installation-gate-ready", status: checkStatus(), required: true, dispatch: false },
            { id: "reviewed-gate-open", status: checkStatus(), required: true, dispatch: false },
            { id: "future-installation-attempt-allowed", status: checkStatus(), required: true, dispatch: false },
            { id: "rollback-preconditions-verified", status: checkStatus(), required: true, dispatch: false },
            { id: "no-dispatch-lifecycle-owned", status: checkStatus(), required: true, dispatch: false },
            { id: "runtime-values-redacted", status: "passed", required: true, dispatch: false },
        ],
        execution: null,
    };
}

function bundledSceneBridgeRuntimeRegistryInstallationExecutionBoundaryDiagnostic(
    code: string,
    severity: "info" | "blocked" | "invalid",
    field: string,
    message: string,
    nextActions: string[]
) {
    return {
        code,
        severity,
        field,
        env: BUNDLED_SCENE_BRIDGE_RUNTIME_INSTALLATION_GATE_ENV,
        valueRead: false,
        valuesIncluded: false,
        message,
        nextActions,
    };
}

function bundledSceneBridgeRuntimeRegistryInstallationExecutionBoundaryResponse(
    registryInstallationPreflight: Record<string, unknown>
): Record<string, unknown> {
    const source = isRecord(registryInstallationPreflight.source) ? registryInstallationPreflight.source : {};
    const preflight = isRecord(registryInstallationPreflight.preflight) ? registryInstallationPreflight.preflight : {};
    const rollbackPreconditions = isRecord(registryInstallationPreflight.rollbackPreconditions)
        ? registryInstallationPreflight.rollbackPreconditions
        : {};
    const lifecycleOwnership = isRecord(registryInstallationPreflight.lifecycleOwnership)
        ? registryInstallationPreflight.lifecycleOwnership
        : {};
    const preflightReady =
        registryInstallationPreflight.status === "ready" &&
        registryInstallationPreflight.preflightVersion === "P26.44" &&
        source.readiness === "installation-preflight-ready" &&
        preflight.readyForLaterInstallationTask === true &&
        preflight.registryLookupAttempted === false &&
        preflight.registryWriteAttempted === false &&
        preflight.runtimeValueCreated === false &&
        preflight.runtimeInstallationAttempted === false &&
        preflight.runtimeInstalled === false &&
        preflight.closeHookRegistered === false &&
        preflight.duplicateRollbackAttempted === false &&
        preflight.renderDispatch === false &&
        rollbackPreconditions.preconditionsVerified === true &&
        rollbackPreconditions.rollbackAttempted === false &&
        lifecycleOwnership.lifecycleOwnershipVerified === true &&
        lifecycleOwnership.runtimeValueOwned === false &&
        lifecycleOwnership.registrySlotOwned === false;
    const preflightInvalid = registryInstallationPreflight.status === "invalid";

    let status = "blocked";
    let readiness = "blocked-until-installation-preflight-ready";
    let refusalReason = "installation-preflight-not-ready";
    let diagnostic = bundledSceneBridgeRuntimeRegistryInstallationExecutionBoundaryDiagnostic(
        "renderer_service_bundled_scene_bridge_runtime_registry_installation_execution_boundary_preflight_not_ready",
        "blocked",
        "source.registryInstallationPreflightReady",
        "The bundled scene bridge runtime registry installation execution boundary is blocked until the P26.44 installation preflight is ready.",
        [
            "Verify renderer-service /health bundledSceneBridgeRuntimeRegistryInstallationPreflight reports installation-preflight-ready before planning installation execution.",
            "Keep registry lookup, registry writes, runtime value creation, runtime installation, close-hook registration, rollback, render dispatch, browser startup, reads, writes, and value exposure disabled.",
        ]
    );

    if (preflightInvalid) {
        status = "invalid";
        readiness = "invalid-installation-preflight";
        refusalReason = "installation-preflight-invalid";
        diagnostic = bundledSceneBridgeRuntimeRegistryInstallationExecutionBoundaryDiagnostic(
            "renderer_service_bundled_scene_bridge_runtime_registry_installation_execution_boundary_preflight_invalid",
            "invalid",
            "source.registryInstallationPreflightStatus",
            "The bundled scene bridge runtime registry installation execution boundary rejected invalid P26.44 preflight metadata.",
            [
                "Fix renderer-service /health bundledSceneBridgeRuntimeRegistryInstallationPreflight before planning runtime installation execution.",
                "Keep registry lookup, registry writes, runtime value creation, runtime installation, close-hook registration, rollback, render dispatch, browser startup, reads, writes, and value exposure disabled.",
            ]
        );
    } else if (preflightReady) {
        status = "planned-disabled";
        readiness = "runtime-registry-installation-execution-boundary-planned";
        refusalReason = "installation-execution-disabled-until-reviewed-execution-task";
        diagnostic = bundledSceneBridgeRuntimeRegistryInstallationExecutionBoundaryDiagnostic(
            "renderer_service_bundled_scene_bridge_runtime_registry_installation_execution_boundary_planned",
            "info",
            "executionBoundary.executionPlanReady",
            "The bundled scene bridge runtime registry installation execution boundary is planned after the P26.44 preflight, but runtime installation remains disabled.",
            [
                "Proceed only with a later reviewed execution task before looking up, creating, installing, or exposing a runtime registry value.",
                "Keep registry lookup, registry writes, runtime value creation, runtime installation, close-hook registration, rollback execution, render dispatch, browser startup, reads, writes, and value exposure disabled in P26.45.",
            ]
        );
    }

    const preflightStatus = typeof registryInstallationPreflight.status === "string" ? registryInstallationPreflight.status : "blocked";
    const preflightReadiness = typeof source.readiness === "string" ? source.readiness : "blocked-until-reviewed-installation-gate";
    const boundaryCheckStatus = preflightInvalid ? "invalid" : preflightReady ? "planned" : "planned";

    return {
        ...bundledSceneBridgeRuntimeRegistryInstallationExecutionBoundaryBase,
        status,
        source: {
            ...bundledSceneBridgeRuntimeRegistryInstallationExecutionBoundaryBase.source,
            registryInstallationPreflightReady: preflightReady,
            registryInstallationPreflightStatus: preflightStatus,
            registryInstallationPreflightReadiness: preflightReadiness,
            reviewedGateOpen: source.reviewedGateOpen === true,
            futureInstallationAttemptAllowed: source.futureInstallationAttemptAllowed === true,
            readiness,
        },
        executionBoundary: {
            ...bundledSceneBridgeRuntimeRegistryInstallationExecutionBoundaryBase.executionBoundary,
            executionPlanReady: preflightReady,
        },
        lifecycleOwnership: {
            ...bundledSceneBridgeRuntimeRegistryInstallationExecutionBoundaryBase.lifecycleOwnership,
            lifecycleOwnershipVerified: preflightReady,
        },
        refusalDiagnostics: {
            ...bundledSceneBridgeRuntimeRegistryInstallationExecutionBoundaryBase.refusalDiagnostics,
            refusalReason,
            invalidPreflightMetadata: preflightInvalid,
        },
        diagnostics: [diagnostic],
        diagnosticCodes: [diagnostic.code],
        nextActions: diagnostic.nextActions,
        checks: [
            {
                id: "installation-preflight-ready",
                status: preflightInvalid ? "invalid" : preflightReady ? "passed" : "blocked",
                required: true,
                dispatch: false,
            },
            { id: "runtime-value-creation-boundary", status: boundaryCheckStatus, required: true, dispatch: false },
            { id: "registry-installation-boundary", status: boundaryCheckStatus, required: true, dispatch: false },
            { id: "close-hook-registration-boundary", status: boundaryCheckStatus, required: true, dispatch: false },
            { id: "duplicate-rollback-boundary", status: boundaryCheckStatus, required: true, dispatch: false },
            { id: "runtime-values-redacted", status: "passed", required: true, dispatch: false },
        ],
        execution: null,
    };
}

const bundledSceneBridgeRuntimeRegistryInstallationBase = {
    status: "blocked",
    installationVersion: "P26.46",
    owner: "renderer-service",
    mode: "guarded-runtime-registry-installation-execution",
    source: {
        runtimeRegistrationPreflightVersion: "P26.40",
        registryRegistrationBoundaryVersion: "P26.41",
        registryInstallationContractVersion: "P26.42",
        registryInstallationGateVersion: "P26.43",
        registryInstallationPreflightVersion: "P26.44",
        registryInstallationExecutionBoundaryVersion: "P26.45",
        registryInstallationVersion: "P26.46",
        registryInstallationExecutionBoundaryReady: false,
        registryInstallationExecutionBoundaryStatus: "blocked",
        registryInstallationExecutionBoundaryReadiness: "blocked-until-installation-preflight-ready",
        reviewedGateOpen: false,
        readiness: "blocked-until-installation-execution-boundary-planned",
    },
    installation: {
        registryInstallationExecutionBoundaryReadyRequired: true,
        duplicateLookupRequired: true,
        runtimeValueCreationRequired: true,
        registryInstallationRequired: true,
        closeHookRegistrationRequired: true,
        rollbackHookRequired: true,
        noDispatchRequired: true,
        installationAttemptAllowed: false,
        runtimeInstallationEnabled: false,
        registryLookupAttempted: false,
        registryWriteAttempted: false,
        runtimeValueCreated: false,
        runtimeInstallationAttempted: false,
        runtimeInstalled: false,
        runtimeRegistered: false,
        runtimeRegistration: false,
        runtimeExecutionRegistered: false,
        closeHookRegistered: false,
        rollbackHookRegistered: false,
        duplicateRollbackAttempted: false,
        renderDispatch: false,
        browserProcessStarted: false,
        runtimeValuesIncluded: false,
        registryValuesIncluded: false,
    },
    runtimeValue: {
        runtimeId: BUNDLED_SCENE_BRIDGE_RUNTIME_ID,
        targetRegistry: BUNDLED_SCENE_BRIDGE_TARGET_REGISTRY,
        requiredMethods: ["renderThumbnail"],
        optionalMethods: ["close"],
        requiredInstallationInputs: ["runtimeId", "runtimeValue", "lifecycleOwner", "closeHook"],
        runtimeValueCreationPlanned: true,
        runtimeValueCreated: false,
        runtimeValueInstalled: false,
        runtimeRegistered: false,
        runtimeExecutionRegistered: false,
        renderDispatchEnabledAfterInstallation: false,
        valuesIncluded: false,
    },
    registrySlot: {
        runtimeId: BUNDLED_SCENE_BRIDGE_RUNTIME_ID,
        targetRegistry: BUNDLED_SCENE_BRIDGE_TARGET_REGISTRY,
        slotOwner: "renderer-service",
        slotStatus: "empty",
        runtimeInstalled: false,
        runtimeAvailableForDispatch: false,
        renderDispatchEnabled: false,
        valuesIncluded: false,
    },
    duplicateHandling: {
        duplicateDetectionRequired: true,
        existingRuntimeLookupRequired: true,
        duplicateRegistrationPolicy: "reject-until-explicit-replace-policy",
        replacementPolicy: "not-supported-until-reviewed",
        rollbackRequiredOnDuplicate: true,
        rollbackHookRequired: true,
        cleanupOnInstallationFailure: true,
        cleanupOnServiceStop: true,
        existingRuntimeLookupAttempted: false,
        existingRuntimeFound: false,
        duplicateDetected: false,
        rollbackPrepared: false,
        rollbackAttempted: false,
        cleanupAttempted: false,
        valuesIncluded: false,
    },
    lifecycleOwnership: {
        lifecycleOwner: "renderer-service",
        registryOwner: "renderer-service",
        closeHookOwner: "renderer-service",
        rollbackOwner: "renderer-service",
        runtimeId: BUNDLED_SCENE_BRIDGE_RUNTIME_ID,
        targetRegistry: BUNDLED_SCENE_BRIDGE_TARGET_REGISTRY,
        lifecycleScope: "thumbnail-runtime-registry",
        noDispatchLifecycle: true,
        lifecycleOwnershipVerified: false,
        closeHookRegistered: false,
        rollbackHookRegistered: false,
        runtimeValueOwned: false,
        registrySlotOwned: false,
        valuesIncluded: false,
    },
    refusalDiagnostics: {
        refusalRequired: true,
        refusalReason: "installation-execution-boundary-not-planned",
        invalidBoundaryMetadata: false,
        registryLookupRefused: true,
        registryWriteRefused: true,
        runtimeValueCreationRefused: true,
        runtimeInstallationRefused: true,
        closeHookRegistrationRefused: true,
        duplicateRollbackRefused: true,
        renderDispatchRefused: true,
        valuesIncluded: false,
    },
    installationOutcomeTaxonomy: [
        {
            code: "renderer_service_bundled_scene_bridge_runtime_registry_installation_boundary_not_planned",
            stage: "installation-execution-boundary",
            severity: "blocked",
            retryable: false,
            dispatch: false,
        },
        {
            code: "renderer_service_bundled_scene_bridge_runtime_registry_installation_boundary_invalid",
            stage: "installation-execution-boundary",
            severity: "invalid",
            retryable: false,
            dispatch: false,
        },
        {
            code: "renderer_service_bundled_scene_bridge_runtime_registry_installation_duplicate_rejected",
            stage: "duplicate-registration-policy",
            severity: "blocked",
            retryable: false,
            dispatch: false,
        },
        {
            code: "renderer_service_bundled_scene_bridge_runtime_registry_installation_runtime_invalid",
            stage: "runtime-value-creation",
            severity: "invalid",
            retryable: false,
            dispatch: false,
        },
        {
            code: "renderer_service_bundled_scene_bridge_runtime_registry_installation_executed",
            stage: "registry-installation",
            severity: "info",
            retryable: false,
            dispatch: false,
        },
        {
            code: "renderer_service_bundled_scene_bridge_runtime_registry_installation_unsafe_metadata",
            stage: "installation-metadata",
            severity: "invalid",
            retryable: false,
            dispatch: false,
        },
    ],
    diagnostics: [
        {
            code: "renderer_service_bundled_scene_bridge_runtime_registry_installation_boundary_not_planned",
            severity: "blocked",
            field: "source.registryInstallationExecutionBoundaryReady",
            env: BUNDLED_SCENE_BRIDGE_RUNTIME_INSTALLATION_GATE_ENV,
            valueRead: false,
            valuesIncluded: false,
            message:
                "The bundled scene bridge runtime registry installation is blocked until the P26.45 installation execution boundary is planned.",
            nextActions: [
                "Verify renderer-service /health bundledSceneBridgeRuntimeRegistryInstallationExecutionBoundary reports planned-disabled after a ready P26.44 preflight.",
                "Keep registry lookup, registry writes, runtime value creation, runtime installation, close-hook registration, rollback, render dispatch, browser startup, reads, writes, and value exposure disabled until the planned boundary is ready.",
            ],
        },
    ],
    diagnosticCodes: [
        "renderer_service_bundled_scene_bridge_runtime_registry_installation_boundary_not_planned",
    ],
    nextActions: [
        "Verify renderer-service /health bundledSceneBridgeRuntimeRegistryInstallationExecutionBoundary reports planned-disabled after a ready P26.44 preflight.",
        "Keep registry lookup, registry writes, runtime value creation, runtime installation, close-hook registration, rollback, render dispatch, browser startup, reads, writes, and value exposure disabled until the planned boundary is ready.",
    ],
    checks: [
        { id: "installation-execution-boundary-planned", status: "blocked", required: true, dispatch: false },
        { id: "duplicate-lookup", status: "planned", required: true, dispatch: false },
        { id: "runtime-value-creation", status: "planned", required: true, dispatch: false },
        { id: "registry-installation", status: "planned", required: true, dispatch: false },
        { id: "close-hook-registration", status: "planned", required: true, dispatch: false },
        { id: "rollback-hook-registration", status: "planned", required: true, dispatch: false },
        { id: "runtime-values-redacted", status: "passed", required: true, dispatch: false },
    ],
    sideEffects: {
        registryLookup: false,
        registryWrite: false,
        runtimeValueCreation: false,
        runtimeInstallation: false,
        runtimeRegistration: false,
        runtimeExecutionRegistered: false,
        closeHookRegistration: false,
        duplicateRollback: false,
        renderDispatch: false,
        browserProcessStarted: false,
        browserPageCreated: false,
        runtimeAdapterImported: false,
        runtimeFactoryInvoked: false,
        runtimeOptionsCreated: false,
        runtimeAssetsLoaded: false,
        assetManifestMaterialized: false,
        backendRpcReads: false,
        sourceDataReads: false,
        networkDispatch: false,
        dispatch: false,
        localFileWrites: false,
    },
    redaction: {
        modeValuesIncluded: false,
        moduleValuesIncluded: false,
        factoryValuesIncluded: false,
        runtimeOptionsValuesIncluded: false,
        optionValuesIncluded: false,
        runtimeValuesIncluded: false,
        registryValuesIncluded: false,
        lifecycleValuesIncluded: false,
        pathValuesIncluded: false,
        sourceDataValuesIncluded: false,
        pageValuesIncluded: false,
        artifactValuesIncluded: false,
        mediaValuesIncluded: false,
        tokenValuesIncluded: false,
    },
    omitted: {
        configuredValue: true,
        moduleNamespace: true,
        factoryValue: true,
        runtimeOptionsValue: true,
        optionValues: true,
        runtimeValue: true,
        registryValue: true,
        lifecycleHandles: true,
        workspaceRoot: true,
        cacheRoot: true,
        modulePath: true,
        publicPaths: true,
        cachePaths: true,
        sha256: true,
        playwrightBrowserPath: true,
        runtimeModulePath: true,
        sourceData: true,
        pageData: true,
        artifactBytes: true,
        mediaBytes: true,
        tokenValues: true,
    },
    execution: null,
} as const;

export const bundledSceneBridgeRuntimeRegistryInstallation = bundledSceneBridgeRuntimeRegistryInstallationBase;

function bundledSceneBridgeRuntimeRegistryInstallationDiagnostic(
    code: string,
    severity: "info" | "blocked" | "invalid",
    field: string,
    message: string,
    nextActions: string[]
) {
    return {
        code,
        severity,
        field,
        env: BUNDLED_SCENE_BRIDGE_RUNTIME_INSTALLATION_GATE_ENV,
        valueRead: false,
        valuesIncluded: false,
        message,
        nextActions,
    };
}

async function createBundledSceneBridgeInstalledRuntimeValue(options?: {
    preferRealRuntime?: boolean;
    materializationExecuted?: boolean;
}): Promise<{ runtime: RendererRuntimeOptions; runtimeKind: "stub" | "real" }> {
    if (options?.preferRealRuntime) {
        const realNamespace = await import("./bundled-scene-bridge-real-runtime.js");
        const realFactory = realNamespace.createBundledSceneBridgeRealRendererRuntime;
        if (typeof realFactory === "function") {
            const realRuntime = await realFactory({
                executionEnabled: true,
                materializationExecuted: options.materializationExecuted === true,
                assetsMaterialized: options.materializationExecuted === true,
                realRuntimeScaffold: true,
            });
            if (isRecord(realRuntime) && typeof realRuntime.renderThumbnail === "function") {
                return {
                    runtime: {
                        renderThumbnail: realRuntime.renderThumbnail as RendererRuntimeOptions["renderThumbnail"],
                        ...(typeof realRuntime.close === "function"
                            ? { close: realRuntime.close as RendererRuntimeOptions["close"] }
                            : {}),
                    },
                    runtimeKind: "real",
                };
            }
        }
    }

    const namespace = await import("./bundled-scene-bridge-runtime.js");
    const factory = namespace.createBundledSceneBridgeRendererRuntime;
    if (typeof factory !== "function") {
        const error = new Error(
            "Bundled scene bridge runtime factory is missing for registry installation."
        ) as Error & { code?: string };
        error.code = "renderer_service_bundled_scene_bridge_runtime_registry_installation_runtime_invalid";
        throw error;
    }
    const runtimeOptions = await factory(createBundledSceneBridgeInertOptions());
    if (!isRecord(runtimeOptions) || typeof runtimeOptions.renderThumbnail !== "function") {
        const error = new Error(
            "Bundled scene bridge runtime value is missing renderThumbnail for registry installation."
        ) as Error & { code?: string };
        error.code = "renderer_service_bundled_scene_bridge_runtime_registry_installation_runtime_invalid";
        throw error;
    }
    if (runtimeOptions.close !== undefined && typeof runtimeOptions.close !== "function") {
        const error = new Error(
            "Bundled scene bridge runtime value has a non-callable close hook."
        ) as Error & { code?: string };
        error.code = "renderer_service_bundled_scene_bridge_runtime_registry_installation_runtime_invalid";
        throw error;
    }
    return {
        runtime: {
            renderThumbnail: runtimeOptions.renderThumbnail as RendererRuntimeOptions["renderThumbnail"],
            ...(typeof runtimeOptions.close === "function"
                ? { close: runtimeOptions.close as RendererRuntimeOptions["close"] }
                : {}),
        },
        runtimeKind: "stub",
    };
}

async function closeBundledSceneBridgeInstalledRuntimeEntry(
    entry: BundledSceneBridgeInstalledRuntimeEntry | undefined
): Promise<void> {
    if (!entry) {
        return;
    }
    if (typeof entry.runtimeValue.close === "function") {
        await entry.runtimeValue.close();
    }
}

async function closeBundledSceneBridgeThumbnailRuntimeRegistry(
    registry: BundledSceneBridgeThumbnailRuntimeRegistry | undefined
): Promise<void> {
    if (!registry || registry.size === 0) {
        return;
    }
    const entries = [...registry.values()];
    registry.clear();
    for (const entry of entries) {
        await closeBundledSceneBridgeInstalledRuntimeEntry(entry);
    }
}

async function bundledSceneBridgeRuntimeRegistryInstallationResponse(
    registryInstallationExecutionBoundary: Record<string, unknown>,
    registry: BundledSceneBridgeThumbnailRuntimeRegistry,
    installOptions: {
        preferRealRuntime?: boolean;
        materializationExecuted?: boolean;
    } = {}
): Promise<Record<string, unknown>> {
    const source = isRecord(registryInstallationExecutionBoundary.source)
        ? registryInstallationExecutionBoundary.source
        : {};
    const executionBoundary = isRecord(registryInstallationExecutionBoundary.executionBoundary)
        ? registryInstallationExecutionBoundary.executionBoundary
        : {};
    const lifecycleOwnership = isRecord(registryInstallationExecutionBoundary.lifecycleOwnership)
        ? registryInstallationExecutionBoundary.lifecycleOwnership
        : {};
    const boundaryPlanned =
        registryInstallationExecutionBoundary.status === "planned-disabled" &&
        registryInstallationExecutionBoundary.boundaryVersion === "P26.45" &&
        source.readiness === "runtime-registry-installation-execution-boundary-planned" &&
        source.registryInstallationPreflightReady === true &&
        executionBoundary.executionPlanReady === true &&
        executionBoundary.runtimeInstallationEnabled === false &&
        executionBoundary.runtimeInstalled === false &&
        executionBoundary.renderDispatch === false &&
        lifecycleOwnership.lifecycleOwnershipVerified === true;
    const boundaryInvalid = registryInstallationExecutionBoundary.status === "invalid";
    const boundaryStatus =
        typeof registryInstallationExecutionBoundary.status === "string"
            ? registryInstallationExecutionBoundary.status
            : "blocked";
    const boundaryReadiness =
        typeof source.readiness === "string" ? source.readiness : "blocked-until-installation-preflight-ready";

    if (boundaryInvalid) {
        const diagnostic = bundledSceneBridgeRuntimeRegistryInstallationDiagnostic(
            "renderer_service_bundled_scene_bridge_runtime_registry_installation_boundary_invalid",
            "invalid",
            "source.registryInstallationExecutionBoundaryStatus",
            "The bundled scene bridge runtime registry installation rejected invalid P26.45 execution boundary metadata.",
            [
                "Fix renderer-service /health bundledSceneBridgeRuntimeRegistryInstallationExecutionBoundary before installing a runtime registry value.",
                "Keep registry lookup, registry writes, runtime value creation, runtime installation, close-hook registration, rollback, render dispatch, browser startup, reads, writes, and value exposure disabled.",
            ]
        );
        return {
            ...bundledSceneBridgeRuntimeRegistryInstallationBase,
            status: "invalid",
            source: {
                ...bundledSceneBridgeRuntimeRegistryInstallationBase.source,
                registryInstallationExecutionBoundaryReady: false,
                registryInstallationExecutionBoundaryStatus: boundaryStatus,
                registryInstallationExecutionBoundaryReadiness: boundaryReadiness,
                reviewedGateOpen: source.reviewedGateOpen === true,
                readiness: "invalid-installation-execution-boundary",
            },
            refusalDiagnostics: {
                ...bundledSceneBridgeRuntimeRegistryInstallationBase.refusalDiagnostics,
                refusalReason: "installation-execution-boundary-invalid",
                invalidBoundaryMetadata: true,
            },
            diagnostics: [diagnostic],
            diagnosticCodes: [diagnostic.code],
            nextActions: diagnostic.nextActions,
            checks: [
                { id: "installation-execution-boundary-planned", status: "invalid", required: true, dispatch: false },
                { id: "duplicate-lookup", status: "invalid", required: true, dispatch: false },
                { id: "runtime-value-creation", status: "invalid", required: true, dispatch: false },
                { id: "registry-installation", status: "invalid", required: true, dispatch: false },
                { id: "close-hook-registration", status: "invalid", required: true, dispatch: false },
                { id: "rollback-hook-registration", status: "invalid", required: true, dispatch: false },
                { id: "runtime-values-redacted", status: "passed", required: true, dispatch: false },
            ],
            execution: null,
        };
    }

    if (!boundaryPlanned) {
        const diagnostic = bundledSceneBridgeRuntimeRegistryInstallationDiagnostic(
            "renderer_service_bundled_scene_bridge_runtime_registry_installation_boundary_not_planned",
            "blocked",
            "source.registryInstallationExecutionBoundaryReady",
            "The bundled scene bridge runtime registry installation is blocked until the P26.45 installation execution boundary is planned.",
            [
                "Verify renderer-service /health bundledSceneBridgeRuntimeRegistryInstallationExecutionBoundary reports planned-disabled after a ready P26.44 preflight.",
                "Keep registry lookup, registry writes, runtime value creation, runtime installation, close-hook registration, rollback, render dispatch, browser startup, reads, writes, and value exposure disabled until the planned boundary is ready.",
            ]
        );
        return {
            ...bundledSceneBridgeRuntimeRegistryInstallationBase,
            status: "blocked",
            source: {
                ...bundledSceneBridgeRuntimeRegistryInstallationBase.source,
                registryInstallationExecutionBoundaryReady: false,
                registryInstallationExecutionBoundaryStatus: boundaryStatus,
                registryInstallationExecutionBoundaryReadiness: boundaryReadiness,
                reviewedGateOpen: source.reviewedGateOpen === true,
                readiness: "blocked-until-installation-execution-boundary-planned",
            },
            diagnostics: [diagnostic],
            diagnosticCodes: [diagnostic.code],
            nextActions: diagnostic.nextActions,
            execution: null,
        };
    }

    const existing = registry.get(BUNDLED_SCENE_BRIDGE_RUNTIME_ID);
    if (existing) {
        const diagnostic = bundledSceneBridgeRuntimeRegistryInstallationDiagnostic(
            "renderer_service_bundled_scene_bridge_runtime_registry_installation_executed",
            "info",
            "installation.runtimeInstalled",
            "The bundled scene bridge stub runtime is already installed in the process-local thumbnail runtime registry; replacement remains unsupported.",
            [
                "Keep render dispatch disabled until a later reviewed task wires the installed runtime into gated thumbnail execution.",
                "Proceed to P26.47 installed-runtime lifecycle diagnostics without exposing runtime values or enabling default MCP/CLI rendering.",
            ]
        );
        return {
            ...bundledSceneBridgeRuntimeRegistryInstallationBase,
            status: "executed",
            source: {
                ...bundledSceneBridgeRuntimeRegistryInstallationBase.source,
                registryInstallationExecutionBoundaryReady: true,
                registryInstallationExecutionBoundaryStatus: boundaryStatus,
                registryInstallationExecutionBoundaryReadiness: boundaryReadiness,
                reviewedGateOpen: source.reviewedGateOpen === true,
                readiness: "runtime-registry-installation-executed",
            },
            installation: {
                ...bundledSceneBridgeRuntimeRegistryInstallationBase.installation,
                installationAttemptAllowed: true,
                runtimeInstallationEnabled: true,
                registryLookupAttempted: true,
                runtimeInstalled: true,
                closeHookRegistered: existing.closeHookRegistered,
                rollbackHookRegistered: existing.rollbackHookRegistered,
            },
            runtimeValue: {
                ...bundledSceneBridgeRuntimeRegistryInstallationBase.runtimeValue,
                runtimeValueInstalled: true,
            },
            registrySlot: {
                ...bundledSceneBridgeRuntimeRegistryInstallationBase.registrySlot,
                slotStatus: "occupied",
                runtimeInstalled: true,
            },
            duplicateHandling: {
                ...bundledSceneBridgeRuntimeRegistryInstallationBase.duplicateHandling,
                existingRuntimeLookupAttempted: true,
                existingRuntimeFound: true,
                duplicateDetected: true,
                rollbackPrepared: true,
            },
            lifecycleOwnership: {
                ...bundledSceneBridgeRuntimeRegistryInstallationBase.lifecycleOwnership,
                lifecycleOwnershipVerified: true,
                closeHookRegistered: existing.closeHookRegistered,
                rollbackHookRegistered: existing.rollbackHookRegistered,
                runtimeValueOwned: true,
                registrySlotOwned: true,
            },
            refusalDiagnostics: {
                refusalRequired: false,
                refusalReason: "installation-executed-without-dispatch",
                invalidBoundaryMetadata: false,
                registryLookupRefused: false,
                registryWriteRefused: true,
                runtimeValueCreationRefused: true,
                runtimeInstallationRefused: true,
                closeHookRegistrationRefused: false,
                duplicateRollbackRefused: false,
                renderDispatchRefused: true,
                valuesIncluded: false,
            },
            diagnostics: [diagnostic],
            diagnosticCodes: [diagnostic.code],
            nextActions: diagnostic.nextActions,
            checks: [
                { id: "installation-execution-boundary-planned", status: "passed", required: true, dispatch: false },
                { id: "duplicate-lookup", status: "passed", required: true, dispatch: false },
                { id: "runtime-value-creation", status: "passed", required: true, dispatch: false },
                { id: "registry-installation", status: "passed", required: true, dispatch: false },
                {
                    id: "close-hook-registration",
                    status: existing.closeHookRegistered ? "passed" : "failed",
                    required: true,
                    dispatch: false,
                },
                { id: "rollback-hook-registration", status: "passed", required: true, dispatch: false },
                { id: "runtime-values-redacted", status: "passed", required: true, dispatch: false },
            ],
            sideEffects: {
                ...bundledSceneBridgeRuntimeRegistryInstallationBase.sideEffects,
                registryLookup: true,
            },
            execution: {
                attempted: true,
                succeeded: true,
                outcome: "already-installed",
                registryLookupAttempted: true,
                existingRuntimeFound: true,
                runtimeValueCreated: false,
                registryWriteAttempted: false,
                runtimeInstalled: true,
                closeHookRegistered: existing.closeHookRegistered,
                rollbackHookRegistered: existing.rollbackHookRegistered,
                renderDispatch: false,
                browserProcessStarted: false,
                runtimeAssetsLoaded: false,
                assetManifestMaterialized: false,
                valuesIncluded: false,
            },
        };
    }

    let runtimeValueCreated = false;
    let runtimeAdapterImported = false;
    let runtimeFactoryInvoked = false;
    let runtimeOptionsCreated = false;
    let closeHookRegistered = false;
    let rollbackHookRegistered = false;
    let registryWriteAttempted = false;
    let createdRuntime: RendererRuntimeOptions | undefined;

    try {
        const created = await createBundledSceneBridgeInstalledRuntimeValue(installOptions);
        createdRuntime = created.runtime;
        runtimeAdapterImported = true;
        runtimeFactoryInvoked = true;
        runtimeOptionsCreated = true;
        runtimeValueCreated = true;
        closeHookRegistered = typeof createdRuntime.close === "function";
        rollbackHookRegistered = true;
        registryWriteAttempted = true;
        registry.set(BUNDLED_SCENE_BRIDGE_RUNTIME_ID, {
            runtimeId: BUNDLED_SCENE_BRIDGE_RUNTIME_ID,
            runtimeValue: createdRuntime,
            closeHookRegistered,
            rollbackHookRegistered,
            installedAtMs: Date.now(),
            runtimeKind: created.runtimeKind,
        });
        const diagnostic = bundledSceneBridgeRuntimeRegistryInstallationDiagnostic(
            "renderer_service_bundled_scene_bridge_runtime_registry_installation_executed",
            "info",
            "installation.runtimeInstalled",
            "The bundled scene bridge stub runtime was installed into the process-local thumbnail runtime registry with close/rollback hooks registered.",
            [
                "Keep render dispatch disabled until a later reviewed task wires the installed runtime into gated thumbnail execution.",
                "Proceed to P26.47 installed-runtime lifecycle diagnostics without exposing runtime values or enabling default MCP/CLI rendering.",
            ]
        );
        return {
            ...bundledSceneBridgeRuntimeRegistryInstallationBase,
            status: "executed",
            source: {
                ...bundledSceneBridgeRuntimeRegistryInstallationBase.source,
                registryInstallationExecutionBoundaryReady: true,
                registryInstallationExecutionBoundaryStatus: boundaryStatus,
                registryInstallationExecutionBoundaryReadiness: boundaryReadiness,
                reviewedGateOpen: source.reviewedGateOpen === true,
                readiness: "runtime-registry-installation-executed",
            },
            installation: {
                ...bundledSceneBridgeRuntimeRegistryInstallationBase.installation,
                installationAttemptAllowed: true,
                runtimeInstallationEnabled: true,
                registryLookupAttempted: true,
                registryWriteAttempted: true,
                runtimeValueCreated: true,
                runtimeInstallationAttempted: true,
                runtimeInstalled: true,
                closeHookRegistered,
                rollbackHookRegistered,
            },
            runtimeValue: {
                ...bundledSceneBridgeRuntimeRegistryInstallationBase.runtimeValue,
                runtimeValueCreated: true,
                runtimeValueInstalled: true,
            },
            registrySlot: {
                ...bundledSceneBridgeRuntimeRegistryInstallationBase.registrySlot,
                slotStatus: "occupied",
                runtimeInstalled: true,
            },
            duplicateHandling: {
                ...bundledSceneBridgeRuntimeRegistryInstallationBase.duplicateHandling,
                existingRuntimeLookupAttempted: true,
                existingRuntimeFound: false,
                duplicateDetected: false,
                rollbackPrepared: true,
            },
            lifecycleOwnership: {
                ...bundledSceneBridgeRuntimeRegistryInstallationBase.lifecycleOwnership,
                lifecycleOwnershipVerified: true,
                closeHookRegistered,
                rollbackHookRegistered,
                runtimeValueOwned: true,
                registrySlotOwned: true,
            },
            refusalDiagnostics: {
                refusalRequired: false,
                refusalReason: "installation-executed-without-dispatch",
                invalidBoundaryMetadata: false,
                registryLookupRefused: false,
                registryWriteRefused: false,
                runtimeValueCreationRefused: false,
                runtimeInstallationRefused: false,
                closeHookRegistrationRefused: false,
                duplicateRollbackRefused: false,
                renderDispatchRefused: true,
                valuesIncluded: false,
            },
            diagnostics: [diagnostic],
            diagnosticCodes: [diagnostic.code],
            nextActions: diagnostic.nextActions,
            checks: [
                { id: "installation-execution-boundary-planned", status: "passed", required: true, dispatch: false },
                { id: "duplicate-lookup", status: "passed", required: true, dispatch: false },
                { id: "runtime-value-creation", status: "passed", required: true, dispatch: false },
                { id: "registry-installation", status: "passed", required: true, dispatch: false },
                { id: "close-hook-registration", status: closeHookRegistered ? "passed" : "failed", required: true, dispatch: false },
                { id: "rollback-hook-registration", status: "passed", required: true, dispatch: false },
                { id: "runtime-values-redacted", status: "passed", required: true, dispatch: false },
            ],
            sideEffects: {
                ...bundledSceneBridgeRuntimeRegistryInstallationBase.sideEffects,
                registryLookup: true,
                registryWrite: true,
                runtimeValueCreation: true,
                runtimeInstallation: true,
                closeHookRegistration: closeHookRegistered,
                runtimeAdapterImported,
                runtimeFactoryInvoked,
                runtimeOptionsCreated,
            },
            execution: {
                attempted: true,
                succeeded: true,
                outcome: "executed",
                registryLookupAttempted: true,
                existingRuntimeFound: false,
                runtimeValueCreated: true,
                registryWriteAttempted: true,
                runtimeInstalled: true,
                closeHookRegistered,
                rollbackHookRegistered,
                renderDispatch: false,
                browserProcessStarted: false,
                runtimeAssetsLoaded: false,
                assetManifestMaterialized: false,
                valuesIncluded: false,
            },
        };
    } catch {
        if (createdRuntime) {
            await closeBundledSceneBridgeInstalledRuntimeEntry({
                runtimeId: BUNDLED_SCENE_BRIDGE_RUNTIME_ID,
                runtimeValue: createdRuntime,
                closeHookRegistered: typeof createdRuntime.close === "function",
                rollbackHookRegistered: true,
                installedAtMs: Date.now(),
            });
        }
        const diagnostic = bundledSceneBridgeRuntimeRegistryInstallationDiagnostic(
            "renderer_service_bundled_scene_bridge_runtime_registry_installation_runtime_invalid",
            "invalid",
            "runtimeValue",
            "The bundled scene bridge runtime registry installation failed while creating or validating the stub runtime value.",
            [
                "Fix the service-owned bundled scene bridge factory so it returns renderThumbnail and an optional close hook.",
                "Rerun renderer-service /health before retrying guarded runtime registry installation.",
            ]
        );
        return {
            ...bundledSceneBridgeRuntimeRegistryInstallationBase,
            status: "invalid",
            source: {
                ...bundledSceneBridgeRuntimeRegistryInstallationBase.source,
                registryInstallationExecutionBoundaryReady: true,
                registryInstallationExecutionBoundaryStatus: boundaryStatus,
                registryInstallationExecutionBoundaryReadiness: boundaryReadiness,
                reviewedGateOpen: source.reviewedGateOpen === true,
                readiness: "invalid-runtime-registry-installation",
            },
            installation: {
                ...bundledSceneBridgeRuntimeRegistryInstallationBase.installation,
                installationAttemptAllowed: true,
                runtimeInstallationEnabled: true,
                registryLookupAttempted: true,
                registryWriteAttempted,
                runtimeValueCreated,
                runtimeInstallationAttempted: true,
                closeHookRegistered,
                rollbackHookRegistered,
            },
            duplicateHandling: {
                ...bundledSceneBridgeRuntimeRegistryInstallationBase.duplicateHandling,
                existingRuntimeLookupAttempted: true,
                existingRuntimeFound: false,
                duplicateDetected: false,
                rollbackPrepared: true,
                cleanupAttempted: true,
            },
            lifecycleOwnership: {
                ...bundledSceneBridgeRuntimeRegistryInstallationBase.lifecycleOwnership,
                lifecycleOwnershipVerified: true,
            },
            refusalDiagnostics: {
                ...bundledSceneBridgeRuntimeRegistryInstallationBase.refusalDiagnostics,
                refusalReason: "runtime-value-invalid",
                registryLookupRefused: false,
                registryWriteRefused: !registryWriteAttempted,
                runtimeValueCreationRefused: !runtimeValueCreated,
                runtimeInstallationRefused: true,
                closeHookRegistrationRefused: !closeHookRegistered,
                duplicateRollbackRefused: false,
                renderDispatchRefused: true,
            },
            diagnostics: [diagnostic],
            diagnosticCodes: [diagnostic.code],
            nextActions: diagnostic.nextActions,
            checks: [
                { id: "installation-execution-boundary-planned", status: "passed", required: true, dispatch: false },
                { id: "duplicate-lookup", status: "passed", required: true, dispatch: false },
                { id: "runtime-value-creation", status: "failed", required: true, dispatch: false },
                { id: "registry-installation", status: "failed", required: true, dispatch: false },
                { id: "close-hook-registration", status: "blocked", required: true, dispatch: false },
                { id: "rollback-hook-registration", status: "blocked", required: true, dispatch: false },
                { id: "runtime-values-redacted", status: "passed", required: true, dispatch: false },
            ],
            sideEffects: {
                ...bundledSceneBridgeRuntimeRegistryInstallationBase.sideEffects,
                registryLookup: true,
                registryWrite: registryWriteAttempted,
                runtimeValueCreation: runtimeValueCreated,
                runtimeInstallation: false,
                closeHookRegistration: closeHookRegistered,
                runtimeAdapterImported,
                runtimeFactoryInvoked,
                runtimeOptionsCreated,
            },
            execution: {
                attempted: true,
                succeeded: false,
                outcome: "runtime-invalid",
                registryLookupAttempted: true,
                existingRuntimeFound: false,
                runtimeValueCreated,
                registryWriteAttempted,
                runtimeInstalled: false,
                closeHookRegistered,
                rollbackHookRegistered,
                renderDispatch: false,
                browserProcessStarted: false,
                runtimeAssetsLoaded: false,
                assetManifestMaterialized: false,
                valuesIncluded: false,
            },
        };
    }
}


const bundledSceneBridgeInstalledRuntimeLifecycleBase = {
    status: "not-installed",
    diagnosticsVersion: "P26.47",
    owner: "renderer-service",
    mode: "installed-runtime-lifecycle-diagnostics",
    source: {
        runtimeRegistrationPreflightVersion: "P26.40",
        registryRegistrationBoundaryVersion: "P26.41",
        registryInstallationContractVersion: "P26.42",
        registryInstallationGateVersion: "P26.43",
        registryInstallationPreflightVersion: "P26.44",
        registryInstallationExecutionBoundaryVersion: "P26.45",
        registryInstallationVersion: "P26.46",
        installedRuntimeLifecycleVersion: "P26.47",
        registryInstallationStatus: "blocked",
        registryInstallationReady: false,
        runtimeInstalled: false,
        readiness: "blocked-until-runtime-registry-installation",
    },
    registrySlot: {
        runtimeId: BUNDLED_SCENE_BRIDGE_RUNTIME_ID,
        targetRegistry: BUNDLED_SCENE_BRIDGE_TARGET_REGISTRY,
        slotOwner: "renderer-service",
        slotStatus: "empty",
        slotOccupied: false,
        runtimeInstalled: false,
        runtimeAvailableForDispatch: false,
        renderDispatchEnabled: false,
        valuesIncluded: false,
    },
    lifecycleHooks: {
        lifecycleOwner: "renderer-service",
        closeHookOwner: "renderer-service",
        rollbackOwner: "renderer-service",
        closeHookRegistered: false,
        rollbackHookRegistered: false,
        closeHookCallable: false,
        closeAttempted: false,
        closeSucceeded: false,
        closeFailed: false,
        valuesIncluded: false,
    },
    duplicateReplacementPolicy: {
        duplicateRegistrationPolicy: "reject-until-explicit-replace-policy",
        replacementPolicy: "not-supported-until-reviewed",
        existingRuntimeFound: false,
        duplicateDetected: false,
        replacementSupported: false,
        replacementAttempted: false,
        valuesIncluded: false,
    },
    rollbackReadiness: {
        rollbackReady: false,
        rollbackHookRegistered: false,
        cleanupOnServiceStop: true,
        cleanupOnInstallationFailure: true,
        rollbackAttempted: false,
        rollbackSucceeded: false,
        rollbackFailed: false,
        valuesIncluded: false,
    },
    runtimeAvailability: {
        status: "metadata-only",
        runtimeId: BUNDLED_SCENE_BRIDGE_RUNTIME_ID,
        runtimeInstalled: false,
        runtimeValueAvailable: false,
        runtimeAvailableForDispatch: false,
        renderDispatchEnabled: false,
        valuesIncluded: false,
    },
    refusalDiagnostics: {
        refusalRequired: true,
        refusalReason: "runtime-not-installed",
        invalidInstallationMetadata: false,
        renderDispatchRefused: true,
        runtimeValueExposureRefused: true,
        valuesIncluded: false,
    },
    lifecycleOutcomeTaxonomy: [
        {
            code: "renderer_service_bundled_scene_bridge_installed_runtime_lifecycle_not_installed",
            stage: "registry-installation",
            severity: "blocked",
            retryable: false,
            dispatch: false,
        },
        {
            code: "renderer_service_bundled_scene_bridge_installed_runtime_lifecycle_installation_invalid",
            stage: "registry-installation",
            severity: "invalid",
            retryable: false,
            dispatch: false,
        },
        {
            code: "renderer_service_bundled_scene_bridge_installed_runtime_lifecycle_reported",
            stage: "installed-runtime-lifecycle",
            severity: "info",
            retryable: false,
            dispatch: false,
        },
        {
            code: "renderer_service_bundled_scene_bridge_installed_runtime_lifecycle_unsafe_metadata",
            stage: "installed-runtime-lifecycle-metadata",
            severity: "invalid",
            retryable: false,
            dispatch: false,
        },
    ],
    diagnostics: [
        {
            code: "renderer_service_bundled_scene_bridge_installed_runtime_lifecycle_not_installed",
            severity: "blocked",
            field: "source.runtimeInstalled",
            env: BUNDLED_SCENE_BRIDGE_RUNTIME_INSTALLATION_GATE_ENV,
            valueRead: false,
            valuesIncluded: false,
            message:
                "The bundled scene bridge installed-runtime lifecycle diagnostics are blocked until P26.46 registry installation reports an installed runtime.",
            nextActions: [
                "Verify renderer-service /health bundledSceneBridgeRuntimeRegistryInstallation reports executed with an occupied registry slot.",
                "Keep render dispatch, real scene assets, asset materialization writes, and runtime value exposure gated.",
            ],
        },
    ],
    diagnosticCodes: ["renderer_service_bundled_scene_bridge_installed_runtime_lifecycle_not_installed"],
    nextActions: [
        "Verify renderer-service /health bundledSceneBridgeRuntimeRegistryInstallation reports executed with an occupied registry slot.",
        "Keep render dispatch, real scene assets, asset materialization writes, and runtime value exposure gated.",
    ],
    checks: [
        { id: "registry-installation-executed", status: "blocked", required: true, dispatch: false },
        { id: "registry-slot-occupied", status: "blocked", required: true, dispatch: false },
        { id: "close-hook-registered", status: "blocked", required: true, dispatch: false },
        { id: "rollback-readiness", status: "blocked", required: true, dispatch: false },
        { id: "duplicate-replacement-policy", status: "planned", required: true, dispatch: false },
        { id: "runtime-values-redacted", status: "passed", required: true, dispatch: false },
    ],
    sideEffects: {
        registryLookup: false,
        registryWrite: false,
        runtimeValueCreation: false,
        runtimeInstallation: false,
        runtimeRegistration: false,
        runtimeExecutionRegistered: false,
        closeHookRegistration: false,
        closeHookInvocation: false,
        duplicateRollback: false,
        renderDispatch: false,
        browserProcessStarted: false,
        browserPageCreated: false,
        runtimeAdapterImported: false,
        runtimeFactoryInvoked: false,
        runtimeOptionsCreated: false,
        runtimeAssetsLoaded: false,
        assetManifestMaterialized: false,
        backendRpcReads: false,
        sourceDataReads: false,
        networkDispatch: false,
        dispatch: false,
        localFileWrites: false,
    },
    redaction: {
        modeValuesIncluded: false,
        moduleValuesIncluded: false,
        factoryValuesIncluded: false,
        runtimeOptionsValuesIncluded: false,
        optionValuesIncluded: false,
        runtimeValuesIncluded: false,
        registryValuesIncluded: false,
        lifecycleValuesIncluded: false,
        pathValuesIncluded: false,
        sourceDataValuesIncluded: false,
        pageValuesIncluded: false,
        artifactValuesIncluded: false,
        mediaValuesIncluded: false,
        tokenValuesIncluded: false,
    },
    omitted: {
        configuredValue: true,
        moduleNamespace: true,
        factoryValue: true,
        runtimeOptionsValue: true,
        optionValues: true,
        runtimeValue: true,
        registryValue: true,
        lifecycleHandles: true,
        workspaceRoot: true,
        cacheRoot: true,
        modulePath: true,
        publicPaths: true,
        cachePaths: true,
        sha256: true,
        playwrightBrowserPath: true,
        runtimeModulePath: true,
        sourceData: true,
        pageData: true,
        artifactBytes: true,
        mediaBytes: true,
        tokenValues: true,
    },
    execution: null,
} as const;

export const bundledSceneBridgeInstalledRuntimeLifecycle = bundledSceneBridgeInstalledRuntimeLifecycleBase;

const bundledSceneBridgeRealRuntimeValueContractBase = {
    status: "planned-disabled",
    contractVersion: "P26.48",
    owner: "renderer-service",
    mode: "real-runtime-value-contract-plan",
    source: {
        adapterContractVersion: "P26.32",
        adapterModuleReadinessVersion: "P26.33",
        registryInstallationVersion: "P26.46",
        installedRuntimeLifecycleVersion: "P26.47",
        realRuntimeValueContractVersion: "P26.48",
        stubRuntimeInstalledAllowed: true,
        realRuntimeImplemented: false,
        readiness: "real-runtime-value-contract-planned",
    },
    ownership: {
        lifecycleOwner: "renderer-service",
        registryOwner: "renderer-service",
        browserOwner: "renderer-service",
        renderWasmOwner: "renderer-service",
        rasterizerOwner: "renderer-service",
        activeEditorTabRequired: false,
        processLocalRegistryRequired: true,
        valuesIncluded: false,
    },
    runtimeValueShape: {
        runtimeId: BUNDLED_SCENE_BRIDGE_RUNTIME_ID,
        targetRegistry: BUNDLED_SCENE_BRIDGE_TARGET_REGISTRY,
        type: "RendererRuntimeOptions",
        requiredMethods: ["renderThumbnail"],
        optionalMethods: ["close"],
        primaryRuntime: "render-wasm-worker",
        fallbackRuntime: "frontend-rasterizer",
        stubRuntimeSelectable: true,
        realRuntimeSelectable: false,
        valuesIncluded: false,
    },
    browserPageHandoff: {
        engine: "chromium",
        headless: true,
        pageReusePolicy: "single-page-serial-queue",
        sourceDataTransfer: "renderer-service-internal-redacted",
        activeEditorTabRequired: false,
        browserProcessStarted: false,
        pageCreated: false,
        pageValuesIncluded: false,
        playwrightPathIncluded: false,
    },
    renderInputContract: {
        type: "RendererRuntimeRenderInput",
        targetKinds: ["file", "frame"],
        requiredSections: ["target", "artifact", "cache", "render", "sourceData"],
        renderRuntime: "render-wasm-worker",
        renderFallback: "frontend-rasterizer",
        sourceDataValuesIncluded: false,
        pageValuesIncluded: false,
        artifactValuesIncluded: false,
        mediaValuesIncluded: false,
        tokenValuesIncluded: false,
    },
    renderOutputContract: {
        type: "RendererRuntimeRenderResult",
        artifactFormat: "png",
        artifactMimeType: "image/png",
        allowedRuntimes: ["render-wasm-worker", "frontend-rasterizer"],
        nonEmptyPngRequired: true,
        artifactByteLengthIncluded: false,
        artifactBytesIncluded: false,
        localFileWrites: false,
        resourceValuesIncluded: false,
        mediaValuesIncluded: false,
    },
    failureTaxonomy: [
        {
            code: "renderer_service_bundled_scene_bridge_real_runtime_value_contract_planned",
            stage: "contract-plan",
            severity: "info",
            retryable: false,
            dispatch: false,
        },
        {
            code: "renderer_service_bundled_scene_bridge_real_runtime_assets_not_ready",
            stage: "asset-prerequisites",
            severity: "blocked",
            retryable: false,
            dispatch: false,
        },
        {
            code: "renderer_service_bundled_scene_bridge_real_runtime_browser_start_failed",
            stage: "browser-page-handoff",
            severity: "invalid",
            retryable: true,
            dispatch: false,
        },
        {
            code: "renderer_service_bundled_scene_bridge_real_runtime_render_wasm_failed",
            stage: "render-wasm-worker",
            severity: "invalid",
            retryable: true,
            dispatch: false,
        },
        {
            code: "renderer_service_bundled_scene_bridge_real_runtime_rasterizer_fallback_failed",
            stage: "frontend-rasterizer",
            severity: "invalid",
            retryable: true,
            dispatch: false,
        },
        {
            code: "renderer_service_bundled_scene_bridge_real_runtime_value_contract_unsafe_metadata",
            stage: "contract-metadata",
            severity: "invalid",
            retryable: false,
            dispatch: false,
        },
    ],
    diagnostics: [
        {
            code: "renderer_service_bundled_scene_bridge_real_runtime_value_contract_planned",
            severity: "info",
            field: "source.realRuntimeImplemented",
            message:
                "The real bundled scene bridge runtime value contract is planned after stub installation and lifecycle diagnostics, but the real browser-backed runtime remains unimplemented.",
            nextActions: [
                "Scaffold the real runtime module behind a reviewed gate in P26.49 without loading public assets or starting a browser by default.",
                "Keep browser startup for real assets, asset materialization writes, default MCP/CLI rendering, and value exposure gated.",
            ],
        },
    ],
    diagnosticCodes: ["renderer_service_bundled_scene_bridge_real_runtime_value_contract_planned"],
    nextActions: [
        "Scaffold the real runtime module behind a reviewed gate in P26.49 without loading public assets or starting a browser by default.",
        "Keep browser startup for real assets, asset materialization writes, default MCP/CLI rendering, and value exposure gated.",
    ],
    checks: [
        { id: "stub-installation-compatible", status: "planned", required: true, dispatch: false },
        { id: "render-wasm-ownership", status: "planned", required: true, dispatch: false },
        { id: "frontend-rasterizer-fallback-ownership", status: "planned", required: true, dispatch: false },
        { id: "browser-page-handoff-plan", status: "planned", required: true, dispatch: false },
        { id: "render-io-contract", status: "planned", required: true, dispatch: false },
        { id: "failure-taxonomy", status: "planned", required: true, dispatch: false },
        { id: "runtime-values-redacted", status: "passed", required: true, dispatch: false },
    ],
    testMatrix: [
        { id: "contract-surfaced-health-thumbnail", required: true, status: "planned", dispatch: false },
        { id: "stub-runtime-remains-default", required: true, status: "planned", dispatch: false },
        { id: "real-runtime-selection-gated", required: true, status: "planned", dispatch: false },
        { id: "browser-page-handoff-redaction", required: true, status: "planned", dispatch: false },
        { id: "render-input-output-validation", required: true, status: "planned", dispatch: false },
        { id: "failure-taxonomy-codes", required: true, status: "planned", dispatch: false },
    ],
    sideEffects: {
        registryLookup: false,
        registryWrite: false,
        runtimeValueCreation: false,
        runtimeInstallation: false,
        runtimeRegistration: false,
        runtimeExecutionRegistered: false,
        renderDispatch: false,
        browserProcessStarted: false,
        browserPageCreated: false,
        runtimeAdapterImported: false,
        runtimeFactoryInvoked: false,
        runtimeOptionsCreated: false,
        runtimeAssetsLoaded: false,
        assetManifestMaterialized: false,
        backendRpcReads: false,
        sourceDataReads: false,
        networkDispatch: false,
        dispatch: false,
        localFileWrites: false,
    },
    redaction: {
        modeValuesIncluded: false,
        moduleValuesIncluded: false,
        factoryValuesIncluded: false,
        runtimeOptionsValuesIncluded: false,
        optionValuesIncluded: false,
        runtimeValuesIncluded: false,
        registryValuesIncluded: false,
        lifecycleValuesIncluded: false,
        pathValuesIncluded: false,
        sourceDataValuesIncluded: false,
        pageValuesIncluded: false,
        artifactValuesIncluded: false,
        mediaValuesIncluded: false,
        tokenValuesIncluded: false,
    },
    omitted: {
        configuredValue: true,
        moduleNamespace: true,
        factoryValue: true,
        runtimeOptionsValue: true,
        optionValues: true,
        runtimeValue: true,
        registryValue: true,
        lifecycleHandles: true,
        workspaceRoot: true,
        cacheRoot: true,
        modulePath: true,
        publicPaths: true,
        cachePaths: true,
        sha256: true,
        playwrightBrowserPath: true,
        runtimeModulePath: true,
        sourceData: true,
        pageData: true,
        artifactBytes: true,
        mediaBytes: true,
        tokenValues: true,
    },
    execution: null,
} as const;

export const bundledSceneBridgeRealRuntimeValueContract = bundledSceneBridgeRealRuntimeValueContractBase;

function validateBundledSceneBridgeRealRuntimeValueContractResponse(actual: unknown, field: string): void {
    const record = responseRecord(actual, field);
    requireResponseEqual(record.status, "planned-disabled", `${field}.status`);
    requireResponseEqual(record.contractVersion, "P26.48", `${field}.contractVersion`);
    requireResponseEqual(record.owner, "renderer-service", `${field}.owner`);
    requireResponseEqual(record.mode, "real-runtime-value-contract-plan", `${field}.mode`);

    const source = responseRecord(record.source, `${field}.source`);
    requireResponseEqual(source.realRuntimeValueContractVersion, "P26.48", `${field}.source.realRuntimeValueContractVersion`);
    requireResponseEqual(source.registryInstallationVersion, "P26.46", `${field}.source.registryInstallationVersion`);
    requireResponseEqual(source.installedRuntimeLifecycleVersion, "P26.47", `${field}.source.installedRuntimeLifecycleVersion`);
    requireResponseEqual(source.realRuntimeImplemented, false, `${field}.source.realRuntimeImplemented`);
    requireResponseEqual(source.readiness, "real-runtime-value-contract-planned", `${field}.source.readiness`);

    const ownership = responseRecord(record.ownership, `${field}.ownership`);
    requireResponseEqual(ownership.activeEditorTabRequired, false, `${field}.ownership.activeEditorTabRequired`);
    requireResponseEqual(ownership.processLocalRegistryRequired, true, `${field}.ownership.processLocalRegistryRequired`);
    requireResponseEqual(ownership.valuesIncluded, false, `${field}.ownership.valuesIncluded`);

    const runtimeValueShape = responseRecord(record.runtimeValueShape, `${field}.runtimeValueShape`);
    requireResponseEqual(runtimeValueShape.runtimeId, BUNDLED_SCENE_BRIDGE_RUNTIME_ID, `${field}.runtimeValueShape.runtimeId`);
    requireResponseEqual(runtimeValueShape.targetRegistry, BUNDLED_SCENE_BRIDGE_TARGET_REGISTRY, `${field}.runtimeValueShape.targetRegistry`);
    requireResponseEqual(runtimeValueShape.primaryRuntime, "render-wasm-worker", `${field}.runtimeValueShape.primaryRuntime`);
    requireResponseEqual(runtimeValueShape.fallbackRuntime, "frontend-rasterizer", `${field}.runtimeValueShape.fallbackRuntime`);
    requireResponseEqual(runtimeValueShape.realRuntimeSelectable, false, `${field}.runtimeValueShape.realRuntimeSelectable`);
    requireResponseEqual(runtimeValueShape.valuesIncluded, false, `${field}.runtimeValueShape.valuesIncluded`);

    const browserPageHandoff = responseRecord(record.browserPageHandoff, `${field}.browserPageHandoff`);
    requireResponseEqual(browserPageHandoff.browserProcessStarted, false, `${field}.browserPageHandoff.browserProcessStarted`);
    requireResponseEqual(browserPageHandoff.pageCreated, false, `${field}.browserPageHandoff.pageCreated`);
    requireResponseEqual(browserPageHandoff.pageValuesIncluded, false, `${field}.browserPageHandoff.pageValuesIncluded`);

    const sideEffects = responseRecord(record.sideEffects, `${field}.sideEffects`);
    for (const property of [
        "registryWrite",
        "runtimeInstallation",
        "runtimeRegistration",
        "runtimeExecutionRegistered",
        "renderDispatch",
        "browserProcessStarted",
        "browserPageCreated",
        "runtimeAssetsLoaded",
        "assetManifestMaterialized",
        "networkDispatch",
        "dispatch",
        "localFileWrites",
    ]) {
        requireResponseEqual(sideEffects[property], false, `${field}.sideEffects.${property}`);
    }

    const redaction = responseRecord(record.redaction, `${field}.redaction`);
    for (const property of [
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
        requireResponseEqual(redaction[property], false, `${field}.redaction.${property}`);
    }

    const omitted = responseRecord(record.omitted, `${field}.omitted`);
    for (const property of [
        "runtimeValue",
        "registryValue",
        "lifecycleHandles",
        "playwrightBrowserPath",
        "sourceData",
        "pageData",
        "artifactBytes",
        "mediaBytes",
        "tokenValues",
    ]) {
        requireResponseEqual(omitted[property], true, `${field}.omitted.${property}`);
    }

    requireResponseEqual(record.execution ?? null, null, `${field}.execution`);
    if (!Array.isArray(record.diagnostics) || record.diagnostics.length < 1) {
        responseInvalid(`${field}.diagnostics must be a non-empty array.`, `${field}.diagnostics`);
    }
    requireResponseEqual(
        responseRecord(record.diagnostics[0], `${field}.diagnostics[0]`).code,
        "renderer_service_bundled_scene_bridge_real_runtime_value_contract_planned",
        `${field}.diagnostics[0].code`
    );
}



const bundledSceneBridgeRealRuntimeModuleScaffoldBase = {
    status: "planned-disabled",
    scaffoldVersion: "P26.49",
    owner: "renderer-service",
    mode: "gated-real-runtime-module-scaffold",
    source: {
        realRuntimeValueContractVersion: "P26.48",
        realRuntimeModuleScaffoldVersion: "P26.49",
        realRuntimeValueContractReady: true,
        realRuntimeImplemented: false,
        readiness: "real-runtime-module-scaffold-planned",
    },
    module: {
        module: "./bundled-scene-bridge-real-runtime.js",
        moduleType: "service-owned-es-module",
        exportName: "createBundledSceneBridgeRealRendererRuntime",
        factorySignature: "(options) => Promise<RendererRuntimeOptions>",
        implements: "RendererRuntimeOptions.renderThumbnail",
        lifecycleHook: "close",
        primaryRuntime: "render-wasm-worker",
        fallbackRuntime: "frontend-rasterizer",
        moduleDefined: true,
        moduleImported: false,
        factoryInvoked: false,
        valuesIncluded: false,
    },
    gate: {
        env: BUNDLED_SCENE_BRIDGE_REAL_RUNTIME_MODULE_GATE_ENV,
        acceptedValue: BUNDLED_SCENE_BRIDGE_REAL_RUNTIME_MODULE_GATE_REVIEWED_VALUE,
        configured: false,
        accepted: false,
        reviewedScaffoldOpen: false,
        realRuntimeSelectable: false,
        realRuntimeSelected: false,
        valueRead: false,
        valuesIncluded: false,
    },
    selection: {
        stubFactoryDefault: true,
        realFactorySelectable: false,
        realFactorySelected: false,
        replacesStubInstallation: false,
        valuesIncluded: false,
    },
    refusalDiagnostics: {
        refusalRequired: true,
        refusalReason: "real-runtime-module-scaffold-disabled",
        invalidGateValue: false,
        assetLoadingRefused: true,
        browserStartupRefused: true,
        renderDispatchRefused: true,
        valuesIncluded: false,
    },
    scaffoldOutcomeTaxonomy: [
        {
            code: "renderer_service_bundled_scene_bridge_real_runtime_module_scaffold_planned",
            stage: "module-scaffold",
            severity: "info",
            retryable: false,
            dispatch: false,
        },
        {
            code: "renderer_service_bundled_scene_bridge_real_runtime_module_scaffold_gate_reviewed",
            stage: "module-gate",
            severity: "info",
            retryable: false,
            dispatch: false,
        },
        {
            code: "renderer_service_bundled_scene_bridge_real_runtime_module_scaffold_gate_invalid",
            stage: "module-gate",
            severity: "invalid",
            retryable: false,
            dispatch: false,
        },
        {
            code: "renderer_service_bundled_scene_bridge_real_runtime_module_scaffold_unsafe_metadata",
            stage: "module-scaffold-metadata",
            severity: "invalid",
            retryable: false,
            dispatch: false,
        },
    ],
    diagnostics: [
        {
            code: "renderer_service_bundled_scene_bridge_real_runtime_module_scaffold_planned",
            severity: "info",
            field: "gate.reviewedScaffoldOpen",
            env: BUNDLED_SCENE_BRIDGE_REAL_RUNTIME_MODULE_GATE_ENV,
            valueRead: false,
            valuesIncluded: false,
            message:
                "The real bundled scene bridge runtime module scaffold exists, but the reviewed gate is closed and default selection remains the stub factory.",
            nextActions: [
                `Set ${BUNDLED_SCENE_BRIDGE_REAL_RUNTIME_MODULE_GATE_ENV}=${BUNDLED_SCENE_BRIDGE_REAL_RUNTIME_MODULE_GATE_REVIEWED_VALUE} only to acknowledge the scaffold boundary without enabling assets or browser startup.`,
                "Keep asset loading, browser startup, render dispatch, materialization writes, and value exposure gated until later explicit slices.",
            ],
        },
    ],
    diagnosticCodes: ["renderer_service_bundled_scene_bridge_real_runtime_module_scaffold_planned"],
    nextActions: [
        `Set ${BUNDLED_SCENE_BRIDGE_REAL_RUNTIME_MODULE_GATE_ENV}=${BUNDLED_SCENE_BRIDGE_REAL_RUNTIME_MODULE_GATE_REVIEWED_VALUE} only to acknowledge the scaffold boundary without enabling assets or browser startup.`,
        "Keep asset loading, browser startup, render dispatch, materialization writes, and value exposure gated until later explicit slices.",
    ],
    checks: [
        { id: "real-runtime-value-contract-planned", status: "passed", required: true, dispatch: false },
        { id: "real-runtime-module-defined", status: "passed", required: true, dispatch: false },
        { id: "reviewed-scaffold-gate", status: "planned", required: true, dispatch: false },
        { id: "no-default-asset-loading", status: "passed", required: true, dispatch: false },
        { id: "no-default-browser-startup", status: "passed", required: true, dispatch: false },
        { id: "runtime-values-redacted", status: "passed", required: true, dispatch: false },
    ],
    sideEffects: {
        registryLookup: false,
        registryWrite: false,
        runtimeValueCreation: false,
        runtimeInstallation: false,
        runtimeRegistration: false,
        runtimeExecutionRegistered: false,
        renderDispatch: false,
        browserProcessStarted: false,
        browserPageCreated: false,
        runtimeAdapterImported: false,
        runtimeFactoryInvoked: false,
        runtimeOptionsCreated: false,
        runtimeAssetsLoaded: false,
        assetManifestMaterialized: false,
        backendRpcReads: false,
        sourceDataReads: false,
        networkDispatch: false,
        dispatch: false,
        localFileWrites: false,
    },
    redaction: {
        modeValuesIncluded: false,
        moduleValuesIncluded: false,
        factoryValuesIncluded: false,
        runtimeOptionsValuesIncluded: false,
        optionValuesIncluded: false,
        runtimeValuesIncluded: false,
        registryValuesIncluded: false,
        lifecycleValuesIncluded: false,
        pathValuesIncluded: false,
        sourceDataValuesIncluded: false,
        pageValuesIncluded: false,
        artifactValuesIncluded: false,
        mediaValuesIncluded: false,
        tokenValuesIncluded: false,
    },
    omitted: {
        configuredValue: true,
        moduleNamespace: true,
        factoryValue: true,
        runtimeOptionsValue: true,
        optionValues: true,
        runtimeValue: true,
        registryValue: true,
        lifecycleHandles: true,
        workspaceRoot: true,
        cacheRoot: true,
        modulePath: true,
        publicPaths: true,
        cachePaths: true,
        sha256: true,
        playwrightBrowserPath: true,
        runtimeModulePath: true,
        sourceData: true,
        pageData: true,
        artifactBytes: true,
        mediaBytes: true,
        tokenValues: true,
    },
    execution: null,
} as const;

export const bundledSceneBridgeRealRuntimeModuleScaffold = bundledSceneBridgeRealRuntimeModuleScaffoldBase;

const bundledSceneBridgeInstalledRuntimeRenderDispatchBase = {
    status: "blocked",
    dispatchVersion: "P26.50",
    owner: "renderer-service",
    mode: "gated-installed-runtime-render-dispatch",
    source: {
        registryInstallationVersion: "P26.46",
        installedRuntimeLifecycleVersion: "P26.47",
        realRuntimeModuleScaffoldVersion: "P26.49",
        installedRuntimeRenderDispatchVersion: "P26.50",
        runtimeInstalled: false,
        renderDispatchGateOpen: false,
        readiness: "blocked-until-installed-runtime-and-reviewed-dispatch-gate",
    },
    gate: {
        env: BUNDLED_SCENE_BRIDGE_RENDER_DISPATCH_GATE_ENV,
        acceptedValue: BUNDLED_SCENE_BRIDGE_RENDER_DISPATCH_GATE_REVIEWED_VALUE,
        configured: false,
        accepted: false,
        reviewedDispatchOpen: false,
        valueRead: false,
        valuesIncluded: false,
    },
    dispatch: {
        runtimeInstalledRequired: true,
        reviewedDispatchGateRequired: true,
        preferInjectedRenderer: true,
        registryRuntimeSelectable: false,
        registryRuntimeSelected: false,
        renderThumbnailCalled: false,
        renderDispatch: false,
        pngMappedToResourcePipeline: false,
        valuesIncluded: false,
    },
    refusalDiagnostics: {
        refusalRequired: true,
        refusalReason: "installed-runtime-render-dispatch-disabled",
        invalidGateValue: false,
        runtimeNotInstalled: true,
        renderDispatchRefused: true,
        valuesIncluded: false,
    },
    dispatchOutcomeTaxonomy: [
        {
            code: "renderer_service_bundled_scene_bridge_installed_runtime_render_dispatch_blocked",
            stage: "render-dispatch-gate",
            severity: "blocked",
            retryable: false,
            dispatch: false,
        },
        {
            code: "renderer_service_bundled_scene_bridge_installed_runtime_render_dispatch_gate_invalid",
            stage: "render-dispatch-gate",
            severity: "invalid",
            retryable: false,
            dispatch: false,
        },
        {
            code: "renderer_service_bundled_scene_bridge_installed_runtime_render_dispatch_ready",
            stage: "render-dispatch",
            severity: "info",
            retryable: false,
            dispatch: false,
        },
        {
            code: "renderer_service_bundled_scene_bridge_installed_runtime_render_dispatch_selected",
            stage: "render-dispatch",
            severity: "info",
            retryable: false,
            dispatch: true,
        },
        {
            code: "renderer_service_bundled_scene_bridge_installed_runtime_render_dispatch_unsafe_metadata",
            stage: "render-dispatch-metadata",
            severity: "invalid",
            retryable: false,
            dispatch: false,
        },
    ],
    diagnostics: [
        {
            code: "renderer_service_bundled_scene_bridge_installed_runtime_render_dispatch_blocked",
            severity: "blocked",
            field: "source.renderDispatchGateOpen",
            env: BUNDLED_SCENE_BRIDGE_RENDER_DISPATCH_GATE_ENV,
            valueRead: false,
            valuesIncluded: false,
            message:
                "Installed-runtime thumbnail render dispatch is blocked until a runtime is installed and the reviewed render-dispatch gate is open.",
            nextActions: [
                "Install the bundled scene bridge runtime through the reviewed P26.46 path, then set PENPOT_RENDERER_SERVICE_BUNDLED_SCENE_BRIDGE_RENDER_DISPATCH_GATE=reviewed-dispatch only after reviewing dispatch side effects.",
                "Keep default MCP/CLI enablement, unreviewed gates, asset materialization writes, and credential/media/source value exposure gated.",
            ],
        },
    ],
    diagnosticCodes: ["renderer_service_bundled_scene_bridge_installed_runtime_render_dispatch_blocked"],
    nextActions: [
        "Install the bundled scene bridge runtime through the reviewed P26.46 path, then set PENPOT_RENDERER_SERVICE_BUNDLED_SCENE_BRIDGE_RENDER_DISPATCH_GATE=reviewed-dispatch only after reviewing dispatch side effects.",
        "Keep default MCP/CLI enablement, unreviewed gates, asset materialization writes, and credential/media/source value exposure gated.",
    ],
    checks: [
        { id: "runtime-installed", status: "blocked", required: true, dispatch: false },
        { id: "reviewed-render-dispatch-gate", status: "blocked", required: true, dispatch: false },
        { id: "registry-runtime-selection", status: "planned", required: true, dispatch: false },
        { id: "png-resource-pipeline-mapping", status: "planned", required: true, dispatch: false },
        { id: "runtime-values-redacted", status: "passed", required: true, dispatch: false },
    ],
    sideEffects: {
        registryLookup: false,
        runtimeInstallation: false,
        renderDispatch: false,
        browserProcessStarted: false,
        runtimeAssetsLoaded: false,
        assetManifestMaterialized: false,
        backendRpcReads: false,
        sourceDataReads: false,
        networkDispatch: false,
        dispatch: false,
        localFileWrites: false,
    },
    redaction: {
        runtimeValuesIncluded: false,
        registryValuesIncluded: false,
        pathValuesIncluded: false,
        sourceDataValuesIncluded: false,
        pageValuesIncluded: false,
        artifactValuesIncluded: false,
        mediaValuesIncluded: false,
        tokenValuesIncluded: false,
    },
    omitted: {
        configuredValue: true,
        runtimeValue: true,
        registryValue: true,
        sourceData: true,
        pageData: true,
        artifactBytes: true,
        mediaBytes: true,
        tokenValues: true,
    },
    execution: null,
} as const;

export const bundledSceneBridgeInstalledRuntimeRenderDispatch = bundledSceneBridgeInstalledRuntimeRenderDispatchBase;

function bundledSceneBridgeInstalledRuntimeRenderDispatchDiagnostic(
    code: string,
    severity: "info" | "blocked" | "invalid",
    field: string,
    message: string,
    nextActions: string[]
) {
    return {
        code,
        severity,
        field,
        env: BUNDLED_SCENE_BRIDGE_RENDER_DISPATCH_GATE_ENV,
        valueRead: false,
        valuesIncluded: false,
        message,
        nextActions,
    };
}

function bundledSceneBridgeInstalledRuntimeRenderDispatchResponse(
    options: Pick<RendererServiceOptions, "bundledSceneBridgeRenderDispatchGate" | "renderer"> = {},
    registry: BundledSceneBridgeThumbnailRuntimeRegistry,
    {
        registryRuntimeSelected = false,
        renderThumbnailCalled = false,
        renderDispatch = false,
        pngMappedToResourcePipeline = false,
    }: {
        registryRuntimeSelected?: boolean;
        renderThumbnailCalled?: boolean;
        renderDispatch?: boolean;
        pngMappedToResourcePipeline?: boolean;
    } = {}
): Record<string, unknown> {
    const configured = options.bundledSceneBridgeRenderDispatchGate?.configured === true;
    const value = options.bundledSceneBridgeRenderDispatchGate?.value;
    const accepted = configured && value === BUNDLED_SCENE_BRIDGE_RENDER_DISPATCH_GATE_REVIEWED_VALUE;
    const invalid = configured && !accepted;
    const installed = registry.has(BUNDLED_SCENE_BRIDGE_RUNTIME_ID);
    const injectedRendererPresent = typeof options.renderer?.renderThumbnail === "function";

    if (!configured && !installed && !renderDispatch && !registryRuntimeSelected && !renderThumbnailCalled) {
        return {
            ...bundledSceneBridgeInstalledRuntimeRenderDispatchBase,
        };
    }

    if (invalid) {
        const diagnostic = bundledSceneBridgeInstalledRuntimeRenderDispatchDiagnostic(
            "renderer_service_bundled_scene_bridge_installed_runtime_render_dispatch_gate_invalid",
            "invalid",
            "gate.accepted",
            "Installed-runtime thumbnail render dispatch rejected an invalid reviewed-dispatch gate value.",
            [
                `Set ${BUNDLED_SCENE_BRIDGE_RENDER_DISPATCH_GATE_ENV}=${BUNDLED_SCENE_BRIDGE_RENDER_DISPATCH_GATE_REVIEWED_VALUE} only after reviewing installed-runtime dispatch side effects, or leave it unset.`,
                "Keep default MCP/CLI enablement, unreviewed gates, asset materialization writes, and credential/media/source value exposure gated.",
            ]
        );
        return {
            ...bundledSceneBridgeInstalledRuntimeRenderDispatchBase,
            status: "invalid",
            source: {
                ...bundledSceneBridgeInstalledRuntimeRenderDispatchBase.source,
                runtimeInstalled: installed,
                renderDispatchGateOpen: false,
                readiness: "invalid-installed-runtime-render-dispatch-gate",
            },
            gate: {
                ...bundledSceneBridgeInstalledRuntimeRenderDispatchBase.gate,
                configured: true,
                accepted: false,
                reviewedDispatchOpen: false,
            },
            refusalDiagnostics: {
                ...bundledSceneBridgeInstalledRuntimeRenderDispatchBase.refusalDiagnostics,
                refusalReason: "render-dispatch-gate-invalid",
                invalidGateValue: true,
                runtimeNotInstalled: !installed,
            },
            diagnostics: [diagnostic],
            diagnosticCodes: [diagnostic.code],
            nextActions: diagnostic.nextActions,
            checks: [
                { id: "runtime-installed", status: installed ? "passed" : "blocked", required: true, dispatch: false },
                { id: "reviewed-render-dispatch-gate", status: "invalid", required: true, dispatch: false },
                { id: "registry-runtime-selection", status: "blocked", required: true, dispatch: false },
                { id: "png-resource-pipeline-mapping", status: "blocked", required: true, dispatch: false },
                { id: "runtime-values-redacted", status: "passed", required: true, dispatch: false },
            ],
            execution: null,
        };
    }

    if (!accepted || !installed) {
        const injectedDispatched = accepted && !installed && renderDispatch;
        const diagnostic = bundledSceneBridgeInstalledRuntimeRenderDispatchDiagnostic(
            injectedDispatched
                ? "renderer_service_bundled_scene_bridge_installed_runtime_render_dispatch_ready"
                : "renderer_service_bundled_scene_bridge_installed_runtime_render_dispatch_blocked",
            injectedDispatched ? "info" : "blocked",
            !installed ? "source.runtimeInstalled" : "source.renderDispatchGateOpen",
            injectedDispatched
                ? "Reviewed render-dispatch gate is open and an injected renderer handled thumbnail render dispatch; registry runtime selection remains blocked until installation."
                : !installed
                  ? "Installed-runtime thumbnail render dispatch is blocked because no runtime is installed in the process-local registry."
                  : "Installed-runtime thumbnail render dispatch is blocked because the reviewed render-dispatch gate is closed.",
            injectedDispatched
                ? [
                      "Keep preferring injected adapters until a later reviewed path selects the installed registry runtime.",
                      "Keep default MCP/CLI enablement, unreviewed gates, asset materialization writes, and credential/media/source value exposure gated.",
                  ]
                : [
                      "Install the bundled scene bridge runtime through the reviewed P26.46 path, then set PENPOT_RENDERER_SERVICE_BUNDLED_SCENE_BRIDGE_RENDER_DISPATCH_GATE=reviewed-dispatch only after reviewing dispatch side effects.",
                      "Keep default MCP/CLI enablement, unreviewed gates, asset materialization writes, and credential/media/source value exposure gated.",
                  ]
        );
        return {
            ...bundledSceneBridgeInstalledRuntimeRenderDispatchBase,
            status: injectedDispatched ? "ready" : "blocked",
            source: {
                ...bundledSceneBridgeInstalledRuntimeRenderDispatchBase.source,
                runtimeInstalled: installed,
                renderDispatchGateOpen: accepted,
                readiness: injectedDispatched
                    ? "render-dispatch-gate-open-injected-renderer-preferred"
                    : !installed
                      ? accepted
                        ? "blocked-until-runtime-registry-installation"
                        : "blocked-until-installed-runtime-and-reviewed-dispatch-gate"
                      : "blocked-until-reviewed-render-dispatch-gate",
            },
            gate: {
                ...bundledSceneBridgeInstalledRuntimeRenderDispatchBase.gate,
                configured,
                accepted,
                reviewedDispatchOpen: accepted,
            },
            dispatch: {
                ...bundledSceneBridgeInstalledRuntimeRenderDispatchBase.dispatch,
                registryRuntimeSelectable: false,
                registryRuntimeSelected: false,
                renderThumbnailCalled: renderThumbnailCalled || renderDispatch,
                renderDispatch,
                pngMappedToResourcePipeline,
            },
            refusalDiagnostics: {
                ...bundledSceneBridgeInstalledRuntimeRenderDispatchBase.refusalDiagnostics,
                refusalRequired: !injectedDispatched,
                refusalReason: injectedDispatched
                    ? "dispatch-ready-injected-renderer-preferred"
                    : "installed-runtime-render-dispatch-disabled",
                runtimeNotInstalled: !installed,
                renderDispatchRefused: !renderDispatch,
            },
            diagnostics: [diagnostic],
            diagnosticCodes: [diagnostic.code],
            nextActions: diagnostic.nextActions,
            checks: [
                { id: "runtime-installed", status: installed ? "passed" : "blocked", required: true, dispatch: false },
                {
                    id: "reviewed-render-dispatch-gate",
                    status: accepted ? "passed" : "blocked",
                    required: true,
                    dispatch: false,
                },
                { id: "registry-runtime-selection", status: "planned", required: true, dispatch: false },
                {
                    id: "png-resource-pipeline-mapping",
                    status: pngMappedToResourcePipeline ? "passed" : "planned",
                    required: true,
                    dispatch: pngMappedToResourcePipeline,
                },
                { id: "runtime-values-redacted", status: "passed", required: true, dispatch: false },
            ],
            sideEffects: {
                ...bundledSceneBridgeInstalledRuntimeRenderDispatchBase.sideEffects,
                renderDispatch,
                dispatch: renderDispatch,
            },
            execution: injectedDispatched
                ? {
                      attempted: true,
                      succeeded: true,
                      outcome: "injected-renderer-dispatched",
                      registryRuntimeSelected: false,
                      renderThumbnailCalled: true,
                      renderDispatch: true,
                      pngMappedToResourcePipeline,
                      valuesIncluded: false,
                  }
                : null,
        };
    }

    const selected = registryRuntimeSelected || (renderDispatch && !injectedRendererPresent);
    const diagnostic = bundledSceneBridgeInstalledRuntimeRenderDispatchDiagnostic(
        selected
            ? "renderer_service_bundled_scene_bridge_installed_runtime_render_dispatch_selected"
            : "renderer_service_bundled_scene_bridge_installed_runtime_render_dispatch_ready",
        "info",
        selected ? "dispatch.registryRuntimeSelected" : "dispatch.registryRuntimeSelectable",
        selected
            ? "Installed registry runtime was selected for gated thumbnail render dispatch and mapped through the existing resource pipeline when PNG bytes were produced."
            : "Installed registry runtime is selectable for gated thumbnail render dispatch; injected renderer adapters still take precedence when present.",
        [
            "Keep unreviewed gates, default MCP/CLI enablement, asset materialization writes, and credential/media/source value exposure gated.",
            "Use later slices for real-scene assets and broader default-path enablement.",
        ]
    );

    return {
        ...bundledSceneBridgeInstalledRuntimeRenderDispatchBase,
        status: selected ? "dispatched" : "ready",
        source: {
            ...bundledSceneBridgeInstalledRuntimeRenderDispatchBase.source,
            runtimeInstalled: true,
            renderDispatchGateOpen: true,
            readiness: selected
                ? "installed-runtime-render-dispatch-selected"
                : "installed-runtime-render-dispatch-ready",
        },
        gate: {
            ...bundledSceneBridgeInstalledRuntimeRenderDispatchBase.gate,
            configured: true,
            accepted: true,
            reviewedDispatchOpen: true,
        },
        dispatch: {
            ...bundledSceneBridgeInstalledRuntimeRenderDispatchBase.dispatch,
            registryRuntimeSelectable: true,
            registryRuntimeSelected: selected,
            renderThumbnailCalled,
            renderDispatch,
            pngMappedToResourcePipeline,
        },
        refusalDiagnostics: {
            refusalRequired: false,
            refusalReason: selected ? "dispatch-enabled-for-installed-runtime" : "dispatch-ready-injected-renderer-preferred",
            invalidGateValue: false,
            runtimeNotInstalled: false,
            renderDispatchRefused: !renderDispatch,
            valuesIncluded: false,
        },
        diagnostics: [diagnostic],
        diagnosticCodes: [diagnostic.code],
        nextActions: diagnostic.nextActions,
        checks: [
            { id: "runtime-installed", status: "passed", required: true, dispatch: false },
            { id: "reviewed-render-dispatch-gate", status: "passed", required: true, dispatch: false },
            {
                id: "registry-runtime-selection",
                status: selected ? "passed" : "planned",
                required: true,
                dispatch: selected,
            },
            {
                id: "png-resource-pipeline-mapping",
                status: pngMappedToResourcePipeline ? "passed" : "planned",
                required: true,
                dispatch: pngMappedToResourcePipeline,
            },
            { id: "runtime-values-redacted", status: "passed", required: true, dispatch: false },
        ],
        sideEffects: {
            ...bundledSceneBridgeInstalledRuntimeRenderDispatchBase.sideEffects,
            registryLookup: true,
            renderDispatch,
            dispatch: renderDispatch,
        },
        execution: {
            attempted: renderThumbnailCalled,
            succeeded: renderDispatch,
            outcome: selected
                ? pngMappedToResourcePipeline
                    ? "registry-runtime-dispatched"
                    : "registry-runtime-selected"
                : "ready-not-selected",
            registryRuntimeSelected: selected,
            renderThumbnailCalled,
            renderDispatch,
            pngMappedToResourcePipeline,
            valuesIncluded: false,
        },
    };
}

function resolveThumbnailRenderer(
    options: Pick<RendererServiceOptions, "renderer" | "bundledSceneBridgeRenderDispatchGate">,
    registry: BundledSceneBridgeThumbnailRuntimeRegistry
): {
    renderer: RendererRuntimeOptions | undefined;
    registryRuntimeSelected: boolean;
    renderDispatchGateOpen: boolean;
} {
    if (typeof options.renderer?.renderThumbnail === "function") {
        return {
            renderer: options.renderer,
            registryRuntimeSelected: false,
            renderDispatchGateOpen:
                options.bundledSceneBridgeRenderDispatchGate?.configured === true &&
                options.bundledSceneBridgeRenderDispatchGate?.value ===
                    BUNDLED_SCENE_BRIDGE_RENDER_DISPATCH_GATE_REVIEWED_VALUE,
        };
    }
    const gateOpen =
        options.bundledSceneBridgeRenderDispatchGate?.configured === true &&
        options.bundledSceneBridgeRenderDispatchGate?.value ===
            BUNDLED_SCENE_BRIDGE_RENDER_DISPATCH_GATE_REVIEWED_VALUE;
    if (!gateOpen) {
        return { renderer: undefined, registryRuntimeSelected: false, renderDispatchGateOpen: false };
    }
    const installed = registry.get(BUNDLED_SCENE_BRIDGE_RUNTIME_ID);
    if (!installed || typeof installed.runtimeValue.renderThumbnail !== "function") {
        return { renderer: undefined, registryRuntimeSelected: false, renderDispatchGateOpen: true };
    }
    return {
        renderer: installed.runtimeValue,
        registryRuntimeSelected: true,
        renderDispatchGateOpen: true,
    };
}

function validateBundledSceneBridgeInstalledRuntimeRenderDispatchResponse(actual: unknown, field: string): void {
    const record = responseRecord(actual, field);
    const status = String(record.status ?? "");
    if (!["blocked", "ready", "dispatched", "invalid"].includes(status)) {
        responseInvalid(`${field}.status must be blocked, ready, dispatched, or invalid.`, `${field}.status`);
    }
    requireResponseEqual(record.dispatchVersion, "P26.50", `${field}.dispatchVersion`);
    requireResponseEqual(record.owner, "renderer-service", `${field}.owner`);
    requireResponseEqual(record.mode, "gated-installed-runtime-render-dispatch", `${field}.mode`);

    const source = responseRecord(record.source, `${field}.source`);
    requireResponseEqual(source.installedRuntimeRenderDispatchVersion, "P26.50", `${field}.source.installedRuntimeRenderDispatchVersion`);
    requireResponseEqual(source.registryInstallationVersion, "P26.46", `${field}.source.registryInstallationVersion`);

    const gate = responseRecord(record.gate, `${field}.gate`);
    requireResponseEqual(gate.env, BUNDLED_SCENE_BRIDGE_RENDER_DISPATCH_GATE_ENV, `${field}.gate.env`);
    requireResponseEqual(gate.acceptedValue, BUNDLED_SCENE_BRIDGE_RENDER_DISPATCH_GATE_REVIEWED_VALUE, `${field}.gate.acceptedValue`);
    requireResponseEqual(gate.valuesIncluded, false, `${field}.gate.valuesIncluded`);

    const dispatch = responseRecord(record.dispatch, `${field}.dispatch`);
    requireResponseEqual(dispatch.runtimeInstalledRequired, true, `${field}.dispatch.runtimeInstalledRequired`);
    requireResponseEqual(dispatch.reviewedDispatchGateRequired, true, `${field}.dispatch.reviewedDispatchGateRequired`);
    requireResponseEqual(dispatch.preferInjectedRenderer, true, `${field}.dispatch.preferInjectedRenderer`);
    requireResponseEqual(dispatch.valuesIncluded, false, `${field}.dispatch.valuesIncluded`);

    const redaction = responseRecord(record.redaction, `${field}.redaction`);
    for (const property of [
        "runtimeValuesIncluded",
        "registryValuesIncluded",
        "pathValuesIncluded",
        "sourceDataValuesIncluded",
        "pageValuesIncluded",
        "artifactValuesIncluded",
        "mediaValuesIncluded",
        "tokenValuesIncluded",
    ]) {
        requireResponseEqual(redaction[property], false, `${field}.redaction.${property}`);
    }

    const omitted = responseRecord(record.omitted, `${field}.omitted`);
    for (const property of [
        "configuredValue",
        "runtimeValue",
        "registryValue",
        "sourceData",
        "pageData",
        "artifactBytes",
        "mediaBytes",
        "tokenValues",
    ]) {
        requireResponseEqual(omitted[property], true, `${field}.omitted.${property}`);
    }
}


function bundledSceneBridgeRealRuntimeModuleScaffoldDiagnostic(
    code: string,
    severity: "info" | "blocked" | "invalid",
    field: string,
    message: string,
    nextActions: string[]
) {
    return {
        code,
        severity,
        field,
        env: BUNDLED_SCENE_BRIDGE_REAL_RUNTIME_MODULE_GATE_ENV,
        valueRead: false,
        valuesIncluded: false,
        message,
        nextActions,
    };
}

function bundledSceneBridgeRealRuntimeModuleScaffoldResponse(
    options: Pick<RendererServiceOptions, "bundledSceneBridgeRealRuntimeModuleGate"> = {}
): Record<string, unknown> {
    const configured = options.bundledSceneBridgeRealRuntimeModuleGate?.configured === true;
    const value = options.bundledSceneBridgeRealRuntimeModuleGate?.value;
    const accepted = configured && value === BUNDLED_SCENE_BRIDGE_REAL_RUNTIME_MODULE_GATE_REVIEWED_VALUE;
    const invalid = configured && !accepted;

    if (invalid) {
        const diagnostic = bundledSceneBridgeRealRuntimeModuleScaffoldDiagnostic(
            "renderer_service_bundled_scene_bridge_real_runtime_module_scaffold_gate_invalid",
            "invalid",
            "gate.accepted",
            "The real bundled scene bridge runtime module scaffold rejected an invalid reviewed-scaffold gate value.",
            [
                `Set ${BUNDLED_SCENE_BRIDGE_REAL_RUNTIME_MODULE_GATE_ENV}=${BUNDLED_SCENE_BRIDGE_REAL_RUNTIME_MODULE_GATE_REVIEWED_VALUE} only after reviewing the P26.48 contract, or leave it unset.`,
                "Keep asset loading, browser startup, render dispatch, materialization writes, and value exposure gated.",
            ]
        );
        return {
            ...bundledSceneBridgeRealRuntimeModuleScaffoldBase,
            status: "invalid",
            source: {
                ...bundledSceneBridgeRealRuntimeModuleScaffoldBase.source,
                readiness: "invalid-real-runtime-module-scaffold-gate",
            },
            gate: {
                ...bundledSceneBridgeRealRuntimeModuleScaffoldBase.gate,
                configured: true,
                accepted: false,
                reviewedScaffoldOpen: false,
                realRuntimeSelectable: false,
                realRuntimeSelected: false,
            },
            refusalDiagnostics: {
                ...bundledSceneBridgeRealRuntimeModuleScaffoldBase.refusalDiagnostics,
                refusalReason: "real-runtime-module-scaffold-gate-invalid",
                invalidGateValue: true,
            },
            diagnostics: [diagnostic],
            diagnosticCodes: [diagnostic.code],
            nextActions: diagnostic.nextActions,
            checks: [
                { id: "real-runtime-value-contract-planned", status: "passed", required: true, dispatch: false },
                { id: "real-runtime-module-defined", status: "passed", required: true, dispatch: false },
                { id: "reviewed-scaffold-gate", status: "invalid", required: true, dispatch: false },
                { id: "no-default-asset-loading", status: "passed", required: true, dispatch: false },
                { id: "no-default-browser-startup", status: "passed", required: true, dispatch: false },
                { id: "runtime-values-redacted", status: "passed", required: true, dispatch: false },
            ],
            execution: null,
        };
    }

    if (accepted) {
        const diagnostic = bundledSceneBridgeRealRuntimeModuleScaffoldDiagnostic(
            "renderer_service_bundled_scene_bridge_real_runtime_module_scaffold_gate_reviewed",
            "info",
            "gate.reviewedScaffoldOpen",
            "The real bundled scene bridge runtime module scaffold gate is reviewed, but the module remains no-import/no-browser/no-dispatch and is not selected over the stub factory.",
            [
                "Proceed only with later reviewed tasks before importing the real module, loading assets, starting a browser, or enabling render dispatch.",
                "Keep asset loading, browser startup, render dispatch, materialization writes, and value exposure gated in P26.49.",
            ]
        );
        return {
            ...bundledSceneBridgeRealRuntimeModuleScaffoldBase,
            status: "configured-disabled",
            source: {
                ...bundledSceneBridgeRealRuntimeModuleScaffoldBase.source,
                readiness: "real-runtime-module-scaffold-gate-reviewed",
            },
            gate: {
                ...bundledSceneBridgeRealRuntimeModuleScaffoldBase.gate,
                configured: true,
                accepted: true,
                reviewedScaffoldOpen: true,
                realRuntimeSelectable: false,
                realRuntimeSelected: false,
            },
            selection: {
                ...bundledSceneBridgeRealRuntimeModuleScaffoldBase.selection,
                realFactorySelectable: false,
                realFactorySelected: false,
            },
            refusalDiagnostics: {
                ...bundledSceneBridgeRealRuntimeModuleScaffoldBase.refusalDiagnostics,
                refusalReason: "real-runtime-module-scaffold-reviewed-disabled",
            },
            diagnostics: [diagnostic],
            diagnosticCodes: [diagnostic.code],
            nextActions: diagnostic.nextActions,
            checks: [
                { id: "real-runtime-value-contract-planned", status: "passed", required: true, dispatch: false },
                { id: "real-runtime-module-defined", status: "passed", required: true, dispatch: false },
                { id: "reviewed-scaffold-gate", status: "passed", required: true, dispatch: false },
                { id: "no-default-asset-loading", status: "passed", required: true, dispatch: false },
                { id: "no-default-browser-startup", status: "passed", required: true, dispatch: false },
                { id: "runtime-values-redacted", status: "passed", required: true, dispatch: false },
            ],
            execution: null,
        };
    }

    return {
        ...bundledSceneBridgeRealRuntimeModuleScaffoldBase,
        status: configured ? "configured-disabled" : "planned-disabled",
        gate: {
            ...bundledSceneBridgeRealRuntimeModuleScaffoldBase.gate,
            configured,
            accepted: false,
            reviewedScaffoldOpen: false,
        },
        execution: null,
    };
}

function validateBundledSceneBridgeRealRuntimeModuleScaffoldResponse(actual: unknown, field: string): void {
    const record = responseRecord(actual, field);
    const status = String(record.status ?? "");
    if (!["planned-disabled", "configured-disabled", "invalid"].includes(status)) {
        responseInvalid(`${field}.status must be planned-disabled, configured-disabled, or invalid.`, `${field}.status`);
    }
    requireResponseEqual(record.scaffoldVersion, "P26.49", `${field}.scaffoldVersion`);
    requireResponseEqual(record.owner, "renderer-service", `${field}.owner`);
    requireResponseEqual(record.mode, "gated-real-runtime-module-scaffold", `${field}.mode`);

    const source = responseRecord(record.source, `${field}.source`);
    requireResponseEqual(source.realRuntimeValueContractVersion, "P26.48", `${field}.source.realRuntimeValueContractVersion`);
    requireResponseEqual(source.realRuntimeModuleScaffoldVersion, "P26.49", `${field}.source.realRuntimeModuleScaffoldVersion`);
    requireResponseEqual(source.realRuntimeImplemented, false, `${field}.source.realRuntimeImplemented`);

    const module = responseRecord(record.module, `${field}.module`);
    requireResponseEqual(module.module, "./bundled-scene-bridge-real-runtime.js", `${field}.module.module`);
    requireResponseEqual(module.exportName, "createBundledSceneBridgeRealRendererRuntime", `${field}.module.exportName`);
    requireResponseEqual(module.moduleDefined, true, `${field}.module.moduleDefined`);
    requireResponseEqual(module.moduleImported, false, `${field}.module.moduleImported`);
    requireResponseEqual(module.factoryInvoked, false, `${field}.module.factoryInvoked`);
    requireResponseEqual(module.valuesIncluded, false, `${field}.module.valuesIncluded`);

    const gate = responseRecord(record.gate, `${field}.gate`);
    requireResponseEqual(gate.env, BUNDLED_SCENE_BRIDGE_REAL_RUNTIME_MODULE_GATE_ENV, `${field}.gate.env`);
    requireResponseEqual(gate.acceptedValue, BUNDLED_SCENE_BRIDGE_REAL_RUNTIME_MODULE_GATE_REVIEWED_VALUE, `${field}.gate.acceptedValue`);
    requireResponseEqual(gate.realRuntimeSelected, false, `${field}.gate.realRuntimeSelected`);
    requireResponseEqual(gate.valuesIncluded, false, `${field}.gate.valuesIncluded`);

    const selection = responseRecord(record.selection, `${field}.selection`);
    requireResponseEqual(selection.stubFactoryDefault, true, `${field}.selection.stubFactoryDefault`);
    requireResponseEqual(selection.realFactorySelected, false, `${field}.selection.realFactorySelected`);
    requireResponseEqual(selection.replacesStubInstallation, false, `${field}.selection.replacesStubInstallation`);

    const sideEffects = responseRecord(record.sideEffects, `${field}.sideEffects`);
    for (const property of [
        "runtimeInstallation",
        "runtimeRegistration",
        "runtimeExecutionRegistered",
        "renderDispatch",
        "browserProcessStarted",
        "browserPageCreated",
        "runtimeAdapterImported",
        "runtimeFactoryInvoked",
        "runtimeAssetsLoaded",
        "assetManifestMaterialized",
        "networkDispatch",
        "dispatch",
        "localFileWrites",
    ]) {
        requireResponseEqual(sideEffects[property], false, `${field}.sideEffects.${property}`);
    }

    const redaction = responseRecord(record.redaction, `${field}.redaction`);
    for (const property of [
        "runtimeValuesIncluded",
        "registryValuesIncluded",
        "pathValuesIncluded",
        "sourceDataValuesIncluded",
        "pageValuesIncluded",
        "artifactValuesIncluded",
        "mediaValuesIncluded",
        "tokenValuesIncluded",
    ]) {
        requireResponseEqual(redaction[property], false, `${field}.redaction.${property}`);
    }

    const omitted = responseRecord(record.omitted, `${field}.omitted`);
    for (const property of [
        "configuredValue",
        "moduleNamespace",
        "factoryValue",
        "runtimeValue",
        "registryValue",
        "playwrightBrowserPath",
        "sourceData",
        "pageData",
        "artifactBytes",
        "mediaBytes",
        "tokenValues",
    ]) {
        requireResponseEqual(omitted[property], true, `${field}.omitted.${property}`);
    }

    requireResponseEqual(record.execution ?? null, null, `${field}.execution`);
}

function bundledSceneBridgeInstalledRuntimeLifecycleDiagnostic(
    code: string,
    severity: "info" | "blocked" | "invalid",
    field: string,
    message: string,
    nextActions: string[]
) {
    return {
        code,
        severity,
        field,
        env: BUNDLED_SCENE_BRIDGE_RUNTIME_INSTALLATION_GATE_ENV,
        valueRead: false,
        valuesIncluded: false,
        message,
        nextActions,
    };
}

function bundledSceneBridgeInstalledRuntimeLifecycleResponse(
    registryInstallation: Record<string, unknown>,
    registry: BundledSceneBridgeThumbnailRuntimeRegistry
): Record<string, unknown> {
    const installationSource = isRecord(registryInstallation.source) ? registryInstallation.source : {};
    const installation = isRecord(registryInstallation.installation) ? registryInstallation.installation : {};
    const installationRegistrySlot = isRecord(registryInstallation.registrySlot) ? registryInstallation.registrySlot : {};
    const installationLifecycle = isRecord(registryInstallation.lifecycleOwnership)
        ? registryInstallation.lifecycleOwnership
        : {};
    const installationDuplicate = isRecord(registryInstallation.duplicateHandling)
        ? registryInstallation.duplicateHandling
        : {};
    const installationStatus =
        typeof registryInstallation.status === "string" ? registryInstallation.status : "blocked";
    const installationInvalid = installationStatus === "invalid";
    const entry = registry.get(BUNDLED_SCENE_BRIDGE_RUNTIME_ID);
    const installedFromInstallation =
        installationStatus === "executed" &&
        registryInstallation.installationVersion === "P26.46" &&
        installation.runtimeInstalled === true &&
        installationRegistrySlot.runtimeInstalled === true &&
        installationRegistrySlot.slotStatus === "occupied";
    const installed = installedFromInstallation || Boolean(entry);

    if (installationInvalid) {
        const diagnostic = bundledSceneBridgeInstalledRuntimeLifecycleDiagnostic(
            "renderer_service_bundled_scene_bridge_installed_runtime_lifecycle_installation_invalid",
            "invalid",
            "source.registryInstallationStatus",
            "The bundled scene bridge installed-runtime lifecycle diagnostics rejected invalid P26.46 installation metadata.",
            [
                "Fix renderer-service /health bundledSceneBridgeRuntimeRegistryInstallation before trusting installed-runtime lifecycle diagnostics.",
                "Keep render dispatch, real scene assets, asset materialization writes, and runtime value exposure gated.",
            ]
        );
        return {
            ...bundledSceneBridgeInstalledRuntimeLifecycleBase,
            status: "invalid",
            source: {
                ...bundledSceneBridgeInstalledRuntimeLifecycleBase.source,
                registryInstallationStatus: installationStatus,
                registryInstallationReady: false,
                runtimeInstalled: false,
                readiness: "invalid-runtime-registry-installation",
            },
            refusalDiagnostics: {
                ...bundledSceneBridgeInstalledRuntimeLifecycleBase.refusalDiagnostics,
                refusalReason: "installation-invalid",
                invalidInstallationMetadata: true,
            },
            diagnostics: [diagnostic],
            diagnosticCodes: [diagnostic.code],
            nextActions: diagnostic.nextActions,
            checks: [
                { id: "registry-installation-executed", status: "invalid", required: true, dispatch: false },
                { id: "registry-slot-occupied", status: "invalid", required: true, dispatch: false },
                { id: "close-hook-registered", status: "invalid", required: true, dispatch: false },
                { id: "rollback-readiness", status: "invalid", required: true, dispatch: false },
                { id: "duplicate-replacement-policy", status: "invalid", required: true, dispatch: false },
                { id: "runtime-values-redacted", status: "passed", required: true, dispatch: false },
            ],
            execution: null,
        };
    }

    if (!installed) {
        const diagnostic = bundledSceneBridgeInstalledRuntimeLifecycleDiagnostic(
            "renderer_service_bundled_scene_bridge_installed_runtime_lifecycle_not_installed",
            "blocked",
            "source.runtimeInstalled",
            "The bundled scene bridge installed-runtime lifecycle diagnostics are blocked until P26.46 registry installation reports an installed runtime.",
            [
                "Verify renderer-service /health bundledSceneBridgeRuntimeRegistryInstallation reports executed with an occupied registry slot.",
                "Keep render dispatch, real scene assets, asset materialization writes, and runtime value exposure gated.",
            ]
        );
        return {
            ...bundledSceneBridgeInstalledRuntimeLifecycleBase,
            status: "not-installed",
            source: {
                ...bundledSceneBridgeInstalledRuntimeLifecycleBase.source,
                registryInstallationStatus: installationStatus,
                registryInstallationReady: installationStatus === "executed",
                runtimeInstalled: false,
                readiness: "blocked-until-runtime-registry-installation",
            },
            diagnostics: [diagnostic],
            diagnosticCodes: [diagnostic.code],
            nextActions: diagnostic.nextActions,
            execution: null,
        };
    }

    const closeHookRegistered =
        entry?.closeHookRegistered === true ||
        installation.closeHookRegistered === true ||
        installationLifecycle.closeHookRegistered === true;
    const rollbackHookRegistered =
        entry?.rollbackHookRegistered === true ||
        installation.rollbackHookRegistered === true ||
        installationLifecycle.rollbackHookRegistered === true;
    const closeHookCallable = entry ? typeof entry.runtimeValue.close === "function" : closeHookRegistered;
    const existingRuntimeFound =
        installationDuplicate.existingRuntimeFound === true || Boolean(entry);
    const duplicateDetected = installationDuplicate.duplicateDetected === true || Boolean(entry);
    const diagnostic = bundledSceneBridgeInstalledRuntimeLifecycleDiagnostic(
        "renderer_service_bundled_scene_bridge_installed_runtime_lifecycle_reported",
        "info",
        "registrySlot.slotOccupied",
        "The bundled scene bridge installed-runtime lifecycle diagnostics report an occupied registry slot with close/rollback readiness and no-dispatch availability.",
        [
            "Keep render dispatch disabled until a later reviewed task wires the installed runtime into gated thumbnail execution.",
            "Proceed to the next reviewed runtime contract slice without exposing runtime values or enabling default MCP/CLI rendering.",
        ]
    );

    return {
        ...bundledSceneBridgeInstalledRuntimeLifecycleBase,
        status: "installed",
        source: {
            ...bundledSceneBridgeInstalledRuntimeLifecycleBase.source,
            registryInstallationStatus: installationStatus,
            registryInstallationReady: true,
            runtimeInstalled: true,
            readiness: "installed-runtime-lifecycle-reported",
        },
        registrySlot: {
            ...bundledSceneBridgeInstalledRuntimeLifecycleBase.registrySlot,
            slotStatus: "occupied",
            slotOccupied: true,
            runtimeInstalled: true,
        },
        lifecycleHooks: {
            ...bundledSceneBridgeInstalledRuntimeLifecycleBase.lifecycleHooks,
            closeHookRegistered,
            rollbackHookRegistered,
            closeHookCallable,
        },
        duplicateReplacementPolicy: {
            ...bundledSceneBridgeInstalledRuntimeLifecycleBase.duplicateReplacementPolicy,
            existingRuntimeFound,
            duplicateDetected,
            replacementSupported: false,
            replacementAttempted: false,
        },
        rollbackReadiness: {
            ...bundledSceneBridgeInstalledRuntimeLifecycleBase.rollbackReadiness,
            rollbackReady: rollbackHookRegistered,
            rollbackHookRegistered,
        },
        runtimeAvailability: {
            ...bundledSceneBridgeInstalledRuntimeLifecycleBase.runtimeAvailability,
            runtimeInstalled: true,
            runtimeValueAvailable: false,
            runtimeAvailableForDispatch: false,
            renderDispatchEnabled: false,
        },
        refusalDiagnostics: {
            refusalRequired: false,
            refusalReason: "installed-without-dispatch",
            invalidInstallationMetadata: false,
            renderDispatchRefused: true,
            runtimeValueExposureRefused: true,
            valuesIncluded: false,
        },
        diagnostics: [diagnostic],
        diagnosticCodes: [diagnostic.code],
        nextActions: diagnostic.nextActions,
        checks: [
            { id: "registry-installation-executed", status: "passed", required: true, dispatch: false },
            { id: "registry-slot-occupied", status: "passed", required: true, dispatch: false },
            { id: "close-hook-registered", status: closeHookRegistered ? "passed" : "failed", required: true, dispatch: false },
            { id: "rollback-readiness", status: rollbackHookRegistered ? "passed" : "failed", required: true, dispatch: false },
            { id: "duplicate-replacement-policy", status: "passed", required: true, dispatch: false },
            { id: "runtime-values-redacted", status: "passed", required: true, dispatch: false },
        ],
        sideEffects: {
            ...bundledSceneBridgeInstalledRuntimeLifecycleBase.sideEffects,
            registryLookup: true,
        },
        execution: {
            attempted: false,
            succeeded: true,
            outcome: "lifecycle-reported",
            runtimeInstalled: true,
            slotOccupied: true,
            closeHookRegistered,
            rollbackHookRegistered,
            renderDispatch: false,
            valuesIncluded: false,
        },
    };
}

function defaultBrowserFixtureRuntimeLifecycleDiagnostics(
    runtimeSource: RendererRuntimeSource,
    {
        configured = false,
        enabled = false,
        runtimeModuleConfigured = false,
        injectedRuntimeConfigured = false,
    }: {
        configured?: boolean;
        enabled?: boolean;
        runtimeModuleConfigured?: boolean;
        injectedRuntimeConfigured?: boolean;
    } = {}
): RendererBrowserFixtureRuntimeLifecycleDiagnostics {
    return {
        status: "not-configured",
        diagnosticsVersion: "P26.31",
        owner: "renderer-service",
        mode: "browser-fixture-lifecycle",
        runtimeSource,
        configured,
        enabled,
        runtimeModuleConfigured,
        injectedRuntimeConfigured,
        browser: {
            engine: "chromium",
            headless: true,
            processStarted: false,
            startupAttempted: false,
            startupSucceeded: false,
            closed: false,
            pathValuesIncluded: false,
        },
        lifecycle: {
            startupAttempted: false,
            startupSucceeded: false,
            startupFailed: false,
            renderAttempts: 0,
            renderSuccesses: 0,
            renderFailures: 0,
            lastRenderSucceeded: null,
            pageCreateCount: 0,
            pageReuseValidated: false,
            nonEmptyPngValidated: false,
            closeAttempted: false,
            closeSucceeded: false,
            closeFailed: false,
            artifactByteLengthIncluded: false,
        },
        sideEffects: {
            browserProcessStarted: false,
            runtimeExecutionRegistered: false,
            runtimeAdapterImported: false,
            runtimeAssetsLoaded: false,
            assetManifestMaterialized: false,
            networkDispatch: false,
            dispatch: false,
            localFileWrites: false,
        },
        redaction: {
            sourceDataValuesIncluded: false,
            pageValuesIncluded: false,
            artifactValuesIncluded: false,
            mediaValuesIncluded: false,
            tokenValuesIncluded: false,
            pathValuesIncluded: false,
        },
        omitted: {
            playwrightBrowserPath: true,
            runtimeModulePath: true,
            workspaceRoot: true,
            cacheRoot: true,
            sourceData: true,
            pageData: true,
            artifactBytes: true,
            mediaBytes: true,
            tokenValues: true,
        },
    };
}

export const defaultBrowserFixtureRuntimeLifecycle = defaultBrowserFixtureRuntimeLifecycleDiagnostics("none");

export const healthResponse = {
    status: "ok",
    renderer: "penpot-thumbnail-renderer",
    mode: "noop",
    runtimeRegistration: false,
    dispatch: false,
    capabilities: [
        "health",
        "thumbnail.render.noop",
        "thumbnail.render.validate",
        "thumbnail.render.auth-summary",
        "thumbnail.backend-rpc.client-plan",
        "thumbnail.backend-rpc.request-envelope",
        "thumbnail.backend-rpc.pipeline-plan",
        "thumbnail.backend-rpc.file-cache-probe",
        "thumbnail.backend-rpc.frame-cache-probe",
        "thumbnail.backend-rpc.file-source-data-read",
        "thumbnail.backend-rpc.frame-source-data-read",
        "thumbnail.backend-rpc.file-render-input-summary",
        "thumbnail.render.runtime-adapter",
        "thumbnail.render.runtime-module",
        "thumbnail.render.browser-fixture-runtime",
        "thumbnail.render.browser-fixture-runtime-diagnostics",
        "thumbnail.render.runtime-asset-manifest",
        "thumbnail.render.runtime-asset-preflight",
        "thumbnail.render.runtime-asset-materialization-dry-run",
        "thumbnail.render.runtime-asset-materialization-approval-scaffold",
        "thumbnail.render.runtime-asset-materialization-execution",
        "thumbnail.render.bundled-scene-bridge-real-scene-png",
        "thumbnail.render.bundled-scene-bridge-contract",
        "thumbnail.render.bundled-scene-bridge-adapter-module",
        "thumbnail.render.bundled-scene-bridge-import-gate",
        "thumbnail.render.bundled-scene-bridge-factory-shape-preflight",
        "thumbnail.render.bundled-scene-bridge-module-namespace-import-preflight",
        "thumbnail.render.bundled-scene-bridge-factory-invocation-preflight",
        "thumbnail.render.bundled-scene-bridge-runtime-registration-preflight",
        "thumbnail.render.bundled-scene-bridge-runtime-registry-registration-boundary",
        "thumbnail.render.bundled-scene-bridge-runtime-registry-installation-contract",
        "thumbnail.render.bundled-scene-bridge-runtime-registry-installation-gate",
        "thumbnail.render.bundled-scene-bridge-runtime-registry-installation-preflight",
        "thumbnail.render.bundled-scene-bridge-runtime-registry-installation-execution-boundary",
        "thumbnail.render.bundled-scene-bridge-runtime-registry-installation",
        "thumbnail.render.bundled-scene-bridge-installed-runtime-lifecycle",
        "thumbnail.render.bundled-scene-bridge-real-runtime-value-contract",
        "thumbnail.render.bundled-scene-bridge-real-runtime-module-scaffold",
        "thumbnail.render.bundled-scene-bridge-installed-runtime-render-dispatch",
        "thumbnail.backend-rpc.file-thumbnail-persist",
        "thumbnail.backend-rpc.frame-thumbnail-persist",
    ],
    runtimeAssetManifest: bundledRuntimeBridgeAssetManifest,
    runtimeAssetMaterializationPreflight: bundledRuntimeAssetMaterializationPreflight,
    runtimeAssetMaterializationDryRun: bundledRuntimeAssetMaterializationDryRunPlan,
    runtimeAssetMaterializationApproval: bundledRuntimeAssetMaterializationApprovalPlan,
    runtimeAssetMaterializationExecution,
    bundledSceneBridgeRealScenePng,
    bundledSceneBridgeContract,
    bundledSceneBridgeAdapterModule,
    bundledSceneBridgeImportGate,
    bundledSceneBridgeFactoryShapePreflight,
    bundledSceneBridgeModuleNamespaceImportPreflight,
    bundledSceneBridgeFactoryInvocationPreflight,
    bundledSceneBridgeRuntimeRegistrationPreflight,
    bundledSceneBridgeRuntimeRegistryRegistrationBoundary,
    bundledSceneBridgeRuntimeRegistryInstallationContract,
    bundledSceneBridgeRuntimeRegistryInstallationGate,
    bundledSceneBridgeRuntimeRegistryInstallationPreflight,
    bundledSceneBridgeRuntimeRegistryInstallationExecutionBoundary,
    bundledSceneBridgeRuntimeRegistryInstallation,
    bundledSceneBridgeInstalledRuntimeLifecycle,
    bundledSceneBridgeRealRuntimeValueContract,
    bundledSceneBridgeRealRuntimeModuleScaffold,
    bundledSceneBridgeInstalledRuntimeRenderDispatch,
    browserFixtureRuntime: defaultBrowserFixtureRuntimeLifecycle,
} as const;

export const noopThumbnailResponse = {
    status: "ok",
    resource: {
        mediaId: "noop-thumbnail-png",
        resourceUri: "/assets/by-id/noop-thumbnail-png",
        downloadUri: "/assets/by-id/noop-thumbnail-png",
        contentType: "image/png",
    },
    cache: {
        outcome: "rendered",
    },
    renderer: {
        runtime: "noop-png-fixture",
        fallbackUsed: false,
    },
    runtimeRegistration: false,
    dispatch: true,
    localFileWrites: false,
    runtimeAssetManifest: bundledRuntimeBridgeAssetManifest,
    runtimeAssetMaterializationPreflight: bundledRuntimeAssetMaterializationPreflight,
    runtimeAssetMaterializationDryRun: bundledRuntimeAssetMaterializationDryRunPlan,
    runtimeAssetMaterializationApproval: bundledRuntimeAssetMaterializationApprovalPlan,
    runtimeAssetMaterializationExecution,
    bundledSceneBridgeRealScenePng,
    bundledSceneBridgeContract,
    bundledSceneBridgeAdapterModule,
    bundledSceneBridgeImportGate,
    bundledSceneBridgeFactoryShapePreflight,
    bundledSceneBridgeModuleNamespaceImportPreflight,
    bundledSceneBridgeFactoryInvocationPreflight,
    bundledSceneBridgeRuntimeRegistrationPreflight,
    bundledSceneBridgeRuntimeRegistryRegistrationBoundary,
    bundledSceneBridgeRuntimeRegistryInstallationContract,
    bundledSceneBridgeRuntimeRegistryInstallationGate,
    bundledSceneBridgeRuntimeRegistryInstallationPreflight,
    bundledSceneBridgeRuntimeRegistryInstallationExecutionBoundary,
    bundledSceneBridgeRuntimeRegistryInstallation,
    bundledSceneBridgeInstalledRuntimeLifecycle,
    bundledSceneBridgeRealRuntimeValueContract,
    bundledSceneBridgeRealRuntimeModuleScaffold,
    bundledSceneBridgeInstalledRuntimeRenderDispatch,
    browserFixtureRuntime: defaultBrowserFixtureRuntimeLifecycle,
} as const;

const MAX_REQUEST_BODY_BYTES = 1024 * 1024;

const noopPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64"
);

type ThumbnailRequestSummary = {
    operation: "thumbnail.render";
    targetKind: "file" | "frame";
    fileId: string;
    pageId: string | null;
    objectId: string | null;
    objectKey: string | null;
    tag: string | null;
    revn: number | null;
    format: "png";
    cachePolicy: "reuse" | "refresh";
    cacheScope: "file-thumbnail" | "file-object-thumbnail";
    cacheKey: string;
    cacheProbe: "file-thumbnail-by-file-id-and-revn" | "file-object-thumbnail-by-object-key" | null;
    width: number;
    height: number;
    mimeType: "image/png";
    extension: ".png";
    renderRequired: true | "on-cache-miss";
    renderRuntime: "render-wasm-worker";
    renderFallback: "frontend-rasterizer";
    backendRpc: BackendRpcSummary;
};

type BackendRpcEntrySummary = {
    command: string;
    method: string | null;
    requestPresent: boolean;
};

type BackendRpcSummary = {
    data: BackendRpcEntrySummary;
    persist: BackendRpcEntrySummary | null;
    cacheMissPersist: BackendRpcEntrySummary | null;
};

type BackendRpcRequestEnvelopeSummary = {
    status: "planned-disabled";
    transport: "penpot-rpc-json" | "penpot-rpc-multipart";
    method: string | null;
    requestKeys: string[];
    queryKeys: string[];
    bodyKeys: string[];
    requestValuesIncluded: false;
    mediaValuesIncluded: false;
    tokenValuesIncluded: false;
    dispatch: false;
};

type BackendRpcClientEntrySummary = BackendRpcEntrySummary & {
    endpoint: string | null;
    dispatch: false;
    requestEnvelope: BackendRpcRequestEnvelopeSummary;
};

type BackendRpcCacheProbeSummary = {
    status: "planned-disabled" | "executed";
    strategy: Exclude<ThumbnailRequestSummary["cacheProbe"], null>;
    condition: "before-source-data-read";
    scope: ThumbnailRequestSummary["cacheScope"];
    key: ThumbnailRequestSummary["cacheKey"];
    requestKeys: string[];
    command: "get-file-thumbnail" | "get-file-object-thumbnail" | null;
    endpoint: string | null;
    hitResult: "resource-metadata";
    missResult: "continue-pipeline";
    result: "hit" | "miss" | null;
    cacheRead: boolean;
    networkDispatch: boolean;
    dispatch: boolean;
    cacheHitValuesIncluded: false;
    resourceValuesIncluded: false;
    mediaValuesIncluded: false;
    tokenValuesIncluded: false;
};

type BackendRpcPipelineStageSummary = {
    name: "cache-probe" | "source-data-read" | "render" | "thumbnail-persist";
    status: "planned-disabled" | "executed";
    condition: "always" | "on-cache-miss";
    entry: "data" | "persist" | "cacheMissPersist" | null;
    command: string | null;
    cacheProbe: ThumbnailRequestSummary["cacheProbe"];
    runtime: ThumbnailRequestSummary["renderRuntime"] | null;
    dispatch: boolean;
};

type BackendRpcPipelineSummary = {
    status: "planned-disabled" | "cache-probe-executed" | "source-data-read-executed" | "render-executed" | "persist-executed";
    cachePolicy: ThumbnailRequestSummary["cachePolicy"];
    cacheHitShortCircuit: boolean;
    orderedStages: BackendRpcPipelineStageSummary[];
    networkDispatch: boolean;
    cacheRead: boolean;
    dataRead: boolean;
    renderDispatch: boolean;
    persistWrite: boolean;
    sourceDataValuesIncluded: false;
    artifactValuesIncluded: false;
    tokenValuesIncluded: false;
};

type BackendRpcRenderInputSummary = {
    status: "source-data-ready";
    condition: "after-source-data-read";
    sourceDataRead: true;
    sourceDataEndpoint: string;
    targetKind: ThumbnailRequestSummary["targetKind"];
    identityKeys: ["file-id", "revn"] | ["file-id", "page-id", "object-id"];
    revisionSource: "backend-source-data";
    requestRevision: "matched" | "not-provided" | "resolved";
    revisionValueIncluded: false;
    cachePolicy: ThumbnailRequestSummary["cachePolicy"];
    cacheScope: ThumbnailRequestSummary["cacheScope"];
    cacheKey: ThumbnailRequestSummary["cacheKey"];
    artifactFormat: "png";
    artifactMimeType: "image/png";
    artifactWidth: number;
    artifactHeight: number;
    renderRuntime: ThumbnailRequestSummary["renderRuntime"];
    renderFallback: ThumbnailRequestSummary["renderFallback"];
    renderDispatch: boolean;
    sourceDataValuesIncluded: false;
    pageValuesIncluded: false;
    artifactValuesIncluded: false;
    mediaValuesIncluded: false;
    tokenValuesIncluded: false;
};

type BackendRpcRenderOutputSummary = {
    status: "artifact-ready";
    condition: "after-render";
    runtime: ThumbnailRequestSummary["renderRuntime"] | "frontend-rasterizer";
    fallbackUsed: boolean;
    artifactFormat: "png";
    artifactMimeType: "image/png";
    artifactByteLength: number;
    renderDispatch: true;
    localFileWrites: false;
    sourceDataValuesIncluded: false;
    pageValuesIncluded: false;
    artifactValuesIncluded: false;
    mediaValuesIncluded: false;
    tokenValuesIncluded: false;
};

type BackendRpcPersistOutputSummary = {
    status: "persisted";
    condition: "after-render";
    entry: "persist" | "cacheMissPersist";
    command: "create-file-thumbnail" | "create-file-object-thumbnail";
    endpoint: string;
    targetKind: ThumbnailRequestSummary["targetKind"];
    identityKeys: ["file-id", "revn"] | ["file-id", "object-id", "tag"];
    revisionSource: "backend-source-data";
    requestRevision: "matched" | "resolved";
    artifactFormat: "png";
    artifactMimeType: "image/png";
    artifactByteLength: number;
    resourceFrom: "backend-create-file-thumbnail" | "backend-create-file-object-thumbnail";
    persistWrite: true;
    localFileWrites: false;
    requestValuesIncluded: false;
    resourceValuesIncluded: false;
    mediaValuesIncluded: false;
    artifactValuesIncluded: false;
    tokenValuesIncluded: false;
};

type BackendRpcClientSummary = {
    status: "not-configured" | "configured-disabled" | "cache-probe-executed" | "source-data-read-executed" | "render-executed" | "persist-executed";
    baseUriConfigured: boolean;
    baseUri: string | null;
    networkDispatch: boolean;
    cacheRead: boolean;
    dataRead: boolean;
    persistWrite: boolean;
    authForwarding: AuthSummary;
    entries: {
        data: BackendRpcClientEntrySummary;
        persist: BackendRpcClientEntrySummary | null;
        cacheMissPersist: BackendRpcClientEntrySummary | null;
    };
    cacheProbe: BackendRpcCacheProbeSummary | null;
    pipeline: BackendRpcPipelineSummary;
    renderInput: BackendRpcRenderInputSummary | null;
    renderOutput: BackendRpcRenderOutputSummary | null;
    persistOutput: BackendRpcPersistOutputSummary | null;
};

type BackendRpcCacheProbeExecution = {
    executed: boolean;
    endpoint: string | null;
    hit: boolean | null;
    mediaId: string | null;
    resourceUri: string | null;
    downloadUri: string | null;
};

type BackendRpcSourceDataReadExecution = {
    executed: boolean;
    endpoint: string | null;
    revn: number | null;
    sourceData: RendererRuntimeRenderInput["sourceData"] | null;
};

type ThumbnailRenderExecution = {
    executed: boolean;
    mediaId: string | null;
    resourceUri: string | null;
    runtime: NonNullable<RendererRuntimeRenderResult["runtime"]> | null;
    fallbackUsed: boolean;
    artifactByteLength: number | null;
    bytes: Buffer | null;
};

type BackendRpcThumbnailPersistExecution = {
    executed: boolean;
    endpoint: string | null;
    entry: "persist" | "cacheMissPersist" | null;
    command: "create-file-thumbnail" | "create-file-object-thumbnail" | null;
    mediaId: string | null;
    resourceUri: string | null;
    downloadUri: string | null;
    artifactByteLength: number | null;
};

type RenderedAsset = {
    contentType: "image/png";
    bytes: Buffer;
};

type RenderedAssetStore = Map<string, RenderedAsset>;

type RuntimeAssetPreflightExecutionAssetCheck = {
    id: string;
    assetId: string;
    kind: string;
    publicPath: string;
    cachePath: string;
    required: boolean;
    readiness: "ready" | "missing";
    exists: boolean;
    cacheOutputExists: boolean;
    sha256: string | null;
    byteLength: number | null;
    fileRead: boolean;
    hashComputed: boolean;
    dispatch: false;
    localFileWrites: false;
};

type RuntimeAssetPreflightExecutionCacheOutputCheck = {
    id: string;
    cacheOutputId: string;
    path: string;
    readiness: "ready" | "missing";
    exists: boolean;
    writable: boolean;
    fileRead: false;
    localFileWrites: false;
};

type RuntimeAssetPreflightExecutionDiagnosticCode =
    | "renderer_service_runtime_asset_missing_public_asset"
    | "renderer_service_runtime_asset_missing_cache_asset"
    | "renderer_service_runtime_asset_hash_unavailable"
    | "renderer_service_runtime_asset_cache_output_unavailable";

type RuntimeAssetPreflightExecutionDiagnostic = {
    code: RuntimeAssetPreflightExecutionDiagnosticCode;
    severity: "degraded";
    category: "public-asset" | "cache-asset" | "asset-hash" | "cache-output";
    assetId: string | null;
    cacheOutputId: string | null;
    retryable: boolean;
    message: string;
    nextActions: string[];
    dispatch: false;
    localFileWrites: false;
};

type RuntimeAssetPreflightExecution = {
    status: "executed";
    executionVersion: "P26.22";
    mode: "read-only";
    diagnosticsVersion: "P26.25";
    readiness: "ready" | "degraded";
    workspaceRoot: string;
    cacheRoot: string;
    checks: RuntimeAssetPreflightExecutionAssetCheck[];
    cacheOutputChecks: RuntimeAssetPreflightExecutionCacheOutputCheck[];
    diagnostics: RuntimeAssetPreflightExecutionDiagnostic[];
    nextActions: string[];
    summary: {
        ready: boolean;
        readyAssetIds: string[];
        missingAssetIds: string[];
        readyCacheOutputIds: string[];
        missingCacheOutputIds: string[];
    };
    sideEffects: {
        browserProcessStarted: false;
        runtimeExecutionRegistered: false;
        runtimeAdapterImported: false;
        runtimeAssetsLoaded: false;
        assetManifestMaterialized: false;
        fileRead: boolean;
        hashComputed: boolean;
        networkDispatch: false;
        dispatch: false;
        localFileWrites: false;
    };
    redaction: {
        sourceDataValuesIncluded: false;
        pageValuesIncluded: false;
        artifactValuesIncluded: false;
        mediaValuesIncluded: false;
        tokenValuesIncluded: false;
    };
};

type RendererServiceRuntimeOptions = Pick<
    RendererServiceOptions,
    | "backendRpc"
    | "renderer"
    | "rendererRuntimeModule"
    | "browserFixtureRuntime"
    | "rendererRuntimeSource"
    | "runtimeAssetPreflight"
    | "runtimeAssetMaterializationApproval"
    | "bundledSceneBridgeImportGate"
    | "bundledSceneBridgeRuntimeRegistryInstallationGate"
    | "bundledSceneBridgeRealRuntimeModuleGate"
    | "bundledSceneBridgeRenderDispatchGate"
    | "thumbnailResponseOverride"
> & {
    renderedAssets: RenderedAssetStore;
    bundledSceneBridgeThumbnailRuntimeRegistry: BundledSceneBridgeThumbnailRuntimeRegistry;
};

type AuthSummary = {
    mode: "caller-session";
    authorizationPresent: boolean;
    cookiePresent: boolean;
    authTokenCookiePresent: boolean;
    tokenValuesIncluded: false;
};

type RendererError = Error & {
    code?: string;
    field?: string;
    status?: number;
    retryable?: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown): string | null {
    return typeof value === "string" && value.trim() ? value : null;
}

function rendererStartupError(message: string, code: string, field: string, cause?: unknown): never {
    throw Object.assign(new Error(message), {
        code,
        field,
        status: 500,
        retryable: false,
        ...(cause ? { cause } : {}),
    });
}

function normalizeRuntimeAssetPreflightRoot(value: string | undefined, field: string): string {
    const root = optionalString(value);
    if (!root) {
        rendererStartupError("Renderer-service runtime asset preflight root is required.", "renderer_service_runtime_asset_preflight_root_required", field);
    }
    if (!isAbsolute(root)) {
        rendererStartupError("Renderer-service runtime asset preflight root must be an absolute path.", "renderer_service_runtime_asset_preflight_root_invalid", field);
    }
    return root;
}

function remapRuntimeAssetCachePath(path: string, cacheRoot: string): string {
    if (cacheRoot === RENDERER_SERVICE_CACHE_ROOT) {
        return path;
    }

    const prefix = `${RENDERER_SERVICE_CACHE_ROOT}/`;
    if (path === RENDERER_SERVICE_CACHE_ROOT) {
        return cacheRoot;
    }
    if (path.startsWith(prefix)) {
        return resolve(cacheRoot, path.slice(prefix.length));
    }
    return path;
}

async function filesystemEntryExists(path: string): Promise<boolean> {
    try {
        await stat(path);
        return true;
    } catch {
        return false;
    }
}

async function filesystemEntryWritable(path: string): Promise<boolean> {
    try {
        await access(path, fsConstants.W_OK);
        return true;
    } catch {
        return false;
    }
}

async function runtimeAssetHash(path: string, exists: boolean): Promise<{ sha256: string | null; byteLength: number | null; fileRead: boolean; hashComputed: boolean }> {
    if (!exists) {
        return {
            sha256: null,
            byteLength: null,
            fileRead: false,
            hashComputed: false,
        };
    }

    try {
        const bytes = await readFile(path);
        return {
            sha256: createHash("sha256").update(bytes).digest("hex"),
            byteLength: bytes.byteLength,
            fileRead: true,
            hashComputed: true,
        };
    } catch {
        return {
            sha256: null,
            byteLength: null,
            fileRead: false,
            hashComputed: false,
        };
    }
}

function uniqueStrings(values: string[]): string[] {
    return [...new Set(values)];
}

function runtimeAssetPreflightDiagnostic(
    diagnostic: Omit<RuntimeAssetPreflightExecutionDiagnostic, "dispatch" | "localFileWrites">
): RuntimeAssetPreflightExecutionDiagnostic {
    return {
        ...diagnostic,
        dispatch: false,
        localFileWrites: false,
    };
}

function runtimeAssetPreflightDiagnostics(
    checks: RuntimeAssetPreflightExecutionAssetCheck[],
    cacheOutputChecks: RuntimeAssetPreflightExecutionCacheOutputCheck[]
): RuntimeAssetPreflightExecutionDiagnostic[] {
    const diagnostics: RuntimeAssetPreflightExecutionDiagnostic[] = [];

    for (const check of checks) {
        if (!check.exists) {
            diagnostics.push(
                runtimeAssetPreflightDiagnostic({
                    code: "renderer_service_runtime_asset_missing_public_asset",
                    severity: "degraded",
                    category: "public-asset",
                    assetId: check.assetId,
                    cacheOutputId: null,
                    retryable: true,
                    message: `Runtime asset public file is missing for ${check.assetId}.`,
                    nextActions: [
                        `Set ${RUNTIME_ASSET_PREFLIGHT_WORKSPACE_ROOT_ENV} to the Penpot workspace root before starting renderer-service.`,
                        "Build or restore the frontend public runtime assets, then rerun renderer-service /health.",
                    ],
                })
            );
        } else if (!check.hashComputed) {
            diagnostics.push(
                runtimeAssetPreflightDiagnostic({
                    code: "renderer_service_runtime_asset_hash_unavailable",
                    severity: "degraded",
                    category: "asset-hash",
                    assetId: check.assetId,
                    cacheOutputId: null,
                    retryable: true,
                    message: `Runtime asset hash could not be computed for ${check.assetId}.`,
                    nextActions: [
                        "Ensure the renderer-service process can read the public runtime asset.",
                        "Rerun renderer-service /health after fixing local file permissions.",
                    ],
                })
            );
        }

        if (check.exists && !check.cacheOutputExists) {
            diagnostics.push(
                runtimeAssetPreflightDiagnostic({
                    code: "renderer_service_runtime_asset_missing_cache_asset",
                    severity: "degraded",
                    category: "cache-asset",
                    assetId: check.assetId,
                    cacheOutputId: null,
                    retryable: true,
                    message: `Runtime asset cache copy is missing for ${check.assetId}.`,
                    nextActions: [
                        `Set ${RUNTIME_ASSET_PREFLIGHT_CACHE_ROOT_ENV} to a writable renderer-service cache root.`,
                        "Materialize the renderer-service runtime asset cache, then rerun renderer-service /health.",
                    ],
                })
            );
        }
    }

    for (const check of cacheOutputChecks) {
        if (check.readiness !== "ready") {
            diagnostics.push(
                runtimeAssetPreflightDiagnostic({
                    code: "renderer_service_runtime_asset_cache_output_unavailable",
                    severity: "degraded",
                    category: "cache-output",
                    assetId: null,
                    cacheOutputId: check.cacheOutputId,
                    retryable: true,
                    message: `Runtime asset cache output is unavailable for ${check.cacheOutputId}.`,
                    nextActions: [
                        `Create or repair the cache output under ${RUNTIME_ASSET_PREFLIGHT_CACHE_ROOT_ENV}.`,
                        "Ensure the renderer-service process can write to the configured cache root.",
                    ],
                })
            );
        }
    }

    return diagnostics;
}

export async function executeRuntimeAssetMaterializationPreflight(
    options: RendererRuntimeAssetPreflightOptions | undefined
): Promise<RuntimeAssetPreflightExecution | null> {
    if (options?.executeReadOnly !== true) {
        return null;
    }

    const workspaceRoot = normalizeRuntimeAssetPreflightRoot(options.workspaceRoot, "runtimeAssetPreflight.workspaceRoot");
    const cacheRoot = normalizeRuntimeAssetPreflightRoot(options.cacheRoot ?? RENDERER_SERVICE_CACHE_ROOT, "runtimeAssetPreflight.cacheRoot");

    const checks: RuntimeAssetPreflightExecutionAssetCheck[] = [];
    for (const plannedCheck of bundledRuntimeAssetMaterializationPreflight.checks) {
        const resolvedPublicPath = isAbsolute(plannedCheck.publicPath) ? plannedCheck.publicPath : resolve(workspaceRoot, plannedCheck.publicPath);
        const resolvedCachePath = remapRuntimeAssetCachePath(plannedCheck.cachePath, cacheRoot);
        const exists = await filesystemEntryExists(resolvedPublicPath);
        const cacheOutputExists = await filesystemEntryExists(resolvedCachePath);
        const hash = await runtimeAssetHash(resolvedPublicPath, exists);
        const readiness = exists && cacheOutputExists && hash.hashComputed ? "ready" : "missing";
        checks.push({
            id: plannedCheck.id,
            assetId: plannedCheck.assetId,
            kind: plannedCheck.kind,
            publicPath: plannedCheck.publicPath,
            cachePath: plannedCheck.cachePath,
            required: plannedCheck.required,
            readiness,
            exists,
            cacheOutputExists,
            sha256: hash.sha256,
            byteLength: hash.byteLength,
            fileRead: hash.fileRead,
            hashComputed: hash.hashComputed,
            dispatch: false,
            localFileWrites: false,
        });
    }

    const cacheOutputChecks: RuntimeAssetPreflightExecutionCacheOutputCheck[] = [];
    for (const entry of bundledRuntimeAssetMaterializationPreflight.cacheOutputChecks) {
        const resolvedPath = remapRuntimeAssetCachePath(entry.path, cacheRoot);
        const exists = await filesystemEntryExists(resolvedPath);
        const writable = exists ? await filesystemEntryWritable(resolvedPath) : false;
        cacheOutputChecks.push({
            id: entry.id,
            cacheOutputId: entry.cacheOutputId,
            path: entry.path,
            readiness: exists && writable ? "ready" : "missing",
            exists,
            writable,
            fileRead: false,
            localFileWrites: false,
        });
    }

    const readyAssetIds = checks.filter((entry) => entry.readiness === "ready").map((entry) => entry.assetId);
    const missingAssetIds = checks.filter((entry) => entry.readiness !== "ready").map((entry) => entry.assetId);
    const readyCacheOutputIds = cacheOutputChecks.filter((entry) => entry.readiness === "ready").map((entry) => entry.cacheOutputId);
    const missingCacheOutputIds = cacheOutputChecks.filter((entry) => entry.readiness !== "ready").map((entry) => entry.cacheOutputId);
    const ready = missingAssetIds.length === 0 && missingCacheOutputIds.length === 0;
    const fileRead = checks.some((entry) => entry.fileRead);
    const hashComputed = checks.some((entry) => entry.hashComputed);
    const diagnostics = runtimeAssetPreflightDiagnostics(checks, cacheOutputChecks);
    const nextActions = uniqueStrings(diagnostics.flatMap((diagnostic) => diagnostic.nextActions));

    return {
        status: "executed",
        executionVersion: "P26.22",
        mode: "read-only",
        diagnosticsVersion: "P26.25",
        readiness: ready ? "ready" : "degraded",
        workspaceRoot,
        cacheRoot,
        checks,
        cacheOutputChecks,
        diagnostics,
        nextActions,
        summary: {
            ready,
            readyAssetIds,
            missingAssetIds,
            readyCacheOutputIds,
            missingCacheOutputIds,
        },
        sideEffects: {
            browserProcessStarted: false,
            runtimeExecutionRegistered: false,
            runtimeAdapterImported: false,
            runtimeAssetsLoaded: false,
            assetManifestMaterialized: false,
            fileRead,
            hashComputed,
            networkDispatch: false,
            dispatch: false,
            localFileWrites: false,
        },
        redaction: {
            sourceDataValuesIncluded: false,
            pageValuesIncluded: false,
            artifactValuesIncluded: false,
            mediaValuesIncluded: false,
            tokenValuesIncluded: false,
        },
    };
}

async function runtimeAssetMaterializationPreflightResponse(
    options: RendererRuntimeAssetPreflightOptions | undefined
): Promise<Record<string, unknown>> {
    return {
        ...bundledRuntimeAssetMaterializationPreflight,
        execution: await executeRuntimeAssetMaterializationPreflight(options),
    };
}

function runtimeAssetMaterializationDryRunResponse(preflight: Record<string, unknown>): RuntimeAssetMaterializationDryRunPlan {
    return runtimeAssetMaterializationDryRunPlan(preflight);
}


function runtimeAssetMaterializationApprovalResponse(
    dryRun: Record<string, unknown>,
    options: RendererRuntimeAssetMaterializationApprovalOptions | undefined
): RuntimeAssetMaterializationApprovalPlan {
    return runtimeAssetMaterializationApprovalPlan(dryRun, options);
}


function rendererRuntimeSourceForOptions(
    options: Pick<RendererServiceOptions, "renderer" | "rendererRuntimeModule" | "browserFixtureRuntime" | "rendererRuntimeSource">
): RendererRuntimeSource {
    if (options.rendererRuntimeSource) {
        return options.rendererRuntimeSource;
    }
    if (options.browserFixtureRuntime) {
        return "browser-fixture";
    }
    if (options.renderer) {
        return "injected";
    }
    if (options.rendererRuntimeModule) {
        return "runtime-module";
    }
    return "none";
}

function browserFixtureRuntimeLifecycleResponse(
    options: Pick<RendererServiceOptions, "renderer" | "rendererRuntimeModule" | "browserFixtureRuntime" | "rendererRuntimeSource">
): RendererBrowserFixtureRuntimeLifecycleDiagnostics {
    const runtimeSource = rendererRuntimeSourceForOptions(options);
    const lifecycle = options.renderer?.browserFixtureRuntimeLifecycle?.();
    if (lifecycle) {
        return lifecycle;
    }

    return defaultBrowserFixtureRuntimeLifecycleDiagnostics(runtimeSource, {
        configured: options.browserFixtureRuntime === true || runtimeSource === "browser-fixture",
        enabled: runtimeSource === "browser-fixture",
        runtimeModuleConfigured: Boolean(options.rendererRuntimeModule) || runtimeSource === "runtime-module",
        injectedRuntimeConfigured: runtimeSource === "injected",
    });
}

function normalizeRendererRuntimeModuleSpecifier(moduleSpecifier: string): string {
    const specifier = moduleSpecifier.trim();
    if (!specifier) {
        rendererStartupError(
            "Renderer-service runtime module path is required.",
            "renderer_service_runtime_module_invalid",
            "renderer.runtimeModule"
        );
    }

    try {
        const url = new URL(specifier);
        if (url.protocol === "file:") {
            return url.href;
        }
        rendererStartupError(
            "Renderer-service runtime module must be a local file URL or absolute file path.",
            "renderer_service_runtime_module_invalid",
            "renderer.runtimeModule"
        );
    } catch (error) {
        if (!(error instanceof TypeError)) {
            throw error;
        }
    }

    if (!isAbsolute(specifier)) {
        rendererStartupError(
            "Renderer-service runtime module must be an absolute file path.",
            "renderer_service_runtime_module_invalid",
            "renderer.runtimeModule"
        );
    }
    return pathToFileURL(specifier).href;
}

export async function loadRendererRuntimeAdapterModule(moduleSpecifier: string): Promise<RendererRuntimeOptions> {
    const href = normalizeRendererRuntimeModuleSpecifier(moduleSpecifier);
    let moduleExports: unknown;
    try {
        moduleExports = await import(href);
    } catch (error) {
        rendererStartupError(
            "Renderer-service runtime module could not be imported.",
            "renderer_service_runtime_module_unavailable",
            "renderer.runtimeModule",
            error
        );
    }

    if (!isRecord(moduleExports)) {
        rendererStartupError(
            "Renderer-service runtime module must export a renderThumbnail function.",
            "renderer_service_runtime_module_invalid",
            "renderer.runtimeModule"
        );
    }

    const defaultExport = moduleExports.default;
    const candidate = isRecord(defaultExport) ? defaultExport : moduleExports;
    const renderThumbnail =
        typeof candidate.renderThumbnail === "function"
            ? candidate.renderThumbnail
            : typeof defaultExport === "function"
              ? defaultExport
              : null;

    if (!renderThumbnail) {
        rendererStartupError(
            "Renderer-service runtime module must export a renderThumbnail function.",
            "renderer_service_runtime_module_invalid",
            "renderer.runtimeModule.renderThumbnail"
        );
    }

    return {
        renderThumbnail: renderThumbnail as RendererRuntimeOptions["renderThumbnail"],
        ...(typeof candidate.close === "function"
            ? {
                  close: candidate.close as RendererRuntimeOptions["close"],
              }
            : {}),
    };
}

function requireTargetString(target: Record<string, unknown>, field: string, code: string): string {
    const value = optionalString(target[field]);
    if (!value) {
        throw Object.assign(new Error(`Renderer-service thumbnail request target.${field} is required.`), {
            code,
            status: 400,
        });
    }
    return value;
}

function requireRecord(value: unknown, name: string, code: string): Record<string, unknown> {
    if (!isRecord(value)) {
        throw Object.assign(new Error(`Renderer-service thumbnail request ${name} must be a JSON object.`), {
            code,
            status: 400,
        });
    }
    return value;
}

function requireNullableRecord(value: unknown, name: string, code: string): Record<string, unknown> | null {
    if (value === null) {
        return null;
    }
    return requireRecord(value, name, code);
}

function requireBoundedInteger(record: Record<string, unknown>, field: string, code: string): number {
    const value = record[field];
    if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > 4096) {
        throw Object.assign(new Error(`Renderer-service thumbnail request artifact.${field} must be an integer between 1 and 4096.`), {
            code,
            status: 400,
        });
    }
    return value as number;
}

function optionalNonnegativeInteger(record: Record<string, unknown>, field: string, name: string, code: string): number | null {
    const value = record[field];
    if (value === undefined || value === null) {
        return null;
    }
    if (!Number.isInteger(value) || (value as number) < 0) {
        throw Object.assign(new Error(`Renderer-service thumbnail request ${name}.${field} must be a non-negative integer.`), {
            code,
            status: 400,
        });
    }
    return value as number;
}

function requireRecordField(record: Record<string, unknown>, field: string, expected: unknown, name: string, code: string): void {
    if (record[field] !== expected) {
        throw Object.assign(new Error(`Renderer-service thumbnail request ${name}.${field} must match ${String(expected)}.`), {
            code,
            status: 400,
        });
    }
}

function requireBackendRpcCommand(record: Record<string, unknown>, name: string, expected: string, code: string): string {
    if (record.command !== expected) {
        throw Object.assign(new Error(`Renderer-service thumbnail request ${name}.command must be ${expected}.`), {
            code,
            status: 400,
        });
    }
    return expected;
}

function requireBackendRpcMethod(record: Record<string, unknown>, name: string, expected: string, code: string): string {
    if (record.method !== expected) {
        throw Object.assign(new Error(`Renderer-service thumbnail request ${name}.method must be ${expected}.`), {
            code,
            status: 400,
        });
    }
    return expected;
}

function summarizeBackendRpcEntry(record: Record<string, unknown>): BackendRpcEntrySummary {
    return {
        command: String(record.command),
        method: typeof record.method === "string" ? record.method : null,
        requestPresent: isRecord(record.request),
    };
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
    const chunks: Buffer[] = [];
    let bytes = 0;

    for await (const chunk of request) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        bytes += buffer.byteLength;
        if (bytes > MAX_REQUEST_BODY_BYTES) {
            throw Object.assign(new Error("Renderer-service thumbnail request body is too large."), {
                code: "renderer_service_request_too_large",
                status: 413,
            });
        }
        chunks.push(buffer);
    }

    if (chunks.length === 0) {
        throw Object.assign(new Error("Renderer-service thumbnail request requires a JSON body."), {
            code: "renderer_service_request_body_required",
            status: 400,
        });
    }

    try {
        return JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch (cause) {
        throw Object.assign(
            new Error(cause instanceof Error ? `Renderer-service thumbnail request JSON is invalid: ${cause.message}` : "Renderer-service thumbnail request JSON is invalid."),
            {
                code: "renderer_service_request_json_invalid",
                status: 400,
            }
        );
    }
}

function validateThumbnailRequest(body: unknown): ThumbnailRequestSummary {
    if (!isRecord(body)) {
        throw Object.assign(new Error("Renderer-service thumbnail request body must be a JSON object."), {
            code: "renderer_service_request_invalid",
            status: 400,
        });
    }

    if (body.operation !== "thumbnail.render") {
        throw Object.assign(new Error("Renderer-service thumbnail request operation must be thumbnail.render."), {
            code: "renderer_service_operation_invalid",
            status: 400,
        });
    }

    const target = requireRecord(body.target, "target", "renderer_service_target_invalid");
    const targetKind = target?.kind;
    if (targetKind !== "file" && targetKind !== "frame") {
        throw Object.assign(new Error("Renderer-service thumbnail request target.kind must be file or frame."), {
            code: "renderer_service_target_invalid",
            status: 400,
        });
    }
    const fileId = requireTargetString(target, "fileId", "renderer_service_target_file_id_required");
    const pageId = targetKind === "frame" ? requireTargetString(target, "pageId", "renderer_service_target_page_id_required") : null;
    const objectId = targetKind === "frame" ? requireTargetString(target, "objectId", "renderer_service_target_object_id_required") : null;
    const tag = targetKind === "frame" ? optionalString(target.tag) ?? "frame" : null;
    const revn = targetKind === "file" ? optionalNonnegativeInteger(target, "revn", "target", "renderer_service_target_revn_invalid") : null;
    const expectedObjectKey = targetKind === "frame" ? `${fileId}/${pageId}/${objectId}/${tag}` : null;
    if (targetKind === "frame" && target.objectKey !== expectedObjectKey) {
        throw Object.assign(new Error(`Renderer-service thumbnail request target.objectKey must match ${expectedObjectKey}.`), {
            code: "renderer_service_target_object_key_invalid",
            status: 400,
        });
    }

    const artifact = requireRecord(body.artifact, "artifact", "renderer_service_artifact_invalid");
    if (artifact?.format !== "png") {
        throw Object.assign(new Error("Renderer-service thumbnail request artifact.format must be png."), {
            code: "renderer_service_format_invalid",
            status: 400,
        });
    }
    if (artifact.mimeType !== "image/png") {
        throw Object.assign(new Error("Renderer-service thumbnail request artifact.mimeType must be image/png."), {
            code: "renderer_service_mime_type_invalid",
            status: 400,
        });
    }
    if (artifact.extension !== ".png") {
        throw Object.assign(new Error("Renderer-service thumbnail request artifact.extension must be .png."), {
            code: "renderer_service_extension_invalid",
            status: 400,
        });
    }
    const width = requireBoundedInteger(artifact, "width", "renderer_service_width_invalid");
    const height = requireBoundedInteger(artifact, "height", "renderer_service_height_invalid");

    const cache = requireRecord(body.cache, "cache", "renderer_service_cache_invalid");
    const cachePolicy = cache.policy;
    if (cachePolicy !== "reuse" && cachePolicy !== "refresh") {
        throw Object.assign(new Error("Renderer-service thumbnail request cache.policy must be reuse or refresh."), {
            code: "renderer_service_cache_policy_invalid",
            status: 400,
        });
    }
    const expectedScope = targetKind === "file" ? "file-thumbnail" : "file-object-thumbnail";
    if (cache.scope !== expectedScope) {
        throw Object.assign(new Error(`Renderer-service thumbnail request cache.scope must be ${expectedScope} for ${targetKind} thumbnails.`), {
            code: "renderer_service_cache_scope_invalid",
            status: 400,
        });
    }
    const cacheKey = optionalString(cache.key);
    if (!cacheKey) {
        throw Object.assign(new Error("Renderer-service thumbnail request cache.key is required."), {
            code: "renderer_service_cache_key_required",
            status: 400,
        });
    }
    const expectedCacheKey = targetKind === "file" ? `file:${fileId}:revn:${revn ?? "<resolved-revn>"}` : expectedObjectKey;
    if (cacheKey !== expectedCacheKey) {
        throw Object.assign(new Error(`Renderer-service thumbnail request cache.key must match ${expectedCacheKey}.`), {
            code: "renderer_service_cache_key_mismatch",
            status: 400,
        });
    }
    const expectedCacheProbe = cachePolicy === "reuse" ? (targetKind === "file" ? "file-thumbnail-by-file-id-and-revn" : "file-object-thumbnail-by-object-key") : null;
    if (expectedCacheProbe) {
        if (cache.probe !== expectedCacheProbe) {
            throw Object.assign(new Error(`Renderer-service thumbnail request cache.probe must be ${expectedCacheProbe} for ${targetKind} reuse thumbnails.`), {
                code: "renderer_service_cache_probe_invalid",
                status: 400,
            });
        }
    } else if (cache.probe !== undefined && cache.probe !== null) {
        throw Object.assign(new Error("Renderer-service thumbnail request cache.probe must be omitted for refresh cache policy."), {
            code: "renderer_service_cache_probe_unexpected",
            status: 400,
        });
    }

    const render = requireRecord(body.render, "render", "renderer_service_render_invalid");
    const expectedRenderRequired = cachePolicy === "refresh" ? true : "on-cache-miss";
    if (render.required !== expectedRenderRequired) {
        throw Object.assign(
            new Error(`Renderer-service thumbnail request render.required must be ${String(expectedRenderRequired)} for ${cachePolicy} cache policy.`),
            {
                code: "renderer_service_render_required_invalid",
                status: 400,
            }
        );
    }
    if (render.runtime !== "render-wasm-worker") {
        throw Object.assign(new Error("Renderer-service thumbnail request render.runtime must be render-wasm-worker."), {
            code: "renderer_service_render_runtime_invalid",
            status: 400,
        });
    }
    if (render.fallback !== "frontend-rasterizer") {
        throw Object.assign(new Error("Renderer-service thumbnail request render.fallback must be frontend-rasterizer."), {
            code: "renderer_service_render_fallback_invalid",
            status: 400,
        });
    }

    const backendRpc = requireRecord(body.backendRpc, "backendRpc", "renderer_service_backend_rpc_invalid");
    const data = requireRecord(backendRpc.data, "backendRpc.data", "renderer_service_backend_rpc_data_invalid");
    const expectedDataCommand = targetKind === "file" ? "get-file-data-for-thumbnail" : "get-file-frame-data-for-thumbnail";
    requireBackendRpcCommand(data, "backendRpc.data", expectedDataCommand, "renderer_service_backend_rpc_data_command_invalid");
    requireBackendRpcMethod(data, "backendRpc.data", "GET", "renderer_service_backend_rpc_data_method_invalid");
    if (!isRecord(data.request)) {
        throw Object.assign(new Error("Renderer-service thumbnail request backendRpc.data.request must be a JSON object."), {
            code: "renderer_service_backend_rpc_data_request_invalid",
            status: 400,
        });
    }
    if (targetKind === "file") {
        requireRecordField(data.request, "file-id", fileId, "backendRpc.data.request", "renderer_service_backend_rpc_data_file_id_mismatch");
        requireRecordField(
            data.request,
            "strip-frames-with-thumbnails",
            false,
            "backendRpc.data.request",
            "renderer_service_backend_rpc_data_strip_frames_invalid"
        );
    } else {
        requireRecordField(data.request, "file-id", fileId, "backendRpc.data.request", "renderer_service_backend_rpc_data_file_id_mismatch");
        requireRecordField(data.request, "page-id", pageId, "backendRpc.data.request", "renderer_service_backend_rpc_data_page_id_mismatch");
        requireRecordField(data.request, "object-id", objectId, "backendRpc.data.request", "renderer_service_backend_rpc_data_object_id_mismatch");
    }

    const expectedPersistCommand = targetKind === "file" ? "create-file-thumbnail" : "create-file-object-thumbnail";
    const persist = requireNullableRecord(backendRpc.persist, "backendRpc.persist", "renderer_service_backend_rpc_persist_invalid");
    const cacheMissPersist = requireNullableRecord(
        backendRpc.cacheMissPersist,
        "backendRpc.cacheMissPersist",
        "renderer_service_backend_rpc_cache_miss_persist_invalid"
    );

    if (cachePolicy === "refresh") {
        if (!persist) {
            throw Object.assign(new Error("Renderer-service thumbnail request backendRpc.persist is required for refresh cache policy."), {
                code: "renderer_service_backend_rpc_persist_required",
                status: 400,
            });
        }
        if (cacheMissPersist !== null) {
            throw Object.assign(new Error("Renderer-service thumbnail request backendRpc.cacheMissPersist must be null for refresh cache policy."), {
                code: "renderer_service_backend_rpc_cache_miss_persist_unexpected",
                status: 400,
            });
        }
    } else {
        if (persist !== null) {
            throw Object.assign(new Error("Renderer-service thumbnail request backendRpc.persist must be null for reuse cache policy."), {
                code: "renderer_service_backend_rpc_persist_unexpected",
                status: 400,
            });
        }
        if (!cacheMissPersist) {
            throw Object.assign(new Error("Renderer-service thumbnail request backendRpc.cacheMissPersist is required for reuse cache policy."), {
                code: "renderer_service_backend_rpc_cache_miss_persist_required",
                status: 400,
            });
        }
    }

    const activePersist = persist ?? cacheMissPersist;
    if (activePersist) {
        requireBackendRpcCommand(activePersist, "backendRpc.persist", expectedPersistCommand, "renderer_service_backend_rpc_persist_command_invalid");
        requireBackendRpcMethod(activePersist, "backendRpc.persist", "POST", "renderer_service_backend_rpc_persist_method_invalid");
        if (!isRecord(activePersist.request)) {
            throw Object.assign(new Error("Renderer-service thumbnail request backendRpc persist request must be a JSON object."), {
                code: "renderer_service_backend_rpc_persist_request_invalid",
                status: 400,
            });
        }
        requireRecordField(activePersist.request, "file-id", fileId, "backendRpc.persist.request", "renderer_service_backend_rpc_persist_file_id_mismatch");
        if (targetKind === "file") {
            requireRecordField(
                activePersist.request,
                "revn",
                revn ?? "<from get-file-data-for-thumbnail>",
                "backendRpc.persist.request",
                "renderer_service_backend_rpc_persist_revn_mismatch"
            );
        } else {
            requireRecordField(
                activePersist.request,
                "object-id",
                expectedObjectKey,
                "backendRpc.persist.request",
                "renderer_service_backend_rpc_persist_object_id_mismatch"
            );
            requireRecordField(activePersist.request, "tag", tag, "backendRpc.persist.request", "renderer_service_backend_rpc_persist_tag_mismatch");
        }
    }

    const backendRpcSummary = {
        data: summarizeBackendRpcEntry(data),
        persist: persist ? summarizeBackendRpcEntry(persist) : null,
        cacheMissPersist: cacheMissPersist ? summarizeBackendRpcEntry(cacheMissPersist) : null,
    };

    return {
        operation: "thumbnail.render",
        targetKind,
        fileId,
        pageId,
        objectId,
        objectKey: expectedObjectKey,
        tag,
        revn,
        format: "png",
        cachePolicy,
        cacheScope: expectedScope,
        cacheKey,
        cacheProbe: expectedCacheProbe,
        width,
        height,
        mimeType: "image/png",
        extension: ".png",
        renderRequired: expectedRenderRequired,
        renderRuntime: "render-wasm-worker",
        renderFallback: "frontend-rasterizer",
        backendRpc: backendRpcSummary,
    };
}

function summarizeAuthHeaders(request: IncomingMessage): AuthSummary {
    const authorization = request.headers.authorization;
    const cookie = request.headers.cookie;

    return {
        mode: "caller-session",
        authorizationPresent: typeof authorization === "string" && authorization.trim().length > 0,
        cookiePresent: typeof cookie === "string" && cookie.trim().length > 0,
        authTokenCookiePresent:
            typeof cookie === "string" &&
            cookie
                .split(";")
                .map((part) => part.trim().toLowerCase())
                .some((part) => part.startsWith("auth-token=")),
        tokenValuesIncluded: false,
    };
}

function backendRpcConfigInvalid(message: string, field: string): never {
    throw Object.assign(new Error(message), {
        code: "renderer_service_backend_rpc_config_invalid",
        field,
        status: 500,
    });
}

function normalizeBackendRpcBaseUri(options: RendererBackendRpcClientOptions | undefined): string | null {
    const raw = optionalString(options?.baseUri);
    if (!raw) {
        return null;
    }

    let url: URL;
    try {
        url = new URL(raw);
    } catch {
        backendRpcConfigInvalid("Renderer-service backend RPC baseUri must be an absolute HTTP(S) URL.", "backendRpcClient.baseUri");
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
        backendRpcConfigInvalid("Renderer-service backend RPC baseUri must be an absolute HTTP(S) URL.", "backendRpcClient.baseUri");
    }

    return url.toString().replace(/\/+$/, "");
}

function backendRpcEndpoint(baseUri: string | null, command: string): string | null {
    if (!baseUri) {
        return null;
    }
    const url = new URL(`api/main/methods/${command}`, `${baseUri}/`);
    url.searchParams.set("_fmt", "json");
    return url.toString();
}

function cacheProbeCommand(summary: ThumbnailRequestSummary): "get-file-thumbnail" | "get-file-object-thumbnail" {
    return summary.targetKind === "file" ? "get-file-thumbnail" : "get-file-object-thumbnail";
}

function cacheProbeNotExecuted(baseUri: string | null, summary: ThumbnailRequestSummary): BackendRpcCacheProbeExecution {
    return {
        executed: false,
        endpoint: backendRpcEndpoint(baseUri, cacheProbeCommand(summary)),
        hit: null,
        mediaId: null,
        resourceUri: null,
        downloadUri: null,
    };
}

function sourceDataReadCommand(summary: ThumbnailRequestSummary): "get-file-data-for-thumbnail" | "get-file-frame-data-for-thumbnail" {
    return summary.targetKind === "file" ? "get-file-data-for-thumbnail" : "get-file-frame-data-for-thumbnail";
}

function sourceDataReadNotExecuted(baseUri: string | null, summary: ThumbnailRequestSummary): BackendRpcSourceDataReadExecution {
    return {
        executed: false,
        endpoint: backendRpcEndpoint(baseUri, sourceDataReadCommand(summary)),
        revn: null,
        sourceData: null,
    };
}

function thumbnailPersistNotExecuted(
    baseUri: string | null,
    command: "create-file-thumbnail" | "create-file-object-thumbnail" | null = "create-file-thumbnail"
): BackendRpcThumbnailPersistExecution {
    return {
        executed: false,
        endpoint: command ? backendRpcEndpoint(baseUri, command) : null,
        entry: null,
        command,
        mediaId: null,
        resourceUri: null,
        downloadUri: null,
        artifactByteLength: null,
    };
}

function backendRpcHeaderValue(value: string | string[] | undefined): string | null {
    if (Array.isArray(value)) {
        return optionalString(value.join("; "));
    }
    return optionalString(value);
}

function backendRpcAuthHeaders(request: IncomingMessage): Record<string, string> {
    const headers: Record<string, string> = {
        accept: "application/json",
        "x-client": "@penpot/renderer-service/0.1",
    };
    const authorization = backendRpcHeaderValue(request.headers.authorization);
    const cookie = backendRpcHeaderValue(request.headers.cookie);
    if (authorization) {
        headers.authorization = authorization;
    }
    if (cookie) {
        headers.cookie = cookie;
    }
    return headers;
}

function backendRpcError(message: string, code: string, status: number, retryable: boolean, field?: string): never {
    throw Object.assign(new Error(message), {
        code,
        status,
        retryable,
        ...(field ? { field } : {}),
    });
}

function parseBackendJson(
    text: string,
    field: string,
    message = "Renderer-service backend cache probe response JSON is invalid.",
    code = "renderer_service_backend_cache_probe_response_invalid"
): unknown {
    if (!text.trim()) {
        return null;
    }
    try {
        return JSON.parse(text);
    } catch {
        backendRpcError(message, code, 502, true, field);
    }
}

function backendResponseString(record: Record<string, unknown>, field: string, ...keys: string[]): string | null {
    for (const key of keys) {
        const value = optionalString(record[key]);
        if (value) {
            return value;
        }
    }
    return optionalString(record[field]);
}

function parseBackendThumbnailCacheProbe(
    data: unknown,
    summary: ThumbnailRequestSummary,
    endpoint: string
): BackendRpcCacheProbeExecution {
    if (!isRecord(data)) {
        backendRpcError("Renderer-service backend cache probe response must be a JSON object.", "renderer_service_backend_cache_probe_response_invalid", 502, true, "backendRpcClient.cacheProbe.response");
    }
    if (typeof data.hit !== "boolean") {
        backendRpcError("Renderer-service backend cache probe response hit must be boolean.", "renderer_service_backend_cache_probe_response_invalid", 502, true, "backendRpcClient.cacheProbe.response.hit");
    }

    const fileId = backendResponseString(data, "fileId", "file-id");
    if (fileId !== summary.fileId) {
        backendRpcError("Renderer-service backend cache probe response file id does not match the request.", "renderer_service_backend_cache_probe_response_invalid", 502, true, "backendRpcClient.cacheProbe.response.file-id");
    }

    if (summary.targetKind === "file") {
        const revn = typeof data.revn === "number" ? data.revn : null;
        if (revn !== summary.revn) {
            backendRpcError("Renderer-service backend cache probe response revision does not match the request.", "renderer_service_backend_cache_probe_response_invalid", 502, true, "backendRpcClient.cacheProbe.response.revn");
        }
    } else {
        const objectId = backendResponseString(data, "objectId", "object-id");
        if (objectId !== summary.objectKey) {
            backendRpcError("Renderer-service backend cache probe response object id does not match the request object key.", "renderer_service_backend_cache_probe_response_invalid", 502, true, "backendRpcClient.cacheProbe.response.object-id");
        }
        const tag = backendResponseString(data, "tag");
        if (tag !== (summary.tag ?? "frame")) {
            backendRpcError("Renderer-service backend cache probe response tag does not match the request.", "renderer_service_backend_cache_probe_response_invalid", 502, true, "backendRpcClient.cacheProbe.response.tag");
        }
    }

    if (!data.hit) {
        return {
            executed: true,
            endpoint,
            hit: false,
            mediaId: null,
            resourceUri: null,
            downloadUri: null,
        };
    }

    const mediaId = backendResponseString(data, "mediaId", "media-id");
    const uri = backendResponseString(data, "uri");
    if (!mediaId || !uri) {
        backendRpcError("Renderer-service backend cache probe hit must include media id and uri.", "renderer_service_backend_cache_probe_response_invalid", 502, true, "backendRpcClient.cacheProbe.response.resource");
    }

    let parsedUri: URL;
    try {
        parsedUri = new URL(uri);
    } catch {
        backendRpcError("Renderer-service backend cache probe uri must be an absolute HTTP(S) URL.", "renderer_service_backend_cache_probe_response_invalid", 502, true, "backendRpcClient.cacheProbe.response.uri");
    }
    if (parsedUri.protocol !== "http:" && parsedUri.protocol !== "https:") {
        backendRpcError("Renderer-service backend cache probe uri must be an absolute HTTP(S) URL.", "renderer_service_backend_cache_probe_response_invalid", 502, true, "backendRpcClient.cacheProbe.response.uri");
    }

    const resourceUri = `/assets/by-id/${mediaId}`;
    if (parsedUri.pathname !== resourceUri) {
        backendRpcError("Renderer-service backend cache probe uri must point to /assets/by-id/{mediaId}.", "renderer_service_backend_cache_probe_response_invalid", 502, true, "backendRpcClient.cacheProbe.response.uri");
    }

    return {
        executed: true,
        endpoint,
        hit: true,
        mediaId,
        resourceUri,
        downloadUri: parsedUri.toString(),
    };
}

function parseBackendThumbnailSourceDataRead(
    data: unknown,
    summary: ThumbnailRequestSummary,
    endpoint: string
): BackendRpcSourceDataReadExecution {
    if (!isRecord(data)) {
        backendRpcError("Renderer-service backend source-data response must be a JSON object.", "renderer_service_backend_source_data_response_invalid", 502, true, "backendRpcClient.entries.data.response");
    }

    const fileId = backendResponseString(data, "fileId", "file-id");
    if (fileId !== summary.fileId) {
        backendRpcError("Renderer-service backend source-data response file id does not match the request.", "renderer_service_backend_source_data_response_invalid", 502, true, "backendRpcClient.entries.data.response.file-id");
    }

    const revn = typeof data.revn === "number" && Number.isInteger(data.revn) && data.revn >= 0 ? data.revn : null;
    if (revn === null) {
        backendRpcError("Renderer-service backend source-data response revision must be a non-negative integer.", "renderer_service_backend_source_data_response_invalid", 502, true, "backendRpcClient.entries.data.response.revn");
    }
    if (summary.revn !== null && revn !== summary.revn) {
        backendRpcError("Renderer-service backend source-data response revision does not match the request.", "renderer_service_backend_source_data_response_invalid", 502, true, "backendRpcClient.entries.data.response.revn");
    }
    if (summary.targetKind === "frame") {
        const pageId = backendResponseString(data, "pageId", "page-id");
        if (pageId !== summary.pageId) {
            backendRpcError("Renderer-service backend source-data response page id does not match the request.", "renderer_service_backend_source_data_response_invalid", 502, true, "backendRpcClient.entries.data.response.page-id");
        }
        const objectId = backendResponseString(data, "objectId", "object-id");
        if (objectId !== summary.objectId) {
            backendRpcError("Renderer-service backend source-data response object id does not match the request.", "renderer_service_backend_source_data_response_invalid", 502, true, "backendRpcClient.entries.data.response.object-id");
        }
    }
    const page = data.page;
    if (!isRecord(page)) {
        backendRpcError("Renderer-service backend source-data response page must be a JSON object.", "renderer_service_backend_source_data_response_invalid", 502, true, "backendRpcClient.entries.data.response.page");
    }
    if (summary.targetKind === "frame") {
        const objects = page.objects;
        if (!isRecord(objects)) {
            backendRpcError("Renderer-service backend frame source-data response page.objects must be a JSON object.", "renderer_service_backend_source_data_response_invalid", 502, true, "backendRpcClient.entries.data.response.page.objects");
        }
        if (!summary.objectId || !isRecord(objects[summary.objectId])) {
            backendRpcError("Renderer-service backend frame source-data response must include the requested frame object.", "renderer_service_backend_source_data_response_invalid", 502, true, "backendRpcClient.entries.data.response.page.objects.object-id");
        }
    }

    return {
        executed: true,
        endpoint,
        revn,
        sourceData: {
            fileId: summary.fileId,
            revn,
            ...(summary.targetKind === "frame"
                ? {
                      pageId: summary.pageId ?? undefined,
                      objectId: summary.objectId ?? undefined,
                      objectKey: summary.objectKey ?? undefined,
                      tag: summary.tag ?? undefined,
                  }
                : {}),
            page,
        },
    };
}

function parseBackendThumbnailPersist(
    data: unknown,
    endpoint: string,
    entry: "persist" | "cacheMissPersist",
    command: "create-file-thumbnail" | "create-file-object-thumbnail",
    artifactByteLength: number
): BackendRpcThumbnailPersistExecution {
    if (!isRecord(data)) {
        backendRpcError("Renderer-service backend thumbnail persist response must be a JSON object.", "renderer_service_backend_thumbnail_persist_response_invalid", 502, true, "backendRpcClient.persistOutput.response");
    }

    const mediaId = backendResponseString(data, "mediaId", "id", "media-id");
    const uri = backendResponseString(data, "uri");
    if (!mediaId || !uri) {
        backendRpcError("Renderer-service backend thumbnail persist response must include id and uri.", "renderer_service_backend_thumbnail_persist_response_invalid", 502, true, "backendRpcClient.persistOutput.response.resource");
    }

    let parsedUri: URL;
    try {
        parsedUri = new URL(uri);
    } catch {
        backendRpcError("Renderer-service backend thumbnail persist uri must be an absolute HTTP(S) URL.", "renderer_service_backend_thumbnail_persist_response_invalid", 502, true, "backendRpcClient.persistOutput.response.uri");
    }
    if (parsedUri.protocol !== "http:" && parsedUri.protocol !== "https:") {
        backendRpcError("Renderer-service backend thumbnail persist uri must be an absolute HTTP(S) URL.", "renderer_service_backend_thumbnail_persist_response_invalid", 502, true, "backendRpcClient.persistOutput.response.uri");
    }

    const resourceUri = `/assets/by-id/${mediaId}`;
    if (parsedUri.pathname !== resourceUri) {
        backendRpcError("Renderer-service backend thumbnail persist uri must point to /assets/by-id/{mediaId}.", "renderer_service_backend_thumbnail_persist_response_invalid", 502, true, "backendRpcClient.persistOutput.response.uri");
    }

    return {
        executed: true,
        endpoint,
        entry,
        command,
        mediaId,
        resourceUri,
        downloadUri: parsedUri.toString(),
        artifactByteLength,
    };
}

async function executeThumbnailCacheProbe(
    request: IncomingMessage,
    summary: ThumbnailRequestSummary,
    options: RendererBackendRpcClientOptions | undefined
): Promise<BackendRpcCacheProbeExecution> {
    const baseUri = normalizeBackendRpcBaseUri(options);
    const endpoint = backendRpcEndpoint(baseUri, cacheProbeCommand(summary));
    const shouldProbe =
        Boolean(baseUri && endpoint) &&
        summary.cachePolicy === "reuse" &&
        (summary.targetKind === "file" ? summary.revn !== null : Boolean(summary.objectKey && summary.tag));
    if (!shouldProbe || !endpoint) {
        return cacheProbeNotExecuted(baseUri, summary);
    }

    const fetchImpl = options?.fetch ?? globalThis.fetch;
    if (typeof fetchImpl !== "function") {
        backendRpcError("Renderer-service backend cache probe requires a fetch implementation.", "renderer_service_backend_cache_probe_unavailable", 500, true, "backendRpcClient.cacheProbe.fetch");
    }

    const url = new URL(endpoint);
    url.searchParams.set("file-id", summary.fileId);
    if (summary.targetKind === "file") {
        url.searchParams.set("revn", String(summary.revn));
    } else {
        url.searchParams.set("object-id", summary.objectKey ?? "");
        url.searchParams.set("tag", summary.tag ?? "frame");
    }

    let response: Response;
    try {
        response = await fetchImpl(url, {
            method: "GET",
            headers: backendRpcAuthHeaders(request),
        });
    } catch {
        backendRpcError("Renderer-service backend cache probe could not reach the Penpot backend.", "renderer_service_backend_cache_probe_unavailable", 502, true, "backendRpcClient.cacheProbe");
    }

    const text = await response.text();
    if (!response.ok) {
        backendRpcError(
            `Renderer-service backend cache probe failed with HTTP ${response.status}.`,
            "renderer_service_backend_cache_probe_failed",
            response.status,
            response.status === 429 || response.status >= 500,
            "backendRpcClient.cacheProbe"
        );
    }

    return parseBackendThumbnailCacheProbe(parseBackendJson(text, "backendRpcClient.cacheProbe.response"), summary, endpoint);
}

async function executeThumbnailSourceDataRead(
    request: IncomingMessage,
    summary: ThumbnailRequestSummary,
    options: RendererBackendRpcClientOptions | undefined,
    cacheProbeExecution: BackendRpcCacheProbeExecution
): Promise<BackendRpcSourceDataReadExecution> {
    const baseUri = normalizeBackendRpcBaseUri(options);
    const endpoint = backendRpcEndpoint(baseUri, sourceDataReadCommand(summary));
    const cacheHit = cacheProbeExecution.executed && cacheProbeExecution.hit === true;
    const shouldRead =
        Boolean(baseUri && endpoint) &&
        !cacheHit &&
        (summary.cachePolicy === "refresh" || (summary.cachePolicy === "reuse" && cacheProbeExecution.executed && cacheProbeExecution.hit === false));

    if (!shouldRead || !endpoint) {
        return sourceDataReadNotExecuted(baseUri, summary);
    }

    const fetchImpl = options?.fetch ?? globalThis.fetch;
    if (typeof fetchImpl !== "function") {
        backendRpcError("Renderer-service backend source-data read requires a fetch implementation.", "renderer_service_backend_source_data_unavailable", 500, true, "backendRpcClient.entries.data.fetch");
    }

    const url = new URL(endpoint);
    url.searchParams.set("file-id", summary.fileId);
    if (summary.targetKind === "file") {
        url.searchParams.set("strip-frames-with-thumbnails", "false");
    } else {
        url.searchParams.set("page-id", summary.pageId ?? "");
        url.searchParams.set("object-id", summary.objectId ?? "");
    }

    let response: Response;
    try {
        response = await fetchImpl(url, {
            method: "GET",
            headers: backendRpcAuthHeaders(request),
        });
    } catch {
        backendRpcError("Renderer-service backend source-data read could not reach the Penpot backend.", "renderer_service_backend_source_data_unavailable", 502, true, "backendRpcClient.entries.data");
    }

    const text = await response.text();
    if (!response.ok) {
        backendRpcError(
            `Renderer-service backend source-data read failed with HTTP ${response.status}.`,
            "renderer_service_backend_source_data_failed",
            response.status,
            response.status === 429 || response.status >= 500,
            "backendRpcClient.entries.data"
        );
    }

    return parseBackendThumbnailSourceDataRead(
        parseBackendJson(
            text,
            "backendRpcClient.entries.data.response",
            "Renderer-service backend source-data response JSON is invalid.",
            "renderer_service_backend_source_data_response_invalid"
        ),
        summary,
        endpoint
    );
}

function renderNotExecuted(): ThumbnailRenderExecution {
    return {
        executed: false,
        mediaId: null,
        resourceUri: null,
        runtime: null,
        fallbackUsed: false,
        artifactByteLength: null,
        bytes: null,
    };
}

function rendererRuntimeError(message: string, code: string, status: number, retryable: boolean, field?: string): never {
    throw Object.assign(new Error(message), {
        code,
        status,
        retryable,
        ...(field ? { field } : {}),
    });
}

function normalizeRendererPngBytes(result: Record<string, unknown>): Buffer {
    const png = result.png;
    let buffer: Buffer;
    if (png instanceof ArrayBuffer) {
        buffer = Buffer.from(png);
    } else if (png instanceof Uint8Array) {
        buffer = Buffer.from(png);
    } else {
        rendererRuntimeError("Renderer-service runtime adapter must return PNG bytes.", "renderer_service_render_response_invalid", 502, true, "renderer.runtime.png");
    }

    const pngSignature = "89504e470d0a1a0a";
    if (buffer.byteLength < 8 || buffer.subarray(0, 8).toString("hex") !== pngSignature) {
        rendererRuntimeError("Renderer-service runtime adapter must return PNG bytes.", "renderer_service_render_response_invalid", 502, true, "renderer.runtime.png");
    }
    return buffer;
}

async function executeThumbnailRender(
    summary: ThumbnailRequestSummary,
    sourceDataReadExecution: BackendRpcSourceDataReadExecution,
    renderer: RendererRuntimeOptions | undefined,
    renderedAssets: RenderedAssetStore
): Promise<ThumbnailRenderExecution> {
    if (!sourceDataReadExecution.executed || !sourceDataReadExecution.sourceData) {
        return renderNotExecuted();
    }

    if (typeof renderer?.renderThumbnail !== "function") {
        return renderNotExecuted();
    }

    let result: RendererRuntimeRenderResult;
    try {
        result = await renderer.renderThumbnail({
            target:
                summary.targetKind === "file"
                    ? {
                          kind: "file",
                          fileId: summary.fileId,
                          revn: summary.revn,
                      }
                    : {
                          kind: "frame",
                          fileId: summary.fileId,
                          pageId: summary.pageId ?? "",
                          objectId: summary.objectId ?? "",
                          objectKey: summary.objectKey ?? "",
                          tag: summary.tag ?? "frame",
                          revn: null,
                      },
            artifact: {
                format: "png",
                mimeType: "image/png",
                width: summary.width,
                height: summary.height,
                extension: ".png",
            },
            cache: {
                policy: summary.cachePolicy,
                scope: summary.cacheScope,
                key: summary.cacheKey,
            },
            render: {
                runtime: summary.renderRuntime,
                fallback: summary.renderFallback,
            },
            sourceData: sourceDataReadExecution.sourceData,
        });
    } catch {
        rendererRuntimeError("Renderer-service runtime adapter failed while rendering the thumbnail.", "renderer_service_render_failed", 502, true, "renderer.runtime");
    }

    if (!isRecord(result)) {
        rendererRuntimeError("Renderer-service runtime adapter response must be a JSON object.", "renderer_service_render_response_invalid", 502, true, "renderer.runtime.response");
    }

    const resultRecord = result;
    const runtime = typeof resultRecord.runtime === "string" ? resultRecord.runtime : summary.renderRuntime;
    if (runtime !== "render-wasm-worker" && runtime !== "frontend-rasterizer") {
        rendererRuntimeError("Renderer-service runtime adapter response runtime is invalid.", "renderer_service_render_response_invalid", 502, true, "renderer.runtime.response.runtime");
    }

    const bytes = normalizeRendererPngBytes(resultRecord);
    const mediaId = `rendered-thumbnail-${createHash("sha256").update(bytes).digest("hex").slice(0, 32)}`;
    const resourceUri = `/assets/by-id/${mediaId}`;
    renderedAssets.set(mediaId, {
        contentType: "image/png",
        bytes,
    });

    return {
        executed: true,
        mediaId,
        resourceUri,
        runtime,
        fallbackUsed: result.fallbackUsed === true,
        artifactByteLength: bytes.byteLength,
        bytes,
    };
}

async function executeThumbnailPersist(
    request: IncomingMessage,
    summary: ThumbnailRequestSummary,
    options: RendererBackendRpcClientOptions | undefined,
    sourceDataReadExecution: BackendRpcSourceDataReadExecution,
    renderExecution: ThumbnailRenderExecution
): Promise<BackendRpcThumbnailPersistExecution> {
    const baseUri = normalizeBackendRpcBaseUri(options);
    const activePersistEntry = summary.cachePolicy === "refresh" ? "persist" : "cacheMissPersist";
    const activePersistSummary = summary.cachePolicy === "refresh" ? summary.backendRpc.persist : summary.backendRpc.cacheMissPersist;
    const expectedCommand = summary.targetKind === "file" ? "create-file-thumbnail" : "create-file-object-thumbnail";
    const command = activePersistSummary?.command === expectedCommand ? expectedCommand : null;
    const endpoint = command ? backendRpcEndpoint(baseUri, command) : null;

    const shouldPersist =
        Boolean(baseUri && endpoint) &&
        sourceDataReadExecution.executed &&
        sourceDataReadExecution.revn !== null &&
        renderExecution.executed &&
        renderExecution.bytes !== null &&
        renderExecution.artifactByteLength !== null;

    if (!shouldPersist || !endpoint || !command || !renderExecution.bytes || renderExecution.artifactByteLength === null) {
        return thumbnailPersistNotExecuted(baseUri, command);
    }

    const fetchImpl = options?.fetch ?? globalThis.fetch;
    if (typeof fetchImpl !== "function") {
        backendRpcError("Renderer-service backend thumbnail persist requires a fetch implementation.", "renderer_service_backend_thumbnail_persist_unavailable", 500, true, "backendRpcClient.persistOutput.fetch");
    }

    const url = new URL(endpoint);
    url.searchParams.set("file-id", summary.fileId);
    if (summary.targetKind === "file") {
        url.searchParams.set("revn", String(sourceDataReadExecution.revn));
    } else {
        url.searchParams.set("object-id", summary.objectKey ?? "");
        url.searchParams.set("tag", summary.tag ?? "frame");
    }

    const mediaBytes = new Uint8Array(renderExecution.bytes.byteLength);
    mediaBytes.set(renderExecution.bytes);
    const formData = new FormData();
    const filename =
        summary.targetKind === "file"
            ? `thumbnail-${summary.fileId}-${sourceDataReadExecution.revn}.png`
            : `thumbnail-${summary.fileId}-${summary.pageId}-${summary.objectId}-${summary.tag ?? "frame"}.png`;
    formData.append("media", new Blob([mediaBytes.buffer], { type: "image/png" }), filename);

    let response: Response;
    try {
        response = await fetchImpl(url, {
            method: "POST",
            headers: backendRpcAuthHeaders(request),
            body: formData,
        });
    } catch {
        backendRpcError("Renderer-service backend thumbnail persist could not reach the Penpot backend.", "renderer_service_backend_thumbnail_persist_unavailable", 502, true, "backendRpcClient.persistOutput");
    }

    const text = await response.text();
    if (!response.ok) {
        backendRpcError(
            `Renderer-service backend thumbnail persist failed with HTTP ${response.status}.`,
            "renderer_service_backend_thumbnail_persist_failed",
            response.status,
            response.status === 429 || response.status >= 500,
            "backendRpcClient.persistOutput"
        );
    }

    return parseBackendThumbnailPersist(
        parseBackendJson(
            text,
            "backendRpcClient.persistOutput.response",
            "Renderer-service backend thumbnail persist response JSON is invalid.",
            "renderer_service_backend_thumbnail_persist_response_invalid"
        ),
        endpoint,
        activePersistEntry,
        command,
        renderExecution.artifactByteLength
    );
}

function backendRpcCanonicalRequestKeys(command: string): string[] {
    switch (command) {
        case "get-file-thumbnail":
            return ["file-id", "revn"];
        case "get-file-object-thumbnail":
            return ["file-id", "object-id", "tag"];
        case "get-file-data-for-thumbnail":
            return ["file-id", "strip-frames-with-thumbnails"];
        case "get-file-frame-data-for-thumbnail":
            return ["file-id", "object-id", "page-id"];
        case "create-file-thumbnail":
            return ["file-id", "media", "revn"];
        case "create-file-object-thumbnail":
            return ["file-id", "media", "object-id", "tag"];
        default:
            return [];
    }
}

function backendRpcRequestEnvelope(entry: BackendRpcEntrySummary): BackendRpcRequestEnvelopeSummary {
    const requestKeys = entry.requestPresent ? backendRpcCanonicalRequestKeys(entry.command) : [];
    const multipartPost = entry.command === "create-file-thumbnail" || entry.command === "create-file-object-thumbnail";
    const queryKeys = multipartPost
        ? entry.command === "create-file-thumbnail"
            ? ["file-id", "revn"]
            : ["file-id", "object-id", "tag"]
        : entry.method === "GET"
          ? requestKeys
          : [];
    const bodyKeys = multipartPost ? ["media"] : entry.method === "POST" ? requestKeys : [];
    return {
        status: "planned-disabled",
        transport: multipartPost ? "penpot-rpc-multipart" : "penpot-rpc-json",
        method: entry.method,
        requestKeys,
        queryKeys,
        bodyKeys,
        requestValuesIncluded: false,
        mediaValuesIncluded: false,
        tokenValuesIncluded: false,
        dispatch: false,
    };
}

function backendRpcClientEntry(entry: BackendRpcEntrySummary | null, baseUri: string | null): BackendRpcClientEntrySummary | null {
    if (!entry) {
        return null;
    }

    return {
        ...entry,
        endpoint: backendRpcEndpoint(baseUri, entry.command),
        dispatch: false,
        requestEnvelope: backendRpcRequestEnvelope(entry),
    };
}

function summarizeBackendRpcCacheProbe(
    summary: ThumbnailRequestSummary,
    baseUri: string | null,
    execution: BackendRpcCacheProbeExecution
): BackendRpcCacheProbeSummary | null {
    if (summary.cachePolicy !== "reuse" || !summary.cacheProbe) {
        return null;
    }

    const executed = execution.executed;
    return {
        status: executed ? "executed" : "planned-disabled",
        strategy: summary.cacheProbe,
        condition: "before-source-data-read",
        scope: summary.cacheScope,
        key: summary.cacheKey,
        requestKeys: summary.targetKind === "file" ? ["file-id", "revn"] : ["file-id", "object-id", "tag"],
        command: executed ? cacheProbeCommand(summary) : null,
        endpoint: executed ? execution.endpoint : null,
        hitResult: "resource-metadata",
        missResult: "continue-pipeline",
        result: executed ? (execution.hit ? "hit" : "miss") : null,
        cacheRead: executed,
        networkDispatch: executed,
        dispatch: executed,
        cacheHitValuesIncluded: false,
        resourceValuesIncluded: false,
        mediaValuesIncluded: false,
        tokenValuesIncluded: false,
    };
}

function backendRpcPipelineStage(
    name: BackendRpcPipelineStageSummary["name"],
    condition: BackendRpcPipelineStageSummary["condition"],
    values: Pick<BackendRpcPipelineStageSummary, "entry" | "command" | "cacheProbe" | "runtime"> & Partial<Pick<BackendRpcPipelineStageSummary, "status" | "dispatch">>
): BackendRpcPipelineStageSummary {
    return {
        name,
        status: values.status ?? "planned-disabled",
        condition,
        entry: values.entry,
        command: values.command,
        cacheProbe: values.cacheProbe,
        runtime: values.runtime,
        dispatch: values.dispatch ?? false,
    };
}

function summarizeBackendRpcPipeline(
    summary: ThumbnailRequestSummary,
    cacheProbeExecution: BackendRpcCacheProbeExecution,
    sourceDataReadExecution: BackendRpcSourceDataReadExecution,
    renderExecution: ThumbnailRenderExecution,
    persistExecution: BackendRpcThumbnailPersistExecution
): BackendRpcPipelineSummary {
    const cacheMissCondition = summary.cachePolicy === "reuse" ? "on-cache-miss" : "always";
    const persistEntry = summary.cachePolicy === "refresh" ? "persist" : "cacheMissPersist";
    const persistSummary = summary.cachePolicy === "refresh" ? summary.backendRpc.persist : summary.backendRpc.cacheMissPersist;
    const orderedStages: BackendRpcPipelineStageSummary[] = [];
    const cacheProbeExecuted = cacheProbeExecution.executed;
    const sourceDataReadExecuted = sourceDataReadExecution.executed;
    const renderExecuted = renderExecution.executed;
    const persistExecuted = persistExecution.executed;

    if (summary.cachePolicy === "reuse") {
        orderedStages.push(
            backendRpcPipelineStage("cache-probe", "always", {
                entry: null,
                command: cacheProbeExecuted ? cacheProbeCommand(summary) : null,
                cacheProbe: summary.cacheProbe,
                runtime: null,
                status: cacheProbeExecuted ? "executed" : "planned-disabled",
                dispatch: cacheProbeExecuted,
            })
        );
    }

    orderedStages.push(
        backendRpcPipelineStage("source-data-read", cacheMissCondition, {
            entry: "data",
            command: summary.backendRpc.data.command,
            cacheProbe: null,
            runtime: null,
            status: sourceDataReadExecuted ? "executed" : "planned-disabled",
            dispatch: sourceDataReadExecuted,
        }),
        backendRpcPipelineStage("render", cacheMissCondition, {
            entry: null,
            command: null,
            cacheProbe: null,
            runtime: summary.renderRuntime,
            status: renderExecuted ? "executed" : "planned-disabled",
            dispatch: renderExecuted,
        }),
        backendRpcPipelineStage("thumbnail-persist", cacheMissCondition, {
            entry: persistEntry,
            command: persistSummary?.command ?? null,
            cacheProbe: null,
            runtime: null,
            status: persistExecuted ? "executed" : "planned-disabled",
            dispatch: persistExecuted,
        })
    );

    return {
        status: persistExecuted
            ? "persist-executed"
            : renderExecuted
              ? "render-executed"
              : sourceDataReadExecuted
                ? "source-data-read-executed"
                : cacheProbeExecuted
                  ? "cache-probe-executed"
                  : "planned-disabled",
        cachePolicy: summary.cachePolicy,
        cacheHitShortCircuit: summary.cachePolicy === "reuse",
        orderedStages,
        networkDispatch: cacheProbeExecuted || sourceDataReadExecuted || persistExecuted,
        cacheRead: cacheProbeExecuted,
        dataRead: sourceDataReadExecuted,
        renderDispatch: renderExecuted,
        persistWrite: persistExecuted,
        sourceDataValuesIncluded: false,
        artifactValuesIncluded: false,
        tokenValuesIncluded: false,
    };
}

function summarizeBackendRpcRenderInput(
    summary: ThumbnailRequestSummary,
    sourceDataReadExecution: BackendRpcSourceDataReadExecution,
    renderExecution: ThumbnailRenderExecution
): BackendRpcRenderInputSummary | null {
    if (!sourceDataReadExecution.executed || !sourceDataReadExecution.endpoint) {
        return null;
    }

    return {
        status: "source-data-ready",
        condition: "after-source-data-read",
        sourceDataRead: true,
        sourceDataEndpoint: sourceDataReadExecution.endpoint,
        targetKind: summary.targetKind,
        identityKeys: summary.targetKind === "file" ? ["file-id", "revn"] : ["file-id", "page-id", "object-id"],
        revisionSource: "backend-source-data",
        requestRevision: summary.targetKind === "frame" ? "resolved" : summary.revn === null ? "not-provided" : "matched",
        revisionValueIncluded: false,
        cachePolicy: summary.cachePolicy,
        cacheScope: summary.cacheScope,
        cacheKey: summary.cacheKey,
        artifactFormat: "png",
        artifactMimeType: "image/png",
        artifactWidth: summary.width,
        artifactHeight: summary.height,
        renderRuntime: summary.renderRuntime,
        renderFallback: summary.renderFallback,
        renderDispatch: renderExecution.executed,
        sourceDataValuesIncluded: false,
        pageValuesIncluded: false,
        artifactValuesIncluded: false,
        mediaValuesIncluded: false,
        tokenValuesIncluded: false,
    };
}

function summarizeBackendRpcRenderOutput(renderExecution: ThumbnailRenderExecution): BackendRpcRenderOutputSummary | null {
    if (!renderExecution.executed || !renderExecution.runtime || renderExecution.artifactByteLength === null) {
        return null;
    }

    return {
        status: "artifact-ready",
        condition: "after-render",
        runtime: renderExecution.runtime,
        fallbackUsed: renderExecution.fallbackUsed,
        artifactFormat: "png",
        artifactMimeType: "image/png",
        artifactByteLength: renderExecution.artifactByteLength,
        renderDispatch: true,
        localFileWrites: false,
        sourceDataValuesIncluded: false,
        pageValuesIncluded: false,
        artifactValuesIncluded: false,
        mediaValuesIncluded: false,
        tokenValuesIncluded: false,
    };
}

function summarizeBackendRpcPersistOutput(
    summary: ThumbnailRequestSummary,
    sourceDataReadExecution: BackendRpcSourceDataReadExecution,
    persistExecution: BackendRpcThumbnailPersistExecution
): BackendRpcPersistOutputSummary | null {
    if (
        !persistExecution.executed ||
        !persistExecution.endpoint ||
        !persistExecution.entry ||
        (persistExecution.command !== "create-file-thumbnail" && persistExecution.command !== "create-file-object-thumbnail") ||
        persistExecution.artifactByteLength === null
    ) {
        return null;
    }

    const isFramePersist = persistExecution.command === "create-file-object-thumbnail";
    return {
        status: "persisted",
        condition: "after-render",
        entry: persistExecution.entry,
        command: persistExecution.command,
        endpoint: persistExecution.endpoint,
        targetKind: summary.targetKind,
        identityKeys: isFramePersist ? ["file-id", "object-id", "tag"] : ["file-id", "revn"],
        revisionSource: "backend-source-data",
        requestRevision: summary.targetKind === "file" && summary.revn !== null ? "matched" : "resolved",
        artifactFormat: "png",
        artifactMimeType: "image/png",
        artifactByteLength: persistExecution.artifactByteLength,
        resourceFrom: isFramePersist ? "backend-create-file-object-thumbnail" : "backend-create-file-thumbnail",
        persistWrite: true,
        localFileWrites: false,
        requestValuesIncluded: false,
        resourceValuesIncluded: false,
        mediaValuesIncluded: false,
        artifactValuesIncluded: false,
        tokenValuesIncluded: false,
    };
}

function summarizeBackendRpcClient(
    summary: ThumbnailRequestSummary,
    auth: AuthSummary,
    options: RendererBackendRpcClientOptions | undefined,
    cacheProbeExecution: BackendRpcCacheProbeExecution,
    sourceDataReadExecution: BackendRpcSourceDataReadExecution,
    renderExecution: ThumbnailRenderExecution,
    persistExecution: BackendRpcThumbnailPersistExecution
): BackendRpcClientSummary {
    const baseUri = normalizeBackendRpcBaseUri(options);
    const cacheProbeExecuted = cacheProbeExecution.executed;
    const sourceDataReadExecuted = sourceDataReadExecution.executed;
    const renderExecuted = renderExecution.executed;
    const persistExecuted = persistExecution.executed;
    return {
        status: persistExecuted
            ? "persist-executed"
            : renderExecuted
              ? "render-executed"
              : sourceDataReadExecuted
                ? "source-data-read-executed"
                : cacheProbeExecuted
                  ? "cache-probe-executed"
                  : baseUri
                    ? "configured-disabled"
                    : "not-configured",
        baseUriConfigured: Boolean(baseUri),
        baseUri,
        networkDispatch: cacheProbeExecuted || sourceDataReadExecuted || persistExecuted,
        cacheRead: cacheProbeExecuted,
        dataRead: sourceDataReadExecuted,
        persistWrite: persistExecuted,
        authForwarding: auth,
        entries: {
            data: backendRpcClientEntry(summary.backendRpc.data, baseUri) as BackendRpcClientEntrySummary,
            persist: backendRpcClientEntry(summary.backendRpc.persist, baseUri),
            cacheMissPersist: backendRpcClientEntry(summary.backendRpc.cacheMissPersist, baseUri),
        },
        cacheProbe: summarizeBackendRpcCacheProbe(summary, baseUri, cacheProbeExecution),
        pipeline: summarizeBackendRpcPipeline(summary, cacheProbeExecution, sourceDataReadExecution, renderExecution, persistExecution),
        renderInput: summarizeBackendRpcRenderInput(summary, sourceDataReadExecution, renderExecution),
        renderOutput: summarizeBackendRpcRenderOutput(renderExecution),
        persistOutput: summarizeBackendRpcPersistOutput(summary, sourceDataReadExecution, persistExecution),
    };
}

function thumbnailResponse(
    request: IncomingMessage,
    summary: ThumbnailRequestSummary,
    auth: AuthSummary,
    options: Pick<RendererServiceOptions, "backendRpc">,
    cacheProbeExecution: BackendRpcCacheProbeExecution,
    sourceDataReadExecution: BackendRpcSourceDataReadExecution,
    renderExecution: ThumbnailRenderExecution,
    persistExecution: BackendRpcThumbnailPersistExecution,
    runtimeAssetPreflight: Record<string, unknown>,
    runtimeAssetMaterializationDryRun: Record<string, unknown>,
    runtimeAssetMaterializationApproval: Record<string, unknown>,
    runtimeAssetMaterializationExecution: Record<string, unknown>,
    bundledSceneBridgeRealScenePng: Record<string, unknown>,
    bundledSceneBridgeImportGate: Record<string, unknown>,
    bundledSceneBridgeModuleNamespaceImportPreflight: Record<string, unknown>,
    bundledSceneBridgeFactoryInvocationPreflight: Record<string, unknown>,
    bundledSceneBridgeRuntimeRegistrationPreflight: Record<string, unknown>,
    bundledSceneBridgeRuntimeRegistryRegistrationBoundary: Record<string, unknown>,
    bundledSceneBridgeRuntimeRegistryInstallationContract: Record<string, unknown>,
    bundledSceneBridgeRuntimeRegistryInstallationGate: Record<string, unknown>,
    bundledSceneBridgeRuntimeRegistryInstallationPreflight: Record<string, unknown>,
    bundledSceneBridgeRuntimeRegistryInstallationExecutionBoundary: Record<string, unknown>,
    bundledSceneBridgeRuntimeRegistryInstallation: Record<string, unknown>,
    bundledSceneBridgeInstalledRuntimeLifecycle: Record<string, unknown>,
    bundledSceneBridgeRealRuntimeModuleScaffold: Record<string, unknown>,
    bundledSceneBridgeInstalledRuntimeRenderDispatch: Record<string, unknown>,
    browserFixtureRuntime: Record<string, unknown>
): Record<string, unknown> {
    const host = request.headers.host ?? `${DEFAULT_HOST}:${DEFAULT_PORT}`;
    const downloadUri = `http://${host}/assets/by-id/noop-thumbnail-png`;
    const cacheHit = cacheProbeExecution.executed && cacheProbeExecution.hit === true;
    const persisted = persistExecution.executed && persistExecution.mediaId && persistExecution.resourceUri && persistExecution.downloadUri;
    const rendered = renderExecution.executed && renderExecution.mediaId && renderExecution.resourceUri;

    return {
        ...noopThumbnailResponse,
        runtimeAssetMaterializationPreflight: runtimeAssetPreflight,
        runtimeAssetMaterializationDryRun,
        runtimeAssetMaterializationApproval,
        runtimeAssetMaterializationExecution,
        bundledSceneBridgeRealScenePng,
        bundledSceneBridgeImportGate,
        bundledSceneBridgeModuleNamespaceImportPreflight,
        bundledSceneBridgeFactoryInvocationPreflight,
        bundledSceneBridgeRuntimeRegistrationPreflight,
        bundledSceneBridgeRuntimeRegistryRegistrationBoundary,
        bundledSceneBridgeRuntimeRegistryInstallationContract,
        bundledSceneBridgeRuntimeRegistryInstallationGate,
        bundledSceneBridgeRuntimeRegistryInstallationPreflight,
        bundledSceneBridgeRuntimeRegistryInstallationExecutionBoundary,
        bundledSceneBridgeRuntimeRegistryInstallation,
        bundledSceneBridgeInstalledRuntimeLifecycle,
        bundledSceneBridgeRealRuntimeValueContract,
        bundledSceneBridgeRealRuntimeModuleScaffold,
        bundledSceneBridgeInstalledRuntimeRenderDispatch,
        browserFixtureRuntime,
        request: summary,
        auth,
        backendRpcClient: summarizeBackendRpcClient(
            summary,
            auth,
            options.backendRpc,
            cacheProbeExecution,
            sourceDataReadExecution,
            renderExecution,
            persistExecution
        ),
        cache: {
            ...noopThumbnailResponse.cache,
            outcome: cacheHit ? "hit" : noopThumbnailResponse.cache.outcome,
            policy: summary.cachePolicy,
            scope: summary.cacheScope,
            key: summary.cacheKey,
            probe: summary.cacheProbe,
        },
        renderer: cacheHit
            ? {
                  runtime: null,
                  fallbackUsed: false,
              }
            : rendered
              ? {
                    runtime: renderExecution.runtime,
                    fallbackUsed: renderExecution.fallbackUsed,
                }
            : noopThumbnailResponse.renderer,
        resource: {
            ...noopThumbnailResponse.resource,
            ...(cacheHit
                ? {
                      mediaId: cacheProbeExecution.mediaId,
                      resourceUri: cacheProbeExecution.resourceUri,
                      downloadUri: cacheProbeExecution.downloadUri,
                  }
                : persisted
                  ? {
                        mediaId: persistExecution.mediaId,
                        resourceUri: persistExecution.resourceUri,
                        downloadUri: persistExecution.downloadUri,
                    }
                  : rendered
                  ? {
                        mediaId: renderExecution.mediaId,
                        resourceUri: renderExecution.resourceUri,
                        downloadUri: `http://${host}${renderExecution.resourceUri}`,
                    }
                : {
                      downloadUri,
                  }),
        },
    };
}

function responseInvalid(message: string, field: string): never {
    throw Object.assign(new Error(message), {
        code: "renderer_service_response_invalid",
        field,
        status: 500,
    });
}

function responseRecord(value: unknown, field: string): Record<string, unknown> {
    if (!isRecord(value)) {
        responseInvalid(`Renderer-service thumbnail response ${field} must be a JSON object.`, field);
    }
    return value;
}

function responseString(record: Record<string, unknown>, property: string, field: string): string {
    const value = record[property];
    if (typeof value !== "string" || value.length === 0) {
        responseInvalid(`Renderer-service thumbnail response ${field} must be a non-empty string.`, field);
    }
    return value;
}

function responseBoolean(record: Record<string, unknown>, property: string, field: string): boolean {
    const value = record[property];
    if (typeof value !== "boolean") {
        responseInvalid(`Renderer-service thumbnail response ${field} must be a boolean.`, field);
    }
    return value;
}

function responseNonNegativeIntegerOrNull(record: Record<string, unknown>, property: string, field: string): number | null {
    const value = record[property];
    if (value === null) {
        return null;
    }
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
        responseInvalid(`Renderer-service thumbnail response ${field} must be a non-negative integer or null.`, field);
    }
    return value;
}

function responseNonNegativeInteger(record: Record<string, unknown>, property: string, field: string): number {
    const value = record[property];
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
        responseInvalid(`Renderer-service thumbnail response ${field} must be a non-negative integer.`, field);
    }
    return value;
}

function responseStringArray(record: Record<string, unknown>, property: string, field: string): string[] {
    const value = record[property];
    if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
        responseInvalid(`Renderer-service thumbnail response ${field} must be a string array.`, field);
    }
    return value as string[];
}

function responseRecordArray(value: unknown, field: string): Record<string, unknown>[] {
    if (!Array.isArray(value) || value.some((entry) => !isRecord(entry))) {
        responseInvalid(`Renderer-service thumbnail response ${field} must be an array of JSON objects.`, field);
    }
    return value as Record<string, unknown>[];
}

function requireResponseEqual(actual: unknown, expected: unknown, field: string): void {
    if (actual !== expected) {
        responseInvalid(`Renderer-service thumbnail response ${field} must match ${String(expected)}.`, field);
    }
}

function rejectResponseValueFields(record: Record<string, unknown>, fieldPrefix: string): void {
    for (const field of [
        "request",
        "requestValues",
        "query",
        "queryValues",
        "body",
        "bodyValues",
        "media",
        "artifact",
        "artifactBytes",
        "bytes",
        "png",
        "sourceData",
        "page",
        "pageValues",
        "resource",
        "resourceUri",
        "downloadUri",
        "mediaId",
        "cacheHit",
        "cacheHitResource",
        "authorization",
        "cookie",
        "token",
        "authToken",
        "auth-token",
    ]) {
        if (record[field] !== undefined) {
            responseInvalid("Renderer-service thumbnail response backend RPC plan must not include request, media, source-data, resource, cache-hit, or credential values.", `${fieldPrefix}.${field}`);
        }
    }
}

function requireResponseArrayEqual(actual: string[], expected: string[], field: string): void {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        responseInvalid(`Renderer-service thumbnail response ${field} must match the planned request envelope.`, field);
    }
}

function requireResponseJsonEqual(actual: unknown, expected: unknown, field: string): void {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        responseInvalid(`Renderer-service thumbnail response ${field} must match the validated request summary.`, field);
    }
}

function validateThumbnailResourceResponse(resource: Record<string, unknown>): void {
    const mediaId = responseString(resource, "mediaId", "resource.mediaId");
    const resourceUri = responseString(resource, "resourceUri", "resource.resourceUri");
    const downloadUri = responseString(resource, "downloadUri", "resource.downloadUri");
    requireResponseEqual(resource.contentType, "image/png", "resource.contentType");

    const expectedResourceUri = `/assets/by-id/${mediaId}`;
    requireResponseEqual(resourceUri, expectedResourceUri, "resource.resourceUri");

    let parsedDownloadUri: URL;
    try {
        parsedDownloadUri = new URL(downloadUri);
    } catch {
        responseInvalid("Renderer-service thumbnail response resource.downloadUri must be an absolute HTTP(S) URL.", "resource.downloadUri");
    }

    if (parsedDownloadUri.protocol !== "http:" && parsedDownloadUri.protocol !== "https:") {
        responseInvalid("Renderer-service thumbnail response resource.downloadUri must be an absolute HTTP(S) URL.", "resource.downloadUri");
    }
    requireResponseEqual(parsedDownloadUri.pathname, resourceUri, "resource.downloadUri");
}

function validateThumbnailCacheResponse(cache: Record<string, unknown>, summary: ThumbnailRequestSummary, execution: BackendRpcCacheProbeExecution): void {
    requireResponseEqual(cache.outcome, execution.executed && execution.hit === true ? "hit" : noopThumbnailResponse.cache.outcome, "cache.outcome");
    requireResponseEqual(cache.policy, summary.cachePolicy, "cache.policy");
    requireResponseEqual(cache.scope, summary.cacheScope, "cache.scope");
    requireResponseEqual(cache.key, summary.cacheKey, "cache.key");
    requireResponseEqual(cache.probe ?? null, summary.cacheProbe, "cache.probe");
}

function validateThumbnailRendererResponse(renderer: Record<string, unknown>, cacheExecution: BackendRpcCacheProbeExecution, renderExecution: ThumbnailRenderExecution): void {
    const cacheHit = cacheExecution.executed && cacheExecution.hit === true;
    const expectedRuntime = cacheHit ? null : renderExecution.executed ? renderExecution.runtime : noopThumbnailResponse.renderer.runtime;
    const expectedFallbackUsed = cacheHit ? false : renderExecution.executed ? renderExecution.fallbackUsed : false;
    requireResponseEqual(renderer.runtime, expectedRuntime, "renderer.runtime");
    requireResponseEqual(renderer.fallbackUsed, expectedFallbackUsed, "renderer.fallbackUsed");
}

function validateTokenSafeAuthResponse(auth: Record<string, unknown>, expectedAuth: AuthSummary, fieldPrefix: string): void {
    requireResponseEqual(auth.mode, expectedAuth.mode, `${fieldPrefix}.mode`);
    requireResponseEqual(responseBoolean(auth, "authorizationPresent", `${fieldPrefix}.authorizationPresent`), expectedAuth.authorizationPresent, `${fieldPrefix}.authorizationPresent`);
    requireResponseEqual(responseBoolean(auth, "cookiePresent", `${fieldPrefix}.cookiePresent`), expectedAuth.cookiePresent, `${fieldPrefix}.cookiePresent`);
    requireResponseEqual(responseBoolean(auth, "authTokenCookiePresent", `${fieldPrefix}.authTokenCookiePresent`), expectedAuth.authTokenCookiePresent, `${fieldPrefix}.authTokenCookiePresent`);
    requireResponseEqual(auth.tokenValuesIncluded, false, `${fieldPrefix}.tokenValuesIncluded`);

    for (const field of ["authorization", "cookie", "token", "authToken", "auth-token"]) {
        if (auth[field] !== undefined) {
            responseInvalid("Renderer-service thumbnail response auth summary must not include credential values.", `${fieldPrefix}.${field}`);
        }
    }
}

function validateThumbnailAuthResponse(auth: Record<string, unknown>, expectedAuth: AuthSummary): void {
    validateTokenSafeAuthResponse(auth, expectedAuth, "auth");
}

function validateBrowserFixtureRuntimeLifecycleResponse(actual: unknown, field: string): void {
    const record = responseRecord(actual, field);
    requireResponseEqual(["not-configured", "started", "closed"].includes(String(record.status)), true, `${field}.status`);
    requireResponseEqual(record.diagnosticsVersion, "P26.31", `${field}.diagnosticsVersion`);
    requireResponseEqual(record.owner, "renderer-service", `${field}.owner`);
    requireResponseEqual(record.mode, "browser-fixture-lifecycle", `${field}.mode`);
    requireResponseEqual(
        ["none", "injected", "runtime-module", "browser-fixture"].includes(String(record.runtimeSource)),
        true,
        `${field}.runtimeSource`
    );
    const configured = responseBoolean(record, "configured", `${field}.configured`);
    const enabled = responseBoolean(record, "enabled", `${field}.enabled`);
    responseBoolean(record, "runtimeModuleConfigured", `${field}.runtimeModuleConfigured`);
    responseBoolean(record, "injectedRuntimeConfigured", `${field}.injectedRuntimeConfigured`);
    if (record.runtimeSource === "browser-fixture") {
        requireResponseEqual(configured, true, `${field}.configured`);
        requireResponseEqual(enabled, true, `${field}.enabled`);
    }

    const browser = responseRecord(record.browser, `${field}.browser`);
    requireResponseEqual(browser.engine, "chromium", `${field}.browser.engine`);
    requireResponseEqual(browser.headless, true, `${field}.browser.headless`);
    const browserProcessStarted = responseBoolean(browser, "processStarted", `${field}.browser.processStarted`);
    const startupAttempted = responseBoolean(browser, "startupAttempted", `${field}.browser.startupAttempted`);
    const startupSucceeded = responseBoolean(browser, "startupSucceeded", `${field}.browser.startupSucceeded`);
    responseBoolean(browser, "closed", `${field}.browser.closed`);
    requireResponseEqual(browser.pathValuesIncluded, false, `${field}.browser.pathValuesIncluded`);

    const lifecycle = responseRecord(record.lifecycle, `${field}.lifecycle`);
    requireResponseEqual(responseBoolean(lifecycle, "startupAttempted", `${field}.lifecycle.startupAttempted`), startupAttempted, `${field}.lifecycle.startupAttempted`);
    requireResponseEqual(responseBoolean(lifecycle, "startupSucceeded", `${field}.lifecycle.startupSucceeded`), startupSucceeded, `${field}.lifecycle.startupSucceeded`);
    requireResponseEqual(lifecycle.startupFailed, false, `${field}.lifecycle.startupFailed`);
    const renderAttempts = responseNonNegativeInteger(lifecycle, "renderAttempts", `${field}.lifecycle.renderAttempts`);
    const renderSuccesses = responseNonNegativeInteger(lifecycle, "renderSuccesses", `${field}.lifecycle.renderSuccesses`);
    const renderFailures = responseNonNegativeInteger(lifecycle, "renderFailures", `${field}.lifecycle.renderFailures`);
    requireResponseEqual(renderAttempts, renderSuccesses + renderFailures, `${field}.lifecycle.renderAttempts`);
    requireResponseEqual(lifecycle.lastRenderSucceeded === null || typeof lifecycle.lastRenderSucceeded === "boolean", true, `${field}.lifecycle.lastRenderSucceeded`);
    responseNonNegativeInteger(lifecycle, "pageCreateCount", `${field}.lifecycle.pageCreateCount`);
    responseBoolean(lifecycle, "pageReuseValidated", `${field}.lifecycle.pageReuseValidated`);
    responseBoolean(lifecycle, "nonEmptyPngValidated", `${field}.lifecycle.nonEmptyPngValidated`);
    responseBoolean(lifecycle, "closeAttempted", `${field}.lifecycle.closeAttempted`);
    responseBoolean(lifecycle, "closeSucceeded", `${field}.lifecycle.closeSucceeded`);
    requireResponseEqual(lifecycle.closeFailed, false, `${field}.lifecycle.closeFailed`);
    requireResponseEqual(lifecycle.artifactByteLengthIncluded, false, `${field}.lifecycle.artifactByteLengthIncluded`);

    const sideEffects = responseRecord(record.sideEffects, `${field}.sideEffects`);
    requireResponseEqual(responseBoolean(sideEffects, "browserProcessStarted", `${field}.sideEffects.browserProcessStarted`), browserProcessStarted, `${field}.sideEffects.browserProcessStarted`);
    requireResponseEqual(sideEffects.runtimeExecutionRegistered, false, `${field}.sideEffects.runtimeExecutionRegistered`);
    responseBoolean(sideEffects, "runtimeAdapterImported", `${field}.sideEffects.runtimeAdapterImported`);
    for (const property of ["runtimeAssetsLoaded", "assetManifestMaterialized", "networkDispatch", "dispatch", "localFileWrites"]) {
        requireResponseEqual(sideEffects[property], false, `${field}.sideEffects.${property}`);
    }

    const redaction = responseRecord(record.redaction, `${field}.redaction`);
    for (const property of [
        "sourceDataValuesIncluded",
        "pageValuesIncluded",
        "artifactValuesIncluded",
        "mediaValuesIncluded",
        "tokenValuesIncluded",
        "pathValuesIncluded",
    ]) {
        requireResponseEqual(redaction[property], false, `${field}.redaction.${property}`);
    }

    const omitted = responseRecord(record.omitted, `${field}.omitted`);
    for (const property of [
        "playwrightBrowserPath",
        "runtimeModulePath",
        "workspaceRoot",
        "cacheRoot",
        "sourceData",
        "pageData",
        "artifactBytes",
        "mediaBytes",
        "tokenValues",
    ]) {
        requireResponseEqual(omitted[property], true, `${field}.omitted.${property}`);
    }
}

function validateRuntimeAssetManifestAssetResponse(
    actual: unknown,
    expected: (typeof bundledRuntimeBridgeAssetManifest.assets)[number],
    field: string
): void {
    const record = responseRecord(actual, field);
    requireResponseEqual(record.id, expected.id, `${field}.id`);
    requireResponseEqual(record.kind, expected.kind, `${field}.kind`);
    requireResponseEqual(record.role, expected.role, `${field}.role`);
    requireResponseEqual(record.sourcePath, expected.sourcePath, `${field}.sourcePath`);
    requireResponseEqual(record.publicPath, expected.publicPath, `${field}.publicPath`);
    requireResponseEqual(record.cachePath, expected.cachePath, `${field}.cachePath`);
    requireResponseEqual(responseBoolean(record, "required", `${field}.required`), expected.required, `${field}.required`);
    requireResponseEqual(record.materialized, false, `${field}.materialized`);
    requireResponseEqual(record.existsChecked, false, `${field}.existsChecked`);
    requireResponseEqual(record.loaded, false, `${field}.loaded`);
    requireResponseEqual(record.byteHash ?? null, null, `${field}.byteHash`);
    requireResponseEqual(record.dispatch, false, `${field}.dispatch`);
    requireResponseEqual(record.localFileWrites, false, `${field}.localFileWrites`);
}

function validateRuntimeAssetManifestCacheOutputResponse(
    actual: unknown,
    expected: (typeof bundledRuntimeBridgeAssetManifest.cacheOutputs)[number],
    field: string
): void {
    const record = responseRecord(actual, field);
    requireResponseEqual(record.id, expected.id, `${field}.id`);
    requireResponseEqual(record.path, expected.path, `${field}.path`);
    requireResponseEqual(record.purpose, expected.purpose, `${field}.purpose`);
    requireResponseEqual(record.materialized, false, `${field}.materialized`);
    requireResponseEqual(record.existsChecked, false, `${field}.existsChecked`);
    requireResponseEqual(record.localFileWrites, false, `${field}.localFileWrites`);
}

function validateRuntimeAssetManifestResponse(actual: unknown, field: string): void {
    const record = responseRecord(actual, field);
    requireResponseEqual(record.status, bundledRuntimeBridgeAssetManifest.status, `${field}.status`);
    requireResponseEqual(record.manifestVersion, bundledRuntimeBridgeAssetManifest.manifestVersion, `${field}.manifestVersion`);
    requireResponseEqual(record.owner, bundledRuntimeBridgeAssetManifest.owner, `${field}.owner`);
    requireResponseEqual(record.bridge, bundledRuntimeBridgeAssetManifest.bridge, `${field}.bridge`);
    requireResponseEqual(record.runtime, bundledRuntimeBridgeAssetManifest.runtime, `${field}.runtime`);
    requireResponseEqual(record.fallback, bundledRuntimeBridgeAssetManifest.fallback, `${field}.fallback`);

    const roots = responseRecord(record.roots, `${field}.roots`);
    requireResponseEqual(roots.frontendPublicJs, bundledRuntimeBridgeAssetManifest.roots.frontendPublicJs, `${field}.roots.frontendPublicJs`);
    requireResponseEqual(roots.frontendWorkerJs, bundledRuntimeBridgeAssetManifest.roots.frontendWorkerJs, `${field}.roots.frontendWorkerJs`);
    requireResponseEqual(roots.cacheRoot, bundledRuntimeBridgeAssetManifest.roots.cacheRoot, `${field}.roots.cacheRoot`);

    const assets = responseRecordArray(record.assets, `${field}.assets`);
    requireResponseEqual(assets.length, bundledRuntimeBridgeAssetManifest.assets.length, `${field}.assets.length`);
    for (let index = 0; index < bundledRuntimeBridgeAssetManifest.assets.length; index += 1) {
        validateRuntimeAssetManifestAssetResponse(assets[index], bundledRuntimeBridgeAssetManifest.assets[index], `${field}.assets.${index}`);
    }

    const cacheOutputs = responseRecordArray(record.cacheOutputs, `${field}.cacheOutputs`);
    requireResponseEqual(cacheOutputs.length, bundledRuntimeBridgeAssetManifest.cacheOutputs.length, `${field}.cacheOutputs.length`);
    for (let index = 0; index < bundledRuntimeBridgeAssetManifest.cacheOutputs.length; index += 1) {
        validateRuntimeAssetManifestCacheOutputResponse(
            cacheOutputs[index],
            bundledRuntimeBridgeAssetManifest.cacheOutputs[index],
            `${field}.cacheOutputs.${index}`
        );
    }

    const validation = responseRecord(record.validation, `${field}.validation`);
    requireResponseEqual(validation.status, bundledRuntimeBridgeAssetManifest.validation.status, `${field}.validation.status`);
    requireResponseArrayEqual(
        responseStringArray(validation, "requiredAssetIds", `${field}.validation.requiredAssetIds`),
        [...bundledRuntimeBridgeAssetManifest.validation.requiredAssetIds],
        `${field}.validation.requiredAssetIds`
    );
    requireResponseArrayEqual(
        responseStringArray(validation, "noDispatchTests", `${field}.validation.noDispatchTests`),
        [...bundledRuntimeBridgeAssetManifest.validation.noDispatchTests],
        `${field}.validation.noDispatchTests`
    );
    requireResponseArrayEqual(
        responseStringArray(validation, "blockedUntil", `${field}.validation.blockedUntil`),
        [...bundledRuntimeBridgeAssetManifest.validation.blockedUntil],
        `${field}.validation.blockedUntil`
    );

    const sideEffects = responseRecord(record.sideEffects, `${field}.sideEffects`);
    for (const property of [
        "browserProcessStarted",
        "runtimeExecutionRegistered",
        "runtimeAdapterImported",
        "runtimeAssetsLoaded",
        "assetManifestMaterialized",
        "networkDispatch",
        "dispatch",
        "localFileWrites",
    ]) {
        requireResponseEqual(sideEffects[property], false, `${field}.sideEffects.${property}`);
    }

    const redaction = responseRecord(record.redaction, `${field}.redaction`);
    for (const property of [
        "sourceDataValuesIncluded",
        "pageValuesIncluded",
        "artifactValuesIncluded",
        "mediaValuesIncluded",
        "tokenValuesIncluded",
    ]) {
        requireResponseEqual(redaction[property], false, `${field}.redaction.${property}`);
    }
}

function validateBundledSceneBridgeContractResponse(actual: unknown, field: string): void {
    const record = responseRecord(actual, field);
    requireResponseEqual(record.status, bundledSceneBridgeContract.status, `${field}.status`);
    requireResponseEqual(record.contractVersion, bundledSceneBridgeContract.contractVersion, `${field}.contractVersion`);
    requireResponseEqual(record.owner, bundledSceneBridgeContract.owner, `${field}.owner`);
    requireResponseEqual(record.mode, bundledSceneBridgeContract.mode, `${field}.mode`);
    requireResponseEqual(record.bridge, bundledSceneBridgeContract.bridge, `${field}.bridge`);
    requireResponseEqual(record.runtime, bundledSceneBridgeContract.runtime, `${field}.runtime`);
    requireResponseEqual(record.fallback, bundledSceneBridgeContract.fallback, `${field}.fallback`);

    const adapterModule = responseRecord(record.adapterModule, `${field}.adapterModule`);
    requireResponseEqual(adapterModule.status, bundledSceneBridgeContract.adapterModule.status, `${field}.adapterModule.status`);
    requireResponseEqual(adapterModule.moduleType, bundledSceneBridgeContract.adapterModule.moduleType, `${field}.adapterModule.moduleType`);
    requireResponseEqual(adapterModule.exportName, bundledSceneBridgeContract.adapterModule.exportName, `${field}.adapterModule.exportName`);
    requireResponseEqual(adapterModule.factorySignature, bundledSceneBridgeContract.adapterModule.factorySignature, `${field}.adapterModule.factorySignature`);
    requireResponseEqual(adapterModule.implements, bundledSceneBridgeContract.adapterModule.implements, `${field}.adapterModule.implements`);
    requireResponseEqual(adapterModule.lifecycleHook, bundledSceneBridgeContract.adapterModule.lifecycleHook, `${field}.adapterModule.lifecycleHook`);
    requireResponseEqual(adapterModule.moduleImported, false, `${field}.adapterModule.moduleImported`);
    requireResponseEqual(adapterModule.runtimeRegistration, false, `${field}.adapterModule.runtimeRegistration`);
    requireResponseEqual(adapterModule.valuesIncluded, false, `${field}.adapterModule.valuesIncluded`);

    const assetPrerequisites = responseRecord(record.assetPrerequisites, `${field}.assetPrerequisites`);
    requireResponseEqual(assetPrerequisites.manifestVersion, bundledSceneBridgeContract.assetPrerequisites.manifestVersion, `${field}.assetPrerequisites.manifestVersion`);
    requireResponseEqual(assetPrerequisites.preflightVersion, bundledSceneBridgeContract.assetPrerequisites.preflightVersion, `${field}.assetPrerequisites.preflightVersion`);
    requireResponseEqual(assetPrerequisites.preflightExecutionVersion, "P26.22", `${field}.assetPrerequisites.preflightExecutionVersion`);
    requireResponseEqual(assetPrerequisites.materializationDryRunVersion, "P26.26", `${field}.assetPrerequisites.materializationDryRunVersion`);
    requireResponseEqual(assetPrerequisites.materializationApprovalVersion, "P26.27", `${field}.assetPrerequisites.materializationApprovalVersion`);
    requireResponseArrayEqual(
        responseStringArray(assetPrerequisites, "requiredAssetIds", `${field}.assetPrerequisites.requiredAssetIds`),
        [...bundledSceneBridgeContract.assetPrerequisites.requiredAssetIds],
        `${field}.assetPrerequisites.requiredAssetIds`
    );
    requireResponseArrayEqual(
        responseStringArray(assetPrerequisites, "requiredCacheOutputIds", `${field}.assetPrerequisites.requiredCacheOutputIds`),
        [...bundledSceneBridgeContract.assetPrerequisites.requiredCacheOutputIds],
        `${field}.assetPrerequisites.requiredCacheOutputIds`
    );
    for (const property of [
        "preflightRequired",
        "approvalRequired",
    ]) {
        requireResponseEqual(assetPrerequisites[property], true, `${field}.assetPrerequisites.${property}`);
    }
    for (const property of [
        "materializationApproved",
        "materializationWritesEnabled",
        "assetExistenceChecked",
        "assetHashesComputed",
        "cacheOutputsChecked",
        "assetValuesIncluded",
    ]) {
        requireResponseEqual(assetPrerequisites[property], false, `${field}.assetPrerequisites.${property}`);
    }

    const browserPageHandoff = responseRecord(record.browserPageHandoff, `${field}.browserPageHandoff`);
    requireResponseEqual(browserPageHandoff.owner, "renderer-service", `${field}.browserPageHandoff.owner`);
    requireResponseEqual(browserPageHandoff.engine, "chromium", `${field}.browserPageHandoff.engine`);
    requireResponseEqual(browserPageHandoff.headless, true, `${field}.browserPageHandoff.headless`);
    requireResponseEqual(browserPageHandoff.activeEditorTabRequired, false, `${field}.browserPageHandoff.activeEditorTabRequired`);
    requireResponseEqual(browserPageHandoff.pageReusePolicy, "single-page-serial-queue", `${field}.browserPageHandoff.pageReusePolicy`);
    requireResponseEqual(browserPageHandoff.sourceDataTransfer, "renderer-service-internal-redacted", `${field}.browserPageHandoff.sourceDataTransfer`);
    for (const property of ["browserProcessStarted", "pageCreated", "pageValuesIncluded", "playwrightPathIncluded"]) {
        requireResponseEqual(browserPageHandoff[property], false, `${field}.browserPageHandoff.${property}`);
    }

    const renderInputContract = responseRecord(record.renderInputContract, `${field}.renderInputContract`);
    requireResponseEqual(renderInputContract.type, "RendererRuntimeRenderInput", `${field}.renderInputContract.type`);
    requireResponseArrayEqual(responseStringArray(renderInputContract, "targetKinds", `${field}.renderInputContract.targetKinds`), ["file", "frame"], `${field}.renderInputContract.targetKinds`);
    requireResponseArrayEqual(
        responseStringArray(renderInputContract, "requiredSections", `${field}.renderInputContract.requiredSections`),
        ["target", "artifact", "cache", "render", "sourceData"],
        `${field}.renderInputContract.requiredSections`
    );
    requireResponseEqual(renderInputContract.renderRuntime, "render-wasm-worker", `${field}.renderInputContract.renderRuntime`);
    requireResponseEqual(renderInputContract.renderFallback, "frontend-rasterizer", `${field}.renderInputContract.renderFallback`);
    for (const property of [
        "sourceDataValuesIncluded",
        "pageValuesIncluded",
        "artifactValuesIncluded",
        "mediaValuesIncluded",
        "tokenValuesIncluded",
    ]) {
        requireResponseEqual(renderInputContract[property], false, `${field}.renderInputContract.${property}`);
    }

    const renderOutputContract = responseRecord(record.renderOutputContract, `${field}.renderOutputContract`);
    requireResponseEqual(renderOutputContract.type, "RendererRuntimeRenderResult", `${field}.renderOutputContract.type`);
    requireResponseEqual(renderOutputContract.artifactFormat, "png", `${field}.renderOutputContract.artifactFormat`);
    requireResponseEqual(renderOutputContract.artifactMimeType, "image/png", `${field}.renderOutputContract.artifactMimeType`);
    requireResponseArrayEqual(
        responseStringArray(renderOutputContract, "allowedRuntimes", `${field}.renderOutputContract.allowedRuntimes`),
        ["render-wasm-worker", "frontend-rasterizer"],
        `${field}.renderOutputContract.allowedRuntimes`
    );
    requireResponseEqual(renderOutputContract.nonEmptyPngRequired, true, `${field}.renderOutputContract.nonEmptyPngRequired`);
    for (const property of [
        "artifactByteLengthIncluded",
        "artifactBytesIncluded",
        "localFileWrites",
        "resourceValuesIncluded",
        "mediaValuesIncluded",
    ]) {
        requireResponseEqual(renderOutputContract[property], false, `${field}.renderOutputContract.${property}`);
    }

    requireResponseArrayEqual(
        responseStringArray(record, "diagnosticCodes", `${field}.diagnosticCodes`),
        [...bundledSceneBridgeContract.diagnosticCodes],
        `${field}.diagnosticCodes`
    );
    const diagnostics = responseRecordArray(record.diagnostics, `${field}.diagnostics`);
    requireResponseEqual(diagnostics.length, bundledSceneBridgeContract.diagnostics.length, `${field}.diagnostics.length`);
    requireResponseEqual(diagnostics[0].code, bundledSceneBridgeContract.diagnostics[0].code, `${field}.diagnostics.0.code`);
    requireResponseEqual(diagnostics[0].severity, bundledSceneBridgeContract.diagnostics[0].severity, `${field}.diagnostics.0.severity`);
    requireResponseArrayEqual(responseStringArray(record, "nextActions", `${field}.nextActions`), [...bundledSceneBridgeContract.nextActions], `${field}.nextActions`);

    const blockedAlternatives = responseRecordArray(record.blockedAlternatives, `${field}.blockedAlternatives`);
    requireResponseArrayEqual(
        blockedAlternatives.map((entry) => String(entry.id)),
        bundledSceneBridgeContract.blockedAlternatives.map((entry) => entry.id),
        `${field}.blockedAlternatives.ids`
    );
    requireResponseArrayEqual(responseStringArray(record, "executionSequence", `${field}.executionSequence`), [...bundledSceneBridgeContract.executionSequence], `${field}.executionSequence`);

    const testMatrix = responseRecordArray(record.testMatrix, `${field}.testMatrix`);
    requireResponseArrayEqual(
        testMatrix.map((entry) => String(entry.id)),
        bundledSceneBridgeContract.testMatrix.map((entry) => entry.id),
        `${field}.testMatrix.ids`
    );
    for (let index = 0; index < testMatrix.length; index += 1) {
        requireResponseEqual(testMatrix[index].required, true, `${field}.testMatrix.${index}.required`);
        requireResponseEqual(testMatrix[index].status, "planned", `${field}.testMatrix.${index}.status`);
        requireResponseEqual(testMatrix[index].dispatch, false, `${field}.testMatrix.${index}.dispatch`);
    }

    const sideEffects = responseRecord(record.sideEffects, `${field}.sideEffects`);
    for (const property of [
        "browserProcessStarted",
        "runtimeExecutionRegistered",
        "runtimeAdapterImported",
        "runtimeAssetsLoaded",
        "assetManifestMaterialized",
        "networkDispatch",
        "dispatch",
        "localFileWrites",
    ]) {
        requireResponseEqual(sideEffects[property], false, `${field}.sideEffects.${property}`);
    }

    const redaction = responseRecord(record.redaction, `${field}.redaction`);
    for (const property of [
        "sourceDataValuesIncluded",
        "pageValuesIncluded",
        "artifactValuesIncluded",
        "mediaValuesIncluded",
        "tokenValuesIncluded",
        "pathValuesIncluded",
    ]) {
        requireResponseEqual(redaction[property], false, `${field}.redaction.${property}`);
    }

    const omitted = responseRecord(record.omitted, `${field}.omitted`);
    for (const property of [
        "workspaceRoot",
        "cacheRoot",
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
        requireResponseEqual(omitted[property], true, `${field}.omitted.${property}`);
    }
    requireResponseEqual(record.execution ?? null, null, `${field}.execution`);
}

function validateBundledSceneBridgeAdapterModuleResponse(actual: unknown, field: string): void {
    const record = responseRecord(actual, field);
    requireResponseEqual(record.status, bundledSceneBridgeAdapterModule.status, `${field}.status`);
    requireResponseEqual(record.readinessVersion, bundledSceneBridgeAdapterModule.readinessVersion, `${field}.readinessVersion`);
    requireResponseEqual(record.owner, bundledSceneBridgeAdapterModule.owner, `${field}.owner`);
    requireResponseEqual(record.mode, bundledSceneBridgeAdapterModule.mode, `${field}.mode`);
    requireResponseEqual(record.module, bundledSceneBridgeAdapterModule.module, `${field}.module`);
    requireResponseEqual(record.moduleType, bundledSceneBridgeAdapterModule.moduleType, `${field}.moduleType`);
    requireResponseEqual(record.exportName, bundledSceneBridgeAdapterModule.exportName, `${field}.exportName`);
    requireResponseEqual(record.factorySignature, bundledSceneBridgeAdapterModule.factorySignature, `${field}.factorySignature`);
    requireResponseEqual(record.implements, bundledSceneBridgeAdapterModule.implements, `${field}.implements`);
    requireResponseEqual(record.lifecycleHook, bundledSceneBridgeAdapterModule.lifecycleHook, `${field}.lifecycleHook`);
    requireResponseEqual(record.defaultServiceImport, false, `${field}.defaultServiceImport`);
    requireResponseEqual(record.moduleDefined, true, `${field}.moduleDefined`);

    for (const property of [
        "moduleImported",
        "factoryInvoked",
        "runtimeRegistration",
        "runtimeExecutionRegistered",
        "browserProcessStarted",
        "browserPageCreated",
        "runtimeAssetsLoaded",
        "assetMaterializationWritesEnabled",
        "backendRpcReads",
        "sourceDataReads",
        "networkDispatch",
        "dispatch",
        "localFileWrites",
        "valuesIncluded",
    ]) {
        requireResponseEqual(record[property], false, `${field}.${property}`);
    }

    const diagnostics = responseRecordArray(record.diagnostics, `${field}.diagnostics`);
    requireResponseEqual(diagnostics.length, bundledSceneBridgeAdapterModule.diagnostics.length, `${field}.diagnostics.length`);
    requireResponseEqual(diagnostics[0].code, bundledSceneBridgeAdapterModule.diagnostics[0].code, `${field}.diagnostics.0.code`);
    requireResponseEqual(diagnostics[0].severity, bundledSceneBridgeAdapterModule.diagnostics[0].severity, `${field}.diagnostics.0.severity`);
    requireResponseArrayEqual(
        responseStringArray(record, "diagnosticCodes", `${field}.diagnosticCodes`),
        [...bundledSceneBridgeAdapterModule.diagnosticCodes],
        `${field}.diagnosticCodes`
    );
    requireResponseArrayEqual(
        responseStringArray(record, "nextActions", `${field}.nextActions`),
        [...bundledSceneBridgeAdapterModule.nextActions],
        `${field}.nextActions`
    );

    const sideEffects = responseRecord(record.sideEffects, `${field}.sideEffects`);
    for (const property of [
        "browserProcessStarted",
        "browserPageCreated",
        "runtimeExecutionRegistered",
        "runtimeAdapterImported",
        "runtimeFactoryInvoked",
        "runtimeAssetsLoaded",
        "assetManifestMaterialized",
        "backendRpcReads",
        "sourceDataReads",
        "networkDispatch",
        "dispatch",
        "localFileWrites",
    ]) {
        requireResponseEqual(sideEffects[property], false, `${field}.sideEffects.${property}`);
    }

    const redaction = responseRecord(record.redaction, `${field}.redaction`);
    for (const property of [
        "pathValuesIncluded",
        "sourceDataValuesIncluded",
        "pageValuesIncluded",
        "artifactValuesIncluded",
        "mediaValuesIncluded",
        "tokenValuesIncluded",
    ]) {
        requireResponseEqual(redaction[property], false, `${field}.redaction.${property}`);
    }

    const omitted = responseRecord(record.omitted, `${field}.omitted`);
    for (const property of [
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
        requireResponseEqual(omitted[property], true, `${field}.omitted.${property}`);
    }
    requireResponseEqual(record.execution ?? null, null, `${field}.execution`);
}

function validateBundledSceneBridgeImportGateResponse(actual: unknown, field: string): void {
    const record = responseRecord(actual, field);
    const status = String(record.status);
    if (!["planned-disabled", "configured-disabled", "invalid"].includes(status)) {
        responseInvalid(`${field}.status must be planned-disabled, configured-disabled, or invalid.`, `${field}.status`);
    }
    requireResponseEqual(record.gateVersion, "P26.34", `${field}.gateVersion`);
    requireResponseEqual(record.owner, "renderer-service", `${field}.owner`);
    requireResponseEqual(record.mode, "explicit-import-gate", `${field}.mode`);
    requireResponseEqual(record.env, BUNDLED_SCENE_BRIDGE_RUNTIME_ENV, `${field}.env`);
    requireResponseEqual(record.expectedValue, BUNDLED_SCENE_BRIDGE_RUNTIME_EXPECTED_VALUE, `${field}.expectedValue`);
    requireResponseArrayEqual(
        responseStringArray(record, "acceptedValues", `${field}.acceptedValues`),
        [...BUNDLED_SCENE_BRIDGE_RUNTIME_ACCEPTED_VALUES],
        `${field}.acceptedValues`
    );
    requireResponseEqual(typeof record.configured, "boolean", `${field}.configured.type`);
    requireResponseEqual(typeof record.requested, "boolean", `${field}.requested.type`);
    requireResponseEqual(typeof record.importGateRequested, "boolean", `${field}.importGateRequested.type`);
    requireResponseEqual(typeof record.registrationPreflightRequested, "boolean", `${field}.registrationPreflightRequested.type`);
    requireResponseEqual(typeof record.valid, "boolean", `${field}.valid.type`);
    if (status === "configured-disabled") {
        requireResponseEqual(record.configured, true, `${field}.configured`);
        requireResponseEqual(record.requested, true, `${field}.requested`);
        requireResponseEqual(record.valid, true, `${field}.valid`);
        requireResponseEqual(
            record.importGateRequested === true || record.registrationPreflightRequested === true,
            true,
            `${field}.acceptedRequest`
        );
    }
    if (status === "planned-disabled") {
        requireResponseEqual(record.valid, true, `${field}.valid`);
    }
    if (status === "invalid") {
        requireResponseEqual(record.valid, false, `${field}.valid`);
    }

    const configuration = responseRecord(record.configuration, `${field}.configuration`);
    requireResponseEqual(typeof configuration.configured, "boolean", `${field}.configuration.configured.type`);
    requireResponseEqual(configuration.expectedValue, BUNDLED_SCENE_BRIDGE_RUNTIME_EXPECTED_VALUE, `${field}.configuration.expectedValue`);
    requireResponseArrayEqual(
        responseStringArray(configuration, "acceptedValues", `${field}.configuration.acceptedValues`),
        [...BUNDLED_SCENE_BRIDGE_RUNTIME_ACCEPTED_VALUES],
        `${field}.configuration.acceptedValues`
    );
    requireResponseEqual(configuration.valueRead, false, `${field}.configuration.valueRead`);
    requireResponseEqual(configuration.valuesIncluded, false, `${field}.configuration.valuesIncluded`);
    requireResponseEqual(typeof configuration.accepted, "boolean", `${field}.configuration.accepted.type`);
    requireResponseEqual(typeof configuration.importGateAccepted, "boolean", `${field}.configuration.importGateAccepted.type`);
    requireResponseEqual(typeof configuration.registrationPreflightAccepted, "boolean", `${field}.configuration.registrationPreflightAccepted.type`);
    requireResponseEqual(configuration.importGateAccepted === true && configuration.registrationPreflightAccepted === true, false, `${field}.configuration.acceptedModeExclusive`);

    const conflicts = responseRecord(record.conflicts, `${field}.conflicts`);
    for (const property of ["runtimeModule", "browserFixtureRuntime", "injectedRuntime"]) {
        requireResponseEqual(typeof conflicts[property], "boolean", `${field}.conflicts.${property}.type`);
    }

    const gate = responseRecord(record.gate, `${field}.gate`);
    requireResponseEqual(gate.importRequiresExplicitConfig, true, `${field}.gate.importRequiresExplicitConfig`);
    for (const property of [
        "importEnabled",
        "importAttempted",
        "moduleImported",
        "factoryInvoked",
        "runtimeRegistration",
        "runtimeExecutionRegistered",
    ]) {
        requireResponseEqual(gate[property], false, `${field}.gate.${property}`);
    }

    const diagnostics = responseRecordArray(record.diagnostics, `${field}.diagnostics`);
    if (diagnostics.length === 0) {
        responseInvalid(`${field}.diagnostics must include at least one entry.`, `${field}.diagnostics`);
    }
    const diagnosticCodes = responseStringArray(record, "diagnosticCodes", `${field}.diagnosticCodes`);
    if (diagnosticCodes.length === 0) {
        responseInvalid(`${field}.diagnosticCodes must include at least one code.`, `${field}.diagnosticCodes`);
    }
    for (const diagnostic of diagnostics) {
        const code = String(diagnostic.code);
        if (!diagnosticCodes.includes(code)) {
            responseInvalid(`${field}.diagnostics code must be listed in diagnosticCodes.`, `${field}.diagnostics.code`);
        }
        requireResponseEqual(diagnostic.valueRead, false, `${field}.diagnostics.${code}.valueRead`);
        requireResponseEqual(diagnostic.valuesIncluded, false, `${field}.diagnostics.${code}.valuesIncluded`);
    }
    requireResponseArrayEqual(
        responseStringArray(record, "nextActions", `${field}.nextActions`),
        [...new Set(diagnostics.flatMap((entry) => responseStringArray(entry, "nextActions", `${field}.diagnostics.nextActions`)))],
        `${field}.nextActions`
    );

    const sideEffects = responseRecord(record.sideEffects, `${field}.sideEffects`);
    for (const property of [
        "browserProcessStarted",
        "browserPageCreated",
        "runtimeExecutionRegistered",
        "runtimeAdapterImported",
        "runtimeFactoryInvoked",
        "runtimeAssetsLoaded",
        "assetManifestMaterialized",
        "backendRpcReads",
        "sourceDataReads",
        "networkDispatch",
        "dispatch",
        "localFileWrites",
    ]) {
        requireResponseEqual(sideEffects[property], false, `${field}.sideEffects.${property}`);
    }

    const redaction = responseRecord(record.redaction, `${field}.redaction`);
    for (const property of [
        "modeValuesIncluded",
        "pathValuesIncluded",
        "sourceDataValuesIncluded",
        "pageValuesIncluded",
        "artifactValuesIncluded",
        "mediaValuesIncluded",
        "tokenValuesIncluded",
    ]) {
        requireResponseEqual(redaction[property], false, `${field}.redaction.${property}`);
    }

    const omitted = responseRecord(record.omitted, `${field}.omitted`);
    for (const property of [
        "configuredValue",
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
        requireResponseEqual(omitted[property], true, `${field}.omitted.${property}`);
    }
    requireResponseEqual(record.execution ?? null, null, `${field}.execution`);
}

function validateBundledSceneBridgeFactoryShapePreflightResponse(actual: unknown, field: string): void {
    const record = responseRecord(actual, field);
    requireResponseEqual(record.status, bundledSceneBridgeFactoryShapePreflight.status, `${field}.status`);
    requireResponseEqual(record.preflightVersion, bundledSceneBridgeFactoryShapePreflight.preflightVersion, `${field}.preflightVersion`);
    requireResponseEqual(record.owner, bundledSceneBridgeFactoryShapePreflight.owner, `${field}.owner`);
    requireResponseEqual(record.mode, bundledSceneBridgeFactoryShapePreflight.mode, `${field}.mode`);

    const source = responseRecord(record.source, `${field}.source`);
    requireResponseEqual(source.contractVersion, bundledSceneBridgeFactoryShapePreflight.source.contractVersion, `${field}.source.contractVersion`);
    requireResponseEqual(
        source.adapterModuleReadinessVersion,
        bundledSceneBridgeFactoryShapePreflight.source.adapterModuleReadinessVersion,
        `${field}.source.adapterModuleReadinessVersion`
    );
    requireResponseEqual(source.importGateVersion, bundledSceneBridgeFactoryShapePreflight.source.importGateVersion, `${field}.source.importGateVersion`);
    requireResponseEqual(source.importGateRequired, true, `${field}.source.importGateRequired`);
    requireResponseEqual(source.importGateOpen, false, `${field}.source.importGateOpen`);
    requireResponseEqual(source.readiness, bundledSceneBridgeFactoryShapePreflight.source.readiness, `${field}.source.readiness`);

    const moduleImport = responseRecord(record.moduleImport, `${field}.moduleImport`);
    requireResponseEqual(moduleImport.module, bundledSceneBridgeFactoryShapePreflight.moduleImport.module, `${field}.moduleImport.module`);
    requireResponseEqual(moduleImport.moduleType, bundledSceneBridgeFactoryShapePreflight.moduleImport.moduleType, `${field}.moduleImport.moduleType`);
    requireResponseEqual(moduleImport.exportName, bundledSceneBridgeFactoryShapePreflight.moduleImport.exportName, `${field}.moduleImport.exportName`);
    for (const property of ["importAttempted", "moduleImported", "namespaceInspected", "valuesIncluded"]) {
        requireResponseEqual(moduleImport[property], false, `${field}.moduleImport.${property}`);
    }

    const factoryShape = responseRecord(record.factoryShape, `${field}.factoryShape`);
    requireResponseEqual(factoryShape.expectedType, bundledSceneBridgeFactoryShapePreflight.factoryShape.expectedType, `${field}.factoryShape.expectedType`);
    requireResponseEqual(
        factoryShape.expectedSignature,
        bundledSceneBridgeFactoryShapePreflight.factoryShape.expectedSignature,
        `${field}.factoryShape.expectedSignature`
    );
    requireResponseArrayEqual(
        responseStringArray(factoryShape, "requiredOptionKeys", `${field}.factoryShape.requiredOptionKeys`),
        [...bundledSceneBridgeFactoryShapePreflight.factoryShape.requiredOptionKeys],
        `${field}.factoryShape.requiredOptionKeys`
    );
    for (const property of [
        "factoryPresent",
        "shapeCheckAttempted",
        "callableChecked",
        "optionsShapeValidated",
        "promiseReturnValidated",
        "factoryInvoked",
        "valuesIncluded",
    ]) {
        requireResponseEqual(factoryShape[property], false, `${field}.factoryShape.${property}`);
    }

    const runtimeOptionsShape = responseRecord(record.runtimeOptionsShape, `${field}.runtimeOptionsShape`);
    requireResponseEqual(
        runtimeOptionsShape.expectedType,
        bundledSceneBridgeFactoryShapePreflight.runtimeOptionsShape.expectedType,
        `${field}.runtimeOptionsShape.expectedType`
    );
    requireResponseArrayEqual(
        responseStringArray(runtimeOptionsShape, "requiredKeys", `${field}.runtimeOptionsShape.requiredKeys`),
        [...bundledSceneBridgeFactoryShapePreflight.runtimeOptionsShape.requiredKeys],
        `${field}.runtimeOptionsShape.requiredKeys`
    );
    requireResponseArrayEqual(
        responseStringArray(runtimeOptionsShape, "optionalKeys", `${field}.runtimeOptionsShape.optionalKeys`),
        [...bundledSceneBridgeFactoryShapePreflight.runtimeOptionsShape.optionalKeys],
        `${field}.runtimeOptionsShape.optionalKeys`
    );
    requireResponseEqual(
        runtimeOptionsShape.renderThumbnailExpectedType,
        bundledSceneBridgeFactoryShapePreflight.runtimeOptionsShape.renderThumbnailExpectedType,
        `${field}.runtimeOptionsShape.renderThumbnailExpectedType`
    );
    requireResponseEqual(runtimeOptionsShape.closeExpectedType, bundledSceneBridgeFactoryShapePreflight.runtimeOptionsShape.closeExpectedType, `${field}.runtimeOptionsShape.closeExpectedType`);
    for (const property of [
        "runtimeOptionsCreated",
        "shapeCheckAttempted",
        "renderThumbnailChecked",
        "closeHookChecked",
        "runtimeRegistration",
        "runtimeExecutionRegistered",
        "valuesIncluded",
    ]) {
        requireResponseEqual(runtimeOptionsShape[property], false, `${field}.runtimeOptionsShape.${property}`);
    }

    const importOutcomeTaxonomy = responseRecordArray(record.importOutcomeTaxonomy, `${field}.importOutcomeTaxonomy`);
    requireResponseArrayEqual(
        importOutcomeTaxonomy.map((entry) => String(entry.code)),
        bundledSceneBridgeFactoryShapePreflight.importOutcomeTaxonomy.map((entry) => entry.code),
        `${field}.importOutcomeTaxonomy.codes`
    );
    for (const entry of importOutcomeTaxonomy) {
        requireResponseEqual(entry.retryable, false, `${field}.importOutcomeTaxonomy.${String(entry.code)}.retryable`);
        requireResponseEqual(entry.dispatch, false, `${field}.importOutcomeTaxonomy.${String(entry.code)}.dispatch`);
    }

    const diagnostics = responseRecordArray(record.diagnostics, `${field}.diagnostics`);
    requireResponseEqual(diagnostics.length, bundledSceneBridgeFactoryShapePreflight.diagnostics.length, `${field}.diagnostics.length`);
    requireResponseEqual(diagnostics[0].code, bundledSceneBridgeFactoryShapePreflight.diagnostics[0].code, `${field}.diagnostics.0.code`);
    requireResponseEqual(diagnostics[0].severity, bundledSceneBridgeFactoryShapePreflight.diagnostics[0].severity, `${field}.diagnostics.0.severity`);
    requireResponseArrayEqual(
        responseStringArray(record, "diagnosticCodes", `${field}.diagnosticCodes`),
        [...bundledSceneBridgeFactoryShapePreflight.diagnosticCodes],
        `${field}.diagnosticCodes`
    );
    requireResponseArrayEqual(
        responseStringArray(record, "nextActions", `${field}.nextActions`),
        [...bundledSceneBridgeFactoryShapePreflight.nextActions],
        `${field}.nextActions`
    );

    const checks = responseRecordArray(record.checks, `${field}.checks`);
    requireResponseArrayEqual(
        checks.map((entry) => String(entry.id)),
        bundledSceneBridgeFactoryShapePreflight.checks.map((entry) => entry.id),
        `${field}.checks.ids`
    );
    for (const check of checks) {
        requireResponseEqual(check.required, true, `${field}.checks.${String(check.id)}.required`);
        requireResponseEqual(check.dispatch, false, `${field}.checks.${String(check.id)}.dispatch`);
    }

    const sideEffects = responseRecord(record.sideEffects, `${field}.sideEffects`);
    for (const property of [
        "browserProcessStarted",
        "browserPageCreated",
        "runtimeExecutionRegistered",
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
        requireResponseEqual(sideEffects[property], false, `${field}.sideEffects.${property}`);
    }

    const redaction = responseRecord(record.redaction, `${field}.redaction`);
    for (const property of [
        "moduleValuesIncluded",
        "pathValuesIncluded",
        "sourceDataValuesIncluded",
        "pageValuesIncluded",
        "artifactValuesIncluded",
        "mediaValuesIncluded",
        "tokenValuesIncluded",
    ]) {
        requireResponseEqual(redaction[property], false, `${field}.redaction.${property}`);
    }

    const omitted = responseRecord(record.omitted, `${field}.omitted`);
    for (const property of [
        "moduleNamespace",
        "factoryValue",
        "runtimeOptionsValue",
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
        requireResponseEqual(omitted[property], true, `${field}.omitted.${property}`);
    }
    requireResponseEqual(record.execution ?? null, null, `${field}.execution`);
}

function validateBundledSceneBridgeModuleNamespaceImportPreflightResponse(actual: unknown, field: string): void {
    const record = responseRecord(actual, field);
    const status = String(record.status);
    if (!["planned-disabled", "blocked", "ready", "invalid"].includes(status)) {
        responseInvalid(`${field}.status must be planned-disabled, blocked, ready, or invalid.`, `${field}.status`);
    }
    requireResponseEqual(record.preflightVersion, "P26.36", `${field}.preflightVersion`);
    requireResponseEqual(record.owner, "renderer-service", `${field}.owner`);
    requireResponseEqual(record.mode, "gated-module-namespace-import-preflight", `${field}.mode`);

    const source = responseRecord(record.source, `${field}.source`);
    requireResponseEqual(source.contractVersion, "P26.32", `${field}.source.contractVersion`);
    requireResponseEqual(source.adapterModuleReadinessVersion, "P26.33", `${field}.source.adapterModuleReadinessVersion`);
    requireResponseEqual(source.importGateVersion, "P26.34", `${field}.source.importGateVersion`);
    requireResponseEqual(source.factoryShapePreflightVersion, "P26.35", `${field}.source.factoryShapePreflightVersion`);
    requireResponseEqual(source.importGateRequired, true, `${field}.source.importGateRequired`);
    requireResponseEqual(typeof source.importGateOpen, "boolean", `${field}.source.importGateOpen.type`);

    const moduleImport = responseRecord(record.moduleImport, `${field}.moduleImport`);
    requireResponseEqual(moduleImport.module, "./bundled-scene-bridge-runtime.js", `${field}.moduleImport.module`);
    requireResponseEqual(moduleImport.moduleType, "service-owned-es-module", `${field}.moduleImport.moduleType`);
    requireResponseEqual(moduleImport.exportName, "createBundledSceneBridgeRendererRuntime", `${field}.moduleImport.exportName`);
    for (const property of ["importAttempted", "moduleImported", "namespaceInspected", "importSucceeded", "valuesIncluded"]) {
        requireResponseEqual(typeof moduleImport[property], "boolean", `${field}.moduleImport.${property}.type`);
    }
    requireResponseEqual(moduleImport.valuesIncluded, false, `${field}.moduleImport.valuesIncluded`);
    if (status === "planned-disabled" || status === "blocked") {
        for (const property of ["importAttempted", "moduleImported", "namespaceInspected", "importSucceeded"]) {
            requireResponseEqual(moduleImport[property], false, `${field}.moduleImport.${property}`);
        }
    }
    if (status === "ready") {
        requireResponseEqual(moduleImport.importAttempted, true, `${field}.moduleImport.importAttempted`);
        requireResponseEqual(moduleImport.moduleImported, true, `${field}.moduleImport.moduleImported`);
        requireResponseEqual(moduleImport.namespaceInspected, true, `${field}.moduleImport.namespaceInspected`);
        requireResponseEqual(moduleImport.importSucceeded, true, `${field}.moduleImport.importSucceeded`);
        requireResponseEqual(source.importGateOpen, true, `${field}.source.importGateOpen`);
    }

    const factoryShape = responseRecord(record.factoryShape, `${field}.factoryShape`);
    requireResponseEqual(factoryShape.expectedType, "function", `${field}.factoryShape.expectedType`);
    requireResponseEqual(factoryShape.expectedSignature, "(options) => Promise<RendererRuntimeOptions>", `${field}.factoryShape.expectedSignature`);
    for (const property of ["factoryPresent", "callableChecked", "factoryCallable", "factoryInvoked", "valuesIncluded"]) {
        requireResponseEqual(typeof factoryShape[property], "boolean", `${field}.factoryShape.${property}.type`);
    }
    requireResponseEqual(factoryShape.factoryInvoked, false, `${field}.factoryShape.factoryInvoked`);
    requireResponseEqual(factoryShape.valuesIncluded, false, `${field}.factoryShape.valuesIncluded`);
    if (status === "ready") {
        requireResponseEqual(factoryShape.factoryPresent, true, `${field}.factoryShape.factoryPresent`);
        requireResponseEqual(factoryShape.callableChecked, true, `${field}.factoryShape.callableChecked`);
        requireResponseEqual(factoryShape.factoryCallable, true, `${field}.factoryShape.factoryCallable`);
    }

    const runtimeOptionsShape = responseRecord(record.runtimeOptionsShape, `${field}.runtimeOptionsShape`);
    for (const property of [
        "runtimeOptionsCreated",
        "shapeCheckAttempted",
        "runtimeRegistration",
        "runtimeExecutionRegistered",
        "valuesIncluded",
    ]) {
        requireResponseEqual(runtimeOptionsShape[property], false, `${field}.runtimeOptionsShape.${property}`);
    }

    const importOutcomeTaxonomy = responseRecordArray(record.importOutcomeTaxonomy, `${field}.importOutcomeTaxonomy`);
    requireResponseArrayEqual(
        importOutcomeTaxonomy.map((entry) => String(entry.code)),
        bundledSceneBridgeModuleNamespaceImportPreflight.importOutcomeTaxonomy.map((entry) => entry.code),
        `${field}.importOutcomeTaxonomy.codes`
    );
    for (const entry of importOutcomeTaxonomy) {
        requireResponseEqual(entry.dispatch, false, `${field}.importOutcomeTaxonomy.${String(entry.code)}.dispatch`);
    }

    const diagnostics = responseRecordArray(record.diagnostics, `${field}.diagnostics`);
    if (diagnostics.length === 0) {
        responseInvalid(`${field}.diagnostics must include at least one entry.`, `${field}.diagnostics`);
    }
    const diagnosticCodes = responseStringArray(record, "diagnosticCodes", `${field}.diagnosticCodes`);
    if (diagnosticCodes.length === 0) {
        responseInvalid(`${field}.diagnosticCodes must include at least one code.`, `${field}.diagnosticCodes`);
    }
    for (const diagnostic of diagnostics) {
        if (!diagnosticCodes.includes(String(diagnostic.code))) {
            responseInvalid(`${field}.diagnostics code must be listed in diagnosticCodes.`, `${field}.diagnostics.code`);
        }
    }
    requireResponseArrayEqual(
        responseStringArray(record, "nextActions", `${field}.nextActions`),
        [...new Set(diagnostics.flatMap((entry) => responseStringArray(entry, "nextActions", `${field}.diagnostics.nextActions`)))],
        `${field}.nextActions`
    );

    const checks = responseRecordArray(record.checks, `${field}.checks`);
    requireResponseArrayEqual(
        checks.map((entry) => String(entry.id)),
        bundledSceneBridgeModuleNamespaceImportPreflight.checks.map((entry) => entry.id),
        `${field}.checks.ids`
    );
    for (const check of checks) {
        requireResponseEqual(check.dispatch, false, `${field}.checks.${String(check.id)}.dispatch`);
    }

    const sideEffects = responseRecord(record.sideEffects, `${field}.sideEffects`);
    for (const property of [
        "browserProcessStarted",
        "browserPageCreated",
        "runtimeExecutionRegistered",
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
        requireResponseEqual(sideEffects[property], false, `${field}.sideEffects.${property}`);
    }
    requireResponseEqual(typeof sideEffects.runtimeAdapterImported, "boolean", `${field}.sideEffects.runtimeAdapterImported.type`);
    if (status === "planned-disabled" || status === "blocked") {
        requireResponseEqual(sideEffects.runtimeAdapterImported, false, `${field}.sideEffects.runtimeAdapterImported`);
    }

    const redaction = responseRecord(record.redaction, `${field}.redaction`);
    for (const property of [
        "moduleValuesIncluded",
        "pathValuesIncluded",
        "sourceDataValuesIncluded",
        "pageValuesIncluded",
        "artifactValuesIncluded",
        "mediaValuesIncluded",
        "tokenValuesIncluded",
    ]) {
        requireResponseEqual(redaction[property], false, `${field}.redaction.${property}`);
    }

    const omitted = responseRecord(record.omitted, `${field}.omitted`);
    for (const property of [
        "moduleNamespace",
        "factoryValue",
        "runtimeOptionsValue",
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
        requireResponseEqual(omitted[property], true, `${field}.omitted.${property}`);
    }

    if (record.execution !== null) {
        const execution = responseRecord(record.execution, `${field}.execution`);
        requireResponseEqual(execution.attempted, true, `${field}.execution.attempted`);
        requireResponseEqual(execution.importGateAccepted, true, `${field}.execution.importGateAccepted`);
        requireResponseEqual(typeof execution.succeeded, "boolean", `${field}.execution.succeeded.type`);
        requireResponseEqual(typeof execution.moduleImported, "boolean", `${field}.execution.moduleImported.type`);
        requireResponseEqual(typeof execution.namespaceInspected, "boolean", `${field}.execution.namespaceInspected.type`);
        requireResponseEqual(typeof execution.factoryPresent, "boolean", `${field}.execution.factoryPresent.type`);
        requireResponseEqual(typeof execution.factoryCallable, "boolean", `${field}.execution.factoryCallable.type`);
        requireResponseEqual(execution.factoryInvoked, false, `${field}.execution.factoryInvoked`);
        requireResponseEqual(execution.runtimeOptionsCreated, false, `${field}.execution.runtimeOptionsCreated`);
        requireResponseEqual(execution.runtimeRegistration, false, `${field}.execution.runtimeRegistration`);
        requireResponseEqual(execution.valuesIncluded, false, `${field}.execution.valuesIncluded`);
    }
}

function validateBundledSceneBridgeFactoryInvocationPreflightResponse(actual: unknown, field: string): void {
    const record = responseRecord(actual, field);
    const status = String(record.status);
    if (!["planned-disabled", "ready", "invalid"].includes(status)) {
        responseInvalid(`${field}.status must be planned-disabled, ready, or invalid.`, `${field}.status`);
    }
    requireResponseEqual(record.preflightVersion, "P26.38", `${field}.preflightVersion`);
    requireResponseEqual(record.owner, "renderer-service", `${field}.owner`);
    requireResponseEqual(record.mode, "guarded-factory-invocation-preflight", `${field}.mode`);

    const source = responseRecord(record.source, `${field}.source`);
    requireResponseEqual(source.contractVersion, "P26.32", `${field}.source.contractVersion`);
    requireResponseEqual(source.adapterModuleReadinessVersion, "P26.33", `${field}.source.adapterModuleReadinessVersion`);
    requireResponseEqual(source.importGateVersion, "P26.34", `${field}.source.importGateVersion`);
    requireResponseEqual(source.factoryShapePreflightVersion, "P26.35", `${field}.source.factoryShapePreflightVersion`);
    requireResponseEqual(source.moduleNamespaceImportPreflightVersion, "P26.36", `${field}.source.moduleNamespaceImportPreflightVersion`);
    requireResponseEqual(typeof source.namespaceImportReady, "boolean", `${field}.source.namespaceImportReady.type`);
    if (status === "ready") {
        requireResponseEqual(source.namespaceImportReady, true, `${field}.source.namespaceImportReady`);
    }

    const guard = responseRecord(record.guard, `${field}.guard`);
    requireResponseEqual(guard.namespaceImportRequired, true, `${field}.guard.namespaceImportRequired`);
    requireResponseEqual(guard.explicitFutureInvocationGateRequired, true, `${field}.guard.explicitFutureInvocationGateRequired`);
    for (const property of ["invocationEnabled", "invocationAttempted", "factoryInvoked", "runtimeOptionsCreated"]) {
        requireResponseEqual(typeof guard[property], "boolean", `${field}.guard.${property}.type`);
    }
    for (const property of ["runtimeRegistration", "runtimeExecutionRegistered"]) {
        requireResponseEqual(guard[property], false, `${field}.guard.${property}`);
    }
    if (status === "planned-disabled") {
        for (const property of ["invocationEnabled", "invocationAttempted", "factoryInvoked", "runtimeOptionsCreated"]) {
            requireResponseEqual(guard[property], false, `${field}.guard.${property}`);
        }
    }

    const factoryInvocation = responseRecord(record.factoryInvocation, `${field}.factoryInvocation`);
    requireResponseEqual(factoryInvocation.exportName, "createBundledSceneBridgeRendererRuntime", `${field}.factoryInvocation.exportName`);
    requireResponseEqual(
        factoryInvocation.expectedSignature,
        "(options) => Promise<RendererRuntimeOptions>",
        `${field}.factoryInvocation.expectedSignature`
    );
    requireResponseEqual(factoryInvocation.inertOptionsRequired, true, `${field}.factoryInvocation.inertOptionsRequired`);
    for (const property of ["invocationAttempted", "factoryInvoked", "promiseAwaited", "resultAccepted"]) {
        requireResponseEqual(typeof factoryInvocation[property], "boolean", `${field}.factoryInvocation.${property}.type`);
    }
    requireResponseEqual(factoryInvocation.valuesIncluded, false, `${field}.factoryInvocation.valuesIncluded`);
    if (status === "planned-disabled") {
        for (const property of ["invocationAttempted", "factoryInvoked", "promiseAwaited", "resultAccepted"]) {
            requireResponseEqual(factoryInvocation[property], false, `${field}.factoryInvocation.${property}`);
        }
    }

    const inertOptionsPlan = responseRecord(record.inertOptionsPlan, `${field}.inertOptionsPlan`);
    requireResponseArrayEqual(
        responseStringArray(inertOptionsPlan, "requiredOptionKeys", `${field}.inertOptionsPlan.requiredOptionKeys`),
        ["assetManifest", "runtimeAssetPreflight", "browser"],
        `${field}.inertOptionsPlan.requiredOptionKeys`
    );
    requireResponseEqual(inertOptionsPlan.assetManifestSource, "runtimeAssetManifest", `${field}.inertOptionsPlan.assetManifestSource`);
    requireResponseEqual(
        inertOptionsPlan.runtimeAssetPreflightSource,
        "runtimeAssetMaterializationPreflight",
        `${field}.inertOptionsPlan.runtimeAssetPreflightSource`
    );
    requireResponseEqual(inertOptionsPlan.browserSource, "inert-browser-handle-placeholder", `${field}.inertOptionsPlan.browserSource`);
    requireResponseEqual(typeof inertOptionsPlan.optionValuesCreated, "boolean", `${field}.inertOptionsPlan.optionValuesCreated.type`);
    if (status === "planned-disabled") {
        requireResponseEqual(inertOptionsPlan.optionValuesCreated, false, `${field}.inertOptionsPlan.optionValuesCreated`);
    }
    for (const property of [
        "optionValuesIncluded",
        "assetManifestValueIncluded",
        "runtimeAssetPreflightValueIncluded",
        "browserValueIncluded",
        "browserProcessStarted",
        "runtimeAssetsLoaded",
        "assetManifestMaterialized",
    ]) {
        requireResponseEqual(inertOptionsPlan[property], false, `${field}.inertOptionsPlan.${property}`);
    }

    const runtimeOptionsShape = responseRecord(record.runtimeOptionsShape, `${field}.runtimeOptionsShape`);
    requireResponseEqual(runtimeOptionsShape.expectedType, "RendererRuntimeOptions", `${field}.runtimeOptionsShape.expectedType`);
    requireResponseArrayEqual(
        responseStringArray(runtimeOptionsShape, "requiredKeys", `${field}.runtimeOptionsShape.requiredKeys`),
        ["renderThumbnail"],
        `${field}.runtimeOptionsShape.requiredKeys`
    );
    requireResponseArrayEqual(
        responseStringArray(runtimeOptionsShape, "optionalKeys", `${field}.runtimeOptionsShape.optionalKeys`),
        ["close"],
        `${field}.runtimeOptionsShape.optionalKeys`
    );
    for (const property of [
        "runtimeOptionsCreated",
        "shapeCheckAttempted",
        "renderThumbnailChecked",
        "closeHookChecked",
    ]) {
        requireResponseEqual(typeof runtimeOptionsShape[property], "boolean", `${field}.runtimeOptionsShape.${property}.type`);
    }
    for (const property of [
        "runtimeRegistration",
        "runtimeExecutionRegistered",
        "valuesIncluded",
    ]) {
        requireResponseEqual(runtimeOptionsShape[property], false, `${field}.runtimeOptionsShape.${property}`);
    }
    if (status === "planned-disabled") {
        for (const property of ["runtimeOptionsCreated", "shapeCheckAttempted", "renderThumbnailChecked", "closeHookChecked"]) {
            requireResponseEqual(runtimeOptionsShape[property], false, `${field}.runtimeOptionsShape.${property}`);
        }
    }

    const invocationOutcomeTaxonomy = responseRecordArray(record.invocationOutcomeTaxonomy, `${field}.invocationOutcomeTaxonomy`);
    requireResponseArrayEqual(
        invocationOutcomeTaxonomy.map((entry) => String(entry.code)),
        bundledSceneBridgeFactoryInvocationPreflight.invocationOutcomeTaxonomy.map((entry) => entry.code),
        `${field}.invocationOutcomeTaxonomy.codes`
    );
    for (const entry of invocationOutcomeTaxonomy) {
        requireResponseEqual(entry.dispatch, false, `${field}.invocationOutcomeTaxonomy.${String(entry.code)}.dispatch`);
    }

    const diagnostics = responseRecordArray(record.diagnostics, `${field}.diagnostics`);
    if (diagnostics.length === 0) {
        responseInvalid(`${field}.diagnostics must include at least one entry.`, `${field}.diagnostics`);
    }
    const diagnosticCodes = responseStringArray(record, "diagnosticCodes", `${field}.diagnosticCodes`);
    if (diagnosticCodes.length === 0) {
        responseInvalid(`${field}.diagnosticCodes must include at least one code.`, `${field}.diagnosticCodes`);
    }
    for (const diagnostic of diagnostics) {
        if (!diagnosticCodes.includes(String(diagnostic.code))) {
            responseInvalid(`${field}.diagnostics code must be listed in diagnosticCodes.`, `${field}.diagnostics.code`);
        }
    }
    requireResponseArrayEqual(
        responseStringArray(record, "nextActions", `${field}.nextActions`),
        [...new Set(diagnostics.flatMap((entry) => responseStringArray(entry, "nextActions", `${field}.diagnostics.nextActions`)))],
        `${field}.nextActions`
    );

    const checks = responseRecordArray(record.checks, `${field}.checks`);
    requireResponseArrayEqual(
        checks.map((entry) => String(entry.id)),
        bundledSceneBridgeFactoryInvocationPreflight.checks.map((entry) => entry.id),
        `${field}.checks.ids`
    );
    for (const check of checks) {
        requireResponseEqual(check.dispatch, false, `${field}.checks.${String(check.id)}.dispatch`);
    }

    const sideEffects = responseRecord(record.sideEffects, `${field}.sideEffects`);
    for (const property of ["runtimeAdapterImported", "runtimeFactoryInvoked", "runtimeOptionsCreated"]) {
        requireResponseEqual(typeof sideEffects[property], "boolean", `${field}.sideEffects.${property}.type`);
    }
    if (status === "planned-disabled") {
        for (const property of ["runtimeAdapterImported", "runtimeFactoryInvoked", "runtimeOptionsCreated"]) {
            requireResponseEqual(sideEffects[property], false, `${field}.sideEffects.${property}`);
        }
    }
    for (const property of [
        "browserProcessStarted",
        "browserPageCreated",
        "runtimeExecutionRegistered",
        "runtimeAssetsLoaded",
        "assetManifestMaterialized",
        "backendRpcReads",
        "sourceDataReads",
        "networkDispatch",
        "dispatch",
        "localFileWrites",
    ]) {
        requireResponseEqual(sideEffects[property], false, `${field}.sideEffects.${property}`);
    }

    const redaction = responseRecord(record.redaction, `${field}.redaction`);
    for (const property of [
        "moduleValuesIncluded",
        "factoryValuesIncluded",
        "runtimeOptionsValuesIncluded",
        "optionValuesIncluded",
        "pathValuesIncluded",
        "sourceDataValuesIncluded",
        "pageValuesIncluded",
        "artifactValuesIncluded",
        "mediaValuesIncluded",
        "tokenValuesIncluded",
    ]) {
        requireResponseEqual(redaction[property], false, `${field}.redaction.${property}`);
    }

    const omitted = responseRecord(record.omitted, `${field}.omitted`);
    for (const property of [
        "moduleNamespace",
        "factoryValue",
        "runtimeOptionsValue",
        "optionValues",
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
        requireResponseEqual(omitted[property], true, `${field}.omitted.${property}`);
    }

    if (record.execution !== null) {
        const execution = responseRecord(record.execution, `${field}.execution`);
        requireResponseEqual(execution.attempted, true, `${field}.execution.attempted`);
        requireResponseEqual(typeof execution.succeeded, "boolean", `${field}.execution.succeeded.type`);
        requireResponseEqual(typeof execution.outcome, "string", `${field}.execution.outcome.type`);
        requireResponseEqual(execution.namespaceImportReady, true, `${field}.execution.namespaceImportReady`);
        requireResponseEqual(typeof execution.moduleImported, "boolean", `${field}.execution.moduleImported.type`);
        requireResponseEqual(typeof execution.factoryInvoked, "boolean", `${field}.execution.factoryInvoked.type`);
        requireResponseEqual(typeof execution.inertOptionsCreated, "boolean", `${field}.execution.inertOptionsCreated.type`);
        requireResponseEqual(typeof execution.runtimeOptionsCreated, "boolean", `${field}.execution.runtimeOptionsCreated.type`);
        requireResponseEqual(typeof execution.runtimeOptionsShapeValid, "boolean", `${field}.execution.runtimeOptionsShapeValid.type`);
        requireResponseEqual(execution.runtimeRegistration, false, `${field}.execution.runtimeRegistration`);
        requireResponseEqual(execution.renderDispatch, false, `${field}.execution.renderDispatch`);
        requireResponseEqual(execution.browserProcessStarted, false, `${field}.execution.browserProcessStarted`);
        requireResponseEqual(execution.runtimeAssetsLoaded, false, `${field}.execution.runtimeAssetsLoaded`);
        requireResponseEqual(execution.assetManifestMaterialized, false, `${field}.execution.assetManifestMaterialized`);
        requireResponseEqual(execution.valuesIncluded, false, `${field}.execution.valuesIncluded`);
        requireResponseEqual(guard.invocationAttempted, true, `${field}.guard.invocationAttempted`);
        requireResponseEqual(guard.factoryInvoked, execution.factoryInvoked, `${field}.guard.factoryInvoked`);
        requireResponseEqual(guard.runtimeOptionsCreated, execution.runtimeOptionsCreated, `${field}.guard.runtimeOptionsCreated`);
        requireResponseEqual(factoryInvocation.invocationAttempted, execution.factoryInvoked, `${field}.factoryInvocation.invocationAttempted`);
        requireResponseEqual(factoryInvocation.factoryInvoked, execution.factoryInvoked, `${field}.factoryInvocation.factoryInvoked`);
        requireResponseEqual(factoryInvocation.promiseAwaited, execution.factoryInvoked, `${field}.factoryInvocation.promiseAwaited`);
        requireResponseEqual(inertOptionsPlan.optionValuesCreated, execution.inertOptionsCreated, `${field}.inertOptionsPlan.optionValuesCreated`);
        requireResponseEqual(runtimeOptionsShape.runtimeOptionsCreated, execution.runtimeOptionsCreated, `${field}.runtimeOptionsShape.runtimeOptionsCreated`);
        requireResponseEqual(sideEffects.runtimeFactoryInvoked, execution.factoryInvoked, `${field}.sideEffects.runtimeFactoryInvoked`);
        requireResponseEqual(sideEffects.runtimeOptionsCreated, execution.runtimeOptionsCreated, `${field}.sideEffects.runtimeOptionsCreated`);
        if (status === "ready") {
            requireResponseEqual(execution.succeeded, true, `${field}.execution.succeeded`);
            requireResponseEqual(execution.outcome, "ready", `${field}.execution.outcome`);
            requireResponseEqual(execution.factoryInvoked, true, `${field}.execution.factoryInvoked`);
            requireResponseEqual(execution.inertOptionsCreated, true, `${field}.execution.inertOptionsCreated`);
            requireResponseEqual(execution.runtimeOptionsCreated, true, `${field}.execution.runtimeOptionsCreated`);
            requireResponseEqual(execution.runtimeOptionsShapeValid, true, `${field}.execution.runtimeOptionsShapeValid`);
            requireResponseEqual(factoryInvocation.resultAccepted, true, `${field}.factoryInvocation.resultAccepted`);
            requireResponseEqual(runtimeOptionsShape.shapeCheckAttempted, true, `${field}.runtimeOptionsShape.shapeCheckAttempted`);
            requireResponseEqual(runtimeOptionsShape.renderThumbnailChecked, true, `${field}.runtimeOptionsShape.renderThumbnailChecked`);
            requireResponseEqual(runtimeOptionsShape.closeHookChecked, true, `${field}.runtimeOptionsShape.closeHookChecked`);
        }
    } else if (status !== "planned-disabled") {
        responseInvalid(`${field}.execution must be present for executed preflight statuses.`, `${field}.execution`);
    }
}

function validateBundledSceneBridgeRuntimeRegistrationPreflightResponse(actual: unknown, field: string): void {
    const record = responseRecord(actual, field);
    const status = String(record.status);
    if (!["planned-disabled", "ready", "invalid"].includes(status)) {
        responseInvalid(`${field}.status must be planned-disabled, ready, or invalid.`, `${field}.status`);
    }
    requireResponseEqual(record.preflightVersion, "P26.40", `${field}.preflightVersion`);
    requireResponseEqual(record.owner, "renderer-service", `${field}.owner`);
    requireResponseEqual(record.mode, "guarded-runtime-registration-preflight", `${field}.mode`);

    const source = responseRecord(record.source, `${field}.source`);
    requireResponseEqual(source.contractVersion, "P26.32", `${field}.source.contractVersion`);
    requireResponseEqual(source.adapterModuleReadinessVersion, "P26.33", `${field}.source.adapterModuleReadinessVersion`);
    requireResponseEqual(source.importGateVersion, "P26.34", `${field}.source.importGateVersion`);
    requireResponseEqual(source.factoryShapePreflightVersion, "P26.35", `${field}.source.factoryShapePreflightVersion`);
    requireResponseEqual(source.moduleNamespaceImportPreflightVersion, "P26.36", `${field}.source.moduleNamespaceImportPreflightVersion`);
    requireResponseEqual(source.factoryInvocationPreflightVersion, "P26.38", `${field}.source.factoryInvocationPreflightVersion`);
    requireResponseEqual(source.registrationPreflightGateVersion, "P26.40", `${field}.source.registrationPreflightGateVersion`);
    for (const property of ["factoryInvocationReady", "factoryInvocationExecuted", "runtimeOptionsShapeReady"]) {
        requireResponseEqual(typeof source[property], "boolean", `${field}.source.${property}.type`);
    }
    requireResponseEqual(typeof source.registrationPreflightGateOpen, "boolean", `${field}.source.registrationPreflightGateOpen.type`);
    if (source.factoryInvocationReady === false) {
        requireResponseEqual(source.factoryInvocationExecuted, false, `${field}.source.factoryInvocationExecuted`);
        requireResponseEqual(source.runtimeOptionsShapeReady, false, `${field}.source.runtimeOptionsShapeReady`);
        requireResponseEqual(source.registrationPreflightGateOpen, false, `${field}.source.registrationPreflightGateOpen`);
        requireResponseEqual(source.readiness, "blocked-until-factory-invocation-ready", `${field}.source.readiness`);
    }
    if (source.factoryInvocationReady === true && source.registrationPreflightGateOpen === false) {
        requireResponseEqual(source.factoryInvocationExecuted, true, `${field}.source.factoryInvocationExecuted`);
        requireResponseEqual(source.runtimeOptionsShapeReady, true, `${field}.source.runtimeOptionsShapeReady`);
        requireResponseEqual(source.readiness, "blocked-until-registration-preflight-gate-opens", `${field}.source.readiness`);
    }
    if (source.factoryInvocationReady === true && source.registrationPreflightGateOpen === true) {
        requireResponseEqual(source.factoryInvocationExecuted, true, `${field}.source.factoryInvocationExecuted`);
        requireResponseEqual(source.runtimeOptionsShapeReady, true, `${field}.source.runtimeOptionsShapeReady`);
        requireResponseEqual(status, "ready", `${field}.status`);
        requireResponseEqual(source.readiness, "runtime-registration-preflight-ready", `${field}.source.readiness`);
    }

    const guard = responseRecord(record.guard, `${field}.guard`);
    requireResponseEqual(guard.factoryInvocationReadyRequired, true, `${field}.guard.factoryInvocationReadyRequired`);
    requireResponseEqual(guard.explicitFutureRegistrationGateRequired, true, `${field}.guard.explicitFutureRegistrationGateRequired`);
    requireResponseEqual(guard.explicitRegistrationPreflightGateRequired, true, `${field}.guard.explicitRegistrationPreflightGateRequired`);
    requireResponseEqual(guard.registrationPreflightGateOpen, source.registrationPreflightGateOpen, `${field}.guard.registrationPreflightGateOpen`);
    for (const property of [
        "registrationEnabled",
        "registrationAttempted",
        "runtimeRegistered",
        "runtimeRegistration",
        "runtimeExecutionRegistered",
        "renderDispatch",
    ]) {
        requireResponseEqual(guard[property], false, `${field}.guard.${property}`);
    }

    const registrationContract = responseRecord(record.registrationContract, `${field}.registrationContract`);
    requireResponseEqual(registrationContract.runtimeId, "bundled-scene-bridge", `${field}.registrationContract.runtimeId`);
    requireResponseEqual(
        registrationContract.targetRegistry,
        "renderer-service.thumbnail-runtime-registry",
        `${field}.registrationContract.targetRegistry`
    );
    requireResponseArrayEqual(
        responseStringArray(registrationContract, "requiredRuntimeOptionKeys", `${field}.registrationContract.requiredRuntimeOptionKeys`),
        ["renderThumbnail"],
        `${field}.registrationContract.requiredRuntimeOptionKeys`
    );
    requireResponseArrayEqual(
        responseStringArray(registrationContract, "optionalRuntimeOptionKeys", `${field}.registrationContract.optionalRuntimeOptionKeys`),
        ["close"],
        `${field}.registrationContract.optionalRuntimeOptionKeys`
    );
    requireResponseArrayEqual(
        responseStringArray(registrationContract, "requiredRegistrationInputs", `${field}.registrationContract.requiredRegistrationInputs`),
        ["runtimeId", "runtimeOptions", "lifecycleOwner"],
        `${field}.registrationContract.requiredRegistrationInputs`
    );
    requireResponseEqual(
        registrationContract.duplicateRegistrationPolicy,
        "reject-until-explicit-replace-policy",
        `${field}.registrationContract.duplicateRegistrationPolicy`
    );
    requireResponseEqual(registrationContract.renderDispatchEnabledAfterRegistration, false, `${field}.registrationContract.renderDispatchEnabledAfterRegistration`);
    requireResponseEqual(registrationContract.valuesIncluded, false, `${field}.registrationContract.valuesIncluded`);

    const lifecycleCleanup = responseRecord(record.lifecycleCleanup, `${field}.lifecycleCleanup`);
    requireResponseEqual(lifecycleCleanup.lifecycleOwner, "renderer-service", `${field}.lifecycleCleanup.lifecycleOwner`);
    requireResponseEqual(
        lifecycleCleanup.closeHookPolicy,
        "register-close-if-present-call-on-unregister",
        `${field}.lifecycleCleanup.closeHookPolicy`
    );
    requireResponseEqual(lifecycleCleanup.closeHookRequired, false, `${field}.lifecycleCleanup.closeHookRequired`);
    requireResponseEqual(lifecycleCleanup.cleanupOnRegistrationFailure, true, `${field}.lifecycleCleanup.cleanupOnRegistrationFailure`);
    requireResponseEqual(lifecycleCleanup.cleanupOnServiceStop, true, `${field}.lifecycleCleanup.cleanupOnServiceStop`);
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
        requireResponseEqual(lifecycleCleanup[property], false, `${field}.lifecycleCleanup.${property}`);
    }

    const registrationOutcomeTaxonomy = responseRecordArray(record.registrationOutcomeTaxonomy, `${field}.registrationOutcomeTaxonomy`);
    requireResponseArrayEqual(
        registrationOutcomeTaxonomy.map((entry) => String(entry.code)),
        bundledSceneBridgeRuntimeRegistrationPreflight.registrationOutcomeTaxonomy.map((entry) => entry.code),
        `${field}.registrationOutcomeTaxonomy.codes`
    );
    for (const entry of registrationOutcomeTaxonomy) {
        requireResponseEqual(entry.dispatch, false, `${field}.registrationOutcomeTaxonomy.${String(entry.code)}.dispatch`);
    }

    const diagnostics = responseRecordArray(record.diagnostics, `${field}.diagnostics`);
    if (diagnostics.length === 0) {
        responseInvalid(`${field}.diagnostics must include at least one entry.`, `${field}.diagnostics`);
    }
    const diagnosticCodes = responseStringArray(record, "diagnosticCodes", `${field}.diagnosticCodes`);
    if (diagnosticCodes.length === 0) {
        responseInvalid(`${field}.diagnosticCodes must include at least one code.`, `${field}.diagnosticCodes`);
    }
    for (const diagnostic of diagnostics) {
        if (!diagnosticCodes.includes(String(diagnostic.code))) {
            responseInvalid(`${field}.diagnostics code must be listed in diagnosticCodes.`, `${field}.diagnostics.code`);
        }
    }
    requireResponseArrayEqual(
        responseStringArray(record, "nextActions", `${field}.nextActions`),
        [...new Set(diagnostics.flatMap((entry) => responseStringArray(entry, "nextActions", `${field}.diagnostics.nextActions`)))],
        `${field}.nextActions`
    );

    const checks = responseRecordArray(record.checks, `${field}.checks`);
    requireResponseArrayEqual(
        checks.map((entry) => String(entry.id)),
        bundledSceneBridgeRuntimeRegistrationPreflight.checks.map((entry) => entry.id),
        `${field}.checks.ids`
    );
    const checkStatus = (id: string) => String(checks.find((entry) => entry.id === id)?.status ?? "unknown");
    if (status === "ready") {
        for (const expectedCheckId of bundledSceneBridgeRuntimeRegistrationPreflight.checks.map((entry) => entry.id)) {
            requireResponseEqual(checkStatus(expectedCheckId), "passed", `${field}.checks.${expectedCheckId}.status`);
        }
        requireResponseArrayEqual(
            diagnosticCodes,
            ["renderer_service_bundled_scene_bridge_runtime_registration_ready"],
            `${field}.diagnosticCodes`
        );
    } else if (source.factoryInvocationReady === true) {
        requireResponseEqual(checkStatus("factory-invocation-ready"), "passed", `${field}.checks.factory-invocation-ready.status`);
        requireResponseEqual(
            checkStatus("runtime-options-registration-shape"),
            "passed",
            `${field}.checks.runtime-options-registration-shape.status`
        );
        requireResponseEqual(checkStatus("registration-preflight-gate"), "blocked", `${field}.checks.registration-preflight-gate.status`);
        requireResponseEqual(checkStatus("lifecycle-cleanup-contract"), "planned", `${field}.checks.lifecycle-cleanup-contract.status`);
        requireResponseEqual(checkStatus("registration-outcome-taxonomy"), "planned", `${field}.checks.registration-outcome-taxonomy.status`);
        requireResponseArrayEqual(
            diagnosticCodes,
            ["renderer_service_bundled_scene_bridge_runtime_registration_disabled"],
            `${field}.diagnosticCodes`
        );
    } else {
        requireResponseEqual(checkStatus("factory-invocation-ready"), "blocked", `${field}.checks.factory-invocation-ready.status`);
        requireResponseEqual(
            checkStatus("runtime-options-registration-shape"),
            "blocked",
            `${field}.checks.runtime-options-registration-shape.status`
        );
        requireResponseEqual(checkStatus("registration-preflight-gate"), "blocked", `${field}.checks.registration-preflight-gate.status`);
        requireResponseEqual(checkStatus("lifecycle-cleanup-contract"), "planned", `${field}.checks.lifecycle-cleanup-contract.status`);
        requireResponseEqual(checkStatus("registration-outcome-taxonomy"), "planned", `${field}.checks.registration-outcome-taxonomy.status`);
        requireResponseArrayEqual(
            diagnosticCodes,
            ["renderer_service_bundled_scene_bridge_runtime_registration_factory_not_ready"],
            `${field}.diagnosticCodes`
        );
    }
    for (const check of checks) {
        requireResponseEqual(check.dispatch, false, `${field}.checks.${String(check.id)}.dispatch`);
    }

    const sideEffects = responseRecord(record.sideEffects, `${field}.sideEffects`);
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
        requireResponseEqual(sideEffects[property], false, `${field}.sideEffects.${property}`);
    }

    const redaction = responseRecord(record.redaction, `${field}.redaction`);
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
        requireResponseEqual(redaction[property], false, `${field}.redaction.${property}`);
    }

    const omitted = responseRecord(record.omitted, `${field}.omitted`);
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
        requireResponseEqual(omitted[property], true, `${field}.omitted.${property}`);
    }
    requireResponseEqual(record.execution ?? null, null, `${field}.execution`);
}

function validateBundledSceneBridgeRuntimeRegistryRegistrationBoundaryResponse(actual: unknown, field: string): void {
    const record = responseRecord(actual, field);
    requireResponseEqual(record.status, "planned-disabled", `${field}.status`);
    requireResponseEqual(record.boundaryVersion, "P26.41", `${field}.boundaryVersion`);
    requireResponseEqual(record.owner, "renderer-service", `${field}.owner`);
    requireResponseEqual(record.mode, "no-dispatch-runtime-registry-registration-boundary", `${field}.mode`);

    const source = responseRecord(record.source, `${field}.source`);
    requireResponseEqual(source.contractVersion, "P26.32", `${field}.source.contractVersion`);
    requireResponseEqual(source.runtimeRegistrationPreflightVersion, "P26.40", `${field}.source.runtimeRegistrationPreflightVersion`);
    requireResponseEqual(source.registryBoundaryVersion, "P26.41", `${field}.source.registryBoundaryVersion`);
    requireResponseEqual(typeof source.runtimeRegistrationPreflightReady, "boolean", `${field}.source.runtimeRegistrationPreflightReady.type`);
    requireResponseEqual(typeof source.registrationPreflightGateOpen, "boolean", `${field}.source.registrationPreflightGateOpen.type`);
    if (source.runtimeRegistrationPreflightReady === true) {
        requireResponseEqual(source.runtimeRegistrationPreflightStatus, "ready", `${field}.source.runtimeRegistrationPreflightStatus`);
        requireResponseEqual(source.registrationPreflightGateOpen, true, `${field}.source.registrationPreflightGateOpen`);
        requireResponseEqual(source.readiness, "registry-registration-boundary-planned", `${field}.source.readiness`);
    } else {
        requireResponseEqual(source.runtimeRegistrationPreflightStatus, "planned-disabled", `${field}.source.runtimeRegistrationPreflightStatus`);
        requireResponseEqual(source.registrationPreflightGateOpen, false, `${field}.source.registrationPreflightGateOpen`);
        requireResponseEqual(source.readiness, "blocked-until-runtime-registration-preflight-ready", `${field}.source.readiness`);
    }

    const guard = responseRecord(record.guard, `${field}.guard`);
    requireResponseEqual(guard.runtimeRegistrationPreflightReadyRequired, true, `${field}.guard.runtimeRegistrationPreflightReadyRequired`);
    requireResponseEqual(guard.explicitFutureRegistryRegistrationGateRequired, true, `${field}.guard.explicitFutureRegistryRegistrationGateRequired`);
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
        requireResponseEqual(guard[property], false, `${field}.guard.${property}`);
    }

    const registrySlot = responseRecord(record.registrySlot, `${field}.registrySlot`);
    requireResponseEqual(registrySlot.runtimeId, "bundled-scene-bridge", `${field}.registrySlot.runtimeId`);
    requireResponseEqual(registrySlot.targetRegistry, "renderer-service.thumbnail-runtime-registry", `${field}.registrySlot.targetRegistry`);
    requireResponseEqual(registrySlot.slotOwner, "renderer-service", `${field}.registrySlot.slotOwner`);
    requireResponseEqual(registrySlot.slotStatus, "planned-empty", `${field}.registrySlot.slotStatus`);
    for (const property of ["runtimeInstalled", "runtimeAvailableForDispatch", "renderDispatchEnabled", "valuesIncluded"]) {
        requireResponseEqual(registrySlot[property], false, `${field}.registrySlot.${property}`);
    }

    const duplicateRegistrationPolicy = responseRecord(record.duplicateRegistrationPolicy, `${field}.duplicateRegistrationPolicy`);
    requireResponseEqual(
        duplicateRegistrationPolicy.duplicateRegistrationPolicy,
        "reject-until-explicit-replace-policy",
        `${field}.duplicateRegistrationPolicy.duplicateRegistrationPolicy`
    );
    requireResponseEqual(
        duplicateRegistrationPolicy.replacementPolicy,
        "not-supported-until-reviewed",
        `${field}.duplicateRegistrationPolicy.replacementPolicy`
    );
    for (const property of ["existingRuntimeLookup", "existingRuntimeValuesIncluded", "duplicateReplacementAttempted", "valuesIncluded"]) {
        requireResponseEqual(duplicateRegistrationPolicy[property], false, `${field}.duplicateRegistrationPolicy.${property}`);
    }

    const runtimeAvailability = responseRecord(record.runtimeAvailability, `${field}.runtimeAvailability`);
    requireResponseEqual(runtimeAvailability.status, "metadata-only", `${field}.runtimeAvailability.status`);
    requireResponseEqual(runtimeAvailability.runtimeId, "bundled-scene-bridge", `${field}.runtimeAvailability.runtimeId`);
    for (const property of [
        "runtimeInstalled",
        "runtimeValueAvailable",
        "runtimeAvailableForDispatch",
        "renderDispatchEnabled",
        "valuesIncluded",
    ]) {
        requireResponseEqual(runtimeAvailability[property], false, `${field}.runtimeAvailability.${property}`);
    }

    const lifecycleCleanup = responseRecord(record.lifecycleCleanup, `${field}.lifecycleCleanup`);
    requireResponseEqual(lifecycleCleanup.lifecycleOwner, "renderer-service", `${field}.lifecycleCleanup.lifecycleOwner`);
    requireResponseEqual(
        lifecycleCleanup.closeHookPolicy,
        "register-close-if-present-call-on-unregister",
        `${field}.lifecycleCleanup.closeHookPolicy`
    );
    requireResponseEqual(lifecycleCleanup.closeHookRequired, false, `${field}.lifecycleCleanup.closeHookRequired`);
    requireResponseEqual(lifecycleCleanup.cleanupOnDuplicateRejected, true, `${field}.lifecycleCleanup.cleanupOnDuplicateRejected`);
    requireResponseEqual(lifecycleCleanup.cleanupOnRegistrationFailure, true, `${field}.lifecycleCleanup.cleanupOnRegistrationFailure`);
    requireResponseEqual(lifecycleCleanup.cleanupOnServiceStop, true, `${field}.lifecycleCleanup.cleanupOnServiceStop`);
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
        requireResponseEqual(lifecycleCleanup[property], false, `${field}.lifecycleCleanup.${property}`);
    }

    const boundaryOutcomeTaxonomy = responseRecordArray(record.boundaryOutcomeTaxonomy, `${field}.boundaryOutcomeTaxonomy`);
    requireResponseArrayEqual(
        boundaryOutcomeTaxonomy.map((entry) => String(entry.code)),
        bundledSceneBridgeRuntimeRegistryRegistrationBoundary.boundaryOutcomeTaxonomy.map((entry) => entry.code),
        `${field}.boundaryOutcomeTaxonomy.codes`
    );
    for (const entry of boundaryOutcomeTaxonomy) {
        requireResponseEqual(entry.dispatch, false, `${field}.boundaryOutcomeTaxonomy.${String(entry.code)}.dispatch`);
    }

    const diagnostics = responseRecordArray(record.diagnostics, `${field}.diagnostics`);
    if (diagnostics.length === 0) {
        responseInvalid(`${field}.diagnostics must include at least one entry.`, `${field}.diagnostics`);
    }
    const diagnosticCodes = responseStringArray(record, "diagnosticCodes", `${field}.diagnosticCodes`);
    if (diagnosticCodes.length === 0) {
        responseInvalid(`${field}.diagnosticCodes must include at least one code.`, `${field}.diagnosticCodes`);
    }
    for (const diagnostic of diagnostics) {
        if (!diagnosticCodes.includes(String(diagnostic.code))) {
            responseInvalid(`${field}.diagnostics code must be listed in diagnosticCodes.`, `${field}.diagnostics.code`);
        }
    }
    requireResponseArrayEqual(
        responseStringArray(record, "nextActions", `${field}.nextActions`),
        [...new Set(diagnostics.flatMap((entry) => responseStringArray(entry, "nextActions", `${field}.diagnostics.nextActions`)))],
        `${field}.nextActions`
    );

    const checks = responseRecordArray(record.checks, `${field}.checks`);
    requireResponseArrayEqual(
        checks.map((entry) => String(entry.id)),
        bundledSceneBridgeRuntimeRegistryRegistrationBoundary.checks.map((entry) => entry.id),
        `${field}.checks.ids`
    );
    const checkStatus = (id: string) => String(checks.find((entry) => entry.id === id)?.status ?? "unknown");
    requireResponseEqual(
        checkStatus("runtime-registration-preflight-ready"),
        source.runtimeRegistrationPreflightReady === true ? "passed" : "blocked",
        `${field}.checks.runtime-registration-preflight-ready.status`
    );
    for (const expectedPlannedCheckId of [
        "registry-slot-plan",
        "duplicate-registration-policy",
        "lifecycle-cleanup-plan",
        "no-dispatch-runtime-availability",
    ]) {
        requireResponseEqual(checkStatus(expectedPlannedCheckId), "planned", `${field}.checks.${expectedPlannedCheckId}.status`);
    }
    for (const check of checks) {
        requireResponseEqual(check.dispatch, false, `${field}.checks.${String(check.id)}.dispatch`);
    }
    requireResponseArrayEqual(
        diagnosticCodes,
        [
            source.runtimeRegistrationPreflightReady === true
                ? "renderer_service_bundled_scene_bridge_runtime_registry_registration_boundary_planned"
                : "renderer_service_bundled_scene_bridge_runtime_registry_registration_boundary_preflight_not_ready",
        ],
        `${field}.diagnosticCodes`
    );

    const sideEffects = responseRecord(record.sideEffects, `${field}.sideEffects`);
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
        requireResponseEqual(sideEffects[property], false, `${field}.sideEffects.${property}`);
    }

    const redaction = responseRecord(record.redaction, `${field}.redaction`);
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
        requireResponseEqual(redaction[property], false, `${field}.redaction.${property}`);
    }

    const omitted = responseRecord(record.omitted, `${field}.omitted`);
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
        requireResponseEqual(omitted[property], true, `${field}.omitted.${property}`);
    }
    requireResponseEqual(record.execution ?? null, null, `${field}.execution`);
}

function validateBundledSceneBridgeRuntimeRegistryInstallationContractResponse(actual: unknown, field: string): void {
    const record = responseRecord(actual, field);
    requireResponseEqual(record.status, "planned-disabled", `${field}.status`);
    requireResponseEqual(record.contractVersion, "P26.42", `${field}.contractVersion`);
    requireResponseEqual(record.owner, "renderer-service", `${field}.owner`);
    requireResponseEqual(record.mode, "guarded-runtime-registry-installation-contract", `${field}.mode`);

    const source = responseRecord(record.source, `${field}.source`);
    requireResponseEqual(source.runtimeRegistrationPreflightVersion, "P26.40", `${field}.source.runtimeRegistrationPreflightVersion`);
    requireResponseEqual(source.registryRegistrationBoundaryVersion, "P26.41", `${field}.source.registryRegistrationBoundaryVersion`);
    requireResponseEqual(source.registryInstallationContractVersion, "P26.42", `${field}.source.registryInstallationContractVersion`);
    requireResponseEqual(typeof source.runtimeRegistrationPreflightReady, "boolean", `${field}.source.runtimeRegistrationPreflightReady.type`);
    requireResponseEqual(typeof source.registryRegistrationBoundaryReady, "boolean", `${field}.source.registryRegistrationBoundaryReady.type`);
    if (source.registryRegistrationBoundaryReady === true) {
        requireResponseEqual(source.runtimeRegistrationPreflightReady, true, `${field}.source.runtimeRegistrationPreflightReady`);
        requireResponseEqual(source.registryRegistrationBoundaryStatus, "planned-disabled", `${field}.source.registryRegistrationBoundaryStatus`);
        requireResponseEqual(source.registrySlotStatus, "planned-empty", `${field}.source.registrySlotStatus`);
        requireResponseEqual(source.readiness, "runtime-registry-installation-contract-planned", `${field}.source.readiness`);
    } else {
        requireResponseEqual(source.runtimeRegistrationPreflightReady, false, `${field}.source.runtimeRegistrationPreflightReady`);
        requireResponseEqual(source.registryRegistrationBoundaryStatus, "planned-disabled", `${field}.source.registryRegistrationBoundaryStatus`);
        requireResponseEqual(source.registrySlotStatus, "planned-empty", `${field}.source.registrySlotStatus`);
        requireResponseEqual(source.readiness, "blocked-until-registry-registration-boundary-ready", `${field}.source.readiness`);
    }

    const guard = responseRecord(record.guard, `${field}.guard`);
    requireResponseEqual(guard.registryRegistrationBoundaryReadyRequired, true, `${field}.guard.registryRegistrationBoundaryReadyRequired`);
    requireResponseEqual(guard.explicitFutureInstallationGateRequired, true, `${field}.guard.explicitFutureInstallationGateRequired`);
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
        requireResponseEqual(guard[property], false, `${field}.guard.${property}`);
    }

    const runtimeValueShape = responseRecord(record.runtimeValueShape, `${field}.runtimeValueShape`);
    requireResponseEqual(runtimeValueShape.runtimeId, "bundled-scene-bridge", `${field}.runtimeValueShape.runtimeId`);
    requireResponseEqual(
        runtimeValueShape.targetRegistry,
        "renderer-service.thumbnail-runtime-registry",
        `${field}.runtimeValueShape.targetRegistry`
    );
    requireResponseArrayEqual(
        responseStringArray(runtimeValueShape, "requiredMethods", `${field}.runtimeValueShape.requiredMethods`),
        ["renderThumbnail"],
        `${field}.runtimeValueShape.requiredMethods`
    );
    requireResponseArrayEqual(
        responseStringArray(runtimeValueShape, "optionalMethods", `${field}.runtimeValueShape.optionalMethods`),
        ["close"],
        `${field}.runtimeValueShape.optionalMethods`
    );
    requireResponseArrayEqual(
        responseStringArray(runtimeValueShape, "requiredInstallationInputs", `${field}.runtimeValueShape.requiredInstallationInputs`),
        ["runtimeId", "runtimeValue", "lifecycleOwner"],
        `${field}.runtimeValueShape.requiredInstallationInputs`
    );
    for (const property of [
        "runtimeValueCreated",
        "runtimeValueInstalled",
        "renderDispatchEnabledAfterInstallation",
        "valuesIncluded",
    ]) {
        requireResponseEqual(runtimeValueShape[property], false, `${field}.runtimeValueShape.${property}`);
    }

    const closeHookOwnership = responseRecord(record.closeHookOwnership, `${field}.closeHookOwnership`);
    requireResponseEqual(closeHookOwnership.lifecycleOwner, "renderer-service", `${field}.closeHookOwnership.lifecycleOwner`);
    requireResponseEqual(closeHookOwnership.closeHookOwner, "renderer-service", `${field}.closeHookOwnership.closeHookOwner`);
    requireResponseEqual(closeHookOwnership.closeHookSource, "runtime.close", `${field}.closeHookOwnership.closeHookSource`);
    requireResponseEqual(closeHookOwnership.closeHookRequired, false, `${field}.closeHookOwnership.closeHookRequired`);
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
        requireResponseEqual(closeHookOwnership[property], false, `${field}.closeHookOwnership.${property}`);
    }

    const duplicateRollbackHandling = responseRecord(record.duplicateRollbackHandling, `${field}.duplicateRollbackHandling`);
    requireResponseEqual(
        duplicateRollbackHandling.duplicateDetectionRequired,
        true,
        `${field}.duplicateRollbackHandling.duplicateDetectionRequired`
    );
    requireResponseEqual(
        duplicateRollbackHandling.duplicateRegistrationPolicy,
        "reject-until-explicit-replace-policy",
        `${field}.duplicateRollbackHandling.duplicateRegistrationPolicy`
    );
    requireResponseEqual(
        duplicateRollbackHandling.replacementPolicy,
        "not-supported-until-reviewed",
        `${field}.duplicateRollbackHandling.replacementPolicy`
    );
    requireResponseEqual(
        duplicateRollbackHandling.rollbackRequiredOnDuplicate,
        true,
        `${field}.duplicateRollbackHandling.rollbackRequiredOnDuplicate`
    );
    requireResponseEqual(
        duplicateRollbackHandling.cleanupOnInstallationFailure,
        true,
        `${field}.duplicateRollbackHandling.cleanupOnInstallationFailure`
    );
    requireResponseEqual(
        duplicateRollbackHandling.cleanupOnServiceStop,
        true,
        `${field}.duplicateRollbackHandling.cleanupOnServiceStop`
    );
    for (const property of [
        "existingRuntimeLookup",
        "existingRuntimeValuesIncluded",
        "duplicateDetected",
        "rollbackAttempted",
        "rollbackSucceeded",
        "rollbackFailed",
        "valuesIncluded",
    ]) {
        requireResponseEqual(duplicateRollbackHandling[property], false, `${field}.duplicateRollbackHandling.${property}`);
    }

    const installationOutcomeTaxonomy = responseRecordArray(record.installationOutcomeTaxonomy, `${field}.installationOutcomeTaxonomy`);
    requireResponseArrayEqual(
        installationOutcomeTaxonomy.map((entry) => String(entry.code)),
        bundledSceneBridgeRuntimeRegistryInstallationContract.installationOutcomeTaxonomy.map((entry) => entry.code),
        `${field}.installationOutcomeTaxonomy.codes`
    );
    for (const outcome of installationOutcomeTaxonomy) {
        requireResponseEqual(outcome.dispatch, false, `${field}.installationOutcomeTaxonomy.${String(outcome.code)}.dispatch`);
    }

    const diagnostics = responseRecordArray(record.diagnostics, `${field}.diagnostics`);
    const diagnosticCodes = responseStringArray(record, "diagnosticCodes", `${field}.diagnosticCodes`);
    requireResponseArrayEqual(
        diagnostics.map((entry) => String(entry.code)),
        diagnosticCodes,
        `${field}.diagnostics.codes`
    );
    requireResponseArrayEqual(
        responseStringArray(record, "nextActions", `${field}.nextActions`),
        [...new Set(diagnostics.flatMap((entry) => responseStringArray(entry, "nextActions", `${field}.diagnostics.nextActions`)))],
        `${field}.nextActions`
    );

    const checks = responseRecordArray(record.checks, `${field}.checks`);
    requireResponseArrayEqual(
        checks.map((entry) => String(entry.id)),
        bundledSceneBridgeRuntimeRegistryInstallationContract.checks.map((entry) => entry.id),
        `${field}.checks.ids`
    );
    const checkStatus = (id: string) => String(checks.find((entry) => entry.id === id)?.status ?? "unknown");
    requireResponseEqual(
        checkStatus("registry-registration-boundary-ready"),
        source.registryRegistrationBoundaryReady === true ? "passed" : "blocked",
        `${field}.checks.registry-registration-boundary-ready.status`
    );
    for (const expectedPlannedCheckId of [
        "runtime-value-shape-contract",
        "close-hook-ownership-contract",
        "duplicate-rollback-handling",
        "invalid-installation-diagnostics",
    ]) {
        requireResponseEqual(checkStatus(expectedPlannedCheckId), "planned", `${field}.checks.${expectedPlannedCheckId}.status`);
    }
    for (const check of checks) {
        requireResponseEqual(check.dispatch, false, `${field}.checks.${String(check.id)}.dispatch`);
    }
    requireResponseArrayEqual(
        diagnosticCodes,
        [
            source.registryRegistrationBoundaryReady === true
                ? "renderer_service_bundled_scene_bridge_runtime_registry_installation_contract_planned"
                : "renderer_service_bundled_scene_bridge_runtime_registry_installation_contract_boundary_not_ready",
        ],
        `${field}.diagnosticCodes`
    );

    const sideEffects = responseRecord(record.sideEffects, `${field}.sideEffects`);
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
        requireResponseEqual(sideEffects[property], false, `${field}.sideEffects.${property}`);
    }

    const redaction = responseRecord(record.redaction, `${field}.redaction`);
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
        requireResponseEqual(redaction[property], false, `${field}.redaction.${property}`);
    }

    const omitted = responseRecord(record.omitted, `${field}.omitted`);
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
        requireResponseEqual(omitted[property], true, `${field}.omitted.${property}`);
    }
    requireResponseEqual(record.execution ?? null, null, `${field}.execution`);
}

function validateBundledSceneBridgeRuntimeRegistryInstallationGateResponse(actual: unknown, field: string): void {
    const record = responseRecord(actual, field);
    const status = String(record.status ?? "");
    if (!["planned-disabled", "configured-disabled", "invalid"].includes(status)) {
        responseInvalid(`${field}.status must be planned-disabled, configured-disabled, or invalid.`, `${field}.status`);
    }
    requireResponseEqual(record.gateVersion, "P26.43", `${field}.gateVersion`);
    requireResponseEqual(record.owner, "renderer-service", `${field}.owner`);
    requireResponseEqual(record.mode, "guarded-runtime-registry-installation-gate", `${field}.mode`);

    const source = responseRecord(record.source, `${field}.source`);
    requireResponseEqual(source.runtimeRegistrationPreflightVersion, "P26.40", `${field}.source.runtimeRegistrationPreflightVersion`);
    requireResponseEqual(source.registryRegistrationBoundaryVersion, "P26.41", `${field}.source.registryRegistrationBoundaryVersion`);
    requireResponseEqual(source.registryInstallationContractVersion, "P26.42", `${field}.source.registryInstallationContractVersion`);
    requireResponseEqual(source.registryInstallationGateVersion, "P26.43", `${field}.source.registryInstallationGateVersion`);
    requireResponseEqual(typeof source.runtimeRegistrationPreflightReady, "boolean", `${field}.source.runtimeRegistrationPreflightReady.type`);
    requireResponseEqual(typeof source.registryRegistrationBoundaryReady, "boolean", `${field}.source.registryRegistrationBoundaryReady.type`);
    requireResponseEqual(typeof source.registryInstallationContractReady, "boolean", `${field}.source.registryInstallationContractReady.type`);
    requireResponseEqual(source.registryInstallationContractStatus, "planned-disabled", `${field}.source.registryInstallationContractStatus`);
    if (source.registryInstallationContractReady === true) {
        requireResponseEqual(source.runtimeRegistrationPreflightReady, true, `${field}.source.runtimeRegistrationPreflightReady`);
        requireResponseEqual(source.registryRegistrationBoundaryReady, true, `${field}.source.registryRegistrationBoundaryReady`);
        requireResponseEqual(
            source.registryInstallationContractReadiness,
            "runtime-registry-installation-contract-planned",
            `${field}.source.registryInstallationContractReadiness`
        );
    } else {
        requireResponseEqual(source.runtimeRegistrationPreflightReady, false, `${field}.source.runtimeRegistrationPreflightReady`);
        requireResponseEqual(source.registryRegistrationBoundaryReady, false, `${field}.source.registryRegistrationBoundaryReady`);
        requireResponseEqual(
            source.registryInstallationContractReadiness,
            "blocked-until-registry-registration-boundary-ready",
            `${field}.source.registryInstallationContractReadiness`
        );
    }

    const configuration = responseRecord(record.configuration, `${field}.configuration`);
    requireResponseEqual(configuration.env, BUNDLED_SCENE_BRIDGE_RUNTIME_INSTALLATION_GATE_ENV, `${field}.configuration.env`);
    requireResponseEqual(
        configuration.acceptedValue,
        BUNDLED_SCENE_BRIDGE_RUNTIME_INSTALLATION_GATE_REVIEWED_VALUE,
        `${field}.configuration.acceptedValue`
    );
    requireResponseEqual(typeof configuration.configured, "boolean", `${field}.configuration.configured.type`);
    requireResponseEqual(typeof configuration.accepted, "boolean", `${field}.configuration.accepted.type`);
    requireResponseEqual(typeof configuration.valid, "boolean", `${field}.configuration.valid.type`);
    requireResponseEqual(configuration.valueRead, false, `${field}.configuration.valueRead`);
    requireResponseEqual(configuration.valuesIncluded, false, `${field}.configuration.valuesIncluded`);
    if (configuration.configured === false) {
        requireResponseEqual(configuration.accepted, false, `${field}.configuration.accepted`);
        requireResponseEqual(configuration.valid, true, `${field}.configuration.valid`);
    } else if (configuration.accepted === true) {
        requireResponseEqual(configuration.valid, true, `${field}.configuration.valid`);
    } else {
        requireResponseEqual(configuration.valid, false, `${field}.configuration.valid`);
    }

    const reviewed = source.registryInstallationContractReady === true && configuration.accepted === true;
    if (status === "configured-disabled") {
        requireResponseEqual(reviewed, true, `${field}.status.reviewed`);
        requireResponseEqual(source.readiness, "installation-gate-reviewed-disabled", `${field}.source.readiness`);
    } else if (status === "invalid") {
        requireResponseEqual(configuration.configured, true, `${field}.configuration.configured`);
        requireResponseEqual(configuration.accepted, false, `${field}.configuration.accepted`);
        requireResponseEqual(source.readiness, "invalid-installation-gate-configuration", `${field}.source.readiness`);
    } else {
        requireResponseEqual(reviewed, false, `${field}.status.reviewed`);
        requireResponseEqual(
            source.readiness,
            source.registryInstallationContractReady === true
                ? "blocked-until-installation-gate-reviewed"
                : "blocked-until-installation-contract-ready",
            `${field}.source.readiness`
        );
    }

    const gate = responseRecord(record.gate, `${field}.gate`);
    requireResponseEqual(gate.registryInstallationContractReadyRequired, true, `${field}.gate.registryInstallationContractReadyRequired`);
    requireResponseEqual(gate.explicitReviewedGateRequired, true, `${field}.gate.explicitReviewedGateRequired`);
    requireResponseEqual(gate.reviewedGateOpen, reviewed, `${field}.gate.reviewedGateOpen`);
    requireResponseEqual(gate.futureInstallationAttemptAllowed, reviewed, `${field}.gate.futureInstallationAttemptAllowed`);
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
        requireResponseEqual(gate[property], false, `${field}.gate.${property}`);
    }

    const refusalDiagnostics = responseRecord(record.refusalDiagnostics, `${field}.refusalDiagnostics`);
    requireResponseEqual(refusalDiagnostics.refusalRequired, true, `${field}.refusalDiagnostics.refusalRequired`);
    requireResponseEqual(refusalDiagnostics.invalidGateValue, status === "invalid", `${field}.refusalDiagnostics.invalidGateValue`);
    requireResponseEqual(refusalDiagnostics.registryWriteRefused, true, `${field}.refusalDiagnostics.registryWriteRefused`);
    requireResponseEqual(
        refusalDiagnostics.runtimeValueCreationRefused,
        true,
        `${field}.refusalDiagnostics.runtimeValueCreationRefused`
    );
    requireResponseEqual(
        refusalDiagnostics.runtimeInstallationRefused,
        true,
        `${field}.refusalDiagnostics.runtimeInstallationRefused`
    );
    requireResponseEqual(refusalDiagnostics.renderDispatchRefused, true, `${field}.refusalDiagnostics.renderDispatchRefused`);
    requireResponseEqual(refusalDiagnostics.valuesIncluded, false, `${field}.refusalDiagnostics.valuesIncluded`);

    const rollbackPreconditions = responseRecord(record.rollbackPreconditions, `${field}.rollbackPreconditions`);
    requireResponseEqual(rollbackPreconditions.duplicateDetectionRequired, true, `${field}.rollbackPreconditions.duplicateDetectionRequired`);
    requireResponseEqual(
        rollbackPreconditions.duplicateRegistrationPolicy,
        "reject-until-explicit-replace-policy",
        `${field}.rollbackPreconditions.duplicateRegistrationPolicy`
    );
    requireResponseEqual(
        rollbackPreconditions.replacementPolicy,
        "not-supported-until-reviewed",
        `${field}.rollbackPreconditions.replacementPolicy`
    );
    requireResponseEqual(rollbackPreconditions.rollbackRequiredOnDuplicate, true, `${field}.rollbackPreconditions.rollbackRequiredOnDuplicate`);
    requireResponseEqual(
        rollbackPreconditions.cleanupOnInstallationFailure,
        true,
        `${field}.rollbackPreconditions.cleanupOnInstallationFailure`
    );
    requireResponseEqual(rollbackPreconditions.cleanupOnServiceStop, true, `${field}.rollbackPreconditions.cleanupOnServiceStop`);
    requireResponseEqual(rollbackPreconditions.closeHookCleanupRequired, true, `${field}.rollbackPreconditions.closeHookCleanupRequired`);
    for (const property of ["rollbackPrepared", "rollbackAttempted", "cleanupAttempted", "valuesIncluded"]) {
        requireResponseEqual(rollbackPreconditions[property], false, `${field}.rollbackPreconditions.${property}`);
    }

    const lifecycleOwnership = responseRecord(record.lifecycleOwnership, `${field}.lifecycleOwnership`);
    requireResponseEqual(lifecycleOwnership.lifecycleOwner, "renderer-service", `${field}.lifecycleOwnership.lifecycleOwner`);
    requireResponseEqual(lifecycleOwnership.registryOwner, "renderer-service", `${field}.lifecycleOwnership.registryOwner`);
    requireResponseEqual(lifecycleOwnership.closeHookOwner, "renderer-service", `${field}.lifecycleOwnership.closeHookOwner`);
    requireResponseEqual(lifecycleOwnership.runtimeId, "bundled-scene-bridge", `${field}.lifecycleOwnership.runtimeId`);
    requireResponseEqual(
        lifecycleOwnership.targetRegistry,
        "renderer-service.thumbnail-runtime-registry",
        `${field}.lifecycleOwnership.targetRegistry`
    );
    requireResponseEqual(lifecycleOwnership.lifecycleScope, "thumbnail-runtime-registry", `${field}.lifecycleOwnership.lifecycleScope`);
    requireResponseEqual(lifecycleOwnership.noDispatchLifecycle, true, `${field}.lifecycleOwnership.noDispatchLifecycle`);
    for (const property of ["closeHookRegistered", "runtimeValueOwned", "registrySlotOwned", "valuesIncluded"]) {
        requireResponseEqual(lifecycleOwnership[property], false, `${field}.lifecycleOwnership.${property}`);
    }

    const gateOutcomeTaxonomy = responseRecordArray(record.gateOutcomeTaxonomy, `${field}.gateOutcomeTaxonomy`);
    requireResponseArrayEqual(
        gateOutcomeTaxonomy.map((entry) => String(entry.code)),
        bundledSceneBridgeRuntimeRegistryInstallationGate.gateOutcomeTaxonomy.map((entry) => entry.code),
        `${field}.gateOutcomeTaxonomy.codes`
    );
    for (const outcome of gateOutcomeTaxonomy) {
        requireResponseEqual(outcome.dispatch, false, `${field}.gateOutcomeTaxonomy.${String(outcome.code)}.dispatch`);
    }

    const diagnostics = responseRecordArray(record.diagnostics, `${field}.diagnostics`);
    const diagnosticCodes = responseStringArray(record, "diagnosticCodes", `${field}.diagnosticCodes`);
    requireResponseArrayEqual(
        diagnostics.map((entry) => String(entry.code)),
        diagnosticCodes,
        `${field}.diagnostics.codes`
    );
    requireResponseArrayEqual(
        responseStringArray(record, "nextActions", `${field}.nextActions`),
        [...new Set(diagnostics.flatMap((entry) => responseStringArray(entry, "nextActions", `${field}.diagnostics.nextActions`)))],
        `${field}.nextActions`
    );

    const checks = responseRecordArray(record.checks, `${field}.checks`);
    requireResponseArrayEqual(
        checks.map((entry) => String(entry.id)),
        bundledSceneBridgeRuntimeRegistryInstallationGate.checks.map((entry) => entry.id),
        `${field}.checks.ids`
    );
    const checkStatus = (id: string) => String(checks.find((entry) => entry.id === id)?.status ?? "unknown");
    requireResponseEqual(
        checkStatus("installation-contract-ready"),
        source.registryInstallationContractReady === true ? "passed" : "blocked",
        `${field}.checks.installation-contract-ready.status`
    );
    requireResponseEqual(
        checkStatus("explicit-installation-gate-reviewed"),
        status === "invalid" ? "invalid" : reviewed ? "passed" : "blocked",
        `${field}.checks.explicit-installation-gate-reviewed.status`
    );
    for (const checkId of ["rollback-preconditions-planned", "no-dispatch-lifecycle-owned", "refusal-diagnostics-planned"]) {
        requireResponseEqual(checkStatus(checkId), "planned", `${field}.checks.${checkId}.status`);
    }
    for (const check of checks) {
        requireResponseEqual(check.dispatch, false, `${field}.checks.${String(check.id)}.dispatch`);
    }

    const expectedDiagnosticCode =
        status === "invalid"
            ? "renderer_service_bundled_scene_bridge_runtime_registry_installation_gate_configuration_invalid"
            : reviewed
              ? "renderer_service_bundled_scene_bridge_runtime_registry_installation_gate_reviewed_disabled"
              : source.registryInstallationContractReady === true
                ? "renderer_service_bundled_scene_bridge_runtime_registry_installation_gate_not_configured"
                : "renderer_service_bundled_scene_bridge_runtime_registry_installation_gate_contract_not_ready";
    requireResponseArrayEqual(diagnosticCodes, [expectedDiagnosticCode], `${field}.diagnosticCodes`);

    const sideEffects = responseRecord(record.sideEffects, `${field}.sideEffects`);
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
        requireResponseEqual(sideEffects[property], false, `${field}.sideEffects.${property}`);
    }

    const redaction = responseRecord(record.redaction, `${field}.redaction`);
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
        requireResponseEqual(redaction[property], false, `${field}.redaction.${property}`);
    }

    const omitted = responseRecord(record.omitted, `${field}.omitted`);
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
        requireResponseEqual(omitted[property], true, `${field}.omitted.${property}`);
    }
    requireResponseEqual(record.execution ?? null, null, `${field}.execution`);
}

function validateBundledSceneBridgeRuntimeRegistryInstallationPreflightResponse(actual: unknown, field: string): void {
    const record = responseRecord(actual, field);
    const status = String(record.status ?? "");
    if (!["blocked", "ready", "invalid"].includes(status)) {
        responseInvalid(`${field}.status must be blocked, ready, or invalid.`, `${field}.status`);
    }
    requireResponseEqual(record.preflightVersion, "P26.44", `${field}.preflightVersion`);
    requireResponseEqual(record.owner, "renderer-service", `${field}.owner`);
    requireResponseEqual(record.mode, "guarded-runtime-registry-installation-preflight", `${field}.mode`);

    const source = responseRecord(record.source, `${field}.source`);
    requireResponseEqual(source.runtimeRegistrationPreflightVersion, "P26.40", `${field}.source.runtimeRegistrationPreflightVersion`);
    requireResponseEqual(source.registryRegistrationBoundaryVersion, "P26.41", `${field}.source.registryRegistrationBoundaryVersion`);
    requireResponseEqual(source.registryInstallationContractVersion, "P26.42", `${field}.source.registryInstallationContractVersion`);
    requireResponseEqual(source.registryInstallationGateVersion, "P26.43", `${field}.source.registryInstallationGateVersion`);
    requireResponseEqual(source.registryInstallationPreflightVersion, "P26.44", `${field}.source.registryInstallationPreflightVersion`);
    const ready = status === "ready";
    const invalid = status === "invalid";
    requireResponseEqual(source.registryInstallationGateReady, ready, `${field}.source.registryInstallationGateReady`);
    requireResponseEqual(
        source.registryInstallationGateStatus,
        ready ? "configured-disabled" : invalid ? "invalid" : "planned-disabled",
        `${field}.source.registryInstallationGateStatus`
    );
    if (ready || invalid) {
        requireResponseEqual(
            source.registryInstallationGateReadiness,
            ready ? "installation-gate-reviewed-disabled" : "invalid-installation-gate-configuration",
            `${field}.source.registryInstallationGateReadiness`
        );
    } else if (
        ![
            "blocked-until-installation-contract-ready",
            "blocked-until-installation-gate-reviewed",
        ].includes(String(source.registryInstallationGateReadiness ?? ""))
    ) {
        responseInvalid(
            `${field}.source.registryInstallationGateReadiness must be a blocked installation gate readiness value.`,
            `${field}.source.registryInstallationGateReadiness`
        );
    }
    requireResponseEqual(source.reviewedGateOpen, ready, `${field}.source.reviewedGateOpen`);
    requireResponseEqual(source.futureInstallationAttemptAllowed, ready, `${field}.source.futureInstallationAttemptAllowed`);
    requireResponseEqual(
        source.readiness,
        ready ? "installation-preflight-ready" : invalid ? "invalid-installation-gate" : "blocked-until-reviewed-installation-gate",
        `${field}.source.readiness`
    );

    const preflight = responseRecord(record.preflight, `${field}.preflight`);
    for (const property of [
        "registryInstallationGateReadyRequired",
        "reviewedGateOpenRequired",
        "futureInstallationAttemptAllowedRequired",
        "rollbackPreconditionsRequired",
        "lifecycleOwnershipRequired",
        "noDispatchRequired",
    ]) {
        requireResponseEqual(preflight[property], true, `${field}.preflight.${property}`);
    }
    requireResponseEqual(preflight.readyForLaterInstallationTask, ready, `${field}.preflight.readyForLaterInstallationTask`);
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
        requireResponseEqual(preflight[property], false, `${field}.preflight.${property}`);
    }

    const refusalDiagnostics = responseRecord(record.refusalDiagnostics, `${field}.refusalDiagnostics`);
    requireResponseEqual(refusalDiagnostics.refusalRequired, true, `${field}.refusalDiagnostics.refusalRequired`);
    requireResponseEqual(refusalDiagnostics.invalidGateMetadata, invalid, `${field}.refusalDiagnostics.invalidGateMetadata`);
    requireResponseEqual(
        refusalDiagnostics.refusalReason,
        ready ? "installation-execution-disabled-in-preflight" : invalid ? "installation-gate-invalid" : "installation-gate-not-ready",
        `${field}.refusalDiagnostics.refusalReason`
    );
    for (const property of [
        "registryLookupRefused",
        "registryWriteRefused",
        "runtimeValueCreationRefused",
        "runtimeInstallationRefused",
        "closeHookRegistrationRefused",
        "duplicateRollbackRefused",
        "renderDispatchRefused",
    ]) {
        requireResponseEqual(refusalDiagnostics[property], true, `${field}.refusalDiagnostics.${property}`);
    }
    requireResponseEqual(refusalDiagnostics.valuesIncluded, false, `${field}.refusalDiagnostics.valuesIncluded`);

    const rollbackPreconditions = responseRecord(record.rollbackPreconditions, `${field}.rollbackPreconditions`);
    requireResponseEqual(rollbackPreconditions.duplicateDetectionRequired, true, `${field}.rollbackPreconditions.duplicateDetectionRequired`);
    requireResponseEqual(
        rollbackPreconditions.duplicateRegistrationPolicy,
        "reject-until-explicit-replace-policy",
        `${field}.rollbackPreconditions.duplicateRegistrationPolicy`
    );
    requireResponseEqual(
        rollbackPreconditions.replacementPolicy,
        "not-supported-until-reviewed",
        `${field}.rollbackPreconditions.replacementPolicy`
    );
    requireResponseEqual(rollbackPreconditions.rollbackRequiredOnDuplicate, true, `${field}.rollbackPreconditions.rollbackRequiredOnDuplicate`);
    requireResponseEqual(rollbackPreconditions.cleanupOnInstallationFailure, true, `${field}.rollbackPreconditions.cleanupOnInstallationFailure`);
    requireResponseEqual(rollbackPreconditions.cleanupOnServiceStop, true, `${field}.rollbackPreconditions.cleanupOnServiceStop`);
    requireResponseEqual(rollbackPreconditions.closeHookCleanupRequired, true, `${field}.rollbackPreconditions.closeHookCleanupRequired`);
    requireResponseEqual(rollbackPreconditions.preconditionsVerified, ready, `${field}.rollbackPreconditions.preconditionsVerified`);
    for (const property of ["rollbackPrepared", "rollbackAttempted", "cleanupAttempted", "valuesIncluded"]) {
        requireResponseEqual(rollbackPreconditions[property], false, `${field}.rollbackPreconditions.${property}`);
    }

    const lifecycleOwnership = responseRecord(record.lifecycleOwnership, `${field}.lifecycleOwnership`);
    requireResponseEqual(lifecycleOwnership.lifecycleOwner, "renderer-service", `${field}.lifecycleOwnership.lifecycleOwner`);
    requireResponseEqual(lifecycleOwnership.registryOwner, "renderer-service", `${field}.lifecycleOwnership.registryOwner`);
    requireResponseEqual(lifecycleOwnership.closeHookOwner, "renderer-service", `${field}.lifecycleOwnership.closeHookOwner`);
    requireResponseEqual(lifecycleOwnership.runtimeId, "bundled-scene-bridge", `${field}.lifecycleOwnership.runtimeId`);
    requireResponseEqual(lifecycleOwnership.targetRegistry, "renderer-service.thumbnail-runtime-registry", `${field}.lifecycleOwnership.targetRegistry`);
    requireResponseEqual(lifecycleOwnership.lifecycleScope, "thumbnail-runtime-registry", `${field}.lifecycleOwnership.lifecycleScope`);
    requireResponseEqual(lifecycleOwnership.noDispatchLifecycle, true, `${field}.lifecycleOwnership.noDispatchLifecycle`);
    requireResponseEqual(lifecycleOwnership.lifecycleOwnershipVerified, ready, `${field}.lifecycleOwnership.lifecycleOwnershipVerified`);
    for (const property of ["closeHookRegistered", "runtimeValueOwned", "registrySlotOwned", "valuesIncluded"]) {
        requireResponseEqual(lifecycleOwnership[property], false, `${field}.lifecycleOwnership.${property}`);
    }

    const preflightOutcomeTaxonomy = responseRecordArray(record.preflightOutcomeTaxonomy, `${field}.preflightOutcomeTaxonomy`);
    requireResponseArrayEqual(
        preflightOutcomeTaxonomy.map((entry) => String(entry.code)),
        bundledSceneBridgeRuntimeRegistryInstallationPreflight.preflightOutcomeTaxonomy.map((entry) => entry.code),
        `${field}.preflightOutcomeTaxonomy.codes`
    );
    for (const outcome of preflightOutcomeTaxonomy) {
        requireResponseEqual(outcome.dispatch, false, `${field}.preflightOutcomeTaxonomy.${String(outcome.code)}.dispatch`);
    }

    const diagnostics = responseRecordArray(record.diagnostics, `${field}.diagnostics`);
    const diagnosticCodes = responseStringArray(record, "diagnosticCodes", `${field}.diagnosticCodes`);
    requireResponseArrayEqual(diagnostics.map((entry) => String(entry.code)), diagnosticCodes, `${field}.diagnostics.codes`);
    requireResponseArrayEqual(
        responseStringArray(record, "nextActions", `${field}.nextActions`),
        [...new Set(diagnostics.flatMap((entry) => responseStringArray(entry, "nextActions", `${field}.diagnostics.nextActions`)))],
        `${field}.nextActions`
    );
    requireResponseArrayEqual(
        diagnosticCodes,
        [
            ready
                ? "renderer_service_bundled_scene_bridge_runtime_registry_installation_preflight_ready"
                : invalid
                  ? "renderer_service_bundled_scene_bridge_runtime_registry_installation_preflight_gate_invalid"
                  : "renderer_service_bundled_scene_bridge_runtime_registry_installation_preflight_gate_not_ready",
        ],
        `${field}.diagnosticCodes`
    );

    const checks = responseRecordArray(record.checks, `${field}.checks`);
    requireResponseArrayEqual(
        checks.map((entry) => String(entry.id)),
        bundledSceneBridgeRuntimeRegistryInstallationPreflight.checks.map((entry) => entry.id),
        `${field}.checks.ids`
    );
    const expectedCheckStatus = invalid ? "invalid" : ready ? "passed" : "blocked";
    for (const check of checks) {
        const checkId = String(check.id);
        requireResponseEqual(check.dispatch, false, `${field}.checks.${checkId}.dispatch`);
        requireResponseEqual(
            check.status,
            checkId === "runtime-values-redacted" ? "passed" : expectedCheckStatus,
            `${field}.checks.${checkId}.status`
        );
    }

    const sideEffects = responseRecord(record.sideEffects, `${field}.sideEffects`);
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
        requireResponseEqual(sideEffects[property], false, `${field}.sideEffects.${property}`);
    }

    const redaction = responseRecord(record.redaction, `${field}.redaction`);
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
        requireResponseEqual(redaction[property], false, `${field}.redaction.${property}`);
    }

    const omitted = responseRecord(record.omitted, `${field}.omitted`);
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
        requireResponseEqual(omitted[property], true, `${field}.omitted.${property}`);
    }
    requireResponseEqual(record.execution ?? null, null, `${field}.execution`);
}



function validateBundledSceneBridgeInstalledRuntimeLifecycleResponse(actual: unknown, field: string): void {
    const record = responseRecord(actual, field);
    const status = String(record.status ?? "");
    if (!["not-installed", "installed", "invalid"].includes(status)) {
        responseInvalid(`${field}.status must be not-installed, installed, or invalid.`, `${field}.status`);
    }
    requireResponseEqual(record.diagnosticsVersion, "P26.47", `${field}.diagnosticsVersion`);
    requireResponseEqual(record.owner, "renderer-service", `${field}.owner`);
    requireResponseEqual(record.mode, "installed-runtime-lifecycle-diagnostics", `${field}.mode`);

    const installed = status === "installed";
    const invalid = status === "invalid";
    const source = responseRecord(record.source, `${field}.source`);
    requireResponseEqual(source.registryInstallationVersion, "P26.46", `${field}.source.registryInstallationVersion`);
    requireResponseEqual(source.installedRuntimeLifecycleVersion, "P26.47", `${field}.source.installedRuntimeLifecycleVersion`);
    requireResponseEqual(source.runtimeInstalled, installed, `${field}.source.runtimeInstalled`);

    const registrySlot = responseRecord(record.registrySlot, `${field}.registrySlot`);
    requireResponseEqual(registrySlot.runtimeId, BUNDLED_SCENE_BRIDGE_RUNTIME_ID, `${field}.registrySlot.runtimeId`);
    requireResponseEqual(registrySlot.targetRegistry, BUNDLED_SCENE_BRIDGE_TARGET_REGISTRY, `${field}.registrySlot.targetRegistry`);
    requireResponseEqual(registrySlot.runtimeAvailableForDispatch, false, `${field}.registrySlot.runtimeAvailableForDispatch`);
    requireResponseEqual(registrySlot.renderDispatchEnabled, false, `${field}.registrySlot.renderDispatchEnabled`);
    requireResponseEqual(registrySlot.valuesIncluded, false, `${field}.registrySlot.valuesIncluded`);
    if (installed) {
        requireResponseEqual(registrySlot.slotOccupied, true, `${field}.registrySlot.slotOccupied`);
        requireResponseEqual(registrySlot.runtimeInstalled, true, `${field}.registrySlot.runtimeInstalled`);
        requireResponseEqual(registrySlot.slotStatus, "occupied", `${field}.registrySlot.slotStatus`);
    }

    const runtimeAvailability = responseRecord(record.runtimeAvailability, `${field}.runtimeAvailability`);
    requireResponseEqual(runtimeAvailability.runtimeAvailableForDispatch, false, `${field}.runtimeAvailability.runtimeAvailableForDispatch`);
    requireResponseEqual(runtimeAvailability.renderDispatchEnabled, false, `${field}.runtimeAvailability.renderDispatchEnabled`);
    requireResponseEqual(runtimeAvailability.valuesIncluded, false, `${field}.runtimeAvailability.valuesIncluded`);
    requireResponseEqual(runtimeAvailability.runtimeValueAvailable, false, `${field}.runtimeAvailability.runtimeValueAvailable`);

    const refusalDiagnostics = responseRecord(record.refusalDiagnostics, `${field}.refusalDiagnostics`);
    requireResponseEqual(refusalDiagnostics.renderDispatchRefused, true, `${field}.refusalDiagnostics.renderDispatchRefused`);
    requireResponseEqual(refusalDiagnostics.runtimeValueExposureRefused, true, `${field}.refusalDiagnostics.runtimeValueExposureRefused`);
    requireResponseEqual(refusalDiagnostics.valuesIncluded, false, `${field}.refusalDiagnostics.valuesIncluded`);

    const sideEffects = responseRecord(record.sideEffects, `${field}.sideEffects`);
    for (const property of [
        "runtimeRegistration",
        "runtimeExecutionRegistered",
        "closeHookInvocation",
        "duplicateRollback",
        "renderDispatch",
        "browserProcessStarted",
        "browserPageCreated",
        "runtimeAssetsLoaded",
        "assetManifestMaterialized",
        "backendRpcReads",
        "sourceDataReads",
        "networkDispatch",
        "dispatch",
        "localFileWrites",
    ]) {
        requireResponseEqual(sideEffects[property], false, `${field}.sideEffects.${property}`);
    }

    const redaction = responseRecord(record.redaction, `${field}.redaction`);
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
        requireResponseEqual(redaction[property], false, `${field}.redaction.${property}`);
    }

    const omitted = responseRecord(record.omitted, `${field}.omitted`);
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
        requireResponseEqual(omitted[property], true, `${field}.omitted.${property}`);
    }

    if (installed) {
        const execution = responseRecord(record.execution, `${field}.execution`);
        requireResponseEqual(execution.renderDispatch, false, `${field}.execution.renderDispatch`);
        requireResponseEqual(execution.valuesIncluded, false, `${field}.execution.valuesIncluded`);
        requireResponseEqual(execution.runtimeInstalled, true, `${field}.execution.runtimeInstalled`);
    } else if (!invalid) {
        requireResponseEqual(record.execution ?? null, null, `${field}.execution`);
    }
}

function validateBundledSceneBridgeRuntimeRegistryInstallationResponse(actual: unknown, field: string): void {
    const record = responseRecord(actual, field);
    const status = String(record.status ?? "");
    if (!["blocked", "executed", "invalid"].includes(status)) {
        responseInvalid(`${field}.status must be blocked, executed, or invalid.`, `${field}.status`);
    }
    requireResponseEqual(record.installationVersion, "P26.46", `${field}.installationVersion`);
    requireResponseEqual(record.owner, "renderer-service", `${field}.owner`);
    requireResponseEqual(record.mode, "guarded-runtime-registry-installation-execution", `${field}.mode`);

    const executed = status === "executed";
    const invalid = status === "invalid";
    const source = responseRecord(record.source, `${field}.source`);
    requireResponseEqual(source.runtimeRegistrationPreflightVersion, "P26.40", `${field}.source.runtimeRegistrationPreflightVersion`);
    requireResponseEqual(source.registryRegistrationBoundaryVersion, "P26.41", `${field}.source.registryRegistrationBoundaryVersion`);
    requireResponseEqual(source.registryInstallationContractVersion, "P26.42", `${field}.source.registryInstallationContractVersion`);
    requireResponseEqual(source.registryInstallationGateVersion, "P26.43", `${field}.source.registryInstallationGateVersion`);
    requireResponseEqual(source.registryInstallationPreflightVersion, "P26.44", `${field}.source.registryInstallationPreflightVersion`);
    requireResponseEqual(source.registryInstallationExecutionBoundaryVersion, "P26.45", `${field}.source.registryInstallationExecutionBoundaryVersion`);
    requireResponseEqual(source.registryInstallationVersion, "P26.46", `${field}.source.registryInstallationVersion`);
    if (typeof source.registryInstallationExecutionBoundaryReady !== "boolean") {
        responseInvalid(`${field}.source.registryInstallationExecutionBoundaryReady must be a boolean.`, `${field}.source.registryInstallationExecutionBoundaryReady`);
    }
    if (executed && source.registryInstallationExecutionBoundaryReady !== true) {
        responseInvalid(`${field}.source.registryInstallationExecutionBoundaryReady must be true when installation is executed.`, `${field}.source.registryInstallationExecutionBoundaryReady`);
    }

    const installation = responseRecord(record.installation, `${field}.installation`);
    for (const property of [
        "registryInstallationExecutionBoundaryReadyRequired",
        "duplicateLookupRequired",
        "runtimeValueCreationRequired",
        "registryInstallationRequired",
        "closeHookRegistrationRequired",
        "rollbackHookRequired",
        "noDispatchRequired",
    ]) {
        requireResponseEqual(installation[property], true, `${field}.installation.${property}`);
    }
    for (const property of [
        "runtimeRegistered",
        "runtimeRegistration",
        "runtimeExecutionRegistered",
        "duplicateRollbackAttempted",
        "renderDispatch",
        "browserProcessStarted",
        "runtimeValuesIncluded",
        "registryValuesIncluded",
    ]) {
        requireResponseEqual(installation[property], false, `${field}.installation.${property}`);
    }
    if (executed) {
        requireResponseEqual(installation.runtimeInstalled, true, `${field}.installation.runtimeInstalled`);
        requireResponseEqual(installation.registryLookupAttempted, true, `${field}.installation.registryLookupAttempted`);
        const execution = isRecord(record.execution) ? record.execution : {};
        if (execution.outcome === "executed") {
            requireResponseEqual(installation.runtimeValueCreated, true, `${field}.installation.runtimeValueCreated`);
            requireResponseEqual(installation.registryWriteAttempted, true, `${field}.installation.registryWriteAttempted`);
        }
    }

    const runtimeValue = responseRecord(record.runtimeValue, `${field}.runtimeValue`);
    requireResponseEqual(runtimeValue.runtimeId, BUNDLED_SCENE_BRIDGE_RUNTIME_ID, `${field}.runtimeValue.runtimeId`);
    requireResponseEqual(runtimeValue.targetRegistry, BUNDLED_SCENE_BRIDGE_TARGET_REGISTRY, `${field}.runtimeValue.targetRegistry`);
    requireResponseEqual(runtimeValue.renderDispatchEnabledAfterInstallation, false, `${field}.runtimeValue.renderDispatchEnabledAfterInstallation`);
    requireResponseEqual(runtimeValue.valuesIncluded, false, `${field}.runtimeValue.valuesIncluded`);

    const registrySlot = responseRecord(record.registrySlot, `${field}.registrySlot`);
    requireResponseEqual(registrySlot.runtimeId, BUNDLED_SCENE_BRIDGE_RUNTIME_ID, `${field}.registrySlot.runtimeId`);
    requireResponseEqual(registrySlot.targetRegistry, BUNDLED_SCENE_BRIDGE_TARGET_REGISTRY, `${field}.registrySlot.targetRegistry`);
    requireResponseEqual(registrySlot.runtimeAvailableForDispatch, false, `${field}.registrySlot.runtimeAvailableForDispatch`);
    requireResponseEqual(registrySlot.renderDispatchEnabled, false, `${field}.registrySlot.renderDispatchEnabled`);
    requireResponseEqual(registrySlot.valuesIncluded, false, `${field}.registrySlot.valuesIncluded`);

    const sideEffects = responseRecord(record.sideEffects, `${field}.sideEffects`);
    for (const property of [
        "runtimeRegistration",
        "runtimeExecutionRegistered",
        "duplicateRollback",
        "renderDispatch",
        "browserProcessStarted",
        "browserPageCreated",
        "runtimeAssetsLoaded",
        "assetManifestMaterialized",
        "backendRpcReads",
        "sourceDataReads",
        "networkDispatch",
        "dispatch",
        "localFileWrites",
    ]) {
        requireResponseEqual(sideEffects[property], false, `${field}.sideEffects.${property}`);
    }

    const redaction = responseRecord(record.redaction, `${field}.redaction`);
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
        requireResponseEqual(redaction[property], false, `${field}.redaction.${property}`);
    }

    const omitted = responseRecord(record.omitted, `${field}.omitted`);
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
        requireResponseEqual(omitted[property], true, `${field}.omitted.${property}`);
    }

    const refusalDiagnostics = responseRecord(record.refusalDiagnostics, `${field}.refusalDiagnostics`);
    requireResponseEqual(refusalDiagnostics.renderDispatchRefused, true, `${field}.refusalDiagnostics.renderDispatchRefused`);
    requireResponseEqual(refusalDiagnostics.valuesIncluded, false, `${field}.refusalDiagnostics.valuesIncluded`);

    if (executed) {
        const execution = responseRecord(record.execution, `${field}.execution`);
        requireResponseEqual(execution.attempted, true, `${field}.execution.attempted`);
        requireResponseEqual(execution.succeeded, true, `${field}.execution.succeeded`);
        if (!["executed", "already-installed"].includes(String(execution.outcome ?? ""))) {
            responseInvalid(`${field}.execution.outcome must be executed or already-installed when status is executed.`, `${field}.execution.outcome`);
        }
        requireResponseEqual(execution.renderDispatch, false, `${field}.execution.renderDispatch`);
        requireResponseEqual(execution.valuesIncluded, false, `${field}.execution.valuesIncluded`);
    } else if (record.execution !== null && record.execution !== undefined) {
        const execution = responseRecord(record.execution, `${field}.execution`);
        requireResponseEqual(execution.renderDispatch, false, `${field}.execution.renderDispatch`);
        requireResponseEqual(execution.valuesIncluded, false, `${field}.execution.valuesIncluded`);
    } else {
        requireResponseEqual(record.execution ?? null, null, `${field}.execution`);
    }
}

function validateBundledSceneBridgeRuntimeRegistryInstallationExecutionBoundaryResponse(actual: unknown, field: string): void {
    const record = responseRecord(actual, field);
    const status = String(record.status ?? "");
    if (!["blocked", "planned-disabled", "invalid"].includes(status)) {
        responseInvalid(`${field}.status must be blocked, planned-disabled, or invalid.`, `${field}.status`);
    }
    requireResponseEqual(record.boundaryVersion, "P26.45", `${field}.boundaryVersion`);
    requireResponseEqual(record.owner, "renderer-service", `${field}.owner`);
    requireResponseEqual(record.mode, "guarded-runtime-registry-installation-execution-boundary", `${field}.mode`);

    const planned = status === "planned-disabled";
    const invalid = status === "invalid";
    const source = responseRecord(record.source, `${field}.source`);
    requireResponseEqual(source.runtimeRegistrationPreflightVersion, "P26.40", `${field}.source.runtimeRegistrationPreflightVersion`);
    requireResponseEqual(source.registryRegistrationBoundaryVersion, "P26.41", `${field}.source.registryRegistrationBoundaryVersion`);
    requireResponseEqual(source.registryInstallationContractVersion, "P26.42", `${field}.source.registryInstallationContractVersion`);
    requireResponseEqual(source.registryInstallationGateVersion, "P26.43", `${field}.source.registryInstallationGateVersion`);
    requireResponseEqual(source.registryInstallationPreflightVersion, "P26.44", `${field}.source.registryInstallationPreflightVersion`);
    requireResponseEqual(source.registryInstallationExecutionBoundaryVersion, "P26.45", `${field}.source.registryInstallationExecutionBoundaryVersion`);
    requireResponseEqual(source.registryInstallationPreflightReady, planned, `${field}.source.registryInstallationPreflightReady`);
    requireResponseEqual(
        source.registryInstallationPreflightStatus,
        planned ? "ready" : invalid ? "invalid" : "blocked",
        `${field}.source.registryInstallationPreflightStatus`
    );
    if (planned || invalid) {
        requireResponseEqual(
            source.registryInstallationPreflightReadiness,
            planned ? "installation-preflight-ready" : "invalid-installation-gate",
            `${field}.source.registryInstallationPreflightReadiness`
        );
    } else if (
        ![
            "blocked-until-reviewed-installation-gate",
            "blocked-until-renderer-service-health",
        ].includes(String(source.registryInstallationPreflightReadiness ?? ""))
    ) {
        responseInvalid(
            `${field}.source.registryInstallationPreflightReadiness must be a blocked installation preflight readiness value.`,
            `${field}.source.registryInstallationPreflightReadiness`
        );
    }
    requireResponseEqual(source.reviewedGateOpen, planned, `${field}.source.reviewedGateOpen`);
    requireResponseEqual(source.futureInstallationAttemptAllowed, planned, `${field}.source.futureInstallationAttemptAllowed`);
    requireResponseEqual(
        source.readiness,
        planned
            ? "runtime-registry-installation-execution-boundary-planned"
            : invalid
              ? "invalid-installation-preflight"
              : "blocked-until-installation-preflight-ready",
        `${field}.source.readiness`
    );

    const executionBoundary = responseRecord(record.executionBoundary, `${field}.executionBoundary`);
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
        requireResponseEqual(executionBoundary[property], true, `${field}.executionBoundary.${property}`);
    }
    requireResponseEqual(executionBoundary.executionPlanReady, planned, `${field}.executionBoundary.executionPlanReady`);
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
        requireResponseEqual(executionBoundary[property], false, `${field}.executionBoundary.${property}`);
    }

    const runtimeValuePlan = responseRecord(record.runtimeValuePlan, `${field}.runtimeValuePlan`);
    requireResponseEqual(runtimeValuePlan.runtimeId, "bundled-scene-bridge", `${field}.runtimeValuePlan.runtimeId`);
    requireResponseEqual(runtimeValuePlan.targetRegistry, "renderer-service.thumbnail-runtime-registry", `${field}.runtimeValuePlan.targetRegistry`);
    requireResponseArrayEqual(responseStringArray(runtimeValuePlan, "requiredMethods", `${field}.runtimeValuePlan.requiredMethods`), ["renderThumbnail"], `${field}.runtimeValuePlan.requiredMethods`);
    requireResponseArrayEqual(responseStringArray(runtimeValuePlan, "optionalMethods", `${field}.runtimeValuePlan.optionalMethods`), ["close"], `${field}.runtimeValuePlan.optionalMethods`);
    requireResponseArrayEqual(
        responseStringArray(runtimeValuePlan, "requiredInstallationInputs", `${field}.runtimeValuePlan.requiredInstallationInputs`),
        ["runtimeId", "runtimeValue", "lifecycleOwner", "closeHook"],
        `${field}.runtimeValuePlan.requiredInstallationInputs`
    );
    requireResponseEqual(runtimeValuePlan.runtimeValueCreationPlanned, true, `${field}.runtimeValuePlan.runtimeValueCreationPlanned`);
    for (const property of [
        "runtimeValueCreated",
        "runtimeValueInstalled",
        "runtimeRegistered",
        "runtimeExecutionRegistered",
        "renderDispatchEnabledAfterInstallation",
        "valuesIncluded",
    ]) {
        requireResponseEqual(runtimeValuePlan[property], false, `${field}.runtimeValuePlan.${property}`);
    }

    const duplicateHandling = responseRecord(record.duplicateHandling, `${field}.duplicateHandling`);
    for (const property of [
        "duplicateDetectionRequired",
        "existingRuntimeLookupRequired",
        "rollbackRequiredOnDuplicate",
        "rollbackHookRequired",
        "cleanupOnInstallationFailure",
        "cleanupOnServiceStop",
    ]) {
        requireResponseEqual(duplicateHandling[property], true, `${field}.duplicateHandling.${property}`);
    }
    requireResponseEqual(duplicateHandling.duplicateRegistrationPolicy, "reject-until-explicit-replace-policy", `${field}.duplicateHandling.duplicateRegistrationPolicy`);
    requireResponseEqual(duplicateHandling.replacementPolicy, "not-supported-until-reviewed", `${field}.duplicateHandling.replacementPolicy`);
    for (const property of [
        "existingRuntimeLookupAttempted",
        "existingRuntimeFound",
        "duplicateDetected",
        "rollbackPrepared",
        "rollbackAttempted",
        "cleanupAttempted",
        "valuesIncluded",
    ]) {
        requireResponseEqual(duplicateHandling[property], false, `${field}.duplicateHandling.${property}`);
    }

    const lifecycleOwnership = responseRecord(record.lifecycleOwnership, `${field}.lifecycleOwnership`);
    requireResponseEqual(lifecycleOwnership.lifecycleOwner, "renderer-service", `${field}.lifecycleOwnership.lifecycleOwner`);
    requireResponseEqual(lifecycleOwnership.registryOwner, "renderer-service", `${field}.lifecycleOwnership.registryOwner`);
    requireResponseEqual(lifecycleOwnership.closeHookOwner, "renderer-service", `${field}.lifecycleOwnership.closeHookOwner`);
    requireResponseEqual(lifecycleOwnership.rollbackOwner, "renderer-service", `${field}.lifecycleOwnership.rollbackOwner`);
    requireResponseEqual(lifecycleOwnership.runtimeId, "bundled-scene-bridge", `${field}.lifecycleOwnership.runtimeId`);
    requireResponseEqual(lifecycleOwnership.targetRegistry, "renderer-service.thumbnail-runtime-registry", `${field}.lifecycleOwnership.targetRegistry`);
    requireResponseEqual(lifecycleOwnership.lifecycleScope, "thumbnail-runtime-registry", `${field}.lifecycleOwnership.lifecycleScope`);
    requireResponseEqual(lifecycleOwnership.noDispatchLifecycle, true, `${field}.lifecycleOwnership.noDispatchLifecycle`);
    requireResponseEqual(lifecycleOwnership.lifecycleOwnershipVerified, planned, `${field}.lifecycleOwnership.lifecycleOwnershipVerified`);
    for (const property of ["closeHookRegistered", "rollbackHookRegistered", "runtimeValueOwned", "registrySlotOwned", "valuesIncluded"]) {
        requireResponseEqual(lifecycleOwnership[property], false, `${field}.lifecycleOwnership.${property}`);
    }

    const refusalDiagnostics = responseRecord(record.refusalDiagnostics, `${field}.refusalDiagnostics`);
    requireResponseEqual(refusalDiagnostics.refusalRequired, true, `${field}.refusalDiagnostics.refusalRequired`);
    requireResponseEqual(refusalDiagnostics.invalidPreflightMetadata, invalid, `${field}.refusalDiagnostics.invalidPreflightMetadata`);
    requireResponseEqual(
        refusalDiagnostics.refusalReason,
        planned
            ? "installation-execution-disabled-until-reviewed-execution-task"
            : invalid
              ? "installation-preflight-invalid"
              : "installation-preflight-not-ready",
        `${field}.refusalDiagnostics.refusalReason`
    );
    for (const property of [
        "registryLookupRefused",
        "registryWriteRefused",
        "runtimeValueCreationRefused",
        "runtimeInstallationRefused",
        "closeHookRegistrationRefused",
        "duplicateRollbackRefused",
        "renderDispatchRefused",
    ]) {
        requireResponseEqual(refusalDiagnostics[property], true, `${field}.refusalDiagnostics.${property}`);
    }
    requireResponseEqual(refusalDiagnostics.valuesIncluded, false, `${field}.refusalDiagnostics.valuesIncluded`);

    const executionOutcomeTaxonomy = responseRecordArray(record.executionOutcomeTaxonomy, `${field}.executionOutcomeTaxonomy`);
    requireResponseArrayEqual(
        executionOutcomeTaxonomy.map((entry) => String(entry.code)),
        bundledSceneBridgeRuntimeRegistryInstallationExecutionBoundary.executionOutcomeTaxonomy.map((entry) => entry.code),
        `${field}.executionOutcomeTaxonomy.codes`
    );
    for (const outcome of executionOutcomeTaxonomy) {
        requireResponseEqual(outcome.dispatch, false, `${field}.executionOutcomeTaxonomy.${String(outcome.code)}.dispatch`);
    }

    const diagnostics = responseRecordArray(record.diagnostics, `${field}.diagnostics`);
    const diagnosticCodes = responseStringArray(record, "diagnosticCodes", `${field}.diagnosticCodes`);
    requireResponseArrayEqual(diagnostics.map((entry) => String(entry.code)), diagnosticCodes, `${field}.diagnostics.codes`);
    requireResponseArrayEqual(
        responseStringArray(record, "nextActions", `${field}.nextActions`),
        [...new Set(diagnostics.flatMap((entry) => responseStringArray(entry, "nextActions", `${field}.diagnostics.nextActions`)))],
        `${field}.nextActions`
    );
    requireResponseArrayEqual(
        diagnosticCodes,
        [
            planned
                ? "renderer_service_bundled_scene_bridge_runtime_registry_installation_execution_boundary_planned"
                : invalid
                  ? "renderer_service_bundled_scene_bridge_runtime_registry_installation_execution_boundary_preflight_invalid"
                  : "renderer_service_bundled_scene_bridge_runtime_registry_installation_execution_boundary_preflight_not_ready",
        ],
        `${field}.diagnosticCodes`
    );

    const checks = responseRecordArray(record.checks, `${field}.checks`);
    requireResponseArrayEqual(
        checks.map((entry) => String(entry.id)),
        bundledSceneBridgeRuntimeRegistryInstallationExecutionBoundary.checks.map((entry) => entry.id),
        `${field}.checks.ids`
    );
    const checkStatus = (id: string) => String(checks.find((entry) => entry.id === id)?.status ?? "unknown");
    requireResponseEqual(
        checkStatus("installation-preflight-ready"),
        invalid ? "invalid" : planned ? "passed" : "blocked",
        `${field}.checks.installation-preflight-ready.status`
    );
    for (const checkId of [
        "runtime-value-creation-boundary",
        "registry-installation-boundary",
        "close-hook-registration-boundary",
        "duplicate-rollback-boundary",
    ]) {
        requireResponseEqual(checkStatus(checkId), invalid ? "invalid" : "planned", `${field}.checks.${checkId}.status`);
    }
    requireResponseEqual(checkStatus("runtime-values-redacted"), "passed", `${field}.checks.runtime-values-redacted.status`);
    for (const check of checks) {
        requireResponseEqual(check.dispatch, false, `${field}.checks.${String(check.id)}.dispatch`);
    }

    const sideEffects = responseRecord(record.sideEffects, `${field}.sideEffects`);
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
        requireResponseEqual(sideEffects[property], false, `${field}.sideEffects.${property}`);
    }

    const redaction = responseRecord(record.redaction, `${field}.redaction`);
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
        requireResponseEqual(redaction[property], false, `${field}.redaction.${property}`);
    }

    const omitted = responseRecord(record.omitted, `${field}.omitted`);
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
        requireResponseEqual(omitted[property], true, `${field}.omitted.${property}`);
    }
    requireResponseEqual(record.execution ?? null, null, `${field}.execution`);
}

function validateRuntimeAssetMaterializationPreflightCheckResponse(
    actual: unknown,
    expected: (typeof bundledRuntimeAssetMaterializationPreflight.checks)[number],
    field: string
): void {
    const record = responseRecord(actual, field);
    requireResponseEqual(record.id, expected.id, `${field}.id`);
    requireResponseEqual(record.assetId, expected.assetId, `${field}.assetId`);
    requireResponseEqual(record.kind, expected.kind, `${field}.kind`);
    requireResponseEqual(record.publicPath, expected.publicPath, `${field}.publicPath`);
    requireResponseEqual(record.cachePath, expected.cachePath, `${field}.cachePath`);
    requireResponseEqual(responseBoolean(record, "required", `${field}.required`), expected.required, `${field}.required`);
    requireResponseEqual(record.readiness, "not-checked", `${field}.readiness`);
    requireResponseArrayEqual(responseStringArray(record, "plannedChecks", `${field}.plannedChecks`), [...expected.plannedChecks], `${field}.plannedChecks`);
    requireResponseEqual(record.exists ?? null, null, `${field}.exists`);
    requireResponseEqual(record.cacheOutputExists ?? null, null, `${field}.cacheOutputExists`);
    requireResponseEqual(record.sha256 ?? null, null, `${field}.sha256`);
    requireResponseEqual(record.byteLength ?? null, null, `${field}.byteLength`);
    requireResponseEqual(record.fileRead, false, `${field}.fileRead`);
    requireResponseEqual(record.hashComputed, false, `${field}.hashComputed`);
    requireResponseEqual(record.dispatch, false, `${field}.dispatch`);
    requireResponseEqual(record.localFileWrites, false, `${field}.localFileWrites`);
}

function validateRuntimeAssetMaterializationPreflightCacheOutputResponse(
    actual: unknown,
    expected: (typeof bundledRuntimeAssetMaterializationPreflight.cacheOutputChecks)[number],
    field: string
): void {
    const record = responseRecord(actual, field);
    requireResponseEqual(record.id, expected.id, `${field}.id`);
    requireResponseEqual(record.cacheOutputId, expected.cacheOutputId, `${field}.cacheOutputId`);
    requireResponseEqual(record.path, expected.path, `${field}.path`);
    requireResponseEqual(record.readiness, "not-checked", `${field}.readiness`);
    requireResponseEqual(record.exists ?? null, null, `${field}.exists`);
    requireResponseEqual(record.writable ?? null, null, `${field}.writable`);
    requireResponseEqual(record.fileRead, false, `${field}.fileRead`);
    requireResponseEqual(record.localFileWrites, false, `${field}.localFileWrites`);
}

function validateRuntimeAssetMaterializationPreflightExecutionCheckResponse(
    actual: unknown,
    expected: (typeof bundledRuntimeAssetMaterializationPreflight.checks)[number],
    field: string
): void {
    const record = responseRecord(actual, field);
    requireResponseEqual(record.id, expected.id, `${field}.id`);
    requireResponseEqual(record.assetId, expected.assetId, `${field}.assetId`);
    requireResponseEqual(record.kind, expected.kind, `${field}.kind`);
    requireResponseEqual(record.publicPath, expected.publicPath, `${field}.publicPath`);
    requireResponseEqual(record.cachePath, expected.cachePath, `${field}.cachePath`);
    requireResponseEqual(responseBoolean(record, "required", `${field}.required`), expected.required, `${field}.required`);
    requireResponseEqual(record.readiness === "ready" || record.readiness === "missing", true, `${field}.readiness`);
    const exists = responseBoolean(record, "exists", `${field}.exists`);
    const cacheOutputExists = responseBoolean(record, "cacheOutputExists", `${field}.cacheOutputExists`);

    const sha256 = record.sha256;
    if (sha256 !== null && (typeof sha256 !== "string" || !/^[a-f0-9]{64}$/.test(sha256))) {
        responseInvalid(`Renderer-service thumbnail response ${field}.sha256 must be null or a 64-character lowercase hex string.`, `${field}.sha256`);
    }
    const byteLength = responseNonNegativeIntegerOrNull(record, "byteLength", `${field}.byteLength`);
    const fileRead = responseBoolean(record, "fileRead", `${field}.fileRead`);
    const hashComputed = responseBoolean(record, "hashComputed", `${field}.hashComputed`);
    requireResponseEqual(fileRead, hashComputed, `${field}.fileRead`);
    requireResponseEqual(sha256 !== null, hashComputed, `${field}.sha256`);
    requireResponseEqual(byteLength !== null, hashComputed, `${field}.byteLength`);
    if (!exists) {
        requireResponseEqual(fileRead, false, `${field}.fileRead`);
        requireResponseEqual(hashComputed, false, `${field}.hashComputed`);
    }
    requireResponseEqual(record.readiness, exists && cacheOutputExists && hashComputed ? "ready" : "missing", `${field}.readiness`);
    requireResponseEqual(record.dispatch, false, `${field}.dispatch`);
    requireResponseEqual(record.localFileWrites, false, `${field}.localFileWrites`);
}

function validateRuntimeAssetMaterializationPreflightExecutionCacheOutputResponse(
    actual: unknown,
    expected: (typeof bundledRuntimeAssetMaterializationPreflight.cacheOutputChecks)[number],
    field: string
): void {
    const record = responseRecord(actual, field);
    requireResponseEqual(record.id, expected.id, `${field}.id`);
    requireResponseEqual(record.cacheOutputId, expected.cacheOutputId, `${field}.cacheOutputId`);
    requireResponseEqual(record.path, expected.path, `${field}.path`);
    requireResponseEqual(record.readiness === "ready" || record.readiness === "missing", true, `${field}.readiness`);
    const exists = responseBoolean(record, "exists", `${field}.exists`);
    const writable = responseBoolean(record, "writable", `${field}.writable`);
    requireResponseEqual(record.readiness, exists && writable ? "ready" : "missing", `${field}.readiness`);
    requireResponseEqual(record.fileRead, false, `${field}.fileRead`);
    requireResponseEqual(record.localFileWrites, false, `${field}.localFileWrites`);
}

function validateRuntimeAssetMaterializationPreflightExecutionDiagnosticResponse(actual: unknown, field: string): void {
    const record = responseRecord(actual, field);
    requireResponseEqual(
        [
            "renderer_service_runtime_asset_missing_public_asset",
            "renderer_service_runtime_asset_missing_cache_asset",
            "renderer_service_runtime_asset_hash_unavailable",
            "renderer_service_runtime_asset_cache_output_unavailable",
        ].includes(String(record.code)),
        true,
        `${field}.code`
    );
    requireResponseEqual(record.severity, "degraded", `${field}.severity`);
    requireResponseEqual(
        ["public-asset", "cache-asset", "asset-hash", "cache-output"].includes(String(record.category)),
        true,
        `${field}.category`
    );
    requireResponseEqual(typeof record.assetId === "string" || record.assetId === null, true, `${field}.assetId`);
    requireResponseEqual(typeof record.cacheOutputId === "string" || record.cacheOutputId === null, true, `${field}.cacheOutputId`);
    requireResponseEqual(responseBoolean(record, "retryable", `${field}.retryable`), true, `${field}.retryable`);
    responseString(record, "message", `${field}.message`);
    requireResponseEqual(responseStringArray(record, "nextActions", `${field}.nextActions`).length > 0, true, `${field}.nextActions`);
    requireResponseEqual(record.dispatch, false, `${field}.dispatch`);
    requireResponseEqual(record.localFileWrites, false, `${field}.localFileWrites`);
}

function validateRuntimeAssetMaterializationPreflightExecutionResponse(actual: unknown, field: string): void {
    const record = responseRecord(actual, field);
    requireResponseEqual(record.status, "executed", `${field}.status`);
    requireResponseEqual(record.executionVersion, "P26.22", `${field}.executionVersion`);
    requireResponseEqual(record.mode, "read-only", `${field}.mode`);
    requireResponseEqual(record.diagnosticsVersion, "P26.25", `${field}.diagnosticsVersion`);
    requireResponseEqual(record.readiness === "ready" || record.readiness === "degraded", true, `${field}.readiness`);

    const workspaceRoot = responseString(record, "workspaceRoot", `${field}.workspaceRoot`);
    const cacheRoot = responseString(record, "cacheRoot", `${field}.cacheRoot`);
    requireResponseEqual(isAbsolute(workspaceRoot), true, `${field}.workspaceRoot`);
    requireResponseEqual(isAbsolute(cacheRoot), true, `${field}.cacheRoot`);

    const checks = responseRecordArray(record.checks, `${field}.checks`);
    requireResponseEqual(checks.length, bundledRuntimeAssetMaterializationPreflight.checks.length, `${field}.checks.length`);
    for (let index = 0; index < bundledRuntimeAssetMaterializationPreflight.checks.length; index += 1) {
        validateRuntimeAssetMaterializationPreflightExecutionCheckResponse(
            checks[index],
            bundledRuntimeAssetMaterializationPreflight.checks[index],
            `${field}.checks.${index}`
        );
    }

    const cacheOutputChecks = responseRecordArray(record.cacheOutputChecks, `${field}.cacheOutputChecks`);
    requireResponseEqual(cacheOutputChecks.length, bundledRuntimeAssetMaterializationPreflight.cacheOutputChecks.length, `${field}.cacheOutputChecks.length`);
    for (let index = 0; index < bundledRuntimeAssetMaterializationPreflight.cacheOutputChecks.length; index += 1) {
        validateRuntimeAssetMaterializationPreflightExecutionCacheOutputResponse(
            cacheOutputChecks[index],
            bundledRuntimeAssetMaterializationPreflight.cacheOutputChecks[index],
            `${field}.cacheOutputChecks.${index}`
        );
    }

    const expectedReadyAssetIds = checks
        .map((entry, index) => ({ entry, index }))
        .filter(({ entry }) => entry.readiness === "ready")
        .map(({ index }) => bundledRuntimeAssetMaterializationPreflight.checks[index].assetId);
    const expectedMissingAssetIds = checks
        .map((entry, index) => ({ entry, index }))
        .filter(({ entry }) => entry.readiness !== "ready")
        .map(({ index }) => bundledRuntimeAssetMaterializationPreflight.checks[index].assetId);
    const expectedReadyCacheOutputIds = cacheOutputChecks
        .map((entry, index) => ({ entry, index }))
        .filter(({ entry }) => entry.readiness === "ready")
        .map(({ index }) => bundledRuntimeAssetMaterializationPreflight.cacheOutputChecks[index].cacheOutputId);
    const expectedMissingCacheOutputIds = cacheOutputChecks
        .map((entry, index) => ({ entry, index }))
        .filter(({ entry }) => entry.readiness !== "ready")
        .map(({ index }) => bundledRuntimeAssetMaterializationPreflight.cacheOutputChecks[index].cacheOutputId);
    const executionReady = expectedMissingAssetIds.length === 0 && expectedMissingCacheOutputIds.length === 0;
    requireResponseEqual(record.readiness, executionReady ? "ready" : "degraded", `${field}.readiness`);

    const diagnostics = responseRecordArray(record.diagnostics, `${field}.diagnostics`);
    for (let index = 0; index < diagnostics.length; index += 1) {
        validateRuntimeAssetMaterializationPreflightExecutionDiagnosticResponse(diagnostics[index], `${field}.diagnostics.${index}`);
    }
    const nextActions = responseStringArray(record, "nextActions", `${field}.nextActions`);
    requireResponseEqual(diagnostics.length === 0, executionReady, `${field}.diagnostics`);
    requireResponseEqual(nextActions.length === 0, executionReady, `${field}.nextActions`);

    const summary = responseRecord(record.summary, `${field}.summary`);
    requireResponseEqual(responseBoolean(summary, "ready", `${field}.summary.ready`), executionReady, `${field}.summary.ready`);

    const readyAssetIds = responseStringArray(summary, "readyAssetIds", `${field}.summary.readyAssetIds`);
    const missingAssetIds = responseStringArray(summary, "missingAssetIds", `${field}.summary.missingAssetIds`);
    const readyCacheOutputIds = responseStringArray(summary, "readyCacheOutputIds", `${field}.summary.readyCacheOutputIds`);
    const missingCacheOutputIds = responseStringArray(summary, "missingCacheOutputIds", `${field}.summary.missingCacheOutputIds`);

    requireResponseArrayEqual(
        readyAssetIds,
        expectedReadyAssetIds,
        `${field}.summary.readyAssetIds`
    );
    requireResponseArrayEqual(
        missingAssetIds,
        expectedMissingAssetIds,
        `${field}.summary.missingAssetIds`
    );
    requireResponseArrayEqual(
        readyCacheOutputIds,
        expectedReadyCacheOutputIds,
        `${field}.summary.readyCacheOutputIds`
    );
    requireResponseArrayEqual(
        missingCacheOutputIds,
        expectedMissingCacheOutputIds,
        `${field}.summary.missingCacheOutputIds`
    );

    const sideEffects = responseRecord(record.sideEffects, `${field}.sideEffects`);
    for (const property of [
        "browserProcessStarted",
        "runtimeExecutionRegistered",
        "runtimeAdapterImported",
        "runtimeAssetsLoaded",
        "assetManifestMaterialized",
        "networkDispatch",
        "dispatch",
        "localFileWrites",
    ]) {
        requireResponseEqual(sideEffects[property], false, `${field}.sideEffects.${property}`);
    }
    requireResponseEqual(responseBoolean(sideEffects, "fileRead", `${field}.sideEffects.fileRead`), checks.some((entry) => entry.fileRead), `${field}.sideEffects.fileRead`);
    requireResponseEqual(responseBoolean(sideEffects, "hashComputed", `${field}.sideEffects.hashComputed`), checks.some((entry) => entry.hashComputed), `${field}.sideEffects.hashComputed`);

    const redaction = responseRecord(record.redaction, `${field}.redaction`);
    for (const property of [
        "sourceDataValuesIncluded",
        "pageValuesIncluded",
        "artifactValuesIncluded",
        "mediaValuesIncluded",
        "tokenValuesIncluded",
    ]) {
        requireResponseEqual(redaction[property], false, `${field}.redaction.${property}`);
    }
}

function validateRuntimeAssetMaterializationDryRunResponse(actual: unknown, field: string): void {
    const record = responseRecord(actual, field);
    requireResponseEqual(record.status, "planned-disabled", `${field}.status`);
    requireResponseEqual(record.planVersion, "P26.26", `${field}.planVersion`);
    requireResponseEqual(record.owner, "renderer-service", `${field}.owner`);
    requireResponseEqual(record.mode, "metadata-only", `${field}.mode`);

    const sourcePreflight = responseRecord(record.sourcePreflight, `${field}.sourcePreflight`);
    requireResponseEqual(sourcePreflight.preflightVersion, "P26.21", `${field}.sourcePreflight.preflightVersion`);
    requireResponseEqual(sourcePreflight.diagnosticsVersion, "P26.25", `${field}.sourcePreflight.diagnosticsVersion`);
    requireResponseEqual(
        sourcePreflight.status === "not-executed" || sourcePreflight.status === "ready" || sourcePreflight.status === "degraded",
        true,
        `${field}.sourcePreflight.status`
    );
    requireResponseEqual(
        sourcePreflight.readiness === "not-checked" || sourcePreflight.readiness === "ready" || sourcePreflight.readiness === "degraded",
        true,
        `${field}.sourcePreflight.readiness`
    );
    requireResponseEqual(responseBoolean(sourcePreflight, "ready", `${field}.sourcePreflight.ready`), sourcePreflight.readiness === "ready", `${field}.sourcePreflight.ready`);
    requireResponseArrayEqual(
        responseStringArray(sourcePreflight, "diagnosticCodes", `${field}.sourcePreflight.diagnosticCodes`),
        (sourcePreflight.diagnosticCodes as string[] | undefined) ?? [],
        `${field}.sourcePreflight.diagnosticCodes`
    );

    const prerequisites = responseRecordArray(record.prerequisites, `${field}.prerequisites`);
    requireResponseEqual(prerequisites.length, 3, `${field}.prerequisites.length`);
    for (const [index, prerequisite] of prerequisites.entries()) {
        requireResponseEqual(prerequisite.required, true, `${field}.prerequisites.${index}.required`);
        requireResponseEqual(
            ["satisfied", "blocked", "approval-required"].includes(String(prerequisite.status)),
            true,
            `${field}.prerequisites.${index}.status`
        );
        requireResponseArrayEqual(
            responseStringArray(prerequisite, "diagnosticCodes", `${field}.prerequisites.${index}.diagnosticCodes`),
            (prerequisite.diagnosticCodes as string[] | undefined) ?? [],
            `${field}.prerequisites.${index}.diagnosticCodes`
        );
        requireResponseEqual(responseStringArray(prerequisite, "nextActions", `${field}.prerequisites.${index}.nextActions`).length >= 0, true, `${field}.prerequisites.${index}.nextActions`);
    }

    const copyPlan = responseRecordArray(record.copyPlan, `${field}.copyPlan`);
    requireResponseEqual(copyPlan.length, bundledRuntimeBridgeAssetManifest.assets.length, `${field}.copyPlan.length`);
    for (const [index, entry] of copyPlan.entries()) {
        requireResponseEqual(entry.copyRequired, true, `${field}.copyPlan.${index}.copyRequired`);
        requireResponseEqual(entry.source, "public-asset", `${field}.copyPlan.${index}.source`);
        requireResponseEqual(entry.destination, "runtime-asset-cache", `${field}.copyPlan.${index}.destination`);
        requireResponseEqual(entry.futureLocalFileWrites, true, `${field}.copyPlan.${index}.futureLocalFileWrites`);
        requireResponseEqual(entry.localFileWrites, false, `${field}.copyPlan.${index}.localFileWrites`);
        requireResponseEqual(entry.copyApproved, false, `${field}.copyPlan.${index}.copyApproved`);
        requireResponseEqual(
            ["ready", "blocked", "unknown"].includes(String(entry.preflightReadiness)),
            true,
            `${field}.copyPlan.${index}.preflightReadiness`
        );
    }

    const cacheOutputPlan = responseRecordArray(record.cacheOutputPlan, `${field}.cacheOutputPlan`);
    requireResponseEqual(cacheOutputPlan.length, bundledRuntimeBridgeAssetManifest.cacheOutputs.length, `${field}.cacheOutputPlan.length`);
    for (const [index, entry] of cacheOutputPlan.entries()) {
        requireResponseEqual(entry.requiredBeforeMaterialization, true, `${field}.cacheOutputPlan.${index}.requiredBeforeMaterialization`);
        requireResponseEqual(entry.futureLocalFileWrites, true, `${field}.cacheOutputPlan.${index}.futureLocalFileWrites`);
        requireResponseEqual(entry.localFileWrites, false, `${field}.cacheOutputPlan.${index}.localFileWrites`);
        requireResponseEqual(
            ["ready", "blocked", "unknown"].includes(String(entry.preflightReadiness)),
            true,
            `${field}.cacheOutputPlan.${index}.preflightReadiness`
        );
    }

    const approvalGate = responseRecord(record.approvalGate, `${field}.approvalGate`);
    requireResponseEqual(approvalGate.status, "closed", `${field}.approvalGate.status`);
    requireResponseEqual(approvalGate.approvalRequired, true, `${field}.approvalGate.approvalRequired`);
    requireResponseEqual(approvalGate.approvalGranted, false, `${field}.approvalGate.approvalGranted`);
    requireResponseEqual(approvalGate.approvalTokenAccepted, false, `${field}.approvalGate.approvalTokenAccepted`);
    requireResponseEqual(approvalGate.approvalTokenConsumed, false, `${field}.approvalGate.approvalTokenConsumed`);
    requireResponseEqual(approvalGate.writesEnabled, false, `${field}.approvalGate.writesEnabled`);
    requireResponseEqual(responseStringArray(approvalGate, "currentBlockers", `${field}.approvalGate.currentBlockers`).length >= 1, true, `${field}.approvalGate.currentBlockers`);
    requireResponseEqual(responseStringArray(approvalGate, "opensWhen", `${field}.approvalGate.opensWhen`).length >= 1, true, `${field}.approvalGate.opensWhen`);

    const sideEffects = responseRecord(record.sideEffects, `${field}.sideEffects`);
    for (const property of [
        "browserProcessStarted",
        "runtimeExecutionRegistered",
        "runtimeAdapterImported",
        "runtimeAssetsLoaded",
        "assetManifestMaterialized",
        "fileRead",
        "hashComputed",
        "networkDispatch",
        "dispatch",
        "localFileWrites",
    ]) {
        requireResponseEqual(sideEffects[property], false, `${field}.sideEffects.${property}`);
    }

    const redaction = responseRecord(record.redaction, `${field}.redaction`);
    for (const property of [
        "sourceDataValuesIncluded",
        "pageValuesIncluded",
        "artifactValuesIncluded",
        "mediaValuesIncluded",
        "tokenValuesIncluded",
    ]) {
        requireResponseEqual(redaction[property], false, `${field}.redaction.${property}`);
    }

    const omitted = responseRecord(record.omitted, `${field}.omitted`);
    for (const property of [
        "workspaceRoot",
        "cacheRoot",
        "publicPaths",
        "cachePaths",
        "sha256",
        "tokenValues",
        "sourceDataValues",
        "pageValues",
        "artifactValues",
        "mediaValues",
    ]) {
        requireResponseEqual(omitted[property], true, `${field}.omitted.${property}`);
    }
    requireResponseEqual(record.execution, null, `${field}.execution`);
}

function validateRuntimeAssetMaterializationApprovalResponse(actual: unknown, field: string): void {
    const record = responseRecord(actual, field);
    requireResponseEqual(record.status, "planned-disabled", `${field}.status`);
    requireResponseEqual(record.planVersion, "P26.27", `${field}.planVersion`);
    requireResponseEqual(record.diagnosticsVersion, "P26.28", `${field}.diagnosticsVersion`);
    requireResponseEqual(record.owner, "renderer-service", `${field}.owner`);
    requireResponseEqual(record.mode, "metadata-only", `${field}.mode`);

    const sourceDryRun = responseRecord(record.sourceDryRun, `${field}.sourceDryRun`);
    requireResponseEqual(sourceDryRun.planVersion, "P26.26", `${field}.sourceDryRun.planVersion`);
    requireResponseEqual(sourceDryRun.status, "planned-disabled", `${field}.sourceDryRun.status`);
    requireResponseEqual(
        ["not-checked", "ready", "degraded", "unknown"].includes(String(sourceDryRun.readiness)),
        true,
        `${field}.sourceDryRun.readiness`
    );
    requireResponseEqual(responseBoolean(sourceDryRun, "ready", `${field}.sourceDryRun.ready`), sourceDryRun.readiness === "ready", `${field}.sourceDryRun.ready`);
    requireResponseEqual(sourceDryRun.approvalRequired, true, `${field}.sourceDryRun.approvalRequired`);
    requireResponseEqual(sourceDryRun.approvalGranted, false, `${field}.sourceDryRun.approvalGranted`);
    requireResponseEqual(sourceDryRun.writesEnabled, false, `${field}.sourceDryRun.writesEnabled`);
    responseStringArray(sourceDryRun, "diagnosticCodes", `${field}.sourceDryRun.diagnosticCodes`);
    for (const countsField of ["copyPlanCounts", "cacheOutputPlanCounts"]) {
        const counts = responseRecord(sourceDryRun[countsField], `${field}.sourceDryRun.${countsField}`);
        for (const property of ["total", "ready", "blocked", "unknown"]) {
            requireResponseEqual(
                typeof counts[property] === "number" && Number.isInteger(counts[property]) && counts[property] >= 0,
                true,
                `${field}.sourceDryRun.${countsField}.${property}`
            );
        }
    }

    const configuration = responseRecord(record.configuration, `${field}.configuration`);
    requireResponseEqual(configuration.status, "planned-disabled", `${field}.configuration.status`);
    const configurationConfigured = responseBoolean(configuration, "configured", `${field}.configuration.configured`);
    requireResponseEqual(configuration.valuesIncluded, false, `${field}.configuration.valuesIncluded`);
    const mode = responseRecord(configuration.mode, `${field}.configuration.mode`);
    requireResponseEqual(mode.env, RUNTIME_ASSET_MATERIALIZATION_APPROVAL_ENV, `${field}.configuration.mode.env`);
    requireResponseEqual(mode.expectedValue, "approved", `${field}.configuration.mode.expectedValue`);
    const modeConfigured = responseBoolean(mode, "configured", `${field}.configuration.mode.configured`);
    requireResponseEqual(mode.valueRead, false, `${field}.configuration.mode.valueRead`);
    const approvalToken = responseRecord(configuration.approvalToken, `${field}.configuration.approvalToken`);
    requireResponseEqual(approvalToken.env, RUNTIME_ASSET_MATERIALIZATION_APPROVAL_TOKEN_ENV, `${field}.configuration.approvalToken.env`);
    requireResponseEqual(approvalToken.requiredWhenEnabled, true, `${field}.configuration.approvalToken.requiredWhenEnabled`);
    const approvalTokenConfigured = responseBoolean(approvalToken, "configured", `${field}.configuration.approvalToken.configured`);
    for (const property of ["valueRead", "accepted", "consumed", "valuesIncluded"]) {
        requireResponseEqual(approvalToken[property], false, `${field}.configuration.approvalToken.${property}`);
    }
    const auditConfig = responseRecord(configuration.audit, `${field}.configuration.audit`);
    requireResponseEqual(auditConfig.env, RUNTIME_ASSET_MATERIALIZATION_APPROVAL_AUDIT_DIR_ENV, `${field}.configuration.audit.env`);
    requireResponseEqual(auditConfig.requiredWhenEnabled, true, `${field}.configuration.audit.requiredWhenEnabled`);
    const auditConfigured = responseBoolean(auditConfig, "configured", `${field}.configuration.audit.configured`);
    requireResponseEqual(configurationConfigured, modeConfigured || approvalTokenConfigured || auditConfigured, `${field}.configuration.configured`);
    for (const property of ["valueRead", "recordWrites", "valuesIncluded"]) {
        requireResponseEqual(auditConfig[property], false, `${field}.configuration.audit.${property}`);
    }

    const approvalGate = responseRecord(record.approvalGate, `${field}.approvalGate`);
    requireResponseEqual(approvalGate.status, "closed", `${field}.approvalGate.status`);
    requireResponseEqual(approvalGate.approvalRequired, true, `${field}.approvalGate.approvalRequired`);
    requireResponseEqual(approvalGate.approvalGranted, false, `${field}.approvalGate.approvalGranted`);
    requireResponseEqual(approvalGate.approvalTokenConfigured, approvalTokenConfigured, `${field}.approvalGate.approvalTokenConfigured`);
    requireResponseEqual(approvalGate.approvalTokenAccepted, false, `${field}.approvalGate.approvalTokenAccepted`);
    requireResponseEqual(approvalGate.approvalTokenConsumed, false, `${field}.approvalGate.approvalTokenConsumed`);
    requireResponseEqual(approvalGate.writesEnabled, false, `${field}.approvalGate.writesEnabled`);
    requireResponseEqual(responseStringArray(approvalGate, "currentBlockers", `${field}.approvalGate.currentBlockers`).length >= 1, true, `${field}.approvalGate.currentBlockers`);
    requireResponseEqual(responseStringArray(approvalGate, "opensWhen", `${field}.approvalGate.opensWhen`).length >= 1, true, `${field}.approvalGate.opensWhen`);

    const diagnostics = responseRecordArray(record.diagnostics, `${field}.diagnostics`);
    const diagnosticCodes = responseStringArray(record, "diagnosticCodes", `${field}.diagnosticCodes`);
    const nextActions = responseStringArray(record, "nextActions", `${field}.nextActions`);
    requireResponseArrayEqual(
        diagnosticCodes,
        uniqueStrings([...responseStringArray(sourceDryRun, "diagnosticCodes", `${field}.sourceDryRun.diagnosticCodes`), ...responseStringArray(approvalGate, "currentBlockers", `${field}.approvalGate.currentBlockers`)]),
        `${field}.diagnosticCodes`
    );
    for (const [index, diagnostic] of diagnostics.entries()) {
        requireResponseEqual(typeof diagnostic.code === "string" && diagnostic.code.length > 0, true, `${field}.diagnostics.${index}.code`);
        requireResponseEqual(diagnosticCodes.includes(String(diagnostic.code)), true, `${field}.diagnostics.${index}.code`);
        requireResponseEqual(diagnostic.severity, "unsupported", `${field}.diagnostics.${index}.severity`);
        requireResponseEqual(["mode", "approvalToken", "audit"].includes(String(diagnostic.field)), true, `${field}.diagnostics.${index}.field`);
        requireResponseEqual(typeof diagnostic.env === "string" && diagnostic.env.length > 0, true, `${field}.diagnostics.${index}.env`);
        requireResponseEqual(diagnostic.valueRead, false, `${field}.diagnostics.${index}.valueRead`);
        requireResponseEqual(diagnostic.valuesIncluded, false, `${field}.diagnostics.${index}.valuesIncluded`);
        requireResponseEqual(typeof diagnostic.message === "string" && diagnostic.message.length > 0, true, `${field}.diagnostics.${index}.message`);
        requireResponseEqual(responseStringArray(diagnostic, "nextActions", `${field}.diagnostics.${index}.nextActions`).length > 0, true, `${field}.diagnostics.${index}.nextActions`);
    }
    requireResponseEqual(diagnostics.length === 0, nextActions.length === 0, `${field}.nextActions`);

    const readinessVerdict = responseRecord(record.readinessVerdict, `${field}.readinessVerdict`);
    requireResponseEqual(readinessVerdict.status, "blocked", `${field}.readinessVerdict.status`);
    requireResponseEqual(readinessVerdict.verdictVersion, "P26.29", `${field}.readinessVerdict.verdictVersion`);
    requireResponseEqual(readinessVerdict.owner, "renderer-service", `${field}.readinessVerdict.owner`);
    requireResponseEqual(readinessVerdict.mode, "metadata-only", `${field}.readinessVerdict.mode`);
    requireResponseEqual(readinessVerdict.computed, true, `${field}.readinessVerdict.computed`);
    for (const property of ["trusted", "approvalReady", "materializationReady", "approvalGranted", "writesEnabled"]) {
        requireResponseEqual(readinessVerdict[property], false, `${field}.readinessVerdict.${property}`);
    }
    const verdictInputs = responseRecord(readinessVerdict.inputs, `${field}.readinessVerdict.inputs`);
    const verdictSourceDryRun = responseRecord(verdictInputs.sourceDryRun, `${field}.readinessVerdict.inputs.sourceDryRun`);
    requireResponseEqual(verdictSourceDryRun.planVersion, sourceDryRun.planVersion, `${field}.readinessVerdict.inputs.sourceDryRun.planVersion`);
    requireResponseEqual(verdictSourceDryRun.status, sourceDryRun.status, `${field}.readinessVerdict.inputs.sourceDryRun.status`);
    requireResponseEqual(verdictSourceDryRun.readiness, sourceDryRun.readiness, `${field}.readinessVerdict.inputs.sourceDryRun.readiness`);
    requireResponseEqual(verdictSourceDryRun.ready, sourceDryRun.ready, `${field}.readinessVerdict.inputs.sourceDryRun.ready`);
    requireResponseArrayEqual(
        responseStringArray(verdictSourceDryRun, "blockerCodes", `${field}.readinessVerdict.inputs.sourceDryRun.blockerCodes`),
        responseStringArray(sourceDryRun, "diagnosticCodes", `${field}.sourceDryRun.diagnosticCodes`),
        `${field}.readinessVerdict.inputs.sourceDryRun.blockerCodes`
    );
    const verdictApprovalConfiguration = responseRecord(
        verdictInputs.approvalConfiguration,
        `${field}.readinessVerdict.inputs.approvalConfiguration`
    );
    requireResponseEqual(verdictApprovalConfiguration.configured, configurationConfigured, `${field}.readinessVerdict.inputs.approvalConfiguration.configured`);
    requireResponseEqual(verdictApprovalConfiguration.valuesIncluded, false, `${field}.readinessVerdict.inputs.approvalConfiguration.valuesIncluded`);
    requireResponseArrayEqual(
        responseStringArray(
            verdictApprovalConfiguration,
            "unsupportedDiagnosticCodes",
            `${field}.readinessVerdict.inputs.approvalConfiguration.unsupportedDiagnosticCodes`
        ),
        diagnostics.map((diagnostic) => String(diagnostic.code)),
        `${field}.readinessVerdict.inputs.approvalConfiguration.unsupportedDiagnosticCodes`
    );
    requireResponseEqual(
        verdictApprovalConfiguration.unsupportedConfiguration,
        diagnostics.length > 0,
        `${field}.readinessVerdict.inputs.approvalConfiguration.unsupportedConfiguration`
    );
    const verdictApprovalGate = responseRecord(verdictInputs.approvalGate, `${field}.readinessVerdict.inputs.approvalGate`);
    requireResponseEqual(verdictApprovalGate.status, "closed", `${field}.readinessVerdict.inputs.approvalGate.status`);
    requireResponseEqual(verdictApprovalGate.approvalRequired, true, `${field}.readinessVerdict.inputs.approvalGate.approvalRequired`);
    requireResponseEqual(verdictApprovalGate.approvalGranted, false, `${field}.readinessVerdict.inputs.approvalGate.approvalGranted`);
    requireResponseEqual(verdictApprovalGate.writesEnabled, false, `${field}.readinessVerdict.inputs.approvalGate.writesEnabled`);
    requireResponseArrayEqual(
        responseStringArray(verdictApprovalGate, "blockerCodes", `${field}.readinessVerdict.inputs.approvalGate.blockerCodes`),
        diagnosticCodes,
        `${field}.readinessVerdict.inputs.approvalGate.blockerCodes`
    );
    const verdictChecks = responseRecordArray(readinessVerdict.checks, `${field}.readinessVerdict.checks`);
    requireResponseEqual(verdictChecks.length, 5, `${field}.readinessVerdict.checks.length`);
    const verdictBlockerCodes = responseStringArray(readinessVerdict, "blockerCodes", `${field}.readinessVerdict.blockerCodes`);
    requireResponseArrayEqual(
        verdictBlockerCodes,
        uniqueStrings(verdictChecks.flatMap((check) => (check.status === "blocked" ? responseStringArray(check, "diagnosticCodes", `${field}.readinessVerdict.checks.diagnosticCodes`) : []))),
        `${field}.readinessVerdict.blockerCodes`
    );
    for (const [index, check] of verdictChecks.entries()) {
        requireResponseEqual(check.required, true, `${field}.readinessVerdict.checks.${index}.required`);
        requireResponseEqual(["passed", "blocked"].includes(String(check.status)), true, `${field}.readinessVerdict.checks.${index}.status`);
        responseStringArray(check, "diagnosticCodes", `${field}.readinessVerdict.checks.${index}.diagnosticCodes`);
    }
    requireResponseEqual(responseStringArray(readinessVerdict, "nextActions", `${field}.readinessVerdict.nextActions`).length > 0, true, `${field}.readinessVerdict.nextActions`);
    const verdictSideEffects = responseRecord(readinessVerdict.sideEffects, `${field}.readinessVerdict.sideEffects`);
    for (const property of [
        "approvalTokenRead",
        "approvalTokenAccepted",
        "approvalTokenConsumed",
        "auditRecordWritten",
        "localFileWrites",
        "networkDispatch",
        "dispatch",
        "runtimeExecutionRegistered",
    ]) {
        requireResponseEqual(verdictSideEffects[property], false, `${field}.readinessVerdict.sideEffects.${property}`);
    }
    const verdictOmitted = responseRecord(readinessVerdict.omitted, `${field}.readinessVerdict.omitted`);
    for (const property of ["approvalTokenValues", "approvalAuditPaths", "approvalScopeHashes", "workspaceRoot", "cacheRoot", "sha256"]) {
        requireResponseEqual(verdictOmitted[property], true, `${field}.readinessVerdict.omitted.${property}`);
    }

    const audit = responseRecord(record.audit, `${field}.audit`);
    requireResponseEqual(audit.status, "planned-disabled", `${field}.audit.status`);
    for (const property of [
        "auditTrailEnabled",
        "auditRecordPrepared",
        "auditRecordWritten",
        "auditStorageConfigured",
        "auditIntegrityChecked",
        "auditValuesIncluded",
    ]) {
        requireResponseEqual(audit[property], false, `${field}.audit.${property}`);
    }

    const sideEffects = responseRecord(record.sideEffects, `${field}.sideEffects`);
    for (const property of [
        "browserProcessStarted",
        "runtimeExecutionRegistered",
        "runtimeAdapterImported",
        "runtimeAssetsLoaded",
        "assetManifestMaterialized",
        "fileRead",
        "hashComputed",
        "networkDispatch",
        "dispatch",
        "localFileWrites",
        "approvalTokenRead",
        "approvalTokenAccepted",
        "approvalTokenConsumed",
        "auditRecordWritten",
    ]) {
        requireResponseEqual(sideEffects[property], false, `${field}.sideEffects.${property}`);
    }

    const redaction = responseRecord(record.redaction, `${field}.redaction`);
    for (const property of [
        "sourceDataValuesIncluded",
        "pageValuesIncluded",
        "artifactValuesIncluded",
        "mediaValuesIncluded",
        "tokenValuesIncluded",
        "approvalTokenValuesIncluded",
        "approvalAuditValuesIncluded",
    ]) {
        requireResponseEqual(redaction[property], false, `${field}.redaction.${property}`);
    }

    const omitted = responseRecord(record.omitted, `${field}.omitted`);
    for (const property of [
        "workspaceRoot",
        "cacheRoot",
        "publicPaths",
        "cachePaths",
        "sha256",
        "tokenValues",
        "approvalTokenValues",
        "approvalAuditPaths",
        "approvalScopeHashes",
        "sourceDataValues",
        "pageValues",
        "artifactValues",
        "mediaValues",
    ]) {
        requireResponseEqual(omitted[property], true, `${field}.omitted.${property}`);
    }
    requireResponseEqual(record.execution, null, `${field}.execution`);
}

function validateRuntimeAssetMaterializationPreflightResponse(actual: unknown, field: string): void {
    const record = responseRecord(actual, field);
    requireResponseEqual(record.status, bundledRuntimeAssetMaterializationPreflight.status, `${field}.status`);
    requireResponseEqual(record.preflightVersion, bundledRuntimeAssetMaterializationPreflight.preflightVersion, `${field}.preflightVersion`);
    requireResponseEqual(record.owner, bundledRuntimeAssetMaterializationPreflight.owner, `${field}.owner`);
    requireResponseEqual(record.mode, bundledRuntimeAssetMaterializationPreflight.mode, `${field}.mode`);
    requireResponseEqual(record.readiness, bundledRuntimeAssetMaterializationPreflight.readiness, `${field}.readiness`);

    const sourceManifest = responseRecord(record.sourceManifest, `${field}.sourceManifest`);
    requireResponseEqual(sourceManifest.manifestVersion, bundledRuntimeAssetMaterializationPreflight.sourceManifest.manifestVersion, `${field}.sourceManifest.manifestVersion`);
    requireResponseEqual(sourceManifest.status, bundledRuntimeAssetMaterializationPreflight.sourceManifest.status, `${field}.sourceManifest.status`);
    requireResponseArrayEqual(
        responseStringArray(sourceManifest, "assetIds", `${field}.sourceManifest.assetIds`),
        [...bundledRuntimeAssetMaterializationPreflight.sourceManifest.assetIds],
        `${field}.sourceManifest.assetIds`
    );
    requireResponseArrayEqual(
        responseStringArray(sourceManifest, "cacheOutputIds", `${field}.sourceManifest.cacheOutputIds`),
        [...bundledRuntimeAssetMaterializationPreflight.sourceManifest.cacheOutputIds],
        `${field}.sourceManifest.cacheOutputIds`
    );

    const checks = responseRecordArray(record.checks, `${field}.checks`);
    requireResponseEqual(checks.length, bundledRuntimeAssetMaterializationPreflight.checks.length, `${field}.checks.length`);
    for (let index = 0; index < bundledRuntimeAssetMaterializationPreflight.checks.length; index += 1) {
        validateRuntimeAssetMaterializationPreflightCheckResponse(
            checks[index],
            bundledRuntimeAssetMaterializationPreflight.checks[index],
            `${field}.checks.${index}`
        );
    }

    const cacheOutputChecks = responseRecordArray(record.cacheOutputChecks, `${field}.cacheOutputChecks`);
    requireResponseEqual(cacheOutputChecks.length, bundledRuntimeAssetMaterializationPreflight.cacheOutputChecks.length, `${field}.cacheOutputChecks.length`);
    for (let index = 0; index < bundledRuntimeAssetMaterializationPreflight.cacheOutputChecks.length; index += 1) {
        validateRuntimeAssetMaterializationPreflightCacheOutputResponse(
            cacheOutputChecks[index],
            bundledRuntimeAssetMaterializationPreflight.cacheOutputChecks[index],
            `${field}.cacheOutputChecks.${index}`
        );
    }

    const failureTaxonomy = responseRecordArray(record.failureTaxonomy, `${field}.failureTaxonomy`);
    requireResponseEqual(failureTaxonomy.length, bundledRuntimeAssetMaterializationPreflight.failureTaxonomy.length, `${field}.failureTaxonomy.length`);
    for (let index = 0; index < bundledRuntimeAssetMaterializationPreflight.failureTaxonomy.length; index += 1) {
        const expected = bundledRuntimeAssetMaterializationPreflight.failureTaxonomy[index];
        const failure = responseRecord(failureTaxonomy[index], `${field}.failureTaxonomy.${index}`);
        requireResponseEqual(failure.code, expected.code, `${field}.failureTaxonomy.${index}.code`);
        requireResponseEqual(failure.stage, expected.stage, `${field}.failureTaxonomy.${index}.stage`);
        requireResponseEqual(failure.retryable, expected.retryable, `${field}.failureTaxonomy.${index}.retryable`);
        requireResponseEqual(failure.dispatch, expected.dispatch, `${field}.failureTaxonomy.${index}.dispatch`);
    }

    const gates = responseRecord(record.gates, `${field}.gates`);
    for (const property of [
        "assetExistenceChecked",
        "assetHashesComputed",
        "cacheOutputsChecked",
        "materializationApproved",
        "browserLifecycleValidated",
        "runtimeRegistration",
    ]) {
        requireResponseEqual(gates[property], false, `${field}.gates.${property}`);
    }

    const sideEffects = responseRecord(record.sideEffects, `${field}.sideEffects`);
    for (const property of [
        "browserProcessStarted",
        "runtimeExecutionRegistered",
        "runtimeAdapterImported",
        "runtimeAssetsLoaded",
        "assetManifestMaterialized",
        "fileRead",
        "hashComputed",
        "networkDispatch",
        "dispatch",
        "localFileWrites",
    ]) {
        requireResponseEqual(sideEffects[property], false, `${field}.sideEffects.${property}`);
    }

    const redaction = responseRecord(record.redaction, `${field}.redaction`);
    for (const property of [
        "sourceDataValuesIncluded",
        "pageValuesIncluded",
        "artifactValuesIncluded",
        "mediaValuesIncluded",
        "tokenValuesIncluded",
    ]) {
        requireResponseEqual(redaction[property], false, `${field}.redaction.${property}`);
    }

    if (record.execution === null) {
        return;
    }

    validateRuntimeAssetMaterializationPreflightExecutionResponse(record.execution, `${field}.execution`);
}

function validateBackendRpcRequestEnvelopeResponse(actual: unknown, expected: BackendRpcRequestEnvelopeSummary, field: string): void {
    const record = responseRecord(actual, field);
    rejectResponseValueFields(record, field);
    requireResponseEqual(record.status, expected.status, `${field}.status`);
    requireResponseEqual(record.transport, expected.transport, `${field}.transport`);
    requireResponseEqual(record.method ?? null, expected.method, `${field}.method`);
    requireResponseArrayEqual(responseStringArray(record, "requestKeys", `${field}.requestKeys`), expected.requestKeys, `${field}.requestKeys`);
    requireResponseArrayEqual(responseStringArray(record, "queryKeys", `${field}.queryKeys`), expected.queryKeys, `${field}.queryKeys`);
    requireResponseArrayEqual(responseStringArray(record, "bodyKeys", `${field}.bodyKeys`), expected.bodyKeys, `${field}.bodyKeys`);
    requireResponseEqual(record.requestValuesIncluded, false, `${field}.requestValuesIncluded`);
    requireResponseEqual(record.mediaValuesIncluded, false, `${field}.mediaValuesIncluded`);
    requireResponseEqual(record.tokenValuesIncluded, false, `${field}.tokenValuesIncluded`);
    requireResponseEqual(record.dispatch, false, `${field}.dispatch`);
}

function validateBackendRpcPipelineStageResponse(actual: unknown, expected: BackendRpcPipelineStageSummary, field: string): void {
    const record = responseRecord(actual, field);
    rejectResponseValueFields(record, field);
    requireResponseEqual(record.name, expected.name, `${field}.name`);
    requireResponseEqual(record.status, expected.status, `${field}.status`);
    requireResponseEqual(record.condition, expected.condition, `${field}.condition`);
    requireResponseEqual(record.entry ?? null, expected.entry, `${field}.entry`);
    requireResponseEqual(record.command ?? null, expected.command, `${field}.command`);
    requireResponseEqual(record.cacheProbe ?? null, expected.cacheProbe, `${field}.cacheProbe`);
    requireResponseEqual(record.runtime ?? null, expected.runtime, `${field}.runtime`);
    requireResponseEqual(record.dispatch, expected.dispatch, `${field}.dispatch`);
}

function validateBackendRpcPipelineResponse(actual: unknown, expected: BackendRpcPipelineSummary): void {
    const record = responseRecord(actual, "backendRpcClient.pipeline");
    rejectResponseValueFields(record, "backendRpcClient.pipeline");
    requireResponseEqual(record.status, expected.status, "backendRpcClient.pipeline.status");
    requireResponseEqual(record.cachePolicy, expected.cachePolicy, "backendRpcClient.pipeline.cachePolicy");
    requireResponseEqual(responseBoolean(record, "cacheHitShortCircuit", "backendRpcClient.pipeline.cacheHitShortCircuit"), expected.cacheHitShortCircuit, "backendRpcClient.pipeline.cacheHitShortCircuit");
    requireResponseEqual(record.networkDispatch, expected.networkDispatch, "backendRpcClient.pipeline.networkDispatch");
    requireResponseEqual(record.cacheRead, expected.cacheRead, "backendRpcClient.pipeline.cacheRead");
    requireResponseEqual(record.dataRead, expected.dataRead, "backendRpcClient.pipeline.dataRead");
    requireResponseEqual(record.renderDispatch, expected.renderDispatch, "backendRpcClient.pipeline.renderDispatch");
    requireResponseEqual(record.persistWrite, expected.persistWrite, "backendRpcClient.pipeline.persistWrite");
    requireResponseEqual(record.sourceDataValuesIncluded, false, "backendRpcClient.pipeline.sourceDataValuesIncluded");
    requireResponseEqual(record.artifactValuesIncluded, false, "backendRpcClient.pipeline.artifactValuesIncluded");
    requireResponseEqual(record.tokenValuesIncluded, false, "backendRpcClient.pipeline.tokenValuesIncluded");

    const stages = responseRecordArray(record.orderedStages, "backendRpcClient.pipeline.orderedStages");
    requireResponseEqual(stages.length, expected.orderedStages.length, "backendRpcClient.pipeline.orderedStages.length");
    for (let index = 0; index < expected.orderedStages.length; index += 1) {
        validateBackendRpcPipelineStageResponse(stages[index], expected.orderedStages[index], `backendRpcClient.pipeline.orderedStages.${index}`);
    }
}

function validateBackendRpcRenderInputResponse(actual: unknown, expected: BackendRpcRenderInputSummary | null): void {
    if (expected === null) {
        requireResponseEqual(actual ?? null, null, "backendRpcClient.renderInput");
        return;
    }

    const record = responseRecord(actual, "backendRpcClient.renderInput");
    rejectResponseValueFields(record, "backendRpcClient.renderInput");
    requireResponseEqual(record.status, expected.status, "backendRpcClient.renderInput.status");
    requireResponseEqual(record.condition, expected.condition, "backendRpcClient.renderInput.condition");
    requireResponseEqual(responseBoolean(record, "sourceDataRead", "backendRpcClient.renderInput.sourceDataRead"), true, "backendRpcClient.renderInput.sourceDataRead");
    requireResponseEqual(record.sourceDataEndpoint, expected.sourceDataEndpoint, "backendRpcClient.renderInput.sourceDataEndpoint");
    requireResponseEqual(record.targetKind, expected.targetKind, "backendRpcClient.renderInput.targetKind");
    requireResponseArrayEqual(responseStringArray(record, "identityKeys", "backendRpcClient.renderInput.identityKeys"), expected.identityKeys, "backendRpcClient.renderInput.identityKeys");
    requireResponseEqual(record.revisionSource, expected.revisionSource, "backendRpcClient.renderInput.revisionSource");
    requireResponseEqual(record.requestRevision, expected.requestRevision, "backendRpcClient.renderInput.requestRevision");
    requireResponseEqual(record.revisionValueIncluded, false, "backendRpcClient.renderInput.revisionValueIncluded");
    requireResponseEqual(record.cachePolicy, expected.cachePolicy, "backendRpcClient.renderInput.cachePolicy");
    requireResponseEqual(record.cacheScope, expected.cacheScope, "backendRpcClient.renderInput.cacheScope");
    requireResponseEqual(record.cacheKey, expected.cacheKey, "backendRpcClient.renderInput.cacheKey");
    requireResponseEqual(record.artifactFormat, expected.artifactFormat, "backendRpcClient.renderInput.artifactFormat");
    requireResponseEqual(record.artifactMimeType, expected.artifactMimeType, "backendRpcClient.renderInput.artifactMimeType");
    requireResponseEqual(record.artifactWidth, expected.artifactWidth, "backendRpcClient.renderInput.artifactWidth");
    requireResponseEqual(record.artifactHeight, expected.artifactHeight, "backendRpcClient.renderInput.artifactHeight");
    requireResponseEqual(record.renderRuntime, expected.renderRuntime, "backendRpcClient.renderInput.renderRuntime");
    requireResponseEqual(record.renderFallback, expected.renderFallback, "backendRpcClient.renderInput.renderFallback");
    requireResponseEqual(record.renderDispatch, expected.renderDispatch, "backendRpcClient.renderInput.renderDispatch");
    requireResponseEqual(record.sourceDataValuesIncluded, false, "backendRpcClient.renderInput.sourceDataValuesIncluded");
    requireResponseEqual(record.pageValuesIncluded, false, "backendRpcClient.renderInput.pageValuesIncluded");
    requireResponseEqual(record.artifactValuesIncluded, false, "backendRpcClient.renderInput.artifactValuesIncluded");
    requireResponseEqual(record.mediaValuesIncluded, false, "backendRpcClient.renderInput.mediaValuesIncluded");
    requireResponseEqual(record.tokenValuesIncluded, false, "backendRpcClient.renderInput.tokenValuesIncluded");
}

function validateBackendRpcRenderOutputResponse(actual: unknown, expected: BackendRpcRenderOutputSummary | null): void {
    if (expected === null) {
        requireResponseEqual(actual ?? null, null, "backendRpcClient.renderOutput");
        return;
    }

    const record = responseRecord(actual, "backendRpcClient.renderOutput");
    rejectResponseValueFields(record, "backendRpcClient.renderOutput");
    requireResponseEqual(record.status, expected.status, "backendRpcClient.renderOutput.status");
    requireResponseEqual(record.condition, expected.condition, "backendRpcClient.renderOutput.condition");
    requireResponseEqual(record.runtime, expected.runtime, "backendRpcClient.renderOutput.runtime");
    requireResponseEqual(responseBoolean(record, "fallbackUsed", "backendRpcClient.renderOutput.fallbackUsed"), expected.fallbackUsed, "backendRpcClient.renderOutput.fallbackUsed");
    requireResponseEqual(record.artifactFormat, expected.artifactFormat, "backendRpcClient.renderOutput.artifactFormat");
    requireResponseEqual(record.artifactMimeType, expected.artifactMimeType, "backendRpcClient.renderOutput.artifactMimeType");
    requireResponseEqual(record.artifactByteLength, expected.artifactByteLength, "backendRpcClient.renderOutput.artifactByteLength");
    requireResponseEqual(record.renderDispatch, true, "backendRpcClient.renderOutput.renderDispatch");
    requireResponseEqual(record.localFileWrites, false, "backendRpcClient.renderOutput.localFileWrites");
    requireResponseEqual(record.sourceDataValuesIncluded, false, "backendRpcClient.renderOutput.sourceDataValuesIncluded");
    requireResponseEqual(record.pageValuesIncluded, false, "backendRpcClient.renderOutput.pageValuesIncluded");
    requireResponseEqual(record.artifactValuesIncluded, false, "backendRpcClient.renderOutput.artifactValuesIncluded");
    requireResponseEqual(record.mediaValuesIncluded, false, "backendRpcClient.renderOutput.mediaValuesIncluded");
    requireResponseEqual(record.tokenValuesIncluded, false, "backendRpcClient.renderOutput.tokenValuesIncluded");
}

function validateBackendRpcPersistOutputResponse(actual: unknown, expected: BackendRpcPersistOutputSummary | null): void {
    if (expected === null) {
        requireResponseEqual(actual ?? null, null, "backendRpcClient.persistOutput");
        return;
    }

    const record = responseRecord(actual, "backendRpcClient.persistOutput");
    rejectResponseValueFields(record, "backendRpcClient.persistOutput");
    requireResponseEqual(record.status, expected.status, "backendRpcClient.persistOutput.status");
    requireResponseEqual(record.condition, expected.condition, "backendRpcClient.persistOutput.condition");
    requireResponseEqual(record.entry, expected.entry, "backendRpcClient.persistOutput.entry");
    requireResponseEqual(record.command, expected.command, "backendRpcClient.persistOutput.command");
    requireResponseEqual(record.endpoint, expected.endpoint, "backendRpcClient.persistOutput.endpoint");
    requireResponseEqual(record.targetKind, expected.targetKind, "backendRpcClient.persistOutput.targetKind");
    requireResponseArrayEqual(responseStringArray(record, "identityKeys", "backendRpcClient.persistOutput.identityKeys"), expected.identityKeys, "backendRpcClient.persistOutput.identityKeys");
    requireResponseEqual(record.revisionSource, expected.revisionSource, "backendRpcClient.persistOutput.revisionSource");
    requireResponseEqual(record.requestRevision, expected.requestRevision, "backendRpcClient.persistOutput.requestRevision");
    requireResponseEqual(record.artifactFormat, expected.artifactFormat, "backendRpcClient.persistOutput.artifactFormat");
    requireResponseEqual(record.artifactMimeType, expected.artifactMimeType, "backendRpcClient.persistOutput.artifactMimeType");
    requireResponseEqual(record.artifactByteLength, expected.artifactByteLength, "backendRpcClient.persistOutput.artifactByteLength");
    requireResponseEqual(record.resourceFrom, expected.resourceFrom, "backendRpcClient.persistOutput.resourceFrom");
    requireResponseEqual(record.persistWrite, true, "backendRpcClient.persistOutput.persistWrite");
    requireResponseEqual(record.localFileWrites, false, "backendRpcClient.persistOutput.localFileWrites");
    requireResponseEqual(record.requestValuesIncluded, false, "backendRpcClient.persistOutput.requestValuesIncluded");
    requireResponseEqual(record.resourceValuesIncluded, false, "backendRpcClient.persistOutput.resourceValuesIncluded");
    requireResponseEqual(record.mediaValuesIncluded, false, "backendRpcClient.persistOutput.mediaValuesIncluded");
    requireResponseEqual(record.artifactValuesIncluded, false, "backendRpcClient.persistOutput.artifactValuesIncluded");
    requireResponseEqual(record.tokenValuesIncluded, false, "backendRpcClient.persistOutput.tokenValuesIncluded");
}

function validateBackendRpcCacheProbeResponse(actual: unknown, expected: BackendRpcCacheProbeSummary | null): void {
    if (expected === null) {
        requireResponseEqual(actual ?? null, null, "backendRpcClient.cacheProbe");
        return;
    }

    const record = responseRecord(actual, "backendRpcClient.cacheProbe");
    rejectResponseValueFields(record, "backendRpcClient.cacheProbe");
    requireResponseEqual(record.status, expected.status, "backendRpcClient.cacheProbe.status");
    requireResponseEqual(record.strategy, expected.strategy, "backendRpcClient.cacheProbe.strategy");
    requireResponseEqual(record.condition, expected.condition, "backendRpcClient.cacheProbe.condition");
    requireResponseEqual(record.scope, expected.scope, "backendRpcClient.cacheProbe.scope");
    requireResponseEqual(record.key, expected.key, "backendRpcClient.cacheProbe.key");
    requireResponseArrayEqual(responseStringArray(record, "requestKeys", "backendRpcClient.cacheProbe.requestKeys"), expected.requestKeys, "backendRpcClient.cacheProbe.requestKeys");
    requireResponseEqual(record.command ?? null, expected.command, "backendRpcClient.cacheProbe.command");
    requireResponseEqual(record.endpoint ?? null, expected.endpoint, "backendRpcClient.cacheProbe.endpoint");
    requireResponseEqual(record.hitResult, expected.hitResult, "backendRpcClient.cacheProbe.hitResult");
    requireResponseEqual(record.missResult, expected.missResult, "backendRpcClient.cacheProbe.missResult");
    requireResponseEqual(record.result ?? null, expected.result, "backendRpcClient.cacheProbe.result");
    requireResponseEqual(record.cacheRead, expected.cacheRead, "backendRpcClient.cacheProbe.cacheRead");
    requireResponseEqual(record.networkDispatch, expected.networkDispatch, "backendRpcClient.cacheProbe.networkDispatch");
    requireResponseEqual(record.dispatch, expected.dispatch, "backendRpcClient.cacheProbe.dispatch");
    requireResponseEqual(record.cacheHitValuesIncluded, false, "backendRpcClient.cacheProbe.cacheHitValuesIncluded");
    requireResponseEqual(record.resourceValuesIncluded, false, "backendRpcClient.cacheProbe.resourceValuesIncluded");
    requireResponseEqual(record.mediaValuesIncluded, false, "backendRpcClient.cacheProbe.mediaValuesIncluded");
    requireResponseEqual(record.tokenValuesIncluded, false, "backendRpcClient.cacheProbe.tokenValuesIncluded");
}

function validateBackendRpcClientEntryResponse(actual: unknown, expected: BackendRpcClientEntrySummary | null, field: string): void {
    if (expected === null) {
        requireResponseEqual(actual ?? null, null, field);
        return;
    }

    const record = responseRecord(actual, field);
    requireResponseEqual(record.command, expected.command, `${field}.command`);
    requireResponseEqual(record.method ?? null, expected.method, `${field}.method`);
    requireResponseEqual(responseBoolean(record, "requestPresent", `${field}.requestPresent`), expected.requestPresent, `${field}.requestPresent`);
    requireResponseEqual(record.endpoint ?? null, expected.endpoint, `${field}.endpoint`);
    requireResponseEqual(record.dispatch, false, `${field}.dispatch`);
    validateBackendRpcRequestEnvelopeResponse(record.requestEnvelope, expected.requestEnvelope, `${field}.requestEnvelope`);
}

function validateThumbnailBackendRpcClientResponse(client: Record<string, unknown>, expected: BackendRpcClientSummary): void {
    requireResponseEqual(client.status, expected.status, "backendRpcClient.status");
    requireResponseEqual(responseBoolean(client, "baseUriConfigured", "backendRpcClient.baseUriConfigured"), expected.baseUriConfigured, "backendRpcClient.baseUriConfigured");
    requireResponseEqual(client.baseUri ?? null, expected.baseUri, "backendRpcClient.baseUri");
    requireResponseEqual(client.networkDispatch, expected.networkDispatch, "backendRpcClient.networkDispatch");
    requireResponseEqual(client.cacheRead, expected.cacheRead, "backendRpcClient.cacheRead");
    requireResponseEqual(client.dataRead, expected.dataRead, "backendRpcClient.dataRead");
    requireResponseEqual(client.persistWrite, expected.persistWrite, "backendRpcClient.persistWrite");
    validateTokenSafeAuthResponse(responseRecord(client.authForwarding, "backendRpcClient.authForwarding"), expected.authForwarding, "backendRpcClient.authForwarding");

    const entries = responseRecord(client.entries, "backendRpcClient.entries");
    validateBackendRpcClientEntryResponse(entries.data, expected.entries.data, "backendRpcClient.entries.data");
    validateBackendRpcClientEntryResponse(entries.persist, expected.entries.persist, "backendRpcClient.entries.persist");
    validateBackendRpcClientEntryResponse(entries.cacheMissPersist, expected.entries.cacheMissPersist, "backendRpcClient.entries.cacheMissPersist");
    validateBackendRpcCacheProbeResponse(client.cacheProbe, expected.cacheProbe);
    validateBackendRpcPipelineResponse(client.pipeline, expected.pipeline);
    validateBackendRpcRenderInputResponse(client.renderInput, expected.renderInput);
    validateBackendRpcRenderOutputResponse(client.renderOutput, expected.renderOutput);
    validateBackendRpcPersistOutputResponse(client.persistOutput, expected.persistOutput);
}

function validateThumbnailResponseContract(
    response: unknown,
    summary: ThumbnailRequestSummary,
    expectedAuth: AuthSummary,
    options: Pick<RendererServiceOptions, "backendRpc">,
    cacheProbeExecution: BackendRpcCacheProbeExecution,
    sourceDataReadExecution: BackendRpcSourceDataReadExecution,
    renderExecution: ThumbnailRenderExecution,
    persistExecution: BackendRpcThumbnailPersistExecution
): Record<string, unknown> {
    const record = responseRecord(response, "response");
    requireResponseEqual(record.status, "ok", "status");
    requireResponseEqual(record.runtimeRegistration, false, "runtimeRegistration");
    requireResponseEqual(record.dispatch, true, "dispatch");
    requireResponseEqual(record.localFileWrites, false, "localFileWrites");
    validateRuntimeAssetManifestResponse(record.runtimeAssetManifest, "runtimeAssetManifest");
    validateRuntimeAssetMaterializationPreflightResponse(
        record.runtimeAssetMaterializationPreflight,
        "runtimeAssetMaterializationPreflight"
    );
    validateRuntimeAssetMaterializationDryRunResponse(
        record.runtimeAssetMaterializationDryRun,
        "runtimeAssetMaterializationDryRun"
    );
    validateRuntimeAssetMaterializationApprovalResponse(
        record.runtimeAssetMaterializationApproval,
        "runtimeAssetMaterializationApproval"
    );

    validateRuntimeAssetMaterializationExecutionResponse(
        record.runtimeAssetMaterializationExecution,
        "runtimeAssetMaterializationExecution"
    );

    validateBundledSceneBridgeRealScenePngResponse(
        record.bundledSceneBridgeRealScenePng,
        "bundledSceneBridgeRealScenePng"
    );
    validateBundledSceneBridgeContractResponse(record.bundledSceneBridgeContract, "bundledSceneBridgeContract");
    validateBundledSceneBridgeAdapterModuleResponse(record.bundledSceneBridgeAdapterModule, "bundledSceneBridgeAdapterModule");
    validateBundledSceneBridgeImportGateResponse(record.bundledSceneBridgeImportGate, "bundledSceneBridgeImportGate");
    validateBundledSceneBridgeFactoryShapePreflightResponse(
        record.bundledSceneBridgeFactoryShapePreflight,
        "bundledSceneBridgeFactoryShapePreflight"
    );
    validateBundledSceneBridgeModuleNamespaceImportPreflightResponse(
        record.bundledSceneBridgeModuleNamespaceImportPreflight,
        "bundledSceneBridgeModuleNamespaceImportPreflight"
    );
    validateBundledSceneBridgeFactoryInvocationPreflightResponse(
        record.bundledSceneBridgeFactoryInvocationPreflight,
        "bundledSceneBridgeFactoryInvocationPreflight"
    );
    validateBundledSceneBridgeRuntimeRegistrationPreflightResponse(
        record.bundledSceneBridgeRuntimeRegistrationPreflight,
        "bundledSceneBridgeRuntimeRegistrationPreflight"
    );
    validateBundledSceneBridgeRuntimeRegistryRegistrationBoundaryResponse(
        record.bundledSceneBridgeRuntimeRegistryRegistrationBoundary,
        "bundledSceneBridgeRuntimeRegistryRegistrationBoundary"
    );
    validateBundledSceneBridgeRuntimeRegistryInstallationContractResponse(
        record.bundledSceneBridgeRuntimeRegistryInstallationContract,
        "bundledSceneBridgeRuntimeRegistryInstallationContract"
    );
    validateBundledSceneBridgeRuntimeRegistryInstallationGateResponse(
        record.bundledSceneBridgeRuntimeRegistryInstallationGate,
        "bundledSceneBridgeRuntimeRegistryInstallationGate"
    );
    validateBundledSceneBridgeRuntimeRegistryInstallationPreflightResponse(
        record.bundledSceneBridgeRuntimeRegistryInstallationPreflight,
        "bundledSceneBridgeRuntimeRegistryInstallationPreflight"
    );
    validateBundledSceneBridgeRuntimeRegistryInstallationExecutionBoundaryResponse(
        record.bundledSceneBridgeRuntimeRegistryInstallationExecutionBoundary,
        "bundledSceneBridgeRuntimeRegistryInstallationExecutionBoundary"
    );
    validateBundledSceneBridgeRuntimeRegistryInstallationResponse(
        record.bundledSceneBridgeRuntimeRegistryInstallation,
        "bundledSceneBridgeRuntimeRegistryInstallation"
    );
    validateBundledSceneBridgeInstalledRuntimeLifecycleResponse(
        record.bundledSceneBridgeInstalledRuntimeLifecycle,
        "bundledSceneBridgeInstalledRuntimeLifecycle"
    );
    validateBundledSceneBridgeRealRuntimeValueContractResponse(
        record.bundledSceneBridgeRealRuntimeValueContract,
        "bundledSceneBridgeRealRuntimeValueContract"
    );
    validateBundledSceneBridgeRealRuntimeModuleScaffoldResponse(
        record.bundledSceneBridgeRealRuntimeModuleScaffold,
        "bundledSceneBridgeRealRuntimeModuleScaffold"
    );
    validateBundledSceneBridgeInstalledRuntimeRenderDispatchResponse(
        record.bundledSceneBridgeInstalledRuntimeRenderDispatch,
        "bundledSceneBridgeInstalledRuntimeRenderDispatch"
    );
    validateBrowserFixtureRuntimeLifecycleResponse(record.browserFixtureRuntime, "browserFixtureRuntime");

    validateThumbnailResourceResponse(responseRecord(record.resource, "resource"));
    validateThumbnailCacheResponse(responseRecord(record.cache, "cache"), summary, cacheProbeExecution);
    validateThumbnailRendererResponse(responseRecord(record.renderer, "renderer"), cacheProbeExecution, renderExecution);
    validateThumbnailAuthResponse(responseRecord(record.auth, "auth"), expectedAuth);
    validateThumbnailBackendRpcClientResponse(
        responseRecord(record.backendRpcClient, "backendRpcClient"),
        summarizeBackendRpcClient(
            summary,
            expectedAuth,
            options.backendRpc,
            cacheProbeExecution,
            sourceDataReadExecution,
            renderExecution,
            persistExecution
        )
    );
    requireResponseJsonEqual(record.request, summary, "request");

    return record;
}

function rendererErrorBody(error: unknown): { status: "error"; code: string; message: string; retryable: boolean; field?: string } {
    const record = isRecord(error) ? error : {};
    const code = typeof record.code === "string" ? record.code : "renderer_service_request_invalid";
    const message = error instanceof Error ? error.message : "Renderer-service thumbnail request is invalid.";
    const field = typeof record.field === "string" ? record.field : undefined;
    const retryable = typeof record.retryable === "boolean" ? record.retryable : false;
    return {
        status: "error",
        code,
        message,
        retryable,
        ...(field ? { field } : {}),
    };
}

function sendJson(response: ServerResponse, statusCode: number, body: unknown): void {
    const payload = JSON.stringify(body);
    response.writeHead(statusCode, {
        "content-type": "application/json; charset=utf-8",
        "content-length": Buffer.byteLength(payload),
    });
    response.end(payload);
}

async function handleRequest(request: IncomingMessage, response: ServerResponse, options: RendererServiceRuntimeOptions): Promise<void> {
    const url = new URL(request.url ?? "/", "http://renderer-service.local");

    if (request.method === "GET" && url.pathname === "/health") {
        const runtimeAssetPreflight = await runtimeAssetMaterializationPreflightResponse(options.runtimeAssetPreflight);
        const runtimeAssetMaterializationDryRun = runtimeAssetMaterializationDryRunResponse(runtimeAssetPreflight);
        const runtimeAssetMaterializationApproval = runtimeAssetMaterializationApprovalResponse(
            runtimeAssetMaterializationDryRun,
            options.runtimeAssetMaterializationApproval
        );
        const runtimeAssetMaterializationExecutionResult = await executeRuntimeAssetMaterialization(
            runtimeAssetPreflight,
            runtimeAssetMaterializationDryRun,
            options.runtimeAssetMaterializationApproval
        );
        const browserFixtureRuntime = browserFixtureRuntimeLifecycleResponse(options);
        const importGate = bundledSceneBridgeImportGateResponse(options);
        const moduleNamespaceImportPreflight = await bundledSceneBridgeModuleNamespaceImportPreflightResponse(importGate);
        const factoryInvocationPreflight = await bundledSceneBridgeFactoryInvocationPreflightResponse(moduleNamespaceImportPreflight);
        const runtimeRegistrationPreflight = bundledSceneBridgeRuntimeRegistrationPreflightResponse(importGate, factoryInvocationPreflight);
        const runtimeRegistryRegistrationBoundary =
            bundledSceneBridgeRuntimeRegistryRegistrationBoundaryResponse(runtimeRegistrationPreflight);
        const runtimeRegistryInstallationContract =
            bundledSceneBridgeRuntimeRegistryInstallationContractResponse(runtimeRegistryRegistrationBoundary);
        const runtimeRegistryInstallationGate = bundledSceneBridgeRuntimeRegistryInstallationGateResponse(
            runtimeRegistryInstallationContract,
            options
        );
        const runtimeRegistryInstallationPreflight =
            bundledSceneBridgeRuntimeRegistryInstallationPreflightResponse(runtimeRegistryInstallationGate);
        const runtimeRegistryInstallationExecutionBoundary =
            bundledSceneBridgeRuntimeRegistryInstallationExecutionBoundaryResponse(runtimeRegistryInstallationPreflight);
        const runtimeRegistryInstallation = await bundledSceneBridgeRuntimeRegistryInstallationResponse(
            runtimeRegistryInstallationExecutionBoundary,
            options.bundledSceneBridgeThumbnailRuntimeRegistry,
            {
                preferRealRuntime:
                    bundledSceneBridgeRealRuntimeModuleScaffoldResponse(options).status === "configured-disabled" &&
                    runtimeAssetMaterializationExecutionResult.status === "executed",
                materializationExecuted: runtimeAssetMaterializationExecutionResult.status === "executed",
            }
        );
        const installedRuntimeLifecycle = bundledSceneBridgeInstalledRuntimeLifecycleResponse(
            runtimeRegistryInstallation,
            options.bundledSceneBridgeThumbnailRuntimeRegistry
        );
        sendJson(response, 200, {
            ...healthResponse,
            runtimeAssetMaterializationPreflight: runtimeAssetPreflight,
            runtimeAssetMaterializationDryRun,
            runtimeAssetMaterializationApproval,
            runtimeAssetMaterializationExecution: runtimeAssetMaterializationExecutionResult,
            bundledSceneBridgeRealScenePng: bundledSceneBridgeRealScenePngResponse({
                realRuntimeInstalled:
                    options.bundledSceneBridgeThumbnailRuntimeRegistry.get(BUNDLED_SCENE_BRIDGE_RUNTIME_ID)?.runtimeKind ===
                    "real",
                assetsMaterialized: runtimeAssetMaterializationExecutionResult.status === "executed",
                sourceDataAvailable: false,
                renderDispatched: false,
                nonEmptyPngProduced: false,
                persisted: false,
                realRuntimeSelected: false,
            }),
            bundledSceneBridgeImportGate: importGate,
            bundledSceneBridgeModuleNamespaceImportPreflight: moduleNamespaceImportPreflight,
            bundledSceneBridgeFactoryInvocationPreflight: factoryInvocationPreflight,
            bundledSceneBridgeRuntimeRegistrationPreflight: runtimeRegistrationPreflight,
            bundledSceneBridgeRuntimeRegistryRegistrationBoundary: runtimeRegistryRegistrationBoundary,
            bundledSceneBridgeRuntimeRegistryInstallationContract: runtimeRegistryInstallationContract,
            bundledSceneBridgeRuntimeRegistryInstallationGate: runtimeRegistryInstallationGate,
            bundledSceneBridgeRuntimeRegistryInstallationPreflight: runtimeRegistryInstallationPreflight,
            bundledSceneBridgeRuntimeRegistryInstallationExecutionBoundary: runtimeRegistryInstallationExecutionBoundary,
            bundledSceneBridgeRuntimeRegistryInstallation: runtimeRegistryInstallation,
            bundledSceneBridgeInstalledRuntimeLifecycle: installedRuntimeLifecycle,
            bundledSceneBridgeRealRuntimeValueContract,
            bundledSceneBridgeRealRuntimeModuleScaffold: bundledSceneBridgeRealRuntimeModuleScaffoldResponse(options),
            bundledSceneBridgeInstalledRuntimeRenderDispatch: bundledSceneBridgeInstalledRuntimeRenderDispatchResponse(
                options,
                options.bundledSceneBridgeThumbnailRuntimeRegistry
            ),
            browserFixtureRuntime,
        });
        return;
    }

    if (request.method === "POST" && url.pathname === "/thumbnail") {
        try {
            const body = await readJsonBody(request);
            const summary = validateThumbnailRequest(body);
            const auth = summarizeAuthHeaders(request);
            const cacheProbeExecution = await executeThumbnailCacheProbe(request, summary, options.backendRpc);
            const sourceDataReadExecution = await executeThumbnailSourceDataRead(request, summary, options.backendRpc, cacheProbeExecution);
            const runtimeAssetPreflight = await runtimeAssetMaterializationPreflightResponse(options.runtimeAssetPreflight);
            const runtimeAssetMaterializationDryRun = runtimeAssetMaterializationDryRunResponse(runtimeAssetPreflight);
            const runtimeAssetMaterializationApproval = runtimeAssetMaterializationApprovalResponse(
                runtimeAssetMaterializationDryRun,
                options.runtimeAssetMaterializationApproval
            );
            const runtimeAssetMaterializationExecutionResult = await executeRuntimeAssetMaterialization(
                runtimeAssetPreflight,
                runtimeAssetMaterializationDryRun,
                options.runtimeAssetMaterializationApproval
            );
            const importGate = bundledSceneBridgeImportGateResponse(options);
            const moduleNamespaceImportPreflight = await bundledSceneBridgeModuleNamespaceImportPreflightResponse(importGate);
            const factoryInvocationPreflight = await bundledSceneBridgeFactoryInvocationPreflightResponse(moduleNamespaceImportPreflight);
            const runtimeRegistrationPreflight = bundledSceneBridgeRuntimeRegistrationPreflightResponse(importGate, factoryInvocationPreflight);
            const runtimeRegistryRegistrationBoundary =
                bundledSceneBridgeRuntimeRegistryRegistrationBoundaryResponse(runtimeRegistrationPreflight);
            const runtimeRegistryInstallationContract =
                bundledSceneBridgeRuntimeRegistryInstallationContractResponse(runtimeRegistryRegistrationBoundary);
            const runtimeRegistryInstallationGate = bundledSceneBridgeRuntimeRegistryInstallationGateResponse(
                runtimeRegistryInstallationContract,
                options
            );
            const runtimeRegistryInstallationPreflight =
                bundledSceneBridgeRuntimeRegistryInstallationPreflightResponse(runtimeRegistryInstallationGate);
            const runtimeRegistryInstallationExecutionBoundary =
                bundledSceneBridgeRuntimeRegistryInstallationExecutionBoundaryResponse(runtimeRegistryInstallationPreflight);
            const runtimeRegistryInstallation = await bundledSceneBridgeRuntimeRegistryInstallationResponse(
            runtimeRegistryInstallationExecutionBoundary,
            options.bundledSceneBridgeThumbnailRuntimeRegistry,
            {
                preferRealRuntime:
                    bundledSceneBridgeRealRuntimeModuleScaffoldResponse(options).status === "configured-disabled" &&
                    runtimeAssetMaterializationExecutionResult.status === "executed",
                materializationExecuted: runtimeAssetMaterializationExecutionResult.status === "executed",
            }
        );
            const installedRuntimeLifecycle = bundledSceneBridgeInstalledRuntimeLifecycleResponse(
                runtimeRegistryInstallation,
                options.bundledSceneBridgeThumbnailRuntimeRegistry
            );
            const realRuntimeModuleScaffold = bundledSceneBridgeRealRuntimeModuleScaffoldResponse(options);
            const resolvedRenderer = resolveThumbnailRenderer(options, options.bundledSceneBridgeThumbnailRuntimeRegistry);
            const renderExecution = await executeThumbnailRender(
                summary,
                sourceDataReadExecution,
                resolvedRenderer.renderer,
                options.renderedAssets
            );
            const persistExecution = await executeThumbnailPersist(request, summary, options.backendRpc, sourceDataReadExecution, renderExecution);
            const browserFixtureRuntime = browserFixtureRuntimeLifecycleResponse(options);
            const installedRuntimeRenderDispatch = bundledSceneBridgeInstalledRuntimeRenderDispatchResponse(
                options,
                options.bundledSceneBridgeThumbnailRuntimeRegistry,
                {
                    registryRuntimeSelected: resolvedRenderer.registryRuntimeSelected,
                    renderThumbnailCalled: renderExecution.executed || resolvedRenderer.registryRuntimeSelected,
                    renderDispatch: renderExecution.executed,
                    pngMappedToResourcePipeline: renderExecution.executed && Boolean(renderExecution.mediaId),
                }
            );
            const installedEntry = options.bundledSceneBridgeThumbnailRuntimeRegistry.get(BUNDLED_SCENE_BRIDGE_RUNTIME_ID);
            const realScenePng = bundledSceneBridgeRealScenePngResponse({
                realRuntimeInstalled: installedEntry?.runtimeKind === "real",
                assetsMaterialized: runtimeAssetMaterializationExecutionResult.status === "executed",
                sourceDataAvailable: sourceDataReadExecution.executed === true && Boolean(sourceDataReadExecution.sourceData),
                renderDispatched: renderExecution.executed === true,
                nonEmptyPngProduced:
                    renderExecution.executed === true &&
                    typeof renderExecution.artifactByteLength === "number" &&
                    renderExecution.artifactByteLength > 8,
                persisted: persistExecution.executed === true,
                realRuntimeSelected: resolvedRenderer.registryRuntimeSelected && installedEntry?.runtimeKind === "real",
                targetKind: summary.targetKind,
            });
            const generatedResponse = thumbnailResponse(
                request,
                summary,
                auth,
                options,
                cacheProbeExecution,
                sourceDataReadExecution,
                renderExecution,
                persistExecution,
                runtimeAssetPreflight,
                runtimeAssetMaterializationDryRun,
                runtimeAssetMaterializationApproval,
                runtimeAssetMaterializationExecutionResult,
                realScenePng,
                importGate,
                moduleNamespaceImportPreflight,
                factoryInvocationPreflight,
                runtimeRegistrationPreflight,
                runtimeRegistryRegistrationBoundary,
                runtimeRegistryInstallationContract,
                runtimeRegistryInstallationGate,
                runtimeRegistryInstallationPreflight,
                runtimeRegistryInstallationExecutionBoundary,
                runtimeRegistryInstallation,
                installedRuntimeLifecycle,
                realRuntimeModuleScaffold,
                installedRuntimeRenderDispatch,
                browserFixtureRuntime
            );
            const responseBody = options.thumbnailResponseOverride
                ? options.thumbnailResponseOverride(generatedResponse)
                : generatedResponse;
            sendJson(
                response,
                200,
                validateThumbnailResponseContract(
                    responseBody,
                    summary,
                    auth,
                    options,
                    cacheProbeExecution,
                    sourceDataReadExecution,
                    renderExecution,
                    persistExecution
                )
            );
        } catch (error) {
            const status = isRecord(error) && typeof error.status === "number" ? error.status : 400;
            sendJson(response, status, rendererErrorBody(error));
        }
        return;
    }

    if (request.method === "GET" && url.pathname.startsWith("/assets/by-id/")) {
        const mediaId = decodeURIComponent(url.pathname.slice("/assets/by-id/".length));
        const renderedAsset = options.renderedAssets.get(mediaId);
        if (renderedAsset) {
            response.writeHead(200, {
                "content-type": renderedAsset.contentType,
                "content-length": renderedAsset.bytes.byteLength,
                "cache-control": "no-store",
            });
            response.end(renderedAsset.bytes);
            return;
        }
    }

    if (request.method === "GET" && url.pathname === "/assets/by-id/noop-thumbnail-png") {
        response.writeHead(200, {
            "content-type": "image/png",
            "content-length": noopPng.byteLength,
            "cache-control": "no-store",
        });
        response.end(noopPng);
        return;
    }

    sendJson(response, 404, {
        status: "not_found",
        code: "renderer_service_route_not_found",
    });
}

const bundledSceneBridgeThumbnailRuntimeRegistryByServer = new WeakMap<Server, BundledSceneBridgeThumbnailRuntimeRegistry>();

export function createRendererService(
    options: Pick<
        RendererServiceOptions,
        | "backendRpc"
        | "renderer"
        | "rendererRuntimeModule"
        | "browserFixtureRuntime"
        | "rendererRuntimeSource"
        | "runtimeAssetPreflight"
        | "runtimeAssetMaterializationApproval"
        | "bundledSceneBridgeImportGate"
        | "bundledSceneBridgeRuntimeRegistryInstallationGate"
        | "bundledSceneBridgeRealRuntimeModuleGate"
        | "bundledSceneBridgeRenderDispatchGate"
        | "thumbnailResponseOverride"
    > = {}
): Server {
    const renderedAssets: RenderedAssetStore = new Map();
    const bundledSceneBridgeThumbnailRuntimeRegistry: BundledSceneBridgeThumbnailRuntimeRegistry = new Map();
    const runtimeOptions: RendererServiceRuntimeOptions = {
        backendRpc: options.backendRpc,
        renderer: options.renderer,
        rendererRuntimeModule: options.rendererRuntimeModule,
        browserFixtureRuntime: options.browserFixtureRuntime,
        rendererRuntimeSource: options.rendererRuntimeSource ?? rendererRuntimeSourceForOptions(options),
        runtimeAssetPreflight: options.runtimeAssetPreflight,
        runtimeAssetMaterializationApproval: options.runtimeAssetMaterializationApproval,
        bundledSceneBridgeImportGate: options.bundledSceneBridgeImportGate,
        bundledSceneBridgeRuntimeRegistryInstallationGate: options.bundledSceneBridgeRuntimeRegistryInstallationGate,
        bundledSceneBridgeRealRuntimeModuleGate: options.bundledSceneBridgeRealRuntimeModuleGate,
        bundledSceneBridgeRenderDispatchGate: options.bundledSceneBridgeRenderDispatchGate,
        thumbnailResponseOverride: options.thumbnailResponseOverride,
        renderedAssets,
        bundledSceneBridgeThumbnailRuntimeRegistry,
    };

    const server = createServer((request, response) => {
        void handleRequest(request, response, runtimeOptions).catch((error: unknown) => {
            sendJson(response, 500, {
                status: "error",
                code: "renderer_service_internal_error",
                message: error instanceof Error ? error.message : "Renderer-service request failed.",
                retryable: true,
            });
        });
    });
    bundledSceneBridgeThumbnailRuntimeRegistryByServer.set(server, bundledSceneBridgeThumbnailRuntimeRegistry);
    return server;
}

async function resolveRendererRuntimeOptions(options: RendererServiceOptions): Promise<RendererRuntimeOptions | undefined> {
    if (options.renderer) {
        return options.renderer;
    }
    if (options.browserFixtureRuntime) {
        return createBrowserFixtureRendererRuntime();
    }
    if (options.rendererRuntimeModule) {
        return loadRendererRuntimeAdapterModule(options.rendererRuntimeModule);
    }
    return undefined;
}

function closeServer(server: Server): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
    });
}

async function closeRendererRuntime(renderer: RendererRuntimeOptions | undefined): Promise<void> {
    if (typeof renderer?.close === "function") {
        await renderer.close();
    }
}

export async function startRendererService(options: RendererServiceOptions = {}): Promise<StartedRendererService> {
    const host = options.host ?? DEFAULT_HOST;
    const port = options.port ?? DEFAULT_PORT;
    const renderer = await resolveRendererRuntimeOptions(options);
    const server = createRendererService({
        backendRpc: options.backendRpc,
        renderer,
        rendererRuntimeModule: options.rendererRuntimeModule,
        browserFixtureRuntime: options.browserFixtureRuntime,
        rendererRuntimeSource: rendererRuntimeSourceForOptions(options),
        runtimeAssetPreflight: options.runtimeAssetPreflight,
        runtimeAssetMaterializationApproval: options.runtimeAssetMaterializationApproval,
        bundledSceneBridgeImportGate: options.bundledSceneBridgeImportGate,
        bundledSceneBridgeRuntimeRegistryInstallationGate: options.bundledSceneBridgeRuntimeRegistryInstallationGate,
        bundledSceneBridgeRealRuntimeModuleGate: options.bundledSceneBridgeRealRuntimeModuleGate,
        bundledSceneBridgeRenderDispatchGate: options.bundledSceneBridgeRenderDispatchGate,
        thumbnailResponseOverride: options.thumbnailResponseOverride,
    });

    try {
        await new Promise<void>((resolve, reject) => {
            const onError = (error: Error) => {
                server.off("listening", onListening);
                reject(error);
            };
            const onListening = () => {
                server.off("error", onError);
                resolve();
            };

            server.once("error", onError);
            server.once("listening", onListening);
            server.listen(port, host);
        });
    } catch (error) {
        await closeRendererRuntime(renderer);
        throw error;
    }

    const address = server.address();
    if (!address || typeof address === "string") {
        try {
            await closeServer(server);
        } finally {
            await closeRendererRuntime(renderer);
        }
        throw new Error("Renderer service did not bind a TCP address.");
    }

    return {
        host,
        port: address.port,
        server,
        stop: async () => {
            let serverError: unknown = null;
            try {
                await closeServer(server);
            } catch (error) {
                serverError = error;
            }
            const registry = bundledSceneBridgeThumbnailRuntimeRegistryByServer.get(server);
            await closeBundledSceneBridgeThumbnailRuntimeRegistry(registry);
            bundledSceneBridgeThumbnailRuntimeRegistryByServer.delete(server);
            await closeRendererRuntime(renderer);
            if (serverError) {
                throw serverError;
            }
        },
    };
}

function readPort(value: string | undefined): number {
    if (!value) {
        return DEFAULT_PORT;
    }

    const port = Number(value);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error("PENPOT_RENDERER_SERVICE_PORT must be an integer between 1 and 65535.");
    }

    return port;
}

function readRuntimeAssetPreflightOptionsFromEnv(env: NodeJS.ProcessEnv): RendererRuntimeAssetPreflightOptions | undefined {
    const value = optionalString(env[RUNTIME_ASSET_PREFLIGHT_ENV])?.trim();
    if (!value) {
        return undefined;
    }
    if (value !== "read-only") {
        throw new Error(`${RUNTIME_ASSET_PREFLIGHT_ENV} must be set to read-only when configured.`);
    }

    const workspaceRoot = normalizeRuntimeAssetPreflightRoot(
        env[RUNTIME_ASSET_PREFLIGHT_WORKSPACE_ROOT_ENV],
        "runtimeAssetPreflight.workspaceRoot"
    );
    const cacheRoot = optionalString(env[RUNTIME_ASSET_PREFLIGHT_CACHE_ROOT_ENV])?.trim();

    return {
        executeReadOnly: true,
        workspaceRoot,
        ...(cacheRoot
            ? {
                  cacheRoot: normalizeRuntimeAssetPreflightRoot(cacheRoot, "runtimeAssetPreflight.cacheRoot"),
              }
            : {}),
    };
}

function hasEnvKey(env: NodeJS.ProcessEnv, key: string): boolean {
    return Object.prototype.hasOwnProperty.call(env, key);
}

function readRuntimeAssetMaterializationApprovalOptionsFromEnv(
    env: NodeJS.ProcessEnv
): RendererRuntimeAssetMaterializationApprovalOptions | undefined {
    // Keep token/mode/audit values out of options objects returned from env reads so
    // CLI/MCP/config surfaces stay redacted. Execution resolves secrets from process.env.
    const options: RendererRuntimeAssetMaterializationApprovalOptions = {
        modeConfigured: hasEnvKey(env, RUNTIME_ASSET_MATERIALIZATION_APPROVAL_ENV),
        approvalTokenConfigured: hasEnvKey(env, RUNTIME_ASSET_MATERIALIZATION_APPROVAL_TOKEN_ENV),
        auditConfigured: hasEnvKey(env, RUNTIME_ASSET_MATERIALIZATION_APPROVAL_AUDIT_DIR_ENV),
    };
    return options.modeConfigured || options.approvalTokenConfigured || options.auditConfigured ? options : undefined;
}

function readBrowserFixtureRuntimeFromEnv(env: NodeJS.ProcessEnv): boolean {
    const value = optionalString(env[BROWSER_FIXTURE_RUNTIME_ENV])?.trim();
    if (!value) {
        return false;
    }
    if (value !== "enabled") {
        throw new Error(`${BROWSER_FIXTURE_RUNTIME_ENV} must be set to enabled when configured.`);
    }
    return true;
}

function readBundledSceneBridgeImportGateOptionsFromEnv(env: NodeJS.ProcessEnv): RendererBundledSceneBridgeImportGateOptions | undefined {
    if (!hasEnvKey(env, BUNDLED_SCENE_BRIDGE_RUNTIME_ENV)) {
        return undefined;
    }
    return {
        configured: true,
        value: optionalString(env[BUNDLED_SCENE_BRIDGE_RUNTIME_ENV])?.trim() ?? "",
    };
}

function readBundledSceneBridgeRuntimeRegistryInstallationGateOptionsFromEnv(
    env: NodeJS.ProcessEnv
): RendererBundledSceneBridgeRuntimeRegistryInstallationGateOptions | undefined {
    if (!hasEnvKey(env, BUNDLED_SCENE_BRIDGE_RUNTIME_INSTALLATION_GATE_ENV)) {
        return undefined;
    }
    return {
        configured: true,
        value: optionalString(env[BUNDLED_SCENE_BRIDGE_RUNTIME_INSTALLATION_GATE_ENV])?.trim() ?? "",
    };
}

function readBundledSceneBridgeRealRuntimeModuleGateOptionsFromEnv(
    env: NodeJS.ProcessEnv
): RendererBundledSceneBridgeRealRuntimeModuleGateOptions | undefined {
    if (!hasEnvKey(env, BUNDLED_SCENE_BRIDGE_REAL_RUNTIME_MODULE_GATE_ENV)) {
        return undefined;
    }
    return {
        configured: true,
        value: optionalString(env[BUNDLED_SCENE_BRIDGE_REAL_RUNTIME_MODULE_GATE_ENV])?.trim() ?? "",
    };
}

function readBundledSceneBridgeRenderDispatchGateOptionsFromEnv(
    env: NodeJS.ProcessEnv
): RendererBundledSceneBridgeRenderDispatchGateOptions | undefined {
    if (!hasEnvKey(env, BUNDLED_SCENE_BRIDGE_RENDER_DISPATCH_GATE_ENV)) {
        return undefined;
    }
    return {
        configured: true,
        value: optionalString(env[BUNDLED_SCENE_BRIDGE_RENDER_DISPATCH_GATE_ENV])?.trim() ?? "",
    };
}

export function readRendererServiceOptionsFromEnv(env: NodeJS.ProcessEnv = process.env): RendererServiceOptions {
    const backendBaseUriInput =
        optionalString(env[BACKEND_RPC_BASE_URI_ENV]) ?? optionalString(env[BACKEND_RPC_BASE_URI_FALLBACK_ENV]) ?? undefined;
    const backendBaseUri = normalizeBackendRpcBaseUri({
        baseUri: backendBaseUriInput,
    });
    const rendererRuntimeModule = optionalString(env[RENDERER_RUNTIME_MODULE_ENV])?.trim();
    const browserFixtureRuntime = readBrowserFixtureRuntimeFromEnv(env);
    if (rendererRuntimeModule && browserFixtureRuntime) {
        throw new Error(`${BROWSER_FIXTURE_RUNTIME_ENV} cannot be combined with ${RENDERER_RUNTIME_MODULE_ENV}.`);
    }
    const runtimeAssetPreflight = readRuntimeAssetPreflightOptionsFromEnv(env);
    const runtimeAssetMaterializationApproval = readRuntimeAssetMaterializationApprovalOptionsFromEnv(env);
    const bundledSceneBridgeImportGate = readBundledSceneBridgeImportGateOptionsFromEnv(env);
    const bundledSceneBridgeRuntimeRegistryInstallationGate =
        readBundledSceneBridgeRuntimeRegistryInstallationGateOptionsFromEnv(env);
    const bundledSceneBridgeRealRuntimeModuleGate =
        readBundledSceneBridgeRealRuntimeModuleGateOptionsFromEnv(env);
    const bundledSceneBridgeRenderDispatchGate =
        readBundledSceneBridgeRenderDispatchGateOptionsFromEnv(env);

    return {
        host: env.PENPOT_RENDERER_SERVICE_HOST ?? DEFAULT_HOST,
        port: readPort(env.PENPOT_RENDERER_SERVICE_PORT),
        ...(backendBaseUri ? { backendRpc: { baseUri: backendBaseUri } } : {}),
        ...(rendererRuntimeModule ? { rendererRuntimeModule } : {}),
        ...(browserFixtureRuntime ? { browserFixtureRuntime } : {}),
        ...(runtimeAssetPreflight ? { runtimeAssetPreflight } : {}),
        ...(runtimeAssetMaterializationApproval ? { runtimeAssetMaterializationApproval } : {}),
        ...(bundledSceneBridgeImportGate ? { bundledSceneBridgeImportGate } : {}),
        ...(bundledSceneBridgeRuntimeRegistryInstallationGate
            ? { bundledSceneBridgeRuntimeRegistryInstallationGate }
            : {}),
        ...(bundledSceneBridgeRealRuntimeModuleGate ? { bundledSceneBridgeRealRuntimeModuleGate } : {}),
        ...(bundledSceneBridgeRenderDispatchGate ? { bundledSceneBridgeRenderDispatchGate } : {}),
    };
}

async function runNoopHost(): Promise<void> {
    const service = await startRendererService(readRendererServiceOptionsFromEnv(process.env));
    const shutdown = () => {
        void service.stop().finally(() => process.exit(0));
    };

    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
    process.stdout.write(`renderer-service noop listening on http://${service.host}:${service.port}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    void runNoopHost().catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        process.stderr.write(`renderer-service failed to start: ${message}\n`);
        process.exitCode = 1;
    });
}
