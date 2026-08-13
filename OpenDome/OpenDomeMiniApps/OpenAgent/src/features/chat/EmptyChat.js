import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

export const CHAT_STARTERS = [
  'What can you actually do here?',
  'Plan a half day in Dome City',
  'Explain x402 in plain English',
];

export function EmptyChat({ tokens, onPick }) {
  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: tokens.FG }]}>Gemini on Base</Text>
      <Text style={[styles.body, { color: tokens.MUTED }]}>
        Each send is a USDC payment you confirm. Open BaseScan from the balance chip or a paid
        reply.
      </Text>
      <View style={styles.chips}>
        {CHAT_STARTERS.map((label) => (
          <Pressable
            key={label}
            onPress={() => onPick(label)}
            style={[styles.chip, { backgroundColor: tokens.SURFACE }]}
          >
            <Text style={[styles.chipText, { color: tokens.FG }]}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'flex-end', paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: '600', letterSpacing: -0.4, marginBottom: 8 },
  body: { fontSize: 15, lineHeight: 21, marginBottom: 18, maxWidth: 340 },
  chips: { gap: 8 },
  chip: {
    alignSelf: 'flex-start',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipText: { fontSize: 14, fontWeight: '500' },
});
