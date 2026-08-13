import { randomUUID } from 'node:crypto';
import { nodeRequire } from './nodeRequire';
import { isSolanaAddress } from './cctp/solanaAddress.js';
import { bridgeUsdcToSolana } from './cctp/bridgeUsdcToSolana.js';

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

async function resolveSourceWallet(client, walletId) {
  if (walletId) {
    const res = await client.getWallet({ id: walletId });
    return res.data?.wallet || res.data;
  }
  const walletSetId = await getOrCreateWalletSet();
  const walletsRes = await client.listWallets({ walletSetId });
  const wallets = walletsRes.data?.wallets || [];
  return wallets.find((w) => w.blockchain === 'BASE') || wallets[0] || null;
}

function isUsdcToken(tokenId) {
  return !tokenId || tokenId === BASE_USDC_TOKEN_ID;
}

export async function executeCircleNanoPayment({ amount, destination, tokenId, walletId }) {
  const client = getClient();
  try {
    const sourceWallet = await resolveSourceWallet(client, walletId);
    if (!sourceWallet?.id) {
      return { error: 'No agent wallets available.' };
    }

    if (isSolanaAddress(destination)) {
      return bridgeUsdcToSolana({
        client,
        walletId: sourceWallet.id,
        destination,
        amount,
      });
    }

    if (isUsdcToken(tokenId) && process.env.MERCHANT_PRIVATE_KEY) {
      const { sponsorUsdcTransferWithCircle } = await import('./sponsorUsdcTransfer.js');
      const sponsored = await sponsorUsdcTransferWithCircle({
        client,
        walletId: sourceWallet.id,
        fromAddress: sourceWallet.address,
        destination,
        amount,
      });
      if (sponsored?.success) return sponsored;
      console.warn(
        '[Circle] facilitator sponsor failed, wallet pays gas:',
        sponsored?.error,
      );
    }

    const response = await client.createTransaction({
      walletId: sourceWallet.id,
      tokenId: tokenId || BASE_USDC_TOKEN_ID,
      destinationAddress: destination,
      amounts: [amount],
      fee: { type: 'level', config: { feeLevel: 'HIGH' } },
      idempotencyKey: randomUUID(),
    });
    return { success: true, transactionId: response.data.id, sponsored: false };
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
/** Base mainnet USDC (Circle token id). Not the testnet UUID. */
export const BASE_USDC_TOKEN_ID = 'aa7bb533-aeb8-535c-bd65-354aed91ea3d';
