import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { Users, Passkeys, Wallets, getUserById } from '../../../utilsAPI/passkeyDb';
import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';
import { randomUUID } from 'crypto';

const getDynamicRpID = (req) => {
  try {
    const origin = req.headers.get('origin') || 'http://localhost';
    let host = new URL(origin).hostname;
    if (host.endsWith('.opendome.xyz') || host === 'opendome.xyz') return 'opendome.xyz';
    return host;
  } catch(e) { return 'localhost'; }
};

export const POST = async (request) => {
  const expectedRPID = getDynamicRpID(request);
  const expectedOrigin = request.headers.get("origin") || "http://localhost:8082";
  console.log('[Passkey API] POST /api/passkey/register-verify initiated');
  try {
    const { userId, credentialResponse } = await request.json();
    console.log(`[Passkey API] register-verify userId: ${userId}`);

    if (!userId || !credentialResponse) {
      return Response.json({ error: 'User ID and credentialResponse are required' }, { status: 400 });
    }

    // 1. Fetch the user and their expected challenge
    const user = await getUserById(userId);
    if (!user || !user.currentChallenge) {
      return Response.json({ error: 'User not found or no registration challenge found' }, { status: 400 });
    }

    // Dynamic Origin Check (Optional, but recommended for flexible dev environments)
    // The exact origin the client is running on (e.g. http://localhost:8083 or exp://...)
    

    // 2. Verify the response
    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: credentialResponse,
        expectedChallenge: user.currentChallenge,
        expectedOrigin: expectedOrigin,
        expectedRPID: expectedRPID,
      });
    } catch (error) {
      console.error('[Passkey API] Verification failed:', error);
      return Response.json({ error: error.message }, { status: 400 });
    }

    const { verified, registrationInfo } = verification;

    if (verified && registrationInfo) {
      const { credentialID, credentialPublicKey, counter } = registrationInfo;

      // 3. Save the new passkey to Firestore
      const newPasskey = {
        userId: user.id,
        // Convert Uint8Arrays to Base64 strings for Firestore storage
        credentialID: Buffer.from(credentialID).toString('base64url'),
        publicKey: Buffer.from(credentialPublicKey).toString('base64'),
        counter,
        transports: credentialResponse.response.transports || [],
        createdAt: new Date().toISOString()
      };

      await Passkeys.doc(newPasskey.credentialID).set(newPasskey);

      // 4. Generate an EVM wallet for the user automatically via Circle MPC
      const circleClient = initiateDeveloperControlledWalletsClient({
        apiKey: process.env.CIRCLE_API_KEY,
        entitySecret: process.env.CIRCLE_ENTITY_SECRET,
      });

      console.log('[Passkey API] Generating Circle Developer-Controlled Wallets across ALL EVMs...');
      const walletRes = await circleClient.createWallets({
        blockchains: ['ARB', 'AVAX', 'BASE', 'ETH', 'MATIC', 'OP'], 
        count: 1, // 1 wallet per blockchain
        accountType: 'EOA', // EOA ensures the address is identical across all EVM chains
        walletSetId: 'afd0591a-e99a-5883-89e7-a1c27316eee8',
        idempotencyKey: randomUUID()
      });

      // Map the generated wallets so we know the specific walletId per blockchain
      const walletIds = {};
      let primaryAddress = '';
      walletRes.data.wallets.forEach(w => {
        walletIds[w.blockchain] = w.id;
        primaryAddress = w.address; // Will be identical across all EOAs
      });
      
      const newWallet = {
        userId: user.id,
        address: primaryAddress,
        walletIds: walletIds, // Map of { "BASE": "id1", "ETH": "id2", ... }
        createdAt: new Date().toISOString()
      };

      await Wallets.doc(user.id).set(newWallet);

      // Clear the challenge
      await Users.doc(user.id).update({ 
        currentChallenge: null,
        evmAddress: generatedWallet.address // Store the public EVM address on the user
      });

      return Response.json({ 
        verified: true,
        evmAddress: generatedWallet.address
      });
    }

    return Response.json({ error: 'Verification failed for unknown reasons' }, { status: 400 });
  } catch (e) {
    console.error('[Passkey API] Error during register verification:', e);
    return Response.json({ error: e.message }, { status: 500 });
  }
};
