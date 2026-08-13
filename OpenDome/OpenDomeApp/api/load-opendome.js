/**
 * Literal relative requires so Vercel NFT copies the CJS SDK into the Lambda.
 * Do not require('opendome') — that pulls React via useOpenDome.
 * Dist is copied to api/vendor/opendome during Vercel installCommand.
 */
module.exports = {
  agentSkills: require('./vendor/opendome/agentSkills.js'),
  openAgentPrompt: require('./vendor/opendome/openAgentPrompt.js'),
  agentTariff: require('./vendor/opendome/agentTariff.js'),
  x402: require('./vendor/opendome/x402.js'),
  quote: require('./vendor/opendome/quote.js'),
  platformMint: require('./vendor/opendome/platformMint.js'),
  devBypass: require('./vendor/opendome/devBypass.js'),
  events: require('./vendor/opendome/dbs/events.json'),
  amenities: require('./vendor/opendome/dbs/amenities.json'),
};
