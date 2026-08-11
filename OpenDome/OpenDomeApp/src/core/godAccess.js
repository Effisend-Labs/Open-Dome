/** Same decoder Profile uses — keeps Admin visibility in sync with @username. */
export function parseHostJwt(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    try {
      return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    } catch {
      return null;
    }
  }
}

/**
 * Admin is visible only for @altaga (unique GOD).
 * Do not require role claim — older tokens may say "user" or omit role.
 */
export function isAltagaGodToken(token) {
  const claims = parseHostJwt(token);
  if (!claims) return false;
  const username = String(claims.username || '')
    .toLowerCase()
    .replace(/^@/, '')
    .trim();
  return username === 'altaga';
}
