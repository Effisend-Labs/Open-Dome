"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.compileUnsignedWireBase64 = compileUnsignedWireBase64;
exports.decodeWireTransactionBase64 = decodeWireTransactionBase64;
exports.finalizePartialSignedTransaction = finalizePartialSignedTransaction;
var _kit = require("@solana/kit");
/** Compile a v0 transaction message and return base64 wire bytes (null signatures zero-filled). */
function compileUnsignedWireBase64({
  feePayerAddress,
  blockhashLifetime,
  instructions
}) {
  const message = (0, _kit.pipe)((0, _kit.createTransactionMessage)({
    version: 0
  }), tx => (0, _kit.setTransactionMessageFeePayer)(feePayerAddress, tx), tx => (0, _kit.setTransactionMessageLifetimeUsingBlockhash)(blockhashLifetime, tx), tx => (0, _kit.appendTransactionMessageInstructions)(instructions, tx));
  const compiled = (0, _kit.compileTransaction)(message);
  return (0, _kit.getBase64EncodedWireTransaction)(compiled);
}

/** Decode a base64 wire transaction returned by an external signer (e.g. Circle). */
function decodeWireTransactionBase64(base64Payload) {
  const bytes = (0, _kit.getBase64Encoder)().encode(String(base64Payload));
  return (0, _kit.getTransactionDecoder)().decode(bytes);
}

/** Apply facilitator partial signatures and return send-ready wire + signature. */
async function finalizePartialSignedTransaction(facilitatorSigner, circleSignedTransaction) {
  const fullySigned = await (0, _kit.partiallySignTransactionWithSigners)([facilitatorSigner], circleSignedTransaction);
  return {
    wireBase64: (0, _kit.getBase64EncodedWireTransaction)(fullySigned),
    signature: (0, _kit.getSignatureFromTransaction)(fullySigned)
  };
}