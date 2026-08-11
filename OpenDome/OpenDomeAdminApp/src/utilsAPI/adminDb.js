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

export function normalizePrivateKey(raw) {
  return stripQuotes(raw).replace(/\\n/g, '\n').trim();
}

/** Canonical god account — only this role can open Admin App */
export function getGodUsername() {
  const raw = stripQuotes(process.env.ADMIN_USERNAME) || '@altaga';
  return raw.startsWith('@') ? raw : `@${raw}`;
}

export function getGodUsernameLower() {
  return getGodUsername().replace(/^@/, '').toLowerCase();
}

export function isGodRole(role) {
  return String(role || '').toUpperCase() === 'GOD';
}

export function isAdminRole(role) {
  return String(role || '').toUpperCase() === 'ADMIN';
}

export function isScannerRole(role) {
  const r = String(role || '').toUpperCase();
  return r === 'SCANNER' || r === 'CHECKER';
}

export function normalizeRole(role) {
  const r = String(role || 'USER').toUpperCase();
  if (r === 'CHECKER') return 'SCANNER';
  if (['GOD', 'ADMIN', 'SCANNER', 'USER'].includes(r)) return r;
  return 'USER';
}

/** Roles that can open the Admin App UI */
export function canAccessAdminApp(role) {
  return isGodRole(role) || isAdminRole(role);
}

/**
 * GOD (manual only) → can assign ADMIN | SCANNER | USER
 * ADMIN → can assign SCANNER | USER only
 * Nobody can assign GOD via API
 */
export function canAssignRole(actorRole, targetRole) {
  const next = normalizeRole(targetRole);
  if (next === 'GOD') return false;
  if (isGodRole(actorRole)) return ['ADMIN', 'SCANNER', 'USER'].includes(next);
  if (isAdminRole(actorRole)) return ['SCANNER', 'USER'].includes(next);
  return false;
}

function getFirestore() {
  const pkg = '@google-cloud/' + 'firestore';
  return nodeRequire(pkg).Firestore;
}

let db;
let adminUsersCol;
let adminTicketsCol;
let appUsersCol;
let firestoreEnvLogged = false;

function getFirestoreEnv() {
  const explicit = stripQuotes(process.env.FIRESTORE_ENV).toLowerCase();
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

function ensureDb() {
  if (db) return;

  const projectId = stripQuotes(process.env.GCP_PROJECT_ID);
  const clientEmail = stripQuotes(process.env.GCP_CLIENT_EMAIL);
  const privateKey = normalizePrivateKey(process.env.GCP_PRIVATE_KEY);

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('[Admin DB] Missing GCP credentials.');
  }

  const Firestore = getFirestore();
  db = new Firestore({
    projectId,
    credentials: { client_email: clientEmail, private_key: privateKey },
  });
  adminUsersCol = db.collection(collectionName('AdminUsers'));
  adminTicketsCol = db.collection(collectionName('AdminTickets'));
  appUsersCol = db.collection(collectionName('Users'));
  if (!firestoreEnvLogged) {
    firestoreEnvLogged = true;
    console.log(
      `[Admin DB] FIRESTORE_ENV=${getFirestoreEnv()} → ${collectionName('AdminUsers')}, ${collectionName('Users')}`
    );
  }
}

export async function getAdminUserById(id) {
  ensureDb();
  const doc = await adminUsersCol.doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

export async function getAdminUserByName(name) {
  ensureDb();
  const snap = await adminUsersCol.where('name', '==', name).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() };
}

export async function getAllAdminUsers() {
  ensureDb();
  const snap = await adminUsersCol.get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createAdminUser({ address, name, role }, actorRole = 'GOD') {
  ensureDb();
  const resolvedRole = normalizeRole(role || 'USER');
  if (!canAssignRole(actorRole, resolvedRole)) {
    throw new Error(`Your role cannot assign ${resolvedRole}`);
  }
  const ref = await adminUsersCol.add({
    address,
    name: name || '',
    role: resolvedRole,
    createdAt: Date.now(),
  });
  return { id: ref.id, address, name, role: resolvedRole };
}

export async function updateAdminUserRole(id, role, actorRole) {
  ensureDb();
  const next = normalizeRole(role);
  if (!canAssignRole(actorRole, next)) {
    throw new Error(`Your role cannot assign ${next}`);
  }
  const target = await getAdminUserById(id);
  if (!target) throw new Error('User not found');
  if (isGodRole(target.role)) {
    throw new Error('Cannot change GOD role');
  }
  // ADMIN cannot modify other ADMINs
  if (isAdminRole(actorRole) && isAdminRole(target.role)) {
    throw new Error('ADMIN cannot change another ADMIN');
  }
  await adminUsersCol.doc(id).update({ role: next });
}

export async function deleteAdminUser(id, actorRole) {
  ensureDb();
  const target = await getAdminUserById(id);
  if (!target) throw new Error('User not found');
  if (isGodRole(target.role)) {
    throw new Error('Cannot delete GOD user');
  }
  if (isAdminRole(actorRole) && isAdminRole(target.role)) {
    throw new Error('ADMIN cannot delete another ADMIN');
  }
  if (isAdminRole(actorRole) && !['USER', 'SCANNER'].includes(normalizeRole(target.role))) {
    throw new Error('ADMIN can only delete USER or SCANNER');
  }
  await adminUsersCol.doc(id).delete();
}

export async function getTicketsByAddress(address) {
  ensureDb();
  const snap = await adminTicketsCol
    .where('address', '==', address.toLowerCase())
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addTickets(address, ticketIds, amounts) {
  ensureDb();
  const batch = db.batch();
  for (let i = 0; i < ticketIds.length; i++) {
    const ref = adminTicketsCol.doc();
    batch.set(ref, {
      address: address.toLowerCase(),
      ticketId: ticketIds[i],
      amount: amounts[i],
      assignedAt: Date.now(),
    });
  }
  await batch.commit();
}

/**
 * Ensure @altaga exists as GOD in AdminUsers AND in app Users (passkey DB).
 * Production Users docs are never deleted — only upserted.
 */
export async function seedGodUser() {
  ensureDb();

  const godName = getGodUsername();
  const godLower = getGodUsernameLower();
  const address = (process.env.MERCHANT_ADDRESS || '0x0').toLowerCase();

  // ── AdminUsers (staff roster; auth is OpenDome host JWT only) ─────────
  let admin = await getAdminUserByName(godName);
  if (!admin) {
    // Migrate legacy ADMIN named @altaga / altaga
    const snap = await adminUsersCol.get();
    const legacy = snap.docs.find((d) => {
      const n = String(d.data().name || '').toLowerCase().replace(/^@/, '');
      return n === godLower;
    });
    if (legacy) {
      await adminUsersCol.doc(legacy.id).update({
        role: 'GOD',
        name: godName,
        address,
      });
      admin = { id: legacy.id, ...legacy.data(), role: 'GOD', name: godName };
    } else {
      const ref = await adminUsersCol.add({
        address,
        name: godName,
        role: 'GOD',
        createdAt: Date.now(),
      });
      admin = { id: ref.id, address, name: godName, role: 'GOD' };
    }
  } else if (!isGodRole(admin.role)) {
    await adminUsersCol.doc(admin.id).update({ role: 'GOD', address });
    admin = { ...admin, role: 'GOD' };
  }

  // ── Users (OpenDomeApp passkey DB — same cloud project) ───────────────
  let userSnap = await appUsersCol
    .where('usernameLower', '==', godLower)
    .limit(1)
    .get();
  if (userSnap.empty) {
    userSnap = await appUsersCol.where('username', '==', godLower).limit(1).get();
  }

  if (userSnap.empty) {
    await appUsersCol.doc(`god-${godLower}`).set({
      username: godLower,
      usernameLower: godLower,
      role: 'god',
      seededAsGod: true,
      createdAt: new Date().toISOString(),
    });
  } else {
    const doc = userSnap.docs[0];
    await appUsersCol.doc(doc.id).update({
      role: 'god',
      usernameLower: godLower,
    });
  }

  return admin;
}

/** @deprecated use seedGodUser */
export async function seedAdminIfEmpty() {
  return seedGodUser();
}

export async function getSessionUser(sessionId) {
  if (!sessionId) return null;
  return getAdminUserById(sessionId);
}

export async function requireGod(sessionId) {
  const user = await getSessionUser(sessionId);
  if (!user || !isGodRole(user.role)) return null;
  return user;
}

/** GOD or ADMIN — can open Admin App APIs when using legacy session */
export async function requireAdminAccess(sessionId) {
  const user = await getSessionUser(sessionId);
  if (!user || !canAccessAdminApp(user.role)) return null;
  return user;
}

/**
 * OpenDome host JWT only — @altaga with role god (localhost + production).
 * Returns { type: 'god-jwt', claims, role, username } or null.
 */
export async function requireBridgeActor(request) {
  const { verifyGodJwt } = await import('./godJwt.js');
  const claims = await verifyGodJwt(request);
  if (!claims) return null;
  return { type: 'god-jwt', claims, role: 'GOD', username: claims.username };
}
