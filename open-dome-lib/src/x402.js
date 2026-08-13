import { createWalletClient, createPublicClient, http, verifyTypedData } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import {
  USDC_BASE,
  getUsdcDomain,
  getEip3009Types,
  splitEip712Signature,
  USDC_EIP3009_ABI,
} from './eip3009.js';

export {
  USDC_BASE,
  usdcAmountToAtomic,
  buildEip3009Payload,
  getEip3009TypedData,
  OpenDomeBuyer,
  OpenDomeSeller,
  usdPriceToUsdcAtomic,
} from './x402Challenge.js';
export { sponsorUsdcTransfer } from './sponsorUsdcTransfer.js';

export class OpenDomeFacilitator {
  constructor(privateKey, options = {}) {
    this.privateKey = privateKey;
    this.rpcUrl = options.rpcUrl;
  }

  async verifyAndRelay(payload, signature) {
    return this.relayAuthorization(payload, signature, 'receiveWithAuthorization');
  }

  async relayTransfer(payload, signature) {
    return this.relayAuthorization(payload, signature, 'transferWithAuthorization');
  }

  async relayAuthorization(payload, signature, functionName) {
    const transport = this.rpcUrl ? http(this.rpcUrl) : http();
    const publicClient = createPublicClient({ chain: base, transport });
    const account = privateKeyToAccount(this.privateKey);
    const walletClient = createWalletClient({ account, chain: base, transport });

    const primaryType =
      functionName === 'transferWithAuthorization'
        ? 'TransferWithAuthorization'
        : 'ReceiveWithAuthorization';

    const isValid = await verifyTypedData({
      address: payload.from,
      domain: getUsdcDomain(USDC_BASE),
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
      address: USDC_BASE,
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
