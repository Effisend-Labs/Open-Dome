import { nodeRequire } from './nodeRequire';

/** Same signing key OpenDomeApp uses for passkey session JWTs. */
const FALLBACK_JWT_SECRET =
  '275f0edac42d0454d77f9bb62ea812b70b1f3a1dac5d5fbca651e4819e438c52';

function resolveJwtSecret() {
  const fromEnv = (process.env.JWT_SECRET || '').trim();
  // Ignore placeholders like "<same as OpenDomeApp>"
  if (fromEnv && !fromEnv.includes('<') && fromEnv.length >= 32) {
    return fromEnv;
  }
  return FALLBACK_JWT_SECRET;
}

export function getGodUsernameLower() {
  const raw = (process.env.ADMIN_GOD_USERNAME || 'altaga').trim().replace(/^@/, '');
  return raw.toLowerCase();
}

export function isAltagaGodClaims(claims) {
  if (!claims) return false;
  const username = String(claims.username || '')
    .toLowerCase()
    .replace(/^@/, '');
  const role = String(claims.role || '').toLowerCase();
  return username === getGodUsernameLower() && role === 'god';
}

/**
 * Verify OpenDome host user JWT (passkey session) from Authorization: Bearer.
 * Only @altaga with role god — same credential every mini-app receives from the host.
 */
export function verifyGodJwt(request) {
  const auth = request.headers.get('Authorization') || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  try {
    const jwt = nodeRequire('jsonwebtoken');
    const claims = jwt.verify(match[1], resolveJwtSecret());
    if (!isAltagaGodClaims(claims)) return null;
    return claims;
  } catch {
    return null;
  }
}
