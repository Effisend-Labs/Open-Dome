"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.OPENDOME_PASS_NETWORK = exports.OPENDOME_PASS_CHAIN_ID = exports.OPENDOME_PASS_ADDRESS = exports.OPENDOME_PASS_ABI = exports.OPENDOME_PASSES_CONFIG = exports.DEFAULT_BRIDGE_URL = void 0;
/** OpenDome ERC-1155 pass — shared ABI + Base deployment. */

const OPENDOME_PASS_ADDRESS = exports.OPENDOME_PASS_ADDRESS = '0xf5053b8bAfc35c52DbED12c38Ef4c8AEb75999FF';
const OPENDOME_PASS_NETWORK = exports.OPENDOME_PASS_NETWORK = 'base';
const OPENDOME_PASS_CHAIN_ID = exports.OPENDOME_PASS_CHAIN_ID = 8453;

/** Default Server Bridge (Admin local). Override via EVMAdapter options or env. */
const DEFAULT_BRIDGE_URL = exports.DEFAULT_BRIDGE_URL = 'http://localhost:8082';
const OPENDOME_PASS_ABI = exports.OPENDOME_PASS_ABI = ['function mint(address to, uint256 id, uint256 amount, bytes data) external', 'function mintBatch(address to, uint256[] ids, uint256[] amounts, bytes data) external', 'function scanPass(address account, uint256 id, uint256 amount) external', 'function scanPassBatch(address[] accounts, uint256[] ids, uint256[] amounts) external', 'function balanceOf(address account, uint256 id) view returns (uint256)', 'function uri(uint256 id) view returns (string)', 'function hasRole(bytes32 role, address account) view returns (bool)', 'function EVENT_MANAGER_ROLE() view returns (bytes32)', 'function SCANNER_ROLE() view returns (bytes32)'];

/** Map used by Wallet / host for getAllNFTs */
const OPENDOME_PASSES_CONFIG = exports.OPENDOME_PASSES_CONFIG = {
  base: [OPENDOME_PASS_ADDRESS],
  arbitrum: [],
  optimism: [],
  mainnet: [],
  polygon: [],
  monad: [],
  solana: []
};