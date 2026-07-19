import { z } from "zod";
import { EmptyToolArgs } from "../Tool.js";
import type { ToolResponse } from "../ToolResponse.js";
import { PenpotMcpServer } from "../PenpotMcpServer.js";
import { ToolNames } from "../ToolNames.js";
import { PenpotRpcTool } from "./PenpotRpcTool.js";
import { CommandDescriptors, createCommandRequestEnvelope, createCommandResultEnvelope } from "@penpot/command-runtime";

type PenpotRecord = Record<string, unknown>;

export class AccountGetCurrentUserTool extends PenpotRpcTool<EmptyToolArgs> {
    constructor(mcpServer: PenpotMcpServer) {
        super(mcpServer, EmptyToolArgs.schema);
    }

    public getToolName(): string {
        return CommandDescriptors.ACCOUNT_GET_CURRENT_USER.mcpToolName!;
    }

    public getToolDescription(): string {
        return CommandDescriptors.ACCOUNT_GET_CURRENT_USER.description;
    }

    protected async executeCore(_args: EmptyToolArgs): Promise<ToolResponse> {
        const userToken = this.getUserToken();
        if (!userToken) {
            return this.authenticationRequired();
        }

        const requestEnvelope = createCommandRequestEnvelope(CommandDescriptors.ACCOUNT_GET_CURRENT_USER, {
            transport: "mcp",
            input: {},
            auth: { userTokenPresent: true, source: "mcp-session" },
            adapter: "backend-rpc",
        });

        try {
            const profile = await this.rpcGet<PenpotRecord>("get-profile", {}, userToken);
            const resultEnvelope = createCommandResultEnvelope(requestEnvelope, {
                profile,
                adapter: "backend-rpc",
            });
            return this.ok(resultEnvelope.data, resultEnvelope.warnings);
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
        return CommandDescriptors.TEAM_LIST.mcpToolName!;
    }

    public getToolDescription(): string {
        return CommandDescriptors.TEAM_LIST.description;
    }

    protected async executeCore(_args: EmptyToolArgs): Promise<ToolResponse> {
        const userToken = this.getUserToken();
        if (!userToken) {
            return this.authenticationRequired();
        }

        const requestEnvelope = createCommandRequestEnvelope(CommandDescriptors.TEAM_LIST, {
            transport: "mcp",
            input: {},
            auth: { userTokenPresent: true, source: "mcp-session" },
            adapter: "backend-rpc",
        });

        try {
            const teams = await this.rpcGet<PenpotRecord[]>("get-teams", {}, userToken);
            const resultEnvelope = createCommandResultEnvelope(requestEnvelope, {
                teams,
                adapter: "backend-rpc",
            });
            return this.ok(resultEnvelope.data, resultEnvelope.warnings);
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
        return CommandDescriptors.PROJECT_LIST.mcpToolName!;
    }

    public getToolDescription(): string {
        return CommandDescriptors.PROJECT_LIST.description;
    }

    protected async executeCore(args: ProjectListArgs): Promise<ToolResponse> {
        const userToken = this.getUserToken();
        if (!userToken) {
            return this.authenticationRequired();
        }

        const requestEnvelope = createCommandRequestEnvelope(CommandDescriptors.PROJECT_LIST, {
            transport: "mcp",
            input: { teamId: args.teamId },
            target: args.teamId ? { teamId: args.teamId } : undefined,
            auth: { userTokenPresent: true, source: "mcp-session" },
            adapter: "backend-rpc",
        });

        try {
            if (args.teamId) {
                const projects = await this.rpcGet<PenpotRecord[]>(
                    "get-projects",
                    { "team-id": args.teamId },
                    userToken
                );
                const resultEnvelope = createCommandResultEnvelope(requestEnvelope, {
                    teamId: args.teamId,
                    projects,
                    adapter: "backend-rpc",
                });
                return this.ok(resultEnvelope.data, resultEnvelope.warnings);
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

            const resultEnvelope = createCommandResultEnvelope(requestEnvelope, {
                teams: teamsWithProjects,
                adapter: "backend-rpc",
            });
            return this.ok(resultEnvelope.data, resultEnvelope.warnings);
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
        return CommandDescriptors.FILE_GET_RECENT.mcpToolName!;
    }

    public getToolDescription(): string {
        return CommandDescriptors.FILE_GET_RECENT.description;
    }

    protected async executeCore(args: FileGetRecentArgs): Promise<ToolResponse> {
        const userToken = this.getUserToken();
        if (!userToken) {
            return this.authenticationRequired();
        }

        const requestEnvelope = createCommandRequestEnvelope(CommandDescriptors.FILE_GET_RECENT, {
            transport: "mcp",
            input: { teamId: args.teamId, limit: args.limit },
            target: { teamId: args.teamId },
            auth: { userTokenPresent: true, source: "mcp-session" },
            adapter: "backend-rpc",
        });

        try {
            const files = await this.rpcGet<PenpotRecord[]>(
                "get-team-recent-files",
                { "team-id": args.teamId },
                userToken
            );
            const limitedFiles = args.limit ? files.slice(0, args.limit) : files;
            const resultEnvelope = createCommandResultEnvelope(requestEnvelope, {
                teamId: args.teamId,
                limit: args.limit,
                files: limitedFiles,
                adapter: "backend-rpc",
            });
            return this.ok(resultEnvelope.data, resultEnvelope.warnings);
        } catch (cause) {
            return this.rpcFailure(cause);
        }
    }
}
