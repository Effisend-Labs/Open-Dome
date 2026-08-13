/**
 * Sweep leftover Circle developer-controlled balances to:
 *   EVM  → 0x62f8F44632CAdb181B082Fd370C2791302810A77
 *   SOL  → 9dffUY8j8GGzzYzSzm8a9rEpqsAKwcKHdimmUeo7W8gS
 *
 * Tokens first, native last (gas). Skips the destination wallets themselves.
 *
 *   node scripts/sweep-circle-leftovers.mjs          # dry run
 *   node scripts/sweep-circle-leftovers.mjs --live   # send
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadEnv,
  circleClient,
  sleep,
  destFor,
  isDestinationWallet,
  listAllWallets,
  tokenBalances,
  splitBalances,
  sendToken,
  sendNative,
  envPathFrom,
  EVM_DEST,
  SOL_DEST,
} from './circle-sweep/lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIVE = process.argv.includes('--live');

async function sweepWallet(client, wallet) {
  const dest = destFor(wallet);
  if (isDestinationWallet(wallet)) {
    return { skip: 'destination wallet' };
  }

  await sleep(120);
  const { tokens, natives } = splitBalances(await tokenBalances(client, wallet.id));
  if (!tokens.length && !natives.length) return { skip: 'empty' };

  const transfers = [];
  for (const token of tokens) {
    try {
      transfers.push(await sendToken(client, { wallet, token, destination: dest, live: LIVE }));
      console.log(`  token ${token.symbol} ${token.amount} → ${transfers.at(-1).transactionId || 'dry'}`);
    } catch (err) {
      transfers.push({ error: err.response?.data?.message || err.message, label: token.symbol });
      console.error(`  token ${token.symbol} FAILED: ${transfers.at(-1).error}`);
    }
    await sleep(250);
  }

  for (const native of natives) {
    try {
      const row = await sendNative(client, { wallet, native, destination: dest, live: LIVE });
      transfers.push(row);
      console.log(`  native ${row.label || native.symbol} → ${row.transactionId || row.skip || 'dry'}`);
    } catch (err) {
      transfers.push({ error: err.response?.data?.message || err.message, label: native.symbol });
      console.error(`  native ${native.symbol} FAILED: ${transfers.at(-1).error}`);
    }
    await sleep(250);
  }

  return { dest, transfers };
}

async function main() {
  loadEnv(envPathFrom(ROOT));
  if (!process.env.CIRCLE_API_KEY || !process.env.CIRCLE_ENTITY_SECRET) {
    throw new Error('Missing CIRCLE_API_KEY / CIRCLE_ENTITY_SECRET in OpenDomeApp/.env');
  }

  console.log(LIVE ? '=== LIVE SWEEP ===' : '=== DRY RUN ===');
  console.log(`EVM dest ${EVM_DEST}`);
  console.log(`SOL dest ${SOL_DEST}`);

  const client = circleClient();
  const wallets = await listAllWallets(client);
  console.log(`wallets: ${wallets.length}`);

  const summary = [];
  for (const wallet of wallets) {
    const tag = `${wallet.blockchain} ${wallet.address}`;
    console.log(`\n${tag}`);
    const result = await sweepWallet(client, wallet);
    summary.push({ tag, ...result });
  }

  console.log('\n--- summary ---');
  let funded = 0;
  for (const row of summary) {
    if (row.skip === 'empty') continue;
    funded += 1;
    console.log(JSON.stringify({ tag: row.tag, skip: row.skip, transfers: row.transfers }));
  }
  console.log(`funded wallets: ${funded}/${wallets.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
