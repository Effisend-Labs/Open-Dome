"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.StarknetAdapter = void 0;
var _starknet = require("starknet");
var _utils = require("./utils");
class StarknetAdapter {
  constructor(nodeUrls = ['https://starknet-mainnet.public.blastapi.io']) {
    this.nodeUrls = Array.isArray(nodeUrls) ? nodeUrls : [nodeUrls];
  }
  async getProvider() {
    // Basic failover logic
    for (const url of this.nodeUrls) {
      try {
        const provider = new _starknet.RpcProvider({
          nodeUrl: url
        });
        await provider.getBlockNumber();
        return provider;
      } catch (e) {
        console.warn(`RPC failed: ${url}`);
      }
    }
    throw new Error("All Starknet RPCs failed");
  }
  async getBalance(address) {
    const ethAddress = '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';
    return this.getBalanceToken(address, ethAddress);
  }
  async getBalanceToken(address, tokenAddress) {
    const provider = await this.getProvider();
    const normalizedAddress = (0, _utils.normalizeStarknetAddress)(address);
    const normalizedToken = (0, _utils.normalizeStarknetAddress)(tokenAddress);
    const res = await provider.callContract({
      contractAddress: normalizedToken,
      entrypoint: 'balanceOf',
      calldata: [normalizedAddress]
    });
    if (!res || !Array.isArray(res)) {
      throw new Error("Invalid response from Starknet callContract");
    }
    const balance = _starknet.num.toBigInt(res[0]);
    return (Number(balance) / 1e18).toString(); // Simplification
  }
  async getBalanceTokens(address, tokenAddresses) {
    return Promise.all(tokenAddresses.map(token => this.getBalanceToken(address, token)));
  }
  async sign(privateKey, data) {
    // Starknet signature logic
    return "signature_placeholder";
  }
  async signAndSend(privateKey, {
    address,
    call
  }) {
    const provider = await this.getProvider();
    const account = new _starknet.Account(provider, address, privateKey);
    const tx = await account.execute(call);
    return tx.transaction_hash;
  }
}
exports.StarknetAdapter = StarknetAdapter;