import { randomUUID } from 'node:crypto';
import { nodeRequire } from './nodeRequire.js';
import { isSolanaAddress } from './cctp/solanaAddress.js';

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

function usdcLib() {
  return nodeRequire('opendome/dist/x402.js');
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

async function resolveSourceWallet(client, walletId, blockchain = 'BASE') {
  if (walletId) {
    const res = await client.getWallet({ id: walletId });
    return res.data?.wallet || res.data;
  }
  const { getUsdcChain } = usdcLib();
  const cfg = getUsdcChain(blockchain);
  const walletSetId = await getOrCreateWalletSet();
  const walletsRes = await client.listWallets({ walletSetId });
  const wallets = walletsRes.data?.wallets || [];
  return (
    wallets.find((w) => w.blockchain === cfg.circleBlockchain) ||
    wallets.find((w) => w.blockchain === 'BASE') ||
    wallets[0] ||
    null
  );
}

async function resolveUsdcTokenId(client, walletId, blockchain) {
  try {
    const balRes = await client.getWalletTokenBalance({ id: walletId });
    const rows = balRes.data?.tokenBalances || balRes.tokenBalances || [];
    const usdc = rows.find((row) => {
      const sym = String(row.token?.symbol || '').toUpperCase();
      const name = String(row.token?.name || '').toUpperCase();
      return sym === 'USDC' || name.includes('USD COIN');
    });
    if (usdc?.token?.id) return usdc.token.id;
  } catch (err) {
    console.warn('[Circle] USDC tokenId lookup failed:', err.message);
  }
  if (String(blockchain).toUpperCase() === 'BASE') return BASE_USDC_TOKEN_ID;
  return null;
}

async function resolveNativeTokenId(client, walletId, blockchain) {
  const nativeSymbol = {
    BASE: 'ETH',
    ARB: 'ETH',
    OP: 'ETH',
    ETH: 'ETH',
    MATIC: 'POL',
    AVAX: 'AVAX',
    SOL: 'SOL',
  }[String(blockchain).toUpperCase()];
  const balRes = await client.getWalletTokenBalance({ id: walletId });
  const rows = balRes.data?.tokenBalances || balRes.tokenBalances || [];
  const native = rows.find((row) => {
    const token = row?.token || {};
    return (
      token.isNative ||
      token.isNativeToken ||
      String(token.symbol || row?.symbol || '').toUpperCase() === nativeSymbol
    );
  });
  return native?.token?.id || native?.tokenId || null;
}

export async function executeCircleNativeTransfer({
  amount,
  destination,
  walletId,
  blockchain = 'BASE',
}) {
  const client = getClient();
  try {
    const { getUsdcChain } = usdcLib();
    const cfg = getUsdcChain(blockchain);
    const chainKey = cfg.key;
    const sourceWallet = await resolveSourceWallet(client, walletId, chainKey);
    if (!sourceWallet?.id) return { error: `No Circle wallet available for ${cfg.label}.` };

    const toSolana = isSolanaAddress(destination);
    if ((chainKey === 'SOL') !== toSolana) {
      return { error: `${cfg.label} native tokens can only be sent on the same network.` };
    }
    if (chainKey === 'SOL') {
      const { sponsorSolanaTransferWithCircle } = await import(
        './sponsorSolanaTransfer.js'
      );
      return sponsorSolanaTransferWithCircle({
        client,
        walletId: sourceWallet.id,
        fromAddress: sourceWallet.address,
        destination,
        amount,
        asset: 'NATIVE',
      });
    }

    const tokenId = await resolveNativeTokenId(client, sourceWallet.id, chainKey);
    if (!tokenId) return { error: `Could not resolve the native token on ${cfg.label}.` };

    const response = await client.createTransaction({
      walletId: sourceWallet.id,
      tokenId,
      destinationAddress: destination,
      amounts: [amount],
      fee: { type: 'level', config: { feeLevel: 'HIGH' } },
      idempotencyKey: randomUUID(),
    });
    return {
      success: true,
      transactionId: response.data?.id || response.data?.transaction?.id,
      sponsored: false,
      chain: cfg.key.toLowerCase(),
      blockchain: cfg.circleBlockchain,
    };
  } catch (err) {
    console.error('executeCircleNativeTransfer error:', err.response?.data || err.message);
    return { error: err.response?.data?.message || err.message };
  }
}

/**
 * @param {{ amount, destination, tokenId?, walletId?, blockchain? }} args
 */
export async function executeCircleNanoPayment({
  amount,
  destination,
  tokenId,
  walletId,
  blockchain = 'BASE',
}) {
  const client = getClient();
  try {
    const { getUsdcChain, isSponsoredUsdcChain } = usdcLib();
    const cfg = getUsdcChain(blockchain);
    const chainKey = cfg.key;
    const sourceWallet = await resolveSourceWallet(client, walletId, chainKey);
    if (!sourceWallet?.id) {
      return { error: `No Circle wallet available for ${cfg.label}.` };
    }

    const toSolana = isSolanaAddress(destination);
    if (toSolana && chainKey === 'BASE') {
      // Lazy: CCTP pulls Solana Kit; keep it off the wallet-balances / nfts cold path.
      const { bridgeUsdcToSolana } = await import('./cctp/bridgeUsdcToSolana.js');
      return bridgeUsdcToSolana({
        client,
        walletId: sourceWallet.id,
        destination,
        amount,
      });
    }
    if (toSolana && chainKey === 'SOL') {
      const { sponsorSolanaTransferWithCircle } = await import(
        './sponsorSolanaTransfer.js'
      );
      return sponsorSolanaTransferWithCircle({
        client,
        walletId: sourceWallet.id,
        fromAddress: sourceWallet.address,
        destination,
        amount,
        asset: 'USDC',
      });
    }
    if (toSolana) {
      return {
        error:
          'Bridge to Solana is only supported from Base USDC. Switch source to Base, or send Solana USDC from the Solana wallet.',
      };
    }
    if (chainKey === 'SOL') {
      return {
        error: 'Solana USDC can only be sent to a Solana address',
      };
    }

    // Sponsored L2s: EIP-3009 facilitator. Fail closed (no silent gas burn).
    if (isSponsoredUsdcChain(chainKey) && process.env.MERCHANT_PRIVATE_KEY) {
      const { sponsorUsdcTransferWithCircle } = await import('./sponsorUsdcTransfer.js');
      const sponsored = await sponsorUsdcTransferWithCircle({
        client,
        walletId: sourceWallet.id,
        fromAddress: sourceWallet.address,
        destination,
        amount,
        blockchain: chainKey,
      });
      if (sponsored?.success) return sponsored;
      return {
        error:
          sponsored?.error ||
          `Facilitator sponsorship failed on ${cfg.label}. Try again or fund merchant gas.`,
      };
    }

    // Ethereum (and any non-sponsored EVM): user pays gas via Circle createTransaction.
    const resolvedTokenId =
      tokenId || (await resolveUsdcTokenId(client, sourceWallet.id, chainKey));
    if (!resolvedTokenId) {
      return { error: `Could not resolve USDC token id on ${cfg.label}` };
    }

    const response = await client.createTransaction({
      walletId: sourceWallet.id,
      tokenId: resolvedTokenId,
      destinationAddress: destination,
      amounts: [amount],
      fee: { type: 'level', config: { feeLevel: 'HIGH' } },
      idempotencyKey: randomUUID(),
    });
    return {
      success: true,
      transactionId: response.data?.id || response.data?.transaction?.id,
      sponsored: false,
      chain: cfg.key.toLowerCase(),
      blockchain: cfg.circleBlockchain,
    };
  } catch (err) {
    console.error('executeCircleNanoPayment error:', err.response?.data || err.message);
    return { error: err.response?.data?.message || err.message };
  }
}

/** Same-chain Solana USDC transfer (OpenDome facilitator pays network fees). */
export async function executeSolanaUsdcTransfer({
  amount,
  destination,
  walletId,
}) {
  const client = getClient();
  try {
    if (!isSolanaAddress(destination)) {
      return { error: 'destination must be a Solana address' };
    }
    const sourceWallet = await resolveSourceWallet(client, walletId, 'SOL');
    if (!sourceWallet?.id) {
      return { error: 'No Solana Circle wallet for this user' };
    }
    const { sponsorSolanaTransferWithCircle } = await import(
      './sponsorSolanaTransfer.js'
    );
    return sponsorSolanaTransferWithCircle({
      client,
      walletId: sourceWallet.id,
      fromAddress: sourceWallet.address,
      destination,
      amount,
      asset: 'USDC',
    });
  } catch (err) {
    console.error('executeSolanaUsdcTransfer error:', err.response?.data || err.message);
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
