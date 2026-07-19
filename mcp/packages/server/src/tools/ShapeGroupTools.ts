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

export class ShapeGroupArgs {
    static schema = {
        fileId: uuidSchema.describe("File id for backend-command shape grouping."),
        pageId: uuidSchema.optional().describe("Optional page id used to resolve shapes."),
        shapeIds: z.array(uuidSchema).min(1).max(100).describe("Shape ids to group. All must share the same parent and frame."),
        name: z.string().min(1).max(250).optional().describe("Optional group name. Defaults to Group."),
        groupId: uuidSchema.optional().describe("Optional forced group shape id."),
        adapter: z.string().optional().describe("Optional adapter request: auto or backend-command."),
    };

    fileId!: string;
    pageId?: string;
    shapeIds!: string[];
    name?: string;
    groupId?: string;
    adapter?: string;
}

export class ShapeGroupTool extends PenpotRpcTool<ShapeGroupArgs> {
    constructor(mcpServer: PenpotMcpServer) {
        super(mcpServer, ShapeGroupArgs.schema);
    }

    public getToolName(): string {
        return CommandDescriptors.SHAPE_GROUP.mcpToolName!;
    }

    public getToolDescription(): string {
        return CommandDescriptors.SHAPE_GROUP.description;
    }

    protected selectMutationAdapter(command: string, args: { fileId?: string; adapter?: string }): CommandAdapterSelection {
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
            ],
        });
    }

    protected adapterSelectionFailure(adapterSelection: CommandAdapterSelection): ToolResponse {
        const error = createAdapterSelectionError(adapterSelection, {
            actions: ["Use adapter: 'auto' or 'backend-command'.", "Pass fileId and shapeIds for backend-command grouping."],
        });
        return this.error(error.code, error.message, error.actions, error.data);
    }

    protected async executeCore(args: ShapeGroupArgs): Promise<ToolResponse> {
        const adapterSelection = this.selectMutationAdapter(CommandDescriptors.SHAPE_GROUP.id, args);
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
                "shape-ids": args.shapeIds,
            };
            if (args.pageId !== undefined) params["page-id"] = args.pageId;
            if (args.name !== undefined) params.name = args.name;
            if (args.groupId !== undefined) params["group-id"] = args.groupId;
            const result = await this.rpcPost<PenpotRecord>("group-file-shapes", params, userToken, {
                mcpToolName: this.getToolName(),
                mcpAdapter: adapterSelection.selected,
                mcpFileId: args.fileId,
                mcpPageId: args.pageId,
            });
            return this.ok({
                adapter: adapterSelection.selected,
                adapterSelection,
                fileId: args.fileId,
                pageId: args.pageId,
                shape: result.shape,
                children: result.children ?? [],
                deletedIds: result["deleted-ids"] ?? result.deletedIds ?? [],
                revn: result.revn,
                vern: result.vern,
            });
        } catch (cause) {
            return this.rpcFailure(cause);
        }
    }
}

export class ShapeUngroupArgs {
    static schema = {
        fileId: uuidSchema.describe("File id for backend-command shape ungrouping."),
        pageId: uuidSchema.optional().describe("Optional page id used to resolve groups."),
        shapeId: uuidSchema.optional().describe("Single group shape id."),
        shapeIds: z.array(uuidSchema).min(1).max(100).optional().describe("One or more group shape ids."),
        adapter: z.string().optional().describe("Optional adapter request: auto or backend-command."),
    };

    fileId!: string;
    pageId?: string;
    shapeId?: string;
    shapeIds?: string[];
    adapter?: string;
}

export class ShapeUngroupTool extends PenpotRpcTool<ShapeUngroupArgs> {
    constructor(mcpServer: PenpotMcpServer) {
        super(mcpServer, ShapeUngroupArgs.schema);
    }

    public getToolName(): string {
        return CommandDescriptors.SHAPE_UNGROUP.mcpToolName!;
    }

    public getToolDescription(): string {
        return CommandDescriptors.SHAPE_UNGROUP.description;
    }

    protected selectMutationAdapter(command: string, args: { fileId?: string; adapter?: string }): CommandAdapterSelection {
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
            ],
        });
    }

    protected adapterSelectionFailure(adapterSelection: CommandAdapterSelection): ToolResponse {
        const error = createAdapterSelectionError(adapterSelection, {
            actions: ["Use adapter: 'auto' or 'backend-command'.", "Pass fileId and group shapeId(s) for backend-command ungrouping."],
        });
        return this.error(error.code, error.message, error.actions, error.data);
    }

    protected async executeCore(args: ShapeUngroupArgs): Promise<ToolResponse> {
        const shapeIds = args.shapeIds ?? (args.shapeId ? [args.shapeId] : []);
        if (shapeIds.length === 0) {
            return this.error("ungroup_shapes_required", "shape.ungroup requires shapeId or shapeIds.", [
                "Pass one or more group shape ids.",
            ]);
        }
        const adapterSelection = this.selectMutationAdapter(CommandDescriptors.SHAPE_UNGROUP.id, args);
        if (adapterSelection.status !== "selected") {
            return this.adapterSelectionFailure(adapterSelection);
        }
        const userToken = this.getUserToken();
        if (!userToken) {
            return this.authenticationRequired();
        }
        try {
            const params: RpcParams = { id: args.fileId };
            if (shapeIds.length === 1) params["shape-id"] = shapeIds[0];
            else params["shape-ids"] = shapeIds;
            if (args.pageId !== undefined) params["page-id"] = args.pageId;
            const result = await this.rpcPost<PenpotRecord>("ungroup-file-shapes", params, userToken, {
                mcpToolName: this.getToolName(),
                mcpAdapter: adapterSelection.selected,
                mcpFileId: args.fileId,
                mcpPageId: args.pageId,
            });
            return this.ok({
                adapter: adapterSelection.selected,
                adapterSelection,
                fileId: args.fileId,
                pageId: args.pageId,
                groups: result.groups ?? [],
                children: result.children ?? [],
                revn: result.revn,
                vern: result.vern,
            });
        } catch (cause) {
            return this.rpcFailure(cause);
        }
    }
}
