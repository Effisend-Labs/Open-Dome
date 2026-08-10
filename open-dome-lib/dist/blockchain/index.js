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
Object.defineProperty(exports, "EVMAdapter", {
  enumerable: true,
  get: function () {
    return _evm.EVMAdapter;
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
const blockchain = exports.blockchain = new _classes.Blockchain();