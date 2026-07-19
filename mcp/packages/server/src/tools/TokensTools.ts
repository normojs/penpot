import { z } from "zod";
import type { ToolResponse } from "../ToolResponse.js";
import { PenpotMcpServer } from "../PenpotMcpServer.js";
import { PenpotRpcTool } from "./PenpotRpcTool.js";
import type { RpcParams } from "../PenpotRpcClient.js";
import {
    AdapterSelectionReasonCodes,
    CommandDescriptors,
    createAdapterSelectionError,
    getAdapterSelectionReason,
    selectCommandAdapter,
} from "@penpot/command-runtime";
import type { CommandAdapterSelection } from "@penpot/command-runtime";

const uuidSchema = z.string().uuid();

type PenpotRecord = Record<string, unknown>;
type TokensListInput = {
    fileId: string;
    setId?: string;
    includeValues?: boolean;
    adapter?: string;
};

export class TokensListArgs {
    static schema = {
        fileId: uuidSchema.describe("File id for backend-command design token listing."),
        setId: uuidSchema.optional().describe("Optional token set id used to filter returned sets and tokens."),
        includeValues: z
            .boolean()
            .optional()
            .describe("When true, include raw stored token values. Defaults to false."),
        adapter: z.string().optional().describe("Optional adapter request: auto or backend-command."),
    };

    fileId!: string;
    setId?: string;
    includeValues?: boolean;
    adapter?: string;
}

export class TokensListTool extends PenpotRpcTool<TokensListArgs> {
    constructor(mcpServer: PenpotMcpServer) {
        super(mcpServer, TokensListArgs.schema);
    }

    public getToolName(): string {
        return CommandDescriptors.TOKENS_LIST.mcpToolName!;
    }

    public getToolDescription(): string {
        return CommandDescriptors.TOKENS_LIST.description;
    }

    protected selectTokensReadAdapter(command: string, args: TokensListInput): CommandAdapterSelection {
        const hasBackendTarget = Boolean(args.fileId);
        return selectCommandAdapter({
            command,
            requestedAdapter: args.adapter ?? "auto",
            candidates: [
                {
                    kind: "backend-command",
                    available: hasBackendTarget,
                    priority: 10,
                    reason: hasBackendTarget
                        ? null
                        : getAdapterSelectionReason(AdapterSelectionReasonCodes.BACKEND_COMMAND_FILE_ID_REQUIRED),
                },
            ],
        });
    }

    protected adapterSelectionFailure(adapterSelection: CommandAdapterSelection): ToolResponse {
        const error = createAdapterSelectionError(adapterSelection, {
            actions: [
                "Use adapter: 'auto' or 'backend-command'.",
                "Pass fileId for backend-command token listing.",
            ],
        });
        return this.error(error.code, error.message, error.actions, error.data);
    }

    protected async executeCore(args: TokensListArgs): Promise<ToolResponse> {
        const adapterSelection = this.selectTokensReadAdapter(CommandDescriptors.TOKENS_LIST.id, args);
        if (adapterSelection.status !== "selected") {
            return this.adapterSelectionFailure(adapterSelection);
        }

        const userToken = this.getUserToken();
        if (!userToken) {
            return this.authenticationRequired();
        }

        try {
            const params: RpcParams = {
                id: args.fileId,
            };
            if (args.setId !== undefined) params["set-id"] = args.setId;
            if (args.includeValues !== undefined) params["include-values"] = args.includeValues;

            const result = await this.rpcGet<PenpotRecord>("get-file-tokens", params, userToken);
            return this.ok({
                adapter: adapterSelection.selected,
                adapterSelection,
                fileId: args.fileId,
                setId: args.setId,
                includeValues: Boolean(result["include-values"] ?? result.includeValues ?? args.includeValues),
                present: Boolean(result.present),
                empty: Boolean(result.empty),
                setCount: result["set-count"] ?? result.setCount ?? 0,
                tokenCount: result["token-count"] ?? result.tokenCount ?? 0,
                themeCount: result["theme-count"] ?? result.themeCount ?? 0,
                activeThemePaths: result["active-theme-paths"] ?? result.activeThemePaths ?? [],
                sets: result.sets ?? [],
                tokens: result.tokens ?? [],
                themes: result.themes ?? [],
            });
        } catch (cause) {
            return this.rpcFailure(cause);
        }
    }
}

export class TokensApplyArgs {
    static schema = {
        fileId: uuidSchema.describe("File id for backend-command token apply."),
        pageId: uuidSchema.optional().describe("Optional page id used to resolve the shape."),
        shapeId: uuidSchema.optional().describe("Single target shape id. Prefer this or shapeIds with one id."),
        shapeIds: z
            .array(uuidSchema)
            .min(1)
            .max(100)
            .optional()
            .describe("One or more shape ids. Prefer shapeId for a single target."),
        tokenId: uuidSchema.optional().describe("Token id when setId is also provided."),
        tokenName: z.string().min(1).max(250).optional().describe("Token name. Preferred identity for simple applies."),
        setId: uuidSchema.optional().describe("Optional token set id used with tokenId or tokenName."),
        setName: z.string().min(1).max(250).optional().describe("Optional token set name used with tokenName."),
        attributes: z
            .array(z.string().min(1))
            .min(1)
            .max(40)
            .describe(
                "Token attributes to apply, e.g. fill, stroke-color, width, height, opacity, row-gap, p1, font-size, letter-spacing."
            ),
        adapter: z.string().optional().describe("Optional adapter request: auto or backend-command."),
    };

    fileId!: string;
    pageId?: string;
    shapeId?: string;
    shapeIds?: string[];
    tokenId?: string;
    tokenName?: string;
    setId?: string;
    setName?: string;
    attributes!: string[];
    adapter?: string;
}

export class TokensApplyTool extends PenpotRpcTool<TokensApplyArgs> {
    constructor(mcpServer: PenpotMcpServer) {
        super(mcpServer, TokensApplyArgs.schema);
    }

    public getToolName(): string {
        return CommandDescriptors.TOKENS_APPLY.mcpToolName!;
    }

    public getToolDescription(): string {
        return CommandDescriptors.TOKENS_APPLY.description;
    }

    protected selectTokensMutationAdapter(command: string, args: TokensApplyArgs): CommandAdapterSelection {
        const hasBackendTarget = Boolean(args.fileId);
        return selectCommandAdapter({
            command,
            requestedAdapter: args.adapter ?? "auto",
            candidates: [
                {
                    kind: "backend-command",
                    available: hasBackendTarget,
                    priority: 10,
                    reason: hasBackendTarget
                        ? null
                        : getAdapterSelectionReason(AdapterSelectionReasonCodes.BACKEND_COMMAND_FILE_ID_REQUIRED),
                },
            ],
        });
    }

    protected adapterSelectionFailure(adapterSelection: CommandAdapterSelection): ToolResponse {
        const error = createAdapterSelectionError(adapterSelection, {
            actions: [
                "Use adapter: 'auto' or 'backend-command'.",
                "Pass fileId, one shapeId, attributes, and a token identity for backend-command token apply.",
            ],
        });
        return this.error(error.code, error.message, error.actions, error.data);
    }

    protected async executeCore(args: TokensApplyArgs): Promise<ToolResponse> {
        const shapeIds = args.shapeIds ?? (args.shapeId ? [args.shapeId] : []);
        if (shapeIds.length === 0) {
            return this.error(
                "token_shape_required",
                "tokens.apply requires shapeId or shapeIds with at least one shape id.",
                ["Pass one or more target shape ids."]
            );
        }
        if (!args.tokenName && !(args.setId && args.tokenId) && !(args.setName && args.tokenName)) {
            if (!args.tokenId && !args.tokenName) {
                return this.error(
                    "token_identity_required",
                    "tokens.apply requires tokenName, or setId+tokenId, or setName+tokenName.",
                    ["Use tokens.list first to discover token names or ids."]
                );
            }
        }

        const adapterSelection = this.selectTokensMutationAdapter(CommandDescriptors.TOKENS_APPLY.id, args);
        if (adapterSelection.status !== "selected") {
            return this.adapterSelectionFailure(adapterSelection);
        }

        const userToken = this.getUserToken();
        if (!userToken) {
            return this.authenticationRequired();
        }

        try {
            const params: RpcParams = {
                id: args.fileId,
                attributes: args.attributes,
            };
            if (shapeIds.length === 1) {
                params["shape-id"] = shapeIds[0];
            } else {
                params["shape-ids"] = shapeIds;
            }
            if (args.pageId !== undefined) params["page-id"] = args.pageId;
            if (args.tokenId !== undefined) params["token-id"] = args.tokenId;
            if (args.tokenName !== undefined) params["token-name"] = args.tokenName;
            if (args.setId !== undefined) params["set-id"] = args.setId;
            if (args.setName !== undefined) params["set-name"] = args.setName;

            const result = await this.rpcPost<PenpotRecord>("apply-file-token", params, userToken, {
                mcpToolName: this.getToolName(),
                mcpAdapter: adapterSelection.selected,
                mcpFileId: args.fileId,
                mcpPageId: args.pageId,
                mcpShapeId: shapeIds[0],
            });

            return this.ok({
                adapter: adapterSelection.selected,
                adapterSelection,
                fileId: args.fileId,
                pageId: args.pageId,
                shape: result.shape,
                shapes: result.shapes ?? [result.shape],
                token: result.token,
                attributes: result.attributes ?? args.attributes,
                appliedTokens: result["applied-tokens"] ?? result.appliedTokens ?? {},
                materialized: Boolean(result.materialized),
                revn: result.revn,
                vern: result.vern,
            });
        } catch (cause) {
            return this.rpcFailure(cause);
        }
    }
}
