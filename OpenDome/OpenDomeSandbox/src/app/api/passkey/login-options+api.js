import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { Challenges } from '../../../utilsAPI/passkeyDb';
import { v4 as uuidv4 } from 'uuid';

export const POST = async (request) => {
  console.log('[Passkey API] POST /api/passkey/login-options initiated');
  try {
    const originStr = request.headers.get('origin') || '';
    let rpID = 'localhost';
    if (originStr.includes('opendome.xyz')) rpID = 'opendome.xyz';

    // Generate auth options allowing ANY of the user's previously registered credentials
    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: 'preferred',
    });

    const challengeId = uuidv4();

    // Save the auth challenge globally for verification (discoverable credentials don't know user yet)
    await Challenges.doc(challengeId).set({
      challenge: options.challenge,
      createdAt: new Date().toISOString()
    });

    return Response.json({ options, challengeId });
  } catch (e) {
    console.error('[Passkey API] Error generating login options:', e);
    return Response.json({ error: e.message }, { status: 500 });
  }
};
