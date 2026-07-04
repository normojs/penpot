#!/usr/bin/env node

import { spawn } from "node:child_process";
import { constants } from "node:fs";
import { access, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { createConnection } from "node:net";
import { basename, delimiter, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
    AdapterSelectionReasonCodes,
    CommandDescriptors,
    CommandErrorCodes,
    createAdapterSelectionError,
    createCommandRequestEnvelope,
    createCommandResultEnvelope,
    createExportFileContract,
    createFileOpenHandoff,
    createRenderThumbnailRendererServicePlan,
    createWorkspaceUrl as createCommandWorkspaceUrl,
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
    ExportFileContract,
    RenderThumbnailRendererServicePlan,
    RequestedCommandAdapter,
} from "@penpot/command-runtime";

const VERSION = "0.1.0";
const DEFAULT_PUBLIC_URI = "http://localhost:3449";
const DEFAULT_LOCAL_MCP_PUBLIC_URI = "http://localhost:4401";
const DEFAULT_LOCAL_MCP_STREAM_URI = "http://localhost:4401/mcp";
const DEFAULT_LOCAL_MCP_SSE_URI = "http://localhost:4401/sse";
const DEFAULT_LOCAL_MCP_WEBSOCKET_URI = "ws://localhost:4402";
const DEFAULT_LOCAL_MCP_STATUS_URI = "http://localhost:4401/status";
const DEFAULT_BACKEND_URI = "http://localhost:6060";
const DEFAULT_EXPORTER_URI = "http://localhost:6061";
const DEFAULT_RENDERER_SERVICE_URI = "http://localhost:6070/thumbnail";
const DEFAULT_PLUGIN_PREVIEW_URI = "http://localhost:4400/manifest.json";

const HELP_TEXT = `penpot-cli ${VERSION}

Usage:
  penpot-cli --help
  penpot-cli --version
  penpot-cli mcp status [--url <status-url>] [--format text|json]
  penpot-cli mcp config [--mode builtin|custom|local] [--profile-source off|auto|backend] [--format text|json]
  penpot-cli mcp logs [--dir <path>] [--follow] [--format text|json]
  penpot-cli dev up --mcp [--mode devenv|host|hybrid] [--dry-run] [--format text|json]
  penpot-cli file list --project-id <id> [--format text|json]
  penpot-cli file create --project-id <id> [--name <name>] [--format text|json]
  penpot-cli file open <file-id> [--team-id <id>] [--page-id <id>] [--format text|json]
  penpot-cli page list --file <file-id> [--adapter auto|backend-command] [--format text|json]
  penpot-cli page create --file <file-id> [--name <name>] [--adapter auto|backend-command] [--format text|json]
  penpot-cli page rename --file <file-id> --page <page-id> --name <name> [--adapter auto|backend-command] [--format text|json]
  penpot-cli shape create-frame --file <file-id> --page <page-id> --x <n> --y <n> --width <n> --height <n> [--format text|json]
  penpot-cli shape create-rect --file <file-id> --page <page-id> --parent <frame-id> --x <n> --y <n> --width <n> --height <n> [--format text|json]
  penpot-cli shape create-text --file <file-id> --page <page-id> --parent <frame-id> --x <n> --y <n> --width <n> --height <n> --content <text> [--format text|json]
  penpot-cli shape create-image --file <file-id> --page <page-id> --image <path> --x <n> --y <n> [--width <n>] [--height <n>] [--format text|json]
  penpot-cli shape update --file <file-id> --shape <shape-id> [--page <page-id>] [--parent <frame-id>] [--x <n>] [--y <n>] [--width <n>] [--height <n>] [--fill <hex>] [--layout none|flex|grid] [--format text|json]
  penpot-cli shape set-layout --file <file-id> --shape <shape-id> --layout none|flex|grid [--page <page-id>] [--format text|json]
  penpot-cli shape set-style --file <file-id> --shape <shape-id> [--page <page-id>] [--fill <hex>] [--stroke <hex>] [--content <text>] [--font-size <n>] [--format text|json]
  penpot-cli shape delete --file <file-id> --shape <shape-id> [--page <page-id>] [--format text|json]
  penpot-cli prototype create-flow --file <file-id> --name <name> --starting-board <frame-id> [--page <page-id>] [--flow-id <id>] [--format text|json]
  penpot-cli prototype create-interaction --file <file-id> --source <shape-id> --destination <frame-id> [--page <page-id>] [--trigger click|mouse-enter|mouse-leave|after-delay] [--format text|json]
  penpot-cli prototype create-overlay --file <file-id> --page <page-id> --source <shape-id> --action open-overlay|toggle-overlay|close-overlay [--destination <frame-id>] [--position center|manual|top-left|top-right|top-center|bottom-left|bottom-right|bottom-center] [--format text|json]
  penpot-cli prototype list-interactions --file <file-id> [--page <page-id>] [--flow-id <id>] [--source <shape-id>] [--format text|json]
  penpot-cli prototype delete-interaction --file <file-id> [--interaction-id <id>] [--source <shape-id> --index <n>] [--page <page-id>] [--format text|json]
  penpot-cli prototype update-interaction --file <file-id> [--interaction-id <id>] [--source <shape-id> --index <n>] [--destination <frame-id>] [--trigger click|mouse-enter|mouse-leave|after-delay] [--format text|json]
  penpot-cli prototype reorder-interaction --file <file-id> [--interaction-id <id>] [--source <shape-id> --index <n>] --to-index <n> [--format text|json]
  penpot-cli prototype duplicate-interaction --file <file-id> [--interaction-id <id>] [--source <shape-id> --index <n>] [--insertion-index <n>] [--format text|json]
  penpot-cli export page --file <file-id> --page <page-id> --object <object-id> [--adapter auto|exporter] [--output <path>] [--dry-run] [--format text|json]
  penpot-cli export file --file <file-id> [--library-mode all|merge|detach] [--adapter auto|backend-rpc] [--output <path>] [--dry-run] [--format text|json]
  penpot-cli render preview --file <file-id> --page <page-id> --object <object-id> [--adapter auto|exporter] [--output <path>] [--dry-run] [--format text|json]
  penpot-cli render thumbnail --file <file-id> [--target file|frame] [--page <page-id>] [--object <object-id>] [--cache-policy reuse|refresh] [--width <px>] [--renderer-service-uri <uri>] [--renderer-timeout-ms <n>] [--render-thumbnail-execution renderer-service] [--adapter auto|renderer-service] [--dry-run] [--format text|json]`;

const MCP_HELP_TEXT = `penpot-cli mcp

Usage:
  penpot-cli mcp status [--url <status-url>] [--format text|json]
  penpot-cli mcp config [--mode builtin|custom|local] [--profile-source off|auto|backend] [--format text|json]
  penpot-cli mcp logs [--dir <path>] [--follow] [--format text|json]

Environment:
  PENPOT_MCP_PUBLIC_URI      Public Penpot base URL, default http://localhost:3449
  PENPOT_MCP_MODE            MCP config mode: builtin, custom, or local
  PENPOT_MCP_AUTO_CONNECT    Whether saved profile config should auto-connect, default true
  PENPOT_MCP_STREAM_URI      Explicit MCP stream URL
  PENPOT_MCP_WEBSOCKET_URI   Explicit MCP WebSocket URL
  PENPOT_MCP_STATUS_URI      Explicit MCP status URL
  PENPOT_MCP_LOG_DIR         MCP file log directory
  PENPOT_MCP_PROFILE_SOURCE  Profile config source: off, auto, or backend
  PENPOT_BACKEND_URI         Backend RPC base URI for profile-source backend/auto
  PENPOT_CLI_TOKEN           Penpot auth-token/session token for profile reads`;

const DEV_HELP_TEXT = `penpot-cli dev

Usage:
  penpot-cli dev up --mcp [--mode devenv|host|hybrid] [--dry-run] [--format text|json]

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
  penpot-cli shape create-image --file <file-id> --page <page-id> --image <path> --x <n> --y <n> [--width <n>] [--height <n>] [--name <name>] [--shape-id <id>] [--parent <frame-id>] [--mime-type <type>] [--format text|json]
  penpot-cli shape update --file <file-id> --shape <shape-id> [--page <page-id>] [--parent <frame-id>] [--index <n>] [--name <name>] [--x <n>] [--y <n>] [--width <n>] [--height <n>] [--fill <hex>] [--stroke <hex>] [--border-radius <n>] [--r1 <n>] [--r2 <n>] [--r3 <n>] [--r4 <n>] [--content <text>] [--font-size <n>] [--layout none|flex|grid] [--layout-direction row|row-reverse|column|column-reverse] [--layout-grid-direction row|column] [--layout-grid-rows fixed:120,flex:1,auto] [--layout-grid-columns percent:50,percent:50] [--layout-wrap wrap|nowrap] [--layout-align-items start|center|end|stretch] [--layout-justify-items start|center|end|stretch] [--layout-align-content start|center|end|space-between|space-around|space-evenly|stretch] [--layout-justify-content start|center|end|space-between|space-around|space-evenly|stretch] [--layout-gap <n>] [--layout-row-gap <n>] [--layout-column-gap <n>] [--layout-padding <n>] [--format text|json]
  penpot-cli shape set-layout --file <file-id> --shape <shape-id> [--page <page-id>] --layout none|flex|grid [--layout-direction row|row-reverse|column|column-reverse] [--layout-grid-direction row|column] [--layout-grid-rows fixed:120,flex:1,auto] [--layout-grid-columns percent:50,percent:50] [--layout-wrap wrap|nowrap] [--layout-align-items start|center|end|stretch] [--layout-justify-items start|center|end|stretch] [--layout-align-content start|center|end|space-between|space-around|space-evenly|stretch] [--layout-justify-content start|center|end|space-between|space-around|space-evenly|stretch] [--layout-gap <n>] [--layout-row-gap <n>] [--layout-column-gap <n>] [--layout-padding <n>] [--format text|json]
  penpot-cli shape set-style --file <file-id> --shape <shape-id> [--page <page-id>] [--fill <hex>] [--stroke <hex>] [--border-radius <n>] [--r1 <n>] [--r2 <n>] [--r3 <n>] [--r4 <n>] [--content <text>] [--font-size <n>] [--format text|json]
  penpot-cli shape delete --file <file-id> --shape <shape-id> [--page <page-id>] [--format text|json]

Notes:
  Repeat --fill and --stroke to send backend-command fill/stroke stacks.
  Repeated --fill-opacity, --stroke-opacity, --stroke-width, --stroke-style, and --stroke-alignment values align by index.
  Backend-command layout updates support --layout none, --layout flex, and the grid container track subset.

Environment:
  PENPOT_BACKEND_URI       Backend RPC base URI, default http://localhost:6060
  PENPOT_PUBLIC_URI        Public Penpot base URI used as backend fallback
  PENPOT_CLI_TOKEN         Penpot access token for backend RPC
  PENPOT_MCP_USER_TOKEN    Penpot MCP user token fallback for backend RPC
  PENPOT_ACCESS_TOKEN      Generic Penpot access token fallback`;

const PROTOTYPE_HELP_TEXT = `penpot-cli prototype

Usage:
  penpot-cli prototype create-flow --file <file-id> --name <name> --starting-board <frame-id> [--page <page-id>] [--flow-id <id>] [--adapter auto|backend-command] [--backend-uri <uri>] [--token <token>] [--format text|json]
  penpot-cli prototype create-interaction --file <file-id> --source <shape-id> --destination <frame-id> [--page <page-id>] [--trigger click|mouse-enter|mouse-leave|after-delay] [--delay <ms>] [--preserve-scroll] [--animation dissolve|slide|push] [--animation-duration <ms>] [--format text|json]
  penpot-cli prototype create-overlay --file <file-id> --page <page-id> --source <shape-id> --action open-overlay|toggle-overlay|close-overlay [--destination <frame-id>] [--relative-to <shape-id>] [--position center|manual|top-left|top-right|top-center|bottom-left|bottom-right|bottom-center] [--manual-x <n> --manual-y <n>] [--close-click-outside] [--background-overlay] [--trigger click|mouse-enter|mouse-leave|after-delay] [--delay <ms>] [--animation dissolve|slide] [--animation-duration <ms>] [--format text|json]
  penpot-cli prototype list-interactions --file <file-id> [--page <page-id>] [--flow-id <id>] [--source <shape-id>] [--adapter auto|backend-command] [--format text|json]
  penpot-cli prototype delete-interaction --file <file-id> [--interaction-id <id>] [--source <shape-id> --index <n>] [--page <page-id>] [--adapter auto|backend-command] [--format text|json]
  penpot-cli prototype update-interaction --file <file-id> [--interaction-id <id>] [--source <shape-id> --index <n>] [--page <page-id>] [--destination <frame-id>] [--relative-to <shape-id>] [--position center|manual|top-left|top-right|top-center|bottom-left|bottom-right|bottom-center] [--manual-x <n> --manual-y <n>] [--close-click-outside[=true|false]] [--background-overlay[=true|false]] [--trigger click|mouse-enter|mouse-leave|after-delay] [--delay <ms>] [--preserve-scroll[=true|false]] [--animation dissolve|slide|push] [--animation-duration <ms>] [--adapter auto|backend-command] [--format text|json]
  penpot-cli prototype reorder-interaction --file <file-id> [--interaction-id <id>] [--source <shape-id> --index <n>] --to-index <n> [--page <page-id>] [--adapter auto|backend-command] [--format text|json]
  penpot-cli prototype duplicate-interaction --file <file-id> [--interaction-id <id>] [--source <shape-id> --index <n>] [--insertion-index <n>] [--page <page-id>] [--adapter auto|backend-command] [--format text|json]

Notes:
  Backend-command prototype helpers currently support basic flows, navigate-to interaction creation, open/toggle/close overlay creation, persisted navigate/overlay listing, stable-id deletion/update/reorder/duplicate, and source-shape/index fallback.
  Overlay creation requires --destination for open-overlay and toggle-overlay; close-overlay can omit it.

Environment:
  PENPOT_BACKEND_URI       Backend RPC base URI, default http://localhost:6060
  PENPOT_PUBLIC_URI        Public Penpot base URI used as backend fallback
  PENPOT_CLI_TOKEN         Penpot access token for backend RPC
  PENPOT_MCP_USER_TOKEN    Penpot MCP user token fallback for backend RPC
  PENPOT_ACCESS_TOKEN      Generic Penpot access token fallback`;

const EXPORT_HELP_TEXT = `penpot-cli export

Usage:
  penpot-cli export page --file <file-id> --page <page-id> --object <object-id> [--export-format png|jpeg|svg|pdf] [--scale <n>] [--output <path>] [--exporter-uri <uri>] [--backend-uri <uri>] [--token <token>] [--adapter auto|exporter] [--dry-run] [--format text|json]
  penpot-cli export file --file <file-id> [--library-mode all|merge|detach] [--output <path>] [--backend-uri <uri>] [--token <token>] [--adapter auto|backend-rpc] [--dry-run] [--format text|json]

Current adapters:
  exporter   Phase 7 headless adapter backed by the Penpot exporter HTTP service.
  backend-rpc   File-level .penpot archive export through backend export-binfile SSE.

Environment:
  PENPOT_EXPORTER_URI      Exporter HTTP URI, default http://localhost:6061
  PENPOT_BACKEND_URI       Backend RPC base URI used for export file and profile id resolution
  PENPOT_PROFILE_ID        Optional profile id for the direct exporter request
  PENPOT_CLI_TOKEN         Penpot auth-token/session token for export execution
  PENPOT_MCP_USER_TOKEN    Penpot MCP user token fallback for export execution
  PENPOT_ACCESS_TOKEN      Generic Penpot access token fallback`;

const RENDER_HELP_TEXT = `penpot-cli render

Usage:
  penpot-cli render preview --file <file-id> --page <page-id> --object <object-id> [--scale <n>] [--output <path>] [--exporter-uri <uri>] [--backend-uri <uri>] [--token <token>] [--adapter auto|exporter] [--dry-run] [--format text|json]
  penpot-cli render thumbnail --file <file-id> [--target file|frame] [--page <page-id>] [--object <object-id>] [--tag <tag>] [--revn <n>] [--width <px>] [--cache-policy reuse|refresh] [--output <path>] [--renderer-service-uri <uri>] [--renderer-timeout-ms <n>] [--render-thumbnail-execution renderer-service] [--public-uri <uri>] [--adapter auto|renderer-service] [--dry-run] [--format text|json]

Notes:
  Preview rendering uses the exporter adapter and always requests PNG output.
  It requires explicit file, page, and object ids because CLI commands cannot infer live selection state.
  Thumbnail rendering is currently planning-only. Use --dry-run to inspect the future renderer-service request shape; execution returns renderer_service_unavailable until the renderer service exists.

Environment:
  PENPOT_EXPORTER_URI      Exporter HTTP URI, default http://localhost:6061
  PENPOT_RENDERER_SERVICE_URI  Future thumbnail renderer-service URI, default http://localhost:6070/thumbnail
  PENPOT_RENDERER_SERVICE_TIMEOUT_MS  Future renderer-service health probe timeout, default 2500
  PENPOT_RENDER_THUMBNAIL_EXECUTION  Future explicit execution gate value, expected renderer-service
  PENPOT_BACKEND_URI       Backend RPC base URI used to resolve profile id
  PENPOT_PUBLIC_URI        Public Penpot base URI used for future thumbnail download URI derivation
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
type McpProfileSource = "off" | "auto" | "backend";
type McpProfileReadStatus = "disabled" | "loaded" | "fallback";
type McpFieldSource = "flag" | "env" | "profile" | "default" | "derived" | "unset" | "fallback";

interface McpProfileConfig {
    mode: McpMode;
    "auto-connect": boolean;
    "public-uri": string;
    "stream-uri": string;
    "sse-uri": string;
    "websocket-uri": string;
    "status-uri": string;
}

type McpProfileConfigInput = Partial<McpProfileConfig>;

interface McpConfigSource {
    profileSource: McpProfileSource;
    status: McpProfileReadStatus;
    backendUri: string | null;
    profileId: string | null;
    warnings: string[];
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
    configSource: McpConfigSource;
    fieldSources: Record<string, McpFieldSource>;
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
    services: DevServicePlan[];
    dependencyChecks: DevDependencyCheck[];
    portChecks: DevPortCheck[];
    startupBoundaries: DevStartupBoundary[];
    readinessChecks: string[];
}

interface DevServicePlan {
    name: string;
    kind: "devenv" | "host-process" | "docker-dependency" | "static-assets" | "gateway";
    mode: "devenv" | "host" | "hybrid" | "all";
    required: boolean;
    command: string | null;
    surfaces: string[];
    ports: number[];
    status: "planned" | "delegated" | "unsupported";
}

interface DevDependencyCheck {
    name: string;
    kind: "command" | "file";
    target: string;
    required: boolean;
    modes: string[];
    status: "available" | "missing";
    detail: string;
}

interface DevPortCheck {
    name: string;
    host: string;
    port: number;
    url: string;
    required: boolean;
    status: "listening" | "available" | "unknown";
    detail: string;
}

interface DevStartupBoundary {
    mode: string;
    status: "supported" | "planning_only";
    detail: string;
    nextActions: string[];
}

interface RpcConfig {
    backendUri: string;
    token: string | null;
}

type ExportArtifactKind = "export" | "preview";

interface ExportArtifactMetadata {
    kind: ExportArtifactKind;
    format: string;
    mimeType: string;
    name: string;
    scale: number;
    target: {
        fileId: string | null;
        pageId: string | null;
        objectId: string | null;
    };
    output: string | null;
}

interface ExportPagePlan {
    command: string;
    adapter: string | null;
    adapterSelection: CommandAdapterSelection;
    artifact: ExportArtifactMetadata;
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
    artifact: ExportArtifactMetadata;
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

type ExportFileLibraryMode = "all" | "merge" | "detach";

interface DownloadedResourceMetadata {
    path: string;
    bytes: number;
    contentType: string | null;
}

interface ExportFilePlan {
    command: string;
    adapter: string | null;
    adapterSelection: CommandAdapterSelection;
    contract: ExportFileContract;
    artifact: ExportFileContract["artifact"];
    fileId: string | null;
    name: string;
    libraryMode: ExportFileLibraryMode;
    output: string | null;
    dryRun: boolean;
    status: string;
    backendRpc: {
        uri: string;
        endpoint: string;
        method: "POST";
        requestContentType: "application/json";
        responseContentType: "text/event-stream";
        command: "export-binfile";
        transport: "sse";
        response: "resource-uri";
        request: ExportFileContract["backendRpc"]["request"];
    };
    requires: string[];
    nextActions: string[];
    diagnostics: Record<string, unknown>;
}

interface ExportFileResult {
    command: string;
    adapter: string | null;
    adapterSelection: CommandAdapterSelection;
    artifact: ExportFileContract["artifact"];
    fileId: string;
    libraryMode: ExportFileLibraryMode;
    output: string | null;
    backendRpc: ExportFilePlan["backendRpc"];
    resource: Record<string, unknown>;
    downloadedResource?: DownloadedResourceMetadata;
}

type RenderThumbnailPlan = RenderThumbnailRendererServicePlan & {
    adapterSelection: CommandAdapterSelection;
    dryRun: boolean;
    output: string | null;
};

type ShapeCreateKind = "frame" | "rect" | "text";
type ShapeLayoutType = "none" | "flex" | "grid";
type ShapeLayoutDirection = "row" | "row-reverse" | "column" | "column-reverse";
type ShapeLayoutWrap = "wrap" | "nowrap";
type ShapeLayoutAlignItems = "start" | "end" | "center" | "stretch";
type ShapeLayoutTrackType = "percent" | "flex" | "auto" | "fixed";
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
    justifyItems?: ShapeLayoutAlignItems;
    alignContent?: ShapeLayoutJustifyContent;
    justifyContent?: ShapeLayoutJustifyContent;
    rowGap?: number;
    columnGap?: number;
    padding?: number;
    rows?: Array<{ type: ShapeLayoutTrackType; value?: number }>;
    columns?: Array<{ type: ShapeLayoutTrackType; value?: number }>;
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

interface ShapeImageCreateParams {
    fileId: string;
    pageId: string;
    imagePath: string;
    mimeType: string;
    x: number;
    y: number;
    width?: number;
    height?: number;
    shapeId?: string;
    parentId?: string;
    name?: string;
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

type ShapeUpdateMode = "update" | "set-layout" | "set-style";

interface ShapeUpdateParseOptions {
    command: string;
    mode: ShapeUpdateMode;
}

interface ShapeDeleteParams {
    fileId: string;
    shapeId: string;
    pageId?: string;
}

type PrototypeTrigger = "click" | "mouse-enter" | "mouse-leave" | "after-delay";
type PrototypeAnimationType = "dissolve" | "slide" | "push";
type PrototypeAnimationEasing = "linear" | "ease" | "ease-in" | "ease-out" | "ease-in-out";
type PrototypeAnimationDirection = "right" | "left" | "up" | "down";
type PrototypeAnimationWay = "in" | "out";
type PrototypeOverlayActionType = "open-overlay" | "toggle-overlay" | "close-overlay";
type PrototypeOverlayPositionType =
    | "center"
    | "manual"
    | "top-left"
    | "top-right"
    | "top-center"
    | "bottom-left"
    | "bottom-right"
    | "bottom-center";

interface PrototypeAnimationParams {
    type: PrototypeAnimationType;
    duration: number;
    easing?: PrototypeAnimationEasing;
    direction?: PrototypeAnimationDirection;
    way?: PrototypeAnimationWay;
    offsetEffect?: boolean;
}

interface PrototypeFlowParams {
    fileId: string;
    name: string;
    startingBoardId: string;
    pageId?: string;
    flowId?: string;
}

interface PrototypeInteractionParams {
    fileId: string;
    sourceShapeId: string;
    destinationBoardId: string;
    pageId?: string;
    trigger?: PrototypeTrigger;
    delay?: number;
    preserveScrollPosition?: boolean;
    animation?: PrototypeAnimationParams;
}

interface PrototypePoint extends Record<string, unknown> {
    x: number;
    y: number;
}

interface PrototypeOverlayParams {
    fileId: string;
    pageId: string;
    sourceShapeId: string;
    actionType: PrototypeOverlayActionType;
    destinationBoardId?: string;
    relativeToShapeId?: string;
    overlayPositionType?: PrototypeOverlayPositionType;
    manualPosition?: PrototypePoint;
    closeClickOutside?: boolean;
    backgroundOverlay?: boolean;
    trigger?: PrototypeTrigger;
    delay?: number;
    animation?: PrototypeAnimationParams;
}

interface PrototypeListInteractionsParams {
    fileId: string;
    pageId?: string;
    flowId?: string;
    sourceShapeId?: string;
}

interface PrototypeDeleteInteractionParams {
    fileId: string;
    pageId?: string;
    interactionId?: string;
    sourceShapeId?: string;
    interactionIndex?: number;
}

interface PrototypeUpdateInteractionParams extends PrototypeDeleteInteractionParams {
    destinationBoardId?: string;
    relativeToShapeId?: string;
    overlayPositionType?: PrototypeOverlayPositionType;
    manualPosition?: PrototypePoint;
    closeClickOutside?: boolean;
    backgroundOverlay?: boolean;
    trigger?: PrototypeTrigger;
    delay?: number;
    preserveScrollPosition?: boolean;
    animation?: PrototypeAnimationParams;
}

interface PrototypeReorderInteractionParams extends PrototypeDeleteInteractionParams {
    toIndex: number;
}

interface PrototypeDuplicateInteractionParams extends PrototypeDeleteInteractionParams {
    insertionIndex?: number;
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

function findOptionName(args: string[], names: string[]): string | undefined {
    return args.find((arg) => names.some((name) => arg === name || arg.startsWith(`${name}=`)));
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

function readBooleanConfigWithSource(
    flagValue: string | undefined,
    envValue: string | undefined,
    profileValue: boolean | undefined,
    fallback: boolean
): { value: boolean; source: McpFieldSource } {
    if (flagValue !== undefined) {
        return { value: readBooleanConfig(flagValue, fallback), source: "flag" };
    }
    if (envValue !== undefined) {
        return { value: readBooleanConfig(envValue, fallback), source: "env" };
    }
    if (profileValue !== undefined) {
        return { value: profileValue, source: "profile" };
    }
    return { value: fallback, source: "default" };
}

function normalizeMcpProfileSource(value: string | undefined): McpProfileSource | null {
    switch (value) {
        case undefined:
        case "off":
            return "off";
        case "auto":
        case "backend":
            return value;
        default:
            return null;
    }
}

function readMcpProfileSource(args: string[], env: NodeJS.ProcessEnv): McpProfileSource | null {
    return normalizeMcpProfileSource(readOption(args, ["--profile-source"]) ?? env.PENPOT_MCP_PROFILE_SOURCE);
}

function readStringConfigWithSource(
    flagValue: string | undefined,
    envValue: string | undefined,
    profileValue: string | undefined,
    fallbackValue: string,
    fallbackSource: McpFieldSource = "default"
): { value: string; source: McpFieldSource } {
    if (flagValue !== undefined) {
        return { value: flagValue, source: "flag" };
    }
    if (envValue !== undefined) {
        return { value: envValue, source: "env" };
    }
    if (profileValue !== undefined) {
        return { value: profileValue, source: "profile" };
    }
    return { value: fallbackValue, source: fallbackSource };
}

function normalizeMcpProfileConfig(value: unknown): McpProfileConfigInput {
    const record = asRecord(value);
    const config: McpProfileConfigInput = {};
    if (
        typeof record.mode === "string" &&
        ["built-in", "builtin", "custom", "local"].includes(record.mode)
    ) {
        config.mode = normalizeMcpMode(record.mode);
    }
    if (typeof record["auto-connect"] === "boolean") {
        config["auto-connect"] = record["auto-connect"];
    }

    const urlKeys = ["public-uri", "stream-uri", "sse-uri", "websocket-uri", "status-uri"] as const;
    for (const key of urlKeys) {
        const rawValue = record[key];
        if (typeof rawValue === "string" && rawValue.trim()) {
            config[key] = rawValue.trim();
        }
    }

    return config;
}

function getMcpConfig(
    args: string[],
    env: NodeJS.ProcessEnv,
    options: {
        allowModeAlias?: boolean;
        profileConfig?: McpProfileConfigInput;
        configSource?: McpConfigSource;
    } = {}
): McpConfig {
    const modeOptionNames = options.allowModeAlias ? ["--mode", "--mcp-mode"] : ["--mcp-mode"];
    const profileConfig = options.profileConfig ?? {};
    const modeFlag = readOption(args, modeOptionNames);
    const modeEnv = env.PENPOT_MCP_MODE;
    const modeSource =
        modeFlag !== undefined ? "flag" : modeEnv !== undefined ? "env" : profileConfig.mode ? "profile" : "default";
    const mode = normalizeMcpMode(modeFlag ?? modeEnv ?? profileConfig.mode);
    const profileUrlConfig: McpProfileConfigInput = mode === "builtin" ? {} : profileConfig;
    const autoConnect = readBooleanConfigWithSource(
        readOption(args, ["--auto-connect"]),
        env.PENPOT_MCP_AUTO_CONNECT,
        profileConfig["auto-connect"],
        true
    );
    const defaultPublicUri = mode === "local" ? DEFAULT_LOCAL_MCP_PUBLIC_URI : DEFAULT_PUBLIC_URI;
    const publicUriConfig = readStringConfigWithSource(
        readOption(args, ["--public-uri"]),
        env.PENPOT_MCP_PUBLIC_URI,
        profileUrlConfig["public-uri"],
        defaultPublicUri
    );
    const publicUri = trimTrailingSlash(publicUriConfig.value);
    const streamUri = readStringConfigWithSource(
        readOption(args, ["--stream-uri"]),
        env.PENPOT_MCP_STREAM_URI,
        profileUrlConfig["stream-uri"],
        mode === "local" ? DEFAULT_LOCAL_MCP_STREAM_URI : appendPath(publicUri, "/mcp/stream"),
        "derived"
    );
    const sseUri = readStringConfigWithSource(
        readOption(args, ["--sse-uri"]),
        env.PENPOT_MCP_SSE_URI,
        profileUrlConfig["sse-uri"],
        mode === "local" ? DEFAULT_LOCAL_MCP_SSE_URI : appendPath(publicUri, "/mcp/sse"),
        "derived"
    );
    const websocketUri = readStringConfigWithSource(
        readOption(args, ["--websocket-uri", "--ws-uri"]),
        env.PENPOT_MCP_WEBSOCKET_URI,
        profileUrlConfig["websocket-uri"],
        mode === "local" ? DEFAULT_LOCAL_MCP_WEBSOCKET_URI : appendPath(publicUri, "/mcp/ws"),
        "derived"
    );
    const statusUri = readStringConfigWithSource(
        readOption(args, ["--status-uri", "--url"]),
        env.PENPOT_MCP_STATUS_URI,
        profileUrlConfig["status-uri"],
        mode === "local" ? DEFAULT_LOCAL_MCP_STATUS_URI : appendPath(publicUri, "/mcp/status"),
        "derived"
    );
    const logDirFlag = readOption(args, ["--dir", "--log-dir"]);
    const logDir = logDirFlag ?? env.PENPOT_MCP_LOG_DIR ?? null;
    const logDirSource = logDirFlag !== undefined ? "flag" : env.PENPOT_MCP_LOG_DIR !== undefined ? "env" : "unset";
    const configSource = options.configSource ?? {
        profileSource: "off",
        status: "disabled",
        backendUri: null,
        profileId: null,
        warnings: [],
    };

    return {
        mode,
        autoConnect: autoConnect.value,
        publicUri,
        streamUri: streamUri.value,
        sseUri: sseUri.value,
        websocketUri: websocketUri.value,
        statusUri: statusUri.value,
        logDir,
        profileProps: {
            "mcp-config": {
                mode,
                "auto-connect": autoConnect.value,
                "public-uri": publicUri,
                "stream-uri": streamUri.value,
                "sse-uri": sseUri.value,
                "websocket-uri": websocketUri.value,
                "status-uri": statusUri.value,
            },
        },
        configSource,
        fieldSources: {
            mode: modeSource,
            autoConnect: autoConnect.source,
            publicUri: publicUriConfig.source,
            streamUri: streamUri.source,
            sseUri: sseUri.source,
            websocketUri: websocketUri.source,
            statusUri: statusUri.source,
            logDir: logDirSource,
        },
    };
}

function getRpcConfig(args: string[], env: NodeJS.ProcessEnv): RpcConfig {
    return {
        backendUri: trimTrailingSlash(
            readOption(args, ["--backend-uri"]) ??
                env.PENPOT_BACKEND_URI ??
                env.PENPOT_PUBLIC_URI ??
                DEFAULT_BACKEND_URI
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

function getRendererServiceUri(args: string[], env: NodeJS.ProcessEnv): string {
    return trimTrailingSlash(
        readOption(args, ["--renderer-service-uri", "--renderer-uri"]) ??
            env.PENPOT_RENDERER_SERVICE_URI ??
            DEFAULT_RENDERER_SERVICE_URI
    );
}

function readRequestedAdapter(args: string[]): RequestedCommandAdapter | string {
    const adapter = readOption(args, ["--adapter"]);
    switch (adapter) {
        case undefined:
            return "auto";
        case "auto":
        case "backend-rpc":
        case "backend-command":
        case "renderer-service":
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

function selectCliExporterAdapter(command: string, args: string[]): CommandAdapterSelection {
    return selectCommandAdapter({
        command,
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

function selectCliExportFileAdapter(command: string, args: string[]): CommandAdapterSelection {
    return selectCommandAdapter({
        command,
        requestedAdapter: readRequestedAdapter(args),
        candidates: [
            { kind: "backend-rpc", available: true, priority: 10 },
            {
                kind: "exporter",
                available: false,
                priority: 20,
                reason: "export.file uses backend export-binfile; exporter export-shapes is only for page/object rendering.",
            },
            {
                kind: "plugin-live",
                available: false,
                priority: 50,
                reason: getAdapterSelectionReason(AdapterSelectionReasonCodes.CLI_EXPORT_PLUGIN_LIVE_UNSUPPORTED),
            },
        ],
    });
}

function selectCliRenderThumbnailAdapter(command: string, args: string[]): CommandAdapterSelection {
    return selectCommandAdapter({
        command,
        requestedAdapter: readRequestedAdapter(args),
        candidates: [
            { kind: "renderer-service", available: true, priority: 15 },
            {
                kind: "exporter",
                available: false,
                priority: 20,
                reason: "render.thumbnail uses dashboard thumbnail data/cache semantics, not exporter export-shapes.",
            },
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

function selectCliPrototypeAdapter(command: string, args: string[]): CommandAdapterSelection {
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

function createWorkspaceUrl(args: string[], env: NodeJS.ProcessEnv, fileId: string): string {
    const publicUri = trimTrailingSlash(
        readOption(args, ["--public-uri"]) ?? env.PENPOT_PUBLIC_URI ?? env.PENPOT_MCP_PUBLIC_URI ?? DEFAULT_PUBLIC_URI
    );
    return createCommandWorkspaceUrl({
        publicUri,
        fileId,
        teamId: readOption(args, ["--team-id"]),
        pageId: readOption(args, ["--page-id", "--page"]),
    });
}

function createDevServicePlans(mode: string, config: McpConfig, backendUri: string, exporterUri: string): DevServicePlan[] {
    const pluginManifestUri = appendPath(config.publicUri, "/plugins/mcp/manifest.json");
    const services: DevServicePlan[] = [
        {
            name: "public-gateway",
            kind: "gateway",
            mode: "all",
            required: true,
            command: null,
            surfaces: [config.publicUri, config.streamUri, config.sseUri, config.websocketUri, config.statusUri],
            ports: readPortsFromUrls([config.publicUri, config.streamUri, config.sseUri, config.websocketUri, config.statusUri]),
            status: mode === "devenv" ? "delegated" : "planned",
        },
        {
            name: "mcp-plugin-assets",
            kind: "static-assets",
            mode: "all",
            required: true,
            command: "pnpm --dir mcp/packages/plugin build",
            surfaces: [pluginManifestUri, DEFAULT_PLUGIN_PREVIEW_URI],
            ports: readPortsFromUrls([pluginManifestUri, DEFAULT_PLUGIN_PREVIEW_URI]),
            status: mode === "devenv" ? "delegated" : "planned",
        },
    ];

    if (mode === "devenv") {
        services.push({
            name: "devenv-dependencies",
            kind: "devenv",
            mode: "devenv",
            required: true,
            command: "./manage.sh start-devenv",
            surfaces: [backendUri, exporterUri, DEFAULT_LOCAL_MCP_STATUS_URI],
            ports: readPortsFromUrls([backendUri, exporterUri, DEFAULT_LOCAL_MCP_STATUS_URI, DEFAULT_LOCAL_MCP_WEBSOCKET_URI]),
            status: "delegated",
        });
        services.push({
            name: "devenv-workspace",
            kind: "devenv",
            mode: "devenv",
            required: true,
            command: "./manage.sh run-devenv",
            surfaces: [config.publicUri],
            ports: readPortsFromUrls([config.publicUri]),
            status: "delegated",
        });
        return services;
    }

    services.push(
        {
            name: "frontend-watch",
            kind: "host-process",
            mode: mode === "hybrid" ? "hybrid" : "host",
            required: true,
            command: "pnpm --dir frontend watch",
            surfaces: [config.publicUri],
            ports: readPortsFromUrls([config.publicUri]),
            status: "unsupported",
        },
        {
            name: "backend-api",
            kind: mode === "hybrid" ? "docker-dependency" : "host-process",
            mode: mode === "hybrid" ? "hybrid" : "host",
            required: true,
            command: mode === "hybrid" ? "./manage.sh start-devenv" : "backend development server",
            surfaces: [backendUri],
            ports: readPortsFromUrls([backendUri]),
            status: "unsupported",
        },
        {
            name: "exporter",
            kind: mode === "hybrid" ? "docker-dependency" : "host-process",
            mode: mode === "hybrid" ? "hybrid" : "host",
            required: true,
            command: mode === "hybrid" ? "./manage.sh start-devenv" : "pnpm --dir exporter watch",
            surfaces: [exporterUri],
            ports: readPortsFromUrls([exporterUri]),
            status: "unsupported",
        },
        {
            name: "mcp-server",
            kind: "host-process",
            mode: mode === "hybrid" ? "hybrid" : "host",
            required: true,
            command: "pnpm --dir mcp/packages/server dev",
            surfaces: [DEFAULT_LOCAL_MCP_STREAM_URI, DEFAULT_LOCAL_MCP_SSE_URI, DEFAULT_LOCAL_MCP_WEBSOCKET_URI, DEFAULT_LOCAL_MCP_STATUS_URI],
            ports: readPortsFromUrls([
                DEFAULT_LOCAL_MCP_STREAM_URI,
                DEFAULT_LOCAL_MCP_SSE_URI,
                DEFAULT_LOCAL_MCP_WEBSOCKET_URI,
                DEFAULT_LOCAL_MCP_STATUS_URI,
            ]),
            status: "unsupported",
        }
    );

    return services;
}

async function getDevDependencyChecks(mode: string, env: NodeJS.ProcessEnv): Promise<DevDependencyCheck[]> {
    const dependencyTargets: Array<{
        name: string;
        kind: "command" | "file";
        target: string;
        modes: string[];
        detail: string;
    }> = [
        {
            name: "manage.sh",
            kind: "file",
            target: resolve("manage.sh"),
            modes: ["devenv", "hybrid"],
            detail: "Required to delegate Docker/devenv dependency startup.",
        },
        {
            name: "docker",
            kind: "command",
            target: "docker",
            modes: ["devenv", "hybrid"],
            detail: "Required for Docker devenv dependencies.",
        },
        {
            name: "node",
            kind: "command",
            target: "node",
            modes: ["host", "hybrid"],
            detail: "Required for host frontend, MCP server, plugin, and CLI package scripts.",
        },
        {
            name: "pnpm",
            kind: "command",
            target: "pnpm",
            modes: ["host", "hybrid"],
            detail: "Required for host package scripts and MCP plugin builds.",
        },
        {
            name: "clojure",
            kind: "command",
            target: "clojure",
            modes: ["host"],
            detail: "Required before host-native backend/exporter startup can be enabled.",
        },
    ];

    const checks = await Promise.all(
        dependencyTargets
            .filter((dependency) => dependency.modes.includes(mode))
            .map(async (dependency) => {
                const available =
                    dependency.kind === "file"
                        ? await canExecute(dependency.target)
                        : await commandExists(dependency.target, env);
                return {
                    ...dependency,
                    required: true,
                    status: available ? "available" : "missing",
                } satisfies DevDependencyCheck;
            })
    );

    return checks;
}

function readPortsFromUrls(urls: string[]): number[] {
    const ports = new Set<number>();
    for (const url of urls) {
        const endpoint = parseUrlEndpoint("service", url);
        if (endpoint) {
            ports.add(endpoint.port);
        }
    }
    return [...ports].sort((left, right) => left - right);
}

function parseUrlEndpoint(name: string, url: string): { name: string; host: string; port: number; url: string } | null {
    try {
        const parsed = new URL(url);
        const defaultPort = parsed.protocol === "https:" || parsed.protocol === "wss:" ? 443 : 80;
        const port = parsed.port ? Number(parsed.port) : defaultPort;
        if (!Number.isFinite(port)) {
            return null;
        }
        return {
            name,
            host: parsed.hostname || "localhost",
            port,
            url,
        };
    } catch {
        return null;
    }
}

async function checkTcpPort(host: string, port: number): Promise<DevPortCheck["status"]> {
    return await new Promise((resolvePort) => {
        let settled = false;
        const socket = createConnection({ host, port });
        const settle = (status: DevPortCheck["status"]) => {
            if (settled) {
                return;
            }
            settled = true;
            socket.destroy();
            resolvePort(status);
        };

        socket.setTimeout(250);
        socket.on("connect", () => settle("listening"));
        socket.on("timeout", () => settle("unknown"));
        socket.on("error", (error: NodeJS.ErrnoException) => {
            settle(error.code === "ECONNREFUSED" ? "available" : "unknown");
        });
    });
}

async function getDevPortChecks(config: McpConfig, backendUri: string, exporterUri: string): Promise<DevPortCheck[]> {
    const endpoints = [
        parseUrlEndpoint("frontend", config.publicUri),
        parseUrlEndpoint("backend", backendUri),
        parseUrlEndpoint("exporter", exporterUri),
        parseUrlEndpoint("mcpHttpInternal", DEFAULT_LOCAL_MCP_STATUS_URI),
        parseUrlEndpoint("mcpWebSocketInternal", DEFAULT_LOCAL_MCP_WEBSOCKET_URI),
        parseUrlEndpoint("pluginPreview", DEFAULT_PLUGIN_PREVIEW_URI),
    ].filter((endpoint): endpoint is { name: string; host: string; port: number; url: string } => endpoint !== null);

    const uniqueEndpoints = new Map<string, { name: string; host: string; port: number; url: string }>();
    for (const endpoint of endpoints) {
        uniqueEndpoints.set(`${endpoint.host}:${endpoint.port}:${endpoint.name}`, endpoint);
    }

    return await Promise.all(
        [...uniqueEndpoints.values()].map(async (endpoint) => {
            const status = await checkTcpPort(endpoint.host, endpoint.port);
            return {
                ...endpoint,
                required: true,
                status,
                detail:
                    status === "listening"
                        ? "A process is already listening on this host/port."
                        : status === "available"
                          ? "No TCP listener was detected during dry-run planning."
                          : "Port ownership could not be confirmed during dry-run planning.",
            } satisfies DevPortCheck;
        })
    );
}

function getDevStartupBoundaries(mode: string): DevStartupBoundary[] {
    if (mode === "devenv") {
        return [
            {
                mode,
                status: "supported",
                detail: "Only Docker/devenv dependency startup is supported; interactive app processes still use ./manage.sh run-devenv.",
                nextActions: ["Run penpot-cli dev up --mcp --mode devenv", "Then run ./manage.sh run-devenv for the interactive development shell."],
            },
        ];
    }

    return [
        {
            mode,
            status: "planning_only",
            detail: `${mode} startup remains disabled until dependency and port checks become enforced preflight gates.`,
            nextActions: [
                "Use --dry-run to inspect the host/hybrid service plan.",
                "Use --mode devenv for the only supported startup path.",
            ],
        },
    ];
}

async function getDevPlan(args: string[], env: NodeJS.ProcessEnv, dryRun: boolean): Promise<DevPlan> {
    const config = getMcpConfig(args, env);
    const mode = readOption(args, ["--mode"]) ?? "devenv";
    const backendUri = getRpcConfig(args, env).backendUri;
    const exporterUri = getExporterUri(args, env);
    const services = createDevServicePlans(mode, config, backendUri, exporterUri);

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
                : services
                      .filter((service) => service.mode === mode || service.mode === "all")
                      .map((service) => service.command)
                      .filter((command): command is string => command !== null),
        surfaces: {
            frontend: config.publicUri,
            backend: backendUri,
            exporter: exporterUri,
            mcpStream: config.streamUri,
            mcpSse: config.sseUri,
            mcpWebSocket: config.websocketUri,
            mcpStatus: config.statusUri,
            mcpPluginManifest: appendPath(config.publicUri, "/plugins/mcp/manifest.json"),
        },
        services,
        dependencyChecks: await getDevDependencyChecks(mode, env),
        portChecks: await getDevPortChecks(config, backendUri, exporterUri),
        startupBoundaries: getDevStartupBoundaries(mode),
        readinessChecks: [
            "GET /api/health or the available backend health endpoint",
            `GET ${config.statusUri}`,
            `${config.publicUri}/plugins/mcp/manifest.json`,
        ],
    };
}

function mimeTypeForExportFormat(format: string): string {
    switch (format) {
        case "png":
            return "image/png";
        case "jpeg":
            return "image/jpeg";
        case "svg":
            return "image/svg+xml";
        case "pdf":
            return "application/pdf";
        default:
            return "application/octet-stream";
    }
}

function createExporterArtifactPlan(
    args: string[],
    env: NodeJS.ProcessEnv,
    options: {
        command: string;
        artifactKind: ExportArtifactKind;
        defaultName: string;
        defaultFormat: string;
        allowExportFormat: boolean;
        outputMode: string;
    }
): ExportPagePlan {
    const fileId = readOption(args, ["--file", "--file-id"]) ?? null;
    const pageId = readOption(args, ["--page", "--page-id"]) ?? null;
    const objectId = readOption(args, ["--object", "--object-id", "--frame", "--frame-id"]) ?? null;
    const profileId = readOption(args, ["--profile-id"]) ?? env.PENPOT_PROFILE_ID ?? null;
    const scaleValue = readOption(args, ["--scale"]);
    const exportFormat = options.allowExportFormat
        ? (readOption(args, ["--export-format"]) ?? options.defaultFormat)
        : options.defaultFormat;
    const scale = scaleValue ? Number(scaleValue) : 1;
    const name = readOption(args, ["--name"])?.trim() || options.defaultName;
    const suffix = readOption(args, ["--suffix"]) ?? "";
    const skipChildren = hasFlag(args, "--skip-children");
    const output = readOption(args, ["--output"]) ?? null;
    const exporterUri = getExporterUri(args, env);
    const adapterSelection = selectCliExporterAdapter(options.command, args);
    const requires = [
        fileId ? null : "fileId",
        pageId ? null : "pageId",
        objectId ? null : "objectId",
        profileId ? null : "profileId",
    ].filter((value): value is string => typeof value === "string");

    return {
        command: options.command,
        adapter: adapterSelection.selected,
        adapterSelection,
        artifact: {
            kind: options.artifactKind,
            format: exportFormat,
            mimeType: mimeTypeForExportFormat(exportFormat),
            name,
            scale,
            target: { fileId, pageId, objectId },
            output,
        },
        fileId,
        pageId,
        objectId,
        profileId,
        name,
        exportFormat,
        scale,
        suffix,
        skipChildren,
        output,
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
            `Run without --dry-run to call the exporter; pass --output <path> to download the ${options.artifactKind} bytes.`,
        ],
        diagnostics: {
            transitKeywordFields: ["cmd", "exports[].type"],
            authCookie: "auth-token",
            outputMode: options.outputMode,
            profileResolution: "profile-id option, PENPOT_PROFILE_ID, or backend get-profile with an auth-token/session token",
        },
    };
}

function createExportPagePlan(args: string[], env: NodeJS.ProcessEnv): ExportPagePlan {
    return createExporterArtifactPlan(args, env, {
        command: CommandDescriptors.EXPORT_PAGE.id,
        artifactKind: "export",
        defaultName: "page",
        defaultFormat: "png",
        allowExportFormat: true,
        outputMode: "exporter-resource-upload",
    });
}

function createRenderPreviewPlan(args: string[], env: NodeJS.ProcessEnv): ExportPagePlan {
    return createExporterArtifactPlan(args, env, {
        command: CommandDescriptors.RENDER_PREVIEW.id,
        artifactKind: "preview",
        defaultName: "preview",
        defaultFormat: "png",
        allowExportFormat: false,
        outputMode: "exporter-preview-resource-upload",
    });
}

function createRenderThumbnailPlan(args: string[], env: NodeJS.ProcessEnv): RenderThumbnailPlan {
    const adapterSelection = selectCliRenderThumbnailAdapter(CommandDescriptors.RENDER_THUMBNAIL.id, args);
    const endpoint = getRendererServiceUri(args, env);
    const publicUri =
        readOption(args, ["--public-uri"]) ??
        env.PENPOT_PUBLIC_URI ??
        env.PENPOT_MCP_PUBLIC_URI ??
        DEFAULT_PUBLIC_URI;
    const plan = createRenderThumbnailRendererServicePlan({
        fileId: readOption(args, ["--file", "--file-id"]) ?? null,
        pageId: readOption(args, ["--page", "--page-id"]) ?? null,
        objectId: readOption(args, ["--object", "--object-id", "--frame", "--frame-id", "--shape", "--shape-id"]) ?? null,
        target: readOption(args, ["--target", "--type"]),
        tag: readOption(args, ["--tag"]) ?? null,
        revn: readOption(args, ["--revn", "--revision"]),
        width: readOption(args, ["--width", "--size"]),
        cachePolicy: readOption(args, ["--cache-policy", "--cache"]),
        format: readOption(args, ["--export-format", "--format-thumbnail"]),
        output: readOption(args, ["--output"]) ?? null,
        endpoint,
        publicUri,
        probeTimeoutMs:
            readOption(args, ["--renderer-timeout-ms", "--renderer-service-timeout-ms", "--probe-timeout-ms"]) ??
            env.PENPOT_RENDERER_SERVICE_TIMEOUT_MS ??
            null,
        clientRequest: {
            entrypoint: "cli",
            cliCommand: "render thumbnail",
        },
        executionGate: {
            optInValue:
                readOption(args, ["--render-thumbnail-execution", "--renderer-service-execution", "--thumbnail-execution"]) ??
                env.PENPOT_RENDER_THUMBNAIL_EXECUTION ??
                null,
        },
        optInConfiguration: {
            entrypoint: "cli",
            cliFlagValue: readOption(args, [
                "--render-thumbnail-execution",
                "--renderer-service-execution",
                "--thumbnail-execution",
            ]) ?? null,
            envValue: env.PENPOT_RENDER_THUMBNAIL_EXECUTION ?? null,
        },
    });

    return {
        ...plan,
        adapterSelection,
        dryRun: hasFlag(args, "--dry-run"),
        output: plan.artifact.output,
    };
}

function readExportFileLibraryMode(args: string[]): ExportFileLibraryMode | undefined {
    const explicit = readOption(args, ["--library-mode", "--type"]);
    if (explicit) {
        return explicit as ExportFileLibraryMode;
    }
    if (hasFlag(args, "--embed-assets") || hasFlag(args, "--merge-assets")) {
        return "merge";
    }
    if (hasFlag(args, "--detach-libraries") || hasFlag(args, "--detach")) {
        return "detach";
    }
    if (hasFlag(args, "--include-libraries")) {
        return "all";
    }
    return undefined;
}

function createExportFilePlan(args: string[], env: NodeJS.ProcessEnv): ExportFilePlan {
    const fileId = readOption(args, ["--file", "--file-id"]) ?? null;
    const output = readOption(args, ["--output"]) ?? null;
    const name = readOption(args, ["--name"])?.trim() || "file";
    const format = readOption(args, ["--export-format", "--file-format"]) ?? "penpot";
    const libraryMode = readExportFileLibraryMode(args);
    const contract = createExportFileContract({
        fileId,
        format,
        libraryMode,
        includeLibraries: hasFlag(args, "--include-libraries") ? true : undefined,
        embedAssets: hasFlag(args, "--embed-assets") || hasFlag(args, "--merge-assets") ? true : undefined,
        output,
        name,
    });
    const rpc = getRpcConfig(args, env);
    const adapterSelection = selectCliExportFileAdapter(CommandDescriptors.EXPORT_FILE.id, args);

    return {
        command: CommandDescriptors.EXPORT_FILE.id,
        adapter: adapterSelection.selected,
        adapterSelection,
        contract,
        artifact: contract.artifact,
        fileId,
        name,
        libraryMode: contract.artifact.libraryMode,
        output,
        dryRun: hasFlag(args, "--dry-run"),
        status: "planned",
        backendRpc: {
            uri: rpc.backendUri,
            endpoint: createRpcUrl(rpc.backendUri, contract.backendRpc.command).toString(),
            method: "POST",
            requestContentType: "application/json",
            responseContentType: "text/event-stream",
            command: contract.backendRpc.command,
            transport: contract.backendRpc.transport,
            response: contract.backendRpc.response,
            request: contract.backendRpc.request,
        },
        requires: contract.requires,
        nextActions: [
            "Pass --token with a Penpot auth-token/session token before executing the export.",
            "Run without --dry-run to call backend export-binfile and receive a resource URI.",
            "Pass --output <path> to download the returned .penpot resource.",
        ],
        diagnostics: {
            ...contract.diagnostics,
            outputMode: "backend-rpc-sse-resource-uri",
            authHeader: "Token",
            downloadAuthCookie: "auth-token",
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

const IMAGE_MIME_TYPES: Record<string, string> = {
    ".gif": "image/gif",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
};
const IMAGE_MIME_ALIASES: Record<string, string> = {
    "image/jpg": "image/jpeg",
};

function inferImageMimeType(path: string): string | undefined {
    return IMAGE_MIME_TYPES[extname(path).toLowerCase()];
}

function readImageMimeType(args: string[], imagePath: string, io: CliIO, format: Format): string | null {
    const rawMimeType = readOption(args, ["--mime-type", "--mtype"]) ?? inferImageMimeType(imagePath);
    const mimeType = rawMimeType ? (IMAGE_MIME_ALIASES[rawMimeType] ?? rawMimeType) : undefined;
    if (!mimeType) {
        writeError(io, format, "image_mime_type_required", "shape create-image requires --mime-type for this file.", [
            "Use --mime-type image/png, image/jpeg, image/webp, image/gif, or image/svg+xml.",
        ]);
        return null;
    }
    if (!Object.values(IMAGE_MIME_TYPES).includes(mimeType)) {
        writeError(io, format, "image_mime_type_invalid", `Unsupported image MIME type: ${mimeType}.`, [
            "Use image/png, image/jpeg, image/webp, image/gif, or image/svg+xml.",
        ]);
        return null;
    }
    return mimeType;
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

function parseShapeGridTracks(
    args: string[],
    names: string[],
    optionName: string,
    io: CliIO,
    format: Format
): Array<{ type: ShapeLayoutTrackType; value?: number }> | null | undefined {
    const rawValues = readOptions(args, names).flatMap((value) =>
        value
            .split(",")
            .map((part) => part.trim())
            .filter(Boolean)
    );
    if (rawValues.length === 0) {
        return undefined;
    }

    const tracks: Array<{ type: ShapeLayoutTrackType; value?: number }> = [];
    for (const rawValue of rawValues) {
        const [type, valueText, extra] = rawValue.split(":");
        if (
            extra !== undefined ||
            !["percent", "flex", "auto", "fixed"].includes(type) ||
            (valueText !== undefined && valueText.trim() === "")
        ) {
            writeError(io, format, "shape_layout_grid_track_invalid", `Invalid ${optionName} track: ${rawValue}.`, [
                "Use tracks like fixed:120, flex:1, percent:50, or auto.",
            ]);
            return null;
        }

        const track: { type: ShapeLayoutTrackType; value?: number } = { type: type as ShapeLayoutTrackType };
        if (valueText !== undefined) {
            const value = Number(valueText);
            if (!Number.isFinite(value) || value < 0 || value > 10000) {
                writeError(io, format, "shape_layout_grid_track_invalid", `Invalid ${optionName} value: ${valueText}.`, [
                    "Pass grid track values from 0 to 10000.",
                ]);
                return null;
            }
            track.value = value;
        }
        tracks.push(track);
    }

    return tracks;
}

const SHAPE_LAYOUT_OPTION_NAMES = [
    "--layout",
    "--layout-type",
    "--layout-direction",
    "--layout-wrap",
    "--layout-align-items",
    "--layout-justify-items",
    "--layout-align-content",
    "--layout-justify-content",
    "--layout-gap",
    "--layout-row-gap",
    "--layout-column-gap",
    "--layout-padding",
    "--layout-grid-direction",
    "--layout-grid-rows",
    "--layout-grid-columns",
    "--grid-rows",
    "--grid-columns",
];

const SHAPE_STYLE_OPTION_NAMES = [
    "--fill",
    "--fill-color",
    "--fill-opacity",
    "--stroke",
    "--stroke-color",
    "--stroke-opacity",
    "--stroke-width",
    "--stroke-style",
    "--stroke-alignment",
    "--border-radius",
    "--radius",
    "--r1",
    "--r2",
    "--r3",
    "--r4",
    "--content",
    "--text",
    "--font-size",
];

const SHAPE_GEOMETRY_OPTION_NAMES = ["--x", "--y", "--width", "--w", "--height", "--h"];
const SHAPE_HIERARCHY_OPTION_NAMES = ["--parent", "--parent-id", "--frame", "--frame-id", "--index"];
const SHAPE_NAME_OPTION_NAMES = ["--name"];

function parseShapeLayoutParams(args: string[], io: CliIO, format: Format): ShapeLayoutParams | null | undefined {
    const hasLayoutOption = SHAPE_LAYOUT_OPTION_NAMES.some((name) => readOption(args, [name]) !== undefined);
    if (!hasLayoutOption) {
        return undefined;
    }

    const type = readEnumOption(args, ["--layout", "--layout-type"], ["none", "flex", "grid"], io, format, "--layout");
    if (type === null) {
        return null;
    }
    if (!type) {
        writeError(io, format, "shape_layout_type_required", "shape update layout options require --layout <type>.", [
            "Pass --layout none, --layout flex, or --layout grid.",
        ]);
        return null;
    }

    const direction = readEnumOption(
        args,
        ["--layout-direction", "--layout-grid-direction"],
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
    const justifyItems = readEnumOption(
        args,
        ["--layout-justify-items"],
        ["start", "end", "center", "stretch"],
        io,
        format,
        "--layout-justify-items"
    );
    const alignContent = readEnumOption(
        args,
        ["--layout-align-content"],
        ["start", "center", "end", "space-between", "space-around", "space-evenly", "stretch"],
        io,
        format,
        "--layout-align-content"
    );
    const justifyContent = readEnumOption(
        args,
        ["--layout-justify-content"],
        ["start", "center", "end", "space-between", "space-around", "space-evenly", "stretch"],
        io,
        format,
        "--layout-justify-content"
    );

    if (
        direction === null ||
        wrap === null ||
        alignItems === null ||
        justifyItems === null ||
        alignContent === null ||
        justifyContent === null
    ) {
        return null;
    }
    if (type === "grid" && direction && !["row", "column"].includes(direction)) {
        writeError(io, format, "shape_layout_grid_direction_invalid", "Invalid grid layout direction.", [
            "Pass --layout-grid-direction row or --layout-grid-direction column for grid layout.",
        ]);
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

    const rows = parseShapeGridTracks(args, ["--layout-grid-rows", "--grid-rows"], "--layout-grid-rows", io, format);
    const columns = parseShapeGridTracks(
        args,
        ["--layout-grid-columns", "--grid-columns"],
        "--layout-grid-columns",
        io,
        format
    );
    if (rows === null || columns === null) {
        return null;
    }

    return {
        type,
        ...(direction ? { direction } : {}),
        ...(wrap ? { wrap } : {}),
        ...(alignItems ? { alignItems } : {}),
        ...(justifyItems ? { justifyItems } : {}),
        ...(alignContent ? { alignContent } : {}),
        ...(justifyContent ? { justifyContent } : {}),
        ...(rowGap !== undefined || gap !== undefined ? { rowGap: rowGap ?? gap } : {}),
        ...(columnGap !== undefined || gap !== undefined ? { columnGap: columnGap ?? gap } : {}),
        ...(padding !== undefined ? { padding } : {}),
        ...(rows ? { rows } : {}),
        ...(columns ? { columns } : {}),
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
        ...(layout.justifyItems ? { "justify-items": layout.justifyItems } : {}),
        ...(layout.alignContent ? { "align-content": layout.alignContent } : {}),
        ...(layout.justifyContent ? { "justify-content": layout.justifyContent } : {}),
        ...(layout.rowGap !== undefined ? { "row-gap": layout.rowGap } : {}),
        ...(layout.columnGap !== undefined ? { "column-gap": layout.columnGap } : {}),
        ...(layout.padding !== undefined ? { padding: layout.padding } : {}),
        ...(layout.rows ? { rows: layout.rows } : {}),
        ...(layout.columns ? { columns: layout.columns } : {}),
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

function parseShapeCreateImageParams(args: string[], io: CliIO, format: Format): ShapeImageCreateParams | null {
    const fileId = readOption(args, ["--file", "--file-id"]);
    if (!fileId) {
        writeError(io, format, "file_id_required", "shape create-image requires --file <file-id>.", [
            "Use penpot-cli file list first, then pass --file <file-id>.",
        ]);
        return null;
    }

    const pageId = readOption(args, ["--page", "--page-id"]);
    if (!pageId) {
        writeError(io, format, "page_id_required", "shape create-image requires --page <page-id>.", [
            "Use penpot-cli page list --file <file-id> first, then pass --page <page-id>.",
        ]);
        return null;
    }

    const imagePath = readOption(args, ["--image", "--image-path", "--input"]);
    if (!imagePath) {
        writeError(io, format, "image_path_required", "shape create-image requires --image <path>.", [
            "Pass a local PNG, JPEG, WebP, GIF, or SVG file path.",
        ]);
        return null;
    }

    const x = readNumberOption(args, ["--x"]);
    const y = readNumberOption(args, ["--y"]);
    for (const [name, value] of Object.entries({ x, y })) {
        if (value === undefined) {
            writeError(io, format, "shape_numeric_option_required", `shape create-image requires --${name} <n>.`, [
                "Pass numeric x and y values.",
            ]);
            return null;
        }
        if (!Number.isFinite(value)) {
            writeError(io, format, "shape_numeric_option_invalid", `Invalid numeric value for --${name}.`, [
                "Pass finite numeric x and y values.",
            ]);
            return null;
        }
    }

    const width = readNumberOption(args, ["--width", "--w"]);
    const height = readNumberOption(args, ["--height", "--h"]);
    for (const [name, value] of Object.entries({ width, height })) {
        if (value !== undefined && (!Number.isFinite(value) || value <= 0)) {
            writeError(io, format, "shape_numeric_option_invalid", `Invalid numeric value for --${name}.`, [
                "Pass positive finite image width and height values.",
            ]);
            return null;
        }
    }

    const mimeType = readImageMimeType(args, imagePath, io, format);
    if (!mimeType) {
        return null;
    }

    return {
        fileId,
        pageId,
        imagePath,
        mimeType,
        x: x as number,
        y: y as number,
        width,
        height,
        shapeId: readOption(args, ["--shape-id", "--id"]),
        parentId: readOption(args, ["--parent", "--parent-id", "--frame", "--frame-id"]),
        name: readOption(args, ["--name"])?.trim() || undefined,
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

function hasShapeStyleUpdateField(params: ShapeUpdateParams): boolean {
    return [
        params.fill,
        params.fills,
        params.stroke,
        params.strokes,
        params.borderRadius,
        params.r1,
        params.r2,
        params.r3,
        params.r4,
        params.content,
        params.fontSize,
    ].some((value) => value !== undefined);
}

function rejectShapeAliasOption(
    args: string[],
    names: string[],
    command: string,
    allowedDescription: string,
    io: CliIO,
    format: Format
): boolean {
    const option = findOptionName(args, names);
    if (!option) {
        return false;
    }

    writeError(io, format, "shape_alias_option_invalid", `${command} does not accept ${option}.`, [
        allowedDescription,
        "Use penpot-cli shape update when combining layout, style, geometry, hierarchy, or name changes.",
    ]);
    return true;
}

function parseShapeUpdateParams(
    args: string[],
    io: CliIO,
    format: Format,
    options: ShapeUpdateParseOptions = { command: "shape update", mode: "update" }
): ShapeUpdateParams | null {
    const fileId = requireShapeFileId(args, io, format, options.command);
    if (!fileId) {
        return null;
    }

    const shapeId = requireShapeId(args, io, format, options.command);
    if (!shapeId) {
        return null;
    }

    if (
        options.mode === "set-layout" &&
        rejectShapeAliasOption(
            args,
            [...SHAPE_STYLE_OPTION_NAMES, ...SHAPE_GEOMETRY_OPTION_NAMES, ...SHAPE_HIERARCHY_OPTION_NAMES, ...SHAPE_NAME_OPTION_NAMES],
            options.command,
            "Pass only layout options such as --layout, --layout-direction, --layout-gap, or grid track options.",
            io,
            format
        )
    ) {
        return null;
    }

    if (
        options.mode === "set-style" &&
        rejectShapeAliasOption(
            args,
            [...SHAPE_LAYOUT_OPTION_NAMES, ...SHAPE_GEOMETRY_OPTION_NAMES, ...SHAPE_HIERARCHY_OPTION_NAMES, ...SHAPE_NAME_OPTION_NAMES],
            options.command,
            "Pass only style or text options such as --fill, --stroke, --border-radius, --content, or --font-size.",
            io,
            format
        )
    ) {
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
        writeError(io, format, "shape_parent_id_required", `${options.command} requires --parent when --index is provided.`, [
            "Pass --parent <frame-id> together with --index <n>.",
        ]);
        return null;
    }

    if (options.mode === "set-layout" && !params.layout) {
        writeError(io, format, "shape_set_layout_empty", "shape set-layout requires --layout <type>.", [
            "Pass --layout none, --layout flex, or --layout grid with optional layout fields.",
        ]);
        return null;
    }

    if (options.mode === "set-style" && !hasShapeStyleUpdateField(params)) {
        writeError(io, format, "shape_set_style_empty", "shape set-style requires at least one style or text option.", [
            "Pass --fill, --stroke, --border-radius, --content, --font-size, or corner radius fields.",
        ]);
        return null;
    }

    if (options.mode === "update" && !hasShapeUpdateField(params)) {
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

function readPrototypeEnumOption<T extends string>(
    args: string[],
    names: string[],
    allowed: readonly T[],
    io: CliIO,
    format: Format,
    optionName: string
): T | null | undefined {
    const value = readOption(args, names);
    if (!value) {
        return undefined;
    }
    if ((allowed as readonly string[]).includes(value)) {
        return value as T;
    }
    writeError(io, format, "prototype_option_invalid", `Invalid ${optionName} value: ${value}.`, [
        `Expected one of: ${allowed.join(", ")}.`,
    ]);
    return null;
}

function readOptionalBooleanFlag(args: string[], names: string[]): boolean | undefined {
    const value = readOption(args, names);
    if (value !== undefined) {
        return readBooleanConfig(value, true);
    }
    return names.some((name) => hasFlag(args, name)) ? true : undefined;
}

function parsePrototypeAnimationParams(
    args: string[],
    io: CliIO,
    format: Format
): PrototypeAnimationParams | null | undefined {
    const animationOptionNames = [
        "--animation",
        "--animation-type",
        "--animation-duration",
        "--duration",
        "--animation-easing",
        "--animation-direction",
        "--animation-way",
        "--offset-effect",
    ];
    const hasAnimationOption = animationOptionNames.some((name) => readOption(args, [name]) !== undefined || hasFlag(args, name));
    if (!hasAnimationOption) {
        return undefined;
    }

    const type = readPrototypeEnumOption(
        args,
        ["--animation", "--animation-type"],
        ["dissolve", "slide", "push"],
        io,
        format,
        "--animation"
    );
    if (type === null) {
        return null;
    }
    if (!type) {
        writeError(io, format, "prototype_animation_type_required", "prototype animation options require --animation <type>.", [
            "Use --animation dissolve, --animation slide, or --animation push.",
        ]);
        return null;
    }

    const duration = readNumberOption(args, ["--animation-duration", "--duration"]);
    if (duration === undefined) {
        writeError(
            io,
            format,
            "prototype_animation_duration_required",
            "prototype animation requires --animation-duration <ms>.",
            ["Pass a duration in milliseconds from 0 to 60000."]
        );
        return null;
    }
    if (!Number.isFinite(duration) || duration < 0 || duration > 60000) {
        writeError(io, format, "prototype_numeric_option_invalid", "Invalid animation duration.", [
            "Pass a finite animation duration from 0 to 60000.",
        ]);
        return null;
    }

    const easing = readPrototypeEnumOption(
        args,
        ["--animation-easing", "--easing"],
        ["linear", "ease", "ease-in", "ease-out", "ease-in-out"],
        io,
        format,
        "--animation-easing"
    );
    const direction = readPrototypeEnumOption(
        args,
        ["--animation-direction", "--direction"],
        ["right", "left", "up", "down"],
        io,
        format,
        "--animation-direction"
    );
    const way = readPrototypeEnumOption(args, ["--animation-way", "--way"], ["in", "out"], io, format, "--animation-way");
    if (easing === null || direction === null || way === null) {
        return null;
    }

    const offsetEffect = readOptionalBooleanFlag(args, ["--offset-effect"]);

    return {
        type,
        duration,
        ...(easing ? { easing } : {}),
        ...(direction ? { direction } : {}),
        ...(way ? { way } : {}),
        ...(offsetEffect !== undefined ? { offsetEffect } : {}),
    };
}

function parsePrototypeFlowParams(args: string[], io: CliIO, format: Format): PrototypeFlowParams | null {
    const fileId = readOption(args, ["--file", "--file-id"]);
    if (!fileId) {
        writeError(io, format, "file_id_required", "prototype create-flow requires --file <file-id>.", [
            "Use penpot-cli file list first, then pass --file <file-id>.",
        ]);
        return null;
    }

    const name = readOption(args, ["--name"])?.trim();
    if (!name) {
        writeError(io, format, "prototype_name_required", "prototype create-flow requires --name <name>.", [
            "Pass a non-empty flow name.",
        ]);
        return null;
    }

    const startingBoardId = readOption(args, ["--starting-board", "--starting-board-id", "--board", "--frame"]);
    if (!startingBoardId) {
        writeError(io, format, "prototype_starting_board_required", "prototype create-flow requires --starting-board <frame-id>.", [
            "Pass the frame id that starts the prototype flow.",
        ]);
        return null;
    }

    return {
        fileId,
        name,
        startingBoardId,
        pageId: readOption(args, ["--page", "--page-id"]),
        flowId: readOption(args, ["--flow-id", "--id"]),
    };
}

function parsePrototypeInteractionParams(args: string[], io: CliIO, format: Format): PrototypeInteractionParams | null {
    const fileId = readOption(args, ["--file", "--file-id"]);
    if (!fileId) {
        writeError(io, format, "file_id_required", "prototype create-interaction requires --file <file-id>.", [
            "Use penpot-cli file list first, then pass --file <file-id>.",
        ]);
        return null;
    }

    const sourceShapeId = readOption(args, ["--source", "--source-shape", "--source-shape-id", "--shape", "--shape-id"]);
    if (!sourceShapeId) {
        writeError(
            io,
            format,
            "prototype_source_shape_required",
            "prototype create-interaction requires --source <shape-id>.",
            ["Pass the shape id that owns the interaction."]
        );
        return null;
    }

    const destinationBoardId = readOption(args, [
        "--destination",
        "--destination-board",
        "--destination-board-id",
        "--target",
        "--target-board",
    ]);
    if (!destinationBoardId) {
        writeError(
            io,
            format,
            "prototype_destination_board_required",
            "prototype create-interaction requires --destination <frame-id>.",
            ["Pass the destination board/frame id for navigate-to."]
        );
        return null;
    }

    const delay = readNumberOption(args, ["--delay"]);
    if (delay !== undefined && (!Number.isFinite(delay) || delay < 0 || delay > 60000)) {
        writeError(io, format, "prototype_numeric_option_invalid", "Invalid prototype delay.", [
            "Pass a finite delay from 0 to 60000.",
        ]);
        return null;
    }

    const trigger = readPrototypeEnumOption(
        args,
        ["--trigger"],
        ["click", "mouse-enter", "mouse-leave", "after-delay"],
        io,
        format,
        "--trigger"
    );
    if (trigger === null) {
        return null;
    }

    const animation = parsePrototypeAnimationParams(args, io, format);
    if (animation === null) {
        return null;
    }

    return {
        fileId,
        sourceShapeId,
        destinationBoardId,
        pageId: readOption(args, ["--page", "--page-id"]),
        trigger: trigger ?? (delay !== undefined ? "after-delay" : undefined),
        delay,
        preserveScrollPosition: readOptionalBooleanFlag(args, ["--preserve-scroll", "--preserve-scroll-position"]),
        animation,
    };
}

function parsePrototypeOverlayParams(args: string[], io: CliIO, format: Format): PrototypeOverlayParams | null {
    const fileId = readOption(args, ["--file", "--file-id"]);
    if (!fileId) {
        writeError(io, format, "file_id_required", "prototype create-overlay requires --file <file-id>.", [
            "Use penpot-cli file list first, then pass --file <file-id>.",
        ]);
        return null;
    }

    const pageId = readOption(args, ["--page", "--page-id"]);
    if (!pageId) {
        writeError(io, format, "page_id_required", "prototype create-overlay requires --page <page-id>.", [
            "Use penpot-cli page list --file <file-id> first, then pass --page <page-id>.",
        ]);
        return null;
    }

    const sourceShapeId = readOption(args, ["--source", "--source-shape", "--source-shape-id", "--shape", "--shape-id"]);
    if (!sourceShapeId) {
        writeError(
            io,
            format,
            "prototype_source_shape_required",
            "prototype create-overlay requires --source <shape-id>.",
            ["Pass the shape id that owns the overlay interaction."]
        );
        return null;
    }

    const actionType = readPrototypeEnumOption(
        args,
        ["--action", "--action-type"],
        ["open-overlay", "toggle-overlay", "close-overlay"],
        io,
        format,
        "--action"
    );
    if (actionType === null) {
        return null;
    }
    if (!actionType) {
        writeError(
            io,
            format,
            "prototype_overlay_action_required",
            "prototype create-overlay requires --action <type>.",
            ["Use --action open-overlay, --action toggle-overlay, or --action close-overlay."]
        );
        return null;
    }

    const destinationBoardId = readOption(args, [
        "--destination",
        "--destination-board",
        "--destination-board-id",
        "--target",
        "--target-board",
    ]);
    if ((actionType === "open-overlay" || actionType === "toggle-overlay") && !destinationBoardId) {
        writeError(
            io,
            format,
            "prototype_overlay_destination_required",
            "prototype create-overlay requires --destination <frame-id> for open-overlay and toggle-overlay.",
            ["Pass the destination overlay frame id, or use --action close-overlay when no destination is needed."]
        );
        return null;
    }

    const overlayPositionType = readPrototypeEnumOption(
        args,
        ["--position", "--overlay-position", "--overlay-position-type"],
        ["center", "manual", "top-left", "top-right", "top-center", "bottom-left", "bottom-right", "bottom-center"],
        io,
        format,
        "--position"
    );
    if (overlayPositionType === null) {
        return null;
    }

    const manualX = readNumberOption(args, ["--manual-x"]);
    const manualY = readNumberOption(args, ["--manual-y"]);
    if (
        (manualX !== undefined || manualY !== undefined) &&
        (!Number.isFinite(manualX) || !Number.isFinite(manualY))
    ) {
        writeError(io, format, "prototype_overlay_manual_position_invalid", "Invalid manual overlay position.", [
            "Pass both --manual-x <n> and --manual-y <n> with finite numeric values.",
        ]);
        return null;
    }
    if (overlayPositionType === "manual" && (manualX === undefined || manualY === undefined)) {
        writeError(
            io,
            format,
            "prototype_overlay_manual_position_required",
            "prototype create-overlay manual positioning requires --manual-x and --manual-y.",
            ["Pass both manual coordinates or use a preset --position value."]
        );
        return null;
    }

    const delay = readNumberOption(args, ["--delay"]);
    if (delay !== undefined && (!Number.isFinite(delay) || delay < 0 || delay > 60000)) {
        writeError(io, format, "prototype_numeric_option_invalid", "Invalid prototype delay.", [
            "Pass a finite delay from 0 to 60000.",
        ]);
        return null;
    }

    const trigger = readPrototypeEnumOption(
        args,
        ["--trigger"],
        ["click", "mouse-enter", "mouse-leave", "after-delay"],
        io,
        format,
        "--trigger"
    );
    if (trigger === null) {
        return null;
    }

    const animation = parsePrototypeAnimationParams(args, io, format);
    if (animation === null) {
        return null;
    }
    if (animation?.type === "push") {
        writeError(io, format, "prototype_overlay_animation_unsupported", "Overlay creation does not support push animation.", [
            "Use --animation dissolve or --animation slide.",
        ]);
        return null;
    }

    return {
        fileId,
        pageId,
        sourceShapeId,
        actionType,
        destinationBoardId,
        relativeToShapeId: readOption(args, ["--relative-to", "--relative-to-shape", "--relative-to-shape-id"]),
        overlayPositionType:
            overlayPositionType ?? (manualX !== undefined || manualY !== undefined ? "manual" : undefined),
        manualPosition:
            manualX !== undefined && manualY !== undefined
                ? {
                      x: manualX,
                      y: manualY,
                  }
                : undefined,
        closeClickOutside: readOptionalBooleanFlag(args, ["--close-click-outside", "--close-when-click-outside"]),
        backgroundOverlay: readOptionalBooleanFlag(args, ["--background-overlay", "--add-background-overlay"]),
        trigger: trigger ?? (delay !== undefined ? "after-delay" : undefined),
        delay,
        animation,
    };
}

function parsePrototypeListInteractionsParams(
    args: string[],
    io: CliIO,
    format: Format
): PrototypeListInteractionsParams | null {
    const fileId = readOption(args, ["--file", "--file-id"]);
    if (!fileId) {
        writeError(io, format, "file_id_required", "prototype list-interactions requires --file <file-id>.", [
            "Use penpot-cli file list first, then pass --file <file-id>.",
        ]);
        return null;
    }

    return {
        fileId,
        pageId: readOption(args, ["--page", "--page-id"]),
        flowId: readOption(args, ["--flow-id"]),
        sourceShapeId: readOption(args, ["--source", "--source-shape", "--source-shape-id", "--shape", "--shape-id"]),
    };
}

function parsePrototypeInteractionTargetParams(
    args: string[],
    io: CliIO,
    format: Format,
    commandLabel: string
): PrototypeDeleteInteractionParams | null {
    const fileId = readOption(args, ["--file", "--file-id"]);
    if (!fileId) {
        writeError(io, format, "file_id_required", `${commandLabel} requires --file <file-id>.`, [
            "Use penpot-cli file list first, then pass --file <file-id>.",
        ]);
        return null;
    }

    const interactionId = readOption(args, ["--interaction-id", "--interaction"]);
    const sourceShapeId = readOption(args, ["--source", "--source-shape", "--source-shape-id", "--shape", "--shape-id"]);
    if (!interactionId && !sourceShapeId) {
        writeError(
            io,
            format,
            "prototype_interaction_target_required",
            `${commandLabel} requires --interaction-id <id> or --source <shape-id>.`,
            ["Use prototype list-interactions first, then pass --interaction-id or the legacy --source and --index pair."]
        );
        return null;
    }

    const indexValue = readOption(args, ["--index", "--interaction-index"]);
    const interactionIndex = indexValue === undefined ? undefined : Number(indexValue);
    if (interactionIndex !== undefined && (!Number.isInteger(interactionIndex) || interactionIndex < 0)) {
        writeError(io, format, "prototype_interaction_index_invalid", "Invalid prototype interaction index.", [
            "Pass a zero-based non-negative integer with --index <n>.",
        ]);
        return null;
    }
    if (!interactionId && interactionIndex === undefined) {
        writeError(io, format, "prototype_interaction_index_invalid", "Invalid prototype interaction index.", [
            "Pass --index <n> for source-shape/index deletion, or pass --interaction-id <id> for stable-id deletion.",
        ]);
        return null;
    }

    return {
        fileId,
        pageId: readOption(args, ["--page", "--page-id"]),
        interactionId,
        sourceShapeId,
        interactionIndex,
    };
}

function parsePrototypeDeleteInteractionParams(
    args: string[],
    io: CliIO,
    format: Format
): PrototypeDeleteInteractionParams | null {
    return parsePrototypeInteractionTargetParams(args, io, format, "prototype delete-interaction");
}

function parsePrototypeUpdateInteractionParams(
    args: string[],
    io: CliIO,
    format: Format
): PrototypeUpdateInteractionParams | null {
    const target = parsePrototypeInteractionTargetParams(args, io, format, "prototype update-interaction");
    if (!target) {
        return null;
    }

    const delay = readNumberOption(args, ["--delay"]);
    if (delay !== undefined && (!Number.isFinite(delay) || delay < 0 || delay > 60000)) {
        writeError(io, format, "prototype_numeric_option_invalid", "Invalid prototype delay.", [
            "Pass a finite delay from 0 to 60000.",
        ]);
        return null;
    }

    const trigger = readPrototypeEnumOption(
        args,
        ["--trigger"],
        ["click", "mouse-enter", "mouse-leave", "after-delay"],
        io,
        format,
        "--trigger"
    );
    if (trigger === null) {
        return null;
    }

    const overlayPositionType = readPrototypeEnumOption(
        args,
        ["--position", "--overlay-position", "--overlay-position-type"],
        ["center", "manual", "top-left", "top-right", "top-center", "bottom-left", "bottom-right", "bottom-center"],
        io,
        format,
        "--position"
    );
    if (overlayPositionType === null) {
        return null;
    }

    const manualX = readNumberOption(args, ["--manual-x"]);
    const manualY = readNumberOption(args, ["--manual-y"]);
    if (
        (manualX !== undefined || manualY !== undefined) &&
        (!Number.isFinite(manualX) || !Number.isFinite(manualY))
    ) {
        writeError(io, format, "prototype_overlay_manual_position_invalid", "Invalid manual overlay position.", [
            "Pass both --manual-x <n> and --manual-y <n> with finite numeric values.",
        ]);
        return null;
    }
    if (overlayPositionType === "manual" && (manualX === undefined || manualY === undefined)) {
        writeError(
            io,
            format,
            "prototype_overlay_manual_position_required",
            "prototype update-interaction manual positioning requires --manual-x and --manual-y.",
            ["Pass both manual coordinates or use a preset --position value."]
        );
        return null;
    }

    const animation = parsePrototypeAnimationParams(args, io, format);
    if (animation === null) {
        return null;
    }

    const params: PrototypeUpdateInteractionParams = {
        ...target,
        destinationBoardId: readOption(args, [
            "--destination",
            "--destination-board",
            "--destination-board-id",
            "--target",
            "--target-board",
        ]),
        relativeToShapeId: readOption(args, ["--relative-to", "--relative-to-shape", "--relative-to-shape-id"]),
        overlayPositionType:
            overlayPositionType ?? (manualX !== undefined || manualY !== undefined ? "manual" : undefined),
        manualPosition:
            manualX !== undefined && manualY !== undefined
                ? {
                      x: manualX,
                      y: manualY,
                  }
                : undefined,
        closeClickOutside: readOptionalBooleanFlag(args, ["--close-click-outside", "--close-when-click-outside"]),
        backgroundOverlay: readOptionalBooleanFlag(args, ["--background-overlay", "--add-background-overlay"]),
        trigger: trigger ?? (delay !== undefined ? "after-delay" : undefined),
        delay,
        preserveScrollPosition: readOptionalBooleanFlag(args, ["--preserve-scroll", "--preserve-scroll-position"]),
        animation,
    };

    const hasPatch = [
        params.destinationBoardId,
        params.relativeToShapeId,
        params.overlayPositionType,
        params.manualPosition,
        params.closeClickOutside,
        params.backgroundOverlay,
        params.trigger,
        params.delay,
        params.preserveScrollPosition,
        params.animation,
    ].some((value) => value !== undefined);
    if (!hasPatch) {
        writeError(
            io,
            format,
            "prototype_interaction_patch_required",
            "prototype update-interaction requires at least one field to update.",
            ["Pass --destination, --trigger, --animation, or another supported prototype interaction field."]
        );
        return null;
    }

    return params;
}

function parsePrototypeReorderInteractionParams(
    args: string[],
    io: CliIO,
    format: Format
): PrototypeReorderInteractionParams | null {
    const target = parsePrototypeInteractionTargetParams(args, io, format, "prototype reorder-interaction");
    if (!target) {
        return null;
    }
    const toIndex = readNumberOption(args, ["--to-index", "--to"]);
    if (toIndex === undefined || !Number.isInteger(toIndex) || toIndex < 0) {
        writeError(io, format, "prototype_interaction_index_invalid", "Invalid prototype interaction target index.", [
            "Pass a zero-based non-negative integer with --to-index <n>.",
        ]);
        return null;
    }
    return {
        ...target,
        toIndex,
    };
}

function parsePrototypeDuplicateInteractionParams(
    args: string[],
    io: CliIO,
    format: Format
): PrototypeDuplicateInteractionParams | null {
    const target = parsePrototypeInteractionTargetParams(args, io, format, "prototype duplicate-interaction");
    if (!target) {
        return null;
    }
    const insertionIndex = readNumberOption(args, ["--insertion-index", "--insert-index", "--to-index"]);
    if (insertionIndex !== undefined && (!Number.isInteger(insertionIndex) || insertionIndex < 0)) {
        writeError(io, format, "prototype_interaction_index_invalid", "Invalid prototype interaction insertion index.", [
            "Pass a zero-based non-negative integer with --insertion-index <n>.",
        ]);
        return null;
    }
    return {
        ...target,
        insertionIndex,
    };
}

function toRpcPrototypeAnimation(animation: PrototypeAnimationParams | undefined): Record<string, unknown> | undefined {
    if (!animation) {
        return undefined;
    }
    return {
        type: animation.type,
        duration: animation.duration,
        ...(animation.easing ? { easing: animation.easing } : {}),
        ...(animation.direction ? { direction: animation.direction } : {}),
        ...(animation.way ? { way: animation.way } : {}),
        ...(animation.offsetEffect !== undefined ? { "offset-effect": animation.offsetEffect } : {}),
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
    writeLine(io.stdout, "services:");
    for (const service of plan.services) {
        writeLine(
            io.stdout,
            `  ${service.name}: ${service.kind}, status=${service.status}, command=${service.command ?? "n/a"}`
        );
    }
    writeLine(io.stdout, "dependencies:");
    if (plan.dependencyChecks.length === 0) {
        writeLine(io.stdout, "  none for this mode");
    }
    for (const check of plan.dependencyChecks) {
        writeLine(io.stdout, `  ${check.name}: ${check.status} (${check.target})`);
    }
    writeLine(io.stdout, "ports:");
    for (const check of plan.portChecks) {
        writeLine(io.stdout, `  ${check.name}: ${check.host}:${String(check.port)} ${check.status}`);
    }
    writeLine(io.stdout, "startup boundaries:");
    for (const boundary of plan.startupBoundaries) {
        writeLine(io.stdout, `  ${boundary.mode}: ${boundary.status} - ${boundary.detail}`);
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

interface SseEvent {
    type: string;
    data: unknown;
}

function parseSseEventData(data: string): unknown {
    if (!data.trim()) {
        return null;
    }
    try {
        return decodeTransitJson(data);
    } catch {
        return data;
    }
}

function parseSseEvents(text: string): SseEvent[] {
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
                data: parseSseEventData(dataLines.join("\n")),
            };
        });
}

async function rpcSseRequest(
    backendUri: string,
    methodName: string,
    params: RpcParams,
    token: string
): Promise<SseEvent[]> {
    const url = createRpcUrl(backendUri, methodName);
    const response = await fetch(url, {
        method: "POST",
        headers: {
            accept: "text/event-stream,application/json",
            authorization: `Token ${token}`,
            "content-type": "application/json",
            "x-client": "penpot-cli/0.1",
        },
        body: JSON.stringify(params),
    });
    const text = await response.text();

    if (!response.ok) {
        const data = text.trim() ? parseSseEventData(text) : null;
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

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/event-stream")) {
        throw createCliError(
            "penpot_rpc_stream_expected",
            `Penpot RPC ${methodName} did not return an SSE stream.`,
            response.status,
            { contentType, response: text }
        );
    }

    const events = parseSseEvents(text);
    const error = events.find((event) => event.type === "error");
    if (error) {
        const data = asRecord(error.data);
        const code = typeof data.code === "string" ? data.code.replaceAll("-", "_") : "penpot_rpc_stream_error";
        const message =
            typeof data.message === "string"
                ? data.message
                : typeof data.hint === "string"
                  ? data.hint
                  : `Penpot RPC ${methodName} stream failed.`;
        throw createCliError(code, message, response.status, { response: error.data });
    }

    return events;
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

async function readBackendMcpProfileConfig(
    args: string[],
    env: NodeJS.ProcessEnv,
    token: string
): Promise<{ backendUri: string; profileId: string; profileConfig: McpProfileConfigInput }> {
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
            "mcp_profile_read_failed",
            `Unable to read MCP profile config from ${rpc.backendUri}: ${String(cause)}`,
            0,
            { backendUri: rpc.backendUri }
        );
    }

    const data = await readStructuredResponse(response);
    if (!response.ok) {
        throw createHttpResponseError("mcp_profile_read_failed", "Unable to read MCP profile config.", response, data);
    }

    const profile = asRecord(data);
    const profileId = typeof profile.id === "string" ? profile.id : "";
    if (!isUuidString(profileId) || profileId === ZERO_UUID) {
        throw createCliError(
            "mcp_profile_auth_required",
            "Unable to read MCP profile config from an authenticated Penpot profile.",
            response.status,
            { backendUri: rpc.backendUri }
        );
    }

    const props = asRecord(profile.props);
    const profileConfig = normalizeMcpProfileConfig(props["mcp-config"] ?? props.mcpConfig);
    return { backendUri: rpc.backendUri, profileId, profileConfig };
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

function getResourceUri(resource: Record<string, unknown>): string | null {
    const uri = resource.uri ?? resource["resource-uri"];
    return typeof uri === "string" && uri.length > 0 ? uri : null;
}

function resolveDownloadUri(uri: string, backendUri: string): string {
    return new URL(uri, `${backendUri}/`).toString();
}

async function downloadCommandResource(
    uri: string,
    backendUri: string,
    output: string,
    token: string
): Promise<DownloadedResourceMetadata> {
    const downloadUri = resolveDownloadUri(uri, backendUri);
    let response: Response;
    try {
        response = await fetch(downloadUri, {
            headers: {
                accept: "*/*",
                authorization: `Bearer ${token}`,
                cookie: authCookieHeader(token),
                "x-client": "penpot-cli/0.1",
            },
        });
    } catch (cause) {
        throw createCliError("resource_unavailable", `Unable to download resource ${downloadUri}: ${String(cause)}`, 0, {
            resourceUri: downloadUri,
        });
    }

    if (response.status === 204 && response.headers.has("x-accel-redirect")) {
        throw createCliError(
            "resource_requires_gateway",
            "Resource download requires the Penpot public gateway that serves x-accel-redirect assets.",
            response.status,
            { resourceUri: downloadUri, xAccelRedirect: response.headers.get("x-accel-redirect") }
        );
    }

    if (!response.ok) {
        throw createHttpResponseError("resource_download_failed", "Resource download failed.", response, null);
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
        artifact: {
            ...plan.artifact,
            target: {
                fileId: plan.fileId as string,
                pageId: plan.pageId as string,
                objectId: plan.objectId as string,
            },
        },
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

function normalizeExportFileResource(data: unknown): Record<string, unknown> {
    if (typeof data === "string" && data.length > 0) {
        return {
            uri: data,
            "resource-uri": data,
        };
    }

    const resource = asRecord(data);
    if (getResourceUri(resource)) {
        return resource;
    }

    throw createCliError("export_file_resource_uri_missing", "export.file stream did not include a downloadable resource URI.", 0, {
        response: data,
    });
}

async function executeExportFilePlan(plan: ExportFilePlan, args: string[], env: NodeJS.ProcessEnv): Promise<ExportFileResult> {
    const rpc = getRpcConfig(args, env);
    if (!rpc.token) {
        throw createCliError(
            CommandErrorCodes.AUTHENTICATION_REQUIRED,
            "export file requires a Penpot auth-token/session token."
        );
    }

    const events = await rpcSseRequest(rpc.backendUri, plan.backendRpc.command, plan.backendRpc.request, rpc.token);
    const endEvent = [...events].reverse().find((event) => event.type === "end");
    if (!endEvent) {
        throw createCliError("export_file_stream_incomplete", "export.file stream ended without an end event.", 0, {
            events: events.map((event) => event.type),
        });
    }

    const resource = normalizeExportFileResource(endEvent.data);
    const resourceUri = getResourceUri(resource);
    const token = extractAuthTokenValue(rpc.token);
    const downloadedResource =
        plan.output && resourceUri
            ? await downloadCommandResource(resourceUri, rpc.backendUri, plan.output, token)
            : undefined;

    return {
        command: plan.command,
        adapter: plan.adapter,
        adapterSelection: plan.adapterSelection,
        artifact: plan.artifact,
        fileId: plan.fileId as string,
        libraryMode: plan.libraryMode,
        output: plan.output,
        backendRpc: plan.backendRpc,
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

function exportFileErrorResponse(io: CliIO, format: Format, plan: ExportFilePlan, cause: unknown): number {
    const error = asRecord(cause);
    const code = typeof error.code === "string" ? error.code : "export_file_failed";
    const status = typeof error.status === "number" ? error.status : 0;
    const message = cause instanceof Error ? cause.message : "Unable to execute backend-rpc file export.";
    const actions =
        code === CommandErrorCodes.AUTHENTICATION_REQUIRED
            ? [
                  "Pass --token with a Penpot auth-token/session token.",
                  "Set PENPOT_CLI_TOKEN, PENPOT_MCP_USER_TOKEN, or PENPOT_ACCESS_TOKEN.",
                  "Use --dry-run to inspect the backend export-binfile request without executing it.",
              ]
            : [
                  "Check PENPOT_BACKEND_URI or --backend-uri.",
                  "Check the token and normal Penpot read permissions for the file.",
                  "Use --dry-run to inspect the backend export-binfile request payload.",
              ];

    writeError(io, format, code, message, actions, {
        status,
        backendUri: plan.backendRpc.uri,
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
    writeLine(io.stdout, `profile-source: ${config.configSource.profileSource}`);
    writeLine(io.stdout, `config-source: ${config.configSource.status}`);
    if (config.configSource.profileId) {
        writeLine(io.stdout, `profile-id: ${config.configSource.profileId}`);
    }
    for (const warning of config.configSource.warnings) {
        writeLine(io.stdout, `warning: ${warning}`);
    }
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
    writeLine(
        io.stdout,
        "Open this URL in Penpot, then use MCP file.get_context and file.bind_context before retrying live-only tools such as page.set_current, selection.get, or selection.set."
    );
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

function writePrototypeFlowCreatedText(io: CliIO, fileId: string, flow: unknown): void {
    const record = asRecord(flow);
    writeLine(io.stdout, "Prototype flow created");
    writeLine(io.stdout, `fileId: ${fileId}`);
    writeLine(io.stdout, `id: ${String(record.id ?? "<unknown>")}`);
    writeLine(io.stdout, `name: ${String(record.name ?? "<unnamed>")}`);
    writeLine(io.stdout, `pageId: ${String(record.pageId ?? record["page-id"] ?? "<unknown>")}`);
    writeLine(
        io.stdout,
        `startingBoardId: ${String(record.startingBoardId ?? record["starting-board-id"] ?? "<unknown>")}`
    );
}

function writePrototypeInteractionCreatedText(io: CliIO, fileId: string, interaction: unknown): void {
    const record = asRecord(interaction);
    writeLine(io.stdout, "Prototype interaction created");
    writeLine(io.stdout, `fileId: ${fileId}`);
    writeLine(io.stdout, `sourceShapeId: ${String(record.sourceShapeId ?? record["source-shape-id"] ?? "<unknown>")}`);
    writeLine(
        io.stdout,
        `destinationBoardId: ${String(record.destinationBoardId ?? record["destination-board-id"] ?? "<unknown>")}`
    );
    writeLine(io.stdout, `actionType: ${String(record.actionType ?? record["action-type"] ?? "navigate-to")}`);
    writeLine(io.stdout, `index: ${String(record.index ?? "<unknown>")}`);
}

function writePrototypeInteractionDeletedText(io: CliIO, fileId: string, interaction: unknown): void {
    const record = asRecord(interaction);
    writeLine(io.stdout, "Prototype interaction deleted");
    writeLine(io.stdout, `fileId: ${fileId}`);
    writeLine(io.stdout, `interactionId: ${String(record.interactionId ?? record["interaction-id"] ?? "<none>")}`);
    writeLine(io.stdout, `sourceShapeId: ${String(record.sourceShapeId ?? record["source-shape-id"] ?? "<unknown>")}`);
    writeLine(
        io.stdout,
        `destinationBoardId: ${String(record.destinationBoardId ?? record["destination-board-id"] ?? "<unknown>")}`
    );
    writeLine(io.stdout, `actionType: ${String(record.actionType ?? record["action-type"] ?? "navigate-to")}`);
    writeLine(io.stdout, `index: ${String(record.index ?? "<unknown>")}`);
}

function writePrototypeInteractionMutationText(io: CliIO, label: string, fileId: string, interaction: unknown): void {
    const record = asRecord(interaction);
    writeLine(io.stdout, label);
    writeLine(io.stdout, `fileId: ${fileId}`);
    writeLine(io.stdout, `interactionId: ${String(record.interactionId ?? record["interaction-id"] ?? "<none>")}`);
    writeLine(io.stdout, `sourceShapeId: ${String(record.sourceShapeId ?? record["source-shape-id"] ?? "<unknown>")}`);
    writeLine(
        io.stdout,
        `destinationBoardId: ${String(record.destinationBoardId ?? record["destination-board-id"] ?? "<unknown>")}`
    );
    writeLine(io.stdout, `actionType: ${String(record.actionType ?? record["action-type"] ?? "navigate-to")}`);
    writeLine(io.stdout, `index: ${String(record.index ?? "<unknown>")}`);
}

function writePrototypeInteractionsText(
    io: CliIO,
    fileId: string,
    flows: unknown[],
    interactions: unknown[]
): void {
    writeLine(io.stdout, "Prototype interactions");
    writeLine(io.stdout, `fileId: ${fileId}`);
    writeLine(io.stdout, `flows: ${flows.length}`);
    writeLine(io.stdout, `interactions: ${interactions.length}`);
    for (const interaction of interactions) {
        const record = asRecord(interaction);
        const source = record.sourceShapeName ?? record["source-shape-name"] ?? record.sourceShapeId ?? record["source-shape-id"];
        const destination =
            record.destinationBoardName ??
            record["destination-board-name"] ??
            record.destinationBoardId ??
            record["destination-board-id"];
        writeLine(io.stdout, `- ${String(source ?? "<unknown>")} -> ${String(destination ?? "<unknown>")}`);
    }
}

function writeExportPlanText(io: CliIO, plan: ExportPagePlan): void {
    const label = plan.artifact.kind === "preview" ? "Render preview" : "Export page";
    writeLine(io.stdout, `${label} plan`);
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
    writeLine(io.stdout, `artifactKind: ${plan.artifact.kind}`);
    writeLine(io.stdout, `mimeType: ${plan.artifact.mimeType}`);
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
    const label = result.artifact.kind === "preview" ? "Render preview" : "Export page";

    writeLine(io.stdout, `${label} completed`);
    writeLine(io.stdout, `command: ${result.command}`);
    writeLine(io.stdout, `adapter: ${result.adapter ?? "<none>"}`);
    writeLine(io.stdout, `exporter: ${result.exporter.method} ${result.exporter.endpoint}`);
    writeLine(io.stdout, `fileId: ${result.fileId}`);
    writeLine(io.stdout, `pageId: ${result.pageId}`);
    writeLine(io.stdout, `objectId: ${result.objectId}`);
    writeLine(io.stdout, `profileId: ${result.profileId}`);
    writeLine(io.stdout, `artifactKind: ${result.artifact.kind}`);
    writeLine(io.stdout, `mimeType: ${result.artifact.mimeType}`);
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

function writeExportFilePlanText(io: CliIO, plan: ExportFilePlan): void {
    writeLine(io.stdout, "Export file plan");
    writeLine(io.stdout, `command: ${plan.command}`);
    writeLine(io.stdout, `adapter: ${plan.adapter ?? "<none>"}`);
    writeLine(io.stdout, `requestedAdapter: ${plan.adapterSelection.requested}`);
    writeLine(io.stdout, `adapterSelection: ${plan.adapterSelection.status}`);
    writeLine(io.stdout, `status: ${plan.status}`);
    writeLine(io.stdout, `backendRpc: ${plan.backendRpc.method} ${plan.backendRpc.endpoint}`);
    writeLine(io.stdout, `fileId: ${plan.fileId ?? "<missing>"}`);
    writeLine(io.stdout, `name: ${plan.name}`);
    writeLine(io.stdout, `mimeType: ${plan.artifact.mimeType}`);
    writeLine(io.stdout, `libraryMode: ${plan.libraryMode}`);
    writeLine(io.stdout, `includeLibraries: ${String(plan.artifact.includeLibraries)}`);
    writeLine(io.stdout, `embedAssets: ${String(plan.artifact.embedAssets)}`);
    writeLine(io.stdout, `output: ${plan.output ?? "<resource metadata only>"}`);
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

function writeExportFileResultText(io: CliIO, result: ExportFileResult): void {
    const resourceId = result.resource.id ?? result.resource["resource-id"] ?? "<unknown>";
    const resourceUri = getResourceUri(result.resource) ?? "<unknown>";

    writeLine(io.stdout, "Export file completed");
    writeLine(io.stdout, `command: ${result.command}`);
    writeLine(io.stdout, `adapter: ${result.adapter ?? "<none>"}`);
    writeLine(io.stdout, `backendRpc: ${result.backendRpc.method} ${result.backendRpc.endpoint}`);
    writeLine(io.stdout, `fileId: ${result.fileId}`);
    writeLine(io.stdout, `mimeType: ${result.artifact.mimeType}`);
    writeLine(io.stdout, `libraryMode: ${result.libraryMode}`);
    writeLine(io.stdout, `includeLibraries: ${String(result.artifact.includeLibraries)}`);
    writeLine(io.stdout, `embedAssets: ${String(result.artifact.embedAssets)}`);
    writeLine(io.stdout, `resourceId: ${String(resourceId)}`);
    writeLine(io.stdout, `resourceUri: ${resourceUri}`);
    if (result.downloadedResource) {
        writeLine(io.stdout, `output: ${result.downloadedResource.path}`);
        writeLine(io.stdout, `bytes: ${result.downloadedResource.bytes}`);
    } else {
        writeLine(io.stdout, "output: <not written; resource metadata only>");
    }
}

function writeRenderThumbnailPlanText(io: CliIO, plan: RenderThumbnailPlan): void {
    writeLine(io.stdout, "Render thumbnail plan");
    writeLine(io.stdout, `command: ${plan.command}`);
    writeLine(io.stdout, `adapter: ${plan.adapter}`);
    writeLine(io.stdout, `requestedAdapter: ${plan.adapterSelection.requested}`);
    writeLine(io.stdout, `adapterSelection: ${plan.adapterSelection.status}`);
    writeLine(io.stdout, `status: ${plan.status}`);
    writeLine(io.stdout, `runtimeAvailable: ${String(plan.runtimeAvailable)}`);
    writeLine(io.stdout, `rendererService: ${plan.service.operation} ${plan.endpoint ?? "<not configured>"}`);
    writeLine(io.stdout, `rendererServiceAvailability: ${plan.availability.status}`);
    writeLine(io.stdout, `rendererServiceHealth: ${plan.client.healthEndpoint ?? "<not configured>"}`);
    writeLine(io.stdout, `rendererServiceProbe: ${plan.availability.probe}`);
    writeLine(io.stdout, `rendererServiceProbeTimeoutMs: ${plan.client.probeTimeoutMs}`);
    writeLine(io.stdout, `fileId: ${plan.target.fileId ?? "<missing>"}`);
    writeLine(io.stdout, `target: ${plan.target.kind}`);
    writeLine(io.stdout, `pageId: ${plan.target.pageId ?? "<none>"}`);
    writeLine(io.stdout, `objectId: ${plan.target.objectId ?? "<none>"}`);
    writeLine(io.stdout, `objectKey: ${plan.target.objectKey ?? "<none>"}`);
    writeLine(io.stdout, `mimeType: ${plan.artifact.mimeType}`);
    writeLine(io.stdout, `width: ${plan.artifact.width}`);
    writeLine(io.stdout, `height: ${plan.artifact.height}`);
    writeLine(io.stdout, `cachePolicy: ${plan.cache.policy}`);
    writeLine(io.stdout, `cacheScope: ${plan.cache.scope}`);
    writeLine(io.stdout, `cacheKey: ${plan.cache.key ?? "<pending>"}`);
    writeLine(io.stdout, `output: ${plan.output ?? "<resource metadata only>"}`);
    if (plan.requires.length > 0) {
        writeLine(io.stdout, "requires:");
        for (const requirement of plan.requires) {
            writeLine(io.stdout, `  ${requirement}`);
        }
    }
    if (plan.requiredCapabilities.length > 0) {
        writeLine(io.stdout, "requiredCapabilities:");
        for (const capability of plan.requiredCapabilities) {
            writeLine(io.stdout, `  ${capability}`);
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

async function handleMcpConfig(args: string[], io: CliIO, env: NodeJS.ProcessEnv): Promise<number> {
    const format = parseFormat(args, io);
    if (!format) {
        return 2;
    }

    const profileSource = readMcpProfileSource(args, env);
    if (!profileSource) {
        writeError(
            io,
            format,
            "invalid_mcp_profile_source",
            "Invalid --profile-source value. Expected off, auto, or backend.",
            ["Use --profile-source off, --profile-source auto, or --profile-source backend."]
        );
        return 2;
    }

    let profileConfig: McpProfileConfigInput = {};
    let configSource: McpConfigSource = {
        profileSource,
        status: profileSource === "off" ? "disabled" : "fallback",
        backendUri: null,
        profileId: null,
        warnings: [],
    };

    if (profileSource !== "off") {
        const rpc = getRpcConfig(args, env);
        configSource = { ...configSource, backendUri: rpc.backendUri };
        if (!rpc.token) {
            if (profileSource === "backend") {
                writeError(
                    io,
                    format,
                    CommandErrorCodes.AUTHENTICATION_REQUIRED,
                    "Reading MCP config from a Penpot profile requires an auth-token/session token.",
                    ["Pass --token <token> or set PENPOT_CLI_TOKEN, PENPOT_MCP_USER_TOKEN, or PENPOT_ACCESS_TOKEN."],
                    { backendUri: rpc.backendUri, profileSource }
                );
                return 2;
            }
            configSource.warnings.push("profile-source auto skipped because no auth token was supplied");
        } else {
            try {
                const result = await readBackendMcpProfileConfig(args, env, extractAuthTokenValue(rpc.token));
                profileConfig = result.profileConfig;
                configSource = {
                    profileSource,
                    status: "loaded",
                    backendUri: result.backendUri,
                    profileId: result.profileId,
                    warnings: [],
                };
            } catch (cause) {
                if (profileSource === "backend") {
                    const error = asRecord(cause);
                    const code = typeof error.code === "string" ? error.code : "mcp_profile_read_failed";
                    const status = typeof error.status === "number" ? error.status : 0;
                    const message =
                        cause instanceof Error ? cause.message : "Unable to read MCP profile config from Penpot.";
                    writeError(
                        io,
                        format,
                        code,
                        message,
                        [
                            "Check PENPOT_BACKEND_URI or --backend-uri.",
                            "Check that the token belongs to a signed-in Penpot user.",
                            "Use --profile-source off to keep local env/flag-only behavior.",
                        ],
                        {
                            backendUri: rpc.backendUri,
                            profileSource,
                            status,
                        }
                    );
                    return 2;
                }
                configSource.warnings.push(
                    cause instanceof Error
                        ? `profile-source auto fell back to local config: ${cause.message}`
                        : "profile-source auto fell back to local config"
                );
            }
        }
    }

    const config = getMcpConfig(args, env, { allowModeAlias: true, profileConfig, configSource });
    const requestEnvelope = createCliRequest(CommandDescriptors.MCP_CONFIG, {
        input: { mode: config.mode, autoConnect: config.autoConnect },
        target: { publicUri: config.publicUri, statusUri: config.statusUri },
        auth: { userTokenPresent: profileSource !== "off" && Boolean(getRpcConfig(args, env).token), source: "mcp-config" },
        adapter: profileSource === "off" ? "local" : "backend-command",
        diagnostics: { logDirConfigured: Boolean(config.logDir), configSource: config.configSource },
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
            return await handleMcpConfig(rest, io, env);
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
    const plan = await getDevPlan(args, env, dryRun);

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
        ], { plan });
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

    const teamId = readOption(args, ["--team-id"]);
    const pageId = readOption(args, ["--page-id", "--page"]);
    const url = createWorkspaceUrl(args, env, fileId);
    const handoff = createFileOpenHandoff({
        fileId,
        teamId,
        pageId,
        workspaceUrl: url,
    });
    const requestEnvelope = createCliRequest(CommandDescriptors.FILE_OPEN, {
        input: {
            fileId,
            teamId,
            pageId,
        },
        target: { fileId, teamId, pageId, workspaceUrl: url },
        auth: { userTokenPresent: false, source: "browser-url" },
        adapter: CommandDescriptors.FILE_OPEN.adapters[0],
    });
    const resultEnvelope = createCliResult(
        requestEnvelope,
        {
            fileId,
            url,
            workspaceUrl: url,
            adapter: CommandDescriptors.FILE_OPEN.adapters[0],
            boundContext: false,
            handoff,
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

async function handleShapeCreateImage(args: string[], io: CliIO, env: NodeJS.ProcessEnv): Promise<number> {
    const format = parseFormat(args, io);
    if (!format) {
        return 2;
    }

    const adapterSelection = selectCliShapeAdapter(CommandDescriptors.SHAPE_CREATE_IMAGE.id, args);
    if (adapterSelection.status !== "selected" || adapterSelection.selected !== "backend-command") {
        return adapterSelectionFailure(io, format, adapterSelection);
    }

    const shapeParams = parseShapeCreateImageParams(args, io, format);
    if (!shapeParams) {
        return 2;
    }

    const rpc = getRpcConfig(args, env);
    if (!rpc.token) {
        return rpcAuthenticationRequired(io, format);
    }

    let imageBase64: string;
    try {
        const imageBytes = await readFile(shapeParams.imagePath);
        imageBase64 = imageBytes.toString("base64");
    } catch (cause) {
        writeError(io, format, "image_file_read_failed", `Unable to read image file: ${shapeParams.imagePath}.`, [
            "Check that the path exists and is readable.",
        ], { cause: cause instanceof Error ? cause.message : String(cause) });
        return 2;
    }

    try {
        const result = await rpcRequest<Record<string, unknown>>(
            "POST",
            rpc.backendUri,
            "create-file-image-shape",
            {
                id: shapeParams.fileId,
                "page-id": shapeParams.pageId,
                "shape-id": shapeParams.shapeId,
                "parent-id": shapeParams.parentId,
                name: shapeParams.name,
                x: shapeParams.x,
                y: shapeParams.y,
                width: shapeParams.width,
                height: shapeParams.height,
                "image-base64": imageBase64,
                "mime-type": shapeParams.mimeType,
            },
            rpc.token
        );
        writeOk(
            io,
            format,
            {
                fileId: shapeParams.fileId,
                shape: result.shape,
                media: result.media,
                source: {
                    path: shapeParams.imagePath,
                    name: basename(shapeParams.imagePath),
                    mimeType: shapeParams.mimeType,
                },
                revn: result.revn,
                vern: result.vern,
                adapter: adapterSelection.selected,
                adapterSelection,
            },
            () => writeShapeCreatedText(io, shapeParams.fileId, result.shape)
        );
        return 0;
    } catch (cause) {
        return rpcErrorResponse(io, format, "create-file-image-shape", rpc.backendUri, cause);
    }
}

async function handleShapeUpdate(
    descriptor: CommandDescriptor,
    mode: ShapeUpdateMode,
    args: string[],
    io: CliIO,
    env: NodeJS.ProcessEnv
): Promise<number> {
    const format = parseFormat(args, io);
    if (!format) {
        return 2;
    }

    const adapterSelection = selectCliShapeAdapter(descriptor.id, args);
    if (adapterSelection.status !== "selected" || adapterSelection.selected !== "backend-command") {
        return adapterSelectionFailure(io, format, adapterSelection);
    }

    const shapeParams = parseShapeUpdateParams(args, io, format, {
        command: descriptor.cliCommand ?? descriptor.id,
        mode,
    });
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
        case "create-image":
            return await handleShapeCreateImage(rest, io, env);
        case "update":
            return await handleShapeUpdate(CommandDescriptors.SHAPE_UPDATE, "update", rest, io, env);
        case "set-layout":
            return await handleShapeUpdate(CommandDescriptors.SHAPE_SET_LAYOUT, "set-layout", rest, io, env);
        case "set-style":
            return await handleShapeUpdate(CommandDescriptors.SHAPE_SET_STYLE, "set-style", rest, io, env);
        case "delete":
            return await handleShapeDelete(rest, io, env);
        default:
            writeLine(io.stderr, `Unknown shape command: ${subcommand}`);
            writeLine(io.stderr, 'Run "penpot-cli shape --help" for usage.');
            return 2;
    }
}

async function handlePrototypeCreateFlow(args: string[], io: CliIO, env: NodeJS.ProcessEnv): Promise<number> {
    const format = parseFormat(args, io);
    if (!format) {
        return 2;
    }

    const adapterSelection = selectCliPrototypeAdapter(CommandDescriptors.PROTOTYPE_CREATE_FLOW.id, args);
    if (adapterSelection.status !== "selected" || adapterSelection.selected !== "backend-command") {
        return adapterSelectionFailure(io, format, adapterSelection);
    }

    const prototypeParams = parsePrototypeFlowParams(args, io, format);
    if (!prototypeParams) {
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
            "create-file-prototype-flow",
            {
                id: prototypeParams.fileId,
                "page-id": prototypeParams.pageId,
                "flow-id": prototypeParams.flowId,
                name: prototypeParams.name,
                "starting-board-id": prototypeParams.startingBoardId,
            },
            rpc.token
        );
        writeOk(
            io,
            format,
            {
                fileId: prototypeParams.fileId,
                flow: result.flow,
                revn: result.revn,
                vern: result.vern,
                adapter: adapterSelection.selected,
                adapterSelection,
            },
            () => writePrototypeFlowCreatedText(io, prototypeParams.fileId, result.flow)
        );
        return 0;
    } catch (cause) {
        return rpcErrorResponse(io, format, "create-file-prototype-flow", rpc.backendUri, cause);
    }
}

async function handlePrototypeCreateInteraction(args: string[], io: CliIO, env: NodeJS.ProcessEnv): Promise<number> {
    const format = parseFormat(args, io);
    if (!format) {
        return 2;
    }

    const adapterSelection = selectCliPrototypeAdapter(CommandDescriptors.PROTOTYPE_CREATE_INTERACTION.id, args);
    if (adapterSelection.status !== "selected" || adapterSelection.selected !== "backend-command") {
        return adapterSelectionFailure(io, format, adapterSelection);
    }

    const prototypeParams = parsePrototypeInteractionParams(args, io, format);
    if (!prototypeParams) {
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
            "create-file-prototype-interaction",
            {
                id: prototypeParams.fileId,
                "page-id": prototypeParams.pageId,
                "source-shape-id": prototypeParams.sourceShapeId,
                "destination-board-id": prototypeParams.destinationBoardId,
                trigger: prototypeParams.trigger,
                delay: prototypeParams.delay,
                "preserve-scroll-position": prototypeParams.preserveScrollPosition,
                animation: toRpcPrototypeAnimation(prototypeParams.animation),
            },
            rpc.token
        );
        writeOk(
            io,
            format,
            {
                fileId: prototypeParams.fileId,
                interaction: result.interaction,
                revn: result.revn,
                vern: result.vern,
                adapter: adapterSelection.selected,
                adapterSelection,
            },
            () => writePrototypeInteractionCreatedText(io, prototypeParams.fileId, result.interaction)
        );
        return 0;
    } catch (cause) {
        return rpcErrorResponse(io, format, "create-file-prototype-interaction", rpc.backendUri, cause);
    }
}

async function handlePrototypeCreateOverlay(args: string[], io: CliIO, env: NodeJS.ProcessEnv): Promise<number> {
    const format = parseFormat(args, io);
    if (!format) {
        return 2;
    }

    const adapterSelection = selectCliPrototypeAdapter(CommandDescriptors.PROTOTYPE_CREATE_OVERLAY.id, args);
    if (adapterSelection.status !== "selected" || adapterSelection.selected !== "backend-command") {
        return adapterSelectionFailure(io, format, adapterSelection);
    }

    const prototypeParams = parsePrototypeOverlayParams(args, io, format);
    if (!prototypeParams) {
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
            "create-file-prototype-overlay",
            {
                id: prototypeParams.fileId,
                "page-id": prototypeParams.pageId,
                "source-shape-id": prototypeParams.sourceShapeId,
                "action-type": prototypeParams.actionType,
                "destination-board-id": prototypeParams.destinationBoardId,
                "relative-to-shape-id": prototypeParams.relativeToShapeId,
                "overlay-position-type": prototypeParams.overlayPositionType,
                "manual-position": prototypeParams.manualPosition,
                "close-click-outside": prototypeParams.closeClickOutside,
                "background-overlay": prototypeParams.backgroundOverlay,
                trigger: prototypeParams.trigger,
                delay: prototypeParams.delay,
                animation: toRpcPrototypeAnimation(prototypeParams.animation),
            },
            rpc.token
        );
        writeOk(
            io,
            format,
            {
                fileId: prototypeParams.fileId,
                pageId: prototypeParams.pageId,
                sourceShapeId: prototypeParams.sourceShapeId,
                interaction: result.interaction,
                revn: result.revn,
                vern: result.vern,
                adapter: adapterSelection.selected,
                adapterSelection,
            },
            () => writePrototypeInteractionCreatedText(io, prototypeParams.fileId, result.interaction)
        );
        return 0;
    } catch (cause) {
        return rpcErrorResponse(io, format, "create-file-prototype-overlay", rpc.backendUri, cause);
    }
}

async function handlePrototypeListInteractions(args: string[], io: CliIO, env: NodeJS.ProcessEnv): Promise<number> {
    const format = parseFormat(args, io);
    if (!format) {
        return 2;
    }

    const adapterSelection = selectCliPrototypeAdapter(CommandDescriptors.PROTOTYPE_LIST_INTERACTIONS.id, args);
    if (adapterSelection.status !== "selected" || adapterSelection.selected !== "backend-command") {
        return adapterSelectionFailure(io, format, adapterSelection);
    }

    const prototypeParams = parsePrototypeListInteractionsParams(args, io, format);
    if (!prototypeParams) {
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
            "get-file-prototype-interactions",
            {
                id: prototypeParams.fileId,
                "page-id": prototypeParams.pageId,
                "flow-id": prototypeParams.flowId,
                "source-shape-id": prototypeParams.sourceShapeId,
            },
            rpc.token
        );
        const flows = Array.isArray(result.flows) ? result.flows : [];
        const interactions = Array.isArray(result.interactions) ? result.interactions : [];
        writeOk(
            io,
            format,
            {
                fileId: prototypeParams.fileId,
                pageId: prototypeParams.pageId,
                flowId: prototypeParams.flowId,
                sourceShapeId: prototypeParams.sourceShapeId,
                flows,
                interactions,
                adapter: adapterSelection.selected,
                adapterSelection,
            },
            () => writePrototypeInteractionsText(io, prototypeParams.fileId, flows, interactions)
        );
        return 0;
    } catch (cause) {
        return rpcErrorResponse(io, format, "get-file-prototype-interactions", rpc.backendUri, cause);
    }
}

async function handlePrototypeDeleteInteraction(args: string[], io: CliIO, env: NodeJS.ProcessEnv): Promise<number> {
    const format = parseFormat(args, io);
    if (!format) {
        return 2;
    }

    const adapterSelection = selectCliPrototypeAdapter(CommandDescriptors.PROTOTYPE_DELETE_INTERACTION.id, args);
    if (adapterSelection.status !== "selected" || adapterSelection.selected !== "backend-command") {
        return adapterSelectionFailure(io, format, adapterSelection);
    }

    const prototypeParams = parsePrototypeDeleteInteractionParams(args, io, format);
    if (!prototypeParams) {
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
            "delete-file-prototype-interaction",
            {
                id: prototypeParams.fileId,
                "page-id": prototypeParams.pageId,
                "interaction-id": prototypeParams.interactionId,
                "source-shape-id": prototypeParams.sourceShapeId,
                "interaction-index": prototypeParams.interactionIndex,
            },
            rpc.token
        );
        const interaction = asRecord(result.interaction);
        writeOk(
            io,
            format,
            {
                fileId: prototypeParams.fileId,
                pageId: prototypeParams.pageId,
                interactionId: prototypeParams.interactionId ?? interaction.interactionId ?? interaction["interaction-id"],
                sourceShapeId: prototypeParams.sourceShapeId ?? interaction.sourceShapeId ?? interaction["source-shape-id"],
                interactionIndex: prototypeParams.interactionIndex ?? interaction.index,
                interaction: result.interaction,
                revn: result.revn,
                vern: result.vern,
                adapter: adapterSelection.selected,
                adapterSelection,
            },
            () => writePrototypeInteractionDeletedText(io, prototypeParams.fileId, result.interaction)
        );
        return 0;
    } catch (cause) {
        return rpcErrorResponse(io, format, "delete-file-prototype-interaction", rpc.backendUri, cause);
    }
}

async function handlePrototypeUpdateInteraction(args: string[], io: CliIO, env: NodeJS.ProcessEnv): Promise<number> {
    const format = parseFormat(args, io);
    if (!format) {
        return 2;
    }

    const adapterSelection = selectCliPrototypeAdapter(CommandDescriptors.PROTOTYPE_UPDATE_INTERACTION.id, args);
    if (adapterSelection.status !== "selected" || adapterSelection.selected !== "backend-command") {
        return adapterSelectionFailure(io, format, adapterSelection);
    }

    const prototypeParams = parsePrototypeUpdateInteractionParams(args, io, format);
    if (!prototypeParams) {
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
            "update-file-prototype-interaction",
            {
                id: prototypeParams.fileId,
                "page-id": prototypeParams.pageId,
                "interaction-id": prototypeParams.interactionId,
                "source-shape-id": prototypeParams.sourceShapeId,
                "interaction-index": prototypeParams.interactionIndex,
                "destination-board-id": prototypeParams.destinationBoardId,
                "relative-to-shape-id": prototypeParams.relativeToShapeId,
                "overlay-position-type": prototypeParams.overlayPositionType,
                "manual-position": prototypeParams.manualPosition,
                "close-click-outside": prototypeParams.closeClickOutside,
                "background-overlay": prototypeParams.backgroundOverlay,
                trigger: prototypeParams.trigger,
                delay: prototypeParams.delay,
                "preserve-scroll-position": prototypeParams.preserveScrollPosition,
                animation: toRpcPrototypeAnimation(prototypeParams.animation),
            },
            rpc.token
        );
        const interaction = asRecord(result.interaction);
        writeOk(
            io,
            format,
            {
                fileId: prototypeParams.fileId,
                pageId: prototypeParams.pageId,
                interactionId: prototypeParams.interactionId ?? interaction.interactionId ?? interaction["interaction-id"],
                sourceShapeId: prototypeParams.sourceShapeId ?? interaction.sourceShapeId ?? interaction["source-shape-id"],
                interactionIndex: prototypeParams.interactionIndex ?? interaction.index,
                interaction: result.interaction,
                revn: result.revn,
                vern: result.vern,
                adapter: adapterSelection.selected,
                adapterSelection,
            },
            () => writePrototypeInteractionMutationText(io, "Prototype interaction updated", prototypeParams.fileId, result.interaction)
        );
        return 0;
    } catch (cause) {
        return rpcErrorResponse(io, format, "update-file-prototype-interaction", rpc.backendUri, cause);
    }
}

async function handlePrototypeReorderInteraction(args: string[], io: CliIO, env: NodeJS.ProcessEnv): Promise<number> {
    const format = parseFormat(args, io);
    if (!format) {
        return 2;
    }

    const adapterSelection = selectCliPrototypeAdapter(CommandDescriptors.PROTOTYPE_REORDER_INTERACTION.id, args);
    if (adapterSelection.status !== "selected" || adapterSelection.selected !== "backend-command") {
        return adapterSelectionFailure(io, format, adapterSelection);
    }

    const prototypeParams = parsePrototypeReorderInteractionParams(args, io, format);
    if (!prototypeParams) {
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
            "reorder-file-prototype-interaction",
            {
                id: prototypeParams.fileId,
                "page-id": prototypeParams.pageId,
                "interaction-id": prototypeParams.interactionId,
                "source-shape-id": prototypeParams.sourceShapeId,
                "interaction-index": prototypeParams.interactionIndex,
                "to-index": prototypeParams.toIndex,
            },
            rpc.token
        );
        const interaction = asRecord(result.interaction);
        writeOk(
            io,
            format,
            {
                fileId: prototypeParams.fileId,
                pageId: prototypeParams.pageId,
                interactionId: prototypeParams.interactionId ?? interaction.interactionId ?? interaction["interaction-id"],
                sourceShapeId: prototypeParams.sourceShapeId ?? interaction.sourceShapeId ?? interaction["source-shape-id"],
                interactionIndex: interaction.index ?? prototypeParams.toIndex,
                interaction: result.interaction,
                revn: result.revn,
                vern: result.vern,
                adapter: adapterSelection.selected,
                adapterSelection,
            },
            () => writePrototypeInteractionMutationText(io, "Prototype interaction reordered", prototypeParams.fileId, result.interaction)
        );
        return 0;
    } catch (cause) {
        return rpcErrorResponse(io, format, "reorder-file-prototype-interaction", rpc.backendUri, cause);
    }
}

async function handlePrototypeDuplicateInteraction(args: string[], io: CliIO, env: NodeJS.ProcessEnv): Promise<number> {
    const format = parseFormat(args, io);
    if (!format) {
        return 2;
    }

    const adapterSelection = selectCliPrototypeAdapter(CommandDescriptors.PROTOTYPE_DUPLICATE_INTERACTION.id, args);
    if (adapterSelection.status !== "selected" || adapterSelection.selected !== "backend-command") {
        return adapterSelectionFailure(io, format, adapterSelection);
    }

    const prototypeParams = parsePrototypeDuplicateInteractionParams(args, io, format);
    if (!prototypeParams) {
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
            "duplicate-file-prototype-interaction",
            {
                id: prototypeParams.fileId,
                "page-id": prototypeParams.pageId,
                "interaction-id": prototypeParams.interactionId,
                "source-shape-id": prototypeParams.sourceShapeId,
                "interaction-index": prototypeParams.interactionIndex,
                "insertion-index": prototypeParams.insertionIndex,
            },
            rpc.token
        );
        const interaction = asRecord(result.interaction);
        writeOk(
            io,
            format,
            {
                fileId: prototypeParams.fileId,
                pageId: prototypeParams.pageId,
                interactionId: interaction.interactionId ?? interaction["interaction-id"],
                sourceShapeId: prototypeParams.sourceShapeId ?? interaction.sourceShapeId ?? interaction["source-shape-id"],
                interactionIndex: interaction.index ?? prototypeParams.insertionIndex,
                interaction: result.interaction,
                revn: result.revn,
                vern: result.vern,
                adapter: adapterSelection.selected,
                adapterSelection,
            },
            () => writePrototypeInteractionMutationText(io, "Prototype interaction duplicated", prototypeParams.fileId, result.interaction)
        );
        return 0;
    } catch (cause) {
        return rpcErrorResponse(io, format, "duplicate-file-prototype-interaction", rpc.backendUri, cause);
    }
}

async function handlePrototypeCommand(args: string[], io: CliIO, env: NodeJS.ProcessEnv): Promise<number> {
    const [subcommand, ...rest] = args;

    if (isHelpFlag(subcommand)) {
        writeLine(io.stdout, PROTOTYPE_HELP_TEXT);
        return 0;
    }

    switch (subcommand) {
        case "create-flow":
            return await handlePrototypeCreateFlow(rest, io, env);
        case "create-interaction":
            return await handlePrototypeCreateInteraction(rest, io, env);
        case "create-overlay":
            return await handlePrototypeCreateOverlay(rest, io, env);
        case "list-interactions":
            return await handlePrototypeListInteractions(rest, io, env);
        case "delete-interaction":
            return await handlePrototypeDeleteInteraction(rest, io, env);
        case "update-interaction":
            return await handlePrototypeUpdateInteraction(rest, io, env);
        case "reorder-interaction":
            return await handlePrototypeReorderInteraction(rest, io, env);
        case "duplicate-interaction":
            return await handlePrototypeDuplicateInteraction(rest, io, env);
        default:
            writeLine(io.stderr, `Unknown prototype command: ${subcommand}`);
            writeLine(io.stderr, 'Run "penpot-cli prototype --help" for usage.');
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

function exportFileContractErrorResponse(io: CliIO, format: Format, cause: unknown): number {
    const message = cause instanceof Error ? cause.message : "Invalid export file options.";
    writeError(
        io,
        format,
        "export_file_contract_invalid",
        message,
        [
            "Use --library-mode all, merge, or detach.",
            "Use --export-format penpot when exporting a file archive.",
            "Avoid setting conflicting library flags such as --include-libraries with --embed-assets.",
        ],
        {
            details: asRecord(cause),
        }
    );
    return 2;
}

function renderThumbnailContractErrorResponse(io: CliIO, format: Format, cause: unknown): number {
    const message = cause instanceof Error ? cause.message : "Invalid render thumbnail options.";
    writeError(
        io,
        format,
        "render_thumbnail_contract_invalid",
        message,
        [
            "Use --target file or --target frame.",
            "Use --cache-policy reuse or refresh.",
            "Use --width <integer> between 1 and 4096.",
        ],
        {
            details: asRecord(cause),
        }
    );
    return 2;
}

async function handleExportFile(args: string[], io: CliIO, env: NodeJS.ProcessEnv): Promise<number> {
    const format = parseFormat(args, io);
    if (!format) {
        return 2;
    }

    let plan: ExportFilePlan;
    try {
        plan = createExportFilePlan(args, env);
    } catch (cause) {
        return exportFileContractErrorResponse(io, format, cause);
    }

    if (!plan.fileId) {
        writeError(io, format, "file_id_required", "export file requires --file <file-id>.", [
            "Open or list files first, then pass --file <file-id>.",
        ]);
        return 2;
    }

    if (plan.adapterSelection.status !== "selected" || plan.adapterSelection.selected !== "backend-rpc") {
        return adapterSelectionFailure(io, format, plan.adapterSelection);
    }

    if (plan.dryRun) {
        writeOk(io, format, plan, () => writeExportFilePlanText(io, plan));
        return 0;
    }

    try {
        const result = await executeExportFilePlan(plan, args, env);
        writeOk(io, format, result, () => writeExportFileResultText(io, result));
        return 0;
    } catch (cause) {
        return exportFileErrorResponse(io, format, plan, cause);
    }
}

async function handleRenderPreview(args: string[], io: CliIO, env: NodeJS.ProcessEnv): Promise<number> {
    const format = parseFormat(args, io);
    if (!format) {
        return 2;
    }

    const plan = createRenderPreviewPlan(args, env);
    if (!plan.fileId) {
        writeError(io, format, "file_id_required", "render preview requires --file <file-id>.", [
            "Open or list files first, then pass --file <file-id>.",
        ]);
        return 2;
    }

    if (!plan.pageId) {
        writeError(io, format, "page_id_required", "render preview requires --page <page-id>.", [
            "Run penpot-cli page list --file <file-id> first, then pass --page <page-id>.",
        ]);
        return 2;
    }

    if (!plan.objectId) {
        writeError(io, format, "object_id_required", "render preview requires --object <object-id>.", [
            "Pass the page root frame or another renderable object id.",
            "Headless preview cannot use the current live selection.",
        ]);
        return 2;
    }

    if (plan.adapterSelection.status !== "selected" || plan.adapterSelection.selected !== "exporter") {
        return adapterSelectionFailure(io, format, plan.adapterSelection);
    }

    if (!Number.isFinite(plan.scale) || plan.scale <= 0 || plan.scale > 16) {
        writeError(io, format, "export_scale_invalid", "Preview scale must be greater than 0 and at most 16.", [
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

async function handleRenderThumbnail(args: string[], io: CliIO, env: NodeJS.ProcessEnv): Promise<number> {
    const format = parseFormat(args, io);
    if (!format) {
        return 2;
    }

    let plan: RenderThumbnailPlan;
    try {
        plan = createRenderThumbnailPlan(args, env);
    } catch (cause) {
        return renderThumbnailContractErrorResponse(io, format, cause);
    }

    if (plan.requires.includes("fileId")) {
        writeError(io, format, "file_id_required", "render thumbnail requires --file <file-id>.", [
            "Open or list files first, then pass --file <file-id>.",
        ]);
        return 2;
    }

    if (plan.requires.includes("pageId")) {
        writeError(io, format, "page_id_required", "render thumbnail --target frame requires --page <page-id>.", [
            "Pass --page <page-id> together with --object <object-id> for tagged frame thumbnails.",
        ]);
        return 2;
    }

    if (plan.requires.includes("objectId")) {
        writeError(io, format, "object_id_required", "render thumbnail --target frame requires --object <object-id>.", [
            "Pass --object <object-id> together with --page <page-id> for tagged frame thumbnails.",
        ]);
        return 2;
    }

    if (plan.adapterSelection.status !== "selected" || plan.adapterSelection.selected !== "renderer-service") {
        return adapterSelectionFailure(io, format, plan.adapterSelection);
    }

    if (plan.dryRun) {
        writeOk(io, format, plan, () => writeRenderThumbnailPlanText(io, plan));
        return 0;
    }

    writeError(
        io,
        format,
        "renderer_service_unavailable",
        "render thumbnail execution is not available until the thumbnail renderer service is implemented.",
        [
            "Re-run with --dry-run to inspect the renderer-service request without rendering.",
            "Implement and configure the thumbnail renderer service before executing this command.",
            "Keep using render preview or export page for existing exporter-backed object previews.",
        ],
        {
            command: plan.command,
            adapter: plan.adapter,
            endpoint: plan.endpoint,
            client: plan.client,
            availability: plan.availability,
            optInConfiguration: plan.optInConfiguration,
            executionGate: plan.executionGate,
            healthPreflight: plan.healthPreflight,
            executionClientHarness: plan.executionClientHarness,
            dispatchAdapterBoundary: plan.dispatchAdapterBoundary,
            unavailableErrorTaxonomy: plan.unavailableErrorTaxonomy,
            integrationFixtureHarness: plan.integrationFixtureHarness,
            dispatchRegistrationPreflight: plan.dispatchRegistrationPreflight,
            executableAdapterRegistrationScaffold: plan.executableAdapterRegistrationScaffold,
            adapterRegistryManifest: plan.adapterRegistryManifest,
            enablementChecklist: plan.enablementChecklist,
            implementationSliceAudit: plan.implementationSliceAudit,
            healthNoopContractFixtures: plan.healthNoopContractFixtures,
            noopServiceHostScaffold: plan.noopServiceHostScaffold,
            hostLifecycleTestFixtures: plan.hostLifecycleTestFixtures,
            packageManifestScaffold: plan.packageManifestScaffold,
            packageCreationGuardrails: plan.packageCreationGuardrails,
            packageFileTemplates: plan.packageFileTemplates,
            packageWorkspaceWiring: plan.packageWorkspaceWiring,
            packageBuildVerification: plan.packageBuildVerification,
            packageMaterializationChecklist: plan.packageMaterializationChecklist,
            packageCreationDryRunSummary: plan.packageCreationDryRunSummary,
            packageCreationFileManifest: plan.packageCreationFileManifest,
            packageMaterializationApprovalGate: plan.packageMaterializationApprovalGate,
            packageMaterializationExecutionDryRun: plan.packageMaterializationExecutionDryRun,
            packageMaterializationWriteContract: plan.packageMaterializationWriteContract,
            packageMaterializationRollbackContract: plan.packageMaterializationRollbackContract,
            packageMaterializationVerificationManifest: plan.packageMaterializationVerificationManifest,
            packageMaterializationFinalApprovalChecklist: plan.packageMaterializationFinalApprovalChecklist,
            packageMaterializationExplicitApprovalToken: plan.packageMaterializationExplicitApprovalToken,
            packageMaterializationApprovalAuditTrail: plan.packageMaterializationApprovalAuditTrail,
            packageMaterializationApprovalReplayGuard: plan.packageMaterializationApprovalReplayGuard,
            packageMaterializationApprovalExpiryPolicy: plan.packageMaterializationApprovalExpiryPolicy,
            packageMaterializationApprovalRevocationPolicy: plan.packageMaterializationApprovalRevocationPolicy,
            packageMaterializationApprovalScopeBindingPolicy: plan.packageMaterializationApprovalScopeBindingPolicy,
            packageMaterializationApprovalOperatorConfirmationPolicy: plan.packageMaterializationApprovalOperatorConfirmationPolicy,
            packageMaterializationApprovalEmergencyStopPolicy: plan.packageMaterializationApprovalEmergencyStopPolicy,
            packageMaterializationApprovalReadinessVerdictPolicy: plan.packageMaterializationApprovalReadinessVerdictPolicy,
            packageMaterializationApprovalExecutionHandoffPolicy: plan.packageMaterializationApprovalExecutionHandoffPolicy,
            packageMaterializationApprovalPostHandoffAuditPolicy: plan.packageMaterializationApprovalPostHandoffAuditPolicy,
            clientRequest: plan.clientRequest,
            requiredCapabilities: plan.requiredCapabilities,
            serviceRequest: plan.serviceRequest,
        }
    );
    return 2;
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
        case "file":
            return await handleExportFile(rest, io, env);
        default:
            writeLine(io.stderr, `Unknown export command: ${subcommand}`);
            writeLine(io.stderr, 'Run "penpot-cli export --help" for usage.');
            return 2;
    }
}

async function handleRenderCommand(args: string[], io: CliIO, env: NodeJS.ProcessEnv): Promise<number> {
    const [subcommand, ...rest] = args;

    if (isHelpFlag(subcommand)) {
        writeLine(io.stdout, RENDER_HELP_TEXT);
        return 0;
    }

    switch (subcommand) {
        case "preview":
            return await handleRenderPreview(rest, io, env);
        case "thumbnail":
            return await handleRenderThumbnail(rest, io, env);
        default:
            writeLine(io.stderr, `Unknown render command: ${subcommand}`);
            writeLine(io.stderr, 'Run "penpot-cli render --help" for usage.');
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

    if (first === "prototype") {
        return await handlePrototypeCommand(argv.slice(1), io, env);
    }

    if (first === "export") {
        return await handleExportCommand(argv.slice(1), io, env);
    }

    if (first === "render") {
        return await handleRenderCommand(argv.slice(1), io, env);
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
