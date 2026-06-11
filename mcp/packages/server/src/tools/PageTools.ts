import { z } from "zod";
import { EmptyToolArgs, Tool } from "../Tool.js";
import type { ToolResponse } from "../ToolResponse.js";
import { JsonResponse } from "../ToolResponse.js";
import { PenpotMcpServer } from "../PenpotMcpServer.js";
import { PagePluginTask } from "../tasks/PagePluginTask.js";
import { ToolNames } from "../ToolNames.js";
import { requireBoundFileContext } from "./FileContextGuard.js";
import type { PageTaskParams, PageTaskResultData, PluginTaskResult } from "@penpot/mcp-common";

abstract class PageTool<TArgs extends object> extends Tool<TArgs> {
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
        return this.ok(result);
    }

    private ok(result: PluginTaskResult<PageTaskResultData>): ToolResponse {
        return new JsonResponse({
            status: "ok",
            data: result.data,
        });
    }
}

export class PageListTool extends PageTool<EmptyToolArgs> {
    constructor(mcpServer: PenpotMcpServer) {
        super(mcpServer, EmptyToolArgs.schema);
    }

    public getToolName(): string {
        return ToolNames.PAGE_LIST;
    }

    public getToolDescription(): string {
        return "Lists pages in the currently bound Penpot file context.";
    }

    protected async executeCore(args: EmptyToolArgs): Promise<ToolResponse> {
        return this.executePageTask({ action: "list" });
    }
}

export class PageCreateArgs {
    static schema = {
        name: z.string().min(1).max(250).optional().describe("Optional page name."),
        makeCurrent: z.boolean().optional().describe("Whether to switch to the new page. Defaults to true."),
    };

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
        return "Creates a page in the currently bound Penpot file context.";
    }

    protected async executeCore(args: PageCreateArgs): Promise<ToolResponse> {
        return this.executePageTask({
            action: "create",
            name: this.nonEmptyString(args.name),
            makeCurrent: args.makeCurrent,
        });
    }

    private nonEmptyString(value: unknown): string | undefined {
        return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
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
