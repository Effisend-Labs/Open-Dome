/**
 * Staff JWT (god | admin | scanner) for Scanner / Admin host APIs.
 */
import jwt from 'jsonwebtoken';
import { getUserById } from './passkeyDb';

export function normalizeUsername(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/^@/, '')
    .trim();
}

export function jwtRoleFromUser(user) {
  if (!user) return 'user';
  if (normalizeUsername(user.usernameLower || user.username) === 'altaga') {
    return 'god';
  }
  const r = String(user.role || '').toLowerCase();
  if (r === 'god') return 'god';
  if (r === 'admin') return 'admin';
  if (r === 'scanner' || r === 'checker') return 'scanner';
  return 'user';
}

export function staffRoleFromUser(user, jwtClaims = {}) {
  const username = normalizeUsername(user?.username || jwtClaims.username);
  if (username === 'altaga') return 'god';
  const r = String(user?.role || jwtClaims.role || '').toLowerCase();
  if (r === 'god') return 'god';
  if (r === 'admin') return 'admin';
  if (r === 'scanner' || r === 'checker') return 'scanner';
  return null;
}

export function readBearerToken(request) {
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

/**
 * @returns {{ type: string, role: string, username?: string, userId?: string } | null}
 */
export async function verifyStaffFromRequest(request) {
  const token = readBearerToken(request);
  if (!token) return null;

  const scannerToken = process.env.ADMIN_SCANNER_TOKEN;
  if (scannerToken && token === scannerToken) {
    return { type: 'scanner-token', role: 'scanner', username: 'hardware' };
  }

  const secret = process.env.JWT_SECRET;
  if (!secret || token.split('.').length !== 3) return null;

  let decoded;
  try {
    decoded = jwt.verify(token, secret);
  } catch {
    return null;
  }

  let user = null;
  try {
    user = decoded.userId ? await getUserById(decoded.userId) : null;
  } catch (e) {
    console.error('[Staff Auth] user lookup failed:', e.message);
  }

  const role = staffRoleFromUser(user, decoded);
  if (!role) return null;
  return {
    type: 'staff-jwt',
    role,
    username: user?.username || decoded.username || null,
    userId: decoded.userId || user?.id || null,
    evm: user?.evmAddress || decoded.evm || null,
    solana: user?.solanaAddress || decoded.solana || null,
  };
}
