import { ethers, Interface, parseUnits, parseEther } from 'ethers';
import { createPublicClient, http, fallback, formatEther } from 'viem';
import { mainnet } from 'viem/chains';

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function transfer(address, uint256) returns (bool)"
];

export class EVMAdapter {
  constructor(chain = mainnet) {
    this.chain = chain;
    
    // Use viem's native transport for the specified chain
    this.client = createPublicClient({
      chain: this.chain,
      transport: http(), // Uses viem's default RPC for the chain
    });

    // For ethers compatibility, we use the first RPC from the chain's metadata
    this.currentUrl = this.chain.rpcUrls.default.http[0];
    this.provider = new ethers.JsonRpcProvider(this.currentUrl);
  }

  async getProvider() {
    // Ethers failover using chain's RPC list
    for (const url of this.chain.rpcUrls.default.http) {
        try {
            const tempProvider = new ethers.JsonRpcProvider(url);
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
    const balance = await this.client.getBalance({ address });
    return formatEther(balance);
  }

  async getBalanceToken(address, tokenAddress) {
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
    const [balance, decimals] = await Promise.all([
      contract.balanceOf(address),
      contract.decimals()
    ]);
    return ethers.formatUnits(balance, decimals);
  }

  async getBalanceTokens(address, tokenAddresses) {
    return Promise.all(tokenAddresses.map(token => this.getBalanceToken(address, token)));
  }

  async sign(privateKey, data) {
    const wallet = new ethers.Wallet(privateKey);
    return wallet.signMessage(data);
  }

  async signAndSend(privateKey, txRequest) {
    const wallet = new ethers.Wallet(privateKey, this.provider);
    
    // Normalize txRequest from high-level object
    let tx = { ...txRequest };
    
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

    const [estimatedGas, feeData] = await Promise.all([
        wallet.estimateGas(tx),
        this.provider.getFeeData(),
    ]);

    const response = await wallet.sendTransaction({
        ...tx,
        gasLimit: (estimatedGas * 110n) / 100n,
        gasPrice: feeData.gasPrice,
    });
    
    return response.wait();
  }

  async getTokenDecimals(tokenAddress) {
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
    return contract.decimals();
  }

  async getNFTs(userAddress, contractAddress) {
    try {
      // Step 1: Fetch user's ticket balances from the Server Bridge
      const response = await fetch(`http://localhost:8090/api/tickets?address=${userAddress}`);
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
            attributes: [
              { trait_type: "Category", value: eventMeta.category },
              { trait_type: "Venue", value: eventMeta.placeName },
              { trait_type: "Date", value: new Date(eventMeta.from).toLocaleDateString() }
            ]
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
    const response = await fetch('http://localhost:8090/api/scanner', {
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
    const response = await fetch('http://localhost:8090/api/scanner', {
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

