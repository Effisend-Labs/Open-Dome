import "@nomicfoundation/hardhat-ethers";

/** @type import('hardhat/config').HardhatUserConfig */
export default {
  plugins: ["@nomicfoundation/hardhat-ethers"],
  solidity: {
    version: "0.8.24",
    settings: {
      evmVersion: "cancun",
    },
  },
};
