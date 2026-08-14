import jwt from 'jsonwebtoken';
import { loadUserWalletBalances } from '../../utilsAPI/userWalletBalances';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

function json(body, status = 200) {
  return Response.json(body, { status, headers: CORS });
}

/** Authenticated Circle balances for the signed-in user (all configured chains). */
export async function GET(req) {
  try {
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) return json({ error: 'JWT_SECRET is not set' }, 500);

    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Missing or invalid Authorization header' }, 401);
    }

    let decoded;
    try {
      decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    } catch {
      return json({ error: 'Unauthorized: Invalid or expired token' }, 401);
    }

    const payload = await loadUserWalletBalances(decoded.userId);
    if (payload.error) return json({ error: payload.error }, payload.status || 400);
    return json(payload);
  } catch (err) {
    console.error('[Host wallet-balances]', err);
    return json({ error: err.message || 'Failed to load wallet balances' }, 500);
  }
}
