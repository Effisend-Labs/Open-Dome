import { generateRegistrationOptions } from '@simplewebauthn/server';
import { Users, getUserByUsername } from '../../../utilsAPI/passkeyDb';
import { v4 as uuidv4 } from 'uuid';

export const POST = async (request) => {
  const rpID = getDynamicRpID(request);
  console.log('[Passkey API] POST /api/passkey/register-options initiated');
  try {
    const originStr = request.headers.get('origin') || '';
    let rpID = 'localhost';
    if (originStr.includes('opendome.xyz')) rpID = 'opendome.xyz';
    else if (originStr.includes('opendome.expo.app')) rpID = 'opendome.expo.app';
    const rpName = 'Open-Dome Sandbox';

    const { username } = await request.json();
    console.log(`[Passkey API] register-options username: ${username}`);

    if (!username) {
      return Response.json({ error: 'Username is required' }, { status: 400 });
    }

    // 1. Find or create the user
    let user = await getUserByUsername(username);
    if (!user) {
      const newId = uuidv4();
      user = { id: newId, username };
      await Users.doc(newId).set(user);
    } else {
      // User already exists, they should use login, not register.
      return Response.json({ error: 'User already exists. Please sign in instead.' }, { status: 400 });
    }

    // 2. Generate registration options
    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: new Uint8Array(Buffer.from(user.id)),
      userName: user.username,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'preferred',
      },
      // You can also pass excludeCredentials if you fetch existing passkeys for the user
    });

    // 3. Save the challenge to the user in Firestore so we can verify it in the next step
    await Users.doc(user.id).update({
      currentChallenge: options.challenge
    });

    return Response.json({ options, userId: user.id });
  } catch (e) {
    console.error('[Passkey API] Error generating register options:', e);
    return Response.json({ error: e.message }, { status: 500 });
  }
};
