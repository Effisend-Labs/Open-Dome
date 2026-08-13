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
var _chains = require("viem/chains");
var _eip = require("./eip3009.js");
var _x402Challenge = require("./x402Challenge.js");
var _sponsorUsdcTransfer = require("./sponsorUsdcTransfer.js");
class OpenDomeFacilitator {
  constructor(privateKey, options = {}) {
    this.privateKey = privateKey;
    this.rpcUrl = options.rpcUrl;
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
      chain: _chains.base,
      transport
    });
    const account = (0, _accounts.privateKeyToAccount)(this.privateKey);
    const walletClient = (0, _viem.createWalletClient)({
      account,
      chain: _chains.base,
      transport
    });
    const primaryType = functionName === 'transferWithAuthorization' ? 'TransferWithAuthorization' : 'ReceiveWithAuthorization';
    const isValid = await (0, _viem.verifyTypedData)({
      address: payload.from,
      domain: (0, _eip.getUsdcDomain)(_eip.USDC_BASE),
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
      address: _eip.USDC_BASE,
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