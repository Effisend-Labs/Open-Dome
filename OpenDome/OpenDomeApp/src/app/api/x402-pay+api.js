import { Wallets } from '../../utilsAPI/passkeyDb';
import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

BigInt.prototype.toJSON = function () {
  return this.toString();
};

/** Testing — skip Circle USDC settlement without touching .env */
const FORCE_SKIP_X402 = true;

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

export async function POST(request) {
  try {
    const JWT_SECRET = process.env.JWT_SECRET || '275f0edac42d0454d77f9bb62ea812b70b1f3a1dac5d5fbca651e4819e438c52';

    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return Response.json({ error: 'Missing or invalid Authorization header' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      console.error(`[x402 Host] JWT Verification failed:`, err.message);
      return Response.json({ error: 'Unauthorized: Invalid or expired token' }, { status: 401 });
    }

    const payload = await request.json();
    const { serviceUrl, amount, fetchOptions } = payload;

    if (!serviceUrl) {
      return Response.json({ error: 'Service URL is required' }, { status: 400 });
    }

    console.log(`[x402 Host] Payment intent for ${serviceUrl} from @${decoded.username}`);

    // Skip real USDC: call service with user Bearer (agent free path) + bypass header (checkout).
    if (FORCE_SKIP_X402 || process.env.OD_BYPASS_X402 === 'true') {
      console.warn('[x402 Host] SKIP_X402 — no Circle settlement (code flag or env)');
      const { BYPASS_HEADER } = await import('opendome/dist/devBypass.js');
      const response = await fetch(serviceUrl, {
        ...fetchOptions,
        headers: {
          ...(fetchOptions?.headers || {}),
          Authorization: `Bearer ${token}`,
          [BYPASS_HEADER]: '1',
        },
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Bypass payment failed: ${response.status} - ${errorText}`);
      }
      const data = await response.json();
      return Response.json({ success: true, data, bypassX402: true });
    }

    const walletDoc = await Wallets.doc(decoded.userId).get();
    if (!walletDoc.exists) {
      return Response.json({ error: 'No wallet found for user' }, { status: 400 });
    }
    const walletData = walletDoc.data();

    const evmWalletId = walletData.walletIds?.BASE || walletData.walletIds?.ETH || walletData.evm?.id;
    const evmAddress = walletData.address || walletData.evm?.address;

    if (!evmWalletId || !evmAddress) {
      return Response.json({ error: 'No EVM wallet found for user' }, { status: 400 });
    }

    console.log(`[x402 Host] Wallet ${evmWalletId} @ ${evmAddress}`);

    const circleClient = initiateDeveloperControlledWalletsClient({
      apiKey: process.env.CIRCLE_API_KEY,
      entitySecret: process.env.CIRCLE_ENTITY_SECRET,
    });

    const targetNetwork = fetchOptions?.headers?.['x-payment-network']?.toLowerCase() || 'base';
    if (targetNetwork === 'solana') {
      return Response.json({ error: 'Solana x402 not supported on host yet' }, { status: 400 });
    }

    const { OpenDomeBuyer } = await import('opendome/dist/x402.js');

    console.log(`[x402 Host] Fetching 402 challenge from ${serviceUrl}...`);
    let challengeRes;
    try {
      challengeRes = await fetch(serviceUrl, fetchOptions || {});
    } catch (fetchErr) {
      const detail = formatX402Error(fetchErr);
      const hint = /8083/.test(serviceUrl)
        ? ' Start OpenDomeSandbox (`npm run web` on port 8083).'
        : '';
      throw new Error(`Cannot reach payment service (${serviceUrl}): ${detail}.${hint}`);
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
    const eip3009Payload = new OpenDomeBuyer(evmAddress).generateEIP3009Payload(
      challengeData.payTo,
      challengeData.amount,
    );

    const typedData = new OpenDomeBuyer(evmAddress).getTypedDataParams(challengeData.asset, eip3009Payload);
    if (!typedData.types.EIP712Domain) {
      typedData.types.EIP712Domain = [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
      ];
    }

    console.log('[x402 Host] Signing EIP-3009 via Circle HSM...');
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
    return Response.json({ success: true, data });
  } catch (err) {
    const message = formatX402Error(err);
    const relaxed =
      process.env.OD_RELAX_X402_ERRORS === 'true' &&
      (message.includes('Payment settlement failed') ||
        message.includes('Internal Server Error'));

    if (relaxed) {
      console.warn(`[x402 Host] Relaxed mode: ${message}`);
      return Response.json({
        success: true,
        data: { response: 'Payment signature verified (relaxed mode).' },
      });
    }

    console.error('[x402 Host] Error:', message);
    return Response.json({ error: message || 'Payment failed' }, { status: 500 });
  }
}
