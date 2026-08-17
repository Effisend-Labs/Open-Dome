"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.buildNativeTransferInstruction = buildNativeTransferInstruction;
exports.buildUsdcTransferInstructions = buildUsdcTransferInstructions;
var _system = require("@solana-program/system");
var _token = require("@solana-program/token");
var _kit = require("@solana/kit");
var _amounts = require("./amounts.js");
/**
 * Build native SOL transfer instruction (owner must sign via external wallet).
 * @param {{ ownerAddress: string, destination: string, amount: string, ownerSigner?: import('@solana/kit').TransactionPartialSigner }} params
 */
function buildNativeTransferInstruction({
  ownerAddress,
  destination,
  amount,
  ownerSigner
}) {
  const lamports = (0, _amounts.decimalToAtomic)(amount, _amounts.SOL_DECIMALS);
  return (0, _system.getTransferSolInstruction)({
    source: ownerSigner ?? (0, _kit.createNoopSigner)((0, _kit.address)(ownerAddress)),
    destination: (0, _kit.address)(destination),
    amount: lamports
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
async function buildUsdcTransferInstructions({
  rpc,
  facilitatorAddress,
  ownerAddress,
  destinationAddress,
  mintAddress,
  amount,
  ownerSigner,
  decimals = _amounts.USDC_DECIMALS
}) {
  const mint = (0, _kit.address)(mintAddress);
  const owner = (0, _kit.address)(ownerAddress);
  const destination = (0, _kit.address)(destinationAddress);
  const payer = (0, _kit.address)(facilitatorAddress);
  const [sourceAta] = await (0, _token.findAssociatedTokenPda)({
    owner,
    mint,
    tokenProgram: _token.TOKEN_PROGRAM_ADDRESS
  });
  const [destinationAta] = await (0, _token.findAssociatedTokenPda)({
    owner: destination,
    mint,
    tokenProgram: _token.TOKEN_PROGRAM_ADDRESS
  });
  const [sourceInfo, destinationInfo] = await Promise.all([rpc.getAccountInfo(sourceAta, {
    encoding: 'base64'
  }).send(), rpc.getAccountInfo(destinationAta, {
    encoding: 'base64'
  }).send()]);
  if (!sourceInfo.value) {
    throw new Error('The source Solana wallet has no USDC account');
  }
  const instructions = [];
  if (!destinationInfo.value) {
    instructions.push(await (0, _token.getCreateAssociatedTokenInstructionAsync)({
      payer,
      owner: destination,
      mint
    }));
  }
  instructions.push((0, _token.getTransferCheckedInstruction)({
    source: sourceAta,
    mint,
    destination: destinationAta,
    authority: ownerSigner ?? (0, _kit.createNoopSigner)(owner),
    amount: (0, _amounts.decimalToAtomic)(amount, decimals),
    decimals
  }));
  return instructions;
}