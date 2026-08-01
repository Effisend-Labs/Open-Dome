import React from 'react';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import { colors, radii, shadow } from '../core/tokens';

/**
 * <GlassCard /> — obsidian glass with a 1px inner light-leak border.
 *
 * Renders an obsidian glass surface with:
 *   - a 1px translucent border (the "glass" edge)
 *   - a top inner highlight (the "light leak" rim)
 *   - a faint outer halo in the supplied accent color
 *
 * On web, applies `backdropFilter: blur` for true glass; on native,
 * falls back to a translucent fill that still reads as glass.
 */
export default function GlassCard(props) {
  const { children, style, accent, accentGlow, onPress, accessibilityLabel } = props;
  const accentColor = accent || colors.neon.cyan;

  const inner = (
    <>
      {/* Top inner rim — a 1px white-to-transparent gradient line */}
      <View style={styles.rim} pointerEvents="none" />

      {/* Outer halo — uses accent shadow when present */}
      <View
        style={[
          styles.halo,
          { borderColor: accentColor, shadowColor: accentColor },
        ]}
        pointerEvents="none"
      />

      {children}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={pressState => [styles.card, style, pressState.pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        {inner}
      </Pressable>
    );
  }

  return (
    <View style={[styles.card, style]} accessibilityLabel={accessibilityLabel}>
      {inner}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    backgroundColor: colors.bg.cardGlass,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border.glass,
    overflow: 'hidden',
    ...Platform.select({
      web: { backdropFilter: 'blur(30px) saturate(140%)' },
      default: {},
    }),
    ...shadow.md,
  },
  rim: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
  },
  halo: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: radii.xl,
    borderWidth: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  pressed: {
    transform: [{ scale: 0.985 }],
  },
});
