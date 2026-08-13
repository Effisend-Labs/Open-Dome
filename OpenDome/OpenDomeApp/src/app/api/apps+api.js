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
      name: 'Dome City',
      description: 'Guest guide for Tokyo Dome City: shows, map, games.',
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
      description: 'Your USDC and NFTs. Send, receive, or plan the day.',
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
      description: 'Gemini chat. Pay as you prompt, in USDC.',
      publisher: 'Open Dome',
      url: resolveMiniAppUrl(
        request,
        8086,
        'OPENAGENT_MINIAPP_URL',
        'https://agent.opendome.xyz/'
      ),
    },
    {
      id: 'admin',
      name: 'Admin',
      description: 'Staff only. Mint and issue guest passes.',
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
      description: 'Door staff. Scan a QR to let a guest in.',
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