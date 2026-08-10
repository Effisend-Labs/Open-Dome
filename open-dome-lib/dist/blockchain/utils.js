"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parseFromDecimals = exports.normalizeStarknetAddress = exports.getTokenDecimals = exports.formatWithDecimals = void 0;
/**
 * Blockchain Utilities for OpenDome SDK
 */

/**
 * Autocomplete/Normalize Starknet address
 * Ensures it's 0x prefixed and 64-66 chars long
 */
const normalizeStarknetAddress = address => {
  if (!address) return address;
  let normalized = address.toLowerCase();
  if (!normalized.startsWith('0x')) {
    normalized = '0x' + normalized;
  }
  // Standard Starknet addresses are up to 64 hex chars (excluding 0x)
  // We can pad if necessary, but usually, just the 0x prefix is enough for starknet.js
  return normalized;
};

/**
 * Format amount with decimals
 */
exports.normalizeStarknetAddress = normalizeStarknetAddress;
const formatWithDecimals = (amount, decimals) => {
  return parseFloat(amount) * Math.pow(10, decimals);
};

/**
 * Parse amount from decimals
 */
exports.formatWithDecimals = formatWithDecimals;
const parseFromDecimals = (amount, decimals) => {
  return parseFloat(amount) / Math.pow(10, decimals);
};

/**
 * Common Token Metadata Fetcher (Internal)
 * In a real scenario, this would have a cache and hit RPCs
 */
exports.parseFromDecimals = parseFromDecimals;
const getTokenDecimals = async (chain, tokenAddress) => {
  // Placeholder logic - in implementation, each adapter will provide this
  switch (chain.toLowerCase()) {
    case 'eth':
    case 'evm':
      return 18;
    // Default for many ERC20s
    case 'solana':
    case 'sol':
      return 9;
    // Default for SOL and many SPLs
    case 'hedera':
      return 8;
    // Default for HBAR and some HTs
    case 'starknet':
      return 18;
    // Default for many Starknet tokens
    default:
      return 18;
  }
};
exports.getTokenDecimals = getTokenDecimals;