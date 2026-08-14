import { getMerchantBalances } from './merchantBalances.js';

/** Cron-aligned server-side refresh interval (ms). */
export const MERCHANT_BALANCE_TTL_MS = 60_000;

let cache = {
  payload: null,
  fetchedAt: 0,
  stale: false,
};

let inflight = null;

function snapshot() {
  if (!cache.payload) return null;
  return {
    ...cache.payload,
    updatedAt: new Date(cache.fetchedAt).toISOString(),
    stale: cache.stale,
    ttlMs: MERCHANT_BALANCE_TTL_MS,
  };
}

/**
 * Refreshes all chains through getMerchantBalances(), which retains its EVM
 * and Solana RPC fallback providers. Concurrent calls share one RPC sweep.
 */
export async function refreshMerchantBalances() {
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const payload = await getMerchantBalances();
      cache = {
        payload,
        fetchedAt: Date.now(),
        stale: false,
      };
    } catch (err) {
      console.warn('[merchantBalanceCache] refresh failed:', err?.message || err);
      if (cache.payload) {
        cache = { ...cache, stale: true };
        return;
      }
      throw err;
    }
  })().finally(() => {
    inflight = null;
  });

  return inflight;
}

/** Returns the last full RPC sweep, refreshing a cold or expired cache. */
export async function getCachedMerchantBalances() {
  const fresh = cache.payload && Date.now() - cache.fetchedAt < MERCHANT_BALANCE_TTL_MS;
  if (!fresh) await refreshMerchantBalances();
  return snapshot();
}
