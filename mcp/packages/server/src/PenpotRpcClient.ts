type RpcParamValue = string | number | boolean | string[] | number[] | boolean[] | object | null | undefined;

export type RpcParams = Record<string, RpcParamValue>;

export interface PenpotRpcRequestContext {
    mcpToolName?: string;
    mcpAdapter?: string | null;
    mcpSessionId?: string;
    mcpProjectId?: string;
    mcpFileId?: string;
    mcpPageId?: string;
    mcpShapeId?: string;
}

export class PenpotRpcError extends Error {
    constructor(
        public readonly status: number,
        message: string,
        public readonly code: string = "penpot_rpc_error",
        public readonly data: unknown = null
    ) {
        super(message);
        this.name = "PenpotRpcError";
    }
}

export class PenpotRpcClient {
    private readonly baseUri: string;

    constructor(baseUri: string = PenpotRpcClient.getDefaultBaseUri()) {
        this.baseUri = baseUri.replace(/\/+$/, "");
    }

    private static getDefaultBaseUri(): string {
        return process.env.PENPOT_BACKEND_URI ?? process.env.PENPOT_PUBLIC_URI ?? "http://localhost:6060";
    }

    public getBaseUri(): string {
        return this.baseUri;
    }

    public async get<T>(
        methodName: string,
        params: RpcParams,
        userToken: string,
        context?: PenpotRpcRequestContext
    ): Promise<T> {
        const url = this.createRpcUrl(methodName);
        url.searchParams.set("_fmt", "json");

        for (const [key, value] of Object.entries(params)) {
            if (value !== undefined && value !== null) {
                url.searchParams.set(key, String(value));
            }
        }

        return await this.request<T>(url, "GET", userToken, undefined, context);
    }

    public async post<T>(
        methodName: string,
        params: RpcParams,
        userToken: string,
        context?: PenpotRpcRequestContext
    ): Promise<T> {
        const url = this.createRpcUrl(methodName);
        url.searchParams.set("_fmt", "json");

        return await this.request<T>(url, "POST", userToken, params, context);
    }

    private createRpcUrl(methodName: string): URL {
        try {
            return new URL(`api/main/methods/${methodName}`, `${this.baseUri}/`);
        } catch (cause) {
            throw new PenpotRpcError(
                0,
                "Invalid Penpot backend URI. Set PENPOT_BACKEND_URI or PENPOT_PUBLIC_URI to a valid URL.",
                "penpot_backend_config_invalid",
                {
                    baseUri: this.baseUri,
                    methodName,
                    cause: String(cause),
                }
            );
        }
    }

    private async request<T>(
        url: URL,
        method: "GET" | "POST",
        userToken: string,
        params?: RpcParams,
        context?: PenpotRpcRequestContext
    ): Promise<T> {
        const headers: Record<string, string> = {
            accept: "application/json",
            authorization: `Token ${userToken}`,
            "x-client": "penpot-mcp/1.0",
        };
        Object.assign(headers, this.createContextHeaders(context));

        if (method === "POST") {
            headers["content-type"] = "application/json";
        }

        let response: Response;
        try {
            response = await fetch(url, {
                method,
                headers,
                body: method === "POST" ? JSON.stringify(params ?? {}) : undefined,
            });
        } catch (cause) {
            throw new PenpotRpcError(
                0,
                "Unable to reach the Penpot backend RPC endpoint.",
                "penpot_backend_unavailable",
                {
                    baseUri: this.baseUri,
                    url: url.toString(),
                    method,
                    cause: String(cause),
                }
            );
        }

        const text = await response.text();
        const data = this.parseResponse(text);

        if (!response.ok) {
            throw this.createError(response.status, data);
        }

        return data as T;
    }

    private createContextHeaders(context?: PenpotRpcRequestContext): Record<string, string> {
        const headers: Record<string, string> = {};
        if (!context) {
            return headers;
        }

        this.setHeader(headers, "x-event-origin", "mcp");
        this.setHeader(headers, "x-penpot-mcp-tool", context.mcpToolName);
        this.setHeader(headers, "x-penpot-mcp-adapter", context.mcpAdapter);
        this.setHeader(headers, "x-penpot-mcp-session-id", context.mcpSessionId);
        this.setHeader(headers, "x-penpot-mcp-project-id", context.mcpProjectId);
        this.setHeader(headers, "x-penpot-mcp-file-id", context.mcpFileId);
        this.setHeader(headers, "x-penpot-mcp-page-id", context.mcpPageId);
        this.setHeader(headers, "x-penpot-mcp-shape-id", context.mcpShapeId);

        if (headers["x-penpot-mcp-session-id"]) {
            headers["x-external-session-id"] = headers["x-penpot-mcp-session-id"];
        }

        return headers;
    }

    private setHeader(headers: Record<string, string>, name: string, value: string | null | undefined): void {
        const headerValue = this.normalizeHeaderValue(value);
        if (headerValue) {
            headers[name] = headerValue;
        }
    }

    private normalizeHeaderValue(value: string | null | undefined): string | undefined {
        if (typeof value !== "string") {
            return undefined;
        }

        const trimmed = value.trim();
        if (trimmed === "" || trimmed === "null") {
            return undefined;
        }

        return trimmed.slice(0, 512);
    }

    private parseResponse(text: string): unknown {
        if (text.trim() === "") {
            return null;
        }

        try {
            return JSON.parse(text);
        } catch (cause) {
            throw new PenpotRpcError(502, "Penpot RPC returned invalid JSON", "invalid_json_response", {
                cause: String(cause),
                body: text,
            });
        }
    }

    private createError(status: number, data: unknown): PenpotRpcError {
        if (typeof data === "object" && data !== null) {
            const errorData = data as Record<string, unknown>;
            const backendCode = typeof errorData.code === "string" ? errorData.code : undefined;
            const backendType = typeof errorData.type === "string" ? errorData.type : undefined;
            const code = this.normalizeErrorCode(status, backendCode);
            const hint = typeof errorData.hint === "string" ? errorData.hint : undefined;
            const message = typeof errorData.message === "string" ? errorData.message : hint;

            return new PenpotRpcError(status, message ?? `Penpot RPC failed with status ${status}`, code, {
                backendCode,
                backendType,
                response: data,
            });
        }

        return new PenpotRpcError(
            status,
            `Penpot RPC failed with status ${status}`,
            this.normalizeErrorCode(status),
            data
        );
    }

    private normalizeErrorCode(status: number, backendCode?: string): string {
        if (status === 401) {
            return "authentication_required";
        }
        if (status === 403) {
            return "permission_denied";
        }
        if (status === 404 && backendCode === "object-not-found") {
            return "object_not_found_or_forbidden";
        }
        if (backendCode) {
            return backendCode.replaceAll("-", "_");
        }
        return "penpot_rpc_error";
    }
}
