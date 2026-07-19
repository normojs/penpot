import { z } from "zod";
import { EmptyToolArgs } from "../Tool";
import type { ToolResponse } from "../ToolResponse";
import { PenpotMcpServer } from "../PenpotMcpServer";
import { ToolNames } from "../ToolNames";
import { PenpotRpcTool } from "./PenpotRpcTool";
import { CommandDescriptors, createCommandRequestEnvelope, createCommandResultEnvelope } from "@penpot/command-runtime";

type PenpotRecord = Record<string, unknown>;

export class AccountGetCurrentUserTool extends PenpotRpcTool<EmptyToolArgs> {
    constructor(mcpServer: PenpotMcpServer) {
        super(mcpServer, EmptyToolArgs.schema);
    }

    public getToolName(): string {
        return ToolNames.ACCOUNT_GET_CURRENT_USER;
    }

    public getToolDescription(): string {
        return "Returns the current Penpot profile for the MCP access token.";
    }

    protected async executeCore(args: EmptyToolArgs): Promise<ToolResponse> {
        const userToken = this.getUserToken();
        if (!userToken) {
            return this.authenticationRequired();
        }

        try {
            const profile = await this.rpcGet<PenpotRecord>("get-profile", {}, userToken);
            return this.ok({ profile });
        } catch (cause) {
            return this.rpcFailure(cause);
        }
    }
}

export class TeamListTool extends PenpotRpcTool<EmptyToolArgs> {
    constructor(mcpServer: PenpotMcpServer) {
        super(mcpServer, EmptyToolArgs.schema);
    }

    public getToolName(): string {
        return ToolNames.TEAM_LIST;
    }

    public getToolDescription(): string {
        return "Lists teams available to the current Penpot user.";
    }

    protected async executeCore(args: EmptyToolArgs): Promise<ToolResponse> {
        const userToken = this.getUserToken();
        if (!userToken) {
            return this.authenticationRequired();
        }

        try {
            const teams = await this.rpcGet<PenpotRecord[]>("get-teams", {}, userToken);
            return this.ok({ teams });
        } catch (cause) {
            return this.rpcFailure(cause);
        }
    }
}

export class ProjectListArgs {
    static schema = {
        teamId: z
            .string()
            .uuid()
            .optional()
            .describe("Optional team id. If omitted, projects are listed for every team available to the user."),
    };

    teamId?: string;
}

export class ProjectListTool extends PenpotRpcTool<ProjectListArgs> {
    constructor(mcpServer: PenpotMcpServer) {
        super(mcpServer, ProjectListArgs.schema);
    }

    public getToolName(): string {
        return ToolNames.PROJECT_LIST;
    }

    public getToolDescription(): string {
        return "Lists projects for a Penpot team, or for all teams when no teamId is provided.";
    }

    protected async executeCore(args: ProjectListArgs): Promise<ToolResponse> {
        const userToken = this.getUserToken();
        if (!userToken) {
            return this.authenticationRequired();
        }

        try {
            if (args.teamId) {
                const projects = await this.rpcGet<PenpotRecord[]>(
                    "get-projects",
                    { "team-id": args.teamId },
                    userToken
                );
                return this.ok({ teamId: args.teamId, projects });
            }

            const teams = await this.rpcGet<PenpotRecord[]>("get-teams", {}, userToken);
            const teamsWithProjects = await Promise.all(
                teams.map(async (team) => {
                    const teamId = String(team.id);
                    const projects = await this.rpcGet<PenpotRecord[]>(
                        "get-projects",
                        { "team-id": teamId },
                        userToken
                    );
                    return { team, projects };
                })
            );

            return this.ok({ teams: teamsWithProjects });
        } catch (cause) {
            return this.rpcFailure(cause);
        }
    }
}

export class FileListArgs {
    static schema = {
        projectId: z.string().uuid().describe("Project id returned by project.list."),
    };

    projectId!: string;
}

export class FileListTool extends PenpotRpcTool<FileListArgs> {
    constructor(mcpServer: PenpotMcpServer) {
        super(mcpServer, FileListArgs.schema);
    }

    public getToolName(): string {
        return CommandDescriptors.FILE_LIST.mcpToolName;
    }

    public getToolDescription(): string {
        return CommandDescriptors.FILE_LIST.description;
    }

    protected async executeCore(args: FileListArgs): Promise<ToolResponse> {
        const userToken = this.getUserToken();
        if (!userToken) {
            return this.authenticationRequired();
        }

        try {
            const files = await this.rpcGet<PenpotRecord[]>(
                "get-project-files",
                { "project-id": args.projectId },
                userToken
            );
            const requestEnvelope = createCommandRequestEnvelope(CommandDescriptors.FILE_LIST, {
                transport: "mcp",
                input: { projectId: args.projectId },
                target: { projectId: args.projectId },
                auth: { userTokenPresent: true, source: "mcp-session" },
                adapter: "backend-rpc",
            });
            const resultEnvelope = createCommandResultEnvelope(requestEnvelope, { projectId: args.projectId, files });
            return this.ok(resultEnvelope.data, resultEnvelope.warnings);
        } catch (cause) {
            return this.rpcFailure(cause);
        }
    }
}

export class FileSearchArgs {
    static schema = {
        teamId: z.string().uuid().describe("Team id returned by team.list."),
        searchTerm: z
            .string()
            .min(1)
            .describe("Case-insensitive name substring to match against accessible team files."),
    };

    teamId!: string;

    searchTerm!: string;
}

export class FileSearchTool extends PenpotRpcTool<FileSearchArgs> {
    constructor(mcpServer: PenpotMcpServer) {
        super(mcpServer, FileSearchArgs.schema);
    }

    public getToolName(): string {
        return CommandDescriptors.FILE_SEARCH.mcpToolName;
    }

    public getToolDescription(): string {
        return CommandDescriptors.FILE_SEARCH.description;
    }

    protected async executeCore(args: FileSearchArgs): Promise<ToolResponse> {
        const userToken = this.getUserToken();
        if (!userToken) {
            return this.authenticationRequired();
        }

        const searchTerm = typeof args.searchTerm === "string" ? args.searchTerm.trim() : "";
        if (!searchTerm) {
            return this.error(
                "search_term_required",
                "file.search requires a non-empty searchTerm. Use a name substring that appears in accessible team files.",
                [ToolNames.TEAM_LIST, ToolNames.FILE_LIST]
            );
        }

        try {
            const files =
                (await this.rpcGet<PenpotRecord[] | null>(
                    "search-files",
                    {
                        "team-id": args.teamId,
                        "search-term": searchTerm,
                    },
                    userToken
                )) ?? [];
            const requestEnvelope = createCommandRequestEnvelope(CommandDescriptors.FILE_SEARCH, {
                transport: "mcp",
                input: { teamId: args.teamId, searchTerm },
                target: { teamId: args.teamId },
                auth: { userTokenPresent: true, source: "mcp-session" },
                adapter: "backend-rpc",
            });
            const resultEnvelope = createCommandResultEnvelope(requestEnvelope, {
                teamId: args.teamId,
                searchTerm,
                files,
                adapter: "backend-rpc",
            });
            return this.ok(resultEnvelope.data, resultEnvelope.warnings);
        } catch (cause) {
            return this.rpcFailure(cause);
        }
    }
}

export class FileGetRecentArgs {
    static schema = {
        teamId: z.string().uuid().describe("Team id returned by team.list."),
        limit: z
            .number()
            .int()
            .positive()
            .max(100)
            .optional()
            .describe("Optional maximum number of recent files to return after the backend query."),
    };

    teamId!: string;

    limit?: number;
}

export class FileGetRecentTool extends PenpotRpcTool<FileGetRecentArgs> {
    constructor(mcpServer: PenpotMcpServer) {
        super(mcpServer, FileGetRecentArgs.schema);
    }

    public getToolName(): string {
        return ToolNames.FILE_GET_RECENT;
    }

    public getToolDescription(): string {
        return "Lists recently modified files for a Penpot team.";
    }

    protected async executeCore(args: FileGetRecentArgs): Promise<ToolResponse> {
        const userToken = this.getUserToken();
        if (!userToken) {
            return this.authenticationRequired();
        }

        try {
            const files = await this.rpcGet<PenpotRecord[]>(
                "get-team-recent-files",
                { "team-id": args.teamId },
                userToken
            );
            const limitedFiles = args.limit ? files.slice(0, args.limit) : files;
            return this.ok({ teamId: args.teamId, files: limitedFiles });
        } catch (cause) {
            return this.rpcFailure(cause);
        }
    }
}
