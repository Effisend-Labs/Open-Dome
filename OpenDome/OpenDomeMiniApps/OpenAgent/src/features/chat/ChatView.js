import React from 'react';
import { View } from 'react-native';
import { formatTariffLabel } from 'opendome/src/agentTariff.js';
import { useAgentChat } from './useAgentChat';
import { MessageList } from './MessageList';
import { Composer } from './Composer';
import { AuthRequiredPanel } from '../auth/AuthRequiredPanel';
import { PaymentIntentSheet } from '../billing/PaymentIntentSheet';

export function ChatView({
  tokens,
  isDark,
  isAuthorized,
  onGoToAccount,
  credits,
  modelId,
  onChangeModel,
  login,
  authPending,
  authError,
}) {
  const chat = useAgentChat({
    isAuthorized,
    onNeedAuth: onGoToAccount,
    onPaid: credits?.refresh,
    modelId,
    onChangeModel,
  });
  const canSend = chat.prompt.trim().length > 0 && !chat.isTyping;

  if (!isAuthorized) {
    return (
      <AuthRequiredPanel
        tokens={tokens}
        onSignIn={login}
        onCreatePasskey={onGoToAccount}
        pending={authPending}
        error={authError}
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {chat.pending ? (
        <PaymentIntentSheet
          tokens={tokens}
          isDark={isDark}
          amountLabel={chat.pending.quote.totalLabel}
          targetLabel="OpenAgent"
          selectedNetwork={chat.selectedNetwork}
          onSelectNetwork={chat.setSelectedNetwork}
          onConfirm={chat.confirmPay}
          onCancel={chat.cancelPay}
          breakdown={[
            { label: 'Model', value: chat.pending.quote.modelLabel },
            { label: 'Base', value: formatTariffLabel(chat.pending.quote.baseUsd) },
            { label: `${chat.pending.quote.chars} chars`, value: formatTariffLabel(chat.pending.quote.lengthUsd) },
          ]}
        />
      ) : null}

      <MessageList
        tokens={tokens}
        messages={chat.messages}
        isTyping={chat.isTyping}
        onStarter={chat.requestSend}
      />

      <Composer
        tokens={tokens}
        value={chat.prompt}
        onChange={chat.setPrompt}
        onSend={() => chat.requestSend()}
        disabled={chat.isTyping}
        canSend={canSend}
        placeholder="Message Gemini"
      />
    </View>
  );
}
