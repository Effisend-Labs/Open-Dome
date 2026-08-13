import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, ScrollView } from 'react-native';

const NETWORKS = ['base', 'arbitrum', 'optimism', 'polygon', 'avalanche', 'mainnet', 'solana', 'monad'];

export function PaymentIntentSheet({
  tokens,
  isDark,
  amountLabel,
  targetLabel = 'OpenAgent',
  breakdown = [],
  selectedNetwork,
  onSelectNetwork,
  onConfirm,
  onCancel,
}) {
  const [open, setOpen] = useState(false);
  const scrim = isDark ? 'rgba(0,0,0,0.72)' : 'rgba(10,10,10,0.45)';

  return (
    <View
      style={[
        styles.scrim,
        { backgroundColor: scrim, ...(Platform.OS === 'web' ? { backdropFilter: 'blur(10px)' } : null) },
      ]}
    >
      <View style={[styles.card, { backgroundColor: tokens.SURFACE, borderColor: tokens.BORDER }]}>
        <Text style={[styles.kicker, { color: tokens.MUTED, fontFamily: tokens.font.mono }]}>
          PAYMENT REQUIRED
        </Text>
        <Text style={[styles.amount, { color: tokens.FG, fontFamily: tokens.font.mono }]}>
          {amountLabel}
        </Text>
        <Text style={[styles.subtitle, { color: tokens.FG_SECONDARY, fontFamily: tokens.font.primary }]}>
          USDC · x402
        </Text>

        {breakdown.map((row) => (
          <View key={row.label} style={[styles.metaRow, { borderColor: tokens.BORDER }]}>
            <Text style={[styles.metaLabel, { color: tokens.MUTED, fontFamily: tokens.font.primary }]}>
              {row.label}
            </Text>
            <Text style={[styles.metaValue, { color: tokens.FG, fontFamily: tokens.font.mono }]}>
              {row.value}
            </Text>
          </View>
        ))}

        <View style={[styles.metaRow, { borderColor: tokens.BORDER }]}>
          <Text style={[styles.metaLabel, { color: tokens.MUTED, fontFamily: tokens.font.primary }]}>
            Target
          </Text>
          <Text style={[styles.metaValue, { color: tokens.FG, fontFamily: tokens.font.mono }]} numberOfLines={1}>
            {targetLabel}
          </Text>
        </View>

        <Text style={[styles.fieldLabel, { color: tokens.MUTED, fontFamily: tokens.font.primary }]}>
          Source network
        </Text>
        <View style={styles.selectWrap}>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => setOpen((v) => !v)}
            style={[
              styles.select,
              {
                backgroundColor: tokens.SURFACE_ELEVATED,
                borderColor: open ? tokens.ACCENT : tokens.BORDER,
              },
            ]}
          >
            <Text style={[styles.selectText, { color: tokens.FG, fontFamily: tokens.font.primary }]}>
              {selectedNetwork}
            </Text>
            <Text style={{ color: tokens.MUTED, fontSize: 12 }}>{open ? '▲' : '▼'}</Text>
          </TouchableOpacity>

          {open ? (
            <View style={[styles.menu, { backgroundColor: tokens.SURFACE_ELEVATED, borderColor: tokens.BORDER }]}>
              <ScrollView nestedScrollEnabled style={{ maxHeight: 140 }} showsVerticalScrollIndicator={false}>
                {NETWORKS.map((net, idx) => {
                  const active = selectedNetwork === net;
                  return (
                    <TouchableOpacity
                      key={net}
                      activeOpacity={0.7}
                      onPress={() => {
                        onSelectNetwork?.(net);
                        setOpen(false);
                      }}
                      style={[
                        styles.menuItem,
                        {
                          borderBottomColor: tokens.BORDER,
                          borderBottomWidth: idx < NETWORKS.length - 1 ? StyleSheet.hairlineWidth : 0,
                          backgroundColor: active ? tokens.ACCENT_SOFT : 'transparent',
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: active ? tokens.ACCENT : tokens.FG,
                          fontFamily: tokens.font.primary,
                          fontSize: 14,
                          fontWeight: active ? '600' : '400',
                          textTransform: 'capitalize',
                        }}
                      >
                        {net}
                      </Text>
                      {active ? <Text style={{ color: tokens.ACCENT, fontSize: 14 }}>✓</Text> : null}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onConfirm}
          style={[styles.primaryBtn, { backgroundColor: tokens.ACCENT }]}
        >
          <Text style={styles.primaryBtnText}>Sign & Send</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.7} onPress={onCancel} style={styles.cancelBtn}>
          <Text style={{ color: tokens.FG_SECONDARY, fontFamily: tokens.font.primary, fontWeight: '500', fontSize: 14 }}>
            Cancel
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    padding: 22,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'visible',
  },
  kicker: { fontSize: 10, fontWeight: '600', letterSpacing: 1.4, marginBottom: 16 },
  amount: { fontSize: 32, fontWeight: '500', letterSpacing: -1.2 },
  subtitle: { fontSize: 14, marginTop: 6, marginBottom: 16 },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  metaLabel: { fontSize: 13 },
  metaValue: { fontSize: 12, flexShrink: 1, textAlign: 'right' },
  fieldLabel: { fontSize: 12, marginTop: 14, marginBottom: 8 },
  selectWrap: {
    width: '100%',
    position: 'relative',
    zIndex: 20,
    marginBottom: 8,
  },
  select: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  selectText: { fontSize: 14, fontWeight: '500', textTransform: 'capitalize' },
  menu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    zIndex: 30,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  primaryBtn: { marginTop: 12, width: '100%', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },
  cancelBtn: { marginTop: 4, paddingVertical: 12, alignItems: 'center' },
});
