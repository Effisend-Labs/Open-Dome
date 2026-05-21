import {
    SYSTEM_PROGRAM_ADDRESS,
    getCreateAccountInstruction,
    getTransferSolInstruction
} from "@solana-program/system";
import {
    TOKEN_PROGRAM_ADDRESS,
    fetchMint,
    findAssociatedTokenPda,
    getCreateAssociatedTokenInstructionAsync,
    getTransferCheckedInstruction
} from "@solana-program/token";
import {
    address,
    appendTransactionMessageInstructions,
    createDefaultRpcTransport,
    createKeyPairFromBytes,
    createSignerFromKeyPair,
    createSolanaRpcFromTransport,
    createTransactionMessage,
    getBase58Encoder,
    getBase64EncodedWireTransaction,
    getSignatureFromTransaction,
    pipe,
    setTransactionMessageFeePayerSigner,
    setTransactionMessageLifetimeUsingBlockhash,
    signTransactionMessageWithSigners
} from "@solana/kit";
import { parseUnits } from "ethers";

export class SolanaAdapter {
  constructor(endpoints = ['https://api.mainnet-beta.solana.com']) {
    this.endpoints = Array.isArray(endpoints) ? endpoints : [endpoints];
    const transport = createDefaultRpcTransport({ url: this.endpoints[0] });
    this.rpc = createSolanaRpcFromTransport(transport);
  }

  async getRpc() {
    for (const url of this.endpoints) {
        try {
            const transport = createDefaultRpcTransport({ url });
            const tempRpc = createSolanaRpcFromTransport(transport);
            await tempRpc.getSlot().send();
            this.rpc = tempRpc;
            return tempRpc;
        } catch (e) {
            console.warn(`Solana RPC failed: ${url}`);
        }
    }
    throw new Error("All Solana RPCs failed");
  }

  async getBalance(addr) {
    const { value: balance } = await this.rpc.getBalance(address(addr)).send();
    return Number(balance) / 1e9;
  }

  async getBalanceToken(ownerAddr, tokenAddr) {
    const [ata] = await findAssociatedTokenPda({
        mint: address(tokenAddr),
        owner: address(ownerAddr),
        tokenProgram: TOKEN_PROGRAM_ADDRESS,
    });
    
    try {
        const { value: balance } = await this.rpc.getTokenAccountBalance(ata).send();
        return balance.uiAmountString;
    } catch (e) {
        return "0";
    }
  }

  async getBalanceTokens(ownerAddr, tokenAddrs) {
    return Promise.all(tokenAddrs.map(token => this.getBalanceToken(ownerAddr, token)));
  }

  async sign(privateKey, data) {
    const keypair = await createKeyPairFromBytes(getBase58Encoder().encode(privateKey));
    // Signing logic for messages
    return "signature_placeholder";
  }

  async signAndSend(privateKey, txInstructions) {
    const keypair = await createKeyPairFromBytes(getBase58Encoder().encode(privateKey));
    const signer = await createSignerFromKeyPair(keypair);

    const { value: latestBlockhash } = await this.rpc.getLatestBlockhash().send();

    const transactionMessage = pipe(
        createTransactionMessage({ version: 0 }),
        (tx) => setTransactionMessageFeePayerSigner(signer, tx),
        (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
        (tx) => appendTransactionMessageInstructions(txInstructions, tx)
    );

    const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);
    const signature = getSignatureFromTransaction(signedTransaction);
    const base64WireTransaction = getBase64EncodedWireTransaction(signedTransaction);

    await this.rpc.sendTransaction(base64WireTransaction, { encoding: "base64" }).send();

    await this.confirmTransactionByPolling(signature, latestBlockhash.lastValidBlockHeight);
    return signature;
  }

  async confirmTransactionByPolling(signature, lastValidBlockHeight, commitment = "confirmed", intervalMs = 2000) {
    const commitmentRank = { processed: 0, confirmed: 1, finalized: 2 };
    const targetRank = commitmentRank[commitment] ?? 1;

    while (true) {
        const { value: blockHeight } = await this.rpc.getBlockHeight({ commitment: "finalized" }).send();
        if (blockHeight > lastValidBlockHeight) {
            throw new Error(`Transaction expired`);
        }

        const { value: statuses } = await this.rpc.getSignatureStatuses([signature]).send();
        const status = statuses[0];
        if (status) {
            if (status.err) throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`);
            const confirmedRank = commitmentRank[status.confirmationStatus] ?? -1;
            if (confirmedRank >= targetRank) return status;
        }
        await new Promise(r => setTimeout(r, intervalMs));
    }
  }

  async getTokenDecimals(tokenAddr) {
    const mint = await fetchMint(this.rpc, address(tokenAddr));
    return mint.data.decimals;
  }
}
