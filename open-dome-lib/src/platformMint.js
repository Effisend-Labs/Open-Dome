/**
 * Platform-signed ERC-1155 mint (OpenDomeApp).
 * Ticket assignment lives in the host's utilsAPI/ticketsDb.js.
 * Admin mini-app proxies here with god JWT — it does not hold the merchant key.
 */

import { resolveUsdcRpcUrl } from './usdcChains.js';

const LEGACY_RPC = {
  base: 'BASE',
  arbitrum: 'ARB',
  optimism: 'OP',
  mainnet: 'ETH',
  ethereum: 'ETH',
  polygon: 'MATIC',
  avalanche: 'AVAX',
};

const MINT_ABI = [
  'function mint(address to, uint256 id, uint256 amount, bytes data) external',
  'function mintBatch(address to, uint256[] ids, uint256[] amounts, bytes data) external',
];

function resolveIdsAmounts({ ids, amounts, tokenId, amount }) {
  const resolvedIds =
    Array.isArray(ids) && ids.length ? ids : tokenId != null ? [tokenId] : null;
  const resolvedAmounts =
    Array.isArray(amounts) && amounts.length
      ? amounts
      : [amount != null ? amount : 1];

  if (!resolvedIds?.length) {
    throw Object.assign(new Error('ids or tokenId is required'), { status: 400 });
  }
  if (resolvedIds.length !== resolvedAmounts.length) {
    throw Object.assign(new Error('ids and amounts length mismatch'), { status: 400 });
  }
  return { ids: resolvedIds, amounts: resolvedAmounts };
}

/** Mint passes using the platform merchant key. */
export async function mintPassesAsPlatform({
  to,
  ids,
  amounts,
  tokenId,
  amount,
  network = 'base',
  contractAddress,
  privateKey = process.env.MERCHANT_PRIVATE_KEY,
  rpcUrl,
} = {}) {
  if (!to) {
    throw Object.assign(new Error('to (recipient address) is required'), { status: 400 });
  }
  if (!privateKey) {
    throw Object.assign(new Error('MERCHANT_PRIVATE_KEY is required for platform mint'), {
      status: 500,
    });
  }

  const { ids: resolvedIds, amounts: resolvedAmounts } = resolveIdsAmounts({
    ids,
    amounts,
    tokenId,
    amount,
  });

  const chain = String(network || 'base').toLowerCase();
  const chainKey = LEGACY_RPC[chain] || chain.toUpperCase();
  const rpc =
    rpcUrl ||
    process.env.RPC_URL ||
    resolveUsdcRpcUrl(chainKey === 'ETH' ? 'ETH' : chainKey);
  if (!rpc) {
    throw Object.assign(new Error(`Unsupported network: ${chain}`), { status: 400 });
  }

  const address =
    contractAddress ||
    process.env.CONTRACT_ADDRESS ||
    '0xf5053b8bAfc35c52DbED12c38Ef4c8AEb75999FF';

  const { ethers } = await import('ethers');
  const provider = new ethers.JsonRpcProvider(rpc);
  const wallet = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(address, MINT_ABI, wallet);

  let tx;
  if (resolvedIds.length === 1) {
    tx = await contract.mint(to, resolvedIds[0], resolvedAmounts[0], '0x');
  } else {
    tx = await contract.mintBatch(to, resolvedIds, resolvedAmounts, '0x');
  }
  const receipt = await tx.wait();

  return {
    success: true,
    txHash: receipt.hash,
    contractAddress: address,
    to,
    ids: resolvedIds,
    amounts: resolvedAmounts,
    network: chain,
    signedBy: 'platform',
  };
}

/**
 * Hotfix mint via OpenDomeApp — recover when platform mint/assign failed after payment.
 * `bridgeUrl` should be the OpenDomeApp origin (default localhost:8082).
 */
export async function hotfixMintViaAdmin({
  bridgeUrl,
  serviceToken,
  to,
  quote,
  paymentTxHash,
  orderId,
}) {
  const base = String(bridgeUrl || 'http://localhost:8082').replace(/\/$/, '');
  const res = await fetch(`${base}/api/mint`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceToken}`,
    },
    body: JSON.stringify({
      to,
      ids: quote.tokenIds,
      amounts: quote.amounts,
      network: 'base',
      orderId,
      paymentTxHash,
      quoteId: quote.id,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.message || `Hotfix mint failed (${res.status})`);
  }
  return data;
}
