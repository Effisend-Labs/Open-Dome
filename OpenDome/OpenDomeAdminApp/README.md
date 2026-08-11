# OpenDome Admin (Server Bridge) — GOD mini-app (@altaga only)

Separate Expo mini-app for issuing ERC-1155 passes. Visible in OpenStore **only** when the host user is `@altaga` with JWT `role: god`.

## Auth

Same as other mini-apps: dock via OpenDome SDK → host passkey JWT.

Admin APIs send that Bearer token to **OpenDomeApp** `POST /api/verify` (no `JWT_SECRET` on Admin). If verified user is `@altaga` / god → mint/staff allowed.

## Local env

```
EXPO_PUBLIC_OD_APP_ID=…   # Admin from sdk/mini-app-credentials.json
OD_APP_TOKEN=…            # Admin docking token (server-only)
OPENDOME_APP_URL=…        # optional; default localhost:8081 / https://app.opendome.xyz
MERCHANT_PRIVATE_KEY=
MERCHANT_ADDRESS=
CONTRACT_ADDRESS=
RPC_URL=https://mainnet.base.org
GCP_* =
ADMIN_SCANNER_TOKEN=
```

## Local dev

```bash
npm install --legacy-peer-deps
npm run web
```

Runs on **port 8090**. Open from OpenDome host while signed in as `@altaga`.

## API

| Route | Auth | Purpose |
|---|---|---|
| `GET /api/docking-token` | none (server env) | Mini-app docking secret |
| `GET /api/auth/me` | Bearer host JWT → OpenDome `/api/verify` | Session check |
| `POST /api/auth/login` | disabled (410) | — |
| `GET/POST/PUT/DELETE /api/users` | Bearer host JWT → verify | Staff wallets |
| `POST /api/assign` | Bearer host JWT → verify | Batch mint |
| `GET /api/tickets?address=` | open (host proxy) | Passes for OpenDomeApp |
| `POST /api/scanner` | `ADMIN_SCANNER_TOKEN` | On-chain scan |

## Deploy (`admin.opendome.xyz`)

1. Vercel → Root: `OpenDome/OpenDomeAdminApp`
2. Domain: `admin.opendome.xyz`
3. Env: `EXPO_PUBLIC_OD_APP_ID`, `OD_APP_TOKEN`, `OPENDOME_APP_URL=https://app.opendome.xyz`, GCP, merchant, `CONTRACT_ADDRESS`, `RPC_URL`, `ADMIN_SCANNER_TOKEN`
4. OpenDomeApp: `ADMIN_BRIDGE_URL=https://admin.opendome.xyz`
