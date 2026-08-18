import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

// Dedicated Vitest config: reuses the React plugin and the "@" alias from
// vite.config.ts but omits the Tailwind plugin (not needed for unit tests and
// it slows the run down / needs PostCSS wiring).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    // El repo vive sobre drvfs (/mnt/c/ en WSL2). El pool `forks` (default de
    // vitest 4) levanta un proceso por archivo y el arranque supera el timeout:
    // la suite reporta "no tests" con 0 tests ejecutados. `threads` evita el
    // spawn de procesos y arranca sin problema. Ver LLE-368.
    pool: "threads",
  },
});
