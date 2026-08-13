import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';

const require = createRequire(import.meta.url);
const { initiateDeveloperControlledWalletsClient } = require(
  '@circle-fin/developer-controlled-wallets',
);
const { OpenDomeFacilitator, sponsorUsdcTransfer } = require('opendome/dist/x402.js');

export const EVM_DEST = '0x62f8F44632CAdb181B082Fd370C2791302810A77';
export const SOL_DEST = '9dffUY8j8GGzzYzSzm8a9rEpqsAKwcKHdimmUeo7W8gS';
export const BASE_USDC_TOKEN_ID = 'aa7bb533-aeb8-535c-bd65-354aed91ea3d';
export const PAGE_SIZE = 50;

export function loadEnv(envPath) {
  const text = fs.readFileSync(envPath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    const key = t.slice(0, i).trim();
    let value = t.slice(i + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value.replace(/\\n/g, '\n');
  }
}

export function circleClient() {
  return initiateDeveloperControlledWalletsClient({
    apiKey: process.env.CIRCLE_API_KEY,
    entitySecret: process.env.CIRCLE_ENTITY_SECRET,
  });
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function isSolanaChain(blockchain) {
  return String(blockchain || '').toUpperCase().startsWith('SOL');
}

export function destFor(wallet) {
  return isSolanaChain(wallet.blockchain) ? SOL_DEST : EVM_DEST;
}

export function isDestinationWallet(wallet) {
  const addr = String(wallet.address || '');
  if (isSolanaChain(wallet.blockchain)) return addr === SOL_DEST;
  return addr.toLowerCase() === EVM_DEST.toLowerCase();
}

function decimalsOf(value) {
  const frac = String(value || '0').split('.')[1] || '';
  return frac.length;
}

function toAtomic(value, decimals) {
  const [whole, frac = ''] = String(value || '0').trim().split('.');
  const padded = `${frac}${'0'.repeat(decimals)}`.slice(0, decimals);
  return BigInt(whole || '0') * 10n ** BigInt(decimals) + BigInt(padded || '0');
}

function fromAtomic(atomic, decimals) {
  if (atomic <= 0n) return '0';
  const base = 10n ** BigInt(decimals);
  const whole = atomic / base;
  const frac = (atomic % base).toString().padStart(decimals, '0').replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : String(whole);
}

export function subDec(a, b) {
  const d = Math.max(decimalsOf(a), decimalsOf(b), 1);
  return fromAtomic(toAtomic(a, d) - toAtomic(b, d), d);
}

export function mulDec(a, factor) {
  const d = Math.max(decimalsOf(a), 6);
  const scaled = toAtomic(a, d) * BigInt(Math.round(factor * 1000)) / 1000n;
  return fromAtomic(scaled, d);
}

export function isPositive(amount) {
  return toAtomic(String(amount || '0'), Math.max(decimalsOf(amount), 1)) > 0n;
}

export function isNativeToken(token) {
  if (!token) return false;
  if (token.isNative === true) return true;
  const addr = String(token.tokenAddress || '').trim();
  return !addr;
}

export function isNft(token) {
  const std = String(token?.standard || '').toUpperCase();
  return std.includes('721') || std.includes('1155') || std.includes('NFT');
}

export async function paginate(fetchPage) {
  const out = [];
  let pageAfter;
  for (;;) {
    const { items, lastId } = await fetchPage(pageAfter);
    out.push(...items);
    if (!items.length || items.length < PAGE_SIZE || !lastId) break;
    pageAfter = lastId;
    await sleep(120);
  }
  return out;
}

export async function listAllWallets(client) {
  return paginate(async (pageAfter) => {
    const res = await client.listWallets({
      pageSize: PAGE_SIZE,
      ...(pageAfter ? { pageAfter } : {}),
    });
    const wallets = res.data?.wallets || [];
    return { items: wallets, lastId: wallets.at(-1)?.id };
  });
}

export async function tokenBalances(client, walletId) {
  const rows = [];
  let pageAfter;
  for (;;) {
    const res = await client.getWalletTokenBalance({
      id: walletId,
      includeAll: true,
      pageSize: PAGE_SIZE,
      ...(pageAfter ? { pageAfter } : {}),
    });
    const batch = res.data?.tokenBalances || [];
    rows.push(...batch);
    if (!batch.length || batch.length < PAGE_SIZE) break;
    pageAfter = batch.at(-1)?.token?.id;
    await sleep(80);
  }
  return rows;
}

export function splitBalances(rows) {
  const tokens = [];
  const natives = [];
  for (const row of rows) {
    const token = row.token || {};
    const amount = String(row.amount ?? row.available ?? '0');
    if (!isPositive(amount) || isNft(token)) continue;
    const item = {
      amount,
      tokenId: token.id,
      symbol: token.symbol || 'TOKEN',
      blockchain: token.blockchain,
      tokenAddress: token.tokenAddress || '',
      isNative: isNativeToken(token),
    };
    if (item.isNative) natives.push(item);
    else tokens.push(item);
  }
  return { tokens, natives };
}

export async function waitSent(client, txId) {
  if (!txId) return;
  try {
    await client.getTransaction({ id: txId, waitForState: 'SENT' });
  } catch {
    // continue; sweep should not die on a slow confirmation
  }
}

async function circleTransfer(client, { walletId, tokenId, destination, amount }) {
  const res = await client.createTransaction({
    walletId,
    tokenId,
    destinationAddress: destination,
    amounts: [amount],
    fee: { type: 'level', config: { feeLevel: 'HIGH' } },
    idempotencyKey: randomUUID(),
  });
  const id = res.data?.id || res.data?.transaction?.id;
  return { success: true, transactionId: id, sponsored: false };
}

export async function sendToken(client, { wallet, token, destination, live }) {
  const label = `${token.symbol} ${token.amount}`;
  if (!live) return { dryRun: true, label };

  const isBaseUsdc =
    token.tokenId === BASE_USDC_TOKEN_ID &&
    !isSolanaChain(wallet.blockchain) &&
    process.env.MERCHANT_PRIVATE_KEY;

  if (isBaseUsdc) {
    try {
      const facilitator = new OpenDomeFacilitator(process.env.MERCHANT_PRIVATE_KEY, {
        rpcUrl: process.env.RPC_URL || 'https://mainnet.base.org',
      });
      const sent = await sponsorUsdcTransfer({
        from: wallet.address,
        to: destination,
        amount: token.amount,
        facilitator,
        signTypedData: async (typedData) => {
          const res = await client.signTypedData({
            walletId: wallet.id,
            data: JSON.stringify(typedData, (_k, v) =>
              typeof v === 'bigint' ? v.toString() : v,
            ),
            idempotencyKey: randomUUID(),
          });
          return res.data?.signature;
        },
      });
      if (sent?.success) return { ...sent, label, sponsored: true };
    } catch (err) {
      console.warn(`  sponsor ${label} failed: ${err.message}; Circle tx`);
    }
  }

  const sent = await circleTransfer(client, {
    walletId: wallet.id,
    tokenId: token.tokenId,
    destination,
    amount: token.amount,
  });
  await waitSent(client, sent.transactionId);
  return { ...sent, label };
}

export async function sendNative(client, { wallet, native, destination, live }) {
  let amount = native.amount;
  try {
    const feeRes = await client.estimateTransferFee({
      amount: [native.amount],
      destinationAddress: destination,
      walletId: wallet.id,
      tokenId: native.tokenId,
    });
    const high = feeRes.data?.high || feeRes.data?.medium || {};
    const fee = high.networkFee || high.gasFee || '0';
    if (isPositive(fee)) amount = subDec(native.amount, mulDec(fee, 1.25));
  } catch (err) {
    console.warn(`  native fee estimate failed (${err.message}); sending 90%`);
    amount = mulDec(native.amount, 0.9);
  }

  if (!isPositive(amount)) {
    return { skip: 'native dust after gas', symbol: native.symbol, amount: native.amount };
  }

  const label = `${native.symbol} ${amount}`;
  if (!live) return { dryRun: true, label };

  const sent = await circleTransfer(client, {
    walletId: wallet.id,
    tokenId: native.tokenId,
    destination,
    amount,
  });
  return { ...sent, label };
}

export function envPathFrom(root) {
  return path.join(root, '.env');
}
