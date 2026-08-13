import { useCallback, useState } from 'react';
import { Agent } from 'opendome';
import { quotePromptTariff, GEMINI_CHAT_MODELS } from 'opendome/src/agentTariff.js';
import { getAgentApiUrl } from '../../config/host';

export function useAgentChat({ isAuthorized, onNeedAuth }) {
  const [messages, setMessages] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [modelId, setModelId] = useState(GEMINI_CHAT_MODELS[1].id);
  const [pending, setPending] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState('base');

  const liveQuote = quotePromptTariff(prompt, modelId);

  const requestSend = useCallback(() => {
    const text = prompt.trim();
    if (!text || isTyping) return;
    if (!isAuthorized) {
      onNeedAuth?.();
      return;
    }
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

    try {
      const res = await Agent.pay(getAgentApiUrl(), intent.quote.x402Amount, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-payment-network': selectedNetwork,
        },
        body: JSON.stringify({
          prompt: intent.text,
          modelId: intent.modelId,
          mode: 'openagent',
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
          costLabel: intent.quote.totalLabel,
          tariff: payload?.tariff || intent.quote,
          paymentTxHash,
          explorerUrl:
            res.explorerUrl ||
            payload?.explorerUrl ||
            (paymentTxHash ? `https://basescan.org/tx/${paymentTxHash}` : null),
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'system', content: err.message || String(err) },
      ]);
    } finally {
      setIsTyping(false);
    }
  }, [pending, selectedNetwork]);

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
