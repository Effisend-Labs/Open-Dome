export const OPENDOME_PASS_ADDRESS =
  '0xf5053b8bAfc35c52DbED12c38Ef4c8AEb75999FF';

export const passesBlockchains = [
  {
    enabled: true,
    network: 'Base',
    type: 'evm',
    rpcs: [
      'https://developer-access-mainnet.base.org',
      'https://mainnet.base.org',
      'https://base.drpc.org',
    ],
    passesContracts: [OPENDOME_PASS_ADDRESS],
  },
  {
    enabled: true,
    network: 'Arbitrum One',
    type: 'evm',
    rpcs: [
      'https://arbitrum.drpc.org',
      'https://arb1.arbitrum.io/rpc',
    ],
    passesContracts: [],
  },
  {
    enabled: true,
    network: 'Optimism',
    type: 'evm',
    rpcs: ['https://mainnet.optimism.io', 'https://optimism.drpc.org'],
    passesContracts: [],
  },
  {
    enabled: true,
    network: 'Polygon',
    type: 'evm',
    rpcs: [
      'https://polygon.drpc.org',
      'https://1rpc.io/matic',
    ],
    passesContracts: [],
  },
];
