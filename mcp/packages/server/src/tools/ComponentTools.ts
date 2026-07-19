import { z } from "zod";
import type { ToolResponse } from "../ToolResponse.js";
import { PenpotMcpServer } from "../PenpotMcpServer.js";
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

type PenpotRecord = Record<string, unknown>;
type ComponentCreateInput = {
    fileId: string;
    pageId: string;
    shapeId?: string;
    shapeIds?: string[];
    name?: string;
    adapter?: string;
};

export class ComponentCreateArgs {
    static schema = {
        fileId: uuidSchema.describe("File id for backend-command local component creation."),
        pageId: uuidSchema.describe("Page id that contains the root frame."),
        shapeId: uuidSchema.optional().describe("Single root frame id. Prefer this or shapeIds with one id."),
        shapeIds: z
            .array(uuidSchema)
            .min(1)
            .max(100)
            .optional()
            .describe("One or more shape ids. A single non-component frame becomes the root; multiple shapes are wrapped in a new frame."),
        name: z.string().min(1).max(250).optional().describe("Optional component name override."),
        adapter: z.string().optional().describe("Optional adapter request: auto or backend-command."),
    };

    fileId!: string;
    pageId!: string;
    shapeId?: string;
    shapeIds?: string[];
    name?: string;
    adapter?: string;
}

export class ComponentCreateTool extends PenpotRpcTool<ComponentCreateArgs> {
    constructor(mcpServer: PenpotMcpServer) {
        super(mcpServer, ComponentCreateArgs.schema);
    }

    public getToolName(): string {
        return CommandDescriptors.COMPONENT_CREATE.mcpToolName!;
    }

    public getToolDescription(): string {
        return CommandDescriptors.COMPONENT_CREATE.description;
    }

    protected selectComponentMutationAdapter(command: string, args: ComponentCreateInput): CommandAdapterSelection {
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
            ],
        });
    }

    protected adapterSelectionFailure(adapterSelection: CommandAdapterSelection): ToolResponse {
        const error = createAdapterSelectionError(adapterSelection, {
            actions: [
                "Use adapter: 'auto' or 'backend-command'.",
                "Pass fileId and pageId for backend-command component creation.",
            ],
        });
        return this.error(error.code, error.message, error.actions, error.data);
    }

    protected async executeCore(args: ComponentCreateArgs): Promise<ToolResponse> {
        const shapeIds = args.shapeIds ?? (args.shapeId ? [args.shapeId] : []);
        if (shapeIds.length === 0) {
            return this.error(
                "component_root_required",
                "component.create requires shapeId or shapeIds with at least one shape id.",
                ["Pass a single non-component frame, or multiple shapes to wrap into a component."]
            );
        }

        const adapterSelection = this.selectComponentMutationAdapter(CommandDescriptors.COMPONENT_CREATE.id, args);
        if (adapterSelection.status !== "selected") {
            return this.adapterSelectionFailure(adapterSelection);
        }

        const userToken = this.getUserToken();
        if (!userToken) {
            return this.authenticationRequired();
        }

        try {
            const params: RpcParams = {
                id: args.fileId,
                "page-id": args.pageId,
            };
            if (shapeIds.length === 1) {
                params["shape-id"] = shapeIds[0];
            } else {
                params["shape-ids"] = shapeIds;
            }
            if (args.name !== undefined) params.name = args.name;

            const result = await this.rpcPost<PenpotRecord>("create-file-component", params, userToken, {
                mcpToolName: this.getToolName(),
                mcpAdapter: adapterSelection.selected,
                mcpFileId: args.fileId,
                mcpPageId: args.pageId,
                mcpShapeId: shapeIds[0],
            });

            return this.ok({
                adapter: adapterSelection.selected,
                adapterSelection,
                fileId: args.fileId,
                pageId: args.pageId,
                component: result.component,
                shape: result.shape,
                wrapped: Boolean(result.wrapped),
                sourceShapeIds: result["source-shape-ids"] ?? result.sourceShapeIds ?? shapeIds,
                revn: result.revn,
                vern: result.vern,
            });
        } catch (cause) {
            return this.rpcFailure(cause);
        }
    }
}

export class ComponentInstantiateArgs {
    static schema = {
        fileId: uuidSchema.describe("File id for backend-command local component instantiation."),
        pageId: uuidSchema.describe("Destination page id."),
        componentId: uuidSchema.describe("Local component id to instantiate."),
        componentFileId: uuidSchema
            .optional()
            .describe("Optional component library file id. Defaults to fileId; remote libraries must be linked to the file."),
        x: z.number().finite().describe("Instance root X coordinate."),
        y: z.number().finite().describe("Instance root Y coordinate."),
        parentId: uuidSchema.optional().describe("Optional destination frame parent id. Defaults to page root."),
        shapeId: uuidSchema.optional().describe("Optional forced id for the instance root shape."),
        adapter: z.string().optional().describe("Optional adapter request: auto or backend-command."),
    };

    fileId!: string;
    pageId!: string;
    componentId!: string;
    componentFileId?: string;
    x!: number;
    y!: number;
    parentId?: string;
    shapeId?: string;
    adapter?: string;
}

export class ComponentInstantiateTool extends PenpotRpcTool<ComponentInstantiateArgs> {
    constructor(mcpServer: PenpotMcpServer) {
        super(mcpServer, ComponentInstantiateArgs.schema);
    }

    public getToolName(): string {
        return CommandDescriptors.COMPONENT_INSTANTIATE.mcpToolName!;
    }

    public getToolDescription(): string {
        return CommandDescriptors.COMPONENT_INSTANTIATE.description;
    }

    protected selectComponentMutationAdapter(
        command: string,
        args: {
            fileId: string;
            pageId: string;
            adapter?: string;
        }
    ): CommandAdapterSelection {
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
            ],
        });
    }

    protected adapterSelectionFailure(adapterSelection: CommandAdapterSelection): ToolResponse {
        const error = createAdapterSelectionError(adapterSelection, {
            actions: [
                "Use adapter: 'auto' or 'backend-command'.",
                "Pass fileId, pageId, componentId, x, and y for backend-command component instantiation.",
            ],
        });
        return this.error(error.code, error.message, error.actions, error.data);
    }

    protected async executeCore(args: ComponentInstantiateArgs): Promise<ToolResponse> {
        const adapterSelection = this.selectComponentMutationAdapter(
            CommandDescriptors.COMPONENT_INSTANTIATE.id,
            args
        );
        if (adapterSelection.status !== "selected") {
            return this.adapterSelectionFailure(adapterSelection);
        }

        const userToken = this.getUserToken();
        if (!userToken) {
            return this.authenticationRequired();
        }

        try {
            const params: RpcParams = {
                id: args.fileId,
                "page-id": args.pageId,
                "component-id": args.componentId,
                x: args.x,
                y: args.y,
            };
            if (args.componentFileId !== undefined) params["component-file-id"] = args.componentFileId;
            if (args.parentId !== undefined) params["parent-id"] = args.parentId;
            if (args.shapeId !== undefined) params["shape-id"] = args.shapeId;

            const result = await this.rpcPost<PenpotRecord>("create-file-component-instance", params, userToken, {
                mcpToolName: this.getToolName(),
                mcpAdapter: adapterSelection.selected,
                mcpFileId: args.fileId,
                mcpPageId: args.pageId,
                mcpShapeId: args.shapeId,
            });

            return this.ok({
                adapter: adapterSelection.selected,
                adapterSelection,
                fileId: args.fileId,
                pageId: args.pageId,
                component: result.component,
                shape: result.shape,
                shapes: result.shapes ?? [],
                revn: result.revn,
                vern: result.vern,
            });
        } catch (cause) {
            return this.rpcFailure(cause);
        }
    }
}
