"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.sponsorUsdcTransfer = sponsorUsdcTransfer;
var _eip = require("./eip3009.js");
var _usdcChains = require("./usdcChains.js");
/**
 * User signs EIP-3009 TransferWithAuthorization (no gas).
 * Facilitator submits on the selected L2 and pays native gas.
 */
async function sponsorUsdcTransfer({
  from,
  to,
  amount,
  signTypedData,
  facilitator,
  chain = 'BASE',
  usdc,
  chainId
}) {
  if (!from || !to || amount == null) {
    throw new Error('from, to, and amount are required');
  }
  if (typeof signTypedData !== 'function') {
    throw new Error('signTypedData is required');
  }
  if (!facilitator?.relayTransfer) {
    throw new Error('facilitator.relayTransfer is required');
  }
  const cfg = (0, _usdcChains.getUsdcChain)(chain);
  if (!cfg?.sponsored) {
    throw new Error(`Facilitator sponsorship is not available on ${cfg?.label || chain}`);
  }
  const asset = usdc || cfg.usdc;
  const id = chainId || cfg.chainId;
  const value = (0, _eip.usdcAmountToAtomic)(amount);
  const payload = (0, _eip.buildEip3009Payload)({
    from,
    to,
    value
  });
  const typedData = (0, _eip.getEip3009TypedData)(payload, 'TransferWithAuthorization', asset, id);
  const signature = await signTypedData(typedData);
  if (!signature) {
    throw new Error('No EIP-712 signature returned');
  }
  const txHash = await facilitator.relayTransfer(payload, signature);
  return {
    success: true,
    sponsored: true,
    chain: cfg.key.toLowerCase(),
    blockchain: cfg.circleBlockchain,
    txHash,
    transactionId: txHash,
    from: payload.from,
    to: payload.to,
    amount: String(amount),
    value
  };
}