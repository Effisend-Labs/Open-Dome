import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { Users, Passkeys, getUserById, getPasskeyById } from '../../../utilsAPI/passkeyDb';
import jwt from 'jsonwebtoken';

const getDynamicRpID = (req) => {
  try {
    const origin = req.headers.get('origin') || 'http://localhost';
    let host = new URL(origin).hostname;
    if (host.endsWith('.opendome.xyz') || host === 'opendome.xyz') return 'opendome.xyz';
    return host;
  } catch(e) { return 'localhost'; }
};
const JWT_SECRET =
  process.env.JWT_SECRET ||
  '275f0edac42d0454d77f9bb62ea812b70b1f3a1dac5d5fbca651e4819e438c52';

export const POST = async (request) => {
  const expectedRPID = getDynamicRpID(request);
  const expectedOrigin = request.headers.get('origin') || 'http://localhost:8082';
  console.log('[Passkey API] POST /api/passkey/login-verify initiated');
  try {
    const { userId, credentialResponse } = await request.json();
    console.log(`[Passkey API] login-verify userId: ${userId}`);

    if (!userId || !credentialResponse) {
      return Response.json(
        { error: 'User ID and credentialResponse are required' },
        { status: 400 }
      );
    }

    const user = await getUserById(userId);
    if (!user || !user.currentChallenge) {
      return Response.json(
        { error: 'User not found or no authentication challenge found' },
        { status: 400 }
      );
    }

    const passkey = await getPasskeyById(credentialResponse.id);
    if (!passkey || passkey.userId !== user.id) {
      return Response.json(
        { error: 'Passkey not found or does not belong to this user' },
        { status: 404 }
      );
    }

    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: credentialResponse,
        expectedChallenge: user.currentChallenge,
        expectedOrigin,
        expectedRPID,
        credential: {
          id: passkey.credentialID,
          publicKey: Buffer.from(passkey.publicKey, 'base64'),
          counter: passkey.counter,
        },
      });
    } catch (error) {
      console.error('[Passkey API] Authentication verification failed:', error);
      return Response.json({ error: error.message }, { status: 400 });
    }

    const { verified, authenticationInfo } = verification;

    if (verified) {
      await Passkeys.doc(passkey.id).update({
        counter: authenticationInfo.newCounter,
      });

      await Users.doc(user.id).update({ currentChallenge: null });

      const token = jwt.sign(
        {
          userId: user.id,
          username: user.username,
          role: 'user',
          evm: user.evmAddress || undefined,
        },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      return Response.json({
        verified: true,
        token,
        message: 'Successfully logged in via Passkey!',
      });
    }

    return Response.json({ error: 'Verification failed for unknown reasons' }, { status: 400 });
  } catch (e) {
    console.error('[Passkey API] Error during login verification:', e);
    return Response.json({ error: e.message }, { status: 500 });
  }
};
