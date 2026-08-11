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
  ];

  return Response.json({ success: true, data: storeApps });
}