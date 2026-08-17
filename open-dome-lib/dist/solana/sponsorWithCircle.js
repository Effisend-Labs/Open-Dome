"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.sponsorTransferWithCircle = sponsorTransferWithCircle;
var _rpc = require("./rpc.js");
var _instructions = require("./instructions.js");
var _transactions = require("./transactions.js");
/**
 * Server-side Solana fee-payer flow using @solana/kit.
 * Circle signs the user's transfer authority; facilitator pays network fees (and ATA rent).
 *
 * @param {{
 *   rpc: import('@solana/kit').Rpc;
 *   circleClient: { signTransaction: Function };
 *   walletId: string;
 *   fromAddress: string;
 *   destination: string;
 *   amount: string;
 *   asset?: 'USDC' | 'NATIVE';
 *   facilitatorSigner: import('@solana/kit').TransactionPartialSigner;
 *   usdcMint?: string;
 * }} params
 */
async function sponsorTransferWithCircle({
  rpc,
  circleClient,
  walletId,
  fromAddress,
  destination,
  amount,
  asset = 'USDC',
  facilitatorSigner,
  usdcMint
}) {
  const facilitatorAddress = facilitatorSigner.address;
  const {
    value: latestBlockhash
  } = await rpc.getLatestBlockhash().send();
  let instructions;
  if (asset === 'NATIVE') {
    instructions = [(0, _instructions.buildNativeTransferInstruction)({
      ownerAddress: fromAddress,
      destination,
      amount
    })];
  } else {
    if (!usdcMint) throw new Error('usdcMint is required for USDC transfers');
    instructions = await (0, _instructions.buildUsdcTransferInstructions)({
      rpc,
      facilitatorAddress,
      ownerAddress: fromAddress,
      destinationAddress: destination,
      mintAddress: usdcMint,
      amount
    });
  }
  const unsignedBase64 = (0, _transactions.compileUnsignedWireBase64)({
    feePayerAddress: facilitatorAddress,
    blockhashLifetime: latestBlockhash,
    instructions
  });

  // Circle consumes legacy wire bytes only (optional peer @solana/kit ^2–6; we use ^7 in opendome).
  const signedByCircle = await circleClient.signTransaction({
    walletId,
    rawTransaction: unsignedBase64
  });
  const signedPayload = signedByCircle.data?.signedTransaction;
  if (!signedPayload) {
    throw new Error('Circle returned no signed Solana transaction');
  }
  const circleSigned = (0, _transactions.decodeWireTransactionBase64)(signedPayload);
  const {
    wireBase64,
    signature
  } = await (0, _transactions.finalizePartialSignedTransaction)(facilitatorSigner, circleSigned);
  await rpc.sendTransaction(wireBase64, {
    encoding: 'base64',
    skipPreflight: false,
    maxRetries: 3
  }).send();
  await (0, _rpc.confirmTransactionByPolling)(rpc, signature, latestBlockhash.lastValidBlockHeight, 'confirmed');
  return {
    success: true,
    sponsored: true,
    paidBy: 'solana-facilitator',
    chain: 'solana',
    blockchain: 'SOL',
    txHash: signature,
    transactionId: signature
  };
}