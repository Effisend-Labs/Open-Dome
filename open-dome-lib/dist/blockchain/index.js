"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "Blockchain", {
  enumerable: true,
  get: function () {
    return _classes.Blockchain;
  }
});
Object.defineProperty(exports, "DEFAULT_BRIDGE_URL", {
  enumerable: true,
  get: function () {
    return _passContract.DEFAULT_BRIDGE_URL;
  }
});
Object.defineProperty(exports, "EVMAdapter", {
  enumerable: true,
  get: function () {
    return _evm.EVMAdapter;
  }
});
Object.defineProperty(exports, "OPENDOME_PASSES_CONFIG", {
  enumerable: true,
  get: function () {
    return _passContract.OPENDOME_PASSES_CONFIG;
  }
});
Object.defineProperty(exports, "OPENDOME_PASS_ABI", {
  enumerable: true,
  get: function () {
    return _passContract.OPENDOME_PASS_ABI;
  }
});
Object.defineProperty(exports, "OPENDOME_PASS_ADDRESS", {
  enumerable: true,
  get: function () {
    return _passContract.OPENDOME_PASS_ADDRESS;
  }
});
Object.defineProperty(exports, "OPENDOME_PASS_CHAIN_ID", {
  enumerable: true,
  get: function () {
    return _passContract.OPENDOME_PASS_CHAIN_ID;
  }
});
Object.defineProperty(exports, "OPENDOME_PASS_NETWORK", {
  enumerable: true,
  get: function () {
    return _passContract.OPENDOME_PASS_NETWORK;
  }
});
Object.defineProperty(exports, "SolanaAdapter", {
  enumerable: true,
  get: function () {
    return _solana.SolanaAdapter;
  }
});
Object.defineProperty(exports, "StarknetAdapter", {
  enumerable: true,
  get: function () {
    return _starknet.StarknetAdapter;
  }
});
Object.defineProperty(exports, "Transfer", {
  enumerable: true,
  get: function () {
    return _classes.Transfer;
  }
});
Object.defineProperty(exports, "TransferToken", {
  enumerable: true,
  get: function () {
    return _classes.TransferToken;
  }
});
Object.defineProperty(exports, "Wallet", {
  enumerable: true,
  get: function () {
    return _classes.Wallet;
  }
});
exports.blockchain = void 0;
var _classes = require("./classes");
var _evm = require("./evm");
var _solana = require("./solana");
var _starknet = require("./starknet");
var _passContract = require("./passContract");
/** Lazy default instance — avoids constructing ethers providers at import time. */
let _blockchain;
const blockchain = exports.blockchain = new Proxy({}, {
  get(_target, prop) {
    if (!_blockchain) _blockchain = new _classes.Blockchain();
    const value = _blockchain[prop];
    return typeof value === 'function' ? value.bind(_blockchain) : value;
  }
});