import { ethers } from 'ethers';

// In Expo API Routes, process.env loads variables from the Sandbox .env
const MERCHANT_PRIVATE_KEY = process.env.MERCHANT_PRIVATE_KEY;
// The expected cookie/token for our mock scanner bridge
const VALID_ADMIN_TOKEN = "admin-session-token-123";

// Map viem network strings to RPC URLs (or use a provider API like Alchemy)
const RPC_URLS = {
  'base': 'https://mainnet.base.org',
  'arbitrum': 'https://arb1.arbitrum.io/rpc',
  'optimism': 'https://mainnet.optimism.io',
};

export async function POST(req) {
  try {
    // 1. Validate Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || authHeader !== `Bearer ${VALID_ADMIN_TOKEN}`) {
      return Response.json({ message: 'Unauthorized Scanner Access' }, { status: 401 });
    }

    if (!MERCHANT_PRIVATE_KEY) {
      return Response.json({ message: 'Merchant wallet not configured on server' }, { status: 500 });
    }

    const body = await req.json();
    const { action, network, contractAddress, tokenId, amount } = body;

    const rpcUrl = RPC_URLS[network.toLowerCase()];
    if (!rpcUrl) {
      return Response.json({ message: `Unsupported network: ${network}` }, { status: 400 });
    }

    // 2. Setup Ethers Server-Side
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(MERCHANT_PRIVATE_KEY, provider);

    // 3. Execute Action
    let tx;
    if (action === 'markUsed') {
      const ABI = ["function markAsUsed(uint256)"];
      const contract = new ethers.Contract(contractAddress, ABI, wallet);
      tx = await contract.markAsUsed(tokenId);
    } 
    else if (action === 'consumeAccess') {
      const ABI = ["function consumeAccess(uint256, uint256)"];
      const contract = new ethers.Contract(contractAddress, ABI, wallet);
      tx = await contract.consumeAccess(tokenId, amount);
    } 
    else {
      return Response.json({ message: 'Unknown scanner action' }, { status: 400 });
    }

    // Wait for the transaction to be mined
    const receipt = await tx.wait();

    return Response.json({ 
      success: true, 
      txHash: receipt.hash,
      message: `Transaction successful`
    });

  } catch (error) {
    console.error("[Scanner API Error]", error);
    
    // Attempt to extract the custom solidity error if available
    let errorMsg = error.message;
    if (error.reason) errorMsg = error.reason;
    if (error.data && error.data.message) errorMsg = error.data.message;

    return Response.json({ message: errorMsg }, { status: 500 });
  }
}
