import { randomUUID } from 'node:crypto';
import { waitForCircleTx } from './waitCircleTx.js';

export async function executeCircleCall({ client, walletId, contractAddress, callData }) {
  const res = await client.createContractExecutionTransaction({
    walletId,
    contractAddress,
    callData,
    fee: { type: 'level', config: { feeLevel: 'HIGH' } },
    idempotencyKey: randomUUID(),
  });
  const id = res.data?.id || res.data?.transactionId || res.data?.transaction?.id;
  return waitForCircleTx(client, id);
}
