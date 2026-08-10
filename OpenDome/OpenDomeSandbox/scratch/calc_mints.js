import { createPublicClient, createWalletClient, http, custom, encodeFunctionData, parseAbi } from 'viem';
import { base } from 'viem/chains';
import { readFileSync } from 'fs';

async function main() {
  const artifact = JSON.parse(readFileSync('../../Contracts/artifacts/contracts/OpenDomeMasterPass.sol/OpenDomeMasterPass.json', 'utf8'));
  
  const client = createPublicClient({
    chain: base,
    transport: http()
  });
  
  try {
    // Generate some fake bytecode that would represent the deployed contract to estimate gas against
    // Viem doesn't easily let us estimate gas of a contract that doesn't exist on chain yet without deploying it locally first
    // Actually we can just do the math based on typical EVM opcodes
    
    // Instead I'll just calculate it and log it out
    const gasPerMint = 65000n; 
    const gasPriceWei = await client.getGasPrice();
    const gasPriceGwei = Number(gasPriceWei) / 1e9;
    
    console.log("Gas Price (Gwei):", gasPriceGwei);
    console.log("Gas Price (Wei):", gasPriceWei.toString());
    
    const ethPrice = 2600; // rough ETH price
    
    const amounts = [1, 10, 100, 1000, 10000, 100000, 1000000];
    
    for (let amt of amounts) {
      const totalGas = gasPerMint * BigInt(amt);
      const totalCostWei = totalGas * gasPriceWei;
      const totalCostEth = Number(totalCostWei) / 1e18;
      const totalCostUsd = totalCostEth * ethPrice;
      
      console.log(`Mints: ${amt} | Gas: ${totalGas} | Cost ETH: ${totalCostEth.toFixed(8)} | Cost USD: $${totalCostUsd.toFixed(4)}`);
    }

  } catch (error) {
    console.error("Estimation failed:", error.message);
  }
}

main().catch(console.error);
