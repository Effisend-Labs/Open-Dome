import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export function AuthRequiredPanel({ tokens, onSignIn }) {
  return (
    <View style={[styles.root, { backgroundColor: tokens.BG }]}>
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: tokens.SURFACE_ELEVATED, borderColor: tokens.BORDER },
        ]}
      >
        <Ionicons name="finger-print-outline" size={28} color={tokens.ACCENT} />
      </View>
      <Text style={[styles.title, { color: tokens.FG, fontFamily: tokens.font.primary }]}>
        Sign in to chat
      </Text>
      <Text style={[styles.description, { color: tokens.FG_SECONDARY, fontFamily: tokens.font.primary }]}>
        Passkey unlocks x402 USDC billing for every Gemini prompt.
      </Text>
      {onSignIn ? (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onSignIn}
          style={[styles.cta, { backgroundColor: tokens.FG }]}
        >
          <Text style={[styles.ctaText, { color: tokens.BG, fontFamily: tokens.font.primary }]}>
            Go to Account · Sign in
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    gap: 12,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: { fontSize: 18, fontWeight: '600', letterSpacing: -0.3, textAlign: 'center' },
  description: { fontSize: 14, lineHeight: 20, textAlign: 'center', maxWidth: 300 },
  cta: { paddingHorizontal: 20, paddingVertical: 14, borderRadius: 10, marginTop: 8 },
  ctaText: { fontSize: 14, fontWeight: '600' },
});
