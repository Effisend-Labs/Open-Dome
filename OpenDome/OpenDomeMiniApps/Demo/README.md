# Demo — Dome City mini-app

Guest guide reference mini-app (map, games, itinerary hooks) docked inside OpenDomeApp / Sandbox.

**Live:** [demo.opendome.xyz](https://demo.opendome.xyz/) · **Local port:** `8084`

---

## Env (server)

```bash
EXPO_PUBLIC_OD_SKIP_AUTH=false
EXPO_PUBLIC_OD_APP_ID=…
OD_APP_TOKEN=…          # required enrollment JWT — never EXPO_PUBLIC_*
# OPENDOME_DOCKING_HOST_URL=   # optional; auto → :8082 local / app.opendome.xyz on Vercel
```

See [`.env.example`](./.env.example) and [`AGENTS.md`](../../../AGENTS.md).

---

## Local

```bash
cd OpenDome/OpenDomeMiniApps/Demo
npm install
npm run web   # :8084
```

Start OpenDomeApp on `:8082` and open Demo from the host store / iframe.

---

## SDK

```javascript
import { useOpenDome } from 'opendome';

const { isAuthorized, context, blockchain, loading } = useOpenDome();
```

Docking route: [`src/app/api/docking-token+api.js`](./src/app/api/docking-token+api.js) → `opendome/dist/dockingHost.js`.

---

MIT © Effisend Labs
