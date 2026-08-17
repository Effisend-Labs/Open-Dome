"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SolanaAdapter = void 0;
var _token = require("@solana-program/token");
var _kit = require("@solana/kit");
var _instructions = require("../solana/instructions.js");
var _rpc = require("../solana/rpc.js");
class SolanaAdapter {
  constructor(endpoints = ['https://api.mainnet-beta.solana.com']) {
    this.endpoints = Array.isArray(endpoints) ? endpoints : [endpoints];
    this.rpc = (0, _rpc.createSolanaRpc)(this.endpoints);
  }
  async getRpc() {
    this.rpc = await (0, _rpc.resolveWorkingRpc)(this.endpoints);
    return this.rpc;
  }
  async getBalance(addr) {
    const rpc = await this.getRpc();
    const {
      value: balance
    } = await rpc.getBalance((0, _kit.address)(addr)).send();
    return Number(balance) / 1e9;
  }
  async getBalanceToken(ownerAddr, tokenAddr) {
    const rpc = await this.getRpc();
    const [ata] = await (0, _token.findAssociatedTokenPda)({
      mint: (0, _kit.address)(tokenAddr),
      owner: (0, _kit.address)(ownerAddr),
      tokenProgram: _token.TOKEN_PROGRAM_ADDRESS
    });
    try {
      const {
        value: balance
      } = await rpc.getTokenAccountBalance(ata).send();
      return balance.uiAmountString;
    } catch {
      return '0';
    }
  }
  async getBalanceTokens(ownerAddr, tokenAddrs) {
    return Promise.all(tokenAddrs.map(token => this.getBalanceToken(ownerAddr, token)));
  }
  async sign(privateKey, data) {
    const keypair = await (0, _kit.createKeyPairSignerFromBytes)((0, _kit.getBase58Encoder)().encode(privateKey));
    const message = (0, _kit.createSignableMessage)(typeof data === 'string' ? data : String(data));
    const signatureBytes = await (0, _kit.signBytes)(keypair.keyPair.privateKey, message.content);
    return (0, _kit.getBase58Encoder)().decode(signatureBytes);
  }

  /**
   * @param {string} privateKey base58-encoded 64-byte keypair
   * @param {{ type: 'sol' | 'usdc', source: string, destination: string, amount: string, mint?: string }} tx
   */
  async signAndSend(privateKey, tx) {
    const rpc = await this.getRpc();
    const signer = await (0, _kit.createKeyPairSignerFromBytes)((0, _kit.getBase58Encoder)().encode(privateKey));
    const {
      value: latestBlockhash
    } = await rpc.getLatestBlockhash().send();
    let instructions;
    if (tx.type === 'sol') {
      instructions = [(0, _instructions.buildNativeTransferInstruction)({
        ownerAddress: tx.source,
        destination: tx.destination,
        amount: tx.amount,
        ownerSigner: signer
      })];
    } else if (tx.type === 'usdc') {
      if (!tx.mint) throw new Error('mint is required for USDC transfers');
      instructions = await (0, _instructions.buildUsdcTransferInstructions)({
        rpc,
        facilitatorAddress: signer.address,
        ownerAddress: tx.source,
        destinationAddress: tx.destination,
        mintAddress: tx.mint,
        amount: tx.amount,
        ownerSigner: signer
      });
    } else {
      throw new Error(`Unsupported Solana transfer type: ${tx.type}`);
    }
    const message = (0, _kit.pipe)((0, _kit.createTransactionMessage)({
      version: 0
    }), m => (0, _kit.setTransactionMessageFeePayerSigner)(signer, m), m => (0, _kit.setTransactionMessageLifetimeUsingBlockhash)(latestBlockhash, m), m => (0, _kit.appendTransactionMessageInstructions)(instructions, m));
    const signedTransaction = await (0, _kit.signTransactionMessageWithSigners)(message);
    const wireBase64 = (0, _kit.getBase64EncodedWireTransaction)(signedTransaction);
    const signature = (0, _kit.getSignatureFromTransaction)(signedTransaction);
    await rpc.sendTransaction(wireBase64, {
      encoding: 'base64'
    }).send();
    await (0, _rpc.confirmTransactionByPolling)(rpc, signature, latestBlockhash.lastValidBlockHeight);
    return signature;
  }
  async getTokenDecimals(tokenAddr) {
    const rpc = await this.getRpc();
    const mint = await (0, _token.fetchMint)(rpc, (0, _kit.address)(tokenAddr));
    return mint.data.decimals;
  }
}
exports.SolanaAdapter = SolanaAdapter;