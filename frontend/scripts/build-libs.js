import * as esbuild from "esbuild";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const frontendCacheDir =
  process.env.PENPOT_FRONTEND_CACHE_DIR ??
  "/Volumes/fushilu/.caches/penpot/frontend";
const externalIndexPath = resolve(
  process.env.PENPOT_FRONTEND_EXTERNAL_INDEX ??
    `${frontendCacheDir}/index.js`,
);
const externalIndexFilter = new RegExp(
  externalIndexPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
);

/**
 * esbuild plugin to watch a directory recursively
 */
const watchExtraDirPlugin = {
  name: "watch-extra-dir",
  setup(build) {
    build.onLoad(
      { filter: externalIndexFilter, namespace: "file" },
      async (args) => {
        return {
          watchDirs: ["packages/ui/dist"],
        };
      },
    );
  },
};

const filter =
  /react-virtualized[/\\]dist[/\\]es[/\\]WindowScroller[/\\]utils[/\\]onScroll\.js$/;

const fixReactVirtualized = {
  name: "esbuild-plugin-react-virtualized",
  setup({ onLoad }) {
    onLoad({ filter }, async ({ path }) => {
      const code = await readFile(path, "utf8");
      const broken = `import { bpfrpt_proptype_WindowScroller } from "../WindowScroller.js";`;
      return { contents: code.replace(broken, "") };
    });
  },
};

const rebuildNotify = {
  name: "rebuild-notify",
  setup(build) {
    build.onEnd((result) => {
      // console.log(result);
      // [:main] Build completed. (1003 files, 1 compiled, 0 warnings, 9.06s)
      console.log(
        `[:libs] Build completed. (${result.errors.length} warnings, ${result.errors.length} errors)`,
      );
    });
  },
};

const config = {
  entryPoints: [externalIndexPath],
  bundle: true,
  format: "esm",
  banner: {
    js: '"use strict";\nvar global = globalThis;',
  },
  outfile: "resources/public/js/libs.js",
  plugins: [fixReactVirtualized, rebuildNotify, watchExtraDirPlugin],
};

async function watch() {
  let ctx = await esbuild.context(config);
  return ctx.watch();
}

if (process.argv.includes("--watch")) {
  await watch();
} else {
  const localConfig = { ...config, minify: true };
  await esbuild.build(localConfig);
}
