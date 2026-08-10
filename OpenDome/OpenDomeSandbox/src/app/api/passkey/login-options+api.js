import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { Users } from '../../../utilsAPI/passkeyDb';
import { v4 as uuidv4 } from 'uuid';

export const POST = async (request) => {
  const rpID = getDynamicRpID(request);
  console.log('[Passkey API] POST /api/passkey/login-options initiated');
  try {
    const originStr = request.headers.get('origin') || '';
    let rpID = 'localhost';
    if (originStr.includes('opendome.xyz')) rpID = 'opendome.xyz';
    else if (originStr.includes('opendome.expo.app')) rpID = 'opendome.expo.app';

    // Generate auth options allowing ANY of the user's previously registered credentials
    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: 'preferred',
    });

    const challengeId = uuidv4();

    // Save the auth challenge globally for verification (discoverable credentials don't know user yet)
    await Users.firestore.collection('Challenges').doc(challengeId).set({
      challenge: options.challenge,
      createdAt: new Date().toISOString()
    });

    return Response.json({ options, challengeId });
  } catch (e) {
    console.error('[Passkey API] Error generating login options:', e);
    return Response.json({ error: e.message }, { status: 500 });
  }
};
