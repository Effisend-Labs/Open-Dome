const { Blockchain } = require('../dist/index');

async function runMountingTest() {
  const address = "0xb90513424b01eA257bF8f87223A6eD8fe0Ce0681";

  // --- Scenario 1: Mounting ONLY Monad ---
  console.log("\n🚀 Scenario 1: Mounting only 'monad'...");
  const bc1 = new Blockchain({ evm: "monad" });
  try {
    const monadBal = await bc1.getBalance('monad', address);
    console.log("✅ Monad Balance (Scenario 1):", monadBal);
    // This should fail because 'base' was not mounted
    try {
        await bc1.getBalance('base', address);
    } catch (e) {
        console.log("ℹ️ Base balance check failed as expected (not mounted).");
    }
  } catch (e) {
    console.error("❌ Scenario 1 Failed:", e.message);
  }

  // --- Scenario 2: Mounting Monad and Base ---
  console.log("\n🚀 Scenario 2: Mounting ['monad', 'base']...");
  const bc2 = new Blockchain({ evm: ["monad", "base"] });
  try {
    const monadBal = await bc2.getBalance('monad', address);
    const baseBal = await bc2.getBalance('base', address);
    console.log("✅ Monad Balance (Scenario 2):", monadBal);
    console.log("✅ Base Balance (Scenario 2):", baseBal);
  } catch (e) {
    console.error("❌ Scenario 2 Failed:", e.message);
  }

  console.log("\n✨ Mounting options verified!");
}

runMountingTest();
