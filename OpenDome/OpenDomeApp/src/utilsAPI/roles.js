/** Role helpers for god-only Admin host APIs. */

export function normalizeUsername(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/^@/, '')
    .trim();
}

export function getGodUsernameLower() {
  return 'altaga';
}

export function isGodRole(role) {
  return String(role || '').toUpperCase() === 'GOD';
}

export function isAdminRole(role) {
  return String(role || '').toUpperCase() === 'ADMIN';
}

export function normalizeRole(role) {
  const r = String(role || 'USER').toUpperCase();
  if (r === 'CHECKER') return 'SCANNER';
  if (['GOD', 'ADMIN', 'SCANNER', 'USER'].includes(r)) return r;
  return 'USER';
}

/**
 * GOD → ADMIN | SCANNER | USER
 * ADMIN → SCANNER | USER
 * Nobody can assign GOD via API
 */
export function canAssignRole(actorRole, targetRole) {
  const next = normalizeRole(targetRole);
  if (next === 'GOD') return false;
  if (isGodRole(actorRole)) return ['ADMIN', 'SCANNER', 'USER'].includes(next);
  if (isAdminRole(actorRole)) return ['SCANNER', 'USER'].includes(next);
  return false;
}

export function toPasskeyRole(role) {
  const n = normalizeRole(role);
  if (n === 'GOD') return 'god';
  if (n === 'ADMIN') return 'admin';
  if (n === 'SCANNER') return 'scanner';
  return 'user';
}

export function displayRoleFromPasskey(roleRaw) {
  const r = String(roleRaw || 'user').toLowerCase();
  if (r === 'god') return 'GOD';
  if (r === 'admin') return 'ADMIN';
  if (r === 'scanner' || r === 'checker') return 'SCANNER';
  return 'USER';
}
