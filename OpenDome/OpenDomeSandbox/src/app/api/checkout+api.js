import {
  formatQuotePriceForX402,
  buildFulfillmentFromQuote,
} from 'opendome/dist/quote.js';
import {
  isX402BypassEnabled,
  isBlockchainBypassEnabled,
  fakeTxHash,
  BYPASS_HEADER,
} from 'opendome/dist/devBypass.js';
import { mintPassesAsPlatform } from 'opendome/dist/platformMint.js';
import { assignTicketsAsPlatform } from '../../utilsAPI/ticketsDb.js';

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers':
        `Content-Type, Authorization, payment-signature, x-payment-network, ${BYPASS_HEADER}`,
    },
  });
}

/**
 * Agent checkout — platform confirms pay, mints, AND assigns tickets.
 * Admin is not on this path (hotfix only if this fails).
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { quote, toAddress } = body;

    if (!quote?.lineItems?.length) {
      return Response.json({ error: 'Invalid quote payload' }, { status: 400 });
    }

    const bypassX402 = isX402BypassEnabled();
    const bypassChain = isBlockchainBypassEnabled();
    const price = formatQuotePriceForX402(quote.totalUsd);
    const { OpenDomeSeller, OpenDomeFacilitator } = await import('opendome/dist/x402.js');
    const merchantAddress = process.env.MERCHANT_ADDRESS || '0x69F6B4d206E19D2ef5838ed3E7150F2D22A9Fc7f';
    const seller = new OpenDomeSeller(merchantAddress);
    const paymentSignatureBase64 = req.headers.get('payment-signature');
    const bypassHeader = req.headers.get(BYPASS_HEADER) === '1';

    let parsedPayment = null;
    let paymentTxHash = null;

    if (bypassX402 && (bypassHeader || !paymentSignatureBase64)) {
      console.warn('[Checkout API] OD_BYPASS_X402 — skipping facilitator settlement');
      paymentTxHash = fakeTxHash('x402');
      parsedPayment = { from: toAddress || merchantAddress };
    } else {
      if (!paymentSignatureBase64) {
        return new Response(null, {
          status: 402,
          headers: { 'x402-challenge': seller.generateChallenge(price) },
        });
      }

      try {
        parsedPayment = seller.parseAndValidateSignature(paymentSignatureBase64, price);
      } catch (err) {
        return Response.json({ error: err.message }, { status: 400 });
      }

      if (bypassX402) {
        console.warn('[Checkout API] OD_BYPASS_X402 — signature accepted, relay skipped');
        paymentTxHash = fakeTxHash('x402');
      } else {
        const facilitator = new OpenDomeFacilitator(process.env.MERCHANT_PRIVATE_KEY);
        try {
          paymentTxHash = await facilitator.verifyAndRelay(
            parsedPayment.payload,
            parsedPayment.signature,
          );
          console.log(`[Checkout API] x402 settled. Hash: ${paymentTxHash}`);
        } catch (relayErr) {
          console.error('[Checkout API] Facilitator relay failed:', relayErr.message);
          return Response.json({ error: relayErr.message }, { status: 500 });
        }
      }
    }

    const recipient = (toAddress || parsedPayment?.from || '').toLowerCase();
    const orderId = `OD-${Date.now().toString(36).toUpperCase()}`;

    let mintResult = null;
    if (quote.tokenIds?.length && recipient) {
      try {
        const amounts = quote.amounts || quote.tokenIds.map(() => 1);
        if (bypassChain) {
          console.warn('[Checkout API] OD_BYPASS_BLOCKCHAIN — skip chain mint; platform assigns tickets');
          mintResult = {
            success: true,
            txHash: fakeTxHash('mint'),
            to: recipient,
            ids: quote.tokenIds,
            amounts,
            contractAddress:
              process.env.CONTRACT_ADDRESS ||
              '0x40c39F091a7c85D10B8C46762b59Df3eCd77630C',
            signedBy: 'platform-bypass',
          };
        } else {
          mintResult = await mintPassesAsPlatform({
            to: recipient,
            ids: quote.tokenIds,
            amounts,
            network: 'base',
          });
          console.log(`[Checkout API] Platform mint OK. Hash: ${mintResult.txHash}`);
        }

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
            error: `Payment succeeded but platform ticket assignment failed: ${mintErr.message}. Use Admin /api/fulfill hotfix to recover.`,
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
      bypass: { x402: bypassX402, blockchain: bypassChain },
      signedBy: mintResult?.signedBy || null,
      message:
        bypassX402 || bypassChain
          ? 'Checkout completed (dev bypass). Platform assigned tickets.'
          : 'Payment verified. Platform minted and assigned tickets.',
    });
  } catch (error) {
    console.error('[Checkout API]', error);
    return Response.json({ error: error.message || 'Checkout failed' }, { status: 500 });
  }
}
