const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const projectRoot = __dirname;
const sdkRoot = path.resolve(projectRoot, '../../../open-dome-lib');

config.watchFolders = [sdkRoot];

config.resolver.extraNodeModules = {
  react: path.resolve(projectRoot, 'node_modules/react'),
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
  'react-native-web': path.resolve(projectRoot, 'node_modules/react-native-web'),
};

config.resolver.blockList = [
  new RegExp('.*[\\\\\\\\/]open-dome-lib[\\\\\\\\/]node_modules[\\\\\\\\/]react[\\\\\\\\/].*'),
  new RegExp('.*[\\\\\\\\/]open-dome-lib[\\\\\\\\/]node_modules[\\\\\\\\/]react-dom[\\\\\\\\/].*'),
  new RegExp('.*[\\\\\\\\/]open-dome-lib[\\\\\\\\/]node_modules[\\\\\\\\/]react-native[\\\\\\\\/].*'),
  new RegExp('.*[\\\\\\\\/]open-dome-lib[\\\\\\\\/]node_modules[\\\\\\\\/]react-native-web[\\\\\\\\/].*'),
];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(sdkRoot, 'node_modules'),
];

config.resolver.unstable_enablePackageExports = true;

module.exports = config;
