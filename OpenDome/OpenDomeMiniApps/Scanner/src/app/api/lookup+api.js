/**
 * Proxy → OpenDomeApp scan-lookup (avoids browser CORS to :8082).
 */
export async function POST(request) {
  const auth =
    request.headers.get('Authorization') ||
    request.headers.get('authorization') ||
    '';
  const host = (
    process.env.OPENDOME_APP_URL ||
    process.env.EXPO_PUBLIC_OD_HOST_URL ||
    'http://localhost:8082'
  ).replace(/\/$/, '');

  try {
    const body = await request.json();
    const res = await fetch(`${host}/api/scan-lookup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: auth,
        'X-OpenDome-Jwt': auth.replace(/^Bearer\s+/i, ''),
        'User-Agent': 'OpenDome-Scanner',
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return Response.json(data, { status: res.status });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
