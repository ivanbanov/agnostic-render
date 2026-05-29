import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@render-experiment/store": resolve(
        __dirname,
        "../../packages/core/store/src",
      ),
      "@render-experiment/machine-core": resolve(
        __dirname,
        "../../packages/core/machine/src",
      ),
      "@render-experiment/machine-pixi": resolve(
        __dirname,
        "../../packages/pixi/machine/src",
      ),
      "@render-experiment/style-engine-pixi": resolve(
        __dirname,
        "../../packages/pixi/style-engine/src",
      ),
      "@render-experiment/tooltip-core": resolve(
        __dirname,
        "../../packages/core/components/tooltip/src",
      ),
      "@render-experiment/tooltip-pixi": resolve(
        __dirname,
        "../../packages/pixi/components/tooltip/src",
      ),
      "@render-experiment/dropdown-menu-core": resolve(
        __dirname,
        "../../packages/core/components/dropdown-menu/src",
      ),
      "@render-experiment/dropdown-menu-pixi": resolve(
        __dirname,
        "../../packages/pixi/components/dropdown-menu/src",
      ),
    },
  },
});
