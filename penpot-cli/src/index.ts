#!/usr/bin/env node

import { spawn } from "node:child_process";
import { constants } from "node:fs";
import { access, readdir, stat } from "node:fs/promises";
import { delimiter, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const VERSION = "0.1.0";
const DEFAULT_PUBLIC_URI = "http://localhost:3449";
const DEFAULT_EXPORTER_URI = "http://localhost:6061";

const HELP_TEXT = `penpot-cli ${VERSION}

Usage:
  penpot-cli --help
  penpot-cli --version
  penpot-cli mcp status [--url <status-url>] [--format text|json]
  penpot-cli mcp config [--format text|json]
  penpot-cli mcp logs [--dir <path>] [--follow] [--format text|json]
  penpot-cli dev up --mcp [--mode devenv] [--dry-run] [--format text|json]
  penpot-cli file list --project-id <id> [--format text|json]
  penpot-cli file create --project-id <id> [--name <name>] [--format text|json]
  penpot-cli file open <file-id> [--team-id <id>] [--page-id <id>] [--format text|json]
  penpot-cli page list --file <file-id> [--format text|json]
  penpot-cli page create --file <file-id> [--name <name>] [--format text|json]
  penpot-cli export page --file <file-id> --page <page-id> --object <object-id> [--dry-run] [--format text|json]`;

const MCP_HELP_TEXT = `penpot-cli mcp

Usage:
  penpot-cli mcp status [--url <status-url>] [--format text|json]
  penpot-cli mcp config [--format text|json]
  penpot-cli mcp logs [--dir <path>] [--follow] [--format text|json]

Environment:
  PENPOT_MCP_PUBLIC_URI      Public Penpot base URL, default http://localhost:3449
  PENPOT_MCP_STREAM_URI      Explicit MCP stream URL
  PENPOT_MCP_WEBSOCKET_URI   Explicit MCP WebSocket URL
  PENPOT_MCP_STATUS_URI      Explicit MCP status URL
  PENPOT_MCP_LOG_DIR         MCP file log directory`;

const DEV_HELP_TEXT = `penpot-cli dev

Usage:
  penpot-cli dev up --mcp [--mode devenv] [--dry-run] [--format text|json]

Modes:
  devenv   Reuse the existing Docker devenv managed by ./manage.sh
  host     Planned future host-native startup mode
  hybrid   Planned future mixed Docker/host startup mode`;

const FILE_HELP_TEXT = `penpot-cli file

Usage:
  penpot-cli file list --project-id <id> [--backend-uri <uri>] [--token <token>] [--format text|json]
  penpot-cli file create --project-id <id> [--name <name>] [--shared] [--backend-uri <uri>] [--token <token>] [--format text|json]
  penpot-cli file open <file-id> [--team-id <id>] [--page-id <id>] [--public-uri <uri>] [--format text|json]

Environment:
  PENPOT_BACKEND_URI       Backend RPC base URI, default http://localhost:6060
  PENPOT_PUBLIC_URI        Public Penpot base URI used as backend fallback and browser URL base
  PENPOT_CLI_TOKEN         Penpot access token for backend RPC
  PENPOT_MCP_USER_TOKEN    Penpot MCP user token fallback for backend RPC
  PENPOT_ACCESS_TOKEN      Generic Penpot access token fallback`;

const PAGE_HELP_TEXT = `penpot-cli page

Usage:
  penpot-cli page list --file <file-id> [--backend-uri <uri>] [--token <token>] [--format text|json]
  penpot-cli page create --file <file-id> [--name <name>] [--page-id <id>] [--backend-uri <uri>] [--token <token>] [--format text|json]

Environment:
  PENPOT_BACKEND_URI       Backend RPC base URI, default http://localhost:6060
  PENPOT_PUBLIC_URI        Public Penpot base URI used as backend fallback
  PENPOT_CLI_TOKEN         Penpot access token for backend RPC
  PENPOT_MCP_USER_TOKEN    Penpot MCP user token fallback for backend RPC
  PENPOT_ACCESS_TOKEN      Generic Penpot access token fallback`;

const EXPORT_HELP_TEXT = `penpot-cli export

Usage:
  penpot-cli export page --file <file-id> --page <page-id> --object <object-id> [--export-format png|jpeg|svg|pdf] [--scale <n>] [--output <path>] [--exporter-uri <uri>] [--dry-run] [--format text|json]

Current adapters:
  exporter   Phase 7 headless adapter plan backed by the Penpot exporter HTTP service.

Environment:
  PENPOT_EXPORTER_URI      Exporter HTTP URI, default http://localhost:6061
  PENPOT_PROFILE_ID        Optional profile id for the direct exporter request`;

type Format = "text" | "json";
type RpcParamValue = string | number | boolean | string[] | number[] | boolean[] | null | undefined;
type RpcParams = Record<string, RpcParamValue>;

interface Writable {
    write(chunk: string): boolean;
}

interface CliIO {
    stdout: Writable;
    stderr: Writable;
}

interface McpConfig {
    publicUri: string;
    streamUri: string;
    sseUri: string;
    websocketUri: string;
    statusUri: string;
    logDir: string | null;
}

interface LogFile {
    path: string;
    name: string;
    sizeBytes: number;
    modifiedAt: string;
}

interface DevPlan {
    mode: string;
    mcpEnabled: boolean;
    dryRun: boolean;
    publicUri: string;
    commands: string[];
    surfaces: Record<string, string>;
    readinessChecks: string[];
}

interface RpcConfig {
    backendUri: string;
    token: string | null;
}

interface ExportPagePlan {
    command: string;
    adapter: string;
    fileId: string | null;
    pageId: string | null;
    objectId: string | null;
    profileId: string | null;
    name: string;
    exportFormat: string;
    scale: number;
    suffix: string;
    skipChildren: boolean;
    output: string | null;
    dryRun: boolean;
    status: string;
    exporter: {
        uri: string;
        endpoint: string;
        method: string;
        requestContentType: string;
        responseContentType: string;
    };
    request: {
        cmd: string;
        wait: boolean;
        "profile-id": string | null;
        "skip-children"?: boolean;
        exports: Array<{
            "file-id": string | null;
            "page-id": string | null;
            "object-id": string | null;
            type: string;
            suffix: string;
            scale: number;
            name: string;
        }>;
    };
    requires: string[];
    nextActions: string[];
    diagnostics: Record<string, unknown>;
}

const DEFAULT_IO: CliIO = {
    stdout: process.stdout,
    stderr: process.stderr,
};

function writeLine(stream: Writable, text = ""): void {
    stream.write(`${text}\n`);
}

function writeJson(stream: Writable, data: unknown): void {
    writeLine(stream, JSON.stringify(data, null, 2));
}

function isHelpFlag(value: string | undefined): boolean {
    return value === undefined || value === "--help" || value === "-h";
}

function isVersionFlag(value: string | undefined): boolean {
    return value === "--version" || value === "-v";
}

function hasFlag(args: string[], name: string): boolean {
    return args.includes(name);
}

function readOption(args: string[], names: string[]): string | undefined {
    for (let index = 0; index < args.length; index++) {
        const arg = args[index];
        for (const name of names) {
            if (arg === name) {
                const value = args[index + 1];
                return value && !value.startsWith("--") ? value : undefined;
            }
            const prefix = `${name}=`;
            if (arg.startsWith(prefix)) {
                return arg.slice(prefix.length);
            }
        }
    }
    return undefined;
}

function readFirstPositional(args: string[]): string | undefined {
    for (let index = 0; index < args.length; index++) {
        const arg = args[index];
        if (arg.startsWith("--")) {
            if (!arg.includes("=") && args[index + 1] && !args[index + 1].startsWith("--")) {
                index++;
            }
            continue;
        }
        return arg;
    }
    return undefined;
}

function parseFormat(args: string[], io: CliIO): Format | null {
    const format = readOption(args, ["--format"]) ?? "text";
    if (format === "text" || format === "json") {
        return format;
    }
    writeLine(io.stderr, `Invalid --format value: ${format}. Expected "text" or "json".`);
    return null;
}

function trimTrailingSlash(uri: string): string {
    return uri.replace(/\/+$/, "");
}

function appendPath(baseUri: string, path: string): string {
    return `${trimTrailingSlash(baseUri)}${path}`;
}

function getMcpConfig(args: string[], env: NodeJS.ProcessEnv): McpConfig {
    const publicUri = trimTrailingSlash(
        readOption(args, ["--public-uri"]) ?? env.PENPOT_MCP_PUBLIC_URI ?? DEFAULT_PUBLIC_URI
    );
    const streamUri = readOption(args, ["--stream-uri"]) ?? env.PENPOT_MCP_STREAM_URI ?? appendPath(publicUri, "/mcp/stream");
    const sseUri = readOption(args, ["--sse-uri"]) ?? env.PENPOT_MCP_SSE_URI ?? appendPath(publicUri, "/mcp/sse");
    const websocketUri =
        readOption(args, ["--websocket-uri", "--ws-uri"]) ??
        env.PENPOT_MCP_WEBSOCKET_URI ??
        appendPath(publicUri, "/mcp/ws");
    const statusUri =
        readOption(args, ["--status-uri", "--url"]) ?? env.PENPOT_MCP_STATUS_URI ?? appendPath(publicUri, "/mcp/status");
    const logDir = readOption(args, ["--dir", "--log-dir"]) ?? env.PENPOT_MCP_LOG_DIR ?? null;

    return {
        publicUri,
        streamUri,
        sseUri,
        websocketUri,
        statusUri,
        logDir,
    };
}

function getRpcConfig(args: string[], env: NodeJS.ProcessEnv): RpcConfig {
    return {
        backendUri: trimTrailingSlash(
            readOption(args, ["--backend-uri"]) ??
                env.PENPOT_BACKEND_URI ??
                env.PENPOT_PUBLIC_URI ??
                "http://localhost:6060"
        ),
        token:
            readOption(args, ["--token"]) ??
            env.PENPOT_CLI_TOKEN ??
            env.PENPOT_MCP_USER_TOKEN ??
            env.PENPOT_ACCESS_TOKEN ??
            null,
    };
}

function getExporterUri(args: string[], env: NodeJS.ProcessEnv): string {
    return trimTrailingSlash(readOption(args, ["--exporter-uri"]) ?? env.PENPOT_EXPORTER_URI ?? DEFAULT_EXPORTER_URI);
}

function createWorkspaceUrl(args: string[], env: NodeJS.ProcessEnv, fileId: string): string {
    const publicUri = trimTrailingSlash(
        readOption(args, ["--public-uri"]) ?? env.PENPOT_PUBLIC_URI ?? env.PENPOT_MCP_PUBLIC_URI ?? DEFAULT_PUBLIC_URI
    );
    const params = new URLSearchParams({ "file-id": fileId });
    const teamId = readOption(args, ["--team-id"]);
    const pageId = readOption(args, ["--page-id", "--page"]);
    if (teamId) {
        params.set("team-id", teamId);
    }
    if (pageId) {
        params.set("page-id", pageId);
    }
    return `${publicUri}/#/workspace?${params.toString()}`;
}

function getDevPlan(args: string[], env: NodeJS.ProcessEnv, dryRun: boolean): DevPlan {
    const config = getMcpConfig(args, env);
    const mode = readOption(args, ["--mode"]) ?? "devenv";

    return {
        mode,
        mcpEnabled: hasFlag(args, "--mcp"),
        dryRun,
        publicUri: config.publicUri,
        commands:
            mode === "devenv"
                ? [
                      "./manage.sh start-devenv",
                      "./manage.sh run-devenv",
                      "Inside devenv: start the frontend/backend/exporter/MCP processes with enable-mcp.",
                  ]
                : [`${mode} mode startup is planned for a later Phase 6 slice.`],
        surfaces: {
            frontend: config.publicUri,
            mcpStream: config.streamUri,
            mcpSse: config.sseUri,
            mcpWebSocket: config.websocketUri,
            mcpStatus: config.statusUri,
        },
        readinessChecks: [
            "GET /api/health or the available backend health endpoint",
            `GET ${config.statusUri}`,
            `${config.publicUri}/plugins/mcp/manifest.json`,
        ],
    };
}

function createExportPagePlan(args: string[], env: NodeJS.ProcessEnv): ExportPagePlan {
    const fileId = readOption(args, ["--file", "--file-id"]) ?? null;
    const pageId = readOption(args, ["--page", "--page-id"]) ?? null;
    const objectId = readOption(args, ["--object", "--object-id", "--frame", "--frame-id"]) ?? null;
    const profileId = readOption(args, ["--profile-id"]) ?? env.PENPOT_PROFILE_ID ?? null;
    const scaleValue = readOption(args, ["--scale"]);
    const exportFormat = readOption(args, ["--export-format"]) ?? "png";
    const scale = scaleValue ? Number(scaleValue) : 1;
    const name = readOption(args, ["--name"])?.trim() || "page";
    const suffix = readOption(args, ["--suffix"]) ?? "";
    const skipChildren = hasFlag(args, "--skip-children");
    const exporterUri = getExporterUri(args, env);
    const requires = [
        fileId ? null : "fileId",
        pageId ? null : "pageId",
        objectId ? null : "objectId",
        profileId ? null : "profileId",
    ].filter((value): value is string => typeof value === "string");

    return {
        command: "export.page",
        adapter: readOption(args, ["--adapter"]) ?? "exporter",
        fileId,
        pageId,
        objectId,
        profileId,
        name,
        exportFormat,
        scale,
        suffix,
        skipChildren,
        output: readOption(args, ["--output"]) ?? null,
        dryRun: hasFlag(args, "--dry-run"),
        status: "planned",
        exporter: {
            uri: exporterUri,
            endpoint: exporterUri,
            method: "POST",
            requestContentType: "application/transit+json",
            responseContentType: "application/transit+json",
        },
        request: {
            cmd: "export-shapes",
            wait: true,
            "profile-id": profileId,
            ...(skipChildren ? { "skip-children": true } : {}),
            exports: [
                {
                    "file-id": fileId,
                    "page-id": pageId,
                    "object-id": objectId,
                    type: exportFormat,
                    suffix,
                    scale,
                    name,
                },
            ],
        },
        requires,
        nextActions: [
            "Pass explicit file, page, and object ids; the exporter cannot infer live selection state.",
            "Provide a profile id directly or let the future runtime resolve it from the authenticated user.",
            "Use --dry-run until exporter POST execution is enabled in the shared command runtime.",
        ],
        diagnostics: {
            transitKeywordFields: ["cmd", "exports[].type"],
            authCookie: "auth-token",
            outputMode: "exporter-resource-upload",
        },
    };
}

function writeDevPlanText(io: CliIO, plan: DevPlan): void {
    writeLine(io.stdout, "Penpot dev MCP plan");
    writeLine(io.stdout, `mode: ${plan.mode}`);
    writeLine(io.stdout, `dryRun: ${String(plan.dryRun)}`);
    writeLine(io.stdout, `mcp: ${plan.mcpEnabled ? "enabled" : "disabled"}`);
    writeLine(io.stdout, `publicUri: ${plan.publicUri}`);
    writeLine(io.stdout, "surfaces:");
    for (const [name, uri] of Object.entries(plan.surfaces)) {
        writeLine(io.stdout, `  ${name}: ${uri}`);
    }
    writeLine(io.stdout, "commands:");
    for (const command of plan.commands) {
        writeLine(io.stdout, `  ${command}`);
    }
    writeLine(io.stdout, "readiness:");
    for (const check of plan.readinessChecks) {
        writeLine(io.stdout, `  ${check}`);
    }
}

async function canExecute(filePath: string): Promise<boolean> {
    try {
        await access(filePath, constants.X_OK);
        return true;
    } catch {
        return false;
    }
}

async function commandExists(command: string, env: NodeJS.ProcessEnv): Promise<boolean> {
    const pathValue = env.PATH ?? "";
    const pathEntries = pathValue.split(delimiter).filter(Boolean);
    for (const pathEntry of pathEntries) {
        if (await canExecute(join(pathEntry, command))) {
            return true;
        }
    }
    return false;
}

async function runProcess(command: string, args: string[]): Promise<number> {
    return await new Promise((resolveProcess) => {
        const child = spawn(command, args, { stdio: "inherit" });
        child.on("error", () => resolveProcess(2));
        child.on("exit", (code) => resolveProcess(code ?? 0));
    });
}

function writeError(
    io: CliIO,
    format: Format,
    code: string,
    message: string,
    actions: string[] = [],
    data: Record<string, unknown> = {}
): void {
    if (format === "json") {
        writeJson(io.stdout, {
            status: "error",
            error: {
                code,
                message,
                actions,
                data,
            },
        });
        return;
    }

    writeLine(io.stderr, message);
    for (const action of actions) {
        writeLine(io.stderr, `- ${action}`);
    }
}

function writeOk(io: CliIO, format: Format, data: unknown, textWriter: () => void): void {
    if (format === "json") {
        writeJson(io.stdout, {
            status: "ok",
            data,
        });
        return;
    }

    textWriter();
}

function rpcAuthenticationRequired(io: CliIO, format: Format): number {
    writeError(
        io,
        format,
        "authentication_required",
        "This command requires a Penpot access token.",
        [
            "Pass --token <token>.",
            "Set PENPOT_CLI_TOKEN, PENPOT_MCP_USER_TOKEN, or PENPOT_ACCESS_TOKEN.",
        ]
    );
    return 2;
}

function createRpcUrl(backendUri: string, methodName: string, params: RpcParams = {}): URL {
    const url = new URL(`api/main/methods/${methodName}`, `${backendUri}/`);
    url.searchParams.set("_fmt", "json");
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
            url.searchParams.set(key, String(value));
        }
    }
    return url;
}

async function rpcRequest<T>(
    method: "GET" | "POST",
    backendUri: string,
    methodName: string,
    params: RpcParams,
    token: string
): Promise<T> {
    const url = createRpcUrl(backendUri, methodName, method === "GET" ? params : {});
    const response = await fetch(url, {
        method,
        headers: {
            accept: "application/json",
            authorization: `Token ${token}`,
            "content-type": "application/json",
            "x-client": "penpot-cli/0.1",
        },
        body: method === "POST" ? JSON.stringify(params) : undefined,
    });
    const text = await response.text();
    const data = text.trim() ? JSON.parse(text) : null;

    if (!response.ok) {
        const body = asRecord(data);
        const code = typeof body.code === "string" ? body.code.replaceAll("-", "_") : "penpot_rpc_error";
        const message =
            typeof body.message === "string"
                ? body.message
                : typeof body.hint === "string"
                  ? body.hint
                  : `Penpot RPC ${methodName} failed with HTTP ${response.status}`;
        throw Object.assign(new Error(message), {
            code,
            status: response.status,
            data,
        });
    }

    return data as T;
}

function rpcErrorResponse(io: CliIO, format: Format, methodName: string, backendUri: string, cause: unknown): number {
    const error = asRecord(cause);
    const code = typeof error.code === "string" ? error.code : "penpot_rpc_error";
    const status = typeof error.status === "number" ? error.status : 0;
    const message =
        cause instanceof Error
            ? cause.message
            : `Unable to call Penpot RPC command ${methodName}.`;
    writeError(
        io,
        format,
        code,
        `${message}`,
        [
            "Check PENPOT_BACKEND_URI or --backend-uri.",
            "Check the token and normal Penpot permissions.",
        ],
        {
            backendUri,
            methodName,
            status,
        }
    );
    return 2;
}

function writeConfigText(io: CliIO, config: McpConfig): void {
    writeLine(io.stdout, "MCP config");
    writeLine(io.stdout, `public: ${config.publicUri}`);
    writeLine(io.stdout, `stream: ${config.streamUri}`);
    writeLine(io.stdout, `sse: ${config.sseUri}`);
    writeLine(io.stdout, `websocket: ${config.websocketUri}`);
    writeLine(io.stdout, `status: ${config.statusUri}`);
    writeLine(io.stdout, `logDir: ${config.logDir ?? "<not configured>"}`);
}

function writeFilesText(io: CliIO, projectId: string, files: unknown): void {
    writeLine(io.stdout, `Files for project ${projectId}`);
    if (!Array.isArray(files) || files.length === 0) {
        writeLine(io.stdout, "No files found.");
        return;
    }

    for (const file of files) {
        const record = asRecord(file);
        writeLine(io.stdout, `${String(record.id ?? "<unknown>")}  ${String(record.name ?? "<unnamed>")}`);
    }
}

function summarizeFile(file: unknown, projectId: string, fallbackName: string): Record<string, unknown> {
    const record = asRecord(file);
    return {
        id: record.id,
        name: record.name ?? fallbackName,
        projectId: record.projectId ?? record["project-id"] ?? projectId,
        teamId: record.teamId ?? record["team-id"],
        revn: record.revn,
        vern: record.vern,
        isShared: record.isShared ?? record["is-shared"],
        createdAt: record.createdAt ?? record["created-at"],
        modifiedAt: record.modifiedAt ?? record["modified-at"],
    };
}

function writeFileCreatedText(io: CliIO, file: Record<string, unknown>, url: string): void {
    writeLine(io.stdout, "File created");
    writeLine(io.stdout, `id: ${String(file.id ?? "<unknown>")}`);
    writeLine(io.stdout, `name: ${String(file.name ?? "<unnamed>")}`);
    writeLine(io.stdout, `projectId: ${String(file.projectId ?? "<unknown>")}`);
    writeLine(io.stdout, `url: ${url}`);
}

function writeFileOpenText(io: CliIO, url: string): void {
    writeLine(io.stdout, "Workspace URL");
    writeLine(io.stdout, url);
    writeLine(io.stdout, "This opens the file in the browser; it does not bind an MCP file context by itself.");
}

function writePagesText(io: CliIO, fileId: string, pages: unknown): void {
    writeLine(io.stdout, `Pages for file ${fileId}`);
    if (!Array.isArray(pages) || pages.length === 0) {
        writeLine(io.stdout, "No pages found.");
        return;
    }

    for (const page of pages) {
        const record = asRecord(page);
        writeLine(io.stdout, `${String(record.id ?? "<unknown>")}  ${String(record.name ?? "<unnamed>")}`);
    }
}

function writePageCreatedText(io: CliIO, fileId: string, page: unknown): void {
    const record = asRecord(page);
    writeLine(io.stdout, "Page created");
    writeLine(io.stdout, `fileId: ${fileId}`);
    writeLine(io.stdout, `id: ${String(record.id ?? "<unknown>")}`);
    writeLine(io.stdout, `name: ${String(record.name ?? "<unnamed>")}`);
}

function writeExportPlanText(io: CliIO, plan: ExportPagePlan): void {
    writeLine(io.stdout, "Export page plan");
    writeLine(io.stdout, `command: ${plan.command}`);
    writeLine(io.stdout, `adapter: ${plan.adapter}`);
    writeLine(io.stdout, `status: ${plan.status}`);
    writeLine(io.stdout, `exporter: ${plan.exporter.method} ${plan.exporter.endpoint}`);
    writeLine(io.stdout, `fileId: ${plan.fileId ?? "<missing>"}`);
    writeLine(io.stdout, `pageId: ${plan.pageId ?? "<missing>"}`);
    writeLine(io.stdout, `objectId: ${plan.objectId ?? "<missing>"}`);
    writeLine(io.stdout, `profileId: ${plan.profileId ?? "<resolve from user before execution>"}`);
    writeLine(io.stdout, `name: ${plan.name}`);
    writeLine(io.stdout, `exportFormat: ${plan.exportFormat}`);
    writeLine(io.stdout, `scale: ${plan.scale}`);
    writeLine(io.stdout, `suffix: ${plan.suffix || "<none>"}`);
    writeLine(io.stdout, `skipChildren: ${String(plan.skipChildren)}`);
    writeLine(io.stdout, `output: ${plan.output ?? "<exporter resource metadata>"}`);
    if (plan.requires.length > 0) {
        writeLine(io.stdout, "requires:");
        for (const requirement of plan.requires) {
            writeLine(io.stdout, `  ${requirement}`);
        }
    }
    writeLine(io.stdout, "nextActions:");
    for (const action of plan.nextActions) {
        writeLine(io.stdout, `  ${action}`);
    }
}

function asRecord(value: unknown): Record<string, unknown> {
    return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function formatStatusText(io: CliIO, statusUrl: string, data: unknown): void {
    const body = asRecord(data);
    const server = asRecord(body.server);
    const transports = asRecord(body.transports);
    const websocket = asRecord(transports.webSocket);
    const fileContexts = asRecord(body.fileContexts);

    writeLine(io.stdout, `MCP status: ${String(body.status ?? "unknown")}`);
    writeLine(io.stdout, `statusUrl: ${statusUrl}`);
    writeLine(io.stdout, `server: ${String(server.host ?? "unknown")}:${String(server.port ?? "unknown")}`);
    writeLine(io.stdout, `multiUserMode: ${String(server.multiUserMode ?? "unknown")}`);
    writeLine(io.stdout, `remoteMode: ${String(server.remoteMode ?? "unknown")}`);
    writeLine(io.stdout, `executeCodeEnabled: ${String(server.executeCodeEnabled ?? "unknown")}`);
    writeLine(io.stdout, `streamableHttpSessions: ${String(transports.streamableHttpSessions ?? "unknown")}`);
    writeLine(io.stdout, `sseSessions: ${String(transports.sseSessions ?? "unknown")}`);
    writeLine(io.stdout, `webSocketClients: ${String(websocket.connectedClients ?? "unknown")}`);
    writeLine(io.stdout, `fileContexts: ${String(fileContexts.totalContexts ?? "unknown")}`);
}

async function handleMcpStatus(args: string[], io: CliIO, env: NodeJS.ProcessEnv): Promise<number> {
    const format = parseFormat(args, io);
    if (!format) {
        return 2;
    }

    const config = getMcpConfig(args, env);
    try {
        const response = await fetch(config.statusUri, {
            headers: {
                accept: "application/json",
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }

        const data = (await response.json()) as unknown;
        if (format === "json") {
            writeJson(io.stdout, {
                status: "ok",
                source: {
                    statusUri: config.statusUri,
                },
                data,
            });
        } else {
            formatStatusText(io, config.statusUri, data);
        }
        return 0;
    } catch (cause) {
        writeError(
            io,
            format,
            "mcp_status_unreachable",
            `Unable to read MCP status from ${config.statusUri}: ${String(cause)}`,
            [
                "Start the Penpot MCP server.",
                "Use --url or PENPOT_MCP_STATUS_URI to point at a different status endpoint.",
            ],
            {
                statusUri: config.statusUri,
            }
        );
        return 2;
    }
}

function handleMcpConfig(args: string[], io: CliIO, env: NodeJS.ProcessEnv): number {
    const format = parseFormat(args, io);
    if (!format) {
        return 2;
    }

    const config = getMcpConfig(args, env);
    if (format === "json") {
        writeJson(io.stdout, {
            status: "ok",
            data: config,
        });
    } else {
        writeConfigText(io, config);
    }
    return 0;
}

async function listLogFiles(logDir: string): Promise<LogFile[]> {
    const entries = await readdir(logDir, { withFileTypes: true });
    const files = await Promise.all(
        entries
            .filter((entry) => entry.isFile() && entry.name.endsWith(".log"))
            .map(async (entry) => {
                const filePath = join(logDir, entry.name);
                const stats = await stat(filePath);
                return {
                    path: filePath,
                    name: entry.name,
                    sizeBytes: stats.size,
                    modifiedAt: stats.mtime.toISOString(),
                };
            })
    );

    return files.sort((left, right) => right.modifiedAt.localeCompare(left.modifiedAt));
}

async function followLogFile(filePath: string): Promise<number> {
    return await new Promise((resolveProcess) => {
        const child = spawn("tail", ["-f", filePath], { stdio: "inherit" });
        child.on("error", () => resolveProcess(2));
        child.on("exit", (code) => resolveProcess(code ?? 0));
    });
}

async function handleMcpLogs(args: string[], io: CliIO, env: NodeJS.ProcessEnv): Promise<number> {
    const format = parseFormat(args, io);
    if (!format) {
        return 2;
    }

    const config = getMcpConfig(args, env);
    if (!config.logDir) {
        writeError(
            io,
            format,
            "mcp_log_dir_not_configured",
            "MCP file logging is not configured.",
            ["Set PENPOT_MCP_LOG_DIR or pass --dir <path>."]
        );
        return 2;
    }

    const logDir = resolve(config.logDir);
    try {
        const files = await listLogFiles(logDir);
        if (format === "json") {
            writeJson(io.stdout, {
                status: "ok",
                data: {
                    logDir,
                    files,
                },
            });
        } else {
            writeLine(io.stdout, `MCP logDir: ${logDir}`);
            if (files.length === 0) {
                writeLine(io.stdout, "No .log files found.");
            } else {
                for (const file of files.slice(0, 10)) {
                    writeLine(io.stdout, `${file.modifiedAt} ${file.sizeBytes} ${file.path}`);
                }
            }
        }

        if (hasFlag(args, "--follow")) {
            const latest = files[0];
            if (!latest) {
                writeError(io, format, "mcp_log_file_not_found", "No MCP log file is available to follow.", [], {
                    logDir,
                });
                return 2;
            }
            return await followLogFile(latest.path);
        }

        return 0;
    } catch (cause) {
        writeError(io, format, "mcp_log_dir_unreadable", `Unable to read MCP log directory ${logDir}: ${String(cause)}`, [
            "Check PENPOT_MCP_LOG_DIR.",
            "Pass --dir <path> for a local MCP log directory.",
        ]);
        return 2;
    }
}

async function handleMcpCommand(args: string[], io: CliIO, env: NodeJS.ProcessEnv): Promise<number> {
    const [subcommand, ...rest] = args;

    if (isHelpFlag(subcommand)) {
        writeLine(io.stdout, MCP_HELP_TEXT);
        return 0;
    }

    switch (subcommand) {
        case "status":
            return await handleMcpStatus(rest, io, env);
        case "config":
            return handleMcpConfig(rest, io, env);
        case "logs":
            return await handleMcpLogs(rest, io, env);
        default:
            writeLine(io.stderr, `Unknown MCP command: ${subcommand}`);
            writeLine(io.stderr, 'Run "penpot-cli mcp --help" for usage.');
            return 2;
    }
}

async function handleDevUp(args: string[], io: CliIO, env: NodeJS.ProcessEnv): Promise<number> {
    const format = parseFormat(args, io);
    if (!format) {
        return 2;
    }

    const dryRun = hasFlag(args, "--dry-run");
    const mode = readOption(args, ["--mode"]) ?? "devenv";
    const plan = getDevPlan(args, env, dryRun);

    if (!plan.mcpEnabled) {
        writeError(
            io,
            format,
            "dev_mcp_flag_required",
            "The first dev orchestration slice only supports MCP-enabled startup.",
            ['Run "penpot-cli dev up --mcp --dry-run" to inspect the local MCP plan.']
        );
        return 2;
    }

    if (mode !== "devenv" && mode !== "host" && mode !== "hybrid") {
        writeError(io, format, "dev_mode_invalid", `Unsupported dev mode: ${mode}`, [
            "Use --mode devenv, --mode host, or --mode hybrid.",
        ]);
        return 2;
    }

    if (dryRun) {
        if (format === "json") {
            writeJson(io.stdout, {
                status: "ok",
                data: plan,
            });
        } else {
            writeDevPlanText(io, plan);
        }
        return 0;
    }

    if (mode !== "devenv") {
        writeError(io, format, "dev_mode_not_implemented", `${mode} mode startup is not implemented yet.`, [
            "Use --mode devenv for the first implementation.",
            "Use --dry-run to inspect planned host/hybrid surfaces.",
        ]);
        return 2;
    }

    if (!(await canExecute(resolve("manage.sh")))) {
        writeError(io, format, "manage_script_not_found", "Cannot execute ./manage.sh from the current directory.", [
            "Run this command from the Penpot repository root.",
        ]);
        return 2;
    }

    if (!(await commandExists("docker", env))) {
        writeError(io, format, "docker_not_found", "Docker is required for --mode devenv but was not found on PATH.", [
            "Install Docker with Compose V2.",
            "Use --dry-run to inspect the plan without starting services.",
        ]);
        return 2;
    }

    writeDevPlanText(io, plan);
    writeLine(io.stdout);
    writeLine(io.stdout, "Starting devenv dependencies with ./manage.sh start-devenv...");
    const exitCode = await runProcess("./manage.sh", ["start-devenv"]);
    if (exitCode !== 0) {
        return exitCode;
    }

    writeLine(io.stdout);
    writeLine(io.stdout, "Devenv dependencies are running.");
    writeLine(io.stdout, "Next: run ./manage.sh run-devenv and start the MCP-enabled app processes inside the devenv.");
    return 0;
}

async function handleDevCommand(args: string[], io: CliIO, env: NodeJS.ProcessEnv): Promise<number> {
    const [subcommand, ...rest] = args;

    if (isHelpFlag(subcommand)) {
        writeLine(io.stdout, DEV_HELP_TEXT);
        return 0;
    }

    switch (subcommand) {
        case "up":
            return await handleDevUp(rest, io, env);
        default:
            writeLine(io.stderr, `Unknown dev command: ${subcommand}`);
            writeLine(io.stderr, 'Run "penpot-cli dev --help" for usage.');
            return 2;
    }
}

async function handleFileList(args: string[], io: CliIO, env: NodeJS.ProcessEnv): Promise<number> {
    const format = parseFormat(args, io);
    if (!format) {
        return 2;
    }

    const projectId = readOption(args, ["--project-id", "--project"]);
    if (!projectId) {
        writeError(io, format, "project_id_required", "file list requires --project-id <id>.", [
            "Use penpot-cli mcp config to inspect local service URLs.",
            "Use MCP project.list or the Penpot UI to choose a project id.",
        ]);
        return 2;
    }

    const rpc = getRpcConfig(args, env);
    if (!rpc.token) {
        return rpcAuthenticationRequired(io, format);
    }

    try {
        const files = await rpcRequest<unknown[]>(
            "GET",
            rpc.backendUri,
            "get-project-files",
            { "project-id": projectId },
            rpc.token
        );
        writeOk(io, format, { projectId, files, adapter: "backend-rpc" }, () => writeFilesText(io, projectId, files));
        return 0;
    } catch (cause) {
        return rpcErrorResponse(io, format, "get-project-files", rpc.backendUri, cause);
    }
}

async function handleFileCreate(args: string[], io: CliIO, env: NodeJS.ProcessEnv): Promise<number> {
    const format = parseFormat(args, io);
    if (!format) {
        return 2;
    }

    const projectId = readOption(args, ["--project-id", "--project"]);
    if (!projectId) {
        writeError(io, format, "project_id_required", "file create requires --project-id <id>.", [
            "Use MCP project.list or the Penpot UI to choose a project id.",
        ]);
        return 2;
    }

    const rpc = getRpcConfig(args, env);
    if (!rpc.token) {
        return rpcAuthenticationRequired(io, format);
    }

    const name = readOption(args, ["--name"])?.trim() || "Untitled";
    const isShared = hasFlag(args, "--shared") || hasFlag(args, "--is-shared");

    try {
        const created = await rpcRequest<unknown>(
            "POST",
            rpc.backendUri,
            "create-file",
            {
                name,
                "project-id": projectId,
                "is-shared": isShared,
            },
            rpc.token
        );
        const file = summarizeFile(created, projectId, name);
        const fileId = typeof file.id === "string" ? file.id : "";
        const url = fileId ? createWorkspaceUrl(args, env, fileId) : "";
        writeOk(
            io,
            format,
            {
                file,
                url,
                adapter: "backend-rpc",
                nextActions: ["Open the workspace URL before using file-scoped MCP tools.", "file.open"],
            },
            () => writeFileCreatedText(io, file, url)
        );
        return 0;
    } catch (cause) {
        return rpcErrorResponse(io, format, "create-file", rpc.backendUri, cause);
    }
}

function handleFileOpen(args: string[], io: CliIO, env: NodeJS.ProcessEnv): number {
    const format = parseFormat(args, io);
    if (!format) {
        return 2;
    }

    const fileId = readOption(args, ["--file-id", "--file"]) ?? readFirstPositional(args);
    if (!fileId) {
        writeError(io, format, "file_id_required", "file open requires a file id.", [
            "Run penpot-cli file open <file-id>.",
        ]);
        return 2;
    }

    const url = createWorkspaceUrl(args, env, fileId);
    writeOk(
        io,
        format,
        {
            fileId,
            url,
            adapter: "browser-url",
            boundContext: false,
        },
        () => writeFileOpenText(io, url)
    );
    return 0;
}

async function handleFileCommand(args: string[], io: CliIO, env: NodeJS.ProcessEnv): Promise<number> {
    const [subcommand, ...rest] = args;

    if (isHelpFlag(subcommand)) {
        writeLine(io.stdout, FILE_HELP_TEXT);
        return 0;
    }

    switch (subcommand) {
        case "list":
            return await handleFileList(rest, io, env);
        case "create":
            return await handleFileCreate(rest, io, env);
        case "open":
            return handleFileOpen(rest, io, env);
        default:
            writeLine(io.stderr, `Unknown file command: ${subcommand}`);
            writeLine(io.stderr, 'Run "penpot-cli file --help" for usage.');
            return 2;
    }
}

async function handlePageList(args: string[], io: CliIO, env: NodeJS.ProcessEnv): Promise<number> {
    const format = parseFormat(args, io);
    if (!format) {
        return 2;
    }

    const fileId = readOption(args, ["--file-id", "--file"]);
    if (!fileId) {
        writeError(io, format, "file_id_required", "page list requires --file <file-id>.", [
            "Use penpot-cli file list first, then pass --file <file-id>.",
        ]);
        return 2;
    }

    const rpc = getRpcConfig(args, env);
    if (!rpc.token) {
        return rpcAuthenticationRequired(io, format);
    }

    try {
        const result = await rpcRequest<Record<string, unknown>>(
            "GET",
            rpc.backendUri,
            "get-file-pages",
            { id: fileId },
            rpc.token
        );
        const pages = Array.isArray(result.pages) ? result.pages : [];
        writeOk(io, format, { fileId, pages, adapter: "backend-command" }, () => writePagesText(io, fileId, pages));
        return 0;
    } catch (cause) {
        return rpcErrorResponse(io, format, "get-file-pages", rpc.backendUri, cause);
    }
}

async function handlePageCreate(args: string[], io: CliIO, env: NodeJS.ProcessEnv): Promise<number> {
    const format = parseFormat(args, io);
    if (!format) {
        return 2;
    }

    const fileId = readOption(args, ["--file-id", "--file"]);
    if (!fileId) {
        writeError(io, format, "file_id_required", "page create requires --file <file-id>.", [
            "Use penpot-cli file list first, then pass --file <file-id>.",
        ]);
        return 2;
    }

    const rpc = getRpcConfig(args, env);
    if (!rpc.token) {
        return rpcAuthenticationRequired(io, format);
    }

    const name = readOption(args, ["--name"])?.trim();
    const pageId = readOption(args, ["--page-id", "--page"]);

    try {
        const result = await rpcRequest<Record<string, unknown>>(
            "POST",
            rpc.backendUri,
            "create-file-page",
            {
                id: fileId,
                "page-id": pageId,
                name: name || undefined,
            },
            rpc.token
        );
        writeOk(
            io,
            format,
            {
                fileId,
                page: result.page,
                revn: result.revn,
                vern: result.vern,
                adapter: "backend-command",
            },
            () => writePageCreatedText(io, fileId, result.page)
        );
        return 0;
    } catch (cause) {
        return rpcErrorResponse(io, format, "create-file-page", rpc.backendUri, cause);
    }
}

async function handlePageCommand(args: string[], io: CliIO, env: NodeJS.ProcessEnv): Promise<number> {
    const [subcommand, ...rest] = args;

    if (isHelpFlag(subcommand)) {
        writeLine(io.stdout, PAGE_HELP_TEXT);
        return 0;
    }

    switch (subcommand) {
        case "list":
            return await handlePageList(rest, io, env);
        case "create":
            return await handlePageCreate(rest, io, env);
        default:
            writeLine(io.stderr, `Unknown page command: ${subcommand}`);
            writeLine(io.stderr, 'Run "penpot-cli page --help" for usage.');
            return 2;
    }
}

function handleExportPage(args: string[], io: CliIO, env: NodeJS.ProcessEnv): number {
    const format = parseFormat(args, io);
    if (!format) {
        return 2;
    }

    const plan = createExportPagePlan(args, env);
    if (!plan.fileId) {
        writeError(io, format, "file_id_required", "export page requires --file <file-id>.", [
            "Open or list files first, then pass --file <file-id>.",
        ]);
        return 2;
    }

    if (!plan.pageId) {
        writeError(io, format, "page_id_required", "export page requires --page <page-id>.", [
            "Run penpot-cli page list --file <file-id> first, then pass --page <page-id>.",
        ]);
        return 2;
    }

    if (!plan.objectId) {
        writeError(io, format, "object_id_required", "export page requires --object <object-id>.", [
            "Pass the page root frame or another exportable object id.",
            "Headless export cannot use the current live selection.",
        ]);
        return 2;
    }

    if (plan.adapter !== "exporter") {
        writeError(io, format, "export_adapter_not_supported", `Unsupported export adapter: ${plan.adapter}.`, [
            "Use the default exporter adapter for headless export planning.",
        ]);
        return 2;
    }

    const validFormats = new Set(["png", "jpeg", "svg", "pdf"]);
    if (!validFormats.has(plan.exportFormat)) {
        writeError(io, format, "export_format_invalid", `Unsupported export format: ${plan.exportFormat}.`, [
            "Use --export-format png, jpeg, svg, or pdf.",
        ]);
        return 2;
    }

    if (!Number.isFinite(plan.scale) || plan.scale <= 0 || plan.scale > 16) {
        writeError(io, format, "export_scale_invalid", "Export scale must be greater than 0 and at most 16.", [
            "Use --scale <number> greater than 0 and at most 16.",
        ]);
        return 2;
    }

    if (plan.dryRun) {
        writeOk(io, format, plan, () => writeExportPlanText(io, plan));
        return 0;
    }

    writeError(
        io,
        format,
        "export_adapter_not_available",
        "CLI exporter execution is waiting for the Phase 7 shared command runtime.",
        [
            "Use --dry-run to inspect the exporter request plan.",
            "Keep using MCP export.page with a bound live file context for real base64 exports until execution is wired.",
        ],
        {
            plan,
        }
    );
    return 2;
}

function handleExportCommand(args: string[], io: CliIO, env: NodeJS.ProcessEnv): number {
    const [subcommand, ...rest] = args;

    if (isHelpFlag(subcommand)) {
        writeLine(io.stdout, EXPORT_HELP_TEXT);
        return 0;
    }

    switch (subcommand) {
        case "page":
            return handleExportPage(rest, io, env);
        default:
            writeLine(io.stderr, `Unknown export command: ${subcommand}`);
            writeLine(io.stderr, 'Run "penpot-cli export --help" for usage.');
            return 2;
    }
}

export async function run(
    argv: string[] = process.argv.slice(2),
    io: CliIO = DEFAULT_IO,
    env: NodeJS.ProcessEnv = process.env
): Promise<number> {
    const first = argv[0];

    if (isHelpFlag(first)) {
        writeLine(io.stdout, HELP_TEXT);
        return 0;
    }

    if (isVersionFlag(first)) {
        writeLine(io.stdout, VERSION);
        return 0;
    }

    if (first === "mcp") {
        return await handleMcpCommand(argv.slice(1), io, env);
    }

    if (first === "dev") {
        return await handleDevCommand(argv.slice(1), io, env);
    }

    if (first === "file") {
        return await handleFileCommand(argv.slice(1), io, env);
    }

    if (first === "page") {
        return await handlePageCommand(argv.slice(1), io, env);
    }

    if (first === "export") {
        return handleExportCommand(argv.slice(1), io, env);
    }

    writeLine(io.stderr, `Unknown command: ${first}`);
    writeLine(io.stderr, 'Run "penpot-cli --help" for usage.');
    return 2;
}

function isMainModule(): boolean {
    const entryPoint = process.argv[1];
    return Boolean(entryPoint) && fileURLToPath(import.meta.url) === resolve(entryPoint);
}

if (isMainModule()) {
    process.exitCode = await run();
}
