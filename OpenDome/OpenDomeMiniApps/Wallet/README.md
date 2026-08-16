# Wallet — Open-Dome mini-app

USDC / NFT wallet mini-app docked in the host. Uses `opendome` blockchain adapters and host-bridged transfers where required.

**Live:** [wallet.opendome.xyz](https://wallet.opendome.xyz/) · **Local port:** `8085`

---

## Env (server)

```bash
EXPO_PUBLIC_OD_SKIP_AUTH=false
EXPO_PUBLIC_OD_APP_ID=…
OD_APP_TOKEN=…
# OPENDOME_DOCKING_HOST_URL=   # optional override
```

Platform secrets stay on OpenDomeApp. See [`AGENTS.md`](../../../AGENTS.md).

---

## Local

```bash
cd OpenDome/OpenDomeMiniApps/Wallet
npm install
npm run web   # :8085
```

---

## SDK

```javascript
import { useOpenDome } from 'opendome';

const { isAuthorized, context, blockchain } = useOpenDome();
const balances = await blockchain.getBalances({ base, solana, starknet });
```

Docking: [`src/app/api/docking-token+api.js`](./src/app/api/docking-token+api.js).

---

MIT © Effisend Labs
