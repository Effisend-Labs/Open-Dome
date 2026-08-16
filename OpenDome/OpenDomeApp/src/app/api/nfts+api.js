import jwt from 'jsonwebtoken';
import { Wallets } from '../../utilsAPI/passkeyDb';
import { getCircleWalletsClient } from '../../utilsAPI/circleTools.js';
import { listNftsForUserWallets } from '../../utilsAPI/circleNftBalance.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

function json(body, status = 200) {
  return Response.json(body, { status, headers: CORS });
}

export async function POST(req) {
  try {
    const SESSION_JWT_TOKEN = process.env.SESSION_JWT_TOKEN;
    if (!SESSION_JWT_TOKEN) return json({ error: 'SESSION_JWT_TOKEN is not set' }, 500);

    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Missing or invalid Authorization header' }, 401);
    }

    let decoded;
    try {
      decoded = jwt.verify(authHeader.split(' ')[1], SESSION_JWT_TOKEN);
    } catch {
      return json({ error: 'Unauthorized: Invalid or expired token' }, 401);
    }

    const walletDoc = await Wallets.doc(decoded.userId).get();
    if (!walletDoc.exists) {
      return json({ error: 'No wallet found for user' }, 400);
    }

    const client = getCircleWalletsClient();
    const result = await listNftsForUserWallets(client, walletDoc.data() || {});
    return json({ success: true, ...result });
  } catch (err) {
    console.error('[Host NFTs]', err);
    return json({ error: err.message || 'Failed to load NFTs' }, 500);
  }
}
