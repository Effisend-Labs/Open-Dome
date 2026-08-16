import jwt from 'jsonwebtoken';
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
  'https://opendome.expo.app',
  'https://opendomeos.expo.app',
  'https://app.opendome.xyz',
  'https://demo.opendome.xyz',
  'https://wallet.opendome.xyz',
  'https://admin.opendome.xyz',
  'https://scanner.opendome.xyz',
  'https://agent.opendome.xyz',
  'https://miniapp.expo.app',
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
        matchedOrigin.includes('opendome.expo.app') ||
        matchedOrigin.includes('demo.opendome.xyz') ||
        matchedOrigin.includes('miniapp.expo.app') ||
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
    let hostJwt = null;
    try {
      const MQTT_JWT_TOKEN = process.env.MQTT_JWT_TOKEN;
      if (!MQTT_JWT_TOKEN) {
        throw new Error('MQTT_JWT_TOKEN is not set');
      }

      const payload = {
        id: 'opendome_mini_apps',
        username: 'opendome_mini_apps',
        role: 'mini_apps',
        iss: 'altaga',
      };
      wsJwt = jwt.sign(payload, MQTT_JWT_TOKEN, {
        expiresIn: '1d',
        algorithm: 'HS512',
      });

      const hostPayload = {
        id: 'opendome_host',
        username: 'opendome_host',
        role: 'host',
        iss: 'altaga',
      };
      hostJwt = jwt.sign(hostPayload, MQTT_JWT_TOKEN, {
        expiresIn: '1d',
        algorithm: 'HS512',
      });
    } catch (err) {
      console.error('Error generating JWTs:', err.message);
    }

    return Response.json(
      {
        valid: true,
        authenticated: authenticated,
        token: authenticated && userId ? tokenToVerify : null,
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
