# Admin (Server Bridge) — GOD mini-app (@altaga only)

## Auth model

1. `@altaga` signs in on **OpenDomeApp** (passkey).
2. Host injects the user JWT into the Admin mini-app.
3. Admin APIs verify that JWT via OpenDomeApp `POST /api/verify` (god only).
4. **Minting** is proxied to OpenDomeApp `POST /api/mint` — the merchant private key lives only on OpenDomeApp.

## Required env

```
EXPO_PUBLIC_OD_APP_ID=…   # Admin dock appId
OD_APP_TOKEN=…            # Admin dock token (server-only)
GCP_PROJECT_ID=
GCP_CLIENT_EMAIL=
GCP_PRIVATE_KEY=
MERCHANT_ADDRESS=         # public EVM address (balances UI)
ADMIN_SCANNER_TOKEN=      # shared with OpenDomeApp for hotfix mint + hardware scanner
```

## Optional

```
OPENDOME_APP_URL=…              # default: localhost:8082 (dev) / https://app.opendome.xyz (prod)
FIRESTORE_ENV=dev|production
MERCHANT_SOLANA_ADDRESS=…       # public Solana pubkey (balances UI)
MERCHANT_PRIVATE_KEY=…          # ONLY for Admin /api/scanner burn (legacy). Not used for mint.
CONTRACT_ADDRESS=               # scanner burn fallback
RPC_URL= / RPC_URL_BASE= / …    # optional RPC overrides (curated fallbacks in opendome)
```

**Mint does not use Admin’s merchant key.** Admin forwards the god JWT to OpenDomeApp; OpenDomeApp signs with its `MERCHANT_PRIVATE_KEY`.

**Balances are read-only** — `MERCHANT_ADDRESS` / `MERCHANT_SOLANA_ADDRESS` only.

**RPCs** follow EffisendTDC: curated `rpcs[]` + ethers `FallbackProvider` / Solana sequential failover.

## Dev vs prod (auto)

| Signal | Mode | Firestore | Verify / mint host |
|---|---|---|---|
| Local (`npm run web`) | **DEV** | `DevAdminUsers`, `DevUsers`, … | `http://localhost:8082` |
| Vercel / `*.opendome.xyz` | **PROD** | `AdminUsers`, `Users`, … | `https://app.opendome.xyz` |

## Local

```bash
cd OpenDome/OpenDomeMiniApps/Admin
npm install --legacy-peer-deps
npm run web   # port 8090
```

## Deploy

Vercel root: `OpenDome/OpenDomeMiniApps/Admin` · domain `admin.opendome.xyz`  
OpenDomeApp must have `MERCHANT_PRIVATE_KEY` + matching `ADMIN_SCANNER_TOKEN` for mint/hotfix.
