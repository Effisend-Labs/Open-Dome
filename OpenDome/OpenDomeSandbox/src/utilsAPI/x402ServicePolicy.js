import { lookup } from 'node:dns/promises';

function isPrivateHostname(hostname) {
  const host = hostname.replace(/^\[|\]$/g, '');
  return (
    host === 'localhost' ||
    host === '::1' ||
    host.startsWith('127.') ||
    host.startsWith('10.') ||
    host.startsWith('192.168.') ||
    host.startsWith('169.254.') ||
    /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
    host.startsWith('fc') ||
    host.startsWith('fd') ||
    host.startsWith('fe80:') ||
    host.endsWith('.local')
  );
}

function isPrivateIpAddress(address) {
  return isPrivateHostname(address) || address.startsWith('::ffff:') && isPrivateHostname(address.slice(7));
}

function isMetadataHostname(hostname) {
  return (
    hostname === 'metadata.google.internal' ||
    hostname === 'metadata.google' ||
    hostname === 'metadata.aws.internal'
  );
}

export async function validateX402ServiceUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Service URL must be absolute');
  }

  const hostname = url.hostname.toLowerCase();
  const isLocalDevelopment = !process.env.VERCEL && isPrivateHostname(hostname);
  if (url.protocol !== 'https:' && !isLocalDevelopment) {
    throw new Error('Only HTTPS payment services are allowed outside local development');
  }
  if (isPrivateHostname(hostname) && !isLocalDevelopment) {
    throw new Error('Private payment service addresses are not allowed');
  }
  if (!isLocalDevelopment) {
    if (isMetadataHostname(hostname)) {
      throw new Error('Cloud metadata service addresses are not allowed');
    }
    let addresses;
    try {
      addresses = await lookup(hostname, { all: true, verbatim: true });
    } catch {
      throw new Error('Payment service hostname could not be resolved');
    }
    if (!addresses.length || addresses.some(({ address }) => isPrivateIpAddress(address))) {
      throw new Error('Payment service resolves to a private address');
    }
  }
  return url;
}

export function parseQuotedUsdcAmount(value) {
  const amount = String(value ?? '').trim();
  if (!/^\d+(\.\d{1,6})?$/.test(amount)) {
    throw new Error('A USDC amount with up to six decimal places is required');
  }

  const [whole, fractional = ''] = amount.split('.');
  return BigInt(`${whole}${fractional.padEnd(6, '0')}`);
}

function isLocalHostname(hostname) {
  const host = String(hostname || '').toLowerCase();
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}

export function isSameHostX402Service(paymentUrl, requestUrl) {
  const serviceHost = paymentUrl.hostname.toLowerCase();
  let requestHost;
  try {
    requestHost = new URL(requestUrl).hostname.toLowerCase();
  } catch {
    return false;
  }
  if (serviceHost === requestHost) return true;
  return isLocalHostname(serviceHost) && isLocalHostname(requestHost);
}

export function buildX402ServiceFetchOptions(paymentUrl, fetchOptions, authHeader, requestUrl) {
  const method = ['GET', 'POST'].includes(String(fetchOptions?.method || 'GET').toUpperCase())
    ? String(fetchOptions?.method || 'GET').toUpperCase()
    : 'GET';

  const headers = {};
  const network = fetchOptions?.headers?.['x-payment-network'];
  if (network) {
    headers['x-payment-network'] = network;
  }

  let body;
  if (method === 'POST' && fetchOptions?.body != null) {
    body =
      typeof fetchOptions.body === 'string'
        ? fetchOptions.body
        : JSON.stringify(fetchOptions.body);
    headers['Content-Type'] = 'application/json';
  }

  if (authHeader && isSameHostX402Service(paymentUrl, requestUrl)) {
    headers.Authorization = authHeader;
  }

  return { method, headers, body, redirect: 'error' };
}
