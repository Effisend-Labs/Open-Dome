import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import {
  Users,
  Passkeys,
  Wallets,
  Challenges,
  getUserById,
  getPasskeyById,
} from '../../../utilsAPI/passkeyDb';
import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';

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

const JWT_SECRET =
  process.env.JWT_SECRET ||
  '275f0edac42d0454d77f9bb62ea812b70b1f3a1dac5d5fbca651e4819e438c52';

export const POST = async (request) => {
  const expectedRPID = getDynamicRpID(request);
  const expectedOrigin =
    request.headers.get('origin') || 'http://localhost:8082';
  console.log('[Passkey API] POST /api/passkey/login-verify initiated');
  try {
    const { challengeId, assertionResponse } = await request.json();
    console.log(`[Passkey API] login-verify challengeId: ${challengeId}`);

    if (!challengeId || !assertionResponse) {
      return Response.json(
        { error: 'challengeId and assertionResponse are required' },
        { status: 400 }
      );
    }

    const challengeDoc = await Challenges.doc(challengeId).get();
    if (!challengeDoc.exists) {
      return Response.json(
        { error: 'Authentication challenge expired or not found' },
        { status: 400 }
      );
    }
    const expectedChallenge = challengeDoc.data().challenge;

    const passkey = await getPasskeyById(assertionResponse.id);
    if (!passkey) {
      return Response.json(
        { error: 'Passkey not found in database' },
        { status: 404 }
      );
    }

    const user = await getUserById(passkey.userId);
    if (!user) {
      return Response.json(
        { error: 'User associated with this passkey not found' },
        { status: 404 }
      );
    }

    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: assertionResponse,
        expectedChallenge,
        expectedOrigin,
        expectedRPID,
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
      await Passkeys.doc(passkey.id).update({
        counter: authenticationInfo.newCounter,
      });

      await Challenges.doc(challengeId).delete();

      // Backfill Solana for users registered before Solana was wired up
      let solanaAddress = user.solanaAddress;
      if (!solanaAddress) {
        console.log(
          '[Passkey API] Legacy user missing Solana wallet — provisioning via Circle...'
        );
        const circleClient = initiateDeveloperControlledWalletsClient({
          apiKey: process.env.CIRCLE_API_KEY,
          entitySecret: process.env.CIRCLE_ENTITY_SECRET,
        });
        const solWalletRes = await circleClient.createWallets({
          blockchains: ['SOL'],
          count: 1,
          walletSetId: 'afd0591a-e99a-5883-89e7-a1c27316eee8',
          idempotencyKey: randomUUID(),
        });
        solanaAddress = solWalletRes.data?.wallets?.[0]?.address || '';
        if (!solanaAddress) {
          throw new Error(
            'Circle createWallets returned no Solana wallet address'
          );
        }

        await Users.doc(user.id).update({ solanaAddress });
        const walletSnap = await Wallets.doc(user.id).get();
        if (walletSnap.exists) {
          const walletData = walletSnap.data() || {};
          await Wallets.doc(user.id).set(
            {
              solanaAddress,
              walletIds: {
                ...(walletData.walletIds || {}),
                SOL: solWalletRes.data.wallets[0].id,
              },
            },
            { merge: true }
          );
        } else {
          await Wallets.doc(user.id).set({
            userId: user.id,
            address: user.evmAddress || null,
            solanaAddress,
            walletIds: { SOL: solWalletRes.data.wallets[0].id },
            createdAt: new Date().toISOString(),
          });
        }
        user.solanaAddress = solanaAddress;
      }

      const token = jwt.sign(
        {
          userId: user.id,
          username: user.username,
          role: 'user',
          evm: user.evmAddress || undefined,
          solana: solanaAddress || undefined,
        },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      return Response.json({
        verified: true,
        token,
        evmAddress: user.evmAddress || null,
        solanaAddress: solanaAddress || null,
        message: 'Successfully logged in via Passkey!',
      });
    }

    return Response.json(
      { error: 'Verification failed for unknown reasons' },
      { status: 400 }
    );
  } catch (e) {
    console.error('[Passkey API] Error during login verification:', e);
    return Response.json({ error: e.message }, { status: 500 });
  }
};
