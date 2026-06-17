import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { access, chmod, cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const scriptDir = dirname(fileURLToPath(import.meta.url));
const cliDir = resolve(scriptDir, "..");
const repoRoot = resolve(cliDir, "..");
const outputRoot = resolve(repoRoot, "tmp", "penpot-cli-release");

async function readJson(filePath) {
    return JSON.parse(await readFile(filePath, "utf8"));
}

async function assertFile(filePath) {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
        throw new Error(`Expected file is not a regular file: ${filePath}`);
    }
}

async function assertExecutable(filePath) {
    await access(filePath, constants.X_OK);
}

async function runCommand(command, args, options = {}) {
    try {
        return await execFileAsync(command, args, {
            cwd: options.cwd ?? repoRoot,
            env: options.env ?? process.env,
        });
    } catch (error) {
        const stdout = error.stdout ? `\nstdout:\n${error.stdout}` : "";
        const stderr = error.stderr ? `\nstderr:\n${error.stderr}` : "";
        throw new Error(`Command failed: ${command} ${args.join(" ")}${stdout}${stderr}`);
    }
}

async function copyRuntimePackage(packageDir) {
    const runtimeDir = resolve(repoRoot, "command-runtime");
    const runtimePackage = await readJson(join(runtimeDir, "package.json"));
    const runtimeTarget = join(packageDir, "node_modules", "@penpot", "command-runtime");
    await mkdir(runtimeTarget, { recursive: true });
    await writeFile(join(runtimeTarget, "package.json"), `${JSON.stringify(runtimePackage, null, 2)}\n`);
    for (const fileName of runtimePackage.files ?? []) {
        await cp(join(runtimeDir, fileName), join(runtimeTarget, fileName), { recursive: true });
    }
}

async function writePortablePackageJson(packageDir, cliPackage, runtimePackage) {
    const portablePackage = {
        name: cliPackage.name,
        version: cliPackage.version,
        description: cliPackage.description,
        private: true,
        type: "module",
        bin: {
            "penpot-cli": "./bin/penpot-cli",
        },
        engines: cliPackage.engines,
        dependencies: {
            [runtimePackage.name]: runtimePackage.version,
        },
    };
    await writeFile(join(packageDir, "package.json"), `${JSON.stringify(portablePackage, null, 2)}\n`);
}

async function writeReleaseNotes(packageDir, cliPackage, runtimePackage, archiveName) {
    const releaseNotes = `# penpot-cli Portable Release

Package: ${cliPackage.name}@${cliPackage.version}
Runtime: ${runtimePackage.name}@${runtimePackage.version}
Archive: ${archiveName}

This archive is intended for private fork distribution. It includes the built
CLI entry point and a local node_modules copy of @penpot/command-runtime so it
can run without a pnpm workspace link.

Smoke checks:

\`\`\`bash
node dist/index.js --help
node bin/penpot-cli mcp config --format json
\`\`\`
`;
    await writeFile(join(packageDir, "RELEASE.md"), releaseNotes);
}

async function writeBinWrapper(packageDir) {
    const binDir = join(packageDir, "bin");
    const binPath = join(binDir, "penpot-cli");
    await mkdir(binDir, { recursive: true });
    await writeFile(
        binPath,
        `#!/usr/bin/env node
import { run } from "../dist/index.js";

process.exitCode = await run();
`
    );
    await chmod(binPath, 0o755);
}

async function createReleasePackage() {
    const cliPackage = await readJson(join(cliDir, "package.json"));
    const runtimePackage = await readJson(resolve(repoRoot, "command-runtime", "package.json"));
    const packageDirName = `${cliPackage.name}-${cliPackage.version}`;
    const packageDir = join(outputRoot, packageDirName);
    const archivePath = join(outputRoot, `${packageDirName}.tar.gz`);

    await assertFile(join(cliDir, "dist", "index.js"));
    await rm(outputRoot, { recursive: true, force: true });
    await mkdir(packageDir, { recursive: true });

    await cp(join(cliDir, "dist"), join(packageDir, "dist"), { recursive: true });
    await cp(join(cliDir, "README.md"), join(packageDir, "README.md"));
    await copyRuntimePackage(packageDir);
    await writePortablePackageJson(packageDir, cliPackage, runtimePackage);
    await writeBinWrapper(packageDir);
    await writeReleaseNotes(packageDir, cliPackage, runtimePackage, `${packageDirName}.tar.gz`);

    await runCommand("tar", ["-czf", archivePath, "-C", outputRoot, packageDirName]);

    return {
        cliPackage,
        runtimePackage,
        packageDirName,
        packageDir,
        archivePath,
    };
}

async function verifyReleasePackage(release) {
    const expectedFiles = [
        "package.json",
        "README.md",
        "RELEASE.md",
        "bin/penpot-cli",
        "dist/index.js",
        "node_modules/@penpot/command-runtime/package.json",
        "node_modules/@penpot/command-runtime/index.js",
        "node_modules/@penpot/command-runtime/index.d.ts",
    ];

    for (const relativePath of expectedFiles) {
        await assertFile(join(release.packageDir, relativePath));
    }
    await assertExecutable(join(release.packageDir, "bin", "penpot-cli"));
    await assertFile(release.archivePath);

    const checkRoot = join(outputRoot, "check");
    await rm(checkRoot, { recursive: true, force: true });
    await mkdir(checkRoot, { recursive: true });
    await runCommand("tar", ["-xzf", release.archivePath, "-C", checkRoot]);

    const extractedPackage = join(checkRoot, release.packageDirName);
    const help = await runCommand(process.execPath, ["dist/index.js", "--help"], { cwd: extractedPackage });
    if (!help.stdout.includes(`penpot-cli ${release.cliPackage.version}`)) {
        throw new Error("Portable dist help output did not include the expected CLI version.");
    }

    const config = await runCommand(process.execPath, ["bin/penpot-cli", "mcp", "config", "--format", "json"], {
        cwd: extractedPackage,
    });
    const parsedConfig = JSON.parse(config.stdout);
    if (parsedConfig.status !== "ok" || parsedConfig.data.mode !== "builtin") {
        throw new Error("Portable bin smoke check did not return the expected MCP config JSON.");
    }
}

const release = await createReleasePackage();
await verifyReleasePackage(release);

console.log(`penpot-cli release archive: ${release.archivePath}`);
console.log(`penpot-cli release directory: ${release.packageDir}`);
