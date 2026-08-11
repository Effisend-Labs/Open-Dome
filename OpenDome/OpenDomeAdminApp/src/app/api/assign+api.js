import { requireBridgeActor, addTickets, getAllAdminUsers } from '../../utilsAPI/adminDb';
import { nodeRequire } from '../../utilsAPI/nodeRequire';

const RPC_URLS = {
  base: 'https://mainnet.base.org',
  arbitrum: 'https://arb1.arbitrum.io/rpc',
  optimism: 'https://mainnet.optimism.io',
  mainnet: 'https://eth.llamarpc.com',
  polygon: 'https://polygon-rpc.com',
  avalanche: 'https://api.avax.network/ext/bc/C/rpc',
};

const MINT_ABI = [
  'function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data) external',
];

export async function POST(request) {
  try {
    const actor = await requireBridgeActor(request);
    if (!actor || actor.type !== 'god-jwt') {
      return Response.json(
        { error: 'Unauthorized — OpenDome JWT for @altaga (god) required' },
        { status: 401 }
      );
    }

    const { userIds, ticketIds, amounts, network } = await request.json();
    if (!userIds?.length || !ticketIds?.length || !amounts?.length) {
      return Response.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const merchantKey = process.env.MERCHANT_PRIVATE_KEY;
    const contractAddress = process.env.CONTRACT_ADDRESS;
    if (!merchantKey || !contractAddress) {
      return Response.json(
        { error: 'MERCHANT_PRIVATE_KEY and CONTRACT_ADDRESS are required.' },
        { status: 500 }
      );
    }

    const chain = (network || 'base').toLowerCase();
    const rpcUrl = process.env.RPC_URL || RPC_URLS[chain];
    if (!rpcUrl) {
      return Response.json({ error: `Unsupported network: ${chain}` }, { status: 400 });
    }

    const ethers = nodeRequire('ethers');
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(merchantKey, provider);
    const contract = new ethers.Contract(contractAddress, MINT_ABI, wallet);

    const allUsers = await getAllAdminUsers();
    const targets = allUsers.filter((u) => userIds.includes(u.id));
    const results = [];

    for (const user of targets) {
      let txHash = null;
      try {
        const tx = await contract.mintBatch(user.address, ticketIds, amounts, '0x');
        const receipt = await tx.wait();
        txHash = receipt.hash;
      } catch (e) {
        return Response.json(
          { error: `Mint failed for ${user.address}: ${e.message}` },
          { status: 500 }
        );
      }

      await addTickets(user.address, ticketIds, amounts);
      results.push({ userId: user.id, address: user.address, txHash });
    }

    return Response.json({
      success: true,
      message: `Assigned tickets to ${targets.length} users`,
      results,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
