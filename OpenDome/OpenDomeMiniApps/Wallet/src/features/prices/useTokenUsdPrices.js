import { useCallback, useEffect, useState } from 'react';
import { Host } from 'opendome';
import {
  FALLBACK_USD_BY_TICKER,
  fetchCachedTokenUsdPrices,
  priceForTicker,
} from 'opendome/src/tokenPrices.js';

const WALLET_TICKERS = ['ETH', 'SOL', 'AVAX', 'POL', 'MON', 'USDC'];
const POLL_MS = 15_000;

async function loadHostPrices(tickers) {
  if (typeof window !== 'undefined' && window.parent !== window) {
    const body = await Host.tokenPrices({ tickers });
    return body?.prices || body;
  }
  return fetchCachedTokenUsdPrices(tickers, { allowDirectCoinGecko: true });
}

/**
 * Host-cached USD prices (OpenDomeApp /api/token-prices, 15s server TTL).
 * Polls every 15s; UI may read cached state as often as needed.
 */
export function useTokenUsdPrices(tickers = WALLET_TICKERS) {
  const [prices, setPrices] = useState(FALLBACK_USD_BY_TICKER);
  const [status, setStatus] = useState('idle');

  const refresh = useCallback(async () => {
    setStatus('loading');
    try {
      const next = await loadHostPrices(tickers);
      setPrices((prev) => ({ ...FALLBACK_USD_BY_TICKER, ...prev, ...next }));
      setStatus('success');
    } catch {
      setStatus('error');
    }
  }, [tickers]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  return {
    prices,
    status,
    refresh,
    priceOf: (ticker) => priceForTicker(prices, ticker),
  };
}
