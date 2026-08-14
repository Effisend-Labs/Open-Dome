"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.USDC_CHAINS = exports.USDC_BASE = exports.SOLANA_USDC_MINT = void 0;
exports.getUsdcChain = getUsdcChain;
exports.isSponsoredUsdcChain = isSponsoredUsdcChain;
exports.listSendUsdcChains = listSendUsdcChains;
exports.normalizeUsdcChainKey = normalizeUsdcChainKey;
exports.resolveUsdcRpcUrl = resolveUsdcRpcUrl;
/**
 * Canonical USDC + Circle blockchain keys for OpenDome transfers.
 * Sponsored L2s use EIP-3009 facilitator (merchant pays native gas).
 * Ethereum / Solana use Circle createTransaction (user pays gas).
 *
 * Merchant MERCHANT_PRIVATE_KEY must hold native gas on each sponsored L2
 * (ETH on Base/Arb/OP, POL on Polygon, AVAX on Avalanche).
 */

const SOLANA_USDC_MINT = exports.SOLANA_USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

/** @typedef {'BASE'|'ARB'|'OP'|'MATIC'|'AVAX'|'ETH'|'SOL'} CircleBlockchain */

/**
 * @type {Record<string, {
 *   key: string,
 *   label: string,
 *   circleBlockchain: CircleBlockchain,
 *   chainId: number | null,
 *   usdc: string,
 *   rpcEnv: string,
 *   defaultRpc: string,
 *   sponsored: boolean,
 *   viemKey: string | null,
 *   gasToken: string,
 * }>}
 */
const USDC_CHAINS = exports.USDC_CHAINS = {
  BASE: {
    key: 'BASE',
    label: 'Base',
    circleBlockchain: 'BASE',
    chainId: 8453,
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    rpcEnv: 'RPC_URL_BASE',
    defaultRpc: 'https://mainnet.base.org',
    sponsored: true,
    viemKey: 'base',
    gasToken: 'ETH'
  },
  ARB: {
    key: 'ARB',
    label: 'Arbitrum',
    circleBlockchain: 'ARB',
    chainId: 42161,
    usdc: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    rpcEnv: 'RPC_URL_ARB',
    defaultRpc: 'https://arb1.arbitrum.io/rpc',
    sponsored: true,
    viemKey: 'arbitrum',
    gasToken: 'ETH'
  },
  OP: {
    key: 'OP',
    label: 'Optimism',
    circleBlockchain: 'OP',
    chainId: 10,
    usdc: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    rpcEnv: 'RPC_URL_OP',
    defaultRpc: 'https://mainnet.optimism.io',
    sponsored: true,
    viemKey: 'optimism',
    gasToken: 'ETH'
  },
  MATIC: {
    key: 'MATIC',
    label: 'Polygon',
    circleBlockchain: 'MATIC',
    chainId: 137,
    usdc: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    rpcEnv: 'RPC_URL_MATIC',
    defaultRpc: 'https://polygon-rpc.com',
    sponsored: true,
    viemKey: 'polygon',
    gasToken: 'POL'
  },
  AVAX: {
    key: 'AVAX',
    label: 'Avalanche',
    circleBlockchain: 'AVAX',
    chainId: 43114,
    usdc: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
    rpcEnv: 'RPC_URL_AVAX',
    defaultRpc: 'https://api.avax.network/ext/bc/C/rpc',
    sponsored: true,
    viemKey: 'avalanche',
    gasToken: 'AVAX'
  },
  ETH: {
    key: 'ETH',
    label: 'Ethereum',
    circleBlockchain: 'ETH',
    chainId: 1,
    usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    rpcEnv: 'RPC_URL_ETH',
    defaultRpc: 'https://eth.llamarpc.com',
    sponsored: false,
    viemKey: 'mainnet',
    gasToken: 'ETH'
  },
  SOL: {
    key: 'SOL',
    label: 'Solana',
    circleBlockchain: 'SOL',
    chainId: null,
    usdc: SOLANA_USDC_MINT,
    rpcEnv: 'RPC_URL_SOL',
    defaultRpc: 'https://public.rpc.solanavibestation.com',
    sponsored: false,
    viemKey: null,
    gasToken: 'SOL'
  }
};

/** Back-compat alias used across x402 / Base-only callers. */
const USDC_BASE = exports.USDC_BASE = USDC_CHAINS.BASE.usdc;
function normalizeUsdcChainKey(raw) {
  const key = String(raw || 'BASE').trim().toUpperCase().replace(/^ETHEREUM$/, 'ETH').replace(/^ARBITRUM$/, 'ARB').replace(/^OPTIMISM$/, 'OP').replace(/^POLYGON$/, 'MATIC').replace(/^AVALANCHE$/, 'AVAX').replace(/^SOLANA$/, 'SOL');
  return USDC_CHAINS[key] ? key : null;
}
function getUsdcChain(raw = 'BASE') {
  const key = normalizeUsdcChainKey(raw) || 'BASE';
  return USDC_CHAINS[key];
}
function listSendUsdcChains() {
  return Object.values(USDC_CHAINS);
}
function resolveUsdcRpcUrl(chain, env = process.env) {
  const cfg = typeof chain === 'string' ? getUsdcChain(chain) : chain;
  if (!cfg) return USDC_CHAINS.BASE.defaultRpc;
  const fromEnv = env?.[cfg.rpcEnv] || (cfg.key === 'BASE' ? env?.RPC_URL : null);
  return fromEnv || cfg.defaultRpc;
}
function isSponsoredUsdcChain(raw) {
  return Boolean(getUsdcChain(raw)?.sponsored);
}