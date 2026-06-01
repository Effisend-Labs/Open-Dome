import jwt from 'jsonwebtoken';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1"
});
const dynamo = DynamoDBDocumentClient.from(client);

// Secure list of UUIDv4 authorization tokens kept on the server
const VALID_TOKENS = [
  '8f46757b-7b08-4d5f-9dc1-2df88bc11425', 
  '7c9e66ab-83c3-4d6b-871d-55737bc0ccbb',
  'a98e8c11-9a70-4cc8-8d2a-c211b8b8098c'
];

const ALLOWED_ORIGINS = [
  'http://localhost:8081',
  'http://localhost:8082',
  'https://opendome.expo.app',
  'https://miniapp.expo.app',
];

function getMatchedOrigin(origin) {
  if (!origin) return null;
  // Allow any port on localhost / 127.0.0.1
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
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
    
    // Check if request is from an allowed origin
    const isAllowedOrigin = matchedOrigin && (
      matchedOrigin.includes('localhost') || 
      matchedOrigin.includes('opendome.expo.app') || 
      matchedOrigin.includes('miniapp.expo.app') ||
      matchedOrigin.includes('effisend')
    );

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
        authenticated = true;
        console.log(`[Verify API] JWT decoded: userId="${userId}", username="${username}"`);

        // Look up wallets and canonical username from DynamoDB
        try {
          console.log(`[Verify API] Querying DynamoDB for user_${userId}...`);
          const userRecords = await dynamo.send(new QueryCommand({
            TableName: 'Open-Dome-Users',
            KeyConditionExpression: '#user = :user',
            ExpressionAttributeNames: { '#user': 'user' },
            ExpressionAttributeValues: { ':user': `user_${userId}` }
          }));
          console.log(`[Verify API] DynamoDB returned ${userRecords.Items?.length ?? 0} record(s)`);
          const userItem = userRecords.Items?.[0];
          if (userItem) {
            console.log(`[Verify API] Record username="${userItem.username}", evm="${userItem.evm?.address}", sol="${userItem.solana?.address}"`);
            if (userItem.username) username = userItem.username;
            if (userItem.evm?.address) evmAddress = userItem.evm.address;
            if (userItem.solana?.address) solanaAddress = userItem.solana.address;
          } else {
            console.warn(`[Verify API] No DynamoDB record found for user_${userId}`);
          }
        } catch (dbErr) {
          console.error(`[Verify API] DynamoDB lookup failed:`, dbErr.message);
        }
        console.log(`[Verify API] Final resolved: username="${username}", evmAddress="${evmAddress}"`);
      } catch (jwtErr) {
        console.error(`[Verify API] JWT verification failed:`, jwtErr.message);
      }
    }

    // If not verified with a real token, let's check for fallback (only for allowed origins)
    if (!authenticated && isAllowedOrigin && tokenToVerify) {
      // Allow valid hardcoded tokens array fallback for development/sandbox testing
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

      // 2. JWT for the Host
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
      console.log(`🚀 SECURE JWT GENERATED FOR HOST CONTAINER (${hostOptions.expiresIn} expiry)`);
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
