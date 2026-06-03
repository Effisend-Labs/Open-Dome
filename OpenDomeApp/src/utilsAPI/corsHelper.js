// CORS helper for the OpenDomeApp API routes.
// Strategy: any localhost/127.0.0.1 port is allowed (dev convenience);
// production origins must be explicitly listed.

const PRODUCTION_ALLOWED_ORIGINS = [
  'https://opendome.expo.app',
  'https://miniapp.expo.app',
];

function isLocalhost(origin) {
  if (!origin) return false;
  // Allow any port on localhost / 127.0.0.1 (incl. http://localhost:8081, :8082, :8083, etc.)
  return /^(https?:\/\/)(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
}

function isAllowedProductionOrigin(origin) {
  if (!origin) return false;
  return PRODUCTION_ALLOWED_ORIGINS.some(allowed => origin === allowed);
}

export function isAllowedOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return true; // same-origin or non-browser client
  return isLocalhost(origin) || isAllowedProductionOrigin(origin);
}

export function getCorsHeaders(request) {
  const origin = request.headers.get('origin');
  const isAllowed = isLocalhost(origin) || isAllowedProductionOrigin(origin);
  const allowOrigin = isAllowed ? origin : PRODUCTION_ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, X-Timestamp, X-Signature',
  };
}

export default function CorsHelper() { return null; }
