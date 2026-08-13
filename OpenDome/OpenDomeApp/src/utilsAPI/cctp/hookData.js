import { walletBytes } from './associatedTokenAccount.js';

/** Static 32-byte hook when the Solana USDC ATA already exists. */
export const FORWARD_HOOK_NO_SETUP =
  '0x636374702d666f72776172640000000000000000000000000000000000000000';

/** Ask Forwarding Service to create the recipient USDC ATA. */
export function solanaAtaSetupHook(walletAddress) {
  const magic = Buffer.alloc(24);
  magic.write('cctp-forward', 'utf8');
  const version = Buffer.alloc(4);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(33);
  const ataFlag = Buffer.from([1]);
  const owner = walletBytes(walletAddress);
  return `0x${Buffer.concat([magic, version, length, ataFlag, owner]).toString('hex')}`;
}
