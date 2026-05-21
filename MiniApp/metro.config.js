const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const projectRoot = __dirname;
const sdkRoot = path.resolve(projectRoot, '../open-dome-lib');

// 1. Watch the SDK folder
config.watchFolders = [sdkRoot];

// 2. Force Metro to use the SAME React instance for both the app and the SDK
// This solves the "Invalid hook call" (Multiple copies of React) error.
config.resolver.extraNodeModules = {
  'react': path.resolve(projectRoot, 'node_modules/react'),
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
  'react-native-web': path.resolve(projectRoot, 'node_modules/react-native-web'),
};

config.resolver.blockList = [
  new RegExp(`${sdkRoot}/node_modules/.*`),
];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
];

config.resolver.unstable_enablePackageExports = true;

module.exports = config;
