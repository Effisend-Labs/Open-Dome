import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const GEMINI_MODEL_LABEL = 'Gemini 3.6 Flash';

/** Quiet Gemini credit — judges see the model, guests don't get a dashboard. */
export function GeminiMark({ tokens, label = GEMINI_MODEL_LABEL }) {
  return (
    <View style={styles.row}>
      <Ionicons name="sparkles" size={14} color={tokens.ACCENT} />
      <Text style={[styles.label, { color: tokens.ACCENT, fontFamily: tokens.font.primary }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
});
