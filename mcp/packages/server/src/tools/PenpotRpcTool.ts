import { z } from "zod";
import { Tool } from "../Tool.js";
import type { ToolResponse } from "../ToolResponse.js";
import { JsonResponse } from "../ToolResponse.js";
import { PenpotMcpServer } from "../PenpotMcpServer.js";
import { PenpotRpcError, RpcParams } from "../PenpotRpcClient.js";

export const ToolErrorCodes = {
    AUTHENTICATION_REQUIRED: "authentication_required",
    BACKEND_CONFIG_INVALID: "penpot_backend_config_invalid",
    BACKEND_UNAVAILABLE: "penpot_backend_unavailable",
    OBJECT_NOT_FOUND_OR_FORBIDDEN: "object_not_found_or_forbidden",
    PERMISSION_DENIED: "permission_denied",
    PENPOT_RPC_ERROR: "penpot_rpc_error",
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

    protected async rpcPost<T>(methodName: string, params: RpcParams, userToken: string): Promise<T> {
        return await this.mcpServer.rpcClient.post<T>(methodName, params, userToken);
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
            default:
                return [];
        }
    }
}
