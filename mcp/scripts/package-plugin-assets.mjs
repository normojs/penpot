#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const mcpRoot = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(mcpRoot, "..");
const pluginRoot = path.join(mcpRoot, "packages", "plugin");
const defaultSourceDir = path.join(pluginRoot, "dist");
const defaultTargetDir = path.join(repoRoot, "frontend", "resources", "public", "plugins", "mcp");
const metadataFile = "mcp-plugin.json";

function parseArgs(argv) {
    const args = {
        command: argv[2] ?? "check",
        source: defaultSourceDir,
        target: defaultTargetDir,
    };

    for (let index = 3; index < argv.length; index += 1) {
        const arg = argv[index];
        if (arg === "--source") {
            args.source = path.resolve(argv[++index]);
        } else if (arg === "--target") {
            args.target = path.resolve(argv[++index]);
        } else {
            throw new Error(`Unknown argument: ${arg}`);
        }
    }

    return args;
}

async function readJson(filePath) {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function readProtocolVersion() {
    const content = await fs.readFile(path.join(mcpRoot, "packages", "common", "src", "types.ts"), "utf8");
    const match = content.match(/export const MCP_PROTOCOL_VERSION = "([^"]+)";/);
    if (!match) {
        throw new Error("Unable to find MCP_PROTOCOL_VERSION in mcp/packages/common/src/types.ts");
    }
    return match[1];
}

async function createMetadata(sourceDir) {
    const [mcpPackage, pluginPackage, manifest, protocolVersion] = await Promise.all([
        readJson(path.join(mcpRoot, "package.json")),
        readJson(path.join(pluginRoot, "package.json")),
        readJson(path.join(sourceDir, "manifest.json")),
        readProtocolVersion(),
    ]);

    return {
        name: manifest.name,
        packageName: mcpPackage.name,
        packageVersion: mcpPackage.version,
        pluginPackageName: pluginPackage.name,
        pluginPackageVersion: pluginPackage.version,
        protocolVersion,
        manifestVersion: manifest.version,
        code: manifest.code,
        icon: manifest.icon,
    };
}

async function writeMetadata(sourceDir) {
    await ensurePluginFiles(sourceDir, { metadata: false });
    const metadata = await createMetadata(sourceDir);
    await fs.writeFile(path.join(sourceDir, metadataFile), `${JSON.stringify(metadata, null, 2)}\n`);
    console.log(`Wrote ${path.relative(repoRoot, path.join(sourceDir, metadataFile))}`);
}

async function packageAssets(sourceDir, targetDir) {
    await writeMetadata(sourceDir);
    await fs.rm(targetDir, { force: true, recursive: true });
    await fs.mkdir(path.dirname(targetDir), { recursive: true });
    await fs.cp(sourceDir, targetDir, { recursive: true });
    await verifyAssets(targetDir);
    console.log(`Packaged MCP plugin assets into ${path.relative(repoRoot, targetDir)}`);
}

async function checkAssets(targetDir) {
    await verifyAssets(targetDir);
    console.log(`MCP plugin assets are valid in ${path.relative(repoRoot, targetDir)}`);
}

async function verifyAssets(targetDir) {
    await ensurePluginFiles(targetDir, { metadata: true });

    const [manifest, metadata, expectedMetadata] = await Promise.all([
        readJson(path.join(targetDir, "manifest.json")),
        readJson(path.join(targetDir, metadataFile)),
        createMetadata(targetDir),
    ]);

    if (manifest.code !== "plugin.js") {
        throw new Error(`Expected manifest code to be plugin.js, got ${JSON.stringify(manifest.code)}`);
    }

    for (const [key, value] of Object.entries(expectedMetadata)) {
        if (metadata[key] !== value) {
            throw new Error(
                `MCP plugin metadata mismatch for ${key}: expected ${JSON.stringify(value)}, got ${JSON.stringify(
                    metadata[key]
                )}`
            );
        }
    }
}

async function ensurePluginFiles(dir, options) {
    const requiredFiles = ["manifest.json", "plugin.js", "index.html", "icon.jpg"];
    if (options.metadata) {
        requiredFiles.push(metadataFile);
    }

    await Promise.all(
        requiredFiles.map(async (file) => {
            const filePath = path.join(dir, file);
            try {
                const stat = await fs.stat(filePath);
                if (!stat.isFile()) {
                    throw new Error(`${filePath} is not a file`);
                }
            } catch (error) {
                if (error?.code === "ENOENT") {
                    throw new Error(`Missing MCP plugin asset: ${path.relative(repoRoot, filePath)}`);
                }
                throw error;
            }
        })
    );
}

const args = parseArgs(process.argv);

if (args.command === "metadata") {
    await writeMetadata(args.source);
} else if (args.command === "package") {
    await packageAssets(args.source, args.target);
} else if (args.command === "check") {
    await checkAssets(args.target);
} else {
    throw new Error(`Unknown command: ${args.command}`);
}
