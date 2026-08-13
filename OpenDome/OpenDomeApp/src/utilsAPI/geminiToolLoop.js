export function geminiText(response) {
  if (!response) return '';
  const direct = response.text;
  if (typeof direct === 'string' && direct.trim() && direct.trim() !== 'undefined') {
    return direct.trim();
  }
  const parts = response.candidates?.[0]?.content?.parts || [];
  return parts
    .map((p) => p.text)
    .filter((t) => typeof t === 'string' && t.trim())
    .join('\n')
    .trim();
}

function jsonSafe(value) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return { result: String(value) };
  }
}

function fallbackFromTool(result) {
  if (!result) return '';
  if (result.error) return `Circle error: ${result.error}`;
  const balances = result.tokenBalances?.tokenBalances || result.tokenBalances;
  if (Array.isArray(balances) && balances.length) {
    return balances
      .map((row) => {
        const sym = row.token?.symbol || row.symbol || 'token';
        const amt = row.amount ?? row.available ?? '?';
        return `${sym}: ${amt}`;
      })
      .join('\n');
  }
  if (result.address && result.wallets) {
    return `Wallet ${result.address}`;
  }
  try {
    return JSON.stringify(result).slice(0, 1200);
  } catch {
    return '';
  }
}

export async function runGeminiWithTools({
  ai,
  model,
  config,
  contents,
  executeTool,
  maxSteps = 6,
}) {
  const used = [];
  let current = contents;
  let lastResult = null;

  for (let step = 0; step < maxSteps; step++) {
    const response = await ai.models.generateContent({
      model,
      contents: current,
      config,
    });
    const calls = response.functionCalls || [];
    if (!calls.length) {
      const text = geminiText(response);
      return {
        text: text || fallbackFromTool(lastResult),
        tools: used,
        lastResult,
      };
    }

    const call = calls[0];
    used.push(call.name);
    lastResult = await executeTool(call.name, call.args || {});
    const modelPart =
      response.candidates?.[0]?.content?.parts?.find((p) => p.functionCall) || {
        functionCall: call,
      };

    current = [
      ...current,
      { role: 'model', parts: [modelPart] },
      {
        role: 'user',
        parts: [
          {
            functionResponse: {
              name: call.name,
              ...(call.id ? { id: call.id } : {}),
              response: jsonSafe(lastResult),
            },
          },
        ],
      },
    ];
  }

  return {
    text: fallbackFromTool(lastResult) || 'Could not finish that Circle request.',
    tools: used,
    lastResult,
  };
}
