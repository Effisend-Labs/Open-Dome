import {
  formatQuotePriceForX402,
  buildFulfillmentFromQuote,
  settlementUsdForQuote,
} from 'opendome/dist/quote.js';
import { mintPassesAsPlatform } from 'opendome/dist/platformMint.js';
import { assignTicketsAsPlatform } from '../../utilsAPI/ticketsDb.js';
import { Transactions } from '../../utilsAPI/passkeyDb.js';
import { mintPlanFromQuote } from '../../utilsAPI/mintPlanFromQuote.js';
import { verifySolanaPaymentProof } from '../../utilsAPI/solanaPaymentProof.js';
import { emitPlatformEvent } from '../../utilsAPI/platformTelemetry.js';

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
  const startedAt = Date.now();
  let network = 'BASE';
  try {
    const body = await req.json();
    const { quote, toAddress } = body;

    if (!quote?.lineItems?.length) {
      return Response.json({ error: 'Invalid quote payload' }, { status: 400 });
    }

    const price = formatQuotePriceForX402(settlementUsdForQuote(quote));
    const {
      OpenDomeSeller,
      resolveX402PaymentNetwork,
      resolveUsdcRpcUrls,
    } = await import('opendome/dist/x402.js');
    const paymentChain = resolveX402PaymentNetwork(
      req.headers.get('x-payment-network') || 'BASE',
    );
    network = paymentChain.key;
    const merchantAddress =
      paymentChain.key === 'SOL'
        ? process.env.MERCHANT_SOLANA_ADDRESS
        : process.env.MERCHANT_ADDRESS;
    if (!merchantAddress) {
      return Response.json(
        { error: `${paymentChain.key === 'SOL' ? 'MERCHANT_SOLANA_ADDRESS' : 'MERCHANT_ADDRESS'} is not set` },
        { status: 500 },
      );
    }
    const seller = new OpenDomeSeller(merchantAddress);
    const paymentSignatureBase64 = req.headers.get('payment-signature');

    if (!paymentSignatureBase64) {
      return new Response(null, {
        status: 402,
        headers: {
          'x402-challenge': seller.generateChallenge(price, {
            chain: paymentChain.key,
            payTo: merchantAddress,
          }),
        },
      });
    }

    let parsedPayment;
    try {
      parsedPayment = seller.parseAndValidateSignature(paymentSignatureBase64, price);
    } catch (err) {
      return Response.json({ error: err.message }, { status: 400 });
    }

    let paymentTxHash;
    if (paymentChain.key === 'SOL') {
      if (!verifySolanaPaymentProof(parsedPayment)) {
        return Response.json({ error: 'Invalid Solana payment proof' }, { status: 400 });
      }
      paymentTxHash = parsedPayment.transactionId;
      try {
        await Transactions.doc(`solana-x402-${paymentTxHash}`).create({
          chain: 'SOL',
          amount: parsedPayment.value,
          payTo: parsedPayment.to,
          createdAt: new Date().toISOString(),
        });
      } catch (recordErr) {
        const alreadyUsed =
          Number(recordErr?.code) === 6 ||
          /already exists/i.test(recordErr?.message || '');
        return Response.json(
          { error: alreadyUsed ? 'Solana payment was already used' : recordErr.message },
          { status: alreadyUsed ? 409 : 500 },
        );
      }
    } else {
      const { OpenDomeFacilitator } = await import('opendome/dist/x402.js');
      const facilitator = new OpenDomeFacilitator(process.env.MERCHANT_PRIVATE_KEY, {
        chain: paymentChain.key,
        rpcUrls: resolveUsdcRpcUrls(paymentChain),
        usdc: paymentChain.usdc,
      });
      try {
        paymentTxHash = await facilitator.verifyAndRelay(
          parsedPayment.payload,
          parsedPayment.signature,
        );
      } catch (relayErr) {
        console.error('[Host Checkout API] Facilitator relay failed:', relayErr.message);
        return Response.json({ error: relayErr.message }, { status: 500 });
      }
    }
    console.log(`[Host Checkout API] x402 settled ${price} USDC on ${paymentChain.key} (${settlementUsdForQuote(quote)} catalog demo rate). Hash: ${paymentTxHash}`);

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

    emitPlatformEvent({
      event_type: 'checkout',
      status: 'ok',
      network: paymentChain.key,
      amount_usdc: Number(price),
      latency_ms: Date.now() - startedAt,
    });
    if (mintResult) {
      emitPlatformEvent({
        event_type: 'pass_minted',
        status: 'ok',
        network: 'base',
        count: mintPlan.ids.length,
        latency_ms: Date.now() - startedAt,
      });
    }

    return Response.json({
      success: true,
      confirmation,
      settledUsd: Number(price),
      signedBy: mintResult?.signedBy || null,
      message: 'Payment verified. Platform minted and assigned tickets.',
    });
  } catch (error) {
    console.error('[Host Checkout API]', error);
    emitPlatformEvent({
      event_type: 'checkout',
      status: 'error',
      network,
      latency_ms: Date.now() - startedAt,
    });
    return Response.json({ error: error.message || 'Checkout failed' }, { status: 500 });
  }
}
