import { Buffer } from "node:buffer";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { Browser, Page } from "playwright";
import type { RendererRuntimeOptions, RendererRuntimeRenderInput, RendererRuntimeRenderResult } from "./index.js";

const PNG_DATA_URL_PREFIX = "data:image/png;base64,";
type PlaywrightModule = typeof import("playwright");

async function importPlaywright(): Promise<PlaywrightModule> {
    const requireCandidates = [
        createRequire(import.meta.url),
        createRequire(pathToFileURL(resolve(process.cwd(), "package.json")).href),
    ];
    let lastError: unknown = null;

    for (const candidateRequire of requireCandidates) {
        try {
            const resolved = candidateRequire.resolve("playwright");
            const moduleExports = (await import(pathToFileURL(resolved).href)) as Partial<PlaywrightModule> & {
                default?: Partial<PlaywrightModule>;
            };
            const candidate = moduleExports.chromium ? moduleExports : moduleExports.default;
            if (candidate?.chromium) {
                return candidate as PlaywrightModule;
            }
        } catch (error) {
            lastError = error;
        }
    }

    throw lastError instanceof Error ? lastError : new Error("Renderer-service browser fixture runtime could not load Playwright.");
}

function artifactDimension(value: number): number {
    return Math.max(1, Math.floor(value));
}

async function drawFixturePng(page: Page, input: RendererRuntimeRenderInput): Promise<Buffer> {
    const width = artifactDimension(input.artifact.width);
    const height = artifactDimension(input.artifact.height);
    await page.setViewportSize({ width, height });
    const dataUrl = await page.evaluate(
        ({ width, height, targetKind, cachePolicy }) => {
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const context = canvas.getContext("2d");
            if (!context) {
                throw new Error("Browser fixture canvas context is unavailable.");
            }

            const gradient = context.createLinearGradient(0, 0, width, height);
            gradient.addColorStop(0, "#101828");
            gradient.addColorStop(0.58, "#2563eb");
            gradient.addColorStop(1, "#14b8a6");
            context.fillStyle = gradient;
            context.fillRect(0, 0, width, height);

            context.fillStyle = "rgba(255, 255, 255, 0.88)";
            context.fillRect(Math.max(8, width * 0.08), Math.max(8, height * 0.1), Math.max(16, width * 0.84), Math.max(16, height * 0.72));

            context.fillStyle = "#0f172a";
            context.font = `${Math.max(12, Math.floor(Math.min(width, height) / 9))}px sans-serif`;
            context.textBaseline = "top";
            context.fillText("Penpot browser fixture", Math.max(12, width * 0.12), Math.max(12, height * 0.16));

            context.fillStyle = targetKind === "frame" ? "#7c3aed" : "#16a34a";
            context.beginPath();
            context.arc(width * 0.22, height * 0.62, Math.max(8, Math.min(width, height) * 0.09), 0, Math.PI * 2);
            context.fill();

            context.strokeStyle = cachePolicy === "refresh" ? "#f97316" : "#0ea5e9";
            context.lineWidth = Math.max(3, Math.min(width, height) * 0.025);
            context.strokeRect(width * 0.42, height * 0.48, Math.max(12, width * 0.28), Math.max(12, height * 0.18));

            return canvas.toDataURL("image/png");
        },
        {
            width,
            height,
            targetKind: input.target.kind,
            cachePolicy: input.cache.policy,
        }
    );

    if (!dataUrl.startsWith(PNG_DATA_URL_PREFIX)) {
        throw new Error("Browser fixture runtime did not produce a PNG data URL.");
    }
    return Buffer.from(dataUrl.slice(PNG_DATA_URL_PREFIX.length), "base64");
}

export async function createBrowserFixtureRendererRuntime(): Promise<RendererRuntimeOptions> {
    const { chromium } = await importPlaywright();
    const browser: Browser = await chromium.launch({ headless: true });
    let closed = false;
    let pagePromise: Promise<Page> | null = null;
    let renderQueue: Promise<void> = Promise.resolve();
    let pageCreateCount = 0;
    let renderAttempts = 0;
    let renderSuccesses = 0;
    let renderFailures = 0;
    let lastRenderSucceeded: boolean | null = null;
    let nonEmptyPngValidated = false;
    let closeAttempted = false;
    let closeSucceeded = false;

    const getPage = (): Promise<Page> => {
        if (closed) {
            throw new Error("Renderer-service browser fixture runtime is closed.");
        }
        if (!pagePromise) {
            pageCreateCount += 1;
            pagePromise = browser.newPage().catch((error: unknown) => {
                pagePromise = null;
                throw error;
            });
        }
        return pagePromise;
    };

    const renderWithBrowser = async (input: RendererRuntimeRenderInput): Promise<RendererRuntimeRenderResult> => {
        renderAttempts += 1;
        try {
            const page = await getPage();
            const png = await drawFixturePng(page, input);
            nonEmptyPngValidated = png.byteLength > 8;
            renderSuccesses += 1;
            lastRenderSucceeded = true;
            return {
                png,
                runtime: "frontend-rasterizer",
                fallbackUsed: true,
            };
        } catch (error) {
            renderFailures += 1;
            lastRenderSucceeded = false;
            throw error;
        }
    };

    return {
        renderThumbnail: (input) => {
            const renderResult = renderQueue.then(
                () => renderWithBrowser(input),
                () => renderWithBrowser(input)
            );
            renderQueue = renderResult.then(
                () => undefined,
                () => undefined
            );
            return renderResult;
        },
        close: async () => {
            closeAttempted = true;
            if (closed) {
                return;
            }
            closed = true;
            const page = pagePromise ? await pagePromise.catch(() => null) : null;
            if (page && !page.isClosed()) {
                await page.close();
            }
            await browser.close();
            closeSucceeded = true;
        },
        browserFixtureRuntimeLifecycle: () => {
            const status = closed ? "closed" : "started";
            return {
                status,
                diagnosticsVersion: "P26.31",
                owner: "renderer-service",
                mode: "browser-fixture-lifecycle",
                runtimeSource: "browser-fixture",
                configured: true,
                enabled: true,
                runtimeModuleConfigured: false,
                injectedRuntimeConfigured: false,
                browser: {
                    engine: "chromium",
                    headless: true,
                    processStarted: true,
                    startupAttempted: true,
                    startupSucceeded: true,
                    closed,
                    pathValuesIncluded: false,
                },
                lifecycle: {
                    startupAttempted: true,
                    startupSucceeded: true,
                    startupFailed: false,
                    renderAttempts,
                    renderSuccesses,
                    renderFailures,
                    lastRenderSucceeded,
                    pageCreateCount,
                    pageReuseValidated: renderSuccesses > 1 && pageCreateCount === 1,
                    nonEmptyPngValidated,
                    closeAttempted,
                    closeSucceeded,
                    closeFailed: false,
                    artifactByteLengthIncluded: false,
                },
                sideEffects: {
                    browserProcessStarted: true,
                    runtimeExecutionRegistered: false,
                    runtimeAdapterImported: true,
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
        },
    };
}
