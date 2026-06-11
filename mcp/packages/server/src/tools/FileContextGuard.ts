import type { PenpotMcpServer } from "../PenpotMcpServer.js";
import type { ToolResponse } from "../ToolResponse.js";
import { JsonResponse } from "../ToolResponse.js";
import { FileContextErrorCodes } from "../FileContextRegistry.js";
import { ToolNames } from "../ToolNames.js";

const FILE_CONTEXT_REQUIRED_ACTIONS = [
    ToolNames.FILE_GET_CONTEXT,
    ToolNames.FILE_BIND_CONTEXT,
    ToolNames.FILE_LIST,
    ToolNames.FILE_GET_RECENT,
];

export function requireBoundFileContext(
    mcpServer: PenpotMcpServer,
    userToken: string | null | undefined,
    toolName: string
): ToolResponse | null {
    const fileContext = mcpServer.fileContextRegistry.getSessionSummary(userToken);
    if (fileContext.bound && fileContext.boundContext?.status === "bound") {
        return null;
    }

    return fileContextRequiredResponse(toolName, fileContext);
}

export function fileContextRequiredResponse(toolName: string, fileContext: unknown): ToolResponse {
    return new JsonResponse({
        status: "error",
        error: {
            code: FileContextErrorCodes.FILE_CONTEXT_REQUIRED,
            message: `${toolName} requires a bound Penpot file context before it can run.`,
            actions: FILE_CONTEXT_REQUIRED_ACTIONS,
            data: {
                fileContext,
            },
        },
    });
}
