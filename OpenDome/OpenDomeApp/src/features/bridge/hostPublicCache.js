const PRICE_TTL_MS = 60_000;

let platformConfig = null;
let platformConfigPromise = null;
let tokenPrices = null;
let tokenPricesPromise = null;
let pricePollId = null;

function selectPrices(payload, tickers) {
  if (!tickers?.length) return payload;
  const prices = {};
  for (const ticker of tickers) {
    const key = String(ticker || '').toUpperCase();
    if (payload.prices?.[key] != null) prices[key] = payload.prices[key];
  }
  return { ...payload, prices };
}

async function requestJson(path) {
  const response = await fetch(path);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Host public cache request failed');
  return body;
}

export async function getHostPlatformConfig() {
  if (platformConfig) return platformConfig;
  if (!platformConfigPromise) {
    platformConfigPromise = requestJson('/api/platform-config')
      .then((payload) => {
        platformConfig = payload;
        return payload;
      })
      .finally(() => {
        platformConfigPromise = null;
      });
  }
  return platformConfigPromise;
}

export async function refreshHostTokenPrices() {
  if (tokenPricesPromise) return tokenPricesPromise;
  tokenPricesPromise = requestJson('/api/token-prices')
    .then((payload) => {
      tokenPrices = payload;
      return payload;
    })
    .finally(() => {
      tokenPricesPromise = null;
    });
  return tokenPricesPromise;
}

export async function getHostTokenPrices(tickers) {
  const fresh =
    tokenPrices &&
    Date.now() - Number(tokenPrices.updatedAt || 0) < (Number(tokenPrices.ttlMs) || PRICE_TTL_MS);
  const payload = fresh ? tokenPrices : await refreshHostTokenPrices();
  return selectPrices(payload, tickers);
}

/** Warm static config once and keep a single host-side market poller. */
export function warmHostPublicCache() {
  getHostPlatformConfig().catch((error) => {
    console.warn('[hostPublicCache] platform config:', error.message);
  });
  refreshHostTokenPrices().catch((error) => {
    console.warn('[hostPublicCache] token prices:', error.message);
  });

  if (pricePollId || typeof window === 'undefined') return;
  pricePollId = window.setInterval(() => {
    refreshHostTokenPrices().catch((error) => {
      console.warn('[hostPublicCache] token prices:', error.message);
    });
  }, PRICE_TTL_MS);
}
