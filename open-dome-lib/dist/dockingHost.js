"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PROD_DOCKING_HOST_URL = exports.LOCAL_EXPO_PORTS = exports.LOCAL_DOCKING_HOST_URL = void 0;
exports.exchangeDockingEnrollment = exchangeDockingEnrollment;
exports.resolveDockingHostUrl = resolveDockingHostUrl;
/**
 * Server-only: resolve OpenDome host URL and exchange enrollment → handshake JWT.
 * OD_APP_TOKEN stays in env; OPENDOME_DOCKING_HOST_URL is optional.
 */

/** Fixed local Expo ports (package.json `expo start --port`). */
const LOCAL_EXPO_PORTS = exports.LOCAL_EXPO_PORTS = {
  OpenDomeApp: 8082,
  OpenDomeSandbox: 8083,
  Demo: 8084,
  Wallet: 8085,
  OpenAgent: 8086,
  IMMTheater: 8087,
  KorakuenHall: 8088,
  GalleryAaMo: 8089,
  Admin: 8090,
  Scanner: 8091,
  TokyoDome: 8092
};
const LOCAL_DOCKING_HOST_URL = exports.LOCAL_DOCKING_HOST_URL = `http://localhost:${LOCAL_EXPO_PORTS.OpenDomeApp}`;
const PROD_DOCKING_HOST_URL = exports.PROD_DOCKING_HOST_URL = 'https://app.opendome.xyz';

/**
 * @returns {string} Host origin without trailing slash
 */
function resolveDockingHostUrl(env = process.env) {
  const override = (env.OPENDOME_DOCKING_HOST_URL || '').trim();
  if (override) {
    return override.replace(/\/$/, '');
  }

  // Vercel (and similar) production deploys
  if (env.VERCEL || env.VERCEL_ENV === 'production' || env.VERCEL_ENV === 'preview') {
    return PROD_DOCKING_HOST_URL;
  }
  return LOCAL_DOCKING_HOST_URL;
}

/**
 * Exchange mini-app enrollment credential for a short-lived handshake JWT.
 * @returns {Promise<Response>}
 */
async function exchangeDockingEnrollment(env = process.env) {
  const enrollmentToken = env.OD_APP_TOKEN;
  if (!enrollmentToken) {
    return Response.json({
      error: 'OD_APP_TOKEN is not configured on the server'
    }, {
      status: 500
    });
  }
  const hostUrl = resolveDockingHostUrl(env);
  try {
    const response = await fetch(`${hostUrl}/api/docking-token`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${enrollmentToken}`
      }
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.token || !body.appId) {
      return Response.json({
        error: body.error || 'Failed to exchange docking credential'
      }, {
        status: 502
      });
    }
    return Response.json(body);
  } catch {
    return Response.json({
      error: 'Docking host is unavailable',
      hostUrl
    }, {
      status: 502
    });
  }
}