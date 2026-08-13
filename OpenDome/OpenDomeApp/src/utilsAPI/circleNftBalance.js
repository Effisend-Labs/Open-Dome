const PAGE_SIZE = 50;
const MAX_PAGES = 20;

const CHAIN_LABEL = {
  BASE: 'Base',
  ETH: 'Ethereum',
  OP: 'Optimism',
  ARB: 'Arbitrum',
  MATIC: 'Polygon',
  AVAX: 'Avalanche',
  SOL: 'Solana',
  SOLANA: 'Solana',
};

const EXPLORER = {
  BASE: (contract, tokenId, owner) =>
    tokenId
      ? `https://basescan.org/nft/${contract}/${tokenId}`
      : owner
        ? `https://basescan.org/token/${contract}?a=${owner}`
        : `https://basescan.org/token/${contract}`,
  ETH: (contract, tokenId) =>
    tokenId
      ? `https://etherscan.io/nft/${contract}/${tokenId}`
      : `https://etherscan.io/token/${contract}`,
  OP: (contract, tokenId) =>
    tokenId
      ? `https://optimistic.etherscan.io/nft/${contract}/${tokenId}`
      : `https://optimistic.etherscan.io/token/${contract}`,
  ARB: (contract, tokenId) =>
    tokenId
      ? `https://arbiscan.io/nft/${contract}/${tokenId}`
      : `https://arbiscan.io/token/${contract}`,
  MATIC: (contract, tokenId) =>
    tokenId
      ? `https://polygonscan.com/nft/${contract}/${tokenId}`
      : `https://polygonscan.com/token/${contract}`,
  AVAX: (contract, tokenId) =>
    tokenId
      ? `https://snowtrace.io/nft/${contract}/${tokenId}`
      : `https://snowtrace.io/token/${contract}`,
  SOL: (mint) => (mint ? `https://solscan.io/token/${mint}` : 'https://solscan.io'),
};

function pageAfterOf(res) {
  return res.data?.page?.after || res.page?.after || null;
}

function batchOf(res) {
  return res.data?.nfts || res.nfts || [];
}

function looksLikeImage(uri) {
  return /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(String(uri || ''));
}

function toHttp(uri) {
  const s = String(uri || '').trim();
  if (!s) return null;
  if (s.startsWith('ipfs://')) return `https://ipfs.io/ipfs/${s.slice(7)}`;
  if (/^https?:\/\//i.test(s)) return s;
  return null;
}

function chainKey(blockchain) {
  return String(blockchain || '').toUpperCase();
}

export function networkLabel(blockchain) {
  const key = chainKey(blockchain);
  return CHAIN_LABEL[key] || key || 'Unknown';
}

export function presentCircleNft(row, ownerAddress) {
  const token = row?.token || {};
  const chain = chainKey(token.blockchain);
  const contract = token.tokenAddress || null;
  const tokenId = row?.nftTokenId != null ? String(row.nftTokenId) : null;
  const metadata = row?.metadata || null;
  const image = looksLikeImage(metadata) ? toHttp(metadata) : null;
  const isSol = chain.startsWith('SOL');
  const explorerFn = isSol ? EXPLORER.SOL : EXPLORER[chain];
  const tokenInventoryUrl = isSol
    ? explorerFn?.(contract)
    : explorerFn?.(contract, tokenId, ownerAddress);

  return {
    network: networkLabel(chain).toLowerCase(),
    chain: networkLabel(chain),
    blockchain: chain,
    contractAddress: contract,
    tokenId,
    amount: Number(row?.amount) || 1,
    name: token.name || token.symbol || (tokenId ? `NFT #${tokenId}` : 'NFT'),
    standard: token.standard || null,
    metadata,
    image,
    tokenInventoryUrl: tokenInventoryUrl || null,
  };
}

export async function listNftsForWallet(client, walletId) {
  const nfts = [];
  let pageAfter;
  for (let i = 0; i < MAX_PAGES; i += 1) {
    const res = await client.getWalletNFTBalance({
      id: walletId,
      includeAll: true,
      pageSize: PAGE_SIZE,
      ...(pageAfter ? { pageAfter } : {}),
    });
    const batch = batchOf(res);
    nfts.push(...batch);
    pageAfter = pageAfterOf(res);
    if (!batch.length || !pageAfter || batch.length < PAGE_SIZE) break;
  }
  return nfts;
}

export function walletIdsFromDoc(walletData = {}) {
  const ids = { ...(walletData.walletIds || {}) };
  if (!ids.BASE && !ids.ETH && walletData.evm?.id) {
    ids.BASE = walletData.evm.id;
  }
  if (!ids.SOL && !ids.SOLANA && walletData.sol?.id) {
    ids.SOL = walletData.sol.id;
  }
  return ids;
}

export async function listNftsForUserWallets(client, walletData = {}) {
  const ids = walletIdsFromDoc(walletData);
  const evmOwner = walletData.address || walletData.evm?.address || null;
  const solOwner = walletData.solanaAddress || walletData.sol?.address || null;
  const entries = Object.entries(ids).filter(([, id]) => id);
  const chains = [];
  const nfts = [];

  const results = await Promise.allSettled(
    entries.map(async ([chain, walletId]) => {
      const raw = await listNftsForWallet(client, walletId);
      const owner = chainKey(chain).startsWith('SOL') ? solOwner : evmOwner;
      return {
        chain: chainKey(chain),
        walletId,
        nfts: raw.map((row) => presentCircleNft(row, owner)),
      };
    }),
  );

  for (let i = 0; i < results.length; i += 1) {
    const chain = chainKey(entries[i][0]);
    const result = results[i];
    if (result.status === 'fulfilled') {
      chains.push({
        chain: result.value.chain,
        count: result.value.nfts.length,
      });
      nfts.push(...result.value.nfts);
    } else {
      const err = result.reason;
      chains.push({
        chain,
        count: 0,
        error: err?.response?.data?.message || err?.message || String(err),
      });
    }
  }

  const unique = new Map();
  for (const nft of nfts) {
    const key = `${nft.blockchain}-${nft.contractAddress}-${nft.tokenId}`;
    if (!unique.has(key)) unique.set(key, nft);
  }

  return { nfts: [...unique.values()], chains };
}
