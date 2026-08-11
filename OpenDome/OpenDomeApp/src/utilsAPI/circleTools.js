import { randomUUID } from 'node:crypto';
import { nodeRequire } from './nodeRequire';

let _circleClient = null;

function getCircleFactory() {
  // Split string so Metro cannot statically bundle Circle into API routes.
  const pkg = '@circle-fin/' + 'developer-controlled-wallets';
  return nodeRequire(pkg).initiateDeveloperControlledWalletsClient;
}

function getClient() {
  if (!_circleClient) {
    _circleClient = getCircleFactory()({
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
    if (listRes.data?.walletSets?.length > 0) {
      return listRes.data.walletSets[0].id;
    }
    const createRes = await client.createWalletSet({
      name: 'Agent Wallet Set',
      idempotencyKey: randomUUID(),
    });
    return createRes.data.walletSet.id;
  } catch (err) {
    console.error(
      'Failed to get or create wallet set:',
      err.response?.data || err.message
    );
    throw err;
  }
}

export async function createCircleAgentWallet(blockchains) {
  const client = getClient();
  try {
    const walletSetId = await getOrCreateWalletSet();
    const response = await client.createWallets({
      blockchains,
      count: 1,
      walletSetId,
      idempotencyKey: randomUUID(),
      accountType: 'EOA',
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
      tokenId: tokenId || '7b2a6fce-2032-5a21-93c6-94b29bb88796',
      destinationAddress: destination,
      amounts: [amount],
      fee: { type: 'level', config: { feeLevel: 'HIGH' } },
      idempotencyKey: randomUUID(),
    });
    return { success: true, transactionId: response.data.id };
  } catch (err) {
    console.error('executeCircleNanoPayment error:', err.response?.data || err.message);
    return { error: err.response?.data?.message || err.message };
  }
}

/** Shared Circle client for passkey register/login wallet provisioning. */
export function getCircleWalletsClient() {
  return getClient();
}

export const CIRCLE_WALLET_SET_ID = 'afd0591a-e99a-5883-89e7-a1c27316eee8';
