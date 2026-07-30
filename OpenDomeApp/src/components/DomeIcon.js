import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { colors, radii, type } from '../core/tokens';

export default function DomeIcon({ size = 48, accent = colors.brand.primary, monogram = 'TDC' }) {
  const frame = size;
  const monoSz = Math.max(10, Math.round(size * 0.28));

  return (
    <View style={[styles.frame, { width: frame, height: frame, backgroundColor: accent }]}>
      <Text
        style={[
          styles.monogram,
          {
            fontSize: monoSz,
            letterSpacing: 1,
            color: colors.text.inverse,
          },
        ]}
        accessibilityElementsHidden
      >
        {monogram}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  monogram: {
    fontWeight: '800',
    fontFamily: type.fontFamily,
  },
});
