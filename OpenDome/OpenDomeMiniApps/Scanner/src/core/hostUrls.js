function stripQuotes(value) {
  if (value == null) return '';
  let s = String(value).trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1);
  }
  return s.trim();
}

function isVercel() {
  return (
    process.env.VERCEL === '1' ||
    process.env.VERCEL === 'true' ||
    process.env.VERCEL_ENV === 'production' ||
    process.env.VERCEL_ENV === 'preview'
  );
}

function isLoopbackUrl(url) {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  } catch {
    return /localhost|127\.0\.0\.1/i.test(url);
  }
}

function pickUrl(candidates, productionFallback, localFallback) {
  for (const raw of candidates) {
    const url = stripQuotes(raw).replace(/\/$/, '');
    if (!url) continue;
    if (isVercel() && isLoopbackUrl(url)) continue;
    return url;
  }
  if (isVercel()) return productionFallback;
  return localFallback;
}

export function getOpenDomeAppUrl() {
  return pickUrl(
    [process.env.OPENDOME_APP_URL, process.env.EXPO_PUBLIC_OD_HOST_URL],
    'https://app.opendome.xyz',
    'http://localhost:8082',
  );
}

export function getAdminBridgeUrl() {
  return pickUrl(
    [process.env.ADMIN_BRIDGE_URL, process.env.EXPO_PUBLIC_ADMIN_BRIDGE_URL],
    'https://admin.opendome.xyz',
    'http://localhost:8090',
  );
}

export function describeFetchError(err, target) {
  const cause = err?.cause?.message || err?.cause?.code || '';
  const base = err?.message || 'fetch failed';
  return cause ? `${base} → ${target} (${cause})` : `${base} → ${target}`;
}
