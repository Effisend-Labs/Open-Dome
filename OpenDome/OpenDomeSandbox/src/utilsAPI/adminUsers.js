/**
 * God-only user admin ops on passkey Users collections.
 */
import {
  Users,
  getUserById,
  getFirestoreEnv,
  normalizeUsername as passkeyNormalize,
} from './passkeyDb';
import {
  canAssignRole,
  displayRoleFromPasskey,
  getGodUsernameLower,
  isAdminRole,
  isGodRole,
  normalizeRole,
  normalizeUsername,
  toPasskeyRole,
} from './roles';

function collectionLabel() {
  return getFirestoreEnv() === 'dev' ? 'DevUsers' : 'Users';
}

function presentPasskeyUser(doc) {
  const data = doc.data ? doc.data() || {} : doc;
  const id = doc.id || data.id;
  const username = data.username || data.usernameLower || '';
  const address = (data.evmAddress || data.address || '').toLowerCase();
  return {
    id,
    source: 'passkey',
    name: username ? `@${String(username).replace(/^@/, '')}` : 'Anonymous',
    username: String(username).replace(/^@/, ''),
    address,
    role: displayRoleFromPasskey(data.role),
    evmAddress: data.evmAddress || null,
    solanaAddress: data.solanaAddress || null,
    createdAt: data.createdAt || null,
  };
}

export async function getAllPasskeyUsers() {
  const snap = await Users.get();
  return snap.docs.map((d) => presentPasskeyUser(d));
}

export async function searchPasskeyUsers(query, { includeGod = false } = {}) {
  const q = String(query || '').trim().toLowerCase().replace(/^@/, '');
  const god = getGodUsernameLower();
  const all = (await getAllPasskeyUsers()).filter((u) => {
    if (includeGod) return true;
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

export function usersListMeta(scope) {
  return {
    collection: collectionLabel(),
    env: getFirestoreEnv() === 'dev' ? 'DEV' : 'PROD',
    scope,
  };
}

export async function bulkUpdatePasskeyRoles(updates, actorRole = 'GOD') {
  if (!Array.isArray(updates) || !updates.length) {
    throw new Error('No updates provided');
  }

  const results = [];
  for (const item of updates) {
    const id = item?.id;
    const next = normalizeRole(item?.role);
    if (!id) continue;
    if (!canAssignRole(actorRole, next)) {
      const err = new Error(`Cannot assign ${next}`);
      err.status = 403;
      throw err;
    }

    const doc = await Users.doc(id).get();
    if (!doc.exists) {
      const err = new Error(`User not found: ${id}`);
      err.status = 404;
      throw err;
    }
    const data = doc.data() || {};
    const current = String(data.role || 'user').toLowerCase();
    if (
      current === 'god' ||
      passkeyNormalize(data.username || data.usernameLower) === getGodUsernameLower()
    ) {
      const err = new Error('Cannot change GOD (@altaga) role');
      err.status = 403;
      throw err;
    }

    await Users.doc(id).update({ role: toPasskeyRole(next) });
    results.push({ id, role: next });
  }
  return results;
}

export async function deletePasskeyUser(id, actorRole = 'GOD') {
  if (!isGodRole(actorRole) && !isAdminRole(actorRole)) {
    const err = new Error('Insufficient role to delete users');
    err.status = 403;
    throw err;
  }
  const doc = await Users.doc(id).get();
  if (!doc.exists) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }
  const data = doc.data() || {};
  const current = String(data.role || 'user').toLowerCase();
  if (
    current === 'god' ||
    passkeyNormalize(data.username || data.usernameLower) === getGodUsernameLower()
  ) {
    const err = new Error('Cannot delete GOD (@altaga)');
    err.status = 403;
    throw err;
  }
  if (isAdminRole(actorRole) && current === 'admin') {
    const err = new Error('ADMIN cannot delete another ADMIN');
    err.status = 403;
    throw err;
  }

  await Users.doc(id).delete();
}

/** Resolve mint targets from passkey user ids (EVM required). */
export async function resolveMintTargetsFromPasskeyIds(passkeyUserIds) {
  const targets = [];
  for (const id of passkeyUserIds) {
    const user = await getUserById(id);
    if (!user) continue;
    const address = (user.evmAddress || user.address || '').toLowerCase();
    if (!address || address === '0x0') {
      const err = new Error(
        `User @${user.username || id} has no EVM address — cannot mint`,
      );
      err.status = 400;
      throw err;
    }
    const name = user.username
      ? `@${String(user.username).replace(/^@/, '')}`
      : '';
    targets.push({ passkeyUserId: id, userId: id, address, name });
  }
  return targets;
}
