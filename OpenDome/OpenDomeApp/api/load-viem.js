/** Top-level require so Vercel NFT copies viem into the Lambda. */
require('viem');
require('viem/accounts');
require('viem/chains');
module.exports = require('viem');
