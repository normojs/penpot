import { z } from "zod";
import type { ToolResponse } from "../ToolResponse.js";
import { PenpotMcpServer } from "../PenpotMcpServer.js";
import { PagePluginTask } from "../tasks/PagePluginTask.js";
import { ToolNames } from "../ToolNames.js";
import { requireBoundFileContext } from "./FileContextGuard.js";
import { PenpotRpcTool } from "./PenpotRpcTool.js";
import type { PageTaskParams } from "@penpot/mcp-common";
import { selectCommandAdapter } from "@penpot/command-runtime";
import type { CommandAdapterSelection } from "@penpot/command-runtime";

type PenpotRecord = Record<string, unknown>;
type PageAdapterArgs = { fileId?: string; adapter?: string };

abstract class PageTool<TArgs extends object> extends PenpotRpcTool<TArgs> {
    protected constructor(mcpServer: PenpotMcpServer, inputSchema: z.ZodRawShape) {
        super(mcpServer, inputSchema);
    }

    protected selectPageAdapter(command: string, args: PageAdapterArgs): CommandAdapterSelection {
        const hasFileId = Boolean(args.fileId);
        return selectCommandAdapter({
            command,
            requestedAdapter: args.adapter ?? "auto",
            candidates: [
                {
                    kind: "backend-command",
                    available: hasFileId,
                    priority: 10,
                    reason: hasFileId ? null : "backend-command requires an explicit fileId.",
                },
                {
                    kind: "plugin-live",
                    available: !hasFileId,
                    priority: 50,
                    reason: hasFileId
                        ? "plugin-live uses the bound workspace context; omit fileId to request it."
                        : null,
                },
            ],
        });
    }

    protected adapterSelectionFailure(selection: CommandAdapterSelection): ToolResponse {
        return this.error(
            selection.status === "unsupported" ? "adapter_not_supported" : "adapter_not_available",
            `No available adapter matched '${selection.requested}' for ${selection.command}.`,
            [
                "Use adapter: 'auto' to let MCP choose the first available adapter.",
                "Inspect adapterSelection for available candidates and fallback reasons.",
            ],
            {
                adapterSelection: selection,
            }
        );
    }

    protected async executePageTask(
        params: PageTaskParams,
        adapterSelection: CommandAdapterSelection
    ): Promise<ToolResponse> {
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
            ...result.data,
            adapter: adapterSelection.selected,
            adapterSelection,
        });
    }

    protected async executeBackendPageList(
        fileId: string,
        adapterSelection: CommandAdapterSelection
    ): Promise<ToolResponse> {
        const userToken = this.getUserToken();
        if (!userToken) {
            return this.authenticationRequired();
        }

        try {
            const result = await this.rpcGet<PenpotRecord>("get-file-pages", { id: fileId }, userToken);
            return this.ok({
                adapter: adapterSelection.selected,
                adapterSelection,
                fileId,
                pages: result.pages ?? [],
            });
        } catch (cause) {
            return this.rpcFailure(cause);
        }
    }

    protected async executeBackendPageCreate(
        args: PageCreateArgs,
        adapterSelection: CommandAdapterSelection
    ): Promise<ToolResponse> {
        const userToken = this.getUserToken();
        if (!userToken) {
            return this.authenticationRequired();
        }

        try {
            const result = await this.rpcWritePost<PenpotRecord>(
                "create-file-page",
                {
                    id: args.fileId,
                    "page-id": args.pageId,
                    name: this.nonEmptyString(args.name),
                },
                userToken,
                {
                    mcpAdapter: adapterSelection.selected,
                    mcpFileId: args.fileId,
                    mcpPageId: args.pageId,
                }
            );
            return this.ok(
                {
                    adapter: adapterSelection.selected,
                    adapterSelection,
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
        adapter: z.string().optional().describe("Optional adapter request: auto, backend-command, or plugin-live."),
    };

    fileId?: string;

    adapter?: string;
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
        const adapterSelection = this.selectPageAdapter(ToolNames.PAGE_LIST, args);
        if (adapterSelection.status !== "selected") {
            return this.adapterSelectionFailure(adapterSelection);
        }

        if (adapterSelection.selected === "backend-command" && args.fileId) {
            return this.executeBackendPageList(args.fileId, adapterSelection);
        }

        return this.executePageTask({ action: "list" }, adapterSelection);
    }
}

export class PageCreateArgs {
    static schema = {
        fileId: z.string().uuid().optional().describe("Optional file id for backend-command headless page creation."),
        pageId: z.string().uuid().optional().describe("Optional page id for backend-command page creation."),
        name: z.string().min(1).max(250).optional().describe("Optional page name."),
        makeCurrent: z.boolean().optional().describe("Whether to switch to the new page. Defaults to true."),
        adapter: z.string().optional().describe("Optional adapter request: auto, backend-command, or plugin-live."),
    };

    fileId?: string;

    pageId?: string;

    name?: string;

    makeCurrent?: boolean;

    adapter?: string;
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
        const adapterSelection = this.selectPageAdapter(ToolNames.PAGE_CREATE, args);
        if (adapterSelection.status !== "selected") {
            return this.adapterSelectionFailure(adapterSelection);
        }

        if (adapterSelection.selected === "backend-command" && args.fileId) {
            return this.executeBackendPageCreate(args, adapterSelection);
        }

        return this.executePageTask(
            {
                action: "create",
                name: this.nonEmptyString(args.name),
                makeCurrent: args.makeCurrent,
            },
            adapterSelection
        );
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
        const adapterSelection = this.selectPageAdapter(ToolNames.PAGE_RENAME, {});
        if (adapterSelection.status !== "selected") {
            return this.adapterSelectionFailure(adapterSelection);
        }

        return this.executePageTask(
            {
                action: "rename",
                pageId: args.pageId,
                name: args.name.trim(),
            },
            adapterSelection
        );
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
        const adapterSelection = this.selectPageAdapter(ToolNames.PAGE_SET_CURRENT, {});
        if (adapterSelection.status !== "selected") {
            return this.adapterSelectionFailure(adapterSelection);
        }

        return this.executePageTask(
            {
                action: "setCurrent",
                pageId: args.pageId,
            },
            adapterSelection
        );
    }
}
