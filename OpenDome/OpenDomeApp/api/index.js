/**
 * Vercel serverless entry.
 *
 * Static requires exist so Node File Trace copies these into /var/task.
 * API routes load them via nodeRequire (string-split) which NFT cannot see.
 */
require('@google-cloud/firestore');
require('@circle-fin/developer-controlled-wallets');
require('@simplewebauthn/server');
require('@google/genai');
require('jsonwebtoken');
require('ethers');
require('opendome');

const { createRequestHandler } = require('@expo/server/adapter/vercel');

module.exports = createRequestHandler({
  build: require('path').join(__dirname, '../dist/server'),
});
