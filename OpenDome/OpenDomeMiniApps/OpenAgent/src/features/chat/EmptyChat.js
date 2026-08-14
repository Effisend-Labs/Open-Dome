import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

export const CHAT_STARTERS = [
  'What can you actually do here?',
  'Search the latest news on AI',
  'What happened in the world today?',
  'Explain x402 in plain English',
];

export function EmptyChat({ tokens, onPick }) {
  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: tokens.FG }]}>Gemini</Text>
      <Text style={[styles.body, { color: tokens.MUTED }]}>
        General questions plus live internet search. No wallet or Circle tools — each send is
        a USDC payment you confirm (x402).
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
