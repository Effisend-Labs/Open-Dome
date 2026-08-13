import React, { useRef } from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';

export function MessageList({ tokens, messages, isTyping }) {
  const scrollRef = useRef(null);

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.list}
      contentContainerStyle={styles.content}
      onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
    >
      {messages.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyTitle, { color: tokens.FG, fontFamily: tokens.font.primary }]}>
            Gemini, billed per message
          </Text>
          <Text style={[styles.emptyBody, { color: tokens.FG_SECONDARY, fontFamily: tokens.font.primary }]}>
            Pick a model. Each prompt costs a base tariff plus character length, paid in USDC via x402.
          </Text>
        </View>
      ) : null}

      {messages.map((msg) => (
        <View
          key={msg.id}
          style={[
            styles.bubble,
            {
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              backgroundColor:
                msg.role === 'system' ? tokens.DANGER_SOFT : msg.role === 'user' ? tokens.ACCENT : tokens.SURFACE,
              borderColor: msg.role === 'system' ? tokens.DANGER : tokens.BORDER,
            },
          ]}
        >
          <Text
            style={[
              styles.body,
              {
                color: msg.role === 'user' ? '#FFFFFF' : msg.role === 'system' ? tokens.DANGER : tokens.FG,
                fontFamily: tokens.font.primary,
              },
            ]}
          >
            {msg.content}
          </Text>
          {msg.role === 'agent' && (msg.model || msg.costLabel) ? (
            <Text style={[styles.meta, { color: tokens.MUTED, fontFamily: tokens.font.mono }]}>
              {[msg.model, msg.costLabel].filter(Boolean).join(' · ')}
            </Text>
          ) : null}
        </View>
      ))}

      {isTyping ? (
        <Text style={[styles.typing, { color: tokens.MUTED, fontFamily: tokens.font.primary }]}>
          Gemini is thinking…
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  content: { padding: 16, paddingBottom: 24, gap: 10 },
  empty: { paddingTop: 48, paddingHorizontal: 8, gap: 8 },
  emptyTitle: { fontSize: 20, fontWeight: '600', letterSpacing: -0.4 },
  emptyBody: { fontSize: 14, lineHeight: 20 },
  bubble: {
    maxWidth: '86%',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  body: { fontSize: 15, lineHeight: 21 },
  meta: { fontSize: 11, marginTop: 8 },
  typing: { fontSize: 13, paddingLeft: 4 },
});
