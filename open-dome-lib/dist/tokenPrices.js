"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.FALLBACK_USD_BY_TICKER = exports.COINGECKO_IDS_BY_TICKER = void 0;
exports.fetchCachedTokenUsdPrices = fetchCachedTokenUsdPrices;
exports.fetchTokenUsdPrices = fetchTokenUsdPrices;
exports.priceForTicker = priceForTicker;
exports.resolveTokenPricesBaseUrl = resolveTokenPricesBaseUrl;
/**
 * CoinGecko USD prices — same pattern as EffisendTDC tab4 getUSD().
 * Tickers map to CoinGecko ids used in EffisendTDC chains.js.
 */

const COINGECKO_IDS_BY_TICKER = exports.COINGECKO_IDS_BY_TICKER = {
  ETH: 'ethereum',
  SOL: 'solana',
  AVAX: 'avalanche-2',
  POL: 'polygon-ecosystem-token',
  MON: 'monad',
  USDC: 'usd-coin',
  EURC: 'euro-coin',
  ARB: 'arbitrum',
  OP: 'optimism'
};

/** Offline / rate-limit fallback (Wallet sandbox used these as mocks). */
const FALLBACK_USD_BY_TICKER = exports.FALLBACK_USD_BY_TICKER = {
  ETH: 3200,
  SOL: 145,
  AVAX: 35,
  POL: 0.5,
  MON: 5,
  USDC: 1,
  EURC: 1,
  ARB: 0.8,
  OP: 1.5
};
async function fetchWithRetries(url, options = {}, {
  retries = 3,
  delay = 1000,
  backoff = 2
} = {}) {
  let lastErr;
  let wait = delay;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
      return res;
    } catch (err) {
      lastErr = err;
      if (attempt === retries) break;
      await new Promise(r => setTimeout(r, wait));
      wait *= backoff;
    }
  }
  throw lastErr || new Error('CoinGecko fetch failed');
}

/**
 * @param {string[]} [tickers] e.g. ['ETH','SOL','USDC']
 * @returns {Promise<Record<string, number>>} ticker → USD
 */
async function fetchTokenUsdPrices(tickers, {
  signal
} = {}) {
  const list = (tickers?.length ? tickers : Object.keys(COINGECKO_IDS_BY_TICKER)).map(t => String(t || '').toUpperCase()).filter(t => COINGECKO_IDS_BY_TICKER[t]);
  const uniqueTickers = [...new Set(list)];
  const ids = [...new Set(uniqueTickers.map(t => COINGECKO_IDS_BY_TICKER[t]))];
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd`;
  const response = await fetchWithRetries(url, {
    method: 'GET',
    signal
  }, {
    retries: 3,
    delay: 1000,
    backoff: 2
  });
  const result = await response.json();
  const prices = {};
  for (const ticker of uniqueTickers) {
    const id = COINGECKO_IDS_BY_TICKER[ticker];
    const usd = Number(result?.[id]?.usd);
    prices[ticker] = Number.isFinite(usd) && usd > 0 ? usd : FALLBACK_USD_BY_TICKER[ticker] || 0;
  }
  return prices;
}
function priceForTicker(prices, ticker) {
  const key = String(ticker || '').toUpperCase();
  const live = prices?.[key];
  if (Number.isFinite(live) && live > 0) return live;
  return FALLBACK_USD_BY_TICKER[key] || 0;
}

/** Resolve OpenDomeApp origin for GET /api/token-prices (standalone / SSR). */
function resolveTokenPricesBaseUrl({
  baseUrl
} = {}) {
  if (baseUrl) return String(baseUrl).replace(/\/$/, '');
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_OPENDOME_HOST_URL) {
    return String(process.env.EXPO_PUBLIC_OPENDOME_HOST_URL).replace(/\/$/, '');
  }
  if (typeof window !== 'undefined') {
    try {
      const params = new URLSearchParams(window.location.search);
      const parent = params.get('parentOrigin');
      if (parent) return parent.replace(/\/$/, '');
    } catch {
      /* ignore */
    }
    if (window.location?.origin && window.location.origin !== 'null') {
      return window.location.origin.replace(/\/$/, '');
    }
  }
  return null;
}
function normalizeCachedPrices(body, tickers) {
  const prices = body?.prices || body;
  if (!tickers?.length) return prices;
  const out = {};
  for (const ticker of tickers) {
    const key = String(ticker || '').toUpperCase();
    out[key] = priceForTicker(prices, key);
  }
  return out;
}

/**
 * Client helper — poll OpenDomeApp cached prices (not CoinGecko directly).
 * Mini-apps in iframe should prefer Host.tokenPrices() for same-origin bridge.
 * @param {string[]} [tickers]
 * @param {{ baseUrl?: string, signal?: AbortSignal, hostRequest?: (tickers: string[]) => Promise<object>, allowDirectCoinGecko?: boolean }} [options]
 */
async function fetchCachedTokenUsdPrices(tickers, options = {}) {
  const {
    baseUrl,
    signal,
    hostRequest,
    allowDirectCoinGecko = false
  } = options;
  if (typeof hostRequest === 'function') {
    const body = await hostRequest(tickers);
    return normalizeCachedPrices(body, tickers);
  }
  const origin = resolveTokenPricesBaseUrl({
    baseUrl
  });
  if (origin) {
    const qs = tickers?.length ? `?tickers=${encodeURIComponent(tickers.join(','))}` : '';
    const res = await fetch(`${origin}/api/token-prices${qs}`, {
      method: 'GET',
      signal
    });
    if (!res.ok) throw new Error(`token-prices HTTP ${res.status}`);
    const body = await res.json();
    return normalizeCachedPrices(body, tickers);
  }
  if (allowDirectCoinGecko) {
    return fetchTokenUsdPrices(tickers, {
      signal
    });
  }
  throw new Error('No token price host configured');
}