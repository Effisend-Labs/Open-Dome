import { ethers } from 'ethers';
import { resolveUsdcRpcUrl } from 'opendome/dist/usdcChains.js';

const MERCHANT_PRIVATE_KEY = process.env.MERCHANT_PRIVATE_KEY;
const VALID_ADMIN_TOKEN = process.env.ADMIN_SERVICE_TOKEN;
const DEFAULT_CONTRACT =
  process.env.CONTRACT_ADDRESS ||
  '0xf5053b8bAfc35c52DbED12c38Ef4c8AEb75999FF';

const NETWORK_TO_USDC = {
  base: 'BASE',
  arbitrum: 'ARB',
  optimism: 'OP',
};

const SCAN_ABI = [
  'function scanPass(address account, uint256 id, uint256 amount) external',
];

/**
 * Sandbox scanner — burns OpenDomeERC1155Pass via scanPass.
 * Body: { action, network, contractAddress?, tokenId, amount?, account }
 */
export async function POST(req) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || authHeader !== `Bearer ${VALID_ADMIN_TOKEN}`) {
      return Response.json({ message: 'Unauthorized Scanner Access' }, { status: 401 });
    }

    if (!MERCHANT_PRIVATE_KEY) {
      return Response.json(
        { message: 'Merchant wallet not configured on server' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const {
      action,
      network = 'base',
      contractAddress,
      tokenId,
      amount,
      account,
    } = body;

    if (!['markUsed', 'consumeAccess', 'scanPass'].includes(action)) {
      return Response.json({ message: 'Unknown scanner action' }, { status: 400 });
    }
    if (tokenId == null) {
      return Response.json({ message: 'tokenId is required' }, { status: 400 });
    }
    if (!account) {
      return Response.json(
        { message: 'account (pass holder) is required' },
        { status: 400 }
      );
    }

    const chain = String(network).toLowerCase();
    const usdcKey = NETWORK_TO_USDC[chain];
    if (!usdcKey) {
      return Response.json({ message: `Unsupported network: ${network}` }, { status: 400 });
    }
    const rpcUrl = resolveUsdcRpcUrl(usdcKey);
    if (!rpcUrl) {
      return Response.json({ message: `No RPC for network: ${network}` }, { status: 400 });
    }

    const address = contractAddress || DEFAULT_CONTRACT;
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(MERCHANT_PRIVATE_KEY, provider);
    const contract = new ethers.Contract(address, SCAN_ABI, wallet);

    const burnAmount = action === 'markUsed' ? 1 : amount || 1;
    const tx = await contract.scanPass(account, tokenId, burnAmount);
    const receipt = await tx.wait();

    return Response.json({
      success: true,
      txHash: receipt.hash,
      contractAddress: address,
      message: 'Transaction successful',
    });
  } catch (error) {
    console.error('[Scanner API Error]', error);
    const errorMsg = error.reason || error.data?.message || error.message;
    return Response.json({ message: errorMsg }, { status: 500 });
  }
}
