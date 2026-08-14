import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const NETWORKS = [
  ['base', 'Base'],
  ['arbitrum', 'Arbitrum'],
  ['optimism', 'Optimism'],
  ['polygon', 'Polygon'],
  ['avalanche', 'Avalanche'],
  ['solana', 'Solana'],
];

export function NetworkPicker({ tokens, value, onChange }) {
  const [open, setOpen] = useState(false);
  const label = NETWORKS.find(([network]) => network === value)?.[1] || 'Base';

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Choose payment network"
        hitSlop={8}
        onPress={() => setOpen((visible) => !visible)}
        style={styles.trigger}
      >
        <Text style={[styles.label, { color: tokens.FG_SECONDARY, fontFamily: tokens.font.primary }]}>
          {label}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={12} color={tokens.MUTED} />
      </Pressable>

      {open ? (
        <View style={[styles.menu, { backgroundColor: tokens.SURFACE, borderColor: tokens.BORDER }]}>
          {NETWORKS.map(([network, networkLabel]) => {
            const selected = network === value;
            return (
              <Pressable
                key={network}
                onPress={() => {
                  onChange(network);
                  setOpen(false);
                }}
                style={[styles.option, selected && { backgroundColor: tokens.ACCENT_SOFT }]}
              >
                <Text
                  style={[
                    styles.optionText,
                    {
                      color: selected ? tokens.ACCENT : tokens.FG,
                      fontFamily: tokens.font.primary,
                    },
                  ]}
                >
                  {networkLabel}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { zIndex: 20 },
  trigger: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 6 },
  label: { fontSize: 12, fontWeight: '500' },
  menu: {
    position: 'absolute',
    top: 32,
    right: 0,
    minWidth: 132,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  option: { paddingHorizontal: 12, paddingVertical: 9 },
  optionText: { fontSize: 14 },
});
