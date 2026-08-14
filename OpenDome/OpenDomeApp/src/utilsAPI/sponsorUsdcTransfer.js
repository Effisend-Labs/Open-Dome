import { randomUUID } from 'node:crypto';
import { nodeRequire } from './nodeRequire';

function x402() {
  return nodeRequire('opendome/dist/x402.js');
}

/**
 * Sponsor a same-chain USDC transfer on a sponsored L2 via EIP-3009.
 * @param {{ client, walletId, fromAddress, destination, amount, blockchain?: string }} args
 */
export async function sponsorUsdcTransferWithCircle({
  client,
  walletId,
  fromAddress,
  destination,
  amount,
  blockchain = 'BASE',
}) {
  const merchantKey = process.env.MERCHANT_PRIVATE_KEY;
  if (!merchantKey) {
    return { error: 'Facilitator is not configured (MERCHANT_PRIVATE_KEY)' };
  }

  if (!fromAddress || !walletId) {
    return { error: 'walletId and fromAddress are required to sponsor a transfer' };
  }

  try {
    const {
      OpenDomeFacilitator,
      sponsorUsdcTransfer,
      getUsdcChain,
      resolveUsdcRpcUrl,
      isSponsoredUsdcChain,
    } = x402();

    if (!isSponsoredUsdcChain(blockchain)) {
      return { error: `Facilitator does not sponsor ${blockchain}` };
    }

    const cfg = getUsdcChain(blockchain);
    const facilitator = new OpenDomeFacilitator(merchantKey, {
      chain: cfg.key,
      rpcUrl: resolveUsdcRpcUrl(cfg),
      usdc: cfg.usdc,
    });

    return await sponsorUsdcTransfer({
      from: fromAddress,
      to: destination,
      amount,
      chain: cfg.key,
      usdc: cfg.usdc,
      chainId: cfg.chainId,
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
