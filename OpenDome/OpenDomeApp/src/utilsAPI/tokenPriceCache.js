import { nodeRequire } from './nodeRequire.js';

/** Shared server-side refresh interval (ms). Clients may poll faster. */
export const TOKEN_PRICE_TTL_MS = 15_000;

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

async function refreshFromCoinGecko(tickers) {
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

  if (!inflight) {
    inflight = refreshFromCoinGecko(tickers).finally(() => {
      inflight = null;
    });
  }

  await inflight;
  return snapshot(tickers);
}
