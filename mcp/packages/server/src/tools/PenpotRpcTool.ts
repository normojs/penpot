import { z } from "zod";
import { Tool } from "../Tool.js";
import type { ToolResponse } from "../ToolResponse.js";
import { JsonResponse } from "../ToolResponse.js";
import { PenpotMcpServer } from "../PenpotMcpServer.js";
import { PenpotRpcError, RpcParams } from "../PenpotRpcClient.js";
import type { PenpotRpcRequestContext } from "../PenpotRpcClient.js";
import { CommandErrorCodes } from "@penpot/command-runtime";

export const ToolErrorCodes = {
    AUTHENTICATION_REQUIRED: CommandErrorCodes.AUTHENTICATION_REQUIRED,
    BACKEND_CONFIG_INVALID: CommandErrorCodes.BACKEND_CONFIG_INVALID,
    BACKEND_UNAVAILABLE: CommandErrorCodes.BACKEND_UNAVAILABLE,
    OBJECT_NOT_FOUND_OR_FORBIDDEN: CommandErrorCodes.OBJECT_NOT_FOUND_OR_FORBIDDEN,
    PERMISSION_DENIED: CommandErrorCodes.PERMISSION_DENIED,
    PENPOT_RPC_ERROR: CommandErrorCodes.PENPOT_RPC_ERROR,
    RATE_LIMIT_REACHED: CommandErrorCodes.RATE_LIMIT_REACHED,
    ADAPTER_NOT_AVAILABLE: CommandErrorCodes.ADAPTER_NOT_AVAILABLE,
    ADAPTER_NOT_SUPPORTED: CommandErrorCodes.ADAPTER_NOT_SUPPORTED,
    MCP_WRITE_CONCURRENCY_LIMIT: CommandErrorCodes.MCP_WRITE_CONCURRENCY_LIMIT,
    MCP_WRITE_RATE_LIMIT: CommandErrorCodes.MCP_WRITE_RATE_LIMIT,
    DESTRUCTIVE_ACTION_CONFIRMATION_REQUIRED: CommandErrorCodes.DESTRUCTIVE_ACTION_CONFIRMATION_REQUIRED,
} as const;

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
            ToolErrorCodes.AUTHENTICATION_REQUIRED,
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
            return this.error(cause.code, cause.message, this.actionsForErrorCode(cause.code), {
                status: cause.status,
                data: cause.data,
            });
        }

        return this.error(ToolErrorCodes.PENPOT_RPC_ERROR, String(cause));
    }

    protected async rpcGet<T>(methodName: string, params: RpcParams, userToken: string): Promise<T> {
        return await this.mcpServer.rpcClient.get<T>(methodName, params, userToken);
    }

    protected async rpcPost<T>(
        methodName: string,
        params: RpcParams,
        userToken: string,
        context?: PenpotRpcRequestContext
    ): Promise<T> {
        return await this.mcpServer.rpcClient.post<T>(methodName, params, userToken, context);
    }

    protected async rpcWritePost<T>(
        methodName: string,
        params: RpcParams,
        userToken: string,
        context: Omit<PenpotRpcRequestContext, "mcpToolName" | "mcpSessionId"> = {}
    ): Promise<T> {
        const writeContext = this.rpcWriteContext(context);
        const lease = this.mcpServer.writeLimiter.acquire({
            toolName: this.getToolName(),
            userToken,
            sessionId: writeContext.mcpSessionId,
            fileId: writeContext.mcpFileId,
        });

        if (!lease.acquired) {
            throw new PenpotRpcError(429, lease.rejection.message, lease.rejection.code, lease.rejection);
        }

        try {
            return await this.rpcPost<T>(methodName, params, userToken, writeContext);
        } finally {
            lease.release();
        }
    }

    protected rpcWriteContext(
        context: Omit<PenpotRpcRequestContext, "mcpToolName" | "mcpSessionId"> = {}
    ): PenpotRpcRequestContext {
        return {
            mcpToolName: this.getToolName(),
            mcpSessionId: this.getSessionContext()?.mcpSessionId,
            ...context,
        };
    }

    private actionsForErrorCode(code: string): string[] {
        switch (code) {
            case ToolErrorCodes.AUTHENTICATION_REQUIRED:
                return ["Reconnect MCP with a valid userToken query parameter."];
            case ToolErrorCodes.BACKEND_CONFIG_INVALID:
                return ["Set PENPOT_BACKEND_URI or PENPOT_PUBLIC_URI to a valid Penpot backend URL."];
            case ToolErrorCodes.BACKEND_UNAVAILABLE:
                return ["Start the Penpot backend.", "Check PENPOT_BACKEND_URI and network reachability."];
            case ToolErrorCodes.PERMISSION_DENIED:
            case ToolErrorCodes.OBJECT_NOT_FOUND_OR_FORBIDDEN:
                return ["Use team.list, project.list, and file.list to choose a resource available to this user."];
            case ToolErrorCodes.RATE_LIMIT_REACHED:
                return ["Wait for the backend rate or concurrency window to clear, then retry the command."];
            case ToolErrorCodes.MCP_WRITE_CONCURRENCY_LIMIT:
                return ["Wait for the current MCP write to finish, then retry the same command."];
            case ToolErrorCodes.MCP_WRITE_RATE_LIMIT:
                return ["Wait until the reported retryAfterMs has elapsed, then retry the command."];
            case ToolErrorCodes.DESTRUCTIVE_ACTION_CONFIRMATION_REQUIRED:
                return ["Repeat the same tool call with confirm: true when you intend to perform this action."];
            default:
                return [];
        }
    }
}
