import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    testTimeout: 30000,
    pool: "forks",
    exclude: ["**/node_modules/**", "**/dist/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["lib/**/*.ts"],
      exclude: [
        "lib/index.ts",
        "lib/app.ts",
        "lib/config.ts",
        "lib/controllers/air.controller.ts",
        "lib/interfaces/**",
        "lib/modules/models/**",
      ],
    },
  },
});
