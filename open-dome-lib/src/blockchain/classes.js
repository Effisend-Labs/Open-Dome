import * as allChains from 'viem/chains';
import { EVMAdapter } from './evm';
import { SolanaAdapter } from './solana';
import { StarknetAdapter } from './starknet';
import { getTokenDecimals } from './utils';

export class Blockchain {
  constructor(options = { evm: ['base'] }) {
    const evmList = Array.isArray(options.evm) ? options.evm : [options.evm];
    
    this.adapters = {
      solana: new SolanaAdapter([
        "https://public.rpc.solanavibestation.com",
        "https://solana.api.pocket.network",
        "https://solana.rpc.laine.co",
      ]),
      sol: null, // mapped later
      starknet: new StarknetAdapter([
        "https://starknet-rpc.publicnode.com",
        "https://rpc.starknet.lava.build",
        "https://api.cartridge.gg/x/starknet/mainnet",
      ]),
    };

    // Initialize EVM adapters
    evmList.forEach(chainInput => {
        let chainObj;
        if (typeof chainInput === 'string') {
            const key = chainInput.toLowerCase();
            // Try to find in viem/chains by name or key
            chainObj = allChains[chainInput] || Object.values(allChains).find(c => 
              c.name.toLowerCase() === key || c.network === key
            );
            
            // Fallback for monad until it's officially in viem (though user confirmed it is)
            // No custom fallback needed if it's in viem/chains
        } else {
            chainObj = chainInput; // User passed a viem chain object directly
        }

        if (chainObj) {
            const chainKey = typeof chainInput === 'string' ? chainInput.toLowerCase() : chainObj.name.toLowerCase();
            const adapter = new EVMAdapter(chainObj);
            this.adapters[chainKey] = adapter;
            
            // Also expose as property if it's the first one or specifically 'evm'
            if (!this.evm) {
                this.evm = adapter;
                this.adapters['evm'] = adapter; // General alias
            }
        }
    });

    // Alias sol
    this.adapters.sol = this.adapters.solana;
    this.solana = this.adapters.solana;
    this.starknet = this.adapters.starknet;
  }

  getAdapter(chain) {
    const adapter = this.adapters[chain.toLowerCase()];
    if (!adapter) throw new Error(`Unsupported chain: ${chain}`);
    return adapter;
  }

  async getBalance(chain, address) {
    return this.getAdapter(chain).getBalance(address);
  }

  async getBalanceToken(chain, address, tokenAddress) {
    return this.getAdapter(chain).getBalanceToken(address, tokenAddress);
  }

  async getBalanceTokens(chain, address, tokenAddresses) {
    return this.getAdapter(chain).getBalanceTokens(address, tokenAddresses);
  }

  async getNFTs(chain, address, contractAddress) {
    const adapter = this.getAdapter(chain);
    if (typeof adapter.getNFTs === 'function') {
      return adapter.getNFTs(address, contractAddress);
    }
    return [];
  }

  async markTicketAsUsed(chain, contractAddress, tokenId, authToken) {
    const adapter = this.getAdapter(chain);
    if (typeof adapter.markTicketAsUsed === 'function') {
      return adapter.markTicketAsUsed(contractAddress, tokenId, authToken);
    }
    throw new Error(`markTicketAsUsed not supported on chain: ${chain}`);
  }

  async consumePassAccess(chain, contractAddress, tokenId, amount, authToken) {
    const adapter = this.getAdapter(chain);
    if (typeof adapter.consumePassAccess === 'function') {
      return adapter.consumePassAccess(contractAddress, tokenId, amount, authToken);
    }
    throw new Error(`consumePassAccess not supported on chain: ${chain}`);
  }

  /**
   * Fetch NFTs across multiple chains using a configuration map
   * @param {string} address - The EVM address to scan
   * @param {Object} contractsMap - Map of chain to contract array { base: ["0x..."], arbitrum: ["0x..."] }
   * @returns {Promise<Array>} - Flat array of all discovered NFTs injected with network metadata
   */
  async getAllNFTs(address, contractsMap) {
    if (!address || !contractsMap) return [];
    const allNfts = [];
    const chains = Object.keys(contractsMap);

    await Promise.allSettled(chains.map(async (chain) => {
      const contracts = contractsMap[chain];
      if (!Array.isArray(contracts) || contracts.length === 0) return;

      await Promise.allSettled(contracts.map(async (contractAddress) => {
        try {
          const fetched = await this.getNFTs(chain, address, contractAddress);
          if (fetched && fetched.length > 0) {
            fetched.forEach(nft => {
              allNfts.push({ ...nft, network: chain });
            });
          }
        } catch (e) {
          console.warn(`[Blockchain] Error scanning ${chain} for ${contractAddress}:`, e.message);
        }
      }));
    }));
    return allNfts;
  }

  /**
   * Batch fetch balances across all supported chains
   * @param {Object} addresses - Map of chain to address { evm: "0x...", solana: "..." }
   */
  async getBalances(addresses) {
    const results = {};
    const promises = Object.keys(addresses).map(async (chain) => {
        try {
            results[chain] = await this.getBalance(chain, addresses[chain]);
        } catch (e) {
            results[chain] = "error";
            console.error(`Error fetching ${chain} balance:`, e);
        }
    });
    await Promise.all(promises);
    return results;
  }

  /**
   * Top-level sign and send
   * @param {Object} txObject - { chain, privateKey, tx }
   */
  async signAndSend(txObject) {
    const { chain, privateKey, tx } = txObject;
    return this.getAdapter(chain).signAndSend(privateKey, tx);
  }
}

export class Wallet {
  constructor(privateKey) {
    this.privateKey = privateKey;
    this.blockchain = new Blockchain();
  }

  address(chain) {
    // This would ideally derive the address from the private key
    // For now, return a placeholder or implement derivation
    return `derived_address_for_${chain}`;
  }

  async sign(chain, data) {
    return this.blockchain.getAdapter(chain).sign(this.privateKey, data);
  }

  async signAndSend(txObject) {
    const { chain, tx } = txObject;
    return this.blockchain.getAdapter(chain).signAndSend(this.privateKey, tx);
  }
}

export class Transfer {
  constructor(chain, amount) {
    this.chain = chain;
    this.amount = amount;
    this.type = 'native';
  }

  async toObject() {
    // Convert to a format expected by signAndSend
    return {
      chain: this.chain,
      amount: this.amount, // SDK handles zeros/decimals here
      tx: { /* Chain specific tx object */ }
    };
  }
}

export class TransferToken {
  constructor(chain, amount, tokenAddress) {
    this.chain = chain;
    this.amount = amount;
    this.tokenAddress = tokenAddress;
    this.type = 'token';
  }

  async toObject() {
    const decimals = await getTokenDecimals(this.chain, this.tokenAddress);
    return {
      chain: this.chain,
      amount: this.amount,
      tokenAddress: this.tokenAddress,
      decimals,
      tx: { /* Chain specific token tx object */ }
    };
  }
}
