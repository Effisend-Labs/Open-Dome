import { getOpenDomeAppClientUrl } from './hostUrls';

export async function scannerFetch(path, { token, method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    headers['X-OpenDome-Jwt'] = token;
  }
  const res = await fetch(path, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.message || `Request failed (${res.status})`);
  }
  return data;
}

/** OpenDomeApp owns tickets + chain. Scanner is UI only. */
export function hostFetch(path, opts) {
  const base = getOpenDomeAppClientUrl();
  return scannerFetch(`${base}${path}`, opts);
}

export function parseScanQuery(raw) {
  const q = String(raw || '').trim();
  if (!q) return { type: 'empty', value: '' };

  const od = q.match(/^opendome:user:(.+)$/i);
  if (od) {
    return { type: 'opendome', value: od[1].replace(/^@/, '') };
  }

  if (q.startsWith('@')) {
    return { type: 'opendome', value: q.slice(1) };
  }

  if (/^0x[a-fA-F0-9]{40}$/.test(q)) {
    return { type: 'evm', value: q.toLowerCase() };
  }

  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(q)) {
    return { type: 'solana', value: q };
  }

  if (/^[a-zA-Z0-9_\.]{2,32}$/.test(q)) {
    return { type: 'opendome', value: q };
  }

  return { type: 'unknown', value: q };
}
