#!/usr/bin/env node

import { spawn } from "node:child_process";
import { readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const VERSION = "0.1.0";
const DEFAULT_PUBLIC_URI = "http://localhost:3449";

const HELP_TEXT = `penpot-cli ${VERSION}

Usage:
  penpot-cli --help
  penpot-cli --version
  penpot-cli mcp status [--url <status-url>] [--format text|json]
  penpot-cli mcp config [--format text|json]
  penpot-cli mcp logs [--dir <path>] [--follow] [--format text|json]
  penpot-cli dev up --mcp

Planned automation commands:
  penpot-cli file list
  penpot-cli file create --name <name>
  penpot-cli file open <file-id>
  penpot-cli export page --file <file-id> --page <page-id>`;

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

type Format = "text" | "json";

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

function writeConfigText(io: CliIO, config: McpConfig): void {
    writeLine(io.stdout, "MCP config");
    writeLine(io.stdout, `public: ${config.publicUri}`);
    writeLine(io.stdout, `stream: ${config.streamUri}`);
    writeLine(io.stdout, `sse: ${config.sseUri}`);
    writeLine(io.stdout, `websocket: ${config.websocketUri}`);
    writeLine(io.stdout, `status: ${config.statusUri}`);
    writeLine(io.stdout, `logDir: ${config.logDir ?? "<not configured>"}`);
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

function isPlannedNonMcpCommand(value: string | undefined): boolean {
    return value === "dev" || value === "file" || value === "export";
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

    if (isPlannedNonMcpCommand(first)) {
        writeLine(
            io.stderr,
            `Command "${argv.join(" ")}" is planned but not implemented yet. Run "penpot-cli --help" for the current scaffold.`
        );
        return 2;
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
