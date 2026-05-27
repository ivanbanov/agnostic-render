// Metro config for Expo in a pnpm monorepo.
//
// Two non-default settings that matter:
//
// 1. `watchFolders` includes the monorepo root so Metro watches workspace
//    package source files (otherwise edits to packages/* don't trigger
//    reloads).
//
// 2. `nodeModulesPaths` includes BOTH this sandbox's node_modules AND the
//    repo root's, because pnpm hoists some deps to the root and keeps
//    others local. Without this, Metro can't resolve react-native or
//    expo when imported from a workspace package.
//
// 3. `disableHierarchicalLookup: true` prevents Metro from walking up
//    the filesystem looking for stray node_modules. Combined with explicit
//    nodeModulesPaths, this avoids "duplicate React" errors that
//    pnpm + hoisting can produce.

const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

config.resolver.disableHierarchicalLookup = true;

// pnpm symlinks workspace packages into node_modules. Metro follows
// symlinks by default since 0.79; on older RN it was opt-in. Set
// explicitly for safety.
config.resolver.unstable_enableSymlinks = true;

module.exports = config;
