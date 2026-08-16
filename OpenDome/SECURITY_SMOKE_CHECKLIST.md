# Production security smoke checklist

Run this in production after deploying the App, Sandbox, or SDK security changes.

## Identity and roles

- Sign in as the provisioned `god` user and confirm the Admin mini-app is visible and usable.
- Sign in as a `scanner` user and confirm the Scanner mini-app works but Admin actions are denied.
- Attempt passkey registration with the reserved administrator username and confirm it returns `403`.

## Payments

- From a signed-in mini-app, request a USDC transfer and reject it; confirm no transfer is sent.
- Repeat the transfer and approve it; confirm the confirmation view shows the destination and amount.
- Request an x402 payment. Confirm the modal shows the complete service URL and quoted USDC amount.
- Reject the x402 modal; confirm the mini-app receives a rejection and no payment is made.
- Approve an x402 payment to a public HTTPS service; confirm it settles once.
- In production, attempt an x402 request to `localhost` and a private IP; confirm each is denied.
- Attempt an x402 URL that redirects; confirm the request is denied rather than followed.
- Choose a non-Base payment network and confirm the approval modal displays that network.

## Agent and docking

- Call `/api/agent` without a session token and confirm it returns `401`.
- Send 13 signed-in agent requests within one minute and confirm the 13th returns `429`.
- Dock Demo, Wallet, Admin, and Scanner through the host and confirm each receives its expected role context.
- In Sandbox, dock Demo, authenticate, and confirm its handshake receives an `iframeToken` and role.
- In Sandbox, request x402 and `Host.transfer`; confirm each waits for explicit approval.
- Confirm Sandbox debug delete-user and legacy `/api/blockchain/transfer` routes return `404`.

## Deployment configuration

- MQTT realtime is temporarily disabled in code. Broker ACLs can wait until Communication is re-enabled.
