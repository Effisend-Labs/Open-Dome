import { requireBridgeActor } from '../../utilsAPI/adminDb';
import { getMerchantBalances } from '../../utilsAPI/merchantBalances';

async function requireGodJwt(request) {
  const actor = await requireBridgeActor(request);
  if (!actor || actor.type !== 'god-jwt') return null;
  return actor;
}

/**
 * Merchant USDC + native balances on all OpenDome USDC chains (L1/L2/Solana).
 */
export async function GET(request) {
  try {
    const actor = await requireGodJwt(request);
    if (!actor) {
      return Response.json(
        { error: 'Unauthorized — OpenDome JWT for @altaga (god) required' },
        { status: 401 },
      );
    }

    const payload = await getMerchantBalances();
    return Response.json(payload);
  } catch (e) {
    console.error('[Admin /api/merchant-balances GET]', e);
    return Response.json(
      { error: e.message || 'Failed to load merchant balances' },
      { status: 500 },
    );
  }
}
