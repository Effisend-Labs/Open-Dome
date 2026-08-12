# OpenDome Scanner

Venue verifier mini-app for **SCANNER**, **ADMIN**, and **GOD** (`@altaga`).

## Local

```bash
npm install
npm run web   # http://localhost:8091
```

Requires OpenDomeApp (`8082`) + Admin bridge (`8090`).

## Flow

1. Paste / type guest QR (`opendome:user:…`), `@username`, EVM, or Solana
2. Lookup resolves profile + passes via Admin `POST /api/scan-lookup`
3. **Verify & use** burns 1 unit on-chain via Admin `POST /api/scanner` (staff JWT)

## Auth

Host session JWT must be staff. Admin APIs verify via OpenDome `/api/verify` and role/username.
