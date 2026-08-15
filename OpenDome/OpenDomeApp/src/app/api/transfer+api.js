import jwt from 'jsonwebtoken';
import { Wallets } from '../../utilsAPI/passkeyDb';
import {
  executeCircleNanoPayment,
  executeCircleNativeTransfer,
  executeSolanaUsdcTransfer,
} from '../../utilsAPI/circleTools.js';
import { isSolanaAddress } from '../../utilsAPI/cctp/solanaAddress.js';
import { nodeRequire } from '../../utilsAPI/nodeRequire.js';
import { emitPlatformEvent } from '../../utilsAPI/platformTelemetry.js';

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
  const startedAt = Date.now();
  let network = 'BASE';
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
    const asset = String(body.asset || 'USDC').toUpperCase();
    if (!amount || !destination) {
      return json({ error: 'amount and destination are required' }, 400);
    }
    if (asset !== 'USDC' && asset !== 'NATIVE') {
      return json({ error: 'asset must be USDC or NATIVE' }, 400);
    }

    const { normalizeUsdcChainKey, getUsdcChain } = nodeRequire('opendome/dist/x402.js');
    const blockchain = normalizeUsdcChainKey(body.blockchain || body.chain || 'BASE') || 'BASE';
    network = blockchain;
    const cfg = getUsdcChain(blockchain);

    const toSolana = isSolanaAddress(destination);
    const toEvm = EVM_ADDRESS.test(destination);
    if (!toSolana && !toEvm) {
      return json({ error: 'destination must be a 0x or Solana address' }, 400);
    }

    if (asset === 'NATIVE' && ((blockchain === 'SOL') !== toSolana)) {
      return json({ error: 'Native tokens can only be sent to the same network type' }, 400);
    }
    if (toSolana && blockchain !== 'BASE' && blockchain !== 'SOL') {
      return json(
        {
          error:
            'Solana destinations require Base (CCTP bridge) or Solana (same-chain) as source',
        },
        400,
      );
    }
    if (toEvm && blockchain === 'SOL') {
      return json({ error: 'Solana USDC can only be sent to a Solana address' }, 400);
    }
    if (toSolana && blockchain === 'ETH') {
      return json({ error: 'Ethereum → Solana bridge is not supported in v1' }, 400);
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

    const result =
      asset === 'NATIVE'
        ? await executeCircleNativeTransfer({
            amount,
            destination,
            walletId,
            blockchain,
          })
        : blockchain === 'SOL'
        ? await executeSolanaUsdcTransfer({ amount, destination, walletId })
        : await executeCircleNanoPayment({
            amount,
            destination,
            walletId,
            blockchain,
          });

    if (result?.error) return json({ error: result.error }, 400);
    emitPlatformEvent({
      event_type: 'usdc_transfer',
      status: 'ok',
      network: blockchain,
      amount_usdc: asset === 'USDC' ? Number(amount) : 0,
      latency_ms: Date.now() - startedAt,
    });
    return json({
      success: true,
      sponsored: Boolean(result.sponsored),
      bridged: Boolean(result.bridged),
      chain: result.chain || (toSolana ? 'solana' : cfg.key.toLowerCase()),
      blockchain: result.blockchain || cfg.circleBlockchain,
      txHash: result.txHash || null,
      mintTxHash: result.mintTxHash || null,
      transactionId: result.transactionId || result.txHash || null,
      feeUsdc: result.feeUsdc || null,
      asset,
    });
  } catch (err) {
    console.error('[Host Transfer]', err);
    emitPlatformEvent({
      event_type: 'usdc_transfer',
      status: 'error',
      network,
      latency_ms: Date.now() - startedAt,
    });
    return json({ error: err.message || 'Transfer failed' }, 500);
  }
}
