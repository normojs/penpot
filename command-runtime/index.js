const DEFAULT_PRIORITIES = Object.freeze({
    "backend-rpc": 10,
    "backend-command": 10,
    "renderer-service": 15,
    exporter: 20,
    "browser-url": 30,
    "local-fs": 40,
    "plugin-live": 50,
});

const EMPTY_OBJECT = Object.freeze({});

export const ExportFileFormats = Object.freeze({
    PENPOT: "penpot",
});

export const ExportFileLibraryModes = Object.freeze({
    ALL: "all",
    MERGE: "merge",
    DETACH: "detach",
});

export const RenderThumbnailTargets = Object.freeze({
    FILE: "file",
    FRAME: "frame",
});

export const RenderThumbnailCachePolicies = Object.freeze({
    REUSE: "reuse",
    REFRESH: "refresh",
});

export const RenderThumbnailFormats = Object.freeze({
    PNG: "png",
});

const ExportFileLibraryModeConfig = Object.freeze({
    [ExportFileLibraryModes.ALL]: Object.freeze({ includeLibraries: true, embedAssets: false }),
    [ExportFileLibraryModes.MERGE]: Object.freeze({ includeLibraries: false, embedAssets: true }),
    [ExportFileLibraryModes.DETACH]: Object.freeze({ includeLibraries: false, embedAssets: false }),
});

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
        "backend-command supports layout none, flex, and grid container tracks only; use plugin-live for unsupported layout details.",
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
        "backend-command prototype reads require explicit file/page targets.",
    [AdapterSelectionReasonCodes.BACKEND_COMMAND_PROTOTYPE_MUTATION_UNSUPPORTED]:
        "backend-command prototype mutations require an explicit persisted-data contract before execution.",
    [AdapterSelectionReasonCodes.BACKEND_COMMAND_GRID_CONTRACT_UNSUPPORTED]:
        "backend-command grid cell and child placement updates are unsupported until a stable cell payload contract exists.",
    [AdapterSelectionReasonCodes.CLI_LIVE_WORKSPACE_STATE_UNSUPPORTED]:
        "CLI commands do not read or mutate editor-local workspace state; use MCP file.open, file.get_context, and file.bind_context before retrying the live-only tool.",
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
        inputSchema: "adapter?",
        adapters: Object.freeze(["plugin-live"]),
        responseShape: "status envelope with selected shape summaries and plugin-live adapter metadata",
    }),
    SELECTION_SET: Object.freeze({
        id: "selection.set",
        mcpToolName: "selection.set",
        title: "Set selection",
        description:
            "Sets the current selection in a bound live Penpot workspace; CLI and backend-command cannot mutate editor-local selection state.",
        inputSchema: "shapeIds, adapter?",
        adapters: Object.freeze(["plugin-live"]),
        responseShape: "status envelope with selected shape summaries and plugin-live adapter metadata",
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
        responseShape:
            "status envelope with interaction summary, generated interactionId, identity.kind stable-id, revision metadata, and adapterSelection metadata",
    }),
    PROTOTYPE_LIST_INTERACTIONS: Object.freeze({
        id: "prototype.list_interactions",
        mcpToolName: "prototype.list_interactions",
        cliCommand: "prototype list-interactions",
        title: "List prototype interactions",
        description:
            "Lists persisted prototype flows plus navigate and overlay interactions using backend-command explicit file/page targets.",
        inputSchema: "fileId, pageId?, flowId?, sourceShapeId?, adapter?",
        adapters: Object.freeze(["backend-command"]),
        responseShape:
            "status envelope with flow and navigate/open-overlay/toggle-overlay/close-overlay interaction summaries, " +
            "optional interactionId, identity.kind stable-id|source-index, and adapterSelection metadata",
    }),
    PROTOTYPE_DELETE_INTERACTION: Object.freeze({
        id: "prototype.delete_interaction",
        mcpToolName: "prototype.delete_interaction",
        cliCommand: "prototype delete-interaction",
        title: "Delete prototype interaction",
        description:
            "Deletes a persisted prototype interaction using backend-command with stable interactionId or legacy sourceShapeId plus interactionIndex.",
        inputSchema:
            "fileId, pageId?, interactionId? OR sourceShapeId + interactionIndex, optional sourceShapeId/interactionIndex guards with interactionId, adapter?",
        adapters: Object.freeze(["backend-command"]),
        responseShape:
            "status envelope with deleted interaction summary, optional interactionId, revision metadata, and adapterSelection metadata",
    }),
    PROTOTYPE_UPDATE_INTERACTION: Object.freeze({
        id: "prototype.update_interaction",
        mcpToolName: "prototype.update_interaction",
        cliCommand: "prototype update-interaction",
        title: "Update prototype interaction",
        description:
            "Updates supported fields on an existing persisted prototype interaction using backend-command stable ids or legacy source indexes.",
        inputSchema:
            "fileId, pageId?, interactionId OR sourceShapeId + interactionIndex, optional sourceShapeId/interactionIndex guards with interactionId, trigger?, delay?, animation?, destinationBoardId?, preserveScrollPosition?, overlayPositionType?, manualPosition?, relativeToShapeId?, closeClickOutside?, backgroundOverlay?; actionType immutable",
        adapters: Object.freeze(["backend-command"]),
        responseShape:
            "status envelope with updated interaction summary, revision metadata, and stale-target validation metadata",
    }),
    PROTOTYPE_REORDER_INTERACTION: Object.freeze({
        id: "prototype.reorder_interaction",
        mcpToolName: "prototype.reorder_interaction",
        cliCommand: "prototype reorder-interaction",
        title: "Reorder prototype interaction",
        description:
            "Moves a persisted prototype interaction within its source shape interaction list using backend-command.",
        inputSchema:
            "fileId, pageId?, interactionId OR sourceShapeId + interactionIndex, optional sourceShapeId/interactionIndex guards with interactionId, toIndex, adapter?; same source shape only",
        adapters: Object.freeze(["backend-command"]),
        responseShape:
            "status envelope with moved interaction summary, revision metadata, and stale-target validation metadata",
    }),
    PROTOTYPE_DUPLICATE_INTERACTION: Object.freeze({
        id: "prototype.duplicate_interaction",
        mcpToolName: "prototype.duplicate_interaction",
        cliCommand: "prototype duplicate-interaction",
        title: "Duplicate prototype interaction",
        description:
            "Duplicates a persisted prototype interaction on the same source shape using backend-command and generates a fresh interactionId.",
        inputSchema:
            "fileId, pageId?, interactionId OR sourceShapeId + interactionIndex, optional sourceShapeId/interactionIndex guards with interactionId, insertionIndex?, adapter?; backend generates new interactionId",
        adapters: Object.freeze(["backend-command"]),
        responseShape:
            "status envelope with duplicated interaction summary, generated interactionId, revision metadata, and stale-target validation metadata",
    }),
    PROTOTYPE_CREATE_OVERLAY: Object.freeze({
        id: "prototype.create_overlay",
        mcpToolName: "prototype.create_overlay",
        cliCommand: "prototype create-overlay",
        title: "Create prototype overlay",
        description:
            "Creates a persisted open, toggle, or close overlay prototype interaction using backend-command explicit file/page targets.",
        inputSchema:
            "fileId, pageId, sourceShapeId, actionType=open-overlay|toggle-overlay|close-overlay, destinationBoardId required for open/toggle and optional for close, relativeToShapeId?, overlayPositionType=center|manual|top-left|top-right|top-center|bottom-left|bottom-right|bottom-center, manualPosition{x,y} required when overlayPositionType=manual, closeClickOutside?, backgroundOverlay?, trigger?, delay?, animation?; push animation unsupported",
        adapters: Object.freeze(["backend-command"]),
        responseShape:
            "status envelope with overlay interaction summary, generated interactionId, identity.kind stable-id, revision metadata, and adapterSelection metadata",
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
            "fileId?, pageId?, shapeId, parentId?, index?, name?, x?, y?, width?, height?, fill?, fills?, stroke?, strokes?, borderRadius?, r1?, r2?, r3?, r4?, content?, fontSize?, layout(type none|flex|grid tracks backend-command; grid cells plugin-live)?",
        adapters: Object.freeze(["backend-command", "plugin-live"]),
        responseShape: "status envelope with shape summary, revision metadata, and adapterSelection metadata",
    }),
    SHAPE_SET_LAYOUT: Object.freeze({
        id: "shape.set_layout",
        mcpToolName: "shape.set_layout",
        cliCommand: "shape set-layout",
        title: "Set shape layout",
        description:
            "MCP and CLI alias for shape.update layout fields, forwarding to the same backend-command or plugin-live update paths.",
        inputSchema:
            "MCP/CLI alias of shape.update: fileId?, pageId?, shapeId, layout(type none|flex|grid tracks backend-command; grid cells plugin-live/planned), adapter?",
        adapters: Object.freeze(["backend-command", "plugin-live"]),
        responseShape:
            "shape.update-compatible status envelope with alias command/tool audit metadata; backend grid support covers container direction/tracks/gaps only",
    }),
    SHAPE_SET_STYLE: Object.freeze({
        id: "shape.set_style",
        mcpToolName: "shape.set_style",
        cliCommand: "shape set-style",
        title: "Set shape style",
        description:
            "MCP and CLI alias for shape.update style/text fields, forwarding to the same backend-command or plugin-live update paths.",
        inputSchema:
            "MCP/CLI alias of shape.update: fileId?, pageId?, shapeId, fill?, fills?, stroke?, strokes?, borderRadius?, r1?, r2?, r3?, r4?, content?, fontSize?, adapter?",
        adapters: Object.freeze(["backend-command", "plugin-live"]),
        responseShape:
            "shape.update-compatible status envelope with shape summary, revision metadata, adapterSelection, and alias command/tool audit metadata",
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
    EXPORT_FILE: Object.freeze({
        id: "export.file",
        mcpToolName: "export.file",
        cliCommand: "export file",
        title: "Export file",
        description:
            "Exports a file-level .penpot binary archive through backend-rpc export-binfile for explicit MCP and CLI targets.",
        inputSchema:
            "fileId, format=penpot?, libraryMode=all|merge|detach?, includeLibraries?, embedAssets?, output?, dryRun?, adapter?",
        adapters: Object.freeze(["backend-rpc"]),
        responseShape:
            "status envelope with .penpot artifact metadata, backend export-binfile RPC/SSE resource URI, and optional downloaded artifact metadata",
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
    RENDER_THUMBNAIL: Object.freeze({
        id: "render.thumbnail",
        mcpToolName: "render.thumbnail",
        cliCommand: "render thumbnail",
        title: "Render thumbnail",
        description:
            "Planned thumbnail render command contract for dashboard file thumbnails and tagged frame thumbnails; CLI dry-run can print the renderer-service request shape, but no rendering runtime is executable yet.",
        inputSchema:
            "fileId, target=file|frame?, pageId?, objectId?/frameId?/shapeId?, tag=frame?, revn?, width/size=252?, cachePolicy=reuse|refresh?, format=png?, output?, adapter?",
        adapters: Object.freeze(["renderer-service"]),
        responseShape:
            "dry-run/client plan with PNG thumbnail artifact metadata, cache key, backend thumbnail data/persist RPC boundaries, and renderer-service request shape; runtime execution unavailable until service implementation exists",
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
    CommandDescriptors.PROTOTYPE_CREATE_OVERLAY,
]);

export const LiveGapCommandDescriptors = Object.freeze([
    CommandDescriptors.PAGE_SET_CURRENT,
    CommandDescriptors.SELECTION_GET,
    CommandDescriptors.SELECTION_SET,
    CommandDescriptors.PROTOTYPE_LIST_INTERACTIONS,
    CommandDescriptors.PROTOTYPE_DELETE_INTERACTION,
    CommandDescriptors.PROTOTYPE_UPDATE_INTERACTION,
    CommandDescriptors.PROTOTYPE_REORDER_INTERACTION,
    CommandDescriptors.PROTOTYPE_DUPLICATE_INTERACTION,
    CommandDescriptors.SHAPE_SET_LAYOUT,
    CommandDescriptors.SHAPE_SET_STYLE,
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
    CommandDescriptors.EXPORT_FILE,
    CommandDescriptors.RENDER_PREVIEW,
    CommandDescriptors.RENDER_THUMBNAIL,
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

export function createExportFileContract(options = EMPTY_OBJECT) {
    const fileId = normalizeOptionalString(options.fileId);
    const format = normalizeExportFileFormat(options.format);
    const libraryMode = normalizeExportFileLibraryMode(options);
    const libraryConfig = ExportFileLibraryModeConfig[libraryMode];
    const output = normalizeOptionalString(options.output);
    const name = normalizeOptionalString(options.name) ?? "file";

    return {
        command: CommandDescriptors.EXPORT_FILE.id,
        status: "contract",
        executable: true,
        adapter: "backend-rpc",
        target: { fileId },
        artifact: {
            kind: "file-export",
            format,
            mimeType: "application/zip",
            extension: ".penpot",
            name,
            libraryMode,
            includeLibraries: libraryConfig.includeLibraries,
            embedAssets: libraryConfig.embedAssets,
            output,
        },
        backendRpc: {
            command: "export-binfile",
            transport: "sse",
            response: "resource-uri",
            request: {
                "file-id": fileId,
                "include-libraries": libraryConfig.includeLibraries,
                "embed-assets": libraryConfig.embedAssets,
            },
        },
        requires: fileId ? [] : ["fileId"],
        nextActions: [
            "Use MCP export.file or penpot-cli export file with backend-rpc to call export-binfile and read the SSE resource URI.",
            "Use an authenticated Penpot session with read permission for the target file.",
            "MCP returns resource metadata; pass --output <path> in penpot-cli to download the returned resource URI as a .penpot archive.",
        ],
        diagnostics: {
            adapterBoundary: "mcp-cli-backend-rpc",
            existingBackendCommand: "export-binfile",
            exporterBoundary: "export.file uses backend binary export, not exporter export-shapes.",
            mcpToolRegistered: true,
            cliCommandRegistered: true,
        },
    };
}

export function createRenderThumbnailContract(options = EMPTY_OBJECT) {
    const fileId = normalizeOptionalString(options.fileId);
    const pageId = normalizeOptionalString(options.pageId);
    const objectId = normalizeOptionalString(options.objectId ?? options.frameId ?? options.shapeId);
    const targetKind = normalizeRenderThumbnailTarget(options, pageId, objectId);
    const tag = targetKind === RenderThumbnailTargets.FRAME
        ? normalizeOptionalString(options.tag) ?? "frame"
        : null;
    const revn = normalizeOptionalInteger(options.revn);
    const format = normalizeRenderThumbnailFormat(options.format);
    const width = normalizePositiveInteger(options.width ?? options.size, 252, "render.thumbnail width");
    const height = Math.round(width * 2 / 3);
    const cachePolicy = normalizeRenderThumbnailCachePolicy(options.cachePolicy ?? options.cache);
    const output = normalizeOptionalString(options.output);
    const objectKey =
        targetKind === RenderThumbnailTargets.FRAME && fileId && pageId && objectId
            ? `${fileId}/${pageId}/${objectId}/${tag}`
            : null;
    const requires = [
        fileId ? null : "fileId",
        targetKind === RenderThumbnailTargets.FRAME && !pageId ? "pageId" : null,
        targetKind === RenderThumbnailTargets.FRAME && !objectId ? "objectId" : null,
    ].filter(Boolean);
    const cacheScope = targetKind === RenderThumbnailTargets.FILE ? "file-thumbnail" : "file-object-thumbnail";
    const cacheKey =
        targetKind === RenderThumbnailTargets.FILE
            ? fileId
                ? `file:${fileId}:revn:${revn ?? "<resolved-revn>"}`
                : null
            : objectKey;
    const persistCommand =
        targetKind === RenderThumbnailTargets.FILE
            ? "create-file-thumbnail"
            : "create-file-object-thumbnail";

    return {
        command: CommandDescriptors.RENDER_THUMBNAIL.id,
        status: "contract",
        executable: false,
        adapter: null,
        target: {
            kind: targetKind,
            fileId,
            pageId: targetKind === RenderThumbnailTargets.FRAME ? pageId : null,
            objectId: targetKind === RenderThumbnailTargets.FRAME ? objectId : null,
            tag,
            revn,
        },
        artifact: {
            kind: "thumbnail",
            format,
            mimeType: "image/png",
            extension: ".png",
            width,
            height,
            aspectRatio: "3:2",
            output,
        },
        cache: {
            policy: cachePolicy,
            scope: cacheScope,
            key: cacheKey,
            invalidatesOn:
                targetKind === RenderThumbnailTargets.FILE
                    ? "file revn change"
                    : "tagged object thumbnail refresh or object deletion",
        },
        renderer: {
            primary: "render-wasm-worker",
            fallback: "frontend-rasterizer",
            width,
            height,
            dataSource: "get-file-data-for-thumbnail",
            output: "png-blob",
        },
        backendRpc: {
            data: {
                command: "get-file-data-for-thumbnail",
                method: "GET",
                request: {
                    "file-id": fileId,
                    "strip-frames-with-thumbnails": false,
                },
            },
            persist:
                targetKind === RenderThumbnailTargets.FILE
                    ? {
                          command: persistCommand,
                          method: "POST",
                          request: {
                              "file-id": fileId,
                              revn: revn ?? "<from get-file-data-for-thumbnail>",
                              media: "<rendered png blob>",
                          },
                      }
                    : {
                          command: persistCommand,
                          method: "POST",
                          request: {
                              "file-id": fileId,
                              "object-id": objectKey,
                              tag,
                              media: "<rendered png blob>",
                          },
                      },
        },
        requires,
        nextActions: [
            "Keep render.thumbnail unregistered until an MCP/CLI renderer owns the worker/rasterizer execution boundary.",
            "Use get-file-data-for-thumbnail to load the thumbnail source data before rendering.",
            "Persist file thumbnails with create-file-thumbnail and tagged frame thumbnails with create-file-object-thumbnail.",
        ],
        diagnostics: {
            adapterBoundary: "descriptor-only",
            mcpToolRegistered: false,
            cliCommandRegistered: false,
            exporterBoundary: "render.thumbnail uses dashboard thumbnail data/rendering semantics, not exporter export-shapes.",
            thumbnailDataCommand: "get-file-data-for-thumbnail",
            thumbnailPersistCommand: persistCommand,
            objectThumbnailIdFormat: "fileId/pageId/objectId/tag",
            frameTargetDataProviderPending: targetKind === RenderThumbnailTargets.FRAME,
        },
    };
}

export function createRenderThumbnailRendererServicePlan(options = EMPTY_OBJECT) {
    const contract = createRenderThumbnailContract(options);
    const endpoint = normalizeOptionalString(options.endpoint ?? options.rendererServiceUri ?? options.rendererUri);
    const publicUri = normalizeOptionalString(options.publicUri) ?? "https://penpot.example.test";
    const probeTimeoutMs = normalizeProbeTimeoutMs(
        options.probeTimeoutMs ?? options.timeoutMs ?? options.rendererServiceTimeoutMs,
        2500
    );
    const healthEndpoint = endpoint ? joinUrlPath(endpoint, "health") : null;
    const client = {
        endpoint,
        configured: Boolean(endpoint),
        healthEndpoint,
        healthMethod: "GET",
        probeTimeoutMs,
        networkProbe: false,
        requestContentType: "application/json",
        responseContentType: "application/json",
        auth: "caller-session-forwarded-when-execution-exists",
    };
    const availability = {
        status: endpoint ? "configured-unverified" : "not-configured",
        probe: "metadata-only",
        networkProbe: false,
        checked: false,
        endpoint,
        healthEndpoint,
        reason: endpoint
            ? "renderer-service endpoint is configured but was not contacted during dry-run planning"
            : "renderer-service endpoint is not configured for this MCP/CLI entry",
        nextActions: endpoint
            ? [
                  "Implement the renderer-service health endpoint before enabling execution.",
                  "Keep dry-run planning from contacting the renderer-service.",
              ]
            : [
                  "Configure rendererServiceUri, rendererUri, or endpoint before enabling execution.",
                  "Keep dry-run planning from contacting the renderer-service.",
              ],
    };
    const targetKind = contract.target.kind;
    const frameTarget = targetKind === RenderThumbnailTargets.FRAME;
    const objectKey =
        frameTarget && contract.target.fileId && contract.target.pageId && contract.target.objectId
            ? `${contract.target.fileId}/${contract.target.pageId}/${contract.target.objectId}/${contract.target.tag}`
            : null;
    const cacheProbe =
        contract.cache.policy === RenderThumbnailCachePolicies.REUSE
            ? frameTarget
                ? "file-object-thumbnail-by-object-key"
                : "file-thumbnail-by-file-id-and-revn"
            : null;
    const dataRequest = frameTarget
        ? {
              command: "get-file-frame-data-for-thumbnail",
              status: "required-future-capability",
              request: {
                  "file-id": contract.target.fileId,
                  "page-id": contract.target.pageId,
                  "object-id": contract.target.objectId,
              },
          }
        : {
              command: contract.backendRpc.data.command,
              request: contract.backendRpc.data.request,
          };
    const requiredCapabilities = [
        "thumbnail-renderer-service-implementation",
        contract.cache.policy === RenderThumbnailCachePolicies.REUSE
            ? frameTarget
                ? "tagged-frame-cache-probe"
                : "file-thumbnail-cache-probe"
            : null,
        frameTarget ? "frame-source-data-provider" : null,
        frameTarget ? "tagged-frame-resource-normalizer" : null,
    ].filter(Boolean);
    const executionGate = createRenderThumbnailRendererServiceExecutionGate({
        endpoint,
        targetKind,
        cachePolicy: contract.cache.policy,
        requiredCapabilities,
        executionGate: options.executionGate,
    });
    const clientRequest = createRenderThumbnailRendererServiceClientRequest(
        {
            endpoint,
            client,
            serviceRequest: {
                command: CommandDescriptors.RENDER_THUMBNAIL.id,
                operation: "thumbnail.render",
                adapter: "renderer-service",
                target: {
                    kind: targetKind,
                    fileId: contract.target.fileId,
                    pageId: contract.target.pageId,
                    objectId: contract.target.objectId,
                    tag: contract.target.tag,
                    objectKey,
                    revn: contract.target.revn,
                },
                artifact: {
                    format: contract.artifact.format,
                    mimeType: contract.artifact.mimeType,
                    width: contract.artifact.width,
                    height: contract.artifact.height,
                    extension: contract.artifact.extension,
                },
                cache: {
                    policy: contract.cache.policy,
                    scope: contract.cache.scope,
                    key: contract.cache.key,
                    ...(cacheProbe ? { probe: cacheProbe } : {}),
                },
                backendRpc: {
                    data: dataRequest,
                    persist:
                        contract.cache.policy === RenderThumbnailCachePolicies.REFRESH
                            ? contract.backendRpc.persist
                            : null,
                    cacheMissPersist:
                        contract.cache.policy === RenderThumbnailCachePolicies.REUSE
                            ? contract.backendRpc.persist
                            : null,
                },
                render: {
                    required:
                        contract.cache.policy === RenderThumbnailCachePolicies.REFRESH
                            ? true
                            : "on-cache-miss",
                    runtime: contract.renderer.primary,
                    fallback: contract.renderer.fallback,
                },
            },
        },
        options.clientRequest
    );

    return {
        command: CommandDescriptors.RENDER_THUMBNAIL.id,
        status: "planned",
        executable: false,
        runtimeAvailable: false,
        adapter: "renderer-service",
        endpoint,
        contract,
        target: {
            ...contract.target,
            objectKey,
        },
        artifact: contract.artifact,
        cache: {
            ...contract.cache,
            ...(cacheProbe ? { probe: cacheProbe } : {}),
        },
        service: {
            operation: "thumbnail.render",
            transport: "internal-http-or-worker-rpc",
            adapter: "renderer-service",
            endpoint,
            client,
            availability,
            localFileWrites: false,
            resourceNormalization: {
                mediaUriTemplate: "/assets/by-id/{mediaId}",
                downloadUriResolver: "entry-adapter backendUri/publicUri + resourceUri",
                exampleDownloadUri: `${publicUri.replace(/\/+$/, "")}/assets/by-id/{mediaId}`,
            },
            responseNormalization: {
                successStatus: "ok",
                resourceFields: ["resource.resourceUri", "resource.uri", "resource.resource-uri", "resource.mediaId"],
                downloadUriResolver: "entry-adapter publicUri/backendUri + resourceUri",
                localFileWrites: false,
            },
            errorShape: {
                code: "renderer_service_error",
                retryable: "derived-from-status",
                includeServiceStatus: true,
                includeServiceData: true,
            },
            executionGate,
            clientRequest,
        },
        client,
        availability,
        executionGate,
        clientRequest,
        serviceRequest: {
            command: CommandDescriptors.RENDER_THUMBNAIL.id,
            operation: "thumbnail.render",
            adapter: "renderer-service",
            target: {
                kind: targetKind,
                fileId: contract.target.fileId,
                pageId: contract.target.pageId,
                objectId: contract.target.objectId,
                tag: contract.target.tag,
                objectKey,
                revn: contract.target.revn,
            },
            artifact: {
                format: contract.artifact.format,
                mimeType: contract.artifact.mimeType,
                width: contract.artifact.width,
                height: contract.artifact.height,
                extension: contract.artifact.extension,
            },
            cache: {
                policy: contract.cache.policy,
                scope: contract.cache.scope,
                key: contract.cache.key,
                ...(cacheProbe ? { probe: cacheProbe } : {}),
            },
            backendRpc: {
                data: dataRequest,
                persist:
                    contract.cache.policy === RenderThumbnailCachePolicies.REFRESH
                        ? contract.backendRpc.persist
                        : null,
                cacheMissPersist:
                    contract.cache.policy === RenderThumbnailCachePolicies.REUSE
                        ? contract.backendRpc.persist
                        : null,
            },
            render: {
                required:
                    contract.cache.policy === RenderThumbnailCachePolicies.REFRESH
                        ? true
                        : "on-cache-miss",
                runtime: contract.renderer.primary,
                fallback: contract.renderer.fallback,
            },
        },
        requires: contract.requires,
        requiredCapabilities,
        nextActions: [
            "Use --dry-run or equivalent planning mode to inspect this renderer-service request without rendering.",
            "Implement and configure the thumbnail renderer service before executing the plan.",
            "Keep MCP resource returns metadata-only; only CLI --output may write downloaded PNG bytes after execution exists.",
        ],
        diagnostics: {
            adapterBoundary: "renderer-service-dry-run",
            descriptorAdapters: CommandDescriptors.RENDER_THUMBNAIL.adapters,
            cliCommandRegistered: true,
            mcpToolRegistered: false,
            runtimeExecutionRegistered: false,
            serviceOperation: "thumbnail.render",
            availabilityProbe: "metadata-only",
            clientRequestDispatch: false,
            executionGateStatus: executionGate.status,
        },
    };
}

export function createRenderThumbnailRendererServiceExecutionGate(options = EMPTY_OBJECT) {
    const gateOptions = options.executionGate ?? EMPTY_OBJECT;
    const endpoint = normalizeOptionalString(options.endpoint);
    const targetKind = normalizeOptionalString(options.targetKind) ?? RenderThumbnailTargets.FILE;
    const cachePolicy = normalizeOptionalString(options.cachePolicy) ?? RenderThumbnailCachePolicies.REUSE;
    const optInValue = normalizeOptionalString(gateOptions.optInValue ?? gateOptions.value);
    const serviceImplemented = Boolean(gateOptions.serviceImplemented);
    const integrationTestsReady = Boolean(gateOptions.integrationTestsReady);
    const endpointConfigured = Boolean(endpoint);
    const explicitOptInConfigured = optInValue === "renderer-service";
    const requiredCapabilities = Array.isArray(options.requiredCapabilities)
        ? options.requiredCapabilities.map((item) => normalizeOptionalString(item)).filter(Boolean)
        : [];
    const requiredCapabilityChecks = requiredCapabilities.map((name) => {
        const satisfied = name === "thumbnail-renderer-service-implementation" ? serviceImplemented : false;
        return {
            name,
            satisfied,
            reason: satisfied
                ? "capability readiness was provided by execution gate configuration"
                : "future capability is documented but no executable implementation is registered",
        };
    });
    const missing = Array.from(new Set([
        explicitOptInConfigured ? null : "explicit-opt-in",
        endpointConfigured ? null : "renderer-service-endpoint",
        serviceImplemented ? null : "thumbnail-renderer-service-implementation",
        integrationTestsReady ? null : "renderer-service-integration-tests",
        ...requiredCapabilityChecks.map((check) => (check.satisfied ? null : check.name)),
        "runtime-execution-registration",
    ].filter(Boolean)));

    return {
        status: "closed",
        dispatch: false,
        reason: "renderer-service execution is gated until explicit opt-in, service implementation, integration tests, and runtime registration all exist",
        optIn: {
            required: true,
            env: "PENPOT_RENDER_THUMBNAIL_EXECUTION",
            expectedValue: "renderer-service",
            configuredValue: optInValue,
            configured: explicitOptInConfigured,
        },
        requiredConfig: [
            {
                name: "rendererServiceUri",
                env: "PENPOT_RENDERER_SERVICE_URI",
                configured: endpointConfigured,
                valueIncluded: endpointConfigured,
            },
            {
                name: "rendererServiceTimeoutMs",
                env: "PENPOT_RENDERER_SERVICE_TIMEOUT_MS",
                configured: true,
                defaultValue: 2500,
            },
        ],
        readiness: {
            serviceImplemented,
            integrationTestsReady,
            runtimeExecutionRegistered: false,
            endpointConfigured,
            explicitOptInConfigured,
            requiredCapabilities: requiredCapabilityChecks,
        },
        blockers: missing,
        failureModes: [
            {
                code: "renderer_service_execution_disabled",
                when: "explicit opt-in is absent or not equal to renderer-service",
            },
            {
                code: "renderer_service_not_configured",
                when: "renderer-service endpoint is missing",
            },
            {
                code: "renderer_service_integration_tests_missing",
                when: "the renderer-service integration fixture suite is not present or not passing",
            },
            {
                code: "renderer_service_capability_missing",
                when: "target/cache-specific renderer capabilities are not implemented",
            },
        ],
        integrationTestPlan: {
            status: "required-before-dispatch",
            runner: "future renderer-service integration suite",
            requiredBeforeDispatch: true,
            cases: [
                "file refresh renders PNG, persists via create-file-thumbnail, and returns resource metadata",
                "file reuse proves cache freshness before skipping render",
                targetKind === RenderThumbnailTargets.FRAME
                    ? "tagged frame refresh loads frame source data and normalizes create-file-object-thumbnail media resource"
                    : null,
                cachePolicy === RenderThumbnailCachePolicies.REUSE
                    ? "cache miss falls back to render and persists through the target-specific backend RPC"
                    : null,
                "MCP returns resource metadata without server-local file writes",
                "CLI --output downloads only after a normalized resource result exists",
                "service errors normalize retryability and never include forwarded token values",
            ].filter(Boolean),
            requiredAssertions: [
                "clientRequest.dispatch remains false until this gate is opened by a future implementation task",
                "caller auth is forwarded by header name only in planning responses",
                "missing endpoint, missing opt-in, and missing integration tests fail before network dispatch",
            ],
        },
    };
}

export function createRenderThumbnailRendererServiceClientRequest(plan, options = EMPTY_OBJECT) {
    const endpoint = normalizeOptionalString(plan?.endpoint ?? plan?.client?.endpoint);
    const serviceRequest = plan?.serviceRequest ?? null;
    const entrypoint = normalizeOptionalString(options.entrypoint) ?? "unknown";
    const headers = compactRecord({
        accept: "application/json",
        "content-type": "application/json",
        "x-penpot-command": CommandDescriptors.RENDER_THUMBNAIL.id,
        "x-penpot-renderer-operation": "thumbnail.render",
        "x-penpot-renderer-adapter": "renderer-service",
        "x-penpot-entrypoint": entrypoint,
        "x-penpot-mcp-tool": normalizeOptionalString(options.mcpToolName),
        "x-penpot-mcp-session": normalizeOptionalString(options.mcpSessionId),
        "x-penpot-cli-command": normalizeOptionalString(options.cliCommand),
    });

    return {
        status: "scaffolded",
        dispatch: false,
        reason: "renderer-service execution client is scaffolded but disabled until the runtime implementation and integration tests exist",
        method: "POST",
        endpoint,
        timeoutMs: plan?.client?.probeTimeoutMs ?? 2500,
        headers,
        body: serviceRequest,
        audit: {
            entrypoint,
            mcpToolName: normalizeOptionalString(options.mcpToolName),
            mcpSessionId: normalizeOptionalString(options.mcpSessionId),
            cliCommand: normalizeOptionalString(options.cliCommand),
            adapter: "renderer-service",
        },
        authForwarding: {
            mode: "caller-session",
            headerNames: ["authorization", "cookie"],
            tokenValuesIncluded: false,
        },
    };
}

export function createRenderThumbnailRendererServiceResult(plan, response = EMPTY_OBJECT, options = EMPTY_OBJECT) {
    const responseRecord = asRecord(response);
    const resourceRecord = asRecord(responseRecord.resource);
    const cacheRecord = asRecord(responseRecord.cache);
    const rendererRecord = asRecord(responseRecord.renderer);
    const publicUri =
        normalizeOptionalString(options.publicUri) ??
        normalizeOptionalString(options.backendUri) ??
        normalizeOptionalString(plan?.publicUri) ??
        "https://penpot.example.test";
    const mediaId =
        normalizeOptionalString(resourceRecord.mediaId ?? resourceRecord["media-id"] ?? resourceRecord.id) ??
        mediaIdFromResourceUri(resourceRecord.resourceUri ?? resourceRecord.uri ?? resourceRecord["resource-uri"]);
    const resourceUri =
        normalizeOptionalString(resourceRecord.resourceUri ?? resourceRecord.uri ?? resourceRecord["resource-uri"]) ??
        (mediaId ? `/assets/by-id/${mediaId}` : null);
    if (!resourceUri) {
        throw new TypeError("render.thumbnail renderer-service response requires resourceUri, uri, resource-uri, or mediaId.");
    }
    const downloadUri =
        normalizeOptionalString(resourceRecord.downloadUri ?? resourceRecord["download-uri"]) ??
        resolveDownloadUri(resourceUri, publicUri);
    const contentType =
        normalizeOptionalString(resourceRecord.contentType ?? resourceRecord["content-type"] ?? resourceRecord.mtype) ??
        plan?.artifact?.mimeType ??
        "image/png";
    const cacheOutcome =
        normalizeOptionalString(cacheRecord.outcome) ??
        (plan?.cache?.policy === RenderThumbnailCachePolicies.REUSE ? "hit-or-rendered" : "refreshed");

    return {
        command: CommandDescriptors.RENDER_THUMBNAIL.id,
        status: "ok",
        adapter: "renderer-service",
        operation: "thumbnail.render",
        target: plan?.target ?? null,
        artifact: plan?.artifact ?? null,
        cache: {
            outcome: cacheOutcome,
            policy: plan?.cache?.policy ?? null,
            scope: normalizeOptionalString(cacheRecord.scope) ?? plan?.cache?.scope ?? null,
            key: normalizeOptionalString(cacheRecord.key) ?? plan?.cache?.key ?? null,
        },
        resource: {
            mediaId,
            resourceUri,
            downloadUri,
            contentType,
        },
        renderer: {
            runtime: normalizeOptionalString(rendererRecord.runtime) ?? plan?.serviceRequest?.render?.runtime ?? null,
            fallbackUsed: Boolean(rendererRecord.fallbackUsed ?? rendererRecord["fallback-used"] ?? false),
        },
        serviceResponse: {
            normalized: true,
            localFileWrites: false,
        },
    };
}

export function createRenderThumbnailRendererServiceErrorPayload(plan, cause = EMPTY_OBJECT) {
    const errorRecord = asRecord(cause);
    const dataRecord = asRecord(errorRecord.data);
    const status = typeof errorRecord.status === "number" ? errorRecord.status : null;
    const code =
        normalizeOptionalString(errorRecord.code) ??
        normalizeOptionalString(dataRecord.code) ??
        "renderer_service_error";
    const message =
        normalizeOptionalString(errorRecord.message) ??
        normalizeOptionalString(dataRecord.message) ??
        "thumbnail renderer service request failed.";

    return createCommandErrorPayload(code, message, {
        actions: [
            "Inspect renderer-service health and logs before retrying.",
            "Keep MCP resource returns metadata-only; CLI --output may download only after execution succeeds.",
        ],
        data: {
            command: CommandDescriptors.RENDER_THUMBNAIL.id,
            adapter: "renderer-service",
            operation: "thumbnail.render",
            endpoint: plan?.endpoint ?? null,
            status,
            retryable: status === null || status === 0 || status === 408 || status === 429 || status >= 500,
            serviceData: Object.keys(dataRecord).length > 0 ? dataRecord : null,
        },
    });
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

function normalizeOptionalString(value) {
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function normalizeOptionalInteger(value) {
    if (value === undefined || value === null || value === "") {
        return null;
    }
    const number = Number(value);
    if (!Number.isInteger(number) || number < 0) {
        throw new TypeError(`Expected a non-negative integer, got: ${value}.`);
    }
    return number;
}

function normalizePositiveInteger(value, fallback, label) {
    if (value === undefined || value === null || value === "") {
        return fallback;
    }
    const number = Number(value);
    if (!Number.isInteger(number) || number <= 0 || number > 4096) {
        throw new TypeError(`${label} must be an integer between 1 and 4096.`);
    }
    return number;
}

function normalizeProbeTimeoutMs(value, fallback) {
    if (value === undefined || value === null || value === "") {
        return fallback;
    }
    const number = Number(value);
    if (!Number.isInteger(number) || number <= 0 || number > 60000) {
        throw new TypeError("render.thumbnail renderer-service probeTimeoutMs must be an integer between 1 and 60000.");
    }
    return number;
}

function joinUrlPath(uri, path) {
    return `${uri.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

function asRecord(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value) ? value : EMPTY_OBJECT;
}

function mediaIdFromResourceUri(value) {
    const uri = normalizeOptionalString(value);
    if (!uri) {
        return null;
    }
    const match = uri.match(/\/assets\/by-id\/([^/?#]+)/);
    return match ? decodeURIComponent(match[1]) : null;
}

function resolveDownloadUri(resourceUri, publicUri) {
    if (/^https?:\/\//.test(resourceUri)) {
        return resourceUri;
    }
    return `${publicUri.replace(/\/+$/, "")}/${resourceUri.replace(/^\/+/, "")}`;
}

function normalizeExportFileFormat(value) {
    const format = normalizeOptionalString(value) ?? ExportFileFormats.PENPOT;
    if (format !== ExportFileFormats.PENPOT) {
        throw new TypeError(`Unsupported export.file format: ${format}.`);
    }
    return format;
}

function normalizeExportFileLibraryMode(options) {
    const explicitMode = normalizeOptionalString(options.libraryMode ?? options.type);
    if (explicitMode) {
        if (!Object.values(ExportFileLibraryModes).includes(explicitMode)) {
            throw new TypeError(`Unsupported export.file libraryMode: ${explicitMode}.`);
        }
        return explicitMode;
    }

    if (options.includeLibraries === true && options.embedAssets === true) {
        throw new TypeError("export.file cannot set includeLibraries and embedAssets to true at the same time.");
    }

    if (options.embedAssets === true) {
        return ExportFileLibraryModes.MERGE;
    }

    if (options.includeLibraries === false) {
        return ExportFileLibraryModes.DETACH;
    }

    return ExportFileLibraryModes.ALL;
}

function normalizeRenderThumbnailFormat(value) {
    const format = normalizeOptionalString(value) ?? RenderThumbnailFormats.PNG;
    if (format !== RenderThumbnailFormats.PNG) {
        throw new TypeError(`Unsupported render.thumbnail format: ${format}.`);
    }
    return format;
}

function normalizeRenderThumbnailTarget(options, pageId, objectId) {
    const explicitTarget = normalizeOptionalString(options.targetKind ?? options.target ?? options.type);
    const inferredTarget = pageId || objectId ? RenderThumbnailTargets.FRAME : RenderThumbnailTargets.FILE;
    const target = explicitTarget ?? inferredTarget;
    if (target === "object" || target === "shape") {
        return RenderThumbnailTargets.FRAME;
    }
    if (!Object.values(RenderThumbnailTargets).includes(target)) {
        throw new TypeError(`Unsupported render.thumbnail target: ${target}.`);
    }
    return target;
}

function normalizeRenderThumbnailCachePolicy(value) {
    const policy = normalizeOptionalString(value) ?? RenderThumbnailCachePolicies.REUSE;
    if (!Object.values(RenderThumbnailCachePolicies).includes(policy)) {
        throw new TypeError(`Unsupported render.thumbnail cachePolicy: ${policy}.`);
    }
    return policy;
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
