"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.OpenDomeSeller = exports.OpenDomeFacilitator = exports.OpenDomeBuyer = void 0;
var _crypto = _interopRequireDefault(require("crypto"));
var _viem = require("viem");
var _accounts = require("viem/accounts");
var _chains = require("viem/chains");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
// Re-usable EIP-3009 Domain and Types
const getDomain = asset => ({
  name: "USD Coin",
  version: "2",
  chainId: 8453,
  // Base Mainnet
  verifyingContract: asset
});
const getTypes = () => ({
  EIP712Domain: [{
    name: 'name',
    type: 'string'
  }, {
    name: 'version',
    type: 'string'
  }, {
    name: 'chainId',
    type: 'uint256'
  }, {
    name: 'verifyingContract',
    type: 'address'
  }],
  ReceiveWithAuthorization: [{
    name: "from",
    type: "address"
  }, {
    name: "to",
    type: "address"
  }, {
    name: "value",
    type: "uint256"
  }, {
    name: "validAfter",
    type: "uint256"
  }, {
    name: "validBefore",
    type: "uint256"
  }, {
    name: "nonce",
    type: "bytes32"
  }]
});
class OpenDomeBuyer {
  constructor(accountAddress) {
    this.accountAddress = accountAddress;
  }
  static parseChallenge(challengeHeader) {
    const parseParam = key => {
      const match = challengeHeader.match(new RegExp(`${key}="([^"]+)"`));
      return match ? match[1] : null;
    };
    return {
      asset: parseParam('asset'),
      amount: parseParam('amount'),
      payTo: parseParam('payTo'),
      network: parseParam('network')
    };
  }
  generateEIP3009Payload(payTo, amount) {
    const validAfter = Math.floor(Date.now() / 1000);
    const validBefore = validAfter + 3600; // 1 hour validity
    const nonce = '0x' + _crypto.default.randomBytes(32).toString('hex');
    return {
      from: this.accountAddress,
      to: payTo,
      value: amount,
      validAfter: validAfter,
      validBefore: validBefore,
      nonce: nonce
    };
  }
  getTypedDataParams(asset, payload) {
    return {
      domain: getDomain(asset),
      types: getTypes(),
      primaryType: "ReceiveWithAuthorization",
      message: payload
    };
  }
}
exports.OpenDomeBuyer = OpenDomeBuyer;
class OpenDomeSeller {
  constructor(merchantAddress) {
    this.merchantAddress = merchantAddress;
  }
  generateChallenge(price) {
    const amount = price === '0.0001' ? '100' : price === '0.01' ? '10000' : '1000';
    const challengeParams = ['scheme="exact"', 'network="eip155:8453"', 'asset="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"',
    // USDC on Base
    `amount="${amount}"`, `payTo="${this.merchantAddress}"`];
    return challengeParams.join(', ');
  }
  parseAndValidateSignature(paymentSignatureBase64, expectedPrice) {
    let paymentData;
    try {
      paymentData = JSON.parse(Buffer.from(paymentSignatureBase64, 'base64').toString('utf8'));
    } catch (e) {
      throw new Error('Invalid payment signature format');
    }
    const {
      payload,
      signature
    } = paymentData;
    const {
      from,
      to,
      value,
      validAfter,
      validBefore,
      nonce
    } = payload;
    if (to.toLowerCase() !== this.merchantAddress.toLowerCase()) {
      throw new Error('Invalid merchant address in signature');
    }
    const expectedAmount = expectedPrice === '0.0001' ? '100' : expectedPrice === '0.01' ? '10000' : '1000';
    if (value !== expectedAmount) {
      throw new Error('Insufficient payment amount');
    }
    return {
      payload,
      signature,
      from,
      to,
      value,
      validAfter,
      validBefore,
      nonce
    };
  }
}
exports.OpenDomeSeller = OpenDomeSeller;
class OpenDomeFacilitator {
  constructor(privateKey) {
    this.privateKey = privateKey;
  }
  async verifyAndRelay(payload, signature) {
    const publicClient = (0, _viem.createPublicClient)({
      chain: _chains.base,
      transport: (0, _viem.http)()
    });
    const account = (0, _accounts.privateKeyToAccount)(this.privateKey);
    const walletClient = (0, _viem.createWalletClient)({
      account,
      chain: _chains.base,
      transport: (0, _viem.http)()
    }).extend(publicActions => publicClient);
    const asset = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // Base USDC

    // Verify Mathematically
    const isValid = await (0, _viem.verifyTypedData)({
      address: payload.from,
      domain: getDomain(asset),
      types: getTypes(),
      primaryType: 'ReceiveWithAuthorization',
      message: payload,
      signature
    });
    if (!isValid) {
      throw new Error('Mathematical verification failed. Invalid EIP-712 signature.');
    }

    // Extract signature parts
    const r = signature.slice(0, 66);
    const s = '0x' + signature.slice(66, 130);
    const v = parseInt(signature.slice(130, 132), 16);
    const usdcAbi = [{
      "inputs": [{
        "name": "from",
        "type": "address"
      }, {
        "name": "to",
        "type": "address"
      }, {
        "name": "value",
        "type": "uint256"
      }, {
        "name": "validAfter",
        "type": "uint256"
      }, {
        "name": "validBefore",
        "type": "uint256"
      }, {
        "name": "nonce",
        "type": "bytes32"
      }, {
        "name": "v",
        "type": "uint8"
      }, {
        "name": "r",
        "type": "bytes32"
      }, {
        "name": "s",
        "type": "bytes32"
      }],
      "name": "receiveWithAuthorization",
      "outputs": [],
      "type": "function"
    }];

    // Relay Transaction
    const {
      request
    } = await publicClient.simulateContract({
      address: asset,
      abi: usdcAbi,
      functionName: 'receiveWithAuthorization',
      args: [payload.from, payload.to, BigInt(payload.value), BigInt(payload.validAfter), BigInt(payload.validBefore), payload.nonce, v, r, s],
      account
    });
    const txHash = await walletClient.writeContract(request);

    // Wait for confirmation
    await publicClient.waitForTransactionReceipt({
      hash: txHash
    });
    return txHash;
  }
}
exports.OpenDomeFacilitator = OpenDomeFacilitator;