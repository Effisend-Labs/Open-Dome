import { requireBridgeActor, isGodRole, canAssignRole } from '../../../utilsAPI/adminDb';
import {
  getAllAdminUsers,
  createAdminUser,
  updateAdminUserRole,
  deleteAdminUser,
} from '../../../utilsAPI/adminDb';

async function requireGodJwt(request) {
  const actor = await requireBridgeActor(request);
  if (!actor || actor.type !== 'god-jwt') return null;
  return actor;
}

export async function GET(request) {
  const actor = await requireGodJwt(request);
  if (!actor) {
    return Response.json(
      { error: 'Unauthorized — OpenDome JWT for @altaga (god) required' },
      { status: 401 }
    );
  }

  const users = await getAllAdminUsers();
  return Response.json(users.map(({ password, ...u }) => u));
}

export async function POST(request) {
  const actor = await requireGodJwt(request);
  if (!actor) {
    return Response.json(
      { error: 'Unauthorized — OpenDome JWT for @altaga (god) required' },
      { status: 401 }
    );
  }

  const { address, name, role } = await request.json();
  if (!address) {
    return Response.json({ error: 'Address is required' }, { status: 400 });
  }

  try {
    const newUser = await createAdminUser(
      { address, name, role: role || 'USER' },
      'GOD'
    );
    return Response.json(newUser);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 403 });
  }
}

export async function PUT(request) {
  const actor = await requireGodJwt(request);
  if (!actor) {
    return Response.json(
      { error: 'Unauthorized — OpenDome JWT for @altaga (god) required' },
      { status: 401 }
    );
  }

  const { id, role } = await request.json();
  if (!canAssignRole('GOD', role)) {
    return Response.json(
      {
        error: isGodRole(role)
          ? 'GOD is unique and can only be assigned manually'
          : `Cannot assign ${role}`,
      },
      { status: 403 }
    );
  }

  try {
    await updateAdminUserRole(id, role, 'GOD');
    return Response.json({ success: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 403 });
  }
}

export async function DELETE(request) {
  const actor = await requireGodJwt(request);
  if (!actor) {
    return Response.json(
      { error: 'Unauthorized — OpenDome JWT for @altaga (god) required' },
      { status: 401 }
    );
  }

  const id = new URL(request.url).searchParams.get('id');
  try {
    await deleteAdminUser(id, 'GOD');
    return Response.json({ success: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 403 });
  }
}
