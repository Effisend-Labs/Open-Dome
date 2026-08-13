import { randomUUID } from 'node:crypto';
import { nodeRequire } from './nodeRequire';

function x402() {
  return nodeRequire('opendome/dist/x402.js');
}

export async function sponsorUsdcTransferWithCircle({
  client,
  walletId,
  fromAddress,
  destination,
  amount,
}) {
  const merchantKey = process.env.MERCHANT_PRIVATE_KEY;
  if (!merchantKey) {
    return { error: 'Facilitator is not configured (MERCHANT_PRIVATE_KEY)' };
  }

  if (!fromAddress || !walletId) {
    return { error: 'walletId and fromAddress are required to sponsor a transfer' };
  }

  try {
    const { OpenDomeFacilitator, sponsorUsdcTransfer } = x402();
    const facilitator = new OpenDomeFacilitator(merchantKey, {
      rpcUrl: process.env.RPC_URL || 'https://mainnet.base.org',
    });

    return await sponsorUsdcTransfer({
      from: fromAddress,
      to: destination,
      amount,
      facilitator,
      signTypedData: async (typedData) => {
        const res = await client.signTypedData({
          walletId,
          data: JSON.stringify(typedData, (_k, v) =>
            typeof v === 'bigint' ? v.toString() : v,
          ),
          idempotencyKey: randomUUID(),
        });
        return res.data?.signature;
      },
    });
  } catch (err) {
    return { error: err.response?.data?.message || err.message || String(err) };
  }
}
