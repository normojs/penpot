import { z } from "zod";
import type { ToolResponse } from "../ToolResponse.js";
import { PenpotMcpServer } from "../PenpotMcpServer.js";
import { PenpotRpcTool } from "./PenpotRpcTool.js";
import {
    CommandDescriptors,
    createAdapterSelectionError,
    createCommandRequestEnvelope,
    createCommandResultEnvelope,
    createFileOpenHandoff,
    createWorkspaceUrl,
    selectCommandAdapter,
} from "@penpot/command-runtime";
import type { CommandAdapterSelection } from "@penpot/command-runtime";

const DEFAULT_PUBLIC_URI = "http://localhost:3449";
const uuidSchema = z.string().uuid();

function trimTrailingSlash(value: string): string {
    return value.replace(/\/+$/, "");
}

function defaultPublicUri(): string {
    return trimTrailingSlash(process.env.PENPOT_PUBLIC_URI ?? process.env.PENPOT_MCP_PUBLIC_URI ?? DEFAULT_PUBLIC_URI);
}

export class FileOpenArgs {
    static schema = {
        fileId: uuidSchema.describe("File id to open in the Penpot workspace."),
        teamId: z.string().min(1).optional().describe("Optional team id to include in the workspace URL."),
        pageId: uuidSchema.optional().describe("Optional page id to include in the workspace URL."),
        publicUri: z.string().min(1).optional().describe("Optional Penpot public URI. Defaults to server environment."),
        adapter: z.string().optional().describe("Optional adapter request: auto or browser-url."),
    };

    fileId!: string;
    teamId?: string;
    pageId?: string;
    publicUri?: string;
    adapter?: string;
}

export class FileOpenTool extends PenpotRpcTool<FileOpenArgs> {
    constructor(mcpServer: PenpotMcpServer) {
        super(mcpServer, FileOpenArgs.schema);
    }

    public getToolName(): string {
        return CommandDescriptors.FILE_OPEN.mcpToolName;
    }

    public getToolDescription(): string {
        return CommandDescriptors.FILE_OPEN.description;
    }

    protected async executeCore(args: FileOpenArgs): Promise<ToolResponse> {
        const adapterSelection = this.selectFileOpenAdapter(args);
        if (adapterSelection.status !== "selected") {
            return this.adapterSelectionFailure(adapterSelection);
        }

        const publicUri = trimTrailingSlash(args.publicUri ?? defaultPublicUri());
        const workspaceUrl = createWorkspaceUrl({
            publicUri,
            fileId: args.fileId,
            teamId: args.teamId,
            pageId: args.pageId,
        });
        const handoff = createFileOpenHandoff({
            fileId: args.fileId,
            teamId: args.teamId,
            pageId: args.pageId,
            workspaceUrl,
        });
        const requestEnvelope = createCommandRequestEnvelope(CommandDescriptors.FILE_OPEN.id, {
            transport: "mcp",
            input: args,
            target: {
                fileId: args.fileId,
                teamId: args.teamId,
                pageId: args.pageId,
                workspaceUrl,
            },
            auth: { userTokenPresent: Boolean(this.getUserToken()), source: "mcp-session" },
            adapterSelection,
            diagnostics: { publicUri },
        });
        const resultEnvelope = createCommandResultEnvelope(
            requestEnvelope,
            {
                command: CommandDescriptors.FILE_OPEN.id,
                adapter: adapterSelection.selected,
                adapterSelection,
                fileId: args.fileId,
                teamId: args.teamId,
                pageId: args.pageId,
                url: workspaceUrl,
                workspaceUrl,
                boundContext: false,
                handoff,
            },
            { adapterSelection }
        );

        return this.ok(resultEnvelope.data, resultEnvelope.warnings);
    }

    private selectFileOpenAdapter(args: FileOpenArgs): CommandAdapterSelection {
        return selectCommandAdapter({
            command: CommandDescriptors.FILE_OPEN.id,
            requestedAdapter: args.adapter ?? "auto",
            candidates: [{ kind: "browser-url", available: true, priority: 30 }],
        });
    }

    private adapterSelectionFailure(selection: CommandAdapterSelection): ToolResponse {
        const error = createAdapterSelectionError(selection, {
            actions: ["Use adapter: 'auto' or adapter: 'browser-url'."],
        });
        return this.error(error.code, error.message, error.actions, error.data);
    }
}
