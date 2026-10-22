import { defineConfig } from "vitest/config";
import preact from "@preact/preset-vite";

export default defineConfig({
  plugins: [preact()],
  test: {
    setupFiles: ["tests/setup.ts"],
    projects: [
      {
        extends: true,
        test: { name: "node", environment: "node", include: ["tests/unit/**/*.test.ts", "tests/golden/**/*.test.ts"] },
      },
      {
        extends: true,
        test: { name: "component", environment: "happy-dom", include: ["tests/component/**/*.test.tsx"] },
      },
    ],
  },
});
