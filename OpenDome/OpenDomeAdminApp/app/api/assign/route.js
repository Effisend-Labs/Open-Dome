import { NextResponse } from 'next/server';
import { getDb, saveDb } from '@/lib/db';
import { cookies } from 'next/headers';
import { ethers } from 'ethers';

// Helper to get current user
function getCurrentUser(db) {
  const sessionId = cookies().get('auth_session');
  if (!sessionId) return null;
  return db.users.find(u => u.id === sessionId.value) || null;
}

// ABI for mintBatch
const abi = [
  "function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data) external"
];

export async function POST(request) {
  try {
    const db = getDb();
    const currentUser = getCurrentUser(db);
    if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'CHECKER')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userIds, ticketIds, amounts } = await request.json();
    
    // Validate request
    if (!userIds || !ticketIds || !amounts || userIds.length === 0) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const usersToUpdate = db.users.filter(u => userIds.includes(u.id));

    // Connect to blockchain
    // For local prototype, we use the local Hardhat node URL
    // In production, this would be a Base RPC URL
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || "http://127.0.0.1:8545");
    
    // The Merchant Private Key (EVENT_MANAGER_ROLE)
    // For local prototype, we use the default Hardhat account #1 (or #0)
    // WARNING: Never hardcode private keys in production!
    const privateKey = process.env.MERCHANT_PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    const wallet = new ethers.Wallet(privateKey, provider);
    
    const contractAddress = process.env.CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    const contract = new ethers.Contract(contractAddress, abi, wallet);

    // Assign to each user
    for (const user of usersToUpdate) {
      // 1. Execute Blockchain Transaction (Mint Batch)
      console.log(`Minting tickets for ${user.address}...`);
      
      // We skip actual blockchain execution if we can't connect, just to allow the UI prototype to work
      try {
        const tx = await contract.mintBatch(user.address, ticketIds, amounts, "0x");
        await tx.wait();
        console.log(`Transaction successful: ${tx.hash}`);
      } catch (e) {
        console.warn("Blockchain transaction failed (is local node running?). Proceeding with DB update for prototype.", e.message);
      }

      // 2. Update Database
      for (let i = 0; i < ticketIds.length; i++) {
        user.tickets.push({
          ticketId: ticketIds[i],
          amount: amounts[i],
          assignedAt: new Date().toISOString()
        });
      }
    }

    saveDb(db);

    return NextResponse.json({ success: true, message: `Assigned tickets to ${usersToUpdate.length} users` });
  } catch (error) {
    console.error("Assignment error:", error);
    return NextResponse.json({ error: 'Failed to assign tickets' }, { status: 500 });
  }
}
