const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const projectRoot = __dirname;
const sdkRoot = path.resolve(projectRoot, '../../../open-dome-lib');

// 1. Watch the SDK folder
config.watchFolders = [sdkRoot];

// 2. Force Metro to use the SAME React instance for both the app and the SDK
// This solves the "Invalid hook call" (Multiple copies of React) error.
config.resolver.extraNodeModules = {
  'react': path.resolve(projectRoot, 'node_modules/react'),
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
  'react-native-web': path.resolve(projectRoot, 'node_modules/react-native-web'),
};

// ONLY block the duplicate React packages from the SDK, do NOT block viem/mqtt/etc!
config.resolver.blockList = [
  new RegExp(".*[\\\\\\\\/]open-dome-lib[\\\\\\\\/]node_modules[\\\\\\\\/]react[\\\\\\\\/].*"),
  new RegExp(".*[\\\\\\\\/]open-dome-lib[\\\\\\\\/]node_modules[\\\\\\\\/]react-dom[\\\\\\\\/].*"),
  new RegExp(".*[\\\\\\\\/]open-dome-lib[\\\\\\\\/]node_modules[\\\\\\\\/]react-native[\\\\\\\\/].*"),
  new RegExp(".*[\\\\\\\\/]open-dome-lib[\\\\\\\\/]node_modules[\\\\\\\\/]react-native-web[\\\\\\\\/].*")
];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(sdkRoot, 'node_modules') // Allow resolving SDK's dependencies (viem, mqtt, etc)
];

config.resolver.unstable_enablePackageExports = true;

module.exports = config;
