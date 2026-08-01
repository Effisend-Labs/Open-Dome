export const POST = async (request) => {
  console.log('[Passkey Proxy API] POST /api/passkey/register-options initiated');
  try {
    const { username } = await request.json();
    console.log(`[Passkey Proxy API] register-options username: ${username}`);

    const origin = request.headers.get('origin') || '';
    const targetUrl = 'https://p3c4tepaysp5wfog4clme4tqv40qvqsl.lambda-url.us-east-1.on.aws/';
    console.log(`[Passkey Proxy API] Forwarding to Lambda URL: ${targetUrl} with origin: ${origin}`);
    const lambdaRes = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': origin,
      },
      body: JSON.stringify({ username })
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
    console.error('[Passkey Proxy API] Error proxying register options:', e);
    return Response.json({ error: e.message }, { status: 500 });
  }
};
