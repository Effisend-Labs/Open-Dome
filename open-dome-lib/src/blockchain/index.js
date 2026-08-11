import { Blockchain, Wallet, Transfer, TransferToken } from './classes';
import { EVMAdapter } from './evm';
import { SolanaAdapter } from './solana';
import { StarknetAdapter } from './starknet';

export { Blockchain, Wallet, Transfer, TransferToken, EVMAdapter, SolanaAdapter, StarknetAdapter };

/** Lazy default instance — avoids constructing ethers providers at import time. */
let _blockchain;
export const blockchain = new Proxy(
  {},
  {
    get(_target, prop) {
      if (!_blockchain) _blockchain = new Blockchain();
      const value = _blockchain[prop];
      return typeof value === 'function' ? value.bind(_blockchain) : value;
    },
  }
);
