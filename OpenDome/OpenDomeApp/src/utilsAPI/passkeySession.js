/**
 * Re-issue a passkey JWT from the live Firestore user (role, wallets).
 */
import jwt from 'jsonwebtoken';
import { getUserById } from './passkeyDb';
import { jwtRoleFromUser } from './staffAuth';

export function signPasskeyJwt(user) {
  const secret = process.env.SESSION_JWT_TOKEN;
  if (!secret) throw new Error('SESSION_JWT_TOKEN is not set');
  return jwt.sign(
    {
      userId: user.id,
      username: user.username,
      role: jwtRoleFromUser(user),
      evm: user.evmAddress || undefined,
      solana: user.solanaAddress || undefined,
    },
    secret,
    { expiresIn: '30d' },
  );
}

export async function refreshPasskeyJwt(token) {
  const secret = process.env.SESSION_JWT_TOKEN;
  if (!secret) {
    const err = new Error('SESSION_JWT_TOKEN is not set');
    err.status = 500;
    throw err;
  }
  if (!token || token.split('.').length !== 3) {
    const err = new Error('Invalid session');
    err.status = 401;
    throw err;
  }

  let decoded;
  try {
    decoded = jwt.verify(token, secret);
  } catch {
    const err = new Error('Session expired — sign in again');
    err.status = 401;
    throw err;
  }

  const user = decoded.userId ? await getUserById(decoded.userId) : null;
  if (!user) {
    const err = new Error('User not found');
    err.status = 401;
    throw err;
  }

  const role = jwtRoleFromUser(user);
  const evm = user.evmAddress || undefined;
  const solana = user.solanaAddress || undefined;
  const claimsMatch =
    String(decoded.role || '') === role &&
    String(decoded.username || '') === String(user.username || '') &&
    String(decoded.evm || '') === String(evm || '') &&
    String(decoded.solana || '') === String(solana || '');

  return {
    token: claimsMatch ? token : signPasskeyJwt(user),
    role,
    username: user.username || decoded.username || null,
    userId: user.id,
    evmAddress: user.evmAddress || null,
    solanaAddress: user.solanaAddress || null,
  };
}
