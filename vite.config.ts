import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// The engine as the app builds against it: a detached worktree of the engine's main
// (`../srd-rules-engine-main`), so the engine session's branches never reach the app.
const engineDir = fileURLToPath(new URL("../srd-rules-engine-main", import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    // The app and the engine share one Zod.
    dedupe: ["zod"],
  },
  server: {
    // The engine is a symlink to that worktree.
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
