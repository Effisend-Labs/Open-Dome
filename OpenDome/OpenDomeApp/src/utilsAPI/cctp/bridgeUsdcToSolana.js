import { nodeRequire } from '../nodeRequire.js';
import { usdcAtaBytes32 } from './associatedTokenAccount.js';
import { atomicToUsdc } from './amounts.js';
import {
  BASE_USDC,
  FAST_FINALITY,
  SOLANA_DOMAIN,
  TOKEN_MESSENGER_V2,
  ZERO_BYTES32,
} from './constants.js';
import { executeCircleCall } from './executeContract.js';
import { quoteBridgeTotals } from './fees.js';
import { solanaAtaSetupHook } from './hookData.js';
import { isSolanaAddress } from './solanaAddress.js';
import { waitForSolanaMint } from './irisMint.js';

function encodeCalls(maxFee, totalAmount, mintRecipient, hookData) {
  const { Interface } = nodeRequire('ethers');
  const erc20 = new Interface(['function approve(address spender, uint256 amount)']);
  const messenger = new Interface([
    'function depositForBurnWithHook(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken, bytes32 destinationCaller, uint256 maxFee, uint32 minFinalityThreshold, bytes hookData)',
  ]);
  return {
    approve: erc20.encodeFunctionData('approve', [TOKEN_MESSENGER_V2, totalAmount]),
    burn: messenger.encodeFunctionData('depositForBurnWithHook', [
      totalAmount,
      SOLANA_DOMAIN,
      mintRecipient,
      BASE_USDC,
      ZERO_BYTES32,
      maxFee,
      FAST_FINALITY,
      hookData,
    ]),
  };
}

/**
 * Burn Base USDC and mint native USDC on Solana via Circle CCTP Forwarding Service.
 */
export async function bridgeUsdcToSolana({ client, walletId, destination, amount }) {
  if (!walletId) return { error: 'No Base Circle wallet for this user' };
  if (!isSolanaAddress(destination)) {
    return { error: 'destination must be a Solana address' };
  }

  try {
    const mintRecipient = await usdcAtaBytes32(destination);
    const { transferAmount, totalAmount, maxFee, forwardFee } = await quoteBridgeTotals(amount);
    const calls = encodeCalls(
      maxFee,
      totalAmount,
      mintRecipient,
      solanaAtaSetupHook(destination),
    );

    const approveTx = await executeCircleCall({
      client,
      walletId,
      contractAddress: BASE_USDC,
      callData: calls.approve,
    });
    const burnTx = await executeCircleCall({
      client,
      walletId,
      contractAddress: TOKEN_MESSENGER_V2,
      callData: calls.burn,
    });

    const mintTxHash = await waitForSolanaMint(burnTx.txHash);
    return {
      success: true,
      bridged: true,
      chain: 'solana',
      sponsored: false,
      amount: atomicToUsdc(transferAmount),
      feeUsdc: atomicToUsdc(forwardFee),
      burnedUsdc: atomicToUsdc(totalAmount),
      destination,
      txHash: burnTx.txHash,
      approveTxHash: approveTx.txHash,
      mintTxHash,
      transactionId: burnTx.id || burnTx.txHash,
    };
  } catch (err) {
    console.error('[CCTP Solana]', err.response?.data || err);
    return {
      error: err.response?.data?.message || err.message || 'Bridge to Solana failed',
    };
  }
}
