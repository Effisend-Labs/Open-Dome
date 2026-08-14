import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export const PAYMENT_NETWORKS = [
  { key: 'BASE', label: 'Base' },
  { key: 'ARB', label: 'Arbitrum' },
  { key: 'OP', label: 'Optimism' },
  { key: 'MATIC', label: 'Polygon' },
  { key: 'AVAX', label: 'Avalanche' },
  { key: 'SOL', label: 'Solana' },
];

export function PaymentNetworkPicker({ tokens, value = 'BASE', onChange }) {
  const [open, setOpen] = useState(false);
  const selected = PAYMENT_NETWORKS.find((network) => network.key === value)
    || PAYMENT_NETWORKS[0];

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Payment network: ${selected.label}`}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((current) => !current)}
        style={[styles.trigger, { borderColor: tokens.BORDER, backgroundColor: tokens.SURFACE_ELEVATED }]}
      >
        <View>
          <Text style={[styles.eyebrow, { color: tokens.MUTED, fontFamily: tokens.font.primary }]}>
            PAY WITH
          </Text>
          <Text style={[styles.value, { color: tokens.FG, fontFamily: tokens.font.primary }]}>
            {selected.label} USDC
          </Text>
        </View>
        <Text style={[styles.chevron, { color: tokens.MUTED }]}>{open ? '⌃' : '⌄'}</Text>
      </Pressable>

      {open ? (
        <View style={styles.options}>
          {PAYMENT_NETWORKS.map((network) => {
            const active = network.key === selected.key;
            return (
              <Pressable
                key={network.key}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                onPress={() => {
                  onChange?.(network.key);
                  setOpen(false);
                }}
                style={[
                  styles.option,
                  {
                    borderColor: active ? tokens.ACCENT : tokens.BORDER,
                    backgroundColor: active ? tokens.ACCENT_SOFT : 'transparent',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.optionText,
                    {
                      color: active ? tokens.ACCENT : tokens.FG_SECONDARY,
                      fontFamily: tokens.font.primary,
                    },
                  ]}
                >
                  {network.label}
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
  trigger: {
    minHeight: 58,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  value: {
    marginTop: 2,
    fontSize: 15,
    fontWeight: '600',
  },
  chevron: { fontSize: 16 },
  options: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  option: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  optionText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
