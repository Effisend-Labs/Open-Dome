import { verifyStaffFromRequest } from '../../utilsAPI/staffAuth';
import { getMerchantBalances } from '../../utilsAPI/merchantBalances';

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

    const payload = await getMerchantBalances();
    return Response.json(payload);
  } catch (e) {
    console.error('[App /api/merchant-balances GET]', e);
    return Response.json(
      { error: e.message || 'Failed to load merchant balances' },
      { status: 500 },
    );
  }
}
