import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { Challenges } from '../../../utilsAPI/passkeyDb';
import { randomUUID } from 'crypto';

const getDynamicRpID = (req) => {
  try {
    const origin = req.headers.get('origin') || 'http://localhost';
    const host = new URL(origin).hostname;
    if (host.endsWith('.opendome.xyz') || host === 'opendome.xyz') return 'opendome.xyz';
    return host;
  } catch {
    return 'localhost';
  }
};

export const POST = async (request) => {
  const rpID = getDynamicRpID(request);
  console.log('[Passkey API] POST /api/passkey/login-options initiated');
  try {
    // Discoverable credentials: client sends empty body; do not require username/JSON.
    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: 'preferred',
    });

    const challengeId = randomUUID();
    await Challenges.doc(challengeId).set({
      challenge: options.challenge,
      createdAt: new Date().toISOString(),
    });

    return Response.json({ options, challengeId });
  } catch (e) {
    console.error('[Passkey API] Error generating login options:', e);
    return Response.json({ error: e.message }, { status: 500 });
  }
};
