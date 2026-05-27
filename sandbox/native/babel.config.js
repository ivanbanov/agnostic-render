// Babel config for Expo + pnpm monorepo.
//
// Standard Expo preset plus a module-resolver alias so workspace packages
// (which live as symlinks in node_modules) resolve cleanly through Metro.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
  };
};
