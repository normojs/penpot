import { z } from "zod";
import type { ToolResponse } from "../ToolResponse.js";
import { PenpotMcpServer } from "../PenpotMcpServer.js";
import { ShapePluginTask } from "../tasks/ShapePluginTask.js";
import { requireBoundFileContext } from "./FileContextGuard.js";
import { PenpotRpcTool, ToolErrorCodes } from "./PenpotRpcTool.js";
import type { ShapeTaskParams } from "@penpot/mcp-common";
import {
    AdapterSelectionReasonCodes,
    CommandDescriptors,
    createAdapterSelectionError,
    getAdapterSelectionReason,
    selectCommandAdapter,
} from "@penpot/command-runtime";
import type { CommandAdapterSelection } from "@penpot/command-runtime";

const coordinateSchema = z.number().min(-100000).max(100000);
const dimensionSchema = z.number().positive().max(100000);
const hexColorSchema = z.string().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/);
const uuidSchema = z.string().uuid();

const solidFillSchema = z.object({
    color: hexColorSchema.describe("Solid fill color as #RGB, #RGBA, #RRGGBB, or #RRGGBBAA."),
    opacity: z.number().min(0).max(1).optional().describe("Fill opacity from 0 to 1. Defaults to 1."),
});
const fillSchema = solidFillSchema.optional();
const fillsSchema = z.array(solidFillSchema).optional();

const solidStrokeSchema = z.object({
    color: hexColorSchema.describe("Stroke color as #RGB, #RGBA, #RRGGBB, or #RRGGBBAA."),
    opacity: z.number().min(0).max(1).optional().describe("Stroke opacity from 0 to 1. Defaults to 1."),
    width: z.number().positive().max(1000).optional().describe("Stroke width in pixels. Defaults to 1."),
    style: z.enum(["solid", "dotted", "dashed"]).optional().describe("Stroke style. Defaults to solid."),
    alignment: z.enum(["center", "inner", "outer"]).optional().describe("Stroke alignment. Defaults to center."),
});
const strokeSchema = solidStrokeSchema.optional();
const strokesSchema = z.array(solidStrokeSchema).optional();

const layoutSchema = z
    .object({
        type: z
            .enum(["none", "flex", "grid"])
            .describe("Container layout mode. Backend-command supports none and flex; grid uses plugin-live."),
        direction: z
            .enum(["row", "row-reverse", "column", "column-reverse"])
            .optional()
            .describe("Flex layout direction. Defaults to the existing direction or row."),
        wrap: z.enum(["wrap", "nowrap"]).optional().describe("Flex wrapping behavior."),
        alignItems: z.enum(["start", "end", "center", "stretch"]).optional().describe("Default item alignment."),
        justifyContent: z
            .enum(["start", "center", "end", "space-between", "space-around", "space-evenly", "stretch"])
            .optional()
            .describe("Content distribution inside the container."),
        rowGap: z.number().min(0).max(10000).optional().describe("Layout row gap in pixels."),
        columnGap: z.number().min(0).max(10000).optional().describe("Layout column gap in pixels."),
        padding: z.number().min(0).max(10000).optional().describe("Uniform container padding in pixels."),
    })
    .optional();

const parentIdSchema = z
    .string()
    .uuid()
    .optional()
    .describe("Optional parent container shape id. When provided, x/y are relative to this parent.");

type PenpotRecord = Record<string, unknown>;
type BackendShapeType = "frame" | "rect" | "text";
type ShapeCreateAdapterArgs = { fileId?: string; pageId?: string; adapter?: string };
type ShapeStyleUpdateFieldArgs = {
    parentId?: string;
    index?: number;
    fills?: NonNullable<ShapeTaskParams["fill"]>[];
    strokes?: NonNullable<ShapeTaskParams["stroke"]>[];
    r1?: number;
    r2?: number;
    r3?: number;
    r4?: number;
};
type ShapeEditAdapterArgs = {
    fileId?: string;
    pageId?: string;
    adapter?: string;
    layout?: ShapeTaskParams["layout"];
} & ShapeStyleUpdateFieldArgs;
type DestructiveShapeArgs = ShapeEditAdapterArgs & { shapeId: string; confirm?: boolean };

function hasBackendOnlyShapeUpdateFields(args: ShapeStyleUpdateFieldArgs): boolean {
    return Boolean(
        args.parentId ||
        args.index !== undefined ||
        args.fills !== undefined ||
        args.strokes !== undefined ||
        args.r1 !== undefined ||
        args.r2 !== undefined ||
        args.r3 !== undefined ||
        args.r4 !== undefined
    );
}

function isBackendShapeLayoutSupported(layout?: ShapeTaskParams["layout"]): boolean {
    return !layout || layout.type === "none" || layout.type === "flex";
}

function toBackendShapeLayout(layout?: ShapeTaskParams["layout"]): PenpotRecord | undefined {
    if (!layout) {
        return undefined;
    }

    return {
        type: layout.type,
        direction: layout.direction,
        wrap: layout.wrap,
        "align-items": layout.alignItems,
        "justify-content": layout.justifyContent,
        "row-gap": layout.rowGap,
        "column-gap": layout.columnGap,
        padding: layout.padding,
    };
}

function normalizeImageMimeType(mimeType: string): string {
    return mimeType === "image/jpg" ? "image/jpeg" : mimeType;
}

abstract class ShapeTool<TArgs extends object> extends PenpotRpcTool<TArgs> {
    protected constructor(mcpServer: PenpotMcpServer, inputSchema: z.ZodRawShape) {
        super(mcpServer, inputSchema);
    }

    protected selectShapeCreateAdapter(command: string, args: ShapeCreateAdapterArgs): CommandAdapterSelection {
        const hasExplicitTarget = Boolean(args.fileId || args.pageId);
        const hasBackendTarget = Boolean(args.fileId && args.pageId);
        return selectCommandAdapter({
            command,
            requestedAdapter: args.adapter ?? "auto",
            candidates: [
                {
                    kind: "backend-command",
                    available: hasBackendTarget,
                    priority: 10,
                    reason: hasBackendTarget
                        ? null
                        : getAdapterSelectionReason(AdapterSelectionReasonCodes.BACKEND_COMMAND_FILE_PAGE_REQUIRED),
                },
                {
                    kind: "plugin-live",
                    available: !hasExplicitTarget,
                    priority: 50,
                    reason: hasExplicitTarget
                        ? getAdapterSelectionReason(AdapterSelectionReasonCodes.PLUGIN_LIVE_OMIT_FILE_PAGE)
                        : null,
                },
            ],
        });
    }

    protected selectShapeEditAdapter(command: string, args: ShapeEditAdapterArgs): CommandAdapterSelection {
        const hasExplicitTarget = Boolean(args.fileId || args.pageId);
        const hasBackendOnlyFields = hasBackendOnlyShapeUpdateFields(args);
        const hasBackendLayout = isBackendShapeLayoutSupported(args.layout);
        const hasBackendTarget = Boolean(args.fileId && hasBackendLayout);
        return selectCommandAdapter({
            command,
            requestedAdapter: args.adapter ?? "auto",
            candidates: [
                {
                    kind: "backend-command",
                    available: hasBackendTarget,
                    priority: 10,
                    reason: hasBackendTarget
                        ? null
                        : args.fileId && !hasBackendLayout
                          ? getAdapterSelectionReason(AdapterSelectionReasonCodes.BACKEND_COMMAND_LAYOUT_UNSUPPORTED)
                          : getAdapterSelectionReason(AdapterSelectionReasonCodes.BACKEND_COMMAND_FILE_ID_REQUIRED),
                },
                {
                    kind: "plugin-live",
                    available: !hasExplicitTarget && !hasBackendOnlyFields,
                    priority: 50,
                    reason: hasExplicitTarget
                        ? getAdapterSelectionReason(AdapterSelectionReasonCodes.PLUGIN_LIVE_OMIT_FILE_PAGE)
                        : hasBackendOnlyFields
                          ? getAdapterSelectionReason(
                                AdapterSelectionReasonCodes.PLUGIN_LIVE_BACKEND_ONLY_SHAPE_FIELDS_UNSUPPORTED
                            )
                          : null,
                },
            ],
        });
    }

    protected adapterSelectionFailure(selection: CommandAdapterSelection): ToolResponse {
        const error = createAdapterSelectionError(selection, {
            actions: [
                "Use adapter: 'auto' to let MCP choose the first available adapter.",
                "Pass the backend-command target ids, or omit fileId and pageId to use plugin-live.",
            ],
        });
        return this.error(error.code, error.message, error.actions, error.data);
    }

    protected destructiveConfirmationRequired(
        toolName: string,
        action: string,
        args: DestructiveShapeArgs,
        adapterSelection: CommandAdapterSelection
    ): ToolResponse | undefined {
        if (!this.mcpServer.isDestructiveConfirmationRequired() || args.confirm === true) {
            return undefined;
        }

        return this.error(
            ToolErrorCodes.DESTRUCTIVE_ACTION_CONFIRMATION_REQUIRED,
            `${toolName} requires explicit confirmation before deleting a shape.`,
            [`Repeat ${toolName} with confirm: true to delete the shape.`],
            {
                tool: toolName,
                action,
                targets: {
                    fileId: args.fileId ?? null,
                    pageId: args.pageId ?? null,
                    shapeId: args.shapeId,
                },
                confirmation: {
                    field: "confirm",
                    value: true,
                },
                adapter: adapterSelection.selected,
                adapterSelection,
                policy: {
                    env: "PENPOT_MCP_REQUIRE_DESTRUCTIVE_CONFIRMATION",
                    default: "remote-or-multi-user",
                },
            }
        );
    }

    protected async executeShapeTask(
        params: ShapeTaskParams,
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

        const task = new ShapePluginTask(params);
        const result = await this.mcpServer.pluginBridge.executePluginTask(task);
        return this.ok({
            ...result.data,
            ...(adapterSelection ? { adapter: adapterSelection.selected, adapterSelection } : {}),
        });
    }

    protected async executeBackendShapeCreate(
        args: ShapeCreateFrameArgs | ShapeCreateRectArgs | ShapeCreateTextArgs,
        type: BackendShapeType,
        adapterSelection: CommandAdapterSelection
    ): Promise<ToolResponse> {
        const userToken = this.getUserToken();
        if (!userToken) {
            return this.authenticationRequired();
        }

        try {
            const result = await this.rpcWritePost<PenpotRecord>(
                "create-file-shape",
                {
                    id: args.fileId,
                    "page-id": args.pageId,
                    "shape-id": args.shapeId,
                    "parent-id": args.parentId,
                    type,
                    name: this.nonEmptyString(args.name),
                    x: args.x,
                    y: args.y,
                    width: args.width,
                    height: args.height,
                    content: "content" in args ? args.content : undefined,
                    fill: args.fill,
                    stroke: "stroke" in args ? args.stroke : undefined,
                    "border-radius": "borderRadius" in args ? args.borderRadius : undefined,
                    "font-size": "fontSize" in args ? args.fontSize : undefined,
                },
                userToken,
                {
                    mcpAdapter: adapterSelection.selected,
                    mcpFileId: args.fileId,
                    mcpPageId: args.pageId,
                    mcpShapeId: args.shapeId,
                }
            );
            return this.ok({
                adapter: adapterSelection.selected,
                adapterSelection,
                fileId: args.fileId,
                shape: result.shape,
                revn: result.revn,
                vern: result.vern,
            });
        } catch (cause) {
            return this.rpcFailure(cause);
        }
    }

    protected async executeBackendShapeCreateImage(
        args: ShapeCreateImageArgs,
        adapterSelection: CommandAdapterSelection
    ): Promise<ToolResponse> {
        const userToken = this.getUserToken();
        if (!userToken) {
            return this.authenticationRequired();
        }

        try {
            const result = await this.rpcWritePost<PenpotRecord>(
                "create-file-image-shape",
                {
                    id: args.fileId,
                    "page-id": args.pageId,
                    "shape-id": args.shapeId,
                    "parent-id": args.parentId,
                    name: this.nonEmptyString(args.name),
                    x: args.x,
                    y: args.y,
                    width: args.width,
                    height: args.height,
                    "image-base64": args.imageBase64,
                    "mime-type": normalizeImageMimeType(args.mimeType),
                },
                userToken,
                {
                    mcpAdapter: adapterSelection.selected,
                    mcpFileId: args.fileId,
                    mcpPageId: args.pageId,
                    mcpShapeId: args.shapeId,
                }
            );
            return this.ok({
                adapter: adapterSelection.selected,
                adapterSelection,
                fileId: args.fileId,
                shape: result.shape,
                media: result.media,
                revn: result.revn,
                vern: result.vern,
            });
        } catch (cause) {
            return this.rpcFailure(cause);
        }
    }

    protected async executeBackendShapeUpdate(
        args: ShapeUpdateArgs,
        adapterSelection: CommandAdapterSelection
    ): Promise<ToolResponse> {
        const userToken = this.getUserToken();
        if (!userToken) {
            return this.authenticationRequired();
        }

        try {
            const result = await this.rpcWritePost<PenpotRecord>(
                "update-file-shape",
                {
                    id: args.fileId,
                    "page-id": args.pageId,
                    "shape-id": args.shapeId,
                    "parent-id": args.parentId,
                    index: args.index,
                    name: this.nonEmptyString(args.name),
                    x: args.x,
                    y: args.y,
                    width: args.width,
                    height: args.height,
                    fill: args.fill,
                    fills: args.fills,
                    stroke: args.stroke,
                    strokes: args.strokes,
                    "border-radius": args.borderRadius,
                    r1: args.r1,
                    r2: args.r2,
                    r3: args.r3,
                    r4: args.r4,
                    content: args.content,
                    "font-size": args.fontSize,
                    layout: toBackendShapeLayout(args.layout),
                },
                userToken,
                {
                    mcpAdapter: adapterSelection.selected,
                    mcpFileId: args.fileId,
                    mcpPageId: args.pageId,
                    mcpShapeId: args.shapeId,
                }
            );
            return this.ok({
                adapter: adapterSelection.selected,
                adapterSelection,
                fileId: args.fileId,
                shape: result.shape,
                revn: result.revn,
                vern: result.vern,
            });
        } catch (cause) {
            return this.rpcFailure(cause);
        }
    }

    protected async executeBackendShapeDelete(
        args: ShapeDeleteArgs,
        adapterSelection: CommandAdapterSelection
    ): Promise<ToolResponse> {
        const userToken = this.getUserToken();
        if (!userToken) {
            return this.authenticationRequired();
        }

        try {
            const result = await this.rpcWritePost<PenpotRecord>(
                "delete-file-shape",
                {
                    id: args.fileId,
                    "page-id": args.pageId,
                    "shape-id": args.shapeId,
                },
                userToken,
                {
                    mcpAdapter: adapterSelection.selected,
                    mcpFileId: args.fileId,
                    mcpPageId: args.pageId,
                    mcpShapeId: args.shapeId,
                }
            );
            return this.ok({
                adapter: adapterSelection.selected,
                adapterSelection,
                fileId: args.fileId,
                shape: result.shape,
                revn: result.revn,
                vern: result.vern,
                deleted: true,
            });
        } catch (cause) {
            return this.rpcFailure(cause);
        }
    }

    protected nonEmptyString(value: unknown): string | undefined {
        return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
    }
}

export class ShapeCreateFrameArgs {
    static schema = {
        fileId: uuidSchema.optional().describe("Optional file id for backend-command headless frame creation."),
        pageId: uuidSchema.optional().describe("Optional page id for backend-command headless frame creation."),
        shapeId: uuidSchema.optional().describe("Optional shape id for backend-command frame creation."),
        adapter: z.string().optional().describe("Optional adapter request: auto, backend-command, or plugin-live."),
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

    fileId?: string;
    pageId?: string;
    shapeId?: string;
    adapter?: string;
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
        return CommandDescriptors.SHAPE_CREATE_FRAME.mcpToolName;
    }

    public getToolDescription(): string {
        return CommandDescriptors.SHAPE_CREATE_FRAME.description;
    }

    protected async executeCore(args: ShapeCreateFrameArgs): Promise<ToolResponse> {
        const adapterSelection = this.selectShapeCreateAdapter(CommandDescriptors.SHAPE_CREATE_FRAME.id, args);
        if (adapterSelection.status !== "selected") {
            return this.adapterSelectionFailure(adapterSelection);
        }

        if (adapterSelection.selected === "backend-command") {
            return this.executeBackendShapeCreate(args, "frame", adapterSelection);
        }

        return this.executeShapeTask(
            {
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
            },
            adapterSelection
        );
    }
}

export class ShapeCreateRectArgs {
    static schema = {
        fileId: uuidSchema.optional().describe("Optional file id for backend-command headless rectangle creation."),
        pageId: uuidSchema.optional().describe("Optional page id for backend-command headless rectangle creation."),
        shapeId: uuidSchema.optional().describe("Optional shape id for backend-command rectangle creation."),
        adapter: z.string().optional().describe("Optional adapter request: auto, backend-command, or plugin-live."),
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

    fileId?: string;
    pageId?: string;
    shapeId?: string;
    adapter?: string;
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
        return CommandDescriptors.SHAPE_CREATE_RECT.mcpToolName;
    }

    public getToolDescription(): string {
        return CommandDescriptors.SHAPE_CREATE_RECT.description;
    }

    protected async executeCore(args: ShapeCreateRectArgs): Promise<ToolResponse> {
        const adapterSelection = this.selectShapeCreateAdapter(CommandDescriptors.SHAPE_CREATE_RECT.id, args);
        if (adapterSelection.status !== "selected") {
            return this.adapterSelectionFailure(adapterSelection);
        }

        if (adapterSelection.selected === "backend-command") {
            return this.executeBackendShapeCreate(args, "rect", adapterSelection);
        }

        return this.executeShapeTask(
            {
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
            },
            adapterSelection
        );
    }
}

export class ShapeCreateTextArgs {
    static schema = {
        fileId: uuidSchema.optional().describe("Optional file id for backend-command headless text creation."),
        pageId: uuidSchema.optional().describe("Optional page id for backend-command headless text creation."),
        shapeId: uuidSchema.optional().describe("Optional shape id for backend-command text creation."),
        adapter: z.string().optional().describe("Optional adapter request: auto, backend-command, or plugin-live."),
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

    fileId?: string;
    pageId?: string;
    shapeId?: string;
    adapter?: string;
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
        return CommandDescriptors.SHAPE_CREATE_TEXT.mcpToolName;
    }

    public getToolDescription(): string {
        return CommandDescriptors.SHAPE_CREATE_TEXT.description;
    }

    protected async executeCore(args: ShapeCreateTextArgs): Promise<ToolResponse> {
        const adapterSelection = this.selectShapeCreateAdapter(CommandDescriptors.SHAPE_CREATE_TEXT.id, args);
        if (adapterSelection.status !== "selected") {
            return this.adapterSelectionFailure(adapterSelection);
        }

        if (adapterSelection.selected === "backend-command") {
            return this.executeBackendShapeCreate(args, "text", adapterSelection);
        }

        return this.executeShapeTask(
            {
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
            },
            adapterSelection
        );
    }
}

export class ShapeCreateImageArgs {
    static schema = {
        fileId: uuidSchema.optional().describe("Optional file id for backend-command headless image creation."),
        pageId: uuidSchema.optional().describe("Optional page id for backend-command headless image creation."),
        shapeId: uuidSchema.optional().describe("Optional shape id for backend-command image creation."),
        adapter: z.string().optional().describe("Optional adapter request: auto, backend-command, or plugin-live."),
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

    fileId?: string;
    pageId?: string;
    shapeId?: string;
    adapter?: string;
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
        return CommandDescriptors.SHAPE_CREATE_IMAGE.mcpToolName;
    }

    public getToolDescription(): string {
        return CommandDescriptors.SHAPE_CREATE_IMAGE.description;
    }

    protected async executeCore(args: ShapeCreateImageArgs): Promise<ToolResponse> {
        const adapterSelection = this.selectShapeCreateAdapter(CommandDescriptors.SHAPE_CREATE_IMAGE.id, args);
        if (adapterSelection.status !== "selected") {
            return this.adapterSelectionFailure(adapterSelection);
        }

        if (adapterSelection.selected === "backend-command") {
            return this.executeBackendShapeCreateImage(args, adapterSelection);
        }

        return this.executeShapeTask(
            {
                action: "createImage",
                parentId: args.parentId,
                name: this.nonEmptyString(args.name),
                x: args.x,
                y: args.y,
                width: args.width,
                height: args.height,
                imageBase64: args.imageBase64,
                mimeType: normalizeImageMimeType(args.mimeType),
            },
            adapterSelection
        );
    }
}

export class ShapeUpdateArgs {
    static schema = {
        fileId: uuidSchema.optional().describe("Optional file id for backend-command headless shape updates."),
        pageId: uuidSchema.optional().describe("Optional page id for backend-command headless shape updates."),
        shapeId: z.string().uuid().describe("Shape id to update."),
        adapter: z.string().optional().describe("Optional adapter request: auto, backend-command, or plugin-live."),
        parentId: parentIdSchema.describe("Optional backend-command target parent frame/root id for moving the shape."),
        index: z.number().int().min(0).optional().describe("Optional backend-command child index when moving parent."),
        name: z.string().min(1).max(250).optional().describe("Optional new shape name."),
        x: coordinateSchema.optional().describe("Optional new x position. Uses parent-relative coordinates."),
        y: coordinateSchema.optional().describe("Optional new y position. Uses parent-relative coordinates."),
        width: dimensionSchema.optional().describe("Optional new width in pixels."),
        height: dimensionSchema.optional().describe("Optional new height in pixels."),
        fill: fillSchema,
        fills: fillsSchema.describe("Optional backend-command fill stack. Overrides fill when supplied."),
        stroke: strokeSchema,
        strokes: strokesSchema.describe("Optional backend-command stroke stack. Overrides stroke when supplied."),
        borderRadius: z.number().min(0).max(10000).optional().describe("Optional corner radius in pixels."),
        r1: z.number().min(0).max(10000).optional().describe("Optional backend-command top-left corner radius."),
        r2: z.number().min(0).max(10000).optional().describe("Optional backend-command top-right corner radius."),
        r3: z.number().min(0).max(10000).optional().describe("Optional backend-command bottom-right corner radius."),
        r4: z.number().min(0).max(10000).optional().describe("Optional backend-command bottom-left corner radius."),
        content: z.string().min(1).max(10000).optional().describe("Optional text content for text shapes."),
        fontSize: z.number().positive().max(512).optional().describe("Optional font size for text shapes."),
        layout: layoutSchema,
    };

    fileId?: string;
    pageId?: string;
    shapeId!: string;
    adapter?: string;
    parentId?: string;
    index?: number;
    name?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    fill?: ShapeTaskParams["fill"];
    fills?: NonNullable<ShapeTaskParams["fill"]>[];
    stroke?: ShapeTaskParams["stroke"];
    strokes?: NonNullable<ShapeTaskParams["stroke"]>[];
    borderRadius?: number;
    r1?: number;
    r2?: number;
    r3?: number;
    r4?: number;
    content?: string;
    fontSize?: number;
    layout?: ShapeTaskParams["layout"];
}

export class ShapeUpdateTool extends ShapeTool<ShapeUpdateArgs> {
    constructor(mcpServer: PenpotMcpServer) {
        super(mcpServer, ShapeUpdateArgs.schema);
    }

    public getToolName(): string {
        return CommandDescriptors.SHAPE_UPDATE.mcpToolName;
    }

    public getToolDescription(): string {
        return CommandDescriptors.SHAPE_UPDATE.description;
    }

    protected async executeCore(args: ShapeUpdateArgs): Promise<ToolResponse> {
        const adapterSelection = this.selectShapeEditAdapter(CommandDescriptors.SHAPE_UPDATE.id, args);
        if (adapterSelection.status !== "selected") {
            return this.adapterSelectionFailure(adapterSelection);
        }

        if (adapterSelection.selected === "backend-command") {
            return this.executeBackendShapeUpdate(args, adapterSelection);
        }

        return this.executeShapeTask(
            {
                action: "update",
                shapeId: args.shapeId,
                name: this.nonEmptyString(args.name),
                x: args.x,
                y: args.y,
                width: args.width,
                height: args.height,
                fill: args.fill,
                stroke: args.stroke,
                borderRadius: args.borderRadius,
                content: args.content,
                fontSize: args.fontSize,
                layout: args.layout,
            },
            adapterSelection
        );
    }
}

export class ShapeDeleteArgs {
    static schema = {
        fileId: uuidSchema.optional().describe("Optional file id for backend-command headless shape deletion."),
        pageId: uuidSchema.optional().describe("Optional page id for backend-command headless shape deletion."),
        shapeId: z.string().uuid().describe("Shape id to delete."),
        adapter: z.string().optional().describe("Optional adapter request: auto, backend-command, or plugin-live."),
        confirm: z
            .boolean()
            .optional()
            .describe("Set to true to confirm this destructive delete action when confirmations are required."),
    };

    fileId?: string;
    pageId?: string;
    shapeId!: string;
    adapter?: string;
    confirm?: boolean;
}

export class ShapeDeleteTool extends ShapeTool<ShapeDeleteArgs> {
    constructor(mcpServer: PenpotMcpServer) {
        super(mcpServer, ShapeDeleteArgs.schema);
    }

    public getToolName(): string {
        return CommandDescriptors.SHAPE_DELETE.mcpToolName;
    }

    public getToolDescription(): string {
        return CommandDescriptors.SHAPE_DELETE.description;
    }

    protected async executeCore(args: ShapeDeleteArgs): Promise<ToolResponse> {
        const adapterSelection = this.selectShapeEditAdapter(CommandDescriptors.SHAPE_DELETE.id, args);
        if (adapterSelection.status !== "selected") {
            return this.adapterSelectionFailure(adapterSelection);
        }

        const confirmationError = this.destructiveConfirmationRequired(
            CommandDescriptors.SHAPE_DELETE.id,
            "delete_shape",
            args,
            adapterSelection
        );
        if (confirmationError) {
            return confirmationError;
        }

        if (adapterSelection.selected === "backend-command") {
            return this.executeBackendShapeDelete(args, adapterSelection);
        }

        return this.executeShapeTask(
            {
                action: "delete",
                shapeId: args.shapeId,
            },
            adapterSelection
        );
    }
}
