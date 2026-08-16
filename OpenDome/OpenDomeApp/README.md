# OpenDomeApp — production host

The Super-App host for Tokyo Dome City. Passkey login, mini-app store, docking verification, Circle/x402 checkout, Gemini agent, and platform mint all live here.

**Live:** [app.opendome.xyz](https://app.opendome.xyz/) · **Local:** `npm run web` → `http://localhost:8082`

Companion sandbox: [`../OpenDomeSandbox`](../OpenDomeSandbox) (`:8083`).

---

## Role

| Concern | Where |
| --- | --- |
| User / staff sessions | `SESSION_JWT_TOKEN`, passkey APIs |
| Mini-app docking | `DOCKING_JWT_TOKEN` → `/api/docking-token`, `/api/verify` |
| MQTT channel JWTs | `MQTT_JWT_TOKEN` |
| Circle / x402 / mint | Circle + merchant keys, `/api/checkout`, `/api/mint` |
| Firestore / telemetry | `GCP_*` |

Mini-apps never receive these secrets. They only present a short-lived handshake JWT after exchanging `OD_APP_TOKEN` server-to-server.

See [`AGENTS.md`](../../AGENTS.md) for the full docking sequence, port map, and env matrix.

---

## Local

```bash
cd OpenDome/OpenDomeApp
npm install
Copy [`.env.example`](./.env.example) → `.env` (gitignored).
npm run web            # :8082
```

Share `DOCKING_JWT_TOKEN` with Sandbox. Keep real `.env` out of git.

---

## Layout

```text
src/
├── app/                 # Expo Router + API routes (+api.js)
│   └── api/             # verify, docking-token, agent, mint, checkout, ...
├── features/            # Domain UI (agent, store, …)
├── components/          # Host chrome (iframe bridge, …)
└── utilsAPI/            # Server helpers (passkey, Circle, staff, …)
```

---

MIT © Effisend Labs
