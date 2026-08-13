/**
 * Dev bypass flags — server-side only.
 * Set at the bottom of each host/Admin .env for easy discovery.
 */
export function isX402BypassEnabled() {
  return process.env.OD_BYPASS_X402 === 'true';
}

export function isBlockchainBypassEnabled() {
  return process.env.OD_BYPASS_BLOCKCHAIN === 'true';
}

export function fakeTxHash(prefix = 'bypass') {
  return `0x${prefix}${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;
}

export const BYPASS_HEADER = 'x-opendome-bypass-x402';
