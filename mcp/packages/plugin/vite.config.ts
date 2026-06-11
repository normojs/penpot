import { defineConfig } from "vite";
import livePreview from "vite-live-preview";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const rootPkg = require("../../package.json");

const MCP_PUBLIC_URI = process.env.PENPOT_MCP_PUBLIC_URI;

function buildMcpPublicUrl(path: string): string | undefined {
    if (!MCP_PUBLIC_URI) {
        return undefined;
    }

    const baseUrl = MCP_PUBLIC_URI.endsWith("/") ? MCP_PUBLIC_URI : `${MCP_PUBLIC_URI}/`;
    return new URL(`mcp/${path}`, baseUrl).toString();
}

const WS_URI =
    process.env.PENPOT_MCP_WEBSOCKET_URI || process.env.WS_URI || buildMcpPublicUrl("ws") || "http://localhost:4402";
const SERVER_HOST = process.env.PENPOT_MCP_PLUGIN_SERVER_HOST ?? "localhost";
const MCP_VERSION = JSON.stringify(rootPkg.version);

console.log("PENPOT_MCP_PUBLIC_URI:", JSON.stringify(MCP_PUBLIC_URI));
console.log("PENPOT_MCP_WEBSOCKET_URL:", JSON.stringify(WS_URI));
console.log("PENPOT_MCP_VERSION:", MCP_VERSION);

export default defineConfig({
    base: "./",
    plugins: [
        livePreview({
            reload: true,
            config: {
                build: {
                    sourcemap: true,
                },
            },
        }),
    ],
    build: {
        rollupOptions: {
            input: {
                plugin: "src/plugin.ts",
                index: "./index.html",
            },
            output: {
                entryFileNames: "[name].js",
            },
        },
    },
    preview: {
        host: SERVER_HOST,
        port: 4400,
        cors: true,
        allowedHosts: [],
    },
    define: {
        PENPOT_MCP_WEBSOCKET_URL: JSON.stringify(WS_URI),
        PENPOT_MCP_VERSION: MCP_VERSION,
    },
});
