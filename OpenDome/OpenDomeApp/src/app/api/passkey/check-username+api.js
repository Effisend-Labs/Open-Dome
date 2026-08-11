import {
  isUsernameTaken,
  normalizeUsername,
} from '../../../utilsAPI/passkeyDb';

/** Fast username availability check (case-insensitive). */
export const POST = async (request) => {
  try {
    const body = await request.json().catch(() => ({}));
    const usernameLower = normalizeUsername(body?.username);

    if (!usernameLower) {
      return Response.json(
        { available: false, error: 'Username is required' },
        { status: 400 }
      );
    }

    if (!/^[a-z0-9_]{3,32}$/.test(usernameLower)) {
      return Response.json({
        available: false,
        username: usernameLower,
        error:
          'Username must be 3–32 characters: letters, numbers, and underscore only',
      });
    }

    const taken = await isUsernameTaken(usernameLower);
    return Response.json({
      available: !taken,
      username: usernameLower,
      ...(taken
        ? { error: 'Username already taken. Please sign in instead.' }
        : {}),
    });
  } catch (e) {
    console.error('[Passkey API] check-username error:', e);
    return Response.json({ error: e.message }, { status: 500 });
  }
};
