import { z } from "zod";
import type { ToolResponse } from "../ToolResponse.js";
import { PenpotMcpServer } from "../PenpotMcpServer.js";
import { PrototypePluginTask } from "../tasks/PrototypePluginTask.js";
import { requireBoundFileContext } from "./FileContextGuard.js";
import type { PrototypeTaskParams } from "@penpot/mcp-common";
import { PenpotRpcTool } from "./PenpotRpcTool.js";
import type { RpcParams } from "../PenpotRpcClient.js";
import {
    AdapterSelectionReasonCodes,
    CommandDescriptors,
    createAdapterSelectionError,
    getAdapterSelectionReason,
    selectCommandAdapter,
} from "@penpot/command-runtime";
import type { CommandAdapterSelection } from "@penpot/command-runtime";

const uuidSchema = z.string().uuid();
const pointSchema = z.object({
    x: z.number().finite().describe("X coordinate."),
    y: z.number().finite().describe("Y coordinate."),
});

const animationSchema = z
    .object({
        type: z.enum(["dissolve", "slide", "push"]).describe("Prototype transition animation type."),
        duration: z.number().min(0).max(60000).describe("Animation duration in milliseconds."),
        easing: z
            .enum(["linear", "ease", "ease-in", "ease-out", "ease-in-out"])
            .optional()
            .describe("Animation easing."),
        direction: z.enum(["right", "left", "up", "down"]).optional().describe("Slide or push direction."),
        way: z.enum(["in", "out"]).optional().describe("Slide direction mode. Defaults to in."),
        offsetEffect: z.boolean().optional().describe("Whether slide uses the offset effect."),
    })
    .optional();

type PenpotRecord = Record<string, unknown>;
type PrototypeAdapterArgs = { fileId?: string; pageId?: string; adapter?: string };
type PrototypeInteractionTargetArgs = PrototypeAdapterArgs & {
    interactionId?: string;
    sourceShapeId?: string;
    interactionIndex?: number;
};

function toBackendAnimation(animation?: PrototypeTaskParams["animation"]): PenpotRecord | undefined {
    if (!animation) {
        return undefined;
    }
    return {
        type: animation.type,
        duration: animation.duration,
        ...(animation.easing ? { easing: animation.easing } : {}),
        ...(animation.direction ? { direction: animation.direction } : {}),
        ...(animation.way ? { way: animation.way } : {}),
        ...(animation.offsetEffect !== undefined ? { "offset-effect": animation.offsetEffect } : {}),
    };
}

function hasPrototypeInteractionTarget(args: PrototypeInteractionTargetArgs): boolean {
    return Boolean(args.interactionId || (args.sourceShapeId && args.interactionIndex !== undefined));
}

function toBackendPrototypeTargetParams(args: PrototypeInteractionTargetArgs): RpcParams {
    const params: RpcParams = {
        id: args.fileId,
    };
    if (args.pageId !== undefined) params["page-id"] = args.pageId;
    if (args.interactionId !== undefined) params["interaction-id"] = args.interactionId;
    if (args.sourceShapeId !== undefined) params["source-shape-id"] = args.sourceShapeId;
    if (args.interactionIndex !== undefined) params["interaction-index"] = args.interactionIndex;
    return params;
}

abstract class PrototypeTool<TArgs extends object> extends PenpotRpcTool<TArgs> {
    protected constructor(mcpServer: PenpotMcpServer, inputSchema: z.ZodRawShape) {
        super(mcpServer, inputSchema);
    }

    protected selectPrototypeAdapter(command: string, args: PrototypeAdapterArgs): CommandAdapterSelection {
        const hasExplicitTarget = Boolean(args.fileId || args.pageId);
        const hasBackendTarget = Boolean(args.fileId);
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
                        : getAdapterSelectionReason(AdapterSelectionReasonCodes.BACKEND_COMMAND_FILE_ID_REQUIRED),
                },
                {
                    kind: "plugin-live",
                    available: !hasExplicitTarget,
                    priority: 50,
                    reason: hasExplicitTarget
                        ? getAdapterSelectionReason(AdapterSelectionReasonCodes.PLUGIN_LIVE_OMIT_FILE_ID)
                        : null,
                },
            ],
        });
    }

    protected selectPrototypeReadAdapter(command: string, args: PrototypeAdapterArgs): CommandAdapterSelection {
        const hasBackendTarget = Boolean(args.fileId);
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
                        : getAdapterSelectionReason(AdapterSelectionReasonCodes.BACKEND_COMMAND_FILE_ID_REQUIRED),
                },
                {
                    kind: "plugin-live",
                    available: false,
                    priority: 50,
                    reason: getAdapterSelectionReason(AdapterSelectionReasonCodes.PLUGIN_LIVE_WORKSPACE_STATE_REQUIRED),
                },
            ],
        });
    }

    protected selectPrototypeMutationAdapter(command: string, args: PrototypeAdapterArgs): CommandAdapterSelection {
        const hasBackendTarget = Boolean(args.fileId);
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
                        : getAdapterSelectionReason(AdapterSelectionReasonCodes.BACKEND_COMMAND_FILE_ID_REQUIRED),
                },
                {
                    kind: "plugin-live",
                    available: false,
                    priority: 50,
                    reason: getAdapterSelectionReason(AdapterSelectionReasonCodes.PLUGIN_LIVE_WORKSPACE_STATE_REQUIRED),
                },
            ],
        });
    }

    protected adapterSelectionFailure(selection: CommandAdapterSelection): ToolResponse {
        const error = createAdapterSelectionError(selection, {
            actions: [
                "Use adapter: 'auto' to let MCP choose the first available adapter.",
                "Pass fileId for backend-command, or omit fileId and pageId to use plugin-live.",
            ],
        });
        return this.error(error.code, error.message, error.actions, error.data);
    }

    protected async executePrototypeTask(
        params: PrototypeTaskParams,
        adapterSelection: CommandAdapterSelection
    ): Promise<ToolResponse> {
        const contextError = requireBoundFileContext(
            this.mcpServer,
            this.getSessionContext()?.userToken,
            this.getToolName()
        );
        if (contextError) {
            return contextError;
        }

        const task = new PrototypePluginTask(params);
        const result = await this.mcpServer.pluginBridge.executePluginTask(task);
        return this.ok({
            ...result.data,
            adapter: adapterSelection.selected,
            adapterSelection,
        });
    }

    protected async executeBackendPrototypeFlow(
        args: PrototypeCreateFlowArgs,
        adapterSelection: CommandAdapterSelection
    ): Promise<ToolResponse> {
        const userToken = this.getUserToken();
        if (!userToken) {
            return this.authenticationRequired();
        }

        const name = this.nonEmptyString(args.name);
        if (!name) {
            return this.error("prototype_name_required", "prototype.create_flow requires a non-empty name.", [
                "Pass a non-empty name.",
            ]);
        }

        try {
            const result = await this.rpcWritePost<PenpotRecord>(
                "create-file-prototype-flow",
                {
                    id: args.fileId,
                    "page-id": args.pageId,
                    "flow-id": args.flowId,
                    name,
                    "starting-board-id": args.startingBoardId,
                },
                userToken,
                {
                    mcpAdapter: adapterSelection.selected,
                    mcpFileId: args.fileId,
                    mcpPageId: args.pageId,
                    mcpShapeId: args.startingBoardId,
                }
            );
            return this.ok({
                adapter: adapterSelection.selected,
                adapterSelection,
                fileId: args.fileId,
                flow: result.flow,
                revn: result.revn,
                vern: result.vern,
            });
        } catch (cause) {
            return this.rpcFailure(cause);
        }
    }

    protected async executeBackendPrototypeInteraction(
        args: PrototypeCreateInteractionArgs,
        adapterSelection: CommandAdapterSelection
    ): Promise<ToolResponse> {
        const userToken = this.getUserToken();
        if (!userToken) {
            return this.authenticationRequired();
        }

        try {
            const result = await this.rpcWritePost<PenpotRecord>(
                "create-file-prototype-interaction",
                {
                    id: args.fileId,
                    "page-id": args.pageId,
                    "source-shape-id": args.sourceShapeId,
                    "destination-board-id": args.destinationBoardId,
                    trigger: args.trigger,
                    delay: args.delay,
                    "preserve-scroll-position": args.preserveScrollPosition,
                    animation: toBackendAnimation(args.animation),
                },
                userToken,
                {
                    mcpAdapter: adapterSelection.selected,
                    mcpFileId: args.fileId,
                    mcpPageId: args.pageId,
                    mcpShapeId: args.sourceShapeId,
                }
            );
            return this.ok({
                adapter: adapterSelection.selected,
                adapterSelection,
                fileId: args.fileId,
                interaction: result.interaction,
                revn: result.revn,
                vern: result.vern,
            });
        } catch (cause) {
            return this.rpcFailure(cause);
        }
    }

    protected async executeBackendPrototypeDeleteInteraction(
        args: PrototypeDeleteInteractionArgs,
        adapterSelection: CommandAdapterSelection
    ): Promise<ToolResponse> {
        const userToken = this.getUserToken();
        if (!userToken) {
            return this.authenticationRequired();
        }

        try {
            const params: RpcParams = {
                id: args.fileId,
            };
            if (args.pageId !== undefined) params["page-id"] = args.pageId;
            if (args.interactionId !== undefined) params["interaction-id"] = args.interactionId;
            if (args.sourceShapeId !== undefined) params["source-shape-id"] = args.sourceShapeId;
            if (args.interactionIndex !== undefined) params["interaction-index"] = args.interactionIndex;

            const result = await this.rpcWritePost<PenpotRecord>(
                "delete-file-prototype-interaction",
                params,
                userToken,
                {
                    mcpAdapter: adapterSelection.selected,
                    mcpFileId: args.fileId,
                    mcpPageId: args.pageId,
                    mcpShapeId: args.sourceShapeId,
                }
            );
            const interaction = (result.interaction ?? {}) as PenpotRecord;
            return this.ok({
                adapter: adapterSelection.selected,
                adapterSelection,
                fileId: args.fileId,
                pageId: args.pageId,
                interactionId: args.interactionId ?? interaction.interactionId ?? interaction["interaction-id"],
                sourceShapeId: args.sourceShapeId ?? interaction.sourceShapeId ?? interaction["source-shape-id"],
                interactionIndex: args.interactionIndex ?? interaction.index,
                interaction: result.interaction,
                revn: result.revn,
                vern: result.vern,
            });
        } catch (cause) {
            return this.rpcFailure(cause);
        }
    }

    protected async executeBackendPrototypeUpdateInteraction(
        args: PrototypeUpdateInteractionArgs,
        adapterSelection: CommandAdapterSelection
    ): Promise<ToolResponse> {
        const userToken = this.getUserToken();
        if (!userToken) {
            return this.authenticationRequired();
        }

        try {
            const params: RpcParams = {
                ...toBackendPrototypeTargetParams(args),
            };
            if (args.destinationBoardId !== undefined) params["destination-board-id"] = args.destinationBoardId;
            if (args.relativeToShapeId !== undefined) params["relative-to-shape-id"] = args.relativeToShapeId;
            if (args.overlayPositionType !== undefined) params["overlay-position-type"] = args.overlayPositionType;
            if (args.manualPosition !== undefined) params["manual-position"] = args.manualPosition;
            if (args.closeClickOutside !== undefined) params["close-click-outside"] = args.closeClickOutside;
            if (args.backgroundOverlay !== undefined) params["background-overlay"] = args.backgroundOverlay;
            if (args.trigger !== undefined) params.trigger = args.trigger;
            if (args.delay !== undefined) params.delay = args.delay;
            if (args.preserveScrollPosition !== undefined) {
                params["preserve-scroll-position"] = args.preserveScrollPosition;
            }
            if (args.animation !== undefined)
                params.animation = toBackendAnimation(args.animation ?? undefined) ?? null;

            const result = await this.rpcWritePost<PenpotRecord>(
                "update-file-prototype-interaction",
                params,
                userToken,
                {
                    mcpAdapter: adapterSelection.selected,
                    mcpFileId: args.fileId,
                    mcpPageId: args.pageId,
                    mcpShapeId: args.sourceShapeId,
                }
            );
            const interaction = (result.interaction ?? {}) as PenpotRecord;
            return this.ok({
                adapter: adapterSelection.selected,
                adapterSelection,
                fileId: args.fileId,
                pageId: args.pageId,
                interactionId: args.interactionId ?? interaction.interactionId ?? interaction["interaction-id"],
                sourceShapeId: args.sourceShapeId ?? interaction.sourceShapeId ?? interaction["source-shape-id"],
                interactionIndex: args.interactionIndex ?? interaction.index,
                interaction: result.interaction,
                revn: result.revn,
                vern: result.vern,
            });
        } catch (cause) {
            return this.rpcFailure(cause);
        }
    }

    protected async executeBackendPrototypeReorderInteraction(
        args: PrototypeReorderInteractionArgs,
        adapterSelection: CommandAdapterSelection
    ): Promise<ToolResponse> {
        const userToken = this.getUserToken();
        if (!userToken) {
            return this.authenticationRequired();
        }

        try {
            const result = await this.rpcWritePost<PenpotRecord>(
                "reorder-file-prototype-interaction",
                {
                    ...toBackendPrototypeTargetParams(args),
                    "to-index": args.toIndex,
                },
                userToken,
                {
                    mcpAdapter: adapterSelection.selected,
                    mcpFileId: args.fileId,
                    mcpPageId: args.pageId,
                    mcpShapeId: args.sourceShapeId,
                }
            );
            const interaction = (result.interaction ?? {}) as PenpotRecord;
            return this.ok({
                adapter: adapterSelection.selected,
                adapterSelection,
                fileId: args.fileId,
                pageId: args.pageId,
                interactionId: args.interactionId ?? interaction.interactionId ?? interaction["interaction-id"],
                sourceShapeId: args.sourceShapeId ?? interaction.sourceShapeId ?? interaction["source-shape-id"],
                interactionIndex: interaction.index ?? args.toIndex,
                interaction: result.interaction,
                revn: result.revn,
                vern: result.vern,
            });
        } catch (cause) {
            return this.rpcFailure(cause);
        }
    }

    protected async executeBackendPrototypeDuplicateInteraction(
        args: PrototypeDuplicateInteractionArgs,
        adapterSelection: CommandAdapterSelection
    ): Promise<ToolResponse> {
        const userToken = this.getUserToken();
        if (!userToken) {
            return this.authenticationRequired();
        }

        try {
            const params: RpcParams = {
                ...toBackendPrototypeTargetParams(args),
            };
            if (args.insertionIndex !== undefined) params["insertion-index"] = args.insertionIndex;

            const result = await this.rpcWritePost<PenpotRecord>(
                "duplicate-file-prototype-interaction",
                params,
                userToken,
                {
                    mcpAdapter: adapterSelection.selected,
                    mcpFileId: args.fileId,
                    mcpPageId: args.pageId,
                    mcpShapeId: args.sourceShapeId,
                }
            );
            const interaction = (result.interaction ?? {}) as PenpotRecord;
            return this.ok({
                adapter: adapterSelection.selected,
                adapterSelection,
                fileId: args.fileId,
                pageId: args.pageId,
                interactionId: interaction.interactionId ?? interaction["interaction-id"],
                sourceShapeId: args.sourceShapeId ?? interaction.sourceShapeId ?? interaction["source-shape-id"],
                interactionIndex: interaction.index ?? args.insertionIndex,
                interaction: result.interaction,
                revn: result.revn,
                vern: result.vern,
            });
        } catch (cause) {
            return this.rpcFailure(cause);
        }
    }

    protected async executeBackendPrototypeOverlay(
        args: PrototypeCreateOverlayArgs,
        adapterSelection: CommandAdapterSelection
    ): Promise<ToolResponse> {
        const userToken = this.getUserToken();
        if (!userToken) {
            return this.authenticationRequired();
        }

        try {
            const result = await this.rpcWritePost<PenpotRecord>(
                "create-file-prototype-overlay",
                {
                    id: args.fileId,
                    "page-id": args.pageId,
                    "source-shape-id": args.sourceShapeId,
                    "action-type": args.actionType,
                    "destination-board-id": args.destinationBoardId,
                    "relative-to-shape-id": args.relativeToShapeId,
                    "overlay-position-type": args.overlayPositionType,
                    "manual-position": args.manualPosition,
                    "close-click-outside": args.closeClickOutside,
                    "background-overlay": args.backgroundOverlay,
                    trigger: args.trigger,
                    delay: args.delay,
                    animation: toBackendAnimation(args.animation),
                },
                userToken,
                {
                    mcpAdapter: adapterSelection.selected,
                    mcpFileId: args.fileId,
                    mcpPageId: args.pageId,
                    mcpShapeId: args.sourceShapeId,
                }
            );
            return this.ok({
                adapter: adapterSelection.selected,
                adapterSelection,
                fileId: args.fileId,
                pageId: args.pageId,
                sourceShapeId: args.sourceShapeId,
                interaction: result.interaction,
                revn: result.revn,
                vern: result.vern,
            });
        } catch (cause) {
            return this.rpcFailure(cause);
        }
    }

    protected async executeBackendPrototypeList(
        args: PrototypeListInteractionsArgs,
        adapterSelection: CommandAdapterSelection
    ): Promise<ToolResponse> {
        const userToken = this.getUserToken();
        if (!userToken) {
            return this.authenticationRequired();
        }

        try {
            const result = await this.rpcGet<PenpotRecord>(
                "get-file-prototype-interactions",
                {
                    id: args.fileId,
                    "page-id": args.pageId,
                    "flow-id": args.flowId,
                    "source-shape-id": args.sourceShapeId,
                },
                userToken
            );
            return this.ok({
                adapter: adapterSelection.selected,
                adapterSelection,
                fileId: args.fileId,
                pageId: args.pageId,
                flowId: args.flowId,
                sourceShapeId: args.sourceShapeId,
                flows: result.flows ?? [],
                interactions: result.interactions ?? [],
            });
        } catch (cause) {
            return this.rpcFailure(cause);
        }
    }

    protected nonEmptyString(value: unknown): string | undefined {
        return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
    }
}

export class PrototypeDeleteInteractionArgs {
    static schema = {
        fileId: uuidSchema.describe("File id for backend-command prototype interaction deletion."),
        pageId: uuidSchema.optional().describe("Optional page id used to resolve the source shape."),
        interactionId: uuidSchema.optional().describe("Stable interaction id returned by prototype.list_interactions."),
        sourceShapeId: uuidSchema
            .optional()
            .describe(
                "Shape id that owns the interaction. Required for source/index deletion and optional guard for stable-id deletion."
            ),
        interactionIndex: z
            .number()
            .int()
            .min(0)
            .optional()
            .describe(
                "Zero-based source index. Required for source/index deletion and optional guard for stable-id deletion."
            ),
        adapter: z.string().optional().describe("Optional adapter request: auto or backend-command."),
    };

    fileId!: string;
    pageId?: string;
    interactionId?: string;
    sourceShapeId?: string;
    interactionIndex?: number;
    adapter?: string;
}

export class PrototypeDeleteInteractionTool extends PrototypeTool<PrototypeDeleteInteractionArgs> {
    constructor(mcpServer: PenpotMcpServer) {
        super(mcpServer, PrototypeDeleteInteractionArgs.schema);
    }

    public getToolName(): string {
        return CommandDescriptors.PROTOTYPE_DELETE_INTERACTION.mcpToolName;
    }

    public getToolDescription(): string {
        return CommandDescriptors.PROTOTYPE_DELETE_INTERACTION.description;
    }

    protected async executeCore(args: PrototypeDeleteInteractionArgs): Promise<ToolResponse> {
        if (!args.interactionId && (!args.sourceShapeId || args.interactionIndex === undefined)) {
            return this.error(
                "prototype_interaction_target_required",
                "prototype.delete_interaction requires interactionId or sourceShapeId plus interactionIndex.",
                [
                    "Use prototype.list_interactions first, then pass interactionId for stable-id deletion.",
                    "For legacy deletion, pass sourceShapeId and interactionIndex.",
                ]
            );
        }

        const adapterSelection = this.selectPrototypeMutationAdapter(
            CommandDescriptors.PROTOTYPE_DELETE_INTERACTION.id,
            args
        );
        if (adapterSelection.status !== "selected") {
            return this.adapterSelectionFailure(adapterSelection);
        }

        return this.executeBackendPrototypeDeleteInteraction(args, adapterSelection);
    }
}

export class PrototypeUpdateInteractionArgs {
    static schema = {
        fileId: uuidSchema.describe("File id for backend-command prototype interaction update."),
        pageId: uuidSchema.optional().describe("Optional page id used to resolve the source shape."),
        interactionId: uuidSchema.optional().describe("Stable interaction id returned by prototype.list_interactions."),
        sourceShapeId: uuidSchema
            .optional()
            .describe(
                "Shape id that owns the interaction. Required for source/index update and optional guard for stable-id update."
            ),
        interactionIndex: z
            .number()
            .int()
            .min(0)
            .optional()
            .describe(
                "Zero-based source index. Required for source/index update and optional guard for stable-id update."
            ),
        destinationBoardId: uuidSchema.nullable().optional().describe("Destination board/frame id."),
        relativeToShapeId: uuidSchema.nullable().optional().describe("Overlay relative-to shape id, or null to clear."),
        overlayPositionType: z
            .enum([
                "center",
                "manual",
                "top-left",
                "top-right",
                "top-center",
                "bottom-left",
                "bottom-right",
                "bottom-center",
            ])
            .optional()
            .describe("Overlay positioning mode."),
        manualPosition: pointSchema.nullable().optional().describe("Manual overlay position."),
        closeClickOutside: z.boolean().optional().describe("Whether clicking outside closes the overlay."),
        backgroundOverlay: z.boolean().optional().describe("Whether the overlay has a background scrim."),
        trigger: z
            .enum(["click", "mouse-enter", "mouse-leave", "after-delay"])
            .optional()
            .describe("Interaction trigger."),
        delay: z.number().min(0).max(60000).nullable().optional().describe("Delay in milliseconds, or null to clear."),
        preserveScrollPosition: z
            .boolean()
            .optional()
            .describe("Whether to preserve scroll position during navigation."),
        animation: animationSchema.nullable(),
        adapter: z.string().optional().describe("Optional adapter request: auto or backend-command."),
    };

    fileId!: string;
    pageId?: string;
    interactionId?: string;
    sourceShapeId?: string;
    interactionIndex?: number;
    destinationBoardId?: string | null;
    relativeToShapeId?: string | null;
    overlayPositionType?:
        | "center"
        | "manual"
        | "top-left"
        | "top-right"
        | "top-center"
        | "bottom-left"
        | "bottom-right"
        | "bottom-center";
    manualPosition?: { x: number; y: number } | null;
    closeClickOutside?: boolean;
    backgroundOverlay?: boolean;
    trigger?: PrototypeTaskParams["trigger"];
    delay?: number | null;
    preserveScrollPosition?: boolean;
    animation?: PrototypeTaskParams["animation"] | null;
    adapter?: string;
}

export class PrototypeUpdateInteractionTool extends PrototypeTool<PrototypeUpdateInteractionArgs> {
    constructor(mcpServer: PenpotMcpServer) {
        super(mcpServer, PrototypeUpdateInteractionArgs.schema);
    }

    public getToolName(): string {
        return CommandDescriptors.PROTOTYPE_UPDATE_INTERACTION.mcpToolName;
    }

    public getToolDescription(): string {
        return CommandDescriptors.PROTOTYPE_UPDATE_INTERACTION.description;
    }

    protected async executeCore(args: PrototypeUpdateInteractionArgs): Promise<ToolResponse> {
        if (!hasPrototypeInteractionTarget(args)) {
            return this.error(
                "prototype_interaction_target_required",
                "prototype.update_interaction requires interactionId or sourceShapeId plus interactionIndex.",
                [
                    "Use prototype.list_interactions first, then pass interactionId for stable-id update.",
                    "For legacy update, pass sourceShapeId and interactionIndex.",
                ]
            );
        }

        const hasPatch =
            args.destinationBoardId !== undefined ||
            args.relativeToShapeId !== undefined ||
            args.overlayPositionType !== undefined ||
            args.manualPosition !== undefined ||
            args.closeClickOutside !== undefined ||
            args.backgroundOverlay !== undefined ||
            args.trigger !== undefined ||
            args.delay !== undefined ||
            args.preserveScrollPosition !== undefined ||
            args.animation !== undefined;
        if (!hasPatch) {
            return this.error(
                "prototype_interaction_patch_required",
                "prototype.update_interaction requires at least one field to update.",
                ["Pass trigger, destinationBoardId, animation, or another supported prototype interaction field."]
            );
        }

        const adapterSelection = this.selectPrototypeMutationAdapter(
            CommandDescriptors.PROTOTYPE_UPDATE_INTERACTION.id,
            args
        );
        if (adapterSelection.status !== "selected") {
            return this.adapterSelectionFailure(adapterSelection);
        }

        return this.executeBackendPrototypeUpdateInteraction(args, adapterSelection);
    }
}

export class PrototypeReorderInteractionArgs {
    static schema = {
        fileId: uuidSchema.describe("File id for backend-command prototype interaction reorder."),
        pageId: uuidSchema.optional().describe("Optional page id used to resolve the source shape."),
        interactionId: uuidSchema.optional().describe("Stable interaction id returned by prototype.list_interactions."),
        sourceShapeId: uuidSchema
            .optional()
            .describe(
                "Shape id that owns the interaction. Required for source/index reorder and optional guard for stable-id reorder."
            ),
        interactionIndex: z
            .number()
            .int()
            .min(0)
            .optional()
            .describe(
                "Zero-based current source index. Required for source/index reorder and optional guard for stable-id reorder."
            ),
        toIndex: z
            .number()
            .int()
            .min(0)
            .describe("Zero-based target index within the same source shape interaction list."),
        adapter: z.string().optional().describe("Optional adapter request: auto or backend-command."),
    };

    fileId!: string;
    pageId?: string;
    interactionId?: string;
    sourceShapeId?: string;
    interactionIndex?: number;
    toIndex!: number;
    adapter?: string;
}

export class PrototypeReorderInteractionTool extends PrototypeTool<PrototypeReorderInteractionArgs> {
    constructor(mcpServer: PenpotMcpServer) {
        super(mcpServer, PrototypeReorderInteractionArgs.schema);
    }

    public getToolName(): string {
        return CommandDescriptors.PROTOTYPE_REORDER_INTERACTION.mcpToolName;
    }

    public getToolDescription(): string {
        return CommandDescriptors.PROTOTYPE_REORDER_INTERACTION.description;
    }

    protected async executeCore(args: PrototypeReorderInteractionArgs): Promise<ToolResponse> {
        if (!hasPrototypeInteractionTarget(args)) {
            return this.error(
                "prototype_interaction_target_required",
                "prototype.reorder_interaction requires interactionId or sourceShapeId plus interactionIndex.",
                [
                    "Use prototype.list_interactions first, then pass interactionId for stable-id reorder.",
                    "For legacy reorder, pass sourceShapeId and interactionIndex.",
                ]
            );
        }

        const adapterSelection = this.selectPrototypeMutationAdapter(
            CommandDescriptors.PROTOTYPE_REORDER_INTERACTION.id,
            args
        );
        if (adapterSelection.status !== "selected") {
            return this.adapterSelectionFailure(adapterSelection);
        }

        return this.executeBackendPrototypeReorderInteraction(args, adapterSelection);
    }
}

export class PrototypeDuplicateInteractionArgs {
    static schema = {
        fileId: uuidSchema.describe("File id for backend-command prototype interaction duplication."),
        pageId: uuidSchema.optional().describe("Optional page id used to resolve the source shape."),
        interactionId: uuidSchema.optional().describe("Stable interaction id returned by prototype.list_interactions."),
        sourceShapeId: uuidSchema
            .optional()
            .describe(
                "Shape id that owns the interaction. Required for source/index duplication and optional guard for stable-id duplication."
            ),
        interactionIndex: z
            .number()
            .int()
            .min(0)
            .optional()
            .describe(
                "Zero-based source index. Required for source/index duplication and optional guard for stable-id duplication."
            ),
        insertionIndex: z
            .number()
            .int()
            .min(0)
            .optional()
            .describe("Optional zero-based insertion index. Defaults to directly after the source interaction."),
        adapter: z.string().optional().describe("Optional adapter request: auto or backend-command."),
    };

    fileId!: string;
    pageId?: string;
    interactionId?: string;
    sourceShapeId?: string;
    interactionIndex?: number;
    insertionIndex?: number;
    adapter?: string;
}

export class PrototypeDuplicateInteractionTool extends PrototypeTool<PrototypeDuplicateInteractionArgs> {
    constructor(mcpServer: PenpotMcpServer) {
        super(mcpServer, PrototypeDuplicateInteractionArgs.schema);
    }

    public getToolName(): string {
        return CommandDescriptors.PROTOTYPE_DUPLICATE_INTERACTION.mcpToolName;
    }

    public getToolDescription(): string {
        return CommandDescriptors.PROTOTYPE_DUPLICATE_INTERACTION.description;
    }

    protected async executeCore(args: PrototypeDuplicateInteractionArgs): Promise<ToolResponse> {
        if (!hasPrototypeInteractionTarget(args)) {
            return this.error(
                "prototype_interaction_target_required",
                "prototype.duplicate_interaction requires interactionId or sourceShapeId plus interactionIndex.",
                [
                    "Use prototype.list_interactions first, then pass interactionId for stable-id duplication.",
                    "For legacy duplication, pass sourceShapeId and interactionIndex.",
                ]
            );
        }

        const adapterSelection = this.selectPrototypeMutationAdapter(
            CommandDescriptors.PROTOTYPE_DUPLICATE_INTERACTION.id,
            args
        );
        if (adapterSelection.status !== "selected") {
            return this.adapterSelectionFailure(adapterSelection);
        }

        return this.executeBackendPrototypeDuplicateInteraction(args, adapterSelection);
    }
}

export class PrototypeCreateFlowArgs {
    static schema = {
        fileId: uuidSchema
            .optional()
            .describe("Optional file id for backend-command headless prototype flow creation."),
        pageId: uuidSchema
            .optional()
            .describe("Optional page id for backend-command headless prototype flow creation."),
        flowId: uuidSchema.optional().describe("Optional flow id for backend-command prototype flow creation."),
        adapter: z.string().optional().describe("Optional adapter request: auto, backend-command, or plugin-live."),
        name: z.string().min(1).max(250).describe("Flow name."),
        startingBoardId: uuidSchema.describe("Board/frame id that starts the flow."),
    };

    fileId?: string;
    pageId?: string;
    flowId?: string;
    adapter?: string;
    name!: string;
    startingBoardId!: string;
}

export class PrototypeCreateFlowTool extends PrototypeTool<PrototypeCreateFlowArgs> {
    constructor(mcpServer: PenpotMcpServer) {
        super(mcpServer, PrototypeCreateFlowArgs.schema);
    }

    public getToolName(): string {
        return CommandDescriptors.PROTOTYPE_CREATE_FLOW.mcpToolName;
    }

    public getToolDescription(): string {
        return CommandDescriptors.PROTOTYPE_CREATE_FLOW.description;
    }

    protected async executeCore(args: PrototypeCreateFlowArgs): Promise<ToolResponse> {
        const adapterSelection = this.selectPrototypeAdapter(CommandDescriptors.PROTOTYPE_CREATE_FLOW.id, args);
        if (adapterSelection.status !== "selected") {
            return this.adapterSelectionFailure(adapterSelection);
        }

        if (adapterSelection.selected === "backend-command") {
            return this.executeBackendPrototypeFlow(args, adapterSelection);
        }

        return this.executePrototypeTask(
            {
                action: "createFlow",
                name: this.nonEmptyString(args.name),
                startingBoardId: args.startingBoardId,
            },
            adapterSelection
        );
    }
}

export class PrototypeCreateInteractionArgs {
    static schema = {
        fileId: uuidSchema
            .optional()
            .describe("Optional file id for backend-command headless prototype interaction creation."),
        pageId: uuidSchema
            .optional()
            .describe("Optional page id for backend-command headless prototype interaction creation."),
        adapter: z.string().optional().describe("Optional adapter request: auto, backend-command, or plugin-live."),
        sourceShapeId: uuidSchema.describe("Shape id that owns the interaction."),
        destinationBoardId: uuidSchema.describe("Destination board/frame id for navigate-to."),
        trigger: z
            .enum(["click", "mouse-enter", "mouse-leave", "after-delay"])
            .optional()
            .describe("Interaction trigger. Defaults to click."),
        delay: z.number().min(0).max(60000).optional().describe("Delay in milliseconds for after-delay triggers."),
        preserveScrollPosition: z
            .boolean()
            .optional()
            .describe("Whether to preserve scroll position during navigation."),
        animation: animationSchema,
    };

    fileId?: string;
    pageId?: string;
    adapter?: string;
    sourceShapeId!: string;
    destinationBoardId!: string;
    trigger?: PrototypeTaskParams["trigger"];
    delay?: number;
    preserveScrollPosition?: boolean;
    animation?: PrototypeTaskParams["animation"];
}

export class PrototypeCreateInteractionTool extends PrototypeTool<PrototypeCreateInteractionArgs> {
    constructor(mcpServer: PenpotMcpServer) {
        super(mcpServer, PrototypeCreateInteractionArgs.schema);
    }

    public getToolName(): string {
        return CommandDescriptors.PROTOTYPE_CREATE_INTERACTION.mcpToolName;
    }

    public getToolDescription(): string {
        return CommandDescriptors.PROTOTYPE_CREATE_INTERACTION.description;
    }

    protected async executeCore(args: PrototypeCreateInteractionArgs): Promise<ToolResponse> {
        const adapterSelection = this.selectPrototypeAdapter(CommandDescriptors.PROTOTYPE_CREATE_INTERACTION.id, args);
        if (adapterSelection.status !== "selected") {
            return this.adapterSelectionFailure(adapterSelection);
        }

        if (adapterSelection.selected === "backend-command") {
            return this.executeBackendPrototypeInteraction(args, adapterSelection);
        }

        return this.executePrototypeTask(
            {
                action: "createInteraction",
                sourceShapeId: args.sourceShapeId,
                destinationBoardId: args.destinationBoardId,
                trigger: args.trigger,
                delay: args.delay,
                preserveScrollPosition: args.preserveScrollPosition,
                animation: args.animation,
            },
            adapterSelection
        );
    }
}

export class PrototypeCreateOverlayArgs {
    static schema = {
        fileId: uuidSchema.describe("File id for backend-command prototype overlay creation."),
        pageId: uuidSchema.describe("Page id used to resolve source, destination, and relative shapes."),
        adapter: z.string().optional().describe("Optional adapter request: auto or backend-command."),
        sourceShapeId: uuidSchema.describe("Shape id that owns the overlay interaction."),
        actionType: z.enum(["open-overlay", "toggle-overlay", "close-overlay"]).describe("Overlay action type."),
        destinationBoardId: uuidSchema
            .optional()
            .describe("Destination board/frame id. Required for open-overlay and toggle-overlay."),
        relativeToShapeId: uuidSchema.optional().describe("Optional shape id used as the overlay positioning base."),
        overlayPositionType: z
            .enum([
                "center",
                "manual",
                "top-left",
                "top-right",
                "top-center",
                "bottom-left",
                "bottom-right",
                "bottom-center",
            ])
            .optional()
            .describe("Overlay positioning mode. Defaults to center."),
        manualPosition: pointSchema.optional().describe("Required when overlayPositionType is manual."),
        closeClickOutside: z.boolean().optional().describe("Whether clicking outside closes the overlay."),
        backgroundOverlay: z.boolean().optional().describe("Whether the overlay has a background scrim."),
        trigger: z
            .enum(["click", "mouse-enter", "mouse-leave", "after-delay"])
            .optional()
            .describe("Interaction trigger. Defaults to click."),
        delay: z.number().min(0).max(60000).optional().describe("Delay in milliseconds for after-delay triggers."),
        animation: animationSchema,
    };

    fileId!: string;
    pageId!: string;
    adapter?: string;
    sourceShapeId!: string;
    actionType!: "open-overlay" | "toggle-overlay" | "close-overlay";
    destinationBoardId?: string;
    relativeToShapeId?: string;
    overlayPositionType?:
        | "center"
        | "manual"
        | "top-left"
        | "top-right"
        | "top-center"
        | "bottom-left"
        | "bottom-right"
        | "bottom-center";
    manualPosition?: { x: number; y: number };
    closeClickOutside?: boolean;
    backgroundOverlay?: boolean;
    trigger?: PrototypeTaskParams["trigger"];
    delay?: number;
    animation?: PrototypeTaskParams["animation"];
}

export class PrototypeCreateOverlayTool extends PrototypeTool<PrototypeCreateOverlayArgs> {
    constructor(mcpServer: PenpotMcpServer) {
        super(mcpServer, PrototypeCreateOverlayArgs.schema);
    }

    public getToolName(): string {
        return CommandDescriptors.PROTOTYPE_CREATE_OVERLAY.mcpToolName;
    }

    public getToolDescription(): string {
        return CommandDescriptors.PROTOTYPE_CREATE_OVERLAY.description;
    }

    protected async executeCore(args: PrototypeCreateOverlayArgs): Promise<ToolResponse> {
        const adapterSelection = this.selectPrototypeMutationAdapter(
            CommandDescriptors.PROTOTYPE_CREATE_OVERLAY.id,
            args
        );
        if (adapterSelection.status !== "selected") {
            return this.adapterSelectionFailure(adapterSelection);
        }

        return this.executeBackendPrototypeOverlay(args, adapterSelection);
    }
}

export class PrototypeListInteractionsArgs {
    static schema = {
        fileId: uuidSchema.describe("File id for backend-command prototype interaction listing."),
        pageId: uuidSchema.optional().describe("Optional page id used to limit prototype summaries."),
        flowId: uuidSchema.optional().describe("Optional flow id used to limit returned flow summaries."),
        sourceShapeId: uuidSchema.optional().describe("Optional source shape id used to limit returned interactions."),
        adapter: z.string().optional().describe("Optional adapter request: auto or backend-command."),
    };

    fileId!: string;
    pageId?: string;
    flowId?: string;
    sourceShapeId?: string;
    adapter?: string;
}

export class PrototypeListInteractionsTool extends PrototypeTool<PrototypeListInteractionsArgs> {
    constructor(mcpServer: PenpotMcpServer) {
        super(mcpServer, PrototypeListInteractionsArgs.schema);
    }

    public getToolName(): string {
        return CommandDescriptors.PROTOTYPE_LIST_INTERACTIONS.mcpToolName;
    }

    public getToolDescription(): string {
        return CommandDescriptors.PROTOTYPE_LIST_INTERACTIONS.description;
    }

    protected async executeCore(args: PrototypeListInteractionsArgs): Promise<ToolResponse> {
        const adapterSelection = this.selectPrototypeReadAdapter(
            CommandDescriptors.PROTOTYPE_LIST_INTERACTIONS.id,
            args
        );
        if (adapterSelection.status !== "selected") {
            return this.adapterSelectionFailure(adapterSelection);
        }

        return this.executeBackendPrototypeList(args, adapterSelection);
    }
}
