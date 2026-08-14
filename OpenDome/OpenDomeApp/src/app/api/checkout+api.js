import {
  formatQuotePriceForX402,
  buildFulfillmentFromQuote,
  settlementUsdForQuote,
} from 'opendome/dist/quote.js';
import { mintPassesAsPlatform } from 'opendome/dist/platformMint.js';
import { assignTicketsAsPlatform } from '../../utilsAPI/ticketsDb.js';
import { mintPlanFromQuote } from '../../utilsAPI/mintPlanFromQuote.js';

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
 * Agent checkout on OpenDomeApp — platform pay + mint + assign tickets.
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
    const { OpenDomeSeller } = await import('opendome/dist/x402Challenge.js');
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

    const { OpenDomeFacilitator } = await import('opendome/dist/x402.js');
    const facilitator = new OpenDomeFacilitator(process.env.MERCHANT_PRIVATE_KEY);
    let paymentTxHash;
    try {
      paymentTxHash = await facilitator.verifyAndRelay(
        parsedPayment.payload,
        parsedPayment.signature,
      );
      console.log(`[Host Checkout API] x402 settled ${price} USDC (${settlementUsdForQuote(quote)} catalog demo rate). Hash: ${paymentTxHash}`);
    } catch (relayErr) {
      console.error('[Host Checkout API] Facilitator relay failed:', relayErr.message);
      return Response.json({ error: relayErr.message }, { status: 500 });
    }

    const recipient = String(toAddress || parsedPayment?.from || '')
      .trim()
      .toLowerCase();
    if (!recipient || !recipient.startsWith('0x')) {
      return Response.json(
        { error: 'Sign in required to mint passes (missing wallet address).' },
        { status: 401 },
      );
    }
    const orderId = `OD-${Date.now().toString(36).toUpperCase()}`;

    const mintPlan = mintPlanFromQuote(quote);
    const quoteForMint = {
      ...quote,
      tokenIds: mintPlan.ids,
      amounts: mintPlan.amounts,
    };

    let mintResult = null;
    if (mintPlan.ids.length && recipient) {
      try {
        mintResult = await mintPassesAsPlatform({
          to: recipient,
          ids: mintPlan.ids,
          amounts: mintPlan.amounts,
          network: 'base',
        });
        console.log(`[Host Checkout API] Platform mint OK. Hash: ${mintResult.txHash}`);

        await assignTicketsAsPlatform(recipient, mintResult.ids, mintResult.amounts, {
          mintTxHash: mintResult.txHash,
          paymentTxHash,
          contractAddress: mintResult.contractAddress,
          lineItems: quote.lineItems,
        });
        console.log(
          `[Host Checkout API] Platform assigned tickets → ${recipient} ids=${JSON.stringify(mintResult.ids)}`,
        );
      } catch (mintErr) {
        console.error('[Host Checkout API] Platform mint/assign failed:', mintErr.message);
        return Response.json(
          {
            error: `Payment succeeded but platform ticket assignment failed: ${mintErr.message}. Retry via OpenDomeApp POST /api/mint with ADMIN_SCANNER_TOKEN.`,
            paymentTxHash,
            orderId,
          },
          { status: 500 },
        );
      }
    }

    const confirmation = buildFulfillmentFromQuote(quoteForMint, {
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
    console.error('[Host Checkout API]', error);
    return Response.json({ error: error.message || 'Checkout failed' }, { status: 500 });
  }
}
