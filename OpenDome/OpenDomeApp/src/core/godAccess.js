export function parseHostJwt(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const padded = part.replace(/-/g, '+').replace(/_/g, '/');
    const json =
      typeof atob === 'function'
        ? atob(padded)
        : Buffer.from(padded, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Admin mini-app: only @altaga (canonical GOD).
 * Username match is enough — older JWTs may omit role; login always treats altaga as god.
 */
export function isAltagaGodToken(token) {
  const claims = parseHostJwt(token);
  if (!claims) return false;
  const username = String(claims.username || '')
    .toLowerCase()
    .replace(/^@/, '');
  if (username !== 'altaga') return false;
  const role = String(claims.role || '').toLowerCase();
  // Accept missing role (legacy tokens) or explicit god
  return !role || role === 'god';
}
