# Admin — thin Host bridge UI (@altaga via OpenDomeApp godOnly store)

## Model

1. Sign in on **OpenDomeApp**.
2. Host docks this mini-app and injects the user session over the bridge.
3. Admin UI calls `Host.listUsers` / `updateUsers` / `deleteUser` / `assign` / `merchantBalances`.
4. **OpenDomeApp** verifies JWT + god role and runs mint / Firestore / balances.
5. This mini-app never holds GCP, merchant keys, or scanner tokens.

## Required env (only)

```
EXPO_PUBLIC_OD_SKIP_AUTH=false
EXPO_PUBLIC_OD_APP_ID=…
OD_APP_TOKEN=…
```

Docking host URL is automatic (local App `:8082` / prod `https://app.opendome.xyz`). All platform secrets live on **OpenDomeApp**.

## Local

```bash
cd OpenDome/OpenDomeMiniApps/Admin
npm install --legacy-peer-deps
npm run web   # port 8090
```

Open from the host store while signed in as @altaga.

## Deploy

Vercel root: `OpenDome/OpenDomeMiniApps/Admin` · domain `admin.opendome.xyz`
