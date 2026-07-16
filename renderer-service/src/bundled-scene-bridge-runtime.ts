import type { RendererRuntimeOptions } from "./index.js";

export const bundledSceneBridgeAdapterModuleBoundary = {
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
    runtimeRegistration: false,
    browserProcessStarted: false,
    runtimeAssetsLoaded: false,
    localFileWrites: false,
    valuesIncluded: false,
} as const;

export type BundledSceneBridgeRendererRuntimeOptions = {
    assetManifest?: unknown;
    runtimeAssetPreflight?: unknown;
    browser?: unknown;
    executionEnabled?: false;
};

export async function createBundledSceneBridgeRendererRuntime(
    _options: BundledSceneBridgeRendererRuntimeOptions = {}
): Promise<RendererRuntimeOptions> {
    return {
        renderThumbnail: async () => {
            const error = new Error(
                "Renderer-service bundled scene bridge runtime is defined but disabled; runtime registration is not implemented yet."
            ) as Error & { code?: string };
            error.code = "renderer_service_bundled_scene_bridge_runtime_disabled";
            throw error;
        },
        close: () => undefined,
    };
}
