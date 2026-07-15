import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { access, readFile, stat } from "node:fs/promises";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 6070;
const BACKEND_RPC_BASE_URI_ENV = "PENPOT_RENDERER_SERVICE_BACKEND_URI";
const BACKEND_RPC_BASE_URI_FALLBACK_ENV = "PENPOT_BACKEND_URI";
const RENDERER_RUNTIME_MODULE_ENV = "PENPOT_RENDERER_SERVICE_RUNTIME_MODULE";
const RUNTIME_ASSET_PREFLIGHT_ENV = "PENPOT_RENDERER_SERVICE_RUNTIME_ASSET_PREFLIGHT";
const RUNTIME_ASSET_PREFLIGHT_WORKSPACE_ROOT_ENV = "PENPOT_RENDERER_SERVICE_RUNTIME_ASSET_PREFLIGHT_WORKSPACE_ROOT";
const RUNTIME_ASSET_PREFLIGHT_CACHE_ROOT_ENV = "PENPOT_RENDERER_SERVICE_RUNTIME_ASSET_PREFLIGHT_CACHE_ROOT";
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

export type RendererRuntimeOptions = {
    renderThumbnail?: (input: RendererRuntimeRenderInput) => RendererRuntimeRenderResult | Promise<RendererRuntimeRenderResult>;
};

export type RendererRuntimeAssetPreflightOptions = {
    executeReadOnly?: boolean;
    workspaceRoot?: string;
    cacheRoot?: string;
};

export type RendererServiceOptions = {
    host?: string;
    port?: number;
    backendRpc?: RendererBackendRpcClientOptions;
    renderer?: RendererRuntimeOptions;
    rendererRuntimeModule?: string;
    runtimeAssetPreflight?: RendererRuntimeAssetPreflightOptions;
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

export const bundledRuntimeAssetMaterializationDryRunPlan = runtimeAssetMaterializationDryRunPlan(
    bundledRuntimeAssetMaterializationPreflight
);

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
        "thumbnail.render.runtime-asset-manifest",
        "thumbnail.render.runtime-asset-preflight",
        "thumbnail.render.runtime-asset-materialization-dry-run",
        "thumbnail.backend-rpc.file-thumbnail-persist",
        "thumbnail.backend-rpc.frame-thumbnail-persist",
    ],
    runtimeAssetManifest: bundledRuntimeBridgeAssetManifest,
    runtimeAssetMaterializationPreflight: bundledRuntimeAssetMaterializationPreflight,
    runtimeAssetMaterializationDryRun: bundledRuntimeAssetMaterializationDryRunPlan,
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

type RendererServiceRuntimeOptions = Pick<RendererServiceOptions, "backendRpc" | "renderer" | "runtimeAssetPreflight" | "thumbnailResponseOverride"> & {
    renderedAssets: RenderedAssetStore;
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
    runtimeAssetMaterializationDryRun: Record<string, unknown>
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
        sendJson(response, 200, {
            ...healthResponse,
            runtimeAssetMaterializationPreflight: runtimeAssetPreflight,
            runtimeAssetMaterializationDryRun,
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
            const renderExecution = await executeThumbnailRender(summary, sourceDataReadExecution, options.renderer, options.renderedAssets);
            const persistExecution = await executeThumbnailPersist(request, summary, options.backendRpc, sourceDataReadExecution, renderExecution);
            const runtimeAssetPreflight = await runtimeAssetMaterializationPreflightResponse(options.runtimeAssetPreflight);
            const runtimeAssetMaterializationDryRun = runtimeAssetMaterializationDryRunResponse(runtimeAssetPreflight);
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
                runtimeAssetMaterializationDryRun
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

export function createRendererService(
    options: Pick<RendererServiceOptions, "backendRpc" | "renderer" | "runtimeAssetPreflight" | "thumbnailResponseOverride"> = {}
): Server {
    const renderedAssets: RenderedAssetStore = new Map();
    const runtimeOptions: RendererServiceRuntimeOptions = {
        backendRpc: options.backendRpc,
        renderer: options.renderer,
        runtimeAssetPreflight: options.runtimeAssetPreflight,
        thumbnailResponseOverride: options.thumbnailResponseOverride,
        renderedAssets,
    };

    return createServer((request, response) => {
        void handleRequest(request, response, runtimeOptions).catch((error: unknown) => {
            sendJson(response, 500, {
                status: "error",
                code: "renderer_service_internal_error",
                message: error instanceof Error ? error.message : "Renderer-service request failed.",
                retryable: true,
            });
        });
    });
}

export async function startRendererService(options: RendererServiceOptions = {}): Promise<StartedRendererService> {
    const host = options.host ?? DEFAULT_HOST;
    const port = options.port ?? DEFAULT_PORT;
    const renderer = options.renderer ?? (options.rendererRuntimeModule ? await loadRendererRuntimeAdapterModule(options.rendererRuntimeModule) : undefined);
    const server = createRendererService({
        backendRpc: options.backendRpc,
        renderer,
        runtimeAssetPreflight: options.runtimeAssetPreflight,
        thumbnailResponseOverride: options.thumbnailResponseOverride,
    });

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

    const address = server.address();
    if (!address || typeof address === "string") {
        await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
        throw new Error("Renderer service did not bind a TCP address.");
    }

    return {
        host,
        port: address.port,
        server,
        stop: () =>
            new Promise<void>((resolve, reject) => {
                server.close((error) => (error ? reject(error) : resolve()));
            }),
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

export function readRendererServiceOptionsFromEnv(env: NodeJS.ProcessEnv = process.env): RendererServiceOptions {
    const backendBaseUriInput =
        optionalString(env[BACKEND_RPC_BASE_URI_ENV]) ?? optionalString(env[BACKEND_RPC_BASE_URI_FALLBACK_ENV]) ?? undefined;
    const backendBaseUri = normalizeBackendRpcBaseUri({
        baseUri: backendBaseUriInput,
    });
    const rendererRuntimeModule = optionalString(env[RENDERER_RUNTIME_MODULE_ENV])?.trim();
    const runtimeAssetPreflight = readRuntimeAssetPreflightOptionsFromEnv(env);

    return {
        host: env.PENPOT_RENDERER_SERVICE_HOST ?? DEFAULT_HOST,
        port: readPort(env.PENPOT_RENDERER_SERVICE_PORT),
        ...(backendBaseUri ? { backendRpc: { baseUri: backendBaseUri } } : {}),
        ...(rendererRuntimeModule ? { rendererRuntimeModule } : {}),
        ...(runtimeAssetPreflight ? { runtimeAssetPreflight } : {}),
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
