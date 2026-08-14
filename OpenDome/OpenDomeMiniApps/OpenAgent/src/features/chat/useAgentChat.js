import { useCallback, useState } from 'react';
import { Agent } from 'opendome';
import { quotePromptTariff, GEMINI_CHAT_MODELS } from 'opendome/src/agentTariff.js';

const NETWORK_LABEL = {
  base: 'Base',
  arbitrum: 'Arbitrum',
  optimism: 'Optimism',
  polygon: 'Polygon',
  avalanche: 'Avalanche',
  solana: 'Solana',
};

export function useAgentChat({
  isAuthorized,
  onNeedAuth,
  onPaid,
  modelId: modelIdProp,
  onChangeModel,
  selectedNetwork: selectedNetworkProp,
  onChangeNetwork,
}) {
  const [messages, setMessages] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [modelIdInner, setModelIdInner] = useState(GEMINI_CHAT_MODELS[1].id);
  const modelId = modelIdProp || modelIdInner;
  const setModelId = onChangeModel || setModelIdInner;
  const [pending, setPending] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedNetworkInner, setSelectedNetworkInner] = useState('base');
  const selectedNetwork = selectedNetworkProp || selectedNetworkInner;
  const setSelectedNetwork = onChangeNetwork || setSelectedNetworkInner;

  const liveQuote = quotePromptTariff(prompt, modelId);

  const requestSend = useCallback((override) => {
    const text = String(override ?? prompt).trim();
    if (!text || isTyping) return;
    if (!isAuthorized) {
      onNeedAuth?.();
      return;
    }
    if (override != null) setPrompt(text);
    setPending({
      text,
      modelId,
      quote: quotePromptTariff(text, modelId),
    });
  }, [prompt, isTyping, isAuthorized, modelId, onNeedAuth]);

  const cancelPay = useCallback(() => setPending(null), []);

  const confirmPay = useCallback(async () => {
    const intent = pending;
    if (!intent) return;

    setPrompt('');
    setPending(null);
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: 'user', content: intent.text },
    ]);
    setIsTyping(true);

    const networkLabel = NETWORK_LABEL[selectedNetwork] || selectedNetwork;

    try {
      const res = await Agent.pay('/api/agent', intent.quote.x402Amount, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-payment-network': selectedNetwork,
        },
        body: JSON.stringify({
          prompt: intent.text,
          modelId: intent.modelId,
          mode: 'openagent',
          messages: [
            ...messages
              .filter((m) => m.role === 'user' || m.role === 'agent')
              .map((m) => ({ role: m.role, content: m.content })),
            { role: 'user', content: intent.text },
          ],
        }),
      });
      const payload = res?.data || res;
      const paymentTxHash = res.paymentTxHash || payload?.paymentTxHash || null;
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'agent',
          content: payload?.response || res.response || JSON.stringify(res),
          model: payload?.modelLabel || intent.quote.modelLabel,
          costLabel: `${intent.quote.totalLabel} USDC · ${networkLabel}`,
          tariff: payload?.tariff || intent.quote,
          paymentTxHash,
          explorerUrl: res.explorerUrl || payload?.explorerUrl || null,
        },
      ]);
      onPaid?.();
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'system', content: err.message || String(err) },
      ]);
    } finally {
      setIsTyping(false);
    }
  }, [pending, selectedNetwork, onPaid, messages]);

  return {
    messages,
    prompt,
    setPrompt,
    modelId,
    setModelId,
    pending,
    isTyping,
    liveQuote,
    selectedNetwork,
    setSelectedNetwork,
    requestSend,
    cancelPay,
    confirmPay,
  };
}
