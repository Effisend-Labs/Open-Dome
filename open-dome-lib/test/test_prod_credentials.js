const { Blockchain, Wallet } = require('../dist/index');

async function runProdTest() {
  console.log("🔍 Starting Production Balance & Sign Verification...");

  // Initialize with multiple EVM chains
  const blockchain = new Blockchain({
    evm: ['base', 'monad']
  });

  const credentials = {
    evm: {
      address: "0xb90513424b01eA257bF8f87223A6eD8fe0Ce0681",
      privateKey: "0x3d9699846b258a35f08e0ca03793fb973deb84eae824a160673653b15a74e981"
    },
    hedera: {
      accountId: "0.0.10276473",
      privateKeyDer: "3030020100300706052b8104000a042204203d9699846b258a35f08e0ca03793fb973deb84eae824a160673653b15a74e981"
    },
    solana: {
      address: "FUL1iK9p2jotYhjPAodbzbNQ5fmHWEyDa6RrBuy6tt8u",
      privateKey: "65PembW3hkwMSFF8wqS9aiyq7cNf1FxWeGAb8MXaZA4J3tRVd3g2y3ZP37Te8jL1aobLC2RhLp4GYFdga4jjJSqK"
    },
    starknet: {
      address: "0x559caafea358d824c9e397e45858129cb4b6f366857e8713b88f559e8502b5d",
      privateKey: "0x407a8eeb361d182514cbcf55eb789861e23fd65de29d91c8f7ad8c57ae85c88"
    }
  };

  try {
    // 1. Batch Balance Check (getBalances)
    console.log("\n--- [Test 1: Multi-Chain Production Balances] ---");
    // Hedera and Starknet often have network delays, wrapping in soft failure
    const balances = await blockchain.getBalances({
      base: credentials.evm.address,
      monad: credentials.evm.address, // Monad uses same EVM address
      solana: credentials.solana.address,
      hedera: credentials.hedera.accountId,
      starknet: credentials.starknet.address
    });
    console.log("Production Balances:", JSON.stringify(balances, null, 2));

    // 2. Wallet Signing Example (Offline)
    console.log("\n--- [Test 2: Offline Signing Verification] ---");
    const evmWallet = new Wallet(credentials.evm.privateKey);
    const signature = await evmWallet.sign('evm', "OpenDome Verification Message");
    console.log("EVM Message Signature:", signature);

    console.log("\n✅ Production credential check completed (Read-only).");
  } catch (error) {
    console.error("\n❌ Test Failed:", error.message);
  }
}

runProdTest();
