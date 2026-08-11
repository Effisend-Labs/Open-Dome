const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Force Metro to use the CommonJS tslib build for API route bundles.
// Without this, @google-cloud/firestore / AWS SDK crash at require-time with:
// Cannot destructure property '__extends' of 'n.default' as it is undefined
// → Vercel FUNCTION_INVOCATION_FAILED
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
