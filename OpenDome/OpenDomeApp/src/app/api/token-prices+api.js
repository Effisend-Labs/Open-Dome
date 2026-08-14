import { getCachedTokenUsdPrices, TOKEN_PRICE_TTL_MS } from '../../utilsAPI/tokenPriceCache';

/**
 * Public cached USD prices for mini-apps.
 * Clients may poll freely; CoinGecko refreshes at most once per TTL on the server.
 */
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const raw = url.searchParams.get('tickers');
    const tickers = raw
      ? raw.split(',').map((t) => t.trim()).filter(Boolean)
      : undefined;

    const payload = await getCachedTokenUsdPrices(tickers);
    const maxAge = Math.ceil(TOKEN_PRICE_TTL_MS / 1000);

    return Response.json(payload, {
      headers: {
        'Cache-Control': `public, max-age=${maxAge}, s-maxage=${maxAge}`,
      },
    });
  } catch (e) {
    console.error('[App /api/token-prices]', e);
    return Response.json(
      { error: e.message || 'Failed to load token prices' },
      { status: 500 },
    );
  }
}
