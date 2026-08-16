import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getUserById } from '../../utilsAPI/passkeyDb.js';

// Local Expo ports aligned with OpenDomeApp; any localhost is also accepted below.
const ALLOWED_ORIGINS = [
  'http://localhost:8082',
  'http://localhost:8083',
  'http://localhost:8084',
  'http://localhost:8085',
  'http://localhost:8086',
  'http://localhost:8087',
  'http://localhost:8088',
  'http://localhost:8089',
  'http://localhost:8090',
  'http://localhost:8091',
  'http://localhost:8092',
  'https://sandbox.opendome.xyz',
  'https://app.opendome.xyz',
];

function getMatchedOrigin(origin) {
  if (!origin) return null;
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
    return origin;
  }
  if (origin.endsWith('.opendome.xyz') || origin === 'https://opendome.xyz') {
    return origin;
  }
  const matched = ALLOWED_ORIGINS.find((allowed) => origin.startsWith(allowed));
  return matched ? origin : null;
}

function verifyDockingToken(token) {
  const secret = process.env.DOCKING_JWT_TOKEN;
  if (!secret || !token) return null;

  try {
    const claims = jwt.verify(token, secret, {
      algorithms: ['HS512'],
      issuer: 'opendome-docking',
      audience: 'opendome-host',
    });
    if (claims.token_use !== 'handshake' || claims.role !== 'mini_app' || !claims.appId) {
      return null;
    }
    return claims;
  } catch {
    return null;
  }
}

export async function OPTIONS(request) {
  const origin = request.headers.get('origin');
  const matchedOrigin = getMatchedOrigin(origin);

  if (!matchedOrigin) {
    return new Response(null, { status: 403 });
  }

  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': matchedOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(request) {
  const origin = request.headers.get('origin');
  const matchedOrigin = getMatchedOrigin(origin);

  if (!matchedOrigin) {
    return Response.json({ error: 'CORS_BLOCKED' }, { status: 403 });
  }

  const corsHeaders = matchedOrigin
    ? {
        'Access-Control-Allow-Origin': matchedOrigin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    : {};

  try {
    let token;
    try {
      const payload = await request.json();
      token = payload.token;
    } catch (e) {
      // Allow empty payload for direct/manual sandbox triggers
    }

    const isFromSandbox =
      !origin ||
      (matchedOrigin &&
        (matchedOrigin.includes('localhost') ||
          matchedOrigin.includes('effisend') ||
          matchedOrigin.includes('opendome.xyz')));

    let authenticated = false;
    let userId = null;
    let username = null;
    let evmAddress = null;
    let solanaAddress = null;
    let role = null;
    let tokenToVerify = token;
    let dockedAppId = null;
    let iframeToken = null;

    const SESSION_JWT_TOKEN = process.env.SESSION_JWT_TOKEN;
    if (!SESSION_JWT_TOKEN) {
      return Response.json({ error: 'SESSION_JWT_TOKEN is not set' }, { status: 500 });
    }

    if (tokenToVerify && tokenToVerify.split('.').length === 3) {
      try {
        const decoded = jwt.verify(tokenToVerify, SESSION_JWT_TOKEN);
        if (decoded.role === 'mini_app') {
          throw new Error('Docking JWT must not be verified with SESSION_JWT_TOKEN');
        }
        userId = decoded.userId;
        username = decoded.username || null;
        role = decoded.role || null;
        evmAddress = decoded.evm || null;
        solanaAddress = decoded.solana || null;
        const user = userId ? await getUserById(userId) : null;
        if (user) {
          username = user.username || username;
          role = user.role || role || 'user';
          evmAddress = user.evmAddress || evmAddress;
          solanaAddress = user.solanaAddress || solanaAddress;
        }
        authenticated = true;
        console.log(
          `[Verify API] JWT decoded: userId="${userId}", username="${username}", evm="${evmAddress}", solana="${solanaAddress}"`
        );
      } catch (jwtErr) {
        // Not a user session JWT — may be a mini-app docking JWT.
      }
    }

    if (!authenticated && isFromSandbox && tokenToVerify) {
      const docked = verifyDockingToken(tokenToVerify);
      if (docked) {
        authenticated = true;
        dockedAppId = docked.appId;
        console.log(`[Verify API] Docking JWT valid for appId="${dockedAppId}"`);
      }
    }

    if (!authenticated) {
      return Response.json({ error: 'UNAUTHORIZED' }, { status: 401, headers: corsHeaders });
    }

    let wsJwt = null;
    let hostJwt = null;
    try {
      if (userId) {
        const dockingSecret = process.env.DOCKING_JWT_TOKEN;
        if (!dockingSecret) throw new Error('DOCKING_JWT_TOKEN is not set');
        iframeToken = jwt.sign(
          { token_use: 'iframe_context', userId, username, role, jti: crypto.randomUUID() },
          dockingSecret,
          { expiresIn: '10m', algorithm: 'HS512', issuer: 'opendome-docking', audience: 'opendome-iframe' },
        );
      }
      // MQTT realtime is temporarily disabled — no broker JWTs are minted.
      wsJwt = null;
      hostJwt = null;
    } catch (err) {
      console.error('Error generating JWTs:', err.message);
    }

    return Response.json(
      {
        valid: true,
        authenticated: authenticated,
        // A mini-app receives only a scoped context token, never the host bearer session.
        token: null,
        iframeToken,
        wsJwt: wsJwt,
        hostJwt: hostJwt,
        username: username,
        role: role,
        appId: dockedAppId,
        evmAddress: evmAddress,
        solanaAddress: solanaAddress,
        timestamp: Date.now(),
      },
      {
        headers: corsHeaders,
      }
    );
  } catch (err) {
    return Response.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
