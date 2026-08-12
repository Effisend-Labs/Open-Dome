# Admin (Server Bridge) — GOD mini-app (@altaga only)

## Required env

```
EXPO_PUBLIC_OD_APP_ID=…   # Admin dock appId
OD_APP_TOKEN=…            # Admin dock token (server-only)
GCP_PROJECT_ID=
GCP_CLIENT_EMAIL=
GCP_PRIVATE_KEY=
MERCHANT_PRIVATE_KEY=     # mint + scanner
MERCHANT_ADDRESS=
CONTRACT_ADDRESS=
RPC_URL=https://mainnet.base.org
ADMIN_SCANNER_TOKEN=
```

## Optional

```
OPENDOME_APP_URL=…        # override JWT verify host
FIRESTORE_ENV=dev|production   # override auto-detect
```

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
