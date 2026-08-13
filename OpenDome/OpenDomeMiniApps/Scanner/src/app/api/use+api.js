/**
 * Proxy → Admin /api/scanner (verify & use / burn).
 */
import { getAdminBridgeUrl } from '../../core/hostUrls';

export async function POST(request) {
  const auth =
    request.headers.get('Authorization') ||
    request.headers.get('authorization') ||
    '';
  const bridge = getAdminBridgeUrl();

  try {
    const body = await request.json();
    const res = await fetch(`${bridge}/api/scanner`, {
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
