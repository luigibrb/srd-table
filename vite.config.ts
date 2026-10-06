import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const engineDir = fileURLToPath(new URL("../srd-rules-engine", import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    // The app and the engine share one Zod.
    dedupe: ["zod"],
  },
  server: {
    // The engine is a symlink to the sibling repo while developing.
    fs: { allow: [".", engineDir] },
  },
  worker: { format: "es" },
  test: {
    include: ["tests/**/*.test.{ts,tsx}"],
    environment: "jsdom",
    setupFiles: ["tests/setup.ts"],
    // The real SRD is loaded once per file; component tests render whole screens.
    testTimeout: 30_000,
  },
});
