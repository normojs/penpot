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
    getAdapterSelectionReason,
    selectCommandAdapter,
} from "@penpot/command-runtime";
import type { CommandAdapterSelection } from "@penpot/command-runtime";

const uuidSchema = z.string().uuid();
const formatSchema = z.enum(["png", "jpeg", "svg", "pdf"]);
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
