import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { Users, Passkeys, Wallets, getUserById } from '../../../utilsAPI/passkeyDb';
import {
  getCircleWalletsClient,
  CIRCLE_WALLET_SET_ID,
} from '../../../utilsAPI/circleTools';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { emitPlatformEvent } from '../../../utilsAPI/platformTelemetry.js';

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

const JWT_SECRET = process.env.JWT_SECRET;

export const POST = async (request) => {
  const startedAt = Date.now();
  if (!JWT_SECRET) {
    return Response.json({ error: 'JWT_SECRET is not set' }, { status: 500 });
  }
  const expectedRPID = getDynamicRpID(request);
  const expectedOrigin =
    request.headers.get('origin') || 'http://localhost:8082';
  console.log('[Passkey API] POST /api/passkey/register-verify initiated');
  try {
    const { userId, credentialResponse } = await request.json();
    console.log(`[Passkey API] register-verify userId: ${userId}`);

    if (!userId || !credentialResponse) {
      return Response.json(
        { error: 'User ID and credentialResponse are required' },
        { status: 400 }
      );
    }

    const user = await getUserById(userId);
    if (!user || !user.currentChallenge) {
      return Response.json(
        { error: 'User not found or no registration challenge found' },
        { status: 400 }
      );
    }

    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: credentialResponse,
        expectedChallenge: user.currentChallenge,
        expectedOrigin,
        expectedRPID,
      });
    } catch (error) {
      console.error('[Passkey API] Verification failed:', error);
      return Response.json({ error: error.message }, { status: 400 });
    }

    const { verified, registrationInfo } = verification;

    if (verified && registrationInfo) {
      // @simplewebauthn/server v10+ nests id/publicKey under credential
      const { credential, credentialDeviceType, credentialBackedUp } =
        registrationInfo;
      if (!credential?.id || !credential?.publicKey) {
        return Response.json(
          { error: 'Registration info missing credential id/publicKey' },
          { status: 500 }
        );
      }

      const newPasskey = {
        userId: user.id,
        credentialID: credential.id,
        publicKey: Buffer.from(credential.publicKey).toString('base64'),
        counter: credential.counter ?? 0,
        transports:
          credential.transports ||
          credentialResponse.response?.transports ||
          [],
        credentialDeviceType,
        credentialBackedUp,
        createdAt: new Date().toISOString(),
      };

      await Passkeys.doc(newPasskey.credentialID).set(newPasskey);

      const circleClient = getCircleWalletsClient();

      console.log(
        '[Passkey API] Generating Circle Developer-Controlled Wallets (EVM + Solana)...'
      );
      const evmWalletRes = await circleClient.createWallets({
        blockchains: ['ARB', 'AVAX', 'BASE', 'ETH', 'MATIC', 'OP'],
        count: 1,
        accountType: 'EOA',
        walletSetId: CIRCLE_WALLET_SET_ID,
        idempotencyKey: randomUUID(),
      });

      const solWalletRes = await circleClient.createWallets({
        blockchains: ['SOL'],
        count: 1,
        walletSetId: CIRCLE_WALLET_SET_ID,
        idempotencyKey: randomUUID(),
      });

      const walletIds = {};
      let evmAddress = '';
      let solanaAddress = '';
      for (const w of evmWalletRes.data?.wallets || []) {
        walletIds[w.blockchain] = w.id;
        if (!evmAddress) evmAddress = w.address;
      }
      for (const w of solWalletRes.data?.wallets || []) {
        walletIds[w.blockchain] = w.id;
        solanaAddress = w.address;
      }

      if (!evmAddress) {
        throw new Error('Circle createWallets returned no EVM wallet address');
      }
      if (!solanaAddress) {
        throw new Error('Circle createWallets returned no Solana wallet address');
      }

      await Wallets.doc(user.id).set({
        userId: user.id,
        address: evmAddress,
        solanaAddress,
        walletIds,
        createdAt: new Date().toISOString(),
      });

      const role =
        user.role === 'god' ||
        String(user.usernameLower || user.username || '')
          .toLowerCase()
          .replace(/^@/, '') === 'altaga'
          ? 'god'
          : 'user';

      await Users.doc(user.id).update({
        currentChallenge: null,
        evmAddress,
        evmAddressLower: String(evmAddress).toLowerCase(),
        solanaAddress,
        role,
      });

      const token = jwt.sign(
        {
          userId: user.id,
          username: user.username,
          role,
          evm: evmAddress,
          solana: solanaAddress,
        },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      emitPlatformEvent({
        event_type: 'user_created',
        status: 'ok',
        latency_ms: Date.now() - startedAt,
      });

      return Response.json({
        verified: true,
        token,
        evmAddress,
        solanaAddress,
      });
    }

    return Response.json(
      { error: 'Verification failed for unknown reasons' },
      { status: 400 }
    );
  } catch (e) {
    console.error('[Passkey API] Error during register verification:', e);
    emitPlatformEvent({
      event_type: 'user_created',
      status: 'error',
      latency_ms: Date.now() - startedAt,
    });
    return Response.json({ error: e.message }, { status: 500 });
  }
};
