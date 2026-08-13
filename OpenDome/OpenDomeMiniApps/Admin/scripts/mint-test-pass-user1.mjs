/**
 * One-shot: mint 1 pass (amount 10) to @user1 on DEV Firestore + Base.
 * Run from Admin app root:
 *   node scripts/mint-test-pass-user1.mjs
 */
import { readFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const require = createRequire(path.join(root, 'package.json'));

function loadEnv(filePath) {
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2];
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!(m[1] in process.env)) process.env[m[1]] = v;
  }
}

loadEnv(path.join(root, '.env'));
process.env.FIRESTORE_ENV = process.env.FIRESTORE_ENV || 'dev';

const { Firestore } = require('@google-cloud/firestore');
const { ethers } = require('ethers');

function stripQuotes(value) {
  if (value == null) return '';
  let s = String(value).trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1);
  }
  return s.trim();
}

function normalizePrivateKey(raw) {
  return stripQuotes(raw).replace(/\\n/g, '\n').trim();
}

const projectId = stripQuotes(process.env.GCP_PROJECT_ID);
const clientEmail = stripQuotes(process.env.GCP_CLIENT_EMAIL);
const privateKey = normalizePrivateKey(process.env.GCP_PRIVATE_KEY);
const merchantKey = process.env.MERCHANT_PRIVATE_KEY;
const contractAddress = process.env.CONTRACT_ADDRESS;
const rpcUrl = process.env.RPC_URL || 'https://mainnet.base.org';

if (!projectId || !clientEmail || !privateKey) {
  throw new Error('Missing GCP credentials');
}
if (!merchantKey || !contractAddress) {
  throw new Error('Missing MERCHANT_PRIVATE_KEY / CONTRACT_ADDRESS');
}

const db = new Firestore({
  projectId,
  credentials: { client_email: clientEmail, private_key: privateKey },
});

const usersCol = db.collection('DevUsers');
const ticketsCol = db.collection('DevAdminTickets');

const TOKEN_ID = 35146; // BUMP OF CHICKEN from events.json
const AMOUNT = 10;
const USERNAME = 'user1';

const MINT_ABI = [
  'function mint(address to, uint256 id, uint256 amount, bytes data) external',
];

async function main() {
  let snap = await usersCol.where('usernameLower', '==', USERNAME).limit(1).get();
  if (snap.empty) {
    snap = await usersCol.where('username', '==', USERNAME).limit(1).get();
  }
  if (snap.empty) {
    throw new Error(`@${USERNAME} not found in DevUsers`);
  }

  const doc = snap.docs[0];
  const data = doc.data() || {};
  const to = (data.evmAddress || data.address || '').toLowerCase();
  if (!to || to === '0x0') {
    throw new Error(`@${USERNAME} has no EVM address`);
  }

  console.log(`Found @${USERNAME} id=${doc.id}`);
  console.log(`Minting token ${TOKEN_ID} x${AMOUNT} → ${to}`);

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(merchantKey, provider);
  const contract = new ethers.Contract(contractAddress, MINT_ABI, wallet);

  const tx = await contract.mint(to, TOKEN_ID, AMOUNT, '0x');
  console.log(`tx sent: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`confirmed: ${receipt.hash}`);

  await ticketsCol.add({
    address: to,
    ticketId: TOKEN_ID,
    amount: AMOUNT,
    assignedAt: Date.now(),
    note: 'test mint for Scanner @user1',
  });

  console.log('DevAdminTickets record added. Scanner can look up @user1.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
