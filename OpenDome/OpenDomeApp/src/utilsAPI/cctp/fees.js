import { IRIS_FEES_URL } from './constants.js';
import { usdcToAtomic } from './amounts.js';

export async function quoteSolanaBridgeFee(transferAmount) {
  const res = await fetch(IRIS_FEES_URL, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  const fees = await res.json().catch(() => null);
  if (!res.ok || !Array.isArray(fees) || !fees.length) {
    throw new Error('Could not quote Circle CCTP fees for Solana');
  }

  const feeData = fees.find((row) => Number(row.finalityThreshold) === 1000) || fees[0];
  const forwardFee = BigInt(feeData?.forwardFee?.med ?? feeData?.forwardFee?.high ?? 0);
  const minimumFeeBps = Number(feeData?.minimumFee || 0);
  const protocolFee =
    (transferAmount * BigInt(Math.round(minimumFeeBps * 100))) / 1_000_000n;
  const maxFee = forwardFee + protocolFee;
  if (maxFee <= 0n) {
    throw new Error('Circle returned an invalid Solana bridge fee');
  }
  return { maxFee, forwardFee, protocolFee };
}

export async function quoteBridgeTotals(amount) {
  const transferAmount = usdcToAtomic(amount);
  const quoted = await quoteSolanaBridgeFee(transferAmount);
  return {
    transferAmount,
    totalAmount: transferAmount + quoted.maxFee,
    ...quoted,
  };
}
