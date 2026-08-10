"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.HederaAdapter = void 0;
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
class HederaAdapter {
  constructor(rpcs = ['https://mainnet-public.mirrornode.hedera.com']) {
    this.rpcs = Array.isArray(rpcs) ? rpcs : [rpcs];
    this.mirrorNode = this.rpcs[0];
    this.isBrowser = typeof window !== 'undefined';
    this.client = null;
  }
  async initClient() {
    if (this.client) return;
    if (this.isBrowser) return;
    try {
      const {
        Client
      } = await Promise.resolve().then(() => _interopRequireWildcard(require('@hiero-ledger/sdk')));
      this.client = Client.forMainnet();
    } catch (e) {
      console.error("Failed to load Hedera SDK:", e);
    }
  }
  async getBalance(address) {
    if (this.isBrowser) {
      try {
        const response = await fetch(`${this.mirrorNode}/api/v1/accounts/${address}`);
        const data = await response.json();
        return (data.balance.balance / 100000000).toString();
      } catch (e) {
        return '0';
      }
    }
    await this.initClient();
    const {
      AccountId,
      AccountBalanceQuery
    } = await Promise.resolve().then(() => _interopRequireWildcard(require('@hiero-ledger/sdk')));
    const accId = address.includes('.') ? AccountId.fromString(address) : AccountId.fromEvmAddress(address);
    const balance = await new AccountBalanceQuery().setAccountId(accId).execute(this.client);
    return balance.hbars.toString();
  }
  async getBalanceToken(address, tokenAddress) {
    if (this.isBrowser) {
      try {
        const response = await fetch(`${this.mirrorNode}/api/v1/accounts/${address}/tokens?token.id=${tokenAddress}`);
        const data = await response.json();
        if (data.tokens && data.tokens.length > 0) {
          return data.tokens[0].balance.toString();
        }
        return '0';
      } catch (e) {
        return '0';
      }
    }
    return '0';
  }
  async getBalanceTokens(address, tokenAddresses) {
    return Promise.all(tokenAddresses.map(token => this.getBalanceToken(address, token)));
  }
  async sign(privateKey, data) {
    return 'signed_data_placeholder';
  }
  async signAndSend(privateKey, {
    transfers,
    memo = "OpenDome SDK Transfer"
  }) {
    if (this.isBrowser) throw new Error("Transaction signing not yet supported in browser for Hedera");
    await this.initClient();
    const {
      TransferTransaction,
      Hbar,
      PrivateKey
    } = await Promise.resolve().then(() => _interopRequireWildcard(require('@hiero-ledger/sdk')));
    const tx = new TransferTransaction();
    // ... logic ...
    return 'transaction_placeholder';
  }
}
exports.HederaAdapter = HederaAdapter;