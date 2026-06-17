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
    PLUGIN_LIVE_BACKEND_ONLY_SHAPE_FIELDS_UNSUPPORTED: "plugin_live_backend_only_shape_fields_unsupported",
    PLUGIN_LIVE_OMIT_FILE_ID: "plugin_live_omit_file_id",
    PLUGIN_LIVE_OMIT_FILE_PAGE: "plugin_live_omit_file_page",
    EXPORTER_EXPLICIT_TARGET_REQUIRED: "exporter_explicit_target_required",
    PLUGIN_LIVE_OMIT_EXPLICIT_TARGET: "plugin_live_omit_explicit_target",
    CLI_PLUGIN_LIVE_UNSUPPORTED: "cli_plugin_live_unsupported",
    CLI_EXPORT_PLUGIN_LIVE_UNSUPPORTED: "cli_export_plugin_live_unsupported",
    CLI_SHAPE_PLUGIN_LIVE_UNSUPPORTED: "cli_shape_plugin_live_unsupported",
    PLUGIN_LIVE_WORKSPACE_STATE_REQUIRED: "plugin_live_workspace_state_required",
    BACKEND_COMMAND_PROTOTYPE_READ_PLANNED: "backend_command_prototype_read_planned",
    BACKEND_COMMAND_PROTOTYPE_MUTATION_UNSUPPORTED: "backend_command_prototype_mutation_unsupported",
    BACKEND_COMMAND_GRID_CONTRACT_UNSUPPORTED: "backend_command_grid_contract_unsupported",
    CLI_LIVE_WORKSPACE_STATE_UNSUPPORTED: "cli_live_workspace_state_unsupported",
});

const AdapterSelectionReasonMessages = Object.freeze({
    [AdapterSelectionReasonCodes.BACKEND_COMMAND_FILE_ID_REQUIRED]:
        "backend-command requires an explicit fileId.",
    [AdapterSelectionReasonCodes.BACKEND_COMMAND_FILE_PAGE_REQUIRED]:
        "backend-command requires explicit fileId and pageId.",
    [AdapterSelectionReasonCodes.BACKEND_COMMAND_LAYOUT_UNSUPPORTED]:
        "backend-command supports layout none/flex only; use plugin-live for grid layout updates.",
    [AdapterSelectionReasonCodes.PLUGIN_LIVE_BACKEND_ONLY_SHAPE_FIELDS_UNSUPPORTED]:
        "plugin-live does not support backend-only shape style or hierarchy fields; pass fileId to use backend-command.",
    [AdapterSelectionReasonCodes.PLUGIN_LIVE_OMIT_FILE_ID]:
        "plugin-live uses the bound workspace context; omit fileId to request it.",
    [AdapterSelectionReasonCodes.PLUGIN_LIVE_OMIT_FILE_PAGE]:
        "plugin-live uses the bound workspace context; omit fileId and pageId to request it.",
    [AdapterSelectionReasonCodes.EXPORTER_EXPLICIT_TARGET_REQUIRED]:
        "exporter requires explicit fileId, pageId, and objectId.",
    [AdapterSelectionReasonCodes.PLUGIN_LIVE_OMIT_EXPLICIT_TARGET]:
        "plugin-live uses the bound workspace context; omit fileId, pageId, and objectId to request it.",
    [AdapterSelectionReasonCodes.CLI_PLUGIN_LIVE_UNSUPPORTED]:
        "CLI commands do not execute live workspace plugin tasks.",
    [AdapterSelectionReasonCodes.CLI_EXPORT_PLUGIN_LIVE_UNSUPPORTED]:
        "CLI export planning requires explicit file/page/object ids and does not use live selection.",
    [AdapterSelectionReasonCodes.CLI_SHAPE_PLUGIN_LIVE_UNSUPPORTED]:
        "CLI shape commands require explicit backend targets and do not use live workspace state.",
    [AdapterSelectionReasonCodes.PLUGIN_LIVE_WORKSPACE_STATE_REQUIRED]:
        "plugin-live requires a bound Penpot workspace because this command reads or changes editor-local state.",
    [AdapterSelectionReasonCodes.BACKEND_COMMAND_PROTOTYPE_READ_PLANNED]:
        "backend-command prototype reads are planned for explicit file/page targets.",
    [AdapterSelectionReasonCodes.BACKEND_COMMAND_PROTOTYPE_MUTATION_UNSUPPORTED]:
        "backend-command prototype mutations need a stable target and interaction identity contract before execution.",
    [AdapterSelectionReasonCodes.BACKEND_COMMAND_GRID_CONTRACT_UNSUPPORTED]:
        "backend-command grid layout updates are unsupported until a stable grid track and cell payload contract exists.",
    [AdapterSelectionReasonCodes.CLI_LIVE_WORKSPACE_STATE_UNSUPPORTED]:
        "CLI commands do not read or mutate editor-local workspace state; use MCP with a bound live workspace.",
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
        mcpToolName: "file.open",
        cliCommand: "file open",
        title: "Open file",
        description: "Builds a browser URL and handoff actions for a Penpot file without binding MCP file context.",
        inputSchema: "fileId, teamId?, pageId?, publicUri?, adapter?",
        adapters: Object.freeze(["browser-url"]),
        responseShape: "status envelope with fileId, workspaceUrl, handoff actions, adapter, and boundContext=false",
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
    PAGE_RENAME: Object.freeze({
        id: "page.rename",
        mcpToolName: "page.rename",
        cliCommand: "page rename",
        title: "Rename page",
        description:
            "Renames a page in a Penpot file, using backend-command when fileId is supplied or the bound live context otherwise.",
        inputSchema: "fileId?, pageId, name, adapter?",
        adapters: Object.freeze(["backend-command", "plugin-live"]),
        responseShape: "status envelope with page summary, revision metadata, and adapterSelection metadata",
    }),
    PAGE_SET_CURRENT: Object.freeze({
        id: "page.set_current",
        mcpToolName: "page.set_current",
        title: "Set current page",
        description:
            "Switches the currently bound Penpot workspace context to a page through plugin-live editor state.",
        inputSchema: "pageId",
        adapters: Object.freeze(["plugin-live"]),
        responseShape: "status envelope with pageId and plugin-live adapter metadata",
    }),
    SELECTION_GET: Object.freeze({
        id: "selection.get",
        mcpToolName: "selection.get",
        title: "Get selection",
        description:
            "Reads the current selection from a bound live Penpot workspace; CLI and backend-command cannot read editor-local selection state.",
        inputSchema: "empty",
        adapters: Object.freeze(["plugin-live"]),
        responseShape: "planned status envelope with selected shape summaries and plugin-live adapter metadata",
    }),
    SELECTION_SET: Object.freeze({
        id: "selection.set",
        mcpToolName: "selection.set",
        title: "Set selection",
        description:
            "Sets the current selection in a bound live Penpot workspace; descriptor-only until a plugin-live task contract is added.",
        inputSchema: "shapeIds",
        adapters: Object.freeze(["plugin-live"]),
        responseShape: "planned status envelope with selected shape ids and plugin-live adapter metadata",
    }),
    PROTOTYPE_CREATE_FLOW: Object.freeze({
        id: "prototype.create_flow",
        mcpToolName: "prototype.create_flow",
        cliCommand: "prototype create-flow",
        title: "Create prototype flow",
        description:
            "Creates a prototype flow using backend-command when a file id is supplied or plugin-live otherwise.",
        inputSchema: "fileId?, pageId?, flowId?, name, startingBoardId, adapter?",
        adapters: Object.freeze(["backend-command", "plugin-live"]),
        responseShape: "status envelope with flow summary, revision metadata, and adapterSelection metadata",
    }),
    PROTOTYPE_CREATE_INTERACTION: Object.freeze({
        id: "prototype.create_interaction",
        mcpToolName: "prototype.create_interaction",
        cliCommand: "prototype create-interaction",
        title: "Create prototype interaction",
        description:
            "Creates a navigate-to prototype interaction using backend-command when a file id is supplied or plugin-live otherwise.",
        inputSchema:
            "fileId?, pageId?, sourceShapeId, destinationBoardId, trigger?, delay?, preserveScrollPosition?, animation?, adapter?",
        adapters: Object.freeze(["backend-command", "plugin-live"]),
        responseShape: "status envelope with interaction summary, revision metadata, and adapterSelection metadata",
    }),
    PROTOTYPE_LIST_INTERACTIONS: Object.freeze({
        id: "prototype.list_interactions",
        mcpToolName: "prototype.list_interactions",
        cliCommand: "prototype list-interactions",
        title: "List prototype interactions",
        description:
            "Planned backend-command read for persisted prototype flows and interactions using explicit file/page targets.",
        inputSchema: "fileId, pageId?, flowId?, sourceShapeId?, adapter?",
        adapters: Object.freeze(["backend-command"]),
        responseShape: "planned status envelope with flow and interaction summaries",
    }),
    PROTOTYPE_DELETE_INTERACTION: Object.freeze({
        id: "prototype.delete_interaction",
        mcpToolName: "prototype.delete_interaction",
        title: "Delete prototype interaction",
        description:
            "Descriptor-only planned command; mutation remains unsupported until interaction target and identity semantics are stable.",
        inputSchema: "fileId?, pageId?, sourceShapeId?, interactionId? or interactionIndex?, adapter?",
        adapters: Object.freeze([]),
        responseShape: "unsupported until a stable backend-command mutation contract exists",
    }),
    PROTOTYPE_CREATE_OVERLAY: Object.freeze({
        id: "prototype.create_overlay",
        mcpToolName: "prototype.create_overlay",
        title: "Create prototype overlay",
        description:
            "Descriptor-only planned command; overlay creation is not executable until overlay payload semantics are defined.",
        inputSchema: "planned overlay target and interaction payload",
        adapters: Object.freeze([]),
        responseShape: "unsupported until overlay command contract exists",
    }),
    SHAPE_CREATE_FRAME: Object.freeze({
        id: "shape.create_frame",
        mcpToolName: "shape.create_frame",
        cliCommand: "shape create-frame",
        title: "Create frame",
        description:
            "Creates a frame using backend-command when explicit file/page targets are supplied or plugin-live otherwise.",
        inputSchema: "fileId?, pageId?, shapeId?, parentId?, name?, x, y, width, height, fill?, stroke?, borderRadius?",
        adapters: Object.freeze(["backend-command", "plugin-live"]),
        responseShape: "status envelope with shape summary, revision metadata, and adapterSelection metadata",
    }),
    SHAPE_CREATE_RECT: Object.freeze({
        id: "shape.create_rect",
        mcpToolName: "shape.create_rect",
        cliCommand: "shape create-rect",
        title: "Create rectangle",
        description:
            "Creates a rectangle using backend-command when explicit file/page targets are supplied or plugin-live otherwise.",
        inputSchema: "fileId?, pageId?, shapeId?, parentId?, name?, x, y, width, height, fill?, stroke?, borderRadius?",
        adapters: Object.freeze(["backend-command", "plugin-live"]),
        responseShape: "status envelope with shape summary, revision metadata, and adapterSelection metadata",
    }),
    SHAPE_CREATE_TEXT: Object.freeze({
        id: "shape.create_text",
        mcpToolName: "shape.create_text",
        cliCommand: "shape create-text",
        title: "Create text",
        description:
            "Creates a text layer using backend-command when explicit file/page targets are supplied or plugin-live otherwise.",
        inputSchema: "fileId?, pageId?, shapeId?, parentId?, name?, x, y, width?, height?, content, fill?, fontSize?",
        adapters: Object.freeze(["backend-command", "plugin-live"]),
        responseShape: "status envelope with shape summary, revision metadata, and adapterSelection metadata",
    }),
    SHAPE_CREATE_IMAGE: Object.freeze({
        id: "shape.create_image",
        mcpToolName: "shape.create_image",
        cliCommand: "shape create-image",
        title: "Create image",
        description:
            "Creates an image-backed rectangle using backend-command when explicit file/page targets are supplied or plugin-live otherwise.",
        inputSchema:
            "fileId?, pageId?, shapeId?, parentId?, name?, x, y, width?, height?, imageBase64, mimeType, adapter?",
        adapters: Object.freeze(["backend-command", "plugin-live"]),
        responseShape: "status envelope with shape summary, media metadata, revision metadata, and adapterSelection metadata",
    }),
    SHAPE_UPDATE: Object.freeze({
        id: "shape.update",
        mcpToolName: "shape.update",
        cliCommand: "shape update",
        title: "Update shape",
        description:
            "Updates geometry, style, text, or supported layout fields using backend-command or plugin-live adapters.",
        inputSchema:
            "fileId?, pageId?, shapeId, parentId?, index?, name?, x?, y?, width?, height?, fill?, fills?, stroke?, strokes?, borderRadius?, r1?, r2?, r3?, r4?, content?, fontSize?, layout(type none|flex backend-command; grid plugin-live)?",
        adapters: Object.freeze(["backend-command", "plugin-live"]),
        responseShape: "status envelope with shape summary, revision metadata, and adapterSelection metadata",
    }),
    SHAPE_SET_LAYOUT: Object.freeze({
        id: "shape.set_layout",
        mcpToolName: "shape.set_layout",
        title: "Set shape layout",
        description:
            "Descriptor-only layout alias for shape.update; backend-command supports none/flex while grid remains plugin-live or planned backend-contract work.",
        inputSchema: "fileId?, pageId?, shapeId, layout(type none|flex backend-command; grid plugin-live/planned), adapter?",
        adapters: Object.freeze(["backend-command", "plugin-live"]),
        responseShape: "use shape.update today; grid backend-command updates are unsupported until the grid contract is defined",
    }),
    SHAPE_DELETE: Object.freeze({
        id: "shape.delete",
        mcpToolName: "shape.delete",
        cliCommand: "shape delete",
        title: "Delete shape",
        description: "Deletes a shape using backend-command or plugin-live adapters, with optional confirmation policy.",
        inputSchema: "fileId?, pageId?, shapeId, adapter?, confirm?",
        adapters: Object.freeze(["backend-command", "plugin-live"]),
        responseShape: "status envelope with deleted shape summary, revision metadata, and adapterSelection metadata",
    }),
    EXPORT_SHAPE: Object.freeze({
        id: "export.shape",
        mcpToolName: "export.shape",
        title: "Export shape",
        description: "Exports an explicit shape or current selection from the bound live Penpot workspace context.",
        inputSchema: "shapeId?, format?, scale?, skipChildren?",
        adapters: Object.freeze(["plugin-live"]),
        responseShape: "status envelope with base64 export data and export metadata",
    }),
    EXPORT_PAGE: Object.freeze({
        id: "export.page",
        mcpToolName: "export.page",
        cliCommand: "export page",
        title: "Export page",
        description:
            "Exports a page through plugin-live for bound workspace context or exporter for explicit CLI targets.",
        inputSchema: "fileId?, pageId?, objectId?, format?, scale?, output?, dryRun?",
        adapters: Object.freeze(["exporter", "plugin-live"]),
        responseShape: "status envelope with export plan, resource metadata, or base64 export data",
    }),
    RENDER_PREVIEW: Object.freeze({
        id: "render.preview",
        mcpToolName: "render.preview",
        cliCommand: "render preview",
        title: "Render preview",
        description:
            "Renders a PNG preview through plugin-live for bound workspace context or exporter for explicit targets.",
        inputSchema: "fileId?, pageId?, objectId?, target?, shapeId?, scale?, output?, dryRun?",
        adapters: Object.freeze(["exporter", "plugin-live"]),
        responseShape: "status envelope with preview plan, resource metadata, or base64 PNG preview data",
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

export const HeadlessAuthoringCommandDescriptors = Object.freeze([
    CommandDescriptors.PAGE_RENAME,
    CommandDescriptors.PROTOTYPE_CREATE_FLOW,
    CommandDescriptors.PROTOTYPE_CREATE_INTERACTION,
]);

export const LiveGapCommandDescriptors = Object.freeze([
    CommandDescriptors.PAGE_SET_CURRENT,
    CommandDescriptors.SELECTION_GET,
    CommandDescriptors.SELECTION_SET,
    CommandDescriptors.PROTOTYPE_LIST_INTERACTIONS,
    CommandDescriptors.PROTOTYPE_DELETE_INTERACTION,
    CommandDescriptors.PROTOTYPE_CREATE_OVERLAY,
    CommandDescriptors.SHAPE_SET_LAYOUT,
]);

export const ShapeExportCommandDescriptors = Object.freeze([
    CommandDescriptors.SHAPE_CREATE_FRAME,
    CommandDescriptors.SHAPE_CREATE_RECT,
    CommandDescriptors.SHAPE_CREATE_TEXT,
    CommandDescriptors.SHAPE_CREATE_IMAGE,
    CommandDescriptors.SHAPE_UPDATE,
    CommandDescriptors.SHAPE_DELETE,
    CommandDescriptors.EXPORT_SHAPE,
    CommandDescriptors.EXPORT_PAGE,
    CommandDescriptors.RENDER_PREVIEW,
]);

export const MigratedCommandDescriptors = Object.freeze([
    ...LowRiskCommandDescriptors,
    ...HeadlessAuthoringCommandDescriptors,
    ...ShapeExportCommandDescriptors,
    ...LiveGapCommandDescriptors,
]);

export function getCommandDescriptor(id) {
    return MigratedCommandDescriptors.find(
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

function trimTrailingSlash(value) {
    return value.replace(/\/+$/, "");
}

export function createWorkspaceUrl({ publicUri, fileId, teamId, pageId }) {
    const params = new URLSearchParams({ "file-id": fileId });
    if (teamId) {
        params.set("team-id", teamId);
    }
    if (pageId) {
        params.set("page-id", pageId);
    }
    return `${trimTrailingSlash(publicUri)}/#/workspace?${params.toString()}`;
}

export function createFileOpenHandoff({ fileId, teamId, pageId, workspaceUrl, status = "url_returned" }) {
    return {
        status,
        requiresUserAction: true,
        workspaceUrl,
        nextActions: ["open_workspace_url", "file.get_context", "file.bind_context", "retry_original_tool"],
        target: {
            fileId,
            ...(teamId ? { teamId } : {}),
            ...(pageId ? { pageId } : {}),
        },
    };
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
