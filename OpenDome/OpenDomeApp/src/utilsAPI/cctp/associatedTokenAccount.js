import { createHash } from 'node:crypto';
import { nodeRequire } from '../nodeRequire.js';
import { decodeBase58, isSolanaAddress } from './solanaAddress.js';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  SOLANA_USDC_MINT,
  TOKEN_PROGRAM_ID,
} from './constants.js';

function sha256(parts) {
  const hash = createHash('sha256');
  for (const part of parts) hash.update(part);
  return hash.digest();
}

function isOnCurve(bytes) {
  const { ed25519 } = nodeRequire('@noble/curves/ed25519');
  try {
    ed25519.ExtendedPoint.fromHex(Buffer.from(bytes).toString('hex'));
    return true;
  } catch {
    return false;
  }
}

function findProgramAddress(seeds, programId) {
  for (let bump = 255; bump >= 0; bump -= 1) {
    const digest = sha256([
      ...seeds,
      Buffer.from([bump]),
      programId,
      Buffer.from('ProgramDerivedAddress'),
    ]);
    if (!isOnCurve(digest)) return digest;
  }
  throw new Error('Unable to derive associated token account');
}

/** USDC ATA for a Solana wallet, as 0x-prefixed 32-byte hex (CCTP mintRecipient). */
export function usdcAtaBytes32(walletAddress) {
  if (!isSolanaAddress(walletAddress)) {
    throw new Error('destination must be a Solana address');
  }
  const owner = decodeBase58(walletAddress);
  const mint = decodeBase58(SOLANA_USDC_MINT);
  const tokenProgram = decodeBase58(TOKEN_PROGRAM_ID);
  const ataProgram = decodeBase58(ASSOCIATED_TOKEN_PROGRAM_ID);
  const ata = findProgramAddress([owner, tokenProgram, mint], ataProgram);
  return `0x${ata.toString('hex')}`;
}

export function walletBytes(walletAddress) {
  if (!isSolanaAddress(walletAddress)) {
    throw new Error('destination must be a Solana address');
  }
  return decodeBase58(walletAddress);
}
