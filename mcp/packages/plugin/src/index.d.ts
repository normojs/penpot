import "@penpot/plugin-types";

declare module "@penpot/plugin-types" {
    interface Penpot {
        /** The Penpot application version string. */
        version: string;
    }
}

interface McpOptions {
    getToken(): string;
    getServerUrl(): string;
    getFrontendVersion?(): string;
    setMcpStatus(status: string, details?: unknown);
    setFileContextStatus?(status: unknown);
    on(eventType: "disconnect" | "connect" | "bind-context" | "release-context", cb: () => void);
}

declare global {
    const mcp: undefined | McpOptions;
}

export {};
