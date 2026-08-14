/**
 * Same-origin host APIs for mini-apps. Called from IframeContainer, not the iframe.
 */
import {
  getHostPlatformConfig,
  getHostTokenPrices,
} from './hostPublicCache';

async function hostFetch(path, token, { method = 'GET', body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body != null) headers['Content-Type'] = 'application/json';
  const res = await fetch(path, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || 'Host request failed');
  return data;
}

function hostPost(path, token, body) {
  return hostFetch(path, token, { method: 'POST', body });
}

export async function runHostRequest(payload, token) {
  const action = payload?.action;

  if (action === 'scanLookup') {
    return hostPost('/api/scan-lookup', token, { query: payload.query });
  }

  if (action === 'scanPass') {
    return hostPost('/api/scan-pass', token, {
      action: payload.scanAction || 'scanPass',
      network: payload.network || 'base',
      contractAddress: payload.contractAddress,
      tokenId: payload.tokenId,
      amount: payload.amount,
      account: payload.account,
    });
  }

  if (action === 'transfer') {
    return hostPost('/api/transfer', token, {
      amount: payload.amount,
      destination: payload.destination,
      blockchain: payload.blockchain || payload.chain || 'BASE',
      asset: payload.asset || 'USDC',
    });
  }

  if (action === 'listNfts') {
    return hostPost('/api/nfts', token, {});
  }

  if (action === 'listUsers') {
    const scope = encodeURIComponent(payload.scope || 'roles');
    const q = encodeURIComponent(payload.q || '');
    return hostFetch(`/api/users?scope=${scope}&q=${q}`, token);
  }

  if (action === 'updateUsers') {
    return hostFetch('/api/users', token, {
      method: 'PUT',
      body: payload.updates
        ? { updates: payload.updates }
        : { id: payload.id, role: payload.role },
    });
  }

  if (action === 'deleteUser') {
    const id = encodeURIComponent(payload.id || '');
    return hostFetch(`/api/users?id=${id}`, token, { method: 'DELETE' });
  }

  if (action === 'assign') {
    return hostPost('/api/assign', token, {
      userIds: payload.userIds,
      ticketIds: payload.ticketIds,
      amounts: payload.amounts,
      network: payload.network || 'base',
    });
  }

  if (action === 'merchantBalances') {
    return hostFetch('/api/merchant-balances', token);
  }

  if (action === 'platformConfig') {
    return getHostPlatformConfig();
  }

  if (action === 'tokenPrices') {
    const tickers = Array.isArray(payload.tickers)
      ? payload.tickers
      : String(payload.tickers || '').split(',').filter(Boolean);
    return getHostTokenPrices(tickers);
  }

  throw new Error(`Unknown host action: ${action}`);
}

export function resolveHostServiceUrl(serviceUrl) {
  if (!serviceUrl) return serviceUrl;
  if (/^https?:\/\//i.test(serviceUrl)) return serviceUrl;
  const path = serviceUrl.startsWith('/') ? serviceUrl : `/${serviceUrl}`;
  if (typeof window === 'undefined') return path;
  return `${window.location.origin}${path}`;
}
