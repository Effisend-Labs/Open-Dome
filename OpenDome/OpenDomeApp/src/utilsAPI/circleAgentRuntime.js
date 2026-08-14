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

function chainKey(args = {}) {
  return String(args.blockchain || args.chain || args.network || '').toUpperCase();
}

function pickWalletId(args, ctx) {
  if (args.walletId) return args.walletId;
  const chain = chainKey(args);
  if (chain.startsWith('SOL')) return ctx.solWalletId || ctx.walletIds?.SOL || ctx.walletIds?.SOLANA || null;
  if (chain.includes('BASE') || chain === 'ETH' || chain === 'EVM') {
    return ctx.walletId || ctx.walletIds?.BASE || ctx.walletIds?.ETH || null;
  }
  return ctx.walletId || null;
}

async function walletWithBalances(client, walletId) {
  const walletRes = await client.getWallet({ id: walletId });
  const wallet = slimWallet(walletRes.data?.wallet || walletRes.data);
  const balRes = await client.getWalletTokenBalance({ id: walletId });
  return {
    id: wallet?.id || walletId,
    chain: wallet?.blockchain || null,
    tokenBalances: balRes.data || balRes,
  };
}

export async function runCircleAgentTool(name, args = {}, ctx = {}) {
  const client = getCircleWalletsClient();
  const userWalletId = pickWalletId(args, ctx);
  try {
    if (name === 'list_wallets') {
      const ids = [
        ctx.walletId || ctx.walletIds?.BASE || ctx.walletIds?.ETH,
        ctx.solWalletId || ctx.walletIds?.SOL || ctx.walletIds?.SOLANA,
      ].filter(Boolean);
      const unique = [...new Set(ids)];
      if (unique.length) {
        const wallets = [];
        for (const id of unique) {
          wallets.push(await walletWithBalances(client, id));
        }
        const chain = chainKey(args);
        if (chain.startsWith('SOL')) {
          return { wallets: wallets.filter((w) => String(w.chain || '').toUpperCase().startsWith('SOL')) };
        }
        if (chain.includes('BASE') || chain === 'ETH') {
          return { wallets: wallets.filter((w) => /BASE|ETH|EVM/i.test(String(w.chain || ''))) };
        }
        return { wallets };
      }
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
      if (!userWalletId) return { error: 'walletId is required' };
      const res = await client.getWalletTokenBalance({ id: userWalletId });
      return res.data || res;
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
      const tokenId = args.tokenId || BASE_USDC_TOKEN_ID;
      if (tokenId === BASE_USDC_TOKEN_ID) {
        return {
          sponsored: true,
          paidBy: 'facilitator',
          userFee: '0',
          note: 'OpenDome facilitator pays Base ETH gas for USDC transfers. User only needs USDC.',
        };
      }
      const res = await client.estimateTransferFee({
        walletId: userWalletId,
        destinationAddress: args.destination,
        amounts: [String(args.amount)],
        tokenId,
        fee: { type: 'level', config: { feeLevel: 'MEDIUM' } },
      });
      return res.data || res;
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
      return executeCircleNanoPayment({
        amount: args.amount,
        destination: args.destination,
        tokenId: args.tokenId,
        walletId: userWalletId,
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
