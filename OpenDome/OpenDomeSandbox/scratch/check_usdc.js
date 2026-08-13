import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'

const client = createPublicClient({
  chain: base,
  transport: http()
})

const erc20Abi = [
  {
    "constant": true,
    "inputs": [{"name": "_owner", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "balance", "type": "uint256"}],
    "type": "function",
    "stateMutability": "view"
  }
];

async function check() {
  const address = process.env.MERCHANT_ADDRESS;
  if (!address) throw new Error('MERCHANT_ADDRESS is not set');
  const usdcAddress = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // Base USDC
  
  const balance = await client.readContract({
    address: usdcAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address]
  });
  console.log("USDC Balance:", Number(balance) / 1000000);
}

check()
