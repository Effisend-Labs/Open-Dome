const { Blockchain, Wallet, Transfer, TransferToken } = require('../dist/index');

/**
 * OPEN-DOME SDK SETUP GUIDE
 * 
 * 1. INITIALIZATION:
 * Before using any blockchain functions, you must initialize the Blockchain class.
 * You can specify which EVM chains to 'mount' by passing their names in the config.
 * Supported EVM names include any chain in 'viem/chains' (e.g., 'base', 'mainnet', 'polygon')
 * plus custom ones like 'monad'.
 * 
 * 2. WALLET SETUP:
 * If you need to sign data or send transactions, instantiate a Wallet with a private key.
 * 
 * 3. USAGE:
 * Use the blockchain instance for read-only calls (balances) and the wallet instance 
 * for state-changing calls (signing/sending).
 */

async function runFullTestSuite() {
  console.log("🌟 Starting OpenDome SDK Full Test Suite (Read-Only) 🌟");

  // --- SETUP STEP ---
  // You can add ANY chain from viem/chains here (e.g., 'linea', 'polygon', 'arbitrum')
  const blockchain = new Blockchain({
    evm: ['base', 'monad', 'linea']
  });

  const credentials = {
    evm: {
      address: "0xb90513424b01eA257bF8f87223A6eD8fe0Ce0681",
      privateKey: "0x3d9699846b258a35f08e0ca03793fb973deb84eae824a160673653b15a74e981"
    },
    hedera: {
      accountId: "0.0.10276473",
    },
    solana: {
      address: "FUL1iK9p2jotYhjPAodbzbNQ5fmHWEyDa6RrBuy6tt8u",
    },
    starknet: {
      address: "0x559caafea358d824c9e397e45858129cb4b6f366857e8713b88f559e8502b5d",
    }
  };

  try {
    // 1. Multi-Chain Balance Verification
    console.log("\n--- [1. Multi-Chain Balance Verification] ---");
    const balances = await blockchain.getBalances({
      base: credentials.evm.address,
      monad: credentials.evm.address,
      linea: credentials.evm.address, // Linea added dynamically!
      solana: credentials.solana.address,
      hedera: credentials.hedera.accountId,
      starknet: credentials.starknet.address
    });
    console.log("✅ Balances retrieved:", JSON.stringify(balances, null, 2));

    // 2. Token Balance Verification (USDC on Base)
    console.log("\n--- [2. Token Balance Verification] ---");
    const usdcOnBase = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
    try {
        const usdcBalance = await blockchain.getBalanceToken('base', credentials.evm.address, usdcOnBase);
        console.log(`✅ USDC Balance on Base: ${usdcBalance}`);
    } catch (e) {
        console.warn("⚠️ USDC fetch failed:", e.message);
    }

    // 3. Offline Signing (Wallet Class)
    console.log("\n--- [3. Offline Signing Verification] ---");
    const myWallet = new Wallet(credentials.evm.privateKey);
    const message = "OpenDome SDK Secure Signature Test";
    const signature = await myWallet.sign('base', message);
    console.log("✅ Base Signature generated:", signature);

    // 4. Transfer Object Preparation (Native)
    console.log("\n--- [4. Native Transfer Preparation] ---");
    const solTransfer = new Transfer('solana', 0.5);
    const solTx = await solTransfer.toObject();
    console.log("✅ Solana Transfer Object:", JSON.stringify(solTx, null, 2));

    // 5. Transfer Object Preparation (Token with Auto-Decimals)
    console.log("\n--- [5. Token Transfer Preparation] ---");
    // This will hit the network to fetch decimals
    const hbarTokenTransfer = new TransferToken('hedera', 25, '0.0.456858'); // USDC on Hedera
    const hbarTx = await hbarTokenTransfer.toObject();
    console.log("✅ Hedera Token Transfer Object:", JSON.stringify(hbarTx, null, 2));

    console.log("\n✨ Full SDK Test Suite Completed Successfully (No Transactions Sent) ✨");

  } catch (error) {
    console.error("\n❌ Test Suite Failed:", error.message);
    process.exit(1);
  }
}

runFullTestSuite();
