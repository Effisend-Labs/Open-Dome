import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { formatTariffLabel } from 'opendome/src/agentTariff.js';
import { useAgentChat } from './useAgentChat';
import { ModelPicker } from './ModelPicker';
import { MessageList } from './MessageList';
import { AuthRequiredPanel } from '../auth/AuthRequiredPanel';
import { PaymentIntentSheet } from '../billing/PaymentIntentSheet';

export function ChatView({ tokens, isDark, isAuthorized, onGoToAccount }) {
  const chat = useAgentChat({ isAuthorized, onNeedAuth: onGoToAccount });
  const canSend = chat.prompt.trim().length > 0 && !chat.isTyping;

  if (!isAuthorized) {
    return <AuthRequiredPanel tokens={tokens} onSignIn={onGoToAccount} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: tokens.BG }}>
      {chat.pending ? (
        <PaymentIntentSheet
          tokens={tokens}
          isDark={isDark}
          amountLabel={chat.pending.quote.totalLabel}
          targetLabel="OpenAgent · Gemini"
          selectedNetwork={chat.selectedNetwork}
          onSelectNetwork={chat.setSelectedNetwork}
          onConfirm={chat.confirmPay}
          onCancel={chat.cancelPay}
          breakdown={[
            { label: 'Model', value: chat.pending.quote.modelLabel },
            { label: 'Base tariff', value: formatTariffLabel(chat.pending.quote.baseUsd) },
            {
              label: `${chat.pending.quote.chars} chars`,
              value: formatTariffLabel(chat.pending.quote.lengthUsd),
            },
          ]}
        />
      ) : null}

      <ModelPicker tokens={tokens} modelId={chat.modelId} onChange={chat.setModelId} />
      <MessageList tokens={tokens} messages={chat.messages} isTyping={chat.isTyping} />

      <View style={[styles.composer, { borderTopColor: tokens.BORDER, backgroundColor: tokens.BG }]}>
        <Text style={[styles.quote, { color: tokens.MUTED, fontFamily: tokens.font.mono }]}>
          {chat.liveQuote.totalLabel} · base + {chat.liveQuote.chars} chars
        </Text>
        <View style={styles.row}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: tokens.SURFACE,
                borderColor: tokens.BORDER,
                color: tokens.FG,
                fontFamily: tokens.font.primary,
              },
            ]}
            value={chat.prompt}
            onChangeText={chat.setPrompt}
            placeholder="Message OpenAgent…"
            placeholderTextColor={tokens.MUTED}
            multiline
            editable={!chat.isTyping}
            onSubmitEditing={chat.requestSend}
          />
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={chat.requestSend}
            disabled={!canSend}
            style={[
              styles.send,
              { backgroundColor: canSend ? tokens.ACCENT : tokens.SURFACE_ELEVATED },
            ]}
          >
            <Text style={{ color: canSend ? '#fff' : tokens.MUTED, fontWeight: '600', fontSize: 14 }}>
              Send
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  composer: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  quote: { fontSize: 11, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  send: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
