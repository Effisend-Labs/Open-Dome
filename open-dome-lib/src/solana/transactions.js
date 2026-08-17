import {
  appendTransactionMessageInstructions,
  compileTransaction,
  createTransactionMessage,
  getBase64EncodedWireTransaction,
  getBase64Encoder,
  getSignatureFromTransaction,
  getTransactionDecoder,
  partiallySignTransactionWithSigners,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
} from '@solana/kit';

/** Compile a v0 transaction message and return base64 wire bytes (null signatures zero-filled). */
export function compileUnsignedWireBase64({ feePayerAddress, blockhashLifetime, instructions }) {
  const message = pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => setTransactionMessageFeePayer(feePayerAddress, tx),
    (tx) => setTransactionMessageLifetimeUsingBlockhash(blockhashLifetime, tx),
    (tx) => appendTransactionMessageInstructions(instructions, tx),
  );
  const compiled = compileTransaction(message);
  return getBase64EncodedWireTransaction(compiled);
}

/** Decode a base64 wire transaction returned by an external signer (e.g. Circle). */
export function decodeWireTransactionBase64(base64Payload) {
  const bytes = getBase64Encoder().encode(String(base64Payload));
  return getTransactionDecoder().decode(bytes);
}

/** Apply facilitator partial signatures and return send-ready wire + signature. */
export async function finalizePartialSignedTransaction(facilitatorSigner, circleSignedTransaction) {
  const fullySigned = await partiallySignTransactionWithSigners(
    [facilitatorSigner],
    circleSignedTransaction,
  );
  return {
    wireBase64: getBase64EncodedWireTransaction(fullySigned),
    signature: getSignatureFromTransaction(fullySigned),
  };
}
