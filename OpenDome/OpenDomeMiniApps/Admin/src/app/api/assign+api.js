import {
  requireBridgeActor,
  resolveMintTargetsFromPasskeyIds,
} from '../../utilsAPI/adminDb';
import { mintPassesToAddresses } from '../../utilsAPI/mintService';

/**
 * GOD-only multi-user batch assign (Admin UI).
 * Body: { userIds, ticketIds, amounts, network? }
 */
export async function POST(request) {
  try {
    const actor = await requireBridgeActor(request);
    if (!actor || actor.type !== 'god-jwt') {
      return Response.json(
        { error: 'Unauthorized — OpenDome JWT for @altaga (god) required' },
        { status: 401 }
      );
    }

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
      network || 'base'
    );

    return Response.json({
      success: true,
      message: `Assigned tickets to ${targets.length} users`,
      results,
    });
  } catch (err) {
    const status = err.status || 500;
    return Response.json({ error: err.message }, { status });
  }
}
