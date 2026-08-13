/**
 * x402 challenge + EIP-3009 payload helpers.
 * No viem — safe to load on the unpaid 402 path in serverless.
 */
import crypto from 'crypto';
import { USDC_BASE, getUsdcDomain, getEip3009Types } from './eip3009.js';

export { USDC_BASE, usdcAmountToAtomic, buildEip3009Payload, getEip3009TypedData } from './eip3009.js';

export class OpenDomeBuyer {
  constructor(accountAddress) {
    this.accountAddress = accountAddress;
  }

  static parseChallenge(challengeHeader) {
    const parseParam = (key) => {
      const match = challengeHeader.match(new RegExp(`${key}="([^"]+)"`));
      return match ? match[1] : null;
    };
    return {
      asset: parseParam('asset'),
      amount: parseParam('amount'),
      payTo: parseParam('payTo'),
      network: parseParam('network'),
    };
  }

  generateEIP3009Payload(payTo, amount) {
    // USDC FiatTokenV2 requires block.timestamp > validAfter (strict).
    // Using "now" races Base sequencer time and reverts with
    // "authorization is not yet valid". 0 = valid immediately.
    const now = Math.floor(Date.now() / 1000);
    return {
      from: this.accountAddress,
      to: payTo,
      value: amount,
      validAfter: '0',
      validBefore: String(now + 3600),
      nonce: `0x${crypto.randomBytes(32).toString('hex')}`,
    };
  }

  getTypedDataParams(asset, payload) {
    return {
      domain: getUsdcDomain(asset),
      types: getEip3009Types('ReceiveWithAuthorization'),
      primaryType: 'ReceiveWithAuthorization',
      message: payload,
    };
  }
}

/** Convert a USD price string to USDC atomic units (6 decimals on Base). */
export function usdPriceToUsdcAtomic(priceStr) {
  const usd = parseFloat(String(priceStr));
  if (!Number.isFinite(usd) || usd <= 0) {
    throw new Error('Invalid price');
  }
  return String(Math.round(usd * 1_000_000));
}

export class OpenDomeSeller {
  constructor(merchantAddress) {
    this.merchantAddress = merchantAddress;
  }

  generateChallenge(price) {
    const amount = usdPriceToUsdcAtomic(price);
    return [
      'scheme="exact"',
      'network="eip155:8453"',
      `asset="${USDC_BASE}"`,
      `amount="${amount}"`,
      `payTo="${this.merchantAddress}"`,
    ].join(', ');
  }

  parseAndValidateSignature(paymentSignatureBase64, expectedPrice) {
    let paymentData;
    try {
      paymentData = JSON.parse(Buffer.from(paymentSignatureBase64, 'base64').toString('utf8'));
    } catch {
      throw new Error('Invalid payment signature format');
    }

    const { payload, signature } = paymentData;
    if (payload.to.toLowerCase() !== this.merchantAddress.toLowerCase()) {
      throw new Error('Invalid merchant address in signature');
    }

    const expectedAmount = usdPriceToUsdcAtomic(expectedPrice);
    if (String(payload.value) !== expectedAmount) {
      throw new Error('Insufficient payment amount');
    }

    return { payload, signature, ...payload };
  }
}
