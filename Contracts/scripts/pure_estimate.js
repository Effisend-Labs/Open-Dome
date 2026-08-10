import { ethers } from 'ethers';
import { readFileSync } from 'fs';

async function main() {
  const artifact = JSON.parse(readFileSync('./artifacts/contracts/ReusablePass.sol/ReusablePass.json', 'utf8'));
  const bytecode = artifact.bytecode;
  const abi = artifact.abi;
  
  const provider = new ethers.JsonRpcProvider("https://mainnet.base.org");
  const factory = new ethers.ContractFactory(abi, bytecode);
  
  // Create unsigned deploy tx
  const deployTx = await factory.getDeployTransaction("0x69F6B4d206E19D2ef5838ed3E7150F2D22A9Fc7f");
  
  try {
    const gasEstimate = await provider.estimateGas(deployTx);
    const feeData = await provider.getFeeData();
    
    console.log("Estimated Gas:", gasEstimate.toString());
    console.log("Gas Price (wei):", feeData.gasPrice.toString());
    
    const costInWei = gasEstimate * feeData.gasPrice;
    const costInEth = ethers.formatEther(costInWei);
    
    console.log("Cost in ETH:", costInEth);
    console.log("Cost in USD (~$2600/ETH):", (Number(costInEth) * 2600).toFixed(6));
  } catch (error) {
    console.error("Estimation failed:", error.message);
  }
}

main().catch(console.error);
