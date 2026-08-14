/** Local mirror of open-dome-lib USDC send chains for Wallet UI (no Node env). */
export const SEND_USDC_CHAINS = [
  { key: 'BASE', label: 'Base', sponsored: true, gasToken: 'ETH', allowsSolanaDest: true },
  { key: 'ARB', label: 'Arbitrum', sponsored: true, gasToken: 'ETH', allowsSolanaDest: false },
  { key: 'OP', label: 'Optimism', sponsored: true, gasToken: 'ETH', allowsSolanaDest: false },
  { key: 'MATIC', label: 'Polygon', sponsored: true, gasToken: 'POL', allowsSolanaDest: false },
  { key: 'AVAX', label: 'Avalanche', sponsored: true, gasToken: 'AVAX', allowsSolanaDest: false },
  { key: 'ETH', label: 'Ethereum', sponsored: false, gasToken: 'ETH', allowsSolanaDest: false },
  { key: 'SOL', label: 'Solana', sponsored: false, gasToken: 'SOL', allowsSolanaDest: true },
];

export const SEND_ASSETS = [
  { key: 'USDC', label: 'USDC', description: 'USD Coin' },
  { key: 'NATIVE', label: 'Native token', description: 'Network gas token' },
];

export function getSendUsdcChain(key) {
  const k = String(key || 'BASE').toUpperCase();
  return SEND_USDC_CHAINS.find((c) => c.key === k) || SEND_USDC_CHAINS[0];
}

export function assetLabelForChain(assetKey, sourceKey) {
  if (assetKey === 'USDC') return 'USDC';
  return getSendUsdcChain(sourceKey).gasToken;
}

export function gasNoteForSend({ sourceKey, destChain, assetKey = 'USDC' }) {
  const src = getSendUsdcChain(sourceKey);
  if (assetKey === 'NATIVE') {
    return src.key === 'SOL'
      ? 'OpenDome facilitates the Solana network fee; only the SOL amount is deducted.'
      : `Sends ${src.gasToken} on ${src.label}. Network fees are paid from this wallet.`;
  }
  if (destChain === 'solana' && src.key === 'BASE') {
    return 'Bridges your Base USDC to native USDC on Solana via Circle CCTP. A small USDC bridge fee applies.';
  }
  if (destChain === 'solana' && src.key === 'SOL') {
    return 'Same-chain Solana USDC transfer. OpenDome facilitates the network fee.';
  }
  if (src.sponsored) {
    return 'OpenDome sponsors gas on this L2 — you only need USDC.';
  }
  if (src.key === 'ETH') {
    return 'You need ETH for gas on Ethereum mainnet.';
  }
  if (src.key === 'SOL') {
    return 'You need SOL for fees on Solana.';
  }
  return 'Network fees apply.';
}

export function isValidSendPair(sourceKey, destChain, assetKey = 'USDC') {
  const src = getSendUsdcChain(sourceKey);
  if (assetKey === 'NATIVE') {
    return (src.key === 'SOL' && destChain === 'solana') || (src.key !== 'SOL' && destChain === 'evm');
  }
  if (destChain === 'solana') {
    return src.allowsSolanaDest;
  }
  if (destChain === 'evm' || destChain === 'base') {
    return src.key !== 'SOL';
  }
  return false;
}
