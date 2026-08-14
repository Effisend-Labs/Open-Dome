"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.HostAPI = exports.Host = void 0;
/**
 * Mini-app → host postMessage bridge. No CORS, no host URLs in the iframe.
 */
const REQUEST = 'OPENDOME_HOST_REQUEST';
const RESPONSE = 'OPENDOME_HOST_RESPONSE';
const WALLET_UPDATE = 'OPENDOME_WALLET_UPDATE';
function defaultTimeout(action) {
  if (action === 'scanPass' || action === 'assign') return 90000;
  if (action === 'listNfts' || action === 'merchantBalances' || action === 'walletBalances') {
    return 45000;
  }
  return 20000;
}
class HostAPI {
  constructor() {
    this.resolvers = new Map();
    this.cache = new Map();
    this.inflight = new Map();
    this.walletListeners = new Set();
    if (typeof window !== 'undefined') {
      window.addEventListener('message', event => {
        if (!event.data) return;
        if (event.data.type === WALLET_UPDATE) {
          const {
            balancesByChain,
            nfts,
            chains,
            updatedAt,
            ttlMs,
            stale
          } = event.data;
          const ttl = Number(ttlMs) || 60_000;
          const expiresAt = (Number(updatedAt) || Date.now()) + ttl;
          this.cache.set('walletBalances', {
            value: {
              success: true,
              balancesByChain: balancesByChain || {},
              updatedAt,
              ttlMs: ttl,
              stale: Boolean(stale)
            },
            expiresAt
          });
          this.cache.set('listNfts', {
            value: {
              success: true,
              nfts: nfts || [],
              chains: chains || [],
              updatedAt,
              ttlMs: ttl,
              stale: Boolean(stale)
            },
            expiresAt
          });
          this.walletListeners.forEach(listener => {
            try {
              listener(event.data);
            } catch {
              /* ignore */
            }
          });
          return;
        }
        if (event.data.type !== RESPONSE) return;
        const {
          id,
          response,
          error
        } = event.data;
        if (!this.resolvers.has(id)) return;
        const {
          resolve,
          reject
        } = this.resolvers.get(id);
        this.resolvers.delete(id);
        if (error) reject(new Error(error));else resolve(response);
      });
    }
  }

  /**
   * @param {string} action
   * @param {object} payload
   * @param {{ timeoutMs?: number }} [options]
   */
  async request(action, payload = {}, options = {}) {
    if (typeof window === 'undefined' || window.parent === window) {
      throw new Error('Host.request must run inside the OpenDome iframe');
    }
    const timeoutMs = options.timeoutMs ?? defaultTimeout(action);
    return new Promise((resolve, reject) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const timer = setTimeout(() => {
        this.resolvers.delete(id);
        reject(new Error('Host bridge timed out'));
      }, timeoutMs);
      this.resolvers.set(id, {
        resolve: value => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: err => {
          clearTimeout(timer);
          reject(err);
        }
      });
      window.parent.postMessage({
        type: REQUEST,
        id,
        payload: {
          action,
          ...payload
        }
      }, '*');
    });
  }
  memoize(key, load, fallbackTtlMs) {
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return Promise.resolve(cached.value);
    }
    if (this.inflight.has(key)) return this.inflight.get(key);
    const promise = load().then(value => {
      const ttlMs = Number(value?.ttlMs) || fallbackTtlMs;
      this.cache.set(key, {
        value,
        expiresAt: Date.now() + ttlMs
      });
      return value;
    }).finally(() => {
      this.inflight.delete(key);
    });
    this.inflight.set(key, promise);
    return promise;
  }
  scanLookup(query) {
    const q = typeof query === 'string' ? query : query?.query;
    return this.request('scanLookup', {
      query: q
    });
  }
  scanPass(payload) {
    return this.request('scanPass', payload);
  }
  transfer(payload) {
    return this.request('transfer', payload, {
      timeoutMs: 60000
    });
  }
  listNfts() {
    return this.memoize('listNfts', () => this.request('listNfts', {}, {
      timeoutMs: 45000
    }), 60_000);
  }
  walletBalances() {
    return this.memoize('walletBalances', () => this.request('walletBalances', {}, {
      timeoutMs: 45000
    }), 60_000);
  }

  /** Subscribe to host-pushed wallet snapshots (OPENDOME_WALLET_UPDATE). */
  subscribeWalletUpdates(listener) {
    if (typeof listener !== 'function') return () => {};
    this.walletListeners.add(listener);
    return () => this.walletListeners.delete(listener);
  }
  listUsers({
    scope = 'roles',
    q = ''
  } = {}) {
    return this.request('listUsers', {
      scope,
      q
    });
  }
  updateUsers(updates) {
    return this.request('updateUsers', {
      updates
    });
  }
  deleteUser(id) {
    return this.request('deleteUser', {
      id
    });
  }
  assign(payload) {
    return this.request('assign', payload, {
      timeoutMs: 120000
    });
  }
  merchantBalances() {
    return this.memoize('merchantBalances', () => this.request('merchantBalances', {}, {
      timeoutMs: 60000
    }), 60_000);
  }

  /** Public pass contract + merchant addresses from OpenDomeApp. */
  platformConfig() {
    return this.memoize('platformConfig', () => this.request('platformConfig', {}, {
      timeoutMs: 15000
    }), Number.MAX_SAFE_INTEGER);
  }

  /** Cached USD prices from OpenDomeApp (60s server TTL). */
  tokenPrices({
    tickers
  } = {}) {
    const list = Array.isArray(tickers) ? [...new Set(tickers.map(ticker => String(ticker).toUpperCase()))].sort() : [];
    const key = `tokenPrices:${list.join(',') || 'all'}`;
    return this.memoize(key, () => this.request('tokenPrices', {
      tickers: list
    }, {
      timeoutMs: 15000
    }), 60_000);
  }
}
exports.HostAPI = HostAPI;
const Host = exports.Host = new HostAPI();