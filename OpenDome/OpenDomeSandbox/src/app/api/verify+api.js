import jwt from 'jsonwebtoken';

// Per-mini-app docking tokens (see sdk/mini-app-credentials.json)
const VALID_TOKENS = [
  'b448a20e-633f-4852-ab9c-664c04e1d38f', // Demo
  '5679c842-c76f-4a65-8478-8f65ab38ff27', // Wallet
  '5f099950-8b3c-4775-95b0-e5958cb11e82', // TokyoDome
  '5c5071b1-d259-44f4-9728-1af67f84c431', // IMMTheater
  'c4f9dbec-4d4e-4dea-8e0e-dce37e583ade', // KorakuenHall
  'd54e84f5-8daa-4d11-9459-d08691083d69', // GalleryAaMo
];

const ALLOWED_ORIGINS = [
  'http://localhost:8081',
  'https://opendome.expo.app',
];

function getMatchedOrigin(origin) {
  if (!origin) return null;
  // Allow any port on localhost / 127.0.0.1
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
    return origin;
  }
  // Allow production domains dynamically
  if (origin.endsWith('.opendome.xyz') || origin === 'https://opendome.xyz') {
    return origin;
  }
  const matched = ALLOWED_ORIGINS.find(allowed => origin.startsWith(allowed));
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
    }
  });
}

export async function POST(request) {
  // CORS origin validation
  const origin = request.headers.get('origin');
  const matchedOrigin = getMatchedOrigin(origin);
  
  if (origin && !matchedOrigin) {
    return Response.json({ error: 'CORS_BLOCKED' }, { status: 403 });
  }

  const corsHeaders = matchedOrigin ? {
    'Access-Control-Allow-Origin': matchedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  } : {};

  try {
    let token;
    try {
      const payload = await request.json();
      token = payload.token;
    } catch (e) {
      // Allow empty payload for direct/manual sandbox triggers
    }
    
    // Check if request is directly from the sandbox frontend
    const isFromSandbox = !origin || (matchedOrigin && (
      matchedOrigin.includes('localhost') || 
      matchedOrigin.includes('opendome.expo.app') || 
      matchedOrigin.includes('effisend') ||
      matchedOrigin.includes('opendome.xyz')
    ));

    let authenticated = false;
    let userId = null;
    let username = null;
    let evmAddress = null;
    let solanaAddress = null;
    let tokenToVerify = token;

    const JWT_SECRET = process.env.JWT_SECRET || '275f0edac42d0454d77f9bb62ea812b70b1f3a1dac5d5fbca651e4819e438c52';

    if (tokenToVerify && tokenToVerify.split('.').length === 3) {
      try {
        const decoded = jwt.verify(tokenToVerify, JWT_SECRET);
        userId = decoded.userId;
        username = decoded.username || null;
        evmAddress = decoded.evm || null;
        solanaAddress = decoded.solana || null;
        authenticated = true;
        console.log(`[Verify API] JWT decoded: userId="${userId}", username="${username}", evm="${evmAddress}", solana="${solanaAddress}"`);
      } catch (jwtErr) {
        console.error(`[Verify API] JWT verification failed:`, jwtErr.message);
      }
    }

    // If not verified with a real token, let's check for fallback (only for sandbox frontend requests)
    if (!authenticated && isFromSandbox && tokenToVerify) {
      // Allow valid hardcoded tokens array fallback for sandbox testing
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
      const SECRET = process.env.OPENDOME_SECRET || 'opendome_default_fallback_secret_key_512_bits';
      
      // 1. JWT for the Mini App
      const payload = {
        id: 'opendome_mini_apps',   
        username: 'opendome_mini_apps',
        role: 'mini_apps',         
        iss: 'altaga'      
      };
      const options = {
        expiresIn: '1d',
        algorithm: 'HS512'
      };
      wsJwt = jwt.sign(payload, SECRET, options);
      console.log(`🚀 SECURE JWT GENERATED FOR MINI APP (${options.expiresIn} expiry)`);

      // 2. JWT for the Sandbox Host
      const hostPayload = {
        id: 'opendome_host',
        username: 'opendome_host',
        role: 'host',
        iss: 'altaga'
      };
      const hostOptions = {
        expiresIn: '1d',
        algorithm: 'HS512'
      };
      hostJwt = jwt.sign(hostPayload, SECRET, hostOptions);
      console.log(`🚀 SECURE JWT GENERATED FOR HOST SANDBOX (${hostOptions.expiresIn} expiry)`);
    } catch (err) {
      console.error("❌ Error generating JWTs:", err.message);
    }
    
    return Response.json({
      valid: true,
      authenticated: authenticated,
      token: authenticated ? tokenToVerify : null,
      wsJwt: wsJwt,
      hostJwt: hostJwt,
      username: username,
      evmAddress: evmAddress,
      solanaAddress: solanaAddress,
      timestamp: Date.now()
    }, {
      headers: corsHeaders
    });
  } catch (err) {
    return Response.json({ error: 'SERVER_ERROR' }, { status: 500 });
  }
}
