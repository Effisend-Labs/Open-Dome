"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.hotfixMintViaAdmin = hotfixMintViaAdmin;
exports.mintPassesAsPlatform = mintPassesAsPlatform;
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * Platform-signed ERC-1155 mint (Sandbox / OpenDomeApp).
 * Ticket assignment lives in each host's utilsAPI/ticketsDb.js
 * (platform writes Firestore itself — Admin is hotfix-only).
 */

const RPC_URLS = {
  base: 'https://mainnet.base.org',
  arbitrum: 'https://arb1.arbitrum.io/rpc',
  optimism: 'https://mainnet.optimism.io',
  mainnet: 'https://eth.llamarpc.com',
  polygon: 'https://polygon-rpc.com',
  avalanche: 'https://api.avax.network/ext/bc/C/rpc'
};
const MINT_ABI = ['function mint(address to, uint256 id, uint256 amount, bytes data) external', 'function mintBatch(address to, uint256[] ids, uint256[] amounts, bytes data) external'];
function resolveIdsAmounts({
  ids,
  amounts,
  tokenId,
  amount
}) {
  const resolvedIds = Array.isArray(ids) && ids.length ? ids : tokenId != null ? [tokenId] : null;
  const resolvedAmounts = Array.isArray(amounts) && amounts.length ? amounts : [amount != null ? amount : 1];
  if (!resolvedIds?.length) {
    throw Object.assign(new Error('ids or tokenId is required'), {
      status: 400
    });
  }
  if (resolvedIds.length !== resolvedAmounts.length) {
    throw Object.assign(new Error('ids and amounts length mismatch'), {
      status: 400
    });
  }
  return {
    ids: resolvedIds,
    amounts: resolvedAmounts
  };
}

/** Mint passes using the platform merchant key. */
async function mintPassesAsPlatform({
  to,
  ids,
  amounts,
  tokenId,
  amount,
  network = 'base',
  contractAddress,
  privateKey = process.env.MERCHANT_PRIVATE_KEY,
  rpcUrl
} = {}) {
  if (!to) {
    throw Object.assign(new Error('to (recipient address) is required'), {
      status: 400
    });
  }
  if (!privateKey) {
    throw Object.assign(new Error('MERCHANT_PRIVATE_KEY is required for platform mint'), {
      status: 500
    });
  }
  const {
    ids: resolvedIds,
    amounts: resolvedAmounts
  } = resolveIdsAmounts({
    ids,
    amounts,
    tokenId,
    amount
  });
  const chain = String(network || 'base').toLowerCase();
  const rpc = rpcUrl || process.env.RPC_URL || RPC_URLS[chain];
  if (!rpc) {
    throw Object.assign(new Error(`Unsupported network: ${chain}`), {
      status: 400
    });
  }
  const address = contractAddress || process.env.CONTRACT_ADDRESS || '0x40c39F091a7c85D10B8C46762b59Df3eCd77630C';
  const {
    ethers
  } = await Promise.resolve().then(() => _interopRequireWildcard(require('ethers')));
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
    signedBy: 'platform'
  };
}

/**
 * Admin hotfix only — recover when platform mint/assign failed after payment.
 */
async function hotfixMintViaAdmin({
  bridgeUrl,
  serviceToken,
  to,
  quote,
  paymentTxHash,
  orderId,
  bypassBlockchain = false
}) {
  const base = String(bridgeUrl || 'http://localhost:8090').replace(/\/$/, '');
  const res = await fetch(`${base}/api/fulfill`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceToken}`
    },
    body: JSON.stringify({
      mode: 'hotfix',
      to,
      ids: quote.tokenIds,
      amounts: quote.amounts,
      network: 'base',
      orderId,
      paymentTxHash,
      quoteId: quote.id,
      bypassBlockchain
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.message || `Hotfix fulfill failed (${res.status})`);
  }
  return data;
}