import { z } from "zod";
import { EmptyToolArgs } from "../Tool";
import type { ToolResponse } from "../ToolResponse";
import { PenpotMcpServer } from "../PenpotMcpServer";
import { ToolNames } from "../ToolNames";
import {
    FileContextErrorCodes,
    FileContextLookupError,
    FileContextSelector,
    StoredFileContext,
} from "../FileContextRegistry";
import { PenpotRpcTool } from "./PenpotRpcTool";

type PenpotRecord = Record<string, unknown>;

const FILE_CONTEXT_ACTIONS = [
    ToolNames.FILE_GET_CONTEXT,
    ToolNames.FILE_BIND_CONTEXT,
    ToolNames.FILE_LIST,
    ToolNames.FILE_GET_RECENT,
];

export class FileGetContextTool extends PenpotRpcTool<EmptyToolArgs> {
    constructor(mcpServer: PenpotMcpServer) {
        super(mcpServer, EmptyToolArgs.schema);
    }

    public getToolName(): string {
        return ToolNames.FILE_GET_CONTEXT;
    }

    public getToolDescription(): string {
        return "Returns the current MCP file context binding and all available plugin-reported file contexts.";
    }

    protected async executeCore(args: EmptyToolArgs): Promise<ToolResponse> {
        const userToken = this.getUserToken();
        if (!userToken) {
            return this.authenticationRequired();
        }

        const fileContext = this.mcpServer.fileContextRegistry.getSessionSummary(userToken);
        const warnings =
            fileContext.status === "unbound"
                ? ["Open a Penpot file in this browser session before using file-scoped MCP tools."]
                : [];

        return this.ok(
            {
                fileContext,
                nextActions: this.nextActionsForSummary(fileContext.status),
            },
            warnings
        );
    }

    private nextActionsForSummary(status: string): string[] {
        if (status === "bound") {
            return [ToolNames.FILE_GET_CONTEXT];
        }
        if (status === "available") {
            return [ToolNames.FILE_BIND_CONTEXT];
        }
        return [ToolNames.FILE_LIST, ToolNames.FILE_GET_RECENT];
    }
}

export class FileBindContextArgs {
    static schema = {
        contextId: z
            .string()
            .min(1)
            .optional()
            .describe(
                "Context id returned by file.get_context. If omitted, bind requires exactly one available context."
            ),
        fileId: z
            .string()
            .uuid()
            .optional()
            .describe("File id to bind when exactly one available context exists for that file."),
    };

    contextId?: string;

    fileId?: string;
}

export class FileBindContextTool extends PenpotRpcTool<FileBindContextArgs> {
    constructor(mcpServer: PenpotMcpServer) {
        super(mcpServer, FileBindContextArgs.schema);
    }

    public getToolName(): string {
        return ToolNames.FILE_BIND_CONTEXT;
    }

    public getToolDescription(): string {
        return (
            "Binds one plugin-reported Penpot file context for subsequent file-scoped MCP tools. " +
            "Provide contextId from file.get_context, fileId when one matching context is available, " +
            "or no selector when only one context is available."
        );
    }

    protected async executeCore(args: FileBindContextArgs): Promise<ToolResponse> {
        const userToken = this.getUserToken();
        if (!userToken) {
            return this.authenticationRequired();
        }

        const selector: FileContextSelector = {
            contextId: this.nonEmptyString(args.contextId),
            fileId: this.nonEmptyString(args.fileId),
        };
        const lookup = this.mcpServer.fileContextRegistry.findBindableContext(userToken, selector);
        if (!lookup.ok) {
            return this.fileContextError(lookup.error);
        }

        try {
            const verifiedFile = await this.rpcGet<PenpotRecord>(
                "get-file-summary",
                { id: lookup.context.fileId },
                userToken
            );
            const boundContext = this.mcpServer.fileContextRegistry.bindContext(
                userToken,
                lookup.context.contextId,
                new Date().toISOString()
            );

            if (!boundContext) {
                return this.fileContextError({
                    code: FileContextErrorCodes.FILE_CONTEXT_STALE,
                    message: "The selected file context became stale before it could be bound.",
                    contexts: [lookup.context],
                });
            }

            return this.ok({
                boundContext,
                verifiedFile: this.summarizeVerifiedFile(boundContext, verifiedFile),
                nextActions: [ToolNames.FILE_GET_CONTEXT],
            });
        } catch (cause) {
            return this.rpcFailure(cause);
        }
    }

    private fileContextError(error: FileContextLookupError): ToolResponse {
        return this.error(error.code, error.message, FILE_CONTEXT_ACTIONS, {
            contexts: error.contexts ?? [],
        });
    }

    private summarizeVerifiedFile(context: StoredFileContext, file: PenpotRecord): PenpotRecord {
        return {
            id: context.fileId,
            name: file.name ?? context.fileName,
            contextId: context.contextId,
        };
    }

    private nonEmptyString(value: unknown): string | undefined {
        return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
    }
}
