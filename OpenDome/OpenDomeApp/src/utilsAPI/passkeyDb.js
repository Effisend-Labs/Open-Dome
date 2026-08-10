import { Firestore } from '@google-cloud/firestore';
import path from 'path';
import fs from 'fs';

// Initialize Firestore
let dbOptions = {};

const keyPath = path.join(process.cwd(), 'credential.json');

if (process.env.GCP_PRIVATE_KEY && process.env.GCP_CLIENT_EMAIL) {
  dbOptions = {
    projectId: process.env.GCP_PROJECT_ID,
    credentials: {
      client_email: process.env.GCP_CLIENT_EMAIL,
      private_key: process.env.GCP_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }
  };
} else if (fs.existsSync(keyPath)) {
  dbOptions = {
    keyFilename: keyPath,
  };
} else {
  console.error("❌ [Passkey DB] GCP credentials not found in env or credential.json!");
}

const db = new Firestore(dbOptions);

export const Users = db.collection('Users');
export const Passkeys = db.collection('Passkeys');
export const Wallets = db.collection('Wallets');
export const Transactions = db.collection('Transactions');
export const LocationLogs = db.collection('LocationLogs');

/**
 * Helper to fetch a user by their internal ID
 */
export async function getUserById(userId) {
  const doc = await Users.doc(userId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

/**
 * Helper to fetch a user by their username
 */
export async function getUserByUsername(username) {
  const snapshot = await Users.where('username', '==', username).limit(1).get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
}

/**
 * Helper to fetch a specific passkey by its credentialID
 */
export async function getPasskeyById(credentialID) {
  const doc = await Passkeys.doc(credentialID).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

/**
 * Helper to get all passkeys for a specific user
 */
export async function getUserPasskeys(userId) {
  const snapshot = await Passkeys.where('userId', '==', userId).get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
