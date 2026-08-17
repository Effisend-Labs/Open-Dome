# AGENTS.md — Open-Dome (machine context)

> **Audience: coding agents only.** Humans: `README.md` / `READMEJP.md`.
> Do not rewrite this into marketing prose. Prefer this file over scattered READMEs when changing code.

## Repo identity

- **Name:** Open-Dome (Effisend Labs)
- **Remote:** `Effisend-Labs/Open-Dome` (public)
- **Stack:** Expo 57 / Expo Router, React Native Web, `opendome` SDK (`open-dome-lib`), Vercel server output, **Circle** developer-controlled wallets + USDC, **Google Cloud** (Vertex AI Gemini / Firestore / Logging / BigQuery). MQTT Communication is temporarily disabled in SDK.
- **Product shape:** Super-App **host** loads tenant **mini-apps** in iframes; zero-trust docking; **USDC settlement per interaction**; **Gemini agentic** tool calling on the host (venue + wallet + paid OpenAgent)
- **Audience split (do not blur):** Guests only use **OpenDomeApp** ([app.opendome.xyz](https://app.opendome.xyz)). Developers build **mini-apps** and may test in **OpenDomeSandbox** ([sandbox.opendome.xyz](https://sandbox.opendome.xyz)). External/tenant developers never modify App or Sandbox to ship features.
- **Contest attribution (keep, but do not lead with it):** Build with Gemini XPRIZE. One brief attribution near the end of each README is enough; the product story must stand on its own.

## Platform pillars (do not bury)

Open-Dome’s load-bearing story is **agentic operations + USDC payments**, not a generic iframe shell.

| Pillar | Provider | What it does in product | Authoritative code |
|--------|----------|-------------------------|--------------------|
| **Agentic runtime** | Google Vertex AI (Gemini) | Host decides tools, quotes, and fulfillment; guest chat / venue consultant / wallet agent | `OpenDome/OpenDomeApp/src/app/api/agent+api.js`, `src/utilsAPI/geminiToolLoop.js`, `open-dome-lib/src/agentSkills.js` |
| **Evidence trail** | Google Cloud Logging + BigQuery | Every AI turn and settlement is logged for ops | `src/utilsAPI/aiTelemetry.js`, `src/utilsAPI/platformTelemetry.js`, `/api/ai-telemetry` |
| **Identity + wallet refs** | Google Cloud Firestore | Users, roles, Circle wallet IDs, tickets | `src/utilsAPI/passkeyDb.js`, `ticketsDb.js` |
| **Programmable money** | Circle developer-controlled wallets | Per-user wallets; HSM signs EIP-3009; Solana USDC transfers | `src/utilsAPI/circleTools.js`, `src/utilsAPI/circleAgentRuntime.js` |
| **Per-interaction USDC** | Circle + x402 | OpenAgent turns and paid HTTP services settle in USDC before delivery | `src/app/api/x402-pay+api.js`, `open-dome-lib/src/agentTariff.js`, `open-dome-lib/src/x402.js` |
| **Guest approval** | Host UI bridge | Nothing auto-pays; transfer/x402 require explicit approve | `src/components/IframeContainer.js`, `src/components/TransactionModal.js` |

When documenting or demoing the product, lead with the complete **Gemini + Circle user journey**: Gemini understands the request and calls tools; the guest sees a clear USDC quote; Circle supplies the wallet, balance, network choice, approval, and settlement; the requested answer or pass is delivered. Circle's importance should be evident through usability, not repeated provider-name claims. Screenshots must prove this flow first. Generic host, profile, store, and docking screens are supporting material only. Do not frame the product primarily as a hackathon entry.

## Doc map (do not confuse)

| File | For | Purpose |
|------|-----|---------|
| `AGENTS.md` (this) | Agents | Full operational context |
| `README.md` | Humans (EN) | Problem, architecture, GCP + Circle story |
| `READMEJP.md` | Humans (JP) | Same, Japanese |
| Per-app `README.md` | Humans | Run instructions + env for that app |
| Per-app `AGENTS.md` / `CLAUDE.md` | Agents | Expo version pin only (“read Expo v57 docs”) |
| `.agents/AGENTS.md` | Agents | Unrelated UI rule (WhatsApp-style inputs) — not Open-Dome architecture |

Keep README diagrams and this file consistent when changing docking, ports, GCP, or payments.

## System map

```mermaid
flowchart LR
  Host["OpenDomeApp (host, :8082)"]
  Sandbox["OpenDomeSandbox (dev host, :8083)"]
  SDK["open-dome-lib (npm opendome)"]

  subgraph minis [OpenDomeMiniApps]
    Demo["Demo :8084"]
    Wallet["Wallet :8085"]
    OpenAgent["OpenAgent :8086"]
    Venues["IMMTheater :8087 / KorakuenHall :8088 / GalleryAaMo :8089 / TokyoDome :8092"]
    Staff["Admin :8090 / Scanner :8091"]
  end

  Host -->|iframe| Demo
  Host -->|iframe| Wallet
  Host -->|iframe| OpenAgent
  Host -->|iframe| Venues
  Host -->|iframe| Staff
  Sandbox -->|iframe| Demo
  Demo --> SDK
  Wallet --> SDK
  OpenAgent --> SDK
  Venues --> SDK
  Staff --> SDK
  Demo -->|"server exchange"| Host
  Wallet -->|"server exchange"| Host
  Host --> GCP["Vertex AI Gemini / Firestore / Logging"]
  Host --> Circle["Circle wallets + USDC / x402"]
  Host --> Base["ERC-1155 pass on Base"]
```

## Monorepo layout (authoritative)

```
Open-Dome/
  open-dome-lib/                 # npm name "opendome" — SDK source + dist/
  OpenDome/
    OpenDomeApp/                 # PRODUCTION host — guests only (app.opendome.xyz)
    OpenDomeSandbox/             # DEVELOPER test host only (sandbox.opendome.xyz)
    OpenDomeMiniApps/            # What external developers build / extend
      Demo/ Wallet/ OpenAgent/ Admin/ Scanner/
      TokyoDome/ IMMTheater/ KorakuenHall/ GalleryAaMo/
  Contracts/                     # Hardhat ERC-1155 pass
  Landing/                       # Marketing site
```

There is **no** top-level `MiniApp/` folder. Do not invent paths under `./MiniApp/`.

## Who changes what (hard rule)

| Actor | Uses | May change | Must not change |
|-------|------|------------|-----------------|
| Guest | [app.opendome.xyz](https://app.opendome.xyz) | nothing | Sandbox URLs, host source |
| External / tenant developer | Sandbox to test; App only as the live target | their mini-app + `opendome` consumer usage | `OpenDome/OpenDomeApp/`, `OpenDome/OpenDomeSandbox/` |
| Platform maintainers (Effisend) | App + Sandbox + SDK | host, sandbox, SDK, shared infra | — |

Developer path: **build mini-app → test in Sandbox → ship so guests open it from App.**  
Do not tell developers to edit App/Sandbox for a tenant feature. Sandbox is not a guest product.

## Runtime boundaries and path conventions

The word “Sandbox” is the **developer test host product name**, not “guests use a sandbox.” Mini-app isolation is separate origins + iframe + docking handshake; the host does not currently depend on an HTML `sandbox` attribute.

| Runtime | Owns | Must not own | Primary paths |
|---------|------|--------------|---------------|
| Browser host | iframe lifecycle, passkey UX, context injection, bridge dispatch | provider secrets | `OpenDome/OpenDomeApp/src/components/IframeContainer.js`, `src/features/bridge/` |
| Browser mini-app | tenant UI, `useOpenDome`, `Host.*` calls | `OD_APP_TOKEN`, Circle/GCP keys, host session secret | `OpenDome/OpenDomeMiniApps/<App>/src/` |
| Mini-app server | enrollment → handshake exchange | host signing secret | `<App>/src/app/api/docking-token+api.js` |
| Host API server | verify docking, auth, Circle, Gemini, Firestore, mint/checkout | tenant UI state | `OpenDome/OpenDomeApp/src/app/api/`, `src/utilsAPI/` |
| Shared SDK | browser API, protocol constants, pure helpers, server exchange helper | app-specific UI/business state | `open-dome-lib/src/` and generated `open-dome-lib/dist/` |

Expo Router maps `src/app/api/name+api.js` to `/api/name`. Nested paths preserve directories, e.g. `src/app/api/passkey/login-options+api.js` → `/api/passkey/login-options`.

### Host route inventory

The production routes below live under `OpenDome/OpenDomeApp/src/app/api/`. The Sandbox has twins for core host behavior; do not assume every production operations route is mirrored without checking.

| Route | Method | Caller / responsibility |
|-------|--------|-------------------------|
| `/api/apps` | GET | Host store catalog and resolved mini-app URLs; `iconUrl` = each mini-app `/app-icon.png` |
| `/api/docking-token` | POST | Mini-app server exchanges Bearer enrollment JWT for handshake JWT |
| `/api/verify` | POST | Host bridge verifies handshake and mints browser session/channel JWTs |
| `/api/session` | POST | Host session validation/refresh |
| `/api/passkey/check-username` | POST | Passkey registration preflight |
| `/api/passkey/register-options` | POST | WebAuthn registration options |
| `/api/passkey/register-verify` | POST | Verify registration and create user |
| `/api/passkey/login-options` | POST | WebAuthn login options |
| `/api/passkey/login-verify` | POST | Verify login and issue session |
| `/api/agent` | POST | Gemini modes (`dome`, `wallet`, `openagent`) and tool loop |
| `/api/checkout` | POST | Payment + fulfillment orchestration |
| `/api/x402-pay` | POST | Buy a priced HTTP service using EVM or Solana USDC |
| `/api/mint` | POST | Mint ERC-1155 venue pass |
| `/api/transfer` | POST | Guest-approved sponsored USDC transfer |
| `/api/wallet-balances` | GET | Authenticated Circle balance snapshot |
| `/api/nfts` | POST | Authenticated NFT/pass lookup |
| `/api/platform-config` | GET | Public contract and merchant configuration |
| `/api/token-prices` | GET | Cached public token prices |
| `/api/events` | GET | Venue/event catalog |
| `/api/tickets` | GET | Ticket catalog/assignment data |
| `/api/assign` | POST | Admin ticket/pass assignment |
| `/api/scan-lookup` | POST | Scanner resolves a guest/pass |
| `/api/scan-pass` | POST | Validate and record a gate scan |
| `/api/users` | GET/PUT/DELETE | Admin user and role management |
| `/api/merchant-balances` | GET | Admin treasury balances |
| `/api/ai-event` | POST | Record sanitized AI telemetry |
| `/api/ai-telemetry` | GET | Operations telemetry dashboard data |

### Host bridge contract

Mini-app browser code does not call sensitive host routes directly. `open-dome-lib/src/host.js` posts `OPENDOME_HOST_REQUEST`; `OpenDomeApp/src/components/IframeContainer.js` validates the active iframe and delegates to `src/features/bridge/runHostRequest.js`.

Current bridge actions: `scanLookup`, `scanPass`, `transfer`, `listNfts`, `walletBalances`, `listUsers`, `updateUsers`, `deleteUser`, `assign`, `merchantBalances`, `aiTelemetry`, `recordAiEvent`, `platformConfig`, `tokenPrices`.

When adding an action, update all applicable boundaries:

1. Public method in `open-dome-lib/src/host.js`.
2. Host dispatch in `OpenDomeApp/src/features/bridge/runHostRequest.js`.
3. Host API route or server service.
4. Authorization/role validation at the host route.
5. Rebuild `open-dome-lib/dist/`.

## Local Expo ports (fixed in package.json scripts)

| App | Port | Notes |
|-----|------|--------|
| OpenDomeApp | 8082 | Default docking host (local) |
| OpenDomeSandbox | 8083 | Optional docking target via override |
| Demo | 8084 | |
| Wallet | 8085 | |
| OpenAgent | 8086 | |
| IMMTheater | 8087 | |
| KorakuenHall | 8088 | |
| GalleryAaMo | 8089 | |
| Admin | 8090 | |
| Scanner | 8091 | |
| TokyoDome | 8092 | Was 8086; do not collide with OpenAgent |

Constants also live in `open-dome-lib/src/dockingHost.js` → `LOCAL_EXPO_PORTS`.

## Production URLs

| Role | URL | Audience |
|------|-----|----------|
| Host (App) | [app.opendome.xyz](https://app.opendome.xyz) | Guests |
| Sandbox | [sandbox.opendome.xyz](https://sandbox.opendome.xyz) | Developers (test only) |
| Demo | `https://demo.opendome.xyz` | Reference mini-app |
| Wallet | `https://wallet.opendome.xyz` | Guests via App |
| OpenAgent | `https://agent.opendome.xyz` | Guests via App |
| Admin | `https://admin.opendome.xyz` | Staff via App |
| Scanner | `https://scanner.opendome.xyz` | Staff via App |

Hardcoded prod host default in SDK: `PROD_DOCKING_HOST_URL = https://app.opendome.xyz`.

## Docking protocol (must preserve)

```mermaid
sequenceDiagram
  participant Browser as MiniApp_browser
  participant MiniAPI as MiniApp_docking_token
  participant HostAPI as Host_docking_token
  participant Verify as Host_verify
  participant Bridge as Host_iframe_bridge

  Bridge->>Browser: Load iframe
  Browser->>MiniAPI: GET /api/docking-token
  Note over MiniAPI: OD_APP_TOKEN never leaves server
  MiniAPI->>HostAPI: POST Bearer enrollment JWT
  HostAPI->>HostAPI: Verify DOCKING_JWT_TOKEN, token_use=enrollment
  HostAPI-->>MiniAPI: handshake JWT + appId (about 600s)
  MiniAPI-->>Browser: handshake JWT only
  Browser->>Bridge: postMessage OPENDOME_READY
  Bridge->>Verify: POST handshake JWT
  Verify->>Verify: Verify token_use=handshake, mint wsJwt + hostJwt
  Verify-->>Bridge: valid true
  Bridge->>Browser: postMessage OPENDOME_HANDSHAKE + context
```

### Key files

| Piece | Path |
|-------|------|
| Host exchange | `OpenDome/OpenDomeApp/src/app/api/docking-token+api.js` (+ Sandbox twin) |
| Host verify | `.../verify+api.js` (App + Sandbox) — uses `process.env.DOCKING_JWT_TOKEN` |
| Mini-app exchange | each mini-app `src/app/api/docking-token+api.js` → `opendome/dist/dockingHost.js` |
| Host URL resolve | `open-dome-lib/src/dockingHost.js` (`resolveDockingHostUrl`, `exchangeDockingEnrollment`) |
| Client handshake | `open-dome-lib/src/useOpenDome.js`, `open-dome-lib/src/docking.js` |

### Host URL waterfall (server-only)

1. `OPENDOME_DOCKING_HOST_URL` if set (escape hatch, e.g. Sandbox `http://localhost:8083`)
2. Else if `VERCEL` / `VERCEL_ENV` → `https://app.opendome.xyz`
3. Else → `http://localhost:8082`

Do **not** reintroduce required per-app host URL env for normal local/prod.

### Crypto / claims

- Algo: HS512
- Shared secret: `DOCKING_JWT_TOKEN` on **App and Sandbox must match** and must be the secret that signed enrollment JWTs
- Enrollment: `token_use=enrollment`, `role=mini_app`, `appId`
- Handshake: `token_use=handshake`, `role=mini_app`, `appId`

### Forbidden (regressions)

- Hardcoded `VALID_TOKENS` arrays in verify routes
- Tracked `sdk/mini-app-credentials.json` or literal docking UUIDs in repo
- `OD_APP_TOKEN` in client bundle / `extra`
- SecretScanner-style hardcoded admin passwords in mini-apps
- Committing `.env`, `creds.log`, or real keys
- Putting test private keys in tracked `open-dome-lib/test/`

## Google Cloud integration (host only) — Agentic + evidence

**Emphasis:** Vertex AI Gemini is the production agent brain. Firestore holds Circle wallet refs. Logging/BigQuery prove the AI and USDC loop ran.

```mermaid
flowchart LR
  AgentAPI["/api/agent"] --> Vertex["Vertex AI @google/genai"]
  AgentAPI --> AiLog["Cloud Logging opendome-ai-events"]
  Routes["mint / checkout / x402 / scan / transfer"] --> PlatLog["Cloud Logging opendome-platform-events"]
  Routes --> FS["Cloud Firestore"]
  AiLog --> BQ["BigQuery ai_agent_logs.opendome_ai_events"]
  BQ --> Panel["/api/ai-telemetry dashboard"]
```

| Concern | File (under `OpenDome/OpenDomeApp/` unless noted) | Notes |
|---------|---------------------------------------------------|-------|
| Gemini client | `src/app/api/agent+api.js` | `new GoogleGenAI({ vertexai: true, location: 'global' })`. `location` **must** stay `global`. Load via `nodeRequire` (`src/utilsAPI/nodeRequire.js`) — Metro breaks `google-auth-library`. |
| Tool loop | `src/utilsAPI/geminiToolLoop.js` | `runGeminiWithTools({ ai, model, config, contents, executeTool })` — multi-turn function calling until text reply |
| Tool schemas | `open-dome-lib/src/agentSkills.js` | Venue: `search_events`, `get_event`, `list_places`, `list_amenities`, `plan_day`. Wallet (Circle): `list_wallets`, `get_wallet`, `get_wallet_token_balance`, `get_wallet_nft_balance`, `list_transactions`, `get_transaction`, `estimate_transfer_fee`, `validate_address`, `create_wallets`, `create_transaction`, `create_solana_pay`, `sign_message`, `get_token` |
| Agent modes | `src/app/api/agent+api.js` | `dome` (venue consultant + planner tools), `wallet` (Circle tools via `circleAgentRuntime`), `openagent` (plain paid chat; USDC via x402 before model) |
| Models / tariff | `open-dome-lib/src/agentTariff.js` | `gemini-3.1-flash-lite`, `gemini-3.6-flash`, `gemini-3.1-pro-preview`; price = base + per-char. Client and host **must** share the same quote fn |
| Firestore | `src/utilsAPI/passkeyDb.js`, `ticketsDb.js`, `adminUsers.js` | `Users` / `Wallets` / `AdminTickets`; `Dev*` prefix when `getFirestoreEnv() === 'dev'` |
| AI telemetry | `src/utilsAPI/aiTelemetry.js` | Log name `opendome-ai-events`; `sanitizeUserInput` strips emails/addresses; fields: intent, confidence, model, latency, network |
| Platform telemetry | `src/utilsAPI/platformTelemetry.js` | Log name `opendome-platform-events`; `EVENT_TYPES`: `user_created`, `pass_minted`, `usdc_transfer`, `checkout`, `x402_payment`, `gate_scan` |
| Ops dashboard | `src/app/api/ai-telemetry+api.js` | Staff reads BigQuery-backed agent + settlement evidence |
| Credentials | telemetry + `agent+api.js` | `ensureGcpCredentials()` writes SA JSON to `os.tmpdir()` from `GCP_PROJECT_ID` / `GCP_CLIENT_EMAIL` / `GCP_PRIVATE_KEY`. Never log contents. |

### Agentic call path (example)

1. Mini-app / OpenAgent UI quotes via `open-dome-lib/src/agentTariff.js`.
2. Guest approves USDC spend → host `POST /api/x402-pay` (Circle settles) → then `POST /api/agent`.
3. `agent+api.js` builds Vertex client → `runGeminiWithTools` → for `wallet` mode `executeTool` → `runCircleAgentTool` in `circleAgentRuntime.js`.
4. `emitAiEvent` / `emitPlatformEvent` write Cloud Logging.

Sandbox twin: `OpenDome/OpenDomeSandbox/src/app/api/agent+api.js` (same shape; Firestore forced to `Dev*` collections).

When adding a telemetry event, extend `EVENT_TYPES` (unknown → `unknown`) and keep the BigQuery schema stable.

## Circle / USDC / x402 — Payments (host only)

**Emphasis:** Every priced interaction settles in **USDC** via Circle. Agent turns, transfers, checkout, and mint are payment flows — not optional demos.

```mermaid
sequenceDiagram
  participant Guest
  participant HostUI as Host_approval_UI
  participant PayAPI as Host_x402_pay
  participant Service as Priced_service
  participant Circle
  participant Agent as Host_agent

  Guest->>HostUI: Approve USDC amount + network
  HostUI->>PayAPI: POST serviceUrl + network + approvedAmount
  PayAPI->>Service: Fetch challenge
  Service-->>PayAPI: HTTP 402 + x402-challenge
  alt EVM USDC
    PayAPI->>Circle: signTypedData EIP-3009
    Circle-->>PayAPI: signature
    PayAPI->>Service: Retry with payment-signature
  else Solana USDC
    PayAPI->>Circle: Execute USDC transfer
    Circle-->>PayAPI: transactionId
    PayAPI->>Service: Retry with proof
  end
  Service-->>PayAPI: Paid response
  PayAPI->>PayAPI: emitPlatformEvent x402_payment
  Guest->>Agent: Paid prompt / tool turn
  Agent->>Circle: Optional wallet tools
```

| Concern | File (under `OpenDome/OpenDomeApp/` unless noted) | Notes |
|---------|---------------------------------------------------|-------|
| Circle client | `src/utilsAPI/circleTools.js` | `initiateDeveloperControlledWalletsClient({ apiKey: CIRCLE_API_KEY, entitySecret: CIRCLE_ENTITY_SECRET })`. Package import is split (`'@circle-fin/' + '...'`) so Metro cannot bundle it — keep that pattern |
| Wallet sets / creation | `circleTools.js` | `getOrCreateWalletSet`, `createCircleAgentWallet` (EOA, `idempotencyKey`) on register |
| Agent → Circle tools | `src/utilsAPI/circleAgentRuntime.js` | `runCircleAgentTool(name, args, ctx)`, `buildWalletAgentContext`, `fetchBalancesForUserWallets`. Circle rejects `blockchain` when `walletIds` is set |
| x402 buyer | `src/app/api/x402-pay+api.js` | `x402Version: 2`; header `x402-challenge`; guest `approvedAmount` must match; SSRF policy in `src/utilsAPI/x402ServicePolicy.js` |
| x402 primitives | `open-dome-lib/src/x402Challenge.js`, `eip3009.js`, `usdcChains.js`, `x402.js` | Chains: `BASE`, `ARB`, `OP`, `MATIC`, `AVAX`, `SOL` |
| Sponsored USDC transfer | `src/app/api/transfer+api.js` + `src/utilsAPI/sponsorUsdcTransfer.js`, `sponsorSolanaTransfer.js` → `opendome/dist/solana/*` (Kit) | Guest-approved; merchant pays gas |
| Checkout + mint | `src/app/api/checkout+api.js`, `mint+api.js`, `opendome/dist/platformMint.js` | Pay then mint ERC-1155 pass on Base (`CONTRACT_ADDRESS`) |
| CCTP | `src/utilsAPI/cctp/*` | EVM → Solana USDC when pay network ≠ treasury network |
| Balances / NFTs | `src/app/api/wallet-balances+api.js`, `nfts+api.js` | Circle + chain reads; also via `Host.walletBalances` / `Host.listNfts` |
| Approval UX | `src/components/TransactionModal.js`, `IframeContainer.js` | Shows network + amount; reject cancels; no auto-pay |

### Payment examples (agents: copy patterns, not secrets)

**Guest-approved transfer (mini-app → Host bridge):**

```js
import { Host } from 'opendome';

const result = await Host.transfer({
  amount: '1.00',
  destination: '0x…',
  blockchain: 'BASE',
  asset: 'USDC',
});
```

**OpenAgent tariff → USDC x402 → Gemini** (concept):

```js
import { quotePromptTariff } from 'opendome'; // agentTariff
const quote = quotePromptTariff(prompt, modelId);
// Host: TransactionModal approve → POST /api/x402-pay → POST /api/agent
```

**Circle wallet tool from Gemini** (`wallet` mode): schemas in `open-dome-lib/src/agentSkills.js`; execution in `circleAgentRuntime.js` → Circle Programmable Wallets API.

Guest approval is mandatory before any settlement. Do not add auto-pay paths. Sandbox mirrors approval; Solana x402 may return `501` on Sandbox while App runs full Solana USDC.

## Env matrices

### Host (OpenDomeApp / OpenDomeSandbox)

Examples: `OpenDome/OpenDomeApp/.env.example`, `OpenDome/OpenDomeSandbox/.env.example`.

Required shape (names only): `SESSION_JWT_TOKEN`, `MQTT_JWT_TOKEN`, `DOCKING_JWT_TOKEN`, `ADMIN_SERVICE_TOKEN`, `GCP_PROJECT_ID`, `GCP_CLIENT_EMAIL`, `GCP_PRIVATE_KEY`, `CIRCLE_API_KEY`, `CIRCLE_ENTITY_SECRET`, `CONTRACT_ADDRESS`, `MERCHANT_ADDRESS`, `MERCHANT_PRIVATE_KEY`, `MERCHANT_SOLANA_ADDRESS`, `MERCHANT_SOLANA_PRIVATE_KEY`.
App-only: `CRON_SECRET`. Optional: `FIRESTORE_ENV`, `RPC_URL_*`, `*_MINIAPP_URL`.

### Mini-app

```
EXPO_PUBLIC_OD_SKIP_AUTH=false   # debug only if true
EXPO_PUBLIC_OD_APP_ID=...
OD_APP_TOKEN=...                 # required
# OPENDOME_DOCKING_HOST_URL=     # optional override only
```

## SDK (`opendome`)

- Source: `open-dome-lib/src/`
- Build: `npm run build` → `dist/` (Babel). Hosts and mini-app API routes import `opendome/dist/<module>.js` for Vercel.
- Consumer apps: `"opendome": "file:../../../open-dome-lib"`
- Entry hook: `useOpenDome` — after auth exposes `blockchain`, location, Events, Host bridge helpers, Agent helpers
- `Communication` = MQTT stub (temporarily disabled; do not reintroduce broker without product ask)
- Venue catalog queries = `Events` (JSON helpers over `src/dbs/events.json`)
- Day planner council = deterministic multi-agent scoring, no Gemini (`dayPlannerAgents.js`, `amenityAffinity.js`, `itinerary.js`, `planner.js`)
- Host Gemini + Circle + USDC x402 = `OpenDomeApp` `/api/agent` + `/api/x402-pay` (Sandbox twins)

### SDK export map

`open-dome-lib/src/index.js` is the public browser entry point. Major exports:

| Export | Source | Purpose |
|--------|--------|---------|
| `useOpenDome`, `OpenDomeLockScreen`, `HostGate` | `useOpenDome.js`, `LockScreen.js`, `HostGate.js` | Docking/auth lifecycle and locked standalone state |
| `Host` | `host.js` | Browser → parent bridge for privileged host operations |
| `Blockchain`, wallet classes | `blockchain/` | EVM/Solana/Starknet helpers and pass configuration |
| `Location` | `location.js` | Host-proxied location |
| `Events` | `events.js` | Venue catalog queries |
| `Communication` | `communication.js` | MQTT stub (disabled) |
| `Agent` | `agent.js` | Host agent bridge/client (paid Gemini turns) |
| planner helpers | `planner.js`, `itinerary.js`, `dayPlannerAgents.js` | Deterministic day-planning agents |
| tariff/x402 helpers | `agentTariff.js`, `x402.js`, `x402Challenge.js` | USDC quote + x402 challenge protocol |

Server-only mini-app code imports `opendome/dist/dockingHost.js` directly. Do not export or import `dockingHost.js` through browser bundles because it reads `OD_APP_TOKEN`.

### Mini-app root example

Use the SDK gate at the app root. Explicitly render loading, locked, unauthenticated, error, and success states.

```jsx
import { Button, Text } from 'react-native';
import { OpenDomeLockScreen, useOpenDome } from 'opendome';

export default function App() {
  const {
    loading,
    isLocked,
    isAuthorized,
    authError,
    user,
    context,
    proxiedLocation,
    login,
  } = useOpenDome({
    blockchain: { evm: ['base', 'arbitrum', 'polygon', 'optimism'] },
  });

  if (loading) return <Text>Connecting to OpenDome…</Text>;
  if (isLocked) return <OpenDomeLockScreen />;
  if (authError) return <Text>{authError}</Text>;
  if (!isAuthorized) return <Button title="Sign in" onPress={login} />;

  return <Text>Welcome {user?.username}</Text>;
}
```

Reference implementation: `OpenDome/OpenDomeMiniApps/Demo/src/App.js`.

### Mini-app server exchange example

Every mini-app needs this server route at `src/app/api/docking-token+api.js`:

```js
import { exchangeDockingEnrollment } from 'opendome/dist/dockingHost.js';

export async function GET() {
  return exchangeDockingEnrollment();
}
```

Required server env: `OD_APP_TOKEN`. The route returns `{ token, appId }` from the host; never send the enrollment credential itself to browser code.

### Privileged host call example

Mini-app browser code calls `Host`; the parent host adds its authenticated session and calls the same-origin API:

```js
import { Host } from 'opendome';

const balances = await Host.walletBalances();

// Must follow explicit guest approval in UI.
const transfer = await Host.transfer({
  amount: '1.00',
  destination: '0x…',
  blockchain: 'BASE',
  asset: 'USDC',
});
```

Do not replace bridge calls with direct cross-origin requests to host routes. The bridge is the authorization and origin boundary.

### Docking message and token contracts

| Contract | Required fields / behavior |
|----------|----------------------------|
| Enrollment JWT | HS512; `token_use=enrollment`, `role=mini_app`, `appId`; sent only server → server |
| Handshake JWT | HS512; `token_use=handshake`, `role=mini_app`, `appId`; approximately 600 seconds |
| `OPENDOME_READY` | Mini-app browser tells parent it has a handshake token |
| `OPENDOME_HANDSHAKE` | Host sends verified user/context and channel tokens to active iframe |
| `OPENDOME_HOST_REQUEST` | `{ type, id, payload: { action, ...args } }` from mini-app |
| `OPENDOME_HOST_RESPONSE` | `{ type, id, response }` or `{ type, id, error }` from host |
| `OPENDOME_WALLET_UPDATE` | Host-pushed cached balances/NFT snapshot |

## Host responsibilities vs mini-apps

| Concern | Host | Mini-app |
|---------|------|----------|
| Passkey / roles | yes | no |
| Docking verify / enroll exchange | yes | exchange only |
| **Circle wallets / USDC / merchant keys** | yes | no (call `Host.transfer` / host x402) |
| **Vertex Gemini agent + GCP telemetry** | yes | UI only (`OpenAgent`, venue apps); schemas in SDK |
| Mint / checkout / agent / x402-pay | yes | may call Host bridge or host-proxied APIs |
| UI for venue / wallet / agent chat | no | yes |

Admin / Scanner are thin UIs; secrets stay on App. Bridge actions: `Host.*` → host APIs (`runHostRequest`).

## Deploy order

1. Deploy host code + host env (`DOCKING_JWT_TOKEN` aligned across App and Sandbox)
2. Deploy mini-apps with matching enrollment `OD_APP_TOKEN`s
3. Never point Vercel mini-app `OPENDOME_DOCKING_HOST_URL` at localhost

## Vercel monorepo builds (CPU / cost)

Each app’s `vercel.json` sets `ignoreCommand` to a pure git check against **this commit’s parent** (`HEAD^`):

```text
git diff --quiet HEAD^ HEAD -- :/OpenDome/<AppPath> :/open-dome-lib
```

(`Landing` watches `:/Landing` only. `:/` = path from repo root, independent of Vercel Root Directory.)

Exit `0` = skip build, nonzero = build.

- README / AGENTS / other apps → skip
- That app folder or `open-dome-lib` → build
- Do not rely on `VERCEL_GIT_PREVIOUS_SHA` (last successful deploy); stacked commits then rebuild while an earlier deploy is still queued

Optional helper (local debugging): [`scripts/vercel-ignore.cjs`](./scripts/vercel-ignore.cjs).  
Keep each project’s Root Directory = its app folder. `ignoreCommand` in `vercel.json` overrides the dashboard Ignored Build Step.

## Engineering constraints (this repo)

- Modular by domain; no god files mixing route + business + DB when avoidable
- Expo API routes: `src/app/api/*+api.js`
- Web output: server (`vercel.json` → Expo adapter)
- Node-only SDKs (Firestore, Circle, `@google/genai`) load through `src/utilsAPI/nodeRequire.js`; do not convert to static imports
- Credential hygiene: gitignore `.env`; scan before commit; never echo secrets in chat/logs
- After `open-dome-lib` src changes: rebuild `dist/` before expecting host/mini-app imports to change

## Common agent tasks → where to edit

| Task | Start here |
|------|------------|
| Change docking crypto / host resolve | `open-dome-lib/src/dockingHost.js`, host `docking-token+api.js` / `verify+api.js`, rebuild dist |
| New mini-app | Copy Demo docking route; assign next free port; add store entry in App `apps+api.js` |
| CORS / origins | Host `verify+api.js` allows any localhost; prod `*.opendome.xyz` |
| Pass / mint | `opendome/dist/platformMint.js`, App mint/checkout APIs |
| Agent tariff / USDC quote | `open-dome-lib/src/agentTariff.js` + `OpenDomeMiniApps/OpenAgent/` + host `/api/agent` + `/api/x402-pay` |
| New Gemini / Circle tool | `open-dome-lib/src/agentSkills.js` (schema) + `circleAgentRuntime.js` or dome executors in `agent+api.js`, rebuild dist |
| New USDC payment path | `x402-pay+api.js` / `transfer+api.js` / `checkout+api.js` + `TransactionModal.js` approval |
| New telemetry metric | `aiTelemetry.js` / `platformTelemetry.js`, then `ai-telemetry+api.js` |

## Explicit non-goals unless user asks

- Git history purge of old leaked blobs
- Rotating provider keys in Circle/GCP dashboards
- Rewriting human README into this file (or vice versa)
