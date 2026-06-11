type RpcParamValue = string | number | boolean | string[] | number[] | boolean[] | null | undefined;

export type RpcParams = Record<string, RpcParamValue>;

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

    public async get<T>(methodName: string, params: RpcParams, userToken: string): Promise<T> {
        const url = new URL(`api/main/methods/${methodName}`, `${this.baseUri}/`);
        url.searchParams.set("_fmt", "json");

        for (const [key, value] of Object.entries(params)) {
            if (value !== undefined && value !== null) {
                url.searchParams.set(key, String(value));
            }
        }

        return await this.request<T>(url, "GET", userToken);
    }

    public async post<T>(methodName: string, params: RpcParams, userToken: string): Promise<T> {
        const url = new URL(`api/main/methods/${methodName}`, `${this.baseUri}/`);
        url.searchParams.set("_fmt", "json");

        return await this.request<T>(url, "POST", userToken, params);
    }

    private async request<T>(url: URL, method: "GET" | "POST", userToken: string, params?: RpcParams): Promise<T> {
        const headers: Record<string, string> = {
            accept: "application/json",
            authorization: `Token ${userToken}`,
            "x-client": "penpot-mcp/1.0",
        };

        if (method === "POST") {
            headers["content-type"] = "application/json";
        }

        const response = await fetch(url, {
            method,
            headers,
            body: method === "POST" ? JSON.stringify(params ?? {}) : undefined,
        });

        const text = await response.text();
        const data = this.parseResponse(text);

        if (!response.ok) {
            throw this.createError(response.status, data);
        }

        return data as T;
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
            const code = typeof errorData.code === "string" ? errorData.code : "penpot_rpc_error";
            const hint = typeof errorData.hint === "string" ? errorData.hint : undefined;
            const message = typeof errorData.message === "string" ? errorData.message : hint;

            return new PenpotRpcError(status, message ?? `Penpot RPC failed with status ${status}`, code, data);
        }

        return new PenpotRpcError(status, `Penpot RPC failed with status ${status}`, "penpot_rpc_error", data);
    }
}
