import {
  refreshTokenUsdPrices,
  getCachedTokenUsdPrices,
} from '../../../utilsAPI/tokenPriceCache';
import {
  isAuthorizedCronRequest,
  unauthorizedCronResponse,
} from '../../../utilsAPI/cronAuth';

/** Vercel cron: refresh all supported CoinGecko prices every minute. */
export async function GET(request) {
  if (!isAuthorizedCronRequest(request)) return unauthorizedCronResponse();

  try {
    await refreshTokenUsdPrices();
    const payload = await getCachedTokenUsdPrices();
    return Response.json({ ok: true, updatedAt: payload.updatedAt, stale: payload.stale });
  } catch (e) {
    console.error('[cron/token-prices]', e);
    return Response.json(
      { error: e.message || 'Failed to refresh token prices' },
      { status: 500 },
    );
  }
}
