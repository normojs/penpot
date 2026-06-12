import { z } from "zod";
import type { ToolResponse } from "../ToolResponse.js";
import { PenpotMcpServer } from "../PenpotMcpServer.js";
import { PagePluginTask } from "../tasks/PagePluginTask.js";
import { ToolNames } from "../ToolNames.js";
import { requireBoundFileContext } from "./FileContextGuard.js";
import { PenpotRpcTool } from "./PenpotRpcTool.js";
import type { PageTaskParams } from "@penpot/mcp-common";

type PenpotRecord = Record<string, unknown>;

abstract class PageTool<TArgs extends object> extends PenpotRpcTool<TArgs> {
    protected constructor(mcpServer: PenpotMcpServer, inputSchema: z.ZodRawShape) {
        super(mcpServer, inputSchema);
    }

    protected async executePageTask(params: PageTaskParams): Promise<ToolResponse> {
        const contextError = requireBoundFileContext(
            this.mcpServer,
            this.getSessionContext()?.userToken,
            this.getToolName()
        );
        if (contextError) {
            return contextError;
        }

        const task = new PagePluginTask(params);
        const result = await this.mcpServer.pluginBridge.executePluginTask(task);
        return this.ok({
            adapter: "plugin-live",
            ...result.data,
        });
    }

    protected async executeBackendPageList(fileId: string): Promise<ToolResponse> {
        const userToken = this.getUserToken();
        if (!userToken) {
            return this.authenticationRequired();
        }

        try {
            const result = await this.rpcGet<PenpotRecord>("get-file-pages", { id: fileId }, userToken);
            return this.ok({
                adapter: "backend-command",
                fileId,
                pages: result.pages ?? [],
            });
        } catch (cause) {
            return this.rpcFailure(cause);
        }
    }

    protected async executeBackendPageCreate(args: PageCreateArgs): Promise<ToolResponse> {
        const userToken = this.getUserToken();
        if (!userToken) {
            return this.authenticationRequired();
        }

        try {
            const result = await this.rpcPost<PenpotRecord>(
                "create-file-page",
                {
                    id: args.fileId,
                    "page-id": args.pageId,
                    name: this.nonEmptyString(args.name),
                },
                userToken
            );
            return this.ok(
                {
                    adapter: "backend-command",
                    fileId: args.fileId,
                    page: result.page,
                    revn: result.revn,
                    vern: result.vern,
                },
                args.makeCurrent
                    ? [
                          "makeCurrent requires a live bound workspace; backend-command created the page without switching UI state.",
                      ]
                    : []
            );
        } catch (cause) {
            return this.rpcFailure(cause);
        }
    }

    protected nonEmptyString(value: unknown): string | undefined {
        return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
    }
}

export class PageListArgs {
    static schema = {
        fileId: z.string().uuid().optional().describe("Optional file id for backend-command headless page listing."),
    };

    fileId?: string;
}

export class PageListTool extends PageTool<PageListArgs> {
    constructor(mcpServer: PenpotMcpServer) {
        super(mcpServer, PageListArgs.schema);
    }

    public getToolName(): string {
        return ToolNames.PAGE_LIST;
    }

    public getToolDescription(): string {
        return "Lists pages in a Penpot file, using backend-command when fileId is supplied or the bound live context otherwise.";
    }

    protected async executeCore(args: PageListArgs): Promise<ToolResponse> {
        if (args.fileId) {
            return this.executeBackendPageList(args.fileId);
        }

        return this.executePageTask({ action: "list" });
    }
}

export class PageCreateArgs {
    static schema = {
        fileId: z.string().uuid().optional().describe("Optional file id for backend-command headless page creation."),
        pageId: z.string().uuid().optional().describe("Optional page id for backend-command page creation."),
        name: z.string().min(1).max(250).optional().describe("Optional page name."),
        makeCurrent: z.boolean().optional().describe("Whether to switch to the new page. Defaults to true."),
    };

    fileId?: string;

    pageId?: string;

    name?: string;

    makeCurrent?: boolean;
}

export class PageCreateTool extends PageTool<PageCreateArgs> {
    constructor(mcpServer: PenpotMcpServer) {
        super(mcpServer, PageCreateArgs.schema);
    }

    public getToolName(): string {
        return ToolNames.PAGE_CREATE;
    }

    public getToolDescription(): string {
        return "Creates a page in a Penpot file, using backend-command when fileId is supplied or the bound live context otherwise.";
    }

    protected async executeCore(args: PageCreateArgs): Promise<ToolResponse> {
        if (args.fileId) {
            return this.executeBackendPageCreate(args);
        }

        return this.executePageTask({
            action: "create",
            name: this.nonEmptyString(args.name),
            makeCurrent: args.makeCurrent,
        });
    }
}

export class PageRenameArgs {
    static schema = {
        pageId: z.string().uuid().describe("Page id to rename."),
        name: z.string().min(1).max(250).describe("New page name."),
    };

    pageId!: string;

    name!: string;
}

export class PageRenameTool extends PageTool<PageRenameArgs> {
    constructor(mcpServer: PenpotMcpServer) {
        super(mcpServer, PageRenameArgs.schema);
    }

    public getToolName(): string {
        return ToolNames.PAGE_RENAME;
    }

    public getToolDescription(): string {
        return "Renames a page in the currently bound Penpot file context.";
    }

    protected async executeCore(args: PageRenameArgs): Promise<ToolResponse> {
        return this.executePageTask({
            action: "rename",
            pageId: args.pageId,
            name: args.name.trim(),
        });
    }
}

export class PageSetCurrentArgs {
    static schema = {
        pageId: z.string().uuid().describe("Page id to make current in the bound Penpot file context."),
    };

    pageId!: string;
}

export class PageSetCurrentTool extends PageTool<PageSetCurrentArgs> {
    constructor(mcpServer: PenpotMcpServer) {
        super(mcpServer, PageSetCurrentArgs.schema);
    }

    public getToolName(): string {
        return ToolNames.PAGE_SET_CURRENT;
    }

    public getToolDescription(): string {
        return "Switches the currently bound Penpot file context to a page.";
    }

    protected async executeCore(args: PageSetCurrentArgs): Promise<ToolResponse> {
        return this.executePageTask({
            action: "setCurrent",
            pageId: args.pageId,
        });
    }
}
