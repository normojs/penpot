import type { PenpotMcpServer } from "../PenpotMcpServer.js";
import type { ToolResponse } from "../ToolResponse.js";
import { JsonResponse } from "../ToolResponse.js";
import type { FileContextSessionSummary, StoredFileContext } from "../FileContextRegistry.js";
import { createFileOpenHandoff, createWorkspaceUrl } from "@penpot/command-runtime";
import { FileContextErrorCodes } from "../FileContextRegistry.js";
import { ToolNames } from "../ToolNames.js";

const DEFAULT_PUBLIC_URI = "http://localhost:3449";
const RETRY_ORIGINAL_TOOL_ACTION = "retry_original_tool";

const FILE_CONTEXT_REQUIRED_ACTIONS_WITH_TARGET = [
    ToolNames.FILE_OPEN,
    ToolNames.FILE_GET_CONTEXT,
    ToolNames.FILE_BIND_CONTEXT,
    RETRY_ORIGINAL_TOOL_ACTION,
];

const FILE_CONTEXT_REQUIRED_ACTIONS_WITHOUT_TARGET = [
    ToolNames.FILE_LIST,
    ToolNames.FILE_GET_RECENT,
    ToolNames.FILE_OPEN,
    ToolNames.FILE_GET_CONTEXT,
    ToolNames.FILE_BIND_CONTEXT,
    RETRY_ORIGINAL_TOOL_ACTION,
];

export interface FileContextRequiredTarget {
    fileId?: string | null;
    teamId?: string | null;
    pageId?: string | null;
}

export interface FileContextRequiredOptions {
    target?: FileContextRequiredTarget;
    publicUri?: string | null;
}

export function requireBoundFileContext(
    mcpServer: PenpotMcpServer,
    userToken: string | null | undefined,
    toolName: string,
    options: FileContextRequiredOptions = {}
): ToolResponse | null {
    const fileContext = mcpServer.fileContextRegistry.getSessionSummary(userToken);
    if (fileContext.bound && fileContext.boundContext?.status === "bound") {
        return null;
    }

    return fileContextRequiredResponse(toolName, fileContext, options);
}

export function fileContextRequiredResponse(
    toolName: string,
    fileContext: FileContextSessionSummary,
    options: FileContextRequiredOptions = {}
): ToolResponse {
    const target = resolveFileOpenTarget(fileContext, options.target);
    const requestedTarget = compactTarget(options.target);
    const publicUri = trimTrailingSlash(options.publicUri ?? defaultPublicUri());
    const handoff = target?.fileId
        ? createFileOpenHandoff({
              fileId: target.fileId,
              teamId: target.teamId ?? undefined,
              pageId: target.pageId ?? undefined,
              workspaceUrl: createWorkspaceUrl({
                  publicUri,
                  fileId: target.fileId,
                  teamId: target.teamId,
                  pageId: target.pageId,
              }),
              status: "context_required",
          })
        : null;
    const actions = handoff ? FILE_CONTEXT_REQUIRED_ACTIONS_WITH_TARGET : FILE_CONTEXT_REQUIRED_ACTIONS_WITHOUT_TARGET;

    return new JsonResponse({
        status: "error",
        error: {
            code: FileContextErrorCodes.FILE_CONTEXT_REQUIRED,
            message: `${toolName} requires a bound Penpot file context before it can run.`,
            actions,
            data: {
                fileContext,
                handoff,
                liveOnly: {
                    adapter: "plugin-live",
                    state: "editor-local",
                    recovery: handoff?.nextActions ?? actions,
                },
                nextActions: handoff?.nextActions ?? actions,
                retryTool: toolName,
                target: handoff?.target ?? requestedTarget ?? null,
            },
        },
    });
}

function resolveFileOpenTarget(
    fileContext: FileContextSessionSummary,
    target: FileContextRequiredTarget | undefined
): FileContextRequiredTarget | null {
    if (target?.fileId) {
        return compactTarget(target);
    }

    const context =
        fileContext.boundContext ?? fileContext.availableContexts[0] ?? fileContext.staleContexts[0] ?? null;
    if (!context) {
        return null;
    }

    return compactTarget({
        ...targetFromStoredContext(context),
        ...(target?.teamId ? { teamId: target.teamId } : {}),
        ...(target?.pageId ? { pageId: target.pageId } : {}),
    });
}

function targetFromStoredContext(context: StoredFileContext): FileContextRequiredTarget {
    return {
        fileId: context.fileId,
        teamId: context.teamId,
        pageId: context.pageId,
    };
}

function compactTarget(target: FileContextRequiredTarget | undefined): FileContextRequiredTarget | null {
    if (!target) {
        return null;
    }

    const compacted = {
        ...(target.fileId ? { fileId: target.fileId } : {}),
        ...(target.teamId ? { teamId: target.teamId } : {}),
        ...(target.pageId ? { pageId: target.pageId } : {}),
    };

    return Object.keys(compacted).length > 0 ? compacted : null;
}

function trimTrailingSlash(value: string): string {
    return value.replace(/\/+$/, "");
}

function defaultPublicUri(): string {
    return trimTrailingSlash(process.env.PENPOT_PUBLIC_URI ?? process.env.PENPOT_MCP_PUBLIC_URI ?? DEFAULT_PUBLIC_URI);
}
