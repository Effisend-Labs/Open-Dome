const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const SERVER_ONLY_PACKAGES = [
  '@google-cloud/firestore',
  'google-gax',
  'google-auth-library',
  'ethers',
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
