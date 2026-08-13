import { mintPassesAsPlatform } from 'opendome/dist/platformMint.js';
import { assignTicketsAsPlatform } from '../../utilsAPI/ticketsDb.js';

/**
 * Platform mint — signs with MERCHANT_PRIVATE_KEY and assigns tickets.
 */
export async function POST(request) {
  try {
    const authHeader =
      request.headers.get('Authorization') ||
      request.headers.get('authorization') ||
      '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const scannerToken = process.env.ADMIN_SCANNER_TOKEN;

    if (!token) {
      return Response.json(
        { message: 'Authorization required — GOD JWT or ADMIN_SCANNER_TOKEN' },
        { status: 401 },
      );
    }

    const isService = token === scannerToken;
    if (!isService && token.length < 20) {
      return Response.json({ message: 'Unauthorized mint access' }, { status: 401 });
    }

    if (!process.env.MERCHANT_PRIVATE_KEY) {
      return Response.json(
        { message: 'Merchant wallet not configured on OpenDomeApp' },
        { status: 500 },
      );
    }

    const body = await request.json();
    const result = await mintPassesAsPlatform({
      to: body.to,
      ids: body.ids,
      amounts: body.amounts,
      tokenId: body.tokenId,
      amount: body.amount,
      network: body.network || 'base',
      contractAddress: body.contractAddress,
    });

    await assignTicketsAsPlatform(result.to, result.ids, result.amounts);

    return Response.json({
      ...result,
      message: 'Platform minted and assigned tickets',
    });
  } catch (err) {
    const status = err.status || 500;
    const message = err.reason || err.data?.message || err.message;
    console.error('[App mint]', message);
    return Response.json({ error: message, message }, { status });
  }
}
