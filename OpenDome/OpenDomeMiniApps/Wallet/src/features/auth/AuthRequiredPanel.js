import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Shown inside Wallet when the user is in OpenDome/Sandbox but has no passkey session.
 */
export function AuthRequiredPanel({
  tokens,
  t,
  title,
  description,
  onSignIn,
  compact = false,
}) {
  const copy = t?.authRequired || {};

  return (
    <View style={[styles.root, compact && styles.rootCompact, { backgroundColor: tokens.BG }]}>
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: tokens.SURFACE_ELEVATED,
            borderColor: tokens.BORDER,
          },
        ]}
      >
        <Ionicons name="finger-print-outline" size={28} color={tokens.ACCENT} />
      </View>

      <Text style={[styles.title, { color: tokens.FG, fontFamily: tokens.font.primary }]}>
        {title || copy.title || 'Sign in to continue'}
      </Text>

      <Text style={[styles.description, { color: tokens.FG_SECONDARY, fontFamily: tokens.font.primary }]}>
        {description || copy.description || 'Your passkey unlocks balances, NFTs, and payments. It only takes a few seconds.'}
      </Text>

      {onSignIn ? (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onSignIn}
          style={[styles.cta, { backgroundColor: tokens.FG }]}
        >
          <Ionicons name="person-outline" size={16} color={tokens.BG} />
          <Text style={[styles.ctaText, { color: tokens.BG, fontFamily: tokens.font.primary }]}>
            {copy.cta || 'Go to Account · Sign in'}
          </Text>
        </TouchableOpacity>
      ) : null}

      <Text style={[styles.hint, { color: tokens.MUTED, fontFamily: tokens.font.primary }]}>
        {copy.hint || 'Account tab → Register or Sign in with Passkey'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 40,
    gap: 12,
  },
  rootCompact: {
    flex: 0,
    paddingVertical: 24,
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
  title: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 300,
    marginBottom: 8,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 4,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
});
