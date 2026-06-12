#!/usr/bin/env node

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const VERSION = "0.1.0";

const HELP_TEXT = `penpot-cli ${VERSION}

Usage:
  penpot-cli --help
  penpot-cli --version
  penpot-cli mcp status [--format text|json]
  penpot-cli mcp config [--format text|json]
  penpot-cli mcp logs [--follow]
  penpot-cli dev up --mcp

Planned automation commands:
  penpot-cli file list
  penpot-cli file create --name <name>
  penpot-cli file open <file-id>
  penpot-cli export page --file <file-id> --page <page-id>

The CLI scaffold is ready. Runtime MCP commands will be implemented in the
next Phase 6 tasks.`;

interface Writable {
    write(chunk: string): boolean;
}

interface CliIO {
    stdout: Writable;
    stderr: Writable;
}

const DEFAULT_IO: CliIO = {
    stdout: process.stdout,
    stderr: process.stderr,
};

function writeLine(stream: Writable, text = ""): void {
    stream.write(`${text}\n`);
}

function isHelpFlag(value: string | undefined): boolean {
    return value === undefined || value === "--help" || value === "-h";
}

function isVersionFlag(value: string | undefined): boolean {
    return value === "--version" || value === "-v";
}

function isPlannedCommand(value: string | undefined): boolean {
    return value === "mcp" || value === "dev" || value === "file" || value === "export";
}

export function run(argv: string[] = process.argv.slice(2), io: CliIO = DEFAULT_IO): number {
    const first = argv[0];

    if (isHelpFlag(first)) {
        writeLine(io.stdout, HELP_TEXT);
        return 0;
    }

    if (isVersionFlag(first)) {
        writeLine(io.stdout, VERSION);
        return 0;
    }

    if (isPlannedCommand(first)) {
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
    process.exitCode = run();
}
