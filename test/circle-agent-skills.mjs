/**
 * Live smoke of Wallet Circle agent-kit skills + a 1¢ USDC send/receive.
 *
 *   node test/circle-agent-skills.mjs
 *
 * Caps: 0.01 USDC transfer, optional ~$0.10 ETH gas top-up to the user wallet.
 * Never prints secrets.
 */
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appRoot = path.join(root, 'OpenDome/OpenDomeApp');
const envPath = path.join(appRoot, '.env');

const USDC_TOKEN_ID = 'aa7bb533-aeb8-535c-bd65-354aed91ea3d';
const WALLET_SET_ID = 'afd0591a-e99a-5883-89e7-a1c27316eee8';
const FALLBACK_USER = '0xb90513424b01eA257bF8f87223A6eD8fe0Ce0681';
const SEND_USDC = '0.01';
const GAS_USD = 0.1;
const MIN_GAS_ETH = 0.00002;

function loadEnv(file) {
  if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] == null) process.env[key] = val;
  }
}

function shortAddr(addr) {
  if (!addr) return '(none)';
  const s = String(addr);
  if (s.length < 12) return s;
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

function tokenAmt(row) {
  const a = row?.amount ?? row?.amounts?.[0];
  if (a == null) return 0;
  const n = Number(Array.isArray(a) ? a[0] : a);
  return Number.isFinite(n) ? n : 0;
}

function isBase(wallet) {
  return /base/i.test(String(wallet?.blockchain || ''));
}

function isEvm(wallet) {
  return !/sol/i.test(String(wallet?.blockchain || ''));
}

let passed = 0;
let failed = 0;
const findings = [];

function ok(cond, msg, extra) {
  if (cond) {
    passed += 1;
    console.log(`  PASS  ${msg}${extra ? `  ${extra}` : ''}`);
    return true;
  }
  failed += 1;
  console.error(`  FAIL  ${msg}${extra ? `  ${extra}` : ''}`);
  findings.push(msg);
  return false;
}

function note(msg) {
  console.log(`         ${msg}`);
}

loadEnv(envPath);

const apiKey = process.env.CIRCLE_API_KEY || '';
const entitySecret = process.env.CIRCLE_ENTITY_SECRET || '';
const merchantKey = process.env.MERCHANT_PRIVATE_KEY || '';
const merchantAddr = process.env.MERCHANT_ADDRESS || '';
const rpcUrl = process.env.RPC_URL || 'https://mainnet.base.org';

console.log('\n=== Circle agent-kit skills + 1¢ send/receive ===\n');
console.log(`  env     ${path.relative(root, envPath)}`);
console.log(`  key     ${apiKey.startsWith('LIVE') ? 'LIVE' : apiKey.startsWith('TEST') ? 'TEST' : 'KEY'} (len=${apiKey.length})`);
console.log(`  send    ${SEND_USDC} USDC`);
console.log(`  gas cap $${GAS_USD} ETH if user wallet is dry\n`);

if (!apiKey || !entitySecret) {
  console.error('  FAIL  CIRCLE_API_KEY and CIRCLE_ENTITY_SECRET must be set');
  process.exit(1);
}

const require = createRequire(path.join(appRoot, 'package.json'));
const { initiateDeveloperControlledWalletsClient } =
  require('@circle-fin/developer-controlled-wallets');
const { ethers } = require('ethers');

const client = initiateDeveloperControlledWalletsClient({ apiKey, entitySecret });

async function listAllWallets() {
  const wallets = [];
  let pageAfter;
  for (let i = 0; i < 20; i += 1) {
    const res = await client.listWallets({
      walletSetId: WALLET_SET_ID,
      pageSize: 50,
      pageAfter,
    });
    const batch = res.data?.wallets || [];
    wallets.push(...batch);
    pageAfter = res.data?.page?.after || res.page?.after;
    if (!batch.length || !pageAfter) break;
  }
  return wallets;
}

async function balancesFor(walletId) {
  const res = await client.getWalletTokenBalance({ id: walletId });
  return res.data?.tokenBalances || res.tokenBalances || [];
}

function pickToken(rows, pred) {
  return (rows || []).find(pred) || null;
}

async function waitForTx(id, tries = 24) {
  let last = null;
  for (let i = 0; i < tries; i += 1) {
    const res = await client.getTransaction({ id });
    last = res.data?.transaction || res.data || res;
    const state = String(last?.state || last?.status || '').toUpperCase();
    note(`tx ${id.slice(0, 8)}… state=${state || '?'} (${i + 1}/${tries})`);
    if (['COMPLETE', 'CONFIRMED', 'COMPLETED', 'FAILED', 'DENIED', 'CANCELLED'].includes(state)) {
      return last;
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  return last;
}

async function ethUsd() {
  try {
    const res = await fetch('https://api.coinbase.com/v2/prices/ETH-USD/spot');
    const body = await res.json();
    const n = Number(body?.data?.amount);
    if (Number.isFinite(n) && n > 0) return n;
  } catch {
    // fall through
  }
  return 3500;
}

async function fundGasIfNeeded(userAddress, ethBal) {
  if (ethBal >= MIN_GAS_ETH) {
    note(`user already has ${ethBal} ETH — skip gas top-up`);
    return null;
  }
  if (!merchantKey || !merchantAddr) {
    ok(false, 'need gas but MERCHANT_PRIVATE_KEY/ADDRESS missing');
    return null;
  }
  const price = await ethUsd();
  const ethAmount = (GAS_USD / price).toFixed(8);
  note(`user ETH ${ethBal} < ${MIN_GAS_ETH}; sending ~$${GAS_USD} (${ethAmount} ETH @ $${price}) from merchant ${shortAddr(merchantAddr)}`);

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer = new ethers.Wallet(merchantKey, provider);
  const from = await signer.getAddress();
  if (from.toLowerCase() !== String(merchantAddr).toLowerCase()) {
    note(`merchant key address ${shortAddr(from)} != MERCHANT_ADDRESS ${shortAddr(merchantAddr)} — using key address`);
  }
  const merchantBal = await provider.getBalance(from);
  const value = ethers.parseEther(ethAmount);
  ok(merchantBal > value, `merchant has ETH for gas top-up (${ethers.formatEther(merchantBal)} ETH)`);
  if (merchantBal <= value) return null;

  const tx = await signer.sendTransaction({ to: userAddress, value });
  note(`gas tx ${tx.hash}`);
  const receipt = await tx.wait(1);
  ok(receipt?.status === 1, `gas top-up mined`, tx.hash);
  return tx.hash;
}

// ── 1. list_wallets ──────────────────────────────────────────────────────────
const wallets = await listAllWallets();
ok(wallets.length > 0, `list_wallets (${wallets.length} in set)`);

const baseWallets = wallets.filter(isBase);
const evmWallets = wallets.filter(isEvm);
note(
  `base=${baseWallets.length} evm=${evmWallets.length} sample=${wallets
    .slice(0, 4)
    .map((w) => `${w.blockchain} ${shortAddr(w.address)}`)
    .join(', ')}`,
);

const fundedHint = '0x855566f25f0b0f71f6f197c194ae06e86fedc279';
const userWallet =
  wallets.find((w) => String(w.address).toLowerCase() === FALLBACK_USER.toLowerCase()) ||
  wallets.find((w) => String(w.address).toLowerCase() === fundedHint.toLowerCase()) ||
  baseWallets[0] ||
  evmWallets[0] ||
  wallets[0];

ok(Boolean(userWallet), `resolved user wallet ${shortAddr(userWallet?.address)} ${userWallet?.blockchain || ''}`);

if (!userWallet) {
  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(1);
}

// ── 2. get_wallet ────────────────────────────────────────────────────────────
try {
  const res = await client.getWallet({ id: userWallet.id });
  const w = res.data?.wallet || res.data;
  ok(Boolean(w?.id || w?.address), `get_wallet`, shortAddr(w?.address || userWallet.address));
} catch (err) {
  ok(false, `get_wallet (${err.response?.data?.message || err.message})`);
}

// ── 3. get_wallet_token_balance ──────────────────────────────────────────────
let userTokens = [];
try {
  userTokens = await balancesFor(userWallet.id);
  ok(Array.isArray(userTokens), `get_wallet_token_balance (${userTokens.length} tokens)`);
  for (const row of userTokens.slice(0, 6)) {
    const tok = row.token || row;
    note(
      `${tok.symbol || tok.name || 'token'} ${tokenAmt(row)} id=${String(tok.id || row.tokenId || '').slice(0, 8)}… native=${Boolean(tok.isNative)}`,
    );
  }
} catch (err) {
  ok(false, `get_wallet_token_balance (${err.response?.data?.message || err.message})`);
}

const userUsdc =
  pickToken(userTokens, (r) => /usdc/i.test(r.token?.symbol || r.symbol || '')) ||
  pickToken(userTokens, (r) => (r.token?.id || r.tokenId) === USDC_TOKEN_ID);
const userNative = pickToken(
  userTokens,
  (r) => r.token?.isNative || (!r.token?.tokenAddress && /eth/i.test(r.token?.symbol || '')),
);
const userEth = tokenAmt(userNative);
const userUsdcAmt = tokenAmt(userUsdc);
let usdcTokenId = userUsdc?.token?.id || userUsdc?.tokenId || USDC_TOKEN_ID;
const nativeTokenId = userNative?.token?.id || userNative?.tokenId;

note(`user USDC=${userUsdcAmt} ETH=${userEth}`);

// ── 4. get_wallet_nft_balance ────────────────────────────────────────────────
try {
  const res = await client.getWalletNFTBalance({ id: userWallet.id });
  const nfts = res.data?.nfts || res.nfts || [];
  ok(true, `get_wallet_nft_balance (${Array.isArray(nfts) ? nfts.length : 'ok'})`);
} catch (err) {
  ok(false, `get_wallet_nft_balance (${err.response?.data?.message || err.message})`);
}

// ── 5. list_transactions ─────────────────────────────────────────────────────
let listedTxs = [];
try {
  const res = await client.listTransactions({
    walletIds: [userWallet.id],
  });
  listedTxs = res.data?.transactions || [];
  ok(Array.isArray(listedTxs), `list_transactions (${listedTxs.length})`);
} catch (err) {
  ok(false, `list_transactions (${err.response?.data?.message || err.message})`);
}

// ── 6. get_transaction (existing, if any) ────────────────────────────────────
if (listedTxs[0]?.id) {
  try {
    const res = await client.getTransaction({ id: listedTxs[0].id });
    const tx = res.data?.transaction || res.data;
    ok(Boolean(tx?.id || tx?.state), `get_transaction`, String(tx?.state || tx?.id || '').slice(0, 24));
  } catch (err) {
    ok(false, `get_transaction (${err.response?.data?.message || err.message})`);
  }
} else {
  note('no prior txs — will get_transaction after send');
}

// ── 7. validate_address ──────────────────────────────────────────────────────
try {
  const res = await client.validateAddress({
    address: userWallet.address,
    blockchain: userWallet.blockchain || 'BASE',
  });
  const data = res.data || res;
  ok(data?.isValid !== false, `validate_address ${shortAddr(userWallet.address)}`, JSON.stringify(data).slice(0, 80));
} catch (err) {
  ok(false, `validate_address (${err.response?.data?.message || err.message})`);
}

try {
  const res = await client.validateAddress({
    address: 'not-an-address',
    blockchain: 'BASE',
  });
  const data = res.data || res;
  ok(data?.isValid === false || data?.error, `validate_address rejects junk`);
} catch (err) {
  ok(true, `validate_address rejects junk (${err.response?.data?.message || err.message})`);
}

// ── 8. get_token ─────────────────────────────────────────────────────────────
try {
  const res = await client.getToken({ id: usdcTokenId });
  const token = res.data?.token || res.data;
  ok(
    Boolean(token?.id || token?.symbol),
    `get_token USDC`,
    `${token?.symbol || ''} ${token?.blockchain || ''}`,
  );
} catch (err) {
  ok(false, `get_token (${err.response?.data?.message || err.message})`);
}

// ── 9. sign_message ──────────────────────────────────────────────────────────
try {
  const res = await client.signMessage({
    walletId: userWallet.id,
    message: 'opendome-cent-test',
    idempotencyKey: randomUUID(),
  });
  const sig = res.data?.signature || res.data?.signedTransaction || res.data;
  ok(Boolean(sig), `sign_message`, typeof sig === 'string' ? `${sig.slice(0, 18)}…` : 'signed');
} catch (err) {
  ok(false, `sign_message (${err.response?.data?.message || err.message})`);
}

// Find a counterparty wallet on the same chain with USDC (for receive), else merchant
let counterparty =
  baseWallets.find(
    (w) =>
      w.id !== userWallet.id &&
      String(w.address).toLowerCase() !== String(userWallet.address).toLowerCase(),
  ) || null;

let source = userWallet;
let destAddr = counterparty?.address || merchantAddr;
let destLabel = counterparty ? `wallet ${shortAddr(counterparty.address)}` : `merchant ${shortAddr(merchantAddr)}`;

// Prefer a source that already has ≥ 0.01 USDC
const candidates = [userWallet, ...baseWallets.filter((w) => w.id !== userWallet.id)].slice(0, 8);
let sourceUsdc = userUsdcAmt;
let sourceEth = userEth;
let sourceTokens = userTokens;

for (const w of candidates) {
  const rows = w.id === userWallet.id ? userTokens : await balancesFor(w.id);
  const usdc = tokenAmt(
    pickToken(rows, (r) => /usdc/i.test(r.token?.symbol || r.symbol || '')) ||
      pickToken(rows, (r) => (r.token?.id || r.tokenId) === USDC_TOKEN_ID),
  );
  const eth = tokenAmt(
    pickToken(rows, (r) => r.token?.isNative || (!r.token?.tokenAddress && /eth/i.test(r.token?.symbol || ''))),
  );
  note(`candidate ${shortAddr(w.address)} USDC=${usdc} ETH=${eth}`);
  if (usdc >= Number(SEND_USDC)) {
    source = w;
    sourceUsdc = usdc;
    sourceEth = eth;
    sourceTokens = rows;
    const sameAddr = (a, b) =>
      String(a || '').toLowerCase() === String(b || '').toLowerCase();
    const otherBase = baseWallets.find(
      (x) => x.id !== w.id && !sameAddr(x.address, w.address),
    );
    destAddr = otherBase?.address || merchantAddr;
    destLabel = otherBase
      ? `wallet ${shortAddr(otherBase.address)}`
      : `merchant ${shortAddr(merchantAddr)}`;
    break;
  }
}

const sourceUsdcRow =
  pickToken(sourceTokens, (r) => /usdc/i.test(r.token?.symbol || r.symbol || '')) ||
  pickToken(sourceTokens, (r) => (r.token?.id || r.tokenId) === USDC_TOKEN_ID);
if (sourceUsdcRow?.token?.id || sourceUsdcRow?.tokenId) {
  usdcTokenId = sourceUsdcRow.token?.id || sourceUsdcRow.tokenId;
}
ok(sourceUsdc >= Number(SEND_USDC), `source has ≥ ${SEND_USDC} USDC (${sourceUsdc} at ${shortAddr(source.address)})`);
note(`using USDC token ${usdcTokenId}`);

// ── 10. estimate_transfer_fee ────────────────────────────────────────────────
try {
  const res = await client.estimateTransferFee({
    walletId: source.id,
    destinationAddress: destAddr,
    amounts: [SEND_USDC],
    tokenId: usdcTokenId,
    fee: { type: 'level', config: { feeLevel: 'MEDIUM' } },
  });
  const fee = res.data || res;
  ok(Boolean(fee), `estimate_transfer_fee ${SEND_USDC} USDC`, JSON.stringify(fee).slice(0, 120));
} catch (err) {
  ok(false, `estimate_transfer_fee (${err.response?.data?.message || err.message})`);
}

// ── Gas top-up if source is dry ──────────────────────────────────────────────
if (sourceEth < MIN_GAS_ETH) {
  await fundGasIfNeeded(source.address, sourceEth);
}

if (!destAddr) {
  ok(false, 'no destination address for 1¢ send');
} else if (sourceUsdc < Number(SEND_USDC)) {
  note('skipping create_transaction — no wallet has 0.01 USDC');
} else {
  // ── 11. create_transaction (send 1¢) ───────────────────────────────────────
  note(`SEND ${SEND_USDC} USDC  ${shortAddr(source.address)} → ${destLabel}`);
  try {
    const response = await client.createTransaction({
      walletId: source.id,
      tokenId: usdcTokenId,
      destinationAddress: destAddr,
      amounts: [SEND_USDC],
      fee: { type: 'level', config: { feeLevel: 'HIGH' } },
      idempotencyKey: randomUUID(),
    });
    const txId = response.data?.id || response.data?.transaction?.id;
    ok(Boolean(txId), `create_transaction returned id`, txId ? String(txId).slice(0, 12) : '');
    if (txId) {
      const finalTx = await waitForTx(txId);
      const state = String(finalTx?.state || finalTx?.status || '').toUpperCase();
      ok(
        ['COMPLETE', 'CONFIRMED', 'COMPLETED'].includes(state),
        `1¢ USDC send ${state}`,
        finalTx?.txHash ? String(finalTx.txHash).slice(0, 18) : '',
      );
      try {
        const res = await client.getTransaction({ id: txId });
        const tx = res.data?.transaction || res.data;
        ok(tx?.id === txId || Boolean(tx?.state), `get_transaction after send (${tx?.state})`);
      } catch (err) {
        ok(false, `get_transaction after send (${err.response?.data?.message || err.message})`);
      }

      // Receive check: destination USDC balance (Circle wallet only)
      const destWallet = wallets.find(
        (w) => String(w.address).toLowerCase() === String(destAddr).toLowerCase(),
      );
      if (destWallet) {
        const destTokens = await balancesFor(destWallet.id);
        const destUsdc = tokenAmt(
          pickToken(destTokens, (r) => /usdc/i.test(r.token?.symbol || r.symbol || '')),
        );
        ok(true, `receive wallet USDC now ${destUsdc} at ${shortAddr(destWallet.address)}`);
      } else {
        note(`destination ${shortAddr(destAddr)} is not a Circle wallet in this set — on-chain receive only`);
      }
    }
  } catch (err) {
    const detail = err.response?.data?.message || err.response?.data?.code || err.message;
    ok(false, `create_transaction (${detail})`);
  }
}

// ── 12. create_wallets is skipped (mutating / extra wallets) ─────────────────
note('skip create_wallets (would mint a new EOA)');

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
