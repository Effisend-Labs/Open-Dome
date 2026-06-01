export const POST = async (request) => {
  console.log('[Passkey Proxy API] POST /api/passkey/login-verify initiated');
  try {
    const { challengeId, assertionResponse } = await request.json();
    console.log(`[Passkey Proxy API] login-verify challengeId: ${challengeId}`);
    console.log(`[Passkey Proxy API] login-verify assertionResponse ID: ${assertionResponse?.id}`);

    if (!challengeId || !assertionResponse) {
      return Response.json({ error: 'challengeId and assertionResponse are required' }, { status: 400 });
    }

    const origin = request.headers.get('origin') || '';
    const targetUrl = 'https://ibtnn7utej2mqg4q7qmj6wscfe0ubibv.lambda-url.us-east-1.on.aws/';
    console.log(`[Passkey Proxy API] Forwarding to Lambda URL: ${targetUrl} with origin: ${origin}`);
    const lambdaRes = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': origin,
      },
      body: JSON.stringify({ challengeId, credentialResponse: assertionResponse })
    });

    const responseText = await lambdaRes.text();
    console.log(`[Passkey Proxy API] Lambda response status: ${lambdaRes.status} ${lambdaRes.statusText}`);
    console.log(`[Passkey Proxy API] Raw Lambda response: ${responseText}`);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { error: responseText || 'Empty or malformed JSON from Lambda' };
    }

    if (!lambdaRes.ok) {
      return Response.json(data, { status: lambdaRes.status });
    }

    return Response.json(data);
  } catch (e) {
    console.error('[Passkey Proxy API] Error proxying login verification:', e);
    return Response.json({ error: e.message }, { status: 500 });
  }
};
