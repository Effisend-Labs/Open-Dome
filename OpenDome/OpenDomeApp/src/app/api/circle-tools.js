import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';
import crypto from 'crypto';

let _circleClient = null;

function getClient() {
  if (!_circleClient) {
    _circleClient = initiateDeveloperControlledWalletsClient({
      apiKey: process.env.CIRCLE_API_KEY,
      entitySecret: process.env.CIRCLE_ENTITY_SECRET,
    });
  }
  return _circleClient;
}

async function getOrCreateWalletSet() {
  const client = getClient();
  try {
    const listRes = await client.listWalletSets();
    if (listRes.data && listRes.data.walletSets && listRes.data.walletSets.length > 0) {
      return listRes.data.walletSets[0].id;
    }
    const createRes = await client.createWalletSet({
      name: 'Agent Wallet Set',
      idempotencyKey: crypto.randomUUID()
    });
    return createRes.data.walletSet.id;
  } catch (err) {
    console.error("Failed to get or create wallet set:", err.response?.data || err.message);
    throw err;
  }
}

export async function createCircleAgentWallet(blockchains) {
  const client = getClient();
  try {
    const walletSetId = await getOrCreateWalletSet();
    const response = await client.createWallets({
      blockchains: blockchains,
      count: 1,
      walletSetId,
      idempotencyKey: crypto.randomUUID(),
      accountType: 'EOA'
    });
    return { success: true, wallets: response.data.wallets };
  } catch (err) {
    console.error('createCircleAgentWallet error:', err.response?.data || err.message);
    return { error: err.response?.data?.message || err.message };
  }
}

export async function executeCircleNanoPayment({ amount, destination, tokenId }) {
  const client = getClient();
  try {
    const walletSetId = await getOrCreateWalletSet();
    const walletsRes = await client.listWallets({ walletSetId });
    
    if (!walletsRes.data?.wallets?.length) {
      return { error: 'No agent wallets available.' };
    }
    
    const sourceWallet = walletsRes.data.wallets[0];

    const response = await client.createTransaction({
      walletId: sourceWallet.id,
      tokenId: tokenId || '7b2a6fce-2032-5a21-93c6-94b29bb88796', // Fallback to USDC testnet token ID if none
      destinationAddress: destination,
      amounts: [amount],
      fee: { type: 'level', config: { feeLevel: 'HIGH' } },
      idempotencyKey: crypto.randomUUID()
    });
    return { success: true, transactionId: response.data.id };
  } catch (err) {
    console.error('executeCircleNanoPayment error:', err.response?.data || err.message);
    return { error: err.response?.data?.message || err.message };
  }
}
