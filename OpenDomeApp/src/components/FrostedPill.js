import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, View, Text, StyleSheet, Platform } from 'react-native';
import { colors, space, radii, type as typeTokens } from '../core/tokens';

/**
 * <FrostedPill /> — a thin, frosted, biometric-style status chip.
 *
 * Three states:
 *   - "offline"        : dim, no glow
 *   - "available"      : subtle cyan pulse, "TAP TO CONNECT"
 *   - "authenticated"  : shows avatar/name, emerald dot
 *
 * On web, uses `backdropFilter: blur` for true glass. On native, falls
 * back to a translucent fill that still reads as glass.
 */
export default function FrostedPill({ state, username, onPress }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (state !== 'available') { pulse.setValue(0); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [state, pulse]);

  const dotScale  = pulse.interpolate({ inputRange: [0, 1], outputRange: [1.0, 1.5] });
  const dotOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 0.20] });

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={
        state === 'authenticated' ? `Disconnect ${username}` : 'Connect passport'
      }
    >
      {/* State dot */}
      <View style={styles.dotWrapper}>
        <View
          style={[
            styles.dot,
            {
              backgroundColor:
                state === 'authenticated' ? colors.status.success :
                state === 'available'     ? colors.neon.cyan      :
                                            colors.text.disabled,
              shadowColor:
                state === 'authenticated' ? colors.neon.emeraldGlow :
                state === 'available'     ? colors.neon.cyanGlow   :
                                            'transparent',
            },
          ]}
        />
        {state === 'available' && (
          <Animated.View
            style={[
              styles.dotPing,
              {
                backgroundColor: colors.neon.cyan,
                opacity: dotOpacity,
                transform: [{ scale: dotScale }],
              },
            ]}
          />
        )}
      </View>

      <Text style={styles.text} numberOfLines={1}>
        {state === 'authenticated'
          ? `@${username}`
          : 'TAP TO CONNECT'}
      </Text>

      {state === 'authenticated' && <View style={styles.caret} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.xs + 2,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border.glass,
    backgroundColor: colors.bg.frosted,
    // True glass on web; translucent fallback elsewhere.
    ...Platform.select({
      web: { backdropFilter: 'blur(20px)' },
      default: {},
    }),
  },
  pressed: { opacity: 0.7 },
  dotWrapper: {
    width: 8, height: 8, alignItems: 'center', justifyContent: 'center',
  },
  dot: {
    width: 6, height: 6, borderRadius: 3,
    shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 },
  },
  dotPing: {
    position: 'absolute',
    width: 6, height: 6, borderRadius: 3,
  },
  text: {
    color: colors.text.primary,
    fontSize: typeTokens.micro,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  caret: {
    width: 1, height: 10,
    backgroundColor: colors.border.glass,
    marginLeft: space.xs,
  },
});
