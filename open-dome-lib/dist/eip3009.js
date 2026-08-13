"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.USDC_EIP3009_ABI = exports.USDC_BASE = void 0;
exports.buildEip3009Payload = buildEip3009Payload;
exports.getEip3009TypedData = getEip3009TypedData;
exports.getEip3009Types = getEip3009Types;
exports.getUsdcDomain = getUsdcDomain;
exports.splitEip712Signature = splitEip712Signature;
exports.usdcAmountToAtomic = usdcAmountToAtomic;
var _crypto = _interopRequireDefault(require("crypto"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const USDC_BASE = exports.USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
function getAddress(value) {
  const addr = String(value || '').trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
    throw new Error(`Invalid address: ${value}`);
  }
  return `0x${addr.slice(2)}`;
}
const AUTH_FIELDS = [{
  name: 'from',
  type: 'address'
}, {
  name: 'to',
  type: 'address'
}, {
  name: 'value',
  type: 'uint256'
}, {
  name: 'validAfter',
  type: 'uint256'
}, {
  name: 'validBefore',
  type: 'uint256'
}, {
  name: 'nonce',
  type: 'bytes32'
}];
function getUsdcDomain(asset = USDC_BASE) {
  return {
    name: 'USD Coin',
    version: '2',
    chainId: 8453,
    verifyingContract: asset
  };
}
function getEip3009Types(primaryType = 'ReceiveWithAuthorization') {
  return {
    EIP712Domain: [{
      name: 'name',
      type: 'string'
    }, {
      name: 'version',
      type: 'string'
    }, {
      name: 'chainId',
      type: 'uint256'
    }, {
      name: 'verifyingContract',
      type: 'address'
    }],
    [primaryType]: AUTH_FIELDS
  };
}

/** Decimal USDC string ("0.01") → 6-decimal atomic units. */
function usdcAmountToAtomic(amount) {
  const raw = String(amount ?? '').trim();
  if (!/^\d+(\.\d+)?$/.test(raw)) {
    throw new Error('Invalid USDC amount');
  }
  const [whole, frac = ''] = raw.split('.');
  if (frac.length > 6) {
    throw new Error('USDC supports at most 6 decimals');
  }
  const padded = `${frac}000000`.slice(0, 6);
  const atomic = BigInt(whole || '0') * 1000000n + BigInt(padded);
  if (atomic <= 0n) throw new Error('Amount must be greater than 0');
  return String(atomic);
}
function buildEip3009Payload({
  from,
  to,
  value
}) {
  const now = Math.floor(Date.now() / 1000);
  return {
    from: getAddress(from),
    to: getAddress(to),
    value: String(value),
    validAfter: '0',
    validBefore: String(now + 3600),
    nonce: `0x${_crypto.default.randomBytes(32).toString('hex')}`
  };
}
function getEip3009TypedData(payload, primaryType, asset = USDC_BASE) {
  return {
    domain: getUsdcDomain(asset),
    types: getEip3009Types(primaryType),
    primaryType,
    message: payload
  };
}
function splitEip712Signature(signature) {
  const sig = String(signature || '');
  return {
    r: sig.slice(0, 66),
    s: `0x${sig.slice(66, 130)}`,
    v: parseInt(sig.slice(130, 132), 16)
  };
}
const AUTH_INPUTS = [{
  name: 'from',
  type: 'address'
}, {
  name: 'to',
  type: 'address'
}, {
  name: 'value',
  type: 'uint256'
}, {
  name: 'validAfter',
  type: 'uint256'
}, {
  name: 'validBefore',
  type: 'uint256'
}, {
  name: 'nonce',
  type: 'bytes32'
}, {
  name: 'v',
  type: 'uint8'
}, {
  name: 'r',
  type: 'bytes32'
}, {
  name: 's',
  type: 'bytes32'
}];
const USDC_EIP3009_ABI = exports.USDC_EIP3009_ABI = [{
  inputs: AUTH_INPUTS,
  name: 'receiveWithAuthorization',
  outputs: [],
  type: 'function'
}, {
  inputs: AUTH_INPUTS,
  name: 'transferWithAuthorization',
  outputs: [],
  type: 'function'
}];