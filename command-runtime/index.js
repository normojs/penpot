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
    const optInConfiguration = createRenderThumbnailRendererServiceOptInConfiguration(options.optInConfiguration);
    const executionGate = createRenderThumbnailRendererServiceExecutionGate({
        endpoint,
        targetKind,
        cachePolicy: contract.cache.policy,
        requiredCapabilities,
        executionGate: {
            ...(options.executionGate ?? EMPTY_OBJECT),
            optInValue: optInConfiguration.resolution.selectedValue ?? options.executionGate?.optInValue,
        },
    });
    const healthPreflight = createRenderThumbnailRendererServiceHealthPreflight({
        client,
        executionGate,
    });
    const executionClientHarness = createRenderThumbnailRendererServiceExecutionClientHarness({
        executionGate,
        healthPreflight,
    });
    const dispatchAdapterBoundary = createRenderThumbnailRendererServiceDispatchAdapterBoundary({
        client,
        executionGate,
        healthPreflight,
        executionClientHarness,
    });
    const unavailableErrorTaxonomy = createRenderThumbnailRendererServiceUnavailableErrorTaxonomy({
        client,
        availability,
        executionGate,
        healthPreflight,
        dispatchAdapterBoundary,
    });
    const integrationFixtureHarness = createRenderThumbnailRendererServiceIntegrationFixtureHarness({
        targetKind,
        cachePolicy: contract.cache.policy,
        client,
        executionGate,
        healthPreflight,
        dispatchAdapterBoundary,
        unavailableErrorTaxonomy,
    });
    const dispatchRegistrationPreflight = createRenderThumbnailRendererServiceDispatchRegistrationPreflight({
        client,
        availability,
        optInConfiguration,
        executionGate,
        healthPreflight,
        executionClientHarness,
        dispatchAdapterBoundary,
        unavailableErrorTaxonomy,
        integrationFixtureHarness,
        requiredCapabilities,
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
    const executableAdapterRegistrationScaffold =
        createRenderThumbnailRendererServiceExecutableAdapterRegistrationScaffold({
            dispatchRegistrationPreflight,
            dispatchAdapterBoundary,
            clientRequest,
        });
    const adapterRegistryManifest = createRenderThumbnailRendererServiceAdapterRegistryManifest({
        executableAdapterRegistrationScaffold,
        dispatchRegistrationPreflight,
        dispatchAdapterBoundary,
    });
    const enablementChecklist = createRenderThumbnailRendererServiceEnablementChecklist({
        optInConfiguration,
        executionGate,
        healthPreflight,
        executionClientHarness,
        dispatchAdapterBoundary,
        unavailableErrorTaxonomy,
        integrationFixtureHarness,
        dispatchRegistrationPreflight,
        executableAdapterRegistrationScaffold,
        adapterRegistryManifest,
        requiredCapabilities,
    });
    const implementationSliceAudit = createRenderThumbnailRendererServiceImplementationSliceAudit({
        enablementChecklist,
        adapterRegistryManifest,
        executableAdapterRegistrationScaffold,
        dispatchRegistrationPreflight,
        requiredCapabilities,
    });
    const healthNoopContractFixtures = createRenderThumbnailRendererServiceHealthNoopContractFixtures({
        client,
        implementationSliceAudit,
        healthPreflight,
        clientRequest,
    });
    const noopServiceHostScaffold = createRenderThumbnailRendererServiceNoopServiceHostScaffold({
        client,
        healthNoopContractFixtures,
        implementationSliceAudit,
    });
    const hostLifecycleTestFixtures = createRenderThumbnailRendererServiceHostLifecycleTestFixtures({
        noopServiceHostScaffold,
        healthNoopContractFixtures,
    });
    const packageManifestScaffold = createRenderThumbnailRendererServicePackageManifestScaffold({
        noopServiceHostScaffold,
        hostLifecycleTestFixtures,
    });
    const packageCreationGuardrails = createRenderThumbnailRendererServicePackageCreationGuardrails({
        packageManifestScaffold,
        hostLifecycleTestFixtures,
    });
    const packageFileTemplates = createRenderThumbnailRendererServicePackageFileTemplates({
        packageManifestScaffold,
        packageCreationGuardrails,
    });
    const packageWorkspaceWiring = createRenderThumbnailRendererServicePackageWorkspaceWiring({
        packageManifestScaffold,
        packageCreationGuardrails,
        packageFileTemplates,
    });
    const packageBuildVerification = createRenderThumbnailRendererServicePackageBuildVerification({
        packageWorkspaceWiring,
        packageFileTemplates,
    });
    const packageMaterializationChecklist = createRenderThumbnailRendererServicePackageMaterializationChecklist({
        packageFileTemplates,
        packageWorkspaceWiring,
        packageBuildVerification,
    });
    const packageCreationDryRunSummary = createRenderThumbnailRendererServicePackageCreationDryRunSummary({
        packageMaterializationChecklist,
        packageFileTemplates,
        packageWorkspaceWiring,
        packageBuildVerification,
    });
    const packageCreationFileManifest = createRenderThumbnailRendererServicePackageCreationFileManifest({
        packageCreationDryRunSummary,
        packageFileTemplates,
        packageWorkspaceWiring,
        packageBuildVerification,
    });
    const packageMaterializationApprovalGate = createRenderThumbnailRendererServicePackageMaterializationApprovalGate({
        packageMaterializationChecklist,
        packageCreationFileManifest,
        packageWorkspaceWiring,
        packageBuildVerification,
    });
    const packageMaterializationExecutionDryRun = createRenderThumbnailRendererServicePackageMaterializationExecutionDryRun({
        packageMaterializationApprovalGate,
        packageCreationFileManifest,
        packageWorkspaceWiring,
        packageBuildVerification,
    });
    const packageMaterializationWriteContract = createRenderThumbnailRendererServicePackageMaterializationWriteContract({
        packageMaterializationExecutionDryRun,
        packageMaterializationApprovalGate,
        packageCreationFileManifest,
        packageWorkspaceWiring,
    });
    const packageMaterializationRollbackContract = createRenderThumbnailRendererServicePackageMaterializationRollbackContract({
        packageMaterializationWriteContract,
        packageMaterializationExecutionDryRun,
        packageMaterializationApprovalGate,
    });
    const packageMaterializationVerificationManifest = createRenderThumbnailRendererServicePackageMaterializationVerificationManifest({
        packageMaterializationRollbackContract,
        packageMaterializationWriteContract,
        packageBuildVerification,
        packageCreationFileManifest,
    });
    const packageMaterializationFinalApprovalChecklist = createRenderThumbnailRendererServicePackageMaterializationFinalApprovalChecklist({
        packageMaterializationVerificationManifest,
        packageMaterializationRollbackContract,
        packageMaterializationWriteContract,
        packageMaterializationApprovalGate,
    });
    const packageMaterializationExplicitApprovalToken = createRenderThumbnailRendererServicePackageMaterializationExplicitApprovalToken({
        packageMaterializationFinalApprovalChecklist,
        packageMaterializationApprovalGate,
    });
    const packageMaterializationApprovalAuditTrail = createRenderThumbnailRendererServicePackageMaterializationApprovalAuditTrail({
        packageMaterializationExplicitApprovalToken,
        packageMaterializationFinalApprovalChecklist,
        packageMaterializationApprovalGate,
    });
    const packageMaterializationApprovalReplayGuard = createRenderThumbnailRendererServicePackageMaterializationApprovalReplayGuard({
        packageMaterializationApprovalAuditTrail,
        packageMaterializationExplicitApprovalToken,
        packageMaterializationFinalApprovalChecklist,
    });
    const packageMaterializationApprovalExpiryPolicy = createRenderThumbnailRendererServicePackageMaterializationApprovalExpiryPolicy({
        packageMaterializationApprovalReplayGuard,
        packageMaterializationExplicitApprovalToken,
        packageMaterializationApprovalAuditTrail,
    });
    const packageMaterializationApprovalRevocationPolicy = createRenderThumbnailRendererServicePackageMaterializationApprovalRevocationPolicy({
        packageMaterializationApprovalExpiryPolicy,
        packageMaterializationApprovalReplayGuard,
        packageMaterializationApprovalAuditTrail,
    });
    const packageMaterializationApprovalScopeBindingPolicy = createRenderThumbnailRendererServicePackageMaterializationApprovalScopeBindingPolicy({
        packageMaterializationApprovalRevocationPolicy,
        packageMaterializationApprovalExpiryPolicy,
        packageMaterializationFinalApprovalChecklist,
    });
    const packageMaterializationApprovalOperatorConfirmationPolicy = createRenderThumbnailRendererServicePackageMaterializationApprovalOperatorConfirmationPolicy({
        packageMaterializationApprovalScopeBindingPolicy,
        packageMaterializationApprovalRevocationPolicy,
        packageMaterializationFinalApprovalChecklist,
    });
    const packageMaterializationApprovalEmergencyStopPolicy = createRenderThumbnailRendererServicePackageMaterializationApprovalEmergencyStopPolicy({
        packageMaterializationApprovalOperatorConfirmationPolicy,
        packageMaterializationApprovalRevocationPolicy,
        packageMaterializationFinalApprovalChecklist,
    });
    const packageMaterializationApprovalReadinessVerdictPolicy = createRenderThumbnailRendererServicePackageMaterializationApprovalReadinessVerdictPolicy({
        packageMaterializationApprovalEmergencyStopPolicy,
        packageMaterializationApprovalOperatorConfirmationPolicy,
        packageMaterializationFinalApprovalChecklist,
    });
    const packageMaterializationApprovalExecutionHandoffPolicy = createRenderThumbnailRendererServicePackageMaterializationApprovalExecutionHandoffPolicy({
        packageMaterializationApprovalReadinessVerdictPolicy,
        packageMaterializationApprovalEmergencyStopPolicy,
        packageMaterializationFinalApprovalChecklist,
    });
    const packageMaterializationApprovalPostHandoffAuditPolicy = createRenderThumbnailRendererServicePackageMaterializationApprovalPostHandoffAuditPolicy({
        packageMaterializationApprovalExecutionHandoffPolicy,
        packageMaterializationApprovalReadinessVerdictPolicy,
        packageMaterializationFinalApprovalChecklist,
    });
    const packageMaterializationApprovalAuditRetentionPolicy = createRenderThumbnailRendererServicePackageMaterializationApprovalAuditRetentionPolicy({
        packageMaterializationApprovalPostHandoffAuditPolicy,
        packageMaterializationApprovalExecutionHandoffPolicy,
        packageMaterializationFinalApprovalChecklist,
    });
    const packageMaterializationApprovalAuditAccessPolicy = createRenderThumbnailRendererServicePackageMaterializationApprovalAuditAccessPolicy({
        packageMaterializationApprovalAuditRetentionPolicy,
        packageMaterializationApprovalPostHandoffAuditPolicy,
        packageMaterializationFinalApprovalChecklist,
    });
    const packageMaterializationApprovalAuditIntegrityPolicy = createRenderThumbnailRendererServicePackageMaterializationApprovalAuditIntegrityPolicy({
        packageMaterializationApprovalAuditAccessPolicy,
        packageMaterializationApprovalAuditRetentionPolicy,
        packageMaterializationFinalApprovalChecklist,
    });
    const packageMaterializationApprovalAuditProvenancePolicy = createRenderThumbnailRendererServicePackageMaterializationApprovalAuditProvenancePolicy({
        packageMaterializationApprovalAuditIntegrityPolicy,
        packageMaterializationApprovalAuditAccessPolicy,
        packageMaterializationFinalApprovalChecklist,
    });
    const packageMaterializationApprovalAuditCustodyPolicy = createRenderThumbnailRendererServicePackageMaterializationApprovalAuditCustodyPolicy({
        packageMaterializationApprovalAuditProvenancePolicy,
        packageMaterializationApprovalAuditAccessPolicy,
        packageMaterializationFinalApprovalChecklist,
    });
    const packageMaterializationApprovalAuditEvidencePolicy = createRenderThumbnailRendererServicePackageMaterializationApprovalAuditEvidencePolicy({
        packageMaterializationApprovalAuditCustodyPolicy,
        packageMaterializationApprovalAuditAccessPolicy,
        packageMaterializationFinalApprovalChecklist,
    });
    const packageMaterializationApprovalAuditAttestationPolicy = createRenderThumbnailRendererServicePackageMaterializationApprovalAuditAttestationPolicy({
        packageMaterializationApprovalAuditEvidencePolicy,
        packageMaterializationApprovalAuditAccessPolicy,
        packageMaterializationFinalApprovalChecklist,
    });
    const packageMaterializationApprovalAuditNotarizationPolicy = createRenderThumbnailRendererServicePackageMaterializationApprovalAuditNotarizationPolicy({
        packageMaterializationApprovalAuditAttestationPolicy,
        packageMaterializationApprovalAuditAccessPolicy,
        packageMaterializationFinalApprovalChecklist,
    });
    const packageMaterializationApprovalAuditCertificationPolicy = createRenderThumbnailRendererServicePackageMaterializationApprovalAuditCertificationPolicy({
        packageMaterializationApprovalAuditNotarizationPolicy,
        packageMaterializationApprovalAuditAccessPolicy,
        packageMaterializationFinalApprovalChecklist,
    });
    const packageMaterializationApprovalAuditEndorsementPolicy = createRenderThumbnailRendererServicePackageMaterializationApprovalAuditEndorsementPolicy({
        packageMaterializationApprovalAuditCertificationPolicy,
        packageMaterializationApprovalAuditAccessPolicy,
        packageMaterializationFinalApprovalChecklist,
    });
    const packageMaterializationApprovalAuditCountersignaturePolicy = createRenderThumbnailRendererServicePackageMaterializationApprovalAuditCountersignaturePolicy({
        packageMaterializationApprovalAuditEndorsementPolicy,
        packageMaterializationApprovalAuditAccessPolicy,
        packageMaterializationFinalApprovalChecklist,
    });
    const packageMaterializationApprovalAuditCountersignatureVerificationPolicy = createRenderThumbnailRendererServicePackageMaterializationApprovalAuditCountersignatureVerificationPolicy({
        packageMaterializationApprovalAuditCountersignaturePolicy,
        packageMaterializationApprovalAuditAccessPolicy,
        packageMaterializationFinalApprovalChecklist,
    });
    const packageMaterializationApprovalAuditCountersignatureRevocationPolicy = createRenderThumbnailRendererServicePackageMaterializationApprovalAuditCountersignatureRevocationPolicy({
        packageMaterializationApprovalAuditCountersignatureVerificationPolicy,
        packageMaterializationApprovalAuditAccessPolicy,
        packageMaterializationFinalApprovalChecklist,
    });
    const packageMaterializationApprovalAuditCountersignatureRevocationAppealPolicy = createRenderThumbnailRendererServicePackageMaterializationApprovalAuditCountersignatureRevocationAppealPolicy({
        packageMaterializationApprovalAuditCountersignatureRevocationPolicy,
        packageMaterializationApprovalAuditAccessPolicy,
        packageMaterializationFinalApprovalChecklist,
    });

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
            optInConfiguration,
            executionGate,
            healthPreflight,
            executionClientHarness,
            dispatchAdapterBoundary,
            unavailableErrorTaxonomy,
            integrationFixtureHarness,
            dispatchRegistrationPreflight,
            executableAdapterRegistrationScaffold,
            adapterRegistryManifest,
            enablementChecklist,
            implementationSliceAudit,
            healthNoopContractFixtures,
            noopServiceHostScaffold,
            hostLifecycleTestFixtures,
            packageManifestScaffold,
            packageCreationGuardrails,
            packageFileTemplates,
            packageWorkspaceWiring,
            packageBuildVerification,
            packageMaterializationChecklist,
            packageCreationDryRunSummary,
            packageCreationFileManifest,
            packageMaterializationApprovalGate,
            packageMaterializationExecutionDryRun,
            packageMaterializationWriteContract,
            packageMaterializationRollbackContract,
            packageMaterializationVerificationManifest,
            packageMaterializationFinalApprovalChecklist,
            packageMaterializationExplicitApprovalToken,
            packageMaterializationApprovalAuditTrail,
            packageMaterializationApprovalReplayGuard,
            packageMaterializationApprovalExpiryPolicy,
            packageMaterializationApprovalRevocationPolicy,
            packageMaterializationApprovalScopeBindingPolicy,
            packageMaterializationApprovalOperatorConfirmationPolicy,
            packageMaterializationApprovalEmergencyStopPolicy,
            packageMaterializationApprovalReadinessVerdictPolicy,
            packageMaterializationApprovalExecutionHandoffPolicy,
            packageMaterializationApprovalPostHandoffAuditPolicy,
            packageMaterializationApprovalAuditRetentionPolicy,
            packageMaterializationApprovalAuditAccessPolicy,
            packageMaterializationApprovalAuditIntegrityPolicy,
            packageMaterializationApprovalAuditProvenancePolicy,
            packageMaterializationApprovalAuditCustodyPolicy,
            packageMaterializationApprovalAuditEvidencePolicy,
            packageMaterializationApprovalAuditAttestationPolicy,
            packageMaterializationApprovalAuditNotarizationPolicy,
            packageMaterializationApprovalAuditCertificationPolicy,
            packageMaterializationApprovalAuditEndorsementPolicy,
            packageMaterializationApprovalAuditCountersignaturePolicy,
            packageMaterializationApprovalAuditCountersignatureVerificationPolicy,
            packageMaterializationApprovalAuditCountersignatureRevocationPolicy,
            packageMaterializationApprovalAuditCountersignatureRevocationAppealPolicy,
            clientRequest,
        },
        client,
        availability,
        optInConfiguration,
        executionGate,
        healthPreflight,
        executionClientHarness,
        dispatchAdapterBoundary,
        unavailableErrorTaxonomy,
        integrationFixtureHarness,
        dispatchRegistrationPreflight,
        executableAdapterRegistrationScaffold,
        adapterRegistryManifest,
        enablementChecklist,
        implementationSliceAudit,
        healthNoopContractFixtures,
        noopServiceHostScaffold,
        hostLifecycleTestFixtures,
        packageManifestScaffold,
        packageCreationGuardrails,
        packageFileTemplates,
        packageWorkspaceWiring,
        packageBuildVerification,
        packageMaterializationChecklist,
        packageCreationDryRunSummary,
        packageCreationFileManifest,
        packageMaterializationApprovalGate,
        packageMaterializationExecutionDryRun,
        packageMaterializationWriteContract,
        packageMaterializationRollbackContract,
        packageMaterializationVerificationManifest,
        packageMaterializationFinalApprovalChecklist,
        packageMaterializationExplicitApprovalToken,
        packageMaterializationApprovalAuditTrail,
        packageMaterializationApprovalReplayGuard,
        packageMaterializationApprovalExpiryPolicy,
        packageMaterializationApprovalRevocationPolicy,
        packageMaterializationApprovalScopeBindingPolicy,
        packageMaterializationApprovalOperatorConfirmationPolicy,
        packageMaterializationApprovalEmergencyStopPolicy,
        packageMaterializationApprovalReadinessVerdictPolicy,
        packageMaterializationApprovalExecutionHandoffPolicy,
        packageMaterializationApprovalPostHandoffAuditPolicy,
        packageMaterializationApprovalAuditRetentionPolicy,
        packageMaterializationApprovalAuditAccessPolicy,
        packageMaterializationApprovalAuditIntegrityPolicy,
        packageMaterializationApprovalAuditProvenancePolicy,
        packageMaterializationApprovalAuditCustodyPolicy,
        packageMaterializationApprovalAuditEvidencePolicy,
        packageMaterializationApprovalAuditAttestationPolicy,
        packageMaterializationApprovalAuditNotarizationPolicy,
        packageMaterializationApprovalAuditCertificationPolicy,
        packageMaterializationApprovalAuditEndorsementPolicy,
        packageMaterializationApprovalAuditCountersignaturePolicy,
        packageMaterializationApprovalAuditCountersignatureVerificationPolicy,
        packageMaterializationApprovalAuditCountersignatureRevocationPolicy,
        packageMaterializationApprovalAuditCountersignatureRevocationAppealPolicy,
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
            optInConfigurationStatus: optInConfiguration.status,
            clientRequestDispatch: false,
            executionGateStatus: executionGate.status,
            healthPreflightDispatch: false,
            executionClientHarnessDispatch: false,
            dispatchAdapterBoundaryStatus: dispatchAdapterBoundary.status,
            dispatchAdapterBoundaryDispatch: false,
            unavailableErrorTaxonomyVersion: unavailableErrorTaxonomy.taxonomyVersion,
            integrationFixtureHarnessVersion: integrationFixtureHarness.harnessVersion,
            dispatchRegistrationPreflightVersion: dispatchRegistrationPreflight.preflightVersion,
            executableAdapterRegistrationScaffoldVersion: executableAdapterRegistrationScaffold.scaffoldVersion,
            adapterRegistryManifestVersion: adapterRegistryManifest.manifestVersion,
            enablementChecklistVersion: enablementChecklist.checklistVersion,
            implementationSliceAuditVersion: implementationSliceAudit.auditVersion,
            healthNoopContractFixturesVersion: healthNoopContractFixtures.fixtureVersion,
            noopServiceHostScaffoldVersion: noopServiceHostScaffold.scaffoldVersion,
            hostLifecycleTestFixturesVersion: hostLifecycleTestFixtures.fixtureVersion,
            packageManifestScaffoldVersion: packageManifestScaffold.manifestVersion,
            packageCreationGuardrailsVersion: packageCreationGuardrails.guardrailVersion,
            packageFileTemplatesVersion: packageFileTemplates.templateVersion,
            packageWorkspaceWiringVersion: packageWorkspaceWiring.wiringVersion,
            packageBuildVerificationVersion: packageBuildVerification.verificationVersion,
            packageMaterializationChecklistVersion: packageMaterializationChecklist.checklistVersion,
            packageCreationDryRunSummaryVersion: packageCreationDryRunSummary.summaryVersion,
            packageCreationFileManifestVersion: packageCreationFileManifest.manifestVersion,
            packageMaterializationApprovalGateVersion: packageMaterializationApprovalGate.gateVersion,
            packageMaterializationExecutionDryRunVersion: packageMaterializationExecutionDryRun.dryRunVersion,
            packageMaterializationWriteContractVersion: packageMaterializationWriteContract.contractVersion,
            packageMaterializationRollbackContractVersion: packageMaterializationRollbackContract.contractVersion,
            packageMaterializationVerificationManifestVersion: packageMaterializationVerificationManifest.manifestVersion,
            packageMaterializationFinalApprovalChecklistVersion: packageMaterializationFinalApprovalChecklist.checklistVersion,
            packageMaterializationExplicitApprovalTokenVersion: packageMaterializationExplicitApprovalToken.tokenVersion,
            packageMaterializationApprovalAuditTrailVersion: packageMaterializationApprovalAuditTrail.auditTrailVersion,
            packageMaterializationApprovalReplayGuardVersion: packageMaterializationApprovalReplayGuard.replayGuardVersion,
            packageMaterializationApprovalExpiryPolicyVersion: packageMaterializationApprovalExpiryPolicy.expiryPolicyVersion,
            packageMaterializationApprovalRevocationPolicyVersion: packageMaterializationApprovalRevocationPolicy.revocationPolicyVersion,
            packageMaterializationApprovalScopeBindingPolicyVersion: packageMaterializationApprovalScopeBindingPolicy.scopeBindingVersion,
            packageMaterializationApprovalOperatorConfirmationPolicyVersion: packageMaterializationApprovalOperatorConfirmationPolicy.operatorConfirmationVersion,
            packageMaterializationApprovalEmergencyStopPolicyVersion: packageMaterializationApprovalEmergencyStopPolicy.emergencyStopVersion,
            packageMaterializationApprovalReadinessVerdictPolicyVersion: packageMaterializationApprovalReadinessVerdictPolicy.readinessVerdictVersion,
            packageMaterializationApprovalExecutionHandoffPolicyVersion: packageMaterializationApprovalExecutionHandoffPolicy.executionHandoffVersion,
            packageMaterializationApprovalPostHandoffAuditPolicyVersion: packageMaterializationApprovalPostHandoffAuditPolicy.postHandoffAuditVersion,
            packageMaterializationApprovalAuditRetentionPolicyVersion: packageMaterializationApprovalAuditRetentionPolicy.auditRetentionVersion,
            packageMaterializationApprovalAuditAccessPolicyVersion: packageMaterializationApprovalAuditAccessPolicy.auditAccessVersion,
            packageMaterializationApprovalAuditIntegrityPolicyVersion: packageMaterializationApprovalAuditIntegrityPolicy.auditIntegrityVersion,
            packageMaterializationApprovalAuditProvenancePolicyVersion: packageMaterializationApprovalAuditProvenancePolicy.auditProvenanceVersion,
            packageMaterializationApprovalAuditCustodyPolicyVersion: packageMaterializationApprovalAuditCustodyPolicy.auditCustodyVersion,
            packageMaterializationApprovalAuditEvidencePolicyVersion: packageMaterializationApprovalAuditEvidencePolicy.auditEvidenceVersion,
            packageMaterializationApprovalAuditAttestationPolicyVersion: packageMaterializationApprovalAuditAttestationPolicy.auditAttestationVersion,
            packageMaterializationApprovalAuditNotarizationPolicyVersion: packageMaterializationApprovalAuditNotarizationPolicy.auditNotarizationVersion,
            packageMaterializationApprovalAuditCertificationPolicyVersion: packageMaterializationApprovalAuditCertificationPolicy.auditCertificationVersion,
            packageMaterializationApprovalAuditEndorsementPolicyVersion: packageMaterializationApprovalAuditEndorsementPolicy.auditEndorsementVersion,
            packageMaterializationApprovalAuditCountersignaturePolicyVersion: packageMaterializationApprovalAuditCountersignaturePolicy.auditCountersignatureVersion,
            packageMaterializationApprovalAuditCountersignatureVerificationPolicyVersion: packageMaterializationApprovalAuditCountersignatureVerificationPolicy.auditCountersignatureVerificationVersion,
            packageMaterializationApprovalAuditCountersignatureRevocationPolicyVersion: packageMaterializationApprovalAuditCountersignatureRevocationPolicy.auditCountersignatureRevocationVersion,
            packageMaterializationApprovalAuditCountersignatureRevocationAppealPolicyVersion: packageMaterializationApprovalAuditCountersignatureRevocationAppealPolicy.auditCountersignatureRevocationAppealVersion,
        },
    };
}

export function createRenderThumbnailRendererServicePackageManifestScaffold(options = EMPTY_OBJECT) {
    const noopServiceHostScaffold = options.noopServiceHostScaffold ?? EMPTY_OBJECT;
    const hostLifecycleTestFixtures = options.hostLifecycleTestFixtures ?? EMPTY_OBJECT;

    return {
        status: "planned-disabled",
        manifestVersion: "P25.27",
        adapter: "renderer-service",
        command: CommandDescriptors.RENDER_THUMBNAIL.id,
        dispatch: false,
        networkDispatch: false,
        runtimeRegistration: false,
        localFileWrites: false,
        packageCreated: false,
        workspaceMutation: false,
        scriptRunnable: false,
        consumes: {
            noopServiceHostScaffold: {
                requiredStatus: "planned-disabled",
                currentStatus: noopServiceHostScaffold.status ?? "planned-disabled",
                scaffoldVersion: noopServiceHostScaffold.scaffoldVersion ?? "P25.25",
                hostStartup: false,
            },
            hostLifecycleTestFixtures: {
                requiredStatus: "planned-disabled",
                currentStatus: hostLifecycleTestFixtures.status ?? "planned-disabled",
                fixtureVersion: hostLifecycleTestFixtures.fixtureVersion ?? "P25.26",
                processSpawn: false,
            },
        },
        package: {
            name: "@penpot/renderer-service",
            directory: "renderer-service",
            private: true,
            type: "module",
            packageManager: "pnpm-workspace",
            packageCreated: false,
            workspaceRegistered: false,
        },
        scripts: {
            "start:noop": {
                command: "node dist/noop-host.js",
                runnable: false,
                startsProcess: false,
            },
            build: {
                command: "tsc -p tsconfig.json",
                runnable: false,
                emitsFiles: false,
            },
            test: {
                command: "node --test test/*.test.mjs",
                runnable: false,
                processSpawn: false,
            },
        },
        exports: {
            ".": {
                types: "./dist/index.d.ts",
                default: "./dist/index.js",
            },
            "./noop-host": {
                types: "./dist/noop-host.d.ts",
                default: "./dist/noop-host.js",
            },
        },
        dependencies: {
            runtime: [],
            dev: ["typescript", "@types/node"],
            addNow: false,
        },
        workspaceIntegration: {
            rootPackageJsonMutation: false,
            pnpmWorkspaceMutation: false,
            lockfileMutation: false,
            dockerComposeMutation: false,
        },
        plannedFiles: [
            "renderer-service/package.json",
            "renderer-service/tsconfig.json",
            "renderer-service/src/index.ts",
            "renderer-service/src/noop-host.ts",
            "renderer-service/test/noop-host.test.mjs",
        ],
        noOpGuarantees: [
            "do not create renderer-service package files",
            "do not edit pnpm workspace manifests",
            "do not mutate lockfiles",
            "do not add runnable scripts",
            "do not start renderer-service processes",
        ],
        requiredBeforeRuntimeDispatch: [
            "create package files in a dedicated implementation task",
            "add workspace manifest and lockfile updates with package tests",
            "prove noop host lifecycle tests before enabling process startup",
            "keep command-runtime dispatch disabled until package scripts are executable and gated",
        ],
    };
}

export function createRenderThumbnailRendererServicePackageCreationGuardrails(options = EMPTY_OBJECT) {
    const packageManifestScaffold = options.packageManifestScaffold ?? EMPTY_OBJECT;
    const hostLifecycleTestFixtures = options.hostLifecycleTestFixtures ?? EMPTY_OBJECT;

    return {
        status: "planned-disabled",
        guardrailVersion: "P25.28",
        adapter: "renderer-service",
        command: CommandDescriptors.RENDER_THUMBNAIL.id,
        dispatch: false,
        networkDispatch: false,
        runtimeRegistration: false,
        localFileWrites: false,
        hostStartup: false,
        processSpawn: false,
        packageCreated: false,
        workspaceMutation: false,
        scriptRunnable: false,
        consumes: {
            packageManifestScaffold: {
                requiredStatus: "planned-disabled",
                currentStatus: packageManifestScaffold.status ?? "planned-disabled",
                manifestVersion: packageManifestScaffold.manifestVersion ?? "P25.27",
                packageCreated: false,
                workspaceMutation: false,
                scriptRunnable: false,
            },
            hostLifecycleTestFixtures: {
                requiredStatus: "planned-disabled",
                currentStatus: hostLifecycleTestFixtures.status ?? "planned-disabled",
                fixtureVersion: hostLifecycleTestFixtures.fixtureVersion ?? "P25.26",
                processSpawn: false,
            },
        },
        creationReadiness: {
            status: "blocked",
            canCreatePackage: false,
            requiredChecks: [
                {
                    id: "dedicated-package-creation-task",
                    description: "create renderer-service files only in an explicit package creation task",
                    requiredBeforePackageCreation: true,
                    satisfied: false,
                },
                {
                    id: "workspace-manifest-review",
                    description: "review root package scripts and pnpm workspace changes before mutating manifests",
                    requiredBeforePackageCreation: true,
                    satisfied: false,
                },
                {
                    id: "lockfile-update-plan",
                    description: "plan pnpm lockfile changes together with package dependency additions",
                    requiredBeforePackageCreation: true,
                    satisfied: false,
                },
                {
                    id: "noop-host-lifecycle-tests-ready",
                    description: "prove no-op host lifecycle tests before any script can spawn a process",
                    requiredBeforePackageCreation: true,
                    satisfied: false,
                },
            ],
        },
        blockedMutations: {
            packageFiles: [
                "renderer-service/package.json",
                "renderer-service/tsconfig.json",
                "renderer-service/src/index.ts",
                "renderer-service/src/noop-host.ts",
                "renderer-service/test/noop-host.test.mjs",
            ],
            workspaceFiles: [
                "pnpm-workspace.yaml",
                "pnpm-lock.yaml",
                "package.json",
            ],
            runtimeFiles: [
                "command-runtime/index.js runtime adapter registration",
                "mcp/packages/server runtime dispatch registration",
                "penpot-cli runtime dispatch execution",
            ],
        },
        allowedInThisStep: [
            "metadata-only guardrail planning",
            "fixture and documentation updates",
            "dry-run and unavailable payload exposure",
            "tests that assert no package creation or workspace mutation",
        ],
        deniedInThisStep: [
            "create renderer-service directory",
            "edit pnpm workspace manifests",
            "mutate lockfiles",
            "add runnable package scripts",
            "spawn renderer-service processes",
            "probe renderer-service health endpoints",
            "register executable command-runtime dispatch",
        ],
        requiredBeforeRuntimeDispatch: [
            "complete package creation guardrail review in a committed planning task",
            "create renderer-service package files in a later explicit implementation task",
            "commit workspace manifest and lockfile changes with focused package tests",
            "prove no-op host lifecycle tests can run without leaking processes or ports",
            "keep render.thumbnail unavailable until renderer-service dispatch is explicitly registered",
        ],
    };
}

export function createRenderThumbnailRendererServicePackageFileTemplates(options = EMPTY_OBJECT) {
    const packageManifestScaffold = options.packageManifestScaffold ?? EMPTY_OBJECT;
    const packageCreationGuardrails = options.packageCreationGuardrails ?? EMPTY_OBJECT;

    return {
        status: "planned-disabled",
        templateVersion: "P25.29",
        adapter: "renderer-service",
        command: CommandDescriptors.RENDER_THUMBNAIL.id,
        dispatch: false,
        networkDispatch: false,
        runtimeRegistration: false,
        localFileWrites: false,
        hostStartup: false,
        processSpawn: false,
        packageCreated: false,
        workspaceMutation: false,
        scriptRunnable: false,
        fileMaterialization: false,
        consumes: {
            packageManifestScaffold: {
                requiredStatus: "planned-disabled",
                currentStatus: packageManifestScaffold.status ?? "planned-disabled",
                manifestVersion: packageManifestScaffold.manifestVersion ?? "P25.27",
                packageCreated: false,
            },
            packageCreationGuardrails: {
                requiredStatus: "planned-disabled",
                currentStatus: packageCreationGuardrails.status ?? "planned-disabled",
                guardrailVersion: packageCreationGuardrails.guardrailVersion ?? "P25.28",
                canCreatePackage: false,
                workspaceMutation: false,
            },
        },
        packageJson: {
            path: "renderer-service/package.json",
            materialized: false,
            writesFile: false,
            package: {
                name: "@penpot/renderer-service",
                private: true,
                type: "module",
                scripts: {
                    "start:noop": "node dist/noop-host.js",
                    build: "tsc -p tsconfig.json",
                    test: "node --test test/*.test.mjs",
                },
                exports: {
                    ".": {
                        types: "./dist/index.d.ts",
                        default: "./dist/index.js",
                    },
                    "./noop-host": {
                        types: "./dist/noop-host.d.ts",
                        default: "./dist/noop-host.js",
                    },
                },
                dependencies: {},
                devDependencies: {
                    typescript: "workspace-managed",
                    "@types/node": "workspace-managed",
                },
            },
        },
        tsconfig: {
            path: "renderer-service/tsconfig.json",
            materialized: false,
            writesFile: false,
            compilerOptions: {
                target: "ES2022",
                module: "NodeNext",
                moduleResolution: "NodeNext",
                declaration: true,
                outDir: "dist",
                rootDir: "src",
                strict: true,
            },
            include: ["src/**/*.ts"],
        },
        sourceFiles: [
            {
                path: "renderer-service/src/index.ts",
                kind: "module-entrypoint",
                materialized: false,
                writesFile: false,
                exports: ["createNoopRendererServiceHost", "createRendererServiceHealthResponse"],
                runtimeRegistration: false,
            },
            {
                path: "renderer-service/src/noop-host.ts",
                kind: "noop-host",
                materialized: false,
                writesFile: false,
                startsProcess: false,
                routes: ["GET /health", "POST /thumbnail"],
                rendersPng: false,
            },
        ],
        testFiles: [
            {
                path: "renderer-service/test/noop-host.test.mjs",
                kind: "node-test",
                materialized: false,
                writesFile: false,
                processSpawn: false,
                covers: ["health response shape", "noop thumbnail.render response shape"],
            },
        ],
        templateMatrix: [
            {
                id: "package-json-template",
                path: "renderer-service/package.json",
                materialized: false,
                writesFile: false,
                blocksWorkspaceMutation: true,
            },
            {
                id: "tsconfig-template",
                path: "renderer-service/tsconfig.json",
                materialized: false,
                writesFile: false,
                blocksBuildOutput: true,
            },
            {
                id: "noop-host-source-template",
                path: "renderer-service/src/noop-host.ts",
                materialized: false,
                writesFile: false,
                blocksProcessSpawn: true,
            },
            {
                id: "noop-host-test-template",
                path: "renderer-service/test/noop-host.test.mjs",
                materialized: false,
                writesFile: false,
                blocksProcessSpawn: true,
            },
        ],
        noOpGuarantees: [
            "do not create renderer-service template files",
            "do not emit TypeScript build output",
            "do not add package scripts to root package.json",
            "do not mutate pnpm workspace or lockfile state",
            "do not run package template tests",
        ],
        requiredBeforeRuntimeDispatch: [
            "materialize package file templates in a dedicated implementation task",
            "commit workspace and lockfile changes with package template tests",
            "prove no-op host templates build before registering process startup",
            "keep render.thumbnail execution unavailable until template files become real package files",
        ],
    };
}

export function createRenderThumbnailRendererServicePackageWorkspaceWiring(options = EMPTY_OBJECT) {
    const packageManifestScaffold = options.packageManifestScaffold ?? EMPTY_OBJECT;
    const packageCreationGuardrails = options.packageCreationGuardrails ?? EMPTY_OBJECT;
    const packageFileTemplates = options.packageFileTemplates ?? EMPTY_OBJECT;

    return {
        status: "planned-disabled",
        wiringVersion: "P25.30",
        adapter: "renderer-service",
        command: CommandDescriptors.RENDER_THUMBNAIL.id,
        dispatch: false,
        networkDispatch: false,
        runtimeRegistration: false,
        localFileWrites: false,
        hostStartup: false,
        processSpawn: false,
        packageCreated: false,
        workspaceMutation: false,
        scriptRunnable: false,
        fileMaterialization: false,
        lockfileMutation: false,
        rootPackageJsonMutation: false,
        pnpmWorkspaceMutation: false,
        consumes: {
            packageManifestScaffold: {
                requiredStatus: "planned-disabled",
                currentStatus: packageManifestScaffold.status ?? "planned-disabled",
                manifestVersion: packageManifestScaffold.manifestVersion ?? "P25.27",
                workspaceRegistered: false,
            },
            packageCreationGuardrails: {
                requiredStatus: "planned-disabled",
                currentStatus: packageCreationGuardrails.status ?? "planned-disabled",
                guardrailVersion: packageCreationGuardrails.guardrailVersion ?? "P25.28",
                workspaceMutation: false,
            },
            packageFileTemplates: {
                requiredStatus: "planned-disabled",
                currentStatus: packageFileTemplates.status ?? "planned-disabled",
                templateVersion: packageFileTemplates.templateVersion ?? "P25.29",
                fileMaterialization: false,
            },
        },
        workspaceEntries: [
            {
                file: "pnpm-workspace.yaml",
                plannedEntry: "renderer-service",
                presentNow: false,
                mutateNow: false,
            },
        ],
        rootPackageScripts: [
            {
                file: "package.json",
                script: "renderer-service:start:noop",
                command: "pnpm --filter @penpot/renderer-service start:noop",
                runnable: false,
                mutateNow: false,
            },
            {
                file: "package.json",
                script: "renderer-service:test",
                command: "pnpm --filter @penpot/renderer-service test",
                runnable: false,
                mutateNow: false,
            },
        ],
        lockfilePlan: {
            file: "pnpm-lock.yaml",
            requiredWhenPackageMaterializes: true,
            mutateNow: false,
            dependencyAdditions: ["typescript", "@types/node"],
        },
        workspaceDependencyPlan: {
            packageManager: "pnpm",
            packageName: "@penpot/renderer-service",
            workspaceFilter: "@penpot/renderer-service",
            workspaceRegistered: false,
            packageFilesMaterialized: false,
        },
        nonTargets: [
            {
                file: "docker-compose.yaml",
                reason: "no container wiring until no-op host package exists",
                mutateNow: false,
            },
            {
                file: "command-runtime/index.js",
                reason: "no executable adapter registration until workspace package is real and tested",
                mutateNow: false,
            },
        ],
        noOpGuarantees: [
            "do not edit pnpm-workspace.yaml",
            "do not edit root package.json scripts",
            "do not mutate pnpm-lock.yaml",
            "do not create renderer-service package files",
            "do not run pnpm install or package scripts",
        ],
        requiredBeforeRuntimeDispatch: [
            "materialize renderer-service package files in a dedicated implementation task",
            "add pnpm workspace entry and lockfile changes in the same package wiring task",
            "prove workspace filtered build and test commands before making scripts runnable",
            "keep render.thumbnail runtime registration disabled until workspace wiring is committed and verified",
        ],
    };
}

export function createRenderThumbnailRendererServicePackageBuildVerification(options = EMPTY_OBJECT) {
    const packageWorkspaceWiring = options.packageWorkspaceWiring ?? EMPTY_OBJECT;
    const packageFileTemplates = options.packageFileTemplates ?? EMPTY_OBJECT;

    return {
        status: "planned-disabled",
        verificationVersion: "P25.31",
        adapter: "renderer-service",
        command: CommandDescriptors.RENDER_THUMBNAIL.id,
        dispatch: false,
        networkDispatch: false,
        runtimeRegistration: false,
        localFileWrites: false,
        hostStartup: false,
        processSpawn: false,
        packageCreated: false,
        workspaceMutation: false,
        scriptRunnable: false,
        fileMaterialization: false,
        lockfileMutation: false,
        rootPackageJsonMutation: false,
        pnpmWorkspaceMutation: false,
        commandExecution: false,
        buildOutput: false,
        packageScriptsRunnable: false,
        consumes: {
            packageWorkspaceWiring: {
                requiredStatus: "planned-disabled",
                currentStatus: packageWorkspaceWiring.status ?? "planned-disabled",
                wiringVersion: packageWorkspaceWiring.wiringVersion ?? "P25.30",
                workspaceRegistered: false,
                scriptsRunnable: false,
            },
            packageFileTemplates: {
                requiredStatus: "planned-disabled",
                currentStatus: packageFileTemplates.status ?? "planned-disabled",
                templateVersion: packageFileTemplates.templateVersion ?? "P25.29",
                fileMaterialization: false,
            },
        },
        verificationCommands: [
            {
                id: "workspace-filter-build",
                command: "pnpm --filter @penpot/renderer-service build",
                purpose: "compile the future renderer-service package",
                runnable: false,
                processSpawn: false,
                emitsFiles: false,
                requiresWorkspaceEntry: true,
                requiresPackageFiles: true,
            },
            {
                id: "workspace-filter-test",
                command: "pnpm --filter @penpot/renderer-service test",
                purpose: "run future no-op host and contract tests",
                runnable: false,
                processSpawn: false,
                emitsFiles: false,
                requiresWorkspaceEntry: true,
                requiresPackageFiles: true,
            },
            {
                id: "workspace-filter-types-check",
                command: "pnpm --filter @penpot/renderer-service exec tsc --noEmit",
                purpose: "type-check the future package without emitting build output",
                runnable: false,
                processSpawn: false,
                emitsFiles: false,
                requiresWorkspaceEntry: true,
                requiresPackageFiles: true,
            },
        ],
        expectedArtifacts: [
            {
                path: "renderer-service/dist/index.js",
                producedNow: false,
                requiredAfterBuild: true,
            },
            {
                path: "renderer-service/dist/index.d.ts",
                producedNow: false,
                requiredAfterBuild: true,
            },
            {
                path: "renderer-service/dist/noop-host.js",
                producedNow: false,
                requiredAfterBuild: true,
            },
            {
                path: "renderer-service/dist/noop-host.d.ts",
                producedNow: false,
                requiredAfterBuild: true,
            },
        ],
        verificationReadiness: {
            status: "blocked",
            canRunVerification: false,
            blockers: [
                "renderer-service-package-files",
                "pnpm-workspace-entry",
                "root-package-scripts-or-filtered-package-scripts",
                "pnpm-lockfile-update",
            ],
        },
        noOpGuarantees: [
            "do not run renderer-service build commands",
            "do not run renderer-service tests",
            "do not spawn package scripts",
            "do not emit renderer-service/dist build output",
            "do not edit pnpm workspace manifests or lockfiles",
        ],
        requiredBeforeRuntimeDispatch: [
            "materialize renderer-service package files before running verification",
            "commit workspace entry and lockfile updates before filtered build verification",
            "prove build, type-check, and test commands pass before making renderer-service scripts runnable",
            "keep render.thumbnail runtime registration disabled until package verification is green",
        ],
    };
}

export function createRenderThumbnailRendererServicePackageMaterializationChecklist(options = EMPTY_OBJECT) {
    const packageFileTemplates = options.packageFileTemplates ?? EMPTY_OBJECT;
    const packageWorkspaceWiring = options.packageWorkspaceWiring ?? EMPTY_OBJECT;
    const packageBuildVerification = options.packageBuildVerification ?? EMPTY_OBJECT;

    return {
        status: "planned-disabled",
        checklistVersion: "P25.32",
        adapter: "renderer-service",
        command: CommandDescriptors.RENDER_THUMBNAIL.id,
        dispatch: false,
        networkDispatch: false,
        runtimeRegistration: false,
        localFileWrites: false,
        hostStartup: false,
        processSpawn: false,
        packageCreated: false,
        workspaceMutation: false,
        scriptRunnable: false,
        fileMaterialization: false,
        lockfileMutation: false,
        rootPackageJsonMutation: false,
        pnpmWorkspaceMutation: false,
        commandExecution: false,
        buildOutput: false,
        packageScriptsRunnable: false,
        materializationApproved: false,
        consumes: {
            packageFileTemplates: {
                requiredStatus: "planned-disabled",
                currentStatus: packageFileTemplates.status ?? "planned-disabled",
                templateVersion: packageFileTemplates.templateVersion ?? "P25.29",
                fileMaterialization: false,
            },
            packageWorkspaceWiring: {
                requiredStatus: "planned-disabled",
                currentStatus: packageWorkspaceWiring.status ?? "planned-disabled",
                wiringVersion: packageWorkspaceWiring.wiringVersion ?? "P25.30",
                workspaceMutation: false,
            },
            packageBuildVerification: {
                requiredStatus: "planned-disabled",
                currentStatus: packageBuildVerification.status ?? "planned-disabled",
                verificationVersion: packageBuildVerification.verificationVersion ?? "P25.31",
                commandExecution: false,
                buildOutput: false,
            },
        },
        materializationBatches: [
            {
                id: "package-files",
                files: [
                    "renderer-service/package.json",
                    "renderer-service/tsconfig.json",
                    "renderer-service/src/index.ts",
                    "renderer-service/src/noop-host.ts",
                    "renderer-service/test/noop-host.test.mjs",
                ],
                materializeNow: false,
                requiresReview: true,
            },
            {
                id: "workspace-wiring",
                files: ["pnpm-workspace.yaml", "package.json", "pnpm-lock.yaml"],
                materializeNow: false,
                requiresReview: true,
            },
            {
                id: "verification-output",
                files: [
                    "renderer-service/dist/index.js",
                    "renderer-service/dist/index.d.ts",
                    "renderer-service/dist/noop-host.js",
                    "renderer-service/dist/noop-host.d.ts",
                ],
                materializeNow: false,
                generatedOnlyAfterBuild: true,
            },
        ],
        readinessChecklist: [
            {
                id: "templates-reviewed",
                description: "review package templates before writing renderer-service files",
                requiredBeforeMaterialization: true,
                satisfied: false,
            },
            {
                id: "workspace-wiring-reviewed",
                description: "review pnpm workspace entry, root scripts, and lockfile update together",
                requiredBeforeMaterialization: true,
                satisfied: false,
            },
            {
                id: "verification-plan-reviewed",
                description: "review filtered build, type-check, and test commands before making scripts runnable",
                requiredBeforeMaterialization: true,
                satisfied: false,
            },
            {
                id: "runtime-dispatch-stays-disabled",
                description: "confirm render.thumbnail runtime dispatch remains unavailable after materialization",
                requiredBeforeMaterialization: true,
                satisfied: false,
            },
        ],
        commitBoundary: {
            expectedCommit: "create renderer-service package files and workspace wiring in a dedicated future task",
            includePackageFiles: true,
            includeWorkspaceManifests: true,
            includeLockfile: true,
            includeRuntimeDispatch: false,
            materializeNow: false,
        },
        rollbackPlan: {
            deletePackageDirectory: "renderer-service",
            revertWorkspaceFiles: ["pnpm-workspace.yaml", "package.json", "pnpm-lock.yaml"],
            revertRuntimeRegistration: false,
            requiredBeforeMaterialization: true,
        },
        noOpGuarantees: [
            "do not create renderer-service directory",
            "do not write renderer-service package files",
            "do not edit pnpm-workspace.yaml",
            "do not edit root package.json",
            "do not mutate pnpm-lock.yaml",
            "do not run package verification commands",
            "do not register runtime dispatch",
        ],
        requiredBeforeRuntimeDispatch: [
            "complete package materialization checklist in a committed planning task",
            "materialize package files and workspace wiring in a separate implementation task",
            "run filtered build, type-check, and test commands after package files exist",
            "keep render.thumbnail execution unavailable until materialized package verification passes",
        ],
    };
}

export function createRenderThumbnailRendererServicePackageCreationDryRunSummary(options = EMPTY_OBJECT) {
    const packageMaterializationChecklist = options.packageMaterializationChecklist ?? EMPTY_OBJECT;
    const packageFileTemplates = options.packageFileTemplates ?? EMPTY_OBJECT;
    const packageWorkspaceWiring = options.packageWorkspaceWiring ?? EMPTY_OBJECT;
    const packageBuildVerification = options.packageBuildVerification ?? EMPTY_OBJECT;

    return {
        status: "planned-disabled",
        summaryVersion: "P25.33",
        adapter: "renderer-service",
        command: CommandDescriptors.RENDER_THUMBNAIL.id,
        dryRunOnly: true,
        dispatch: false,
        networkDispatch: false,
        runtimeRegistration: false,
        localFileWrites: false,
        hostStartup: false,
        processSpawn: false,
        packageCreated: false,
        workspaceMutation: false,
        scriptRunnable: false,
        fileMaterialization: false,
        lockfileMutation: false,
        rootPackageJsonMutation: false,
        pnpmWorkspaceMutation: false,
        commandExecution: false,
        buildOutput: false,
        packageScriptsRunnable: false,
        materializationApproved: false,
        filesWritten: false,
        consumes: {
            packageMaterializationChecklist: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationChecklist.status ?? "planned-disabled",
                checklistVersion: packageMaterializationChecklist.checklistVersion ?? "P25.32",
                materializationApproved: false,
            },
            packageFileTemplates: {
                requiredStatus: "planned-disabled",
                currentStatus: packageFileTemplates.status ?? "planned-disabled",
                templateVersion: packageFileTemplates.templateVersion ?? "P25.29",
                fileMaterialization: false,
            },
            packageWorkspaceWiring: {
                requiredStatus: "planned-disabled",
                currentStatus: packageWorkspaceWiring.status ?? "planned-disabled",
                wiringVersion: packageWorkspaceWiring.wiringVersion ?? "P25.30",
                workspaceMutation: false,
            },
            packageBuildVerification: {
                requiredStatus: "planned-disabled",
                currentStatus: packageBuildVerification.status ?? "planned-disabled",
                verificationVersion: packageBuildVerification.verificationVersion ?? "P25.31",
                commandExecution: false,
            },
        },
        summary: {
            title: "renderer-service package creation dry-run",
            packageName: "@penpot/renderer-service",
            packageDirectory: "renderer-service",
            wouldCreateFiles: [
                "renderer-service/package.json",
                "renderer-service/tsconfig.json",
                "renderer-service/src/index.ts",
                "renderer-service/src/noop-host.ts",
                "renderer-service/test/noop-host.test.mjs",
            ],
            wouldModifyFiles: ["pnpm-workspace.yaml", "package.json", "pnpm-lock.yaml"],
            wouldGenerateFilesAfterBuild: [
                "renderer-service/dist/index.js",
                "renderer-service/dist/index.d.ts",
                "renderer-service/dist/noop-host.js",
                "renderer-service/dist/noop-host.d.ts",
            ],
            wouldRunCommands: [
                "pnpm --filter @penpot/renderer-service build",
                "pnpm --filter @penpot/renderer-service exec tsc --noEmit",
                "pnpm --filter @penpot/renderer-service test",
            ],
        },
        sections: [
            {
                id: "package-files",
                title: "Package files",
                dryRunOnly: true,
                items: ["package.json", "tsconfig.json", "src/index.ts", "src/noop-host.ts", "test/noop-host.test.mjs"],
            },
            {
                id: "workspace-wiring",
                title: "Workspace wiring",
                dryRunOnly: true,
                items: ["pnpm-workspace.yaml entry", "root package.json scripts", "pnpm-lock.yaml dependency graph"],
            },
            {
                id: "verification",
                title: "Verification commands",
                dryRunOnly: true,
                items: ["filtered build", "type-check without emit", "node test suite"],
            },
        ],
        blockedUntil: [
            "explicit package materialization implementation task",
            "workspace and lockfile mutation approval",
            "package file template review",
            "runtime dispatch remains disabled after package creation",
        ],
        noOpGuarantees: [
            "dry-run summary does not create renderer-service directory",
            "dry-run summary does not write package files",
            "dry-run summary does not edit workspace manifests",
            "dry-run summary does not mutate lockfiles",
            "dry-run summary does not run verification commands",
            "dry-run summary does not register runtime dispatch",
        ],
        requiredBeforeRuntimeDispatch: [
            "commit dry-run summary before materializing package files",
            "create package files in a later explicit implementation task",
            "run package verification after materialization",
            "keep render.thumbnail unavailable until package creation and verification are complete",
        ],
    };
}

export function createRenderThumbnailRendererServicePackageCreationFileManifest(options = EMPTY_OBJECT) {
    const packageCreationDryRunSummary = options.packageCreationDryRunSummary ?? EMPTY_OBJECT;
    const packageFileTemplates = options.packageFileTemplates ?? EMPTY_OBJECT;
    const packageWorkspaceWiring = options.packageWorkspaceWiring ?? EMPTY_OBJECT;
    const packageBuildVerification = options.packageBuildVerification ?? EMPTY_OBJECT;

    return {
        status: "planned-disabled",
        manifestVersion: "P25.34",
        adapter: "renderer-service",
        command: CommandDescriptors.RENDER_THUMBNAIL.id,
        dryRunOnly: true,
        dispatch: false,
        networkDispatch: false,
        runtimeRegistration: false,
        localFileWrites: false,
        hostStartup: false,
        processSpawn: false,
        packageCreated: false,
        workspaceMutation: false,
        scriptRunnable: false,
        fileMaterialization: false,
        lockfileMutation: false,
        rootPackageJsonMutation: false,
        pnpmWorkspaceMutation: false,
        commandExecution: false,
        buildOutput: false,
        packageScriptsRunnable: false,
        materializationApproved: false,
        filesWritten: false,
        consumes: {
            packageCreationDryRunSummary: {
                requiredStatus: "planned-disabled",
                currentStatus: packageCreationDryRunSummary.status ?? "planned-disabled",
                summaryVersion: packageCreationDryRunSummary.summaryVersion ?? "P25.33",
                dryRunOnly: true,
                filesWritten: false,
            },
            packageFileTemplates: {
                requiredStatus: "planned-disabled",
                currentStatus: packageFileTemplates.status ?? "planned-disabled",
                templateVersion: packageFileTemplates.templateVersion ?? "P25.29",
                fileMaterialization: false,
            },
            packageWorkspaceWiring: {
                requiredStatus: "planned-disabled",
                currentStatus: packageWorkspaceWiring.status ?? "planned-disabled",
                wiringVersion: packageWorkspaceWiring.wiringVersion ?? "P25.30",
                workspaceMutation: false,
            },
            packageBuildVerification: {
                requiredStatus: "planned-disabled",
                currentStatus: packageBuildVerification.status ?? "planned-disabled",
                verificationVersion: packageBuildVerification.verificationVersion ?? "P25.31",
                commandExecution: false,
                buildOutput: false,
            },
        },
        packageDirectory: {
            path: "renderer-service",
            createNow: false,
            existsRequiredBeforeMaterialization: false,
        },
        files: [
            {
                id: "package-json",
                path: "renderer-service/package.json",
                kind: "package-manifest",
                source: "packageFileTemplates.packageJson",
                createNow: false,
                writesFile: false,
                materialized: false,
                requiredBeforeWorkspaceWiring: true,
                requiredBeforeVerification: true,
                expectedExport: "@penpot/renderer-service",
            },
            {
                id: "tsconfig",
                path: "renderer-service/tsconfig.json",
                kind: "typescript-config",
                source: "packageFileTemplates.tsconfig",
                createNow: false,
                writesFile: false,
                materialized: false,
                requiredBeforeWorkspaceWiring: false,
                requiredBeforeVerification: true,
                expectedExtends: "../tsconfig.json",
            },
            {
                id: "entrypoint",
                path: "renderer-service/src/index.ts",
                kind: "source",
                source: "packageFileTemplates.sourceFiles",
                createNow: false,
                writesFile: false,
                materialized: false,
                requiredBeforeWorkspaceWiring: false,
                requiredBeforeVerification: true,
                runtimeRegistration: false,
                exports: ["createNoopRendererServiceHost"],
            },
            {
                id: "noop-host",
                path: "renderer-service/src/noop-host.ts",
                kind: "source",
                source: "packageFileTemplates.sourceFiles",
                createNow: false,
                writesFile: false,
                materialized: false,
                requiredBeforeWorkspaceWiring: false,
                requiredBeforeVerification: true,
                startsProcess: false,
                routes: ["/health", "/thumbnail"],
                rendersPng: false,
            },
            {
                id: "noop-host-test",
                path: "renderer-service/test/noop-host.test.mjs",
                kind: "test",
                source: "packageFileTemplates.testFiles",
                createNow: false,
                writesFile: false,
                materialized: false,
                requiredBeforeWorkspaceWiring: false,
                requiredBeforeVerification: true,
                processSpawn: false,
                covers: ["health response metadata", "thumbnail unavailable response", "no process startup"],
            },
        ],
        generatedFiles: [
            {
                path: "renderer-service/dist/index.js",
                sourceFile: "renderer-service/src/index.ts",
                generateNow: false,
                producedBy: "pnpm --filter @penpot/renderer-service build",
            },
            {
                path: "renderer-service/dist/index.d.ts",
                sourceFile: "renderer-service/src/index.ts",
                generateNow: false,
                producedBy: "pnpm --filter @penpot/renderer-service build",
            },
            {
                path: "renderer-service/dist/noop-host.js",
                sourceFile: "renderer-service/src/noop-host.ts",
                generateNow: false,
                producedBy: "pnpm --filter @penpot/renderer-service build",
            },
            {
                path: "renderer-service/dist/noop-host.d.ts",
                sourceFile: "renderer-service/src/noop-host.ts",
                generateNow: false,
                producedBy: "pnpm --filter @penpot/renderer-service build",
            },
        ],
        workspaceFiles: [
            {
                path: "pnpm-workspace.yaml",
                plannedChange: "add renderer-service workspace entry",
                mutateNow: false,
            },
            {
                path: "package.json",
                plannedChange: "add root helper scripts after package materializes",
                mutateNow: false,
            },
            {
                path: "pnpm-lock.yaml",
                plannedChange: "refresh lockfile after workspace package exists",
                mutateNow: false,
            },
        ],
        manifestReadiness: {
            status: "blocked",
            canMaterializeFiles: false,
            blockers: [
                "explicit file materialization task",
                "workspace mutation approval",
                "template review",
                "runtime dispatch remains disabled",
            ],
        },
        noOpGuarantees: [
            "file manifest does not create renderer-service directory",
            "file manifest does not write renderer-service files",
            "file manifest does not edit workspace manifests",
            "file manifest does not mutate lockfiles",
            "file manifest does not generate dist output",
            "file manifest does not run verification commands",
            "file manifest does not register runtime dispatch",
        ],
        requiredBeforeRuntimeDispatch: [
            "commit file manifest before filesystem materialization",
            "materialize files in a later explicit implementation task",
            "wire workspace and lockfile after files are created",
            "run build, type-check, and tests after materialization",
            "keep render.thumbnail unavailable until materialized package verification passes",
        ],
    };
}

export function createRenderThumbnailRendererServicePackageMaterializationApprovalGate(options = EMPTY_OBJECT) {
    const packageMaterializationChecklist = options.packageMaterializationChecklist ?? EMPTY_OBJECT;
    const packageCreationFileManifest = options.packageCreationFileManifest ?? EMPTY_OBJECT;
    const packageWorkspaceWiring = options.packageWorkspaceWiring ?? EMPTY_OBJECT;
    const packageBuildVerification = options.packageBuildVerification ?? EMPTY_OBJECT;

    return {
        status: "planned-disabled",
        gateVersion: "P25.35",
        adapter: "renderer-service",
        command: CommandDescriptors.RENDER_THUMBNAIL.id,
        dryRunOnly: true,
        approvalRequired: true,
        approved: false,
        dispatch: false,
        networkDispatch: false,
        runtimeRegistration: false,
        localFileWrites: false,
        hostStartup: false,
        processSpawn: false,
        packageCreated: false,
        workspaceMutation: false,
        scriptRunnable: false,
        fileMaterialization: false,
        lockfileMutation: false,
        rootPackageJsonMutation: false,
        pnpmWorkspaceMutation: false,
        commandExecution: false,
        buildOutput: false,
        packageScriptsRunnable: false,
        materializationApproved: false,
        filesWritten: false,
        consumes: {
            packageMaterializationChecklist: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationChecklist.status ?? "planned-disabled",
                checklistVersion: packageMaterializationChecklist.checklistVersion ?? "P25.32",
                materializationApproved: false,
            },
            packageCreationFileManifest: {
                requiredStatus: "planned-disabled",
                currentStatus: packageCreationFileManifest.status ?? "planned-disabled",
                manifestVersion: packageCreationFileManifest.manifestVersion ?? "P25.34",
                filesWritten: false,
            },
            packageWorkspaceWiring: {
                requiredStatus: "planned-disabled",
                currentStatus: packageWorkspaceWiring.status ?? "planned-disabled",
                wiringVersion: packageWorkspaceWiring.wiringVersion ?? "P25.30",
                workspaceMutation: false,
            },
            packageBuildVerification: {
                requiredStatus: "planned-disabled",
                currentStatus: packageBuildVerification.status ?? "planned-disabled",
                verificationVersion: packageBuildVerification.verificationVersion ?? "P25.31",
                commandExecution: false,
                buildOutput: false,
            },
        },
        approvalInputs: [
            {
                id: "explicit-user-approval",
                label: "Explicit user approval to materialize renderer-service files",
                required: true,
                satisfied: false,
                source: "future implementation task request",
            },
            {
                id: "package-file-manifest-reviewed",
                label: "Review packageCreationFileManifest file list and generated output list",
                required: true,
                satisfied: false,
                source: "packageCreationFileManifest",
            },
            {
                id: "workspace-mutation-reviewed",
                label: "Review pnpm-workspace.yaml, package.json, and pnpm-lock.yaml changes together",
                required: true,
                satisfied: false,
                source: "packageWorkspaceWiring",
            },
            {
                id: "runtime-dispatch-disabled",
                label: "Confirm render.thumbnail runtime dispatch remains disabled after materialization",
                required: true,
                satisfied: false,
                source: "executionGate",
            },
        ],
        approvalScope: {
            packageDirectory: "renderer-service",
            packageFiles: [
                "renderer-service/package.json",
                "renderer-service/tsconfig.json",
                "renderer-service/src/index.ts",
                "renderer-service/src/noop-host.ts",
                "renderer-service/test/noop-host.test.mjs",
            ],
            workspaceFiles: ["pnpm-workspace.yaml", "package.json", "pnpm-lock.yaml"],
            generatedFilesExcludedUntilBuild: [
                "renderer-service/dist/index.js",
                "renderer-service/dist/index.d.ts",
                "renderer-service/dist/noop-host.js",
                "renderer-service/dist/noop-host.d.ts",
            ],
            runtimeDispatchIncluded: false,
        },
        approvalDecision: {
            status: "blocked",
            canMaterialize: false,
            canMutateWorkspace: false,
            canRunVerification: false,
            reason: "materialization approval has not been granted",
        },
        postApprovalSequence: [
            {
                id: "materialize-package-files",
                allowedBeforeApproval: false,
                writesFiles: true,
                runsCommands: false,
            },
            {
                id: "wire-workspace-manifests",
                allowedBeforeApproval: false,
                writesFiles: true,
                runsCommands: false,
            },
            {
                id: "run-package-verification",
                allowedBeforeApproval: false,
                writesFiles: false,
                runsCommands: true,
            },
        ],
        noOpGuarantees: [
            "approval gate does not grant approval",
            "approval gate does not create renderer-service directory",
            "approval gate does not write package files",
            "approval gate does not edit workspace manifests",
            "approval gate does not mutate lockfiles",
            "approval gate does not run verification commands",
            "approval gate does not generate build output",
            "approval gate does not register runtime dispatch",
        ],
        requiredBeforeRuntimeDispatch: [
            "obtain explicit materialization approval in a later task",
            "materialize package files only after approval",
            "commit workspace and lockfile mutations separately from runtime dispatch",
            "run package verification after approved materialization",
            "keep render.thumbnail unavailable until approved package verification passes",
        ],
    };
}

export function createRenderThumbnailRendererServicePackageMaterializationExecutionDryRun(options = EMPTY_OBJECT) {
    const packageMaterializationApprovalGate = options.packageMaterializationApprovalGate ?? EMPTY_OBJECT;
    const packageCreationFileManifest = options.packageCreationFileManifest ?? EMPTY_OBJECT;
    const packageWorkspaceWiring = options.packageWorkspaceWiring ?? EMPTY_OBJECT;
    const packageBuildVerification = options.packageBuildVerification ?? EMPTY_OBJECT;

    return {
        status: "planned-disabled",
        dryRunVersion: "P25.36",
        adapter: "renderer-service",
        command: CommandDescriptors.RENDER_THUMBNAIL.id,
        dryRunOnly: true,
        executeNow: false,
        approvalRequired: true,
        approved: false,
        dispatch: false,
        networkDispatch: false,
        runtimeRegistration: false,
        localFileWrites: false,
        hostStartup: false,
        processSpawn: false,
        packageCreated: false,
        workspaceMutation: false,
        scriptRunnable: false,
        fileMaterialization: false,
        lockfileMutation: false,
        rootPackageJsonMutation: false,
        pnpmWorkspaceMutation: false,
        commandExecution: false,
        buildOutput: false,
        packageScriptsRunnable: false,
        materializationApproved: false,
        filesWritten: false,
        consumes: {
            packageMaterializationApprovalGate: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationApprovalGate.status ?? "planned-disabled",
                gateVersion: packageMaterializationApprovalGate.gateVersion ?? "P25.35",
                approved: false,
            },
            packageCreationFileManifest: {
                requiredStatus: "planned-disabled",
                currentStatus: packageCreationFileManifest.status ?? "planned-disabled",
                manifestVersion: packageCreationFileManifest.manifestVersion ?? "P25.34",
                filesWritten: false,
            },
            packageWorkspaceWiring: {
                requiredStatus: "planned-disabled",
                currentStatus: packageWorkspaceWiring.status ?? "planned-disabled",
                wiringVersion: packageWorkspaceWiring.wiringVersion ?? "P25.30",
                workspaceMutation: false,
            },
            packageBuildVerification: {
                requiredStatus: "planned-disabled",
                currentStatus: packageBuildVerification.status ?? "planned-disabled",
                verificationVersion: packageBuildVerification.verificationVersion ?? "P25.31",
                commandExecution: false,
                buildOutput: false,
            },
        },
        dryRunPlan: {
            title: "renderer-service package materialization execution dry-run",
            packageDirectory: "renderer-service",
            executeNow: false,
            approvalStatus: "blocked",
            steps: [
                {
                    id: "create-package-directory",
                    action: "create-directory",
                    target: "renderer-service",
                    wouldExecute: true,
                    executed: false,
                    writesFiles: false,
                    createsDirectory: true,
                },
                {
                    id: "write-package-files",
                    action: "write-files",
                    target: "renderer-service package files",
                    wouldExecute: true,
                    executed: false,
                    writesFiles: true,
                    files: [
                        "renderer-service/package.json",
                        "renderer-service/tsconfig.json",
                        "renderer-service/src/index.ts",
                        "renderer-service/src/noop-host.ts",
                        "renderer-service/test/noop-host.test.mjs",
                    ],
                },
                {
                    id: "update-workspace-files",
                    action: "mutate-workspace",
                    target: "workspace manifests and lockfile",
                    wouldExecute: true,
                    executed: false,
                    writesFiles: true,
                    files: ["pnpm-workspace.yaml", "package.json", "pnpm-lock.yaml"],
                },
                {
                    id: "run-verification",
                    action: "run-commands",
                    target: "@penpot/renderer-service verification",
                    wouldExecute: true,
                    executed: false,
                    writesFiles: false,
                    commands: [
                        "pnpm --filter @penpot/renderer-service build",
                        "pnpm --filter @penpot/renderer-service exec tsc --noEmit",
                        "pnpm --filter @penpot/renderer-service test",
                    ],
                },
            ],
        },
        blockedBecause: [
            "materialization approval is not granted",
            "package files are not materialized",
            "workspace manifests are not approved for mutation",
            "verification commands must not run before package files exist",
            "runtime dispatch must stay disabled",
        ],
        executionOutputs: {
            packageDirectoryCreated: false,
            packageFilesWritten: false,
            workspaceFilesMutated: false,
            lockfileMutated: false,
            commandsRun: false,
            buildArtifactsGenerated: false,
            runtimeDispatchRegistered: false,
        },
        noOpGuarantees: [
            "execution dry-run does not create renderer-service directory",
            "execution dry-run does not write package files",
            "execution dry-run does not edit workspace manifests",
            "execution dry-run does not mutate lockfiles",
            "execution dry-run does not run verification commands",
            "execution dry-run does not generate build output",
            "execution dry-run does not register runtime dispatch",
        ],
        requiredBeforeRuntimeDispatch: [
            "complete execution dry-run planning before materialization",
            "obtain explicit approval before running materialization",
            "materialize files and workspace updates in a later implementation task",
            "run package verification after approved materialization",
            "keep render.thumbnail unavailable until approved package verification passes",
        ],
    };
}

export function createRenderThumbnailRendererServicePackageMaterializationWriteContract(options = EMPTY_OBJECT) {
    const packageMaterializationExecutionDryRun = options.packageMaterializationExecutionDryRun ?? EMPTY_OBJECT;
    const packageMaterializationApprovalGate = options.packageMaterializationApprovalGate ?? EMPTY_OBJECT;
    const packageCreationFileManifest = options.packageCreationFileManifest ?? EMPTY_OBJECT;
    const packageWorkspaceWiring = options.packageWorkspaceWiring ?? EMPTY_OBJECT;

    return {
        status: "planned-disabled",
        contractVersion: "P25.37",
        adapter: "renderer-service",
        command: CommandDescriptors.RENDER_THUMBNAIL.id,
        dryRunOnly: true,
        approvalRequired: true,
        approved: false,
        executeNow: false,
        dispatch: false,
        networkDispatch: false,
        runtimeRegistration: false,
        localFileWrites: false,
        hostStartup: false,
        processSpawn: false,
        packageCreated: false,
        workspaceMutation: false,
        scriptRunnable: false,
        fileMaterialization: false,
        lockfileMutation: false,
        rootPackageJsonMutation: false,
        pnpmWorkspaceMutation: false,
        commandExecution: false,
        buildOutput: false,
        packageScriptsRunnable: false,
        materializationApproved: false,
        materializationApprovedRequired: true,
        materializationApprovedNow: false,
        filesWritten: false,
        consumes: {
            packageMaterializationExecutionDryRun: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationExecutionDryRun.status ?? "planned-disabled",
                dryRunVersion: packageMaterializationExecutionDryRun.dryRunVersion ?? "P25.36",
                executeNow: false,
                filesWritten: false,
            },
            packageMaterializationApprovalGate: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationApprovalGate.status ?? "planned-disabled",
                gateVersion: packageMaterializationApprovalGate.gateVersion ?? "P25.35",
                approved: false,
            },
            packageCreationFileManifest: {
                requiredStatus: "planned-disabled",
                currentStatus: packageCreationFileManifest.status ?? "planned-disabled",
                manifestVersion: packageCreationFileManifest.manifestVersion ?? "P25.34",
                filesWritten: false,
            },
            packageWorkspaceWiring: {
                requiredStatus: "planned-disabled",
                currentStatus: packageWorkspaceWiring.status ?? "planned-disabled",
                wiringVersion: packageWorkspaceWiring.wiringVersion ?? "P25.30",
                workspaceMutation: false,
            },
        },
        writeContract: {
            packageDirectory: {
                path: "renderer-service",
                createMode: "mkdirp",
                writeNow: false,
                created: false,
            },
            packageFiles: [
                {
                    id: "package-json",
                    path: "renderer-service/package.json",
                    writeMode: "create",
                    overwrite: false,
                    writeNow: false,
                    source: "packageCreationFileManifest.files.package-json",
                },
                {
                    id: "tsconfig",
                    path: "renderer-service/tsconfig.json",
                    writeMode: "create",
                    overwrite: false,
                    writeNow: false,
                    source: "packageCreationFileManifest.files.tsconfig",
                },
                {
                    id: "entrypoint",
                    path: "renderer-service/src/index.ts",
                    writeMode: "create",
                    overwrite: false,
                    writeNow: false,
                    source: "packageCreationFileManifest.files.entrypoint",
                },
                {
                    id: "noop-host",
                    path: "renderer-service/src/noop-host.ts",
                    writeMode: "create",
                    overwrite: false,
                    writeNow: false,
                    source: "packageCreationFileManifest.files.noop-host",
                },
                {
                    id: "noop-host-test",
                    path: "renderer-service/test/noop-host.test.mjs",
                    writeMode: "create",
                    overwrite: false,
                    writeNow: false,
                    source: "packageCreationFileManifest.files.noop-host-test",
                },
            ],
            workspaceFiles: [
                {
                    id: "pnpm-workspace",
                    path: "pnpm-workspace.yaml",
                    writeMode: "patch",
                    writeNow: false,
                    source: "packageWorkspaceWiring.workspaceFiles.pnpm-workspace",
                },
                {
                    id: "root-package-json",
                    path: "package.json",
                    writeMode: "patch",
                    writeNow: false,
                    source: "packageWorkspaceWiring.workspaceFiles.root-package-json",
                },
                {
                    id: "pnpm-lock",
                    path: "pnpm-lock.yaml",
                    writeMode: "refresh",
                    writeNow: false,
                    source: "packageWorkspaceWiring.workspaceFiles.pnpm-lock",
                },
            ],
            generatedFilesExcludedUntilBuild: [
                "renderer-service/dist/index.js",
                "renderer-service/dist/index.d.ts",
                "renderer-service/dist/noop-host.js",
                "renderer-service/dist/noop-host.d.ts",
            ],
        },
        integrityPlan: {
            hashBeforeWrite: true,
            hashAfterWrite: true,
            verifyManifestAfterWrite: true,
            atomicWrites: true,
            tempFileSuffix: ".tmp",
            compareExpectedPaths: true,
            writeNow: false,
        },
        rollbackContract: {
            writeNow: false,
            rollbackNow: false,
            removeCreatedPackageDirectoryOnFailure: true,
            restoreWorkspaceFilesFromHashSnapshot: true,
            lockfileRefreshMustBeReversible: true,
            failureLeavesRuntimeDispatchDisabled: true,
        },
        noOpGuarantees: [
            "write contract does not create renderer-service directory",
            "write contract does not write package files",
            "write contract does not edit workspace manifests",
            "write contract does not mutate lockfiles",
            "write contract does not run verification commands",
            "write contract does not generate build output",
            "write contract does not register runtime dispatch",
        ],
        requiredBeforeRuntimeDispatch: [
            "approve materialization explicitly in a later task",
            "execute write contract only after approval gate is satisfied",
            "verify hashes and manifest paths after approved writes",
            "run package build, type-check, and tests after materialization",
            "keep render.thumbnail unavailable until rollback and verification contracts pass",
        ],
    };
}

export function createRenderThumbnailRendererServicePackageMaterializationRollbackContract(options = EMPTY_OBJECT) {
    const packageMaterializationWriteContract = options.packageMaterializationWriteContract ?? EMPTY_OBJECT;
    const packageMaterializationExecutionDryRun = options.packageMaterializationExecutionDryRun ?? EMPTY_OBJECT;
    const packageMaterializationApprovalGate = options.packageMaterializationApprovalGate ?? EMPTY_OBJECT;

    return {
        status: "planned-disabled",
        contractVersion: "P25.38",
        adapter: "renderer-service",
        command: CommandDescriptors.RENDER_THUMBNAIL.id,
        dryRunOnly: true,
        approvalRequired: true,
        approved: false,
        executeNow: false,
        rollbackNow: false,
        dispatch: false,
        networkDispatch: false,
        runtimeRegistration: false,
        localFileWrites: false,
        hostStartup: false,
        processSpawn: false,
        packageCreated: false,
        workspaceMutation: false,
        scriptRunnable: false,
        fileMaterialization: false,
        lockfileMutation: false,
        rootPackageJsonMutation: false,
        pnpmWorkspaceMutation: false,
        commandExecution: false,
        buildOutput: false,
        packageScriptsRunnable: false,
        materializationApproved: false,
        materializationApprovedRequired: true,
        materializationApprovedNow: false,
        filesWritten: false,
        rollbackExecuted: false,
        consumes: {
            packageMaterializationWriteContract: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationWriteContract.status ?? "planned-disabled",
                contractVersion: packageMaterializationWriteContract.contractVersion ?? "P25.37",
                writeNow: false,
                filesWritten: false,
            },
            packageMaterializationExecutionDryRun: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationExecutionDryRun.status ?? "planned-disabled",
                dryRunVersion: packageMaterializationExecutionDryRun.dryRunVersion ?? "P25.36",
                executeNow: false,
            },
            packageMaterializationApprovalGate: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationApprovalGate.status ?? "planned-disabled",
                gateVersion: packageMaterializationApprovalGate.gateVersion ?? "P25.35",
                approved: false,
            },
        },
        snapshotPlan: {
            status: "planned",
            snapshotNow: false,
            hashBeforeWrite: true,
            capturePackageDirectoryExistence: true,
            captureWorkspaceFileHashes: true,
            captureLockfileHash: true,
            packageDirectory: "renderer-service",
            workspaceFiles: ["pnpm-workspace.yaml", "package.json", "pnpm-lock.yaml"],
        },
        rollbackPlan: {
            status: "blocked",
            rollbackNow: false,
            phases: [
                {
                    id: "stop-new-runtime-dispatch",
                    order: 1,
                    action: "keep-runtime-dispatch-disabled",
                    executesNow: false,
                    dispatch: false,
                },
                {
                    id: "restore-workspace-files",
                    order: 2,
                    action: "restore-from-hash-snapshot",
                    executesNow: false,
                    writesFiles: true,
                    files: ["pnpm-workspace.yaml", "package.json", "pnpm-lock.yaml"],
                },
                {
                    id: "remove-created-package-files",
                    order: 3,
                    action: "remove-created-files",
                    executesNow: false,
                    writesFiles: true,
                    files: [
                        "renderer-service/package.json",
                        "renderer-service/tsconfig.json",
                        "renderer-service/src/index.ts",
                        "renderer-service/src/noop-host.ts",
                        "renderer-service/test/noop-host.test.mjs",
                    ],
                },
                {
                    id: "remove-empty-package-directory",
                    order: 4,
                    action: "remove-directory-if-created-and-empty",
                    executesNow: false,
                    writesFiles: true,
                    target: "renderer-service",
                },
                {
                    id: "verify-rollback",
                    order: 5,
                    action: "verify-hashes-and-absence",
                    executesNow: false,
                    writesFiles: false,
                    commandsRun: false,
                },
            ],
        },
        failureRecovery: {
            status: "planned",
            rollbackNow: false,
            recoverableFailures: [
                "package file write failure",
                "workspace manifest patch failure",
                "lockfile refresh failure",
                "post-write verification failure",
            ],
            manualReviewRequiredAfterFailure: true,
            runtimeDispatchRemainsDisabled: true,
        },
        verificationPlan: {
            verifyNow: false,
            hashAfterRollback: true,
            verifyWorkspaceFilesRestored: true,
            verifyPackageDirectoryAbsentOrPreexisting: true,
            verifyRuntimeDispatchDisabled: true,
            commandsRun: false,
        },
        noOpGuarantees: [
            "rollback contract does not create renderer-service directory",
            "rollback contract does not remove renderer-service directory",
            "rollback contract does not write package files",
            "rollback contract does not restore workspace manifests",
            "rollback contract does not mutate lockfiles",
            "rollback contract does not run verification commands",
            "rollback contract does not register runtime dispatch",
        ],
        requiredBeforeRuntimeDispatch: [
            "capture rollback snapshots before any approved materialization",
            "keep rollback plan available for every approved write phase",
            "verify rollback hashes before enabling renderer-service package scripts",
            "run package verification only after rollback contract is reviewed",
            "keep render.thumbnail unavailable until rollback coverage and materialization verification pass",
        ],
    };
}

export function createRenderThumbnailRendererServicePackageMaterializationVerificationManifest(options = EMPTY_OBJECT) {
    const packageMaterializationRollbackContract = options.packageMaterializationRollbackContract ?? EMPTY_OBJECT;
    const packageMaterializationWriteContract = options.packageMaterializationWriteContract ?? EMPTY_OBJECT;
    const packageBuildVerification = options.packageBuildVerification ?? EMPTY_OBJECT;
    const packageCreationFileManifest = options.packageCreationFileManifest ?? EMPTY_OBJECT;

    return {
        status: "planned-disabled",
        manifestVersion: "P25.39",
        adapter: "renderer-service",
        command: CommandDescriptors.RENDER_THUMBNAIL.id,
        dryRunOnly: true,
        approvalRequired: true,
        approved: false,
        executeNow: false,
        verifyNow: false,
        rollbackNow: false,
        dispatch: false,
        networkDispatch: false,
        runtimeRegistration: false,
        localFileWrites: false,
        hostStartup: false,
        processSpawn: false,
        packageCreated: false,
        workspaceMutation: false,
        scriptRunnable: false,
        fileMaterialization: false,
        lockfileMutation: false,
        rootPackageJsonMutation: false,
        pnpmWorkspaceMutation: false,
        commandExecution: false,
        buildOutput: false,
        packageScriptsRunnable: false,
        materializationApproved: false,
        materializationApprovedRequired: true,
        materializationApprovedNow: false,
        filesWritten: false,
        rollbackExecuted: false,
        verificationExecuted: false,
        consumes: {
            packageMaterializationRollbackContract: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationRollbackContract.status ?? "planned-disabled",
                contractVersion: packageMaterializationRollbackContract.contractVersion ?? "P25.38",
                rollbackNow: false,
            },
            packageMaterializationWriteContract: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationWriteContract.status ?? "planned-disabled",
                contractVersion: packageMaterializationWriteContract.contractVersion ?? "P25.37",
                filesWritten: false,
            },
            packageBuildVerification: {
                requiredStatus: "planned-disabled",
                currentStatus: packageBuildVerification.status ?? "planned-disabled",
                verificationVersion: packageBuildVerification.verificationVersion ?? "P25.31",
                commandExecution: false,
                buildOutput: false,
            },
            packageCreationFileManifest: {
                requiredStatus: "planned-disabled",
                currentStatus: packageCreationFileManifest.status ?? "planned-disabled",
                manifestVersion: packageCreationFileManifest.manifestVersion ?? "P25.34",
                filesWritten: false,
            },
        },
        verificationManifest: {
            status: "blocked",
            verifyNow: false,
            packageDirectory: {
                path: "renderer-service",
                expectedAfterMaterialization: "exists",
                verifyNow: false,
            },
            packageFiles: [
                "renderer-service/package.json",
                "renderer-service/tsconfig.json",
                "renderer-service/src/index.ts",
                "renderer-service/src/noop-host.ts",
                "renderer-service/test/noop-host.test.mjs",
            ].map((path) => ({
                path,
                expectedAfterMaterialization: "exists",
                hashAfterWrite: true,
                verifyNow: false,
            })),
            workspaceFiles: [
                {
                    path: "pnpm-workspace.yaml",
                    expectedChange: "workspace entry includes renderer-service",
                    verifyNow: false,
                },
                {
                    path: "package.json",
                    expectedChange: "root package scripts remain reviewed before registration",
                    verifyNow: false,
                },
                {
                    path: "pnpm-lock.yaml",
                    expectedChange: "lockfile refreshed after approved workspace mutation",
                    verifyNow: false,
                },
            ],
            generatedOutputs: [
                "renderer-service/dist/index.js",
                "renderer-service/dist/index.d.ts",
                "renderer-service/dist/noop-host.js",
                "renderer-service/dist/noop-host.d.ts",
            ].map((path) => ({
                path,
                expectedAfterBuild: "exists",
                verifyNow: false,
            })),
        },
        commandManifest: {
            status: "planned",
            commandsRun: false,
            verifyNow: false,
            commands: [
                {
                    id: "build",
                    command: "pnpm --filter @penpot/renderer-service build",
                    runsNow: false,
                },
                {
                    id: "types",
                    command: "pnpm --filter @penpot/renderer-service exec tsc --noEmit",
                    runsNow: false,
                },
                {
                    id: "test",
                    command: "pnpm --filter @penpot/renderer-service test",
                    runsNow: false,
                },
            ],
        },
        runtimeDisabledAssertions: {
            status: "required",
            verifyNow: false,
            dispatch: false,
            runtimeRegistration: false,
            clientRequestDispatch: false,
            healthPreflightDispatch: false,
            rendererServiceUnavailableUntilRegistration: true,
        },
        readinessDecision: {
            status: "blocked",
            canVerifyMaterialization: false,
            canEnableRuntimeDispatch: false,
            reason: "verification manifest is metadata-only and package materialization has not occurred",
        },
        noOpGuarantees: [
            "verification manifest does not create renderer-service directory",
            "verification manifest does not write package files",
            "verification manifest does not edit workspace manifests",
            "verification manifest does not mutate lockfiles",
            "verification manifest does not run verification commands",
            "verification manifest does not generate build output",
            "verification manifest does not register runtime dispatch",
        ],
        requiredBeforeRuntimeDispatch: [
            "materialize files only after explicit approval",
            "run verification commands only after approved materialization",
            "confirm package files and workspace files match the manifest",
            "confirm rollback contract remains valid after verification",
            "keep render.thumbnail unavailable until verification manifest passes",
        ],
    };
}

export function createRenderThumbnailRendererServicePackageMaterializationFinalApprovalChecklist(options = EMPTY_OBJECT) {
    const packageMaterializationVerificationManifest = options.packageMaterializationVerificationManifest ?? EMPTY_OBJECT;
    const packageMaterializationRollbackContract = options.packageMaterializationRollbackContract ?? EMPTY_OBJECT;
    const packageMaterializationWriteContract = options.packageMaterializationWriteContract ?? EMPTY_OBJECT;
    const packageMaterializationApprovalGate = options.packageMaterializationApprovalGate ?? EMPTY_OBJECT;

    return {
        status: "planned-disabled",
        checklistVersion: "P25.40",
        adapter: "renderer-service",
        command: CommandDescriptors.RENDER_THUMBNAIL.id,
        dryRunOnly: true,
        approvalRequired: true,
        approved: false,
        finalApprovalGranted: false,
        executeNow: false,
        verifyNow: false,
        rollbackNow: false,
        dispatch: false,
        networkDispatch: false,
        runtimeRegistration: false,
        localFileWrites: false,
        hostStartup: false,
        processSpawn: false,
        packageCreated: false,
        workspaceMutation: false,
        scriptRunnable: false,
        fileMaterialization: false,
        lockfileMutation: false,
        rootPackageJsonMutation: false,
        pnpmWorkspaceMutation: false,
        commandExecution: false,
        buildOutput: false,
        packageScriptsRunnable: false,
        materializationApproved: false,
        materializationApprovedRequired: true,
        materializationApprovedNow: false,
        filesWritten: false,
        rollbackExecuted: false,
        verificationExecuted: false,
        consumes: {
            packageMaterializationVerificationManifest: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationVerificationManifest.status ?? "planned-disabled",
                manifestVersion: packageMaterializationVerificationManifest.manifestVersion ?? "P25.39",
                verifyNow: false,
            },
            packageMaterializationRollbackContract: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationRollbackContract.status ?? "planned-disabled",
                contractVersion: packageMaterializationRollbackContract.contractVersion ?? "P25.38",
                rollbackNow: false,
            },
            packageMaterializationWriteContract: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationWriteContract.status ?? "planned-disabled",
                contractVersion: packageMaterializationWriteContract.contractVersion ?? "P25.37",
                filesWritten: false,
            },
            packageMaterializationApprovalGate: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationApprovalGate.status ?? "planned-disabled",
                gateVersion: packageMaterializationApprovalGate.gateVersion ?? "P25.35",
                approved: false,
            },
        },
        checklist: [
            {
                id: "explicit-user-approval",
                label: "Explicit user approval for renderer-service package materialization",
                required: true,
                satisfied: false,
                source: "future implementation task request",
            },
            {
                id: "write-contract-reviewed",
                label: "packageMaterializationWriteContract reviewed",
                required: true,
                satisfied: false,
                source: "packageMaterializationWriteContract",
            },
            {
                id: "rollback-contract-reviewed",
                label: "packageMaterializationRollbackContract reviewed",
                required: true,
                satisfied: false,
                source: "packageMaterializationRollbackContract",
            },
            {
                id: "verification-manifest-reviewed",
                label: "packageMaterializationVerificationManifest reviewed",
                required: true,
                satisfied: false,
                source: "packageMaterializationVerificationManifest",
            },
            {
                id: "runtime-dispatch-remains-disabled",
                label: "render.thumbnail runtime dispatch remains disabled after materialization",
                required: true,
                satisfied: false,
                source: "executionGate",
            },
        ],
        approvalScope: {
            packageDirectory: "renderer-service",
            packageFiles: [
                "renderer-service/package.json",
                "renderer-service/tsconfig.json",
                "renderer-service/src/index.ts",
                "renderer-service/src/noop-host.ts",
                "renderer-service/test/noop-host.test.mjs",
            ],
            workspaceFiles: ["pnpm-workspace.yaml", "package.json", "pnpm-lock.yaml"],
            verificationCommands: [
                "pnpm --filter @penpot/renderer-service build",
                "pnpm --filter @penpot/renderer-service exec tsc --noEmit",
                "pnpm --filter @penpot/renderer-service test",
            ],
            runtimeDispatchIncluded: false,
        },
        approvalDecision: {
            status: "blocked",
            canGrantFinalApproval: false,
            canMaterializeFiles: false,
            canMutateWorkspace: false,
            canRunVerification: false,
            canEnableRuntimeDispatch: false,
            reason: "final approval checklist is metadata-only and explicit approval has not been granted",
        },
        postApprovalSequence: [
            {
                id: "capture-rollback-snapshot",
                allowedBeforeFinalApproval: false,
                writesFiles: false,
                runsCommands: false,
            },
            {
                id: "materialize-package-files",
                allowedBeforeFinalApproval: false,
                writesFiles: true,
                runsCommands: false,
            },
            {
                id: "mutate-workspace-files",
                allowedBeforeFinalApproval: false,
                writesFiles: true,
                runsCommands: false,
            },
            {
                id: "run-verification-manifest",
                allowedBeforeFinalApproval: false,
                writesFiles: false,
                runsCommands: true,
            },
        ],
        noOpGuarantees: [
            "final approval checklist does not grant approval",
            "final approval checklist does not create renderer-service directory",
            "final approval checklist does not write package files",
            "final approval checklist does not edit workspace manifests",
            "final approval checklist does not mutate lockfiles",
            "final approval checklist does not run verification commands",
            "final approval checklist does not generate build output",
            "final approval checklist does not register runtime dispatch",
        ],
        requiredBeforeRuntimeDispatch: [
            "grant final materialization approval in a later explicit implementation task",
            "materialize files only after every checklist item is satisfied",
            "run verification manifest after approved materialization",
            "keep rollback contract available through verification",
            "keep render.thumbnail unavailable until final approval, materialization, and verification all pass",
        ],
    };
}

export function createRenderThumbnailRendererServicePackageMaterializationExplicitApprovalToken(options = EMPTY_OBJECT) {
    const packageMaterializationFinalApprovalChecklist = options.packageMaterializationFinalApprovalChecklist ?? EMPTY_OBJECT;
    const packageMaterializationApprovalGate = options.packageMaterializationApprovalGate ?? EMPTY_OBJECT;

    return {
        status: "planned-disabled",
        tokenVersion: "P25.41",
        adapter: "renderer-service",
        command: CommandDescriptors.RENDER_THUMBNAIL.id,
        dryRunOnly: true,
        approvalRequired: true,
        approved: false,
        finalApprovalGranted: false,
        tokenRequired: true,
        tokenProvided: false,
        tokenAccepted: false,
        tokenStored: false,
        tokenValidated: false,
        executeNow: false,
        verifyNow: false,
        rollbackNow: false,
        dispatch: false,
        networkDispatch: false,
        runtimeRegistration: false,
        localFileWrites: false,
        hostStartup: false,
        processSpawn: false,
        packageCreated: false,
        workspaceMutation: false,
        scriptRunnable: false,
        fileMaterialization: false,
        lockfileMutation: false,
        rootPackageJsonMutation: false,
        pnpmWorkspaceMutation: false,
        commandExecution: false,
        buildOutput: false,
        packageScriptsRunnable: false,
        materializationApproved: false,
        materializationApprovedNow: false,
        filesWritten: false,
        rollbackExecuted: false,
        verificationExecuted: false,
        consumes: {
            packageMaterializationFinalApprovalChecklist: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationFinalApprovalChecklist.status ?? "planned-disabled",
                checklistVersion: packageMaterializationFinalApprovalChecklist.checklistVersion ?? "P25.40",
                finalApprovalGranted: false,
            },
            packageMaterializationApprovalGate: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationApprovalGate.status ?? "planned-disabled",
                gateVersion: packageMaterializationApprovalGate.gateVersion ?? "P25.35",
                approved: false,
            },
        },
        tokenContract: {
            tokenType: "explicit-user-approval",
            format: "opaque-one-time-approval-token",
            acceptedNow: false,
            storedNow: false,
            requiredScope: [
                "renderer-service package directory materialization",
                "pnpm-workspace.yaml/package.json/pnpm-lock.yaml workspace mutation",
                "post-materialization verification command execution",
            ],
            expiryRequired: true,
            replayAllowed: false,
            approverType: "human-user",
            tokenValueLogged: false,
        },
        validationPlan: {
            validateNow: false,
            requiredChecklistItemsSatisfied: false,
            requireHumanIntent: true,
            requireWorkspaceMutationScope: true,
            requireRuntimeDispatchDisabled: true,
            requireOneTimeUse: true,
            requireUnexpiredToken: true,
        },
        auditPlan: {
            writeAuditNow: false,
            includeUserId: true,
            includeTaskId: true,
            includeScopeHash: true,
            includeTimestamp: true,
            includeChecklistVersion: true,
            tokenValueLogged: false,
        },
        approvalDecision: {
            status: "blocked",
            canAcceptToken: false,
            canGrantFinalApproval: false,
            canMaterializeFiles: false,
            canMutateWorkspace: false,
            canRunVerification: false,
            canEnableRuntimeDispatch: false,
            reason: "explicit approval token has not been provided or validated",
        },
        noOpGuarantees: [
            "explicit approval token plan does not accept token input",
            "explicit approval token plan does not store token values",
            "explicit approval token plan does not validate or consume a token",
            "explicit approval token plan does not grant materialization approval",
            "explicit approval token plan does not create renderer-service directory",
            "explicit approval token plan does not write package or workspace files",
            "explicit approval token plan does not mutate lockfiles",
            "explicit approval token plan does not run verification commands",
            "explicit approval token plan does not generate build output",
            "explicit approval token plan does not register runtime dispatch",
        ],
        requiredBeforeRuntimeDispatch: [
            "collect explicit approval token through a future approved user flow",
            "validate token scope, expiry, and one-time use before materialization",
            "write audit metadata without logging token value",
            "grant final approval only after checklist and approval gate are satisfied",
            "keep render.thumbnail unavailable until executable adapter registration is approved",
        ],
    };
}

export function createRenderThumbnailRendererServicePackageMaterializationApprovalAuditTrail(options = EMPTY_OBJECT) {
    const packageMaterializationExplicitApprovalToken = options.packageMaterializationExplicitApprovalToken ?? EMPTY_OBJECT;
    const packageMaterializationFinalApprovalChecklist = options.packageMaterializationFinalApprovalChecklist ?? EMPTY_OBJECT;
    const packageMaterializationApprovalGate = options.packageMaterializationApprovalGate ?? EMPTY_OBJECT;

    return {
        status: "planned-disabled",
        auditTrailVersion: "P25.42",
        adapter: "renderer-service",
        command: CommandDescriptors.RENDER_THUMBNAIL.id,
        dryRunOnly: true,
        approvalRequired: true,
        approved: false,
        finalApprovalGranted: false,
        auditTrailRequired: true,
        auditRecordPlanned: true,
        auditRecordWritten: false,
        auditRecordPersisted: false,
        auditRecordValidated: false,
        auditRecordExported: false,
        writeAuditNow: false,
        tokenAccepted: false,
        tokenStored: false,
        tokenValidated: false,
        executeNow: false,
        verifyNow: false,
        rollbackNow: false,
        dispatch: false,
        networkDispatch: false,
        runtimeRegistration: false,
        localFileWrites: false,
        hostStartup: false,
        processSpawn: false,
        packageCreated: false,
        workspaceMutation: false,
        scriptRunnable: false,
        fileMaterialization: false,
        lockfileMutation: false,
        rootPackageJsonMutation: false,
        pnpmWorkspaceMutation: false,
        commandExecution: false,
        buildOutput: false,
        packageScriptsRunnable: false,
        materializationApproved: false,
        materializationApprovedNow: false,
        filesWritten: false,
        rollbackExecuted: false,
        verificationExecuted: false,
        consumes: {
            packageMaterializationExplicitApprovalToken: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationExplicitApprovalToken.status ?? "planned-disabled",
                tokenVersion: packageMaterializationExplicitApprovalToken.tokenVersion ?? "P25.41",
                tokenAccepted: false,
                tokenValidated: false,
            },
            packageMaterializationFinalApprovalChecklist: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationFinalApprovalChecklist.status ?? "planned-disabled",
                checklistVersion: packageMaterializationFinalApprovalChecklist.checklistVersion ?? "P25.40",
                finalApprovalGranted: false,
            },
            packageMaterializationApprovalGate: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationApprovalGate.status ?? "planned-disabled",
                gateVersion: packageMaterializationApprovalGate.gateVersion ?? "P25.35",
                approved: false,
            },
        },
        auditTrailContract: {
            sink: "future-approval-audit-log",
            recordType: "renderer-service-package-materialization-approval",
            appendOnly: true,
            writeNow: false,
            persistNow: false,
            exportNow: false,
            tokenValueLogged: false,
            requiredFields: [
                "taskId",
                "userId",
                "approvalScopeHash",
                "tokenVersion",
                "checklistVersion",
                "gateVersion",
                "decision",
                "timestamp",
            ],
        },
        auditEvents: [
            {
                id: "approval-token-presented",
                required: true,
                planned: true,
                written: false,
                tokenValueLogged: false,
            },
            {
                id: "approval-token-validated",
                required: true,
                planned: true,
                written: false,
                tokenValueLogged: false,
            },
            {
                id: "final-approval-decision",
                required: true,
                planned: true,
                written: false,
                tokenValueLogged: false,
            },
            {
                id: "materialization-scope-confirmed",
                required: true,
                planned: true,
                written: false,
                tokenValueLogged: false,
            },
        ],
        retentionPlan: {
            retentionRequired: true,
            redactTokenValue: true,
            includeScopeHash: true,
            includeActor: true,
            includeTimestamp: true,
            enforceNow: false,
        },
        approvalDecision: {
            status: "blocked",
            canWriteAuditRecord: false,
            canPersistAuditRecord: false,
            canAcceptToken: false,
            canGrantFinalApproval: false,
            canMaterializeFiles: false,
            canMutateWorkspace: false,
            canRunVerification: false,
            canEnableRuntimeDispatch: false,
            reason: "approval audit trail is metadata-only and no explicit approval token has been validated",
        },
        noOpGuarantees: [
            "approval audit trail plan does not write audit records",
            "approval audit trail plan does not persist audit records",
            "approval audit trail plan does not log token values",
            "approval audit trail plan does not accept or validate tokens",
            "approval audit trail plan does not grant materialization approval",
            "approval audit trail plan does not create renderer-service directory",
            "approval audit trail plan does not write package or workspace files",
            "approval audit trail plan does not mutate lockfiles",
            "approval audit trail plan does not run verification commands",
            "approval audit trail plan does not generate build output",
            "approval audit trail plan does not register runtime dispatch",
        ],
        requiredBeforeRuntimeDispatch: [
            "validate explicit approval token before writing audit records",
            "write append-only audit record without logging token value",
            "persist audit record with actor, scope hash, versions, decision, and timestamp",
            "grant final approval only after audit record write succeeds",
            "keep render.thumbnail unavailable until executable adapter registration is approved",
        ],
    };
}

export function createRenderThumbnailRendererServicePackageMaterializationApprovalReplayGuard(options = EMPTY_OBJECT) {
    const packageMaterializationApprovalAuditTrail = options.packageMaterializationApprovalAuditTrail ?? EMPTY_OBJECT;
    const packageMaterializationExplicitApprovalToken = options.packageMaterializationExplicitApprovalToken ?? EMPTY_OBJECT;
    const packageMaterializationFinalApprovalChecklist = options.packageMaterializationFinalApprovalChecklist ?? EMPTY_OBJECT;

    return {
        status: "planned-disabled",
        replayGuardVersion: "P25.43",
        adapter: "renderer-service",
        command: CommandDescriptors.RENDER_THUMBNAIL.id,
        dryRunOnly: true,
        approvalRequired: true,
        approved: false,
        finalApprovalGranted: false,
        replayGuardRequired: true,
        replayCheckPlanned: true,
        replayCheckExecuted: false,
        replayDetected: false,
        replayRejected: false,
        tokenAccepted: false,
        tokenStored: false,
        tokenValidated: false,
        tokenConsumed: false,
        tokenRevoked: false,
        nonceStored: false,
        scopeHashStored: false,
        executeNow: false,
        verifyNow: false,
        rollbackNow: false,
        dispatch: false,
        networkDispatch: false,
        runtimeRegistration: false,
        localFileWrites: false,
        hostStartup: false,
        processSpawn: false,
        packageCreated: false,
        workspaceMutation: false,
        scriptRunnable: false,
        fileMaterialization: false,
        lockfileMutation: false,
        rootPackageJsonMutation: false,
        pnpmWorkspaceMutation: false,
        commandExecution: false,
        buildOutput: false,
        packageScriptsRunnable: false,
        materializationApproved: false,
        materializationApprovedNow: false,
        filesWritten: false,
        rollbackExecuted: false,
        verificationExecuted: false,
        consumes: {
            packageMaterializationApprovalAuditTrail: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationApprovalAuditTrail.status ?? "planned-disabled",
                auditTrailVersion: packageMaterializationApprovalAuditTrail.auditTrailVersion ?? "P25.42",
                auditRecordWritten: false,
            },
            packageMaterializationExplicitApprovalToken: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationExplicitApprovalToken.status ?? "planned-disabled",
                tokenVersion: packageMaterializationExplicitApprovalToken.tokenVersion ?? "P25.41",
                tokenAccepted: false,
                tokenValidated: false,
            },
            packageMaterializationFinalApprovalChecklist: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationFinalApprovalChecklist.status ?? "planned-disabled",
                checklistVersion: packageMaterializationFinalApprovalChecklist.checklistVersion ?? "P25.40",
                finalApprovalGranted: false,
            },
        },
        replayGuardContract: {
            strategy: "one-time-token-with-scope-hash-and-nonce",
            checkNow: false,
            storeNonceNow: false,
            storeScopeHashNow: false,
            consumeTokenNow: false,
            rejectReplayNow: false,
            tokenValueLogged: false,
            requiredInputs: [
                "tokenId",
                "tokenNonce",
                "approvalScopeHash",
                "taskId",
                "userId",
                "expiresAt",
            ],
        },
        replayChecks: [
            {
                id: "nonce-not-seen",
                required: true,
                planned: true,
                executed: false,
                passed: false,
            },
            {
                id: "scope-hash-matches-token",
                required: true,
                planned: true,
                executed: false,
                passed: false,
            },
            {
                id: "token-not-consumed",
                required: true,
                planned: true,
                executed: false,
                passed: false,
            },
            {
                id: "token-not-expired",
                required: true,
                planned: true,
                executed: false,
                passed: false,
            },
        ],
        replayDecision: {
            status: "blocked",
            canCheckReplay: false,
            canRejectReplay: false,
            canConsumeToken: false,
            canAcceptToken: false,
            canGrantFinalApproval: false,
            canMaterializeFiles: false,
            canEnableRuntimeDispatch: false,
            reason: "replay guard is metadata-only and no token has been validated or consumed",
        },
        noOpGuarantees: [
            "approval replay guard plan does not execute replay checks",
            "approval replay guard plan does not store nonces",
            "approval replay guard plan does not store scope hashes",
            "approval replay guard plan does not consume or revoke tokens",
            "approval replay guard plan does not accept or validate tokens",
            "approval replay guard plan does not grant materialization approval",
            "approval replay guard plan does not create renderer-service directory",
            "approval replay guard plan does not write package or workspace files",
            "approval replay guard plan does not mutate lockfiles",
            "approval replay guard plan does not run verification commands",
            "approval replay guard plan does not generate build output",
            "approval replay guard plan does not register runtime dispatch",
        ],
        requiredBeforeRuntimeDispatch: [
            "validate explicit approval token before replay checks",
            "verify nonce and scope hash have not been consumed",
            "write replay outcome into approval audit trail without logging token value",
            "consume token only after replay guard passes",
            "keep render.thumbnail unavailable until executable adapter registration is approved",
        ],
    };
}

export function createRenderThumbnailRendererServicePackageMaterializationApprovalExpiryPolicy(options = EMPTY_OBJECT) {
    const packageMaterializationApprovalReplayGuard = options.packageMaterializationApprovalReplayGuard ?? EMPTY_OBJECT;
    const packageMaterializationExplicitApprovalToken = options.packageMaterializationExplicitApprovalToken ?? EMPTY_OBJECT;
    const packageMaterializationApprovalAuditTrail = options.packageMaterializationApprovalAuditTrail ?? EMPTY_OBJECT;

    return {
        status: "planned-disabled",
        expiryPolicyVersion: "P25.44",
        adapter: "renderer-service",
        command: CommandDescriptors.RENDER_THUMBNAIL.id,
        dryRunOnly: true,
        approvalRequired: true,
        approved: false,
        finalApprovalGranted: false,
        expiryPolicyRequired: true,
        expiryCheckPlanned: true,
        expiryCheckExecuted: false,
        tokenExpired: false,
        tokenNotBeforeChecked: false,
        tokenExpiresAtChecked: false,
        clockSkewChecked: false,
        tokenAccepted: false,
        tokenStored: false,
        tokenValidated: false,
        tokenConsumed: false,
        tokenRevoked: false,
        executeNow: false,
        verifyNow: false,
        rollbackNow: false,
        dispatch: false,
        networkDispatch: false,
        runtimeRegistration: false,
        localFileWrites: false,
        hostStartup: false,
        processSpawn: false,
        packageCreated: false,
        workspaceMutation: false,
        scriptRunnable: false,
        fileMaterialization: false,
        lockfileMutation: false,
        rootPackageJsonMutation: false,
        pnpmWorkspaceMutation: false,
        commandExecution: false,
        buildOutput: false,
        packageScriptsRunnable: false,
        materializationApproved: false,
        materializationApprovedNow: false,
        filesWritten: false,
        rollbackExecuted: false,
        verificationExecuted: false,
        consumes: {
            packageMaterializationApprovalReplayGuard: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationApprovalReplayGuard.status ?? "planned-disabled",
                replayGuardVersion: packageMaterializationApprovalReplayGuard.replayGuardVersion ?? "P25.43",
                replayCheckExecuted: false,
            },
            packageMaterializationExplicitApprovalToken: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationExplicitApprovalToken.status ?? "planned-disabled",
                tokenVersion: packageMaterializationExplicitApprovalToken.tokenVersion ?? "P25.41",
                tokenValidated: false,
            },
            packageMaterializationApprovalAuditTrail: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationApprovalAuditTrail.status ?? "planned-disabled",
                auditTrailVersion: packageMaterializationApprovalAuditTrail.auditTrailVersion ?? "P25.42",
                auditRecordWritten: false,
            },
        },
        expiryPolicy: {
            policy: "short-lived-explicit-approval-token",
            checkNow: false,
            validateIssuedAtNow: false,
            validateNotBeforeNow: false,
            validateExpiresAtNow: false,
            validateClockSkewNow: false,
            maxAgeSeconds: 900,
            allowedClockSkewSeconds: 60,
            requiredClaims: ["issuedAt", "notBefore", "expiresAt", "approvalScopeHash", "tokenId"],
            tokenValueLogged: false,
        },
        expiryChecks: [
            {
                id: "issued-at-present",
                required: true,
                planned: true,
                executed: false,
                passed: false,
            },
            {
                id: "not-before-satisfied",
                required: true,
                planned: true,
                executed: false,
                passed: false,
            },
            {
                id: "expires-at-in-future",
                required: true,
                planned: true,
                executed: false,
                passed: false,
            },
            {
                id: "max-age-not-exceeded",
                required: true,
                planned: true,
                executed: false,
                passed: false,
            },
            {
                id: "clock-skew-within-policy",
                required: true,
                planned: true,
                executed: false,
                passed: false,
            },
        ],
        expiryDecision: {
            status: "blocked",
            canCheckExpiry: false,
            canAcceptToken: false,
            canConsumeToken: false,
            canGrantFinalApproval: false,
            canMaterializeFiles: false,
            canEnableRuntimeDispatch: false,
            reason: "approval expiry policy is metadata-only and no token timestamps have been validated",
        },
        noOpGuarantees: [
            "approval expiry policy plan does not execute expiry checks",
            "approval expiry policy plan does not read or trust wall-clock time",
            "approval expiry policy plan does not accept or validate tokens",
            "approval expiry policy plan does not consume or revoke tokens",
            "approval expiry policy plan does not grant materialization approval",
            "approval expiry policy plan does not create renderer-service directory",
            "approval expiry policy plan does not write package or workspace files",
            "approval expiry policy plan does not mutate lockfiles",
            "approval expiry policy plan does not run verification commands",
            "approval expiry policy plan does not generate build output",
            "approval expiry policy plan does not register runtime dispatch",
        ],
        requiredBeforeRuntimeDispatch: [
            "validate token issuedAt/notBefore/expiresAt claims before replay guard",
            "enforce max token age and clock skew policy",
            "record expiry decision in approval audit trail without logging token value",
            "consume token only after expiry and replay policies pass",
            "keep render.thumbnail unavailable until executable adapter registration is approved",
        ],
    };
}

export function createRenderThumbnailRendererServicePackageMaterializationApprovalRevocationPolicy(options = EMPTY_OBJECT) {
    const packageMaterializationApprovalExpiryPolicy = options.packageMaterializationApprovalExpiryPolicy ?? EMPTY_OBJECT;
    const packageMaterializationApprovalReplayGuard = options.packageMaterializationApprovalReplayGuard ?? EMPTY_OBJECT;
    const packageMaterializationApprovalAuditTrail = options.packageMaterializationApprovalAuditTrail ?? EMPTY_OBJECT;

    return {
        status: "planned-disabled",
        revocationPolicyVersion: "P25.45",
        adapter: "renderer-service",
        command: CommandDescriptors.RENDER_THUMBNAIL.id,
        dryRunOnly: true,
        approvalRequired: true,
        approved: false,
        finalApprovalGranted: false,
        revocationPolicyRequired: true,
        revocationCheckPlanned: true,
        revocationCheckExecuted: false,
        revocationRegistryConfigured: false,
        revocationRegistryFetched: false,
        revocationStatusFetched: false,
        revocationStatusTrusted: false,
        tokenRevocationChecked: false,
        tokenRevoked: false,
        revokedTokenRejected: false,
        tokenAccepted: false,
        tokenStored: false,
        tokenValidated: false,
        tokenConsumed: false,
        executeNow: false,
        verifyNow: false,
        rollbackNow: false,
        dispatch: false,
        networkDispatch: false,
        runtimeRegistration: false,
        localFileWrites: false,
        hostStartup: false,
        processSpawn: false,
        packageCreated: false,
        workspaceMutation: false,
        scriptRunnable: false,
        fileMaterialization: false,
        lockfileMutation: false,
        rootPackageJsonMutation: false,
        pnpmWorkspaceMutation: false,
        commandExecution: false,
        buildOutput: false,
        packageScriptsRunnable: false,
        materializationApproved: false,
        materializationApprovedNow: false,
        filesWritten: false,
        rollbackExecuted: false,
        verificationExecuted: false,
        consumes: {
            packageMaterializationApprovalExpiryPolicy: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationApprovalExpiryPolicy.status ?? "planned-disabled",
                expiryPolicyVersion: packageMaterializationApprovalExpiryPolicy.expiryPolicyVersion ?? "P25.44",
                expiryCheckExecuted: false,
            },
            packageMaterializationApprovalReplayGuard: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationApprovalReplayGuard.status ?? "planned-disabled",
                replayGuardVersion: packageMaterializationApprovalReplayGuard.replayGuardVersion ?? "P25.43",
                replayCheckExecuted: false,
            },
            packageMaterializationApprovalAuditTrail: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationApprovalAuditTrail.status ?? "planned-disabled",
                auditTrailVersion: packageMaterializationApprovalAuditTrail.auditTrailVersion ?? "P25.42",
                auditRecordWritten: false,
            },
        },
        revocationPolicy: {
            policy: "deny-revoked-explicit-approval-token",
            checkNow: false,
            fetchRegistryNow: false,
            validateRevocationEpochNow: false,
            persistRevocationStateNow: false,
            rejectRevokedTokenNow: false,
            requiredInputs: ["tokenId", "approvalScopeHash", "issuer", "revocationEpoch"],
            registrySources: ["local-approval-ledger", "operator-revocation-list"],
            tokenValueLogged: false,
        },
        revocationChecks: [
            {
                id: "token-id-present",
                required: true,
                planned: true,
                executed: false,
                passed: false,
            },
            {
                id: "revocation-registry-available",
                required: true,
                planned: true,
                executed: false,
                passed: false,
            },
            {
                id: "token-not-revoked",
                required: true,
                planned: true,
                executed: false,
                passed: false,
            },
            {
                id: "revocation-epoch-current",
                required: true,
                planned: true,
                executed: false,
                passed: false,
            },
            {
                id: "audit-record-linked",
                required: true,
                planned: true,
                executed: false,
                passed: false,
            },
        ],
        revocationDecision: {
            status: "blocked",
            canCheckRevocation: false,
            canRejectRevokedToken: false,
            canAcceptToken: false,
            canConsumeToken: false,
            canGrantFinalApproval: false,
            canMaterializeFiles: false,
            canEnableRuntimeDispatch: false,
            reason: "approval revocation policy is metadata-only and no revocation registry has been checked",
        },
        noOpGuarantees: [
            "approval revocation policy plan does not execute revocation checks",
            "approval revocation policy plan does not fetch revocation registries",
            "approval revocation policy plan does not read or trust revocation state",
            "approval revocation policy plan does not persist revocation state",
            "approval revocation policy plan does not accept or validate tokens",
            "approval revocation policy plan does not consume tokens",
            "approval revocation policy plan does not grant materialization approval",
            "approval revocation policy plan does not create renderer-service directory",
            "approval revocation policy plan does not write package or workspace files",
            "approval revocation policy plan does not mutate lockfiles",
            "approval revocation policy plan does not run verification commands",
            "approval revocation policy plan does not generate build output",
            "approval revocation policy plan does not register runtime dispatch",
        ],
        requiredBeforeRuntimeDispatch: [
            "define revocation registry source and consistency guarantees",
            "check token id and approval scope hash against revocation state",
            "reject revoked tokens before replay guard consumption",
            "record revocation decision in approval audit trail without logging token value",
            "keep render.thumbnail unavailable until executable adapter registration is approved",
        ],
    };
}

export function createRenderThumbnailRendererServicePackageMaterializationApprovalScopeBindingPolicy(options = EMPTY_OBJECT) {
    const packageMaterializationApprovalRevocationPolicy = options.packageMaterializationApprovalRevocationPolicy ?? EMPTY_OBJECT;
    const packageMaterializationApprovalExpiryPolicy = options.packageMaterializationApprovalExpiryPolicy ?? EMPTY_OBJECT;
    const packageMaterializationFinalApprovalChecklist = options.packageMaterializationFinalApprovalChecklist ?? EMPTY_OBJECT;

    return {
        status: "planned-disabled",
        scopeBindingVersion: "P25.46",
        adapter: "renderer-service",
        command: CommandDescriptors.RENDER_THUMBNAIL.id,
        dryRunOnly: true,
        approvalRequired: true,
        approved: false,
        finalApprovalGranted: false,
        scopeBindingRequired: true,
        scopeBindingPlanned: true,
        scopeBindingExecuted: false,
        approvalScopeHashComputed: false,
        approvalScopeHashValidated: false,
        approvalScopeHashStored: false,
        targetScopeBound: false,
        commandScopeBound: false,
        workspaceScopeBound: false,
        packageScopeBound: false,
        fileSnapshotRead: false,
        workspaceHashComputed: false,
        packageManifestHashComputed: false,
        tokenScopeMatched: false,
        tokenAccepted: false,
        tokenStored: false,
        tokenValidated: false,
        tokenConsumed: false,
        tokenRevoked: false,
        executeNow: false,
        verifyNow: false,
        rollbackNow: false,
        dispatch: false,
        networkDispatch: false,
        runtimeRegistration: false,
        localFileWrites: false,
        hostStartup: false,
        processSpawn: false,
        packageCreated: false,
        workspaceMutation: false,
        scriptRunnable: false,
        fileMaterialization: false,
        lockfileMutation: false,
        rootPackageJsonMutation: false,
        pnpmWorkspaceMutation: false,
        commandExecution: false,
        buildOutput: false,
        packageScriptsRunnable: false,
        materializationApproved: false,
        materializationApprovedNow: false,
        filesWritten: false,
        rollbackExecuted: false,
        verificationExecuted: false,
        consumes: {
            packageMaterializationApprovalRevocationPolicy: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationApprovalRevocationPolicy.status ?? "planned-disabled",
                revocationPolicyVersion: packageMaterializationApprovalRevocationPolicy.revocationPolicyVersion ?? "P25.45",
                revocationCheckExecuted: false,
            },
            packageMaterializationApprovalExpiryPolicy: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationApprovalExpiryPolicy.status ?? "planned-disabled",
                expiryPolicyVersion: packageMaterializationApprovalExpiryPolicy.expiryPolicyVersion ?? "P25.44",
                expiryCheckExecuted: false,
            },
            packageMaterializationFinalApprovalChecklist: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationFinalApprovalChecklist.status ?? "planned-disabled",
                checklistVersion: packageMaterializationFinalApprovalChecklist.checklistVersion ?? "P25.40",
                finalApprovalGranted: false,
            },
        },
        scopeBindingPolicy: {
            policy: "bind-explicit-approval-token-to-renderer-package-scope",
            bindNow: false,
            computeApprovalScopeHashNow: false,
            validateApprovalScopeHashNow: false,
            readFileSnapshotNow: false,
            computeWorkspaceHashNow: false,
            computePackageManifestHashNow: false,
            persistScopeBindingNow: false,
            tokenValueLogged: false,
            requiredScopeFields: [
                "command",
                "adapter",
                "target",
                "packageManifest",
                "workspaceWiring",
                "approvalTokenId",
            ],
            hashAlgorithm: "sha256-planned",
        },
        scopeBindingChecks: [
            {
                id: "target-scope-declared",
                required: true,
                planned: true,
                executed: false,
                passed: false,
            },
            {
                id: "command-scope-declared",
                required: true,
                planned: true,
                executed: false,
                passed: false,
            },
            {
                id: "package-manifest-scope-declared",
                required: true,
                planned: true,
                executed: false,
                passed: false,
            },
            {
                id: "workspace-wiring-scope-declared",
                required: true,
                planned: true,
                executed: false,
                passed: false,
            },
            {
                id: "approval-scope-hash-matches-token",
                required: true,
                planned: true,
                executed: false,
                passed: false,
            },
        ],
        scopeBindingDecision: {
            status: "blocked",
            canBindScope: false,
            canComputeScopeHash: false,
            canValidateTokenScope: false,
            canAcceptToken: false,
            canConsumeToken: false,
            canGrantFinalApproval: false,
            canMaterializeFiles: false,
            canEnableRuntimeDispatch: false,
            reason: "approval scope binding policy is metadata-only and no approval scope hash has been computed",
        },
        noOpGuarantees: [
            "approval scope binding policy plan does not compute approval scope hashes",
            "approval scope binding policy plan does not read file snapshots",
            "approval scope binding policy plan does not hash workspace or package files",
            "approval scope binding policy plan does not persist scope bindings",
            "approval scope binding policy plan does not accept or validate tokens",
            "approval scope binding policy plan does not consume or revoke tokens",
            "approval scope binding policy plan does not grant materialization approval",
            "approval scope binding policy plan does not create renderer-service directory",
            "approval scope binding policy plan does not write package or workspace files",
            "approval scope binding policy plan does not mutate lockfiles",
            "approval scope binding policy plan does not run verification commands",
            "approval scope binding policy plan does not generate build output",
            "approval scope binding policy plan does not register runtime dispatch",
        ],
        requiredBeforeRuntimeDispatch: [
            "define canonical approval scope serialization",
            "compute approval scope hash from command, target, package, and workspace wiring",
            "validate token approvalScopeHash against the computed scope",
            "record scope binding decision in approval audit trail without logging token value",
            "keep render.thumbnail unavailable until executable adapter registration is approved",
        ],
    };
}

export function createRenderThumbnailRendererServicePackageMaterializationApprovalOperatorConfirmationPolicy(options = EMPTY_OBJECT) {
    const packageMaterializationApprovalScopeBindingPolicy = options.packageMaterializationApprovalScopeBindingPolicy ?? EMPTY_OBJECT;
    const packageMaterializationApprovalRevocationPolicy = options.packageMaterializationApprovalRevocationPolicy ?? EMPTY_OBJECT;
    const packageMaterializationFinalApprovalChecklist = options.packageMaterializationFinalApprovalChecklist ?? EMPTY_OBJECT;

    return {
        status: "planned-disabled",
        operatorConfirmationVersion: "P25.47",
        adapter: "renderer-service",
        command: CommandDescriptors.RENDER_THUMBNAIL.id,
        dryRunOnly: true,
        approvalRequired: true,
        approved: false,
        finalApprovalGranted: false,
        operatorConfirmationRequired: true,
        operatorConfirmationPlanned: true,
        operatorConfirmationPrompted: false,
        operatorConfirmationReceived: false,
        operatorConfirmationStored: false,
        operatorConfirmationValidated: false,
        operatorIdentityVerified: false,
        operatorIntentCaptured: false,
        confirmationAuditLinked: false,
        confirmationTokenIssued: false,
        tokenAccepted: false,
        tokenStored: false,
        tokenValidated: false,
        tokenConsumed: false,
        tokenRevoked: false,
        executeNow: false,
        verifyNow: false,
        rollbackNow: false,
        dispatch: false,
        networkDispatch: false,
        runtimeRegistration: false,
        localFileWrites: false,
        hostStartup: false,
        processSpawn: false,
        packageCreated: false,
        workspaceMutation: false,
        scriptRunnable: false,
        fileMaterialization: false,
        lockfileMutation: false,
        rootPackageJsonMutation: false,
        pnpmWorkspaceMutation: false,
        commandExecution: false,
        buildOutput: false,
        packageScriptsRunnable: false,
        materializationApproved: false,
        materializationApprovedNow: false,
        filesWritten: false,
        rollbackExecuted: false,
        verificationExecuted: false,
        consumes: {
            packageMaterializationApprovalScopeBindingPolicy: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationApprovalScopeBindingPolicy.status ?? "planned-disabled",
                scopeBindingVersion: packageMaterializationApprovalScopeBindingPolicy.scopeBindingVersion ?? "P25.46",
                scopeBindingExecuted: false,
            },
            packageMaterializationApprovalRevocationPolicy: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationApprovalRevocationPolicy.status ?? "planned-disabled",
                revocationPolicyVersion: packageMaterializationApprovalRevocationPolicy.revocationPolicyVersion ?? "P25.45",
                revocationCheckExecuted: false,
            },
            packageMaterializationFinalApprovalChecklist: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationFinalApprovalChecklist.status ?? "planned-disabled",
                checklistVersion: packageMaterializationFinalApprovalChecklist.checklistVersion ?? "P25.40",
                finalApprovalGranted: false,
            },
        },
        operatorConfirmationPolicy: {
            policy: "require-explicit-operator-confirmation",
            promptNow: false,
            acceptConfirmationNow: false,
            validateOperatorIdentityNow: false,
            persistConfirmationNow: false,
            issueConfirmationTokenNow: false,
            requiredInputs: ["operatorId", "confirmationIntent", "approvalScopeHash", "confirmedAt"],
            confirmationPhrase: "materialize renderer-service package",
            tokenValueLogged: false,
        },
        operatorConfirmationChecks: [
            { id: "operator-identity-present", required: true, planned: true, executed: false, passed: false },
            { id: "confirmation-intent-present", required: true, planned: true, executed: false, passed: false },
            { id: "approval-scope-visible-to-operator", required: true, planned: true, executed: false, passed: false },
            { id: "confirmation-audit-linked", required: true, planned: true, executed: false, passed: false },
            { id: "confirmation-token-not-issued", required: true, planned: true, executed: false, passed: false },
        ],
        operatorConfirmationDecision: {
            status: "blocked",
            canPromptOperator: false,
            canAcceptConfirmation: false,
            canValidateOperatorIdentity: false,
            canIssueConfirmationToken: false,
            canAcceptToken: false,
            canConsumeToken: false,
            canGrantFinalApproval: false,
            canMaterializeFiles: false,
            canEnableRuntimeDispatch: false,
            reason: "operator confirmation policy is metadata-only and no operator confirmation has been collected",
        },
        noOpGuarantees: [
            "operator confirmation policy plan does not prompt operators",
            "operator confirmation policy plan does not accept confirmations",
            "operator confirmation policy plan does not validate operator identity",
            "operator confirmation policy plan does not persist confirmation records",
            "operator confirmation policy plan does not issue confirmation tokens",
            "operator confirmation policy plan does not accept or validate tokens",
            "operator confirmation policy plan does not consume or revoke tokens",
            "operator confirmation policy plan does not grant materialization approval",
            "operator confirmation policy plan does not create renderer-service directory",
            "operator confirmation policy plan does not write package or workspace files",
            "operator confirmation policy plan does not mutate lockfiles",
            "operator confirmation policy plan does not run verification commands",
            "operator confirmation policy plan does not generate build output",
            "operator confirmation policy plan does not register runtime dispatch",
        ],
        requiredBeforeRuntimeDispatch: [
            "define operator identity source and confirmation phrase",
            "display computed approval scope to the operator before confirmation",
            "persist confirmation audit record without logging token value",
            "issue confirmation token only after operator identity and scope checks pass",
            "keep render.thumbnail unavailable until executable adapter registration is approved",
        ],
    };
}

export function createRenderThumbnailRendererServicePackageMaterializationApprovalEmergencyStopPolicy(options = EMPTY_OBJECT) {
    const packageMaterializationApprovalOperatorConfirmationPolicy = options.packageMaterializationApprovalOperatorConfirmationPolicy ?? EMPTY_OBJECT;
    const packageMaterializationApprovalRevocationPolicy = options.packageMaterializationApprovalRevocationPolicy ?? EMPTY_OBJECT;
    const packageMaterializationFinalApprovalChecklist = options.packageMaterializationFinalApprovalChecklist ?? EMPTY_OBJECT;

    return {
        status: "planned-disabled",
        emergencyStopVersion: "P25.48",
        adapter: "renderer-service",
        command: CommandDescriptors.RENDER_THUMBNAIL.id,
        dryRunOnly: true,
        approvalRequired: true,
        approved: false,
        finalApprovalGranted: false,
        emergencyStopRequired: true,
        emergencyStopPlanned: true,
        emergencyStopConfigured: false,
        emergencyStopChecked: false,
        emergencyStopFetched: false,
        emergencyStopStateRead: false,
        emergencyStopStateTrusted: false,
        emergencyStopActive: false,
        emergencyStopBypassAllowed: false,
        emergencyStopAuditLinked: false,
        emergencyStopReasonRecorded: false,
        stopRegistryConfigured: false,
        stopRegistryFetched: false,
        stopStatusFetched: false,
        stopStatusTrusted: false,
        stopSignalReceived: false,
        stopSignalRejected: false,
        stopOverrideAccepted: false,
        tokenAccepted: false,
        tokenStored: false,
        tokenValidated: false,
        tokenConsumed: false,
        tokenRevoked: false,
        executeNow: false,
        verifyNow: false,
        rollbackNow: false,
        dispatch: false,
        networkDispatch: false,
        runtimeRegistration: false,
        localFileWrites: false,
        hostStartup: false,
        processSpawn: false,
        packageCreated: false,
        workspaceMutation: false,
        scriptRunnable: false,
        fileMaterialization: false,
        lockfileMutation: false,
        rootPackageJsonMutation: false,
        pnpmWorkspaceMutation: false,
        commandExecution: false,
        buildOutput: false,
        packageScriptsRunnable: false,
        materializationApproved: false,
        materializationApprovedNow: false,
        filesWritten: false,
        rollbackExecuted: false,
        verificationExecuted: false,
        consumes: {
            packageMaterializationApprovalOperatorConfirmationPolicy: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationApprovalOperatorConfirmationPolicy.status ?? "planned-disabled",
                operatorConfirmationVersion: packageMaterializationApprovalOperatorConfirmationPolicy.operatorConfirmationVersion ?? "P25.47",
                operatorConfirmationReceived: false,
            },
            packageMaterializationApprovalRevocationPolicy: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationApprovalRevocationPolicy.status ?? "planned-disabled",
                revocationPolicyVersion: packageMaterializationApprovalRevocationPolicy.revocationPolicyVersion ?? "P25.45",
                revocationCheckExecuted: false,
            },
            packageMaterializationFinalApprovalChecklist: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationFinalApprovalChecklist.status ?? "planned-disabled",
                checklistVersion: packageMaterializationFinalApprovalChecklist.checklistVersion ?? "P25.40",
                finalApprovalGranted: false,
            },
        },
        emergencyStopPolicy: {
            policy: "deny-materialization-when-emergency-stop-is-active",
            checkNow: false,
            fetchRegistryNow: false,
            readStopStateNow: false,
            trustStopStateNow: false,
            allowBypassNow: false,
            persistStopDecisionNow: false,
            requiredInputs: ["stopSource", "scope", "checkedAt", "operatorId"],
            stopSource: "future-emergency-stop-registry",
            stopValueLogged: false,
        },
        emergencyStopChecks: [
            { id: "emergency-stop-source-configured", required: true, planned: true, executed: false, passed: false },
            { id: "emergency-stop-state-fetched", required: true, planned: true, executed: false, passed: false },
            { id: "emergency-stop-state-trusted", required: true, planned: true, executed: false, passed: false },
            { id: "emergency-stop-not-active", required: true, planned: true, executed: false, passed: false },
            { id: "emergency-stop-audit-linked", required: true, planned: true, executed: false, passed: false },
        ],
        emergencyStopDecision: {
            status: "blocked",
            canCheckEmergencyStop: false,
            canFetchStopRegistry: false,
            canReadStopState: false,
            canTrustStopState: false,
            canBypassEmergencyStop: false,
            canAcceptToken: false,
            canConsumeToken: false,
            canGrantFinalApproval: false,
            canMaterializeFiles: false,
            canEnableRuntimeDispatch: false,
            reason: "emergency stop policy is metadata-only and no trusted emergency stop state has been checked",
        },
        noOpGuarantees: [
            "emergency stop policy plan does not configure stop registries",
            "emergency stop policy plan does not fetch stop registries",
            "emergency stop policy plan does not read or trust emergency stop state",
            "emergency stop policy plan does not accept stop overrides",
            "emergency stop policy plan does not accept or validate tokens",
            "emergency stop policy plan does not consume or revoke tokens",
            "emergency stop policy plan does not grant materialization approval",
            "emergency stop policy plan does not create renderer-service directory",
            "emergency stop policy plan does not write package or workspace files",
            "emergency stop policy plan does not mutate lockfiles",
            "emergency stop policy plan does not run verification commands",
            "emergency stop policy plan does not generate build output",
            "emergency stop policy plan does not register runtime dispatch",
        ],
        requiredBeforeRuntimeDispatch: [
            "define emergency stop source and scope",
            "fetch and validate trusted emergency stop state before final approval",
            "record emergency stop decision in approval audit trail",
            "deny materialization when emergency stop is active",
            "keep render.thumbnail unavailable until executable adapter registration is approved",
        ],
    };
}

export function createRenderThumbnailRendererServicePackageMaterializationApprovalReadinessVerdictPolicy(options = EMPTY_OBJECT) {
    const packageMaterializationApprovalEmergencyStopPolicy = options.packageMaterializationApprovalEmergencyStopPolicy ?? EMPTY_OBJECT;
    const packageMaterializationApprovalOperatorConfirmationPolicy = options.packageMaterializationApprovalOperatorConfirmationPolicy ?? EMPTY_OBJECT;
    const packageMaterializationFinalApprovalChecklist = options.packageMaterializationFinalApprovalChecklist ?? EMPTY_OBJECT;

    return {
        status: "planned-disabled",
        readinessVerdictVersion: "P25.49",
        adapter: "renderer-service",
        command: CommandDescriptors.RENDER_THUMBNAIL.id,
        dryRunOnly: true,
        approvalRequired: true,
        approved: false,
        finalApprovalGranted: false,
        readinessVerdictRequired: true,
        readinessVerdictPlanned: true,
        readinessVerdictComputed: false,
        readinessVerdictStored: false,
        readinessVerdictTrusted: false,
        readinessVerdictApproved: false,
        readinessVerdictRejected: false,
        readinessVerdictAuditLinked: false,
        readinessInputsCollected: false,
        readinessInputsValidated: false,
        readinessBlockersEvaluated: false,
        readinessBlockersCleared: false,
        emergencyStopCleared: false,
        operatorConfirmationSatisfied: false,
        finalChecklistSatisfied: false,
        materializationReady: false,
        tokenAccepted: false,
        tokenStored: false,
        tokenValidated: false,
        tokenConsumed: false,
        tokenRevoked: false,
        executeNow: false,
        verifyNow: false,
        rollbackNow: false,
        dispatch: false,
        networkDispatch: false,
        runtimeRegistration: false,
        localFileWrites: false,
        hostStartup: false,
        processSpawn: false,
        packageCreated: false,
        workspaceMutation: false,
        scriptRunnable: false,
        fileMaterialization: false,
        lockfileMutation: false,
        rootPackageJsonMutation: false,
        pnpmWorkspaceMutation: false,
        commandExecution: false,
        buildOutput: false,
        packageScriptsRunnable: false,
        materializationApproved: false,
        materializationApprovedNow: false,
        filesWritten: false,
        rollbackExecuted: false,
        verificationExecuted: false,
        consumes: {
            packageMaterializationApprovalEmergencyStopPolicy: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationApprovalEmergencyStopPolicy.status ?? "planned-disabled",
                emergencyStopVersion: packageMaterializationApprovalEmergencyStopPolicy.emergencyStopVersion ?? "P25.48",
                emergencyStopChecked: false,
                emergencyStopStateTrusted: false,
            },
            packageMaterializationApprovalOperatorConfirmationPolicy: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationApprovalOperatorConfirmationPolicy.status ?? "planned-disabled",
                operatorConfirmationVersion: packageMaterializationApprovalOperatorConfirmationPolicy.operatorConfirmationVersion ?? "P25.47",
                operatorConfirmationReceived: false,
            },
            packageMaterializationFinalApprovalChecklist: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationFinalApprovalChecklist.status ?? "planned-disabled",
                checklistVersion: packageMaterializationFinalApprovalChecklist.checklistVersion ?? "P25.40",
                finalApprovalGranted: false,
            },
        },
        readinessVerdictPolicy: {
            policy: "require-all-materialization-approval-readiness-inputs",
            computeVerdictNow: false,
            validateInputsNow: false,
            evaluateBlockersNow: false,
            persistVerdictNow: false,
            trustVerdictNow: false,
            grantApprovalNow: false,
            requiredInputs: ["finalApprovalChecklist", "operatorConfirmation", "emergencyStopState", "approvalScope"],
            verdictValueLogged: false,
        },
        readinessVerdictChecks: [
            { id: "final-approval-checklist-satisfied", required: true, planned: true, executed: false, passed: false },
            { id: "operator-confirmation-satisfied", required: true, planned: true, executed: false, passed: false },
            { id: "emergency-stop-cleared", required: true, planned: true, executed: false, passed: false },
            { id: "approval-scope-bound", required: true, planned: true, executed: false, passed: false },
            { id: "readiness-verdict-audit-linked", required: true, planned: true, executed: false, passed: false },
        ],
        readinessVerdictDecision: {
            status: "blocked",
            canComputeVerdict: false,
            canValidateInputs: false,
            canEvaluateBlockers: false,
            canTrustVerdict: false,
            canGrantFinalApproval: false,
            canMaterializeFiles: false,
            canEnableRuntimeDispatch: false,
            reason: "readiness verdict policy is metadata-only and approval readiness inputs have not been validated",
        },
        noOpGuarantees: [
            "readiness verdict policy plan does not compute readiness verdicts",
            "readiness verdict policy plan does not validate readiness inputs",
            "readiness verdict policy plan does not evaluate blockers",
            "readiness verdict policy plan does not persist readiness verdicts",
            "readiness verdict policy plan does not grant materialization approval",
            "readiness verdict policy plan does not accept or validate tokens",
            "readiness verdict policy plan does not consume or revoke tokens",
            "readiness verdict policy plan does not create renderer-service directory",
            "readiness verdict policy plan does not write package or workspace files",
            "readiness verdict policy plan does not mutate lockfiles",
            "readiness verdict policy plan does not run verification commands",
            "readiness verdict policy plan does not generate build output",
            "readiness verdict policy plan does not register runtime dispatch",
        ],
        requiredBeforeRuntimeDispatch: [
            "define readiness verdict input schema",
            "validate final approval checklist, operator confirmation, emergency stop state, and approval scope",
            "record readiness verdict in approval audit trail",
            "grant materialization approval only after readiness verdict is trusted",
            "keep render.thumbnail unavailable until executable adapter registration is approved",
        ],
    };
}

export function createRenderThumbnailRendererServicePackageMaterializationApprovalExecutionHandoffPolicy(options = EMPTY_OBJECT) {
    const packageMaterializationApprovalReadinessVerdictPolicy = options.packageMaterializationApprovalReadinessVerdictPolicy ?? EMPTY_OBJECT;
    const packageMaterializationApprovalEmergencyStopPolicy = options.packageMaterializationApprovalEmergencyStopPolicy ?? EMPTY_OBJECT;
    const packageMaterializationFinalApprovalChecklist = options.packageMaterializationFinalApprovalChecklist ?? EMPTY_OBJECT;

    return {
        status: "planned-disabled",
        executionHandoffVersion: "P25.50",
        adapter: "renderer-service",
        command: CommandDescriptors.RENDER_THUMBNAIL.id,
        dryRunOnly: true,
        approvalRequired: true,
        approved: false,
        finalApprovalGranted: false,
        handoffRequired: true,
        handoffPlanned: true,
        handoffPrepared: false,
        handoffQueued: false,
        handoffAccepted: false,
        handoffStored: false,
        handoffValidated: false,
        executionJobCreated: false,
        executionJobQueued: false,
        executionJobDispatched: false,
        executionOwnerSelected: false,
        executionOwnerNotified: false,
        materializationReady: false,
        materializationApproved: false,
        materializationApprovedNow: false,
        tokenAccepted: false,
        tokenStored: false,
        tokenValidated: false,
        tokenConsumed: false,
        tokenRevoked: false,
        executeNow: false,
        verifyNow: false,
        rollbackNow: false,
        dispatch: false,
        networkDispatch: false,
        runtimeRegistration: false,
        localFileWrites: false,
        hostStartup: false,
        processSpawn: false,
        packageCreated: false,
        workspaceMutation: false,
        scriptRunnable: false,
        fileMaterialization: false,
        lockfileMutation: false,
        rootPackageJsonMutation: false,
        pnpmWorkspaceMutation: false,
        commandExecution: false,
        buildOutput: false,
        packageScriptsRunnable: false,
        filesWritten: false,
        rollbackExecuted: false,
        verificationExecuted: false,
        consumes: {
            packageMaterializationApprovalReadinessVerdictPolicy: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationApprovalReadinessVerdictPolicy.status ?? "planned-disabled",
                readinessVerdictVersion: packageMaterializationApprovalReadinessVerdictPolicy.readinessVerdictVersion ?? "P25.49",
                readinessVerdictTrusted: false,
                materializationReady: false,
            },
            packageMaterializationApprovalEmergencyStopPolicy: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationApprovalEmergencyStopPolicy.status ?? "planned-disabled",
                emergencyStopVersion: packageMaterializationApprovalEmergencyStopPolicy.emergencyStopVersion ?? "P25.48",
                emergencyStopChecked: false,
            },
            packageMaterializationFinalApprovalChecklist: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationFinalApprovalChecklist.status ?? "planned-disabled",
                checklistVersion: packageMaterializationFinalApprovalChecklist.checklistVersion ?? "P25.40",
                finalApprovalGranted: false,
            },
        },
        executionHandoffPolicy: {
            policy: "handoff-only-after-trusted-readiness-verdict",
            prepareHandoffNow: false,
            validateHandoffNow: false,
            persistHandoffNow: false,
            createExecutionJobNow: false,
            queueExecutionJobNow: false,
            dispatchExecutionNow: false,
            requiredInputs: ["trustedReadinessVerdict", "approvedPlanId", "operatorId", "handoffTarget"],
            handoffTarget: "future-materialization-executor",
            handoffPayloadLogged: false,
        },
        executionHandoffChecks: [
            { id: "trusted-readiness-verdict-present", required: true, planned: true, executed: false, passed: false },
            { id: "final-approval-granted", required: true, planned: true, executed: false, passed: false },
            { id: "emergency-stop-cleared", required: true, planned: true, executed: false, passed: false },
            { id: "handoff-target-declared", required: true, planned: true, executed: false, passed: false },
            { id: "execution-job-not-created", required: true, planned: true, executed: false, passed: false },
        ],
        executionHandoffDecision: {
            status: "blocked",
            canPrepareHandoff: false,
            canValidateHandoff: false,
            canPersistHandoff: false,
            canCreateExecutionJob: false,
            canQueueExecutionJob: false,
            canDispatchExecution: false,
            canMaterializeFiles: false,
            canEnableRuntimeDispatch: false,
            reason: "execution handoff policy is metadata-only and no trusted readiness verdict has been approved",
        },
        noOpGuarantees: [
            "execution handoff policy plan does not prepare execution handoffs",
            "execution handoff policy plan does not persist handoff records",
            "execution handoff policy plan does not create execution jobs",
            "execution handoff policy plan does not queue execution jobs",
            "execution handoff policy plan does not dispatch execution",
            "execution handoff policy plan does not accept or validate tokens",
            "execution handoff policy plan does not consume or revoke tokens",
            "execution handoff policy plan does not create renderer-service directory",
            "execution handoff policy plan does not write package or workspace files",
            "execution handoff policy plan does not mutate lockfiles",
            "execution handoff policy plan does not run verification commands",
            "execution handoff policy plan does not generate build output",
            "execution handoff policy plan does not register runtime dispatch",
        ],
        requiredBeforeRuntimeDispatch: [
            "define execution handoff payload schema",
            "require trusted readiness verdict before handoff",
            "persist handoff audit record before materialization",
            "create execution job only after final approval is trusted",
            "keep render.thumbnail unavailable until executable adapter registration is approved",
        ],
    };
}

export function createRenderThumbnailRendererServicePackageMaterializationApprovalPostHandoffAuditPolicy(options = EMPTY_OBJECT) {
    const packageMaterializationApprovalExecutionHandoffPolicy = options.packageMaterializationApprovalExecutionHandoffPolicy ?? EMPTY_OBJECT;
    const packageMaterializationApprovalReadinessVerdictPolicy = options.packageMaterializationApprovalReadinessVerdictPolicy ?? EMPTY_OBJECT;
    const packageMaterializationFinalApprovalChecklist = options.packageMaterializationFinalApprovalChecklist ?? EMPTY_OBJECT;

    return {
        status: "planned-disabled",
        postHandoffAuditVersion: "P25.51",
        adapter: "renderer-service",
        command: CommandDescriptors.RENDER_THUMBNAIL.id,
        dryRunOnly: true,
        approvalRequired: true,
        approved: false,
        finalApprovalGranted: false,
        auditRequired: true,
        auditPlanned: true,
        auditRecordPrepared: false,
        auditRecordValidated: false,
        auditRecordStored: false,
        auditRecordPublished: false,
        auditRecordExported: false,
        auditRecordWritten: false,
        auditTrailLinked: false,
        handoffSnapshotCaptured: false,
        executionJobSnapshotCaptured: false,
        auditSinkSelected: false,
        auditSinkNotified: false,
        materializationReady: false,
        materializationApproved: false,
        materializationApprovedNow: false,
        tokenAccepted: false,
        tokenStored: false,
        tokenValidated: false,
        tokenConsumed: false,
        tokenRevoked: false,
        executeNow: false,
        verifyNow: false,
        rollbackNow: false,
        dispatch: false,
        networkDispatch: false,
        runtimeRegistration: false,
        localFileWrites: false,
        hostStartup: false,
        processSpawn: false,
        packageCreated: false,
        workspaceMutation: false,
        scriptRunnable: false,
        fileMaterialization: false,
        lockfileMutation: false,
        rootPackageJsonMutation: false,
        pnpmWorkspaceMutation: false,
        commandExecution: false,
        buildOutput: false,
        packageScriptsRunnable: false,
        filesWritten: false,
        rollbackExecuted: false,
        verificationExecuted: false,
        consumes: {
            packageMaterializationApprovalExecutionHandoffPolicy: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationApprovalExecutionHandoffPolicy.status ?? "planned-disabled",
                executionHandoffVersion: packageMaterializationApprovalExecutionHandoffPolicy.executionHandoffVersion ?? "P25.50",
                handoffAccepted: false,
                executionJobCreated: false,
            },
            packageMaterializationApprovalReadinessVerdictPolicy: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationApprovalReadinessVerdictPolicy.status ?? "planned-disabled",
                readinessVerdictVersion: packageMaterializationApprovalReadinessVerdictPolicy.readinessVerdictVersion ?? "P25.49",
                readinessVerdictTrusted: false,
                materializationReady: false,
            },
            packageMaterializationFinalApprovalChecklist: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationFinalApprovalChecklist.status ?? "planned-disabled",
                checklistVersion: packageMaterializationFinalApprovalChecklist.checklistVersion ?? "P25.40",
                finalApprovalGranted: false,
            },
        },
        postHandoffAuditPolicy: {
            policy: "audit-only-after-execution-handoff-accepted",
            prepareAuditNow: false,
            validateAuditNow: false,
            storeAuditNow: false,
            publishAuditNow: false,
            exportAuditNow: false,
            writeAuditNow: false,
            requiredInputs: ["acceptedExecutionHandoff", "trustedReadinessVerdict", "approvedPlanId", "auditSink"],
            auditSink: "future-materialization-audit-log",
            auditPayloadLogged: false,
        },
        postHandoffAuditChecks: [
            { id: "execution-handoff-accepted", required: true, planned: true, executed: false, passed: false },
            { id: "trusted-readiness-verdict-present", required: true, planned: true, executed: false, passed: false },
            { id: "final-approval-granted", required: true, planned: true, executed: false, passed: false },
            { id: "audit-sink-declared", required: true, planned: true, executed: false, passed: false },
            { id: "audit-record-not-written", required: true, planned: true, executed: false, passed: false },
        ],
        postHandoffAuditDecision: {
            status: "blocked",
            canPrepareAudit: false,
            canValidateAudit: false,
            canStoreAudit: false,
            canPublishAudit: false,
            canExportAudit: false,
            canWriteAudit: false,
            canCreateExecutionJob: false,
            canDispatchExecution: false,
            canMaterializeFiles: false,
            canEnableRuntimeDispatch: false,
            reason: "post-handoff audit policy is metadata-only and no execution handoff has been accepted",
        },
        noOpGuarantees: [
            "post-handoff audit policy plan does not prepare audit records",
            "post-handoff audit policy plan does not validate audit records",
            "post-handoff audit policy plan does not store audit records",
            "post-handoff audit policy plan does not publish audit records",
            "post-handoff audit policy plan does not export audit records",
            "post-handoff audit policy plan does not write audit records",
            "post-handoff audit policy plan does not create execution jobs",
            "post-handoff audit policy plan does not dispatch execution",
            "post-handoff audit policy plan does not accept or validate tokens",
            "post-handoff audit policy plan does not consume or revoke tokens",
            "post-handoff audit policy plan does not create renderer-service directory",
            "post-handoff audit policy plan does not write package or workspace files",
            "post-handoff audit policy plan does not mutate lockfiles",
            "post-handoff audit policy plan does not run verification commands",
            "post-handoff audit policy plan does not generate build output",
            "post-handoff audit policy plan does not register runtime dispatch",
        ],
        requiredBeforeRuntimeDispatch: [
            "define post-handoff audit record schema",
            "require accepted execution handoff before audit",
            "persist audit record only after handoff acceptance is trusted",
            "link audit trail before materialization",
            "keep render.thumbnail unavailable until executable adapter registration is approved",
        ],
    };
}

export function createRenderThumbnailRendererServicePackageMaterializationApprovalAuditRetentionPolicy(options = EMPTY_OBJECT) {
    const packageMaterializationApprovalPostHandoffAuditPolicy = options.packageMaterializationApprovalPostHandoffAuditPolicy ?? EMPTY_OBJECT;
    const packageMaterializationApprovalExecutionHandoffPolicy = options.packageMaterializationApprovalExecutionHandoffPolicy ?? EMPTY_OBJECT;
    const packageMaterializationFinalApprovalChecklist = options.packageMaterializationFinalApprovalChecklist ?? EMPTY_OBJECT;

    return {
        status: "planned-disabled",
        auditRetentionVersion: "P25.52",
        adapter: "renderer-service",
        command: CommandDescriptors.RENDER_THUMBNAIL.id,
        dryRunOnly: true,
        approvalRequired: true,
        approved: false,
        finalApprovalGranted: false,
        retentionRequired: true,
        retentionPlanned: true,
        retentionPolicySelected: false,
        retentionWindowComputed: false,
        retentionClockTrusted: false,
        retentionRecordStored: false,
        retentionIndexUpdated: false,
        archivePrepared: false,
        archiveStored: false,
        purgeScheduled: false,
        purgeExecuted: false,
        exportPrepared: false,
        exportWritten: false,
        auditRecordWritten: false,
        auditRecordStored: false,
        auditRecordExported: false,
        materializationReady: false,
        materializationApproved: false,
        materializationApprovedNow: false,
        tokenAccepted: false,
        tokenStored: false,
        tokenValidated: false,
        tokenConsumed: false,
        tokenRevoked: false,
        executeNow: false,
        verifyNow: false,
        rollbackNow: false,
        dispatch: false,
        networkDispatch: false,
        runtimeRegistration: false,
        localFileWrites: false,
        hostStartup: false,
        processSpawn: false,
        packageCreated: false,
        workspaceMutation: false,
        scriptRunnable: false,
        fileMaterialization: false,
        lockfileMutation: false,
        rootPackageJsonMutation: false,
        pnpmWorkspaceMutation: false,
        commandExecution: false,
        buildOutput: false,
        packageScriptsRunnable: false,
        filesWritten: false,
        rollbackExecuted: false,
        verificationExecuted: false,
        consumes: {
            packageMaterializationApprovalPostHandoffAuditPolicy: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationApprovalPostHandoffAuditPolicy.status ?? "planned-disabled",
                postHandoffAuditVersion: packageMaterializationApprovalPostHandoffAuditPolicy.postHandoffAuditVersion ?? "P25.51",
                auditRecordWritten: false,
                auditRecordStored: false,
            },
            packageMaterializationApprovalExecutionHandoffPolicy: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationApprovalExecutionHandoffPolicy.status ?? "planned-disabled",
                executionHandoffVersion: packageMaterializationApprovalExecutionHandoffPolicy.executionHandoffVersion ?? "P25.50",
                handoffAccepted: false,
                executionJobCreated: false,
            },
            packageMaterializationFinalApprovalChecklist: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationFinalApprovalChecklist.status ?? "planned-disabled",
                checklistVersion: packageMaterializationFinalApprovalChecklist.checklistVersion ?? "P25.40",
                finalApprovalGranted: false,
            },
        },
        auditRetentionPolicy: {
            policy: "retain-after-post-handoff-audit-record-written",
            selectRetentionNow: false,
            computeRetentionWindowNow: false,
            trustRetentionClockNow: false,
            storeRetentionRecordNow: false,
            updateRetentionIndexNow: false,
            prepareArchiveNow: false,
            storeArchiveNow: false,
            schedulePurgeNow: false,
            executePurgeNow: false,
            prepareExportNow: false,
            writeExportNow: false,
            requiredInputs: ["writtenPostHandoffAuditRecord", "approvedPlanId", "retentionPolicyId", "retentionClock"],
            retentionPolicyId: "future-materialization-audit-retention",
            retentionWindow: "future-policy-defined",
            retentionPayloadLogged: false,
        },
        auditRetentionChecks: [
            { id: "post-handoff-audit-record-written", required: true, planned: true, executed: false, passed: false },
            { id: "retention-policy-selected", required: true, planned: true, executed: false, passed: false },
            { id: "retention-clock-trusted", required: true, planned: true, executed: false, passed: false },
            { id: "retention-record-not-stored", required: true, planned: true, executed: false, passed: false },
            { id: "purge-not-scheduled", required: true, planned: true, executed: false, passed: false },
        ],
        auditRetentionDecision: {
            status: "blocked",
            canSelectRetentionPolicy: false,
            canComputeRetentionWindow: false,
            canTrustRetentionClock: false,
            canStoreRetentionRecord: false,
            canUpdateRetentionIndex: false,
            canPrepareArchive: false,
            canStoreArchive: false,
            canSchedulePurge: false,
            canExecutePurge: false,
            canPrepareExport: false,
            canWriteExport: false,
            canMaterializeFiles: false,
            canEnableRuntimeDispatch: false,
            reason: "audit retention policy is metadata-only and no post-handoff audit record has been written",
        },
        noOpGuarantees: [
            "audit retention policy plan does not select retention policies",
            "audit retention policy plan does not compute retention windows",
            "audit retention policy plan does not trust retention clocks",
            "audit retention policy plan does not store retention records",
            "audit retention policy plan does not update retention indexes",
            "audit retention policy plan does not prepare or store archives",
            "audit retention policy plan does not schedule or execute purges",
            "audit retention policy plan does not prepare or write exports",
            "audit retention policy plan does not write audit records",
            "audit retention policy plan does not create renderer-service directory",
            "audit retention policy plan does not write package or workspace files",
            "audit retention policy plan does not mutate lockfiles",
            "audit retention policy plan does not run verification commands",
            "audit retention policy plan does not generate build output",
            "audit retention policy plan does not register runtime dispatch",
        ],
        requiredBeforeRuntimeDispatch: [
            "define audit retention policy schema",
            "require written post-handoff audit record before retention",
            "define trusted retention clock source",
            "define archive and purge safety semantics",
            "keep render.thumbnail unavailable until executable adapter registration is approved",
        ],
    };
}

export function createRenderThumbnailRendererServicePackageMaterializationApprovalAuditAccessPolicy(options = EMPTY_OBJECT) {
    const packageMaterializationApprovalAuditRetentionPolicy = options.packageMaterializationApprovalAuditRetentionPolicy ?? EMPTY_OBJECT;
    const packageMaterializationApprovalPostHandoffAuditPolicy = options.packageMaterializationApprovalPostHandoffAuditPolicy ?? EMPTY_OBJECT;
    const packageMaterializationFinalApprovalChecklist = options.packageMaterializationFinalApprovalChecklist ?? EMPTY_OBJECT;

    return {
        status: "planned-disabled",
        auditAccessVersion: "P25.53",
        adapter: "renderer-service",
        command: CommandDescriptors.RENDER_THUMBNAIL.id,
        dryRunOnly: true,
        approvalRequired: true,
        approved: false,
        finalApprovalGranted: false,
        accessRequired: true,
        accessPlanned: true,
        accessPolicySelected: false,
        accessSubjectIdentified: false,
        accessScopeComputed: false,
        accessScopeValidated: false,
        accessDecisionComputed: false,
        accessDecisionStored: false,
        accessGranted: false,
        accessDenied: false,
        auditRecordRead: false,
        auditRecordQueried: false,
        auditRecordExported: false,
        auditRecordDownloaded: false,
        auditRecordRedacted: false,
        auditRecordSigned: false,
        auditRecordShared: false,
        accessTokenIssued: false,
        accessTokenAccepted: false,
        accessTokenStored: false,
        accessTokenValidated: false,
        accessTokenConsumed: false,
        accessTokenRevoked: false,
        materializationReady: false,
        materializationApproved: false,
        materializationApprovedNow: false,
        tokenAccepted: false,
        tokenStored: false,
        tokenValidated: false,
        tokenConsumed: false,
        tokenRevoked: false,
        executeNow: false,
        verifyNow: false,
        rollbackNow: false,
        dispatch: false,
        networkDispatch: false,
        runtimeRegistration: false,
        localFileWrites: false,
        hostStartup: false,
        processSpawn: false,
        packageCreated: false,
        workspaceMutation: false,
        scriptRunnable: false,
        fileMaterialization: false,
        lockfileMutation: false,
        rootPackageJsonMutation: false,
        pnpmWorkspaceMutation: false,
        commandExecution: false,
        buildOutput: false,
        packageScriptsRunnable: false,
        filesWritten: false,
        rollbackExecuted: false,
        verificationExecuted: false,
        consumes: {
            packageMaterializationApprovalAuditRetentionPolicy: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationApprovalAuditRetentionPolicy.status ?? "planned-disabled",
                auditRetentionVersion: packageMaterializationApprovalAuditRetentionPolicy.auditRetentionVersion ?? "P25.52",
                retentionRecordStored: false,
                auditRecordWritten: false,
            },
            packageMaterializationApprovalPostHandoffAuditPolicy: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationApprovalPostHandoffAuditPolicy.status ?? "planned-disabled",
                postHandoffAuditVersion: packageMaterializationApprovalPostHandoffAuditPolicy.postHandoffAuditVersion ?? "P25.51",
                auditRecordWritten: false,
                auditRecordStored: false,
            },
            packageMaterializationFinalApprovalChecklist: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationFinalApprovalChecklist.status ?? "planned-disabled",
                checklistVersion: packageMaterializationFinalApprovalChecklist.checklistVersion ?? "P25.40",
                finalApprovalGranted: false,
            },
        },
        auditAccessPolicy: {
            policy: "access-after-retained-audit-record-and-authorized-subject",
            selectAccessPolicyNow: false,
            identifyAccessSubjectNow: false,
            computeAccessScopeNow: false,
            validateAccessScopeNow: false,
            computeAccessDecisionNow: false,
            storeAccessDecisionNow: false,
            grantAccessNow: false,
            denyAccessNow: false,
            readAuditRecordNow: false,
            queryAuditRecordNow: false,
            exportAuditRecordNow: false,
            downloadAuditRecordNow: false,
            redactAuditRecordNow: false,
            signAuditRecordNow: false,
            shareAuditRecordNow: false,
            issueAccessTokenNow: false,
            requiredInputs: ["retainedAuditRecord", "authorizedSubject", "auditAccessScope", "accessPolicyId"],
            accessPolicyId: "future-materialization-audit-access",
            accessScope: "future-policy-defined",
            accessPayloadLogged: false,
        },
        auditAccessChecks: [
            { id: "retained-audit-record-present", required: true, planned: true, executed: false, passed: false },
            { id: "access-policy-selected", required: true, planned: true, executed: false, passed: false },
            { id: "access-subject-identified", required: true, planned: true, executed: false, passed: false },
            { id: "access-scope-validated", required: true, planned: true, executed: false, passed: false },
            { id: "audit-record-not-read", required: true, planned: true, executed: false, passed: false },
        ],
        auditAccessDecision: {
            status: "blocked",
            canSelectAccessPolicy: false,
            canIdentifyAccessSubject: false,
            canComputeAccessScope: false,
            canValidateAccessScope: false,
            canComputeAccessDecision: false,
            canStoreAccessDecision: false,
            canGrantAccess: false,
            canDenyAccess: false,
            canReadAuditRecord: false,
            canQueryAuditRecord: false,
            canExportAuditRecord: false,
            canDownloadAuditRecord: false,
            canRedactAuditRecord: false,
            canSignAuditRecord: false,
            canShareAuditRecord: false,
            canIssueAccessToken: false,
            canMaterializeFiles: false,
            canEnableRuntimeDispatch: false,
            reason: "audit access policy is metadata-only and no retained audit record or authorized subject has been established",
        },
        noOpGuarantees: [
            "audit access policy plan does not select access policies",
            "audit access policy plan does not identify access subjects",
            "audit access policy plan does not compute or validate access scopes",
            "audit access policy plan does not compute or store access decisions",
            "audit access policy plan does not grant or deny access",
            "audit access policy plan does not read or query audit records",
            "audit access policy plan does not export, download, redact, sign, or share audit records",
            "audit access policy plan does not issue access tokens",
            "audit access policy plan does not create renderer-service directory",
            "audit access policy plan does not write package or workspace files",
            "audit access policy plan does not mutate lockfiles",
            "audit access policy plan does not run verification commands",
            "audit access policy plan does not generate build output",
            "audit access policy plan does not register runtime dispatch",
        ],
        requiredBeforeRuntimeDispatch: [
            "define audit access policy schema",
            "require retained audit record before audit access",
            "define authorized subject and access scope semantics",
            "define audit record redaction and export safety semantics",
            "keep render.thumbnail unavailable until executable adapter registration is approved",
        ],
    };
}

export function createRenderThumbnailRendererServicePackageMaterializationApprovalAuditIntegrityPolicy(options = EMPTY_OBJECT) {
    const packageMaterializationApprovalAuditAccessPolicy = options.packageMaterializationApprovalAuditAccessPolicy ?? EMPTY_OBJECT;
    const packageMaterializationApprovalAuditRetentionPolicy = options.packageMaterializationApprovalAuditRetentionPolicy ?? EMPTY_OBJECT;
    const packageMaterializationFinalApprovalChecklist = options.packageMaterializationFinalApprovalChecklist ?? EMPTY_OBJECT;

    return {
        status: "planned-disabled",
        auditIntegrityVersion: "P25.54",
        adapter: "renderer-service",
        command: CommandDescriptors.RENDER_THUMBNAIL.id,
        dryRunOnly: true,
        approvalRequired: true,
        approved: false,
        finalApprovalGranted: false,
        integrityRequired: true,
        integrityPlanned: true,
        integrityPolicySelected: false,
        integritySubjectIdentified: false,
        integrityScopeComputed: false,
        integrityHashComputed: false,
        integrityHashStored: false,
        integrityHashVerified: false,
        integritySignatureCreated: false,
        integritySignatureVerified: false,
        integrityChainLinked: false,
        integrityChainVerified: false,
        auditRecordRead: false,
        auditRecordHashed: false,
        auditRecordVerified: false,
        auditRecordSigned: false,
        auditRecordSealed: false,
        auditRecordTamperChecked: false,
        auditRecordTamperDetected: false,
        auditRecordIntegrityStored: false,
        materializationReady: false,
        materializationApproved: false,
        materializationApprovedNow: false,
        tokenAccepted: false,
        tokenStored: false,
        tokenValidated: false,
        tokenConsumed: false,
        tokenRevoked: false,
        executeNow: false,
        verifyNow: false,
        rollbackNow: false,
        dispatch: false,
        networkDispatch: false,
        runtimeRegistration: false,
        localFileWrites: false,
        hostStartup: false,
        processSpawn: false,
        packageCreated: false,
        workspaceMutation: false,
        scriptRunnable: false,
        fileMaterialization: false,
        lockfileMutation: false,
        rootPackageJsonMutation: false,
        pnpmWorkspaceMutation: false,
        commandExecution: false,
        buildOutput: false,
        packageScriptsRunnable: false,
        filesWritten: false,
        rollbackExecuted: false,
        verificationExecuted: false,
        consumes: {
            packageMaterializationApprovalAuditAccessPolicy: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationApprovalAuditAccessPolicy.status ?? "planned-disabled",
                auditAccessVersion: packageMaterializationApprovalAuditAccessPolicy.auditAccessVersion ?? "P25.53",
                auditRecordRead: false,
                accessGranted: false,
            },
            packageMaterializationApprovalAuditRetentionPolicy: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationApprovalAuditRetentionPolicy.status ?? "planned-disabled",
                auditRetentionVersion: packageMaterializationApprovalAuditRetentionPolicy.auditRetentionVersion ?? "P25.52",
                retentionRecordStored: false,
                auditRecordWritten: false,
            },
            packageMaterializationFinalApprovalChecklist: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationFinalApprovalChecklist.status ?? "planned-disabled",
                checklistVersion: packageMaterializationFinalApprovalChecklist.checklistVersion ?? "P25.40",
                finalApprovalGranted: false,
            },
        },
        auditIntegrityPolicy: {
            policy: "verify-retained-audit-record-integrity-before-access",
            selectIntegrityPolicyNow: false,
            identifyIntegritySubjectNow: false,
            computeIntegrityScopeNow: false,
            computeIntegrityHashNow: false,
            storeIntegrityHashNow: false,
            verifyIntegrityHashNow: false,
            createIntegritySignatureNow: false,
            verifyIntegritySignatureNow: false,
            linkIntegrityChainNow: false,
            verifyIntegrityChainNow: false,
            readAuditRecordNow: false,
            hashAuditRecordNow: false,
            verifyAuditRecordNow: false,
            signAuditRecordNow: false,
            sealAuditRecordNow: false,
            checkTamperNow: false,
            storeIntegrityRecordNow: false,
            requiredInputs: ["retainedAuditRecord", "auditAccessGrant", "integrityPolicyId", "trustedDigestAlgorithm"],
            integrityPolicyId: "future-materialization-audit-integrity",
            digestAlgorithm: "future-policy-defined",
            integrityPayloadLogged: false,
        },
        auditIntegrityChecks: [
            { id: "retained-audit-record-present", required: true, planned: true, executed: false, passed: false },
            { id: "audit-access-granted", required: true, planned: true, executed: false, passed: false },
            { id: "integrity-policy-selected", required: true, planned: true, executed: false, passed: false },
            { id: "audit-record-not-read", required: true, planned: true, executed: false, passed: false },
            { id: "integrity-hash-not-computed", required: true, planned: true, executed: false, passed: false },
        ],
        auditIntegrityDecision: {
            status: "blocked",
            canSelectIntegrityPolicy: false,
            canIdentifyIntegritySubject: false,
            canComputeIntegrityScope: false,
            canComputeIntegrityHash: false,
            canStoreIntegrityHash: false,
            canVerifyIntegrityHash: false,
            canCreateIntegritySignature: false,
            canVerifyIntegritySignature: false,
            canLinkIntegrityChain: false,
            canVerifyIntegrityChain: false,
            canReadAuditRecord: false,
            canHashAuditRecord: false,
            canVerifyAuditRecord: false,
            canSignAuditRecord: false,
            canSealAuditRecord: false,
            canCheckTamper: false,
            canStoreIntegrityRecord: false,
            canMaterializeFiles: false,
            canEnableRuntimeDispatch: false,
            reason: "audit integrity policy is metadata-only and no retained audit record or access grant has been established",
        },
        noOpGuarantees: [
            "audit integrity policy plan does not select integrity policies",
            "audit integrity policy plan does not identify integrity subjects",
            "audit integrity policy plan does not compute integrity scopes",
            "audit integrity policy plan does not read audit records",
            "audit integrity policy plan does not hash or verify audit records",
            "audit integrity policy plan does not create or verify signatures",
            "audit integrity policy plan does not link or verify integrity chains",
            "audit integrity policy plan does not seal audit records or check tamper state",
            "audit integrity policy plan does not store integrity records",
            "audit integrity policy plan does not create renderer-service directory",
            "audit integrity policy plan does not write package or workspace files",
            "audit integrity policy plan does not mutate lockfiles",
            "audit integrity policy plan does not run verification commands",
            "audit integrity policy plan does not generate build output",
            "audit integrity policy plan does not register runtime dispatch",
        ],
        requiredBeforeRuntimeDispatch: [
            "define audit integrity policy schema",
            "require retained audit record and access grant before integrity verification",
            "define trusted digest and signature algorithms",
            "define integrity chain and tamper evidence semantics",
            "keep render.thumbnail unavailable until executable adapter registration is approved",
        ],
    };
}

export function createRenderThumbnailRendererServicePackageMaterializationApprovalAuditProvenancePolicy(options = EMPTY_OBJECT) {
    const packageMaterializationApprovalAuditIntegrityPolicy = options.packageMaterializationApprovalAuditIntegrityPolicy ?? EMPTY_OBJECT;
    const packageMaterializationApprovalAuditAccessPolicy = options.packageMaterializationApprovalAuditAccessPolicy ?? EMPTY_OBJECT;
    const packageMaterializationFinalApprovalChecklist = options.packageMaterializationFinalApprovalChecklist ?? EMPTY_OBJECT;

    return {
        status: "planned-disabled",
        auditProvenanceVersion: "P25.55",
        adapter: "renderer-service",
        command: CommandDescriptors.RENDER_THUMBNAIL.id,
        dryRunOnly: true,
        approvalRequired: true,
        approved: false,
        finalApprovalGranted: false,
        provenanceRequired: true,
        provenancePlanned: true,
        provenancePolicySelected: false,
        provenanceSubjectIdentified: false,
        provenanceSourceCollected: false,
        provenanceSourceValidated: false,
        provenanceGraphComputed: false,
        provenanceGraphStored: false,
        provenanceChainLinked: false,
        provenanceChainVerified: false,
        provenanceRecordCreated: false,
        provenanceRecordStored: false,
        provenanceRecordPublished: false,
        auditRecordRead: false,
        auditRecordQueried: false,
        auditRecordProvenanceLinked: false,
        auditRecordProvenanceVerified: false,
        provenanceSignatureCreated: false,
        provenanceSignatureVerified: false,
        provenanceHashComputed: false,
        provenanceHashStored: false,
        materializationReady: false,
        materializationApproved: false,
        materializationApprovedNow: false,
        tokenAccepted: false,
        tokenStored: false,
        tokenValidated: false,
        tokenConsumed: false,
        tokenRevoked: false,
        executeNow: false,
        verifyNow: false,
        rollbackNow: false,
        dispatch: false,
        networkDispatch: false,
        runtimeRegistration: false,
        localFileWrites: false,
        hostStartup: false,
        processSpawn: false,
        packageCreated: false,
        workspaceMutation: false,
        scriptRunnable: false,
        fileMaterialization: false,
        lockfileMutation: false,
        rootPackageJsonMutation: false,
        pnpmWorkspaceMutation: false,
        commandExecution: false,
        buildOutput: false,
        packageScriptsRunnable: false,
        filesWritten: false,
        rollbackExecuted: false,
        verificationExecuted: false,
        consumes: {
            packageMaterializationApprovalAuditIntegrityPolicy: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationApprovalAuditIntegrityPolicy.status ?? "planned-disabled",
                auditIntegrityVersion: packageMaterializationApprovalAuditIntegrityPolicy.auditIntegrityVersion ?? "P25.54",
                auditRecordVerified: false,
                integrityHashVerified: false,
            },
            packageMaterializationApprovalAuditAccessPolicy: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationApprovalAuditAccessPolicy.status ?? "planned-disabled",
                auditAccessVersion: packageMaterializationApprovalAuditAccessPolicy.auditAccessVersion ?? "P25.53",
                auditRecordRead: false,
                accessGranted: false,
            },
            packageMaterializationFinalApprovalChecklist: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationFinalApprovalChecklist.status ?? "planned-disabled",
                checklistVersion: packageMaterializationFinalApprovalChecklist.checklistVersion ?? "P25.40",
                finalApprovalGranted: false,
            },
        },
        auditProvenancePolicy: {
            policy: "track-provenance-after-integrity-verified-audit-record",
            selectProvenancePolicyNow: false,
            identifyProvenanceSubjectNow: false,
            collectProvenanceSourceNow: false,
            validateProvenanceSourceNow: false,
            computeProvenanceGraphNow: false,
            storeProvenanceGraphNow: false,
            linkProvenanceChainNow: false,
            verifyProvenanceChainNow: false,
            createProvenanceRecordNow: false,
            storeProvenanceRecordNow: false,
            publishProvenanceRecordNow: false,
            readAuditRecordNow: false,
            queryAuditRecordNow: false,
            linkAuditRecordProvenanceNow: false,
            verifyAuditRecordProvenanceNow: false,
            signProvenanceNow: false,
            verifyProvenanceSignatureNow: false,
            computeProvenanceHashNow: false,
            storeProvenanceHashNow: false,
            requiredInputs: ["verifiedAuditRecord", "auditAccessGrant", "provenancePolicyId", "trustedProvenanceSource"],
            provenancePolicyId: "future-materialization-audit-provenance",
            provenanceScope: "future-policy-defined",
            provenancePayloadLogged: false,
        },
        auditProvenanceChecks: [
            { id: "verified-audit-record-present", required: true, planned: true, executed: false, passed: false },
            { id: "audit-access-granted", required: true, planned: true, executed: false, passed: false },
            { id: "provenance-policy-selected", required: true, planned: true, executed: false, passed: false },
            { id: "provenance-source-not-collected", required: true, planned: true, executed: false, passed: false },
            { id: "provenance-record-not-created", required: true, planned: true, executed: false, passed: false },
        ],
        auditProvenanceDecision: {
            status: "blocked",
            canSelectProvenancePolicy: false,
            canIdentifyProvenanceSubject: false,
            canCollectProvenanceSource: false,
            canValidateProvenanceSource: false,
            canComputeProvenanceGraph: false,
            canStoreProvenanceGraph: false,
            canLinkProvenanceChain: false,
            canVerifyProvenanceChain: false,
            canCreateProvenanceRecord: false,
            canStoreProvenanceRecord: false,
            canPublishProvenanceRecord: false,
            canReadAuditRecord: false,
            canQueryAuditRecord: false,
            canLinkAuditRecordProvenance: false,
            canVerifyAuditRecordProvenance: false,
            canSignProvenance: false,
            canVerifyProvenanceSignature: false,
            canComputeProvenanceHash: false,
            canStoreProvenanceHash: false,
            canMaterializeFiles: false,
            canEnableRuntimeDispatch: false,
            reason: "audit provenance policy is metadata-only and no verified audit record or access grant has been established",
        },
        noOpGuarantees: [
            "audit provenance policy plan does not select provenance policies",
            "audit provenance policy plan does not identify provenance subjects",
            "audit provenance policy plan does not collect or validate provenance sources",
            "audit provenance policy plan does not compute or store provenance graphs",
            "audit provenance policy plan does not link or verify provenance chains",
            "audit provenance policy plan does not create, store, or publish provenance records",
            "audit provenance policy plan does not read or query audit records",
            "audit provenance policy plan does not link or verify audit record provenance",
            "audit provenance policy plan does not sign or verify provenance signatures",
            "audit provenance policy plan does not compute or store provenance hashes",
            "audit provenance policy plan does not create renderer-service directory",
            "audit provenance policy plan does not write package or workspace files",
            "audit provenance policy plan does not mutate lockfiles",
            "audit provenance policy plan does not run commands",
            "audit provenance policy plan does not generate build output",
            "audit provenance policy plan does not register runtime dispatch",
        ],
        requiredBeforeRuntimeDispatch: [
            "define audit provenance policy schema",
            "require verified audit record and access grant before provenance tracking",
            "define trusted provenance source and graph semantics",
            "define provenance chain, signature, and hash semantics",
            "keep render.thumbnail unavailable until executable adapter registration is approved",
        ],
    };
}

export function createRenderThumbnailRendererServicePackageMaterializationApprovalAuditCustodyPolicy(options = EMPTY_OBJECT) {
    const packageMaterializationApprovalAuditProvenancePolicy = options.packageMaterializationApprovalAuditProvenancePolicy ?? EMPTY_OBJECT;
    const packageMaterializationApprovalAuditAccessPolicy = options.packageMaterializationApprovalAuditAccessPolicy ?? EMPTY_OBJECT;
    const packageMaterializationFinalApprovalChecklist = options.packageMaterializationFinalApprovalChecklist ?? EMPTY_OBJECT;

    return {
        status: "planned-disabled",
        auditCustodyVersion: "P25.56",
        adapter: "renderer-service",
        command: CommandDescriptors.RENDER_THUMBNAIL.id,
        dryRunOnly: true,
        approvalRequired: true,
        approved: false,
        finalApprovalGranted: false,
        custodyRequired: true,
        custodyPlanned: true,
        custodyPolicySelected: false,
        custodySubjectIdentified: false,
        custodyHolderIdentified: false,
        custodyTransferPrepared: false,
        custodyTransferExecuted: false,
        custodyTransferred: false,
        custodyTaken: false,
        custodyReleased: false,
        custodyChainLinked: false,
        custodyChainVerified: false,
        custodyRecordCreated: false,
        custodyRecordStored: false,
        custodyRecordPublished: false,
        auditRecordRead: false,
        auditRecordQueried: false,
        auditRecordCustodyLinked: false,
        auditRecordCustodyVerified: false,
        custodySignatureCreated: false,
        custodySignatureVerified: false,
        custodyHashComputed: false,
        custodyHashStored: false,
        materializationReady: false,
        materializationApproved: false,
        materializationApprovedNow: false,
        tokenAccepted: false,
        tokenStored: false,
        tokenValidated: false,
        tokenConsumed: false,
        tokenRevoked: false,
        executeNow: false,
        verifyNow: false,
        rollbackNow: false,
        dispatch: false,
        networkDispatch: false,
        runtimeRegistration: false,
        localFileWrites: false,
        hostStartup: false,
        processSpawn: false,
        packageCreated: false,
        workspaceMutation: false,
        scriptRunnable: false,
        fileMaterialization: false,
        lockfileMutation: false,
        rootPackageJsonMutation: false,
        pnpmWorkspaceMutation: false,
        commandExecution: false,
        buildOutput: false,
        packageScriptsRunnable: false,
        filesWritten: false,
        rollbackExecuted: false,
        verificationExecuted: false,
        consumes: {
            packageMaterializationApprovalAuditProvenancePolicy: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationApprovalAuditProvenancePolicy.status ?? "planned-disabled",
                auditProvenanceVersion: packageMaterializationApprovalAuditProvenancePolicy.auditProvenanceVersion ?? "P25.55",
                provenanceRecordCreated: false,
                provenanceRecordStored: false,
            },
            packageMaterializationApprovalAuditAccessPolicy: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationApprovalAuditAccessPolicy.status ?? "planned-disabled",
                auditAccessVersion: packageMaterializationApprovalAuditAccessPolicy.auditAccessVersion ?? "P25.53",
                auditRecordRead: false,
                accessGranted: false,
            },
            packageMaterializationFinalApprovalChecklist: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationFinalApprovalChecklist.status ?? "planned-disabled",
                checklistVersion: packageMaterializationFinalApprovalChecklist.checklistVersion ?? "P25.40",
                finalApprovalGranted: false,
            },
        },
        auditCustodyPolicy: {
            policy: "track-custody-after-provenance-record-defined",
            selectCustodyPolicyNow: false,
            identifyCustodySubjectNow: false,
            identifyCustodyHolderNow: false,
            prepareCustodyTransferNow: false,
            executeCustodyTransferNow: false,
            takeCustodyNow: false,
            releaseCustodyNow: false,
            linkCustodyChainNow: false,
            verifyCustodyChainNow: false,
            createCustodyRecordNow: false,
            storeCustodyRecordNow: false,
            publishCustodyRecordNow: false,
            readAuditRecordNow: false,
            queryAuditRecordNow: false,
            linkAuditRecordCustodyNow: false,
            verifyAuditRecordCustodyNow: false,
            signCustodyNow: false,
            verifyCustodySignatureNow: false,
            computeCustodyHashNow: false,
            storeCustodyHashNow: false,
            requiredInputs: ["provenanceRecord", "auditAccessGrant", "custodyPolicyId", "authorizedCustodian"],
            custodyPolicyId: "future-materialization-audit-custody",
            custodyScope: "future-policy-defined",
            custodyPayloadLogged: false,
        },
        auditCustodyChecks: [
            { id: "provenance-record-present", required: true, planned: true, executed: false, passed: false },
            { id: "audit-access-granted", required: true, planned: true, executed: false, passed: false },
            { id: "custody-policy-selected", required: true, planned: true, executed: false, passed: false },
            { id: "custody-not-taken", required: true, planned: true, executed: false, passed: false },
            { id: "custody-record-not-created", required: true, planned: true, executed: false, passed: false },
        ],
        auditCustodyDecision: {
            status: "blocked",
            canSelectCustodyPolicy: false,
            canIdentifyCustodySubject: false,
            canIdentifyCustodyHolder: false,
            canPrepareCustodyTransfer: false,
            canExecuteCustodyTransfer: false,
            canTakeCustody: false,
            canReleaseCustody: false,
            canLinkCustodyChain: false,
            canVerifyCustodyChain: false,
            canCreateCustodyRecord: false,
            canStoreCustodyRecord: false,
            canPublishCustodyRecord: false,
            canReadAuditRecord: false,
            canQueryAuditRecord: false,
            canLinkAuditRecordCustody: false,
            canVerifyAuditRecordCustody: false,
            canSignCustody: false,
            canVerifyCustodySignature: false,
            canComputeCustodyHash: false,
            canStoreCustodyHash: false,
            canMaterializeFiles: false,
            canEnableRuntimeDispatch: false,
            reason: "audit custody policy is metadata-only and no provenance record or access grant has been established",
        },
        noOpGuarantees: [
            "audit custody policy plan does not select custody policies",
            "audit custody policy plan does not identify custody subjects or holders",
            "audit custody policy plan does not prepare or execute custody transfers",
            "audit custody policy plan does not take, release, or transfer custody",
            "audit custody policy plan does not link or verify custody chains",
            "audit custody policy plan does not create, store, or publish custody records",
            "audit custody policy plan does not read or query audit records",
            "audit custody policy plan does not link or verify audit record custody",
            "audit custody policy plan does not sign or verify custody signatures",
            "audit custody policy plan does not compute or store custody hashes",
            "audit custody policy plan does not create renderer-service directory",
            "audit custody policy plan does not write package or workspace files",
            "audit custody policy plan does not mutate lockfiles",
            "audit custody policy plan does not run commands",
            "audit custody policy plan does not generate build output",
            "audit custody policy plan does not register runtime dispatch",
        ],
        requiredBeforeRuntimeDispatch: [
            "define audit custody policy schema",
            "require provenance record and access grant before custody tracking",
            "define authorized custodian and transfer semantics",
            "define custody chain, signature, and hash semantics",
            "keep render.thumbnail unavailable until executable adapter registration is approved",
        ],
    };
}

export function createRenderThumbnailRendererServicePackageMaterializationApprovalAuditEvidencePolicy(options = EMPTY_OBJECT) {
    const packageMaterializationApprovalAuditCustodyPolicy = options.packageMaterializationApprovalAuditCustodyPolicy ?? EMPTY_OBJECT;
    const packageMaterializationApprovalAuditAccessPolicy = options.packageMaterializationApprovalAuditAccessPolicy ?? EMPTY_OBJECT;
    const packageMaterializationFinalApprovalChecklist = options.packageMaterializationFinalApprovalChecklist ?? EMPTY_OBJECT;

    return {
        status: "planned-disabled",
        auditEvidenceVersion: "P25.57",
        adapter: "renderer-service",
        command: CommandDescriptors.RENDER_THUMBNAIL.id,
        dryRunOnly: true,
        approvalRequired: true,
        approved: false,
        finalApprovalGranted: false,
        evidenceRequired: true,
        evidencePlanned: true,
        evidencePolicySelected: false,
        evidenceSubjectIdentified: false,
        evidenceSourceIdentified: false,
        evidenceCollected: false,
        evidenceValidated: false,
        evidenceNormalized: false,
        evidenceRecordCreated: false,
        evidenceRecordStored: false,
        evidenceRecordPublished: false,
        evidenceBundleCreated: false,
        evidenceBundleStored: false,
        auditRecordRead: false,
        auditRecordQueried: false,
        auditRecordEvidenceLinked: false,
        auditRecordEvidenceVerified: false,
        evidenceSignatureCreated: false,
        evidenceSignatureVerified: false,
        evidenceHashComputed: false,
        evidenceHashStored: false,
        materializationReady: false,
        materializationApproved: false,
        materializationApprovedNow: false,
        tokenAccepted: false,
        tokenStored: false,
        tokenValidated: false,
        tokenConsumed: false,
        tokenRevoked: false,
        executeNow: false,
        verifyNow: false,
        rollbackNow: false,
        dispatch: false,
        networkDispatch: false,
        runtimeRegistration: false,
        localFileWrites: false,
        hostStartup: false,
        processSpawn: false,
        packageCreated: false,
        workspaceMutation: false,
        scriptRunnable: false,
        fileMaterialization: false,
        lockfileMutation: false,
        rootPackageJsonMutation: false,
        pnpmWorkspaceMutation: false,
        commandExecution: false,
        buildOutput: false,
        packageScriptsRunnable: false,
        filesWritten: false,
        rollbackExecuted: false,
        verificationExecuted: false,
        consumes: {
            packageMaterializationApprovalAuditCustodyPolicy: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationApprovalAuditCustodyPolicy.status ?? "planned-disabled",
                auditCustodyVersion: packageMaterializationApprovalAuditCustodyPolicy.auditCustodyVersion ?? "P25.56",
                custodyRecordCreated: false,
                custodyRecordStored: false,
            },
            packageMaterializationApprovalAuditAccessPolicy: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationApprovalAuditAccessPolicy.status ?? "planned-disabled",
                auditAccessVersion: packageMaterializationApprovalAuditAccessPolicy.auditAccessVersion ?? "P25.53",
                auditRecordRead: false,
                accessGranted: false,
            },
            packageMaterializationFinalApprovalChecklist: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationFinalApprovalChecklist.status ?? "planned-disabled",
                checklistVersion: packageMaterializationFinalApprovalChecklist.checklistVersion ?? "P25.40",
                finalApprovalGranted: false,
            },
        },
        auditEvidencePolicy: {
            policy: "collect-evidence-after-custody-record-defined",
            selectEvidencePolicyNow: false,
            identifyEvidenceSubjectNow: false,
            identifyEvidenceSourceNow: false,
            collectEvidenceNow: false,
            validateEvidenceNow: false,
            normalizeEvidenceNow: false,
            createEvidenceRecordNow: false,
            storeEvidenceRecordNow: false,
            publishEvidenceRecordNow: false,
            createEvidenceBundleNow: false,
            storeEvidenceBundleNow: false,
            readAuditRecordNow: false,
            queryAuditRecordNow: false,
            linkAuditRecordEvidenceNow: false,
            verifyAuditRecordEvidenceNow: false,
            signEvidenceNow: false,
            verifyEvidenceSignatureNow: false,
            computeEvidenceHashNow: false,
            storeEvidenceHashNow: false,
            requiredInputs: ["custodyRecord", "auditAccessGrant", "evidencePolicyId", "trustedEvidenceSource"],
            evidencePolicyId: "future-materialization-audit-evidence",
            evidenceScope: "future-policy-defined",
            evidencePayloadLogged: false,
        },
        auditEvidenceChecks: [
            { id: "custody-record-present", required: true, planned: true, executed: false, passed: false },
            { id: "audit-access-granted", required: true, planned: true, executed: false, passed: false },
            { id: "evidence-policy-selected", required: true, planned: true, executed: false, passed: false },
            { id: "evidence-not-collected", required: true, planned: true, executed: false, passed: false },
            { id: "evidence-record-not-created", required: true, planned: true, executed: false, passed: false },
        ],
        auditEvidenceDecision: {
            status: "blocked",
            canSelectEvidencePolicy: false,
            canIdentifyEvidenceSubject: false,
            canIdentifyEvidenceSource: false,
            canCollectEvidence: false,
            canValidateEvidence: false,
            canNormalizeEvidence: false,
            canCreateEvidenceRecord: false,
            canStoreEvidenceRecord: false,
            canPublishEvidenceRecord: false,
            canCreateEvidenceBundle: false,
            canStoreEvidenceBundle: false,
            canReadAuditRecord: false,
            canQueryAuditRecord: false,
            canLinkAuditRecordEvidence: false,
            canVerifyAuditRecordEvidence: false,
            canSignEvidence: false,
            canVerifyEvidenceSignature: false,
            canComputeEvidenceHash: false,
            canStoreEvidenceHash: false,
            canMaterializeFiles: false,
            canEnableRuntimeDispatch: false,
            reason: "audit evidence policy is metadata-only and no custody record or access grant has been established",
        },
        noOpGuarantees: [
            "audit evidence policy plan does not select evidence policies",
            "audit evidence policy plan does not identify evidence subjects or sources",
            "audit evidence policy plan does not collect, validate, or normalize evidence",
            "audit evidence policy plan does not create, store, or publish evidence records",
            "audit evidence policy plan does not create or store evidence bundles",
            "audit evidence policy plan does not read or query audit records",
            "audit evidence policy plan does not link or verify audit record evidence",
            "audit evidence policy plan does not sign or verify evidence signatures",
            "audit evidence policy plan does not compute or store evidence hashes",
            "audit evidence policy plan does not create renderer-service directory",
            "audit evidence policy plan does not write package or workspace files",
            "audit evidence policy plan does not mutate lockfiles",
            "audit evidence policy plan does not run commands",
            "audit evidence policy plan does not generate build output",
            "audit evidence policy plan does not register runtime dispatch",
        ],
        requiredBeforeRuntimeDispatch: [
            "define audit evidence policy schema",
            "require custody record and access grant before evidence collection",
            "define trusted evidence source and bundle semantics",
            "define evidence signature and hash semantics",
            "keep render.thumbnail unavailable until executable adapter registration is approved",
        ],
    };
}

export function createRenderThumbnailRendererServicePackageMaterializationApprovalAuditAttestationPolicy(options = EMPTY_OBJECT) {
    const packageMaterializationApprovalAuditEvidencePolicy = options.packageMaterializationApprovalAuditEvidencePolicy ?? EMPTY_OBJECT;
    const packageMaterializationApprovalAuditAccessPolicy = options.packageMaterializationApprovalAuditAccessPolicy ?? EMPTY_OBJECT;
    const packageMaterializationFinalApprovalChecklist = options.packageMaterializationFinalApprovalChecklist ?? EMPTY_OBJECT;

    return {
        status: "planned-disabled",
        auditAttestationVersion: "P25.58",
        adapter: "renderer-service",
        command: CommandDescriptors.RENDER_THUMBNAIL.id,
        dryRunOnly: true,
        approvalRequired: true,
        approved: false,
        finalApprovalGranted: false,
        attestationRequired: true,
        attestationPlanned: true,
        attestationPolicySelected: false,
        attestationSubjectIdentified: false,
        attestationAuthorityIdentified: false,
        attestationPrepared: false,
        attestationCreated: false,
        attestationValidated: false,
        attestationStored: false,
        attestationPublished: false,
        attestationBundleCreated: false,
        attestationBundleStored: false,
        evidenceRecordRead: false,
        evidenceRecordAttested: false,
        evidenceRecordVerified: false,
        auditRecordRead: false,
        auditRecordQueried: false,
        auditRecordAttestationLinked: false,
        auditRecordAttestationVerified: false,
        attestationSignatureCreated: false,
        attestationSignatureVerified: false,
        attestationHashComputed: false,
        attestationHashStored: false,
        materializationReady: false,
        materializationApproved: false,
        materializationApprovedNow: false,
        tokenAccepted: false,
        tokenStored: false,
        tokenValidated: false,
        tokenConsumed: false,
        tokenRevoked: false,
        executeNow: false,
        verifyNow: false,
        rollbackNow: false,
        dispatch: false,
        networkDispatch: false,
        runtimeRegistration: false,
        localFileWrites: false,
        hostStartup: false,
        processSpawn: false,
        packageCreated: false,
        workspaceMutation: false,
        scriptRunnable: false,
        fileMaterialization: false,
        lockfileMutation: false,
        rootPackageJsonMutation: false,
        pnpmWorkspaceMutation: false,
        commandExecution: false,
        buildOutput: false,
        packageScriptsRunnable: false,
        filesWritten: false,
        rollbackExecuted: false,
        verificationExecuted: false,
        consumes: {
            packageMaterializationApprovalAuditEvidencePolicy: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationApprovalAuditEvidencePolicy.status ?? "planned-disabled",
                auditEvidenceVersion: packageMaterializationApprovalAuditEvidencePolicy.auditEvidenceVersion ?? "P25.57",
                evidenceRecordCreated: false,
                evidenceRecordStored: false,
            },
            packageMaterializationApprovalAuditAccessPolicy: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationApprovalAuditAccessPolicy.status ?? "planned-disabled",
                auditAccessVersion: packageMaterializationApprovalAuditAccessPolicy.auditAccessVersion ?? "P25.53",
                auditRecordRead: false,
                accessGranted: false,
            },
            packageMaterializationFinalApprovalChecklist: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationFinalApprovalChecklist.status ?? "planned-disabled",
                checklistVersion: packageMaterializationFinalApprovalChecklist.checklistVersion ?? "P25.40",
                finalApprovalGranted: false,
            },
        },
        auditAttestationPolicy: {
            policy: "attest-evidence-after-evidence-record-defined",
            selectAttestationPolicyNow: false,
            identifyAttestationSubjectNow: false,
            identifyAttestationAuthorityNow: false,
            prepareAttestationNow: false,
            createAttestationNow: false,
            validateAttestationNow: false,
            storeAttestationNow: false,
            publishAttestationNow: false,
            createAttestationBundleNow: false,
            storeAttestationBundleNow: false,
            readEvidenceRecordNow: false,
            attestEvidenceRecordNow: false,
            verifyEvidenceRecordNow: false,
            readAuditRecordNow: false,
            queryAuditRecordNow: false,
            linkAuditRecordAttestationNow: false,
            verifyAuditRecordAttestationNow: false,
            signAttestationNow: false,
            verifyAttestationSignatureNow: false,
            computeAttestationHashNow: false,
            storeAttestationHashNow: false,
            requiredInputs: ["evidenceRecord", "auditAccessGrant", "attestationPolicyId", "trustedAttestationAuthority"],
            attestationPolicyId: "future-materialization-audit-attestation",
            attestationScope: "future-policy-defined",
            attestationPayloadLogged: false,
        },
        auditAttestationChecks: [
            { id: "evidence-record-present", required: true, planned: true, executed: false, passed: false },
            { id: "audit-access-granted", required: true, planned: true, executed: false, passed: false },
            { id: "attestation-policy-selected", required: true, planned: true, executed: false, passed: false },
            { id: "attestation-not-created", required: true, planned: true, executed: false, passed: false },
            { id: "attestation-not-stored", required: true, planned: true, executed: false, passed: false },
        ],
        auditAttestationDecision: {
            status: "blocked",
            canSelectAttestationPolicy: false,
            canIdentifyAttestationSubject: false,
            canIdentifyAttestationAuthority: false,
            canPrepareAttestation: false,
            canCreateAttestation: false,
            canValidateAttestation: false,
            canStoreAttestation: false,
            canPublishAttestation: false,
            canCreateAttestationBundle: false,
            canStoreAttestationBundle: false,
            canReadEvidenceRecord: false,
            canAttestEvidenceRecord: false,
            canVerifyEvidenceRecord: false,
            canReadAuditRecord: false,
            canQueryAuditRecord: false,
            canLinkAuditRecordAttestation: false,
            canVerifyAuditRecordAttestation: false,
            canSignAttestation: false,
            canVerifyAttestationSignature: false,
            canComputeAttestationHash: false,
            canStoreAttestationHash: false,
            canMaterializeFiles: false,
            canEnableRuntimeDispatch: false,
            reason: "audit attestation policy is metadata-only and no evidence record or access grant has been established",
        },
        noOpGuarantees: [
            "audit attestation policy plan does not select attestation policies",
            "audit attestation policy plan does not identify attestation subjects or authorities",
            "audit attestation policy plan does not prepare, create, validate, store, or publish attestations",
            "audit attestation policy plan does not create or store attestation bundles",
            "audit attestation policy plan does not read, attest, or verify evidence records",
            "audit attestation policy plan does not read or query audit records",
            "audit attestation policy plan does not link or verify audit record attestations",
            "audit attestation policy plan does not sign or verify attestation signatures",
            "audit attestation policy plan does not compute or store attestation hashes",
            "audit attestation policy plan does not create renderer-service directory",
            "audit attestation policy plan does not write package or workspace files",
            "audit attestation policy plan does not mutate lockfiles",
            "audit attestation policy plan does not run commands",
            "audit attestation policy plan does not generate build output",
            "audit attestation policy plan does not register runtime dispatch",
        ],
        requiredBeforeRuntimeDispatch: [
            "define audit attestation policy schema",
            "require evidence record and access grant before attestation",
            "define trusted attestation authority and bundle semantics",
            "define attestation signature and hash semantics",
            "keep render.thumbnail unavailable until executable adapter registration is approved",
        ],
    };
}

export function createRenderThumbnailRendererServicePackageMaterializationApprovalAuditNotarizationPolicy(options = EMPTY_OBJECT) {
    const packageMaterializationApprovalAuditAttestationPolicy = options.packageMaterializationApprovalAuditAttestationPolicy ?? EMPTY_OBJECT;
    const packageMaterializationApprovalAuditAccessPolicy = options.packageMaterializationApprovalAuditAccessPolicy ?? EMPTY_OBJECT;
    const packageMaterializationFinalApprovalChecklist = options.packageMaterializationFinalApprovalChecklist ?? EMPTY_OBJECT;

    return {
        status: "planned-disabled",
        auditNotarizationVersion: "P25.59",
        adapter: "renderer-service",
        command: CommandDescriptors.RENDER_THUMBNAIL.id,
        dryRunOnly: true,
        approvalRequired: true,
        approved: false,
        finalApprovalGranted: false,
        notarizationRequired: true,
        notarizationPlanned: true,
        notarizationPolicySelected: false,
        notarizationSubjectIdentified: false,
        notarizationAuthorityIdentified: false,
        notarizationPrepared: false,
        notarizationCreated: false,
        notarizationValidated: false,
        notarizationStored: false,
        notarizationPublished: false,
        notarizationRecordCreated: false,
        notarizationRecordStored: false,
        notarizationRecordPublished: false,
        attestationRead: false,
        attestationNotarized: false,
        attestationVerified: false,
        auditRecordRead: false,
        auditRecordQueried: false,
        auditRecordNotarizationLinked: false,
        auditRecordNotarizationVerified: false,
        notarizationSignatureCreated: false,
        notarizationSignatureVerified: false,
        notarizationHashComputed: false,
        notarizationHashStored: false,
        materializationReady: false,
        materializationApproved: false,
        materializationApprovedNow: false,
        tokenAccepted: false,
        tokenStored: false,
        tokenValidated: false,
        tokenConsumed: false,
        tokenRevoked: false,
        executeNow: false,
        verifyNow: false,
        rollbackNow: false,
        dispatch: false,
        networkDispatch: false,
        runtimeRegistration: false,
        localFileWrites: false,
        hostStartup: false,
        processSpawn: false,
        packageCreated: false,
        workspaceMutation: false,
        scriptRunnable: false,
        fileMaterialization: false,
        lockfileMutation: false,
        rootPackageJsonMutation: false,
        pnpmWorkspaceMutation: false,
        commandExecution: false,
        buildOutput: false,
        packageScriptsRunnable: false,
        filesWritten: false,
        rollbackExecuted: false,
        verificationExecuted: false,
        consumes: {
            packageMaterializationApprovalAuditAttestationPolicy: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationApprovalAuditAttestationPolicy.status ?? "planned-disabled",
                auditAttestationVersion: packageMaterializationApprovalAuditAttestationPolicy.auditAttestationVersion ?? "P25.58",
                attestationCreated: false,
                attestationStored: false,
            },
            packageMaterializationApprovalAuditAccessPolicy: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationApprovalAuditAccessPolicy.status ?? "planned-disabled",
                auditAccessVersion: packageMaterializationApprovalAuditAccessPolicy.auditAccessVersion ?? "P25.53",
                auditRecordRead: false,
                accessGranted: false,
            },
            packageMaterializationFinalApprovalChecklist: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationFinalApprovalChecklist.status ?? "planned-disabled",
                checklistVersion: packageMaterializationFinalApprovalChecklist.checklistVersion ?? "P25.40",
                finalApprovalGranted: false,
            },
        },
        auditNotarizationPolicy: {
            policy: "notarize-attestation-after-attestation-record-defined",
            selectNotarizationPolicyNow: false,
            identifyNotarizationSubjectNow: false,
            identifyNotarizationAuthorityNow: false,
            prepareNotarizationNow: false,
            createNotarizationNow: false,
            validateNotarizationNow: false,
            storeNotarizationNow: false,
            publishNotarizationNow: false,
            createNotarizationRecordNow: false,
            storeNotarizationRecordNow: false,
            publishNotarizationRecordNow: false,
            readAttestationNow: false,
            notarizeAttestationNow: false,
            verifyAttestationNow: false,
            readAuditRecordNow: false,
            queryAuditRecordNow: false,
            linkAuditRecordNotarizationNow: false,
            verifyAuditRecordNotarizationNow: false,
            signNotarizationNow: false,
            verifyNotarizationSignatureNow: false,
            computeNotarizationHashNow: false,
            storeNotarizationHashNow: false,
            requiredInputs: ["attestationRecord", "auditAccessGrant", "notarizationPolicyId", "trustedNotarizationAuthority"],
            notarizationPolicyId: "future-materialization-audit-notarization",
            notarizationScope: "future-policy-defined",
            notarizationPayloadLogged: false,
        },
        auditNotarizationChecks: [
            { id: "attestation-record-present", required: true, planned: true, executed: false, passed: false },
            { id: "audit-access-granted", required: true, planned: true, executed: false, passed: false },
            { id: "notarization-policy-selected", required: true, planned: true, executed: false, passed: false },
            { id: "notarization-not-created", required: true, planned: true, executed: false, passed: false },
            { id: "notarization-record-not-stored", required: true, planned: true, executed: false, passed: false },
        ],
        auditNotarizationDecision: {
            status: "blocked",
            canSelectNotarizationPolicy: false,
            canIdentifyNotarizationSubject: false,
            canIdentifyNotarizationAuthority: false,
            canPrepareNotarization: false,
            canCreateNotarization: false,
            canValidateNotarization: false,
            canStoreNotarization: false,
            canPublishNotarization: false,
            canCreateNotarizationRecord: false,
            canStoreNotarizationRecord: false,
            canPublishNotarizationRecord: false,
            canReadAttestation: false,
            canNotarizeAttestation: false,
            canVerifyAttestation: false,
            canReadAuditRecord: false,
            canQueryAuditRecord: false,
            canLinkAuditRecordNotarization: false,
            canVerifyAuditRecordNotarization: false,
            canSignNotarization: false,
            canVerifyNotarizationSignature: false,
            canComputeNotarizationHash: false,
            canStoreNotarizationHash: false,
            canMaterializeFiles: false,
            canEnableRuntimeDispatch: false,
            reason: "audit notarization policy is metadata-only and no attestation record or access grant has been established",
        },
        noOpGuarantees: [
            "audit notarization policy plan does not select notarization policies",
            "audit notarization policy plan does not identify notarization subjects or authorities",
            "audit notarization policy plan does not prepare, create, validate, store, or publish notarizations",
            "audit notarization policy plan does not create, store, or publish notarization records",
            "audit notarization policy plan does not read, notarize, or verify attestations",
            "audit notarization policy plan does not read or query audit records",
            "audit notarization policy plan does not link or verify audit record notarizations",
            "audit notarization policy plan does not sign or verify notarization signatures",
            "audit notarization policy plan does not compute or store notarization hashes",
            "audit notarization policy plan does not create renderer-service directory",
            "audit notarization policy plan does not write package or workspace files",
            "audit notarization policy plan does not mutate lockfiles",
            "audit notarization policy plan does not run commands",
            "audit notarization policy plan does not generate build output",
            "audit notarization policy plan does not register runtime dispatch",
        ],
        requiredBeforeRuntimeDispatch: [
            "define audit notarization policy schema",
            "require attestation record and access grant before notarization",
            "define trusted notarization authority and record semantics",
            "define notarization signature and hash semantics",
            "keep render.thumbnail unavailable until executable adapter registration is approved",
        ],
    };
}

export function createRenderThumbnailRendererServicePackageMaterializationApprovalAuditCertificationPolicy(options = EMPTY_OBJECT) {
    const packageMaterializationApprovalAuditNotarizationPolicy = options.packageMaterializationApprovalAuditNotarizationPolicy ?? EMPTY_OBJECT;
    const packageMaterializationApprovalAuditAccessPolicy = options.packageMaterializationApprovalAuditAccessPolicy ?? EMPTY_OBJECT;
    const packageMaterializationFinalApprovalChecklist = options.packageMaterializationFinalApprovalChecklist ?? EMPTY_OBJECT;

    return {
        status: "planned-disabled",
        auditCertificationVersion: "P25.60",
        adapter: "renderer-service",
        command: CommandDescriptors.RENDER_THUMBNAIL.id,
        dryRunOnly: true,
        approvalRequired: true,
        approved: false,
        finalApprovalGranted: false,
        certificationRequired: true,
        certificationPlanned: true,
        certificationPolicySelected: false,
        certificationSubjectIdentified: false,
        certificationAuthorityIdentified: false,
        certificationPrepared: false,
        certificationCreated: false,
        certificationValidated: false,
        certificationStored: false,
        certificationPublished: false,
        certificationRecordCreated: false,
        certificationRecordStored: false,
        certificationRecordPublished: false,
        notarizationRead: false,
        notarizationCertified: false,
        notarizationVerified: false,
        auditRecordRead: false,
        auditRecordQueried: false,
        auditRecordCertificationLinked: false,
        auditRecordCertificationVerified: false,
        certificationSignatureCreated: false,
        certificationSignatureVerified: false,
        certificationHashComputed: false,
        certificationHashStored: false,
        materializationReady: false,
        materializationApproved: false,
        materializationApprovedNow: false,
        tokenAccepted: false,
        tokenStored: false,
        tokenValidated: false,
        tokenConsumed: false,
        tokenRevoked: false,
        executeNow: false,
        verifyNow: false,
        rollbackNow: false,
        dispatch: false,
        networkDispatch: false,
        runtimeRegistration: false,
        localFileWrites: false,
        hostStartup: false,
        processSpawn: false,
        packageCreated: false,
        workspaceMutation: false,
        scriptRunnable: false,
        fileMaterialization: false,
        lockfileMutation: false,
        rootPackageJsonMutation: false,
        pnpmWorkspaceMutation: false,
        commandExecution: false,
        buildOutput: false,
        packageScriptsRunnable: false,
        filesWritten: false,
        rollbackExecuted: false,
        verificationExecuted: false,
        consumes: {
            packageMaterializationApprovalAuditNotarizationPolicy: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationApprovalAuditNotarizationPolicy.status ?? "planned-disabled",
                auditNotarizationVersion: packageMaterializationApprovalAuditNotarizationPolicy.auditNotarizationVersion ?? "P25.59",
                notarizationCreated: false,
                notarizationRecordStored: false,
            },
            packageMaterializationApprovalAuditAccessPolicy: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationApprovalAuditAccessPolicy.status ?? "planned-disabled",
                auditAccessVersion: packageMaterializationApprovalAuditAccessPolicy.auditAccessVersion ?? "P25.53",
                auditRecordRead: false,
                accessGranted: false,
            },
            packageMaterializationFinalApprovalChecklist: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationFinalApprovalChecklist.status ?? "planned-disabled",
                checklistVersion: packageMaterializationFinalApprovalChecklist.checklistVersion ?? "P25.40",
                finalApprovalGranted: false,
            },
        },
        auditCertificationPolicy: {
            policy: "certify-notarization-after-notarization-record-defined",
            selectCertificationPolicyNow: false,
            identifyCertificationSubjectNow: false,
            identifyCertificationAuthorityNow: false,
            prepareCertificationNow: false,
            createCertificationNow: false,
            validateCertificationNow: false,
            storeCertificationNow: false,
            publishCertificationNow: false,
            createCertificationRecordNow: false,
            storeCertificationRecordNow: false,
            publishCertificationRecordNow: false,
            readNotarizationNow: false,
            certifyNotarizationNow: false,
            verifyNotarizationNow: false,
            readAuditRecordNow: false,
            queryAuditRecordNow: false,
            linkAuditRecordCertificationNow: false,
            verifyAuditRecordCertificationNow: false,
            signCertificationNow: false,
            verifyCertificationSignatureNow: false,
            computeCertificationHashNow: false,
            storeCertificationHashNow: false,
            requiredInputs: ["notarizationRecord", "auditAccessGrant", "certificationPolicyId", "trustedCertificationAuthority"],
            certificationPolicyId: "future-materialization-audit-certification",
            certificationScope: "future-policy-defined",
            certificationPayloadLogged: false,
        },
        auditCertificationChecks: [
            { id: "notarization-record-present", required: true, planned: true, executed: false, passed: false },
            { id: "audit-access-granted", required: true, planned: true, executed: false, passed: false },
            { id: "certification-policy-selected", required: true, planned: true, executed: false, passed: false },
            { id: "certification-not-created", required: true, planned: true, executed: false, passed: false },
            { id: "certification-record-not-stored", required: true, planned: true, executed: false, passed: false },
        ],
        auditCertificationDecision: {
            status: "blocked",
            canSelectCertificationPolicy: false,
            canIdentifyCertificationSubject: false,
            canIdentifyCertificationAuthority: false,
            canPrepareCertification: false,
            canCreateCertification: false,
            canValidateCertification: false,
            canStoreCertification: false,
            canPublishCertification: false,
            canCreateCertificationRecord: false,
            canStoreCertificationRecord: false,
            canPublishCertificationRecord: false,
            canReadNotarization: false,
            canCertifyNotarization: false,
            canVerifyNotarization: false,
            canReadAuditRecord: false,
            canQueryAuditRecord: false,
            canLinkAuditRecordCertification: false,
            canVerifyAuditRecordCertification: false,
            canSignCertification: false,
            canVerifyCertificationSignature: false,
            canComputeCertificationHash: false,
            canStoreCertificationHash: false,
            canMaterializeFiles: false,
            canEnableRuntimeDispatch: false,
            reason: "audit certification policy is metadata-only and no notarization record or access grant has been established",
        },
        noOpGuarantees: [
            "audit certification policy plan does not select certification policies",
            "audit certification policy plan does not identify certification subjects or authorities",
            "audit certification policy plan does not prepare, create, validate, store, or publish certifications",
            "audit certification policy plan does not create, store, or publish certification records",
            "audit certification policy plan does not read, certify, or verify notarizations",
            "audit certification policy plan does not read or query audit records",
            "audit certification policy plan does not link or verify audit record certifications",
            "audit certification policy plan does not sign or verify certification signatures",
            "audit certification policy plan does not compute or store certification hashes",
            "audit certification policy plan does not create renderer-service directory",
            "audit certification policy plan does not write package or workspace files",
            "audit certification policy plan does not mutate lockfiles",
            "audit certification policy plan does not run commands",
            "audit certification policy plan does not generate build output",
            "audit certification policy plan does not register runtime dispatch",
        ],
        requiredBeforeRuntimeDispatch: [
            "define audit certification policy schema",
            "require notarization record and access grant before certification",
            "define trusted certification authority and record semantics",
            "define certification signature and hash semantics",
            "keep render.thumbnail unavailable until executable adapter registration is approved",
        ],
    };
}

export function createRenderThumbnailRendererServicePackageMaterializationApprovalAuditEndorsementPolicy(options = EMPTY_OBJECT) {
    const packageMaterializationApprovalAuditCertificationPolicy = options.packageMaterializationApprovalAuditCertificationPolicy ?? EMPTY_OBJECT;
    const packageMaterializationApprovalAuditAccessPolicy = options.packageMaterializationApprovalAuditAccessPolicy ?? EMPTY_OBJECT;
    const packageMaterializationFinalApprovalChecklist = options.packageMaterializationFinalApprovalChecklist ?? EMPTY_OBJECT;

    return {
        status: "planned-disabled",
        auditEndorsementVersion: "P25.61",
        adapter: "renderer-service",
        command: CommandDescriptors.RENDER_THUMBNAIL.id,
        dryRunOnly: true,
        approvalRequired: true,
        approved: false,
        finalApprovalGranted: false,
        endorsementRequired: true,
        endorsementPlanned: true,
        endorsementPolicySelected: false,
        endorsementSubjectIdentified: false,
        endorsementAuthorityIdentified: false,
        endorsementPrepared: false,
        endorsementCreated: false,
        endorsementValidated: false,
        endorsementStored: false,
        endorsementPublished: false,
        endorsementRecordCreated: false,
        endorsementRecordStored: false,
        endorsementRecordPublished: false,
        certificationRead: false,
        certificationEndorsed: false,
        certificationVerified: false,
        auditRecordRead: false,
        auditRecordQueried: false,
        auditRecordEndorsementLinked: false,
        auditRecordEndorsementVerified: false,
        endorsementSignatureCreated: false,
        endorsementSignatureVerified: false,
        endorsementHashComputed: false,
        endorsementHashStored: false,
        materializationReady: false,
        materializationApproved: false,
        materializationApprovedNow: false,
        tokenAccepted: false,
        tokenStored: false,
        tokenValidated: false,
        tokenConsumed: false,
        tokenRevoked: false,
        executeNow: false,
        verifyNow: false,
        rollbackNow: false,
        dispatch: false,
        networkDispatch: false,
        runtimeRegistration: false,
        localFileWrites: false,
        hostStartup: false,
        processSpawn: false,
        packageCreated: false,
        workspaceMutation: false,
        scriptRunnable: false,
        fileMaterialization: false,
        lockfileMutation: false,
        rootPackageJsonMutation: false,
        pnpmWorkspaceMutation: false,
        commandExecution: false,
        buildOutput: false,
        packageScriptsRunnable: false,
        filesWritten: false,
        rollbackExecuted: false,
        verificationExecuted: false,
        consumes: {
            packageMaterializationApprovalAuditCertificationPolicy: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationApprovalAuditCertificationPolicy.status ?? "planned-disabled",
                auditCertificationVersion: packageMaterializationApprovalAuditCertificationPolicy.auditCertificationVersion ?? "P25.60",
                certificationCreated: false,
                certificationRecordStored: false,
            },
            packageMaterializationApprovalAuditAccessPolicy: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationApprovalAuditAccessPolicy.status ?? "planned-disabled",
                auditAccessVersion: packageMaterializationApprovalAuditAccessPolicy.auditAccessVersion ?? "P25.53",
                auditRecordRead: false,
                accessGranted: false,
            },
            packageMaterializationFinalApprovalChecklist: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationFinalApprovalChecklist.status ?? "planned-disabled",
                checklistVersion: packageMaterializationFinalApprovalChecklist.checklistVersion ?? "P25.40",
                finalApprovalGranted: false,
            },
        },
        auditEndorsementPolicy: {
            policy: "endorse-certification-after-certification-record-defined",
            selectEndorsementPolicyNow: false,
            identifyEndorsementSubjectNow: false,
            identifyEndorsementAuthorityNow: false,
            prepareEndorsementNow: false,
            createEndorsementNow: false,
            validateEndorsementNow: false,
            storeEndorsementNow: false,
            publishEndorsementNow: false,
            createEndorsementRecordNow: false,
            storeEndorsementRecordNow: false,
            publishEndorsementRecordNow: false,
            readCertificationNow: false,
            endorseCertificationNow: false,
            verifyCertificationNow: false,
            readAuditRecordNow: false,
            queryAuditRecordNow: false,
            linkAuditRecordEndorsementNow: false,
            verifyAuditRecordEndorsementNow: false,
            signEndorsementNow: false,
            verifyEndorsementSignatureNow: false,
            computeEndorsementHashNow: false,
            storeEndorsementHashNow: false,
            requiredInputs: ["certificationRecord", "auditAccessGrant", "endorsementPolicyId", "trustedEndorsementAuthority"],
            endorsementPolicyId: "future-materialization-audit-endorsement",
            endorsementScope: "future-policy-defined",
            endorsementPayloadLogged: false,
        },
        auditEndorsementChecks: [
            { id: "certification-record-present", required: true, planned: true, executed: false, passed: false },
            { id: "audit-access-granted", required: true, planned: true, executed: false, passed: false },
            { id: "endorsement-policy-selected", required: true, planned: true, executed: false, passed: false },
            { id: "endorsement-not-created", required: true, planned: true, executed: false, passed: false },
            { id: "endorsement-record-not-stored", required: true, planned: true, executed: false, passed: false },
        ],
        auditEndorsementDecision: {
            status: "blocked",
            canSelectEndorsementPolicy: false,
            canIdentifyEndorsementSubject: false,
            canIdentifyEndorsementAuthority: false,
            canPrepareEndorsement: false,
            canCreateEndorsement: false,
            canValidateEndorsement: false,
            canStoreEndorsement: false,
            canPublishEndorsement: false,
            canCreateEndorsementRecord: false,
            canStoreEndorsementRecord: false,
            canPublishEndorsementRecord: false,
            canReadCertification: false,
            canEndorseCertification: false,
            canVerifyCertification: false,
            canReadAuditRecord: false,
            canQueryAuditRecord: false,
            canLinkAuditRecordEndorsement: false,
            canVerifyAuditRecordEndorsement: false,
            canSignEndorsement: false,
            canVerifyEndorsementSignature: false,
            canComputeEndorsementHash: false,
            canStoreEndorsementHash: false,
            canMaterializeFiles: false,
            canEnableRuntimeDispatch: false,
            reason: "audit endorsement policy is metadata-only and no certification record or access grant has been established",
        },
        noOpGuarantees: [
            "audit endorsement policy plan does not select endorsement policies",
            "audit endorsement policy plan does not identify endorsement subjects or authorities",
            "audit endorsement policy plan does not prepare, create, validate, store, or publish endorsements",
            "audit endorsement policy plan does not create, store, or publish endorsement records",
            "audit endorsement policy plan does not read, endorse, or verify certifications",
            "audit endorsement policy plan does not read or query audit records",
            "audit endorsement policy plan does not link or verify audit record endorsements",
            "audit endorsement policy plan does not sign or verify endorsement signatures",
            "audit endorsement policy plan does not compute or store endorsement hashes",
            "audit endorsement policy plan does not create renderer-service directory",
            "audit endorsement policy plan does not write package or workspace files",
            "audit endorsement policy plan does not mutate lockfiles",
            "audit endorsement policy plan does not run commands",
            "audit endorsement policy plan does not generate build output",
            "audit endorsement policy plan does not register runtime dispatch",
        ],
        requiredBeforeRuntimeDispatch: [
            "define audit endorsement policy schema",
            "require certification record and access grant before endorsement",
            "define trusted endorsement authority and record semantics",
            "define endorsement signature and hash semantics",
            "keep render.thumbnail unavailable until executable adapter registration is approved",
        ],
    };
}

export function createRenderThumbnailRendererServicePackageMaterializationApprovalAuditCountersignaturePolicy(options = EMPTY_OBJECT) {
    const packageMaterializationApprovalAuditEndorsementPolicy = options.packageMaterializationApprovalAuditEndorsementPolicy ?? EMPTY_OBJECT;
    const packageMaterializationApprovalAuditAccessPolicy = options.packageMaterializationApprovalAuditAccessPolicy ?? EMPTY_OBJECT;
    const packageMaterializationFinalApprovalChecklist = options.packageMaterializationFinalApprovalChecklist ?? EMPTY_OBJECT;

    return {
        status: "planned-disabled",
        auditCountersignatureVersion: "P25.62",
        adapter: "renderer-service",
        command: CommandDescriptors.RENDER_THUMBNAIL.id,
        dryRunOnly: true,
        approvalRequired: true,
        approved: false,
        finalApprovalGranted: false,
        countersignatureRequired: true,
        countersignaturePlanned: true,
        countersignaturePolicySelected: false,
        countersignatureSubjectIdentified: false,
        countersignatureAuthorityIdentified: false,
        countersignaturePrepared: false,
        countersignatureCreated: false,
        countersignatureValidated: false,
        countersignatureStored: false,
        countersignaturePublished: false,
        countersignatureRecordCreated: false,
        countersignatureRecordStored: false,
        countersignatureRecordPublished: false,
        endorsementRead: false,
        endorsementCountersigned: false,
        endorsementVerified: false,
        auditRecordRead: false,
        auditRecordQueried: false,
        auditRecordCountersignatureLinked: false,
        auditRecordCountersignatureVerified: false,
        countersignatureSignatureCreated: false,
        countersignatureSignatureVerified: false,
        countersignatureHashComputed: false,
        countersignatureHashStored: false,
        materializationReady: false,
        materializationApproved: false,
        materializationApprovedNow: false,
        tokenAccepted: false,
        tokenStored: false,
        tokenValidated: false,
        tokenConsumed: false,
        tokenRevoked: false,
        executeNow: false,
        verifyNow: false,
        rollbackNow: false,
        dispatch: false,
        networkDispatch: false,
        runtimeRegistration: false,
        localFileWrites: false,
        hostStartup: false,
        processSpawn: false,
        packageCreated: false,
        workspaceMutation: false,
        scriptRunnable: false,
        fileMaterialization: false,
        lockfileMutation: false,
        rootPackageJsonMutation: false,
        pnpmWorkspaceMutation: false,
        commandExecution: false,
        buildOutput: false,
        packageScriptsRunnable: false,
        filesWritten: false,
        rollbackExecuted: false,
        verificationExecuted: false,
        consumes: {
            packageMaterializationApprovalAuditEndorsementPolicy: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationApprovalAuditEndorsementPolicy.status ?? "planned-disabled",
                auditEndorsementVersion: packageMaterializationApprovalAuditEndorsementPolicy.auditEndorsementVersion ?? "P25.61",
                endorsementCreated: false,
                endorsementRecordStored: false,
            },
            packageMaterializationApprovalAuditAccessPolicy: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationApprovalAuditAccessPolicy.status ?? "planned-disabled",
                auditAccessVersion: packageMaterializationApprovalAuditAccessPolicy.auditAccessVersion ?? "P25.53",
                auditRecordRead: false,
                accessGranted: false,
            },
            packageMaterializationFinalApprovalChecklist: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationFinalApprovalChecklist.status ?? "planned-disabled",
                checklistVersion: packageMaterializationFinalApprovalChecklist.checklistVersion ?? "P25.40",
                finalApprovalGranted: false,
            },
        },
        auditCountersignaturePolicy: {
            policy: "countersign-endorsement-after-endorsement-record-defined",
            selectCountersignaturePolicyNow: false,
            identifyCountersignatureSubjectNow: false,
            identifyCountersignatureAuthorityNow: false,
            prepareCountersignatureNow: false,
            createCountersignatureNow: false,
            validateCountersignatureNow: false,
            storeCountersignatureNow: false,
            publishCountersignatureNow: false,
            createCountersignatureRecordNow: false,
            storeCountersignatureRecordNow: false,
            publishCountersignatureRecordNow: false,
            readEndorsementNow: false,
            countersignEndorsementNow: false,
            verifyEndorsementNow: false,
            readAuditRecordNow: false,
            queryAuditRecordNow: false,
            linkAuditRecordCountersignatureNow: false,
            verifyAuditRecordCountersignatureNow: false,
            signCountersignatureNow: false,
            verifyCountersignatureSignatureNow: false,
            computeCountersignatureHashNow: false,
            storeCountersignatureHashNow: false,
            requiredInputs: ["endorsementRecord", "auditAccessGrant", "countersignaturePolicyId", "trustedCountersignatureAuthority"],
            countersignaturePolicyId: "future-materialization-audit-countersignature",
            countersignatureScope: "future-policy-defined",
            countersignaturePayloadLogged: false,
        },
        auditCountersignatureChecks: [
            { id: "endorsement-record-present", required: true, planned: true, executed: false, passed: false },
            { id: "audit-access-granted", required: true, planned: true, executed: false, passed: false },
            { id: "countersignature-policy-selected", required: true, planned: true, executed: false, passed: false },
            { id: "countersignature-not-created", required: true, planned: true, executed: false, passed: false },
            { id: "countersignature-record-not-stored", required: true, planned: true, executed: false, passed: false },
        ],
        auditCountersignatureDecision: {
            status: "blocked",
            canSelectCountersignaturePolicy: false,
            canIdentifyCountersignatureSubject: false,
            canIdentifyCountersignatureAuthority: false,
            canPrepareCountersignature: false,
            canCreateCountersignature: false,
            canValidateCountersignature: false,
            canStoreCountersignature: false,
            canPublishCountersignature: false,
            canCreateCountersignatureRecord: false,
            canStoreCountersignatureRecord: false,
            canPublishCountersignatureRecord: false,
            canReadEndorsement: false,
            canCountersignEndorsement: false,
            canVerifyEndorsement: false,
            canReadAuditRecord: false,
            canQueryAuditRecord: false,
            canLinkAuditRecordCountersignature: false,
            canVerifyAuditRecordCountersignature: false,
            canSignCountersignature: false,
            canVerifyCountersignatureSignature: false,
            canComputeCountersignatureHash: false,
            canStoreCountersignatureHash: false,
            canMaterializeFiles: false,
            canEnableRuntimeDispatch: false,
            reason: "audit countersignature policy is metadata-only and no endorsement record or access grant has been established",
        },
        noOpGuarantees: [
            "audit countersignature policy plan does not select countersignature policies",
            "audit countersignature policy plan does not identify countersignature subjects or authorities",
            "audit countersignature policy plan does not prepare, create, validate, store, or publish countersignatures",
            "audit countersignature policy plan does not create, store, or publish countersignature records",
            "audit countersignature policy plan does not read, countersign, or verify endorsements",
            "audit countersignature policy plan does not read or query audit records",
            "audit countersignature policy plan does not link or verify audit record countersignatures",
            "audit countersignature policy plan does not sign or verify countersignature signatures",
            "audit countersignature policy plan does not compute or store countersignature hashes",
            "audit countersignature policy plan does not create renderer-service directory",
            "audit countersignature policy plan does not write package or workspace files",
            "audit countersignature policy plan does not mutate lockfiles",
            "audit countersignature policy plan does not run commands",
            "audit countersignature policy plan does not generate build output",
            "audit countersignature policy plan does not register runtime dispatch",
        ],
        requiredBeforeRuntimeDispatch: [
            "define audit countersignature policy schema",
            "require endorsement record and access grant before countersignature",
            "define trusted countersignature authority and record semantics",
            "define countersignature signature and hash semantics",
            "keep render.thumbnail unavailable until executable adapter registration is approved",
        ],
    };
}

export function createRenderThumbnailRendererServicePackageMaterializationApprovalAuditCountersignatureVerificationPolicy(options = EMPTY_OBJECT) {
    const packageMaterializationApprovalAuditCountersignaturePolicy = options.packageMaterializationApprovalAuditCountersignaturePolicy ?? EMPTY_OBJECT;
    const packageMaterializationApprovalAuditAccessPolicy = options.packageMaterializationApprovalAuditAccessPolicy ?? EMPTY_OBJECT;
    const packageMaterializationFinalApprovalChecklist = options.packageMaterializationFinalApprovalChecklist ?? EMPTY_OBJECT;

    return {
        status: "planned-disabled",
        auditCountersignatureVerificationVersion: "P25.63",
        adapter: "renderer-service",
        command: CommandDescriptors.RENDER_THUMBNAIL.id,
        dryRunOnly: true,
        approvalRequired: true,
        approved: false,
        finalApprovalGranted: false,
        countersignatureVerificationRequired: true,
        countersignatureVerificationPlanned: true,
        countersignatureVerificationPolicySelected: false,
        countersignatureVerificationSubjectIdentified: false,
        countersignatureVerificationAuthorityIdentified: false,
        countersignatureRead: false,
        countersignatureRecordRead: false,
        countersignaturePayloadParsed: false,
        countersignatureSignatureRead: false,
        countersignatureSignatureVerified: false,
        countersignatureHashComputed: false,
        countersignatureHashMatched: false,
        countersignatureChainLinked: false,
        countersignatureChainVerified: false,
        countersignatureVerificationPrepared: false,
        countersignatureVerificationExecuted: false,
        countersignatureVerificationPassed: false,
        countersignatureVerificationFailed: false,
        countersignatureVerificationStored: false,
        countersignatureVerificationPublished: false,
        auditRecordRead: false,
        auditRecordQueried: false,
        auditRecordCountersignatureVerificationLinked: false,
        auditRecordCountersignatureVerificationVerified: false,
        countersignatureVerificationSignatureCreated: false,
        countersignatureVerificationSignatureVerified: false,
        countersignatureVerificationHashComputed: false,
        countersignatureVerificationHashStored: false,
        materializationReady: false,
        materializationApproved: false,
        materializationApprovedNow: false,
        tokenAccepted: false,
        tokenStored: false,
        tokenValidated: false,
        tokenConsumed: false,
        tokenRevoked: false,
        executeNow: false,
        verifyNow: false,
        rollbackNow: false,
        dispatch: false,
        networkDispatch: false,
        runtimeRegistration: false,
        localFileWrites: false,
        hostStartup: false,
        processSpawn: false,
        packageCreated: false,
        workspaceMutation: false,
        scriptRunnable: false,
        fileMaterialization: false,
        lockfileMutation: false,
        rootPackageJsonMutation: false,
        pnpmWorkspaceMutation: false,
        commandExecution: false,
        buildOutput: false,
        packageScriptsRunnable: false,
        filesWritten: false,
        rollbackExecuted: false,
        verificationExecuted: false,
        consumes: {
            packageMaterializationApprovalAuditCountersignaturePolicy: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationApprovalAuditCountersignaturePolicy.status ?? "planned-disabled",
                auditCountersignatureVersion: packageMaterializationApprovalAuditCountersignaturePolicy.auditCountersignatureVersion ?? "P25.62",
                countersignatureCreated: false,
                countersignatureRecordStored: false,
            },
            packageMaterializationApprovalAuditAccessPolicy: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationApprovalAuditAccessPolicy.status ?? "planned-disabled",
                auditAccessVersion: packageMaterializationApprovalAuditAccessPolicy.auditAccessVersion ?? "P25.53",
                auditRecordRead: false,
                accessGranted: false,
            },
            packageMaterializationFinalApprovalChecklist: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationFinalApprovalChecklist.status ?? "planned-disabled",
                checklistVersion: packageMaterializationFinalApprovalChecklist.checklistVersion ?? "P25.40",
                finalApprovalGranted: false,
            },
        },
        auditCountersignatureVerificationPolicy: {
            policy: "verify-countersignature-after-countersignature-record-defined",
            selectCountersignatureVerificationPolicyNow: false,
            identifyCountersignatureVerificationSubjectNow: false,
            identifyCountersignatureVerificationAuthorityNow: false,
            readCountersignatureNow: false,
            readCountersignatureRecordNow: false,
            parseCountersignaturePayloadNow: false,
            readCountersignatureSignatureNow: false,
            verifyCountersignatureSignatureNow: false,
            computeCountersignatureHashNow: false,
            matchCountersignatureHashNow: false,
            linkCountersignatureChainNow: false,
            verifyCountersignatureChainNow: false,
            prepareCountersignatureVerificationNow: false,
            executeCountersignatureVerificationNow: false,
            storeCountersignatureVerificationNow: false,
            publishCountersignatureVerificationNow: false,
            readAuditRecordNow: false,
            queryAuditRecordNow: false,
            linkAuditRecordCountersignatureVerificationNow: false,
            verifyAuditRecordCountersignatureVerificationNow: false,
            signCountersignatureVerificationNow: false,
            verifyCountersignatureVerificationSignatureNow: false,
            computeCountersignatureVerificationHashNow: false,
            storeCountersignatureVerificationHashNow: false,
            requiredInputs: ["countersignatureRecord", "auditAccessGrant", "countersignatureVerificationPolicyId", "trustedCountersignatureVerificationAuthority"],
            countersignatureVerificationPolicyId: "future-materialization-audit-countersignature-verification",
            countersignatureVerificationScope: "future-policy-defined",
            countersignatureVerificationPayloadLogged: false,
        },
        auditCountersignatureVerificationChecks: [
            { id: "countersignature-record-present", required: true, planned: true, executed: false, passed: false },
            { id: "audit-access-granted", required: true, planned: true, executed: false, passed: false },
            { id: "countersignature-verification-policy-selected", required: true, planned: true, executed: false, passed: false },
            { id: "countersignature-signature-not-verified", required: true, planned: true, executed: false, passed: false },
            { id: "countersignature-verification-not-stored", required: true, planned: true, executed: false, passed: false },
        ],
        auditCountersignatureVerificationDecision: {
            status: "blocked",
            canSelectCountersignatureVerificationPolicy: false,
            canIdentifyCountersignatureVerificationSubject: false,
            canIdentifyCountersignatureVerificationAuthority: false,
            canReadCountersignature: false,
            canReadCountersignatureRecord: false,
            canParseCountersignaturePayload: false,
            canReadCountersignatureSignature: false,
            canVerifyCountersignatureSignature: false,
            canComputeCountersignatureHash: false,
            canMatchCountersignatureHash: false,
            canLinkCountersignatureChain: false,
            canVerifyCountersignatureChain: false,
            canPrepareCountersignatureVerification: false,
            canExecuteCountersignatureVerification: false,
            canPassCountersignatureVerification: false,
            canStoreCountersignatureVerification: false,
            canPublishCountersignatureVerification: false,
            canReadAuditRecord: false,
            canQueryAuditRecord: false,
            canLinkAuditRecordCountersignatureVerification: false,
            canVerifyAuditRecordCountersignatureVerification: false,
            canSignCountersignatureVerification: false,
            canVerifyCountersignatureVerificationSignature: false,
            canComputeCountersignatureVerificationHash: false,
            canStoreCountersignatureVerificationHash: false,
            canMaterializeFiles: false,
            canEnableRuntimeDispatch: false,
            reason: "audit countersignature verification policy is metadata-only and no countersignature record or access grant has been established",
        },
        noOpGuarantees: [
            "audit countersignature verification policy plan does not select countersignature verification policies",
            "audit countersignature verification policy plan does not identify countersignature verification subjects or authorities",
            "audit countersignature verification policy plan does not read countersignatures or countersignature records",
            "audit countersignature verification policy plan does not parse countersignature payloads",
            "audit countersignature verification policy plan does not read or verify countersignature signatures",
            "audit countersignature verification policy plan does not compute or match countersignature hashes",
            "audit countersignature verification policy plan does not link or verify countersignature chains",
            "audit countersignature verification policy plan does not prepare, execute, store, or publish countersignature verification results",
            "audit countersignature verification policy plan does not read or query audit records",
            "audit countersignature verification policy plan does not link or verify audit record countersignature verifications",
            "audit countersignature verification policy plan does not sign or verify countersignature verification signatures",
            "audit countersignature verification policy plan does not compute or store countersignature verification hashes",
            "audit countersignature verification policy plan does not create renderer-service directory",
            "audit countersignature verification policy plan does not write package or workspace files",
            "audit countersignature verification policy plan does not mutate lockfiles",
            "audit countersignature verification policy plan does not run commands",
            "audit countersignature verification policy plan does not generate build output",
            "audit countersignature verification policy plan does not register runtime dispatch",
        ],
        requiredBeforeRuntimeDispatch: [
            "define audit countersignature verification policy schema",
            "require countersignature record and access grant before verification",
            "define trusted countersignature verification authority and result semantics",
            "define countersignature verification signature and hash semantics",
            "keep render.thumbnail unavailable until executable adapter registration is approved",
        ],
    };
}

export function createRenderThumbnailRendererServicePackageMaterializationApprovalAuditCountersignatureRevocationPolicy(options = EMPTY_OBJECT) {
    const packageMaterializationApprovalAuditCountersignatureVerificationPolicy = options.packageMaterializationApprovalAuditCountersignatureVerificationPolicy ?? EMPTY_OBJECT;
    const packageMaterializationApprovalAuditAccessPolicy = options.packageMaterializationApprovalAuditAccessPolicy ?? EMPTY_OBJECT;
    const packageMaterializationFinalApprovalChecklist = options.packageMaterializationFinalApprovalChecklist ?? EMPTY_OBJECT;

    return {
        status: "planned-disabled",
        auditCountersignatureRevocationVersion: "P25.64",
        adapter: "renderer-service",
        command: CommandDescriptors.RENDER_THUMBNAIL.id,
        dryRunOnly: true,
        approvalRequired: true,
        approved: false,
        finalApprovalGranted: false,
        countersignatureRevocationRequired: true,
        countersignatureRevocationPlanned: true,
        countersignatureRevocationPolicySelected: false,
        countersignatureRevocationSubjectIdentified: false,
        countersignatureRevocationAuthorityIdentified: false,
        countersignatureRevocationReasonCaptured: false,
        countersignatureRevocationScopeComputed: false,
        countersignatureRevocationRequestPrepared: false,
        countersignatureRevocationRequestValidated: false,
        countersignatureRevocationRequestStored: false,
        countersignatureRevocationExecuted: false,
        countersignatureRevoked: false,
        countersignatureRevocationPublished: false,
        countersignatureRevocationRecordCreated: false,
        countersignatureRevocationRecordStored: false,
        countersignatureRevocationRecordPublished: false,
        countersignatureRead: false,
        countersignatureRecordRead: false,
        countersignatureVerificationRead: false,
        countersignatureVerificationRevoked: false,
        countersignatureVerificationVerified: false,
        auditRecordRead: false,
        auditRecordQueried: false,
        auditRecordCountersignatureRevocationLinked: false,
        auditRecordCountersignatureRevocationVerified: false,
        countersignatureRevocationSignatureCreated: false,
        countersignatureRevocationSignatureVerified: false,
        countersignatureRevocationHashComputed: false,
        countersignatureRevocationHashStored: false,
        materializationReady: false,
        materializationApproved: false,
        materializationApprovedNow: false,
        tokenAccepted: false,
        tokenStored: false,
        tokenValidated: false,
        tokenConsumed: false,
        tokenRevoked: false,
        executeNow: false,
        verifyNow: false,
        rollbackNow: false,
        dispatch: false,
        networkDispatch: false,
        runtimeRegistration: false,
        localFileWrites: false,
        hostStartup: false,
        processSpawn: false,
        packageCreated: false,
        workspaceMutation: false,
        scriptRunnable: false,
        fileMaterialization: false,
        lockfileMutation: false,
        rootPackageJsonMutation: false,
        pnpmWorkspaceMutation: false,
        commandExecution: false,
        buildOutput: false,
        packageScriptsRunnable: false,
        filesWritten: false,
        rollbackExecuted: false,
        verificationExecuted: false,
        consumes: {
            packageMaterializationApprovalAuditCountersignatureVerificationPolicy: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationApprovalAuditCountersignatureVerificationPolicy.status ?? "planned-disabled",
                auditCountersignatureVerificationVersion:
                    packageMaterializationApprovalAuditCountersignatureVerificationPolicy.auditCountersignatureVerificationVersion ?? "P25.63",
                countersignatureVerificationExecuted: false,
                countersignatureVerificationStored: false,
            },
            packageMaterializationApprovalAuditAccessPolicy: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationApprovalAuditAccessPolicy.status ?? "planned-disabled",
                auditAccessVersion: packageMaterializationApprovalAuditAccessPolicy.auditAccessVersion ?? "P25.53",
                auditRecordRead: false,
                accessGranted: false,
            },
            packageMaterializationFinalApprovalChecklist: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationFinalApprovalChecklist.status ?? "planned-disabled",
                checklistVersion: packageMaterializationFinalApprovalChecklist.checklistVersion ?? "P25.40",
                finalApprovalGranted: false,
            },
        },
        auditCountersignatureRevocationPolicy: {
            policy: "revoke-countersignature-after-verification-policy-defined",
            selectCountersignatureRevocationPolicyNow: false,
            identifyCountersignatureRevocationSubjectNow: false,
            identifyCountersignatureRevocationAuthorityNow: false,
            captureCountersignatureRevocationReasonNow: false,
            computeCountersignatureRevocationScopeNow: false,
            prepareCountersignatureRevocationRequestNow: false,
            validateCountersignatureRevocationRequestNow: false,
            storeCountersignatureRevocationRequestNow: false,
            executeCountersignatureRevocationNow: false,
            revokeCountersignatureNow: false,
            publishCountersignatureRevocationNow: false,
            createCountersignatureRevocationRecordNow: false,
            storeCountersignatureRevocationRecordNow: false,
            publishCountersignatureRevocationRecordNow: false,
            readCountersignatureNow: false,
            readCountersignatureRecordNow: false,
            readCountersignatureVerificationNow: false,
            revokeCountersignatureVerificationNow: false,
            verifyCountersignatureVerificationNow: false,
            readAuditRecordNow: false,
            queryAuditRecordNow: false,
            linkAuditRecordCountersignatureRevocationNow: false,
            verifyAuditRecordCountersignatureRevocationNow: false,
            signCountersignatureRevocationNow: false,
            verifyCountersignatureRevocationSignatureNow: false,
            computeCountersignatureRevocationHashNow: false,
            storeCountersignatureRevocationHashNow: false,
            requiredInputs: [
                "countersignatureVerificationRecord",
                "auditAccessGrant",
                "countersignatureRevocationPolicyId",
                "trustedCountersignatureRevocationAuthority",
                "revocationReason",
            ],
            countersignatureRevocationPolicyId: "future-materialization-audit-countersignature-revocation",
            countersignatureRevocationScope: "future-policy-defined",
            countersignatureRevocationPayloadLogged: false,
        },
        auditCountersignatureRevocationChecks: [
            { id: "countersignature-verification-record-present", required: true, planned: true, executed: false, passed: false },
            { id: "audit-access-granted", required: true, planned: true, executed: false, passed: false },
            { id: "countersignature-revocation-policy-selected", required: true, planned: true, executed: false, passed: false },
            { id: "countersignature-not-revoked", required: true, planned: true, executed: false, passed: false },
            { id: "countersignature-revocation-record-not-stored", required: true, planned: true, executed: false, passed: false },
        ],
        auditCountersignatureRevocationDecision: {
            status: "blocked",
            canSelectCountersignatureRevocationPolicy: false,
            canIdentifyCountersignatureRevocationSubject: false,
            canIdentifyCountersignatureRevocationAuthority: false,
            canCaptureCountersignatureRevocationReason: false,
            canComputeCountersignatureRevocationScope: false,
            canPrepareCountersignatureRevocationRequest: false,
            canValidateCountersignatureRevocationRequest: false,
            canStoreCountersignatureRevocationRequest: false,
            canExecuteCountersignatureRevocation: false,
            canRevokeCountersignature: false,
            canPublishCountersignatureRevocation: false,
            canCreateCountersignatureRevocationRecord: false,
            canStoreCountersignatureRevocationRecord: false,
            canPublishCountersignatureRevocationRecord: false,
            canReadCountersignature: false,
            canReadCountersignatureRecord: false,
            canReadCountersignatureVerification: false,
            canRevokeCountersignatureVerification: false,
            canVerifyCountersignatureVerification: false,
            canReadAuditRecord: false,
            canQueryAuditRecord: false,
            canLinkAuditRecordCountersignatureRevocation: false,
            canVerifyAuditRecordCountersignatureRevocation: false,
            canSignCountersignatureRevocation: false,
            canVerifyCountersignatureRevocationSignature: false,
            canComputeCountersignatureRevocationHash: false,
            canStoreCountersignatureRevocationHash: false,
            canMaterializeFiles: false,
            canEnableRuntimeDispatch: false,
            reason: "audit countersignature revocation policy is metadata-only and no countersignature verification record or access grant has been established",
        },
        noOpGuarantees: [
            "audit countersignature revocation policy plan does not select countersignature revocation policies",
            "audit countersignature revocation policy plan does not identify countersignature revocation subjects or authorities",
            "audit countersignature revocation policy plan does not capture revocation reasons or compute revocation scopes",
            "audit countersignature revocation policy plan does not prepare, validate, store, execute, or publish revocation requests",
            "audit countersignature revocation policy plan does not revoke countersignatures",
            "audit countersignature revocation policy plan does not create, store, or publish countersignature revocation records",
            "audit countersignature revocation policy plan does not read countersignatures or countersignature records",
            "audit countersignature revocation policy plan does not read, revoke, or verify countersignature verification records",
            "audit countersignature revocation policy plan does not read or query audit records",
            "audit countersignature revocation policy plan does not link or verify audit record countersignature revocations",
            "audit countersignature revocation policy plan does not sign or verify countersignature revocation signatures",
            "audit countersignature revocation policy plan does not compute or store countersignature revocation hashes",
            "audit countersignature revocation policy plan does not create renderer-service directory",
            "audit countersignature revocation policy plan does not write package or workspace files",
            "audit countersignature revocation policy plan does not mutate lockfiles",
            "audit countersignature revocation policy plan does not run commands",
            "audit countersignature revocation policy plan does not generate build output",
            "audit countersignature revocation policy plan does not register runtime dispatch",
        ],
        requiredBeforeRuntimeDispatch: [
            "define audit countersignature revocation policy schema",
            "require countersignature verification record and access grant before revocation",
            "define trusted countersignature revocation authority and record semantics",
            "define countersignature revocation signature and hash semantics",
            "keep render.thumbnail unavailable until executable adapter registration is approved",
        ],
    };
}

export function createRenderThumbnailRendererServicePackageMaterializationApprovalAuditCountersignatureRevocationAppealPolicy(options = EMPTY_OBJECT) {
    const packageMaterializationApprovalAuditCountersignatureRevocationPolicy = options.packageMaterializationApprovalAuditCountersignatureRevocationPolicy ?? EMPTY_OBJECT;
    const packageMaterializationApprovalAuditAccessPolicy = options.packageMaterializationApprovalAuditAccessPolicy ?? EMPTY_OBJECT;
    const packageMaterializationFinalApprovalChecklist = options.packageMaterializationFinalApprovalChecklist ?? EMPTY_OBJECT;

    return {
        status: "planned-disabled",
        auditCountersignatureRevocationAppealVersion: "P25.65",
        adapter: "renderer-service",
        command: CommandDescriptors.RENDER_THUMBNAIL.id,
        dryRunOnly: true,
        approvalRequired: true,
        approved: false,
        finalApprovalGranted: false,
        countersignatureRevocationAppealRequired: true,
        countersignatureRevocationAppealPlanned: true,
        countersignatureRevocationAppealPolicySelected: false,
        countersignatureRevocationAppealSubjectIdentified: false,
        countersignatureRevocationAppealAuthorityIdentified: false,
        countersignatureRevocationAppealReasonCaptured: false,
        countersignatureRevocationAppealScopeComputed: false,
        countersignatureRevocationAppealRequestPrepared: false,
        countersignatureRevocationAppealRequestValidated: false,
        countersignatureRevocationAppealRequestStored: false,
        countersignatureRevocationAppealExecuted: false,
        countersignatureRevocationAppealed: false,
        countersignatureRevocationAppealGranted: false,
        countersignatureRevocationAppealDenied: false,
        countersignatureRevocationAppealPublished: false,
        countersignatureRevocationAppealRecordCreated: false,
        countersignatureRevocationAppealRecordStored: false,
        countersignatureRevocationAppealRecordPublished: false,
        countersignatureRevocationRead: false,
        countersignatureRevocationRecordRead: false,
        countersignatureRead: false,
        countersignatureRevocationVerified: false,
        auditRecordRead: false,
        auditRecordQueried: false,
        auditRecordCountersignatureRevocationAppealLinked: false,
        auditRecordCountersignatureRevocationAppealVerified: false,
        countersignatureRevocationAppealSignatureCreated: false,
        countersignatureRevocationAppealSignatureVerified: false,
        countersignatureRevocationAppealHashComputed: false,
        countersignatureRevocationAppealHashStored: false,
        materializationReady: false,
        materializationApproved: false,
        materializationApprovedNow: false,
        tokenAccepted: false,
        tokenStored: false,
        tokenValidated: false,
        tokenConsumed: false,
        tokenRevoked: false,
        executeNow: false,
        verifyNow: false,
        rollbackNow: false,
        dispatch: false,
        networkDispatch: false,
        runtimeRegistration: false,
        localFileWrites: false,
        hostStartup: false,
        processSpawn: false,
        packageCreated: false,
        workspaceMutation: false,
        scriptRunnable: false,
        fileMaterialization: false,
        lockfileMutation: false,
        rootPackageJsonMutation: false,
        pnpmWorkspaceMutation: false,
        commandExecution: false,
        buildOutput: false,
        packageScriptsRunnable: false,
        filesWritten: false,
        rollbackExecuted: false,
        verificationExecuted: false,
        consumes: {
            packageMaterializationApprovalAuditCountersignatureRevocationPolicy: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationApprovalAuditCountersignatureRevocationPolicy.status ?? "planned-disabled",
                auditCountersignatureRevocationVersion:
                    packageMaterializationApprovalAuditCountersignatureRevocationPolicy.auditCountersignatureRevocationVersion ?? "P25.64",
                countersignatureRevoked: false,
                countersignatureRevocationRecordStored: false,
            },
            packageMaterializationApprovalAuditAccessPolicy: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationApprovalAuditAccessPolicy.status ?? "planned-disabled",
                auditAccessVersion: packageMaterializationApprovalAuditAccessPolicy.auditAccessVersion ?? "P25.53",
                auditRecordRead: false,
                accessGranted: false,
            },
            packageMaterializationFinalApprovalChecklist: {
                requiredStatus: "planned-disabled",
                currentStatus: packageMaterializationFinalApprovalChecklist.status ?? "planned-disabled",
                checklistVersion: packageMaterializationFinalApprovalChecklist.checklistVersion ?? "P25.40",
                finalApprovalGranted: false,
            },
        },
        auditCountersignatureRevocationAppealPolicy: {
            policy: "appeal-countersignature-revocation-after-revocation-policy-defined",
            selectCountersignatureRevocationAppealPolicyNow: false,
            identifyCountersignatureRevocationAppealSubjectNow: false,
            identifyCountersignatureRevocationAppealAuthorityNow: false,
            captureCountersignatureRevocationAppealReasonNow: false,
            computeCountersignatureRevocationAppealScopeNow: false,
            prepareCountersignatureRevocationAppealRequestNow: false,
            validateCountersignatureRevocationAppealRequestNow: false,
            storeCountersignatureRevocationAppealRequestNow: false,
            executeCountersignatureRevocationAppealNow: false,
            appealCountersignatureRevocationNow: false,
            grantCountersignatureRevocationAppealNow: false,
            denyCountersignatureRevocationAppealNow: false,
            publishCountersignatureRevocationAppealNow: false,
            createCountersignatureRevocationAppealRecordNow: false,
            storeCountersignatureRevocationAppealRecordNow: false,
            publishCountersignatureRevocationAppealRecordNow: false,
            readCountersignatureRevocationNow: false,
            readCountersignatureRevocationRecordNow: false,
            readCountersignatureNow: false,
            verifyCountersignatureRevocationNow: false,
            readAuditRecordNow: false,
            queryAuditRecordNow: false,
            linkAuditRecordCountersignatureRevocationAppealNow: false,
            verifyAuditRecordCountersignatureRevocationAppealNow: false,
            signCountersignatureRevocationAppealNow: false,
            verifyCountersignatureRevocationAppealSignatureNow: false,
            computeCountersignatureRevocationAppealHashNow: false,
            storeCountersignatureRevocationAppealHashNow: false,
            requiredInputs: [
                "countersignatureRevocationRecord",
                "auditAccessGrant",
                "countersignatureRevocationAppealPolicyId",
                "trustedCountersignatureRevocationAppealAuthority",
                "appealReason",
            ],
            countersignatureRevocationAppealPolicyId: "future-materialization-audit-countersignature-revocation-appeal",
            countersignatureRevocationAppealScope: "future-policy-defined",
            countersignatureRevocationAppealPayloadLogged: false,
        },
        auditCountersignatureRevocationAppealChecks: [
            { id: "countersignature-revocation-record-present", required: true, planned: true, executed: false, passed: false },
            { id: "audit-access-granted", required: true, planned: true, executed: false, passed: false },
            { id: "countersignature-revocation-appeal-policy-selected", required: true, planned: true, executed: false, passed: false },
            { id: "countersignature-revocation-not-appealed", required: true, planned: true, executed: false, passed: false },
            { id: "countersignature-revocation-appeal-record-not-stored", required: true, planned: true, executed: false, passed: false },
        ],
        auditCountersignatureRevocationAppealDecision: {
            status: "blocked",
            canSelectCountersignatureRevocationAppealPolicy: false,
            canIdentifyCountersignatureRevocationAppealSubject: false,
            canIdentifyCountersignatureRevocationAppealAuthority: false,
            canCaptureCountersignatureRevocationAppealReason: false,
            canComputeCountersignatureRevocationAppealScope: false,
            canPrepareCountersignatureRevocationAppealRequest: false,
            canValidateCountersignatureRevocationAppealRequest: false,
            canStoreCountersignatureRevocationAppealRequest: false,
            canExecuteCountersignatureRevocationAppeal: false,
            canAppealCountersignatureRevocation: false,
            canGrantCountersignatureRevocationAppeal: false,
            canDenyCountersignatureRevocationAppeal: false,
            canPublishCountersignatureRevocationAppeal: false,
            canCreateCountersignatureRevocationAppealRecord: false,
            canStoreCountersignatureRevocationAppealRecord: false,
            canPublishCountersignatureRevocationAppealRecord: false,
            canReadCountersignatureRevocation: false,
            canReadCountersignatureRevocationRecord: false,
            canReadCountersignature: false,
            canVerifyCountersignatureRevocation: false,
            canReadAuditRecord: false,
            canQueryAuditRecord: false,
            canLinkAuditRecordCountersignatureRevocationAppeal: false,
            canVerifyAuditRecordCountersignatureRevocationAppeal: false,
            canSignCountersignatureRevocationAppeal: false,
            canVerifyCountersignatureRevocationAppealSignature: false,
            canComputeCountersignatureRevocationAppealHash: false,
            canStoreCountersignatureRevocationAppealHash: false,
            canMaterializeFiles: false,
            canEnableRuntimeDispatch: false,
            reason: "audit countersignature revocation appeal policy is metadata-only and no countersignature revocation record or access grant has been established",
        },
        noOpGuarantees: [
            "audit countersignature revocation appeal policy plan does not select countersignature revocation appeal policies",
            "audit countersignature revocation appeal policy plan does not identify countersignature revocation appeal subjects or authorities",
            "audit countersignature revocation appeal policy plan does not capture appeal reasons or compute appeal scopes",
            "audit countersignature revocation appeal policy plan does not prepare, validate, store, execute, or publish appeal requests",
            "audit countersignature revocation appeal policy plan does not appeal countersignature revocations",
            "audit countersignature revocation appeal policy plan does not grant or deny countersignature revocation appeals",
            "audit countersignature revocation appeal policy plan does not create, store, or publish countersignature revocation appeal records",
            "audit countersignature revocation appeal policy plan does not read countersignature revocations or revocation records",
            "audit countersignature revocation appeal policy plan does not read countersignatures",
            "audit countersignature revocation appeal policy plan does not read or query audit records",
            "audit countersignature revocation appeal policy plan does not link or verify audit record countersignature revocation appeals",
            "audit countersignature revocation appeal policy plan does not sign or verify countersignature revocation appeal signatures",
            "audit countersignature revocation appeal policy plan does not compute or store countersignature revocation appeal hashes",
            "audit countersignature revocation appeal policy plan does not create renderer-service directory",
            "audit countersignature revocation appeal policy plan does not write package or workspace files",
            "audit countersignature revocation appeal policy plan does not mutate lockfiles",
            "audit countersignature revocation appeal policy plan does not run commands",
            "audit countersignature revocation appeal policy plan does not generate build output",
            "audit countersignature revocation appeal policy plan does not register runtime dispatch",
        ],
        requiredBeforeRuntimeDispatch: [
            "define audit countersignature revocation appeal policy schema",
            "require countersignature revocation record and access grant before appeal",
            "define trusted countersignature revocation appeal authority and record semantics",
            "define countersignature revocation appeal signature and hash semantics",
            "keep render.thumbnail unavailable until executable adapter registration is approved",
        ],
    };
}

export function createRenderThumbnailRendererServiceHostLifecycleTestFixtures(options = EMPTY_OBJECT) {
    const noopServiceHostScaffold = options.noopServiceHostScaffold ?? EMPTY_OBJECT;
    const healthNoopContractFixtures = options.healthNoopContractFixtures ?? EMPTY_OBJECT;

    return {
        status: "planned-disabled",
        fixtureVersion: "P25.26",
        adapter: "renderer-service",
        command: CommandDescriptors.RENDER_THUMBNAIL.id,
        dispatch: false,
        networkDispatch: false,
        runtimeRegistration: false,
        localFileWrites: false,
        hostStartup: false,
        processSpawn: false,
        consumes: {
            noopServiceHostScaffold: {
                requiredStatus: "planned-disabled",
                currentStatus: noopServiceHostScaffold.status ?? "planned-disabled",
                scaffoldVersion: noopServiceHostScaffold.scaffoldVersion ?? "P25.25",
                hostStartup: false,
            },
            healthNoopContractFixtures: {
                requiredStatus: "planned-disabled",
                currentStatus: healthNoopContractFixtures.status ?? "planned-disabled",
                fixtureVersion: healthNoopContractFixtures.fixtureVersion ?? "P25.24",
                currentDispatch: Boolean(healthNoopContractFixtures.dispatch),
            },
        },
        fixtureMatrix: [
            {
                id: "start-plan-does-not-spawn-process",
                lifecycle: "start",
                expectedStatus: "planned",
                processSpawn: false,
                hostStartup: false,
                dispatch: false,
            },
            {
                id: "stop-plan-does-not-signal-process",
                lifecycle: "stop",
                expectedStatus: "planned",
                processSignal: false,
                hostStartup: false,
                dispatch: false,
            },
            {
                id: "readiness-plan-uses-health-fixture",
                lifecycle: "readiness",
                expectedStatus: "planned",
                healthFixture: healthNoopContractFixtures.healthContract?.id ?? "renderer-service-health",
                networkDispatch: false,
                dispatch: false,
            },
            {
                id: "supervision-plan-disabled",
                lifecycle: "supervision",
                expectedStatus: "planned-disabled",
                restartPolicy: "none",
                processSpawn: false,
                dispatch: false,
            },
            {
                id: "logs-plan-redacts-token-values",
                lifecycle: "logs",
                expectedStatus: "planned",
                structuredLogs: true,
                tokenValuesIncluded: false,
                localFileWrites: false,
            },
            {
                id: "error-plan-preserves-unavailable-payload",
                lifecycle: "error",
                expectedStatus: "planned",
                errorCode: "renderer_service_unavailable",
                dispatch: false,
                runtimeRegistration: false,
            },
        ],
        assertions: {
            hostStartup: false,
            processSpawn: false,
            networkDispatch: false,
            runtimeRegistration: false,
            localFileWrites: false,
            tokenValuesIncluded: false,
            unavailablePayloadIncludesScaffold: true,
        },
        testEntrypoints: {
            commandRuntime: "createRenderThumbnailRendererServiceHostLifecycleTestFixtures",
            mcp: "render.thumbnail unavailable payload exposes lifecycle fixtures",
            cli: "render thumbnail unavailable payload exposes lifecycle fixtures",
        },
        noOpGuarantees: [
            "do not spawn renderer-service in lifecycle fixture tests",
            "do not bind TCP ports",
            "do not probe health endpoints",
            "do not write lifecycle logs to disk",
            "do not register runtime dispatch",
        ],
        requiredBeforeRuntimeDispatch: [
            "implement lifecycle tests against a real no-op host in a dedicated task",
            "prove process start, readiness, stop, and failure cleanup before enabling host management",
            "keep unavailable payload compatibility when lifecycle tests become executable",
        ],
    };
}

export function createRenderThumbnailRendererServiceNoopServiceHostScaffold(options = EMPTY_OBJECT) {
    const client = options.client ?? EMPTY_OBJECT;
    const healthNoopContractFixtures = options.healthNoopContractFixtures ?? EMPTY_OBJECT;
    const implementationSliceAudit = options.implementationSliceAudit ?? EMPTY_OBJECT;
    const endpoint = normalizeOptionalString(client.endpoint);
    const healthEndpoint =
        normalizeOptionalString(client.healthEndpoint) ?? (endpoint ? joinUrlPath(endpoint, "health") : null);

    return {
        status: "planned-disabled",
        scaffoldVersion: "P25.25",
        adapter: "renderer-service",
        command: CommandDescriptors.RENDER_THUMBNAIL.id,
        dispatch: false,
        networkDispatch: false,
        runtimeRegistration: false,
        localFileWrites: false,
        hostStartup: false,
        selectedSlice: implementationSliceAudit.selectedSlice?.id ?? "renderer-service-health-and-noop-contract",
        consumes: {
            healthNoopContractFixtures: {
                requiredStatus: "planned-disabled",
                currentStatus: healthNoopContractFixtures.status ?? "planned-disabled",
                fixtureVersion: healthNoopContractFixtures.fixtureVersion ?? "P25.24",
                currentDispatch: Boolean(healthNoopContractFixtures.dispatch),
            },
            implementationSliceAudit: {
                auditVersion: implementationSliceAudit.auditVersion ?? "P25.23",
                currentSelectedSlice:
                    implementationSliceAudit.selectedSlice?.id ?? "renderer-service-health-and-noop-contract",
                enablesRuntimeDispatch: false,
            },
        },
        host: {
            id: "renderer-service-noop-host",
            packageName: "@penpot/renderer-service",
            entrypoint: "renderer-service noop-host",
            language: "typescript-node",
            defaultBindHost: "127.0.0.1",
            defaultPort: 6070,
            endpoint,
            healthEndpoint,
            startCommand: "pnpm --filter @penpot/renderer-service start:noop",
            startsProcess: false,
            registersRuntime: false,
            callsBackendRpc: false,
            rendersPng: false,
            writesLocalFiles: false,
        },
        routes: [
            {
                id: "health",
                method: "GET",
                path: "/health",
                fixture: healthNoopContractFixtures.healthContract?.id ?? "renderer-service-health",
                status: "planned",
                dispatch: false,
            },
            {
                id: "thumbnail-render-noop",
                method: "POST",
                path: "/thumbnail",
                operation: "thumbnail.render",
                fixture: healthNoopContractFixtures.noopRenderContract?.id ?? "thumbnail-render-noop",
                status: "planned",
                dispatch: false,
            },
        ],
        configuration: {
            env: {
                host: "PENPOT_RENDERER_SERVICE_HOST",
                port: "PENPOT_RENDERER_SERVICE_PORT",
                publicUri: "PENPOT_RENDERER_SERVICE_URI",
                mode: "PENPOT_RENDERER_SERVICE_MODE",
            },
            defaultMode: "noop",
            requiredModeBeforeStartup: "noop",
            tokenValuesIncluded: false,
        },
        lifecycle: {
            start: "manual-future-task",
            stop: "manual-future-task",
            readiness: "health route fixture only",
            supervision: "not implemented",
            hostStartup: false,
        },
        observability: {
            structuredLogs: true,
            requestIdHeader: "x-request-id",
            auditHeaders: [
                "x-penpot-command",
                "x-penpot-renderer-operation",
                "x-penpot-renderer-adapter",
                "x-penpot-entrypoint",
            ],
            tokenValuesIncluded: false,
        },
        noOpGuarantees: [
            "do not start a renderer-service process from command-runtime, MCP, or CLI",
            "do not register renderer-service runtime dispatch",
            "do not call backend thumbnail RPCs",
            "do not render PNG bytes",
            "do not write local output files",
        ],
        requiredBeforeRuntimeDispatch: [
            "create the renderer-service package and noop host entrypoint in a dedicated implementation task",
            "add host lifecycle tests before any MCP or CLI startup command can manage it",
            "wire health preflight to the host only after explicit opt-in and endpoint config are ready",
            "replace noop thumbnail.render response with a gated render implementation before enabling dispatch",
        ],
    };
}

export function createRenderThumbnailRendererServiceHealthNoopContractFixtures(options = EMPTY_OBJECT) {
    const client = options.client ?? EMPTY_OBJECT;
    const implementationSliceAudit = options.implementationSliceAudit ?? EMPTY_OBJECT;
    const healthPreflight = options.healthPreflight ?? EMPTY_OBJECT;
    const clientRequest = options.clientRequest ?? EMPTY_OBJECT;
    const endpoint = normalizeOptionalString(client.endpoint);
    const healthEndpoint = normalizeOptionalString(client.healthEndpoint) ?? (endpoint ? joinUrlPath(endpoint, "health") : null);
    const probeTimeoutMs = normalizeProbeTimeoutMs(client.probeTimeoutMs, 2500);

    return {
        status: "planned-disabled",
        fixtureVersion: "P25.24",
        adapter: "renderer-service",
        command: CommandDescriptors.RENDER_THUMBNAIL.id,
        dispatch: false,
        networkDispatch: false,
        runtimeRegistration: false,
        localFileWrites: false,
        selectedSlice: implementationSliceAudit.selectedSlice?.id ?? "renderer-service-health-and-noop-contract",
        consumes: {
            implementationSliceAudit: {
                requiredSelectedSlice: "renderer-service-health-and-noop-contract",
                currentSelectedSlice:
                    implementationSliceAudit.selectedSlice?.id ?? "renderer-service-health-and-noop-contract",
                auditVersion: implementationSliceAudit.auditVersion ?? "P25.23",
                enablesRuntimeDispatch: false,
            },
            healthPreflight: {
                requiredStatus: "ok",
                currentStatus: healthPreflight.status ?? "planned-disabled",
                currentDispatch: Boolean(healthPreflight.dispatch),
            },
            clientRequest: {
                requiredDispatch: true,
                currentDispatch: Boolean(clientRequest.dispatch),
                method: clientRequest.method ?? "POST",
            },
        },
        healthContract: {
            id: "renderer-service-health",
            method: "GET",
            path: "/health",
            endpoint: healthEndpoint,
            timeoutMs: probeTimeoutMs,
            dispatch: false,
            networkDispatch: false,
            request: {
                headers: {
                    accept: "application/json",
                },
                body: null,
            },
            okResponse: {
                status: 200,
                contentType: "application/json",
                body: {
                    status: "ok",
                    renderer: "penpot-thumbnail-renderer",
                    mode: "noop",
                    runtimeRegistration: false,
                    dispatch: false,
                    capabilities: ["health", "thumbnail.render.noop"],
                },
            },
            unavailableResponse: {
                status: 503,
                contentType: "application/json",
                body: {
                    status: "unavailable",
                    code: "renderer_service_health_unavailable",
                    retryable: true,
                },
            },
        },
        noopRenderContract: {
            id: "thumbnail-render-noop",
            operation: "thumbnail.render",
            method: "POST",
            endpoint,
            dispatch: false,
            networkDispatch: false,
            localFileWrites: false,
            requestFields: [
                "command",
                "operation",
                "adapter",
                "target",
                "artifact",
                "cache",
                "backendRpc",
                "render",
            ],
            response: {
                status: 501,
                contentType: "application/json",
                body: {
                    status: "noop",
                    code: "renderer_service_noop",
                    message: "renderer-service no-op fixture does not render PNG bytes",
                    artifact: null,
                    resource: null,
                    runtimeRegistration: false,
                    dispatch: false,
                    localFileWrites: false,
                },
            },
        },
        fixtureCases: [
            {
                id: "health-ok-no-runtime-registration",
                contract: "health",
                expectedStatus: 200,
                dispatch: false,
                runtimeRegistration: false,
            },
            {
                id: "health-unavailable-no-dispatch",
                contract: "health",
                expectedStatus: 503,
                dispatch: false,
                retryable: true,
            },
            {
                id: "thumbnail-render-noop-no-png",
                contract: "thumbnail.render",
                expectedStatus: 501,
                dispatch: false,
                resource: null,
            },
            {
                id: "mcp-unavailable-payload-no-local-write",
                contract: "mcp",
                dispatch: false,
                localFileWrites: false,
            },
            {
                id: "cli-unavailable-payload-no-output-write",
                contract: "cli",
                dispatch: false,
                localFileWrites: false,
            },
        ],
        noOpGuarantees: [
            "do not perform health fetches from command-runtime, MCP, or CLI",
            "do not render PNG bytes",
            "do not call backend thumbnail RPCs",
            "do not register runtime dispatch",
            "do not write CLI --output files",
        ],
        requiredBeforeRuntimeDispatch: [
            "replace the no-op thumbnail.render response with a gated renderer-service implementation",
            "turn health preflight dispatch on only after endpoint config and opt-in gates are ready",
            "add integration tests that prove health fetch and render fetch are explicit runtime actions",
            "preserve unavailable payload compatibility or version it before enabling execution",
        ],
    };
}

export function createRenderThumbnailRendererServiceImplementationSliceAudit(options = EMPTY_OBJECT) {
    const enablementChecklist = options.enablementChecklist ?? EMPTY_OBJECT;
    const adapterRegistryManifest = options.adapterRegistryManifest ?? EMPTY_OBJECT;
    const executableAdapterRegistrationScaffold =
        options.executableAdapterRegistrationScaffold ?? EMPTY_OBJECT;
    const dispatchRegistrationPreflight = options.dispatchRegistrationPreflight ?? EMPTY_OBJECT;
    const requiredCapabilities = Array.isArray(options.requiredCapabilities)
        ? options.requiredCapabilities.map((item) => normalizeOptionalString(item)).filter(Boolean)
        : [];

    return {
        status: "planned-disabled",
        auditVersion: "P25.23",
        adapter: "renderer-service",
        command: CommandDescriptors.RENDER_THUMBNAIL.id,
        dispatch: false,
        networkDispatch: false,
        runtimeRegistration: false,
        localFileWrites: false,
        selectedSlice: {
            id: "renderer-service-health-and-noop-contract",
            title: "Renderer-service health and no-op contract fixtures",
            selected: true,
            dispatch: false,
            networkDispatch: false,
            runtimeRegistration: false,
            localFileWrites: false,
            enablesRuntimeDispatch: false,
            reason: "This is the smallest safe implementation slice because it can define service liveness, request/response shape, and fixture assertions without rendering thumbnails or registering command-runtime dispatch.",
        },
        auditedSurfaces: {
            backendRpc: [
                "get-file-data-for-thumbnail",
                "create-file-thumbnail",
                "create-file-object-thumbnail",
            ],
            frontendRuntime: [
                "app.main.data.workspace.thumbnails/render-thumbnail",
                "app.util.thumbnails",
            ],
            renderer: [
                "render-wasm worker/browser canvas runtime",
                "frontend rasterizer fallback",
            ],
            entrypoints: ["mcp render.thumbnail", "penpot-cli render thumbnail"],
        },
        implementationSlices: [
            {
                id: "renderer-service-health-and-noop-contract",
                selected: true,
                dispatch: false,
                networkDispatch: false,
                runtimeRegistration: false,
                localFileWrites: false,
                scope: [
                    "document health endpoint semantics",
                    "document no-op thumbnail.render request/response fixtures",
                    "keep MCP and CLI execution paths returning renderer_service_unavailable",
                ],
                exitCriteria: [
                    "fixtures parse and assert dispatch:false",
                    "MCP/CLI unavailable payloads expose the audit",
                    "no renderer-service HTTP client is called",
                ],
            },
            {
                id: "file-refresh-render",
                selected: false,
                dispatch: false,
                blockers: [
                    "renderer-service runtime implementation",
                    "backend thumbnail data auth/session forwarding",
                    "PNG resource normalization contract",
                    "integration tests with real service fixture",
                ],
            },
            {
                id: "file-reuse-cache-probe",
                selected: false,
                dispatch: false,
                blockers: [
                    "file thumbnail cache probe API",
                    "cache miss fallback to refresh render",
                    "stale revn behavior contract",
                ],
            },
            {
                id: "tagged-frame-refresh",
                selected: false,
                dispatch: false,
                blockers: [
                    "frame source data provider",
                    "file object thumbnail cache probe",
                    "tagged frame resource normalizer",
                ],
            },
        ],
        consumes: {
            enablementChecklist: {
                requiredStatus: "ready",
                currentStatus: enablementChecklist.status ?? "planned-disabled",
                checklistVersion: enablementChecklist.checklistVersion ?? "P25.22",
                mayEnableRuntime: false,
            },
            adapterRegistryManifest: {
                requiredStatus: "ready",
                currentStatus: adapterRegistryManifest.status ?? "planned-disabled",
                manifestVersion: adapterRegistryManifest.manifestVersion ?? "P25.21",
                runtimeExecutionRegistered: false,
            },
            executableAdapterRegistrationScaffold: {
                requiredStatus: "ready",
                currentStatus: executableAdapterRegistrationScaffold.status ?? "planned-disabled",
                scaffoldVersion: executableAdapterRegistrationScaffold.scaffoldVersion ?? "P25.20",
                runtimeRegistration: false,
            },
            dispatchRegistrationPreflight: {
                requiredStatus: "ready",
                currentStatus: dispatchRegistrationPreflight.status ?? "planned-disabled",
                preflightVersion: dispatchRegistrationPreflight.preflightVersion ?? "P25.19",
                runtimeRegistration: false,
            },
        },
        blockers: Array.from(
            new Set([
                "renderer-service-health-endpoint-contract",
                "renderer-service-noop-fixture-harness",
                "renderer-service-runtime-implementation",
                "runtime-execution-registration",
                ...requiredCapabilities,
            ])
        ),
        requiredBeforeRuntimeDispatch: [
            "implement the selected health/no-op contract slice first",
            "replace no-op fixtures with a gated renderer-service fixture harness",
            "prove backend RPC data/persist calls through a dedicated service boundary",
            "prove MCP resource returns stay metadata-only",
            "prove CLI --output writes only after normalized download URI execution exists",
            "enable command-runtime dispatch in a separate reviewed task",
        ],
    };
}

export function createRenderThumbnailRendererServiceEnablementChecklist(options = EMPTY_OBJECT) {
    const optInConfiguration = options.optInConfiguration ?? EMPTY_OBJECT;
    const executionGate = options.executionGate ?? EMPTY_OBJECT;
    const healthPreflight = options.healthPreflight ?? EMPTY_OBJECT;
    const executionClientHarness = options.executionClientHarness ?? EMPTY_OBJECT;
    const dispatchAdapterBoundary = options.dispatchAdapterBoundary ?? EMPTY_OBJECT;
    const unavailableErrorTaxonomy = options.unavailableErrorTaxonomy ?? EMPTY_OBJECT;
    const integrationFixtureHarness = options.integrationFixtureHarness ?? EMPTY_OBJECT;
    const dispatchRegistrationPreflight = options.dispatchRegistrationPreflight ?? EMPTY_OBJECT;
    const executableAdapterRegistrationScaffold =
        options.executableAdapterRegistrationScaffold ?? EMPTY_OBJECT;
    const adapterRegistryManifest = options.adapterRegistryManifest ?? EMPTY_OBJECT;
    const requiredCapabilities = Array.isArray(options.requiredCapabilities)
        ? options.requiredCapabilities.map((item) => normalizeOptionalString(item)).filter(Boolean)
        : [];
    const gates = [
        {
            id: "opt-in-configuration",
            source: "optInConfiguration",
            requiredStatus: "ready",
            currentStatus: optInConfiguration.status ?? "planned-disabled",
            satisfied: false,
            blocker: "renderer-service-opt-in-configuration",
        },
        {
            id: "execution-gate-open",
            source: "executionGate",
            requiredStatus: "open",
            currentStatus: executionGate.status ?? "closed",
            satisfied: false,
            blocker: "renderer-service-execution-gate",
        },
        {
            id: "health-preflight-ok",
            source: "healthPreflight",
            requiredStatus: "ok",
            currentStatus: healthPreflight.status ?? "planned-disabled",
            satisfied: false,
            blocker: "renderer-service-health-preflight",
        },
        {
            id: "execution-client-ready",
            source: "executionClientHarness",
            requiredStatus: "ready",
            currentStatus: executionClientHarness.status ?? "planned-disabled",
            satisfied: false,
            blocker: "renderer-service-execution-client",
        },
        {
            id: "dispatch-adapter-ready",
            source: "dispatchAdapterBoundary",
            requiredStatus: "ready",
            currentStatus: dispatchAdapterBoundary.status ?? "planned-disabled",
            satisfied: false,
            blocker: "renderer-service-dispatch-adapter",
        },
        {
            id: "integration-fixtures-ready",
            source: "integrationFixtureHarness",
            requiredStatus: "ready",
            currentStatus: integrationFixtureHarness.status ?? "planned-disabled",
            satisfied: false,
            blocker: "renderer-service-integration-fixtures",
        },
        {
            id: "dispatch-registration-ready",
            source: "dispatchRegistrationPreflight",
            requiredStatus: "ready",
            currentStatus: dispatchRegistrationPreflight.status ?? "planned-disabled",
            satisfied: false,
            blocker: "runtime-execution-registration",
        },
        {
            id: "adapter-registration-ready",
            source: "executableAdapterRegistrationScaffold",
            requiredStatus: "ready",
            currentStatus: executableAdapterRegistrationScaffold.status ?? "planned-disabled",
            satisfied: false,
            blocker: "renderer-service-adapter-registration",
        },
        {
            id: "adapter-registry-ready",
            source: "adapterRegistryManifest",
            requiredStatus: "ready",
            currentStatus: adapterRegistryManifest.status ?? "planned-disabled",
            satisfied: false,
            blocker: "renderer-service-adapter-registry",
        },
    ];
    const capabilityGates = requiredCapabilities.map((name) => ({
        id: `capability:${name}`,
        source: "requiredCapabilities",
        requiredStatus: "available",
        currentStatus: "planned",
        satisfied: false,
        blocker: name,
    }));
    const allGates = [...gates, ...capabilityGates];
    const blockers = Array.from(new Set(allGates.filter((gate) => !gate.satisfied).map((gate) => gate.blocker)));

    return {
        status: "planned-disabled",
        checklistVersion: "P25.22",
        adapter: "renderer-service",
        command: CommandDescriptors.RENDER_THUMBNAIL.id,
        dispatch: false,
        networkDispatch: false,
        runtimeRegistration: false,
        localFileWrites: false,
        reason: "renderer-service enablement checklist is metadata-only; executable runtime registration remains disabled until every gate is implemented and tested",
        gates: allGates,
        blockers,
        readiness: {
            allGatesSatisfied: false,
            mayEnableRuntime: false,
            mayDispatchNetwork: false,
            mayWriteLocalFiles: false,
        },
        versions: {
            unavailableErrorTaxonomy: unavailableErrorTaxonomy.taxonomyVersion ?? "P25.17",
            integrationFixtureHarness: integrationFixtureHarness.harnessVersion ?? "P25.18",
            dispatchRegistrationPreflight: dispatchRegistrationPreflight.preflightVersion ?? "P25.19",
            executableAdapterRegistrationScaffold:
                executableAdapterRegistrationScaffold.scaffoldVersion ?? "P25.20",
            adapterRegistryManifest: adapterRegistryManifest.manifestVersion ?? "P25.21",
        },
        requiredBeforeEnablement: [
            "implement renderer-service runtime and health endpoint",
            "prove file thumbnail cache reuse and refresh through integration fixtures",
            "prove tagged frame source data and resource normalization",
            "open execution gate only after explicit opt-in and endpoint config are validated",
            "register executable adapter only in a dedicated implementation task",
            "preserve MCP metadata-only resource returns and CLI --output download gating",
        ],
    };
}

export function createRenderThumbnailRendererServiceAdapterRegistryManifest(options = EMPTY_OBJECT) {
    const executableAdapterRegistrationScaffold =
        options.executableAdapterRegistrationScaffold ?? EMPTY_OBJECT;
    const dispatchRegistrationPreflight = options.dispatchRegistrationPreflight ?? EMPTY_OBJECT;
    const dispatchAdapterBoundary = options.dispatchAdapterBoundary ?? EMPTY_OBJECT;

    return {
        status: "planned-disabled",
        manifestVersion: "P25.21",
        adapter: "renderer-service",
        command: CommandDescriptors.RENDER_THUMBNAIL.id,
        dispatch: false,
        networkDispatch: false,
        runtimeRegistration: false,
        localFileWrites: false,
        reason: "renderer-service adapter registry manifest is documented as metadata-only until runtime registration is explicitly enabled",
        consumes: {
            executableAdapterRegistrationScaffold: {
                requiredStatus: "ready",
                currentStatus: executableAdapterRegistrationScaffold.status ?? "planned-disabled",
                scaffoldVersion: executableAdapterRegistrationScaffold.scaffoldVersion ?? "P25.20",
                runtimeExecutionRegistered: false,
            },
            dispatchRegistrationPreflight: {
                requiredStatus: "ready",
                currentStatus: dispatchRegistrationPreflight.status ?? "planned-disabled",
                preflightVersion: dispatchRegistrationPreflight.preflightVersion ?? "P25.19",
            },
            dispatchAdapterBoundary: {
                requiredStatus: "ready",
                currentStatus: dispatchAdapterBoundary.status ?? "planned-disabled",
                currentDispatch: Boolean(dispatchAdapterBoundary.dispatch),
            },
        },
        registry: {
            namespace: "render.thumbnail.adapters",
            key: "renderer-service",
            descriptorAdapterAlreadyPresent: true,
            runtimeExecutionRegistered: false,
            defaultEnabled: false,
            activation: "future gated implementation task",
        },
        entrypoints: {
            mcp: {
                tool: CommandDescriptors.RENDER_THUMBNAIL.mcpToolName,
                dryRunOnly: true,
                unavailablePayloadIncludesManifest: true,
                localFileWrites: false,
            },
            cli: {
                command: CommandDescriptors.RENDER_THUMBNAIL.cliCommand,
                dryRunOnly: true,
                unavailablePayloadIncludesManifest: true,
                outputWritesRequireNormalizedDownloadUri: true,
            },
        },
        noOpGuarantees: [
            "do not mutate command runtime adapter registry",
            "do not register executable MCP handlers",
            "do not register executable CLI handlers",
            "do not call renderer-service network endpoints",
            "do not write local files",
        ],
        requiredBeforeEnablement: [
            "adapter registry manifest status becomes ready in a dedicated implementation task",
            "P25.20 executable adapter registration scaffold becomes ready",
            "runtime execution registration is covered by MCP and CLI integration tests",
            "dry-run and unavailable payload contracts are preserved or versioned",
        ],
    };
}

export function createRenderThumbnailRendererServiceExecutableAdapterRegistrationScaffold(options = EMPTY_OBJECT) {
    const dispatchRegistrationPreflight = options.dispatchRegistrationPreflight ?? EMPTY_OBJECT;
    const dispatchAdapterBoundary = options.dispatchAdapterBoundary ?? EMPTY_OBJECT;
    const clientRequest = options.clientRequest ?? EMPTY_OBJECT;

    return {
        status: "planned-disabled",
        scaffoldVersion: "P25.20",
        adapter: "renderer-service",
        dispatch: false,
        networkDispatch: false,
        runtimeRegistration: false,
        localFileWrites: false,
        reason: "renderer-service executable adapter registration scaffold is documented as a no-op until the P25.19 preflight can register runtime dispatch",
        consumes: {
            dispatchRegistrationPreflight: {
                requiredStatus: "ready",
                currentStatus: dispatchRegistrationPreflight.status ?? "planned-disabled",
                mayRegisterDispatch: false,
                preflightVersion: dispatchRegistrationPreflight.preflightVersion ?? "P25.19",
            },
            dispatchAdapterBoundary: {
                requiredStatus: "ready",
                currentStatus: dispatchAdapterBoundary.status ?? "planned-disabled",
                currentDispatch: Boolean(dispatchAdapterBoundary.dispatch),
            },
            clientRequest: {
                requiredDispatch: true,
                currentDispatch: Boolean(clientRequest.dispatch),
                method: clientRequest.method ?? "POST",
            },
        },
        registrationSurface: {
            command: CommandDescriptors.RENDER_THUMBNAIL.id,
            adapter: "renderer-service",
            entrypoints: ["mcp", "cli"],
            helper: "createRenderThumbnailRendererServiceExecutableAdapterRegistrationScaffold",
            runtimeExecutionRegistered: false,
        },
        noOpBehavior: [
            "do not call fetch",
            "do not call backend RPC",
            "do not call exporter or plugin runtimes",
            "do not write local files",
            "return renderer_service_unavailable while disabled",
        ],
        requiredBeforeEnablement: [
            "P25.19 dispatch registration preflight reports ready",
            "renderer-service dispatch adapter boundary reports ready",
            "client request dispatch is enabled by a dedicated implementation task",
            "MCP and CLI unavailable-path tests are replaced with gated execution tests",
        ],
    };
}

export function createRenderThumbnailRendererServiceDispatchRegistrationPreflight(options = EMPTY_OBJECT) {
    const client = options.client ?? EMPTY_OBJECT;
    const availability = options.availability ?? EMPTY_OBJECT;
    const optInConfiguration = options.optInConfiguration ?? EMPTY_OBJECT;
    const executionGate = options.executionGate ?? EMPTY_OBJECT;
    const healthPreflight = options.healthPreflight ?? EMPTY_OBJECT;
    const executionClientHarness = options.executionClientHarness ?? EMPTY_OBJECT;
    const dispatchAdapterBoundary = options.dispatchAdapterBoundary ?? EMPTY_OBJECT;
    const unavailableErrorTaxonomy = options.unavailableErrorTaxonomy ?? EMPTY_OBJECT;
    const integrationFixtureHarness = options.integrationFixtureHarness ?? EMPTY_OBJECT;
    const requiredCapabilities = Array.isArray(options.requiredCapabilities)
        ? options.requiredCapabilities.map((item) => normalizeOptionalString(item)).filter(Boolean)
        : [];
    const checks = [
        {
            id: "explicit-opt-in",
            source: "executionGate.optIn.configured",
            required: true,
            satisfied: Boolean(executionGate.optIn?.configured),
            blocker: "explicit-opt-in",
        },
        {
            id: "endpoint-configured",
            source: "client.configured",
            required: true,
            satisfied: Boolean(client.configured),
            blocker: "renderer-service-endpoint",
        },
        {
            id: "service-implemented",
            source: "executionGate.readiness.serviceImplemented",
            required: true,
            satisfied: Boolean(executionGate.readiness?.serviceImplemented),
            blocker: "thumbnail-renderer-service-implementation",
        },
        {
            id: "integration-fixtures-ready",
            source: "integrationFixtureHarness.status",
            required: true,
            satisfied: integrationFixtureHarness.status === "ready",
            blocker: "renderer-service-integration-fixtures",
        },
        {
            id: "health-preflight-ready",
            source: "healthPreflight.status",
            required: true,
            satisfied: healthPreflight.status === "ok",
            blocker: "renderer-service-health-preflight",
        },
        {
            id: "dispatch-adapter-ready",
            source: "dispatchAdapterBoundary.status",
            required: true,
            satisfied: dispatchAdapterBoundary.status === "ready",
            blocker: "renderer-service-dispatch-adapter",
        },
        {
            id: "runtime-registration-ready",
            source: "command-runtime registration",
            required: true,
            satisfied: false,
            blocker: "runtime-execution-registration",
        },
    ];
    const capabilityChecks = requiredCapabilities.map((name) => ({
        id: `capability:${name}`,
        source: "executionGate.readiness.requiredCapabilities",
        required: true,
        satisfied: Boolean(
            executionGate.readiness?.requiredCapabilities?.some((capability) => capability.name === name && capability.satisfied)
        ),
        blocker: name,
    }));
    const allChecks = [...checks, ...capabilityChecks];
    const blockers = Array.from(new Set(allChecks.filter((check) => !check.satisfied).map((check) => check.blocker)));

    return {
        status: "planned-disabled",
        dispatch: false,
        networkDispatch: false,
        runtimeRegistration: false,
        localFileWrites: false,
        preflightVersion: "P25.19",
        reason: "renderer-service executable dispatch registration preflight is documented but disabled until all readiness checks pass in a future implementation task",
        current: {
            clientConfigured: Boolean(client.configured),
            availabilityStatus: availability.status ?? "unknown",
            optInConfigurationStatus: optInConfiguration.status ?? "planned-disabled",
            executionGateStatus: executionGate.status ?? "closed",
            healthPreflightStatus: healthPreflight.status ?? "planned-disabled",
            executionClientHarnessStatus: executionClientHarness.status ?? "planned-disabled",
            dispatchAdapterBoundaryStatus: dispatchAdapterBoundary.status ?? "planned-disabled",
            unavailableErrorTaxonomyVersion: unavailableErrorTaxonomy.taxonomyVersion ?? "P25.17",
            integrationFixtureHarnessVersion: integrationFixtureHarness.harnessVersion ?? "P25.18",
        },
        checks: allChecks,
        blockers,
        readiness: {
            allChecksSatisfied: blockers.length === 0,
            mayRegisterDispatch: false,
            reason: "runtime registration remains hard-disabled by this planning step even if future readiness inputs are supplied",
        },
        registrationPlan: {
            targetAdapter: "renderer-service",
            descriptorAdapterAlreadyPresent: true,
            runtimeExecutionRegistered: false,
            requiredFutureToggle: "PENPOT_RENDER_THUMBNAIL_EXECUTION=renderer-service",
            requiredAssertions: [
                "closed gate and missing endpoint fail before fetch",
                "health preflight failure prevents render POST",
                "render success normalizes resource metadata before MCP/CLI return",
                "CLI --output writes only after normalized downloadUri exists",
                "service errors map through unavailable error taxonomy",
                "auth forwarding keeps token values out of planning and test fixtures",
            ],
        },
        nextActions: [
            "Implement renderer-service integration fixtures before changing this preflight status.",
            "Only register executable dispatch after all checks are satisfied in a dedicated implementation task.",
            "Keep dry-run and unavailable execution responses metadata-only until runtime registration is explicitly enabled.",
        ],
    };
}

export function createRenderThumbnailRendererServiceIntegrationFixtureHarness(options = EMPTY_OBJECT) {
    const targetKind = normalizeOptionalString(options.targetKind) ?? RenderThumbnailTargets.FILE;
    const cachePolicy = normalizeOptionalString(options.cachePolicy) ?? RenderThumbnailCachePolicies.REUSE;
    const client = options.client ?? EMPTY_OBJECT;
    const executionGate = options.executionGate ?? EMPTY_OBJECT;
    const healthPreflight = options.healthPreflight ?? EMPTY_OBJECT;
    const dispatchAdapterBoundary = options.dispatchAdapterBoundary ?? EMPTY_OBJECT;
    const unavailableErrorTaxonomy = options.unavailableErrorTaxonomy ?? EMPTY_OBJECT;

    return {
        status: "planned-disabled",
        dispatch: false,
        networkDispatch: false,
        localFileWrites: false,
        harnessVersion: "P25.18",
        runner: "future renderer-service integration fixture harness",
        reason: "fixture-driven integration coverage is planned before renderer-service execution can be registered",
        current: {
            targetKind,
            cachePolicy,
            clientConfigured: Boolean(client.configured),
            executionGateStatus: executionGate.status ?? "closed",
            healthPreflightStatus: healthPreflight.status ?? "planned-disabled",
            dispatchAdapterBoundaryStatus: dispatchAdapterBoundary.status ?? "planned-disabled",
            unavailableErrorTaxonomyVersion: unavailableErrorTaxonomy.taxonomyVersion ?? "P25.17",
        },
        sequence: [
            "resolveConfig",
            "assertClosedGate",
            "healthPreflightFixture",
            "renderDispatchFixture",
            "normalizeResultOrError",
            "assertMcpCliResourceSemantics",
        ],
        cases: [
            {
                id: "closed-gate-no-network",
                stage: "execution-gate",
                dispatch: false,
                networkDispatch: false,
                expectedCode: "renderer_service_execution_disabled",
                asserts: [
                    "executionGate.status remains closed",
                    "health preflight is not dispatched",
                    "render POST is not dispatched",
                    "MCP and CLI receive structured unavailable metadata",
                ],
            },
            {
                id: "missing-endpoint-not-configured",
                stage: "configuration",
                dispatch: false,
                networkDispatch: false,
                expectedCode: "renderer_service_not_configured",
                asserts: [
                    "client.configured is false",
                    "availability.status is not-configured",
                    "failure occurs before health preflight",
                ],
            },
            {
                id: "health-unavailable-prevents-render",
                stage: "health-preflight",
                dispatch: false,
                networkDispatch: false,
                expectedCode: "renderer_service_health_unavailable",
                asserts: [
                    "future health preflight failure is retryable",
                    "render POST is not dispatched after failed health",
                    "service error payload uses unavailable taxonomy retryability",
                ],
            },
            {
                id: "render-success-mcp-resource-metadata",
                stage: "response-normalization",
                dispatch: false,
                networkDispatch: false,
                expectedStatus: "ok",
                asserts: [
                    "createRenderThumbnailRendererServiceResult normalizes resourceUri and downloadUri",
                    "MCP returns resource metadata only",
                    "MCP localFileWrites remains false",
                ],
            },
            {
                id: "render-success-cli-output-download",
                stage: "resource-normalization",
                dispatch: false,
                networkDispatch: false,
                expectedStatus: "ok",
                asserts: [
                    "CLI output download is allowed only after normalized downloadUri exists",
                    "CLI writes no file during planning or unavailable execution",
                    "output metadata is separate from renderer-service dispatch",
                ],
            },
            {
                id: "service-error-normalization",
                stage: "response-normalization",
                dispatch: false,
                networkDispatch: false,
                expectedCode: "renderer_service_response_invalid",
                asserts: [
                    "createRenderThumbnailRendererServiceErrorPayload preserves stable code",
                    "retryable is derived from status or taxonomy",
                    "service data is included without forwarded token values",
                ],
            },
            {
                id: "auth-forwarding-token-safe",
                stage: "dispatch-adapter",
                dispatch: false,
                networkDispatch: false,
                expectedStatus: "planned",
                asserts: [
                    "caller-session auth forwarding is represented by header names only",
                    "authorization and cookie token values are not present in fixtures",
                    "MCP audit and CLI audit headers remain distinct",
                ],
            },
        ],
        requiredBeforeDispatch: [
            "closed gate fixture passes without fetch",
            "health unavailable and invalid fixtures prevent render POST",
            "render success fixture normalizes MCP resource metadata",
            "render success fixture gates CLI --output download on downloadUri",
            "service error fixture maps stable taxonomy codes and retryability",
            "auth fixture proves token values are not serialized",
        ],
        entrypointExpectations: {
            mcp: {
                localFileWrites: false,
                resourceReturn: "metadata-only",
                outputDownload: false,
            },
            cli: {
                localFileWrites: "only after normalized downloadUri exists",
                resourceReturn: "metadata plus optional output result",
                outputDownload: "future executable path only",
            },
        },
        fixtureInputs: {
            fileRefresh: {
                target: "file",
                cachePolicy: "refresh",
                expectedPersistCommand: "create-file-thumbnail",
            },
            fileReuse: {
                target: "file",
                cachePolicy: "reuse",
                expectedCacheProbe: "file-thumbnail-by-file-id-and-revn",
            },
            frameRefresh: {
                target: "frame",
                cachePolicy: "refresh",
                expectedPersistCommand: "create-file-object-thumbnail",
                requires: ["frame-source-data-provider", "tagged-frame-resource-normalizer"],
            },
        },
    };
}

export function createRenderThumbnailRendererServiceUnavailableErrorTaxonomy(options = EMPTY_OBJECT) {
    const client = options.client ?? EMPTY_OBJECT;
    const availability = options.availability ?? EMPTY_OBJECT;
    const executionGate = options.executionGate ?? EMPTY_OBJECT;
    const healthPreflight = options.healthPreflight ?? EMPTY_OBJECT;
    const dispatchAdapterBoundary = options.dispatchAdapterBoundary ?? EMPTY_OBJECT;

    return {
        status: "planned",
        dispatch: false,
        taxonomyVersion: "P25.17",
        defaultCode: "renderer_service_unavailable",
        current: {
            clientConfigured: Boolean(client.configured),
            availabilityStatus: availability.status ?? "unknown",
            executionGateStatus: executionGate.status ?? "closed",
            healthPreflightStatus: healthPreflight.status ?? "planned-disabled",
            dispatchAdapterBoundaryStatus: dispatchAdapterBoundary.status ?? "planned-disabled",
        },
        errors: [
            {
                code: "renderer_service_unavailable",
                stage: "execution-gate",
                retryable: false,
                when: "renderer-service execution is requested while runtime execution remains unimplemented",
                action: "Use dry-run planning or implement the gated renderer-service runtime before retrying execution.",
            },
            {
                code: "renderer_service_not_configured",
                stage: "configuration",
                retryable: false,
                when: "renderer-service endpoint configuration is missing",
                action: "Configure rendererServiceUri, rendererUri, endpoint, or PENPOT_RENDERER_SERVICE_URI.",
            },
            {
                code: "renderer_service_execution_disabled",
                stage: "execution-gate",
                retryable: false,
                when: "explicit renderer-service opt-in is absent or runtime registration is closed",
                action: "Set the documented opt-in value only after the renderer-service implementation and tests exist.",
            },
            {
                code: "renderer_service_preflight_disabled",
                stage: "health-preflight",
                retryable: false,
                when: "the execution gate is closed before the health preflight can run",
                action: "Open the execution gate through a future implementation task before health probing.",
            },
            {
                code: "renderer_service_health_unavailable",
                stage: "health-preflight",
                retryable: true,
                when: "the future health endpoint is unreachable, times out, or returns a non-ok status",
                action: "Check renderer-service health, logs, endpoint, and timeout configuration before retrying.",
            },
            {
                code: "renderer_service_health_invalid",
                stage: "health-preflight",
                retryable: false,
                when: "the future health response is malformed or missing required renderer metadata",
                action: "Fix the renderer-service health response contract before enabling render dispatch.",
            },
            {
                code: "renderer_service_dispatch_disabled",
                stage: "dispatch-adapter",
                retryable: false,
                when: "the dispatch adapter boundary is still metadata-only",
                action: "Register executable dispatch only after preflight and integration fixture coverage pass.",
            },
            {
                code: "renderer_service_response_invalid",
                stage: "response-normalization",
                retryable: false,
                when: "the renderer-service render response cannot be normalized into thumbnail resource metadata",
                action: "Return status ok with resourceUri, uri, resource-uri, or mediaId plus image/png metadata.",
            },
            {
                code: "renderer_service_resource_missing",
                stage: "resource-normalization",
                retryable: false,
                when: "a normalized renderer-service response has no downloadable resource reference",
                action: "Persist the rendered PNG and return a backend-resolvable resource URI before reporting success.",
            },
        ],
        stages: [
            "configuration",
            "execution-gate",
            "health-preflight",
            "dispatch-adapter",
            "response-normalization",
            "resource-normalization",
        ],
        retryPolicy: {
            retryableCodes: ["renderer_service_health_unavailable"],
            nonRetryableBeforeImplementation: [
                "renderer_service_unavailable",
                "renderer_service_not_configured",
                "renderer_service_execution_disabled",
                "renderer_service_preflight_disabled",
                "renderer_service_dispatch_disabled",
            ],
        },
        payloadFields: {
            common: [
                "command",
                "adapter",
                "endpoint",
                "client",
                "availability",
                "executionGate",
                "healthPreflight",
                "dispatchAdapterBoundary",
                "clientRequest",
                "requiredCapabilities",
                "serviceRequest",
                "unavailableErrorTaxonomy",
            ],
            mcp: [
                "localFileWrites:false",
                "resource metadata only",
                "do not expose forwarded token values",
            ],
            cli: [
                "optional output metadata only after resource downloadUri exists",
                "do not download PNG bytes until normalized render success",
            ],
        },
        actionsByStage: {
            configuration: [
                "Resolve endpoint and timeout from command args, environment, profile, or backend config.",
                "Do not contact the renderer-service during dry-run planning.",
            ],
            "execution-gate": [
                "Return a structured unavailable error before health preflight while the gate is closed.",
                "Require explicit opt-in, service implementation, integration tests, and runtime registration.",
            ],
            "health-preflight": [
                "Run GET health only after the execution gate opens.",
                "Normalize unreachable and malformed health responses into stable preflight codes.",
            ],
            "dispatch-adapter": [
                "Send render POST only after gate and preflight pass.",
                "Keep dispatch false in all current planning responses.",
            ],
            "response-normalization": [
                "Normalize successful render responses through createRenderThumbnailRendererServiceResult.",
                "Normalize service failures through createRenderThumbnailRendererServiceErrorPayload.",
            ],
            "resource-normalization": [
                "MCP returns resource metadata without local file writes.",
                "CLI --output downloads only after a normalized downloadUri exists.",
            ],
        },
    };
}

export function createRenderThumbnailRendererServiceOptInConfiguration(options = EMPTY_OBJECT) {
    const entrypoint = normalizeOptionalString(options.entrypoint) ?? "unknown";
    const expectedValue = "renderer-service";
    const cliFlagValue = normalizeOptionalString(options.cliFlagValue);
    const mcpArgValue = normalizeOptionalString(options.mcpArgValue);
    const envValue = normalizeOptionalString(options.envValue);
    const profileValue = normalizeOptionalString(options.profileValue);
    const backendValue = normalizeOptionalString(options.backendValue);
    const sources = [
        {
            source: "cli-flag",
            name: "--render-thumbnail-execution",
            entrypoints: ["cli"],
            precedence: 10,
            value: cliFlagValue,
            configured: Boolean(cliFlagValue),
        },
        {
            source: "mcp-arg",
            name: "rendererServiceExecution",
            entrypoints: ["mcp"],
            precedence: 20,
            value: mcpArgValue,
            configured: Boolean(mcpArgValue),
        },
        {
            source: "environment",
            name: "PENPOT_RENDER_THUMBNAIL_EXECUTION",
            entrypoints: ["cli", "mcp"],
            precedence: 30,
            value: envValue,
            configured: Boolean(envValue),
        },
        {
            source: "profile",
            name: "renderer.thumbnail.execution",
            entrypoints: ["cli", "mcp"],
            precedence: 40,
            value: profileValue,
            configured: Boolean(profileValue),
        },
        {
            source: "backend-config",
            name: "renderer.thumbnail.execution",
            entrypoints: ["mcp"],
            precedence: 50,
            value: backendValue,
            configured: Boolean(backendValue),
        },
    ];
    const selected = sources.find((source) => source.configured) ?? null;
    const selectedValue = selected?.value ?? null;
    const valid = selectedValue === null || selectedValue === expectedValue;

    return {
        status: "planned-disabled",
        dispatch: false,
        entrypoint,
        reason: "renderer-service opt-in configuration surfaces are documented but cannot enable execution until runtime dispatch is implemented",
        expectedValue,
        sources,
        resolution: {
            selectedSource: selected?.source ?? null,
            selectedName: selected?.name ?? null,
            selectedValue,
            valid,
            configured: Boolean(selected),
            precedence: selected?.precedence ?? null,
            diagnostics: valid
                ? selected
                    ? "opt-in value is recognized but execution remains disabled"
                    : "no opt-in source is configured"
                : `unsupported opt-in value '${selectedValue}'`,
        },
        diagnostics: {
            tokenValuesIncluded: false,
            executionEnabledByConfiguration: false,
            gateCanOpenFromConfigurationOnly: false,
            noDispatchDefault: true,
        },
        futureSurfaces: {
            cliFlags: ["--render-thumbnail-execution renderer-service"],
            mcpArgs: ["rendererServiceExecution: renderer-service"],
            environment: ["PENPOT_RENDER_THUMBNAIL_EXECUTION=renderer-service"],
            profileKeys: ["renderer.thumbnail.execution"],
            backendConfigKeys: ["renderer.thumbnail.execution"],
        },
    };
}

export function createRenderThumbnailRendererServiceDispatchAdapterBoundary(options = EMPTY_OBJECT) {
    const client = options.client ?? EMPTY_OBJECT;
    const executionGate = options.executionGate ?? EMPTY_OBJECT;
    const healthPreflight = options.healthPreflight ?? EMPTY_OBJECT;
    const executionClientHarness = options.executionClientHarness ?? EMPTY_OBJECT;

    return {
        status: "planned-disabled",
        adapter: "renderer-service",
        dispatch: false,
        reason: "renderer-service dispatch adapter boundary is documented but disabled until a future task explicitly registers executable runtime behavior",
        configPrecedence: [
            "explicit command args",
            "entrypoint environment",
            "profile/backend config source",
            "development defaults",
        ],
        consumes: {
            executionGate: {
                requiredStatus: "open",
                currentStatus: executionGate.status ?? "closed",
            },
            healthPreflight: {
                requiredStatus: "ok",
                currentStatus: healthPreflight.status ?? "planned-disabled",
            },
            clientRequest: {
                requiredDispatch: true,
                currentDispatch: false,
            },
        },
        noDispatchDefaults: {
            metadataOnlyAvailability: true,
            healthPreflightDispatch: false,
            renderPostDispatch: false,
            localFileWrites: false,
        },
        transitionRules: [
            "keep adapter selected for planning even while executable dispatch is disabled",
            "fail before network dispatch when executionGate.status is not open",
            "fail before render POST when health preflight does not return ok",
            "normalize service success and errors through shared command-runtime helpers",
            "keep MCP local file writes disabled; CLI output writes only after normalized downloadUri exists",
        ],
        resultMapping: {
            successHelper: "createRenderThumbnailRendererServiceResult",
            errorHelper: "createRenderThumbnailRendererServiceErrorPayload",
            mcpReturn: "resource metadata only",
            cliReturn: "resource metadata plus optional --output download",
        },
        current: {
            clientConfigured: Boolean(client.configured),
            executionGateStatus: executionGate.status ?? "closed",
            healthPreflightStatus: healthPreflight.status ?? "planned-disabled",
            executionClientHarnessStatus: executionClientHarness.status ?? "planned-disabled",
            dispatch: false,
        },
        integrationTestPlan: {
            status: "required-before-adapter-dispatch",
            cases: [
                "config precedence resolves endpoint and timeout without exposing token values",
                "closed gate returns renderer_service_execution_disabled before health preflight",
                "failed health preflight prevents render POST",
                "successful render POST maps response through result normalization",
                "service failure maps through renderer-service error normalization",
                "MCP returns resource metadata only and CLI writes output only after downloadUri exists",
            ],
        },
    };
}

export function createRenderThumbnailRendererServiceHealthPreflight(options = EMPTY_OBJECT) {
    const client = options.client ?? EMPTY_OBJECT;
    const executionGate = options.executionGate ?? EMPTY_OBJECT;
    const endpoint = normalizeOptionalString(client.healthEndpoint);
    const timeoutMs = client.probeTimeoutMs ?? 2500;

    return {
        status: "planned-disabled",
        dispatch: false,
        networkProbe: false,
        reason: "renderer-service health preflight is planned but disabled until the execution gate opens and integration tests exist",
        method: "GET",
        endpoint,
        timeoutMs,
        headers: {
            accept: "application/json",
            "x-penpot-command": CommandDescriptors.RENDER_THUMBNAIL.id,
            "x-penpot-preflight": "renderer-service-health",
        },
        gate: {
            requiredStatus: "open",
            currentStatus: executionGate.status ?? "closed",
        },
        expected: {
            okStatuses: [200],
            contentType: "application/json",
            bodyStatus: "ok",
            requiredFields: ["status", "renderer", "version"],
        },
        failureModes: [
            {
                code: "renderer_service_preflight_disabled",
                when: "the execution gate is closed",
            },
            {
                code: "renderer_service_health_unavailable",
                when: "the future health endpoint is unreachable or returns a non-2xx status",
            },
            {
                code: "renderer_service_health_invalid",
                when: "the future health response is missing required renderer metadata",
            },
        ],
        integrationTestPlan: {
            status: "required-before-network-probe",
            cases: [
                "closed execution gate skips health preflight without fetch",
                "configured endpoint derives /health and sends GET with audit headers",
                "healthy response enables the later execution harness only inside the gated integration suite",
                "unhealthy and malformed responses normalize structured preflight errors",
            ],
        },
    };
}

export function createRenderThumbnailRendererServiceExecutionClientHarness(options = EMPTY_OBJECT) {
    const executionGate = options.executionGate ?? EMPTY_OBJECT;
    const healthPreflight = options.healthPreflight ?? EMPTY_OBJECT;

    return {
        status: "planned-disabled",
        dispatch: false,
        reason: "renderer-service executable client harness is documented but disabled until health preflight and integration tests pass",
        sequence: ["executionGate", "healthPreflight", "clientRequest", "normalizeResult"],
        preconditions: [
            "executionGate.status must be open",
            "healthPreflight must pass inside the integration suite",
            "clientRequest.dispatch must be explicitly enabled by a future implementation task",
        ],
        current: {
            executionGateStatus: executionGate.status ?? "closed",
            healthPreflightStatus: healthPreflight.status ?? "planned-disabled",
            dispatch: false,
        },
        resultHandling: [
            "normalize successful renderer-service responses through createRenderThumbnailRendererServiceResult",
            "normalize renderer-service failures through createRenderThumbnailRendererServiceErrorPayload",
            "return MCP resource metadata without server-local file writes",
            "allow CLI --output only after a normalized resource downloadUri exists",
        ],
        integrationTestPlan: {
            status: "required-before-dispatch",
            cases: [
                "closed gate prevents health and render network calls",
                "health preflight failure prevents render POST",
                "successful render POST maps service resource into MCP/CLI metadata",
                "CLI --output downloads the normalized resource only after render success",
                "auth forwarding uses caller session headers without exposing token values in planning output",
            ],
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
