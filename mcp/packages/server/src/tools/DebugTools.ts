import { readdir, stat } from "node:fs/promises";
import { basename, join } from "node:path";
import { EmptyToolArgs, Tool } from "../Tool.js";
import "reflect-metadata";
import type { ToolResponse } from "../ToolResponse.js";
import { JsonResponse } from "../ToolResponse.js";
import { PenpotMcpServer } from "../PenpotMcpServer.js";
import { ToolNames } from "../ToolNames.js";
import { getLogStatus } from "../logger.js";
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

export type AgentLogFileMeta = {
    name: string;
    sizeBytes: number;
    modifiedAt: string;
};

/**
 * Patterns that must never appear in MCP/CLI debug log payloads.
 * Used by redaction fixtures and any future gated tail path.
 */
export const LOG_REDACTION_PATTERNS: readonly RegExp[] = Object.freeze([
    /Authorization\s*:\s*\S+/gi,
    /Token\s+[A-Za-z0-9._~+/=-]+/gi,
    /userToken=([^\s&]+)/gi,
    /Bearer\s+[A-Za-z0-9._~+/=-]+/gi,
    /"token"\s*:\s*"[^"]+"/gi,
    /cookie:\s*[^\n]+/gi,
]);

export function redactLogLine(line: string): string {
    let out = line;
    for (const pattern of LOG_REDACTION_PATTERNS) {
        out = out.replace(pattern, "[REDACTED]");
    }
    // Drop very long base64-looking blobs (common in accidental token dumps).
    out = out.replace(/[A-Za-z0-9+/]{80,}={0,2}/g, "[REDACTED_BLOB]");
    return out;
}

export function assertNoSensitiveLogPayload(payload: string): void {
    const lowered = payload.toLowerCase();
    if (lowered.includes("authorization:") && !lowered.includes("[redacted]")) {
        throw new Error("sensitive authorization material leaked in log payload");
    }
    if (/userToken=[^\s&]+/i.test(payload) && !payload.includes("[REDACTED]")) {
        throw new Error("userToken query value leaked in log payload");
    }
}

export async function listAgentLogFileMetadata(logDir: string | null | undefined): Promise<AgentLogFileMeta[]> {
    if (!logDir || typeof logDir !== "string" || logDir.trim().length === 0) {
        return [];
    }
    try {
        const entries = await readdir(logDir, { withFileTypes: true });
        const files = await Promise.all(
            entries
                .filter((entry) => entry.isFile() && entry.name.endsWith(".log"))
                .map(async (entry) => {
                    const filePath = join(logDir, entry.name);
                    const stats = await stat(filePath);
                    return {
                        name: entry.name,
                        sizeBytes: stats.size,
                        modifiedAt: stats.mtime.toISOString(),
                    } satisfies AgentLogFileMeta;
                })
        );
        return files.sort((left, right) => right.modifiedAt.localeCompare(left.modifiedAt));
    } catch {
        return [];
    }
}

export function projectAgentLogs(options: {
    enabled: boolean;
    remoteMode: boolean;
    loggingStatus: {
        level?: string;
        file?: { enabled?: boolean; path?: string | null };
        console?: { enabled?: boolean };
        loki?: { enabled?: boolean };
    };
    files: AgentLogFileMeta[];
}): Record<string, unknown> {
    const fileEnabled = Boolean(options.loggingStatus.file?.enabled);
    const activePath = options.loggingStatus.file?.path ?? null;
    const activeName = activePath ? basename(activePath) : null;

    return {
        adapter: "local",
        enabled: options.enabled,
        enablement: {
            env: DEBUG_TOOLS_ENABLE_ENV,
            enabledValue: "true",
        },
        logging: {
            fileLoggingEnabled: fileEnabled,
            logDirConfigured: fileEnabled || options.files.length > 0,
            activeLogFilePresent: Boolean(activePath),
            // Avoid absolute host paths in remote/multi-user MCP responses.
            activeLogFileName: activeName,
            level: options.loggingStatus.level ?? null,
            consoleEnabled: Boolean(options.loggingStatus.console?.enabled),
            lokiEnabled: Boolean(options.loggingStatus.loki?.enabled),
        },
        files: options.files.map((file) => ({
            name: file.name,
            sizeBytes: file.sizeBytes,
            modifiedAt: file.modifiedAt,
        })),
        content: null,
        contentPolicy: "metadata-only-default",
        nextActions: [
            ToolNames.MCP_GET_STATUS,
            "Use penpot-cli mcp logs --dir <path> for operator listing",
            "Use penpot-cli mcp logs --dir <path> --follow for operator tail",
        ],
    };
}

/**
 * Gated advanced diagnostics: metadata-only log directory summary.
 * Never returns log bodies by default. Follow/tail stays CLI-only.
 */
export class DebugGetAgentLogsTool extends Tool<EmptyToolArgs> {
    constructor(mcpServer: PenpotMcpServer) {
        super(mcpServer, EmptyToolArgs.schema);
    }

    public getToolName(): string {
        return CommandDescriptors.DEBUG_GET_AGENT_LOGS.mcpToolName!;
    }

    public getToolDescription(): string {
        return CommandDescriptors.DEBUG_GET_AGENT_LOGS.description;
    }

    protected async executeCore(_args: EmptyToolArgs): Promise<ToolResponse> {
        if (!this.mcpServer.isDebugToolsEnabled()) {
            return new JsonResponse({
                status: "error",
                error: {
                    code: DebugToolsErrorCodes.DEBUG_TOOLS_DISABLED,
                    message:
                        "debug.get_agent_logs is disabled. Use mcp.get_status for config flags, or penpot-cli mcp logs for operator listing. Set PENPOT_MCP_ENABLE_DEBUG_TOOLS=true to enable gated debug tools.",
                    actions: [
                        ToolNames.MCP_GET_STATUS,
                        "Use penpot-cli mcp logs --dir <path>",
                        "Set PENPOT_MCP_ENABLE_DEBUG_TOOLS=true on the MCP server",
                    ],
                    config: {
                        env: DEBUG_TOOLS_ENABLE_ENV,
                        enabledValue: "true",
                    },
                },
            });
        }

        const status = this.mcpServer.getStatus();
        const sessionContext = this.getSessionContext();
        const loggingStatus = getLogStatus();
        const logDir = process.env.PENPOT_MCP_LOG_DIR ?? null;
        const files = await listAgentLogFileMetadata(logDir);
        const projection = projectAgentLogs({
            enabled: true,
            remoteMode: Boolean(status.server.remoteMode),
            loggingStatus,
            files,
        });

        // Defense in depth: never return absolute paths or body content.
        assertNoSensitiveLogPayload(JSON.stringify(projection));

        const requestEnvelope = createCommandRequestEnvelope(CommandDescriptors.DEBUG_GET_AGENT_LOGS, {
            transport: "mcp",
            target: { mcpSessionId: sessionContext?.mcpSessionId },
            auth: {
                userTokenPresent: Boolean(sessionContext?.userToken),
                mode: status.server.multiUserMode ? "multi-user" : "single-user",
                source: "mcp-session",
            },
            adapter: "local",
            diagnostics: {
                debugToolsEnabled: true,
                contentPolicy: "metadata-only-default",
            },
        });
        const resultEnvelope = createCommandResultEnvelope(requestEnvelope, projection);

        return new JsonResponse({
            status: resultEnvelope.status,
            data: resultEnvelope.data,
            warnings: resultEnvelope.warnings,
        });
    }
}
