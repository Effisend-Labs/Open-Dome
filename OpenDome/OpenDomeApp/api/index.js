/**
 * Vercel catch-all. Never require('opendome') — that loads useOpenDome → React
 * and crashes every route (Cannot find module 'react').
 *
 * Firestore / Circle MUST be top-level requires (see load-*.js). Lazy
 * `() => require(...)` is invisible to NFT, which is why check-username
 * still 500'd with Cannot find module '@google-cloud/firestore'.
 */ 
try {
  require('./load-firestore');
} catch (e) {
  console.warn('[api boot] firestore:', e.message);
}
try {
  require('./load-logging');
} catch (e) {
  console.warn('[api boot] logging:', e.message);
}
try {
  require('./load-circle');
} catch (e) {
  console.warn('[api boot] circle:', e.message);
}
try {
  require('./load-viem');
} catch (e) {
  console.warn('[api boot] viem:', e.message);
}
try {
  require('./load-ethers');
} catch (e) {
  console.warn('[api boot] ethers:', e.message);
}
try {
  require('./load-opendome');
} catch (e) {
  console.warn('[api boot] opendome:', e.message);
}
try {
  require('./load-genai');
} catch (e) {
  console.warn('[api boot] genai:', e.message);
}

const { createRequestHandler } = require('@expo/server/adapter/vercel');

module.exports = createRequestHandler({
  build: require('path').join(__dirname, '../dist/server'),
});
