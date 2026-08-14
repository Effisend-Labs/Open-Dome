import {
  buildWalletAgentContext,
  fetchBalancesForUserWallets,
  normalizeChain,
} from './circleAgentRuntime.js';
import { getCircleWalletsClient } from './circleTools.js';
import { Wallets } from './passkeyDb';

export const USER_WALLET_TTL_MS = 60_000;

const CIRCLE_TO_UI = {
  BASE: 'base',
  ARB: 'arbitrum',
  OP: 'optimism',
  ETH: 'mainnet',
  MATIC: 'polygon',
  AVAX: 'avalanche',
  SOL: 'solana',
};

const NATIVE_SYMBOL = {
  BASE: 'ETH',
  ARB: 'ETH',
  OP: 'ETH',
  ETH: 'ETH',
  MATIC: 'POL',
  AVAX: 'AVAX',
  SOL: 'SOL',
};

function pickNativeAmount(tokenBalances, chain) {
  const rows = tokenBalances?.tokenBalances || tokenBalances || [];
  if (!Array.isArray(rows)) return '0';
  const key = normalizeChain(chain);
  const want = NATIVE_SYMBOL[key];
  const native = rows.find((row) => {
    const token = row?.token || {};
    const sym = String(token.symbol || row?.symbol || '').toUpperCase();
    return token.isNative || token.isNativeToken || sym === want;
  });
  return native?.amount != null ? String(native.amount) : '0';
}

export function mapWalletsToBalancesByChain(wallets = []) {
  const balancesByChain = {};
  for (const row of wallets) {
    const uiKey = CIRCLE_TO_UI[normalizeChain(row.chain)] || String(row.chain || '').toLowerCase();
    if (!uiKey) continue;
    balancesByChain[uiKey] = {
      native: row.tokenBalances ? pickNativeAmount(row.tokenBalances, row.chain) : '0',
      usdc: row.usdc != null ? String(row.usdc) : '0',
      error: row.error || null,
    };
  }
  return balancesByChain;
}

export async function loadUserWalletBalances(userId) {
  const walletDoc = await Wallets.doc(userId).get();
  if (!walletDoc.exists) {
    return { error: 'No wallet found for user', status: 400 };
  }

  const walletData = walletDoc.data() || {};
  const client = getCircleWalletsClient();
  const ctx = buildWalletAgentContext(walletData);
  const { wallets } = await fetchBalancesForUserWallets(client, ctx);

  return {
    success: true,
    balancesByChain: mapWalletsToBalancesByChain(wallets),
    wallets,
    updatedAt: Date.now(),
    ttlMs: USER_WALLET_TTL_MS,
    stale: false,
  };
}
