import { verifyStaffFromRequest } from '../../utilsAPI/staffAuth';
import { scanPassOnChain } from '../../utilsAPI/scanPass';
import { consumeTickets } from '../../utilsAPI/ticketsDb';
import { emitPlatformEvent } from '../../utilsAPI/platformTelemetry.js';

/**
 * Host-only (same-origin from IframeContainer). Mini-apps use Host.scanPass.
 */
export async function POST(request) {
  const startedAt = Date.now();
  const actor = await verifyStaffFromRequest(request);
  if (!actor) {
    return Response.json(
      { error: 'Unauthorized — staff OpenDome JWT (scanner/admin/god) required' },
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    const result = await scanPassOnChain(body);
    try {
      await consumeTickets(body.account, body.tokenId, result.amount);
    } catch (indexErr) {
      console.error('[Scan Pass] ticket index update failed', indexErr);
    }
    emitPlatformEvent({
      event_type: 'gate_scan',
      status: 'ok',
      network: body.network || 'base',
      count: Number(result.amount) || 1,
      latency_ms: Date.now() - startedAt,
    });
    return Response.json({
      success: true,
      ...result,
      scannedBy: { role: actor.role, username: actor.username || null },
    });
  } catch (e) {
    const status = e.status || 500;
    console.error('[Scan Pass]', e.message);
    emitPlatformEvent({
      event_type: 'gate_scan',
      status: 'error',
      latency_ms: Date.now() - startedAt,
    });
    return Response.json(
      { error: e.shortMessage || e.message },
      { status },
    );
  }
}
