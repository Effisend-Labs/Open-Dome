import { nodeRequire } from './nodeRequire.js';

const { createSignerFromSecretKey } = nodeRequire('opendome/dist/solana/keypair.js');
const { createSolanaRpc } = nodeRequire('opendome/dist/solana/rpc.js');
const { sponsorTransferWithCircle } = nodeRequire('opendome/dist/solana/sponsorWithCircle.js');

function solanaRpcUrl() {
  if (process.env.RPC_URL_SOLANA) return process.env.RPC_URL_SOLANA;
  if (process.env.RPC_URL_SOL) return process.env.RPC_URL_SOL;
  const { getUsdcChain } = nodeRequire('opendome/dist/x402.js');
  const cfg = getUsdcChain('SOL');
  return cfg.defaultRpc || cfg.rpcs?.[0] || 'https://api.mainnet-beta.solana.com';
}

async function parseFacilitatorSigner() {
  const signer = await createSignerFromSecretKey(process.env.MERCHANT_SOLANA_PRIVATE_KEY);
  const expectedAddress = String(process.env.MERCHANT_SOLANA_ADDRESS || '').trim();
  if (expectedAddress && signer.address !== expectedAddress) {
    throw new Error('Solana facilitator key does not match MERCHANT_SOLANA_ADDRESS');
  }
  return signer;
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
    const facilitatorSigner = await parseFacilitatorSigner();
    const rpc = createSolanaRpc(solanaRpcUrl());
    const { getUsdcChain } = nodeRequire('opendome/dist/x402.js');
    const usdcMint = asset === 'USDC' ? getUsdcChain('SOL').usdc : undefined;

    return await sponsorTransferWithCircle({
      rpc,
      circleClient: client,
      walletId,
      fromAddress,
      destination,
      amount,
      asset: asset === 'NATIVE' ? 'NATIVE' : 'USDC',
      facilitatorSigner,
      usdcMint,
    });
  } catch (err) {
    return { error: err.response?.data?.message || err.message || String(err) };
  }
}
