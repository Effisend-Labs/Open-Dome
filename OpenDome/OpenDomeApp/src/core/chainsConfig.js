export const OPENDOME_PASS_ADDRESS =
  '0x40c39F091a7c85D10B8C46762b59Df3eCd77630C';

export const passesBlockchains = [
  {
    enabled: true,
    network: 'Base',
    type: 'evm',
    rpcs: ['https://base-rpc.publicnode.com', 'https://mainnet.base.org'],
    passesContracts: [OPENDOME_PASS_ADDRESS],
  },
  {
    enabled: true,
    network: 'Arbitrum One',
    type: 'evm',
    rpcs: [
      'https://arbitrum-one-rpc.publicnode.com',
      'https://arb1.arbitrum.io/rpc',
    ],
    passesContracts: [],
  },
  {
    enabled: true,
    network: 'Optimism',
    type: 'evm',
    rpcs: ['https://mainnet.optimism.io', 'https://optimism.publicnode.com'],
    passesContracts: [],
  },
  {
    enabled: true,
    network: 'Polygon',
    type: 'evm',
    rpcs: [
      'https://polygon-rpc.com',
      'https://polygon-bor-rpc.publicnode.com',
    ],
    passesContracts: [],
  },
];
