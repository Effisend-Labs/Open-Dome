import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function AuthMetaRow({ tokens, label, value, mono = false }) {
  return (
    <View style={[styles.row, { borderTopColor: tokens.BORDER }]}>
      <Text style={[styles.label, { color: tokens.MUTED, fontFamily: tokens.font.primary }]}>
        {label}
      </Text>
      <Text
        numberOfLines={1}
        style={[
          mono ? styles.valueMono : styles.value,
          { color: tokens.FG, fontFamily: mono ? tokens.font.mono : tokens.font.primary },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  label: { fontSize: 13 },
  value: { fontSize: 13, fontWeight: '500', flexShrink: 1, textAlign: 'right' },
  valueMono: { fontSize: 12, flexShrink: 1, textAlign: 'right' },
});
