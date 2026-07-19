import { EmptyToolArgs } from "../Tool.js";
import type { ToolResponse } from "../ToolResponse.js";
import { PenpotMcpServer } from "../PenpotMcpServer.js";
import { ToolNames } from "../ToolNames.js";
import { PenpotRpcTool } from "./PenpotRpcTool.js";
import { CommandDescriptors, createCommandRequestEnvelope, createCommandResultEnvelope } from "@penpot/command-runtime";

type PenpotRecord = Record<string, unknown>;

function asRecord(value: unknown): PenpotRecord {
    return value !== null && typeof value === "object" && !Array.isArray(value)
        ? (value as PenpotRecord)
        : {};
}

/**
 * Summarize an MCP access-token row without ever returning the raw token value.
 * Backend `get-current-mcp-token` may include `:token`; strip it here.
 */
export function summarizeMcpToken(row: unknown, sessionUserTokenPresent: boolean): PenpotRecord {
    if (row == null) {
        return {
            present: false,
            expiresAt: null,
            session: {
                userTokenPresent: sessionUserTokenPresent,
            },
            rawTokenPresent: false,
            nextActions: [
                "Create or regenerate an MCP token in Penpot Settings → Integrations.",
                ToolNames.MCP_GET_STATUS,
            ],
        };
    }

    const record = asRecord(row);
    const expiresAt = record.expiresAt ?? record["expires-at"] ?? null;
    const rawTokenPresent = typeof record.token === "string" && record.token.length > 0;
    const present = rawTokenPresent || expiresAt !== null || Boolean(record.id);

    return {
        present,
        expiresAt,
        session: {
            userTokenPresent: sessionUserTokenPresent,
        },
        rawTokenPresent,
        nextActions: present
            ? [
                  ToolNames.MCP_GET_STATUS,
                  "Use the MCP stream URL with ?userToken=... from Settings when reconnecting.",
              ]
            : [
                  "Create or regenerate an MCP token in Penpot Settings → Integrations.",
                  ToolNames.MCP_GET_STATUS,
              ],
    };
}

export class TokenGetMcpStatusTool extends PenpotRpcTool<EmptyToolArgs> {
    constructor(mcpServer: PenpotMcpServer) {
        super(mcpServer, EmptyToolArgs.schema);
    }

    public getToolName(): string {
        return CommandDescriptors.TOKEN_GET_MCP_STATUS.mcpToolName!;
    }

    public getToolDescription(): string {
        return CommandDescriptors.TOKEN_GET_MCP_STATUS.description;
    }

    protected async executeCore(_args: EmptyToolArgs): Promise<ToolResponse> {
        const userToken = this.getUserToken();
        if (!userToken) {
            return this.authenticationRequired();
        }

        const requestEnvelope = createCommandRequestEnvelope(CommandDescriptors.TOKEN_GET_MCP_STATUS, {
            transport: "mcp",
            input: {},
            auth: { userTokenPresent: true, source: "mcp-session" },
            adapter: "backend-rpc",
        });

        try {
            const row = await this.rpcGet<PenpotRecord | null>("get-current-mcp-token", {}, userToken);
            const summary = summarizeMcpToken(row, true);
            const resultEnvelope = createCommandResultEnvelope(requestEnvelope, {
                present: summary.present,
                expiresAt: summary.expiresAt,
                session: summary.session,
                rawTokenPresent: summary.rawTokenPresent,
                nextActions: summary.nextActions,
                adapter: "backend-rpc",
            });
            return this.ok(resultEnvelope.data, resultEnvelope.warnings);
        } catch (cause) {
            return this.rpcFailure(cause);
        }
    }
}
