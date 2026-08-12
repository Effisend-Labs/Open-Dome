/**
 * Ask OpenDomeApp to validate the host passkey JWT (no JWT_SECRET on Admin).
 * Same trust path as every mini-app dock — OpenDome owns user sessions.
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

  // Fallback if proxies strip Authorization
  const alt =
    request.headers.get('x-opendome-jwt') ||
    request.headers.get('X-OpenDome-Jwt') ||
    '';
  return alt.trim() || null;
}

export { getGodUsernameLower };

export function isAltagaGodProfile(username) {
  return normalizeUsername(username) === getGodUsernameLower();
}

/**
 * Authorization: Bearer <OpenDome host user JWT>
 * Confirmed via OpenDomeApp POST /api/verify — only @altaga.
 * Host URL auto: localhost:8082 (dev) or https://app.opendome.xyz (prod).
 */
export async function verifyGodJwt(request) {
  const token = readBearerToken(request);
  if (!token || token.split('.').length !== 3) {
    console.warn('[Admin Auth] Missing or malformed host JWT on request');
    return null;
  }

  const verifyUrl = `${getOpenDomeAppUrl()}/api/verify`;

  try {
    const res = await fetch(verifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });

    if (!res.ok) {
      console.warn(`[Admin Auth] Verify HTTP ${res.status} from ${verifyUrl}`);
      return null;
    }
    const body = await res.json();
    if (!body.authenticated || !body.username) {
      console.warn(
        `[Admin Auth] Verify rejected token (authenticated=${body.authenticated}, username=${body.username})`
      );
      return null;
    }

    const claims = peekJwtClaims(token) || {};
    const username = body.username;

    if (!isAltagaGodProfile(username)) {
      console.warn(`[Admin Auth] Username @${username} is not god (@${getGodUsernameLower()})`);
      return null;
    }

    return {
      userId: claims.userId || null,
      username,
      role: 'god',
      evm: body.evmAddress || claims.evm || null,
      solana: body.solanaAddress || claims.solana || null,
    };
  } catch (e) {
    console.error(
      `[Admin Auth] Cannot reach OpenDome verify at ${verifyUrl}:`,
      e.message || e
    );
    return null;
  }
}
