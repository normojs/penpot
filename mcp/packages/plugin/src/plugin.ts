import { ExecuteCodeTaskHandler } from "./task-handlers/ExecuteCodeTaskHandler";
import { ExportTaskHandler } from "./task-handlers/ExportTaskHandler";
import { PageTaskHandler } from "./task-handlers/PageTaskHandler";
import { PrototypeTaskHandler } from "./task-handlers/PrototypeTaskHandler";
import { ShapeTaskHandler } from "./task-handlers/ShapeTaskHandler";
import { Task, TaskHandler } from "./TaskHandler";

type FileContextUpdateMessage = {
    type: "file-context-update";
    context: FileContextSnapshot | null;
    reason?: string;
};

type FileContextBindRequestMessage = {
    type: "file-context-bind-request";
    requestId: string;
    context: FileContextSnapshot | null;
};

type FileContextReleaseRequestMessage = {
    type: "file-context-release-request";
    requestId: string;
};

type FileContextControlResultMessage = {
    type: "file-context-control-result";
    requestId: string;
    action: "bind" | "release";
    success: boolean;
    context?: FileContextSnapshot | null;
    error?: {
        code: string;
        message: string;
    };
};

type PluginHelloMessage = {
    type: "plugin-hello";
    protocolVersion: string;
    pluginVersion: string;
    penpotVersion?: string;
    frontendVersion?: string;
    capabilities: string[];
    fileContextCapabilities: string[];
    ownerTabId?: string;
    updatedAt: string;
};

type FileContextSnapshot = {
    contextId: string;
    status: "available";
    ownerTabId: string;
    fileId: string;
    fileName?: string;
    revn?: number;
    pageId?: string;
    pageName?: string;
    selectionIds: string[];
    capabilities: string[];
    updatedAt: string;
};

const MCP_PROTOCOL_VERSION = "1.0";
const MCP_PLUGIN_CAPABILITIES = [
    "file-context.read",
    "file-context.bind",
    "page.read",
    "page.write",
    "shape.write-basic",
    "prototype.write-basic",
    "export.read",
    "execute-code.optional",
];
const FILE_CONTEXT_CAPABILITIES = [
    "page.read",
    "selection.read",
    "shape.read",
    "shape.write",
    "prototype.write",
    "export.read",
];
const ownerTabId = createOwnerTabId();

/**
 * Extracts the major.minor.patch prefix from a version string.
 *
 * @param version - a version string starting with major.minor.patch
 * @returns the major.minor.patch prefix, or the original string if it does not match
 */
function extractVersionPrefix(version: string): string {
    const match = version.match(/^(\d+\.\d+\.\d+)/);
    return match ? match[1] : version;
}

mcp?.setMcpStatus("connecting");

/**
 * Registry of all available task handlers.
 */
const taskHandlers: TaskHandler[] = [
    new ExecuteCodeTaskHandler(),
    new PageTaskHandler(),
    new ShapeTaskHandler(),
    new PrototypeTaskHandler(),
    new ExportTaskHandler(),
];

/**
 * Creates a stable id for this plugin runtime. The id is intentionally scoped
 * to this browser/plugin instance and is not persisted across reloads.
 */
function createOwnerTabId(): string {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID();
    }
    return `plugin-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createRequestId(action: "bind" | "release"): string {
    return `${action}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function buildFileContextSnapshot(): FileContextSnapshot | null {
    const currentFile = penpot.currentFile;
    if (!currentFile) {
        return null;
    }

    const currentPage = penpot.currentPage;
    const selectionIds = (penpot.selection ?? [])
        .map((shape) => shape?.id)
        .filter((id): id is string => typeof id === "string" && id.length > 0);

    return {
        contextId: `${ownerTabId}:${currentFile.id}`,
        status: "available",
        ownerTabId,
        fileId: currentFile.id,
        fileName: currentFile.name,
        revn: currentFile.revn,
        pageId: currentPage?.id,
        pageName: currentPage?.name,
        selectionIds,
        capabilities: FILE_CONTEXT_CAPABILITIES,
        updatedAt: new Date().toISOString(),
    };
}

function buildPluginHelloMessage(): PluginHelloMessage {
    return {
        type: "plugin-hello",
        protocolVersion: MCP_PROTOCOL_VERSION,
        pluginVersion: PENPOT_MCP_VERSION,
        penpotVersion: penpot.version ? extractVersionPrefix(penpot.version) : undefined,
        frontendVersion: mcp?.getFrontendVersion?.(),
        capabilities: [...MCP_PLUGIN_CAPABILITIES],
        fileContextCapabilities: [...FILE_CONTEXT_CAPABILITIES],
        ownerTabId,
        updatedAt: new Date().toISOString(),
    };
}

function reportFileContext(reason: string): void {
    const context = buildFileContextSnapshot();
    const message: FileContextUpdateMessage = {
        type: "file-context-update",
        context,
        reason: context ? reason : `${reason}:no-current-file`,
    };
    penpot.ui.sendMessage(message);
}

function registerFileContextListener(eventType: "pagechange" | "selectionchange" | "filechange" | "contentsave"): void {
    try {
        penpot.on(eventType, () => reportFileContext(eventType));
    } catch (error) {
        console.warn(`Unable to register ${eventType} MCP context listener:`, error);
    }
}

function requestFileContextBind(): void {
    mcp?.setFileContextStatus?.({ status: "binding", updatedAt: new Date().toISOString() });
    const message: FileContextBindRequestMessage = {
        type: "file-context-bind-request",
        requestId: createRequestId("bind"),
        context: buildFileContextSnapshot(),
    };
    penpot.ui.sendMessage(message);
}

function requestFileContextRelease(): void {
    mcp?.setFileContextStatus?.({ status: "releasing", updatedAt: new Date().toISOString() });
    const message: FileContextReleaseRequestMessage = {
        type: "file-context-release-request",
        requestId: createRequestId("release"),
    };
    penpot.ui.sendMessage(message);
}

function handleFileContextControlResult(message: FileContextControlResultMessage): void {
    const status = message.success ? (message.action === "bind" ? "bound" : "available") : "error";
    mcp?.setFileContextStatus?.({
        status,
        action: message.action,
        success: message.success,
        context: message.context,
        error: message.error,
        updatedAt: new Date().toISOString(),
    });
    reportFileContext(`control:${message.action}`);
}

// Open the plugin UI (main.ts)
penpot.ui.open("Penpot MCP Plugin", `?theme=${penpot.theme}`, {
    width: 236,
    height: 210,
    hidden: !!mcp,
} as any);

// Register message handlers
penpot.ui.onMessage<
    | string
    | {
          id?: string;
          type?: string;
          status?: string;
          label?: string;
          error?: string;
          updatedAt?: string;
          task?: string;
          params?: any;
      }
>((message) => {
    if (typeof message === "object" && message.type === "ui-initialized") {
        // Check Penpot version compatibility
        const penpotVersionPrefix = penpot.version ? extractVersionPrefix(penpot.version) : "<2.15"; // pre-2.15 versions don't have version info
        const mcpVersionPrefix = extractVersionPrefix(PENPOT_MCP_VERSION);
        console.log(`Penpot version: ${penpotVersionPrefix}, MCP version: ${mcpVersionPrefix}`);
        const isLocalPenpotVersion = penpotVersionPrefix == "0.0.0";
        if (penpotVersionPrefix !== mcpVersionPrefix && !isLocalPenpotVersion) {
            penpot.ui.sendMessage({
                type: "version-mismatch",
                mcpVersion: mcpVersionPrefix,
                penpotVersion: penpotVersionPrefix,
            });
        }
        // Initiate connection to remote MCP server (if enabled)
        if (mcp) {
            penpot.ui.sendMessage({
                type: "start-server",
                url: mcp?.getServerUrl(),
                token: mcp?.getToken(),
                hello: buildPluginHelloMessage(),
            });
            reportFileContext("ui-initialized");
        }
    } else if (typeof message === "object" && message.type === "update-connection-status") {
        mcp?.setMcpStatus(message.status || "unknown", {
            label: message.label,
            error: message.error,
            updatedAt: message.updatedAt,
        });
    } else if (typeof message === "object" && message.type === "file-context-control-result") {
        handleFileContextControlResult(message as unknown as FileContextControlResultMessage);
    } else if (typeof message === "object" && message.task && message.id) {
        // Handle plugin tasks submitted by the MCP server
        handlePluginTaskRequest({
            id: message.id,
            task: message.task,
            params: message.params,
        }).catch((error) => {
            console.error("Error in handlePluginTaskRequest:", error);
        });
    }
});

/**
 * Handles plugin task requests received from the MCP server via WebSocket.
 *
 * @param request - The task request containing ID, task type and parameters
 */
async function handlePluginTaskRequest(request: { id: string; task: string; params: any }): Promise<void> {
    console.log("Executing plugin task:", request.task, request.params);
    const task = new Task(request.id, request.task, request.params);

    // Find the appropriate handler
    const handler = taskHandlers.find((h) => h.isApplicableTo(task));

    if (handler) {
        try {
            // Cast the params to the expected type and handle the task
            console.log("Processing task with handler:", handler);
            await handler.handle(task);

            // check whether a response was sent and send a generic success if not
            if (!task.isResponseSent) {
                console.warn("Handler did not send a response, sending generic success.");
                task.sendSuccess("Task completed without a specific response.");
            }

            console.log("Task handled successfully:", task);
            reportFileContext(`task:${request.task}`);
        } catch (error) {
            console.error("Error handling task:", error);
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            task.sendError(`Error handling task: ${errorMessage}`);
        }
    } else {
        console.error("Unknown plugin task:", request.task);
        task.sendError(`Unknown task type: ${request.task}`);
    }
}

if (mcp) {
    mcp.on("disconnect", async () => {
        penpot.ui.sendMessage({
            type: "stop-server",
        });
    });
    mcp.on("connect", async () => {
        penpot.ui.sendMessage({
            type: "start-server",
            url: mcp?.getServerUrl(),
            token: mcp?.getToken(),
            hello: buildPluginHelloMessage(),
        });
        reportFileContext("mcp-connect");
    });
    mcp.on("bind-context", async () => {
        requestFileContextBind();
    });
    mcp.on("release-context", async () => {
        requestFileContextRelease();
    });

    registerFileContextListener("pagechange");
    registerFileContextListener("selectionchange");
    registerFileContextListener("filechange");
    registerFileContextListener("contentsave");
}

// Handle theme change in the iframe
penpot.on("themechange", (theme) => {
    penpot.ui.sendMessage({
        source: "penpot",
        type: "themechange",
        theme,
    });
});
