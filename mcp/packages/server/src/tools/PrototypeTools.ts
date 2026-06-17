import { z } from "zod";
import type { ToolResponse } from "../ToolResponse.js";
import { PenpotMcpServer } from "../PenpotMcpServer.js";
import { PrototypePluginTask } from "../tasks/PrototypePluginTask.js";
import { requireBoundFileContext } from "./FileContextGuard.js";
import type { PrototypeTaskParams } from "@penpot/mcp-common";
import { PenpotRpcTool } from "./PenpotRpcTool.js";
import {
    AdapterSelectionReasonCodes,
    CommandDescriptors,
    createAdapterSelectionError,
    getAdapterSelectionReason,
    selectCommandAdapter,
} from "@penpot/command-runtime";
import type { CommandAdapterSelection } from "@penpot/command-runtime";

const uuidSchema = z.string().uuid();

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

function toBackendAnimation(animation?: PrototypeTaskParams["animation"]): PenpotRecord | undefined {
    if (!animation) {
        return undefined;
    }
    return {
        type: animation.type,
        duration: animation.duration,
        easing: animation.easing,
        direction: animation.direction,
        way: animation.way,
        "offset-effect": animation.offsetEffect,
    };
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
