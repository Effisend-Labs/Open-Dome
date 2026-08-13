/**
 * Resolve OpenDome QR / username / EVM / Solana → profile + passes.
 */
import {
  getUserByUsername,
  getUserByEvmAddress,
  getUserBySolanaAddress,
  normalizeUsername,
} from './passkeyDb';
import { getTicketsByAddress } from './ticketsDb';
import { presentTickets } from './ticketsPresent';

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

export function parseScanQuery(raw) {
  const q = String(raw || '').trim();
  if (!q) return { type: 'empty', value: '' };

  const od = q.match(/^opendome:user:(.+)$/i);
  if (od) {
    return { type: 'opendome', value: normalizeUsername(od[1].replace(/^@/, '')) };
  }
  if (q.startsWith('@')) {
    return { type: 'opendome', value: normalizeUsername(q.slice(1)) };
  }
  if (/^0x[a-fA-F0-9]{40}$/.test(q)) {
    return { type: 'evm', value: q.toLowerCase() };
  }
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(q)) {
    return { type: 'solana', value: q };
  }
  if (/^[a-zA-Z0-9_\.]{2,32}$/.test(q)) {
    return { type: 'opendome', value: normalizeUsername(q) };
  }
  return { type: 'unknown', value: q };
}

function publicProfile(user, fallback = {}) {
  const username = user?.username || user?.usernameLower || fallback.username || null;
  const evm =
    user?.evmAddress || user?.address || fallback.evmAddress || null;
  return {
    id: user?.id || null,
    username: username ? String(username).replace(/^@/, '') : null,
    evmAddress: evm ? String(evm).toLowerCase() : null,
    solanaAddress: user?.solanaAddress || fallback.solanaAddress || null,
    role: user?.role || fallback.role || 'user',
  };
}

async function resolveProfile(parsed) {
  if (parsed.type === 'opendome') {
    const user = await getUserByUsername(parsed.value);
    if (!user) return null;
    return publicProfile(user);
  }

  if (parsed.type === 'evm') {
    const user = await getUserByEvmAddress(parsed.value);
    if (user) return publicProfile(user, { evmAddress: parsed.value });
    return publicProfile(null, {
      evmAddress: parsed.value,
      role: 'user',
    });
  }

  if (parsed.type === 'solana') {
    const user = await getUserBySolanaAddress(parsed.value);
    if (user) return publicProfile(user, { solanaAddress: parsed.value });
    return publicProfile(null, {
      solanaAddress: parsed.value,
      role: 'user',
    });
  }

  return null;
}

export async function lookupGuestPasses(rawQuery) {
  const parsed = parseScanQuery(rawQuery);
  if (parsed.type === 'empty' || parsed.type === 'unknown') {
    throw httpError(
      400,
      'Enter an OpenDome QR, @username, or wallet address',
    );
  }

  const profile = await resolveProfile(parsed);
  if (!profile) {
    throw httpError(404, 'No matching user or wallet');
  }

  let passes = [];
  if (profile.evmAddress) {
    const tickets = await getTicketsByAddress(profile.evmAddress);
    passes = presentTickets(tickets, profile.evmAddress);
  }

  return { profile, passes, query: parsed };
}
