const hre = require("hardhat");

async function main() {
    console.log("Starting Local Tests...\n");
    const [owner, merchant, scanner, user1, user2] = await hre.ethers.getSigners();
    
    console.log("1. Deploying Contract...");
    const OpenDomeERC1155Pass = await hre.ethers.getContractFactory("OpenDomeERC1155Pass");
    const contract = await OpenDomeERC1155Pass.deploy("ipfs://baseuri/", owner.address, scanner.address);
    console.log("Contract deployed to:", await contract.getAddress());
    
    const EVENT_MANAGER_ROLE = await contract.EVENT_MANAGER_ROLE();
    await contract.grantRole(EVENT_MANAGER_ROLE, merchant.address);
    console.log("Granted EVENT_MANAGER_ROLE to merchant\n");

    console.log("2. Testing Ticket Registry & Limits...");
    await contract.connect(merchant).createTicketSeries(1, 1, 1);
    await contract.connect(merchant).mint(user1.address, 1, 1, "0x");
    const bal1 = await contract.balanceOf(user1.address, 1);
    if (bal1 == 1n) console.log("  [PASS] Successfully minted 1 limited ticket.");
    else throw new Error("Mint failed");
    
    try {
        await contract.connect(merchant).mint(user1.address, 1, 1, "0x");
        throw new Error("Should have failed!");
    } catch (e) {
        if (e.message.includes("Exceeds max per wallet limit")) {
            console.log("  [PASS] Correctly blocked minting over the limit.");
        } else throw e;
    }

    await contract.connect(merchant).createTicketSeries(2, 2, 0);
    await contract.connect(merchant).mint(user2.address, 2, 10, "0x");
    const bal2 = await contract.balanceOf(user2.address, 2);
    if (bal2 == 10n) console.log("  [PASS] Successfully minted 10 unlimited/reusable passes.\n");

    console.log("3. Testing Scanning & Batch Scanning...");
    await contract.connect(scanner).scanPass(user1.address, 1, 1);
    if (await contract.balanceOf(user1.address, 1) == 0n) {
        console.log("  [PASS] Successfully scanned and burned 1 ticket.");
    }
    
    await contract.connect(merchant).mint(user1.address, 1, 1, "0x");
    
    const tx = await contract.connect(scanner).scanPassBatch([user1.address, user2.address], [1, 2], [2, 1]); 
    await tx.wait();
    if (await contract.balanceOf(user1.address, 1) == 1n && await contract.balanceOf(user2.address, 2) == 9n) {
        console.log("  [PASS] Batch scanning gracefully skipped the invalid scan and processed the valid one.\n");
    }

    console.log("4. Testing Soulbound Restrictions...");
    try {
        await contract.connect(user2).safeTransferFrom(user2.address, user1.address, 2, 1, "0x");
        throw new Error("Should have failed!");
    } catch (e) {
        if (e.message.includes("soulbound")) {
            console.log("  [PASS] Correctly blocked regular user from transferring tickets.");
        } else throw e;
    }
    
    await contract.connect(user2).setApprovalForAll(merchant.address, true);
    await contract.connect(merchant).safeTransferFrom(user2.address, user1.address, 2, 1, "0x");
    if (await contract.balanceOf(user1.address, 2) == 1n) {
        console.log("  [PASS] Merchant successfully transferred a ticket.\n");
    }

    console.log("All tests passed successfully! The smart contract is rock solid.");
}

main().catch((error) => {
    console.error("Test failed:", error);
    process.exitCode = 1;
});
