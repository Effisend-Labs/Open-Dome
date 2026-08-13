/** Circle CCTP V2 on Base mainnet → Solana mainnet. */

export const BASE_DOMAIN = 6;
export const SOLANA_DOMAIN = 5;
export const FAST_FINALITY = 1000;

export const BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
export const TOKEN_MESSENGER_V2 = '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d';

export const SOLANA_USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
export const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
export const ASSOCIATED_TOKEN_PROGRAM_ID = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';

export const IRIS_FEES_URL =
  `https://iris-api.circle.com/v2/burn/USDC/fees/${BASE_DOMAIN}/${SOLANA_DOMAIN}` +
  '?forward=true&includeRecipientSetup=true';

export const IRIS_MESSAGES_URL = `https://iris-api.circle.com/v2/messages/${BASE_DOMAIN}`;

export const ZERO_BYTES32 = `0x${'00'.repeat(32)}`;
