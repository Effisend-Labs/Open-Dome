const ALLOWED_ORIGINS = [
  'https://app.opendome.xyz',
  'http://localhost:8082',
  'http://localhost:8083',
];

function isLocalhostOrigin(origin) {
  try {
    const url = new URL(origin);
    return url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

export function isAllowedOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  return isLocalhostOrigin(origin);
}

export function getCorsHeaders(request) {
  const origin = request.headers.get('origin');
  const allowedOrigin =
    origin && isAllowedOrigin(request) ? origin : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, X-API-Key, X-Timestamp, X-Signature',
  };
}

export default function CorsHelper() {
  return null;
}
