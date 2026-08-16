# OpenDome Scanner

Venue verifier mini-app for **SCANNER**, **ADMIN**, and **GOD** (`@altaga`).

UI only. Talk to the host through `opendome` (`useOpenDome`, `Host.scanLookup`, `Host.scanPass`, `Host.platformConfig`). No host URLs, no CORS, no contract/merchant env.

## Required env (only)

```
EXPO_PUBLIC_OD_SKIP_AUTH=false
EXPO_PUBLIC_OD_APP_ID=…
OD_APP_TOKEN=…
```

Host URL auto-resolves (`:8082` local / `https://app.opendome.xyz` on Vercel). Optional override: `OPENDOME_DOCKING_HOST_URL`.

Pass contract and other public facts come from `Host.platformConfig()` on OpenDomeApp.

## Local

```bash
npm install
npm run web   # http://localhost:8091
```

Open from OpenDomeApp (`8082`) while signed in as staff.
