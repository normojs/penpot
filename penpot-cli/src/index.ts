#!/usr/bin/env node

import { spawn } from "node:child_process";
import { constants } from "node:fs";
import { access, mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { delimiter, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
    AdapterSelectionReasonCodes,
    CommandDescriptors,
    CommandErrorCodes,
    createAdapterSelectionError,
    createCommandRequestEnvelope,
    createCommandResultEnvelope,
    getAdapterSelectionReason,
    selectCommandAdapter,
} from "@penpot/command-runtime";
import type {
    CommandAdapterSelection,
    CommandDescriptor,
    CommandRequestEnvelope,
    CommandResultEnvelope,
    CreateCommandRequestEnvelopeOptions,
    CreateCommandResultEnvelopeOptions,
    RequestedCommandAdapter,
} from "@penpot/command-runtime";

const VERSION = "0.1.0";
const DEFAULT_PUBLIC_URI = "http://localhost:3449";
const DEFAULT_LOCAL_MCP_PUBLIC_URI = "http://localhost:4401";
const DEFAULT_LOCAL_MCP_WEBSOCKET_URI = "ws://localhost:4402";
const DEFAULT_EXPORTER_URI = "http://localhost:6061";

const HELP_TEXT = `penpot-cli ${VERSION}

Usage:
  penpot-cli --help
  penpot-cli --version
  penpot-cli mcp status [--url <status-url>] [--format text|json]
  penpot-cli mcp config [--mode builtin|custom|local] [--format text|json]
  penpot-cli mcp logs [--dir <path>] [--follow] [--format text|json]
  penpot-cli dev up --mcp [--mode devenv] [--dry-run] [--format text|json]
  penpot-cli file list --project-id <id> [--format text|json]
  penpot-cli file create --project-id <id> [--name <name>] [--format text|json]
  penpot-cli file open <file-id> [--team-id <id>] [--page-id <id>] [--format text|json]
  penpot-cli page list --file <file-id> [--adapter auto|backend-command] [--format text|json]
  penpot-cli page create --file <file-id> [--name <name>] [--adapter auto|backend-command] [--format text|json]
  penpot-cli page rename --file <file-id> --page <page-id> --name <name> [--adapter auto|backend-command] [--format text|json]
  penpot-cli shape create-frame --file <file-id> --page <page-id> --x <n> --y <n> --width <n> --height <n> [--format text|json]
  penpot-cli shape create-rect --file <file-id> --page <page-id> --parent <frame-id> --x <n> --y <n> --width <n> --height <n> [--format text|json]
  penpot-cli shape create-text --file <file-id> --page <page-id> --parent <frame-id> --x <n> --y <n> --width <n> --height <n> --content <text> [--format text|json]
  penpot-cli shape update --file <file-id> --shape <shape-id> [--page <page-id>] [--parent <frame-id>] [--x <n>] [--y <n>] [--width <n>] [--height <n>] [--fill <hex>] [--layout none|flex] [--format text|json]
  penpot-cli shape delete --file <file-id> --shape <shape-id> [--page <page-id>] [--format text|json]
  penpot-cli export page --file <file-id> --page <page-id> --object <object-id> [--adapter auto|exporter] [--output <path>] [--dry-run] [--format text|json]`;

const MCP_HELP_TEXT = `penpot-cli mcp

Usage:
  penpot-cli mcp status [--url <status-url>] [--format text|json]
  penpot-cli mcp config [--mode builtin|custom|local] [--format text|json]
  penpot-cli mcp logs [--dir <path>] [--follow] [--format text|json]

Environment:
  PENPOT_MCP_PUBLIC_URI      Public Penpot base URL, default http://localhost:3449
  PENPOT_MCP_MODE            MCP config mode: builtin, custom, or local
  PENPOT_MCP_AUTO_CONNECT    Whether saved profile config should auto-connect, default true
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
  penpot-cli page list --file <file-id> [--adapter auto|backend-command] [--backend-uri <uri>] [--token <token>] [--format text|json]
  penpot-cli page create --file <file-id> [--name <name>] [--page-id <id>] [--adapter auto|backend-command] [--backend-uri <uri>] [--token <token>] [--format text|json]
  penpot-cli page rename --file <file-id> --page <page-id> --name <name> [--adapter auto|backend-command] [--backend-uri <uri>] [--token <token>] [--format text|json]

Environment:
  PENPOT_BACKEND_URI       Backend RPC base URI, default http://localhost:6060
  PENPOT_PUBLIC_URI        Public Penpot base URI used as backend fallback
  PENPOT_CLI_TOKEN         Penpot access token for backend RPC
  PENPOT_MCP_USER_TOKEN    Penpot MCP user token fallback for backend RPC
  PENPOT_ACCESS_TOKEN      Generic Penpot access token fallback`;

const SHAPE_HELP_TEXT = `penpot-cli shape

Usage:
  penpot-cli shape create-frame --file <file-id> --page <page-id> --x <n> --y <n> --width <n> --height <n> [--name <name>] [--shape-id <id>] [--fill <hex>] [--format text|json]
  penpot-cli shape create-rect --file <file-id> --page <page-id> --parent <frame-id> --x <n> --y <n> --width <n> --height <n> [--name <name>] [--shape-id <id>] [--fill <hex>] [--border-radius <n>] [--format text|json]
  penpot-cli shape create-text --file <file-id> --page <page-id> --parent <frame-id> --x <n> --y <n> --width <n> --height <n> --content <text> [--name <name>] [--shape-id <id>] [--font-size <n>] [--fill <hex>] [--format text|json]
  penpot-cli shape update --file <file-id> --shape <shape-id> [--page <page-id>] [--parent <frame-id>] [--index <n>] [--name <name>] [--x <n>] [--y <n>] [--width <n>] [--height <n>] [--fill <hex>] [--stroke <hex>] [--border-radius <n>] [--r1 <n>] [--r2 <n>] [--r3 <n>] [--r4 <n>] [--content <text>] [--font-size <n>] [--layout none|flex] [--layout-direction row|column] [--layout-wrap wrap|nowrap] [--layout-align-items start|center|end|stretch] [--layout-justify-content start|center|end|space-between|space-around|space-evenly|stretch] [--layout-gap <n>] [--layout-row-gap <n>] [--layout-column-gap <n>] [--layout-padding <n>] [--format text|json]
  penpot-cli shape delete --file <file-id> --shape <shape-id> [--page <page-id>] [--format text|json]

Notes:
  Repeat --fill and --stroke to send backend-command fill/stroke stacks.
  Repeated --fill-opacity, --stroke-opacity, --stroke-width, --stroke-style, and --stroke-alignment values align by index.
  Backend-command layout updates support --layout none and --layout flex. Grid layout remains live-workspace only.

Environment:
  PENPOT_BACKEND_URI       Backend RPC base URI, default http://localhost:6060
  PENPOT_PUBLIC_URI        Public Penpot base URI used as backend fallback
  PENPOT_CLI_TOKEN         Penpot access token for backend RPC
  PENPOT_MCP_USER_TOKEN    Penpot MCP user token fallback for backend RPC
  PENPOT_ACCESS_TOKEN      Generic Penpot access token fallback`;

const EXPORT_HELP_TEXT = `penpot-cli export

Usage:
  penpot-cli export page --file <file-id> --page <page-id> --object <object-id> [--export-format png|jpeg|svg|pdf] [--scale <n>] [--output <path>] [--exporter-uri <uri>] [--backend-uri <uri>] [--token <token>] [--adapter auto|exporter] [--dry-run] [--format text|json]

Current adapters:
  exporter   Phase 7 headless adapter backed by the Penpot exporter HTTP service.

Environment:
  PENPOT_EXPORTER_URI      Exporter HTTP URI, default http://localhost:6061
  PENPOT_BACKEND_URI       Backend RPC base URI used to resolve profile id
  PENPOT_PROFILE_ID        Optional profile id for the direct exporter request
  PENPOT_CLI_TOKEN         Penpot auth-token/session token for exporter execution
  PENPOT_MCP_USER_TOKEN    Penpot MCP user token fallback for exporter execution
  PENPOT_ACCESS_TOKEN      Generic Penpot access token fallback`;

type Format = "text" | "json";
type RpcParamValue =
    | string
    | number
    | boolean
    | string[]
    | number[]
    | boolean[]
    | Record<string, unknown>
    | Record<string, unknown>[]
    | null
    | undefined;
type RpcParams = Record<string, RpcParamValue>;

interface Writable {
    write(chunk: string): boolean;
}

interface CliIO {
    stdout: Writable;
    stderr: Writable;
}

type McpMode = "builtin" | "custom" | "local";

interface McpProfileConfig {
    mode: McpMode;
    "auto-connect": boolean;
    "public-uri": string;
    "stream-uri": string;
    "sse-uri": string;
    "websocket-uri": string;
    "status-uri": string;
}

interface McpConfig {
    mode: McpMode;
    autoConnect: boolean;
    publicUri: string;
    streamUri: string;
    sseUri: string;
    websocketUri: string;
    statusUri: string;
    logDir: string | null;
    profileProps: {
        "mcp-config": McpProfileConfig;
    };
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
    adapter: string | null;
    adapterSelection: CommandAdapterSelection;
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

interface ExportPageResult {
    command: string;
    adapter: string | null;
    adapterSelection: CommandAdapterSelection;
    fileId: string;
    pageId: string;
    objectId: string;
    profileId: string;
    exportFormat: string;
    scale: number;
    output: string | null;
    exporter: ExportPagePlan["exporter"];
    resource: Record<string, unknown>;
    downloadedResource?: {
        path: string;
        bytes: number;
        contentType: string | null;
    };
}

type ShapeCreateKind = "frame" | "rect" | "text";
type ShapeLayoutType = "none" | "flex";
type ShapeLayoutDirection = "row" | "row-reverse" | "column" | "column-reverse";
type ShapeLayoutWrap = "wrap" | "nowrap";
type ShapeLayoutAlignItems = "start" | "end" | "center" | "stretch";
type ShapeLayoutJustifyContent =
    | "start"
    | "center"
    | "end"
    | "space-between"
    | "space-around"
    | "space-evenly"
    | "stretch";

interface ShapeLayoutParams {
    type: ShapeLayoutType;
    direction?: ShapeLayoutDirection;
    wrap?: ShapeLayoutWrap;
    alignItems?: ShapeLayoutAlignItems;
    justifyContent?: ShapeLayoutJustifyContent;
    rowGap?: number;
    columnGap?: number;
    padding?: number;
}

interface ShapeCreateParams {
    fileId: string;
    pageId: string;
    type: ShapeCreateKind;
    x: number;
    y: number;
    width: number;
    height: number;
    shapeId?: string;
    parentId?: string;
    name?: string;
    content?: string;
    fill?: Record<string, unknown>;
    stroke?: Record<string, unknown>;
    borderRadius?: number;
    fontSize?: number;
}

interface ShapeUpdateParams {
    fileId: string;
    shapeId: string;
    pageId?: string;
    parentId?: string;
    index?: number;
    name?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    content?: string;
    fill?: Record<string, unknown>;
    fills?: Record<string, unknown>[];
    stroke?: Record<string, unknown>;
    strokes?: Record<string, unknown>[];
    borderRadius?: number;
    r1?: number;
    r2?: number;
    r3?: number;
    r4?: number;
    fontSize?: number;
    layout?: ShapeLayoutParams;
}

interface ShapeDeleteParams {
    fileId: string;
    shapeId: string;
    pageId?: string;
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

function readOptions(args: string[], names: string[]): string[] {
    const values: string[] = [];
    for (let index = 0; index < args.length; index++) {
        const arg = args[index];
        for (const name of names) {
            if (arg === name) {
                const value = args[index + 1];
                if (value && !value.startsWith("--")) {
                    values.push(value);
                }
                continue;
            }
            const prefix = `${name}=`;
            if (arg.startsWith(prefix)) {
                values.push(arg.slice(prefix.length));
            }
        }
    }
    return values;
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

function readNumberOption(args: string[], names: string[]): number | undefined {
    const value = readOption(args, names);
    if (value === undefined) {
        return undefined;
    }
    const number = Number(value);
    return Number.isFinite(number) ? number : Number.NaN;
}

function readNumberOptions(args: string[], names: string[]): number[] {
    return readOptions(args, names).map((value) => {
        const number = Number(value);
        return Number.isFinite(number) ? number : Number.NaN;
    });
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

function normalizeMcpMode(value: string | undefined): McpMode {
    switch (value) {
        case "built-in":
        case "builtin":
            return "builtin";
        case "custom":
        case "local":
            return value;
        default:
            return "builtin";
    }
}

function readBooleanConfig(value: string | undefined, fallback: boolean): boolean {
    if (value === undefined) {
        return fallback;
    }
    switch (value.trim().toLowerCase()) {
        case "0":
        case "false":
        case "no":
        case "off":
            return false;
        case "1":
        case "true":
        case "yes":
        case "on":
            return true;
        default:
            return fallback;
    }
}

function getMcpConfig(args: string[], env: NodeJS.ProcessEnv, options: { allowModeAlias?: boolean } = {}): McpConfig {
    const modeOptionNames = options.allowModeAlias ? ["--mode", "--mcp-mode"] : ["--mcp-mode"];
    const mode = normalizeMcpMode(readOption(args, modeOptionNames) ?? env.PENPOT_MCP_MODE);
    const autoConnect = readBooleanConfig(
        readOption(args, ["--auto-connect"]) ?? env.PENPOT_MCP_AUTO_CONNECT,
        true
    );
    const defaultPublicUri = mode === "local" ? DEFAULT_LOCAL_MCP_PUBLIC_URI : DEFAULT_PUBLIC_URI;
    const publicUri = trimTrailingSlash(
        readOption(args, ["--public-uri"]) ?? env.PENPOT_MCP_PUBLIC_URI ?? defaultPublicUri
    );
    const streamUri =
        readOption(args, ["--stream-uri"]) ??
        env.PENPOT_MCP_STREAM_URI ??
        appendPath(publicUri, mode === "local" ? "/mcp" : "/mcp/stream");
    const sseUri =
        readOption(args, ["--sse-uri"]) ??
        env.PENPOT_MCP_SSE_URI ??
        appendPath(publicUri, mode === "local" ? "/sse" : "/mcp/sse");
    const websocketUri =
        readOption(args, ["--websocket-uri", "--ws-uri"]) ??
        env.PENPOT_MCP_WEBSOCKET_URI ??
        (mode === "local" ? DEFAULT_LOCAL_MCP_WEBSOCKET_URI : appendPath(publicUri, "/mcp/ws"));
    const statusUri =
        readOption(args, ["--status-uri", "--url"]) ??
        env.PENPOT_MCP_STATUS_URI ??
        appendPath(publicUri, mode === "local" ? "/status" : "/mcp/status");
    const logDir = readOption(args, ["--dir", "--log-dir"]) ?? env.PENPOT_MCP_LOG_DIR ?? null;

    return {
        mode,
        autoConnect,
        publicUri,
        streamUri,
        sseUri,
        websocketUri,
        statusUri,
        logDir,
        profileProps: {
            "mcp-config": {
                mode,
                "auto-connect": autoConnect,
                "public-uri": publicUri,
                "stream-uri": streamUri,
                "sse-uri": sseUri,
                "websocket-uri": websocketUri,
                "status-uri": statusUri,
            },
        },
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

function readRequestedAdapter(args: string[]): RequestedCommandAdapter | string {
    const adapter = readOption(args, ["--adapter"]);
    switch (adapter) {
        case undefined:
            return "auto";
        case "auto":
        case "backend-rpc":
        case "backend-command":
        case "plugin-live":
        case "exporter":
        case "browser-url":
        case "local-fs":
            return adapter;
        default:
            return adapter;
    }
}

function selectCliBackendCommandAdapter(command: string, args: string[]): CommandAdapterSelection {
    return selectCommandAdapter({
        command,
        requestedAdapter: readRequestedAdapter(args),
        candidates: [
            { kind: "backend-command", available: true, priority: 10 },
            {
                kind: "plugin-live",
                available: false,
                priority: 50,
                reason: getAdapterSelectionReason(AdapterSelectionReasonCodes.CLI_PLUGIN_LIVE_UNSUPPORTED),
            },
        ],
    });
}

function selectCliExporterAdapter(args: string[]): CommandAdapterSelection {
    return selectCommandAdapter({
        command: CommandDescriptors.EXPORT_PAGE.id,
        requestedAdapter: readRequestedAdapter(args),
        candidates: [
            { kind: "exporter", available: true, priority: 20 },
            {
                kind: "plugin-live",
                available: false,
                priority: 50,
                reason: getAdapterSelectionReason(AdapterSelectionReasonCodes.CLI_EXPORT_PLUGIN_LIVE_UNSUPPORTED),
            },
        ],
    });
}

function selectCliShapeAdapter(command: string, args: string[]): CommandAdapterSelection {
    return selectCommandAdapter({
        command,
        requestedAdapter: readRequestedAdapter(args),
        candidates: [
            { kind: "backend-command", available: true, priority: 10 },
            {
                kind: "plugin-live",
                available: false,
                priority: 50,
                reason: getAdapterSelectionReason(AdapterSelectionReasonCodes.CLI_SHAPE_PLUGIN_LIVE_UNSUPPORTED),
            },
        ],
    });
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
    const adapterSelection = selectCliExporterAdapter(args);
    const requires = [
        fileId ? null : "fileId",
        pageId ? null : "pageId",
        objectId ? null : "objectId",
        profileId ? null : "profileId",
    ].filter((value): value is string => typeof value === "string");

    return {
        command: CommandDescriptors.EXPORT_PAGE.id,
        adapter: adapterSelection.selected,
        adapterSelection,
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
            "Provide a profile id directly or let execution resolve it from the authenticated user token.",
            "Run without --dry-run to call the exporter; pass --output <path> to download the resource bytes.",
        ],
        diagnostics: {
            transitKeywordFields: ["cmd", "exports[].type"],
            authCookie: "auth-token",
            outputMode: "exporter-resource-upload",
            profileResolution: "profile-id option, PENPOT_PROFILE_ID, or backend get-profile with an auth-token/session token",
        },
    };
}

function createSolidFill(args: string[]): Record<string, unknown> | undefined {
    const color = readOption(args, ["--fill", "--fill-color"]);
    if (!color) {
        return undefined;
    }
    const opacity = readNumberOption(args, ["--fill-opacity"]);
    return {
        color,
        ...(opacity !== undefined ? { opacity } : {}),
    };
}

function createSolidFills(args: string[]): Record<string, unknown>[] | undefined {
    const colors = readOptions(args, ["--fill", "--fill-color"]);
    if (colors.length < 2) {
        return undefined;
    }
    const opacities = readNumberOptions(args, ["--fill-opacity"]);
    return colors.map((color, index) => ({
        color,
        ...(opacities[index] !== undefined ? { opacity: opacities[index] } : {}),
    }));
}

function createSolidStroke(args: string[]): Record<string, unknown> | undefined {
    const color = readOption(args, ["--stroke", "--stroke-color"]);
    if (!color) {
        return undefined;
    }
    const opacity = readNumberOption(args, ["--stroke-opacity"]);
    const width = readNumberOption(args, ["--stroke-width"]);
    const style = readOption(args, ["--stroke-style"]);
    const alignment = readOption(args, ["--stroke-alignment"]);
    return {
        color,
        ...(opacity !== undefined ? { opacity } : {}),
        ...(width !== undefined ? { width } : {}),
        ...(style ? { style } : {}),
        ...(alignment ? { alignment } : {}),
    };
}

function createSolidStrokes(args: string[]): Record<string, unknown>[] | undefined {
    const colors = readOptions(args, ["--stroke", "--stroke-color"]);
    if (colors.length < 2) {
        return undefined;
    }
    const opacities = readNumberOptions(args, ["--stroke-opacity"]);
    const widths = readNumberOptions(args, ["--stroke-width"]);
    const styles = readOptions(args, ["--stroke-style"]);
    const alignments = readOptions(args, ["--stroke-alignment"]);
    return colors.map((color, index) => ({
        color,
        ...(opacities[index] !== undefined ? { opacity: opacities[index] } : {}),
        ...(widths[index] !== undefined ? { width: widths[index] } : {}),
        ...(styles[index] ? { style: styles[index] } : {}),
        ...(alignments[index] ? { alignment: alignments[index] } : {}),
    }));
}

function readEnumOption<T extends string>(
    args: string[],
    names: string[],
    allowed: readonly T[],
    io: CliIO,
    format: Format,
    errorName: string
): T | null | undefined {
    const value = readOption(args, names);
    if (!value) {
        return undefined;
    }
    if ((allowed as readonly string[]).includes(value)) {
        return value as T;
    }
    writeError(io, format, "shape_layout_option_invalid", `Invalid ${errorName} value: ${value}.`, [
        `Expected one of: ${allowed.join(", ")}.`,
    ]);
    return null;
}

function validateLayoutNumber(
    value: number | undefined,
    name: string,
    io: CliIO,
    format: Format
): number | null | undefined {
    if (value === undefined) {
        return undefined;
    }
    if (!Number.isFinite(value) || value < 0 || value > 10000) {
        writeError(io, format, "shape_numeric_option_invalid", `Invalid numeric value for ${name}.`, [
            "Pass a finite layout value from 0 to 10000.",
        ]);
        return null;
    }
    return value;
}

function parseShapeLayoutParams(args: string[], io: CliIO, format: Format): ShapeLayoutParams | null | undefined {
    const layoutOptionNames = [
        "--layout",
        "--layout-type",
        "--layout-direction",
        "--layout-wrap",
        "--layout-align-items",
        "--layout-justify-content",
        "--layout-gap",
        "--layout-row-gap",
        "--layout-column-gap",
        "--layout-padding",
    ];
    const hasLayoutOption = layoutOptionNames.some((name) => readOption(args, [name]) !== undefined);
    if (!hasLayoutOption) {
        return undefined;
    }

    const type = readEnumOption(args, ["--layout", "--layout-type"], ["none", "flex"], io, format, "--layout");
    if (type === null) {
        return null;
    }
    if (!type) {
        writeError(io, format, "shape_layout_type_required", "shape update layout options require --layout <type>.", [
            "Pass --layout none or --layout flex.",
        ]);
        return null;
    }

    const direction = readEnumOption(
        args,
        ["--layout-direction"],
        ["row", "row-reverse", "column", "column-reverse"],
        io,
        format,
        "--layout-direction"
    );
    const wrap = readEnumOption(args, ["--layout-wrap"], ["wrap", "nowrap"], io, format, "--layout-wrap");
    const alignItems = readEnumOption(
        args,
        ["--layout-align-items"],
        ["start", "end", "center", "stretch"],
        io,
        format,
        "--layout-align-items"
    );
    const justifyContent = readEnumOption(
        args,
        ["--layout-justify-content"],
        ["start", "center", "end", "space-between", "space-around", "space-evenly", "stretch"],
        io,
        format,
        "--layout-justify-content"
    );

    if (direction === null || wrap === null || alignItems === null || justifyContent === null) {
        return null;
    }

    const gap = validateLayoutNumber(readNumberOption(args, ["--layout-gap"]), "--layout-gap", io, format);
    const rowGap = validateLayoutNumber(readNumberOption(args, ["--layout-row-gap"]), "--layout-row-gap", io, format);
    const columnGap = validateLayoutNumber(
        readNumberOption(args, ["--layout-column-gap"]),
        "--layout-column-gap",
        io,
        format
    );
    const padding = validateLayoutNumber(readNumberOption(args, ["--layout-padding"]), "--layout-padding", io, format);

    if (gap === null || rowGap === null || columnGap === null || padding === null) {
        return null;
    }

    return {
        type,
        ...(direction ? { direction } : {}),
        ...(wrap ? { wrap } : {}),
        ...(alignItems ? { alignItems } : {}),
        ...(justifyContent ? { justifyContent } : {}),
        ...(rowGap !== undefined || gap !== undefined ? { rowGap: rowGap ?? gap } : {}),
        ...(columnGap !== undefined || gap !== undefined ? { columnGap: columnGap ?? gap } : {}),
        ...(padding !== undefined ? { padding } : {}),
    };
}

function toRpcShapeLayout(layout: ShapeLayoutParams | undefined): Record<string, unknown> | undefined {
    if (!layout) {
        return undefined;
    }
    return {
        type: layout.type,
        ...(layout.direction ? { direction: layout.direction } : {}),
        ...(layout.wrap ? { wrap: layout.wrap } : {}),
        ...(layout.alignItems ? { "align-items": layout.alignItems } : {}),
        ...(layout.justifyContent ? { "justify-content": layout.justifyContent } : {}),
        ...(layout.rowGap !== undefined ? { "row-gap": layout.rowGap } : {}),
        ...(layout.columnGap !== undefined ? { "column-gap": layout.columnGap } : {}),
        ...(layout.padding !== undefined ? { padding: layout.padding } : {}),
    };
}

function parseShapeCreateParams(kind: ShapeCreateKind, args: string[], io: CliIO, format: Format): ShapeCreateParams | null {
    const fileId = readOption(args, ["--file", "--file-id"]);
    if (!fileId) {
        writeError(io, format, "file_id_required", `shape create-${kind} requires --file <file-id>.`, [
            "Use penpot-cli file list first, then pass --file <file-id>.",
        ]);
        return null;
    }

    const pageId = readOption(args, ["--page", "--page-id"]);
    if (!pageId) {
        writeError(io, format, "page_id_required", `shape create-${kind} requires --page <page-id>.`, [
            "Use penpot-cli page list --file <file-id> first, then pass --page <page-id>.",
        ]);
        return null;
    }

    const requiredNumbers = {
        x: readNumberOption(args, ["--x"]),
        y: readNumberOption(args, ["--y"]),
        width: readNumberOption(args, ["--width", "--w"]),
        height: readNumberOption(args, ["--height", "--h"]),
    };

    for (const [name, value] of Object.entries(requiredNumbers)) {
        if (value === undefined) {
            writeError(io, format, "shape_numeric_option_required", `shape create-${kind} requires --${name} <n>.`, [
                "Pass numeric x, y, width, and height values.",
            ]);
            return null;
        }
        if (!Number.isFinite(value)) {
            writeError(io, format, "shape_numeric_option_invalid", `Invalid numeric value for --${name}.`, [
                "Pass finite numeric x, y, width, and height values.",
            ]);
            return null;
        }
    }

    const content = readOption(args, ["--content", "--text"]);
    if (kind === "text" && !content) {
        writeError(io, format, "shape_content_required", "shape create-text requires --content <text>.", [
            "Pass non-empty text content.",
        ]);
        return null;
    }

    const borderRadius = readNumberOption(args, ["--border-radius", "--radius"]);
    const fontSize = readNumberOption(args, ["--font-size"]);
    for (const [name, value] of Object.entries({ borderRadius, fontSize })) {
        if (value !== undefined && !Number.isFinite(value)) {
            writeError(io, format, "shape_numeric_option_invalid", `Invalid numeric value for ${name}.`, [
                "Pass finite numeric optional shape values.",
            ]);
            return null;
        }
    }

    return {
        fileId,
        pageId,
        type: kind,
        x: requiredNumbers.x as number,
        y: requiredNumbers.y as number,
        width: requiredNumbers.width as number,
        height: requiredNumbers.height as number,
        shapeId: readOption(args, ["--shape-id", "--id"]),
        parentId: readOption(args, ["--parent", "--parent-id", "--frame", "--frame-id"]),
        name: readOption(args, ["--name"])?.trim() || undefined,
        content,
        fill: createSolidFill(args),
        stroke: createSolidStroke(args),
        borderRadius,
        fontSize,
    };
}

function requireShapeFileId(args: string[], io: CliIO, format: Format, command: string): string | null {
    const fileId = readOption(args, ["--file", "--file-id"]);
    if (!fileId) {
        writeError(io, format, "file_id_required", `${command} requires --file <file-id>.`, [
            "Use penpot-cli file list first, then pass --file <file-id>.",
        ]);
        return null;
    }
    return fileId;
}

function requireShapeId(args: string[], io: CliIO, format: Format, command: string): string | null {
    const shapeId = readOption(args, ["--shape", "--shape-id", "--id"]);
    if (!shapeId) {
        writeError(io, format, "shape_id_required", `${command} requires --shape <shape-id>.`, [
            "Use shape create output, MCP output, or a file inspection flow to choose a shape id.",
        ]);
        return null;
    }
    return shapeId;
}

function validateOptionalShapeNumbers(args: string[], io: CliIO, format: Format): Record<string, number | undefined> | null {
    const values = {
        x: readNumberOption(args, ["--x"]),
        y: readNumberOption(args, ["--y"]),
        width: readNumberOption(args, ["--width", "--w"]),
        height: readNumberOption(args, ["--height", "--h"]),
        borderRadius: readNumberOption(args, ["--border-radius", "--radius"]),
        r1: readNumberOption(args, ["--r1"]),
        r2: readNumberOption(args, ["--r2"]),
        r3: readNumberOption(args, ["--r3"]),
        r4: readNumberOption(args, ["--r4"]),
        fontSize: readNumberOption(args, ["--font-size"]),
        index: readNumberOption(args, ["--index"]),
    };

    for (const [name, value] of Object.entries(values)) {
        if (value !== undefined && !Number.isFinite(value)) {
            writeError(io, format, "shape_numeric_option_invalid", `Invalid numeric value for ${name}.`, [
                "Pass finite numeric optional shape values.",
            ]);
            return null;
        }
    }

    if (values.index !== undefined && (!Number.isInteger(values.index) || values.index < 0)) {
        writeError(io, format, "shape_numeric_option_invalid", "Invalid numeric value for index.", [
            "Pass a non-negative integer index.",
        ]);
        return null;
    }

    const repeatedValues = {
        fillOpacity: readNumberOptions(args, ["--fill-opacity"]),
        strokeOpacity: readNumberOptions(args, ["--stroke-opacity"]),
        strokeWidth: readNumberOptions(args, ["--stroke-width"]),
    };
    for (const [name, numbers] of Object.entries(repeatedValues)) {
        if (numbers.some((value) => !Number.isFinite(value))) {
            writeError(io, format, "shape_numeric_option_invalid", `Invalid numeric value for ${name}.`, [
                "Pass finite numeric repeated style values.",
            ]);
            return null;
        }
    }

    return values;
}

function hasShapeUpdateField(params: ShapeUpdateParams): boolean {
    return [
        params.name,
        params.x,
        params.y,
        params.width,
        params.height,
        params.content,
        params.parentId,
        params.index,
        params.fill,
        params.fills,
        params.stroke,
        params.strokes,
        params.borderRadius,
        params.r1,
        params.r2,
        params.r3,
        params.r4,
        params.fontSize,
        params.layout,
    ].some((value) => value !== undefined);
}

function parseShapeUpdateParams(args: string[], io: CliIO, format: Format): ShapeUpdateParams | null {
    const fileId = requireShapeFileId(args, io, format, "shape update");
    if (!fileId) {
        return null;
    }

    const shapeId = requireShapeId(args, io, format, "shape update");
    if (!shapeId) {
        return null;
    }

    const numbers = validateOptionalShapeNumbers(args, io, format);
    if (!numbers) {
        return null;
    }

    const layout = parseShapeLayoutParams(args, io, format);
    if (layout === null) {
        return null;
    }

    const params: ShapeUpdateParams = {
        fileId,
        shapeId,
        pageId: readOption(args, ["--page", "--page-id"]),
        parentId: readOption(args, ["--parent", "--parent-id", "--frame", "--frame-id"]),
        index: numbers.index,
        name: readOption(args, ["--name"])?.trim() || undefined,
        x: numbers.x,
        y: numbers.y,
        width: numbers.width,
        height: numbers.height,
        content: readOption(args, ["--content", "--text"]),
        fill: createSolidFill(args),
        fills: createSolidFills(args),
        stroke: createSolidStroke(args),
        strokes: createSolidStrokes(args),
        borderRadius: numbers.borderRadius,
        r1: numbers.r1,
        r2: numbers.r2,
        r3: numbers.r3,
        r4: numbers.r4,
        fontSize: numbers.fontSize,
        layout,
    };

    if (params.index !== undefined && !params.parentId) {
        writeError(io, format, "shape_parent_id_required", "shape update requires --parent when --index is provided.", [
            "Pass --parent <frame-id> together with --index <n>.",
        ]);
        return null;
    }

    if (!hasShapeUpdateField(params)) {
        writeError(io, format, "shape_update_empty", "shape update requires at least one update option.", [
            "Pass --name, geometry, parent, fill, stroke, corner radius, content, font size, or layout.",
        ]);
        return null;
    }

    return params;
}

function parseShapeDeleteParams(args: string[], io: CliIO, format: Format): ShapeDeleteParams | null {
    const fileId = requireShapeFileId(args, io, format, "shape delete");
    if (!fileId) {
        return null;
    }

    const shapeId = requireShapeId(args, io, format, "shape delete");
    if (!shapeId) {
        return null;
    }

    return {
        fileId,
        shapeId,
        pageId: readOption(args, ["--page", "--page-id"]),
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

function adapterSelectionFailure(io: CliIO, format: Format, selection: CommandAdapterSelection): number {
    const error = createAdapterSelectionError(selection, {
        actions: [
            "Use --adapter auto to let penpot-cli choose the first available adapter.",
            "Inspect adapterSelection in JSON output for available candidates and fallback reasons.",
        ],
    });
    writeError(io, format, error.code, error.message, error.actions, error.data);
    return 2;
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

function createCliRequest<TInput = unknown>(
    command: string | CommandDescriptor,
    options: CreateCommandRequestEnvelopeOptions<TInput> = {}
): CommandRequestEnvelope<TInput> {
    return createCommandRequestEnvelope(command, { ...options, transport: "cli" });
}

function createCliResult<TData>(
    requestEnvelope: CommandRequestEnvelope,
    data: TData,
    options: CreateCommandResultEnvelopeOptions = {}
): CommandResultEnvelope<TData> {
    return createCommandResultEnvelope(requestEnvelope, data, { ...options, transport: "cli" });
}

function writeOkEnvelope<TData>(
    io: CliIO,
    format: Format,
    envelope: CommandResultEnvelope<TData>,
    textWriter: () => void
): void {
    writeOk(io, format, envelope.data, textWriter);
}

function rpcAuthenticationRequired(io: CliIO, format: Format): number {
    writeError(
        io,
        format,
        CommandErrorCodes.AUTHENTICATION_REQUIRED,
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

const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

function isUuidString(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function encodeTransitKeyword(value: string): string {
    return `~:${value}`;
}

function encodeTransitUuid(value: string): string {
    return `~u${value}`;
}

function decodeTransitString(value: string): string {
    if (value.startsWith("~~")) {
        return value.slice(1);
    }

    if (value.startsWith("~:")) {
        return value.slice(2);
    }

    if (value.startsWith("~u") && isUuidString(value.slice(2))) {
        return value.slice(2);
    }

    return value;
}

function decodeTransitKey(value: unknown): string {
    const decoded = decodeTransitValue(value);
    return typeof decoded === "string" ? decoded : JSON.stringify(decoded);
}

function decodeTransitValue(value: unknown): unknown {
    if (typeof value === "string") {
        return decodeTransitString(value);
    }

    if (Array.isArray(value)) {
        if (value[0] === "^ " && value.length % 2 === 1) {
            const decoded: Record<string, unknown> = {};
            for (let index = 1; index < value.length; index += 2) {
                decoded[decodeTransitKey(value[index])] = decodeTransitValue(value[index + 1]);
            }
            return decoded;
        }

        if (value.length === 2 && value[0] === "~#uuid" && typeof value[1] === "string") {
            return value[1];
        }

        return value.map((entry) => decodeTransitValue(entry));
    }

    if (value !== null && typeof value === "object") {
        const decoded: Record<string, unknown> = {};
        for (const [key, entry] of Object.entries(value)) {
            decoded[decodeTransitKey(key)] = decodeTransitValue(entry);
        }
        return decoded;
    }

    return value;
}

function decodeTransitJson(text: string): unknown {
    return decodeTransitValue(JSON.parse(text));
}

function extractAuthTokenValue(rawToken: string): string {
    const token = rawToken.trim();
    const authorization = /^(Token|Bearer)\s+(.+)$/i.exec(token);
    if (authorization) {
        return authorization[2].trim();
    }

    const cookie = token
        .split(";")
        .map((part) => part.trim())
        .find((part) => part.toLowerCase().startsWith("auth-token="));
    if (cookie) {
        return decodeURIComponent(cookie.slice("auth-token=".length));
    }

    return token;
}

function authCookieHeader(token: string): string {
    return `auth-token=${encodeURIComponent(token)}`;
}

function createExporterTransitRequest(plan: ExportPagePlan, profileId: string): string {
    return JSON.stringify({
        "~:cmd": encodeTransitKeyword("export-shapes"),
        "~:wait": true,
        "~:profile-id": encodeTransitUuid(profileId),
        ...(plan.skipChildren ? { "~:skip-children": true } : {}),
        "~:exports": [
            {
                "~:file-id": encodeTransitUuid(plan.fileId as string),
                "~:page-id": encodeTransitUuid(plan.pageId as string),
                "~:object-id": encodeTransitUuid(plan.objectId as string),
                "~:type": encodeTransitKeyword(plan.exportFormat),
                "~:suffix": plan.suffix,
                "~:scale": plan.scale,
                "~:name": plan.name,
            },
        ],
    });
}

function createCliError(code: string, message: string, status = 0, data: Record<string, unknown> = {}): Error {
    return Object.assign(new Error(message), {
        code,
        status,
        data,
    });
}

async function readStructuredResponse(response: Response): Promise<unknown> {
    const text = await response.text();
    if (!text.trim()) {
        return null;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/transit+json")) {
        return decodeTransitJson(text);
    }

    return JSON.parse(text);
}

function createHttpResponseError(defaultCode: string, defaultMessage: string, response: Response, data: unknown): Error {
    const body = asRecord(data);
    const code = typeof body.code === "string" ? body.code.replaceAll("-", "_") : defaultCode;
    const message =
        typeof body.message === "string"
            ? body.message
            : typeof body.hint === "string"
              ? body.hint
              : `${defaultMessage} HTTP ${response.status}`;
    return createCliError(code, message, response.status, { response: data });
}

async function resolveExporterProfileId(
    plan: ExportPagePlan,
    args: string[],
    env: NodeJS.ProcessEnv,
    token: string
): Promise<string> {
    if (plan.profileId) {
        return plan.profileId;
    }

    const rpc = getRpcConfig(args, env);
    const url = createRpcUrl(rpc.backendUri, "get-profile");
    let response: Response;
    try {
        response = await fetch(url, {
            method: "GET",
            headers: {
                accept: "application/json",
                authorization: `Bearer ${token}`,
                cookie: authCookieHeader(token),
                "x-client": "penpot-cli/0.1",
            },
        });
    } catch (cause) {
        throw createCliError(
            "profile_id_resolution_failed",
            `Unable to resolve the exporter profile id from ${rpc.backendUri}: ${String(cause)}`,
            0,
            { backendUri: rpc.backendUri }
        );
    }

    const data = await readStructuredResponse(response);
    if (!response.ok) {
        throw createHttpResponseError("profile_id_resolution_failed", "Unable to resolve the exporter profile id.", response, data);
    }

    const profile = asRecord(data);
    const profileId = typeof profile.id === "string" ? profile.id : "";
    if (!isUuidString(profileId) || profileId === ZERO_UUID) {
        throw createCliError(
            "profile_id_required",
            "Unable to resolve a non-anonymous profile id for exporter execution.",
            response.status,
            { backendUri: rpc.backendUri, profile }
        );
    }

    return profileId;
}

async function postExporterRequest(plan: ExportPagePlan, profileId: string, token: string): Promise<Record<string, unknown>> {
    let response: Response;
    try {
        response = await fetch(plan.exporter.endpoint, {
            method: "POST",
            headers: {
                accept: plan.exporter.responseContentType,
                authorization: `Bearer ${token}`,
                cookie: authCookieHeader(token),
                "content-type": plan.exporter.requestContentType,
                "x-client": "penpot-cli/0.1",
            },
            body: createExporterTransitRequest(plan, profileId),
        });
    } catch (cause) {
        throw createCliError(
            "exporter_unavailable",
            `Unable to reach the Penpot exporter at ${plan.exporter.endpoint}: ${String(cause)}`,
            0,
            { exporterUri: plan.exporter.endpoint }
        );
    }

    const data = await readStructuredResponse(response);
    if (!response.ok) {
        throw createHttpResponseError("exporter_request_failed", "Penpot exporter request failed.", response, data);
    }

    return asRecord(data);
}

async function downloadExporterResource(
    resource: Record<string, unknown>,
    output: string,
    token: string
): Promise<ExportPageResult["downloadedResource"]> {
    const uri = resource.uri ?? resource["resource-uri"];
    if (typeof uri !== "string" || uri.length === 0) {
        throw createCliError("exporter_resource_uri_missing", "Exporter response did not include a downloadable resource uri.", 0, {
            resource,
        });
    }

    let response: Response;
    try {
        response = await fetch(uri, {
            headers: {
                accept: "*/*",
                authorization: `Bearer ${token}`,
                cookie: authCookieHeader(token),
                "x-client": "penpot-cli/0.1",
            },
        });
    } catch (cause) {
        throw createCliError("exporter_resource_unavailable", `Unable to download exporter resource ${uri}: ${String(cause)}`, 0, {
            resourceUri: uri,
        });
    }

    if (response.status === 204 && response.headers.has("x-accel-redirect")) {
        throw createCliError(
            "exporter_resource_requires_gateway",
            "Exporter resource download requires the Penpot public gateway that serves x-accel-redirect assets.",
            response.status,
            { resourceUri: uri, xAccelRedirect: response.headers.get("x-accel-redirect") }
        );
    }

    if (!response.ok) {
        throw createHttpResponseError("exporter_resource_download_failed", "Exporter resource download failed.", response, null);
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    const outputPath = resolve(output);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, bytes);

    return {
        path: outputPath,
        bytes: bytes.byteLength,
        contentType: response.headers.get("content-type"),
    };
}

async function executeExportPagePlan(plan: ExportPagePlan, args: string[], env: NodeJS.ProcessEnv): Promise<ExportPageResult> {
    const rawToken = getRpcConfig(args, env).token;
    if (!rawToken) {
        throw createCliError(
            CommandErrorCodes.AUTHENTICATION_REQUIRED,
            "Exporter execution requires a Penpot auth-token/session token."
        );
    }

    const token = extractAuthTokenValue(rawToken);
    const profileId = await resolveExporterProfileId(plan, args, env, token);
    const resource = await postExporterRequest(plan, profileId, token);
    const downloadedResource = plan.output ? await downloadExporterResource(resource, plan.output, token) : undefined;

    return {
        command: plan.command,
        adapter: plan.adapter,
        adapterSelection: plan.adapterSelection,
        fileId: plan.fileId as string,
        pageId: plan.pageId as string,
        objectId: plan.objectId as string,
        profileId,
        exportFormat: plan.exportFormat,
        scale: plan.scale,
        output: plan.output,
        exporter: plan.exporter,
        resource,
        ...(downloadedResource ? { downloadedResource } : {}),
    };
}

function exportErrorResponse(io: CliIO, format: Format, plan: ExportPagePlan, cause: unknown): number {
    const error = asRecord(cause);
    const code = typeof error.code === "string" ? error.code : "exporter_request_failed";
    const status = typeof error.status === "number" ? error.status : 0;
    const message = cause instanceof Error ? cause.message : "Unable to execute exporter-backed page output.";
    const actions =
        code === CommandErrorCodes.AUTHENTICATION_REQUIRED || code === "profile_id_required"
            ? [
                  "Pass --token with a Penpot auth-token/session token.",
                  "Pass --profile-id or set PENPOT_PROFILE_ID if profile resolution is not available.",
                  "Use --dry-run to inspect the exporter request without executing it.",
              ]
            : [
                  "Check PENPOT_EXPORTER_URI or --exporter-uri.",
                  "Check that the Penpot frontend, backend, and exporter services are running.",
                  "Use --dry-run to inspect the exporter request payload.",
              ];

    writeError(io, format, code, message, actions, {
        status,
        exporterUri: plan.exporter.endpoint,
        output: plan.output,
        details: error.data,
    });
    return 2;
}

function writeConfigText(io: CliIO, config: McpConfig): void {
    writeLine(io.stdout, CommandDescriptors.MCP_CONFIG.title);
    writeLine(io.stdout, `mode: ${config.mode}`);
    writeLine(io.stdout, `auto-connect: ${String(config.autoConnect)}`);
    writeLine(io.stdout, `public-uri: ${config.publicUri}`);
    writeLine(io.stdout, `stream-uri: ${config.streamUri}`);
    writeLine(io.stdout, `sse-uri: ${config.sseUri}`);
    writeLine(io.stdout, `websocket-uri: ${config.websocketUri}`);
    writeLine(io.stdout, `status-uri: ${config.statusUri}`);
    writeLine(io.stdout, `log-dir: ${config.logDir ?? "<not configured>"}`);
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

function writePageRenamedText(io: CliIO, fileId: string, page: unknown): void {
    const record = asRecord(page);
    writeLine(io.stdout, "Page renamed");
    writeLine(io.stdout, `fileId: ${fileId}`);
    writeLine(io.stdout, `id: ${String(record.id ?? "<unknown>")}`);
    writeLine(io.stdout, `name: ${String(record.name ?? "<unnamed>")}`);
}

function writeShapeCreatedText(io: CliIO, fileId: string, shape: unknown): void {
    const record = asRecord(shape);
    writeLine(io.stdout, "Shape created");
    writeLine(io.stdout, `fileId: ${fileId}`);
    writeLine(io.stdout, `id: ${String(record.id ?? "<unknown>")}`);
    writeLine(io.stdout, `type: ${String(record.type ?? "<unknown>")}`);
    writeLine(io.stdout, `name: ${String(record.name ?? "<unnamed>")}`);
    writeLine(io.stdout, `pageId: ${String(record.pageId ?? record["page-id"] ?? "<unknown>")}`);
    writeLine(io.stdout, `parentId: ${String(record.parentId ?? record["parent-id"] ?? "<unknown>")}`);
}

function writeShapeUpdatedText(io: CliIO, fileId: string, shape: unknown): void {
    const record = asRecord(shape);
    writeLine(io.stdout, "Shape updated");
    writeLine(io.stdout, `fileId: ${fileId}`);
    writeLine(io.stdout, `id: ${String(record.id ?? "<unknown>")}`);
    writeLine(io.stdout, `type: ${String(record.type ?? "<unknown>")}`);
    writeLine(io.stdout, `name: ${String(record.name ?? "<unnamed>")}`);
    writeLine(io.stdout, `pageId: ${String(record.pageId ?? record["page-id"] ?? "<unknown>")}`);
    writeLine(io.stdout, `parentId: ${String(record.parentId ?? record["parent-id"] ?? "<unknown>")}`);
}

function writeShapeDeletedText(io: CliIO, fileId: string, shape: unknown): void {
    const record = asRecord(shape);
    writeLine(io.stdout, "Shape deleted");
    writeLine(io.stdout, `fileId: ${fileId}`);
    writeLine(io.stdout, `id: ${String(record.id ?? "<unknown>")}`);
    writeLine(io.stdout, `type: ${String(record.type ?? "<unknown>")}`);
    writeLine(io.stdout, `name: ${String(record.name ?? "<unnamed>")}`);
    writeLine(io.stdout, `pageId: ${String(record.pageId ?? record["page-id"] ?? "<unknown>")}`);
}

function writeExportPlanText(io: CliIO, plan: ExportPagePlan): void {
    writeLine(io.stdout, "Export page plan");
    writeLine(io.stdout, `command: ${plan.command}`);
    writeLine(io.stdout, `adapter: ${plan.adapter ?? "<none>"}`);
    writeLine(io.stdout, `requestedAdapter: ${plan.adapterSelection.requested}`);
    writeLine(io.stdout, `adapterSelection: ${plan.adapterSelection.status}`);
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
    if (plan.adapterSelection.fallbacks.length > 0) {
        writeLine(io.stdout, "adapterFallbacks:");
        for (const fallback of plan.adapterSelection.fallbacks) {
            const reason = fallback.reason ? ` (${fallback.reason})` : "";
            writeLine(io.stdout, `  ${fallback.kind}: ${fallback.available ? "available" : "unavailable"}${reason}`);
        }
    }
    writeLine(io.stdout, "nextActions:");
    for (const action of plan.nextActions) {
        writeLine(io.stdout, `  ${action}`);
    }
}

function writeExportResultText(io: CliIO, result: ExportPageResult): void {
    const resourceId = result.resource.id ?? result.resource["resource-id"] ?? "<unknown>";
    const resourceUri = result.resource.uri ?? result.resource["resource-uri"] ?? "<unknown>";

    writeLine(io.stdout, "Export page completed");
    writeLine(io.stdout, `command: ${result.command}`);
    writeLine(io.stdout, `adapter: ${result.adapter ?? "<none>"}`);
    writeLine(io.stdout, `exporter: ${result.exporter.method} ${result.exporter.endpoint}`);
    writeLine(io.stdout, `fileId: ${result.fileId}`);
    writeLine(io.stdout, `pageId: ${result.pageId}`);
    writeLine(io.stdout, `objectId: ${result.objectId}`);
    writeLine(io.stdout, `profileId: ${result.profileId}`);
    writeLine(io.stdout, `resourceId: ${String(resourceId)}`);
    writeLine(io.stdout, `resourceUri: ${String(resourceUri)}`);
    writeLine(io.stdout, `mtype: ${String(result.resource.mtype ?? "<unknown>")}`);
    writeLine(io.stdout, `filename: ${String(result.resource.filename ?? "<unknown>")}`);
    if (result.downloadedResource) {
        writeLine(io.stdout, `output: ${result.downloadedResource.path}`);
        writeLine(io.stdout, `bytes: ${result.downloadedResource.bytes}`);
    } else {
        writeLine(io.stdout, "output: <not written; resource metadata only>");
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

    writeLine(io.stdout, `${CommandDescriptors.MCP_STATUS.title}: ${String(body.status ?? "unknown")}`);
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
    const requestEnvelope = createCliRequest(CommandDescriptors.MCP_STATUS, {
        target: { statusUri: config.statusUri },
        auth: { userTokenPresent: false, source: "status-endpoint" },
        adapter: "http",
        diagnostics: { mode: config.mode },
    });
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
        const resultEnvelope = createCliResult(requestEnvelope, data, {
            diagnostics: { statusUri: config.statusUri },
        });
        if (format === "json") {
            writeJson(io.stdout, {
                status: "ok",
                source: {
                    statusUri: config.statusUri,
                },
                data: resultEnvelope.data,
            });
        } else {
            formatStatusText(io, config.statusUri, resultEnvelope.data);
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

    const config = getMcpConfig(args, env, { allowModeAlias: true });
    const requestEnvelope = createCliRequest(CommandDescriptors.MCP_CONFIG, {
        input: { mode: config.mode, autoConnect: config.autoConnect },
        target: { publicUri: config.publicUri, statusUri: config.statusUri },
        auth: { userTokenPresent: false, source: "local-config" },
        adapter: "local",
        diagnostics: { logDirConfigured: Boolean(config.logDir) },
    });
    const resultEnvelope = createCliResult(requestEnvelope, config);
    if (format === "json") {
        writeJson(io.stdout, {
            status: "ok",
            data: resultEnvelope.data,
        });
    } else {
        writeConfigText(io, resultEnvelope.data);
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

    const requestEnvelope = createCliRequest(CommandDescriptors.FILE_LIST, {
        input: { projectId },
        target: { projectId, backendUri: rpc.backendUri },
        auth: { userTokenPresent: true, source: "cli-token" },
        adapter: "backend-rpc",
    });

    try {
        const files = await rpcRequest<unknown[]>(
            "GET",
            rpc.backendUri,
            "get-project-files",
            { "project-id": projectId },
            rpc.token
        );
        const resultEnvelope = createCliResult(requestEnvelope, { projectId, files, adapter: "backend-rpc" });
        writeOkEnvelope(io, format, resultEnvelope, () => writeFilesText(io, projectId, files));
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
    const requestEnvelope = createCliRequest(CommandDescriptors.FILE_CREATE, {
        input: { projectId, name, isShared },
        target: { projectId, backendUri: rpc.backendUri },
        auth: { userTokenPresent: true, source: "cli-token" },
        adapter: "backend-rpc",
    });

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
        const resultEnvelope = createCliResult(
            requestEnvelope,
            {
                file,
                url,
                adapter: "backend-rpc",
                nextActions: ["Open the workspace URL before using file-scoped MCP tools.", CommandDescriptors.FILE_OPEN.id],
            }
        );
        writeOkEnvelope(
            io,
            format,
            resultEnvelope,
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
    const requestEnvelope = createCliRequest(CommandDescriptors.FILE_OPEN, {
        input: {
            fileId,
            teamId: readOption(args, ["--team-id"]),
            pageId: readOption(args, ["--page-id", "--page"]),
        },
        target: { fileId, url },
        auth: { userTokenPresent: false, source: "browser-url" },
        adapter: CommandDescriptors.FILE_OPEN.adapters[0],
    });
    const resultEnvelope = createCliResult(
        requestEnvelope,
        {
            fileId,
            url,
            adapter: CommandDescriptors.FILE_OPEN.adapters[0],
            boundContext: false,
        }
    );
    writeOkEnvelope(
        io,
        format,
        resultEnvelope,
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

    const adapterSelection = selectCliBackendCommandAdapter(CommandDescriptors.PAGE_LIST.id, args);
    if (adapterSelection.status !== "selected" || adapterSelection.selected !== "backend-command") {
        return adapterSelectionFailure(io, format, adapterSelection);
    }

    const rpc = getRpcConfig(args, env);
    if (!rpc.token) {
        return rpcAuthenticationRequired(io, format);
    }

    const requestEnvelope = createCliRequest(CommandDescriptors.PAGE_LIST, {
        input: { fileId, adapter: readRequestedAdapter(args) },
        target: { fileId, backendUri: rpc.backendUri },
        auth: { userTokenPresent: true, source: "cli-token" },
        adapterSelection,
    });

    try {
        const result = await rpcRequest<Record<string, unknown>>(
            "GET",
            rpc.backendUri,
            "get-file-pages",
            { id: fileId },
            rpc.token
        );
        const pages = Array.isArray(result.pages) ? result.pages : [];
        const resultEnvelope = createCliResult(
            requestEnvelope,
            { fileId, pages, adapter: adapterSelection.selected, adapterSelection },
            { adapterSelection }
        );
        writeOkEnvelope(
            io,
            format,
            resultEnvelope,
            () => writePagesText(io, fileId, pages)
        );
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

    const adapterSelection = selectCliBackendCommandAdapter(CommandDescriptors.PAGE_CREATE.id, args);
    if (adapterSelection.status !== "selected" || adapterSelection.selected !== "backend-command") {
        return adapterSelectionFailure(io, format, adapterSelection);
    }

    const rpc = getRpcConfig(args, env);
    if (!rpc.token) {
        return rpcAuthenticationRequired(io, format);
    }

    const name = readOption(args, ["--name"])?.trim();
    const pageId = readOption(args, ["--page-id", "--page"]);
    const requestEnvelope = createCliRequest(CommandDescriptors.PAGE_CREATE, {
        input: { fileId, pageId, name, adapter: readRequestedAdapter(args) },
        target: { fileId, pageId, backendUri: rpc.backendUri },
        auth: { userTokenPresent: true, source: "cli-token" },
        adapterSelection,
    });

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
        const resultEnvelope = createCliResult(
            requestEnvelope,
            {
                fileId,
                page: result.page,
                revn: result.revn,
                vern: result.vern,
                adapter: adapterSelection.selected,
                adapterSelection,
            },
            { adapterSelection }
        );
        writeOkEnvelope(
            io,
            format,
            resultEnvelope,
            () => writePageCreatedText(io, fileId, result.page)
        );
        return 0;
    } catch (cause) {
        return rpcErrorResponse(io, format, "create-file-page", rpc.backendUri, cause);
    }
}

async function handlePageRename(args: string[], io: CliIO, env: NodeJS.ProcessEnv): Promise<number> {
    const format = parseFormat(args, io);
    if (!format) {
        return 2;
    }

    const fileId = readOption(args, ["--file-id", "--file"]);
    if (!fileId) {
        writeError(io, format, "file_id_required", "page rename requires --file <file-id>.", [
            "Use penpot-cli file list first, then pass --file <file-id>.",
        ]);
        return 2;
    }

    const pageId = readOption(args, ["--page-id", "--page"]);
    if (!pageId) {
        writeError(io, format, "page_id_required", "page rename requires --page <page-id>.", [
            "Use penpot-cli page list --file <file-id> first, then pass --page <page-id>.",
        ]);
        return 2;
    }

    const name = readOption(args, ["--name"])?.trim();
    if (!name) {
        writeError(io, format, "page_name_required", "page rename requires --name <name>.", [
            "Pass a non-empty page name.",
        ]);
        return 2;
    }

    const adapterSelection = selectCliBackendCommandAdapter(CommandDescriptors.PAGE_RENAME.id, args);
    if (adapterSelection.status !== "selected" || adapterSelection.selected !== "backend-command") {
        return adapterSelectionFailure(io, format, adapterSelection);
    }

    const rpc = getRpcConfig(args, env);
    if (!rpc.token) {
        return rpcAuthenticationRequired(io, format);
    }

    const requestEnvelope = createCliRequest(CommandDescriptors.PAGE_RENAME, {
        input: { fileId, pageId, name, adapter: readRequestedAdapter(args) },
        target: { fileId, pageId, backendUri: rpc.backendUri },
        auth: { userTokenPresent: true, source: "cli-token" },
        adapterSelection,
    });

    try {
        const result = await rpcRequest<Record<string, unknown>>(
            "POST",
            rpc.backendUri,
            "rename-file-page",
            {
                id: fileId,
                "page-id": pageId,
                name,
            },
            rpc.token
        );
        const resultEnvelope = createCliResult(
            requestEnvelope,
            {
                fileId,
                page: result.page,
                revn: result.revn,
                vern: result.vern,
                adapter: adapterSelection.selected,
                adapterSelection,
            },
            { adapterSelection }
        );
        writeOkEnvelope(
            io,
            format,
            resultEnvelope,
            () => writePageRenamedText(io, fileId, result.page)
        );
        return 0;
    } catch (cause) {
        return rpcErrorResponse(io, format, "rename-file-page", rpc.backendUri, cause);
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
        case "rename":
            return await handlePageRename(rest, io, env);
        default:
            writeLine(io.stderr, `Unknown page command: ${subcommand}`);
            writeLine(io.stderr, 'Run "penpot-cli page --help" for usage.');
            return 2;
    }
}

async function handleShapeCreate(
    kind: ShapeCreateKind,
    commandName: string,
    args: string[],
    io: CliIO,
    env: NodeJS.ProcessEnv
): Promise<number> {
    const format = parseFormat(args, io);
    if (!format) {
        return 2;
    }

    const adapterSelection = selectCliShapeAdapter(commandName, args);
    if (adapterSelection.status !== "selected" || adapterSelection.selected !== "backend-command") {
        return adapterSelectionFailure(io, format, adapterSelection);
    }

    const shapeParams = parseShapeCreateParams(kind, args, io, format);
    if (!shapeParams) {
        return 2;
    }

    const rpc = getRpcConfig(args, env);
    if (!rpc.token) {
        return rpcAuthenticationRequired(io, format);
    }

    try {
        const result = await rpcRequest<Record<string, unknown>>(
            "POST",
            rpc.backendUri,
            "create-file-shape",
            {
                id: shapeParams.fileId,
                "page-id": shapeParams.pageId,
                "shape-id": shapeParams.shapeId,
                "parent-id": shapeParams.parentId,
                type: shapeParams.type,
                name: shapeParams.name,
                x: shapeParams.x,
                y: shapeParams.y,
                width: shapeParams.width,
                height: shapeParams.height,
                content: shapeParams.content,
                fill: shapeParams.fill,
                stroke: shapeParams.stroke,
                "border-radius": shapeParams.borderRadius,
                "font-size": shapeParams.fontSize,
            },
            rpc.token
        );
        writeOk(
            io,
            format,
            {
                fileId: shapeParams.fileId,
                shape: result.shape,
                revn: result.revn,
                vern: result.vern,
                adapter: adapterSelection.selected,
                adapterSelection,
            },
            () => writeShapeCreatedText(io, shapeParams.fileId, result.shape)
        );
        return 0;
    } catch (cause) {
        return rpcErrorResponse(io, format, "create-file-shape", rpc.backendUri, cause);
    }
}

async function handleShapeUpdate(args: string[], io: CliIO, env: NodeJS.ProcessEnv): Promise<number> {
    const format = parseFormat(args, io);
    if (!format) {
        return 2;
    }

    const adapterSelection = selectCliShapeAdapter(CommandDescriptors.SHAPE_UPDATE.id, args);
    if (adapterSelection.status !== "selected" || adapterSelection.selected !== "backend-command") {
        return adapterSelectionFailure(io, format, adapterSelection);
    }

    const shapeParams = parseShapeUpdateParams(args, io, format);
    if (!shapeParams) {
        return 2;
    }

    const rpc = getRpcConfig(args, env);
    if (!rpc.token) {
        return rpcAuthenticationRequired(io, format);
    }

    try {
        const result = await rpcRequest<Record<string, unknown>>(
            "POST",
            rpc.backendUri,
            "update-file-shape",
            {
                id: shapeParams.fileId,
                "page-id": shapeParams.pageId,
                "shape-id": shapeParams.shapeId,
                "parent-id": shapeParams.parentId,
                index: shapeParams.index,
                name: shapeParams.name,
                x: shapeParams.x,
                y: shapeParams.y,
                width: shapeParams.width,
                height: shapeParams.height,
                content: shapeParams.content,
                fill: shapeParams.fill,
                fills: shapeParams.fills,
                stroke: shapeParams.stroke,
                strokes: shapeParams.strokes,
                "border-radius": shapeParams.borderRadius,
                r1: shapeParams.r1,
                r2: shapeParams.r2,
                r3: shapeParams.r3,
                r4: shapeParams.r4,
                "font-size": shapeParams.fontSize,
                layout: toRpcShapeLayout(shapeParams.layout),
            },
            rpc.token
        );
        writeOk(
            io,
            format,
            {
                fileId: shapeParams.fileId,
                shape: result.shape,
                revn: result.revn,
                vern: result.vern,
                adapter: adapterSelection.selected,
                adapterSelection,
            },
            () => writeShapeUpdatedText(io, shapeParams.fileId, result.shape)
        );
        return 0;
    } catch (cause) {
        return rpcErrorResponse(io, format, "update-file-shape", rpc.backendUri, cause);
    }
}

async function handleShapeDelete(args: string[], io: CliIO, env: NodeJS.ProcessEnv): Promise<number> {
    const format = parseFormat(args, io);
    if (!format) {
        return 2;
    }

    const adapterSelection = selectCliShapeAdapter(CommandDescriptors.SHAPE_DELETE.id, args);
    if (adapterSelection.status !== "selected" || adapterSelection.selected !== "backend-command") {
        return adapterSelectionFailure(io, format, adapterSelection);
    }

    const shapeParams = parseShapeDeleteParams(args, io, format);
    if (!shapeParams) {
        return 2;
    }

    const rpc = getRpcConfig(args, env);
    if (!rpc.token) {
        return rpcAuthenticationRequired(io, format);
    }

    try {
        const result = await rpcRequest<Record<string, unknown>>(
            "POST",
            rpc.backendUri,
            "delete-file-shape",
            {
                id: shapeParams.fileId,
                "page-id": shapeParams.pageId,
                "shape-id": shapeParams.shapeId,
            },
            rpc.token
        );
        writeOk(
            io,
            format,
            {
                fileId: shapeParams.fileId,
                shape: result.shape,
                revn: result.revn,
                vern: result.vern,
                deleted: true,
                adapter: adapterSelection.selected,
                adapterSelection,
            },
            () => writeShapeDeletedText(io, shapeParams.fileId, result.shape)
        );
        return 0;
    } catch (cause) {
        return rpcErrorResponse(io, format, "delete-file-shape", rpc.backendUri, cause);
    }
}

async function handleShapeCommand(args: string[], io: CliIO, env: NodeJS.ProcessEnv): Promise<number> {
    const [subcommand, ...rest] = args;

    if (isHelpFlag(subcommand)) {
        writeLine(io.stdout, SHAPE_HELP_TEXT);
        return 0;
    }

    switch (subcommand) {
        case "create-frame":
            return await handleShapeCreate("frame", CommandDescriptors.SHAPE_CREATE_FRAME.id, rest, io, env);
        case "create-rect":
            return await handleShapeCreate("rect", CommandDescriptors.SHAPE_CREATE_RECT.id, rest, io, env);
        case "create-text":
            return await handleShapeCreate("text", CommandDescriptors.SHAPE_CREATE_TEXT.id, rest, io, env);
        case "update":
            return await handleShapeUpdate(rest, io, env);
        case "delete":
            return await handleShapeDelete(rest, io, env);
        default:
            writeLine(io.stderr, `Unknown shape command: ${subcommand}`);
            writeLine(io.stderr, 'Run "penpot-cli shape --help" for usage.');
            return 2;
    }
}

async function handleExportPage(args: string[], io: CliIO, env: NodeJS.ProcessEnv): Promise<number> {
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

    if (plan.adapterSelection.status !== "selected" || plan.adapterSelection.selected !== "exporter") {
        return adapterSelectionFailure(io, format, plan.adapterSelection);
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

    try {
        const result = await executeExportPagePlan(plan, args, env);
        writeOk(io, format, result, () => writeExportResultText(io, result));
        return 0;
    } catch (cause) {
        return exportErrorResponse(io, format, plan, cause);
    }
}

async function handleExportCommand(args: string[], io: CliIO, env: NodeJS.ProcessEnv): Promise<number> {
    const [subcommand, ...rest] = args;

    if (isHelpFlag(subcommand)) {
        writeLine(io.stdout, EXPORT_HELP_TEXT);
        return 0;
    }

    switch (subcommand) {
        case "page":
            return await handleExportPage(rest, io, env);
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

    if (first === "shape") {
        return await handleShapeCommand(argv.slice(1), io, env);
    }

    if (first === "export") {
        return await handleExportCommand(argv.slice(1), io, env);
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
