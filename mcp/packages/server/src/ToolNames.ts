export const ToolNames = {
    MCP_GET_STATUS: "mcp.get_status",

    ACCOUNT_GET_CURRENT_USER: "account.get_current_user",
    TEAM_LIST: "team.list",
    PROJECT_LIST: "project.list",
    FILE_LIST: "file.list",
    FILE_SEARCH: "file.search",
    FILE_CREATE: "file.create",
    FILE_DUPLICATE: "file.duplicate",
    FILE_OPEN: "file.open",
    FILE_GET_RECENT: "file.get_recent",
    TOKEN_GET_MCP_STATUS: "token.get_mcp_status",

    FILE_GET_CONTEXT: "file.get_context",
    FILE_BIND_CONTEXT: "file.bind_context",
    FILE_RELEASE_CONTEXT: "file.release_context",
    PAGE_LIST: "page.list",
    PAGE_CREATE: "page.create",
    PAGE_RENAME: "page.rename",
    PAGE_SET_CURRENT: "page.set_current",
    SELECTION_GET: "selection.get",
    SELECTION_SET: "selection.set",

    SHAPE_CREATE_FRAME: "shape.create_frame",
    SHAPE_CREATE_RECT: "shape.create_rect",
    SHAPE_CREATE_TEXT: "shape.create_text",
    SHAPE_CREATE_IMAGE: "shape.create_image",
    SHAPE_UPDATE: "shape.update",
    SHAPE_DELETE: "shape.delete",
    SHAPE_GROUP: "shape.group",
    SHAPE_UNGROUP: "shape.ungroup",
    SHAPE_SET_LAYOUT: "shape.set_layout",
    SHAPE_SET_STYLE: "shape.set_style",
    COMPONENT_CREATE: "component.create",
    COMPONENT_INSTANTIATE: "component.instantiate",
    TOKENS_LIST: "tokens.list",
    TOKENS_APPLY: "tokens.apply",

    PROTOTYPE_CREATE_FLOW: "prototype.create_flow",
    PROTOTYPE_CREATE_INTERACTION: "prototype.create_interaction",
    PROTOTYPE_CREATE_OVERLAY: "prototype.create_overlay",
    PROTOTYPE_LIST_INTERACTIONS: "prototype.list_interactions",
    PROTOTYPE_DELETE_INTERACTION: "prototype.delete_interaction",
    PROTOTYPE_UPDATE_INTERACTION: "prototype.update_interaction",
    PROTOTYPE_REORDER_INTERACTION: "prototype.reorder_interaction",
    PROTOTYPE_DUPLICATE_INTERACTION: "prototype.duplicate_interaction",

    EXPORT_SHAPE: "export.shape",
    EXPORT_PAGE: "export.page",
    EXPORT_FILE: "export.file",
    RENDER_PREVIEW: "render.preview",
    RENDER_THUMBNAIL: "render.thumbnail",

    DEBUG_GET_PLUGIN_STATE: "debug.get_plugin_state",
    DEBUG_GET_AGENT_LOGS: "debug.get_agent_logs",

    LEGACY_EXECUTE_CODE: "execute_code",
    LEGACY_HIGH_LEVEL_OVERVIEW: "high_level_overview",
    LEGACY_PENPOT_API_INFO: "penpot_api_info",
    LEGACY_EXPORT_SHAPE: "export_shape",
    LEGACY_IMPORT_IMAGE: "import_image",
} as const;

export type ToolName = (typeof ToolNames)[keyof typeof ToolNames];

export const GlobalToolNames = [
    ToolNames.MCP_GET_STATUS,
    ToolNames.ACCOUNT_GET_CURRENT_USER,
    ToolNames.TEAM_LIST,
    ToolNames.PROJECT_LIST,
    ToolNames.FILE_LIST,
    ToolNames.FILE_SEARCH,
    ToolNames.FILE_CREATE,
    ToolNames.FILE_DUPLICATE,
    ToolNames.FILE_OPEN,
    ToolNames.FILE_GET_RECENT,
    ToolNames.TOKEN_GET_MCP_STATUS,
] as const;

export const FileContextToolNames = [
    ToolNames.FILE_GET_CONTEXT,
    ToolNames.FILE_BIND_CONTEXT,
    ToolNames.FILE_RELEASE_CONTEXT,
    ToolNames.PAGE_LIST,
    ToolNames.PAGE_CREATE,
    ToolNames.PAGE_RENAME,
    ToolNames.PAGE_SET_CURRENT,
    ToolNames.SELECTION_GET,
    ToolNames.SELECTION_SET,
] as const;

export const DesignEditingToolNames = [
    ToolNames.SHAPE_CREATE_FRAME,
    ToolNames.SHAPE_CREATE_RECT,
    ToolNames.SHAPE_CREATE_TEXT,
    ToolNames.SHAPE_CREATE_IMAGE,
    ToolNames.SHAPE_UPDATE,
    ToolNames.SHAPE_DELETE,
    ToolNames.SHAPE_GROUP,
    ToolNames.SHAPE_UNGROUP,
    ToolNames.SHAPE_SET_LAYOUT,
    ToolNames.SHAPE_SET_STYLE,
    ToolNames.COMPONENT_CREATE,
    ToolNames.COMPONENT_INSTANTIATE,
    ToolNames.TOKENS_LIST,
    ToolNames.TOKENS_APPLY,
] as const;

export const PrototypeToolNames = [
    ToolNames.PROTOTYPE_CREATE_FLOW,
    ToolNames.PROTOTYPE_CREATE_INTERACTION,
    ToolNames.PROTOTYPE_CREATE_OVERLAY,
    ToolNames.PROTOTYPE_LIST_INTERACTIONS,
    ToolNames.PROTOTYPE_DELETE_INTERACTION,
    ToolNames.PROTOTYPE_UPDATE_INTERACTION,
    ToolNames.PROTOTYPE_REORDER_INTERACTION,
    ToolNames.PROTOTYPE_DUPLICATE_INTERACTION,
] as const;

export const ExportAndRenderToolNames = [
    ToolNames.EXPORT_SHAPE,
    ToolNames.EXPORT_PAGE,
    ToolNames.EXPORT_FILE,
    ToolNames.RENDER_PREVIEW,
    ToolNames.RENDER_THUMBNAIL,
] as const;

export const AdvancedToolNames = [
    ToolNames.LEGACY_EXECUTE_CODE,
    ToolNames.DEBUG_GET_PLUGIN_STATE,
    ToolNames.DEBUG_GET_AGENT_LOGS,
] as const;

export const LegacyToolNames = [
    ToolNames.LEGACY_EXECUTE_CODE,
    ToolNames.LEGACY_HIGH_LEVEL_OVERVIEW,
    ToolNames.LEGACY_PENPOT_API_INFO,
    ToolNames.LEGACY_EXPORT_SHAPE,
    ToolNames.LEGACY_IMPORT_IMAGE,
] as const;
