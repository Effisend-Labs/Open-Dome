import { verifyStaffFromRequest } from '../../utilsAPI/staffAuth';
import { lookupGuestPasses } from '../../utilsAPI/scanLookup';
import { getCorsHeaders } from '../../utilsAPI/corsHelper';

export async function OPTIONS(request) {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}

/**
 * Staff-only: QR / @username / EVM / Solana → profile + passes.
 * Body: { query: "opendome:user:x" | "@x" | "0x…" | solana }
 */
export async function POST(request) {
  const headers = getCorsHeaders(request);
  const actor = await verifyStaffFromRequest(request);
  if (!actor) {
    return Response.json(
      { error: 'Unauthorized — staff OpenDome JWT (scanner/admin/god) required' },
      { status: 401, headers },
    );
  }

  try {
    const { query } = await request.json();
    const result = await lookupGuestPasses(query);
    return Response.json(
      {
        success: true,
        ...result,
        scannedBy: { role: actor.role, username: actor.username || null },
      },
      { headers },
    );
  } catch (e) {
    const status = e.status || 500;
    console.error('[Scan Lookup]', e.message);
    return Response.json({ error: e.message }, { status, headers });
  }
}
