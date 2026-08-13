/**
 * Proxy → OpenDomeApp /api/scan-pass (same host as lookup; viem is packed there).
 */
import { describeFetchError, getOpenDomeAppUrl } from '../../core/hostUrls';

export async function POST(request) {
  const auth =
    request.headers.get('Authorization') ||
    request.headers.get('authorization') ||
    '';
  const host = getOpenDomeAppUrl();

  try {
    const body = await request.json();
    const res = await fetch(`${host}/api/scan-pass`, {
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
    console.error('[Scanner use]', host, e);
    return Response.json(
      { error: describeFetchError(e, `${host}/api/scan-pass`) },
      { status: 502 },
    );
  }
}
