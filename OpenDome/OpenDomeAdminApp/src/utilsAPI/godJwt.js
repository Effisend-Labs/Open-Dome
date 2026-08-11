/**
 * Ask OpenDomeApp to validate the host passkey JWT (no JWT_SECRET on Admin).
 * Same trust path as every mini-app dock — OpenDome owns user sessions.
 */

function getOpenDomeAppUrl() {
  const fromEnv = (process.env.OPENDOME_APP_URL || '').trim().replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    return 'https://app.opendome.xyz';
  }
  return 'http://localhost:8081';
}

export function getGodUsernameLower() {
  const raw = (process.env.ADMIN_GOD_USERNAME || 'altaga').trim().replace(/^@/, '');
  return raw.toLowerCase();
}

function normalizeUsername(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/^@/, '');
}

function peekJwtClaims(token) {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const json = Buffer.from(
      part.replace(/-/g, '+').replace(/_/g, '/'),
      'base64'
    ).toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function isAltagaGodProfile(username, role) {
  return (
    normalizeUsername(username) === getGodUsernameLower() &&
    String(role || '').toLowerCase() === 'god'
  );
}

/**
 * Authorization: Bearer <OpenDome host user JWT>
 * Confirmed via OpenDomeApp POST /api/verify — only @altaga / god.
 */
export async function verifyGodJwt(request) {
  const auth = request.headers.get('Authorization') || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const token = match[1].trim();
  if (!token || token.split('.').length !== 3) return null;

  try {
    const res = await fetch(`${getOpenDomeAppUrl()}/api/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });

    if (!res.ok) return null;
    const body = await res.json();
    if (!body.authenticated || !body.username) return null;

    const claims = peekJwtClaims(token) || {};
    const username = body.username;
    const role = claims.role || (normalizeUsername(username) === getGodUsernameLower() ? 'god' : 'user');

    if (!isAltagaGodProfile(username, role)) return null;

    return {
      userId: claims.userId || null,
      username,
      role: 'god',
      evm: body.evmAddress || claims.evm || null,
      solana: body.solanaAddress || claims.solana || null,
    };
  } catch {
    return null;
  }
}
