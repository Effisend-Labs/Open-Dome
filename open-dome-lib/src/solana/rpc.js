import {
  createDefaultRpcTransport,
  createSolanaRpcFromTransport,
} from '@solana/kit';

/** Create an RPC client from the first endpoint (caller may probe with resolveWorkingRpc). */
export function createSolanaRpc(endpoints) {
  const list = Array.isArray(endpoints) ? endpoints.filter(Boolean) : [endpoints].filter(Boolean);
  if (!list.length) {
    throw new Error('At least one Solana RPC endpoint is required');
  }
  const transport = createDefaultRpcTransport({ url: list[0] });
  return createSolanaRpcFromTransport(transport);
}

/** Try endpoints in order; return the first responsive RPC (mutates nothing on the instance). */
export async function resolveWorkingRpc(endpoints) {
  const list = Array.isArray(endpoints) ? endpoints.filter(Boolean) : [endpoints].filter(Boolean);
  if (!list.length) throw new Error('All Solana RPCs failed');

  for (const url of list) {
    try {
      const transport = createDefaultRpcTransport({ url });
      const rpc = createSolanaRpcFromTransport(transport);
      await rpc.getSlot().send();
      return rpc;
    } catch {
      // try next endpoint
    }
  }
  throw new Error('All Solana RPCs failed');
}

const commitmentRank = { processed: 0, confirmed: 1, finalized: 2 };

/** Poll signature status until commitment or block height expiry. */
export async function confirmTransactionByPolling(
  rpc,
  signature,
  lastValidBlockHeight,
  commitment = 'confirmed',
  intervalMs = 2000,
) {
  const targetRank = commitmentRank[commitment] ?? 1;

  while (true) {
    const { value: blockHeight } = await rpc.getBlockHeight({ commitment: 'finalized' }).send();
    if (blockHeight > lastValidBlockHeight) {
      throw new Error('Transaction expired');
    }

    const { value: statuses } = await rpc.getSignatureStatuses([signature]).send();
    const status = statuses[0];
    if (status) {
      if (status.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`);
      }
      const confirmedRank = commitmentRank[status.confirmationStatus] ?? -1;
      if (confirmedRank >= targetRank) return status;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}
