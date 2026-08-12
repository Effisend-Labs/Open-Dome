const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const projectRoot = __dirname;
const sdkRoot = path.resolve(projectRoot, '../../../open-dome-lib');

config.watchFolders = [sdkRoot];

config.resolver.extraNodeModules = {
  react: path.resolve(projectRoot, 'node_modules/react'),
  'react-dom': path.resolve(projectRoot, 'node_modules/react-dom'),
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
  'react-native-web': path.resolve(projectRoot, 'node_modules/react-native-web'),
};

config.resolver.blockList = [
  new RegExp(`${sdkRoot.replace(/[/\\]/g, '[/\\\\]')}[/\\\\]node_modules[/\\\\]react[/\\\\].*`),
  new RegExp(`${sdkRoot.replace(/[/\\]/g, '[/\\\\]')}[/\\\\]node_modules[/\\\\]react-dom[/\\\\].*`),
  new RegExp(`${sdkRoot.replace(/[/\\]/g, '[/\\\\]')}[/\\\\]node_modules[/\\\\]react-native[/\\\\].*`),
  new RegExp(`${sdkRoot.replace(/[/\\]/g, '[/\\\\]')}[/\\\\]node_modules[/\\\\]react-native-web[/\\\\].*`),
];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(sdkRoot, 'node_modules'),
];

config.resolver.unstable_enablePackageExports = true;

const SERVER_ONLY_PACKAGES = [
  '@google-cloud/firestore',
  'google-gax',
  'google-auth-library',
];

function isServerBundle(context) {
  const env = context.environment;
  if (env === 'node' || env === 'react-server') return true;
  const origin = String(context.originModulePath || '');
  if (origin.includes('+api.')) return true;
  if (origin.includes(`${path.sep}utilsAPI${path.sep}`)) return true;
  return false;
}

const oldResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'tslib') {
    return {
      type: 'sourceFile',
      filePath: require.resolve('tslib/tslib.js'),
    };
  }

  if (
    !isServerBundle(context) &&
    SERVER_ONLY_PACKAGES.some(
      (pkg) => moduleName === pkg || moduleName.startsWith(`${pkg}/`)
    )
  ) {
    return { type: 'empty' };
  }

  if (oldResolveRequest) {
    return oldResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
