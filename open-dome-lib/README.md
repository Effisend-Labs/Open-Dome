# 🏟️ Open-Dome SDK

Enterprise-grade SDK for secure module integration, multi-chain blockchain interactions, and real-time event distribution within the Effisend Open-Dome ecosystem.

## 🚀 Features & API Usage

### 1. Secure Handshake & Authentication
The `useOpenDome` hook is the entry point for all Mini Apps. The Mini App server exchanges its server-only `OD_APP_TOKEN` enrollment credential for a 10-minute docking JWT. App/Sandbox verify that JWT with their shared `DOCKING_JWT_TOKEN` before injecting context.

**API Reference:**
```javascript
const { 
  isAuthorized, // Boolean: true if session is verified
  token,        // String: Session token
  context,      // Object: { username, theme, lang, wsJwt, ... }
  loading,      // Boolean: true during handshake
  blockchain    // Instance: Access to multi-chain adapters
} = useOpenDome(config);
```

**Sequence Diagram:**
```mermaid
sequenceDiagram
    participant MiniApp as Mini App
    participant SDK as Open-Dome SDK
    participant Host as Host (Sandbox)
    participant API as /api/verify (Server)

    Host->>MiniApp: Load iframe
    MiniApp->>SDK: useOpenDome()
    Note over SDK: Check URL params first
    alt Session via URL params (?pass=token)
        SDK->>SDK: Parse context from URL
        SDK->>Host: postMessage(OPEN_DOME_SDK_INIT, { status: AUTHORIZED })
        SDK-->>MiniApp: isAuthorized = true
    else Session via postMessage handshake
        SDK->>MiniApp: GET /api/docking-token
        SDK->>Host: postMessage(OPENDOME_READY, { token: dockingJwt, appId })
        Host->>API: POST /api/verify { token }
        API->>API: Verify docking JWT with DOCKING_JWT_TOKEN → Sign HS512 JWTs
        API->>Host: { valid: true, wsJwt, hostJwt }
        Host->>SDK: postMessage(OPENDOME_HANDSHAKE, { status: VERIFIED, context: { ...vars, wsJwt } })
        SDK->>Host: postMessage(OPEN_DOME_SDK_INIT, { status: AUTHORIZED })
        SDK-->>MiniApp: isAuthorized = true, context injected
    end
```

---

### 2. Multi-Chain Blockchain
The `blockchain` object provides a unified interface for multiple networks.

**Architecture:**
```mermaid
graph TD
    BC[Blockchain Class] --> Adapter{Select Adapter}
    Adapter -->|EVM| EVM[EVMAdapter - Ethers/Viem]
    Adapter -->|Solana| SOL[SolanaAdapter - @solana/kit]
    Adapter -->|Starknet| STARK[StarknetAdapter - Starknet.js]
    
    BC --> Bal[getBalances]
    BC --> Tx[signAndSend]
```

**Supported Chains:** `EVM` (Base, Monad, etc.), `Solana`, `Starknet`.

**Usage:**
```javascript
// Fetch balances across multiple chains
const balances = await blockchain.getBalances({
  base: '0x...',
  solana: '...',
  starknet: '0x...'
});

// Single balance
const ethBalance = await blockchain.getBalance('base', '0x...');

// Sign and Send Transaction
const txHash = await blockchain.signAndSend({
  chain: 'base',
  privateKey: '...',
  tx: { to: '0x...', value: '...' }
});
```

---

### 3. Real-time Events (Notice Board)
MQTT-powered pub/sub system for low-latency communication.

**Communication Flow:**
```mermaid
graph LR
    AppA[Mini App A] -- publish --> Broker[MQTT Broker]
    Broker -- broadcast --> AppB[Mini App B]
    Broker -- broadcast --> Host[Host Application]
    
    subgraph "Topics"
    T1[opendome/public/events]
    T2[opendome/private/user_id]
    end
```

**Usage:**
```javascript
import { Events } from 'opendome';

// Connect using JWT from context
Events.connect({ jwt: context.wsJwt });

// Subscribe to topics
Events.subscribe('opendome/public/events', (data) => {
  console.log('Event received:', data);
});

// Publish events
Events.publish('opendome/public/events', JSON.stringify({
  title: 'System Alert',
  content: 'New user joined'
}));
```

---

### 4. Location Proxy
Abstracts geolocation to support both direct access and host-proxied data.

**Proxy Logic:**
```mermaid
graph TD
    Hook[useOpenDome Hook] --> Check{Proxied Data Available?}
    Check -->|Yes| P[Return proxiedLocation]
    Check -->|No| G[MiniApp calls Location API directly]
    G --> N[navigator.geolocation]
```

**Usage:**
```javascript
import { Location } from 'opendome';

// Get current position (Proxied automatically if available)
const pos = await Location.getCurrentPosition();

// Watch position
const id = Location.watchPosition((pos) => {
  console.log('Movement detected:', pos);
});
```

---

### 5. Multi-agent day planner
Deterministic council that builds a timed itinerary around an anchor event (doors / hard deadline).

**Modules:** `dayPlannerAgents.js`, `amenityAffinity.js`, `itinerary.js`, `planner.js`

```text
AnchorAgent → ScoutAgent×N (Pulse/Zen/Curator/Local) → SchedulerAgent → CriticAgent → winning proposal
```

```javascript
import { buildItineraryProposal } from 'opendome';

const proposal = await buildItineraryProposal({
  event,          // anchor show / game
  amenities,      // venue catalog
  agentCount: 4,  // council size
  intent: 'spa',  // optional user keywords
});
// proposal.stops[], proposal.insight, proposal.council.winner / candidates[]
```

This path does **not** call Gemini — scoring is local. The Host `/api/agent` route is the separate LLM + x402 payment surface.

## 📦 Installation

```bash
npm install opendome
```

## 📜 License

MIT © Effisend Labs
