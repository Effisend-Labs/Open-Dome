import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'

const client = createPublicClient({
  chain: base,
  transport: http()
})

async function check() {
  const address = process.env.MERCHANT_ADDRESS;
  if (!address) throw new Error('MERCHANT_ADDRESS is not set');
  const balance = await client.getBalance({ address });
  console.log("ETH Balance of Merchant:", Number(balance) / 1e18);
}

check()
