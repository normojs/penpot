import { z } from "zod";
import { Tool } from "../Tool.js";
import type { ToolResponse } from "../ToolResponse.js";
import { JsonResponse } from "../ToolResponse.js";
import { PenpotMcpServer } from "../PenpotMcpServer.js";
import { PrototypePluginTask } from "../tasks/PrototypePluginTask.js";
import { ToolNames } from "../ToolNames.js";
import { requireBoundFileContext } from "./FileContextGuard.js";
import type { PluginTaskResult, PrototypeTaskParams, PrototypeTaskResultData } from "@penpot/mcp-common";

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

abstract class PrototypeTool<TArgs extends object> extends Tool<TArgs> {
    protected constructor(mcpServer: PenpotMcpServer, inputSchema: z.ZodRawShape) {
        super(mcpServer, inputSchema);
    }

    protected async executePrototypeTask(params: PrototypeTaskParams): Promise<ToolResponse> {
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
        return this.ok(result);
    }

    protected nonEmptyString(value: unknown): string | undefined {
        return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
    }

    private ok(result: PluginTaskResult<PrototypeTaskResultData>): ToolResponse {
        return new JsonResponse({
            status: "ok",
            data: result.data,
        });
    }
}

export class PrototypeCreateFlowArgs {
    static schema = {
        name: z.string().min(1).max(250).describe("Flow name."),
        startingBoardId: uuidSchema.describe("Board/frame id that starts the flow."),
    };

    name!: string;
    startingBoardId!: string;
}

export class PrototypeCreateFlowTool extends PrototypeTool<PrototypeCreateFlowArgs> {
    constructor(mcpServer: PenpotMcpServer) {
        super(mcpServer, PrototypeCreateFlowArgs.schema);
    }

    public getToolName(): string {
        return ToolNames.PROTOTYPE_CREATE_FLOW;
    }

    public getToolDescription(): string {
        return "Creates a prototype flow on a board in the currently bound Penpot file context.";
    }

    protected async executeCore(args: PrototypeCreateFlowArgs): Promise<ToolResponse> {
        return this.executePrototypeTask({
            action: "createFlow",
            name: this.nonEmptyString(args.name),
            startingBoardId: args.startingBoardId,
        });
    }
}

export class PrototypeCreateInteractionArgs {
    static schema = {
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
        return ToolNames.PROTOTYPE_CREATE_INTERACTION;
    }

    public getToolDescription(): string {
        return "Creates a navigate-to prototype interaction in the currently bound Penpot file context.";
    }

    protected async executeCore(args: PrototypeCreateInteractionArgs): Promise<ToolResponse> {
        return this.executePrototypeTask({
            action: "createInteraction",
            sourceShapeId: args.sourceShapeId,
            destinationBoardId: args.destinationBoardId,
            trigger: args.trigger,
            delay: args.delay,
            preserveScrollPosition: args.preserveScrollPosition,
            animation: args.animation,
        });
    }
}
