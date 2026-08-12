/**
 * Staff JWT (god | admin | scanner) via OpenDomeApp /api/verify.
 * Also accepts ADMIN_SCANNER_TOKEN for hardware terminals.
 */

import { getOpenDomeAppUrl, getGodUsernameLower } from './runtimeEnv';

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

function readBearerToken(request) {
  const auth =
    request.headers.get('Authorization') ||
    request.headers.get('authorization') ||
    '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (match) return match[1].trim();
  const alt =
    request.headers.get('x-opendome-jwt') ||
    request.headers.get('X-OpenDome-Jwt') ||
    '';
  return alt.trim() || null;
}

function staffRoleFromClaims(username, roleRaw) {
  if (normalizeUsername(username) === getGodUsernameLower()) return 'god';
  const role = String(roleRaw || '').toLowerCase();
  if (role === 'god') return 'god';
  if (role === 'admin') return 'admin';
  if (role === 'scanner' || role === 'checker') return 'scanner';
  return null;
}

/**
 * @returns {{ type: 'staff-jwt'|'scanner-token', role: string, username?: string } | null}
 */
export async function verifyStaffActor(request) {
  const token = readBearerToken(request);
  if (!token) return null;

  const scannerToken = process.env.ADMIN_SCANNER_TOKEN || 'admin-session-token-123';
  if (token === scannerToken) {
    return { type: 'scanner-token', role: 'scanner', username: 'hardware' };
  }

  if (token.split('.').length !== 3) return null;

  const verifyUrl = `${getOpenDomeAppUrl()}/api/verify`;
  try {
    const res = await fetch(verifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) return null;
    const body = await res.json();
    if (!body.authenticated || !body.username) return null;

    const claims = peekJwtClaims(token) || {};
    const role = staffRoleFromClaims(body.username, claims.role || body.role);
    if (!role) {
      console.warn(`[Staff Auth] @${body.username} is not staff`);
      return null;
    }

    return {
      type: 'staff-jwt',
      role,
      username: body.username,
      evm: body.evmAddress || claims.evm || null,
      solana: body.solanaAddress || claims.solana || null,
    };
  } catch (e) {
    console.error('[Staff Auth] verify failed:', e.message || e);
    return null;
  }
}
