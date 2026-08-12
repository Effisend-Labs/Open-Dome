import { nodeRequire } from '../../utilsAPI/nodeRequire';
import { verifyStaffActor } from '../../utilsAPI/staffJwt';

const RPC_URLS = {
  base: 'https://mainnet.base.org',
  arbitrum: 'https://arb1.arbitrum.io/rpc',
  optimism: 'https://mainnet.optimism.io',
  mainnet: 'https://eth.llamarpc.com',
  polygon: 'https://polygon-rpc.com',
  avalanche: 'https://api.avax.network/ext/bc/C/rpc',
};

/**
 * Verify & use (burn) a pass.
 * Auth: staff JWT (scanner/admin/god) OR ADMIN_SCANNER_TOKEN (hardware).
 */
export async function POST(request) {
  try {
    const actor = await verifyStaffActor(request);
    if (!actor) {
      return Response.json(
        { message: 'Unauthorized — staff JWT or scanner token required' },
        { status: 401 }
      );
    }

    const merchantKey = process.env.MERCHANT_PRIVATE_KEY;
    if (!merchantKey) {
      return Response.json({ message: 'Merchant wallet not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { action, network, contractAddress, tokenId, amount, account } = body;

    if (!contractAddress || tokenId == null) {
      return Response.json(
        { message: 'contractAddress and tokenId are required' },
        { status: 400 }
      );
    }
    if (!account) {
      return Response.json({ message: 'account (pass holder) is required' }, { status: 400 });
    }

    const chain = (network || 'base').toLowerCase();
    const rpcUrl = process.env.RPC_URL || RPC_URLS[chain];
    if (!rpcUrl) {
      return Response.json({ message: `Unsupported network: ${network}` }, { status: 400 });
    }

    const ethers = nodeRequire('ethers');
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(merchantKey, provider);
    const contract = new ethers.Contract(
      contractAddress,
      ['function scanPass(address account, uint256 id, uint256 amount)'],
      wallet
    );

    if (!['markUsed', 'consumeAccess', 'scanPass'].includes(action)) {
      return Response.json({ message: 'Unknown scanner action' }, { status: 400 });
    }

    const burnAmount = action === 'markUsed' ? 1 : amount || 1;
    const tx = await contract.scanPass(account, tokenId, burnAmount);
    const receipt = await tx.wait();

    return Response.json({
      success: true,
      txHash: receipt.hash,
      message: 'Transaction successful',
      scannedBy: { role: actor.role, username: actor.username || null },
    });
  } catch (err) {
    const errorMsg = err.reason || err.data?.message || err.message;
    return Response.json({ message: errorMsg }, { status: 500 });
  }
}
