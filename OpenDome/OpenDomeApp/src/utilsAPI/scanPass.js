/**
 * Staff scanPass (ERC-1155 burn) via viem — same packing path as x402 facilitator.
 */
import { nodeRequire } from './nodeRequire';

const DEFAULT_CONTRACT =
  process.env.CONTRACT_ADDRESS || '0xf5053b8bAfc35c52DbED12c38Ef4c8AEb75999FF';

const SCAN_ABI = [
  {
    type: 'function',
    name: 'scanPass',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'id', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
];

function hexKey(raw) {
  const k = String(raw || '').trim();
  if (!k) return k;
  return k.startsWith('0x') ? k : `0x${k}`;
}

function parseAmount(action, amount) {
  if (action === 'markUsed') return 1;
  const n = Math.floor(Number(amount));
  if (!Number.isFinite(n) || n < 1) return 1;
  if (n > 50) {
    throw Object.assign(new Error('amount must be between 1 and 50'), { status: 400 });
  }
  return n;
}

export async function scanPassOnChain({
  action = 'scanPass',
  network = 'base',
  contractAddress,
  tokenId,
  amount,
  account,
}) {
  const merchantKey = hexKey(process.env.MERCHANT_PRIVATE_KEY);
  if (!merchantKey) {
    throw Object.assign(new Error('Merchant wallet not configured'), { status: 500 });
  }
  if (!account) {
    throw Object.assign(new Error('account (pass holder) is required'), { status: 400 });
  }
  if (tokenId == null) {
    throw Object.assign(new Error('tokenId is required'), { status: 400 });
  }
  if (!['markUsed', 'consumeAccess', 'scanPass'].includes(action)) {
    throw Object.assign(new Error('Unknown scanner action'), { status: 400 });
  }

  const chainKey = String(network || 'base').toLowerCase();
  if (chainKey !== 'base') {
    throw Object.assign(new Error(`Unsupported network: ${network}`), { status: 400 });
  }

  const burnAmount = parseAmount(action, amount);
  const address = contractAddress || DEFAULT_CONTRACT;

  const { createWalletClient, createPublicClient, http } = nodeRequire('viem');
  const { privateKeyToAccount } = nodeRequire('viem/accounts');
  const { base } = nodeRequire('viem/chains');

  const rpcUrl = process.env.RPC_URL || 'https://mainnet.base.org';
  const signer = privateKeyToAccount(merchantKey);
  const transport = http(rpcUrl);
  const walletClient = createWalletClient({ account: signer, chain: base, transport });
  const publicClient = createPublicClient({ chain: base, transport });

  const hash = await walletClient.writeContract({
    address,
    abi: SCAN_ABI,
    functionName: 'scanPass',
    args: [account, BigInt(tokenId), BigInt(burnAmount)],
  });
  await publicClient.waitForTransactionReceipt({ hash });

  return { txHash: hash, amount: burnAmount, contractAddress: address };
}
