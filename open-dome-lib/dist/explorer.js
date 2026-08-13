"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.attachExplorerToPass = attachExplorerToPass;
exports.buildPassExplorerLinks = buildPassExplorerLinks;
var _passContract = require("./blockchain/passContract");
const BASESCAN = 'https://basescan.org';

/**
 * Build Base explorer URLs to verify a pass / mint on-chain.
 */
function buildPassExplorerLinks({
  toAddress,
  tokenId,
  mintTxHash,
  paymentTxHash,
  contractAddress = _passContract.OPENDOME_PASS_ADDRESS,
  network = _passContract.OPENDOME_PASS_NETWORK
} = {}) {
  const contract = String(contractAddress || _passContract.OPENDOME_PASS_ADDRESS);
  const owner = toAddress ? String(toAddress).toLowerCase() : null;
  const isBase = String(network || 'base').toLowerCase() === 'base';
  if (!isBase) {
    return {
      network: network || 'base',
      contractAddress: contract,
      mintTxUrl: mintTxHash || null,
      paymentTxUrl: paymentTxHash || null,
      tokenInventoryUrl: null,
      ownerTokensUrl: null
    };
  }
  return {
    network: 'base',
    contractAddress: contract,
    /** Mint transaction */
    mintTxUrl: mintTxHash ? `${BASESCAN}/tx/${mintTxHash}` : null,
    /** Payment / x402 settlement (if any) */
    paymentTxUrl: paymentTxHash ? `${BASESCAN}/tx/${paymentTxHash}` : null,
    /** ERC-1155 contract page filtered by holder */
    tokenInventoryUrl: owner ? `${BASESCAN}/token/${contract}?a=${owner}` : `${BASESCAN}/token/${contract}`,
    /** Wallet page */
    ownerAddressUrl: owner ? `${BASESCAN}/address/${owner}` : null,
    tokenId: tokenId != null ? tokenId : null
  };
}
function attachExplorerToPass(pass, {
  toAddress,
  mintTxHash,
  paymentTxHash,
  contractAddress
} = {}) {
  const links = buildPassExplorerLinks({
    toAddress: toAddress || pass.toAddress,
    tokenId: pass.tokenId,
    mintTxHash: mintTxHash || pass.mintTxHash,
    paymentTxHash: paymentTxHash || pass.paymentTxHash,
    contractAddress: contractAddress || pass.contractAddress
  });
  return {
    ...pass,
    contractAddress: links.contractAddress,
    explorer: links,
    mintTxUrl: links.mintTxUrl,
    paymentTxUrl: links.paymentTxUrl,
    tokenInventoryUrl: links.tokenInventoryUrl
  };
}