import { getTransferSolInstruction } from '@solana-program/system';
import {
  findAssociatedTokenPda,
  getCreateAssociatedTokenInstructionAsync,
  getTransferCheckedInstruction,
  TOKEN_PROGRAM_ADDRESS,
} from '@solana-program/token';
import { address, createNoopSigner } from '@solana/kit';
import { decimalToAtomic, SOL_DECIMALS, USDC_DECIMALS } from './amounts.js';

/**
 * Build native SOL transfer instruction (owner must sign via external wallet).
 * @param {{ ownerAddress: string, destination: string, amount: string, ownerSigner?: import('@solana/kit').TransactionPartialSigner }} params
 */
export function buildNativeTransferInstruction({ ownerAddress, destination, amount, ownerSigner }) {
  const lamports = decimalToAtomic(amount, SOL_DECIMALS);
  return getTransferSolInstruction({
    source: ownerSigner ?? createNoopSigner(address(ownerAddress)),
    destination: address(destination),
    amount: lamports,
  });
}

/**
 * Build USDC transfer instructions, optionally including recipient ATA creation.
 * @param {{
 *   rpc: import('@solana/kit').Rpc;
 *   facilitatorAddress: string;
 *   ownerAddress: string;
 *   destinationAddress: string;
 *   mintAddress: string;
 *   amount: string;
 *   ownerSigner?: import('@solana/kit').TransactionPartialSigner;
 *   decimals?: number;
 * }} params
 */
export async function buildUsdcTransferInstructions({
  rpc,
  facilitatorAddress,
  ownerAddress,
  destinationAddress,
  mintAddress,
  amount,
  ownerSigner,
  decimals = USDC_DECIMALS,
}) {
  const mint = address(mintAddress);
  const owner = address(ownerAddress);
  const destination = address(destinationAddress);
  const payer = address(facilitatorAddress);

  const [sourceAta] = await findAssociatedTokenPda({
    owner,
    mint,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  });
  const [destinationAta] = await findAssociatedTokenPda({
    owner: destination,
    mint,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  });

  const [sourceInfo, destinationInfo] = await Promise.all([
    rpc.getAccountInfo(sourceAta, { encoding: 'base64' }).send(),
    rpc.getAccountInfo(destinationAta, { encoding: 'base64' }).send(),
  ]);

  if (!sourceInfo.value) {
    throw new Error('The source Solana wallet has no USDC account');
  }

  const instructions = [];
  if (!destinationInfo.value) {
    instructions.push(
      await getCreateAssociatedTokenInstructionAsync({
        payer,
        owner: destination,
        mint,
      }),
    );
  }

  instructions.push(
    getTransferCheckedInstruction({
      source: sourceAta,
      mint,
      destination: destinationAta,
      authority: ownerSigner ?? createNoopSigner(owner),
      amount: decimalToAtomic(amount, decimals),
      decimals,
    }),
  );

  return instructions;
}
