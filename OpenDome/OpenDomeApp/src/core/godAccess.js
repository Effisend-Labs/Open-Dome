/** Same decoder Profile uses — keeps Admin / Scanner visibility in sync. */
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
      return JSON.parse(
        atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))
      );
    } catch {
      return null;
    }
  }
}

function normalizeUsername(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/^@/, '')
    .trim();
}

/**
 * Admin is visible only for @altaga (unique GOD).
 * Do not require role claim — older tokens may say "user" or omit role.
 */
export function isAltagaGodToken(token) {
  const claims = parseHostJwt(token);
  if (!claims) return false;
  return normalizeUsername(claims.username) === 'altaga';
}

/**
 * Staff for Scanner mini-app: god (@altaga), admin, scanner.
 */
export function getStaffRoleFromToken(token) {
  const claims = parseHostJwt(token);
  if (!claims) return null;
  if (normalizeUsername(claims.username) === 'altaga') return 'god';
  const role = String(claims.role || '').toLowerCase();
  if (role === 'god') return 'god';
  if (role === 'admin') return 'admin';
  if (role === 'scanner' || role === 'checker') return 'scanner';
  return null;
}

export function isStaffToken(token) {
  return Boolean(getStaffRoleFromToken(token));
}

/** Pin staff mini-apps onto the home screen when the live JWT allows them. */
export function withStaffApps(installedAppIds, token) {
  const ids = Array.isArray(installedAppIds) ? [...installedAppIds] : [];
  if (isStaffToken(token) && !ids.includes('scanner')) ids.push('scanner');
  if (isAltagaGodToken(token) && !ids.includes('admin')) ids.push('admin');
  return ids;
}
