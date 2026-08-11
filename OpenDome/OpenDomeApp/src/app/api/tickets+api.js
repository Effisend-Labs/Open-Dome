const ADMIN_BRIDGE_URL =
  process.env.ADMIN_BRIDGE_URL || 'http://localhost:8090';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address) {
    return Response.json({ error: 'Address is required' }, { status: 400 });
  }

  try {
    const bridgeUrl = `${ADMIN_BRIDGE_URL}/api/tickets?address=${encodeURIComponent(address)}`;
    const response = await fetch(bridgeUrl, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      return Response.json([]);
    }

    const tickets = await response.json();
    return Response.json(Array.isArray(tickets) ? tickets : []);
  } catch {
    return Response.json([]);
  }
}
