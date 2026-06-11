import { z } from "zod";
import { Tool } from "../Tool.js";
import type { ToolResponse } from "../ToolResponse.js";
import { JsonResponse } from "../ToolResponse.js";
import { PenpotMcpServer } from "../PenpotMcpServer.js";
import { ShapePluginTask } from "../tasks/ShapePluginTask.js";
import { ToolNames } from "../ToolNames.js";
import { requireBoundFileContext } from "./FileContextGuard.js";
import type { PluginTaskResult, ShapeTaskParams, ShapeTaskResultData } from "@penpot/mcp-common";

const coordinateSchema = z.number().min(-100000).max(100000);
const dimensionSchema = z.number().positive().max(100000);
const hexColorSchema = z.string().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/);

const fillSchema = z
    .object({
        color: hexColorSchema.describe("Solid fill color as #RGB, #RGBA, #RRGGBB, or #RRGGBBAA."),
        opacity: z.number().min(0).max(1).optional().describe("Fill opacity from 0 to 1. Defaults to 1."),
    })
    .optional();

const strokeSchema = z
    .object({
        color: hexColorSchema.describe("Stroke color as #RGB, #RGBA, #RRGGBB, or #RRGGBBAA."),
        opacity: z.number().min(0).max(1).optional().describe("Stroke opacity from 0 to 1. Defaults to 1."),
        width: z.number().positive().max(1000).optional().describe("Stroke width in pixels. Defaults to 1."),
        style: z.enum(["solid", "dotted", "dashed"]).optional().describe("Stroke style. Defaults to solid."),
        alignment: z.enum(["center", "inner", "outer"]).optional().describe("Stroke alignment. Defaults to center."),
    })
    .optional();

const parentIdSchema = z
    .string()
    .uuid()
    .optional()
    .describe("Optional parent container shape id. When provided, x/y are relative to this parent.");

abstract class ShapeTool<TArgs extends object> extends Tool<TArgs> {
    protected constructor(mcpServer: PenpotMcpServer, inputSchema: z.ZodRawShape) {
        super(mcpServer, inputSchema);
    }

    protected async executeShapeTask(params: ShapeTaskParams): Promise<ToolResponse> {
        const contextError = requireBoundFileContext(
            this.mcpServer,
            this.getSessionContext()?.userToken,
            this.getToolName()
        );
        if (contextError) {
            return contextError;
        }

        const task = new ShapePluginTask(params);
        const result = await this.mcpServer.pluginBridge.executePluginTask(task);
        return this.ok(result);
    }

    protected nonEmptyString(value: unknown): string | undefined {
        return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
    }

    private ok(result: PluginTaskResult<ShapeTaskResultData>): ToolResponse {
        return new JsonResponse({
            status: "ok",
            data: result.data,
        });
    }
}

export class ShapeCreateFrameArgs {
    static schema = {
        parentId: parentIdSchema,
        name: z.string().min(1).max(250).optional().describe("Optional frame name."),
        x: coordinateSchema.describe("Frame x position. Relative to parentId when provided."),
        y: coordinateSchema.describe("Frame y position. Relative to parentId when provided."),
        width: dimensionSchema.describe("Frame width in pixels."),
        height: dimensionSchema.describe("Frame height in pixels."),
        fill: fillSchema,
        stroke: strokeSchema,
        borderRadius: z.number().min(0).max(10000).optional().describe("Frame corner radius in pixels."),
    };

    parentId?: string;
    name?: string;
    x!: number;
    y!: number;
    width!: number;
    height!: number;
    fill?: ShapeTaskParams["fill"];
    stroke?: ShapeTaskParams["stroke"];
    borderRadius?: number;
}

export class ShapeCreateFrameTool extends ShapeTool<ShapeCreateFrameArgs> {
    constructor(mcpServer: PenpotMcpServer) {
        super(mcpServer, ShapeCreateFrameArgs.schema);
    }

    public getToolName(): string {
        return ToolNames.SHAPE_CREATE_FRAME;
    }

    public getToolDescription(): string {
        return "Creates a frame in the currently bound Penpot file context.";
    }

    protected async executeCore(args: ShapeCreateFrameArgs): Promise<ToolResponse> {
        return this.executeShapeTask({
            action: "createFrame",
            parentId: args.parentId,
            name: this.nonEmptyString(args.name),
            x: args.x,
            y: args.y,
            width: args.width,
            height: args.height,
            fill: args.fill,
            stroke: args.stroke,
            borderRadius: args.borderRadius,
        });
    }
}

export class ShapeCreateRectArgs {
    static schema = {
        parentId: parentIdSchema,
        name: z.string().min(1).max(250).optional().describe("Optional rectangle name."),
        x: coordinateSchema.describe("Rectangle x position. Relative to parentId when provided."),
        y: coordinateSchema.describe("Rectangle y position. Relative to parentId when provided."),
        width: dimensionSchema.describe("Rectangle width in pixels."),
        height: dimensionSchema.describe("Rectangle height in pixels."),
        fill: fillSchema,
        stroke: strokeSchema,
        borderRadius: z.number().min(0).max(10000).optional().describe("Rectangle corner radius in pixels."),
    };

    parentId?: string;
    name?: string;
    x!: number;
    y!: number;
    width!: number;
    height!: number;
    fill?: ShapeTaskParams["fill"];
    stroke?: ShapeTaskParams["stroke"];
    borderRadius?: number;
}

export class ShapeCreateRectTool extends ShapeTool<ShapeCreateRectArgs> {
    constructor(mcpServer: PenpotMcpServer) {
        super(mcpServer, ShapeCreateRectArgs.schema);
    }

    public getToolName(): string {
        return ToolNames.SHAPE_CREATE_RECT;
    }

    public getToolDescription(): string {
        return "Creates a rectangle in the currently bound Penpot file context.";
    }

    protected async executeCore(args: ShapeCreateRectArgs): Promise<ToolResponse> {
        return this.executeShapeTask({
            action: "createRect",
            parentId: args.parentId,
            name: this.nonEmptyString(args.name),
            x: args.x,
            y: args.y,
            width: args.width,
            height: args.height,
            fill: args.fill,
            stroke: args.stroke,
            borderRadius: args.borderRadius,
        });
    }
}

export class ShapeCreateTextArgs {
    static schema = {
        parentId: parentIdSchema,
        name: z.string().min(1).max(250).optional().describe("Optional text layer name."),
        x: coordinateSchema.describe("Text x position. Relative to parentId when provided."),
        y: coordinateSchema.describe("Text y position. Relative to parentId when provided."),
        width: dimensionSchema.optional().describe("Optional text box width in pixels."),
        height: dimensionSchema.optional().describe("Optional text box height in pixels."),
        content: z.string().min(1).max(10000).describe("Text content."),
        fill: fillSchema,
        fontSize: z.number().positive().max(512).optional().describe("Optional text font size in pixels."),
    };

    parentId?: string;
    name?: string;
    x!: number;
    y!: number;
    width?: number;
    height?: number;
    content!: string;
    fill?: ShapeTaskParams["fill"];
    fontSize?: number;
}

export class ShapeCreateTextTool extends ShapeTool<ShapeCreateTextArgs> {
    constructor(mcpServer: PenpotMcpServer) {
        super(mcpServer, ShapeCreateTextArgs.schema);
    }

    public getToolName(): string {
        return ToolNames.SHAPE_CREATE_TEXT;
    }

    public getToolDescription(): string {
        return "Creates a text layer in the currently bound Penpot file context.";
    }

    protected async executeCore(args: ShapeCreateTextArgs): Promise<ToolResponse> {
        return this.executeShapeTask({
            action: "createText",
            parentId: args.parentId,
            name: this.nonEmptyString(args.name),
            x: args.x,
            y: args.y,
            width: args.width,
            height: args.height,
            content: args.content,
            fill: args.fill,
            fontSize: args.fontSize,
        });
    }
}

export class ShapeCreateImageArgs {
    static schema = {
        parentId: parentIdSchema,
        name: z.string().min(1).max(250).optional().describe("Optional image layer name."),
        x: coordinateSchema.describe("Image x position. Relative to parentId when provided."),
        y: coordinateSchema.describe("Image y position. Relative to parentId when provided."),
        width: dimensionSchema
            .optional()
            .describe("Optional image width in pixels. Preserves aspect ratio if height is omitted."),
        height: dimensionSchema
            .optional()
            .describe("Optional image height in pixels. Preserves aspect ratio if width is omitted."),
        imageBase64: z.string().min(1).max(20000000).describe("Base64-encoded image bytes, without a data URL prefix."),
        mimeType: z
            .enum(["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif", "image/svg+xml"])
            .describe("Image MIME type."),
    };

    parentId?: string;
    name?: string;
    x!: number;
    y!: number;
    width?: number;
    height?: number;
    imageBase64!: string;
    mimeType!: string;
}

export class ShapeCreateImageTool extends ShapeTool<ShapeCreateImageArgs> {
    constructor(mcpServer: PenpotMcpServer) {
        super(mcpServer, ShapeCreateImageArgs.schema);
    }

    public getToolName(): string {
        return ToolNames.SHAPE_CREATE_IMAGE;
    }

    public getToolDescription(): string {
        return "Creates an image-backed rectangle in the currently bound Penpot file context.";
    }

    protected async executeCore(args: ShapeCreateImageArgs): Promise<ToolResponse> {
        return this.executeShapeTask({
            action: "createImage",
            parentId: args.parentId,
            name: this.nonEmptyString(args.name),
            x: args.x,
            y: args.y,
            width: args.width,
            height: args.height,
            imageBase64: args.imageBase64,
            mimeType: args.mimeType,
        });
    }
}
