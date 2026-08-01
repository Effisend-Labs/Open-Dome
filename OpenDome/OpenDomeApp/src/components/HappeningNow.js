import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, StyleSheet } from 'react-native';
import { colors, space, type as typeTokens } from '../core/tokens';

/**
 * <HappeningNow /> — a live status row with a pulsing dot.
 * Used inside the app card to signal "real-time".
 */
export default function HappeningNow({ count, accent = colors.neon.emerald, accentGlow = colors.neon.emeraldGlow }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const ringScale   = pulse.interpolate({ inputRange: [0, 1], outputRange: [1.0, 2.4] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0.0]  });

  return (
    <View style={styles.row} accessibilityLabel={`${count} events happening now`}>
      <View style={styles.dotWrapper}>
        <View style={[styles.dot, { backgroundColor: accent, shadowColor: accent }]} />
        <Animated.View
          style={[
            styles.ping,
            { backgroundColor: accent, opacity: ringOpacity, transform: [{ scale: ringScale }] },
          ]}
        />
      </View>
      <Text style={styles.label}>HAPPENING NOW</Text>
      <View style={styles.divider} />
      <Text style={[styles.count, { color: accent }]}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  dotWrapper: {
    width: 10, height: 10, alignItems: 'center', justifyContent: 'center',
  },
  dot: {
    width: 5, height: 5, borderRadius: 3,
    shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 },
  },
  ping: {
    position: 'absolute',
    width: 5, height: 5, borderRadius: 3,
  },
  label: {
    color: colors.text.muted,
    fontSize: 9,
    fontFamily: 'monospace',
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  divider: {
    width: 1, height: 6,
    backgroundColor: colors.border.glass,
  },
  count: {
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '800',
    letterSpacing: 1,
  },
});
