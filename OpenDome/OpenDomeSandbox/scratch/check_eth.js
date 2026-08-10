import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'

const client = createPublicClient({
  chain: base,
  transport: http()
})

async function check() {
  const address = "0x1f6d686299a9432d7f1e78f0659a995ee5848faa";
  const balance = await client.getBalance({ address });
  console.log("ETH Balance of User:", Number(balance) / 1e18);
}

check()
