export function normalizeUsername(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/^@/, '')
    .trim();
}

/** Staff roles allowed in Scanner: god | admin | scanner */
export function getStaffRoleFromUser(user, token) {
  let role = String(user?.role || '').toLowerCase();
  if (!role && token) {
    try {
      const part = token.split('.')[1];
      if (part) {
        const json = JSON.parse(
          typeof atob === 'function'
            ? atob(part.replace(/-/g, '+').replace(/_/g, '/'))
            : Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
        );
        role = String(json.role || '').toLowerCase();
      }
    } catch {
      // ignore
    }
  }

  if (role === 'god') return 'god';
  if (role === 'admin') return 'admin';
  if (role === 'scanner' || role === 'checker') return 'scanner';
  return null;
}

export function isStaffUser(user, token) {
  return Boolean(getStaffRoleFromUser(user, token));
}
