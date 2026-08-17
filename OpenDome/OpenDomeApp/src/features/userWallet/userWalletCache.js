/** Host-side cache for signed-in user Circle balances + NFTs (60s TTL). */

export const USER_WALLET_TTL_MS = 60_000;

const emptySnapshot = () => ({
  balancesByChain: {},
  wallets: [],
  nfts: [],
  chains: [],
  updatedAt: 0,
  ttlMs: USER_WALLET_TTL_MS,
  stale: false,
  status: 'idle',
  error: null,
});

let snapshot = emptySnapshot();
let inflight = null;
let pollToken = null;
let pollId = null;
const listeners = new Set();

function notify() {
  listeners.forEach((listener) => {
    try {
      listener(snapshot);
    } catch (err) {
      console.warn('[userWalletCache] listener error:', err?.message || err);
    }
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('opendome-wallet-update', { detail: snapshot }));
  }
}

async function requestJson(path, token, { method = 'GET', body } = {}) {
  const headers = { Authorization: `Bearer ${token}` };
  if (body != null) headers['Content-Type'] = 'application/json';
  const res = await fetch(path, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data.error || data.message || `HTTP ${res.status}`;
    throw new Error(detail);
  }
  return data;
}

export function subscribeUserWallet(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCachedUserWalletSnapshot() {
  return snapshot;
}

export function getCachedWalletBalances() {
  return {
    success: true,
    balancesByChain: snapshot.balancesByChain,
    wallets: snapshot.wallets,
    updatedAt: snapshot.updatedAt,
    ttlMs: snapshot.ttlMs,
    stale: snapshot.stale,
  };
}

export function getCachedUserNfts() {
  return {
    success: true,
    nfts: snapshot.nfts,
    chains: snapshot.chains,
    updatedAt: snapshot.updatedAt,
    ttlMs: snapshot.ttlMs,
    stale: snapshot.stale,
  };
}

export function clearUserWalletCache() {
  snapshot = emptySnapshot();
  pollToken = null;
  if (pollId && typeof window !== 'undefined') {
    window.clearInterval(pollId);
    pollId = null;
  }
  notify();
}

export async function refreshUserWallet(token, { force = false } = {}) {
  if (!token) {
    clearUserWalletCache();
    return snapshot;
  }

  const fresh =
    !force &&
    snapshot.updatedAt &&
    Date.now() - snapshot.updatedAt < USER_WALLET_TTL_MS &&
    snapshot.status === 'success';

  if (fresh) return snapshot;

  if (!inflight) {
    snapshot = { ...snapshot, status: 'loading' };
    inflight = (async () => {
      try {
        const [balances, nfts] = await Promise.all([
          requestJson('/api/wallet-balances', token),
          requestJson('/api/nfts', token, { method: 'POST', body: {} }),
        ]);
        snapshot = {
          balancesByChain: balances.balancesByChain || {},
          wallets: balances.wallets || [],
          nfts: Array.isArray(nfts.nfts) ? nfts.nfts : [],
          chains: Array.isArray(nfts.chains) ? nfts.chains : [],
          updatedAt: Date.now(),
          ttlMs: USER_WALLET_TTL_MS,
          stale: false,
          status: 'success',
          error: null,
        };
      } catch (err) {
        console.warn('[userWalletCache] refresh failed:', err?.message || err);
        snapshot = {
          ...snapshot,
          stale: Boolean(snapshot.updatedAt),
          status: 'error',
          error: err?.message || String(err),
        };
      }
    })().finally(() => {
      inflight = null;
    });
  }

  await inflight;
  notify();
  return snapshot;
}

/** Poll while the host session is active. */
export function startUserWalletPoll(token) {
  if (!token || typeof window === 'undefined') return;
  if (pollToken === token && pollId) return;
  pollToken = token;
  if (pollId) window.clearInterval(pollId);
  refreshUserWallet(token, { force: true }).catch(() => {});
  pollId = window.setInterval(() => {
    refreshUserWallet(token).catch(() => {});
  }, USER_WALLET_TTL_MS);
}

export function stopUserWalletPoll() {
  pollToken = null;
  if (pollId && typeof window !== 'undefined') {
    window.clearInterval(pollId);
    pollId = null;
  }
}
