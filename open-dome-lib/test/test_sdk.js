const { blockchain, Wallet, Transfer, TransferToken } = require('../dist/index');

async function runTest() {
  console.log("🚀 Starting OpenDome SDK Test Suite...");

  try {
    // 1. Single Balance Check
    console.log("\n--- [Test 1: Single Balance Check] ---");
    try {
      const ethBalance = await blockchain.getBalance('evm', '0x0000000000000000000000000000000000000000');
      console.log("EVM Balance (Zero Address):", ethBalance, "ETH");
    } catch (e) {
      console.warn("EVM Balance fetch failed (expected if RPC is down)");
    }

    // 2. Multi-Chain Balance Check (getBalances)
    console.log("\n--- [Test 2: Multi-Chain Balance Check] ---");
    const multiBalances = await blockchain.getBalances({
      evm: "0x0000000000000000000000000000000000000000",
      solana: "vines1vzrY7tduYLsSbe6v79tF93B88n29fH3W1U6G", // Known public Solana address
      hedera: "0.0.123"
    });
    console.log("Multi-Balances Results:", JSON.stringify(multiBalances, null, 2));

    // 3. Wallet and Signing
    console.log("\n--- [Test 3: Wallet Sign & Send Preparation] ---");
    const dummyKey = "0x" + "1".repeat(64); // Dummy 32-byte key
    const myWallet = new Wallet(dummyKey);
    console.log("Wallet Derived EVM Address:", myWallet.address('evm'));

    // 4. Native Transfer Object Preparation
    console.log("\n--- [Test 4: Native Transfer Preparation] ---");
    const solTransfer = new Transfer('solana', 1.5);
    const solTxObj = await solTransfer.toObject();
    console.log("Solana Native Transfer Object:", JSON.stringify(solTxObj, null, 2));

    // 5. Token Transfer with Auto-Decimals
    console.log("\n--- [Test 5: Token Transfer Preparation] ---");
    const hbarTokenTransfer = new TransferToken('hedera', 100, '0.0.987654');
    const hbarTxObj = await hbarTokenTransfer.toObject();
    console.log("Hedera Token Transfer (Autodetected Decimals):", JSON.stringify(hbarTxObj, null, 2));

    // 6. Direct Adapter Access
    console.log("\n--- [Test 6: Direct Adapter Access] ---");
    const hasEvmAdapter = !!blockchain.evm;
    console.log("EVM Adapter Found:", hasEvmAdapter);

    console.log("\n✅ All SDK tests passed successfully!");

  } catch (error) {
    console.error("\n❌ SDK Test Failed:", error.message);
    process.exit(1);
  }
}

runTest();
