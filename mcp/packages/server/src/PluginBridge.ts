import { WebSocket, WebSocketServer } from "ws";
import * as http from "http";
import { PluginTask } from "./PluginTask.js";
import {
    PluginClientInfo,
    PluginFileContextBindRequestMessage,
    PluginFileContextControlResultMessage,
    PluginFileContextReleaseRequestMessage,
    PluginFileContextUpdateMessage,
    PluginHelloMessage,
    PluginTaskResponse,
    PluginTaskResult,
    PluginToServerMessage,
    ServerPluginCompatibilityMessage,
    WrappedPluginTaskResponse,
} from "@penpot/mcp-common";
import { getPluginClientInfo, negotiatePluginCompatibility } from "./PluginCompatibility.js";
import { createLogger } from "./logger.js";
import type { PenpotMcpServer } from "./PenpotMcpServer.js";
import { CommandErrorCodes } from "@penpot/command-runtime";

const KEEP_ALIVE_TIME = 30000; // 30 seconds

interface ClientConnection {
    socket: WebSocket;
    userToken: string | null;
    pingInterval: NodeJS.Timeout;
    plugin?: PluginClientInfo;
    compatibility?: ServerPluginCompatibilityMessage;
}

/**
 * Manages WebSocket connections to Penpot plugin instances and handles plugin tasks
 * over these connections.
 */
export class PluginBridge {
    private readonly logger = createLogger("PluginBridge");
    private readonly wsServer: WebSocketServer;
    private readonly connectedClients: Map<WebSocket, ClientConnection> = new Map();
    private readonly clientsByToken: Map<string, ClientConnection> = new Map();
    private readonly pendingTasks: Map<string, PluginTask<any, any>> = new Map();
    private readonly taskTimeouts: Map<string, NodeJS.Timeout> = new Map();

    constructor(
        public readonly mcpServer: PenpotMcpServer,
        private port: number,
        private taskTimeoutSecs: number = 30
    ) {
        this.wsServer = new WebSocketServer({ port: port });
        this.setupWebSocketHandlers();
    }

    /**
     * Sets up WebSocket connection handlers for plugin communication.
     *
     * Manages client connections and provides bidirectional communication
     * channel between the MCP mcpServer and Penpot plugin instances.
     */
    private setupWebSocketHandlers(): void {
        this.wsServer.on("connection", (ws: WebSocket, request: http.IncomingMessage) => {
            // extract userToken from query parameters
            const url = new URL(request.url!, `ws://${request.headers.host}`);
            const userToken = url.searchParams.get("userToken");

            // require userToken if running in multi-user mode
            if (this.mcpServer.isMultiUserMode() && !userToken) {
                this.logger.warn("Connection attempt without userToken in multi-user mode - rejecting");
                ws.close(1008, "Missing userToken parameter");
                return;
            }

            if (userToken) {
                this.logger.info("New WebSocket connection established (token provided)");
            } else {
                this.logger.info("New WebSocket connection established");
            }

            // start the per-connection keep-alive ping interval
            const pingInterval = setInterval(() => {
                ws.ping();
            }, KEEP_ALIVE_TIME);

            // register the client connection with both indexes
            const connection: ClientConnection = { socket: ws, userToken, pingInterval };
            this.connectedClients.set(ws, connection);
            if (userToken) {
                // ensure only one connection per userToken
                if (this.clientsByToken.has(userToken)) {
                    this.logger.warn("Duplicate connection for given user token; rejecting new connection");
                    this.removeConnection(ws, { markContextsStale: false });
                    ws.close(1008, "Duplicate connection for given user token; close previous connection first.");
                    return;
                }

                this.clientsByToken.set(userToken, connection);
            }

            ws.on("message", (data: Buffer) => {
                this.logger.debug("Received WebSocket message: %s", data.toString());
                try {
                    const message: PluginToServerMessage<any> = JSON.parse(data.toString());
                    this.handlePluginMessage(connection, message).catch((error) => {
                        this.logger.error(error, "Failure while handling WebSocket message");
                    });
                } catch (error) {
                    this.logger.error(error, "Failure while processing WebSocket message");
                }
            });

            ws.on("close", () => {
                this.logger.info("WebSocket connection closed");
                this.removeConnection(ws);
            });

            ws.on("error", (error) => {
                this.logger.error(error, "WebSocket connection error");
                this.removeConnection(ws);
            });
        });

        this.logger.info("WebSocket mcpServer started on port %d", this.port);
    }

    public getStatus() {
        const clients = Array.from(this.connectedClients.values()).map((connection) =>
            this.getClientStatus(connection)
        );

        return {
            port: this.port,
            connectedClients: this.connectedClients.size,
            authenticatedClients: this.clientsByToken.size,
            compatibleClients: clients.filter((client) => client.negotiationStatus === "compatible").length,
            incompatibleClients: clients.filter((client) => client.negotiationStatus === "incompatible").length,
            pendingNegotiationClients: clients.filter((client) => client.negotiationStatus === "pending").length,
            clients,
            pendingTasks: this.pendingTasks.size,
            taskTimeoutSeconds: this.taskTimeoutSecs,
        };
    }

    private getClientStatus(connection: ClientConnection) {
        return {
            authenticated: Boolean(connection.userToken),
            negotiationStatus: this.getNegotiationStatus(connection),
            plugin: connection.plugin ?? null,
            compatibility: connection.compatibility
                ? {
                      compatible: connection.compatibility.compatible,
                      serverVersion: connection.compatibility.serverVersion,
                      protocolVersion: connection.compatibility.protocolVersion,
                      missingCapabilities: connection.compatibility.missingCapabilities,
                      unsupportedCapabilities: connection.compatibility.unsupportedCapabilities,
                      error: connection.compatibility.error,
                  }
                : null,
        };
    }

    private getNegotiationStatus(connection: ClientConnection): "pending" | "compatible" | "incompatible" {
        if (!connection.compatibility) {
            return "pending";
        }
        return connection.compatibility.compatible ? "compatible" : "incompatible";
    }

    /**
     * Removes a client connection and releases all resources associated with it.
     *
     * Clears the per-connection keep-alive interval and removes the connection
     * from both the socket-keyed and token-keyed indexes. Safe to call with a
     * socket that is not (or no longer) registered.
     *
     * @param ws - The WebSocket whose connection state should be removed
     */
    private removeConnection(
        ws: WebSocket,
        options: {
            markContextsStale: boolean;
        } = { markContextsStale: true }
    ): void {
        const connection = this.connectedClients.get(ws);
        if (!connection) {
            return;
        }
        clearInterval(connection.pingInterval);
        this.connectedClients.delete(ws);
        if (connection.userToken) {
            if (this.clientsByToken.get(connection.userToken) === connection) {
                this.clientsByToken.delete(connection.userToken);
            }
        }
        if (options.markContextsStale) {
            this.mcpServer.fileContextRegistry.clearSession(connection.userToken, "plugin WebSocket disconnected");
        }
    }

    private async handlePluginMessage(
        connection: ClientConnection,
        message: PluginToServerMessage<any>
    ): Promise<void> {
        if (this.isPluginHelloMessage(message)) {
            this.handlePluginHello(connection, message);
            return;
        }

        if (!connection.compatibility?.compatible) {
            this.logger.warn("Ignoring plugin message before successful MCP compatibility negotiation");
            return;
        }

        if (this.isFileContextUpdateMessage(message)) {
            this.handleFileContextUpdate(connection, message);
            return;
        }

        if (this.isFileContextBindRequestMessage(message)) {
            await this.handleFileContextBindRequest(connection, message);
            return;
        }

        if (this.isFileContextReleaseRequestMessage(message)) {
            this.handleFileContextReleaseRequest(connection, message);
            return;
        }

        if (this.isWrappedPluginTaskResponse(message)) {
            this.handlePluginTaskResponse(message.response);
            return;
        }

        if (this.isPluginTaskResponse(message)) {
            this.handlePluginTaskResponse(message);
            return;
        }

        this.logger.warn("Received unsupported WebSocket message from plugin");
    }

    private handlePluginHello(connection: ClientConnection, message: PluginHelloMessage): void {
        const compatibility = negotiatePluginCompatibility(message);
        connection.plugin = getPluginClientInfo(message);
        connection.compatibility = compatibility;
        this.sendPluginCompatibility(connection, compatibility);

        if (compatibility.compatible) {
            this.logger.info(
                "MCP plugin compatibility accepted: protocol=%s plugin=%s penpot=%s frontend=%s",
                message.protocolVersion,
                message.pluginVersion,
                message.penpotVersion ?? "<unknown>",
                message.frontendVersion ?? "<unknown>"
            );
            return;
        }

        this.logger.warn(
            "MCP plugin compatibility rejected: code=%s message=%s",
            compatibility.error?.code ?? "mcp_plugin_incompatible",
            compatibility.error?.message ?? "Incompatible MCP plugin"
        );
        setTimeout(() => {
            if (connection.socket.readyState === WebSocket.OPEN) {
                connection.socket.close(
                    1008,
                    this.truncateCloseReason(compatibility.error?.message ?? "Incompatible MCP plugin")
                );
            }
        }, 0);
    }

    private handleFileContextUpdate(connection: ClientConnection, message: PluginFileContextUpdateMessage): void {
        if (!message.context) {
            this.mcpServer.fileContextRegistry.clearSession(
                connection.userToken,
                message.reason ?? "plugin reported no file context"
            );
            this.logger.info("Plugin reported no available file context");
            return;
        }

        const context = this.mcpServer.fileContextRegistry.upsertContext(connection.userToken, message.context);
        this.logger.info(
            "Plugin file context updated: contextId=%s fileId=%s status=%s",
            context.contextId,
            context.fileId,
            context.status
        );
    }

    private async handleFileContextBindRequest(
        connection: ClientConnection,
        message: PluginFileContextBindRequestMessage
    ): Promise<void> {
        if (!message.context) {
            this.sendFileContextControlResult(connection, {
                type: "file-context-control-result",
                requestId: message.requestId,
                action: "bind",
                success: false,
                error: {
                    code: CommandErrorCodes.FILE_CONTEXT_REQUIRED,
                    message: "No current Penpot file context is available to bind.",
                },
            });
            return;
        }

        try {
            this.mcpServer.fileContextRegistry.upsertContext(connection.userToken, message.context);

            if (connection.userToken) {
                await this.mcpServer.rpcClient.get(
                    "get-file-summary",
                    { id: message.context.fileId },
                    connection.userToken
                );
            }

            const context = this.mcpServer.fileContextRegistry.bindContext(
                connection.userToken,
                message.context.contextId,
                new Date().toISOString()
            );

            this.sendFileContextControlResult(connection, {
                type: "file-context-control-result",
                requestId: message.requestId,
                action: "bind",
                success: Boolean(context),
                context,
                error: context
                    ? undefined
                    : {
                          code: "file_context_stale",
                          message: "The selected file context became stale before it could be bound.",
                      },
            });
        } catch (cause) {
            this.sendFileContextControlResult(connection, {
                type: "file-context-control-result",
                requestId: message.requestId,
                action: "bind",
                success: false,
                error: {
                    code: this.getErrorCode(cause, "file_context_bind_failed"),
                    message: cause instanceof Error ? cause.message : String(cause),
                },
            });
        }
    }

    private handleFileContextReleaseRequest(
        connection: ClientConnection,
        message: PluginFileContextReleaseRequestMessage
    ): void {
        const context = this.mcpServer.fileContextRegistry.releaseContext(connection.userToken);
        this.sendFileContextControlResult(connection, {
            type: "file-context-control-result",
            requestId: message.requestId,
            action: "release",
            success: true,
            context,
        });
    }

    private sendFileContextControlResult(
        connection: ClientConnection,
        message: PluginFileContextControlResultMessage
    ): void {
        if (connection.socket.readyState === WebSocket.OPEN) {
            connection.socket.send(JSON.stringify(message));
        }
    }

    private sendPluginCompatibility(connection: ClientConnection, message: ServerPluginCompatibilityMessage): void {
        if (connection.socket.readyState === WebSocket.OPEN) {
            connection.socket.send(JSON.stringify(message));
        }
    }

    private isPluginHelloMessage(message: unknown): message is PluginHelloMessage {
        return (
            this.isRecord(message) &&
            message.type === "plugin-hello" &&
            typeof message.protocolVersion === "string" &&
            typeof message.pluginVersion === "string" &&
            Array.isArray(message.capabilities) &&
            Array.isArray(message.fileContextCapabilities)
        );
    }

    private isFileContextUpdateMessage(message: unknown): message is PluginFileContextUpdateMessage {
        return this.isRecord(message) && message.type === "file-context-update";
    }

    private isFileContextBindRequestMessage(message: unknown): message is PluginFileContextBindRequestMessage {
        return (
            this.isRecord(message) &&
            message.type === "file-context-bind-request" &&
            typeof message.requestId === "string"
        );
    }

    private isFileContextReleaseRequestMessage(message: unknown): message is PluginFileContextReleaseRequestMessage {
        return (
            this.isRecord(message) &&
            message.type === "file-context-release-request" &&
            typeof message.requestId === "string"
        );
    }

    private isWrappedPluginTaskResponse(message: unknown): message is WrappedPluginTaskResponse<any> {
        return (
            this.isRecord(message) && message.type === "task-response" && this.isPluginTaskResponse(message.response)
        );
    }

    private isPluginTaskResponse(message: unknown): message is PluginTaskResponse<any> {
        return this.isRecord(message) && typeof message.id === "string" && typeof message.success === "boolean";
    }

    private isRecord(value: unknown): value is Record<string, any> {
        return typeof value === "object" && value !== null;
    }

    private getErrorCode(cause: unknown, fallback: string): string {
        if (this.isRecord(cause) && typeof cause.code === "string") {
            return cause.code;
        }
        return fallback;
    }

    /**
     * Handles responses from the plugin for completed tasks.
     *
     * Finds the pending task by ID and resolves or rejects its promise
     * based on the execution result.
     *
     * @param response - The plugin task response containing ID and result
     */
    private handlePluginTaskResponse(response: PluginTaskResponse<any>): void {
        const task = this.pendingTasks.get(response.id);
        if (!task) {
            this.logger.info(`Received response for unknown task ID: ${response.id}`);
            return;
        }

        // Clear the timeout and remove the task from pending tasks
        const timeoutHandle = this.taskTimeouts.get(response.id);
        if (timeoutHandle) {
            clearTimeout(timeoutHandle);
            this.taskTimeouts.delete(response.id);
        }
        this.pendingTasks.delete(response.id);

        // Resolve or reject the task's promise based on the result
        if (response.success) {
            task.resolveWithResult({ data: response.data });
        } else {
            const error = new Error(response.error || "Task execution failed (details not provided)");
            task.rejectWithError(error);
        }

        this.logger.info(`Task ${response.id} completed: success=${response.success}`);
    }

    /**
     * Determines the client connection to use for executing a task.
     *
     * In single-user mode, returns the single connected client.
     * In multi-user mode, returns the client matching the session's userToken.
     *
     * @returns The client connection to use
     * @throws Error if no suitable connection is found or if configuration is invalid
     */
    private getClientConnection(): ClientConnection {
        if (this.mcpServer.isMultiUserMode()) {
            const sessionContext = this.mcpServer.getSessionContext();
            if (!sessionContext?.userToken) {
                throw new Error("No userToken found in session context. Multi-user mode requires authentication.");
            }

            const connection = this.clientsByToken.get(sessionContext.userToken);
            if (!connection) {
                throw new Error(
                    `No plugin instance connected for user token. Please ensure the plugin is running and connected with the correct token.`
                );
            }

            this.assertConnectionCompatible(connection);
            return connection;
        } else {
            // single-user mode: return the single connected client
            if (this.connectedClients.size === 0) {
                throw new Error(
                    `No Penpot plugin instances are currently connected. Please ensure the plugin is running and connected.`
                );
            }
            if (this.connectedClients.size > 1) {
                throw new Error(
                    `Multiple (${this.connectedClients.size}) Penpot MCP Plugin instances are connected. ` +
                        `Ask the user to ensure that only one instance is connected at a time.`
                );
            }

            // return the first (and only) connection
            const connection = this.connectedClients.values().next().value;
            this.assertConnectionCompatible(<ClientConnection>connection);
            return <ClientConnection>connection;
        }
    }

    private assertConnectionCompatible(connection: ClientConnection): void {
        if (!connection.compatibility) {
            throw new Error("The connected Penpot MCP Plugin has not completed version/capability negotiation yet.");
        }

        if (!connection.compatibility.compatible) {
            throw new Error(
                connection.compatibility.error?.message ??
                    "The connected Penpot MCP Plugin is not compatible with this MCP server."
            );
        }
    }

    private truncateCloseReason(reason: string): string {
        return reason.length > 120 ? `${reason.slice(0, 117)}...` : reason;
    }

    /**
     * Executes a plugin task by sending it to connected clients.
     *
     * Registers the task for result correlation and returns a promise
     * that resolves when the plugin responds with the execution result.
     *
     * @param task - The plugin task to execute
     * @throws Error if no plugin instances are connected or available
     */
    public async executePluginTask<TResult extends PluginTaskResult<any>>(
        task: PluginTask<any, TResult>
    ): Promise<TResult> {
        // get the appropriate client connection based on mode
        const connection = this.getClientConnection();

        // register the task for result correlation
        this.pendingTasks.set(task.id, task);

        // send task to the selected client
        const requestMessage = JSON.stringify(task.toRequest());
        if (connection.socket.readyState !== 1) {
            // WebSocket is not open
            this.pendingTasks.delete(task.id);
            throw new Error(`Plugin instance is disconnected. Task could not be sent.`);
        }

        connection.socket.send(requestMessage);

        // Set up a timeout to reject the task if no response is received
        const timeoutHandle = setTimeout(() => {
            const pendingTask = this.pendingTasks.get(task.id);
            if (pendingTask) {
                this.pendingTasks.delete(task.id);
                this.taskTimeouts.delete(task.id);
                pendingTask.rejectWithError(
                    new Error(`Task ${task.id} timed out after ${this.taskTimeoutSecs} seconds`)
                );
            }
        }, this.taskTimeoutSecs * 1000);

        this.taskTimeouts.set(task.id, timeoutHandle);
        this.logger.info(`Sent task ${task.id} to connected client`);

        return await task.getResultPromise();
    }
}
