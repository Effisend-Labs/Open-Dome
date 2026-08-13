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
class HostAPI {
  constructor() {
    this.resolvers = new Map();
    if (typeof window !== 'undefined') {
      window.addEventListener('message', event => {
        if (!event.data || event.data.type !== RESPONSE) return;
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
   * @param {'scanLookup' | 'scanPass' | 'transfer' | 'listNfts'} action
   * @param {object} payload
   * @param {{ timeoutMs?: number }} [options]
   */
  async request(action, payload = {}, options = {}) {
    if (typeof window === 'undefined' || window.parent === window) {
      throw new Error('Host.request must run inside the OpenDome iframe');
    }
    const timeoutMs = options.timeoutMs ?? (action === 'scanPass' ? 90000 : action === 'listNfts' ? 45000 : 20000);
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
    return this.request('listNfts', {}, {
      timeoutMs: 45000
    });
  }
}
exports.HostAPI = HostAPI;
const Host = exports.Host = new HostAPI();