import { readBearerToken } from '../../utilsAPI/staffAuth';
import { refreshPasskeyJwt } from '../../utilsAPI/passkeySession';

/**
 * Re-issue the OpenDome JWT from the live Firestore role.
 * Host uses this so Scanner/Admin appear after a god role change
 * without requiring a full passkey login.
 */
export async function POST(request) {
  try {
    const token = readBearerToken(request);
    if (!token) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await refreshPasskeyJwt(token);
    return Response.json({ success: true, ...session });
  } catch (e) {
    const status = e.status || 500;
    if (status >= 500) {
      console.error('[App /api/session POST]', e);
    }
    return Response.json(
      { error: e.message || 'Failed to refresh session' },
      { status },
    );
  }
}
