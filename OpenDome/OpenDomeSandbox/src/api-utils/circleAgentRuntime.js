import crypto from 'crypto';
import {
  getCircleWalletsClient,
  createCircleAgentWallet,
  executeCircleNanoPayment,
  CIRCLE_WALLET_SET_ID,
  BASE_USDC_TOKEN_ID,
} from './circle-tools.js';
import { listNftsForWallet } from './circleNftBalance.js';

function fail(err) {
  return { error: err.response?.data?.message || err.message || String(err) };
}

export async function runCircleAgentTool(name, args = {}) {
  const client = getCircleWalletsClient();
  try {
    if (name === 'list_wallets') {
      const res = await client.listWallets({
        walletSetId: args.walletSetId || CIRCLE_WALLET_SET_ID,
      });
      return { wallets: res.data?.wallets || [] };
    }
    if (name === 'get_wallet') {
      const res = await client.getWallet({ id: args.walletId });
      return { wallet: res.data?.wallet || res.data };
    }
    if (name === 'get_wallet_token_balance') {
      const res = await client.getWalletTokenBalance({ id: args.walletId });
      return res.data || res;
    }
    if (name === 'get_wallet_nft_balance') {
      if (!args.walletId) return { error: 'walletId is required' };
      const nfts = await listNftsForWallet(client, args.walletId);
      return { nfts, count: nfts.length };
    }
    if (name === 'list_transactions') {
      // Circle rejects `blockchain` when `walletIds` is set.
      const params = args.walletId ? { walletIds: [args.walletId] } : {};
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
        walletId: args.walletId,
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
        walletId: args.walletId,
      });
    }
    if (name === 'sign_message') {
      const res = await client.signMessage({
        walletId: args.walletId,
        message: args.message,
        idempotencyKey: crypto.randomUUID(),
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
