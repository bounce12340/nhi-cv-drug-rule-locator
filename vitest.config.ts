import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "packages/**/src/**/*.test.ts",
      "apps/**/src/**/*.test.ts",
      "scripts/__tests__/**/*.test.mjs"
    ],
    environment: "node"
  }
});
