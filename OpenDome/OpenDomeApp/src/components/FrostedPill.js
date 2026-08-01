import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { colors, space, radii, type } from '../core/tokens';

export default function FrostedPill({ state, username, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
    >
      <View style={[styles.dot, state === 'authenticated' ? styles.dotAuth : styles.dotAvail]} />
      <Text style={styles.text} numberOfLines={1}>
        {state === 'authenticated' ? `@${username}` : 'Connect Passport'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.md,
    paddingVertical: space.xs + 2,
    borderRadius: radii.pill,
    backgroundColor: colors.bg.card,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  pressed: { opacity: 0.7 },
  dot: {
    width: 8, height: 8, borderRadius: radii.pill,
    backgroundColor: colors.status.info,
  },
  dotAuth: { backgroundColor: colors.status.success },
  dotAvail: { backgroundColor: colors.status.info },
  text: {
    color: colors.text.primary,
    fontSize: type.micro,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: type.fontFamily,
  },
});
