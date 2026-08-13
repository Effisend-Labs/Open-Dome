/**
 * Smoke-test Circle developer-controlled wallets with local .env creds.
 *
 *   node test/circle-wallets.mjs
 *
 * Read-only: lists wallet sets and wallets. Does not create wallets or send txs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appRoot = path.join(root, 'OpenDome/OpenDomeApp');
const envPath = path.join(appRoot, '.env');

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

function maskKey(value) {
  if (!value) return '(empty)';
  const kind = value.startsWith('LIVE:')
    ? 'LIVE'
    : value.startsWith('TEST:')
      ? 'TEST'
      : 'KEY';
  return `${kind}…${value.slice(-4)} (len=${value.length})`;
}

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error(`  FAIL  ${msg}`);
    return false;
  }
  passed += 1;
  console.log(`  PASS  ${msg}`);
  return true;
}

loadEnv(envPath);

const apiKey = process.env.CIRCLE_API_KEY || '';
const entitySecret = process.env.CIRCLE_ENTITY_SECRET || '';

console.log('\n=== Circle wallets smoke test ===\n');
console.log(`  env     ${path.relative(root, envPath)}`);
console.log(`  apiKey  ${maskKey(apiKey)}`);
console.log(`  entity  ${entitySecret.length === 64 ? 'set (64 hex)' : `missing (len=${entitySecret.length})`}\n`);

if (!apiKey || !entitySecret) {
  console.error('  FAIL  CIRCLE_API_KEY and CIRCLE_ENTITY_SECRET must be set');
  process.exit(1);
}
assert(entitySecret.length === 64, 'CIRCLE_ENTITY_SECRET is 32-byte hex');

const require = createRequire(path.join(appRoot, 'package.json'));
const { initiateDeveloperControlledWalletsClient } =
  require('@circle-fin/developer-controlled-wallets');

const pkRes = await fetch('https://api.circle.com/v1/w3s/config/entity/publicKey', {
  headers: { Authorization: `Bearer ${apiKey}` },
});
const pkBody = await pkRes.json().catch(() => ({}));
assert(
  pkRes.ok && Boolean(pkBody.data?.publicKey || pkBody.publicKey),
  `GET entity publicKey (${pkRes.status})`,
);
if (!pkRes.ok) {
  console.error('  detail', pkBody.message || pkBody.code || JSON.stringify(pkBody).slice(0, 200));
}

const client = initiateDeveloperControlledWalletsClient({ apiKey, entitySecret });

try {
  const setsRes = await client.listWalletSets();
  const sets = setsRes.data?.walletSets || [];
  assert(Array.isArray(sets), `listWalletSets returned ${sets.length} set(s)`);

  let walletCount = 0;
  for (const set of sets.slice(0, 5)) {
    const walletsRes = await client.listWallets({ walletSetId: set.id });
    const wallets = walletsRes.data?.wallets || [];
    walletCount += wallets.length;
    const sample = wallets
      .slice(0, 3)
      .map((w) => `${w.blockchain || '?'} ${String(w.address || '').slice(0, 10)}…`)
      .join(', ');
    console.log(
      `         set ${String(set.name || set.id).slice(0, 40)} → ${wallets.length} wallet(s)${sample ? ` (${sample})` : ''}`,
    );
  }
  assert(true, `listed ${walletCount} wallet(s) across ${Math.min(sets.length, 5)} set(s)`);
} catch (err) {
  const detail = err.response?.data?.message || err.response?.data?.code || err.message;
  assert(false, `list wallets with entity secret (${detail})`);
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
