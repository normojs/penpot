/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import { configDefaults } from "vitest/config";
import { resolve } from "path";

import { playwright } from '@vitest/browser-playwright'

// https://vitejs.dev/config/
import path from "node:path";
import { fileURLToPath } from "node:url";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
const dirname =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));
const frontendCacheDir =
  process.env.PENPOT_FRONTEND_CACHE_DIR ??
  "/Volumes/fushilu/.caches/penpot/frontend";
const storybookOutputDir =
  process.env.PENPOT_FRONTEND_STORYBOOK_OUTPUT_DIR ??
  path.join(frontendCacheDir, "storybook");

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, "target/**", "resources/**"],
    environment: "jsdom",
    projects: [
      {
        extends: true,
        plugins: [
          // The plugin will run tests for the stories defined in your Storybook config
          // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
          storybookTest({
            configDir: path.join(dirname, ".storybook"),
          }),
        ],
        test: {
          name: "storybook",
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({
              launchOptions: {
                slowMo: 100,
                timeout: 160000,
              },
              actionTimeout: 5000,
            }),
            instances: [
              {browser: "chromium"},
            ],
          },
          setupFiles: [".storybook/vitest.setup.ts"],
        },
      },
    ],
  },
  resolve: {
    alias: {
      "@target": resolve(dirname, storybookOutputDir),
      "@public": resolve(dirname, "./resources/public/js/"),
    },
  },
});
