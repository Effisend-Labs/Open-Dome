import { mintPassesToAddress } from '../../utilsAPI/mintService';

const SERVICE_TOKEN = process.env.ADMIN_SCANNER_TOKEN;

function authorizeService(request) {
  const authHeader =
    request.headers.get('Authorization') ||
    request.headers.get('authorization') ||
    '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  return token && token === SERVICE_TOKEN;
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
