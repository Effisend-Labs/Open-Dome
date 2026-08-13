import { verifyStaffFromRequest } from '../../utilsAPI/staffAuth';
import { scanPassOnChain } from '../../utilsAPI/scanPass';
import { consumeTickets } from '../../utilsAPI/ticketsDb';
import { getCorsHeaders } from '../../utilsAPI/corsHelper';

export async function OPTIONS(request) {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}

/**
 * Staff verify & use — burns ERC-1155 units on Base, then updates the ticket index.
 * Body: { action, network, contractAddress, tokenId, amount, account }
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
    const body = await request.json();
    const result = await scanPassOnChain(body);
    try {
      await consumeTickets(body.account, body.tokenId, result.amount);
    } catch (indexErr) {
      console.error('[Scan Pass] ticket index update failed', indexErr);
    }
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
    console.error('[Scan Pass]', e.message);
    return Response.json(
      { error: e.shortMessage || e.message },
      { status, headers },
    );
  }
}
