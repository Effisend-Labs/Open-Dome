import { Users, Passkeys, Wallets, getUserByUsername, getUserPasskeys } from '../../../utilsAPI/passkeyDb';

export const POST = async (request) => {
  if (process.env.NODE_ENV !== 'development') {
    return Response.json({ error: 'Not allowed in production' }, { status: 403 });
  }
  
  try {
    const { username } = await request.json();
    console.log(`[DEBUG API] Requested to nuke user: ${username}`);
    
    if (!username) return Response.json({ error: 'Username required' }, { status: 400 });

    const user = await getUserByUsername(username);
    if (!user) {
      console.log(`[DEBUG API] User ${username} not found. Nothing to delete.`);
      return Response.json({ message: 'User not found, nothing to delete' });
    }

    // Delete passkeys
    const passkeys = await getUserPasskeys(user.id);
    for (const pk of passkeys) {
      await Passkeys.doc(pk.id).delete();
    }
    console.log(`[DEBUG API] Deleted ${passkeys.length} passkeys for ${username}.`);

    // Delete wallets
    await Wallets.doc(user.id).delete();
    console.log(`[DEBUG API] Deleted wallets for ${username}.`);

    // Delete user
    await Users.doc(user.id).delete();
    console.log(`[DEBUG API] NUKED user ${username} completely.`);

    return Response.json({ message: `Successfully deleted user ${username} and their passkeys.` });
  } catch (e) {
    console.error(`[DEBUG API] Error:`, e);
    return Response.json({ error: e.message }, { status: 500 });
  }
};
