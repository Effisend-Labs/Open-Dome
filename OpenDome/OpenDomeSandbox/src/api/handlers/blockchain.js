import { Hono } from 'hono';
import { Wallets, Transactions } from '../../utilsAPI/passkeyDb';
import { translateErrorWithAI } from './agent';
import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';
import { randomUUID } from 'crypto';

const app = new Hono();

app.post('/transfer', async (c) => {
  try {
    let body = {};
    try { body = await c.req.json(); } catch { }
    
    const { userId, chain, toAddress, amount } = body;

    if (!userId || !toAddress || !amount) {
      return c.json({ error: "Missing required fields (userId, toAddress, amount)" }, 400);
    }

    // Securely retrieve the user's generated Circle Wallet map
    const walletDoc = await Wallets.doc(userId).get();
    if (!walletDoc.exists) {
      return c.json({ error: "User wallet not found" }, 404);
    }
    
    const { walletIds, address } = walletDoc.data();
    
    // Default to BASE if chain is omitted or not found in the map
    const targetChain = (chain || 'BASE').toUpperCase();
    const walletId = walletIds ? walletIds[targetChain] : walletDoc.data().walletId;

    if (!walletId) {
       return c.json({ error: `Wallet not found for requested chain: ${targetChain}` }, 404);
    }

    const circleClient = initiateDeveloperControlledWalletsClient({
      apiKey: process.env.CIRCLE_API_KEY,
      entitySecret: process.env.CIRCLE_ENTITY_SECRET,
    });

    console.log(`[Blockchain API] Preparing Circle Developer-Controlled tx from ${address} to ${toAddress}...`);
    
    let txHash;
    let status = "success";
    let errorMessage = null;

    try {
      // Execute the native transfer entirely through the Circle Developer SDK!
      // This completely obfuscates the private key from the backend.
      const txRes = await circleClient.createTransaction({
        walletId: walletId,
        tokenId: "native-token-uuid", // In a full implementation, you fetch the specific USDC or Native Token ID
        destinationAddress: toAddress,
        amounts: [amount.toString()],
        fee: {
          type: 'level',
          config: {
            feeLevel: 'MEDIUM'
          }
        },
        idempotencyKey: randomUUID()
      });

      txHash = txRes.data.id;
      
    } catch (e) {
      status = "failed";
      errorMessage = e.response?.data?.message || e.message;
      txHash = "0x" + Buffer.from(`failed_${Date.now()}`).toString('hex'); // pseudo-hash for tracking
    }

    // Log the transaction (successful or failed) to Firestore
    await Transactions.add({
      userId,
      fromAddress: address,
      toAddress,
      amount: amount.toString(),
      chain: chain || 'BASE',
      status,
      error: errorMessage || null,
      txHash: txHash,
      timestamp: new Date().toISOString()
    });

    if (status === "failed") {
      // 🚨 AGENT ERROR MANAGEMENT 🚨
      // Translate the Circle MPC Error natively into friendly UI copy
      const rawError = `Circle MPC Wallet Transaction failed on mainnet: ${errorMessage}`;
      const humanReadableError = await translateErrorWithAI(rawError);
      
      throw new Error(humanReadableError);
    }

    return c.json({
      status: "success",
      txHash: txHash,
      message: "Cross-chain transfer successfully executed via Circle Developer Wallets."
    });

  } catch (error) {
    console.error("[Blockchain API] Transaction Error:", error);
    return c.json({
      status: "error",
      message: error.message
    }, 400);
  }
});

export default app;
