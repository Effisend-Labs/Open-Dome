import { Firestore } from '@google-cloud/firestore';
import path from 'path';
import fs from 'fs';

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

function collections() {
  if (!db) {
    db = new Firestore(buildFirestoreOptions());
    usersCol = db.collection('Users');
    passkeysCol = db.collection('Passkeys');
    walletsCol = db.collection('Wallets');
    transactionsCol = db.collection('Transactions');
    locationLogsCol = db.collection('LocationLogs');
    challengesCol = db.collection('Challenges');
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

// Lazy proxies so missing env fails on request with a JSON 500, not at cold-start hang.
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
