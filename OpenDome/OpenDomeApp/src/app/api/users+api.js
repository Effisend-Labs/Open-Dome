import { verifyStaffFromRequest } from '../../utilsAPI/staffAuth';
import {
  canAssignRole,
  isGodRole,
} from '../../utilsAPI/roles';
import {
  searchPasskeyUsers,
  bulkUpdatePasskeyRoles,
  deletePasskeyUser,
  usersListMeta,
} from '../../utilsAPI/adminUsers';

async function requireGod(request) {
  const actor = await verifyStaffFromRequest(request);
  if (!actor || actor.role !== 'god') return null;
  return actor;
}

/**
 * List onboarded passkey users.
 * ?scope=mint includes GOD (batch mint targets). Optional ?q=
 */
export async function GET(request) {
  try {
    const actor = await requireGod(request);
    if (!actor) {
      return Response.json(
        { error: 'Unauthorized — OpenDome JWT for @altaga (god) required' },
        { status: 401 },
      );
    }

    const url = new URL(request.url);
    const q = url.searchParams.get('q') || '';
    const scope = url.searchParams.get('scope') || 'roles';
    const includeGod = scope === 'mint';

    const users = await searchPasskeyUsers(q, { includeGod });
    users.sort((a, b) =>
      String(a.username || '').localeCompare(String(b.username || '')),
    );

    return Response.json({
      users,
      total: users.length,
      ...usersListMeta(scope),
    });
  } catch (e) {
    console.error('[App /api/users GET]', e);
    return Response.json(
      { error: e.message || 'Failed to load users' },
      { status: 500 },
    );
  }
}

/**
 * Bulk role update: { updates: [{ id, role }, ...] } or { id, role }
 */
export async function PUT(request) {
  try {
    const actor = await requireGod(request);
    if (!actor) {
      return Response.json(
        { error: 'Unauthorized — OpenDome JWT for @altaga (god) required' },
        { status: 401 },
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
          { status: 403 },
        );
      }
    }

    const results = await bulkUpdatePasskeyRoles(updates, 'GOD');
    return Response.json({ success: true, results });
  } catch (e) {
    console.error('[App /api/users PUT]', e);
    return Response.json({ error: e.message }, { status: e.status || 500 });
  }
}

/** Delete onboarded passkey user: ?id= */
export async function DELETE(request) {
  try {
    const actor = await requireGod(request);
    if (!actor) {
      return Response.json(
        { error: 'Unauthorized — OpenDome JWT for @altaga (god) required' },
        { status: 401 },
      );
    }

    const id = new URL(request.url).searchParams.get('id');
    if (!id) {
      return Response.json({ error: 'id is required' }, { status: 400 });
    }
    await deletePasskeyUser(id, 'GOD');
    return Response.json({ success: true });
  } catch (e) {
    console.error('[App /api/users DELETE]', e);
    return Response.json({ error: e.message }, { status: e.status || 500 });
  }
}
