const DEFAULT_PRIORITIES = Object.freeze({
    "backend-rpc": 10,
    "backend-command": 10,
    exporter: 20,
    "browser-url": 30,
    "local-fs": 40,
    "plugin-live": 50,
});

const EMPTY_OBJECT = Object.freeze({});

export const CommandErrorCodes = Object.freeze({
    AUTHENTICATION_REQUIRED: "authentication_required",
    BACKEND_CONFIG_INVALID: "penpot_backend_config_invalid",
    BACKEND_UNAVAILABLE: "penpot_backend_unavailable",
    OBJECT_NOT_FOUND_OR_FORBIDDEN: "object_not_found_or_forbidden",
    PERMISSION_DENIED: "permission_denied",
    PENPOT_RPC_ERROR: "penpot_rpc_error",
    RATE_LIMIT_REACHED: "rate_limit_reached",
    ADAPTER_NOT_AVAILABLE: "adapter_not_available",
    ADAPTER_NOT_SUPPORTED: "adapter_not_supported",
    FILE_CONTEXT_REQUIRED: "file_context_required",
    MCP_WRITE_CONCURRENCY_LIMIT: "mcp_write_concurrency_limit",
    MCP_WRITE_RATE_LIMIT: "mcp_write_rate_limit",
    DESTRUCTIVE_ACTION_CONFIRMATION_REQUIRED: "destructive_action_confirmation_required",
});

export const AdapterSelectionReasonCodes = Object.freeze({
    BACKEND_COMMAND_FILE_ID_REQUIRED: "backend_command_file_id_required",
    BACKEND_COMMAND_FILE_PAGE_REQUIRED: "backend_command_file_page_required",
    BACKEND_COMMAND_LAYOUT_UNSUPPORTED: "backend_command_layout_unsupported",
    PLUGIN_LIVE_OMIT_FILE_ID: "plugin_live_omit_file_id",
    PLUGIN_LIVE_OMIT_FILE_PAGE: "plugin_live_omit_file_page",
    CLI_PLUGIN_LIVE_UNSUPPORTED: "cli_plugin_live_unsupported",
    CLI_EXPORT_PLUGIN_LIVE_UNSUPPORTED: "cli_export_plugin_live_unsupported",
    CLI_SHAPE_PLUGIN_LIVE_UNSUPPORTED: "cli_shape_plugin_live_unsupported",
});

const AdapterSelectionReasonMessages = Object.freeze({
    [AdapterSelectionReasonCodes.BACKEND_COMMAND_FILE_ID_REQUIRED]:
        "backend-command requires an explicit fileId.",
    [AdapterSelectionReasonCodes.BACKEND_COMMAND_FILE_PAGE_REQUIRED]:
        "backend-command requires explicit fileId and pageId.",
    [AdapterSelectionReasonCodes.BACKEND_COMMAND_LAYOUT_UNSUPPORTED]:
        "backend-command does not support layout updates yet.",
    [AdapterSelectionReasonCodes.PLUGIN_LIVE_OMIT_FILE_ID]:
        "plugin-live uses the bound workspace context; omit fileId to request it.",
    [AdapterSelectionReasonCodes.PLUGIN_LIVE_OMIT_FILE_PAGE]:
        "plugin-live uses the bound workspace context; omit fileId and pageId to request it.",
    [AdapterSelectionReasonCodes.CLI_PLUGIN_LIVE_UNSUPPORTED]:
        "CLI commands do not execute live workspace plugin tasks.",
    [AdapterSelectionReasonCodes.CLI_EXPORT_PLUGIN_LIVE_UNSUPPORTED]:
        "CLI export planning requires explicit file/page/object ids and does not use live selection.",
    [AdapterSelectionReasonCodes.CLI_SHAPE_PLUGIN_LIVE_UNSUPPORTED]:
        "CLI shape commands require explicit backend targets and do not use live workspace state.",
});

export const CommandDescriptors = Object.freeze({
    MCP_STATUS: Object.freeze({
        id: "mcp.status",
        mcpToolName: "mcp.get_status",
        cliCommand: "mcp status",
        title: "MCP status",
        description:
            "Returns token-safe MCP status for the current session, including server, transport, plugin, " +
            "user-session, and file-context state.",
        inputSchema: "empty",
        adapters: Object.freeze(["local", "http"]),
        responseShape: "status envelope with MCP status data",
    }),
    MCP_CONFIG: Object.freeze({
        id: "mcp.config",
        cliCommand: "mcp config",
        title: "MCP config",
        description: "Prints the effective MCP connection mode and endpoint configuration.",
        inputSchema: "cli-options",
        adapters: Object.freeze(["local"]),
        responseShape: "status envelope with mode, endpoint, log, and profile-prop preview data",
    }),
    FILE_LIST: Object.freeze({
        id: "file.list",
        mcpToolName: "file.list",
        cliCommand: "file list",
        title: "List files",
        description: "Lists files in a Penpot project using the current user's permissions.",
        inputSchema: "projectId",
        adapters: Object.freeze(["backend-rpc"]),
        responseShape: "status envelope with projectId and files",
    }),
    FILE_CREATE: Object.freeze({
        id: "file.create",
        mcpToolName: "file.create",
        cliCommand: "file create",
        title: "Create file",
        description: "Creates a new Penpot file in a project using the current user's permissions.",
        inputSchema: "projectId, name?, isShared?",
        adapters: Object.freeze(["backend-rpc", "backend-command"]),
        responseShape: "status envelope with file summary and next actions",
    }),
    FILE_OPEN: Object.freeze({
        id: "file.open",
        cliCommand: "file open",
        title: "Open file",
        description: "Builds a browser URL for a Penpot file without binding MCP file context.",
        inputSchema: "fileId, teamId?, pageId?",
        adapters: Object.freeze(["browser-url"]),
        responseShape: "status envelope with fileId, url, adapter, and boundContext=false",
    }),
    PAGE_LIST: Object.freeze({
        id: "page.list",
        mcpToolName: "page.list",
        cliCommand: "page list",
        title: "List pages",
        description:
            "Lists pages in a Penpot file, using backend-command when fileId is supplied or the bound live context otherwise.",
        inputSchema: "fileId?, adapter?",
        adapters: Object.freeze(["backend-command", "plugin-live"]),
        responseShape: "status envelope with pages and adapterSelection metadata",
    }),
    PAGE_CREATE: Object.freeze({
        id: "page.create",
        mcpToolName: "page.create",
        cliCommand: "page create",
        title: "Create page",
        description:
            "Creates a page in a Penpot file, using backend-command when fileId is supplied or the bound live context otherwise.",
        inputSchema: "fileId?, pageId?, name?, makeCurrent?, adapter?",
        adapters: Object.freeze(["backend-command", "plugin-live"]),
        responseShape: "status envelope with page summary and adapterSelection metadata",
    }),
});

export const LowRiskCommandDescriptors = Object.freeze([
    CommandDescriptors.MCP_STATUS,
    CommandDescriptors.MCP_CONFIG,
    CommandDescriptors.FILE_LIST,
    CommandDescriptors.FILE_CREATE,
    CommandDescriptors.FILE_OPEN,
    CommandDescriptors.PAGE_LIST,
    CommandDescriptors.PAGE_CREATE,
]);

export function getCommandDescriptor(id) {
    return LowRiskCommandDescriptors.find(
        (descriptor) => descriptor.id === id || descriptor.mcpToolName === id || descriptor.cliCommand === id
    );
}

export function createCommandRequestEnvelope(command, options = EMPTY_OBJECT) {
    const descriptor = resolveCommandDescriptor(command);
    const adapterSelection = options.adapterSelection ?? null;

    return {
        command: descriptor?.id ?? resolveCommandId(command),
        descriptor: descriptor ? summarizeDescriptor(descriptor) : null,
        transport: options.transport ?? "internal",
        input: options.input ?? EMPTY_OBJECT,
        target: compactRecord(options.target),
        auth: normalizeAuthMetadata(options.auth),
        adapter: options.adapter ?? adapterSelection?.selected ?? null,
        adapterSelection,
        diagnostics: compactRecord(options.diagnostics),
    };
}

export function createCommandResultEnvelope(requestEnvelope, data, options = EMPTY_OBJECT) {
    const request =
        typeof requestEnvelope === "string" || isCommandDescriptor(requestEnvelope)
            ? createCommandRequestEnvelope(requestEnvelope, options)
            : requestEnvelope;
    const adapterSelection = options.adapterSelection ?? request.adapterSelection ?? null;

    return {
        status: options.status ?? "ok",
        command: request.command,
        descriptor: request.descriptor ?? null,
        transport: options.transport ?? request.transport,
        adapter: options.adapter ?? request.adapter ?? adapterSelection?.selected ?? null,
        target: options.target === undefined ? request.target : compactRecord(options.target),
        auth: request.auth ?? EMPTY_OBJECT,
        diagnostics: compactRecord({
            ...(request.diagnostics ?? EMPTY_OBJECT),
            ...(options.diagnostics ?? EMPTY_OBJECT),
        }),
        adapterSelection,
        data,
        warnings: options.warnings ?? [],
    };
}

export function getAdapterSelectionReason(code) {
    return AdapterSelectionReasonMessages[code] ?? String(code);
}

export function createCommandErrorPayload(code, message, options = EMPTY_OBJECT) {
    return {
        code,
        message,
        actions: options.actions ?? [],
        data: compactRecord(options.data),
    };
}

export function createAdapterSelectionError(selection, options = EMPTY_OBJECT) {
    return createCommandErrorPayload(
        selection.status === "unsupported"
            ? CommandErrorCodes.ADAPTER_NOT_SUPPORTED
            : CommandErrorCodes.ADAPTER_NOT_AVAILABLE,
        `No available adapter matched ${formatRequestedAdapter(selection.requested)} for ${selection.command}.`,
        {
            actions: options.actions,
            data: {
                adapterSelection: selection,
                ...(options.data ?? EMPTY_OBJECT),
            },
        }
    );
}

export function selectCommandAdapter(options) {
    const requested = options.requestedAdapter ?? "auto";
    const candidates = normalizeCandidates(options.candidates);
    const explicitRequested = requested === "auto" ? null : requested;

    if (explicitRequested) {
        const requestedCandidate = candidates.find((candidate) => candidate.kind === explicitRequested);
        if (!requestedCandidate) {
            return createSelection(options.command, requested, null, "unsupported", candidates);
        }
        if (!requestedCandidate.available) {
            return createSelection(options.command, requested, null, "unavailable", candidates);
        }
        return createSelection(options.command, requested, requestedCandidate.kind, "selected", candidates);
    }

    const selectedCandidate = candidates.find((candidate) => candidate.available);
    return createSelection(
        options.command,
        requested,
        selectedCandidate?.kind ?? null,
        selectedCandidate ? "selected" : "unavailable",
        candidates
    );
}

function formatRequestedAdapter(requested) {
    return requested === "auto" ? "auto" : `'${requested}'`;
}

function resolveCommandDescriptor(command) {
    if (isCommandDescriptor(command)) {
        return command;
    }
    return getCommandDescriptor(command);
}

function resolveCommandId(command) {
    if (isCommandDescriptor(command)) {
        return command.id;
    }
    return String(command);
}

function isCommandDescriptor(value) {
    return Boolean(value && typeof value === "object" && typeof value.id === "string");
}

function summarizeDescriptor(descriptor) {
    return compactRecord({
        id: descriptor.id,
        mcpToolName: descriptor.mcpToolName,
        cliCommand: descriptor.cliCommand,
        title: descriptor.title,
        adapters: descriptor.adapters,
    });
}

function normalizeAuthMetadata(auth) {
    if (!auth || typeof auth !== "object") {
        return EMPTY_OBJECT;
    }

    return compactRecord({
        userTokenPresent: typeof auth.userTokenPresent === "boolean" ? auth.userTokenPresent : undefined,
        mode: auth.mode,
        source: auth.source,
    });
}

function compactRecord(record) {
    if (!record || typeof record !== "object" || Array.isArray(record)) {
        return {};
    }

    return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined));
}

function normalizeCandidates(candidates) {
    return candidates
        .map((candidate) => ({
            kind: candidate.kind,
            available: candidate.available !== false,
            priority: candidate.priority ?? DEFAULT_PRIORITIES[candidate.kind] ?? 100,
            reason: candidate.reason ?? null,
        }))
        .sort((left, right) => left.priority - right.priority || left.kind.localeCompare(right.kind));
}

function createSelection(command, requested, selected, status, candidates) {
    return {
        command,
        requested,
        selected,
        status,
        candidates,
        fallbacks: candidates
            .filter((candidate) => candidate.kind !== selected)
            .map((candidate) => ({
                kind: candidate.kind,
                available: candidate.available,
                reason: candidate.reason,
            })),
    };
}
