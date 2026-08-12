import { nodeRequire } from './nodeRequire';
import {
  getFirestoreEnv,
  firestoreCollection,
  getRuntimeLabel,
} from './runtimeEnv';

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
  const raw =
    stripQuotes(process.env.ADMIN_GOD_USERNAME) ||
    stripQuotes(process.env.ADMIN_USERNAME) ||
    '@altaga';
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
  adminUsersCol = db.collection(firestoreCollection('AdminUsers'));
  adminTicketsCol = db.collection(firestoreCollection('AdminTickets'));
  appUsersCol = db.collection(firestoreCollection('Users'));
  if (!firestoreEnvLogged) {
    firestoreEnvLogged = true;
    console.log(
      `[Admin DB] ${getRuntimeLabel()} (${getFirestoreEnv()}) → ${firestoreCollection('AdminUsers')}, ${firestoreCollection('Users')}`
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

/** Passkey-onboarded OpenDome users (DevUsers / Users). */
export async function getAllPasskeyUsers() {
  ensureDb();
  const snap = await appUsersCol.get();
  return snap.docs.map((d) => {
    const data = d.data() || {};
    const username = data.username || data.usernameLower || '';
    const address = (data.evmAddress || data.address || '').toLowerCase();
    const roleRaw = String(data.role || 'user').toLowerCase();
    let role = 'USER';
    if (roleRaw === 'god') role = 'GOD';
    else if (roleRaw === 'admin') role = 'ADMIN';
    else if (roleRaw === 'scanner' || roleRaw === 'checker') role = 'SCANNER';
    return {
      id: d.id,
      source: 'passkey',
      name: username ? `@${String(username).replace(/^@/, '')}` : 'Anonymous',
      username: String(username).replace(/^@/, ''),
      address,
      role,
      evmAddress: data.evmAddress || null,
      solanaAddress: data.solanaAddress || null,
      createdAt: data.createdAt || null,
    };
  });
}

export async function searchPasskeyUsers(query) {
  const q = String(query || '').trim().toLowerCase().replace(/^@/, '');
  const god = getGodUsernameLower();
  // Never list GOD (@altaga) — not manageable from Admin UI
  const all = (await getAllPasskeyUsers()).filter((u) => {
    if (u.role === 'GOD') return false;
    return normalizeUsername(u.username || u.name) !== god;
  });
  if (!q) return all;
  return all.filter((u) => {
    const name = String(u.username || '').toLowerCase();
    const addr = String(u.address || '').toLowerCase();
    return name.includes(q) || addr.includes(q) || u.id.toLowerCase().includes(q);
  });
}

/**
 * Resolve OpenDome QR / username / EVM / Solana → passkey profile for Scanner.
 * Query examples: opendome:user:alice | @alice | 0xabc… | Solana pubkey
 */
export async function resolvePasskeyUserForScan(rawQuery) {
  ensureDb();
  const raw = String(rawQuery || '').trim();
  if (!raw) return null;

  let username = null;
  let evm = null;
  let solana = null;

  const od = raw.match(/^opendome:user:(.+)$/i);
  if (od) username = normalizeUsername(od[1]);
  else if (raw.startsWith('@')) username = normalizeUsername(raw);
  else if (/^0x[a-fA-F0-9]{40}$/.test(raw)) evm = raw.toLowerCase();
  else if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(raw)) solana = raw;
  else if (/^[a-zA-Z0-9_\.]{2,32}$/.test(raw)) username = normalizeUsername(raw);
  else return null;

  let snap = null;
  if (username) {
    snap = await appUsersCol.where('usernameLower', '==', username).limit(1).get();
    if (snap.empty) {
      snap = await appUsersCol.where('username', '==', username).limit(1).get();
    }
  } else if (evm) {
    snap = await appUsersCol.where('evmAddress', '==', evm).limit(1).get();
    if (snap.empty) {
      // case variants
      const all = await getAllPasskeyUsers();
      const hit = all.find((u) => (u.address || '').toLowerCase() === evm);
      if (hit) {
        return {
          id: hit.id,
          username: hit.username || null,
          evmAddress: hit.evmAddress || hit.address || evm,
          solanaAddress: hit.solanaAddress || null,
          role: hit.role,
        };
      }
      // wallet-only: still allow ticket lookup by address
      return {
        id: null,
        username: null,
        evmAddress: evm,
        solanaAddress: null,
        role: 'USER',
      };
    }
  } else if (solana) {
    snap = await appUsersCol.where('solanaAddress', '==', solana).limit(1).get();
    if (snap.empty) {
      const all = await getAllPasskeyUsers();
      const hit = all.find((u) => u.solanaAddress === solana);
      if (!hit) return null;
      return {
        id: hit.id,
        username: hit.username || null,
        evmAddress: hit.evmAddress || hit.address || null,
        solanaAddress: hit.solanaAddress || solana,
        role: hit.role,
      };
    }
  }

  if (!snap || snap.empty) return null;
  const doc = snap.docs[0];
  const data = doc.data() || {};
  return {
    id: doc.id,
    username: data.username || data.usernameLower || null,
    evmAddress: data.evmAddress || data.address || null,
    solanaAddress: data.solanaAddress || null,
    role: data.role || 'user',
  };
}

function toPasskeyRole(role) {
  const n = normalizeRole(role);
  if (n === 'GOD') return 'god';
  if (n === 'ADMIN') return 'admin';
  if (n === 'SCANNER') return 'scanner';
  return 'user';
}

/**
 * Bulk role update on passkey Users + mirror into AdminUsers for mint roster.
 * GOD cannot be assigned via API (altaga only / seeded).
 */
export async function bulkUpdatePasskeyRoles(updates, actorRole = 'GOD') {
  ensureDb();
  if (!Array.isArray(updates) || !updates.length) {
    throw new Error('No updates provided');
  }

  const results = [];
  for (const item of updates) {
    const id = item?.id;
    const next = normalizeRole(item?.role);
    if (!id) continue;
    if (!canAssignRole(actorRole, next)) {
      throw new Error(`Cannot assign ${next}`);
    }

    const doc = await appUsersCol.doc(id).get();
    if (!doc.exists) throw new Error(`User not found: ${id}`);
    const data = doc.data() || {};
    const current = String(data.role || 'user').toLowerCase();
    if (current === 'god' || normalizeUsername(data.username || data.usernameLower) === getGodUsernameLower()) {
      throw new Error('Cannot change GOD (@altaga) role');
    }

    await appUsersCol.doc(id).update({ role: toPasskeyRole(next) });

    const address = (data.evmAddress || data.address || '').toLowerCase();
    const name = data.username
      ? `@${String(data.username).replace(/^@/, '')}`
      : '';

    if (address && address !== '0x0') {
      const existing = await adminUsersCol.where('address', '==', address).limit(1).get();
      if (existing.empty) {
        await adminUsersCol.add({
          address,
          name,
          role: next,
          passkeyUserId: id,
          createdAt: Date.now(),
        });
      } else {
        const adminDoc = existing.docs[0];
        if (!isGodRole(adminDoc.data().role)) {
          await adminUsersCol.doc(adminDoc.id).update({
            role: next,
            name: name || adminDoc.data().name || '',
            passkeyUserId: id,
          });
        }
      }
    }

    results.push({ id, role: next });
  }
  return results;
}

function normalizeUsername(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/^@/, '');
}

/** Resolve mint targets from passkey user ids (ensures AdminUsers rows). */
export async function resolveMintTargetsFromPasskeyIds(passkeyUserIds) {
  ensureDb();
  const targets = [];
  for (const id of passkeyUserIds) {
    const doc = await appUsersCol.doc(id).get();
    if (!doc.exists) continue;
    const data = doc.data() || {};
    const address = (data.evmAddress || data.address || '').toLowerCase();
    if (!address || address === '0x0') {
      throw new Error(
        `User @${data.username || id} has no EVM address — cannot mint`
      );
    }
    const name = data.username
      ? `@${String(data.username).replace(/^@/, '')}`
      : '';

    let adminId;
    const existing = await adminUsersCol.where('address', '==', address).limit(1).get();
    if (existing.empty) {
      const ref = await adminUsersCol.add({
        address,
        name,
        role: 'USER',
        passkeyUserId: id,
        createdAt: Date.now(),
      });
      adminId = ref.id;
    } else {
      adminId = existing.docs[0].id;
    }
    targets.push({ id: adminId, passkeyUserId: id, address, name });
  }
  return targets;
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

/** Delete a passkey-onboarded user (not GOD / @altaga). */
export async function deletePasskeyUser(id, actorRole = 'GOD') {
  ensureDb();
  if (!isGodRole(actorRole) && !isAdminRole(actorRole)) {
    throw new Error('Insufficient role to delete users');
  }
  const doc = await appUsersCol.doc(id).get();
  if (!doc.exists) throw new Error('User not found');
  const data = doc.data() || {};
  const current = String(data.role || 'user').toLowerCase();
  if (
    current === 'god' ||
    normalizeUsername(data.username || data.usernameLower) === getGodUsernameLower()
  ) {
    throw new Error('Cannot delete GOD (@altaga)');
  }
  if (isAdminRole(actorRole) && current === 'admin') {
    throw new Error('ADMIN cannot delete another ADMIN');
  }

  const address = (data.evmAddress || data.address || '').toLowerCase();
  await appUsersCol.doc(id).delete();

  if (address && address !== '0x0') {
    const existing = await adminUsersCol.where('address', '==', address).limit(1).get();
    for (const d of existing.docs) {
      if (!isGodRole(d.data().role)) {
        await adminUsersCol.doc(d.id).delete();
      }
    }
  }
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
