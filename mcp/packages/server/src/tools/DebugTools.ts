import { EmptyToolArgs, Tool } from "../Tool.js";
import "reflect-metadata";
import type { ToolResponse } from "../ToolResponse.js";
import { JsonResponse } from "../ToolResponse.js";
import { PenpotMcpServer } from "../PenpotMcpServer.js";
import { ToolNames } from "../ToolNames.js";
import { CommandDescriptors, createCommandRequestEnvelope, createCommandResultEnvelope } from "@penpot/command-runtime";

export const DebugToolsErrorCodes = {
    DEBUG_TOOLS_DISABLED: "debug_tools_disabled",
} as const;

export const DEBUG_TOOLS_ENABLE_ENV = "PENPOT_MCP_ENABLE_DEBUG_TOOLS";

type WebSocketStatus = {
    connectedClients?: number;
    authenticatedClients?: number;
    compatibleClients?: number;
    incompatibleClients?: number;
    pendingNegotiationClients?: number;
    pendingTasks?: number;
};

export function derivePluginStatus(webSocket: WebSocketStatus): "connected" | "incompatible" | "negotiating" | "disconnected" {
    const compatibleClients = Number(webSocket.compatibleClients ?? 0);
    const incompatibleClients = Number(webSocket.incompatibleClients ?? 0);
    const pendingNegotiationClients = Number(webSocket.pendingNegotiationClients ?? 0);

    if (compatibleClients > 0) {
        return "connected";
    }
    if (incompatibleClients > 0) {
        return "incompatible";
    }
    if (pendingNegotiationClients > 0) {
        return "negotiating";
    }
    return "disconnected";
}

export function projectPluginState(options: {
    multiUserMode: boolean;
    userTokenPresent: boolean;
    webSocket: WebSocketStatus;
    fileContext: {
        status: string;
        bound?: boolean;
        boundContext?: { fileId?: string | null } | null;
    };
    enabled: boolean;
}): Record<string, unknown> {
    const pluginStatus = derivePluginStatus(options.webSocket);
    const boundFileId = options.fileContext.boundContext?.fileId ?? null;
    const nextActions = [
        ToolNames.MCP_GET_STATUS,
        ToolNames.FILE_GET_CONTEXT,
        ToolNames.FILE_BIND_CONTEXT,
    ];

    return {
        adapter: "local",
        enabled: options.enabled,
        enablement: {
            env: DEBUG_TOOLS_ENABLE_ENV,
            enabledValue: "true",
        },
        plugin: {
            status: pluginStatus,
            connectedClients: Number(options.webSocket.connectedClients ?? 0),
            authenticatedClients: Number(options.webSocket.authenticatedClients ?? 0),
            compatibleClients: Number(options.webSocket.compatibleClients ?? 0),
            incompatibleClients: Number(options.webSocket.incompatibleClients ?? 0),
            pendingNegotiationClients: Number(options.webSocket.pendingNegotiationClients ?? 0),
            pendingTasks: Number(options.webSocket.pendingTasks ?? 0),
        },
        session: {
            mode: options.multiUserMode ? "multi-user" : "single-user",
            userTokenPresent: options.userTokenPresent,
            // File-context is session-scoped; plugin counts remain server-wide aggregates.
            scopedToCurrentSession: true,
        },
        fileContext: {
            status: options.fileContext.status,
            boundFileId,
        },
        nextActions,
    };
}

/**
 * Gated advanced diagnostics tool: thin local projection of mcp.get_status
 * plugin + session file-context fields. Never returns raw tokens or full
 * unfiltered multi-user client dumps.
 */
export class DebugGetPluginStateTool extends Tool<EmptyToolArgs> {
    constructor(mcpServer: PenpotMcpServer) {
        super(mcpServer, EmptyToolArgs.schema);
    }

    public getToolName(): string {
        return CommandDescriptors.DEBUG_GET_PLUGIN_STATE.mcpToolName!;
    }

    public getToolDescription(): string {
        return CommandDescriptors.DEBUG_GET_PLUGIN_STATE.description;
    }

    protected async executeCore(_args: EmptyToolArgs): Promise<ToolResponse> {
        if (!this.mcpServer.isDebugToolsEnabled()) {
            return new JsonResponse({
                status: "error",
                error: {
                    code: DebugToolsErrorCodes.DEBUG_TOOLS_DISABLED,
                    message:
                        "debug.get_plugin_state is disabled. Use mcp.get_status for normal diagnostics, or start the MCP server with PENPOT_MCP_ENABLE_DEBUG_TOOLS=true to enable advanced debug tools.",
                    actions: [ToolNames.MCP_GET_STATUS, ToolNames.FILE_GET_CONTEXT, ToolNames.FILE_BIND_CONTEXT],
                    config: {
                        env: DEBUG_TOOLS_ENABLE_ENV,
                        enabledValue: "true",
                    },
                },
            });
        }

        const status = this.mcpServer.getStatus();
        const sessionContext = this.getSessionContext();
        const userTokenPresent = Boolean(sessionContext?.userToken);
        const webSocket = status.transports.webSocket as WebSocketStatus;
        const fileContext = this.mcpServer.fileContextRegistry.getSessionSummary(sessionContext?.userToken);
        const projection = projectPluginState({
            multiUserMode: Boolean(status.server.multiUserMode),
            userTokenPresent,
            webSocket,
            fileContext: {
                status: fileContext.status,
                bound: fileContext.bound,
                boundContext: fileContext.boundContext,
            },
            enabled: true,
        });

        const requestEnvelope = createCommandRequestEnvelope(CommandDescriptors.DEBUG_GET_PLUGIN_STATE, {
            transport: "mcp",
            target: { mcpSessionId: sessionContext?.mcpSessionId },
            auth: {
                userTokenPresent,
                mode: status.server.multiUserMode ? "multi-user" : "single-user",
                source: "mcp-session",
            },
            adapter: "local",
            diagnostics: {
                fileContextStatus: fileContext.status,
                debugToolsEnabled: true,
            },
        });
        const resultEnvelope = createCommandResultEnvelope(requestEnvelope, projection, {
            warnings:
                fileContext.status === "unbound"
                    ? ["Open a Penpot file in this browser session before using file-scoped MCP tools."]
                    : [],
        });

        return new JsonResponse({
            status: resultEnvelope.status,
            data: resultEnvelope.data,
            warnings: resultEnvelope.warnings,
        });
    }
}
