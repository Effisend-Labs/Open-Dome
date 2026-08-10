const { ethers } = require("hardhat");

async function main() {
  const factory = await ethers.getContractFactory("ReusablePass");
  
  // Create an unsigned deployment transaction
  const deployTx = await factory.getDeployTransaction(
    "0x69F6B4d206E19D2ef5838ed3E7150F2D22A9Fc7f" // Example merchant address
  );
  
  // Connect to a public base RPC
  const provider = new ethers.JsonRpcProvider("https://mainnet.base.org");
  
  try {
    const gasEstimate = await provider.estimateGas(deployTx);
    const feeData = await provider.getFeeData();
    
    console.log("Estimated Gas:", gasEstimate.toString());
    console.log("Gas Price (wei):", feeData.gasPrice.toString());
    
    const costInWei = gasEstimate * feeData.gasPrice;
    const costInEth = ethers.formatEther(costInWei);
    
    console.log("Cost in ETH:", costInEth);
    
    // Convert to USD (assuming 1 ETH = ~$2600 as per current avg prices)
    console.log("Cost in USD (~$2600/ETH):", (Number(costInEth) * 2600).toFixed(4));
  } catch (error) {
    console.error("Estimation failed:", error.message);
  }
}

main().catch(console.error);
