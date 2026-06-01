/**
 * Jest project for React Native component tests.
 *
 * RN component tests run under Jest (not vitest): @testing-library/
 * react-native + react-test-renderer are built for Jest, and jest-expo
 * supplies the RN/Flow transform, the RN environment, and the native-module
 * mocks (BackHandler, Dimensions, …) out of the box.
 *
 * Everything else in the repo stays on vitest. This config only matches
 * `*.native.test.tsx` files under packages/native.
 *
 * Loaded via ts-node (see the `ts-node` block below — the repo root is an
 * ESM package, so ts-node transpiles this config to CommonJS just for Jest's
 * config loader). Run with: pnpm test:native
 */
import type { Config } from "jest";
import { resolve } from "node:path";

/** Workspace package aliases — these are `workspace:*`, not published. */
const r = (p: string) => resolve(__dirname, p);

const moduleNameMapper: Record<string, string> = {
  "^@render-experiment/utils$": r("packages/shared/utils/src"),
  "^@render-experiment/tooltip-shared$": r("packages/shared/components/tooltip/src"),
  "^@render-experiment/dropdown-menu-shared$": r("packages/shared/components/dropdown-menu/src"),
  "^@render-experiment/store$": r("packages/core/store/src"),
  "^@render-experiment/machine-core$": r("packages/core/machine/src"),
  "^@render-experiment/machine-native$": r("packages/native/machine/src"),
  "^@render-experiment/style-engine-native$": r("packages/native/style-engine/src"),
  "^@render-experiment/tooltip-core$": r("packages/core/components/tooltip/src"),
  "^@render-experiment/tooltip-native$": r("packages/native/components/tooltip/src"),
  "^@render-experiment/dropdown-menu-core$": r("packages/core/components/dropdown-menu/src"),
  "^@render-experiment/dropdown-menu-native$": r("packages/native/components/dropdown-menu/src"),
};

const config: Config = {
  preset: "jest-expo",
  testMatch: ["<rootDir>/packages/native/**/tests/**/*.native.test.{ts,tsx}"],
  moduleNameMapper,
  // No custom setup file: jest-expo already wires RNTL matchers + native
  // module mocks. Add `setupFilesAfterEnv` here if a suite ever needs one.
};

export default config;
