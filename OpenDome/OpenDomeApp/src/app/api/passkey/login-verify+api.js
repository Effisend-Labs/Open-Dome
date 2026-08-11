import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import {
  Users,
  Passkeys,
  Wallets,
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
    const { userId, credentialResponse } = await request.json();
    console.log(`[Passkey API] login-verify userId: ${userId}`);

    if (!userId || !credentialResponse) {
      return Response.json(
        { error: 'User ID and credentialResponse are required' },
        { status: 400 }
      );
    }

    const user = await getUserById(userId);
    if (!user || !user.currentChallenge) {
      return Response.json(
        { error: 'User not found or no authentication challenge found' },
        { status: 400 }
      );
    }

    const passkey = await getPasskeyById(credentialResponse.id);
    if (!passkey || passkey.userId !== user.id) {
      return Response.json(
        { error: 'Passkey not found or does not belong to this user' },
        { status: 404 }
      );
    }

    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: credentialResponse,
        expectedChallenge: user.currentChallenge,
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

      await Users.doc(user.id).update({ currentChallenge: null });

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
          walletData.solanaAddress = solanaAddress;
          walletData.walletIds = {
            ...(walletData.walletIds || {}),
            SOL: solWalletRes.data.wallets[0].id,
          };
          await Wallets.doc(user.id).set(walletData, { merge: true });
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
