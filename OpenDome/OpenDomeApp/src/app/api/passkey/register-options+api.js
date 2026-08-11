import { generateRegistrationOptions } from '@simplewebauthn/server';
import { randomUUID } from 'crypto';
import {
  Users,
  getUserByUsername,
  normalizeUsername,
} from '../../../utilsAPI/passkeyDb';

const rpName = 'OpenDome';

function getGodUsernameLower() {
  const raw = (process.env.ADMIN_USERNAME || 'altaga').trim().replace(/^@/, '');
  return raw.toLowerCase();
}

function isGodUsername(usernameLower) {
  return usernameLower === getGodUsernameLower();
}

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
    const body = await request.json();
    const rawUsername = body?.username;
    const usernameLower = normalizeUsername(rawUsername);
    console.log(
      `[Passkey API] register-options username: ${rawUsername} → ${usernameLower}`
    );

    if (!usernameLower) {
      return Response.json({ error: 'Username is required' }, { status: 400 });
    }

    if (!/^[a-z0-9_]{3,32}$/.test(usernameLower)) {
      return Response.json(
        {
          error:
            'Username must be 3–32 characters: letters, numbers, and underscore only',
        },
        { status: 400 }
      );
    }

    let user = await getUserByUsername(usernameLower);
    if (!user) {
      const newId = randomUUID();
      const displayName = String(rawUsername).trim();
      user = {
        id: newId,
        username: displayName,
        usernameLower,
        role: isGodUsername(usernameLower) ? 'god' : 'user',
      };
      await Users.doc(newId).set(user);
    } else if (user.currentChallenge == null && user.evmAddress) {
      return Response.json(
        { error: 'Username already taken. Please sign in instead.' },
        { status: 409 }
      );
    } else {
      const patch = {};
      if (!user.usernameLower) patch.usernameLower = usernameLower;
      if (isGodUsername(usernameLower) && user.role !== 'god') patch.role = 'god';
      if (Object.keys(patch).length) {
        await Users.doc(user.id).update(patch);
        user = { ...user, ...patch };
      }
    }

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: new TextEncoder().encode(user.id),
      userName: user.usernameLower || usernameLower,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'preferred',
      },
    });

    await Users.doc(user.id).update({
      currentChallenge: options.challenge,
      usernameLower: user.usernameLower || usernameLower,
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
