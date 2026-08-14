import {
  formatQuotePriceForX402,
  buildFulfillmentFromQuote,
  settlementUsdForQuote,
} from 'opendome/dist/quote.js';
import { mintPassesAsPlatform } from 'opendome/dist/platformMint.js';
import { assignTicketsAsPlatform } from '../../utilsAPI/ticketsDb.js';

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers':
        'Content-Type, Authorization, payment-signature, x-payment-network',
    },
  });
}

/**
 * Agent checkout — platform confirms pay, mints, AND assigns tickets.
 * UI quote shows catalog prices; x402 charges $0.02 per NFT.
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { quote, toAddress } = body;

    if (!quote?.lineItems?.length) {
      return Response.json({ error: 'Invalid quote payload' }, { status: 400 });
    }

    const price = formatQuotePriceForX402(settlementUsdForQuote(quote));
    const { OpenDomeSeller, OpenDomeFacilitator } = await import('opendome/dist/x402.js');
    const merchantAddress = process.env.MERCHANT_ADDRESS;
    if (!merchantAddress) {
      return Response.json({ error: 'MERCHANT_ADDRESS is not set' }, { status: 500 });
    }
    const seller = new OpenDomeSeller(merchantAddress);
    const paymentSignatureBase64 = req.headers.get('payment-signature');

    if (!paymentSignatureBase64) {
      return new Response(null, {
        status: 402,
        headers: { 'x402-challenge': seller.generateChallenge(price) },
      });
    }

    let parsedPayment;
    try {
      parsedPayment = seller.parseAndValidateSignature(paymentSignatureBase64, price);
    } catch (err) {
      return Response.json({ error: err.message }, { status: 400 });
    }

    const facilitator = new OpenDomeFacilitator(process.env.MERCHANT_PRIVATE_KEY);
    let paymentTxHash;
    try {
      paymentTxHash = await facilitator.verifyAndRelay(
        parsedPayment.payload,
        parsedPayment.signature,
      );
      console.log(`[Checkout API] x402 settled ${price} USDC. Hash: ${paymentTxHash}`);
    } catch (relayErr) {
      console.error('[Checkout API] Facilitator relay failed:', relayErr.message);
      return Response.json({ error: relayErr.message }, { status: 500 });
    }

    const recipient = (toAddress || parsedPayment?.from || '').toLowerCase();
    const orderId = `OD-${Date.now().toString(36).toUpperCase()}`;

    let mintResult = null;
    if (quote.tokenIds?.length && recipient) {
      try {
        const amounts = quote.amounts || quote.tokenIds.map(() => 1);
        mintResult = await mintPassesAsPlatform({
          to: recipient,
          ids: quote.tokenIds,
          amounts,
          network: 'base',
        });
        console.log(`[Checkout API] Platform mint OK. Hash: ${mintResult.txHash}`);

        await assignTicketsAsPlatform(recipient, mintResult.ids, mintResult.amounts, {
          mintTxHash: mintResult.txHash,
          paymentTxHash,
          contractAddress: mintResult.contractAddress,
        });
        console.log('[Checkout API] Platform assigned tickets');
      } catch (mintErr) {
        console.error('[Checkout API] Platform mint/assign failed:', mintErr.message);
        return Response.json(
          {
            error: `Payment succeeded but platform ticket assignment failed: ${mintErr.message}. Retry via Sandbox POST /api/mint with ADMIN_SCANNER_TOKEN.`,
            paymentTxHash,
            orderId,
          },
          { status: 500 },
        );
      }
    }

    const confirmation = buildFulfillmentFromQuote(quote, {
      paymentTxHash,
      mintResult,
      toAddress: recipient,
      orderId,
    });

    return Response.json({
      success: true,
      confirmation,
      settledUsd: Number(price),
      signedBy: mintResult?.signedBy || null,
      message: 'Payment verified. Platform minted and assigned tickets.',
    });
  } catch (error) {
    console.error('[Checkout API]', error);
    return Response.json({ error: error.message || 'Checkout failed' }, { status: 500 });
  }
}
