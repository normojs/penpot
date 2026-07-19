import { z } from "zod";
import type { ToolResponse } from "../ToolResponse.js";
import { PenpotMcpServer } from "../PenpotMcpServer.js";
import { ToolNames } from "../ToolNames.js";
import { PenpotRpcTool } from "./PenpotRpcTool.js";
import { CommandDescriptors, createCommandRequestEnvelope, createCommandResultEnvelope } from "@penpot/command-runtime";

type PenpotRecord = Record<string, unknown>;

export class FileDuplicateArgs {
    static schema = {
        fileId: z.string().uuid().describe("Source file id to duplicate."),
        name: z
            .string()
            .min(1)
            .max(250)
            .optional()
            .describe("Optional name for the duplicated file. Defaults to the backend-generated copy name."),
    };

    fileId!: string;

    name?: string;
}

export class FileDuplicateTool extends PenpotRpcTool<FileDuplicateArgs> {
    constructor(mcpServer: PenpotMcpServer) {
        super(mcpServer, FileDuplicateArgs.schema);
    }

    public getToolName(): string {
        return CommandDescriptors.FILE_DUPLICATE.mcpToolName;
    }

    public getToolDescription(): string {
        return CommandDescriptors.FILE_DUPLICATE.description;
    }

    protected async executeCore(args: FileDuplicateArgs): Promise<ToolResponse> {
        const userToken = this.getUserToken();
        if (!userToken) {
            return this.authenticationRequired();
        }

        if (!args.fileId) {
            return this.error(
                "file_id_required",
                "file.duplicate requires a fileId. Use file.list or file.search to choose a source file.",
                [ToolNames.FILE_LIST, ToolNames.FILE_SEARCH]
            );
        }

        const name = typeof args.name === "string" && args.name.trim() !== "" ? args.name.trim() : undefined;
        const requestEnvelope = createCommandRequestEnvelope(CommandDescriptors.FILE_DUPLICATE, {
            transport: "mcp",
            input: { fileId: args.fileId, name },
            target: { fileId: args.fileId },
            auth: { userTokenPresent: true, source: "mcp-session" },
            adapter: "backend-rpc",
        });

        try {
            const params: Record<string, unknown> = {
                "file-id": args.fileId,
            };
            if (name) {
                params.name = name;
            }

            const file = await this.rpcWritePost<PenpotRecord>("duplicate-file", params, userToken, {
                mcpAdapter: "backend-rpc",
                mcpFileId: args.fileId,
            });
            const summary = this.summarizeFile(file, name);
            const resultEnvelope = createCommandResultEnvelope(
                requestEnvelope,
                {
                    file: summary,
                    sourceFileId: args.fileId,
                    adapter: "backend-rpc",
                    nextActions: [
                        ToolNames.FILE_OPEN,
                        ToolNames.FILE_LIST,
                        "Open the duplicated file and bind context before using live-only tools.",
                    ],
                }
            );

            return this.ok(resultEnvelope.data, resultEnvelope.warnings);
        } catch (cause) {
            return this.rpcFailure(cause);
        }
    }

    private summarizeFile(file: PenpotRecord, fallbackName?: string): PenpotRecord {
        return {
            id: file.id,
            name: file.name ?? fallbackName,
            projectId: file.projectId ?? file["project-id"],
            teamId: file.teamId ?? file["team-id"],
            revn: file.revn,
            vern: file.vern,
            isShared: file.isShared ?? file["is-shared"],
            createdAt: file.createdAt ?? file["created-at"],
            modifiedAt: file.modifiedAt ?? file["modified-at"],
        };
    }
}
