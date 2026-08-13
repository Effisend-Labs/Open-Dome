import path from 'node:path';
import fs from 'node:fs';
import { nodeRequire } from './nodeRequire';

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

/** Vercel/dotenv often store PEM with literal \n and optional wrapping quotes. */
export function normalizePrivateKey(raw) {
  return stripQuotes(raw).replace(/\\n/g, '\n').trim();
}

function getFirestore() {
  // Split string so Metro cannot statically bundle the Admin SDK into API routes.
  const pkg = '@google-cloud/' + 'firestore';
  return nodeRequire(pkg).Firestore;
}

function buildFirestoreOptions() {
  const projectId = stripQuotes(process.env.GCP_PROJECT_ID);
  const clientEmail = stripQuotes(process.env.GCP_CLIENT_EMAIL);
  const privateKey = normalizePrivateKey(process.env.GCP_PRIVATE_KEY);
  const keyPath = path.join(process.cwd(), 'credential.json');

  if (projectId && clientEmail && privateKey) {
    if (!privateKey.includes('BEGIN') || !privateKey.includes('END')) {
      throw new Error(
        '[Passkey DB] GCP_PRIVATE_KEY is set but is not a valid PEM private key'
      );
    }
    return {
      projectId,
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
    };
  }

  if (fs.existsSync(keyPath)) {
    return { keyFilename: keyPath };
  }

  throw new Error(
    '[Passkey DB] Missing GCP credentials. Set GCP_PROJECT_ID, GCP_CLIENT_EMAIL, and GCP_PRIVATE_KEY (or provide credential.json).'
  );
}

let db;
let usersCol;
let passkeysCol;
let walletsCol;
let transactionsCol;
let locationLogsCol;
let challengesCol;
let firestoreEnvLogged = false;

/**
 * Two cloud Firestore namespaces (same GCP project):
 *   - Dev*   → when running localhost (`npm run web`)
 *   - (none) → when deployed on Vercel webpage
 * Optional override: FIRESTORE_ENV=dev|production
 */
export function getFirestoreEnv() {
  const explicit = stripQuotes(process.env.FIRESTORE_ENV).toLowerCase();
  if (explicit === 'production' || explicit === 'prod') return 'production';
  if (explicit === 'local' || explicit === 'dev') return 'dev';

  // Deployed webpage on Vercel → production cloud collections
  if (process.env.VERCEL === '1' || process.env.VERCEL === 'true' || process.env.VERCEL_ENV) {
    return 'production';
  }

  // Localhost → separate Dev* cloud collections
  return 'dev';
}

function collectionName(base) {
  return getFirestoreEnv() === 'dev' ? `Dev${base}` : base;
}

function collections() {
  if (!db) {
    const Firestore = getFirestore();
    db = new Firestore(buildFirestoreOptions());
    const env = getFirestoreEnv();
    usersCol = db.collection(collectionName('Users'));
    passkeysCol = db.collection(collectionName('Passkeys'));
    walletsCol = db.collection(collectionName('Wallets'));
    transactionsCol = db.collection(collectionName('Transactions'));
    locationLogsCol = db.collection(collectionName('LocationLogs'));
    challengesCol = db.collection(collectionName('Challenges'));
    if (!firestoreEnvLogged) {
      firestoreEnvLogged = true;
      console.log(
        `[Passkey DB] FIRESTORE_ENV=${env} → collections ${collectionName('Users')}, ${collectionName('Passkeys')}, …`
      );
    }
  }
  return {
    Users: usersCol,
    Passkeys: passkeysCol,
    Wallets: walletsCol,
    Transactions: transactionsCol,
    LocationLogs: locationLogsCol,
    Challenges: challengesCol,
  };
}

function lazyCollection(name) {
  return new Proxy(
    {},
    {
      get(_t, prop) {
        const col = collections()[name];
        const value = col[prop];
        return typeof value === 'function' ? value.bind(col) : value;
      },
    }
  );
}

export const Users = lazyCollection('Users');
export const Passkeys = lazyCollection('Passkeys');
export const Wallets = lazyCollection('Wallets');
export const Transactions = lazyCollection('Transactions');
export const LocationLogs = lazyCollection('LocationLogs');
export const Challenges = lazyCollection('Challenges');

export function normalizeUsername(username) {
  if (username == null) return '';
  return String(username).trim().toLowerCase();
}

export async function getUserById(userId) {
  const doc = await collections().Users.doc(userId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

/** Case-insensitive lookup via usernameLower, with fallback for legacy docs. */
export async function getUserByUsername(username) {
  const key = normalizeUsername(username);
  if (!key) return null;

  let snapshot = await collections()
    .Users.where('usernameLower', '==', key)
    .limit(1)
    .get();

  if (snapshot.empty) {
    snapshot = await collections()
      .Users.where('username', '==', key)
      .limit(1)
      .get();
  }

  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
}

/** True when username is claimed by a finished registration (has wallet). */
export async function isUsernameTaken(username) {
  const user = await getUserByUsername(username);
  if (!user) return false;
  return user.currentChallenge == null && Boolean(user.evmAddress);
}

export async function getPasskeyById(credentialID) {
  const doc = await collections().Passkeys.doc(credentialID).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

export async function getUserPasskeys(userId) {
  const snapshot = await collections()
    .Passkeys.where('userId', '==', userId)
    .get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function firstUserWhere(field, value) {
  if (!value) return null;
  try {
    const snap = await collections()
      .Users.where(field, '==', value)
      .limit(1)
      .get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() };
  } catch (e) {
    console.warn(`[Passkey DB] query Users.${field} failed:`, e.message);
    return null;
  }
}

async function userFromWalletField(field, value) {
  if (!value) return null;
  try {
    const snap = await collections()
      .Wallets.where(field, '==', value)
      .limit(1)
      .get();
    if (snap.empty) return null;
    const userId = snap.docs[0].data()?.userId;
    return userId ? getUserById(userId) : null;
  } catch (e) {
    console.warn(`[Passkey DB] query Wallets.${field} failed:`, e.message);
    return null;
  }
}

/** Case-insensitive EVM lookup (evmAddressLower, legacy checksum, Wallets). */
export async function getUserByEvmAddress(address) {
  const raw = String(address || '').trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(raw)) return null;
  const lower = raw.toLowerCase();

  const indexed = await firstUserWhere('evmAddressLower', lower);
  if (indexed) return indexed;

  for (const value of [lower, raw]) {
    const hit =
      (await firstUserWhere('evmAddress', value)) ||
      (await firstUserWhere('address', value)) ||
      (await userFromWalletField('address', value));
    if (hit) return hit;
  }

  try {
    const snap = await collections().Users.limit(400).get();
    for (const doc of snap.docs) {
      const data = doc.data() || {};
      const evm = String(data.evmAddress || data.address || '').toLowerCase();
      if (evm === lower) return { id: doc.id, ...data };
    }
  } catch (e) {
    console.warn('[Passkey DB] EVM fallback scan failed:', e.message);
  }
  return null;
}

/** Solana addresses are base58 and case-sensitive. */
export async function getUserBySolanaAddress(address) {
  const raw = String(address || '').trim();
  if (!raw) return null;

  const hit =
    (await firstUserWhere('solanaAddress', raw)) ||
    (await userFromWalletField('solanaAddress', raw));
  if (hit) return hit;

  try {
    const snap = await collections().Users.limit(400).get();
    for (const doc of snap.docs) {
      const data = doc.data() || {};
      if (data.solanaAddress === raw) return { id: doc.id, ...data };
    }
  } catch (e) {
    console.warn('[Passkey DB] Solana fallback scan failed:', e.message);
  }
  return null;
}
