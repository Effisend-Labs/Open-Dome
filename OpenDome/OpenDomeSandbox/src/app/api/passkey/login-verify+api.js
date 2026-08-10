import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { Users, Passkeys, Wallets, getUserById, getPasskeyById } from '../../../utilsAPI/passkeyDb';
import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';

export const POST = async (request) => {
  const expectedRPID = getDynamicRpID(request);
  const expectedOrigin = request.headers.get("origin") || "http://localhost:8082";
  const JWT_SECRET = process.env.JWT_SECRET || '275f0edac42d0454d77f9bb62ea812b70b1f3a1dac5d5fbca651e4819e438c52';
  console.log('[Passkey API] POST /api/passkey/login-verify initiated');
  try {
    const originStr = request.headers.get('origin') || '';
    let expectedRPID = 'localhost';
    if (originStr.includes('opendome.xyz')) expectedRPID = 'opendome.xyz';
    else if (originStr.includes('opendome.expo.app')) expectedRPID = 'opendome.expo.app';
    const expectedOrigin = originStr || 'http://localhost:8083';

    const { challengeId, assertionResponse } = await request.json();
    console.log(`[Passkey API] login-verify challengeId: ${challengeId}`);

    if (!challengeId || !assertionResponse) {
      return Response.json({ error: 'challengeId and assertionResponse are required' }, { status: 400 });
    }

    const challengeDoc = await Users.firestore.collection('Challenges').doc(challengeId).get();
    if (!challengeDoc.exists) {
      return Response.json({ error: 'Authentication challenge expired or not found' }, { status: 400 });
    }
    const expectedChallenge = challengeDoc.data().challenge;

    // Find the specific passkey the user authenticated with
    const passkey = await getPasskeyById(assertionResponse.id);
    if (!passkey) {
      return Response.json({ error: 'Passkey not found in database' }, { status: 404 });
    }

    const user = await getUserById(passkey.userId);
    if (!user) {
      return Response.json({ error: 'User associated with this passkey not found' }, { status: 404 });
    }

    

    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: assertionResponse,
        expectedChallenge: expectedChallenge,
        expectedOrigin: expectedOrigin,
        expectedRPID: expectedRPID,
        credential: {
          id: passkey.credentialID,
          publicKey: Buffer.from(passkey.publicKey, 'base64'),
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

      // Clear the challenge
      await Users.firestore.collection('Challenges').doc(challengeId).delete();

      // Auto-provision Solana wallet for users who registered before Solana was added
      let solanaAddress = user.solanaAddress;
      if (!solanaAddress) {
        console.log('[Passkey API] Legacy user detected. Generating missing Solana wallet...');
        const circleClient = initiateDeveloperControlledWalletsClient({
          apiKey: process.env.CIRCLE_API_KEY,
          entitySecret: process.env.CIRCLE_ENTITY_SECRET,
        });
        const solWalletRes = await circleClient.createWallets({
          blockchains: ['SOL'],
          count: 1,
          walletSetId: 'afd0591a-e99a-5883-89e7-a1c27316eee8',
          idempotencyKey: randomUUID()
        });
        solanaAddress = solWalletRes.data.wallets[0].address;
        
        await Users.doc(user.id).update({ solanaAddress });
        
        const walletDoc = await Wallets.doc(user.id).get();
        if (walletDoc.exists) {
          const walletData = walletDoc.data();
          walletData.solanaAddress = solanaAddress;
          walletData.walletIds = walletData.walletIds || {};
          walletData.walletIds['SOL'] = solWalletRes.data.wallets[0].id;
          await Wallets.doc(user.id).update({
            solanaAddress: solanaAddress,
            walletIds: walletData.walletIds
          });
        }
        user.solanaAddress = solanaAddress;
      }

      // Generate a mock JWT representing a successful Sandbox session
      const token = jwt.sign({ 
        userId: user.id, 
        username: user.username,
        role: 'sandbox_user',
        evm: user.evmAddress,
        solana: user.solanaAddress
      }, JWT_SECRET, { expiresIn: '30d' });

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
