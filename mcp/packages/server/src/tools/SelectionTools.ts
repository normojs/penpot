import { z } from "zod";
import {
    CommandDescriptors,
    createAdapterSelectionError,
    createCommandRequestEnvelope,
    createCommandResultEnvelope,
    selectCommandAdapter,
} from "@penpot/command-runtime";
import type { CommandAdapterSelection } from "@penpot/command-runtime";
import { PenpotMcpServer } from "../PenpotMcpServer.js";
import type { ToolResponse } from "../ToolResponse.js";
import { SelectionPluginTask } from "../tasks/SelectionPluginTask.js";
import { requireBoundFileContext } from "./FileContextGuard.js";
import { PenpotRpcTool } from "./PenpotRpcTool.js";

export class SelectionGetArgs {
    static schema = {
        adapter: z.string().optional().describe("Optional adapter request: auto or plugin-live."),
    };

    adapter?: string;
}

export class SelectionSetArgs {
    static schema = {
        shapeIds: z.array(z.string().uuid()).describe("Shape ids to select in the bound Penpot workspace."),
        adapter: z.string().optional().describe("Optional adapter request: auto or plugin-live."),
    };

    shapeIds!: string[];
    adapter?: string;
}

export class SelectionGetTool extends PenpotRpcTool<SelectionGetArgs> {
    constructor(mcpServer: PenpotMcpServer) {
        super(mcpServer, SelectionGetArgs.schema);
    }

    public getToolName(): string {
        return CommandDescriptors.SELECTION_GET.mcpToolName;
    }

    public getToolDescription(): string {
        return CommandDescriptors.SELECTION_GET.description;
    }

    protected async executeCore(args: SelectionGetArgs): Promise<ToolResponse> {
        const adapterSelection = this.selectAdapter(args);
        if (adapterSelection.status !== "selected") {
            return this.adapterSelectionFailure(adapterSelection);
        }

        const contextError = requireBoundFileContext(
            this.mcpServer,
            this.getSessionContext()?.userToken,
            this.getToolName()
        );
        if (contextError) {
            return contextError;
        }

        const params = { action: "get" as const };
        const requestEnvelope = createCommandRequestEnvelope(adapterSelection.command, {
            transport: "mcp",
            input: params,
            target: { fileContext: "bound" },
            auth: { userTokenPresent: Boolean(this.getUserToken()), source: "mcp-session" },
            adapterSelection,
            diagnostics: { execution: "plugin-task" },
        });
        const result = await this.mcpServer.pluginBridge.executePluginTask(new SelectionPluginTask(params));
        const resultEnvelope = createCommandResultEnvelope(
            requestEnvelope,
            {
                ...result.data,
                adapter: adapterSelection.selected,
                adapterSelection,
            },
            { adapterSelection }
        );

        return this.ok(resultEnvelope.data, resultEnvelope.warnings);
    }

    private selectAdapter(args: SelectionGetArgs): CommandAdapterSelection {
        return selectCommandAdapter({
            command: CommandDescriptors.SELECTION_GET.id,
            requestedAdapter: args.adapter ?? "auto",
            candidates: [
                {
                    kind: "plugin-live",
                    available: true,
                    priority: 50,
                    reason: null,
                },
            ],
        });
    }

    private adapterSelectionFailure(selection: CommandAdapterSelection): ToolResponse {
        const error = createAdapterSelectionError(selection, {
            actions: ["Use adapter: 'auto' or adapter: 'plugin-live' with a bound file context."],
        });
        return this.error(error.code, error.message, error.actions, error.data);
    }
}

export class SelectionSetTool extends PenpotRpcTool<SelectionSetArgs> {
    constructor(mcpServer: PenpotMcpServer) {
        super(mcpServer, SelectionSetArgs.schema);
    }

    public getToolName(): string {
        return CommandDescriptors.SELECTION_SET.mcpToolName;
    }

    public getToolDescription(): string {
        return CommandDescriptors.SELECTION_SET.description;
    }

    protected async executeCore(args: SelectionSetArgs): Promise<ToolResponse> {
        const adapterSelection = this.selectAdapter(args);
        if (adapterSelection.status !== "selected") {
            return this.adapterSelectionFailure(adapterSelection);
        }

        const contextError = requireBoundFileContext(
            this.mcpServer,
            this.getSessionContext()?.userToken,
            this.getToolName()
        );
        if (contextError) {
            return contextError;
        }

        const params = { action: "set" as const, shapeIds: args.shapeIds };
        const requestEnvelope = createCommandRequestEnvelope(adapterSelection.command, {
            transport: "mcp",
            input: params,
            target: { fileContext: "bound" },
            auth: { userTokenPresent: Boolean(this.getUserToken()), source: "mcp-session" },
            adapterSelection,
            diagnostics: { execution: "plugin-task" },
        });
        const result = await this.mcpServer.pluginBridge.executePluginTask(new SelectionPluginTask(params));
        const resultEnvelope = createCommandResultEnvelope(
            requestEnvelope,
            {
                ...result.data,
                adapter: adapterSelection.selected,
                adapterSelection,
            },
            { adapterSelection }
        );

        return this.ok(resultEnvelope.data, resultEnvelope.warnings);
    }

    private selectAdapter(args: SelectionSetArgs): CommandAdapterSelection {
        return selectCommandAdapter({
            command: CommandDescriptors.SELECTION_SET.id,
            requestedAdapter: args.adapter ?? "auto",
            candidates: [
                {
                    kind: "plugin-live",
                    available: true,
                    priority: 50,
                    reason: null,
                },
            ],
        });
    }

    private adapterSelectionFailure(selection: CommandAdapterSelection): ToolResponse {
        const error = createAdapterSelectionError(selection, {
            actions: ["Use adapter: 'auto' or adapter: 'plugin-live' with a bound file context."],
        });
        return this.error(error.code, error.message, error.actions, error.data);
    }
}
