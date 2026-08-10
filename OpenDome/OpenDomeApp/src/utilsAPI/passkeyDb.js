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
let Users;
let Passkeys;
let Wallets;
let Transactions;
let LocationLogs;

function getDb() {
  if (!db) {
    db = new Firestore(buildFirestoreOptions());
    Users = db.collection('Users');
    Passkeys = db.collection('Passkeys');
    Wallets = db.collection('Wallets');
    Transactions = db.collection('Transactions');
    LocationLogs = db.collection('LocationLogs');
  }
  return db;
}

function collections() {
  getDb();
  return { Users, Passkeys, Wallets, Transactions, LocationLogs };
}

// Lazy proxies so missing env fails on request with a JSON 500, not at cold-start hang.
export const Users = new Proxy(
  {},
  {
    get(_t, prop) {
      return collections().Users[prop];
    },
  }
);
export const Passkeys = new Proxy(
  {},
  {
    get(_t, prop) {
      return collections().Passkeys[prop];
    },
  }
);
export const Wallets = new Proxy(
  {},
  {
    get(_t, prop) {
      return collections().Wallets[prop];
    },
  }
);
export const Transactions = new Proxy(
  {},
  {
    get(_t, prop) {
      return collections().Transactions[prop];
    },
  }
);
export const LocationLogs = new Proxy(
  {},
  {
    get(_t, prop) {
      return collections().LocationLogs[prop];
    },
  }
);

export async function getUserById(userId) {
  const doc = await collections().Users.doc(userId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

export async function getUserByUsername(username) {
  const snapshot = await collections()
    .Users.where('username', '==', username)
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
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
