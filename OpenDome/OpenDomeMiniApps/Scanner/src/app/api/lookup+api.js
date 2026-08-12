/**
 * Proxy → Admin scan-lookup (avoids browser CORS to :8090).
 */
export async function POST(request) {
  const auth =
    request.headers.get('Authorization') ||
    request.headers.get('authorization') ||
    '';
  const bridge = (
    process.env.ADMIN_BRIDGE_URL ||
    process.env.EXPO_PUBLIC_ADMIN_BRIDGE_URL ||
    'http://localhost:8090'
  ).replace(/\/$/, '');

  try {
    const body = await request.json();
    const res = await fetch(`${bridge}/api/scan-lookup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: auth,
        'X-OpenDome-Jwt': auth.replace(/^Bearer\s+/i, ''),
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return Response.json(data, { status: res.status });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
