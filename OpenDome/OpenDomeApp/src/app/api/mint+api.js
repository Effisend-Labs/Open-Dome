import { mintPassesAsPlatform } from 'opendome/dist/platformMint.js';
import { assignTicketsAsPlatform } from '../../utilsAPI/ticketsDb.js';
import { verifyStaffFromRequest } from '../../utilsAPI/staffAuth.js';

/**
 * Platform mint — OpenDomeApp holds MERCHANT_PRIVATE_KEY.
 * Auth: @altaga god JWT (Admin mini-app) OR ADMIN_SCANNER_TOKEN (hotfix/service).
 */
export async function POST(request) {
  try {
    const actor = await verifyStaffFromRequest(request);
    const allowed =
      actor?.role === 'god' || actor?.type === 'scanner-token';
    if (!allowed) {
      return Response.json(
        {
          error:
            'Unauthorized — OpenDome god JWT (@altaga) or ADMIN_SCANNER_TOKEN required',
          message:
            'Unauthorized — OpenDome god JWT (@altaga) or ADMIN_SCANNER_TOKEN required',
        },
        { status: 401 },
      );
    }

    if (!process.env.MERCHANT_PRIVATE_KEY) {
      return Response.json(
        {
          error: 'Merchant wallet not configured on OpenDomeApp',
          message: 'Merchant wallet not configured on OpenDomeApp',
        },
        { status: 500 },
      );
    }

    const body = await request.json();
    const result = await mintPassesAsPlatform({
      to: body.to,
      ids: body.ids,
      amounts: body.amounts,
      tokenId: body.tokenId,
      amount: body.amount,
      network: body.network || 'base',
      contractAddress: body.contractAddress,
    });

    await assignTicketsAsPlatform(result.to, result.ids, result.amounts, {
      mintTxHash: result.txHash,
      paymentTxHash: body.paymentTxHash || null,
      assignedBy: actor.type === 'scanner-token' ? 'hotfix' : 'admin',
    });

    return Response.json({
      ...result,
      message: 'Platform minted and assigned tickets',
      signedBy: 'opendomeapp',
    });
  } catch (err) {
    const status = err.status || 500;
    const message = err.reason || err.data?.message || err.message;
    console.error('[App mint]', message);
    return Response.json({ error: message, message }, { status });
  }
}
