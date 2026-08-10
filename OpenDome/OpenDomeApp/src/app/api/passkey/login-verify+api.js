import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { Users, Passkeys, getUserById, getPasskeyById } from '../../../utilsAPI/passkeyDb';
import jwt from 'jsonwebtoken';

const expectedOrigin = 'http://localhost:8083'; 
const expectedRPID = 'localhost';
const JWT_SECRET = 'opendome-sandbox-mock-secret';

export const POST = async (request) => {
  console.log('[Passkey API] POST /api/passkey/login-verify initiated');
  try {
    const { userId, credentialResponse } = await request.json();
    console.log(`[Passkey API] login-verify userId: ${userId}`);

    if (!userId || !credentialResponse) {
      return Response.json({ error: 'User ID and credentialResponse are required' }, { status: 400 });
    }

    const user = await getUserById(userId);
    if (!user || !user.currentChallenge) {
      return Response.json({ error: 'User not found or no authentication challenge found' }, { status: 400 });
    }

    // Find the specific passkey the user authenticated with
    const passkey = await getPasskeyById(credentialResponse.id);
    if (!passkey || passkey.userId !== user.id) {
      return Response.json({ error: 'Passkey not found or does not belong to this user' }, { status: 404 });
    }

    const origin = request.headers.get('origin') || expectedOrigin;

    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: credentialResponse,
        expectedChallenge: user.currentChallenge,
        expectedOrigin: origin,
        expectedRPID: expectedRPID,
        authenticator: {
          credentialID: Buffer.from(passkey.credentialID, 'base64url'),
          credentialPublicKey: Buffer.from(passkey.publicKey, 'base64'),
          counter: passkey.counter,
        },
      });
    } catch (error) {
      console.error('[Passkey API] Authentication verification failed:', error);
      return Response.json({ error: error.message }, { status: 400 });
    }

    const { verified, authenticationInfo } = verification;

    if (verified) {
      // Update the counter in DB to prevent replay attacks
      await Passkeys.doc(passkey.id).update({
        counter: authenticationInfo.newCounter
      });

      // Clear the user's challenge
      await Users.doc(user.id).update({ currentChallenge: null });

      // Generate a mock JWT representing a successful Sandbox session
      const token = jwt.sign({ 
        userId: user.id, 
        username: user.username,
        role: 'sandbox_user'
      }, JWT_SECRET, { expiresIn: '2h' });

      return Response.json({ 
        verified: true,
        token,
        message: "Successfully logged in via Passkey!"
      });
    }

    return Response.json({ error: 'Verification failed for unknown reasons' }, { status: 400 });
  } catch (e) {
    console.error('[Passkey API] Error during login verification:', e);
    return Response.json({ error: e.message }, { status: 500 });
  }
};
