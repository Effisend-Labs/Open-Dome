import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { Users, getUserByUsername, getUserPasskeys } from '../../../utilsAPI/passkeyDb';

const getDynamicRpID = (req) => {
  try {
    const origin = req.headers.get('origin') || 'http://localhost';
    let host = new URL(origin).hostname;
    if (host.endsWith('.opendome.xyz') || host === 'opendome.xyz') return 'opendome.xyz';
    return host;
  } catch(e) { return 'localhost'; }
};

export const POST = async (request) => {
  const rpID = getDynamicRpID(request);
  console.log('[Passkey API] POST /api/passkey/login-options initiated');
  try {
    const { username } = await request.json();
    console.log(`[Passkey API] login-options username: ${username}`);

    if (!username) {
      return Response.json({ error: 'Username is required' }, { status: 400 });
    }

    const user = await getUserByUsername(username);
    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const userPasskeys = await getUserPasskeys(user.id);
    
    // Generate auth options allowing any of the user's previously registered credentials
    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: userPasskeys.map(passkey => ({
        id: Buffer.from(passkey.credentialID, 'base64url'),
        type: 'public-key',
        transports: passkey.transports,
      })),
      userVerification: 'preferred',
    });

    // Save the auth challenge for verification
    await Users.doc(user.id).update({
      currentChallenge: options.challenge
    });

    return Response.json({ options, userId: user.id });
  } catch (e) {
    console.error('[Passkey API] Error generating login options:', e);
    return Response.json({ error: e.message }, { status: 500 });
  }
};
