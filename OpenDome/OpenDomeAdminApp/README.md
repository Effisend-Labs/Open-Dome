# OpenDome Admin (Server Bridge) — GOD mini-app (@altaga only)

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
OPENDOME_APP_URL=https://app.opendome.xyz   # JWT verify host (auto default)
```

Not used (do not set): Circle keys, JWT_SECRET, ADMIN_PASSWORD.

## Local

```bash
npm install --legacy-peer-deps
npm run web   # port 8090
```

## Deploy

Vercel root: `OpenDome/OpenDomeAdminApp` · domain `admin.opendome.xyz`  
OpenDomeApp: `ADMIN_BRIDGE_URL=https://admin.opendome.xyz`
