import { randomUUID } from 'node:crypto';
import {
  getCircleWalletsClient,
  createCircleAgentWallet,
  executeCircleNanoPayment,
  CIRCLE_WALLET_SET_ID,
  BASE_USDC_TOKEN_ID,
} from './circleTools.js';
import { listNftsForWallet, listNftsForUserWallets } from './circleNftBalance.js';
import { createSolanaPayRequest } from './cctp/solanaPay.js';
import { nodeRequire } from './nodeRequire.js';

function fail(err) {
  return { error: err.response?.data?.message || err.message || String(err) };
}

function slimWallet(wallet) {
  if (!wallet) return null;
  return {
    id: wallet.id,
    blockchain: wallet.blockchain,
    state: wallet.state,
    accountType: wallet.accountType,
  };
}

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

function chainKey(args = {}) {
  return String(args.blockchain || args.chain || args.network || '').toUpperCase();
}

function normalizeChain(raw) {
  const key = String(raw || '').toUpperCase();
  if (!key) return '';
  if (key.startsWith('SOL')) return 'SOL';
  if (key === 'POLYGON' || key === 'POL') return 'MATIC';
  if (key === 'OPTIMISM') return 'OP';
  if (key === 'ARBITRUM') return 'ARB';
  if (key === 'AVALANCHE') return 'AVAX';
  if (key === 'ETHEREUM' || key === 'MAINNET') return 'ETH';
  return key;
}

/** All Circle wallet ids for the signed-in user, keyed by chain. */
function walletIdMap(ctx = {}) {
  const ids = { ...(ctx.walletIds || {}) };
  if (!ids.BASE && !ids.ETH && ctx.walletId) ids.BASE = ctx.walletId;
  if (!ids.SOL && !ids.SOLANA && ctx.solWalletId) ids.SOL = ctx.solWalletId;
  return ids;
}

function pickWalletId(args, ctx) {
  if (args.walletId) return args.walletId;
  const chain = normalizeChain(chainKey(args));
  const ids = walletIdMap(ctx);
  if (!chain) return ids.BASE || ids.ETH || ctx.walletId || null;
  if (chain === 'SOL') return ids.SOL || ids.SOLANA || ctx.solWalletId || null;
  return ids[chain] || null;
}

function pickUsdcAmount(tokenBalances) {
  const rows = tokenBalances?.tokenBalances || tokenBalances || [];
  if (!Array.isArray(rows)) return '0';
  const usdc = rows.find((row) => {
    const sym = String(row?.token?.symbol || row?.symbol || '').toUpperCase();
    return sym === 'USDC' || sym === 'USDC.E';
  });
  return usdc?.amount != null ? String(usdc.amount) : '0';
}

async function walletWithBalances(client, walletId, chainHint) {
  const walletRes = await client.getWallet({ id: walletId });
  const wallet = slimWallet(walletRes.data?.wallet || walletRes.data);
  const balRes = await client.getWalletTokenBalance({ id: walletId });
  const tokenBalances = balRes.data || balRes;
  const chain = normalizeChain(chainHint) || normalizeChain(wallet?.blockchain);
  return {
    id: wallet?.id || walletId,
    chain: chain || wallet?.blockchain || null,
    label: CHAIN_LABEL[chain] || chain || null,
    usdc: pickUsdcAmount(tokenBalances),
    tokenBalances,
  };
}

async function balancesForUserWallets(client, ctx, filterChain) {
  const ids = walletIdMap(ctx);
  let entries = Object.entries(ids).filter(([, id]) => id);
  const want = normalizeChain(filterChain);
  if (want) {
    entries = entries.filter(([chain]) => normalizeChain(chain) === want);
  }
  if (!entries.length) return { wallets: [] };

  const results = await Promise.allSettled(
    entries.map(([chain, id]) => walletWithBalances(client, id, chain)),
  );

  const wallets = [];
  for (let i = 0; i < results.length; i += 1) {
    const chain = normalizeChain(entries[i][0]);
    const result = results[i];
    if (result.status === 'fulfilled') {
      wallets.push(result.value);
    } else {
      const err = result.reason;
      wallets.push({
        chain,
        label: CHAIN_LABEL[chain] || chain,
        usdc: null,
        error: err?.response?.data?.message || err?.message || String(err),
      });
    }
  }
  return { wallets };
}

export async function runCircleAgentTool(name, args = {}, ctx = {}) {
  const client = getCircleWalletsClient();
  const userWalletId = pickWalletId(args, ctx);
  try {
    if (name === 'list_wallets') {
      const mapped = await balancesForUserWallets(client, ctx, chainKey(args));
      if (mapped.wallets.length) return mapped;
      const res = await client.listWallets({
        walletSetId: args.walletSetId || CIRCLE_WALLET_SET_ID,
      });
      return { wallets: (res.data?.wallets || []).map(slimWallet).filter(Boolean) };
    }
    if (name === 'get_wallet') {
      if (!userWalletId) return { error: 'walletId is required' };
      const res = await client.getWallet({ id: userWalletId });
      return { wallet: slimWallet(res.data?.wallet || res.data) };
    }
    if (name === 'get_wallet_token_balance') {
      const chain = chainKey(args);
      if (!args.walletId && !chain) {
        return balancesForUserWallets(client, ctx);
      }
      if (!userWalletId) return { error: 'walletId is required' };
      const row = await walletWithBalances(client, userWalletId, chain);
      return row;
    }
    if (name === 'get_wallet_nft_balance') {
      if (userWalletId) {
        const nfts = await listNftsForWallet(client, userWalletId);
        return { nfts, count: nfts.length };
      }
      const ids = ctx.walletIds || {};
      if (Object.keys(ids).length || ctx.walletId || ctx.solWalletId) {
        return listNftsForUserWallets(client, {
          walletIds: {
            ...ids,
            ...(ctx.walletId ? { BASE: ctx.walletId } : {}),
            ...(ctx.solWalletId ? { SOL: ctx.solWalletId } : {}),
          },
        });
      }
      return { error: 'walletId is required' };
    }
    if (name === 'list_transactions') {
      // Circle rejects `blockchain` when `walletIds` is set.
      const params = userWalletId ? { walletIds: [userWalletId] } : {};
      const res = await client.listTransactions(params);
      return { transactions: res.data?.transactions || [] };
    }
    if (name === 'get_transaction') {
      const res = await client.getTransaction({ id: args.transactionId });
      return { transaction: res.data?.transaction || res.data };
    }
    if (name === 'estimate_transfer_fee') {
      const { isSponsoredUsdcChain, getUsdcChain } = nodeRequire('opendome/dist/x402.js');
      const chain = chainKey(args) || 'BASE';
      const cfg = getUsdcChain(chain);
      if (cfg.key === 'SOL') {
        return {
          sponsored: true,
          paidBy: 'solana-facilitator',
          userFee: '0',
          blockchain: cfg.key,
          note: 'OpenDome facilitator pays the Solana network fee. User only needs USDC.',
        };
      }
      if (isSponsoredUsdcChain(chain)) {
        return {
          sponsored: true,
          paidBy: 'facilitator',
          userFee: '0',
          blockchain: cfg.key,
          note: `OpenDome facilitator pays ${cfg.gasToken} gas on ${cfg.label}. User only needs USDC.`,
        };
      }
      return {
        sponsored: false,
        paidBy: 'user',
        userFee: 'network',
        blockchain: cfg.key,
        note: `User pays ${cfg.gasToken} gas on ${cfg.label}.`,
      };
    }
    if (name === 'validate_address') {
      const res = await client.validateAddress({
        address: args.address,
        blockchain: args.blockchain,
      });
      return res.data || res;
    }
    if (name === 'create_wallets') {
      return createCircleAgentWallet(args.blockchains);
    }
    if (name === 'create_transaction') {
      const chain = chainKey(args) || 'BASE';
      const walletId =
        userWalletId ||
        (chain.startsWith('SOL')
          ? ctx.solWalletId || ctx.walletIds?.SOL || ctx.walletIds?.SOLANA
          : ctx.walletIds?.[chain] || ctx.walletId);
      return executeCircleNanoPayment({
        amount: args.amount,
        destination: args.destination,
        tokenId: args.tokenId,
        walletId,
        blockchain: chain.startsWith('SOL') ? 'SOL' : chain || 'BASE',
      });
    }
    if (name === 'create_solana_pay') {
      let recipient =
        args.recipient ||
        ctx.solanaAddress ||
        null;
      if (!recipient) {
        const solId =
          ctx.solWalletId || ctx.walletIds?.SOL || ctx.walletIds?.SOLANA || null;
        if (solId) {
          const walletRes = await client.getWallet({ id: solId });
          const wallet = walletRes.data?.wallet || walletRes.data;
          recipient = wallet?.address || null;
        }
      }
      if (!recipient) {
        return { error: 'No Solana wallet address for this user' };
      }
      return createSolanaPayRequest({
        recipient,
        amount: args.amount,
        label: args.label || 'OpenDome',
        message: args.message,
      });
    }
    if (name === 'sign_message') {
      if (!userWalletId) return { error: 'walletId is required' };
      const res = await client.signMessage({
        walletId: userWalletId,
        message: args.message,
        idempotencyKey: randomUUID(),
      });
      return res.data || res;
    }
    if (name === 'get_token') {
      const res = await client.getToken({ id: args.tokenId });
      return { token: res.data?.token || res.data };
    }
    return { error: `Unknown Circle tool: ${name}` };
  } catch (err) {
    return fail(err);
  }
}
