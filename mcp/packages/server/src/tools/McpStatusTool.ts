import { EmptyToolArgs, Tool } from "../Tool";
import "reflect-metadata";
import type { ToolResponse } from "../ToolResponse";
import { JsonResponse } from "../ToolResponse";
import { PenpotMcpServer } from "../PenpotMcpServer";
import { ToolNames } from "../ToolNames";

export class McpStatusTool extends Tool<EmptyToolArgs> {
    constructor(mcpServer: PenpotMcpServer) {
        super(mcpServer, EmptyToolArgs.schema);
    }

    public getToolName(): string {
        return ToolNames.MCP_GET_STATUS;
    }

    public getToolDescription(): string {
        return (
            "Returns token-safe MCP status for the current session, including server, transport, plugin, " +
            "user-session, and file-context state."
        );
    }

    protected async executeCore(args: EmptyToolArgs): Promise<ToolResponse> {
        const status = this.mcpServer.getStatus();
        const sessionContext = this.getSessionContext();
        const userTokenPresent = Boolean(sessionContext?.userToken);
        const webSocket = status.transports.webSocket;
        const pluginConnected = webSocket.connectedClients > 0;
        const fileContext = this.mcpServer.fileContextRegistry.getSessionSummary(sessionContext?.userToken);

        return new JsonResponse({
            status: "ok",
            data: {
                server: status.server,
                transports: status.transports,
                session: {
                    mode: status.server.multiUserMode ? "multi-user" : "single-user",
                    authenticated: !status.server.multiUserMode || userTokenPresent,
                    userTokenPresent,
                },
                plugin: {
                    status: pluginConnected ? "connected" : "disconnected",
                    connectedClients: webSocket.connectedClients,
                    authenticatedClients: webSocket.authenticatedClients,
                    pendingTasks: webSocket.pendingTasks,
                },
                fileContext,
            },
            warnings:
                fileContext.status === "unbound"
                    ? ["Open a Penpot file in this browser session before using file-scoped MCP tools."]
                    : [],
        });
    }
}
