const { createRequestHandler } = require('@expo/server/adapter/vercel');

// Static requires so Vercel NFT packs native deps into /var/task.
// Do not wrap in a way that hides the require from file tracing.
try {
  require('./load-firestore');
} catch (err) {
  console.error('[Admin api] firestore not packed', err.message);
}
try {
  require('./load-ethers');
} catch (err) {
  console.error('[Admin api] ethers not packed', err.message);
}

module.exports = createRequestHandler({
  build: require('path').join(__dirname, '../dist/server'),
});
