"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.BYPASS_HEADER = void 0;
exports.fakeTxHash = fakeTxHash;
exports.isBlockchainBypassEnabled = isBlockchainBypassEnabled;
exports.isX402BypassEnabled = isX402BypassEnabled;
/**
 * Dev bypass flags — server-side only.
 * Set at the bottom of each host/Admin .env for easy discovery.
 */
function isX402BypassEnabled() {
  return process.env.OD_BYPASS_X402 === 'true';
}
function isBlockchainBypassEnabled() {
  return process.env.OD_BYPASS_BLOCKCHAIN === 'true';
}
function fakeTxHash(prefix = 'bypass') {
  return `0x${prefix}${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;
}
const BYPASS_HEADER = exports.BYPASS_HEADER = 'x-opendome-bypass-x402';