"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.EVMAdapter = void 0;
var _ethers = require("ethers");
var _viem = require("viem");
var _chains = require("viem/chains");
var _passContract = require("./passContract");
const ERC20_ABI = ['function balanceOf(address) view returns (uint256)', 'function decimals() view returns (uint8)', 'function transfer(address, uint256) returns (bool)'];
function resolveBridgeUrl(explicit) {
  return (explicit || typeof process !== 'undefined' && process.env?.OPENDOME_BRIDGE_URL || typeof process !== 'undefined' && process.env?.ADMIN_BRIDGE_URL || _passContract.DEFAULT_BRIDGE_URL).replace(/\/$/, '');
}
function resolvePassAddress(explicit) {
  return explicit || typeof process !== 'undefined' && process.env?.CONTRACT_ADDRESS || _passContract.OPENDOME_PASS_ADDRESS;
}
function networkKey(chain) {
  if (!chain) return 'base';
  if (chain.network) return String(chain.network).toLowerCase();
  if (chain.name) {
    const n = String(chain.name).toLowerCase();
    if (n.includes('base')) return 'base';
    if (n.includes('arbitrum')) return 'arbitrum';
    if (n.includes('optimism')) return 'optimism';
    if (n.includes('polygon')) return 'polygon';
  }
  if (chain.id === 8453) return 'base';
  return 'base';
}
class EVMAdapter {
  constructor(chain = _chains.mainnet, options = {}) {
    this.chain = chain;
    this.bridgeUrl = resolveBridgeUrl(options.bridgeUrl);
    this.passAddress = resolvePassAddress(options.passAddress);
    this.client = (0, _viem.createPublicClient)({
      chain: this.chain,
      transport: (0, _viem.http)()
    });
    this.currentUrl = this.chain.rpcUrls.default.http[0];
    this.provider = _ethers.ethers && typeof _ethers.ethers.JsonRpcProvider === 'function' ? new _ethers.ethers.JsonRpcProvider(this.currentUrl) : null;
  }
  async getProvider() {
    if (!_ethers.ethers || typeof _ethers.ethers.JsonRpcProvider !== 'function') {
      throw new Error('ethers is not available in this runtime');
    }
    for (const url of this.chain.rpcUrls.default.http) {
      try {
        const tempProvider = new _ethers.ethers.JsonRpcProvider(url);
        await tempProvider.getNetwork();
        this.provider = tempProvider;
        this.currentUrl = url;
        return tempProvider;
      } catch {
        console.warn(`EVM RPC failed: ${url}`);
      }
    }
    throw new Error('All EVM RPCs failed');
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
    let tx = {
      ...txRequest
    };
    const network = await this.provider.getNetwork();
    if (network.chainId === 8453n) {
      const suffix = '62635f366d7877766b376c0b0080218021802180218021802180218021';
      if (!tx.data || tx.data === '0x') {
        tx.data = '0x' + suffix;
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
  getPassContract(signerOrProvider, contractAddress) {
    return new _ethers.ethers.Contract(resolvePassAddress(contractAddress || this.passAddress), _passContract.OPENDOME_PASS_ABI, signerOrProvider);
  }

  /**
   * Mint one pass id.
   * Bridge path: authToken must be OpenDome host JWT for @altaga (god).
   * Direct path: privateKey only on trusted server runtimes.
   */
  async mintPass({
    to,
    tokenId,
    amount = 1,
    privateKey,
    authToken,
    contractAddress,
    bridgeUrl
  } = {}) {
    if (!to || tokenId == null) {
      throw new Error('mintPass requires to and tokenId');
    }
    if (privateKey) {
      await this.getProvider();
      const wallet = new _ethers.ethers.Wallet(privateKey, this.provider);
      const contract = this.getPassContract(wallet, contractAddress);
      const tx = await contract.mint(to, tokenId, amount, '0x');
      const receipt = await tx.wait();
      return {
        success: true,
        txHash: receipt.hash,
        mode: 'direct'
      };
    }
    return this._bridgeMint({
      to,
      ids: [tokenId],
      amounts: [amount],
      authToken,
      contractAddress,
      bridgeUrl
    });
  }

  /**
   * Batch mint (multiple token ids to one address).
   * Bridge path: authToken = OpenDome host JWT for @altaga (god) only.
   */
  async mintBatch({
    to,
    ids,
    amounts,
    privateKey,
    authToken,
    contractAddress,
    bridgeUrl
  } = {}) {
    if (!to || !ids?.length || !amounts?.length) {
      throw new Error('mintBatch requires to, ids, and amounts');
    }
    if (ids.length !== amounts.length) {
      throw new Error('ids and amounts length mismatch');
    }
    if (privateKey) {
      await this.getProvider();
      const wallet = new _ethers.ethers.Wallet(privateKey, this.provider);
      const contract = this.getPassContract(wallet, contractAddress);
      const tx = await contract.mintBatch(to, ids, amounts, '0x');
      const receipt = await tx.wait();
      return {
        success: true,
        txHash: receipt.hash,
        mode: 'direct'
      };
    }
    return this._bridgeMint({
      to,
      ids,
      amounts,
      authToken,
      contractAddress,
      bridgeUrl
    });
  }
  async _bridgeMint({
    to,
    ids,
    amounts,
    authToken,
    contractAddress,
    bridgeUrl
  }) {
    if (!authToken) {
      throw new Error('mint requires authToken (GOD OpenDome JWT) or privateKey (server/merchant)');
    }
    const base = resolveBridgeUrl(bridgeUrl || this.bridgeUrl);
    const response = await fetch(`${base}/api/mint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
        'X-OpenDome-Jwt': authToken
      },
      body: JSON.stringify({
        to,
        ids,
        amounts,
        network: networkKey(this.chain),
        contractAddress: resolvePassAddress(contractAddress || this.passAddress)
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || data.error || 'Mint failed via bridge');
    }
    return {
      ...data,
      mode: 'bridge'
    };
  }
  async getNFTs(userAddress, contractAddress) {
    try {
      const response = await fetch(`${this.bridgeUrl}/api/tickets?address=${encodeURIComponent(userAddress)}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch tickets: ${response.statusText}`);
      }
      const tickets = await response.json();
      if (!tickets || tickets.length === 0) return [];
      const eventsData = require('../dbs/events.json');
      const pass = resolvePassAddress(contractAddress || this.passAddress);
      return tickets.map(ticket => {
        const ticketId = ticket.tokenId ?? ticket.ticketId ?? ticket.id;
        const eventMeta = eventsData.find(e => String(e.id) === String(ticketId));
        if (eventMeta) {
          return {
            name: eventMeta.title,
            image: eventMeta.thumbnail,
            description: `${eventMeta.category} at ${eventMeta.placeName}`,
            tokenId: ticketId,
            amount: ticket.amount,
            contractAddress: pass,
            attributes: [{
              trait_type: 'Category',
              value: eventMeta.category
            }, {
              trait_type: 'Venue',
              value: eventMeta.placeName
            }, {
              trait_type: 'Date',
              value: new Date(eventMeta.from).toLocaleDateString()
            }]
          };
        }
        return {
          name: `Pass #${ticketId}`,
          tokenId: ticketId,
          amount: ticket.amount,
          contractAddress: pass,
          description: '',
          attributes: []
        };
      });
    } catch (error) {
      // Bridge down / CORS / offline — Passes should degrade to empty, not red ERROR.
      const msg = error?.message || String(error);
      console.warn(`[EVMAdapter] Tickets bridge unreachable (${this.bridgeUrl}): ${msg}`);
      return [];
    }
  }
  async getTicketStatus() {
    return true;
  }
  async getRemainingAccesses() {
    return 1;
  }
  async markTicketAsUsed(contractAddress, tokenId, authToken, account) {
    return this.scanPass({
      contractAddress,
      tokenId,
      amount: 1,
      authToken,
      account
    });
  }
  async consumePassAccess(contractAddress, tokenId, amount, authToken, account) {
    return this.scanPass({
      contractAddress,
      tokenId,
      amount,
      authToken,
      account
    });
  }
  async scanPass({
    contractAddress,
    tokenId,
    amount = 1,
    authToken,
    account,
    privateKey,
    bridgeUrl
  } = {}) {
    if (tokenId == null) throw new Error('scanPass requires tokenId');
    if (privateKey) {
      if (!account) throw new Error('scanPass direct mode requires account');
      await this.getProvider();
      const wallet = new _ethers.ethers.Wallet(privateKey, this.provider);
      const contract = this.getPassContract(wallet, contractAddress);
      const tx = await contract.scanPass(account, tokenId, amount);
      const receipt = await tx.wait();
      return {
        success: true,
        txHash: receipt.hash,
        mode: 'direct'
      };
    }
    if (!authToken) {
      throw new Error('scanPass requires authToken or privateKey');
    }
    const base = resolveBridgeUrl(bridgeUrl || this.bridgeUrl);
    const response = await fetch(`${base}/api/scanner`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({
        action: 'scanPass',
        network: networkKey(this.chain),
        contractAddress: resolvePassAddress(contractAddress || this.passAddress),
        tokenId,
        amount,
        account
      })
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to scan pass');
    }
    return response.json();
  }
}
exports.EVMAdapter = EVMAdapter;