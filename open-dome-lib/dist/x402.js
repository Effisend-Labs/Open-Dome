"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "OpenDomeBuyer", {
  enumerable: true,
  get: function () {
    return _x402Challenge.OpenDomeBuyer;
  }
});
exports.OpenDomeFacilitator = void 0;
Object.defineProperty(exports, "OpenDomeSeller", {
  enumerable: true,
  get: function () {
    return _x402Challenge.OpenDomeSeller;
  }
});
Object.defineProperty(exports, "USDC_BASE", {
  enumerable: true,
  get: function () {
    return _x402Challenge.USDC_BASE;
  }
});
Object.defineProperty(exports, "USDC_CHAINS", {
  enumerable: true,
  get: function () {
    return _usdcChains.USDC_CHAINS;
  }
});
Object.defineProperty(exports, "buildEip3009Payload", {
  enumerable: true,
  get: function () {
    return _x402Challenge.buildEip3009Payload;
  }
});
Object.defineProperty(exports, "getEip3009TypedData", {
  enumerable: true,
  get: function () {
    return _x402Challenge.getEip3009TypedData;
  }
});
Object.defineProperty(exports, "getUsdcChain", {
  enumerable: true,
  get: function () {
    return _usdcChains.getUsdcChain;
  }
});
Object.defineProperty(exports, "isSponsoredUsdcChain", {
  enumerable: true,
  get: function () {
    return _usdcChains.isSponsoredUsdcChain;
  }
});
Object.defineProperty(exports, "listSendUsdcChains", {
  enumerable: true,
  get: function () {
    return _usdcChains.listSendUsdcChains;
  }
});
Object.defineProperty(exports, "normalizeUsdcChainKey", {
  enumerable: true,
  get: function () {
    return _usdcChains.normalizeUsdcChainKey;
  }
});
Object.defineProperty(exports, "resolveUsdcRpcUrl", {
  enumerable: true,
  get: function () {
    return _usdcChains.resolveUsdcRpcUrl;
  }
});
Object.defineProperty(exports, "sponsorUsdcTransfer", {
  enumerable: true,
  get: function () {
    return _sponsorUsdcTransfer.sponsorUsdcTransfer;
  }
});
Object.defineProperty(exports, "usdPriceToUsdcAtomic", {
  enumerable: true,
  get: function () {
    return _x402Challenge.usdPriceToUsdcAtomic;
  }
});
Object.defineProperty(exports, "usdcAmountToAtomic", {
  enumerable: true,
  get: function () {
    return _x402Challenge.usdcAmountToAtomic;
  }
});
var _viem = require("viem");
var _accounts = require("viem/accounts");
var viemChains = _interopRequireWildcard(require("viem/chains"));
var _eip = require("./eip3009.js");
var _usdcChains = require("./usdcChains.js");
var _x402Challenge = require("./x402Challenge.js");
var _sponsorUsdcTransfer = require("./sponsorUsdcTransfer.js");
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
function resolveViemChain(cfg) {
  if (!cfg?.viemKey) return viemChains.base;
  return viemChains[cfg.viemKey] || viemChains.base;
}

/**
 * Relays EIP-3009 USDC authorizations.
 * Defaults to Base. Pass { chain: 'ARB'|'OP'|…, rpcUrl, usdc } for other L2s.
 * Merchant key must hold native gas on the target chain.
 */
class OpenDomeFacilitator {
  constructor(privateKey, options = {}) {
    this.privateKey = privateKey;
    const cfg = (0, _usdcChains.getUsdcChain)(options.chain || options.blockchain || 'BASE');
    this.chainConfig = cfg;
    this.usdc = options.usdc || cfg.usdc || _eip.USDC_BASE;
    this.chainId = options.chainId || cfg.chainId || 8453;
    this.rpcUrl = options.rpcUrl || (0, _usdcChains.resolveUsdcRpcUrl)(cfg);
    this.viemChain = options.chainDef || resolveViemChain(cfg);
  }
  async verifyAndRelay(payload, signature) {
    return this.relayAuthorization(payload, signature, 'receiveWithAuthorization');
  }
  async relayTransfer(payload, signature) {
    return this.relayAuthorization(payload, signature, 'transferWithAuthorization');
  }
  async relayAuthorization(payload, signature, functionName) {
    const transport = this.rpcUrl ? (0, _viem.http)(this.rpcUrl) : (0, _viem.http)();
    const publicClient = (0, _viem.createPublicClient)({
      chain: this.viemChain,
      transport
    });
    const account = (0, _accounts.privateKeyToAccount)(this.privateKey);
    const walletClient = (0, _viem.createWalletClient)({
      account,
      chain: this.viemChain,
      transport
    });
    const primaryType = functionName === 'transferWithAuthorization' ? 'TransferWithAuthorization' : 'ReceiveWithAuthorization';
    const domain = (0, _eip.getUsdcDomain)(this.usdc, this.chainId);
    const isValid = await (0, _viem.verifyTypedData)({
      address: payload.from,
      domain,
      types: (0, _eip.getEip3009Types)(primaryType),
      primaryType,
      message: payload,
      signature
    });
    if (!isValid) {
      throw new Error('Mathematical verification failed. Invalid EIP-712 signature.');
    }
    const {
      v,
      r,
      s
    } = (0, _eip.splitEip712Signature)(signature);
    const {
      request
    } = await publicClient.simulateContract({
      address: this.usdc,
      abi: _eip.USDC_EIP3009_ABI,
      functionName,
      args: [payload.from, payload.to, BigInt(payload.value), BigInt(payload.validAfter), BigInt(payload.validBefore), payload.nonce, v, r, s],
      account
    });
    const txHash = await walletClient.writeContract(request);
    await publicClient.waitForTransactionReceipt({
      hash: txHash
    });
    return txHash;
  }
}
exports.OpenDomeFacilitator = OpenDomeFacilitator;