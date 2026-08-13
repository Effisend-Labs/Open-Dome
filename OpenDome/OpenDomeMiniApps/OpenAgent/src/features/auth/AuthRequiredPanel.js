import React from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GEMINI_CHAT_MODELS, formatTariffLabel } from 'opendome/src/agentTariff.js';
import { AuthMetaRow } from './AuthMetaRow';

export function AuthRequiredPanel({ tokens, onSignIn, onCreatePasskey, pending, error }) {
  return (
    <View style={styles.root}>
      <View style={styles.cluster}>
        <Ionicons name="sparkles" size={20} color={tokens.ACCENT} style={styles.spark} />

        <Text style={[styles.title, { color: tokens.FG, fontFamily: tokens.font.primary }]}>
          Pay per prompt
        </Text>
        <Text style={[styles.body, { color: tokens.FG_SECONDARY, fontFamily: tokens.font.primary }]}>
          Sign in to chat with Gemini. Each send is that model's base USDC fee, plus a little for
          how long the message is. You see the exact amount and can cancel before it goes out.
        </Text>

        <View style={[styles.meta, { borderBottomColor: tokens.BORDER }]}>
          {GEMINI_CHAT_MODELS.map((model) => (
            <AuthMetaRow
              key={model.id}
              tokens={tokens}
              label={model.shortLabel}
              value={formatTariffLabel(model.baseTariffUsd)}
              mono
            />
          ))}
        </View>

        <Pressable
          onPress={onSignIn}
          disabled={pending}
          accessibilityRole="button"
          accessibilityLabel="Sign in with passkey"
          style={({ pressed }) => [
            styles.cta,
            { backgroundColor: tokens.ACCENT, opacity: pressed || pending ? 0.85 : 1 },
          ]}
        >
          {pending ? (
            <ActivityIndicator color={tokens.BG} />
          ) : (
            <Text style={[styles.ctaText, { color: tokens.BG, fontFamily: tokens.font.primary }]}>
              Sign in
            </Text>
          )}
        </Pressable>

        <Text style={[styles.foot, { color: tokens.MUTED, fontFamily: tokens.font.primary }]}>
          Passkey. No password.
        </Text>
        {onCreatePasskey ? (
          <Pressable onPress={onCreatePasskey} hitSlop={8} style={styles.create}>
            <Text style={[styles.createText, { color: tokens.FG_SECONDARY, fontFamily: tokens.font.primary }]}>
              Create a passkey
            </Text>
          </Pressable>
        ) : null}
        {error ? (
          <Text style={[styles.error, { color: tokens.DANGER, fontFamily: tokens.font.primary }]}>
            {error}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 20, paddingTop: 28 },
  cluster: { width: '100%', maxWidth: 400 },
  spark: { marginBottom: 14 },
  title: { fontSize: 27, fontWeight: '500', letterSpacing: -0.2, marginBottom: 8 },
  body: { fontSize: 16, lineHeight: 23, marginBottom: 22 },
  meta: { marginBottom: 18, borderBottomWidth: StyleSheet.hairlineWidth },
  cta: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { fontSize: 16, fontWeight: '600' },
  foot: { fontSize: 13, marginTop: 12 },
  create: { marginTop: 8, alignSelf: 'flex-start' },
  createText: { fontSize: 14 },
  error: { fontSize: 13, marginTop: 12 },
});
