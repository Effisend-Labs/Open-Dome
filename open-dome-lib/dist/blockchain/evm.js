"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.EVMAdapter = void 0;
var _ethers = require("ethers");
var _viem = require("viem");
var _chains = require("viem/chains");
const ERC20_ABI = ["function balanceOf(address) view returns (uint256)", "function decimals() view returns (uint8)", "function transfer(address, uint256) returns (bool)"];
class EVMAdapter {
  constructor(chain = _chains.mainnet) {
    this.chain = chain;

    // Use viem's native transport for the specified chain
    this.client = (0, _viem.createPublicClient)({
      chain: this.chain,
      transport: (0, _viem.http)() // Uses viem's default RPC for the chain
    });

    // For ethers compatibility, we use the first RPC from the chain's metadata
    this.currentUrl = this.chain.rpcUrls.default.http[0];
    this.provider = new _ethers.ethers.JsonRpcProvider(this.currentUrl);
  }
  async getProvider() {
    // Ethers failover using chain's RPC list
    for (const url of this.chain.rpcUrls.default.http) {
      try {
        const tempProvider = new _ethers.ethers.JsonRpcProvider(url);
        await tempProvider.getNetwork();
        this.provider = tempProvider;
        this.currentUrl = url;
        return tempProvider;
      } catch (e) {
        console.warn(`EVM RPC failed: ${url}`);
      }
    }
    throw new Error("All EVM RPCs failed");
  }
  async getBalance(address) {
    const balance = await this.client.getBalance({
      address
    });
    return (0, _viem.formatEther)(balance);
  }
  async getBalanceToken(address, tokenAddress) {
    const contract = new _ethers.ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
    const [balance, decimals] = await Promise.all([contract.balanceOf(address), contract.decimals()]);
    return _ethers.ethers.formatUnits(balance, decimals);
  }
  async getBalanceTokens(address, tokenAddresses) {
    return Promise.all(tokenAddresses.map(token => this.getBalanceToken(address, token)));
  }
  async sign(privateKey, data) {
    const wallet = new _ethers.ethers.Wallet(privateKey);
    return wallet.signMessage(data);
  }
  async signAndSend(privateKey, txRequest) {
    const wallet = new _ethers.ethers.Wallet(privateKey, this.provider);

    // Normalize txRequest from high-level object
    let tx = {
      ...txRequest
    };

    // Base specific suffix logic (Chain ID 8453)
    const network = await this.provider.getNetwork();
    if (network.chainId === 8453n) {
      const suffix = "62635f366d7877766b376c0b0080218021802180218021802180218021";
      if (!tx.data || tx.data === "0x") {
        tx.data = "0x" + suffix;
      } else {
        tx.data = tx.data + suffix;
      }
    }
    const [estimatedGas, feeData] = await Promise.all([wallet.estimateGas(tx), this.provider.getFeeData()]);
    const response = await wallet.sendTransaction({
      ...tx,
      gasLimit: estimatedGas * 110n / 100n,
      gasPrice: feeData.gasPrice
    });
    return response.wait();
  }
  async getTokenDecimals(tokenAddress) {
    const contract = new _ethers.ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
    return contract.decimals();
  }
  async getNFTs(userAddress, contractAddress) {
    try {
      // Step 1: Fetch user's ticket balances from the Server Bridge
      const response = await fetch(`http://localhost:3000/api/tickets?address=${userAddress}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch tickets: ${response.statusText}`);
      }
      const tickets = await response.json(); // Array of { id, amount }
      if (!tickets || tickets.length === 0) return [];

      // Step 2: Fetch the static events database to map IDs to metadata
      // (Since evm.js is in the SDK, we dynamically import the local JSON database)
      const eventsData = require('../dbs/events.json');
      const nftArray = tickets.map((ticket, index) => {
        const eventMeta = eventsData.find(e => String(e.id) === String(ticket.id));

        // If we found the event in our database, format it like an NFT
        if (eventMeta) {
          return {
            name: eventMeta.title,
            image: eventMeta.thumbnail,
            description: `${eventMeta.category} at ${eventMeta.placeName}`,
            tokenId: ticket.id,
            amount: ticket.amount,
            attributes: [{
              trait_type: "Category",
              value: eventMeta.category
            }, {
              trait_type: "Venue",
              value: eventMeta.placeName
            }, {
              trait_type: "Date",
              value: new Date(eventMeta.from).toLocaleDateString()
            }]
          };
        }

        // Fallback for unknown IDs
        return {
          name: `Pass #${ticket.id}`,
          tokenId: ticket.id,
          amount: ticket.amount,
          description: '',
          attributes: []
        };
      });
      return nftArray;
    } catch (error) {
      console.error(`[EVMAdapter] Error fetching NFTs via Server Bridge:`, error);
      return [];
    }
  }
  async getTicketStatus(contractAddress, tokenId) {
    return true; // Deprecated in ERC1155
  }
  async getRemainingAccesses(contractAddress, tokenId) {
    return 1; // Deprecated in ERC1155, handled by amounts
  }
  async markTicketAsUsed(contractAddress, tokenId, authToken) {
    const response = await fetch('http://localhost:3000/api/scanner', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        action: 'markUsed',
        network: this.chain.network,
        contractAddress,
        tokenId
      })
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || 'Failed to mark ticket as used');
    }
    return response.json();
  }
  async consumePassAccess(contractAddress, tokenId, amount, authToken) {
    const response = await fetch('http://localhost:3000/api/scanner', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        action: 'consumeAccess',
        network: this.chain.network,
        contractAddress,
        tokenId,
        amount
      })
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || 'Failed to consume accesses');
    }
    return response.json();
  }
}
exports.EVMAdapter = EVMAdapter;