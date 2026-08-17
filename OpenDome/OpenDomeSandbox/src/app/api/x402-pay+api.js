import { Wallets } from '../../utilsAPI/passkeyDb';
import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import {
  parseQuotedUsdcAmount,
  validateX402ServiceUrl,
  buildX402ServiceFetchOptions,
} from '../../utilsAPI/x402ServicePolicy.js';

// Monkey-patch BigInt serialization because the @circle-fin GatewayClient 
// internally calls JSON.stringify() on payloads containing BigInts without a replacer.
BigInt.prototype.toJSON = function () {
  return this.toString();
};

export async function POST(request) {
  try {
    const SESSION_JWT_TOKEN = process.env.SESSION_JWT_TOKEN;
    if (!SESSION_JWT_TOKEN) {
      return Response.json({ error: 'SESSION_JWT_TOKEN is not set' }, { status: 500 });
    }
    
    // 1. Verify Authorization Header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return Response.json({ error: 'Missing or invalid Authorization header' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, SESSION_JWT_TOKEN);
    } catch (err) {
      console.error(`[x402 Custodial Backend] JWT Verification failed:`, err.message);
      return Response.json({ error: 'Unauthorized: Invalid or expired token' }, { status: 401 });
    }

    const payload = await request.json();
    const { serviceUrl, amount, fetchOptions } = payload;

    if (!serviceUrl) {
      return Response.json({ error: 'Service URL is required' }, { status: 400 });
    }
    let paymentUrl;
    let quotedAmount;
    try {
      paymentUrl = await validateX402ServiceUrl(serviceUrl);
      quotedAmount = parseQuotedUsdcAmount(amount);
    } catch (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    const serviceFetch = buildX402ServiceFetchOptions(
      paymentUrl,
      fetchOptions,
      authHeader,
      request.url,
    );

    console.log(`[x402 Custodial Backend] Received payment intent for ${serviceUrl} from user ${decoded.username}`);

    console.log(`[x402 Custodial Backend] Retrieving Developer-Controlled Wallet for user ID: ${decoded.userId}...`);

    const walletDoc = await Wallets.doc(decoded.userId).get();
    if (!walletDoc.exists) {
      return Response.json({ error: 'No wallet found for user' }, { status: 400 });
    }
    const walletData = walletDoc.data();
    
    // Support legacy schema (walletIds.BASE) and new schema (evm.id)
    const evmWalletId = walletData.walletIds?.BASE || walletData.walletIds?.ETH || walletData.evm?.id;
    const evmAddress = walletData.address || walletData.evm?.address;

    if (!evmWalletId || !evmAddress) {
      return Response.json({ error: 'No EVM wallet found for user' }, { status: 400 });
    }

    const circleClient = initiateDeveloperControlledWalletsClient({
      apiKey: process.env.CIRCLE_API_KEY,
      entitySecret: process.env.CIRCLE_ENTITY_SECRET,
    });

    const customAccount = {
      address: evmAddress,
      type: 'local',
      source: 'custom',
      signMessage: async () => { throw new Error('Not implemented'); },
      signTransaction: async () => { throw new Error('Not implemented'); },
      signTypedData: async (typedData) => {
        console.log(`[x402 Custodial Backend] Delegating EIP-712 signing to Circle HSM for wallet ${evmWalletId}...`);
        
        // Viem and Ethers omit EIP712Domain from the types array, but the Circle REST API strictly requires it.
        if (!typedData.types.EIP712Domain) {
          typedData.types.EIP712Domain = [
            { name: 'name', type: 'string' },
            { name: 'version', type: 'string' },
            { name: 'chainId', type: 'uint256' },
            { name: 'verifyingContract', type: 'address' }
          ];
        }

        // Ensure typedData has all properties viem normally passes down
        const payload = JSON.stringify(typedData, (key, value) =>
          typeof value === 'bigint' ? value.toString() : value
        );

        try {
          const response = await circleClient.signTypedData({
            walletId: evmWalletId,
            data: payload,
            idempotencyKey: crypto.randomUUID()
          });
          return response.data.signature;
        } catch (error) {
           console.error('[x402 Custodial Backend] Circle SDK signTypedData error:', error.response?.data || error.message);
           throw error;
        }
      }
    };

    const targetNetwork = serviceFetch.headers?.['x-payment-network']?.toLowerCase() || 'base';

    if (targetNetwork === 'solana') {
      return Response.json(
        { error: 'Solana x402 payments are not available in Sandbox.' },
        { status: 501 },
      );
    }
    if (targetNetwork !== 'base') {
      return Response.json(
        { error: 'Sandbox supports Base x402 payments only.' },
        { status: 400 },
      );
    }

    // 3. Import OpenDomeBuyer from the official library (deep import to bypass React peer deps in API routes)
    const { OpenDomeBuyer } = await import('opendome/dist/x402.js');
    const buyer = new OpenDomeBuyer(customAccount.address);

    // Fetch the challenge
    console.log(`[x402 Custodial Backend] Fetching challenge from ${serviceUrl}...`);
    const challengeRes = await fetch(paymentUrl, serviceFetch);
    if (challengeRes.status !== 402) {
      throw new Error(`Expected 402 challenge, got ${challengeRes.status}`);
    }
    
    const challengeHeader = challengeRes.headers.get('x402-challenge');
    if (!challengeHeader) throw new Error("Missing x402-challenge header");
    
    // Parse challenge
    const challengeData = OpenDomeBuyer.parseChallenge(challengeHeader);
    if (!challengeData.asset || !challengeData.amount || !challengeData.payTo) throw new Error("Invalid challenge parameters");
    if (BigInt(challengeData.amount) !== quotedAmount) {
      throw new Error('Payment challenge amount does not match the approved quote');
    }

    // Construct native EIP-3009 payload for receiveWithAuthorization
    const eip3009Payload = buyer.generateEIP3009Payload(challengeData.payTo, challengeData.amount);

    console.log(`[x402 Custodial Backend] Delegating EIP-3009 signing to Circle HSM for wallet ${evmWalletId}...`);
    
    const signatureResponse = await circleClient.signTypedData({
      walletId: evmWalletId,
      data: JSON.stringify(buyer.getTypedDataParams(challengeData.asset, eip3009Payload, 'BASE')),
      fee: { type: 'level', config: { feeLevel: 'MEDIUM' } } // Circle API requirement, though it's just signing
    });

    if (!signatureResponse.data?.signature) {
      throw new Error("Failed to sign EIP-3009 payload via Circle HSM");
    }

    const paymentSignatureBase64 = Buffer.from(JSON.stringify({
      x402Version: 2,
      payload: eip3009Payload,
      signature: signatureResponse.data.signature
    })).toString('base64');

    console.log(`[x402 Custodial Backend] Executing self-hosted relayer payment to Agent...`);
    const finalHeaders = {
      ...serviceFetch.headers,
      'payment-signature': paymentSignatureBase64,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const response = await fetch(paymentUrl, {
      ...serviceFetch,
      headers: finalHeaders,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
       const errorText = await response.text();
       throw new Error(`Payment failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`[x402 Custodial Backend] Payment successful, data retrieved.`);

    return Response.json({ success: true, data });

  } catch (err) {
    console.error(`[x402 Custodial Backend] Error:`, err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
