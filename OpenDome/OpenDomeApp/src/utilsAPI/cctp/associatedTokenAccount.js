import { nodeRequire } from '../nodeRequire.js';
import { decodeBase58, isSolanaAddress } from './solanaAddress.js';
import { SOLANA_USDC_MINT } from './constants.js';

function solanaToken() {
  return nodeRequire('@solana-program/token');
}

function solanaKit() {
  return nodeRequire('@solana/kit');
}

/** USDC ATA for a Solana wallet, as 0x-prefixed 32-byte hex (CCTP mintRecipient). */
export async function usdcAtaBytes32(walletAddress) {
  if (!isSolanaAddress(walletAddress)) {
    throw new Error('destination must be a Solana address');
  }
  const { findAssociatedTokenPda, TOKEN_PROGRAM_ADDRESS } = solanaToken();
  const { address } = solanaKit();
  const [ata] = await findAssociatedTokenPda({
    owner: address(walletAddress),
    mint: address(SOLANA_USDC_MINT),
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  });
  const ataBytes = decodeBase58(ata);
  return `0x${Buffer.from(ataBytes).toString('hex')}`;
}

export function walletBytes(walletAddress) {
  if (!isSolanaAddress(walletAddress)) {
    throw new Error('destination must be a Solana address');
  }
  return decodeBase58(walletAddress);
}
