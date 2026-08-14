/**
 * Curated public RPC lists + ethers FallbackProvider (EffisendTDC pattern).
 *
 * - Source of truth for URLs lives on USDC_CHAINS.rpcs in usdcChains.js
 * - Env RPC_URL_* (or RPC_URL for Base) is prepended as highest priority
 * - EVM callers should use setupUsdcFallbackProvider — not a single JsonRpcProvider
 */

import {
  getUsdcChain,
  resolveUsdcRpcUrls,
} from './usdcChains.js';

/**
 * Build an ethers FallbackProvider from curated (+ env) RPCs.
 * Same shape as EffisendTDC setupProvider: priority by list order, stallTimeout 2s.
 *
 * @param {import('ethers')} ethers
 * @param {string|object} chain USDC chain key or config
 * @param {object} [env]
 * @returns {import('ethers').FallbackProvider}
 */
export function setupUsdcFallbackProvider(ethers, chain, env = process.env) {
  if (!ethers?.JsonRpcProvider || !ethers?.FallbackProvider) {
    throw new Error('ethers JsonRpcProvider/FallbackProvider required');
  }

  const cfg = typeof chain === 'string' ? getUsdcChain(chain) : chain;
  const urls = resolveUsdcRpcUrls(cfg, env);
  if (!urls.length) {
    throw new Error(`No RPCs configured for ${cfg?.key || 'unknown'}`);
  }

  const network =
    cfg?.chainId != null
      ? { chainId: Number(cfg.chainId), name: cfg.key || 'unknown' }
      : undefined;

  const providers = urls.map((url) =>
    network
      ? new ethers.JsonRpcProvider(url, network, { staticNetwork: true })
      : new ethers.JsonRpcProvider(url),
  );

  return new ethers.FallbackProvider(
    providers.map((provider, i) => ({
      provider,
      priority: i,
      weight: 1,
      stallTimeout: 2000,
    })),
  );
}

/**
 * Try Solana JSON-RPC URLs in order until one succeeds (Effisend SolanaChain pattern).
 * @param {string[]} urls
 * @param {string} method
 * @param {any[]} params
 */
export async function solanaRpcWithFallback(urls, method, params) {
  let lastErr;
  for (const rpcUrl of urls) {
    try {
      const res = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method,
          params,
        }),
      });
      if (!res.ok) {
        throw new Error(`Solana RPC HTTP ${res.status}`);
      }
      const body = await res.json();
      if (body.error) {
        throw new Error(body.error.message || 'Solana RPC error');
      }
      return body.result;
    } catch (err) {
      lastErr = err;
      console.warn(`[solanaRpc] ${rpcUrl} failed, trying next…`, err?.message || err);
    }
  }
  throw lastErr || new Error('All Solana RPCs failed');
}
