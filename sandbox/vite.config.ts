import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@render-experiment/behavior-core": resolve(
        __dirname,
        "../packages/behavior/core/src",
      ),
      "@render-experiment/behavior-react": resolve(
        __dirname,
        "../packages/behavior/react/src",
      ),
      "@render-experiment/style-react": resolve(
        __dirname,
        "../packages/style/react/src",
      ),
      "@render-experiment/tooltip-core": resolve(
        __dirname,
        "../packages/components/core/tooltip/src",
      ),
      "@render-experiment/tooltip-react": resolve(
        __dirname,
        "../packages/components/react/tooltip/src",
      ),
    },
  },
});
