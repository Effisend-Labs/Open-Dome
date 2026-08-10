const { ethers } = require("ethers");

/**
 * Example Server Bridge Code (Node.js)
 * This function generates the cryptographic signature required for a user to mint a ticket.
 * 
 * @param {string} userWalletAddress - The wallet address of the user who is buying the ticket
 * @param {number} ticketId - The ERC1155 ID of the ticket they are buying
 * @param {number} amount - How many tickets they are buying
 * @param {string} contractAddress - The address of the deployed OpenDomeERC1155Pass contract
 * @param {number} chainId - The network Chain ID (e.g., 8453 for Base Mainnet, 31337 for Local)
 */
async function generateMintSignature(userWalletAddress, ticketId, amount, contractAddress, chainId) {
    // 1. Initialize the Merchant's private key (MUST have the EVENT_MANAGER_ROLE)
    // NEVER expose this to the frontend. This stays safely on your server.
    const merchantPrivateKey = process.env.MERCHANT_PRIVATE_KEY;
    const merchantWallet = new ethers.Wallet(merchantPrivateKey);

    // 2. Recreate the EXACT same hash that the Smart Contract will check.
    // In Solidity, we used: keccak256(abi.encodePacked(block.chainid, address(this), _msgSender(), id, amount))
    const messageHash = ethers.solidityPackedKeccak256(
        ["uint256", "address", "address", "uint256", "uint256"],
        [chainId, contractAddress, userWalletAddress, ticketId, amount]
    );

    // 3. Sign the hash
    // Ethers automatically adds the Ethereum Signed Message prefix required by OpenZeppelin's ECDSA.recover
    const signature = await merchantWallet.signMessage(ethers.getBytes(messageHash));

    console.log(`Generated Signature for ${userWalletAddress} to mint ${amount} of ID ${ticketId}`);
    console.log(`Signature: ${signature}`);
    
    return signature;
}

// Example Execution
// generateMintSignature("0xUserWallet...", 205, 1, "0xContract...", 8453);
