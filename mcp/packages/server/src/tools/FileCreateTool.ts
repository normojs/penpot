import { z } from "zod";
import type { ToolResponse } from "../ToolResponse.js";
import { PenpotMcpServer } from "../PenpotMcpServer.js";
import { ToolNames } from "../ToolNames.js";
import { PenpotRpcTool } from "./PenpotRpcTool.js";

type PenpotRecord = Record<string, unknown>;

export class FileCreateArgs {
    static schema = {
        projectId: z.string().uuid().describe("Project id where the new file should be created."),
        name: z
            .string()
            .min(1)
            .max(250)
            .optional()
            .describe("Optional file name. Defaults to 'Untitled' when omitted."),
        isShared: z.boolean().optional().describe("Whether the file should be shared. Defaults to false."),
    };

    projectId!: string;

    name?: string;

    isShared?: boolean;
}

export class FileCreateTool extends PenpotRpcTool<FileCreateArgs> {
    constructor(mcpServer: PenpotMcpServer) {
        super(mcpServer, FileCreateArgs.schema);
    }

    public getToolName(): string {
        return ToolNames.FILE_CREATE;
    }

    public getToolDescription(): string {
        return "Creates a new Penpot file in a project using the current user's permissions.";
    }

    protected async executeCore(args: FileCreateArgs): Promise<ToolResponse> {
        const userToken = this.getUserToken();
        if (!userToken) {
            return this.authenticationRequired();
        }

        if (!args.projectId) {
            return this.error(
                "project_id_required",
                "file.create requires a projectId. Use team.list and project.list to choose a target project.",
                [ToolNames.TEAM_LIST, ToolNames.PROJECT_LIST]
            );
        }

        const name = typeof args.name === "string" && args.name.trim() !== "" ? args.name.trim() : "Untitled";

        try {
            const file = await this.rpcWritePost<PenpotRecord>(
                "create-file",
                {
                    name,
                    "project-id": args.projectId,
                    "is-shared": args.isShared ?? false,
                },
                userToken,
                {
                    mcpAdapter: "backend-command",
                    mcpProjectId: args.projectId,
                }
            );

            return this.ok(
                {
                    file: this.summarizeFile(file, args.projectId, name),
                    nextActions: [
                        "Open the file in Penpot to bind a file context until file.open is implemented.",
                        ToolNames.FILE_LIST,
                    ],
                },
                ["file.open and file.bind_context are planned for Phase 4."]
            );
        } catch (cause) {
            return this.rpcFailure(cause);
        }
    }

    private summarizeFile(file: PenpotRecord, projectId: string, name: string): PenpotRecord {
        return {
            id: file.id,
            name: file.name ?? name,
            projectId: file.projectId ?? file["project-id"] ?? projectId,
            teamId: file.teamId ?? file["team-id"],
            revn: file.revn,
            vern: file.vern,
            isShared: file.isShared ?? file["is-shared"],
            createdAt: file.createdAt ?? file["created-at"],
            modifiedAt: file.modifiedAt ?? file["modified-at"],
        };
    }
}
