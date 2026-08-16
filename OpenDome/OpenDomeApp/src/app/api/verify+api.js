import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getUserById } from '../../utilsAPI/passkeyDb';

// Local Expo ports: App 8082, Sandbox 8083, Demo 8084, Wallet 8085,
// OpenAgent 8086, IMMTheater 8087, KorakuenHall 8088, GalleryAaMo 8089,
// Admin 8090, Scanner 8091, TokyoDome 8092. getMatchedOrigin allows any localhost.
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
  'https://demo.opendome.xyz',
  'https://wallet.opendome.xyz',
  'https://admin.opendome.xyz',
  'https://scanner.opendome.xyz',
  'https://agent.opendome.xyz',
];

function getMatchedOrigin(origin) {
  if (!origin) return null;
  try {
    const url = new URL(origin);
    const normalizedOrigin = url.origin;
    const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    const isOpenDome = url.protocol === 'https:' && (
      url.hostname === 'opendome.xyz' || url.hostname.endsWith('.opendome.xyz')
    );
    return isLocalhost || isOpenDome || ALLOWED_ORIGINS.includes(normalizedOrigin)
      ? normalizedOrigin
      : null;
  } catch {
    return null;
  }
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

  if (origin && !matchedOrigin) {
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

    const isAllowedOrigin =
      matchedOrigin &&
      (matchedOrigin.includes('localhost') ||
        matchedOrigin.includes('opendome.xyz') ||
        matchedOrigin.includes('effisend'));

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
        authenticated = true;
        console.log(
          `[Verify API] JWT decoded: userId="${userId}", username="${username}"`
        );

        try {
          console.log(`[Verify API] Querying Firestore for user ${userId}...`);
          const userItem = await getUserById(userId);
          if (userItem) {
            console.log(
              `[Verify API] Record username="${userItem.username}", evm="${userItem.evmAddress}", sol="${userItem.solanaAddress}"`
            );
            if (userItem.username) username = userItem.username;
            if (userItem.evmAddress) evmAddress = userItem.evmAddress;
            if (userItem.solanaAddress) solanaAddress = userItem.solanaAddress;
            if (userItem.role) role = userItem.role;
            if (decoded.evm && !evmAddress) evmAddress = decoded.evm;
            if (decoded.solana && !solanaAddress) solanaAddress = decoded.solana;
          } else {
            console.warn(`[Verify API] No Firestore record found for ${userId}`);
            if (decoded.evm) evmAddress = decoded.evm;
            if (decoded.solana) solanaAddress = decoded.solana;
          }
        } catch (dbErr) {
          console.error(`[Verify API] Firestore lookup failed:`, dbErr.message);
          if (decoded.evm) evmAddress = decoded.evm;
          if (decoded.solana) solanaAddress = decoded.solana;
        }
        console.log(
          `[Verify API] Final resolved: username="${username}", evmAddress="${evmAddress}"`
        );
      } catch (jwtErr) {
        // Not a user session JWT — may be a mini-app docking JWT.
      }
    }

    if (!authenticated && isAllowedOrigin && tokenToVerify) {
      const docked = verifyDockingToken(tokenToVerify);
      if (docked) {
        authenticated = true;
        dockedAppId = docked.appId;
        role = 'mini_app';
        username = 'SandboxUser';
        evmAddress = '0xb90513424b01eA257bF8f87223A6eD8fe0Ce0681';
        solanaAddress = 'FUL1iK9p2jotYhjPAodbzbNQ5fmHWEyDa6RrBuy6tt8u';
        console.log(`[Verify API] Docking JWT valid for appId="${dockedAppId}"`);
      }
    }

    if (!authenticated) {
      return Response.json({ error: 'UNAUTHORIZED' }, { status: 401, headers: corsHeaders });
    }

    let wsJwt = null;
    try {
      if (userId) {
        const dockingSecret = process.env.DOCKING_JWT_TOKEN;
        if (!dockingSecret) {
          throw new Error('DOCKING_JWT_TOKEN is not set');
        }
        iframeToken = jwt.sign(
          {
            token_use: 'iframe_context',
            userId,
            username,
            role,
            jti: crypto.randomUUID(),
          },
          dockingSecret,
          {
            expiresIn: '10m',
            algorithm: 'HS512',
            issuer: 'opendome-docking',
            audience: 'opendome-iframe',
          },
        );
      }

      // MQTT realtime is temporarily disabled — no broker JWT is minted.
      wsJwt = null;
    } catch (err) {
      console.error('Error generating JWTs:', err.message);
    }

    return Response.json(
      {
        valid: true,
        authenticated: authenticated,
        // Never expose the host session bearer token to a mini-app iframe.
        // This token is display/context-only and is rejected by host APIs.
        iframeToken,
        token: null,
        wsJwt: wsJwt,
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
