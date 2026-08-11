import hre from "hardhat";

async function main() {
  console.log("Starting Local Tests...\n");
  const [owner, merchant, scanner, user1, user2] = await hre.ethers.getSigners();

  console.log("1. Deploying Contract...");
  const Factory = await hre.ethers.getContractFactory("OpenDomeERC1155Pass");
  const contract = await Factory.deploy("ipfs://baseuri/", owner.address, scanner.address);
  console.log("Contract deployed to:", await contract.getAddress());

  const EVENT_MANAGER_ROLE = await contract.EVENT_MANAGER_ROLE();
  await contract.grantRole(EVENT_MANAGER_ROLE, merchant.address);
  console.log("Granted EVENT_MANAGER_ROLE to merchant\n");

  console.log("2. Testing Merchant Mint...");
  await contract.connect(merchant).mint(user1.address, 1, 1, "0x");
  if ((await contract.balanceOf(user1.address, 1)) !== 1n) {
    throw new Error("Mint failed");
  }
  console.log("  [PASS] Merchant minted 1 pass.");

  await contract.connect(merchant).mintBatch(user2.address, [2], [10], "0x");
  if ((await contract.balanceOf(user2.address, 2)) !== 10n) {
    throw new Error("Batch mint failed");
  }
  console.log("  [PASS] Merchant batch-minted 10 reusable passes.\n");

  console.log("3. Testing Role Barriers...");
  try {
    await contract.connect(user1).mint(user1.address, 99, 1, "0x");
    throw new Error("Should have failed!");
  } catch (e) {
    if (String(e.message).includes("AccessControl") || String(e.message).includes("reverted")) {
      console.log("  [PASS] Regular user cannot mint.");
    } else throw e;
  }

  console.log("4. Testing Scanning...");
  // Merchant can scan too
  await contract.connect(merchant).mint(user1.address, 3, 1, "0x");
  await contract.connect(merchant).scanPass(user1.address, 3, 1);
  if ((await contract.balanceOf(user1.address, 3)) !== 0n) {
    throw new Error("Merchant scan failed");
  }
  console.log("  [PASS] Merchant can scan.");

  await contract.connect(scanner).scanPass(user1.address, 1, 1);
  if ((await contract.balanceOf(user1.address, 1)) !== 0n) {
    throw new Error("Scan burn failed");
  }
  console.log("  [PASS] Scanner burned 1 ticket.");

  await contract.connect(merchant).mint(user1.address, 1, 1, "0x");
  await contract.connect(scanner).scanPassBatch(
    [user1.address, user2.address],
    [1, 2],
    [2, 1]
  );
  if (
    (await contract.balanceOf(user1.address, 1)) !== 1n ||
    (await contract.balanceOf(user2.address, 2)) !== 9n
  ) {
    throw new Error("Batch scan failed");
  }
  console.log("  [PASS] Batch scan skipped invalid and processed valid.\n");

  console.log("5. Testing Soulbound...");
  try {
    await contract.connect(user2).safeTransferFrom(user2.address, user1.address, 2, 1, "0x");
    throw new Error("Should have failed!");
  } catch (e) {
    if (String(e.message).includes("soulbound")) {
      console.log("  [PASS] User cannot transfer.");
    } else throw e;
  }

  await contract.connect(user2).setApprovalForAll(merchant.address, true);
  await contract.connect(merchant).safeTransferFrom(user2.address, user1.address, 2, 1, "0x");
  if ((await contract.balanceOf(user1.address, 2)) !== 1n) {
    throw new Error("Merchant transfer failed");
  }
  console.log("  [PASS] Merchant can reassign.\n");

  console.log("All tests passed — slim merchant/scanner contract is solid.");
}

main().catch((error) => {
  console.error("Test failed:", error);
  process.exitCode = 1;
});
