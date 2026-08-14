import { verifyStaffFromRequest } from '../../utilsAPI/staffAuth';
import { lookupGuestPasses } from '../../utilsAPI/scanLookup';

/**
 * Host-only (same-origin from IframeContainer). Mini-apps use Host.scanLookup.
 */
export async function POST(request) {
  const actor = await verifyStaffFromRequest(request);
  if (!actor) {
    return Response.json(
      { error: 'Unauthorized — staff OpenDome JWT (scanner/admin/god) required' },
      { status: 401 },
    );
  }

  try {
    const { query } = await request.json();
    const result = await lookupGuestPasses(query);
    return Response.json({
      success: true,
      ...result,
      scannedBy: { role: actor.role, username: actor.username || null },
    });
  } catch (e) {
    const status = e.status || 500;
    console.error('[Scan Lookup]', e.message);
    return Response.json({ error: e.message }, { status });
  }
}
