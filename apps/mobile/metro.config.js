const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
// Invalidate transforms produced with the previous Nativewind Babel setup.
config.cacheVersion = "web-babel-compatibility-v2";

module.exports = config;
