import {
  TOKEN_PROGRAM_ADDRESS,
  fetchMint,
  findAssociatedTokenPda,
} from '@solana-program/token';
import {
  address,
  appendTransactionMessageInstructions,
  createKeyPairSignerFromBytes,
  createSignableMessage,
  createTransactionMessage,
  getBase58Encoder,
  getBase64EncodedWireTransaction,
  getSignatureFromTransaction,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signBytes,
  signTransactionMessageWithSigners,
} from '@solana/kit';
import {
  buildNativeTransferInstruction,
  buildUsdcTransferInstructions,
} from '../solana/instructions.js';
import { confirmTransactionByPolling, createSolanaRpc, resolveWorkingRpc } from '../solana/rpc.js';

export class SolanaAdapter {
  constructor(endpoints = ['https://api.mainnet-beta.solana.com']) {
    this.endpoints = Array.isArray(endpoints) ? endpoints : [endpoints];
    this.rpc = createSolanaRpc(this.endpoints);
  }

  async getRpc() {
    this.rpc = await resolveWorkingRpc(this.endpoints);
    return this.rpc;
  }

  async getBalance(addr) {
    const rpc = await this.getRpc();
    const { value: balance } = await rpc.getBalance(address(addr)).send();
    return Number(balance) / 1e9;
  }

  async getBalanceToken(ownerAddr, tokenAddr) {
    const rpc = await this.getRpc();
    const [ata] = await findAssociatedTokenPda({
      mint: address(tokenAddr),
      owner: address(ownerAddr),
      tokenProgram: TOKEN_PROGRAM_ADDRESS,
    });

    try {
      const { value: balance } = await rpc.getTokenAccountBalance(ata).send();
      return balance.uiAmountString;
    } catch {
      return '0';
    }
  }

  async getBalanceTokens(ownerAddr, tokenAddrs) {
    return Promise.all(tokenAddrs.map((token) => this.getBalanceToken(ownerAddr, token)));
  }

  async sign(privateKey, data) {
    const keypair = await createKeyPairSignerFromBytes(getBase58Encoder().encode(privateKey));
    const message = createSignableMessage(typeof data === 'string' ? data : String(data));
    const signatureBytes = await signBytes(keypair.keyPair.privateKey, message.content);
    return getBase58Encoder().decode(signatureBytes);
  }

  /**
   * @param {string} privateKey base58-encoded 64-byte keypair
   * @param {{ type: 'sol' | 'usdc', source: string, destination: string, amount: string, mint?: string }} tx
   */
  async signAndSend(privateKey, tx) {
    const rpc = await this.getRpc();
    const signer = await createKeyPairSignerFromBytes(getBase58Encoder().encode(privateKey));
    const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

    let instructions;
    if (tx.type === 'sol') {
      instructions = [
        buildNativeTransferInstruction({
          ownerAddress: tx.source,
          destination: tx.destination,
          amount: tx.amount,
          ownerSigner: signer,
        }),
      ];
    } else if (tx.type === 'usdc') {
      if (!tx.mint) throw new Error('mint is required for USDC transfers');
      instructions = await buildUsdcTransferInstructions({
        rpc,
        facilitatorAddress: signer.address,
        ownerAddress: tx.source,
        destinationAddress: tx.destination,
        mintAddress: tx.mint,
        amount: tx.amount,
        ownerSigner: signer,
      });
    } else {
      throw new Error(`Unsupported Solana transfer type: ${tx.type}`);
    }

    const message = pipe(
      createTransactionMessage({ version: 0 }),
      (m) => setTransactionMessageFeePayerSigner(signer, m),
      (m) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m),
      (m) => appendTransactionMessageInstructions(instructions, m),
    );

    const signedTransaction = await signTransactionMessageWithSigners(message);
    const wireBase64 = getBase64EncodedWireTransaction(signedTransaction);
    const signature = getSignatureFromTransaction(signedTransaction);

    await rpc.sendTransaction(wireBase64, { encoding: 'base64' }).send();
    await confirmTransactionByPolling(
      rpc,
      signature,
      latestBlockhash.lastValidBlockHeight,
    );

    return signature;
  }

  async getTokenDecimals(tokenAddr) {
    const rpc = await this.getRpc();
    const mint = await fetchMint(rpc, address(tokenAddr));
    return mint.data.decimals;
  }
}
