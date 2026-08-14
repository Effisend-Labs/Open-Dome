import {
  buildEip3009Payload,
  getEip3009TypedData,
  usdcAmountToAtomic,
} from './eip3009.js';
import { getUsdcChain } from './usdcChains.js';

/**
 * User signs EIP-3009 TransferWithAuthorization (no gas).
 * Facilitator submits on the selected L2 and pays native gas.
 */
export async function sponsorUsdcTransfer({
  from,
  to,
  amount,
  signTypedData,
  facilitator,
  chain = 'BASE',
  usdc,
  chainId,
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

  const cfg = getUsdcChain(chain);
  if (!cfg?.sponsored) {
    throw new Error(`Facilitator sponsorship is not available on ${cfg?.label || chain}`);
  }
  const asset = usdc || cfg.usdc;
  const id = chainId || cfg.chainId;

  const value = usdcAmountToAtomic(amount);
  const payload = buildEip3009Payload({ from, to, value });
  const typedData = getEip3009TypedData(
    payload,
    'TransferWithAuthorization',
    asset,
    id,
  );
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
    value,
  };
}
