const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const SERVER_ONLY_PACKAGES = [
  '@circle-fin/developer-controlled-wallets',
  '@google-cloud/firestore',
  '@google-cloud/logging',
  '@google-cloud/storage',
  'google-gax',
  'google-auth-library',
  '@aws-sdk/client-bedrock-runtime',
  '@aws-sdk/client-dynamodb',
  '@aws-sdk/lib-dynamodb',
  '@smithy/node-http-handler',
];

function isServerBundle(context) {
  const env = context.environment;
  if (env === 'node' || env === 'react-server') return true;
  const origin = String(context.originModulePath || '');
  if (origin.includes('+api.') || origin.includes('+middleware.')) return true;
  if (origin.includes(`${path.sep}utilsAPI${path.sep}`)) return true;
  return false;
}

const oldResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // CJS tslib for API route bundles (Firestore / AWS / SimpleWebAuthn)
  if (moduleName === 'tslib') {
    return {
      type: 'sourceFile',
      filePath: require.resolve('tslib/tslib.js'),
    };
  }

  // Never pull Node SDKs into the browser/client graph.
  // Local web used to crash with: (0 , _nodeUtil.deprecate) is not a function
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
