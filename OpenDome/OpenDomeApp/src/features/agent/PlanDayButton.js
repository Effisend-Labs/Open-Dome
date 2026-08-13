import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

/** Primary CTA after the user locks an event — same language as the planner prompt. */
export const PLAN_DAY_PROMPT =
  'That day, plan my full TDC itinerary with golf, lunch, and spa.';

export function PlanDayButton({ tokens, onPress, disabled }) {
  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        activeOpacity={0.85}
        disabled={disabled}
        onPress={onPress}
        style={[
          styles.cta,
          {
            backgroundColor: tokens.FG,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        <Text style={[styles.ctaText, { color: tokens.BG, fontFamily: tokens.font.primary }]}>
          Plan my full TDC itinerary
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 10,
  },
  cta: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
});
