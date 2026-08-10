import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'

const client = createPublicClient({
  chain: base,
  transport: http()
})

async function check() {
  const address = "0x69F6B4d206E19D2ef5838ed3E7150F2D22A9Fc7f";
  const balance = await client.getBalance({ address });
  console.log("ETH Balance of Merchant:", Number(balance) / 1e18);
}

check()
