import { EmptyToolArgs, Tool } from "../Tool";
import "reflect-metadata";
import type { ToolResponse } from "../ToolResponse";
import { JsonResponse } from "../ToolResponse";
import { PenpotMcpServer } from "../PenpotMcpServer";
import { CommandDescriptors } from "@penpot/command-runtime";

export class McpStatusTool extends Tool<EmptyToolArgs> {
    constructor(mcpServer: PenpotMcpServer) {
        super(mcpServer, EmptyToolArgs.schema);
    }

    public getToolName(): string {
        return CommandDescriptors.MCP_STATUS.mcpToolName;
    }

    public getToolDescription(): string {
        return CommandDescriptors.MCP_STATUS.description;
    }

    protected async executeCore(args: EmptyToolArgs): Promise<ToolResponse> {
        const status = this.mcpServer.getStatus();
        const sessionContext = this.getSessionContext();
        const userTokenPresent = Boolean(sessionContext?.userToken);
        const webSocket = status.transports.webSocket;
        const pluginStatus =
            webSocket.compatibleClients > 0
                ? "connected"
                : webSocket.incompatibleClients > 0
                  ? "incompatible"
                  : webSocket.pendingNegotiationClients > 0
                    ? "negotiating"
                    : "disconnected";
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
                    status: pluginStatus,
                    connectedClients: webSocket.connectedClients,
                    authenticatedClients: webSocket.authenticatedClients,
                    compatibleClients: webSocket.compatibleClients,
                    incompatibleClients: webSocket.incompatibleClients,
                    pendingNegotiationClients: webSocket.pendingNegotiationClients,
                    clients: webSocket.clients,
                    pendingTasks: webSocket.pendingTasks,
                },
                writeLimits: status.writeLimits,
                logging: status.logging,
                fileContext,
            },
            warnings:
                fileContext.status === "unbound"
                    ? ["Open a Penpot file in this browser session before using file-scoped MCP tools."]
                    : [],
        });
    }
}
