import { z } from "zod";
import { Tool } from "../Tool.js";
import type { ToolResponse } from "../ToolResponse.js";
import { JsonResponse } from "../ToolResponse.js";
import { PenpotMcpServer } from "../PenpotMcpServer.js";
import { ExportPluginTask } from "../tasks/ExportPluginTask.js";
import { ToolNames } from "../ToolNames.js";
import { requireBoundFileContext } from "./FileContextGuard.js";
import type { ExportTaskParams, ExportTaskResultData, PluginTaskResult } from "@penpot/mcp-common";

const uuidSchema = z.string().uuid();
const formatSchema = z.enum(["png", "jpeg", "svg", "pdf"]);
const scaleSchema = z.number().positive().max(16).optional().describe("Export scale for bitmap formats.");

abstract class ExportTool<TArgs extends object> extends Tool<TArgs> {
    protected constructor(mcpServer: PenpotMcpServer, inputSchema: z.ZodRawShape) {
        super(mcpServer, inputSchema);
    }

    protected async executeExportTask(params: ExportTaskParams): Promise<ToolResponse> {
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
        return this.ok(result);
    }

    private ok(result: PluginTaskResult<ExportTaskResultData>): ToolResponse {
        return new JsonResponse({
            status: "ok",
            data: result.data,
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
        return ToolNames.EXPORT_SHAPE;
    }

    public getToolDescription(): string {
        return "Exports an explicit shape or the current selection from the bound Penpot file context as base64 data.";
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
        return ToolNames.EXPORT_PAGE;
    }

    public getToolDescription(): string {
        return "Exports a page from the bound Penpot file context as base64 data.";
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
        shapeId: uuidSchema.optional().describe("Shape id when target is shape."),
        pageId: uuidSchema.optional().describe("Page id when target is page."),
        scale: scaleSchema,
    };

    target?: ExportTaskParams["target"];
    shapeId?: string;
    pageId?: string;
    scale?: number;
}

export class RenderPreviewTool extends ExportTool<RenderPreviewArgs> {
    constructor(mcpServer: PenpotMcpServer) {
        super(mcpServer, RenderPreviewArgs.schema);
    }

    public getToolName(): string {
        return ToolNames.RENDER_PREVIEW;
    }

    public getToolDescription(): string {
        return "Renders a PNG preview for a page, shape, or selection in the bound Penpot file context.";
    }

    protected async executeCore(args: RenderPreviewArgs): Promise<ToolResponse> {
        return this.executeExportTask({
            action: "renderPreview",
            target: args.target,
            shapeId: args.shapeId,
            pageId: args.pageId,
            format: "png",
            scale: args.scale,
        });
    }
}
