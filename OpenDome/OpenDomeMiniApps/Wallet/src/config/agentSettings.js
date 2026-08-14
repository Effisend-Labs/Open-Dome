/** Chat picker — only models the host /api/agent actually routes. */
export const GEMINI_CHAT_MODELS = [
  {
    id: 'fast-lite',
    label: 'Gemini 3.1 Flash-Lite',
    apiModel: 'gemini-3.1-flash-lite',
    cost: '0.0001',
  },
  {
    id: 'fast',
    label: 'Gemini 3.6 Flash',
    apiModel: 'gemini-3.6-flash',
    cost: '0.001',
  },
];

/** Wallet Circle agent always uses Flash — better for tool calling. */
export const WALLET_AGENT_MODEL_ID = 'fast';

export function resolveGeminiChatModel(modelId) {
  return GEMINI_CHAT_MODELS.find((m) => m.id === modelId) || GEMINI_CHAT_MODELS[1];
}

export function resolveWalletAgentModel() {
  return resolveGeminiChatModel(WALLET_AGENT_MODEL_ID);
}
