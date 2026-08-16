import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import {
  Users,
  Passkeys,
  Wallets,
  Challenges,
  getUserById,
  getPasskeyById,
} from '../../../utilsAPI/passkeyDb';
import {
  getCircleWalletsClient,
  CIRCLE_WALLET_SET_ID,
} from '../../../utilsAPI/circleTools';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { jwtRoleFromUser } from '../../../utilsAPI/staffAuth';

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

const SESSION_JWT_TOKEN = process.env.SESSION_JWT_TOKEN;

export const POST = async (request) => {
  if (!SESSION_JWT_TOKEN) {
    return Response.json({ error: 'SESSION_JWT_TOKEN is not set' }, { status: 500 });
  }
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
        const circleClient = getCircleWalletsClient();
        const solWalletRes = await circleClient.createWallets({
          blockchains: ['SOL'],
          count: 1,
          walletSetId: CIRCLE_WALLET_SET_ID,
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

      const role = jwtRoleFromUser(user);
      const evmLower = user.evmAddress
        ? String(user.evmAddress).toLowerCase()
        : '';
      const userPatch = {};
      if (role === 'god' && user.role !== 'god') userPatch.role = 'god';
      if (evmLower && user.evmAddressLower !== evmLower) {
        userPatch.evmAddressLower = evmLower;
      }
      if (Object.keys(userPatch).length) {
        await Users.doc(user.id).update(userPatch);
      }

      const token = jwt.sign(
        {
          userId: user.id,
          username: user.username,
          role,
          evm: user.evmAddress || undefined,
          solana: solanaAddress || undefined,
        },
        SESSION_JWT_TOKEN,
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
