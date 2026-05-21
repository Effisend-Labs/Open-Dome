import { Blockchain, Wallet, Transfer, TransferToken } from './classes';
import { EVMAdapter } from './evm';
import { SolanaAdapter } from './solana';
import { StarknetAdapter } from './starknet';

export { Blockchain, Wallet, Transfer, TransferToken, EVMAdapter, SolanaAdapter, StarknetAdapter };
export const blockchain = new Blockchain();
