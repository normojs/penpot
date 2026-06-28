export type CommandAdapterKind =
    | "backend-rpc"
    | "backend-command"
    | "plugin-live"
    | "exporter"
    | "browser-url"
    | "local-fs";

export type RequestedCommandAdapter = CommandAdapterKind | "auto";

export type AdapterSelectionStatus = "selected" | "unsupported" | "unavailable";

export interface CommandAdapterCandidate {
    kind: CommandAdapterKind;
    available?: boolean;
    priority?: number;
    reason?: string | null;
}

export interface NormalizedCommandAdapterCandidate {
    kind: CommandAdapterKind;
    available: boolean;
    priority: number;
    reason: string | null;
}

export interface CommandAdapterFallback {
    kind: CommandAdapterKind;
    available: boolean;
    reason: string | null;
}

export interface CommandAdapterSelection {
    command: string;
    requested: RequestedCommandAdapter | string;
    selected: CommandAdapterKind | null;
    status: AdapterSelectionStatus;
    candidates: NormalizedCommandAdapterCandidate[];
    fallbacks: CommandAdapterFallback[];
}

export interface SelectCommandAdapterOptions {
    command: string;
    requestedAdapter?: RequestedCommandAdapter | string;
    candidates: CommandAdapterCandidate[];
}

export interface CommandErrorCodeCatalog {
    AUTHENTICATION_REQUIRED: "authentication_required";
    BACKEND_CONFIG_INVALID: "penpot_backend_config_invalid";
    BACKEND_UNAVAILABLE: "penpot_backend_unavailable";
    OBJECT_NOT_FOUND_OR_FORBIDDEN: "object_not_found_or_forbidden";
    PERMISSION_DENIED: "permission_denied";
    PENPOT_RPC_ERROR: "penpot_rpc_error";
    RATE_LIMIT_REACHED: "rate_limit_reached";
    ADAPTER_NOT_AVAILABLE: "adapter_not_available";
    ADAPTER_NOT_SUPPORTED: "adapter_not_supported";
    FILE_CONTEXT_REQUIRED: "file_context_required";
    MCP_WRITE_CONCURRENCY_LIMIT: "mcp_write_concurrency_limit";
    MCP_WRITE_RATE_LIMIT: "mcp_write_rate_limit";
    DESTRUCTIVE_ACTION_CONFIRMATION_REQUIRED: "destructive_action_confirmation_required";
}

export interface AdapterSelectionReasonCodeCatalog {
    BACKEND_COMMAND_FILE_ID_REQUIRED: "backend_command_file_id_required";
    BACKEND_COMMAND_FILE_PAGE_REQUIRED: "backend_command_file_page_required";
    BACKEND_COMMAND_LAYOUT_UNSUPPORTED: "backend_command_layout_unsupported";
    PLUGIN_LIVE_BACKEND_ONLY_SHAPE_FIELDS_UNSUPPORTED: "plugin_live_backend_only_shape_fields_unsupported";
    PLUGIN_LIVE_OMIT_FILE_ID: "plugin_live_omit_file_id";
    PLUGIN_LIVE_OMIT_FILE_PAGE: "plugin_live_omit_file_page";
    EXPORTER_EXPLICIT_TARGET_REQUIRED: "exporter_explicit_target_required";
    PLUGIN_LIVE_OMIT_EXPLICIT_TARGET: "plugin_live_omit_explicit_target";
    CLI_PLUGIN_LIVE_UNSUPPORTED: "cli_plugin_live_unsupported";
    CLI_EXPORT_PLUGIN_LIVE_UNSUPPORTED: "cli_export_plugin_live_unsupported";
    CLI_SHAPE_PLUGIN_LIVE_UNSUPPORTED: "cli_shape_plugin_live_unsupported";
    PLUGIN_LIVE_WORKSPACE_STATE_REQUIRED: "plugin_live_workspace_state_required";
    BACKEND_COMMAND_PROTOTYPE_READ_PLANNED: "backend_command_prototype_read_planned";
    BACKEND_COMMAND_PROTOTYPE_MUTATION_UNSUPPORTED: "backend_command_prototype_mutation_unsupported";
    BACKEND_COMMAND_GRID_CONTRACT_UNSUPPORTED: "backend_command_grid_contract_unsupported";
    CLI_LIVE_WORKSPACE_STATE_UNSUPPORTED: "cli_live_workspace_state_unsupported";
}

export type CommandErrorCode = CommandErrorCodeCatalog[keyof CommandErrorCodeCatalog];
export type AdapterSelectionReasonCode =
    AdapterSelectionReasonCodeCatalog[keyof AdapterSelectionReasonCodeCatalog];

export interface CreateCommandErrorPayloadOptions {
    actions?: string[];
    data?: Record<string, unknown>;
}

export interface CommandErrorPayload {
    code: CommandErrorCode | string;
    message: string;
    actions: string[];
    data: Record<string, unknown>;
}

export type CommandTransportKind = "cli" | "mcp" | "http" | "internal";
export type CommandResultStatus = "ok" | "error";

export interface CommandDescriptor {
    id: string;
    mcpToolName?: string;
    cliCommand?: string;
    title: string;
    description: string;
    inputSchema: string;
    adapters: readonly string[];
    responseShape: string;
}

export interface CommandDescriptorSummary {
    id: string;
    mcpToolName?: string;
    cliCommand?: string;
    title: string;
    adapters: readonly string[];
}

export interface CommandAuthMetadata {
    userTokenPresent?: boolean;
    mode?: string;
    source?: string;
}

export interface CreateCommandRequestEnvelopeOptions<TInput = unknown> {
    transport?: CommandTransportKind | string;
    input?: TInput;
    target?: Record<string, unknown>;
    auth?: CommandAuthMetadata;
    adapter?: CommandAdapterKind | string | null;
    adapterSelection?: CommandAdapterSelection | null;
    diagnostics?: Record<string, unknown>;
}

export interface CommandRequestEnvelope<TInput = unknown> {
    command: string;
    descriptor: CommandDescriptorSummary | null;
    transport: CommandTransportKind | string;
    input: TInput;
    target: Record<string, unknown>;
    auth: CommandAuthMetadata;
    adapter: CommandAdapterKind | string | null;
    adapterSelection: CommandAdapterSelection | null;
    diagnostics: Record<string, unknown>;
}

export interface CreateCommandResultEnvelopeOptions {
    status?: CommandResultStatus;
    transport?: CommandTransportKind | string;
    target?: Record<string, unknown>;
    adapter?: CommandAdapterKind | string | null;
    adapterSelection?: CommandAdapterSelection | null;
    diagnostics?: Record<string, unknown>;
    warnings?: string[];
}

export interface CommandResultEnvelope<TData = unknown> {
    status: CommandResultStatus;
    command: string;
    descriptor: CommandDescriptorSummary | null;
    transport: CommandTransportKind | string;
    adapter: CommandAdapterKind | string | null;
    target: Record<string, unknown>;
    auth: CommandAuthMetadata;
    diagnostics: Record<string, unknown>;
    adapterSelection: CommandAdapterSelection | null;
    data: TData;
    warnings: string[];
}

export interface CreateWorkspaceUrlOptions {
    publicUri: string;
    fileId: string;
    teamId?: string | null;
    pageId?: string | null;
}

export interface FileOpenHandoffTarget {
    fileId: string;
    teamId?: string;
    pageId?: string;
}

export interface FileOpenHandoff {
    status: string;
    requiresUserAction: boolean;
    workspaceUrl: string;
    nextActions: string[];
    target: FileOpenHandoffTarget;
}

export interface CreateFileOpenHandoffOptions extends FileOpenHandoffTarget {
    workspaceUrl: string;
    status?: string;
}

export type ExportFileFormat = "penpot";
export type ExportFileLibraryMode = "all" | "merge" | "detach";
export type RenderThumbnailTarget = "file" | "frame";
export type RenderThumbnailCachePolicy = "reuse" | "refresh";
export type RenderThumbnailFormat = "png";

export interface ExportFileFormatCatalog {
    PENPOT: "penpot";
}

export interface ExportFileLibraryModeCatalog {
    ALL: "all";
    MERGE: "merge";
    DETACH: "detach";
}

export interface RenderThumbnailTargetCatalog {
    FILE: "file";
    FRAME: "frame";
}

export interface RenderThumbnailCachePolicyCatalog {
    REUSE: "reuse";
    REFRESH: "refresh";
}

export interface RenderThumbnailFormatCatalog {
    PNG: "png";
}

export interface CreateExportFileContractOptions {
    fileId?: string | null;
    format?: ExportFileFormat | string | null;
    libraryMode?: ExportFileLibraryMode | string | null;
    type?: ExportFileLibraryMode | string | null;
    includeLibraries?: boolean;
    embedAssets?: boolean;
    output?: string | null;
    name?: string | null;
    adapter?: string | null;
}

export interface CreateRenderThumbnailContractOptions {
    fileId?: string | null;
    pageId?: string | null;
    objectId?: string | null;
    frameId?: string | null;
    shapeId?: string | null;
    target?: RenderThumbnailTarget | "object" | "shape" | string | null;
    targetKind?: RenderThumbnailTarget | "object" | "shape" | string | null;
    type?: RenderThumbnailTarget | "object" | "shape" | string | null;
    tag?: string | null;
    revn?: number | string | null;
    width?: number | string | null;
    size?: number | string | null;
    cachePolicy?: RenderThumbnailCachePolicy | string | null;
    cache?: RenderThumbnailCachePolicy | string | null;
    format?: RenderThumbnailFormat | string | null;
    output?: string | null;
    adapter?: string | null;
}

export interface ExportFileContract {
    command: "export.file";
    status: "contract";
    executable: true;
    adapter: "backend-rpc";
    target: {
        fileId: string | null;
    };
    artifact: {
        kind: "file-export";
        format: ExportFileFormat;
        mimeType: "application/zip";
        extension: ".penpot";
        name: string;
        libraryMode: ExportFileLibraryMode;
        includeLibraries: boolean;
        embedAssets: boolean;
        output: string | null;
    };
    backendRpc: {
        command: "export-binfile";
        transport: "sse";
        response: "resource-uri";
        request: {
            "file-id": string | null;
            "include-libraries": boolean;
            "embed-assets": boolean;
        };
    };
    requires: string[];
    nextActions: string[];
    diagnostics: {
        adapterBoundary: "cli-backend-rpc";
        existingBackendCommand: "export-binfile";
        exporterBoundary: string;
        mcpToolRegistered: false;
        cliCommandRegistered: true;
    };
}

export interface RenderThumbnailContract {
    command: "render.thumbnail";
    status: "contract";
    executable: false;
    adapter: null;
    target: {
        kind: RenderThumbnailTarget;
        fileId: string | null;
        pageId: string | null;
        objectId: string | null;
        tag: string | null;
        revn: number | null;
    };
    artifact: {
        kind: "thumbnail";
        format: RenderThumbnailFormat;
        mimeType: "image/png";
        extension: ".png";
        width: number;
        height: number;
        aspectRatio: "3:2";
        output: string | null;
    };
    cache: {
        policy: RenderThumbnailCachePolicy;
        scope: "file-thumbnail" | "file-object-thumbnail";
        key: string | null;
        invalidatesOn: string;
    };
    renderer: {
        primary: "render-wasm-worker";
        fallback: "frontend-rasterizer";
        width: number;
        height: number;
        dataSource: "get-file-data-for-thumbnail";
        output: "png-blob";
    };
    backendRpc: {
        data: {
            command: "get-file-data-for-thumbnail";
            method: "GET";
            request: {
                "file-id": string | null;
                "strip-frames-with-thumbnails": false;
            };
        };
        persist:
            | {
                  command: "create-file-thumbnail";
                  method: "POST";
                  request: {
                      "file-id": string | null;
                      revn: number | "<from get-file-data-for-thumbnail>";
                      media: "<rendered png blob>";
                  };
              }
            | {
                  command: "create-file-object-thumbnail";
                  method: "POST";
                  request: {
                      "file-id": string | null;
                      "object-id": string | null;
                      tag: string | null;
                      media: "<rendered png blob>";
                  };
              };
    };
    requires: string[];
    nextActions: string[];
    diagnostics: {
        adapterBoundary: "descriptor-only";
        mcpToolRegistered: false;
        cliCommandRegistered: false;
        exporterBoundary: string;
        thumbnailDataCommand: "get-file-data-for-thumbnail";
        thumbnailPersistCommand: "create-file-thumbnail" | "create-file-object-thumbnail";
        objectThumbnailIdFormat: "fileId/pageId/objectId/tag";
        frameTargetDataProviderPending: boolean;
    };
}

export interface LowRiskCommandDescriptorCatalog {
    MCP_STATUS: CommandDescriptor & { id: "mcp.status"; mcpToolName: "mcp.get_status"; cliCommand: "mcp status" };
    MCP_CONFIG: CommandDescriptor & { id: "mcp.config"; cliCommand: "mcp config" };
    FILE_LIST: CommandDescriptor & { id: "file.list"; mcpToolName: "file.list"; cliCommand: "file list" };
    FILE_CREATE: CommandDescriptor & { id: "file.create"; mcpToolName: "file.create"; cliCommand: "file create" };
    FILE_OPEN: CommandDescriptor & { id: "file.open"; mcpToolName: "file.open"; cliCommand: "file open" };
    PAGE_LIST: CommandDescriptor & { id: "page.list"; mcpToolName: "page.list"; cliCommand: "page list" };
    PAGE_CREATE: CommandDescriptor & { id: "page.create"; mcpToolName: "page.create"; cliCommand: "page create" };
}

export interface CommandDescriptorCatalog extends LowRiskCommandDescriptorCatalog {
    PAGE_RENAME: CommandDescriptor & { id: "page.rename"; mcpToolName: "page.rename"; cliCommand: "page rename" };
    PAGE_SET_CURRENT: CommandDescriptor & { id: "page.set_current"; mcpToolName: "page.set_current" };
    SELECTION_GET: CommandDescriptor & { id: "selection.get"; mcpToolName: "selection.get" };
    SELECTION_SET: CommandDescriptor & { id: "selection.set"; mcpToolName: "selection.set" };
    PROTOTYPE_CREATE_FLOW: CommandDescriptor & {
        id: "prototype.create_flow";
        mcpToolName: "prototype.create_flow";
        cliCommand: "prototype create-flow";
    };
    PROTOTYPE_CREATE_INTERACTION: CommandDescriptor & {
        id: "prototype.create_interaction";
        mcpToolName: "prototype.create_interaction";
        cliCommand: "prototype create-interaction";
    };
    PROTOTYPE_LIST_INTERACTIONS: CommandDescriptor & {
        id: "prototype.list_interactions";
        mcpToolName: "prototype.list_interactions";
        cliCommand: "prototype list-interactions";
    };
    PROTOTYPE_DELETE_INTERACTION: CommandDescriptor & {
        id: "prototype.delete_interaction";
        mcpToolName: "prototype.delete_interaction";
        cliCommand: "prototype delete-interaction";
    };
    PROTOTYPE_UPDATE_INTERACTION: CommandDescriptor & {
        id: "prototype.update_interaction";
        mcpToolName: "prototype.update_interaction";
        cliCommand: "prototype update-interaction";
    };
    PROTOTYPE_REORDER_INTERACTION: CommandDescriptor & {
        id: "prototype.reorder_interaction";
        mcpToolName: "prototype.reorder_interaction";
        cliCommand: "prototype reorder-interaction";
    };
    PROTOTYPE_DUPLICATE_INTERACTION: CommandDescriptor & {
        id: "prototype.duplicate_interaction";
        mcpToolName: "prototype.duplicate_interaction";
        cliCommand: "prototype duplicate-interaction";
    };
    PROTOTYPE_CREATE_OVERLAY: CommandDescriptor & {
        id: "prototype.create_overlay";
        mcpToolName: "prototype.create_overlay";
        cliCommand: "prototype create-overlay";
    };
    SHAPE_CREATE_FRAME: CommandDescriptor & {
        id: "shape.create_frame";
        mcpToolName: "shape.create_frame";
        cliCommand: "shape create-frame";
    };
    SHAPE_CREATE_RECT: CommandDescriptor & {
        id: "shape.create_rect";
        mcpToolName: "shape.create_rect";
        cliCommand: "shape create-rect";
    };
    SHAPE_CREATE_TEXT: CommandDescriptor & {
        id: "shape.create_text";
        mcpToolName: "shape.create_text";
        cliCommand: "shape create-text";
    };
    SHAPE_CREATE_IMAGE: CommandDescriptor & {
        id: "shape.create_image";
        mcpToolName: "shape.create_image";
        cliCommand: "shape create-image";
    };
    SHAPE_UPDATE: CommandDescriptor & {
        id: "shape.update";
        mcpToolName: "shape.update";
        cliCommand: "shape update";
    };
    SHAPE_SET_LAYOUT: CommandDescriptor & {
        id: "shape.set_layout";
        mcpToolName: "shape.set_layout";
        cliCommand: "shape set-layout";
    };
    SHAPE_SET_STYLE: CommandDescriptor & {
        id: "shape.set_style";
        mcpToolName: "shape.set_style";
        cliCommand: "shape set-style";
    };
    SHAPE_DELETE: CommandDescriptor & {
        id: "shape.delete";
        mcpToolName: "shape.delete";
        cliCommand: "shape delete";
    };
    EXPORT_SHAPE: CommandDescriptor & { id: "export.shape"; mcpToolName: "export.shape" };
    EXPORT_PAGE: CommandDescriptor & {
        id: "export.page";
        mcpToolName: "export.page";
        cliCommand: "export page";
    };
    EXPORT_FILE: CommandDescriptor & {
        id: "export.file";
        mcpToolName: "export.file";
        cliCommand: "export file";
    };
    RENDER_PREVIEW: CommandDescriptor & {
        id: "render.preview";
        mcpToolName: "render.preview";
        cliCommand: "render preview";
    };
    RENDER_THUMBNAIL: CommandDescriptor & {
        id: "render.thumbnail";
        mcpToolName: "render.thumbnail";
    };
}

export const CommandErrorCodes: CommandErrorCodeCatalog;
export const AdapterSelectionReasonCodes: AdapterSelectionReasonCodeCatalog;
export const ExportFileFormats: ExportFileFormatCatalog;
export const ExportFileLibraryModes: ExportFileLibraryModeCatalog;
export const RenderThumbnailTargets: RenderThumbnailTargetCatalog;
export const RenderThumbnailCachePolicies: RenderThumbnailCachePolicyCatalog;
export const RenderThumbnailFormats: RenderThumbnailFormatCatalog;
export const CommandDescriptors: CommandDescriptorCatalog;
export const LowRiskCommandDescriptors: readonly CommandDescriptor[];
export const HeadlessAuthoringCommandDescriptors: readonly CommandDescriptor[];
export const LiveGapCommandDescriptors: readonly CommandDescriptor[];
export const ShapeExportCommandDescriptors: readonly CommandDescriptor[];
export const MigratedCommandDescriptors: readonly CommandDescriptor[];
export function getCommandDescriptor(id: string): CommandDescriptor | undefined;
export function createCommandRequestEnvelope<TInput = unknown>(
    command: string | CommandDescriptor,
    options?: CreateCommandRequestEnvelopeOptions<TInput>
): CommandRequestEnvelope<TInput>;
export function createCommandResultEnvelope<TData = unknown>(
    requestEnvelope: string | CommandDescriptor | CommandRequestEnvelope,
    data: TData,
    options?: CreateCommandResultEnvelopeOptions
): CommandResultEnvelope<TData>;
export function getAdapterSelectionReason(code: AdapterSelectionReasonCode | string): string;
export function createWorkspaceUrl(options: CreateWorkspaceUrlOptions): string;
export function createFileOpenHandoff(options: CreateFileOpenHandoffOptions): FileOpenHandoff;
export function createExportFileContract(options?: CreateExportFileContractOptions): ExportFileContract;
export function createRenderThumbnailContract(options?: CreateRenderThumbnailContractOptions): RenderThumbnailContract;
export function createCommandErrorPayload(
    code: CommandErrorCode | string,
    message: string,
    options?: CreateCommandErrorPayloadOptions
): CommandErrorPayload;
export function createAdapterSelectionError(
    selection: CommandAdapterSelection,
    options?: CreateCommandErrorPayloadOptions
): CommandErrorPayload;
export function selectCommandAdapter(options: SelectCommandAdapterOptions): CommandAdapterSelection;
