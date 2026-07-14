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
  },
});
