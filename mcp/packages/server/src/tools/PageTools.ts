import { z } from "zod";
import type { ToolResponse } from "../ToolResponse.js";
import { PenpotMcpServer } from "../PenpotMcpServer.js";
import { PagePluginTask } from "../tasks/PagePluginTask.js";
import { requireBoundFileContext } from "./FileContextGuard.js";
import { PenpotRpcTool } from "./PenpotRpcTool.js";
import type { PageTaskParams } from "@penpot/mcp-common";
import {
    AdapterSelectionReasonCodes,
    CommandDescriptors,
    createAdapterSelectionError,
    createCommandRequestEnvelope,
    createCommandResultEnvelope,
    getAdapterSelectionReason,
    selectCommandAdapter,
} from "@penpot/command-runtime";
import type { CommandAdapterSelection } from "@penpot/command-runtime";
import type { FileContextRequiredTarget } from "./FileContextGuard.js";

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
                    reason: hasFileId
                        ? null
                        : getAdapterSelectionReason(AdapterSelectionReasonCodes.BACKEND_COMMAND_FILE_ID_REQUIRED),
                },
                {
                    kind: "plugin-live",
                    available: !hasFileId,
                    priority: 50,
                    reason: hasFileId
                        ? getAdapterSelectionReason(AdapterSelectionReasonCodes.PLUGIN_LIVE_OMIT_FILE_ID)
                        : null,
                },
            ],
        });
    }

    protected adapterSelectionFailure(selection: CommandAdapterSelection): ToolResponse {
        const error = createAdapterSelectionError(selection, {
            actions: [
                "Use adapter: 'auto' to let MCP choose the first available adapter.",
                "Inspect adapterSelection for available candidates and fallback reasons.",
            ],
        });
        return this.error(error.code, error.message, error.actions, error.data);
    }

    protected async executePageTask(
        params: PageTaskParams,
        adapterSelection: CommandAdapterSelection,
        target?: FileContextRequiredTarget
    ): Promise<ToolResponse> {
        const contextError = requireBoundFileContext(
            this.mcpServer,
            this.getSessionContext()?.userToken,
            this.getToolName(),
            { target }
        );
        if (contextError) {
            return contextError;
        }

        const task = new PagePluginTask(params);
        const requestEnvelope = createCommandRequestEnvelope(adapterSelection.command, {
            transport: "mcp",
            input: params,
            target: { fileContext: "bound" },
            auth: { userTokenPresent: Boolean(this.getUserToken()), source: "mcp-session" },
            adapterSelection,
            diagnostics: { execution: "plugin-task" },
        });
        const result = await this.mcpServer.pluginBridge.executePluginTask(task);
        const resultEnvelope = createCommandResultEnvelope(
            requestEnvelope,
            {
                ...result.data,
                adapter: adapterSelection.selected,
                adapterSelection,
            },
            { adapterSelection }
        );
        return this.ok(resultEnvelope.data, resultEnvelope.warnings);
    }

    protected async executeBackendPageList(
        fileId: string,
        adapterSelection: CommandAdapterSelection
    ): Promise<ToolResponse> {
        const userToken = this.getUserToken();
        if (!userToken) {
            return this.authenticationRequired();
        }

        const requestEnvelope = createCommandRequestEnvelope(adapterSelection.command, {
            transport: "mcp",
            input: { fileId },
            target: { fileId },
            auth: { userTokenPresent: true, source: "mcp-session" },
            adapterSelection,
            diagnostics: { rpcCommand: "get-file-pages" },
        });

        try {
            const result = await this.rpcGet<PenpotRecord>("get-file-pages", { id: fileId }, userToken);
            const resultEnvelope = createCommandResultEnvelope(
                requestEnvelope,
                {
                    adapter: adapterSelection.selected,
                    adapterSelection,
                    fileId,
                    pages: result.pages ?? [],
                },
                { adapterSelection }
            );
            return this.ok(resultEnvelope.data, resultEnvelope.warnings);
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

        const requestEnvelope = createCommandRequestEnvelope(adapterSelection.command, {
            transport: "mcp",
            input: {
                fileId: args.fileId,
                pageId: args.pageId,
                name: this.nonEmptyString(args.name),
                makeCurrent: args.makeCurrent,
            },
            target: { fileId: args.fileId, pageId: args.pageId },
            auth: { userTokenPresent: true, source: "mcp-session" },
            adapterSelection,
            diagnostics: { rpcCommand: "create-file-page" },
        });

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
            const resultEnvelope = createCommandResultEnvelope(
                requestEnvelope,
                {
                    adapter: adapterSelection.selected,
                    adapterSelection,
                    fileId: args.fileId,
                    page: result.page,
                    revn: result.revn,
                    vern: result.vern,
                },
                {
                    adapterSelection,
                    warnings: args.makeCurrent
                        ? [
                              "makeCurrent requires a live bound workspace; backend-command created the page without switching UI state.",
                          ]
                        : [],
                }
            );
            return this.ok(resultEnvelope.data, resultEnvelope.warnings);
        } catch (cause) {
            return this.rpcFailure(cause);
        }
    }

    protected async executeBackendPageRename(
        args: PageRenameArgs,
        adapterSelection: CommandAdapterSelection
    ): Promise<ToolResponse> {
        const userToken = this.getUserToken();
        if (!userToken) {
            return this.authenticationRequired();
        }

        const name = args.name.trim();
        const requestEnvelope = createCommandRequestEnvelope(adapterSelection.command, {
            transport: "mcp",
            input: {
                fileId: args.fileId,
                pageId: args.pageId,
                name,
            },
            target: { fileId: args.fileId, pageId: args.pageId },
            auth: { userTokenPresent: true, source: "mcp-session" },
            adapterSelection,
            diagnostics: { rpcCommand: "rename-file-page" },
        });

        try {
            const result = await this.rpcWritePost<PenpotRecord>(
                "rename-file-page",
                {
                    id: args.fileId,
                    "page-id": args.pageId,
                    name,
                },
                userToken,
                {
                    mcpAdapter: adapterSelection.selected,
                    mcpFileId: args.fileId,
                    mcpPageId: args.pageId,
                }
            );
            const resultEnvelope = createCommandResultEnvelope(
                requestEnvelope,
                {
                    adapter: adapterSelection.selected,
                    adapterSelection,
                    fileId: args.fileId,
                    page: result.page,
                    revn: result.revn,
                    vern: result.vern,
                },
                { adapterSelection }
            );
            return this.ok(resultEnvelope.data, resultEnvelope.warnings);
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
        return CommandDescriptors.PAGE_LIST.mcpToolName;
    }

    public getToolDescription(): string {
        return CommandDescriptors.PAGE_LIST.description;
    }

    protected async executeCore(args: PageListArgs): Promise<ToolResponse> {
        const adapterSelection = this.selectPageAdapter(CommandDescriptors.PAGE_LIST.id, args);
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
        return CommandDescriptors.PAGE_CREATE.mcpToolName;
    }

    public getToolDescription(): string {
        return CommandDescriptors.PAGE_CREATE.description;
    }

    protected async executeCore(args: PageCreateArgs): Promise<ToolResponse> {
        const adapterSelection = this.selectPageAdapter(CommandDescriptors.PAGE_CREATE.id, args);
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
        fileId: z.string().uuid().optional().describe("Optional file id for backend-command headless page rename."),
        pageId: z.string().uuid().describe("Page id to rename."),
        name: z.string().min(1).max(250).describe("New page name."),
        adapter: z.string().optional().describe("Optional adapter request: auto, backend-command, or plugin-live."),
    };

    fileId?: string;

    pageId!: string;

    name!: string;

    adapter?: string;
}

export class PageRenameTool extends PageTool<PageRenameArgs> {
    constructor(mcpServer: PenpotMcpServer) {
        super(mcpServer, PageRenameArgs.schema);
    }

    public getToolName(): string {
        return CommandDescriptors.PAGE_RENAME.mcpToolName;
    }

    public getToolDescription(): string {
        return CommandDescriptors.PAGE_RENAME.description;
    }

    protected async executeCore(args: PageRenameArgs): Promise<ToolResponse> {
        const adapterSelection = this.selectPageAdapter(CommandDescriptors.PAGE_RENAME.id, args);
        if (adapterSelection.status !== "selected") {
            return this.adapterSelectionFailure(adapterSelection);
        }

        if (adapterSelection.selected === "backend-command" && args.fileId) {
            return this.executeBackendPageRename(args, adapterSelection);
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
        return CommandDescriptors.PAGE_SET_CURRENT.mcpToolName;
    }

    public getToolDescription(): string {
        return CommandDescriptors.PAGE_SET_CURRENT.description;
    }

    protected async executeCore(args: PageSetCurrentArgs): Promise<ToolResponse> {
        const adapterSelection = this.selectPageAdapter(CommandDescriptors.PAGE_SET_CURRENT.id, {});
        if (adapterSelection.status !== "selected") {
            return this.adapterSelectionFailure(adapterSelection);
        }

        return this.executePageTask(
            {
                action: "setCurrent",
                pageId: args.pageId,
            },
            adapterSelection,
            { pageId: args.pageId }
        );
    }
}
