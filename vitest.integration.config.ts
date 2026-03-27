import { defineConfig, mergeConfig } from "vitest/config";

import base from "./vitest.config";

export default mergeConfig(
  base,
  defineConfig({
    test: {
      include: ["tests/integration/**/*.test.ts"],
      globalSetup: ["tests/integration/setup/global-setup.ts"],
      fileParallelism: false,
      testTimeout: 15000,
    },
  }),
);
