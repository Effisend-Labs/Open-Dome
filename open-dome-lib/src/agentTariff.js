/**
 * x402 prompt billing: base tariff + message length.
 * Host and OpenAgent must use the same quote so Sign matches the 402 challenge.
 */

export const GEMINI_CHAT_MODELS = [
  {
    id: 'fast-lite',
    label: 'Gemini 3.1 Flash-Lite',
    shortLabel: 'Lite',
    apiModel: 'gemini-3.1-flash-lite',
    baseTariffUsd: 0.0001,
    perCharUsd: 0.000001,
  },
  {
    id: 'fast',
    label: 'Gemini 3.6 Flash',
    shortLabel: 'Flash',
    apiModel: 'gemini-3.6-flash',
    baseTariffUsd: 0.001,
    perCharUsd: 0.000002,
  },
  {
    id: 'pro',
    label: 'Gemini 3.1 Pro',
    shortLabel: 'Pro',
    apiModel: 'gemini-3.1-pro-preview',
    baseTariffUsd: 0.01,
    perCharUsd: 0.00001,
  },
];

export function resolveGeminiChatModel(modelId) {
  return GEMINI_CHAT_MODELS.find((m) => m.id === modelId) || GEMINI_CHAT_MODELS[1];
}

function roundUsd(n) {
  const x = Number(n);
  if (!Number.isFinite(x) || x < 0) return 0;
  return Math.round(x * 1e8) / 1e8;
}

export function formatTariffForX402(totalUsd) {
  const n = roundUsd(totalUsd);
  const billed = n > 0 ? n : 0.0001;
  if (billed < 0.01) {
    const s = billed.toFixed(8).replace(/0+$/, '').replace(/\.$/, '');
    return s || '0.0001';
  }
  return billed.toFixed(2);
}

export function formatTariffLabel(totalUsd) {
  const n = roundUsd(totalUsd);
  if (n < 0.01) return `$${n.toFixed(6).replace(/0+$/, '').replace(/\.$/, '')}`;
  return `$${n.toFixed(2)}`;
}

/**
 * @param {string} text
 * @param {string} [modelId]
 */
export function quotePromptTariff(text, modelId) {
  const model = resolveGeminiChatModel(modelId);
  const chars = String(text || '').length;
  const lengthUsd = roundUsd(chars * model.perCharUsd);
  const totalUsd = roundUsd(model.baseTariffUsd + lengthUsd);
  return {
    modelId: model.id,
    modelLabel: model.label,
    apiModel: model.apiModel,
    chars,
    baseUsd: model.baseTariffUsd,
    perCharUsd: model.perCharUsd,
    lengthUsd,
    totalUsd,
    totalLabel: formatTariffLabel(totalUsd),
    x402Amount: formatTariffForX402(totalUsd),
  };
}
