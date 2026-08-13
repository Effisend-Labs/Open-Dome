import jwt from 'jsonwebtoken';
import { Wallets } from '../../utilsAPI/passkeyDb';
import { executeCircleNanoPayment } from '../../utilsAPI/circleTools.js';
import { isSolanaAddress } from '../../utilsAPI/cctp/solanaAddress.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/;

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

function json(body, status = 200) {
  return Response.json(body, { status, headers: CORS });
}

export async function POST(req) {
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

    const body = await req.json().catch(() => ({}));
    const amount = String(body.amount || '').trim();
    const destination = String(body.destination || body.to || '').trim();
    if (!amount || !destination) {
      return json({ error: 'amount and destination are required' }, 400);
    }
    const toSolana = isSolanaAddress(destination);
    if (!toSolana && !EVM_ADDRESS.test(destination)) {
      return json({ error: 'destination must be a Base (0x) or Solana address' }, 400);
    }

    const walletDoc = await Wallets.doc(decoded.userId).get();
    if (!walletDoc.exists) {
      return json({ error: 'No wallet found for user' }, 400);
    }
    const walletData = walletDoc.data() || {};
    const walletId =
      walletData.walletIds?.BASE ||
      walletData.walletIds?.ETH ||
      walletData.evm?.id;
    if (!walletId) {
      return json({ error: 'No Base Circle wallet for this user' }, 400);
    }

    const result = await executeCircleNanoPayment({
      amount,
      destination,
      walletId,
    });
    if (result?.error) return json({ error: result.error }, 400);
    return json({
      success: true,
      sponsored: Boolean(result.sponsored),
      bridged: Boolean(result.bridged),
      chain: result.chain || (toSolana ? 'solana' : 'base'),
      txHash: result.txHash || null,
      mintTxHash: result.mintTxHash || null,
      transactionId: result.transactionId || result.txHash || null,
      feeUsdc: result.feeUsdc || null,
    });
  } catch (err) {
    console.error('[Host Transfer]', err);
    return json({ error: err.message || 'Transfer failed' }, 500);
  }
}
