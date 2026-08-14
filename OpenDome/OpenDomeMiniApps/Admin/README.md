# Admin (Server Bridge) — GOD mini-app (@altaga only)

## Required env

```
EXPO_PUBLIC_OD_APP_ID=…   # Admin dock appId
OD_APP_TOKEN=…            # Admin dock token (server-only)
GCP_PROJECT_ID=
GCP_CLIENT_EMAIL=
GCP_PRIVATE_KEY=
MERCHANT_PRIVATE_KEY=     # mint + scanner + facilitator gas
MERCHANT_ADDRESS=         # EVM merchant (balances + x402); derived from key if omitted
CONTRACT_ADDRESS=
RPC_URL=https://mainnet.base.org
ADMIN_SCANNER_TOKEN=
```

## Optional

```
OPENDOME_APP_URL=…        # override JWT verify host
FIRESTORE_ENV=dev|production   # override auto-detect
MERCHANT_SOLANA_ADDRESS=…      # Solana merchant pubkey (Admin SOL + USDC balances)
MERCHANT_SOLANA_PRIVATE_KEY=… # base58 secret (gitignored .env only; same wallet as address)
RPC_URL_BASE= / RPC_URL_ARB= / RPC_URL_OP= / RPC_URL_MATIC= / RPC_URL_AVAX= / RPC_URL_ETH= / RPC_URL_SOL=
```

Admin home shows **Merchant balances** (native + USDC) on Base, Arbitrum, Optimism, Polygon, Avalanche, Ethereum, and Solana when configured.

## Dev vs prod (auto)

| Signal | Mode | Firestore | Verify host |
|---|---|---|---|
| Local (`npm run web`) | **DEV** | `DevAdminUsers`, `DevUsers`, … | `http://localhost:8082` |
| Vercel / `*.opendome.xyz` | **PROD** | `AdminUsers`, `Users`, … | `https://app.opendome.xyz` |

UI shows a **DEV** / **PROD** badge. No Circle / JWT_SECRET / password envs.

## Local

```bash
cd OpenDome/OpenDomeMiniApps/Admin
npm install --legacy-peer-deps
npm run web   # port 8090
```

## Deploy

Vercel root: `OpenDome/OpenDomeMiniApps/Admin` · domain `admin.opendome.xyz`  
OpenDomeApp: `ADMIN_BRIDGE_URL=https://admin.opendome.xyz`
