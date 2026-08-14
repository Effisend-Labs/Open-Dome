import {
  requireBridgeActor,
  resolveMintTargetsFromPasskeyIds,
} from '../../utilsAPI/adminDb';
import {
  mintPassesToAddresses,
  readAuthToken,
} from '../../utilsAPI/mintService';

/**
 * GOD-only multi-user batch assign (Admin UI).
 * Resolves targets locally, mints via OpenDomeApp platform key.
 * Body: { userIds, ticketIds, amounts, network? }
 */
export async function POST(request) {
  try {
    const actor = await requireBridgeActor(request);
    if (!actor || actor.type !== 'god-jwt') {
      return Response.json(
        { error: 'Unauthorized — OpenDome JWT for @altaga (god) required' },
        { status: 401 },
      );
    }

    const authToken = readAuthToken(request);
    const { userIds, ticketIds, amounts, network } = await request.json();
    if (!userIds?.length || !ticketIds?.length || !amounts?.length) {
      return Response.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const targets = await resolveMintTargetsFromPasskeyIds(userIds);
    if (!targets.length) {
      return Response.json({ error: 'No valid mint targets' }, { status: 400 });
    }

    const results = await mintPassesToAddresses(
      targets,
      ticketIds,
      amounts,
      network || 'base',
      authToken,
    );

    return Response.json({
      success: true,
      message: `Assigned tickets to ${targets.length} users via OpenDomeApp`,
      results,
    });
  } catch (err) {
    const status = err.status || 500;
    return Response.json({ error: err.message }, { status });
  }
}
