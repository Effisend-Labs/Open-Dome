/**
 * On-chain ERC-1155 mint core.
 * Call from API routes (GOD JWT) or later from other server functions directly.
 */

import { addTickets } from './adminDb';
import { nodeRequire } from './nodeRequire';

const RPC_URLS = {
  base: 'https://mainnet.base.org',
  arbitrum: 'https://arb1.arbitrum.io/rpc',
  optimism: 'https://mainnet.optimism.io',
  mainnet: 'https://eth.llamarpc.com',
  polygon: 'https://polygon-rpc.com',
  avalanche: 'https://api.avax.network/ext/bc/C/rpc',
};

const MINT_ABI = [
  'function mint(address to, uint256 id, uint256 amount, bytes data) external',
  'function mintBatch(address to, uint256[] ids, uint256[] amounts, bytes data) external',
];

function resolveRpc(network) {
  const chain = String(network || 'base').toLowerCase();
  const rpcUrl = process.env.RPC_URL || RPC_URLS[chain];
  if (!rpcUrl) {
    const err = new Error(`Unsupported network: ${chain}`);
    err.status = 400;
    throw err;
  }
  return { chain, rpcUrl };
}

function requireMerchantConfig(contractAddress) {
  const merchantKey = process.env.MERCHANT_PRIVATE_KEY;
  const address = contractAddress || process.env.CONTRACT_ADDRESS;
  if (!merchantKey || !address) {
    const err = new Error('MERCHANT_PRIVATE_KEY and CONTRACT_ADDRESS are required');
    err.status = 500;
    throw err;
  }
  return { merchantKey, address };
}

function normalizeIdsAmounts({ ids, amounts, tokenId, amount }) {
  const resolvedIds =
    Array.isArray(ids) && ids.length
      ? ids
      : tokenId != null
        ? [tokenId]
        : null;
  const resolvedAmounts =
    Array.isArray(amounts) && amounts.length
      ? amounts
      : [amount != null ? amount : 1];

  if (!resolvedIds?.length) {
    const err = new Error('ids or tokenId is required');
    err.status = 400;
    throw err;
  }
  if (resolvedIds.length !== resolvedAmounts.length) {
    const err = new Error('ids and amounts length mismatch');
    err.status = 400;
    throw err;
  }
  return { ids: resolvedIds, amounts: resolvedAmounts };
}

/**
 * Mint pass(es) to a single EVM address (single id or ERC-1155 mintBatch).
 * Safe to call from other Admin server modules without HTTP.
 *
 * @returns {{ success: true, txHash: string, contractAddress: string, to: string, ids: any[], amounts: any[], network: string }}
 */
export async function mintPassesToAddress({
  to,
  ids,
  amounts,
  tokenId,
  amount,
  network = 'base',
  contractAddress,
  recordTickets = true,
  paymentTxHash = null,
} = {}) {
  if (!to) {
    const err = new Error('to (recipient address) is required');
    err.status = 400;
    throw err;
  }

  const { ids: resolvedIds, amounts: resolvedAmounts } = normalizeIdsAmounts({
    ids,
    amounts,
    tokenId,
    amount,
  });
  const { chain, rpcUrl } = resolveRpc(network);
  const { merchantKey, address } = requireMerchantConfig(contractAddress);

  const ethers = nodeRequire('ethers');
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(merchantKey, provider);
  const contract = new ethers.Contract(address, MINT_ABI, wallet);

  let tx;
  if (resolvedIds.length === 1) {
    tx = await contract.mint(to, resolvedIds[0], resolvedAmounts[0], '0x');
  } else {
    tx = await contract.mintBatch(to, resolvedIds, resolvedAmounts, '0x');
  }
  const receipt = await tx.wait();

  let explorer = null;
  if (recordTickets) {
    ({ explorer } = await addTickets(to, resolvedIds, resolvedAmounts, {
      mintTxHash: receipt.hash,
      paymentTxHash,
      contractAddress: address,
      assignedBy: 'admin',
    }));
  }

  return {
    success: true,
    txHash: receipt.hash,
    contractAddress: address,
    to,
    ids: resolvedIds,
    amounts: resolvedAmounts,
    network: chain,
    explorer,
  };
}

/**
 * Mint the same ticket set to many recipients (Admin batch assign).
 * Stops on first failure.
 */
export async function mintPassesToAddresses(targets, ticketIds, amounts, network = 'base') {
  if (!targets?.length) {
    const err = new Error('No mint targets');
    err.status = 400;
    throw err;
  }
  if (!ticketIds?.length || !amounts?.length) {
    const err = new Error('ticketIds and amounts are required');
    err.status = 400;
    throw err;
  }

  const results = [];
  for (const target of targets) {
    const minted = await mintPassesToAddress({
      to: target.address,
      ids: ticketIds,
      amounts,
      network,
      recordTickets: true,
    });
    results.push({
      userId: target.passkeyUserId || target.userId || null,
      address: target.address,
      txHash: minted.txHash,
    });
  }
  return results;
}
