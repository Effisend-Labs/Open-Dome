import {
  requireBridgeActor,
  isGodRole,
  canAssignRole,
  searchPasskeyUsers,
  bulkUpdatePasskeyRoles,
  deletePasskeyUser,
} from '../../utilsAPI/adminDb';
import { getRuntimeLabel, firestoreCollection } from '../../utilsAPI/runtimeEnv';

async function requireGodJwt(request) {
  const actor = await requireBridgeActor(request);
  if (!actor || actor.type !== 'god-jwt') return null;
  return actor;
}

/**
 * List ALL onboarded passkey users for current runtime:
 *   local → DevUsers
 *   admin.opendome.xyz / Vercel → Users
 * Optional ?q= filters client-side after full fetch.
 */
export async function GET(request) {
  const actor = await requireGodJwt(request);
  if (!actor) {
    return Response.json(
      { error: 'Unauthorized — OpenDome JWT for @altaga (god) required' },
      { status: 401 }
    );
  }

  const q = new URL(request.url).searchParams.get('q') || '';
  const users = await searchPasskeyUsers(q);
  users.sort((a, b) =>
    String(a.username || '').localeCompare(String(b.username || ''))
  );

  return Response.json({
    users,
    total: users.length,
    collection: firestoreCollection('Users'),
    env: getRuntimeLabel(),
  });
}

/**
 * Bulk role update:
 *   { updates: [{ id, role }, ...] }
 * or single: { id, role }
 */
export async function PUT(request) {
  const actor = await requireGodJwt(request);
  if (!actor) {
    return Response.json(
      { error: 'Unauthorized — OpenDome JWT for @altaga (god) required' },
      { status: 401 }
    );
  }

  const body = await request.json();
  const updates = Array.isArray(body.updates)
    ? body.updates
    : body.id
      ? [{ id: body.id, role: body.role }]
      : null;

  if (!updates?.length) {
    return Response.json({ error: 'updates[] or id+role required' }, { status: 400 });
  }

  for (const u of updates) {
    if (!canAssignRole('GOD', u.role)) {
      return Response.json(
        {
          error: isGodRole(u.role)
            ? 'GOD is unique and can only be assigned manually'
            : `Cannot assign ${u.role}`,
        },
        { status: 403 }
      );
    }
  }

  try {
    const results = await bulkUpdatePasskeyRoles(updates, 'GOD');
    return Response.json({ success: true, results });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 403 });
  }
}

/** Delete onboarded passkey user: ?id= */
export async function DELETE(request) {
  const actor = await requireGodJwt(request);
  if (!actor) {
    return Response.json(
      { error: 'Unauthorized — OpenDome JWT for @altaga (god) required' },
      { status: 401 }
    );
  }

  const id = new URL(request.url).searchParams.get('id');
  if (!id) {
    return Response.json({ error: 'id is required' }, { status: 400 });
  }
  try {
    await deletePasskeyUser(id, 'GOD');
    return Response.json({ success: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 403 });
  }
}
