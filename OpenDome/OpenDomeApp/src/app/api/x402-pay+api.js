import { Wallets } from '../../utilsAPI/passkeyDb';
import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { nodeRequire } from '../../utilsAPI/nodeRequire';
import { signSolanaPaymentProof } from '../../utilsAPI/solanaPaymentProof.js';
import { emitPlatformEvent } from '../../utilsAPI/platformTelemetry.js';

BigInt.prototype.toJSON = function () {
  return this.toString();
};

function formatX402Error(err) {
  if (!err) return 'Unknown payment error';
  const parts = [];
  if (err.message) parts.push(err.message);
  if (err.cause?.message) parts.push(err.cause.message);
  if (err.cause?.code) parts.push(err.cause.code);
  const circle = err.response?.data || err.data;
  if (circle) {
    const detail =
      typeof circle === 'string'
        ? circle
        : circle.message || circle.error || JSON.stringify(circle);
    if (detail) parts.push(detail);
  }
  if (!parts.length) parts.push(String(err));
  return parts.filter(Boolean).join(' · ');
}

function pickEvmWalletId(walletData, chainKey) {
  const ids = walletData.walletIds || {};
  const key = String(chainKey || 'BASE').toUpperCase();
  if (ids[key]) return ids[key];
  if (key === 'BASE') return ids.BASE || walletData.evm?.id || null;
  if (key === 'ETH') return ids.ETH || walletData.evm?.id || null;
  return null;
}

export async function POST(request) {
  const startedAt = Date.now();
  let network = 'BASE';
  try {
    const SESSION_JWT_TOKEN = process.env.SESSION_JWT_TOKEN;
    if (!SESSION_JWT_TOKEN) {
      return Response.json({ error: 'SESSION_JWT_TOKEN is not set' }, { status: 500 });
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return Response.json(
        { error: 'Missing or invalid Authorization header' },
        { status: 401 },
      );
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, SESSION_JWT_TOKEN);
    } catch (err) {
      console.error(`[x402 Host] JWT Verification failed:`, err.message);
      return Response.json(
        { error: 'Unauthorized: Invalid or expired token' },
        { status: 401 },
      );
    }

    const payload = await request.json();
    const { serviceUrl, amount, fetchOptions } = payload;

    if (!serviceUrl) {
      return Response.json({ error: 'Service URL is required' }, { status: 400 });
    }

    const {
      OpenDomeBuyer,
      resolveX402PaymentNetwork,
      usdcAtomicToDecimal,
    } = nodeRequire('opendome/dist/x402.js');

    let cfg;
    try {
      cfg = resolveX402PaymentNetwork(
        fetchOptions?.headers?.['x-payment-network'] || 'base',
      );
    } catch (err) {
      return Response.json(
        { error: err.message },
        { status: err.status || 400 },
      );
    }
    network = cfg.key;

    console.log(
      `[x402 Host] Payment intent for ${serviceUrl} from @${decoded.username} on ${cfg.key}`,
    );

    const walletDoc = await Wallets.doc(decoded.userId).get();
    if (!walletDoc.exists) {
      return Response.json({ error: 'No wallet found for user' }, { status: 400 });
    }
    const walletData = walletDoc.data();

    const circleClient = initiateDeveloperControlledWalletsClient({
      apiKey: process.env.CIRCLE_API_KEY,
      entitySecret: process.env.CIRCLE_ENTITY_SECRET,
    });

    console.log(`[x402 Host] Fetching 402 challenge from ${serviceUrl}...`);
    let challengeRes;
    try {
      challengeRes = await fetch(serviceUrl, fetchOptions || {});
    } catch (fetchErr) {
      const detail = formatX402Error(fetchErr);
      const hint = /8083/.test(serviceUrl)
        ? ' Start OpenDomeSandbox (`npm run web` on port 8083).'
        : '';
      throw new Error(
        `Cannot reach payment service (${serviceUrl}): ${detail}.${hint}`,
      );
    }

    if (challengeRes.status !== 402) {
      const body = await challengeRes.text().catch(() => '');
      throw new Error(
        `Expected 402 challenge, got ${challengeRes.status}${body ? ` — ${body.slice(0, 200)}` : ''}`,
      );
    }

    const challengeHeader = challengeRes.headers.get('x402-challenge');
    if (!challengeHeader) throw new Error('Missing x402-challenge header');

    const challengeData = OpenDomeBuyer.parseChallenge(challengeHeader);
    if (!challengeData.asset || !challengeData.amount || !challengeData.payTo) {
      throw new Error('Invalid challenge parameters');
    }

    // —— Solana: settle USDC via Circle, then prove payment to the agent ——
    if (cfg.key === 'SOL') {
      const solWalletId =
        walletData.walletIds?.SOL ||
        walletData.walletIds?.SOLANA ||
        walletData.sol?.id ||
        null;
      if (!solWalletId) {
        return Response.json(
          { error: 'No Solana Circle wallet for this user' },
          { status: 400 },
        );
      }

      const { executeSolanaUsdcTransfer } = await import(
        '../../utilsAPI/circleTools.js'
      );
      const decimalAmount = usdcAtomicToDecimal(challengeData.amount);
      const settled = await executeSolanaUsdcTransfer({
        amount: decimalAmount,
        destination: challengeData.payTo,
        walletId: solWalletId,
      });
      if (!settled?.success) {
        throw new Error(settled?.error || 'Solana USDC payment failed');
      }

      const solanaPayment = {
        x402Version: 2,
        scheme: 'solana-circle',
        chain: 'SOL',
        amount: challengeData.amount,
        payTo: challengeData.payTo,
        transactionId: settled.transactionId,
      };
      solanaPayment.proof = signSolanaPaymentProof(solanaPayment);
      const paymentSignatureBase64 = Buffer.from(
        JSON.stringify(solanaPayment),
      ).toString('base64');

      const response = await fetch(serviceUrl, {
        ...fetchOptions,
        headers: {
          ...(fetchOptions?.headers || {}),
          'payment-signature': paymentSignatureBase64,
        },
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Payment failed: ${response.status} - ${errorText}`);
      }
      const data = await response.json();
      emitPlatformEvent({
        event_type: 'x402_payment',
        status: 'ok',
        network: 'SOL',
        amount_usdc: Number(amount) || 0,
        latency_ms: Date.now() - startedAt,
      });
      return Response.json({
        success: true,
        data,
        paymentTxHash: settled.transactionId,
        paymentNetwork: 'SOL',
      });
    }

    // —— EVM L2s: EIP-3009 sign + facilitator relay on agent ——
    const evmWalletId = pickEvmWalletId(walletData, cfg.key);
    const evmAddress = walletData.address || walletData.evm?.address;
    if (!evmWalletId || !evmAddress) {
      return Response.json(
        { error: 'No EVM wallet found for user' },
        { status: 400 },
      );
    }

    console.log(`[x402 Host] Wallet ${evmWalletId} @ ${evmAddress} (${cfg.key})`);

    const buyer = new OpenDomeBuyer(evmAddress);
    const eip3009Payload = buyer.generateEIP3009Payload(
      challengeData.payTo,
      challengeData.amount,
    );

    const typedData = buyer.getTypedDataParams(
      challengeData.asset || cfg.usdc,
      eip3009Payload,
      cfg.key,
    );
    if (!typedData.types.EIP712Domain) {
      typedData.types.EIP712Domain = [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ];
    }

    console.log(`[x402 Host] Signing EIP-3009 via Circle HSM on ${cfg.key}...`);
    let signatureResponse;
    try {
      signatureResponse = await circleClient.signTypedData({
        walletId: evmWalletId,
        data: JSON.stringify(typedData, (key, value) =>
          typeof value === 'bigint' ? value.toString() : value,
        ),
        idempotencyKey: crypto.randomUUID(),
      });
    } catch (signErr) {
      throw new Error(`Circle signTypedData failed: ${formatX402Error(signErr)}`);
    }

    if (!signatureResponse.data?.signature) {
      throw new Error('Failed to sign EIP-3009 payload via Circle HSM');
    }

    const paymentSignatureBase64 = Buffer.from(
      JSON.stringify({
        x402Version: 2,
        payload: eip3009Payload,
        signature: signatureResponse.data.signature,
        chain: cfg.key,
      }),
    ).toString('base64');

    console.log('[x402 Host] Submitting payment-signature to service...');
    const response = await fetch(serviceUrl, {
      ...fetchOptions,
      headers: {
        ...(fetchOptions?.headers || {}),
        'payment-signature': paymentSignatureBase64,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Payment failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    emitPlatformEvent({
      event_type: 'x402_payment',
      status: 'ok',
      network: cfg.key,
      amount_usdc: Number(amount) || 0,
      latency_ms: Date.now() - startedAt,
    });
    return Response.json({
      success: true,
      data,
      paymentNetwork: cfg.key,
      paymentTxHash: data?.paymentTxHash || null,
    });
  } catch (err) {
    const message = formatX402Error(err);
    console.error('[x402 Host] Error:', message);
    emitPlatformEvent({
      event_type: 'x402_payment',
      status: 'error',
      network,
      latency_ms: Date.now() - startedAt,
    });
    return Response.json({ error: message || 'Payment failed' }, { status: 500 });
  }
}
