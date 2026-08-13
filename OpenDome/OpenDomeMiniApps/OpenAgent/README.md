# OpenAgent

Gemini chat mini-app docked in OpenDome. Every prompt is billed over **x402** as **base tariff + character length**. Sign & Send / Cancel is required — nothing auto-pays.

## Run locally

Host (`OpenDomeApp`) on `8082`, then:

```bash
cd OpenDome/OpenDomeMiniApps/OpenAgent
npm install
npm run web
```

Port **8086**. Install **OpenAgent** from the host store.

## Models

| Picker | Vertex model | Base | Per char |
|---|---|---|---|
| Gemini 3.1 Flash-Lite | `gemini-3.1-flash-lite` | $0.0001 | $0.000001 |
| Gemini 3.6 Flash | `gemini-3.6-flash` | $0.001 | $0.000002 |
| Gemini 3.1 Pro | `gemini-3.1-pro-preview` | $0.01 | $0.00001 |

Quote formula lives in `open-dome-lib/src/agentTariff.js` (client + host must match).
