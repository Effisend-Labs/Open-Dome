import { requireBridgeActor } from '../../utilsAPI/adminDb';
import { mintPassesToAddress } from '../../utilsAPI/mintService';

/**
 * GOD-only mint bridge for open-dome-lib.
 *
 * Auth: Bearer <OpenDome host JWT for @altaga>
 * Body: { to, ids|tokenId, amounts|amount, network?, contractAddress? }
 *
 * Core mint lives in mintService — other server functions can call it later
 * without going through this HTTP gate.
 */
export async function POST(request) {
  try {
    const actor = await requireBridgeActor(request);
    if (!actor || actor.type !== 'god-jwt') {
      return Response.json(
        { error: 'Unauthorized — OpenDome JWT for @altaga (god) required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const result = await mintPassesToAddress({
      to: body.to,
      ids: body.ids,
      amounts: body.amounts,
      tokenId: body.tokenId,
      amount: body.amount,
      network: body.network || 'base',
      contractAddress: body.contractAddress,
      recordTickets: true,
    });

    return Response.json({
      ...result,
      message: 'Mint successful',
    });
  } catch (err) {
    const status = err.status || 500;
    const message = err.reason || err.data?.message || err.message;
    return Response.json({ error: message, message }, { status });
  }
}
