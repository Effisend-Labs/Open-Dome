import { requireBridgeActor } from '../../utilsAPI/adminDb';
import {
  mintPassesToAddress,
  readAuthToken,
} from '../../utilsAPI/mintService';

/**
 * GOD-only mint — proxies to OpenDomeApp /api/mint with the host JWT.
 *
 * Auth: Bearer <OpenDome host JWT for @altaga>
 * Body: { to, ids|tokenId, amounts|amount, network?, contractAddress? }
 */
export async function POST(request) {
  try {
    const actor = await requireBridgeActor(request);
    if (!actor || actor.type !== 'god-jwt') {
      return Response.json(
        { error: 'Unauthorized — OpenDome JWT for @altaga (god) required' },
        { status: 401 },
      );
    }

    const authToken = readAuthToken(request);
    const body = await request.json();
    const result = await mintPassesToAddress({
      authToken,
      to: body.to,
      ids: body.ids,
      amounts: body.amounts,
      tokenId: body.tokenId,
      amount: body.amount,
      network: body.network || 'base',
      contractAddress: body.contractAddress,
    });

    return Response.json({
      ...result,
      message: 'Mint successful via OpenDomeApp',
    });
  } catch (err) {
    const status = err.status || 500;
    const message = err.reason || err.data?.message || err.message;
    return Response.json({ error: message, message }, { status });
  }
}
