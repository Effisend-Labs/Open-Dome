# 🧪 Open-Dome Sandbox (Visualizer)

The **Open-Dome Sandbox**, also known as the **Visualizer**, is the professional-grade environment for testing and verifying Open-Dome Mini Apps. It acts as the "Host" application, providing the necessary security infrastructure and context for Mini Apps to function.

## 🚀 Live Demo
Access the live Sandbox here: **[https://opendome.expo.app/](https://opendome.expo.app/)**

---

## 🧐 How it Works

The Sandbox replicates the production environment of the Effisend Super-App by creating a secure bridge with your Mini App.

### 1. The Handshake & Communication Flow
The Sandbox is the **authority** in the ecosystem. It receives the Mini App's identity token, verifies it server-side, issues signed JWTs, and then injects the full context.

```mermaid
sequenceDiagram
    participant App as Mini App (iframe)
    participant SDK as Open-Dome SDK
    participant Sandbox as Sandbox (Host)
    participant API as /api/verify (Server)

    Sandbox->>App: Load iframe (Endpoint URL)
    App->>SDK: useOpenDome()
    SDK->>Sandbox: postMessage(OPENDOME_READY, { token })
    Note over Sandbox,API: Token never touches the client bundle
    Sandbox->>API: POST /api/verify { token }
    API->>API: Crosscheck VALID_TOKENS[]
    API->>API: Sign wsJwt + hostJwt via HS512
    API->>Sandbox: { valid: true, wsJwt, hostJwt }
    alt Token Valid
        Sandbox->>SDK: postMessage(OPENDOME_HANDSHAKE, { status: VERIFIED, context: { ...vars, wsJwt } })
        SDK->>App: isAuthorized = true
        SDK->>Sandbox: postMessage(OPEN_DOME_SDK_INIT)
        Sandbox->>Sandbox: EventBoard connects with hostJwt
    else Token Invalid
        Sandbox->>SDK: postMessage(OPENDOME_HANDSHAKE, { status: UNAUTHORIZED })
        SDK->>Sandbox: postMessage(OPEN_DOME_SDK_ERROR)
    end

    loop Real-time GPS Proxy
        Sandbox->>SDK: postMessage(OPENDOME_LOCATION_UPDATE, { lat, lng, accuracy })
        SDK->>App: proxiedLocation updated
    end
```

### 2. Sandbox Feature Architecture
The Sandbox provides a multi-layered testing interface.

```mermaid
graph TD
    subgraph "Control Panel (Sidebar)"
        Conf[Configuration]
        Ctx[Context Variables]
        Inj[Inject Payload Button]
    end

    subgraph "Stage Area (Emulator)"
        Frame[Smartphone Frame]
        Iframe[Mini App Iframe]
    end

    subgraph "Monitoring (Bottom)"
        Board[Event Board / MQTT Logs]
    end

    Conf -->|Sets| Iframe
    Ctx -->|Injected via| Inj
    Inj -->|Triggers Handshake| Iframe
    Iframe -->|Publishes Events| Board
```

---

## 🛠️ Testing & Configuration

### Context Injection
Modify the **Context Variables** to test how your app reacts to different environments:
- **Theming**: Switch between `light` and `dark`.
- **User Metadata**: Change `username` or `lang`.
- **Security**: Test with valid or invalid tokens to verify error handling.

### Location Proxying
The Sandbox captures the browser's geolocation and proxies it to the Mini App, mimicking the production security model where Mini Apps don't have direct hardware access.

### Event Monitoring
The **Event Board** at the bottom monitors all MQTT traffic. When your Mini App publishes an event, it will appear here in real-time, allowing you to debug cross-app communication.

---

MIT © Effisend Labs
