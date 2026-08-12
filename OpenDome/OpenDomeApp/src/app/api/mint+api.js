/**
 * Host mint proxy — forwards GOD JWT + body to Admin bridge.
 *
 * open-dome-lib: blockchain.mintBatch('base', { to, ids, amounts, authToken: hostJwt, bridgeUrl })
 * authToken must be the OpenDome host JWT for @altaga (god).
 */
const MINT_BRIDGE_URL =
  process.env.MINT_BRIDGE_URL ||
  process.env.ADMIN_BRIDGE_URL ||
  'http://localhost:8090';

export async function POST(request) {
  try {
    const authHeader =
      request.headers.get('Authorization') ||
      request.headers.get('authorization');
    if (!authHeader) {
      return Response.json(
        { message: 'Authorization required — GOD OpenDome JWT' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const bridge = MINT_BRIDGE_URL.replace(/\/$/, '');
    const res = await fetch(`${bridge}/api/mint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
        'X-OpenDome-Jwt': authHeader.replace(/^Bearer\s+/i, ''),
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    return Response.json(data, { status: res.status });
  } catch (err) {
    console.error('[App mint proxy]', err);
    return Response.json({ message: err.message }, { status: 500 });
  }
}
