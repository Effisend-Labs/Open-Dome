/**
 * Same-origin host APIs for mini-apps. Called from IframeContainer, not the iframe.
 */
async function hostPost(path, token, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(path, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || 'Host request failed');
  return data;
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
    });
  }

  if (action === 'listNfts') {
    return hostPost('/api/nfts', token, {});
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
