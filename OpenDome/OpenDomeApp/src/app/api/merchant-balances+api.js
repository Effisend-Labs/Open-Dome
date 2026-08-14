import { verifyStaffFromRequest } from '../../utilsAPI/staffAuth';
import {
  getCachedMerchantBalances,
  MERCHANT_BALANCE_TTL_MS,
} from '../../utilsAPI/merchantBalanceCache';

/**
 * Merchant USDC + native balances on all OpenDome USDC chains.
 * God JWT only.
 */
export async function GET(request) {
  try {
    const actor = await verifyStaffFromRequest(request);
    if (!actor || actor.role !== 'god') {
      return Response.json(
        { error: 'Unauthorized — OpenDome JWT for @altaga (god) required' },
        { status: 401 },
      );
    }

    const payload = await getCachedMerchantBalances();
    const maxAge = Math.ceil(MERCHANT_BALANCE_TTL_MS / 1000);
    return Response.json(payload, {
      headers: {
        'Cache-Control': `private, max-age=${maxAge}`,
      },
    });
  } catch (e) {
    console.error('[App /api/merchant-balances GET]', e);
    return Response.json(
      { error: e.message || 'Failed to load merchant balances' },
      { status: 500 },
    );
  }
}
