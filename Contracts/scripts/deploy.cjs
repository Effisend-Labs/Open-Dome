/**
 * Deploy OpenDomeERC1155Pass with the merchant wallet (Hardhat account 0).
 * Usage: npx hardhat run scripts/deploy.cjs --network base
 */
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

const METADATA_URI = "https://admin.opendome.xyz/api/metadata/{id}.json";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  if (!deployer) {
    throw new Error("No deployer account — set MERCHANT_PRIVATE_KEY / DEPLOYER_PRIVATE_KEY");
  }

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Network:", hre.network.name);
  console.log("Deployer (merchant):", deployer.address);
  console.log("Balance (ETH):", hre.ethers.formatEther(balance));

  if (balance === 0n) {
    throw new Error("Deployer has 0 ETH on this network — fund the merchant wallet first");
  }

  const Factory = await hre.ethers.getContractFactory("OpenDomeERC1155Pass");
  // defaultAdmin + initialScanner = merchant (mint + scan)
  const contract = await Factory.deploy(METADATA_URI, deployer.address, deployer.address);
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  const deployTx = contract.deploymentTransaction();
  const receipt = deployTx ? await deployTx.wait() : null;

  const out = {
    network: hre.network.name,
    chainId: Number((await hre.ethers.provider.getNetwork()).chainId),
    contractAddress: address,
    deployer: deployer.address,
    uri: METADATA_URI,
    txHash: receipt?.hash || deployTx?.hash || null,
    blockNumber: receipt?.blockNumber ?? null,
    deployedAt: new Date().toISOString(),
  };

  const dir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${hre.network.name}.json`);
  fs.writeFileSync(file, JSON.stringify(out, null, 2) + "\n");

  console.log("\nDeployed OpenDomeERC1155Pass");
  console.log("  address:", address);
  console.log("  tx:", out.txHash);
  console.log("  wrote:", file);
  console.log("\nNext: set CONTRACT_ADDRESS=" + address + " in App / Sandbox / Admin .env and Vercel");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
