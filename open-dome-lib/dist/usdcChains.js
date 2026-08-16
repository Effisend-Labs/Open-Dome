"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.X402_PAYMENT_CHAIN_KEYS = exports.USDC_CHAINS = exports.USDC_BASE = exports.SOLANA_USDC_MINT = void 0;
exports.explorerTxUrl = explorerTxUrl;
exports.getUsdcChain = getUsdcChain;
exports.isSponsoredUsdcChain = isSponsoredUsdcChain;
exports.listSendUsdcChains = listSendUsdcChains;
exports.listX402PaymentChains = listX402PaymentChains;
exports.normalizeUsdcChainKey = normalizeUsdcChainKey;
exports.resolveUsdcRpcUrl = resolveUsdcRpcUrl;
exports.resolveUsdcRpcUrls = resolveUsdcRpcUrls;
exports.resolveX402PaymentNetwork = resolveX402PaymentNetwork;
exports.x402NetworkCaip = x402NetworkCaip;
/**
 * Canonical USDC + Circle blockchain keys for OpenDome transfers.
 * Sponsored L2s use EIP-3009 facilitator (merchant pays native gas).
 * Ethereum uses Circle createTransaction (user pays gas) — not offered for x402.
 * Solana x402 settles via Circle USDC transfer (user pays SOL fees).
 *
 * RPC curation follows EffisendTDC: ordered public `rpcs[]` per chain.
 * Optional env RPC_URL_* prepends as highest priority (see resolveUsdcRpcUrls).
 * EVM: use setupUsdcFallbackProvider from rpcProviders.js.
 */

/** OpenAgent / x402 source networks (no Ethereum — mainnet gas is too expensive). */
const X402_PAYMENT_CHAIN_KEYS = exports.X402_PAYMENT_CHAIN_KEYS = ['BASE', 'ARB', 'OP', 'MATIC', 'AVAX', 'SOL'];
const X402_UI_ALIASES = {
  base: 'BASE',
  arbitrum: 'ARB',
  arb: 'ARB',
  optimism: 'OP',
  op: 'OP',
  polygon: 'MATIC',
  matic: 'MATIC',
  avalanche: 'AVAX',
  avax: 'AVAX',
  solana: 'SOL',
  sol: 'SOL'
};
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
 *   rpcs: string[],
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
    // EffisendTDC order, publicnode demoted — archive receipt calls require a token there.
    defaultRpc: 'https://mainnet.base.org',
    rpcs: ['https://developer-access-mainnet.base.org', 'https://mainnet.base.org', 'https://base.drpc.org', 'https://base.gateway.tenderly.co', 'https://1rpc.io/base', 'https://base-mainnet.public.blastapi.io'],
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
    // EffisendTDC Arbitrum list (publicnode demoted — same archive token issue).
    defaultRpc: 'https://arb1.arbitrum.io/rpc',
    rpcs: ['https://arbitrum.drpc.org', 'https://arb1.arbitrum.io/rpc', 'https://arbitrum-one.public.blastapi.io', 'https://arbitrum.public.blockpi.network/v1/rpc/public', 'https://arbitrum.gateway.tenderly.co', 'https://arbitrum-one-public.nodies.app', 'https://arbitrum-one.rpc.sentio.xyz', 'https://arb-one.api.pocket.network'],
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
    rpcs: ['https://mainnet.optimism.io', 'https://optimism.drpc.org', 'https://1rpc.io/op', 'https://optimism-mainnet.public.blastapi.io', 'https://optimism.gateway.tenderly.co'],
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
    // Avoid polygon-rpc.com (tenant/API key failures) and publicnode archive limits.
    defaultRpc: 'https://polygon.drpc.org',
    rpcs: ['https://polygon.drpc.org', 'https://1rpc.io/matic', 'https://polygon-mainnet.public.blastapi.io', 'https://polygon.gateway.tenderly.co', 'https://rpc-mainnet.matic.quiknode.pro'],
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
    rpcs: ['https://api.avax.network/ext/bc/C/rpc', 'https://avalanche.drpc.org', 'https://1rpc.io/avax/c', 'https://ava-mainnet.public.blastapi.io/ext/bc/C/rpc'],
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
    // Avoid eth.llamarpc.com (Cloudflare) and publicnode archive token walls.
    defaultRpc: 'https://eth.drpc.org',
    rpcs: ['https://1rpc.io/eth', 'https://eth.drpc.org', 'https://rpc.ankr.com/eth', 'https://eth-mainnet.public.blastapi.io'],
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
    // Exact EffisendTDC Solana RPC order.
    rpcs: ['https://public.rpc.solanavibestation.com', 'https://solana.api.pocket.network', 'https://solana.rpc.laine.co'],
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

/**
 * Ordered RPC URLs: optional env override first, then curated list.
 * Dedupes while preserving priority (Effisend-style list + OpenDome env inject).
 */
function resolveUsdcRpcUrls(chain, env = process.env) {
  const cfg = typeof chain === 'string' ? getUsdcChain(chain) : chain;
  if (!cfg) return [...USDC_CHAINS.BASE.rpcs];
  const fromEnv = env?.[cfg.rpcEnv] || null;
  const curated = Array.isArray(cfg.rpcs) && cfg.rpcs.length ? cfg.rpcs : [cfg.defaultRpc].filter(Boolean);
  const urls = [];
  const seen = new Set();
  for (const url of [fromEnv, ...curated].filter(Boolean)) {
    const u = String(url).trim();
    if (!u || seen.has(u)) continue;
    seen.add(u);
    urls.push(u);
  }
  return urls.length ? urls : [cfg.defaultRpc].filter(Boolean);
}

/** First RPC only — prefer resolveUsdcRpcUrls / setupUsdcFallbackProvider. */
function resolveUsdcRpcUrl(chain, env = process.env) {
  const urls = resolveUsdcRpcUrls(chain, env);
  return urls[0] || USDC_CHAINS.BASE.defaultRpc;
}
function isSponsoredUsdcChain(raw) {
  return Boolean(getUsdcChain(raw)?.sponsored);
}

/** Chains allowed for OpenAgent x402 (L2s + Solana). */
function listX402PaymentChains() {
  return X402_PAYMENT_CHAIN_KEYS.map(key => USDC_CHAINS[key]);
}

/**
 * Resolve UI / header network → USDC chain config for x402.
 * Rejects Ethereum mainnet and unknown networks.
 */
function resolveX402PaymentNetwork(raw = 'base') {
  const s = String(raw || 'base').trim().toLowerCase();
  if (['mainnet', 'ethereum', 'eth'].includes(s)) {
    const err = new Error('Ethereum mainnet is not supported for x402 (gas too expensive). Use an L2 or Solana.');
    err.status = 400;
    throw err;
  }
  if (s === 'monad') {
    const err = new Error('Monad is not supported for x402 yet. Use Base, Arbitrum, Optimism, Polygon, Avalanche, or Solana.');
    err.status = 400;
    throw err;
  }
  const key = normalizeUsdcChainKey(s) || X402_UI_ALIASES[s] || (USDC_CHAINS[String(raw || '').toUpperCase()] ? String(raw).toUpperCase() : null);
  if (!key || !X402_PAYMENT_CHAIN_KEYS.includes(key)) {
    const err = new Error(`Unsupported x402 network: ${raw}. Use Base, Arbitrum, Optimism, Polygon, Avalanche, or Solana.`);
    err.status = 400;
    throw err;
  }
  return USDC_CHAINS[key];
}
function x402NetworkCaip(cfgOrKey) {
  const cfg = typeof cfgOrKey === 'string' ? getUsdcChain(cfgOrKey) : cfgOrKey;
  if (!cfg) return 'eip155:8453';
  if (cfg.key === 'SOL') return 'solana:mainnet';
  return `eip155:${cfg.chainId}`;
}
function explorerTxUrl(cfgOrKey, txHash) {
  if (!txHash) return null;
  const cfg = typeof cfgOrKey === 'string' ? getUsdcChain(cfgOrKey) : cfgOrKey;
  if (!cfg) return `https://basescan.org/tx/${txHash}`;
  if (cfg.key === 'SOL') return `https://solscan.io/tx/${txHash}`;
  const hosts = {
    BASE: 'https://basescan.org/tx/',
    ARB: 'https://arbiscan.io/tx/',
    OP: 'https://optimistic.etherscan.io/tx/',
    MATIC: 'https://polygonscan.com/tx/',
    AVAX: 'https://snowtrace.io/tx/'
  };
  return `${hosts[cfg.key] || hosts.BASE}${txHash}`;
}