import { z } from "zod";
import { EmptyToolArgs, Tool } from "../Tool";
import type { ToolResponse } from "../ToolResponse";
import { JsonResponse } from "../ToolResponse";
import { PenpotMcpServer } from "../PenpotMcpServer";
import { PenpotRpcError, RpcParams } from "../PenpotRpcClient";
import { ToolNames } from "../ToolNames";

type PenpotRecord = Record<string, unknown>;

export abstract class PenpotRpcTool<TArgs extends object> extends Tool<TArgs> {
    protected constructor(mcpServer: PenpotMcpServer, inputSchema: z.ZodRawShape) {
        super(mcpServer, inputSchema);
    }

    protected getUserToken(): string | undefined {
        return this.getSessionContext()?.userToken;
    }

    protected ok(data: unknown, warnings: string[] = []): ToolResponse {
        return new JsonResponse({
            status: "ok",
            data,
            warnings,
        });
    }

    protected authenticationRequired(): ToolResponse {
        return this.error(
            "authentication_required",
            "This MCP tool requires a Penpot MCP access token for the current session.",
            ["Reconnect MCP with a userToken query parameter."]
        );
    }

    protected error(code: string, message: string, actions: string[] = [], data?: unknown): ToolResponse {
        return new JsonResponse({
            status: "error",
            error: {
                code,
                message,
                actions,
                data,
            },
        });
    }

    protected rpcFailure(cause: unknown): ToolResponse {
        if (cause instanceof PenpotRpcError) {
            return new JsonResponse({
                status: "error",
                error: {
                    code: cause.code,
                    message: cause.message,
                    status: cause.status,
                    data: cause.data,
                },
            });
        }

        return new JsonResponse({
            status: "error",
            error: {
                code: "penpot_rpc_error",
                message: String(cause),
            },
        });
    }

    protected async rpcGet<T>(methodName: string, params: RpcParams, userToken: string): Promise<T> {
        return await this.mcpServer.rpcClient.get<T>(methodName, params, userToken);
    }
}

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
        return ToolNames.FILE_LIST;
    }

    public getToolDescription(): string {
        return "Lists files in a Penpot project using the current user's permissions.";
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
            return this.ok({ projectId: args.projectId, files });
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
