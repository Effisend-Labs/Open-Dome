import { verifyGodJwt } from '../../../utilsAPI/godJwt';
import { seedGodUser } from '../../../utilsAPI/adminDb';

/** Session check — OpenDome host JWT for @altaga / god only */
export async function GET(request) {
  await seedGodUser();
  const claims = verifyGodJwt(request);
  if (!claims) {
    return Response.json({ authenticated: false }, { status: 401 });
  }
  return Response.json({
    authenticated: true,
    user: {
      name: `@${String(claims.username || 'altaga').replace(/^@/, '')}`,
      role: 'GOD',
      username: claims.username,
      userId: claims.userId,
      evmAddress: claims.evm,
    },
  });
}
