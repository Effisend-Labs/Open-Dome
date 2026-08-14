/**
 * x402 challenge + EIP-3009 payload helpers.
 * No viem — safe to load on the unpaid 402 path in serverless.
 */
import crypto from 'crypto';
import {
  USDC_BASE,
  getUsdcDomain,
  getEip3009Types,
} from './eip3009.js';
import {
  getUsdcChain,
  resolveX402PaymentNetwork,
  x402NetworkCaip,
} from './usdcChains.js';

export {
  USDC_BASE,
  usdcAmountToAtomic,
  buildEip3009Payload,
  getEip3009TypedData,
} from './eip3009.js';

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
      scheme: parseParam('scheme'),
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

  /**
   * @param {string} asset USDC contract / mint
   * @param {object} payload EIP-3009 message
   * @param {number|string} [chainIdOrKey] numeric chainId or BASE/ARB/…
   */
  getTypedDataParams(asset, payload, chainIdOrKey = 8453) {
    let chainId = 8453;
    let verifying = asset || USDC_BASE;
    if (typeof chainIdOrKey === 'string' && /[A-Za-z]/.test(chainIdOrKey)) {
      const cfg = getUsdcChain(chainIdOrKey);
      chainId = cfg?.chainId ?? 8453;
      verifying = asset || cfg?.usdc || USDC_BASE;
    } else if (chainIdOrKey != null) {
      chainId = Number(chainIdOrKey);
    }
    return {
      domain: getUsdcDomain(verifying, chainId),
      types: getEip3009Types('ReceiveWithAuthorization'),
      primaryType: 'ReceiveWithAuthorization',
      message: payload,
    };
  }
}

/** Convert a USD price string to USDC atomic units (6 decimals). */
export function usdPriceToUsdcAtomic(priceStr) {
  const usd = parseFloat(String(priceStr));
  if (!Number.isFinite(usd) || usd <= 0) {
    throw new Error('Invalid price');
  }
  return String(Math.round(usd * 1_000_000));
}

/** Atomic USDC (6dp) → decimal string for Circle createTransaction. */
export function usdcAtomicToDecimal(atomic) {
  const n = BigInt(String(atomic));
  const whole = n / 1000000n;
  let frac = String(n % 1000000n).padStart(6, '0');
  frac = frac.replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : String(whole);
}

export class OpenDomeSeller {
  constructor(merchantAddress) {
    this.merchantAddress = merchantAddress;
  }

  /**
   * @param {string|number} price USD
   * @param {{ chain?: string, payTo?: string }} [opts]
   */
  generateChallenge(price, opts = {}) {
    const cfg = resolveX402PaymentNetwork(opts.chain || 'BASE');
    if (cfg.key !== 'SOL' && !cfg.chainId) {
      throw new Error(`x402 chain missing chainId: ${cfg.key}`);
    }
    const amount = usdPriceToUsdcAtomic(price);
    const payTo = opts.payTo || this.merchantAddress;
    return [
      'scheme="exact"',
      `network="${x402NetworkCaip(cfg)}"`,
      `asset="${opts.asset || cfg.usdc}"`,
      `amount="${amount}"`,
      `payTo="${payTo}"`,
    ].join(', ');
  }

  parseAndValidateSignature(paymentSignatureBase64, expectedPrice) {
    let paymentData;
    try {
      paymentData = JSON.parse(
        Buffer.from(paymentSignatureBase64, 'base64').toString('utf8'),
      );
    } catch {
      throw new Error('Invalid payment signature format');
    }

    const expectedAmount = usdPriceToUsdcAtomic(expectedPrice);

    // Solana: host settles via Circle, then posts proof (no EIP-3009).
    if (
      paymentData.scheme === 'solana-circle' ||
      paymentData.chain === 'SOL'
    ) {
      const payTo = paymentData.payTo || paymentData.payload?.to;
      if (
        payTo &&
        String(payTo) !== String(this.merchantAddress)
      ) {
        throw new Error('Invalid merchant address in Solana payment');
      }
      const value = String(
        paymentData.amount || paymentData.payload?.value || '',
      );
      if (value !== expectedAmount) {
        throw new Error('Insufficient payment amount');
      }
      const transactionId =
        paymentData.transactionId || paymentData.signature || null;
      if (!transactionId) {
        throw new Error('Missing Solana payment transaction id');
      }
      return {
        scheme: 'solana-circle',
        payload: paymentData.payload || null,
        signature: transactionId,
        transactionId,
        value,
        to: payTo || this.merchantAddress,
      };
    }

    const { payload, signature } = paymentData;
    if (!payload || !signature) {
      throw new Error('Invalid payment signature format');
    }
    if (payload.to.toLowerCase() !== this.merchantAddress.toLowerCase()) {
      throw new Error('Invalid merchant address in signature');
    }

    if (String(payload.value) !== expectedAmount) {
      throw new Error('Insufficient payment amount');
    }

    return { scheme: 'eip3009', payload, signature, ...payload };
  }
}
