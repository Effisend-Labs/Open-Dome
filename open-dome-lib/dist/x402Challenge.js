"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.OpenDomeSeller = exports.OpenDomeBuyer = void 0;
Object.defineProperty(exports, "USDC_BASE", {
  enumerable: true,
  get: function () {
    return _eip.USDC_BASE;
  }
});
Object.defineProperty(exports, "buildEip3009Payload", {
  enumerable: true,
  get: function () {
    return _eip.buildEip3009Payload;
  }
});
Object.defineProperty(exports, "getEip3009TypedData", {
  enumerable: true,
  get: function () {
    return _eip.getEip3009TypedData;
  }
});
exports.usdPriceToUsdcAtomic = usdPriceToUsdcAtomic;
Object.defineProperty(exports, "usdcAmountToAtomic", {
  enumerable: true,
  get: function () {
    return _eip.usdcAmountToAtomic;
  }
});
exports.usdcAtomicToDecimal = usdcAtomicToDecimal;
var _crypto = _interopRequireDefault(require("crypto"));
var _eip = require("./eip3009.js");
var _usdcChains = require("./usdcChains.js");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
/**
 * x402 challenge + EIP-3009 payload helpers.
 * No viem — safe to load on the unpaid 402 path in serverless.
 */

class OpenDomeBuyer {
  constructor(accountAddress) {
    this.accountAddress = accountAddress;
  }
  static parseChallenge(challengeHeader) {
    const parseParam = key => {
      const match = challengeHeader.match(new RegExp(`${key}="([^"]+)"`));
      return match ? match[1] : null;
    };
    return {
      asset: parseParam('asset'),
      amount: parseParam('amount'),
      payTo: parseParam('payTo'),
      network: parseParam('network'),
      scheme: parseParam('scheme')
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
      nonce: `0x${_crypto.default.randomBytes(32).toString('hex')}`
    };
  }

  /**
   * @param {string} asset USDC contract / mint
   * @param {object} payload EIP-3009 message
   * @param {number|string} [chainIdOrKey] numeric chainId or BASE/ARB/…
   */
  getTypedDataParams(asset, payload, chainIdOrKey = 8453) {
    let chainId = 8453;
    let verifying = asset || _eip.USDC_BASE;
    if (typeof chainIdOrKey === 'string' && /[A-Za-z]/.test(chainIdOrKey)) {
      const cfg = (0, _usdcChains.getUsdcChain)(chainIdOrKey);
      chainId = cfg?.chainId ?? 8453;
      verifying = asset || cfg?.usdc || _eip.USDC_BASE;
    } else if (chainIdOrKey != null) {
      chainId = Number(chainIdOrKey);
    }
    return {
      domain: (0, _eip.getUsdcDomain)(verifying, chainId),
      types: (0, _eip.getEip3009Types)('ReceiveWithAuthorization'),
      primaryType: 'ReceiveWithAuthorization',
      message: payload
    };
  }
}

/** Convert a USD price string to USDC atomic units (6 decimals). */
exports.OpenDomeBuyer = OpenDomeBuyer;
function usdPriceToUsdcAtomic(priceStr) {
  const usd = parseFloat(String(priceStr));
  if (!Number.isFinite(usd) || usd <= 0) {
    throw new Error('Invalid price');
  }
  return String(Math.round(usd * 1_000_000));
}

/** Atomic USDC (6dp) → decimal string for Circle createTransaction. */
function usdcAtomicToDecimal(atomic) {
  const n = BigInt(String(atomic));
  const whole = n / 1000000n;
  let frac = String(n % 1000000n).padStart(6, '0');
  frac = frac.replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : String(whole);
}
class OpenDomeSeller {
  constructor(merchantAddress) {
    this.merchantAddress = merchantAddress;
  }

  /**
   * @param {string|number} price USD
   * @param {{ chain?: string, payTo?: string }} [opts]
   */
  generateChallenge(price, opts = {}) {
    const cfg = (0, _usdcChains.resolveX402PaymentNetwork)(opts.chain || 'BASE');
    if (cfg.key !== 'SOL' && !cfg.chainId) {
      throw new Error(`x402 chain missing chainId: ${cfg.key}`);
    }
    const amount = usdPriceToUsdcAtomic(price);
    const payTo = opts.payTo || this.merchantAddress;
    return ['scheme="exact"', `network="${(0, _usdcChains.x402NetworkCaip)(cfg)}"`, `asset="${opts.asset || cfg.usdc}"`, `amount="${amount}"`, `payTo="${payTo}"`].join(', ');
  }
  parseAndValidateSignature(paymentSignatureBase64, expectedPrice) {
    let paymentData;
    try {
      paymentData = JSON.parse(Buffer.from(paymentSignatureBase64, 'base64').toString('utf8'));
    } catch {
      throw new Error('Invalid payment signature format');
    }
    const expectedAmount = usdPriceToUsdcAtomic(expectedPrice);

    // Solana: host settles via Circle, then posts proof (no EIP-3009).
    if (paymentData.scheme === 'solana-circle' || paymentData.chain === 'SOL') {
      const payTo = paymentData.payTo || paymentData.payload?.to;
      if (payTo && String(payTo) !== String(this.merchantAddress)) {
        throw new Error('Invalid merchant address in Solana payment');
      }
      const value = String(paymentData.amount || paymentData.payload?.value || '');
      if (value !== expectedAmount) {
        throw new Error('Insufficient payment amount');
      }
      const transactionId = paymentData.transactionId || paymentData.signature || null;
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
        proof: paymentData.proof || null
      };
    }
    const {
      payload,
      signature
    } = paymentData;
    if (!payload || !signature) {
      throw new Error('Invalid payment signature format');
    }
    if (payload.to.toLowerCase() !== this.merchantAddress.toLowerCase()) {
      throw new Error('Invalid merchant address in signature');
    }
    if (String(payload.value) !== expectedAmount) {
      throw new Error('Insufficient payment amount');
    }
    return {
      scheme: 'eip3009',
      payload,
      signature,
      ...payload
    };
  }
}
exports.OpenDomeSeller = OpenDomeSeller;