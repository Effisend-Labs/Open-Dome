import { mintPassesAsPlatform } from 'opendome/dist/platformMint.js';
import { assignTicketsAsPlatform } from '../../utilsAPI/ticketsDb';
import { verifyStaffFromRequest } from '../../utilsAPI/staffAuth';
import { resolveMintTargetsFromPasskeyIds } from '../../utilsAPI/adminUsers';
import { emitPlatformEvent } from '../../utilsAPI/platformTelemetry.js';

/**
 * GOD-only multi-user batch assign (Admin UI via Host bridge).
 * Body: { userIds, ticketIds, amounts, network? }
 */
export async function POST(request) {
  const startedAt = Date.now();
  let network = 'base';
  try {
    const actor = await verifyStaffFromRequest(request);
    if (!actor || actor.role !== 'god') {
      return Response.json(
        { error: 'Unauthorized — OpenDome JWT for @altaga (god) required' },
        { status: 401 },
      );
    }

    if (!process.env.MERCHANT_PRIVATE_KEY) {
      return Response.json(
        { error: 'Merchant wallet not configured on OpenDomeApp' },
        { status: 500 },
      );
    }

    const { userIds, ticketIds, amounts, network: bodyNetwork } = await request.json();
    if (!userIds?.length || !ticketIds?.length || !amounts?.length) {
      return Response.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const targets = await resolveMintTargetsFromPasskeyIds(userIds);
    if (!targets.length) {
      return Response.json({ error: 'No valid mint targets' }, { status: 400 });
    }

    const chain = bodyNetwork || 'base';
    network = chain;
    const results = [];
    for (const target of targets) {
      const minted = await mintPassesAsPlatform({
        to: target.address,
        ids: ticketIds,
        amounts,
        network: chain,
      });
      await assignTicketsAsPlatform(minted.to, minted.ids, minted.amounts, {
        mintTxHash: minted.txHash,
        assignedBy: 'admin',
      });
      results.push({
        userId: target.passkeyUserId,
        address: target.address,
        txHash: minted.txHash,
      });
    }

    emitPlatformEvent({
      event_type: 'pass_minted',
      status: 'ok',
      network: chain,
      count: targets.length,
      latency_ms: Date.now() - startedAt,
    });

    return Response.json({
      success: true,
      message: `Assigned tickets to ${targets.length} users`,
      results,
    });
  } catch (err) {
    const status = err.status || 500;
    console.error('[App assign]', err.message);
    emitPlatformEvent({
      event_type: 'pass_minted',
      status: 'error',
      network,
      latency_ms: Date.now() - startedAt,
    });
    return Response.json({ error: err.message }, { status });
  }
}
