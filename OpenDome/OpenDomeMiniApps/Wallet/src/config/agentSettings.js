/**
 * Resolve the host the Wallet is docked in (App or Sandbox).
 * Prefer parentOrigin from the iframe query string — never hardcode Sandbox.
 */
export function getHostBaseUrl() {
  const envHost =
    typeof process !== 'undefined' ? process.env.EXPO_PUBLIC_OD_HOST_URL : null;
  if (envHost) return String(envHost).replace(/\/$/, '');

  if (typeof window !== 'undefined') {
    try {
      const parent = new URLSearchParams(window.location.search).get('parentOrigin');
      if (parent) return parent.replace(/\/$/, '');
    } catch {
      // ignore
    }
    try {
      const ancestor = window.location.ancestorOrigins?.[0];
      if (ancestor) return String(ancestor).replace(/\/$/, '');
    } catch {
      // ignore
    }
  }

  // User-facing OpenDomeApp default
  return 'http://localhost:8082';
}

export function getAgentApiUrl() {
  return (
    (typeof process !== 'undefined' && process.env.EXPO_PUBLIC_OD_AGENT_URL) ||
    `${getHostBaseUrl()}/api/agent`
  );
}

export function getCheckoutApiUrl() {
  return (
    (typeof process !== 'undefined' && process.env.EXPO_PUBLIC_OD_CHECKOUT_URL) ||
    `${getHostBaseUrl()}/api/checkout`
  );
}

export function getTransferApiUrl() {
  return (
    (typeof process !== 'undefined' && process.env.EXPO_PUBLIC_OD_TRANSFER_URL) ||
    `${getHostBaseUrl()}/api/transfer`
  );
}

/** @deprecated use getAgentApiUrl() — kept for any static imports */
export const AGENT_API_URL = 'http://localhost:8082/api/agent';

/** @deprecated use getCheckoutApiUrl() */
export const CHECKOUT_API_URL = 'http://localhost:8082/api/checkout';

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

export function resolveGeminiChatModel(modelId) {
  return GEMINI_CHAT_MODELS.find((m) => m.id === modelId) || GEMINI_CHAT_MODELS[1];
}
