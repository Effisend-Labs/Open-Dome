import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import bs58 from 'bs58';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from './cctp/constants.js';
import { nodeRequire } from './nodeRequire.js';

const USDC_DECIMALS = 6;
const SOL_DECIMALS = 9;
const TOKEN_PROGRAM = new PublicKey(TOKEN_PROGRAM_ID);
const ATA_PROGRAM = new PublicKey(ASSOCIATED_TOKEN_PROGRAM_ID);

function parseSecretKey(raw) {
  const value = String(raw || '').trim();
  if (!value) {
    throw new Error(
      'Solana facilitator is not configured (MERCHANT_SOLANA_PRIVATE_KEY)',
    );
  }

  let bytes;
  if (value.startsWith('[')) {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) throw new Error('Invalid Solana facilitator key');
    bytes = Uint8Array.from(parsed);
  } else {
    bytes = bs58.decode(value);
  }

  if (bytes.length !== 64) {
    throw new Error('Solana facilitator key must decode to 64 bytes');
  }
  const keypair = Keypair.fromSecretKey(bytes);
  const expectedAddress = String(process.env.MERCHANT_SOLANA_ADDRESS || '').trim();
  if (expectedAddress && keypair.publicKey.toBase58() !== expectedAddress) {
    throw new Error('Solana facilitator key does not match MERCHANT_SOLANA_ADDRESS');
  }
  return keypair;
}

function decimalToAtomic(value, decimals) {
  const text = String(value || '').trim();
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(text)) {
    throw new Error('Amount must be a positive decimal');
  }
  const [whole, fraction = ''] = text.split('.');
  if (fraction.length > decimals) {
    throw new Error(`Amount supports at most ${decimals} decimal places`);
  }
  const atomic = BigInt(whole) * 10n ** BigInt(decimals)
    + BigInt(fraction.padEnd(decimals, '0') || '0');
  if (atomic <= 0n) throw new Error('Amount must be greater than zero');
  return atomic;
}

function solanaRpcUrl() {
  if (process.env.RPC_URL_SOLANA) return process.env.RPC_URL_SOLANA;
  if (process.env.RPC_URL_SOL) return process.env.RPC_URL_SOL;
  const { getUsdcChain } = nodeRequire('opendome/dist/x402.js');
  const cfg = getUsdcChain('SOL');
  return cfg.defaultRpc || cfg.rpcs?.[0] || 'https://api.mainnet-beta.solana.com';
}

function getAssociatedTokenAddress(mint, owner) {
  const [ata] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM.toBuffer(), mint.toBuffer()],
    ATA_PROGRAM,
  );
  return ata;
}

function createAssociatedTokenAccountInstruction(payer, ata, owner, mint) {
  return new TransactionInstruction({
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: ata, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM, isSigner: false, isWritable: false },
    ],
    programId: ATA_PROGRAM,
    data: Buffer.alloc(0),
  });
}

function createTransferCheckedInstruction(
  source,
  mint,
  destination,
  owner,
  amount,
  decimals,
) {
  const data = Buffer.alloc(10);
  data.writeUInt8(12, 0); // TransferChecked
  data.writeBigUInt64LE(BigInt(amount), 1);
  data.writeUInt8(decimals, 9);
  return new TransactionInstruction({
    keys: [
      { pubkey: source, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: destination, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    programId: TOKEN_PROGRAM,
    data,
  });
}

async function addUsdcTransfer({
  connection,
  transaction,
  facilitator,
  owner,
  destination,
  amount,
}) {
  const { getUsdcChain } = nodeRequire('opendome/dist/x402.js');
  const mint = new PublicKey(getUsdcChain('SOL').usdc);
  const sourceAta = getAssociatedTokenAddress(mint, owner);
  const destinationAta = getAssociatedTokenAddress(mint, destination);

  const [sourceInfo, destinationInfo] = await Promise.all([
    connection.getAccountInfo(sourceAta),
    connection.getAccountInfo(destinationAta),
  ]);
  if (!sourceInfo) throw new Error('The source Solana wallet has no USDC account');
  if (!destinationInfo) {
    transaction.add(
      createAssociatedTokenAccountInstruction(
        facilitator.publicKey,
        destinationAta,
        destination,
        mint,
      ),
    );
  }

  transaction.add(
    createTransferCheckedInstruction(
      sourceAta,
      mint,
      destinationAta,
      owner,
      decimalToAtomic(amount, USDC_DECIMALS),
      USDC_DECIMALS,
    ),
  );
}

/**
 * Server-side Solana fee-payer flow:
 * Circle signs the user's transfer authority, while the merchant pays network
 * fees (and recipient ATA rent when needed) with a separate Solana key.
 */
export async function sponsorSolanaTransferWithCircle({
  client,
  walletId,
  fromAddress,
  destination,
  amount,
  asset = 'USDC',
}) {
  try {
    const facilitator = parseSecretKey(process.env.MERCHANT_SOLANA_PRIVATE_KEY);
    const connection = new Connection(solanaRpcUrl(), 'confirmed');
    const owner = new PublicKey(fromAddress);
    const recipient = new PublicKey(destination);
    const transaction = new Transaction();

    if (asset === 'NATIVE') {
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: owner,
          toPubkey: recipient,
          lamports: decimalToAtomic(amount, SOL_DECIMALS),
        }),
      );
    } else {
      await addUsdcTransfer({
        connection,
        transaction,
        facilitator,
        owner,
        destination: recipient,
        amount,
      });
    }

    const latest = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = latest.blockhash;
    transaction.feePayer = facilitator.publicKey;

    const unsigned = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });
    const signedByCircle = await client.signTransaction({
      walletId,
      rawTransaction: unsigned.toString('base64'),
    });
    const signedPayload = signedByCircle.data?.signedTransaction;
    if (!signedPayload) throw new Error('Circle returned no signed Solana transaction');

    const ready = Transaction.from(Buffer.from(signedPayload, 'base64'));
    ready.partialSign(facilitator);
    const txHash = await connection.sendRawTransaction(ready.serialize(), {
      maxRetries: 3,
      skipPreflight: false,
    });
    await connection.confirmTransaction(
      { signature: txHash, ...latest },
      'confirmed',
    );

    return {
      success: true,
      sponsored: true,
      paidBy: 'solana-facilitator',
      chain: 'solana',
      blockchain: 'SOL',
      txHash,
      transactionId: txHash,
    };
  } catch (err) {
    return { error: err.response?.data?.message || err.message || String(err) };
  }
}
