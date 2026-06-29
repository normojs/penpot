import { CommandErrorCodes } from "@penpot/command-runtime";

type RpcParamValue = string | number | boolean | string[] | number[] | boolean[] | object | null | undefined;

export type RpcParams = Record<string, RpcParamValue>;

export interface PenpotSseEvent {
    type: string;
    data: unknown;
}

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
        public readonly code: string = CommandErrorCodes.PENPOT_RPC_ERROR,
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

    public getMethodUrl(methodName: string): string {
        const url = this.createRpcUrl(methodName);
        url.searchParams.set("_fmt", "json");
        return url.toString();
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

    public async postSse(
        methodName: string,
        params: RpcParams,
        userToken: string,
        context?: PenpotRpcRequestContext
    ): Promise<PenpotSseEvent[]> {
        const url = this.createRpcUrl(methodName);
        url.searchParams.set("_fmt", "json");
        const headers: Record<string, string> = {
            accept: "text/event-stream,application/json",
            authorization: `Token ${userToken}`,
            "content-type": "application/json",
            "x-client": "penpot-mcp/1.0",
        };
        Object.assign(headers, this.createContextHeaders(context));

        let response: Response;
        try {
            response = await fetch(url, {
                method: "POST",
                headers,
                body: JSON.stringify(params ?? {}),
            });
        } catch (cause) {
            throw new PenpotRpcError(
                0,
                "Unable to reach the Penpot backend RPC endpoint.",
                "penpot_backend_unavailable",
                {
                    baseUri: this.baseUri,
                    url: url.toString(),
                    method: "POST",
                    cause: String(cause),
                }
            );
        }

        const text = await response.text();
        if (!response.ok) {
            throw this.createError(response.status, this.parseSseEventData(text));
        }

        const contentType = response.headers.get("content-type") ?? "";
        if (!contentType.includes("text/event-stream")) {
            throw new PenpotRpcError(
                502,
                `Penpot RPC ${methodName} did not return an SSE stream.`,
                "penpot_rpc_stream_expected",
                {
                    contentType,
                    response: text,
                }
            );
        }

        const events = this.parseSseEvents(text);
        const errorEvent = events.find((event) => event.type === "error");
        if (errorEvent) {
            const data = this.asRecord(errorEvent.data);
            const backendCode = typeof data.code === "string" ? data.code : undefined;
            const message =
                typeof data.message === "string"
                    ? data.message
                    : typeof data.hint === "string"
                      ? data.hint
                      : `Penpot RPC ${methodName} stream failed.`;
            throw new PenpotRpcError(response.status, message, this.normalizeErrorCode(response.status, backendCode), {
                response: errorEvent.data,
            });
        }

        return events;
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

    private parseSseEvents(text: string): PenpotSseEvent[] {
        return text
            .split(/\r?\n\r?\n/)
            .map((block) => block.trim())
            .filter(Boolean)
            .map((block) => {
                let type = "message";
                const dataLines: string[] = [];
                for (const line of block.split(/\r?\n/)) {
                    if (line.startsWith("event:")) {
                        type = line.slice("event:".length).trim();
                    } else if (line.startsWith("data:")) {
                        dataLines.push(line.slice("data:".length).trimStart());
                    }
                }
                return {
                    type,
                    data: this.parseSseEventData(dataLines.join("\n")),
                };
            });
    }

    private parseSseEventData(data: string): unknown {
        if (!data.trim()) {
            return null;
        }
        try {
            return this.decodeTransitJson(data);
        } catch {
            return data;
        }
    }

    private decodeTransitJson(text: string): unknown {
        return this.decodeTransitValue(JSON.parse(text));
    }

    private decodeTransitValue(value: unknown): unknown {
        if (typeof value === "string") {
            return this.decodeTransitString(value);
        }

        if (Array.isArray(value)) {
            if (value[0] === "^ " && value.length % 2 === 1) {
                const decoded: Record<string, unknown> = {};
                for (let index = 1; index < value.length; index += 2) {
                    decoded[this.decodeTransitKey(value[index])] = this.decodeTransitValue(value[index + 1]);
                }
                return decoded;
            }

            if (value.length === 2 && value[0] === "~#uuid" && typeof value[1] === "string") {
                return value[1];
            }

            return value.map((entry) => this.decodeTransitValue(entry));
        }

        if (value !== null && typeof value === "object") {
            const decoded: Record<string, unknown> = {};
            for (const [key, entry] of Object.entries(value)) {
                decoded[this.decodeTransitKey(key)] = this.decodeTransitValue(entry);
            }
            return decoded;
        }

        return value;
    }

    private decodeTransitKey(value: unknown): string {
        const decoded = this.decodeTransitValue(value);
        return typeof decoded === "string" ? decoded : JSON.stringify(decoded);
    }

    private decodeTransitString(value: string): string {
        if (value.startsWith("~~")) {
            return value.slice(1);
        }

        if (value.startsWith("~:")) {
            return value.slice(2);
        }

        if (value.startsWith("~u") && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.slice(2))) {
            return value.slice(2);
        }

        return value;
    }

    private asRecord(value: unknown): Record<string, unknown> {
        return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
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
            return CommandErrorCodes.AUTHENTICATION_REQUIRED;
        }
        if (status === 403) {
            return CommandErrorCodes.PERMISSION_DENIED;
        }
        if (status === 404 && backendCode === "object-not-found") {
            return CommandErrorCodes.OBJECT_NOT_FOUND_OR_FORBIDDEN;
        }
        if (status === 429) {
            return CommandErrorCodes.RATE_LIMIT_REACHED;
        }
        if (backendCode) {
            return backendCode.replaceAll("-", "_");
        }
        return CommandErrorCodes.PENPOT_RPC_ERROR;
    }
}
