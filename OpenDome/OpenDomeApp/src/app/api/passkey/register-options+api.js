import { generateRegistrationOptions } from '@simplewebauthn/server';
import { randomUUID } from 'crypto';
import { Users, getUserByUsername } from '../../../utilsAPI/passkeyDb';

const rpName = 'OpenDome';
const getDynamicRpID = (req) => {
  try {
    const origin = req.headers.get('origin') || 'http://localhost';
    const host = new URL(origin).hostname;
    if (host === 'opendome.xyz' || host.endsWith('.opendome.xyz')) return 'opendome.xyz';
    if (host.endsWith('.expo.app')) return host;
    return host;
  } catch {
    return 'localhost';
  }
};

export const POST = async (request) => {
  const rpID = getDynamicRpID(request);
  console.log('[Passkey API] POST /api/passkey/register-options initiated');
  try {
    const { username } = await request.json();
    console.log(`[Passkey API] register-options username: ${username}`);

    if (!username) {
      return Response.json({ error: 'Username is required' }, { status: 400 });
    }

    let user = await getUserByUsername(username);
    if (!user) {
      const newId = randomUUID();
      user = { id: newId, username };
      await Users.doc(newId).set(user);
    } else if (user.currentChallenge == null && user.evmAddress) {
      return Response.json(
        { error: 'User already exists. Please sign in instead.' },
        { status: 400 }
      );
    }

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: new TextEncoder().encode(user.id),
      userName: user.username,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'preferred',
      },
    });

    await Users.doc(user.id).update({
      currentChallenge: options.challenge,
    });

    return Response.json({ options, userId: user.id });
  } catch (e) {
    console.error('[Passkey API] Error generating register options:', e);
    return Response.json(
      { error: e.message || 'Failed to generate registration options' },
      { status: 500 }
    );
  }
};
