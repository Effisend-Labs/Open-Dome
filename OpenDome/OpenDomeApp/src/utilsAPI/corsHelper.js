// CORS helper for the OpenDomeApp API routes.
// Strategy: any localhost/127.0.0.1 port is allowed (dev convenience);
// production: opendome.xyz and *.opendome.xyz only.

function isLocalhost(origin) {
  if (!origin) return false;
  // Allow any port on localhost / 127.0.0.1 (8082 App, 8083 Sandbox, mini-apps 8084–8092).
  return /^(https?:\/\/)(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
}

function isAllowedProductionOrigin(origin) {
  if (!origin) return false;
  return origin === 'https://opendome.xyz' || origin.endsWith('.opendome.xyz');
}

export function isAllowedOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return true; // same-origin or non-browser client
  return isLocalhost(origin) || isAllowedProductionOrigin(origin);
}

export function getCorsHeaders(request) {
  const origin = request.headers.get('origin');
  const isAllowed = isLocalhost(origin) || isAllowedProductionOrigin(origin);
  const allowOrigin = isAllowed ? origin : 'https://app.opendome.xyz';

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, X-OpenDome-Jwt, X-API-Key, X-Timestamp, X-Signature',
  };
}

export default function CorsHelper() { return null; }
