import { nodeRequire } from './nodeRequire.js';

/** Cron-aligned server-side refresh interval (ms). */
export const TOKEN_PRICE_TTL_MS = 60_000;

let cache = {
  prices: null,
  fetchedAt: 0,
  source: 'fallback',
  stale: false,
};

let inflight = null;

function loadTokenPricesModule() {
  return nodeRequire('opendome/dist/tokenPrices.js');
}

function pickPrices(allPrices, tickers) {
  const { FALLBACK_USD_BY_TICKER, priceForTicker } = loadTokenPricesModule();
  const source = allPrices || FALLBACK_USD_BY_TICKER;
  const list = tickers?.length
    ? tickers.map((t) => String(t || '').toUpperCase())
    : Object.keys(source);

  const prices = {};
  for (const ticker of list) {
    prices[ticker] = priceForTicker(source, ticker);
  }
  return prices;
}

/**
 * Refreshes the singleton cache. Exported for the scheduled cron route and
 * cold-instance lazy fills; concurrent callers share one upstream request.
 */
export async function refreshTokenUsdPrices(tickers) {
  if (inflight) return inflight;

  inflight = (async () => {
  const { fetchTokenUsdPrices, FALLBACK_USD_BY_TICKER } = loadTokenPricesModule();
  try {
    const prices = await fetchTokenUsdPrices(tickers);
    cache = {
      prices,
      fetchedAt: Date.now(),
      source: 'coingecko',
      stale: false,
    };
  } catch (err) {
    console.warn('[tokenPriceCache] CoinGecko refresh failed:', err?.message || err);
    if (cache.prices) {
      cache = { ...cache, stale: true };
    } else {
      cache = {
        prices: { ...FALLBACK_USD_BY_TICKER },
        fetchedAt: Date.now(),
        source: 'fallback',
        stale: true,
      };
    }
  }
  })().finally(() => {
    inflight = null;
  });

  return inflight;
}

function snapshot(tickers) {
  return {
    prices: pickPrices(cache.prices, tickers),
    updatedAt: cache.fetchedAt || Date.now(),
    source: cache.source,
    stale: Boolean(cache.stale),
    ttlMs: TOKEN_PRICE_TTL_MS,
  };
}

/**
 * In-process TTL cache. CoinGecko at most once per TTL per warm instance.
 * @param {string[]|undefined} tickers
 */
export async function getCachedTokenUsdPrices(tickers) {
  const now = Date.now();
  if (cache.prices && now - cache.fetchedAt < TOKEN_PRICE_TTL_MS) {
    return snapshot(tickers);
  }

  await refreshTokenUsdPrices(tickers);
  return snapshot(tickers);
}
