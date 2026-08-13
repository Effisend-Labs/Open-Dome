import { mintPassesToAddress } from '../../utilsAPI/mintService';
import { addTickets } from '../../utilsAPI/adminDb';
import { isBlockchainBypassEnabled } from 'opendome/dist/devBypass.js';

const SERVICE_TOKEN =
  process.env.ADMIN_SCANNER_TOKEN || 'admin-session-token-123';

function authorizeService(request) {
  const authHeader =
    request.headers.get('Authorization') ||
    request.headers.get('authorization') ||
    '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  return token && token === SERVICE_TOKEN;
}

function fakeMintHash() {
  return `0xbypass${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;
}

/**
 * Admin HOTFIX only — recover when agent payment succeeded but platform mint/assign failed.
 * Happy-path agent checkout does NOT call this (Sandbox/App mint + assign themselves).
 *
 * Auth: Bearer ADMIN_SCANNER_TOKEN
 * Body: { mode?: 'hotfix', to, ids, amounts, ... }
 */
export async function POST(request) {
  try {
    if (!authorizeService(request)) {
      return Response.json({ error: 'Unauthorized service token' }, { status: 401 });
    }

    const body = await request.json();
    const {
      to,
      ids,
      amounts,
      network,
      orderId,
      paymentTxHash,
      quoteId,
      mintTxHash,
      bypassBlockchain: bodyBypass,
    } = body;

    if (!to) {
      return Response.json({ error: 'to (recipient address) is required' }, { status: 400 });
    }

    if (!ids?.length) {
      return Response.json({
        success: true,
        skipped: true,
        message: 'No pass tokenIds to mint',
        orderId,
        paymentTxHash,
        quoteId,
      });
    }

    const resolvedAmounts = amounts || ids.map(() => 1);
    const bypass = bodyBypass === true || isBlockchainBypassEnabled();

    if (bypass) {
      console.warn('[Admin fulfill] HOTFIX bypass — indexing tickets only');
      const txHash = mintTxHash || fakeMintHash();
      const { explorer } = await addTickets(to, ids, resolvedAmounts, {
        mintTxHash: txHash,
        paymentTxHash,
        assignedBy: 'admin-hotfix',
      });
      return Response.json({
        success: true,
        mode: 'hotfix',
        bypassBlockchain: true,
        txHash,
        to,
        ids,
        amounts: resolvedAmounts,
        orderId,
        paymentTxHash,
        quoteId,
        explorer,
        signedBy: 'admin',
        message: 'Hotfix: tickets indexed (blockchain bypassed)',
      });
    }

    console.warn('[Admin fulfill] HOTFIX — Admin signing recovery mint');
    const result = await mintPassesToAddress({
      to,
      ids,
      amounts: resolvedAmounts,
      network: network || 'base',
      recordTickets: true,
      paymentTxHash,
    });

    return Response.json({
      ...result,
      mode: 'hotfix',
      signedBy: 'admin',
      orderId,
      paymentTxHash,
      quoteId,
      message: 'Hotfix: passes minted and indexed by Admin',
    });
  } catch (err) {
    const status = err.status || 500;
    const message = err.reason || err.data?.message || err.message;
    console.error('[Admin fulfill]', message);
    return Response.json({ error: message }, { status });
  }
}
