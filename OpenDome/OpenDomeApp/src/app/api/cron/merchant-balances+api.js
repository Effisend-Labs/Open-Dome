import {
  refreshMerchantBalances,
  getCachedMerchantBalances,
} from '../../../utilsAPI/merchantBalanceCache';
import {
  isAuthorizedCronRequest,
  unauthorizedCronResponse,
} from '../../../utilsAPI/cronAuth';

/**
 * Vercel cron: refreshes every supported merchant chain through the existing
 * EVM/Solana fallback-provider strategy.
 */
export async function GET(request) {
  if (!isAuthorizedCronRequest(request)) return unauthorizedCronResponse();

  try {
    await refreshMerchantBalances();
    const payload = await getCachedMerchantBalances();
    return Response.json({
      ok: true,
      fetchedAt: payload.fetchedAt,
      stale: payload.stale,
    });
  } catch (e) {
    console.error('[cron/merchant-balances]', e);
    return Response.json(
      { error: e.message || 'Failed to refresh merchant balances' },
      { status: 500 },
    );
  }
}
