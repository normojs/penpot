import "./style.css";

// get the current theme from the URL
const searchParams = new URLSearchParams(window.location.hash.split("?")[1]);
document.body.dataset.theme = searchParams.get("theme") ?? "light";

// WebSocket connection management
let ws: WebSocket | null = null;
let latestFileContextMessage: FileContextUpdateMessage | null = null;
let latestPluginHelloMessage: PluginHelloMessage | null = null;

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

type FileContextUpdateMessage = {
    type: "file-context-update";
    context: unknown;
    reason?: string;
};

type FileContextControlRequestMessage = {
    type: "file-context-bind-request" | "file-context-release-request";
    requestId: string;
    context?: unknown;
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

type PluginCompatibilityMessage = {
    type: "plugin-compatibility";
    compatible: boolean;
    serverVersion: string;
    protocolVersion: string;
    supportedCapabilities: string[];
    requiredCapabilities: string[];
    missingCapabilities: string[];
    unsupportedCapabilities: string[];
    error?: {
        code: string;
        message: string;
    };
};

type StartServerMessage = {
    type: "start-server";
    url?: string;
    token?: string;
    hello?: PluginHelloMessage;
};

const statusPill = document.getElementById("connection-status") as HTMLElement;
const statusText = document.getElementById("status-text") as HTMLElement;
const currentTaskEl = document.getElementById("current-task") as HTMLElement;
const executedCodeEl = document.getElementById("executed-code") as HTMLTextAreaElement;
const copyCodeBtn = document.getElementById("copy-code-btn") as HTMLButtonElement;
const connectBtn = document.getElementById("connect-btn") as HTMLButtonElement;
const disconnectBtn = document.getElementById("disconnect-btn") as HTMLButtonElement;
const versionWarningEl = document.getElementById("version-warning") as HTMLElement;
const versionWarningTextEl = document.getElementById("version-warning-text") as HTMLElement;

/**
 * Updates the status pill and button visibility based on connection state.
 *
 * @param code - the connection state code ("idle" | "connecting" | "connected" | "disconnected" | "error")
 * @param label - human-readable label to display inside the pill
 */
function updateConnectionStatus(code: string, label: string, error?: string): void {
    if (statusPill) {
        statusPill.dataset.status = code;
    }
    if (statusText) {
        statusText.textContent = label;
    }

    const isConnected = code === "connected";
    if (connectBtn) connectBtn.hidden = isConnected;
    if (disconnectBtn) disconnectBtn.hidden = !isConnected;

    parent.postMessage(
        {
            type: "update-connection-status",
            status: code,
            label,
            error,
            updatedAt: new Date().toISOString(),
        },
        "*"
    );
}

function showVersionWarningText(message: string): void {
    if (versionWarningEl && versionWarningTextEl) {
        versionWarningTextEl.textContent = message;
        versionWarningEl.hidden = false;
    }
}

/**
 * Updates the "Current task" display with the currently executing task name.
 *
 * @param taskName - the task name to display, or null to reset to "---"
 */
function updateCurrentTask(taskName: string | null): void {
    if (currentTaskEl) {
        currentTaskEl.textContent = taskName ?? "---";
    }
    if (taskName === null) {
        updateExecutedCode(null);
    }
}

/**
 * Updates the executed code textarea with the last code run during task execution.
 *
 * @param code - the code string to display, or null to clear
 */
function updateExecutedCode(code: string | null): void {
    if (executedCodeEl) {
        executedCodeEl.value = code ?? "";
    }
    if (copyCodeBtn) {
        copyCodeBtn.disabled = !code;
    }
}

/**
 * Sends a task response back to the MCP server via WebSocket.
 *
 * @param response - The response containing task ID and result
 */
function sendTaskResponse(response: any): void {
    sendServerMessage(response);
}

function sendFileContextUpdate(message: FileContextUpdateMessage): void {
    latestFileContextMessage = message;
    sendServerMessage(message);
}

function sendPluginHello(): void {
    const hello = latestPluginHelloMessage ?? buildFallbackPluginHello();
    sendServerMessage({
        ...hello,
        updatedAt: new Date().toISOString(),
    });
}

function sendServerMessage(message: any): void {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
        console.log("Sent message to MCP server:", message);
    } else {
        console.warn("WebSocket not connected, cannot send message");
    }
}

function buildFallbackPluginHello(): PluginHelloMessage {
    return {
        type: "plugin-hello",
        protocolVersion: MCP_PROTOCOL_VERSION,
        pluginVersion: PENPOT_MCP_VERSION,
        capabilities: [...MCP_PLUGIN_CAPABILITIES],
        fileContextCapabilities: [],
        updatedAt: new Date().toISOString(),
    };
}

function handlePluginCompatibility(message: PluginCompatibilityMessage): boolean {
    if (message.compatible) {
        console.log("MCP plugin compatibility accepted:", message);
        updateConnectionStatus("connected", "Connected");
        return true;
    }

    const reason = message.error?.message ?? "The MCP plugin is not compatible with this MCP server.";
    console.warn("MCP plugin compatibility rejected:", message);
    showVersionWarningText(reason);
    updateConnectionStatus("error", "Incompatible MCP plugin", reason);
    ws?.close(1008, truncateCloseReason(reason));
    return false;
}

function truncateCloseReason(reason: string): string {
    return reason.length > 120 ? `${reason.slice(0, 117)}...` : reason;
}

/**
 * Establishes a WebSocket connection to the MCP server.
 */
function connectToMcpServer(baseUrl?: string, token?: string, hello?: PluginHelloMessage): void {
    if (hello) {
        latestPluginHelloMessage = hello;
    }

    if (ws?.readyState === WebSocket.OPEN) {
        sendPluginHello();
        updateConnectionStatus("connected", "Connected");
        return;
    }

    try {
        let wsUrl = baseUrl || PENPOT_MCP_WEBSOCKET_URL;
        let wsError: unknown | undefined;

        if (token) {
            wsUrl += `?userToken=${encodeURIComponent(token)}`;
        }

        ws = new WebSocket(wsUrl);
        updateConnectionStatus("connecting", "Connecting...");

        ws.onopen = () => {
            if (ws) {
                console.log("Connected to MCP server, negotiating compatibility");
                sendPluginHello();
                if (latestFileContextMessage) {
                    sendServerMessage(latestFileContextMessage);
                }
            }
        };

        ws.onmessage = (event) => {
            try {
                console.log("Received from MCP server:", event.data);
                const request = JSON.parse(event.data);
                // Track the current task received from the MCP server
                if (request.type === "plugin-compatibility") {
                    if (!handlePluginCompatibility(request)) {
                        wsError = request.error ?? request;
                    }
                } else if (request.task) {
                    updateCurrentTask(request.task);
                    updateExecutedCode(request.params?.code ?? null);
                    parent.postMessage(request, "*");
                } else if (request.type === "file-context-control-result") {
                    parent.postMessage(request, "*");
                }
            } catch (error) {
                console.error("Failed to parse WebSocket message:", error);
            }
        };

        ws.onclose = (event: CloseEvent) => {
            // If we've send the error update we don't send the disconnect as well
            if (!wsError) {
                console.log("Disconnected from MCP server");
                const label = event.reason ? `Disconnected: ${event.reason}` : "Disconnected";
                updateConnectionStatus("disconnected", label);
                updateCurrentTask(null);
            }
            ws = null;
        };

        ws.onerror = (error) => {
            console.error("WebSocket error:", error);
            wsError = error;
            // note: WebSocket error events typically don't contain detailed error messages
            updateConnectionStatus("error", "Connection error", "WebSocket connection error");
        };
    } catch (error) {
        console.error("Failed to connect to MCP server:", error);
        const reason = error instanceof Error ? error.message : undefined;
        const label = reason ? `Connection failed: ${reason}` : "Connection failed";
        updateConnectionStatus("error", label, reason);
    }
}

copyCodeBtn?.addEventListener("click", () => {
    const code = executedCodeEl?.value;
    if (!code) return;

    navigator.clipboard.writeText(code).then(() => {
        copyCodeBtn.classList.add("copied");
        setTimeout(() => copyCodeBtn.classList.remove("copied"), 1500);
    });
});

connectBtn?.addEventListener("click", () => {
    connectToMcpServer();
});

disconnectBtn?.addEventListener("click", () => {
    ws?.close();
});

// Listen plugin.ts messages
window.addEventListener("message", (event) => {
    if (event.data.type === "start-server") {
        const message = event.data as StartServerMessage;
        connectToMcpServer(message.url, message.token, message.hello);
    }
    if (event.data.type === "version-mismatch") {
        showVersionWarningText(
            `Version mismatch detected: This version of the MCP server is intended for Penpot ` +
                `${event.data.mcpVersion} while the current version is ${event.data.penpotVersion}. ` +
                `Executions may not work or produce suboptimal results.`
        );
    }
    if (event.data.type === "stop-server") {
        ws?.close();
    } else if (event.data.type === "file-context-update") {
        sendFileContextUpdate(event.data);
    } else if (event.data.type === "file-context-bind-request" || event.data.type === "file-context-release-request") {
        sendServerMessage(event.data as FileContextControlRequestMessage);
    } else if (event.data.source === "penpot") {
        document.body.dataset.theme = event.data.theme;
    } else if (event.data.type === "task-response") {
        // Forward task response back to MCP server
        sendTaskResponse(event.data.response);
    }
});

parent.postMessage({ type: "ui-initialized" }, "*");
