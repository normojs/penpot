import { ExecuteCodeTaskHandler } from "./task-handlers/ExecuteCodeTaskHandler";
import { Task, TaskHandler } from "./TaskHandler";

type FileContextUpdateMessage = {
    type: "file-context-update";
    context: FileContextSnapshot | null;
    reason?: string;
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

const FILE_CONTEXT_CAPABILITIES = ["page.read", "selection.read", "shape.read", "shape.write", "export.read"];
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
const taskHandlers: TaskHandler[] = [new ExecuteCodeTaskHandler()];

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

// Open the plugin UI (main.ts)
penpot.ui.open("Penpot MCP Plugin", `?theme=${penpot.theme}`, {
    width: 236,
    height: 210,
    hidden: !!mcp,
} as any);

// Register message handlers
penpot.ui.onMessage<string | { id: string; type?: string; status?: string; task: string; params: any }>((message) => {
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
            });
            reportFileContext("ui-initialized");
        }
    } else if (typeof message === "object" && message.type === "update-connection-status") {
        mcp?.setMcpStatus(message.status || "unknown");
    } else if (typeof message === "object" && message.task && message.id) {
        // Handle plugin tasks submitted by the MCP server
        handlePluginTaskRequest(message).catch((error) => {
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
        });
        reportFileContext("mcp-connect");
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
