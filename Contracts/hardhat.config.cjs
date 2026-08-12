require("@nomicfoundation/hardhat-ethers");
const fs = require("fs");
const path = require("path");

function loadAdminEnv() {
  const envPath = path.join(__dirname, "..", "OpenDome", "OpenDomeAdminApp", ".env");
  if (!fs.existsSync(envPath)) return {};
  const env = {};
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

const adminEnv = loadAdminEnv();
const privateKey =
  process.env.DEPLOYER_PRIVATE_KEY ||
  process.env.MERCHANT_PRIVATE_KEY ||
  adminEnv.MERCHANT_PRIVATE_KEY ||
  "";
const rpcUrl =
  process.env.BASE_RPC_URL ||
  process.env.RPC_URL ||
  adminEnv.RPC_URL ||
  "https://mainnet.base.org";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      evmVersion: "cancun",
    },
  },
  networks: {
    hardhat: {},
    base: {
      url: rpcUrl,
      chainId: 8453,
      accounts: privateKey ? [privateKey] : [],
    },
  },
};
