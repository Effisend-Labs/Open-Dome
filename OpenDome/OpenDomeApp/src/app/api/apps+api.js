function resolveMiniAppUrl(request, devPort, envKey, prodUrl) {
  if (process.env[envKey]) {
    return process.env[envKey];
  }

  try {
    const host = new URL(request.url).hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return `http://localhost:${devPort}/`;
    }
  } catch {
    // fall through to production default
  }

  return prodUrl;
}

export async function GET(request) {
  const storeApps = [
    {
      id: 'demo',
      name: 'Mini App',
      description: 'SDK showcase — games, map, events, and wallet features.',
      publisher: 'Open Dome',
      url: resolveMiniAppUrl(
        request,
        8084,
        'DEMO_MINIAPP_URL',
        'https://demo.opendome.xyz/'
      ),
    },
    {
      id: 'wallet',
      name: 'Wallet',
      description: 'Multi-chain wallet with passes, send, and receive.',
      publisher: 'Open Dome',
      url: resolveMiniAppUrl(
        request,
        8085,
        'WALLET_MINIAPP_URL',
        'https://wallet.opendome.xyz/'
      ),
    },
    {
      id: 'openagent',
      name: 'OpenAgent',
      description: 'Gemini chat billed per message via x402 (base tariff + length).',
      publisher: 'Open Dome',
      url: resolveMiniAppUrl(
        request,
        8086,
        'OPENAGENT_MINIAPP_URL',
        'https://openagent.opendome.xyz/'
      ),
    },
    {
      id: 'admin',
      name: 'Admin',
      description: 'Server Bridge — GOD only (@altaga).',
      publisher: 'Open Dome',
      godOnly: true,
      url: resolveMiniAppUrl(
        request,
        8090,
        'ADMIN_MINIAPP_URL',
        'https://admin.opendome.xyz/'
      ),
    },
    {
      id: 'scanner',
      name: 'Scanner',
      description: 'Verify guest QR / wallets and use passes — scanner, admin, god.',
      publisher: 'Open Dome',
      staffOnly: true,
      url: resolveMiniAppUrl(
        request,
        8091,
        'SCANNER_MINIAPP_URL',
        'https://scanner.opendome.xyz/'
      ),
    },
  ];

  return Response.json({ success: true, data: storeApps });
}