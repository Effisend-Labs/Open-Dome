import {
  buildEip3009Payload,
  getEip3009TypedData,
  usdcAmountToAtomic,
} from './eip3009.js';

/**
 * User signs EIP-3009 TransferWithAuthorization (no gas).
 * Facilitator submits it on Base and pays ETH.
 */
export async function sponsorUsdcTransfer({
  from,
  to,
  amount,
  signTypedData,
  facilitator,
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

  const value = usdcAmountToAtomic(amount);
  const payload = buildEip3009Payload({ from, to, value });
  const typedData = getEip3009TypedData(payload, 'TransferWithAuthorization');
  const signature = await signTypedData(typedData);
  if (!signature) {
    throw new Error('No EIP-712 signature returned');
  }

  const txHash = await facilitator.relayTransfer(payload, signature);
  return {
    success: true,
    sponsored: true,
    txHash,
    transactionId: txHash,
    from: payload.from,
    to: payload.to,
    amount: String(amount),
    value,
  };
}
