import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { pathToFileURL } from "node:url";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 6070;

export type RendererServiceOptions = {
    host?: string;
    port?: number;
};

export type StartedRendererService = {
    host: string;
    port: number;
    server: Server;
    stop: () => Promise<void>;
};

export const healthResponse = {
    status: "ok",
    renderer: "penpot-thumbnail-renderer",
    mode: "noop",
    runtimeRegistration: false,
    dispatch: false,
    capabilities: ["health", "thumbnail.render.noop"],
} as const;

export const noopThumbnailResponse = {
    status: "noop",
    code: "renderer_service_noop",
    message: "renderer-service no-op fixture does not render PNG bytes",
    artifact: null,
    resource: null,
    runtimeRegistration: false,
    dispatch: false,
    localFileWrites: false,
} as const;

function sendJson(response: ServerResponse, statusCode: number, body: unknown): void {
    const payload = JSON.stringify(body);
    response.writeHead(statusCode, {
        "content-type": "application/json; charset=utf-8",
        "content-length": Buffer.byteLength(payload),
    });
    response.end(payload);
}

function handleRequest(request: IncomingMessage, response: ServerResponse): void {
    const url = new URL(request.url ?? "/", "http://renderer-service.local");

    if (request.method === "GET" && url.pathname === "/health") {
        sendJson(response, 200, healthResponse);
        return;
    }

    if (request.method === "POST" && url.pathname === "/thumbnail") {
        request.resume();
        sendJson(response, 501, noopThumbnailResponse);
        return;
    }

    sendJson(response, 404, {
        status: "not_found",
        code: "renderer_service_route_not_found",
    });
}

export function createRendererService(): Server {
    return createServer(handleRequest);
}

export async function startRendererService(options: RendererServiceOptions = {}): Promise<StartedRendererService> {
    const host = options.host ?? DEFAULT_HOST;
    const port = options.port ?? DEFAULT_PORT;
    const server = createRendererService();

    await new Promise<void>((resolve, reject) => {
        const onError = (error: Error) => {
            server.off("listening", onListening);
            reject(error);
        };
        const onListening = () => {
            server.off("error", onError);
            resolve();
        };

        server.once("error", onError);
        server.once("listening", onListening);
        server.listen(port, host);
    });

    const address = server.address();
    if (!address || typeof address === "string") {
        await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
        throw new Error("Renderer service did not bind a TCP address.");
    }

    return {
        host,
        port: address.port,
        server,
        stop: () =>
            new Promise<void>((resolve, reject) => {
                server.close((error) => (error ? reject(error) : resolve()));
            }),
    };
}

function readPort(value: string | undefined): number {
    if (!value) {
        return DEFAULT_PORT;
    }

    const port = Number(value);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error("PENPOT_RENDERER_SERVICE_PORT must be an integer between 1 and 65535.");
    }

    return port;
}

async function runNoopHost(): Promise<void> {
    const service = await startRendererService({
        host: process.env.PENPOT_RENDERER_SERVICE_HOST ?? DEFAULT_HOST,
        port: readPort(process.env.PENPOT_RENDERER_SERVICE_PORT),
    });
    const shutdown = () => {
        void service.stop().finally(() => process.exit(0));
    };

    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
    process.stdout.write(`renderer-service noop listening on http://${service.host}:${service.port}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    void runNoopHost().catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        process.stderr.write(`renderer-service failed to start: ${message}\n`);
        process.exitCode = 1;
    });
}
