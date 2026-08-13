/**
 * Vercel catch-all. Keep this file tiny.
 *
 * Never require('opendome') here — package main loads useOpenDome → React,
 * and React is not on the Lambda module path (crash: Cannot find module 'react').
 * Firestore / Circle / GenAI are traced via nft-server-sdks.js (lazy fns).
 */
require('./nft-server-sdks');

const { createRequestHandler } = require('@expo/server/adapter/vercel');

module.exports = createRequestHandler({
  build: require('path').join(__dirname, '../dist/server'),
});
