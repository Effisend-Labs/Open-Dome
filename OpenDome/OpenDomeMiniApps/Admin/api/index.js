const { createRequestHandler } = require('@expo/server/adapter/vercel');

// Static require so Vercel NFT packs ethers into /var/task (nodeRequire is opaque).
try {
  require('ethers');
} catch (err) {
  console.error('[Admin api] ethers not packed into the serverless function', err.message);
}

module.exports = createRequestHandler({
  build: require('path').join(__dirname, '../dist/server'),
});
