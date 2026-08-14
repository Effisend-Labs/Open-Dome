import {
  mintPassesToAddress,
  readAuthToken,
} from '../../utilsAPI/mintService';

const SERVICE_TOKEN = process.env.ADMIN_SCANNER_TOKEN;

function authorizeService(request) {
  const token = readAuthToken(request);
  return Boolean(token && SERVICE_TOKEN && token === SERVICE_TOKEN);
}

/**
 * Admin HOTFIX only — recover when agent payment succeeded but platform mint/assign failed.
 * Proxies to OpenDomeApp /api/mint with ADMIN_SCANNER_TOKEN (no local merchant key).
 *
 * Auth: Bearer ADMIN_SCANNER_TOKEN
 * Body: { mode?: 'hotfix', to, ids, amounts, ... }
 */
export async function POST(request) {
  try {
    if (!authorizeService(request)) {
      return Response.json({ error: 'Unauthorized service token' }, { status: 401 });
    }

    const authToken = readAuthToken(request);
    const body = await request.json();
    const {
      to,
      ids,
      amounts,
      network,
      orderId,
      paymentTxHash,
      quoteId,
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

    console.warn('[Admin fulfill] HOTFIX — proxy mint to OpenDomeApp');
    const result = await mintPassesToAddress({
      authToken,
      to,
      ids,
      amounts: resolvedAmounts,
      network: network || 'base',
      paymentTxHash,
    });

    return Response.json({
      ...result,
      mode: 'hotfix',
      signedBy: result.signedBy || 'opendomeapp',
      orderId,
      paymentTxHash,
      quoteId,
      message: 'Hotfix: passes minted via OpenDomeApp',
    });
  } catch (err) {
    const status = err.status || 500;
    const message = err.reason || err.data?.message || err.message;
    console.error('[Admin fulfill]', message);
    return Response.json({ error: message }, { status });
  }
}
