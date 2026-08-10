const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Custom resolver to force Metro to use the CommonJS version of tslib.
// This fixes the dreaded "Cannot destructure property '__extends' of 'tslib.default'"
// error when bundling backend Node.js modules like @simplewebauthn/server for API Routes.
const oldResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'tslib') {
    return {
      type: 'sourceFile',
      filePath: require.resolve('tslib/tslib.js'),
    };
  }
  if (oldResolveRequest) {
    return oldResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
