import { lstat, mkdir, symlink, unlink } from "node:fs/promises";
import { join, resolve } from "node:path";

const cacheDirArg = process.argv[2];

if (!cacheDirArg) {
  throw new Error("Usage: node scripts/link-node-modules-cache.mjs <cache-dir>");
}

const cacheDir = resolve(cacheDirArg);
const source = resolve("node_modules");
const target = join(cacheDir, "node_modules");

await mkdir(cacheDir, { recursive: true });

try {
  const stat = await lstat(target);
  if (!stat.isSymbolicLink()) {
    throw new Error(`${target} exists and is not a symlink`);
  }
  await unlink(target);
} catch (error) {
  if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") {
    throw error;
  }
}

await symlink(source, target, "dir");
