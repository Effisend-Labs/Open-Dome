export function parseHostJwt(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decodeURIComponent(
      json.split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    ));
  } catch {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch {
      return null;
    }
  }
}

/** Admin mini-app is only for @altaga with role god (localhost + production). */
export function isAltagaGodToken(token) {
  const claims = parseHostJwt(token);
  if (!claims) return false;
  const username = String(claims.username || '')
    .toLowerCase()
    .replace(/^@/, '');
  const role = String(claims.role || '').toLowerCase();
  return username === 'altaga' && role === 'god';
}
