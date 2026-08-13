/**
 * Platform ticket assignment — writes DevAdminTickets / AdminTickets
 * so Wallet Passes + Scanner see agent-paid passes.
 * Used by Sandbox checkout (not Admin).
 */
import { nodeRequire } from './nodeRequire';

const DEFAULT_CONTRACT =
  process.env.CONTRACT_ADDRESS || '0x40c39F091a7c85D10B8C46762b59Df3eCd77630C';
const BASESCAN = 'https://basescan.org';

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

function getFirestoreCtor() {
  const pkg = '@google-cloud/' + 'firestore';
  return nodeRequire(pkg).Firestore;
}

function getFirestoreEnv() {
  const explicit = stripQuotes(process.env.FIRESTORE_ENV).toLowerCase();
  if (explicit === 'production' || explicit === 'prod') return 'production';
  if (explicit === 'local' || explicit === 'dev') return 'dev';
  if (
    process.env.VERCEL === '1' ||
    process.env.VERCEL === 'true' ||
    process.env.VERCEL_ENV
  ) {
    return 'production';
  }
  return 'dev';
}

function ticketsCollectionName() {
  return getFirestoreEnv() === 'dev' ? 'DevAdminTickets' : 'AdminTickets';
}

let db;

function getDb() {
  if (db) return db;

  const projectId = stripQuotes(process.env.GCP_PROJECT_ID);
  const clientEmail = stripQuotes(process.env.GCP_CLIENT_EMAIL);
  const privateKey = stripQuotes(process.env.GCP_PRIVATE_KEY).replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('GCP credentials required to assign tickets');
  }

  const Firestore = getFirestoreCtor();
  db = new Firestore({
    projectId,
    credentials: { client_email: clientEmail, private_key: privateKey },
  });
  return db;
}

/**
 * Assign ticket rows for an address (platform-owned, after mint).
 * @param {object} [meta] mintTxHash, paymentTxHash, contractAddress
 */
export async function assignTicketsAsPlatform(to, ticketIds, amounts, meta = {}) {
  if (!to || !ticketIds?.length) return { skipped: true };

  const contractAddress = meta.contractAddress || DEFAULT_CONTRACT;
  const mintTxHash = meta.mintTxHash || null;
  const paymentTxHash = meta.paymentTxHash || null;
  const owner = String(to).toLowerCase();

  const explorer = {
    mintTxUrl: mintTxHash ? `${BASESCAN}/tx/${mintTxHash}` : null,
    paymentTxUrl: paymentTxHash ? `${BASESCAN}/tx/${paymentTxHash}` : null,
    tokenInventoryUrl: `${BASESCAN}/token/${contractAddress}?a=${owner}`,
    ownerAddressUrl: `${BASESCAN}/address/${owner}`,
  };

  if (process.env.OD_MOCK_TICKET_INDEX === 'true') {
    return {
      success: true,
      mocked: true,
      collection: ticketsCollectionName(),
      count: ticketIds.length,
      assignedBy: 'platform',
      explorer,
    };
  }

  const firestore = getDb();
  const col = firestore.collection(ticketsCollectionName());
  const batch = firestore.batch();
  const resolvedAmounts = amounts || ticketIds.map(() => 1);

  for (let i = 0; i < ticketIds.length; i++) {
    const ref = col.doc();
    batch.set(ref, {
      address: owner,
      ticketId: ticketIds[i],
      amount: resolvedAmounts[i],
      assignedAt: Date.now(),
      assignedBy: 'platform',
      network: 'base',
      contractAddress,
      mintTxHash,
      paymentTxHash,
      explorer,
    });
  }
  await batch.commit();

  return {
    success: true,
    collection: ticketsCollectionName(),
    count: ticketIds.length,
    assignedBy: 'platform',
    explorer,
  };
}
