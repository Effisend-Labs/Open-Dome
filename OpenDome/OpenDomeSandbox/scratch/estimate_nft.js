import { encodeDeployData } from 'viem';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { readFileSync } from 'fs';

async function main() {
  const artifact = JSON.parse(readFileSync('../../Contracts/artifacts/contracts/ReusablePass.sol/ReusablePass.json', 'utf8'));
  const bytecode = artifact.bytecode;
  const abi = artifact.abi;
  
  const client = createPublicClient({
    chain: base,
    transport: http()
  });
  
  try {
    const data = encodeDeployData({
      abi,
      bytecode,
      args: ['0x0000000000000000000000000000000000000000', '0x0000000000000000000000000000000000000000']
    });
    const gasEstimate = await client.estimateGas({
      data,
    });
    
    const gasPrice = await client.getGasPrice();
    
    console.log("Estimated Gas:", gasEstimate.toString());
    console.log("Gas Price (wei):", gasPrice.toString());
    
    const costInWei = gasEstimate * gasPrice;
    const costInEth = Number(costInWei) / 1e18;
    
    console.log("Cost in ETH:", costInEth);
    console.log("Cost in USD (~$2600/ETH):", (costInEth * 2600).toFixed(6));
  } catch (error) {
    console.error("Estimation failed:", error.message);
  }
}

main().catch(console.error);
