import { createWalletClient, createPublicClient, http, verifyTypedData } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import * as viemChains from 'viem/chains';
import {
  USDC_BASE,
  getUsdcDomain,
  getEip3009Types,
  splitEip712Signature,
  USDC_EIP3009_ABI,
} from './eip3009.js';
import { getUsdcChain, resolveUsdcRpcUrl } from './usdcChains.js';

export {
  USDC_BASE,
  usdcAmountToAtomic,
  buildEip3009Payload,
  getEip3009TypedData,
  OpenDomeBuyer,
  OpenDomeSeller,
  usdPriceToUsdcAtomic,
  usdcAtomicToDecimal,
} from './x402Challenge.js';
export { sponsorUsdcTransfer } from './sponsorUsdcTransfer.js';
export {
  USDC_CHAINS,
  getUsdcChain,
  listSendUsdcChains,
  listX402PaymentChains,
  normalizeUsdcChainKey,
  isSponsoredUsdcChain,
  resolveUsdcRpcUrl,
  resolveX402PaymentNetwork,
  x402NetworkCaip,
  explorerTxUrl,
  X402_PAYMENT_CHAIN_KEYS,
  SOLANA_USDC_MINT,
} from './usdcChains.js';

function resolveViemChain(cfg) {
  if (!cfg?.viemKey) return viemChains.base;
  return viemChains[cfg.viemKey] || viemChains.base;
}

/**
 * Relays EIP-3009 USDC authorizations.
 * Defaults to Base. Pass { chain: 'ARB'|'OP'|…, rpcUrl, usdc } for other L2s.
 * Merchant key must hold native gas on the target chain.
 */
export class OpenDomeFacilitator {
  constructor(privateKey, options = {}) {
    this.privateKey = privateKey;
    const cfg = getUsdcChain(options.chain || options.blockchain || 'BASE');
    this.chainConfig = cfg;
    this.usdc = options.usdc || cfg.usdc || USDC_BASE;
    this.chainId = options.chainId || cfg.chainId || 8453;
    this.rpcUrl = options.rpcUrl || resolveUsdcRpcUrl(cfg);
    this.viemChain = options.chainDef || resolveViemChain(cfg);
  }

  async verifyAndRelay(payload, signature) {
    return this.relayAuthorization(payload, signature, 'receiveWithAuthorization');
  }

  async relayTransfer(payload, signature) {
    return this.relayAuthorization(payload, signature, 'transferWithAuthorization');
  }

  async relayAuthorization(payload, signature, functionName) {
    const transport = this.rpcUrl ? http(this.rpcUrl) : http();
    const publicClient = createPublicClient({ chain: this.viemChain, transport });
    const account = privateKeyToAccount(this.privateKey);
    const walletClient = createWalletClient({
      account,
      chain: this.viemChain,
      transport,
    });

    const primaryType =
      functionName === 'transferWithAuthorization'
        ? 'TransferWithAuthorization'
        : 'ReceiveWithAuthorization';

    const domain = getUsdcDomain(this.usdc, this.chainId);
    const isValid = await verifyTypedData({
      address: payload.from,
      domain,
      types: getEip3009Types(primaryType),
      primaryType,
      message: payload,
      signature,
    });

    if (!isValid) {
      throw new Error('Mathematical verification failed. Invalid EIP-712 signature.');
    }

    const { v, r, s } = splitEip712Signature(signature);
    const { request } = await publicClient.simulateContract({
      address: this.usdc,
      abi: USDC_EIP3009_ABI,
      functionName,
      args: [
        payload.from,
        payload.to,
        BigInt(payload.value),
        BigInt(payload.validAfter),
        BigInt(payload.validBefore),
        payload.nonce,
        v,
        r,
        s,
      ],
      account,
    });

    const txHash = await walletClient.writeContract(request);
    await publicClient.waitForTransactionReceipt({ hash: txHash });
    return txHash;
  }
}
