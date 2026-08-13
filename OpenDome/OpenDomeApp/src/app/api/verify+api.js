import jwt from 'jsonwebtoken';
import { getUserById } from '../../utilsAPI/passkeyDb';

// Per-mini-app docking tokens (see sdk/mini-app-credentials.json)
const VALID_TOKENS = [
  'b448a20e-633f-4852-ab9c-664c04e1d38f', // Demo
  '5679c842-c76f-4a65-8478-8f65ab38ff27', // Wallet
  '5f099950-8b3c-4775-95b0-e5958cb11e82', // TokyoDome
  '5c5071b1-d259-44f4-9728-1af67f84c431', // IMMTheater
  'c4f9dbec-4d4e-4dea-8e0e-dce37e583ade', // KorakuenHall
  'd54e84f5-8daa-4d11-9459-d08691083d69', // GalleryAaMo
  'f0e1d2c3-b4a5-6789-0123-456789abcdef', // Admin
  '9e8d7c6b-5a4f-3210-9876-543210fedcba', // Scanner
  '7b6a5c4d-3e2f-4190-8a1b-0c9d8e7f6a5b', // OpenAgent
];

const ALLOWED_ORIGINS = [
  'http://localhost:8081',
  'http://localhost:8084',
  'http://localhost:8085',
  'http://localhost:8090',
  'http://localhost:8091',
  'http://localhost:8086',
  'https://opendome.expo.app',
  'https://opendomeos.expo.app',
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
    let tokenToVerify = token;

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      return Response.json({ error: 'JWT_SECRET is not set' }, { status: 500 });
    }

    if (tokenToVerify && tokenToVerify.split('.').length === 3) {
      try {
        const decoded = jwt.verify(tokenToVerify, JWT_SECRET);
        userId = decoded.userId;
        username = decoded.username || null;
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
        console.error(`[Verify API] JWT verification failed:`, jwtErr.message);
      }
    }

    if (!authenticated && isAllowedOrigin && tokenToVerify) {
      if (VALID_TOKENS.includes(tokenToVerify)) {
        authenticated = true;
        username = 'SandboxUser';
        evmAddress = '0xb90513424b01eA257bF8f87223A6eD8fe0Ce0681';
        solanaAddress = 'FUL1iK9p2jotYhjPAodbzbNQ5fmHWEyDa6RrBuy6tt8u';
      }
    }

    let wsJwt = null;
    let hostJwt = null;
    try {
      const SECRET = process.env.OPENDOME_SECRET;
      if (!SECRET) {
        throw new Error('OPENDOME_SECRET is not set');
      }

      const payload = {
        id: 'opendome_mini_apps',
        username: 'opendome_mini_apps',
        role: 'mini_apps',
        iss: 'altaga',
      };
      wsJwt = jwt.sign(payload, SECRET, {
        expiresIn: '1d',
        algorithm: 'HS512',
      });

      const hostPayload = {
        id: 'opendome_host',
        username: 'opendome_host',
        role: 'host',
        iss: 'altaga',
      };
      hostJwt = jwt.sign(hostPayload, SECRET, {
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
        token: authenticated ? tokenToVerify : null,
        wsJwt: wsJwt,
        hostJwt: hostJwt,
        username: username,
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
