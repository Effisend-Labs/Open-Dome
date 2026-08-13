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
import { mintPlanFromQuote } from '../../utilsAPI/mintPlanFromQuote.js';

/** Testing — skip USDC settlement without touching .env */
const FORCE_SKIP_X402 = true;

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
 * Agent checkout on OpenDomeApp — platform pay + mint + assign tickets.
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { quote, toAddress } = body;

    if (!quote?.lineItems?.length) {
      return Response.json({ error: 'Invalid quote payload' }, { status: 400 });
    }

    const bypassX402 =
      FORCE_SKIP_X402 ||
      isX402BypassEnabled() ||
      req.headers.get(BYPASS_HEADER) === '1';
    const bypassChain = isBlockchainBypassEnabled();
    const price = formatQuotePriceForX402(quote.totalUsd);
    const { OpenDomeSeller, OpenDomeFacilitator } = await import('opendome/dist/x402.js');
    const merchantAddress = process.env.MERCHANT_ADDRESS;
    if (!merchantAddress) {
      return Response.json({ error: 'MERCHANT_ADDRESS is not set' }, { status: 500 });
    }
    const seller = new OpenDomeSeller(merchantAddress);
    const paymentSignatureBase64 = req.headers.get('payment-signature');

    let parsedPayment = null;
    let paymentTxHash = null;

    if (bypassX402) {
      console.warn('[Host Checkout API] SKIP_X402 — no facilitator settlement');
      paymentTxHash = fakeTxHash('x402');
      parsedPayment = { from: toAddress || null };
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

      const facilitator = new OpenDomeFacilitator(process.env.MERCHANT_PRIVATE_KEY);
      try {
        paymentTxHash = await facilitator.verifyAndRelay(
          parsedPayment.payload,
          parsedPayment.signature,
        );
        console.log(`[Host Checkout API] x402 settled. Hash: ${paymentTxHash}`);
      } catch (relayErr) {
        console.error('[Host Checkout API] Facilitator relay failed:', relayErr.message);
        return Response.json({ error: relayErr.message }, { status: 500 });
      }
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
        if (bypassChain) {
          console.warn('[Host Checkout API] OD_BYPASS_BLOCKCHAIN — skip chain mint; platform assigns tickets');
          mintResult = {
            success: true,
            txHash: fakeTxHash('mint'),
            to: recipient,
            ids: mintPlan.ids,
            amounts: mintPlan.amounts,
            contractAddress:
              process.env.CONTRACT_ADDRESS ||
              '0xf5053b8bAfc35c52DbED12c38Ef4c8AEb75999FF',
            signedBy: 'platform-bypass',
          };
        } else {
          mintResult = await mintPassesAsPlatform({
            to: recipient,
            ids: mintPlan.ids,
            amounts: mintPlan.amounts,
            network: 'base',
          });
          console.log(`[Host Checkout API] Platform mint OK. Hash: ${mintResult.txHash}`);
        }

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
            error: `Payment succeeded but platform ticket assignment failed: ${mintErr.message}. Use Admin /api/fulfill hotfix to recover.`,
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
      bypass: { x402: bypassX402, blockchain: bypassChain },
      signedBy: mintResult?.signedBy || null,
      message:
        bypassX402 || bypassChain
          ? 'Checkout completed (dev bypass). Platform assigned tickets.'
          : 'Payment verified. Platform minted and assigned tickets.',
    });
  } catch (error) {
    console.error('[Host Checkout API]', error);
    return Response.json({ error: error.message || 'Checkout failed' }, { status: 500 });
  }
}
