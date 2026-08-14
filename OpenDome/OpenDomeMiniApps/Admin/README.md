# Admin (Server Bridge) — GOD mini-app (@altaga only)

## Auth model

1. `@altaga` signs in on **OpenDomeApp** (passkey).
2. Host injects the user JWT into the Admin mini-app.
3. Admin APIs verify that JWT via OpenDomeApp `POST /api/verify` (god only).
4. **Minting** proxies to OpenDomeApp `POST /api/mint` (merchant key only on OpenDomeApp).
5. **Scanner burns** go through OpenDomeApp `Host.scanPass` (not Admin).

## Required env

```
EXPO_PUBLIC_OD_APP_ID=…
OD_APP_TOKEN=…
GCP_PROJECT_ID=
GCP_CLIENT_EMAIL=
GCP_PRIVATE_KEY=
MERCHANT_ADDRESS=              # public EVM address (balances)
MERCHANT_SOLANA_ADDRESS=       # public Solana pubkey (balances)
ADMIN_SCANNER_TOKEN=           # shared with OpenDomeApp for hotfix mint only
```

## Optional

```
OPENDOME_APP_URL=…             # default localhost:8082 / https://app.opendome.xyz
FIRESTORE_ENV=dev|production
RPC_URL_BASE= / RPC_URL_*=…    # optional RPC overrides (curated fallbacks in opendome)
```

**Do not put on Admin:** `MERCHANT_PRIVATE_KEY`, `MERCHANT_SOLANA_PRIVATE_KEY`, `CONTRACT_ADDRESS` — those belong on OpenDomeApp (mint + scan).

## Dev vs prod (auto)

| Signal | Mode | Firestore | Verify / mint host |
|---|---|---|---|
| Local (`npm run web`) | **DEV** | `Dev*` collections | `http://localhost:8082` |
| Vercel / `*.opendome.xyz` | **PROD** | prod collections | `https://app.opendome.xyz` |

## Local

```bash
cd OpenDome/OpenDomeMiniApps/Admin
npm install --legacy-peer-deps
npm run web   # port 8090
```

## Deploy

Vercel root: `OpenDome/OpenDomeMiniApps/Admin` · domain `admin.opendome.xyz`  
OpenDomeApp must have `MERCHANT_PRIVATE_KEY` + matching `ADMIN_SCANNER_TOKEN`.
