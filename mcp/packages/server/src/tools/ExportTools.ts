import { z } from "zod";
import type { ToolResponse } from "../ToolResponse.js";
import { PenpotMcpServer } from "../PenpotMcpServer.js";
import { ExportPluginTask } from "../tasks/ExportPluginTask.js";
import { requireBoundFileContext } from "./FileContextGuard.js";
import { PenpotRpcTool } from "./PenpotRpcTool.js";
import type { ExportTaskParams, ExportTaskResultData, PluginTaskResult } from "@penpot/mcp-common";
import {
    AdapterSelectionReasonCodes,
    CommandDescriptors,
    createAdapterSelectionError,
    createCommandRequestEnvelope,
    createCommandResultEnvelope,
    createExportFileContract,
    createRenderThumbnailRendererServicePlan,
    getAdapterSelectionReason,
    selectCommandAdapter,
} from "@penpot/command-runtime";
import type { CommandAdapterSelection, RenderThumbnailRendererServicePlan } from "@penpot/command-runtime";

const uuidSchema = z.string().uuid();
const formatSchema = z.enum(["png", "jpeg", "svg", "pdf"]);
const exportFileFormatSchema = z.enum(["penpot"]);
const exportFileLibraryModeSchema = z.enum(["all", "merge", "detach"]);
const scaleSchema = z.number().positive().max(16).optional().describe("Export scale for bitmap formats.");
const DEFAULT_EXPORTER_URI = "http://localhost:6061";
const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

type PenpotRecord = Record<string, unknown>;
type RenderPreviewAdapterArgs = {
    fileId?: string;
    pageId?: string;
    objectId?: string;
    shapeId?: string;
    adapter?: string;
};
type RenderThumbnailAdapterArgs = {
    adapter?: string;
};

function asRecord(value: unknown): PenpotRecord {
    return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as PenpotRecord) : {};
}

function trimTrailingSlash(uri: string): string {
    return uri.replace(/\/+$/, "");
}

function getExporterUri(): string {
    return trimTrailingSlash(process.env.PENPOT_EXPORTER_URI ?? DEFAULT_EXPORTER_URI);
}

function encodeTransitKeyword(value: string): string {
    return `~:${value}`;
}

function encodeTransitUuid(value: string): string {
    return `~u${value}`;
}

function decodeTransitString(value: string): string {
    if (value.startsWith("~~")) {
        return value.slice(1);
    }

    if (value.startsWith("~:")) {
        return value.slice(2);
    }

    if (value.startsWith("~u") && uuidSchema.safeParse(value.slice(2)).success) {
        return value.slice(2);
    }

    return value;
}

function decodeTransitKey(value: unknown): string {
    const decoded = decodeTransitValue(value);
    return typeof decoded === "string" ? decoded : JSON.stringify(decoded);
}

function decodeTransitValue(value: unknown): unknown {
    if (typeof value === "string") {
        return decodeTransitString(value);
    }

    if (Array.isArray(value)) {
        if (value[0] === "^ " && value.length % 2 === 1) {
            const decoded: PenpotRecord = {};
            for (let index = 1; index < value.length; index += 2) {
                decoded[decodeTransitKey(value[index])] = decodeTransitValue(value[index + 1]);
            }
            return decoded;
        }

        if (value.length === 2 && value[0] === "~#uuid" && typeof value[1] === "string") {
            return value[1];
        }

        return value.map((entry) => decodeTransitValue(entry));
    }

    if (value !== null && typeof value === "object") {
        const decoded: PenpotRecord = {};
        for (const [key, entry] of Object.entries(value)) {
            decoded[decodeTransitKey(key)] = decodeTransitValue(entry);
        }
        return decoded;
    }

    return value;
}

function decodeTransitJson(text: string): unknown {
    return decodeTransitValue(JSON.parse(text));
}

function authCookieHeader(token: string): string {
    return `auth-token=${encodeURIComponent(token)}`;
}

function getResourceUri(resource: PenpotRecord): string | null {
    const uri = resource.uri ?? resource["resource-uri"];
    return typeof uri === "string" && uri.length > 0 ? uri : null;
}

function normalizeExportFileResource(data: unknown): PenpotRecord | null {
    if (typeof data === "string" && data.length > 0) {
        return {
            uri: data,
            "resource-uri": data,
        };
    }

    const resource = asRecord(data);
    const uri = getResourceUri(resource);
    if (!uri) {
        return null;
    }

    return {
        ...resource,
        uri: typeof resource.uri === "string" ? resource.uri : uri,
        "resource-uri": typeof resource["resource-uri"] === "string" ? resource["resource-uri"] : uri,
    };
}

function resolveResourceUri(uri: string, backendUri: string): string {
    return new URL(uri, `${backendUri}/`).toString();
}

function createExporterTransitRequest(args: {
    fileId: string;
    pageId: string;
    objectId: string;
    profileId: string;
    scale: number;
    name: string;
}): string {
    return JSON.stringify({
        "~:cmd": encodeTransitKeyword("export-shapes"),
        "~:wait": true,
        "~:profile-id": encodeTransitUuid(args.profileId),
        "~:exports": [
            {
                "~:file-id": encodeTransitUuid(args.fileId),
                "~:page-id": encodeTransitUuid(args.pageId),
                "~:object-id": encodeTransitUuid(args.objectId),
                "~:type": encodeTransitKeyword("png"),
                "~:suffix": "",
                "~:scale": args.scale,
                "~:name": args.name,
            },
        ],
    });
}

abstract class ExportTool<TArgs extends object> extends PenpotRpcTool<TArgs> {
    protected constructor(mcpServer: PenpotMcpServer, inputSchema: z.ZodRawShape) {
        super(mcpServer, inputSchema);
    }

    protected async executeExportTask(
        params: ExportTaskParams,
        adapterSelection?: CommandAdapterSelection
    ): Promise<ToolResponse> {
        const contextError = requireBoundFileContext(
            this.mcpServer,
            this.getSessionContext()?.userToken,
            this.getToolName()
        );
        if (contextError) {
            return contextError;
        }

        const task = new ExportPluginTask(params);
        const result = await this.mcpServer.pluginBridge.executePluginTask(task);
        return this.pluginTaskOk(result, adapterSelection);
    }

    private pluginTaskOk(
        result: PluginTaskResult<ExportTaskResultData>,
        adapterSelection?: CommandAdapterSelection
    ): ToolResponse {
        if (!adapterSelection) {
            return super.ok(result.data);
        }
        return super.ok({
            ...result.data,
            adapter: adapterSelection.selected,
            adapterSelection,
        });
    }

    protected selectRenderPreviewAdapter(args: RenderPreviewAdapterArgs): CommandAdapterSelection {
        const objectId = args.objectId ?? args.shapeId;
        const hasAnyExplicitTarget = Boolean(args.fileId || args.pageId || objectId);
        const hasCompleteExplicitTarget = Boolean(args.fileId && args.pageId && objectId);

        return selectCommandAdapter({
            command: CommandDescriptors.RENDER_PREVIEW.id,
            requestedAdapter: args.adapter ?? "auto",
            candidates: [
                {
                    kind: "exporter",
                    available: hasCompleteExplicitTarget,
                    priority: 20,
                    reason: hasCompleteExplicitTarget
                        ? null
                        : getAdapterSelectionReason(AdapterSelectionReasonCodes.EXPORTER_EXPLICIT_TARGET_REQUIRED),
                },
                {
                    kind: "plugin-live",
                    available: !hasAnyExplicitTarget,
                    priority: 50,
                    reason: hasAnyExplicitTarget
                        ? getAdapterSelectionReason(AdapterSelectionReasonCodes.PLUGIN_LIVE_OMIT_EXPLICIT_TARGET)
                        : null,
                },
            ],
        });
    }

    protected adapterSelectionFailure(selection: CommandAdapterSelection): ToolResponse {
        const error = createAdapterSelectionError(selection, {
            actions: [
                "Use adapter: 'auto' to let MCP choose between exporter and plugin-live.",
                "For exporter, pass fileId, pageId, and objectId.",
                "For plugin-live, omit explicit target ids and bind a live workspace context.",
            ],
        });
        return this.error(error.code, error.message, error.actions, error.data);
    }

    protected async executeExporterPreview(
        args: RenderPreviewArgs,
        adapterSelection: CommandAdapterSelection
    ): Promise<ToolResponse> {
        const userToken = this.getUserToken();
        if (!userToken) {
            return this.authenticationRequired();
        }

        const objectId = args.objectId ?? args.shapeId;
        if (!args.fileId || !args.pageId || !objectId) {
            return this.adapterSelectionFailure(adapterSelection);
        }

        const exporterUri = getExporterUri();
        const scale = args.scale ?? 1;
        const name = args.name?.trim() || "preview";
        const artifact = {
            kind: "preview",
            format: "png",
            mimeType: "image/png",
            name,
            scale,
            target: {
                fileId: args.fileId,
                pageId: args.pageId,
                objectId,
            },
        };

        const requestEnvelope = createCommandRequestEnvelope(CommandDescriptors.RENDER_PREVIEW.id, {
            transport: "mcp",
            input: {
                fileId: args.fileId,
                pageId: args.pageId,
                objectId,
                scale,
                name,
            },
            target: { fileId: args.fileId, pageId: args.pageId, shapeId: objectId },
            auth: { userTokenPresent: true, source: "mcp-session" },
            adapterSelection,
            diagnostics: { exporterUri, exporterCommand: "export-shapes" },
        });

        try {
            const profileId = await this.resolveExporterProfileId(args.profileId, userToken);
            const resource = await this.postExporterPreviewRequest(
                exporterUri,
                {
                    fileId: args.fileId,
                    pageId: args.pageId,
                    objectId,
                    profileId,
                    scale,
                    name,
                },
                userToken
            );
            const resultEnvelope = createCommandResultEnvelope(
                requestEnvelope,
                {
                    command: CommandDescriptors.RENDER_PREVIEW.id,
                    adapter: adapterSelection.selected,
                    adapterSelection,
                    artifact,
                    fileId: args.fileId,
                    pageId: args.pageId,
                    objectId,
                    profileId,
                    exporter: {
                        uri: exporterUri,
                        endpoint: exporterUri,
                        method: "POST",
                        requestContentType: "application/transit+json",
                        responseContentType: "application/transit+json",
                    },
                    resource,
                },
                { adapterSelection }
            );
            return super.ok(resultEnvelope.data, resultEnvelope.warnings);
        } catch (cause) {
            return this.exporterFailure(cause, exporterUri);
        }
    }

    private async resolveExporterProfileId(profileId: string | undefined, userToken: string): Promise<string> {
        if (profileId) {
            return profileId;
        }

        const profile = asRecord(await this.rpcGet<PenpotRecord>("get-profile", {}, userToken));
        const resolvedProfileId = typeof profile.id === "string" ? profile.id : "";
        if (!uuidSchema.safeParse(resolvedProfileId).success || resolvedProfileId === ZERO_UUID) {
            throw Object.assign(new Error("Unable to resolve a non-anonymous profile id for exporter preview."), {
                code: "profile_id_required",
                status: 0,
                data: { profile },
            });
        }
        return resolvedProfileId;
    }

    private async postExporterPreviewRequest(
        exporterUri: string,
        params: {
            fileId: string;
            pageId: string;
            objectId: string;
            profileId: string;
            scale: number;
            name: string;
        },
        userToken: string
    ): Promise<PenpotRecord> {
        let response: Response;
        try {
            response = await fetch(exporterUri, {
                method: "POST",
                headers: {
                    accept: "application/transit+json",
                    authorization: `Bearer ${userToken}`,
                    cookie: authCookieHeader(userToken),
                    "content-type": "application/transit+json",
                    "x-client": "penpot-mcp/1.0",
                },
                body: createExporterTransitRequest(params),
            });
        } catch (cause) {
            throw Object.assign(new Error(`Unable to reach the Penpot exporter at ${exporterUri}: ${String(cause)}`), {
                code: "exporter_unavailable",
                status: 0,
                data: { exporterUri },
            });
        }

        const data = await this.readStructuredExporterResponse(response);
        if (!response.ok) {
            const body = asRecord(data);
            throw Object.assign(
                new Error(
                    typeof body.message === "string"
                        ? body.message
                        : typeof body.hint === "string"
                          ? body.hint
                          : `Penpot exporter preview request failed. HTTP ${response.status}`
                ),
                {
                    code: typeof body.code === "string" ? body.code.replaceAll("-", "_") : "exporter_request_failed",
                    status: response.status,
                    data,
                }
            );
        }

        return asRecord(data);
    }

    private async readStructuredExporterResponse(response: Response): Promise<unknown> {
        const text = await response.text();
        if (!text.trim()) {
            return null;
        }

        const contentType = response.headers.get("content-type") ?? "";
        if (contentType.includes("application/transit+json")) {
            return decodeTransitJson(text);
        }

        return JSON.parse(text);
    }

    private exporterFailure(cause: unknown, exporterUri: string): ToolResponse {
        const record = asRecord(cause);
        const code = typeof record.code === "string" ? record.code : "exporter_request_failed";
        const status = typeof record.status === "number" ? record.status : 0;
        const message = cause instanceof Error ? cause.message : "Unable to execute exporter-backed preview.";
        const actions =
            code === "authentication_required" || code === "profile_id_required"
                ? [
                      "Reconnect MCP with a Penpot userToken query parameter.",
                      "Pass profileId if profile resolution is unavailable.",
                  ]
                : [
                      "Check PENPOT_EXPORTER_URI.",
                      "Check that the Penpot frontend, backend, and exporter services are running.",
                  ];

        return this.error(code, message, actions, {
            status,
            exporterUri,
            data: record.data,
        });
    }
}

export class ExportFileArgs {
    static schema = {
        fileId: uuidSchema.describe("File id to export as a .penpot archive."),
        format: exportFileFormatSchema.optional().describe("Archive format. Only penpot is supported."),
        libraryMode: exportFileLibraryModeSchema
            .optional()
            .describe("Library handling mode: all includes libraries, merge embeds assets, detach detaches libraries."),
        includeLibraries: z.boolean().optional().describe("Low-level export-binfile include-libraries flag."),
        embedAssets: z.boolean().optional().describe("Low-level export-binfile embed-assets flag."),
        adapter: z.string().optional().describe("Optional adapter request: auto or backend-rpc."),
    };

    fileId?: string;
    format?: string;
    libraryMode?: string;
    includeLibraries?: boolean;
    embedAssets?: boolean;
    adapter?: string;
}

export class ExportFileTool extends PenpotRpcTool<ExportFileArgs> {
    constructor(mcpServer: PenpotMcpServer) {
        super(mcpServer, ExportFileArgs.schema);
    }

    public getToolName(): string {
        return CommandDescriptors.EXPORT_FILE.mcpToolName;
    }

    public getToolDescription(): string {
        return CommandDescriptors.EXPORT_FILE.description;
    }

    protected async executeCore(args: ExportFileArgs): Promise<ToolResponse> {
        const adapterSelection = this.selectExportFileAdapter(args);
        if (adapterSelection.status !== "selected") {
            return this.adapterSelectionFailure(adapterSelection);
        }

        let contract: ReturnType<typeof createExportFileContract>;
        try {
            contract = createExportFileContract(args);
        } catch (cause) {
            return this.error(
                "export_file_contract_invalid",
                cause instanceof Error ? cause.message : "Invalid export.file request.",
                [
                    "Use format: 'penpot'.",
                    "Use libraryMode: 'all', 'merge', or 'detach'.",
                    "Do not set includeLibraries and embedAssets to true at the same time.",
                ]
            );
        }

        if (contract.requires.length > 0 || !contract.target.fileId) {
            return this.error("export_file_target_required", "export.file requires a fileId.", [
                "Pass fileId for the Penpot file to export.",
            ], {
                requires: contract.requires,
            });
        }

        const userToken = this.getUserToken();
        if (!userToken) {
            return this.authenticationRequired();
        }

        const backendUri = this.mcpServer.rpcClient.getBaseUri();
        const backendRpc = {
            uri: backendUri,
            endpoint: this.mcpServer.rpcClient.getMethodUrl(contract.backendRpc.command),
            method: "POST",
            requestContentType: "application/json",
            responseContentType: "text/event-stream",
            command: contract.backendRpc.command,
            transport: contract.backendRpc.transport,
            response: contract.backendRpc.response,
            request: contract.backendRpc.request,
        };
        const requestEnvelope = createCommandRequestEnvelope(CommandDescriptors.EXPORT_FILE.id, {
            transport: "mcp",
            input: {
                fileId: contract.target.fileId,
                format: contract.artifact.format,
                libraryMode: contract.artifact.libraryMode,
                includeLibraries: contract.artifact.includeLibraries,
                embedAssets: contract.artifact.embedAssets,
            },
            target: { fileId: contract.target.fileId },
            auth: { userTokenPresent: true, source: "mcp-session" },
            adapterSelection,
            diagnostics: {
                backendUri,
                backendCommand: contract.backendRpc.command,
                outputMode: "backend-rpc-sse-resource-uri",
            },
        });

        try {
            const events = await this.rpcPostSse(
                contract.backendRpc.command,
                contract.backendRpc.request,
                userToken,
                {
                    mcpToolName: this.getToolName(),
                    mcpAdapter: adapterSelection.selected,
                    mcpSessionId: this.getSessionContext()?.mcpSessionId,
                    mcpFileId: contract.target.fileId,
                }
            );
            const endEvent = [...events].reverse().find((event) => event.type === "end");
            if (!endEvent) {
                return this.error("export_file_stream_incomplete", "export.file stream ended without an end event.", [
                    "Retry the export and check backend logs if the stream consistently ends early.",
                ], {
                    events: events.map((event) => event.type),
                });
            }

            const resource = normalizeExportFileResource(endEvent.data);
            if (!resource) {
                return this.error(
                    "export_file_resource_uri_missing",
                    "export.file stream end event did not include a resource URI.",
                    ["Retry the export and check the backend export-binfile response shape."],
                    { response: endEvent.data }
                );
            }

            const resourceUri = getResourceUri(resource) as string;
            const resultEnvelope = createCommandResultEnvelope(
                requestEnvelope,
                {
                    command: CommandDescriptors.EXPORT_FILE.id,
                    adapter: adapterSelection.selected,
                    adapterSelection,
                    artifact: contract.artifact,
                    fileId: contract.target.fileId,
                    libraryMode: contract.artifact.libraryMode,
                    backendRpc,
                    resource,
                    resourceUri,
                    downloadUri: resolveResourceUri(resourceUri, backendUri),
                    stream: {
                        eventTypes: events.map((event) => event.type),
                    },
                },
                { adapterSelection }
            );
            return super.ok(resultEnvelope.data, resultEnvelope.warnings);
        } catch (cause) {
            return this.rpcFailure(cause);
        }
    }

    private selectExportFileAdapter(args: ExportFileArgs): CommandAdapterSelection {
        return selectCommandAdapter({
            command: CommandDescriptors.EXPORT_FILE.id,
            requestedAdapter: args.adapter ?? "auto",
            candidates: [
                { kind: "backend-rpc", available: true, priority: 10 },
                {
                    kind: "exporter",
                    available: false,
                    priority: 20,
                    reason: "export.file uses backend export-binfile; exporter export-shapes is only for page/object rendering.",
                },
                {
                    kind: "plugin-live",
                    available: false,
                    priority: 50,
                    reason: "export.file exports a whole .penpot archive through backend-rpc; plugin-live only exports live page or shape data.",
                },
            ],
        });
    }

    private adapterSelectionFailure(selection: CommandAdapterSelection): ToolResponse {
        const error = createAdapterSelectionError(selection, {
            actions: [
                "Use adapter: 'auto' or 'backend-rpc'.",
                "Use export.page or render.preview for exporter-backed page/object artifacts.",
            ],
        });
        return this.error(error.code, error.message, error.actions, error.data);
    }
}

export class ExportShapeArgs {
    static schema = {
        shapeId: uuidSchema
            .optional()
            .describe("Optional shape id to export. If omitted, exports the current selection."),
        format: formatSchema.optional().describe("Export format. Defaults to png."),
        scale: scaleSchema,
        skipChildren: z.boolean().optional().describe("Whether to ignore child shapes when exporting."),
    };

    shapeId?: string;
    format?: ExportTaskParams["format"];
    scale?: number;
    skipChildren?: boolean;
}

export class ExportShapeDataTool extends ExportTool<ExportShapeArgs> {
    constructor(mcpServer: PenpotMcpServer) {
        super(mcpServer, ExportShapeArgs.schema);
    }

    public getToolName(): string {
        return CommandDescriptors.EXPORT_SHAPE.mcpToolName;
    }

    public getToolDescription(): string {
        return CommandDescriptors.EXPORT_SHAPE.description;
    }

    protected async executeCore(args: ExportShapeArgs): Promise<ToolResponse> {
        return this.executeExportTask({
            action: "exportShape",
            shapeId: args.shapeId,
            format: args.format ?? "png",
            scale: args.scale,
            skipChildren: args.skipChildren,
        });
    }
}

export class ExportPageArgs {
    static schema = {
        pageId: uuidSchema.optional().describe("Optional page id to export. If omitted, exports the current page."),
        format: formatSchema.optional().describe("Export format. Defaults to png."),
        scale: scaleSchema,
        skipChildren: z.boolean().optional().describe("Whether to ignore child shapes when exporting."),
    };

    pageId?: string;
    format?: ExportTaskParams["format"];
    scale?: number;
    skipChildren?: boolean;
}

export class ExportPageTool extends ExportTool<ExportPageArgs> {
    constructor(mcpServer: PenpotMcpServer) {
        super(mcpServer, ExportPageArgs.schema);
    }

    public getToolName(): string {
        return CommandDescriptors.EXPORT_PAGE.mcpToolName;
    }

    public getToolDescription(): string {
        return CommandDescriptors.EXPORT_PAGE.description;
    }

    protected async executeCore(args: ExportPageArgs): Promise<ToolResponse> {
        return this.executeExportTask({
            action: "exportPage",
            pageId: args.pageId,
            format: args.format ?? "png",
            scale: args.scale,
            skipChildren: args.skipChildren,
        });
    }
}

export class RenderPreviewArgs {
    static schema = {
        target: z
            .enum(["page", "selection", "shape"])
            .optional()
            .describe("Preview target. Defaults to page, or shape when shapeId is provided."),
        fileId: uuidSchema.optional().describe("File id for exporter-backed headless preview."),
        objectId: uuidSchema.optional().describe("Object/frame id for exporter-backed headless preview."),
        shapeId: uuidSchema.optional().describe("Shape id when target is shape."),
        pageId: uuidSchema.optional().describe("Page id when target is page."),
        profileId: uuidSchema.optional().describe("Optional Penpot profile id for exporter requests."),
        name: z.string().min(1).max(200).optional().describe("Optional artifact name for exporter preview output."),
        scale: scaleSchema,
        adapter: z.string().optional().describe("Optional adapter request: auto, exporter, or plugin-live."),
    };

    target?: ExportTaskParams["target"];
    fileId?: string;
    objectId?: string;
    shapeId?: string;
    pageId?: string;
    profileId?: string;
    name?: string;
    scale?: number;
    adapter?: string;
}

export class RenderPreviewTool extends ExportTool<RenderPreviewArgs> {
    constructor(mcpServer: PenpotMcpServer) {
        super(mcpServer, RenderPreviewArgs.schema);
    }

    public getToolName(): string {
        return CommandDescriptors.RENDER_PREVIEW.mcpToolName;
    }

    public getToolDescription(): string {
        return CommandDescriptors.RENDER_PREVIEW.description;
    }

    protected async executeCore(args: RenderPreviewArgs): Promise<ToolResponse> {
        const adapterSelection = this.selectRenderPreviewAdapter(args);
        if (adapterSelection.status !== "selected") {
            return this.adapterSelectionFailure(adapterSelection);
        }

        if (adapterSelection.selected === "exporter") {
            return await this.executeExporterPreview(args, adapterSelection);
        }

        return this.executeExportTask(
            {
                action: "renderPreview",
                target: args.target,
                shapeId: args.shapeId,
                pageId: args.pageId,
                format: "png",
                scale: args.scale,
            },
            adapterSelection
        );
    }
}

export class RenderThumbnailArgs {
    static schema = {
        fileId: uuidSchema.optional().describe("File id for dashboard file or tagged frame thumbnail planning."),
        target: z.enum(["file", "frame"]).optional().describe("Thumbnail target. Defaults to file."),
        pageId: uuidSchema.optional().describe("Page id for target: frame."),
        objectId: uuidSchema.optional().describe("Frame/object id for target: frame."),
        frameId: uuidSchema.optional().describe("Alias for objectId when target is frame."),
        shapeId: uuidSchema.optional().describe("Alias for objectId when target is frame."),
        tag: z.string().min(1).max(120).optional().describe("Tagged frame thumbnail tag. Defaults to frame."),
        revn: z.number().int().nonnegative().optional().describe("Optional file revision for file thumbnail cache keys."),
        width: z.number().int().positive().max(4096).optional().describe("Thumbnail width in pixels."),
        size: z.number().int().positive().max(4096).optional().describe("Alias for width."),
        cachePolicy: z.enum(["reuse", "refresh"]).optional().describe("Cache policy. Defaults to reuse."),
        format: z.enum(["png"]).optional().describe("Thumbnail format. Only png is supported."),
        endpoint: z.string().url().optional().describe("Future renderer-service endpoint for planning metadata."),
        rendererServiceUri: z.string().url().optional().describe("Alias for endpoint."),
        rendererUri: z.string().url().optional().describe("Alias for endpoint."),
        probeTimeoutMs: z.number().int().positive().max(60000).optional().describe("Future renderer-service health probe timeout in milliseconds."),
        timeoutMs: z.number().int().positive().max(60000).optional().describe("Alias for probeTimeoutMs."),
        rendererServiceTimeoutMs: z.number().int().positive().max(60000).optional().describe("Alias for probeTimeoutMs."),
        rendererServiceExecution: z
            .enum(["renderer-service"])
            .optional()
            .describe("Future explicit opt-in value for renderer-service execution planning. Does not enable execution yet."),
        publicUri: z.string().url().optional().describe("Public Penpot URI for future download URI examples."),
        output: z
            .string()
            .min(1)
            .optional()
            .describe("CLI-only future output path metadata; MCP planning never writes local files."),
        adapter: z.string().optional().describe("Optional adapter request: auto or renderer-service."),
        dryRun: z.boolean().optional().describe("Planning mode. Defaults to true; false reports runtime unavailable."),
    };

    fileId?: string;
    target?: "file" | "frame";
    pageId?: string;
    objectId?: string;
    frameId?: string;
    shapeId?: string;
    tag?: string;
    revn?: number;
    width?: number;
    size?: number;
    cachePolicy?: "reuse" | "refresh";
    format?: "png";
    endpoint?: string;
    rendererServiceUri?: string;
    rendererUri?: string;
    probeTimeoutMs?: number;
    timeoutMs?: number;
    rendererServiceTimeoutMs?: number;
    rendererServiceExecution?: "renderer-service";
    publicUri?: string;
    output?: string;
    adapter?: string;
    dryRun?: boolean;
}

export class RenderThumbnailTool extends PenpotRpcTool<RenderThumbnailArgs> {
    constructor(mcpServer: PenpotMcpServer) {
        super(mcpServer, RenderThumbnailArgs.schema);
    }

    public getToolName(): string {
        return CommandDescriptors.RENDER_THUMBNAIL.mcpToolName;
    }

    public getToolDescription(): string {
        return CommandDescriptors.RENDER_THUMBNAIL.description;
    }

    protected async executeCore(args: RenderThumbnailArgs): Promise<ToolResponse> {
        const adapterSelection = this.selectRenderThumbnailAdapter(args);
        if (adapterSelection.status !== "selected" || adapterSelection.selected !== "renderer-service") {
            return this.adapterSelectionFailure(adapterSelection);
        }

        let plan: RenderThumbnailRendererServicePlan;
        try {
            plan = this.createMcpRenderThumbnailPlan(args);
        } catch (cause) {
            return this.error(
                "render_thumbnail_contract_invalid",
                cause instanceof Error ? cause.message : "Invalid render.thumbnail request.",
                [
                    "Use target: 'file' or target: 'frame'.",
                    "Use cachePolicy: 'reuse' or 'refresh'.",
                    "Use width or size as a positive integer up to 4096.",
                ],
                { details: asRecord(cause) }
            );
        }

        if (plan.requires.includes("fileId")) {
            return this.error("file_id_required", "render.thumbnail requires fileId.", [
                "Pass fileId for the Penpot file thumbnail source.",
            ], {
                requires: plan.requires,
            });
        }

        if (plan.requires.includes("pageId")) {
            return this.error("page_id_required", "render.thumbnail target frame requires pageId.", [
                "Pass pageId together with objectId for tagged frame thumbnails.",
            ], {
                requires: plan.requires,
            });
        }

        if (plan.requires.includes("objectId")) {
            return this.error("object_id_required", "render.thumbnail target frame requires objectId.", [
                "Pass objectId, frameId, or shapeId together with pageId for tagged frame thumbnails.",
            ], {
                requires: plan.requires,
            });
        }

        if (args.dryRun === false) {
            return this.error(
                "renderer_service_unavailable",
                "render.thumbnail execution is not available until the thumbnail renderer service is implemented.",
                [
                    "Call render.thumbnail with dryRun omitted or true to inspect the renderer-service request.",
                    "Implement and configure the thumbnail renderer service before enabling execution.",
                    "Keep MCP thumbnail returns metadata-only; do not write local files from the MCP server.",
                ],
                {
                    command: plan.command,
                    adapter: plan.adapter,
                    endpoint: plan.endpoint,
                    client: plan.client,
                    availability: plan.availability,
                    optInConfiguration: plan.optInConfiguration,
                    executionGate: plan.executionGate,
                    healthPreflight: plan.healthPreflight,
                    executionClientHarness: plan.executionClientHarness,
                    dispatchAdapterBoundary: plan.dispatchAdapterBoundary,
                    unavailableErrorTaxonomy: plan.unavailableErrorTaxonomy,
                    integrationFixtureHarness: plan.integrationFixtureHarness,
                    dispatchRegistrationPreflight: plan.dispatchRegistrationPreflight,
                    executableAdapterRegistrationScaffold: plan.executableAdapterRegistrationScaffold,
                    adapterRegistryManifest: plan.adapterRegistryManifest,
                    enablementChecklist: plan.enablementChecklist,
                    implementationSliceAudit: plan.implementationSliceAudit,
                    healthNoopContractFixtures: plan.healthNoopContractFixtures,
                    noopServiceHostScaffold: plan.noopServiceHostScaffold,
                    hostLifecycleTestFixtures: plan.hostLifecycleTestFixtures,
                    packageManifestScaffold: plan.packageManifestScaffold,
                    packageCreationGuardrails: plan.packageCreationGuardrails,
                    packageFileTemplates: plan.packageFileTemplates,
                    packageWorkspaceWiring: plan.packageWorkspaceWiring,
                    packageBuildVerification: plan.packageBuildVerification,
                    packageMaterializationChecklist: plan.packageMaterializationChecklist,
                    packageCreationDryRunSummary: plan.packageCreationDryRunSummary,
                    packageCreationFileManifest: plan.packageCreationFileManifest,
                    packageMaterializationApprovalGate: plan.packageMaterializationApprovalGate,
                    packageMaterializationExecutionDryRun: plan.packageMaterializationExecutionDryRun,
                    packageMaterializationWriteContract: plan.packageMaterializationWriteContract,
                    packageMaterializationRollbackContract: plan.packageMaterializationRollbackContract,
                    packageMaterializationVerificationManifest: plan.packageMaterializationVerificationManifest,
                    packageMaterializationFinalApprovalChecklist: plan.packageMaterializationFinalApprovalChecklist,
                    packageMaterializationExplicitApprovalToken: plan.packageMaterializationExplicitApprovalToken,
                    packageMaterializationApprovalAuditTrail: plan.packageMaterializationApprovalAuditTrail,
                    packageMaterializationApprovalReplayGuard: plan.packageMaterializationApprovalReplayGuard,
                    packageMaterializationApprovalExpiryPolicy: plan.packageMaterializationApprovalExpiryPolicy,
                    packageMaterializationApprovalRevocationPolicy: plan.packageMaterializationApprovalRevocationPolicy,
                    packageMaterializationApprovalScopeBindingPolicy: plan.packageMaterializationApprovalScopeBindingPolicy,
                    packageMaterializationApprovalOperatorConfirmationPolicy: plan.packageMaterializationApprovalOperatorConfirmationPolicy,
                    packageMaterializationApprovalEmergencyStopPolicy: plan.packageMaterializationApprovalEmergencyStopPolicy,
                    packageMaterializationApprovalReadinessVerdictPolicy: plan.packageMaterializationApprovalReadinessVerdictPolicy,
                    packageMaterializationApprovalExecutionHandoffPolicy: plan.packageMaterializationApprovalExecutionHandoffPolicy,
                    packageMaterializationApprovalPostHandoffAuditPolicy: plan.packageMaterializationApprovalPostHandoffAuditPolicy,
                    packageMaterializationApprovalAuditRetentionPolicy: plan.packageMaterializationApprovalAuditRetentionPolicy,
                    packageMaterializationApprovalAuditAccessPolicy: plan.packageMaterializationApprovalAuditAccessPolicy,
                    packageMaterializationApprovalAuditIntegrityPolicy: plan.packageMaterializationApprovalAuditIntegrityPolicy,
                    packageMaterializationApprovalAuditProvenancePolicy: plan.packageMaterializationApprovalAuditProvenancePolicy,
                    packageMaterializationApprovalAuditCustodyPolicy: plan.packageMaterializationApprovalAuditCustodyPolicy,
                    packageMaterializationApprovalAuditEvidencePolicy: plan.packageMaterializationApprovalAuditEvidencePolicy,
                    packageMaterializationApprovalAuditAttestationPolicy: plan.packageMaterializationApprovalAuditAttestationPolicy,
                    clientRequest: plan.clientRequest,
                    requiredCapabilities: plan.requiredCapabilities,
                    serviceRequest: plan.serviceRequest,
                }
            );
        }

        return this.ok({
            ...plan,
            adapterSelection,
        });
    }

    private selectRenderThumbnailAdapter(args: RenderThumbnailAdapterArgs): CommandAdapterSelection {
        return selectCommandAdapter({
            command: CommandDescriptors.RENDER_THUMBNAIL.id,
            requestedAdapter: args.adapter ?? "auto",
            candidates: [
                { kind: "renderer-service", available: true, priority: 10 },
                {
                    kind: "exporter",
                    available: false,
                    priority: 20,
                    reason: "render.thumbnail uses dashboard thumbnail data/cache semantics, not exporter export-shapes.",
                },
                {
                    kind: "backend-rpc",
                    available: false,
                    priority: 30,
                    reason: "Backend thumbnail RPCs authorize, load, and persist thumbnail data but do not render PNG bytes.",
                },
                {
                    kind: "plugin-live",
                    available: false,
                    priority: 50,
                    reason: "render.thumbnail is a global planning boundary and cannot depend on a live editor plugin session.",
                },
            ],
        });
    }

    private createMcpRenderThumbnailPlan(args: RenderThumbnailArgs): RenderThumbnailRendererServicePlan {
        const plan = createRenderThumbnailRendererServicePlan({
            ...args,
            endpoint: args.endpoint ?? args.rendererServiceUri ?? args.rendererUri ?? process.env.PENPOT_RENDERER_SERVICE_URI ?? null,
            publicUri: args.publicUri ?? process.env.PENPOT_PUBLIC_URI ?? process.env.PENPOT_MCP_PUBLIC_URI ?? null,
            probeTimeoutMs:
                args.probeTimeoutMs ??
                args.timeoutMs ??
                args.rendererServiceTimeoutMs ??
                process.env.PENPOT_RENDERER_SERVICE_TIMEOUT_MS ??
                null,
            clientRequest: {
                entrypoint: "mcp",
                mcpToolName: this.getToolName(),
                mcpSessionId: this.getSessionContext()?.mcpSessionId,
            },
            executionGate: {
                optInValue: args.rendererServiceExecution ?? process.env.PENPOT_RENDER_THUMBNAIL_EXECUTION ?? null,
            },
            optInConfiguration: {
                entrypoint: "mcp",
                mcpArgValue: args.rendererServiceExecution ?? null,
                envValue: process.env.PENPOT_RENDER_THUMBNAIL_EXECUTION ?? null,
            },
        });
        return {
            ...plan,
            diagnostics: {
                ...plan.diagnostics,
                mcpToolRegistered: true,
            },
        };
    }

    private adapterSelectionFailure(selection: CommandAdapterSelection): ToolResponse {
        const error = createAdapterSelectionError(selection, {
            actions: [
                "Use adapter: 'auto' or 'renderer-service' to inspect the planning-only renderer-service request.",
                "Use render.preview or export.page for existing exporter-backed preview/export flows.",
            ],
        });
        return this.error(error.code, error.message, error.actions, error.data);
    }
}
