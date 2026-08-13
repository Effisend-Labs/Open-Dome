const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("OpenDomeERC1155Pass", function () {
    let contract, owner, merchant, scanner, user1, user2;
    
    beforeEach(async function () {
        [owner, merchant, scanner, user1, user2] = await ethers.getSigners();
        
        const OpenDomeERC1155Pass = await ethers.getContractFactory("OpenDomeERC1155Pass");
        contract = await OpenDomeERC1155Pass.deploy("ipfs://baseuri/", owner.address, scanner.address);
        
        // Grant merchant role for easier testing
        const EVENT_MANAGER_ROLE = await contract.EVENT_MANAGER_ROLE();
        await contract.grantRole(EVENT_MANAGER_ROLE, merchant.address);
    });

    describe("Ticket Registry & Limits", function () {
        it("Should enforce maxPerWallet limit", async function () {
            // Create a strict 1-ticket limit series (Single Event)
            await contract.connect(merchant).createTicketSeries(1, 1, 1); // id: 1, type: SINGLE_EVENT, max: 1
            
            // Mint 1 ticket should succeed
            await contract.connect(merchant).mint(user1.address, 1, 1, "0x");
            expect(await contract.balanceOf(user1.address, 1)).to.equal(1);
            
            // Minting another ticket to the same user should fail
            await expect(
                contract.connect(merchant).mint(user1.address, 1, 1, "0x")
            ).to.be.revertedWith("Exceeds max per wallet limit");
        });

        it("Should allow unlimited mints if maxPerWallet is 0", async function () {
            // Create a multi-entry pass (Rollercoaster)
            await contract.connect(merchant).createTicketSeries(2, 2, 0); // id: 2, type: REUSABLE_PASS, max: 0
            
            // Mint 10 tickets
            await contract.connect(merchant).mint(user1.address, 2, 10, "0x");
            expect(await contract.balanceOf(user1.address, 2)).to.equal(10);
            
            // Mint 5 more
            await contract.connect(merchant).mint(user1.address, 2, 5, "0x");
            expect(await contract.balanceOf(user1.address, 2)).to.equal(15);
        });
    });

    describe("Scanning & Batch Scanning", function () {
        beforeEach(async function () {
            await contract.connect(merchant).createTicketSeries(1, 1, 1);
            await contract.connect(merchant).createTicketSeries(2, 2, 0);
            
            // Give user1 a single event ticket
            await contract.connect(merchant).mint(user1.address, 1, 1, "0x");
            
            // Give user2 a 10-use pass
            await contract.connect(merchant).mint(user2.address, 2, 10, "0x");
        });

        it("Should burn ticket on scan", async function () {
            await contract.connect(scanner).scanPass(user1.address, 1, 1);
            expect(await contract.balanceOf(user1.address, 1)).to.equal(0);
        });

        it("Should gracefully skip invalid scans in a batch", async function () {
            // User1 has 1 ticket of ID 1. User2 has 10 of ID 2.
            // Let's try to batch scan: 
            // 1. User1 scanning ID 1 (amount 2) -> Should fail silently (only has 1)
            // 2. User2 scanning ID 2 (amount 1) -> Should succeed
            
            await expect(
                contract.connect(scanner).scanPassBatch(
                    [user1.address, user2.address],
                    [1, 2],
                    [2, 1] // User 1 trying to scan 2, User 2 scanning 1
                )
            ).to.emit(contract, "BatchScanFailed")
             .withArgs(user1.address, 1, "Insufficient Balance")
             .and.to.emit(contract, "PassesScanned")
             .withArgs(user2.address, 2, 1);
             
             // User1 should still have 1
             expect(await contract.balanceOf(user1.address, 1)).to.equal(1);
             // User2 should have 9
             expect(await contract.balanceOf(user2.address, 2)).to.equal(9);
        });
    });

    describe("Soulbound Restrictions", function () {
        beforeEach(async function () {
            await contract.connect(merchant).createTicketSeries(1, 1, 0);
            await contract.connect(merchant).mint(user1.address, 1, 5, "0x");
        });

        it("Should prevent user from transferring ticket", async function () {
            await expect(
                contract.connect(user1).safeTransferFrom(user1.address, user2.address, 1, 1, "0x")
            ).to.be.revertedWith("Tickets are soulbound: transfers restricted to merchant");
        });

        it("Should allow merchant to transfer ticket", async function () {
            // user1 has to approve merchant first for standard ERC1155, 
            // but the override prevents transfer anyway unless merchant is msg.sender
            await contract.connect(user1).setApprovalForAll(merchant.address, true);
            
            await contract.connect(merchant).safeTransferFrom(user1.address, user2.address, 1, 2, "0x");
            expect(await contract.balanceOf(user2.address, 1)).to.equal(2);
            expect(await contract.balanceOf(user1.address, 1)).to.equal(3);
        });
    });
});
