import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { Users, Passkeys, Wallets, getUserById } from '../../../utilsAPI/passkeyDb';
import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';

export const POST = async (request) => {
  const expectedRPID = getDynamicRpID(request);
  const expectedOrigin = request.headers.get("origin") || "http://localhost:8082";
  const JWT_SECRET = process.env.JWT_SECRET || '275f0edac42d0454d77f9bb62ea812b70b1f3a1dac5d5fbca651e4819e438c52';
  console.log('[Passkey API] POST /api/passkey/register-verify initiated');
  try {
    const originStr = request.headers.get('origin') || '';
    let expectedRPID = 'localhost';
    if (originStr.includes('opendome.xyz')) expectedRPID = 'opendome.xyz';
    else if (originStr.includes('opendome.expo.app')) expectedRPID = 'opendome.expo.app';
    const expectedOrigin = originStr || 'http://localhost:8083';

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

    // Dynamic Origin Check
    

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
      const { credential } = registrationInfo;
      const { id, publicKey, counter } = credential;

      // 3. Save the new passkey to Firestore
      const newPasskey = {
        userId: user.id,
        credentialID: id, // id is already base64url encoded string
        publicKey: Buffer.from(publicKey).toString('base64'),
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

      console.log('[Passkey API] Generating Circle Developer-Controlled Wallets across EVMs and Solana...');
      const evmWalletRes = await circleClient.createWallets({
        blockchains: ['ARB', 'AVAX', 'BASE', 'ETH', 'MATIC', 'OP'], 
        count: 1, // 1 wallet per blockchain
        accountType: 'EOA', // EOA ensures the address is identical across all EVM chains
        walletSetId: 'afd0591a-e99a-5883-89e7-a1c27316eee8',
        idempotencyKey: randomUUID()
      });

      const solWalletRes = await circleClient.createWallets({
        blockchains: ['SOL'], 
        count: 1,
        walletSetId: 'afd0591a-e99a-5883-89e7-a1c27316eee8',
        idempotencyKey: randomUUID()
      });

      // Map the generated wallets so we know the specific walletId per blockchain
      const walletIds = {};
      let evmAddress = '';
      let solanaAddress = '';
      
      evmWalletRes.data.wallets.forEach(w => {
        walletIds[w.blockchain] = w.id;
        if (!evmAddress) evmAddress = w.address;
      });
      
      solWalletRes.data.wallets.forEach(w => {
        walletIds[w.blockchain] = w.id;
        solanaAddress = w.address;
      });
      
      const newWallet = {
        userId: user.id,
        address: evmAddress, // Primary EVM address
        solanaAddress: solanaAddress,
        walletIds: walletIds, // Map of { "BASE": "id1", "ETH": "id2", "SOL": "id3" ... }
        createdAt: new Date().toISOString()
      };

      await Wallets.doc(user.id).set(newWallet);

      // Clear the challenge
      await Users.doc(user.id).update({ 
        currentChallenge: null,
        evmAddress: evmAddress, // Store the public EVM address on the user
        solanaAddress: solanaAddress // Store the Solana address on the user
      });

      // Generate a mock JWT representing a successful Sandbox session
      const token = jwt.sign({ 
        userId: user.id, 
        username: user.username,
        role: 'sandbox_user',
        evm: evmAddress,
        solana: solanaAddress
      }, JWT_SECRET, { expiresIn: '30d' });

      return Response.json({ 
        verified: true,
        token,
        evmAddress: evmAddress,
        solanaAddress: solanaAddress
      });
    }

    return Response.json({ error: 'Verification failed for unknown reasons' }, { status: 400 });
  } catch (e) {
    console.error('[Passkey API] Error during register verification:', e);
    return Response.json({ error: e.message }, { status: 500 });
  }
};
