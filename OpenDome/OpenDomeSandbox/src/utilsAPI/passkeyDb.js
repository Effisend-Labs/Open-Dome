import { Firestore } from '@google-cloud/firestore';
import path from 'path';
import fs from 'fs';

function getFirestoreEnv() {
  const explicit = String(process.env.FIRESTORE_ENV || '').trim().toLowerCase();
  if (explicit === 'production' || explicit === 'prod') return 'production';
  if (explicit === 'local' || explicit === 'dev') return 'dev';
  if (process.env.VERCEL === '1' || process.env.VERCEL === 'true' || process.env.VERCEL_ENV) {
    return 'production';
  }
  return 'dev';
}

function collectionName(base) {
  return getFirestoreEnv() === 'dev' ? `Dev${base}` : base;
}

const keyPath = path.join(process.cwd(), 'credential.json');

if (!fs.existsSync(keyPath) && !process.env.GCP_PRIVATE_KEY) {
  console.error('❌ [Passkey DB] credential.json / GCP env not found in OpenDomeSandbox!');
}

function buildOptions() {
  if (process.env.GCP_PROJECT_ID && process.env.GCP_CLIENT_EMAIL && process.env.GCP_PRIVATE_KEY) {
    return {
      projectId: process.env.GCP_PROJECT_ID.replace(/^["']|["']$/g, ''),
      credentials: {
        client_email: process.env.GCP_CLIENT_EMAIL.replace(/^["']|["']$/g, ''),
        private_key: process.env.GCP_PRIVATE_KEY.replace(/^["']|["']$/g, '').replace(/\\n/g, '\n'),
      },
    };
  }
  return { keyFilename: keyPath };
}

const db = new Firestore(buildOptions());
const env = getFirestoreEnv();

export const Users = db.collection(collectionName('Users'));
export const Passkeys = db.collection(collectionName('Passkeys'));
export const Wallets = db.collection(collectionName('Wallets'));
export const Transactions = db.collection(collectionName('Transactions'));
export const LocationLogs = db.collection(collectionName('LocationLogs'));

console.log(
  `[Passkey DB] FIRESTORE_ENV=${env} → ${collectionName('Users')}, ${collectionName('Passkeys')}, …`
);

export async function getUserById(userId) {
  const doc = await Users.doc(userId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

export async function getUserByUsername(username) {
  const snapshot = await Users.where('username', '==', username).limit(1).get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
}

export async function getPasskeyById(credentialID) {
  const doc = await Passkeys.doc(credentialID).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

export async function getUserPasskeys(userId) {
  const snapshot = await Passkeys.where('userId', '==', userId).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}
