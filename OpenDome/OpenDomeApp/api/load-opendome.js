/**
 * Top-level requires so Vercel NFT copies opendome CJS dist into the Lambda.
 * Dynamic nodeRequire('opendome/dist/...') is invisible to the tracer.
 */
module.exports = {
  agentSkills: require('opendome/dist/agentSkills.js'),
  openAgentPrompt: require('opendome/dist/openAgentPrompt.js'),
  agentTariff: require('opendome/dist/agentTariff.js'),
  x402: require('opendome/dist/x402.js'),
  quote: require('opendome/dist/quote.js'),
  platformMint: require('opendome/dist/platformMint.js'),
  devBypass: require('opendome/dist/devBypass.js'),
  events: require('opendome/dist/dbs/events.json'),
  amenities: require('opendome/dist/dbs/amenities.json'),
};
