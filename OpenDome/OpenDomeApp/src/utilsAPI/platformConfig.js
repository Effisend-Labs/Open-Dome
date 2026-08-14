/**
 * Public platform facts for mini-apps (via Host.platformConfig).
 * No secrets — addresses and contract ids only.
 */
import {
  OPENDOME_PASS_ADDRESS,
  OPENDOME_PASS_NETWORK,
  OPENDOME_PASS_CHAIN_ID,
} from 'opendome/dist/blockchain/passContract.js';

function strip(value) {
  if (value == null) return '';
  return String(value).trim().replace(/^['"]|['"]$/g, '');
}

function resolvePassContract() {
  const fromEnv = strip(process.env.CONTRACT_ADDRESS);
  if (fromEnv && /^0x[a-fA-F0-9]{40}$/.test(fromEnv)) {
    return fromEnv;
  }
  return OPENDOME_PASS_ADDRESS;
}

function resolveMerchantEvm() {
  const fromEnv = strip(process.env.MERCHANT_ADDRESS);
  if (fromEnv && /^0x[a-fA-F0-9]{40}$/.test(fromEnv)) return fromEnv;
  return null;
}

function resolveMerchantSolana() {
  const addr = strip(process.env.MERCHANT_SOLANA_ADDRESS);
  if (addr && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr)) return addr;
  return null;
}

export function getPublicPlatformConfig() {
  const passContractAddress = resolvePassContract();
  const network = strip(process.env.OPENDOME_PASS_NETWORK) || OPENDOME_PASS_NETWORK;
  const chainId = Number(process.env.OPENDOME_PASS_CHAIN_ID) || OPENDOME_PASS_CHAIN_ID;

  return {
    passContractAddress,
    passNetwork: network,
    passChainId: chainId,
    merchantAddress: resolveMerchantEvm(),
    merchantSolanaAddress: resolveMerchantSolana(),
    /** @deprecated alias — prefer passContractAddress */
    contractAddress: passContractAddress,
  };
}
