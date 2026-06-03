import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, Text } from 'react-native';
import { colors, radii, type as typeTokens } from '../core/tokens';

/**
 * Custom <DomeIcon /> — no SVG dependency.
 * Composed entirely of layered <View>s to render a stylized arena/dome
 * with: arched skeleton, inner radial lume, monogram badge.
 * Sizes via the `size` prop (normalized externally).
 *
 * Inspired by Tokyo Dome City — the arena is the brand mark.
 */
export default function DomeIcon({ size = 72, accent = colors.neon.cyan, accentGlow = colors.neon.cyanGlow, monogram = 'TDC', animated = true }) {
  const breathe = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 2400, useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 2400, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [animated, breathe]);

  // Layered scale for a subtle "breathing" emissive ring
  const ringOpacity  = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.30, 0.85] });
  const ringScale    = breathe.interpolate({ inputRange: [0, 1], outputRange: [1.00, 1.18] });

  // Geometry — proportional to size
  const frame  = size;
  const dome   = size * 0.92;
  const archW  = size * 0.78;
  const archH  = size * 0.55;
  const ringW  = size * 0.04;
  const monoSz = Math.max(8, Math.round(size * 0.22));

  return (
    <View style={[styles.frame, { width: frame, height: frame }]}>
      {/* Outer breathing ring — pure emissive feel */}
      <Animated.View
        style={[
          styles.ring,
          {
            width: frame,
            height: frame,
            borderRadius: frame / 2,
            borderColor: accent,
            borderWidth: ringW,
            opacity: ringOpacity,
            transform: [{ scale: ringScale }],
            shadowColor: accent,
            shadowOpacity: 0.6,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 0 },
          },
        ]}
      />

      {/* Inner obsidian puck */}
      <View
        style={[
          styles.puck,
          {
            width: dome,
            height: dome,
            borderRadius: dome / 2,
            backgroundColor: colors.bg.obsidian,
            borderColor: colors.border.glass,
            borderWidth: 1,
          },
        ]}
      >
        {/* Top-of-dome arch skeleton (the architectural "dome" curve) */}
        <View
          style={[
            styles.arch,
            {
              width: archW,
              height: archH,
              borderTopLeftRadius: archW / 2,
              borderTopRightRadius: archW / 2,
              borderColor: accent,
              shadowColor: accent,
              shadowOpacity: 0.5,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 0 },
            },
          ]}
        />

        {/* Inner radial lume (a soft "spotlight" gradient via opacity stops) */}
        <View
          style={[
            styles.lume,
            {
              width: archW * 0.62,
              height: archH * 0.62,
              borderRadius: (archW * 0.62) / 2,
              backgroundColor: accent,
              opacity: 0.18,
            },
          ]}
        />

        {/* Monogram */}
        <Text
          style={[
            styles.monogram,
            {
              fontSize: monoSz,
              letterSpacing: monoSz * 0.12,
              color: colors.text.primary,
            },
          ]}
          accessibilityElementsHidden
        >
          {monogram}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
  },
  puck: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  arch: {
    position: 'absolute',
    borderWidth: 2,
    borderBottomWidth: 0,
    backgroundColor: 'transparent',
  },
  lume: {
    position: 'absolute',
  },
  monogram: {
    fontWeight: '800',
    fontFamily: 'monospace',
  },
});
