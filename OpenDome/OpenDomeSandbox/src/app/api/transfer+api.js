import jwt from 'jsonwebtoken';
import { Wallets } from '../../utilsAPI/passkeyDb';
import { executeCircleNanoPayment } from '../../api-utils/circle-tools.js';
import { nodeRequire } from '../../utilsAPI/nodeRequire.js';

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

function pickWalletId(walletData, blockchain) {
  const ids = walletData.walletIds || {};
  const key = String(blockchain || 'BASE').toUpperCase();
  if (ids[key]) return ids[key];
  if (key === 'BASE' || key === 'ETH') {
    return ids.BASE || ids.ETH || walletData.evm?.id || null;
  }
  if (key === 'SOL' || key === 'SOLANA') {
    return ids.SOL || ids.SOLANA || walletData.sol?.id || null;
  }
  return null;
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

    const { normalizeUsdcChainKey, getUsdcChain } = nodeRequire(
      'opendome/dist/x402.js',
    );
    const blockchain =
      normalizeUsdcChainKey(body.blockchain || body.chain || 'BASE') || 'BASE';
    const cfg = getUsdcChain(blockchain);

    if (!EVM_ADDRESS.test(destination)) {
      return json(
        { error: 'Sandbox transfer currently supports EVM destinations only' },
        400,
      );
    }
    if (blockchain === 'SOL') {
      return json({ error: 'Solana transfer is not wired in Sandbox yet' }, 400);
    }

    const walletDoc = await Wallets.doc(decoded.userId).get();
    if (!walletDoc.exists) {
      return json({ error: 'No wallet found for user' }, 400);
    }
    const walletData = walletDoc.data() || {};
    const walletId = pickWalletId(walletData, blockchain);
    if (!walletId) {
      return json({ error: `No Circle wallet for ${cfg.label}` }, 400);
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
      chain: cfg.key.toLowerCase(),
      blockchain: cfg.circleBlockchain || blockchain,
      txHash: result.txHash || null,
      transactionId: result.transactionId || result.txHash || null,
    });
  } catch (err) {
    console.error('[Sandbox Host Transfer]', err);
    return json({ error: err.message || 'Transfer failed' }, 500);
  }
}
