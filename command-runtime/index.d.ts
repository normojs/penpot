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
    CLI_PLUGIN_LIVE_UNSUPPORTED: "cli_plugin_live_unsupported";
    CLI_EXPORT_PLUGIN_LIVE_UNSUPPORTED: "cli_export_plugin_live_unsupported";
    CLI_SHAPE_PLUGIN_LIVE_UNSUPPORTED: "cli_shape_plugin_live_unsupported";
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

export interface LowRiskCommandDescriptorCatalog {
    MCP_STATUS: CommandDescriptor & { id: "mcp.status"; mcpToolName: "mcp.get_status"; cliCommand: "mcp status" };
    MCP_CONFIG: CommandDescriptor & { id: "mcp.config"; cliCommand: "mcp config" };
    FILE_LIST: CommandDescriptor & { id: "file.list"; mcpToolName: "file.list"; cliCommand: "file list" };
    FILE_CREATE: CommandDescriptor & { id: "file.create"; mcpToolName: "file.create"; cliCommand: "file create" };
    FILE_OPEN: CommandDescriptor & { id: "file.open"; cliCommand: "file open" };
    PAGE_LIST: CommandDescriptor & { id: "page.list"; mcpToolName: "page.list"; cliCommand: "page list" };
    PAGE_CREATE: CommandDescriptor & { id: "page.create"; mcpToolName: "page.create"; cliCommand: "page create" };
}

export interface CommandDescriptorCatalog extends LowRiskCommandDescriptorCatalog {
    PAGE_RENAME: CommandDescriptor & { id: "page.rename"; mcpToolName: "page.rename"; cliCommand: "page rename" };
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
    RENDER_PREVIEW: CommandDescriptor & { id: "render.preview"; mcpToolName: "render.preview" };
}

export const CommandErrorCodes: CommandErrorCodeCatalog;
export const AdapterSelectionReasonCodes: AdapterSelectionReasonCodeCatalog;
export const CommandDescriptors: CommandDescriptorCatalog;
export const LowRiskCommandDescriptors: readonly CommandDescriptor[];
export const HeadlessAuthoringCommandDescriptors: readonly CommandDescriptor[];
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
