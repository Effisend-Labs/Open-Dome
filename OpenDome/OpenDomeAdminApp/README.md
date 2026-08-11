# OpenDome Admin (Server Bridge) — GOD mini-app (@altaga only)

Separate Expo mini-app for issuing ERC-1155 passes. Visible in OpenStore **only** when the host user is `@altaga` with JWT `role: god`. APIs accept that same OpenDome host JWT (localhost + production).

## Stack

- Expo 57 + expo-router + `opendome` SDK handshake
- Firestore (`AdminUsers`, `AdminTickets`) — same GCP credentials
- Real blockchain mints via `MERCHANT_PRIVATE_KEY`

## Auth

Same as every mini-app: dock → host passkey JWT. Only `@altaga` with `role: god` can open Admin or call mint/staff APIs. Password login is disabled.

## Local env

```
EXPO_PUBLIC_OD_APP_ID=…   # Admin from sdk/mini-app-credentials.json
OD_APP_TOKEN=…            # Admin docking token (server-only)
JWT_SECRET=…              # same as OpenDomeApp (passkey user JWTs)
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
| `GET /api/auth/me` | Bearer OpenDome JWT (altaga/god) | Session check |
| `POST /api/auth/login` | disabled (410) | — |
| `GET/POST/PUT/DELETE /api/users` | Bearer OpenDome JWT (altaga/god) | Staff wallets |
| `POST /api/assign` | Bearer OpenDome JWT (altaga/god) | Batch mint |
| `GET /api/tickets?address=` | open (host proxy) | Passes for OpenDomeApp |
| `POST /api/scanner` | `ADMIN_SCANNER_TOKEN` | On-chain scan |

## Deploy (`admin.opendome.xyz`)

1. Vercel project → Root Directory: `OpenDome/OpenDomeAdminApp` (monorepo).
2. Domain: `admin.opendome.xyz`.
3. Env vars (Production):

| Var | Notes |
|---|---|
| `EXPO_PUBLIC_OD_APP_ID` | Admin appId |
| `OD_APP_TOKEN` | Admin docking token |
| `JWT_SECRET` | **same as OpenDomeApp** |
| `GCP_PROJECT_ID` / `GCP_CLIENT_EMAIL` / `GCP_PRIVATE_KEY` | Firestore |
| `MERCHANT_PRIVATE_KEY` / `MERCHANT_ADDRESS` | mint wallet |
| `CONTRACT_ADDRESS` / `RPC_URL` | Base pass contract |
| `ADMIN_SCANNER_TOKEN` | scanner API |

4. On **OpenDomeApp** Vercel: set `ADMIN_BRIDGE_URL=https://admin.opendome.xyz` (no trailing slash needed; tickets proxy).

Host catalog already resolves Admin to `https://admin.opendome.xyz/` in production. Deploy on git push.
