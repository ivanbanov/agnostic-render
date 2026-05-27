import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@render-experiment/behavior-core": resolve(
        __dirname,
        "../packages/core/behavior/src",
      ),
      "@render-experiment/behavior-react": resolve(
        __dirname,
        "../packages/react/behavior/src",
      ),
      "@render-experiment/style-react": resolve(
        __dirname,
        "../packages/react/style/src",
      ),
      "@render-experiment/tooltip-core": resolve(
        __dirname,
        "../packages/core/components/tooltip/src",
      ),
      "@render-experiment/tooltip-react": resolve(
        __dirname,
        "../packages/react/components/tooltip/src",
      ),
    },
  },
});
